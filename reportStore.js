const fs = require("fs").promises;
const path = require("path");

// ─────────────────────────────────────────────────────────────
// CONFIGURACIÓN
// ─────────────────────────────────────────────────────────────

const DATA_DIR =
  process.env.RAILWAY_VOLUME_MOUNT_PATH ||
  (process.env.RAILWAY_ENVIRONMENT_ID
    ? "/app/data"
    : path.join(__dirname, "data"));

const FILE_PATH = path.join(
  DATA_DIR,
  "reports.json"
);

const BACKUP_PATH = path.join(
  DATA_DIR,
  "reports.json.bak"
);

const BACKUP_DIR = path.join(
  DATA_DIR,
  "backups",
  "reports"
);

const CORRUPT_DIR = path.join(
  DATA_DIR,
  "corrupt"
);

const LOCK_PATH = path.join(
  DATA_DIR,
  ".reports.lock"
);

const MAX_BACKUPS = 100;
const LOCK_TIMEOUT_MS = 15000;
const LOCK_STALE_MS = 120000;


// ─────────────────────────────────────────────────────────────
// UTILIDADES
// ─────────────────────────────────────────────────────────────

function sleep(ms) {
  return new Promise((resolve) =>
    setTimeout(resolve, ms)
  );
}

function timestampForFile() {
  return new Date()
    .toISOString()
    .replace(/[:.]/g, "-");
}

async function ensureDirectories() {
  await fs.mkdir(DATA_DIR, {
    recursive: true,
  });

  await fs.mkdir(BACKUP_DIR, {
    recursive: true,
  });

  await fs.mkdir(CORRUPT_DIR, {
    recursive: true,
  });
}


// ─────────────────────────────────────────────────────────────
// ESCRITURA ATÓMICA
// ─────────────────────────────────────────────────────────────

async function atomicWriteRaw(
  destination,
  content
) {
  await ensureDirectories();

  const tempPath =
    `${destination}.${process.pid}.` +
    `${Date.now()}.tmp`;

  let handle = null;

  try {
    handle = await fs.open(
      tempPath,
      "w"
    );

    await handle.writeFile(
      content,
      "utf-8"
    );

    // Fuerza los datos al disco antes del rename
    await handle.sync();

    await handle.close();
    handle = null;

    // Reemplazo atómico
    await fs.rename(
      tempPath,
      destination
    );
  } catch (error) {
    if (handle) {
      try {
        await handle.close();
      } catch {}
    }

    try {
      await fs.unlink(tempPath);
    } catch {}

    throw error;
  }
}


// ─────────────────────────────────────────────────────────────
// VALIDACIÓN
// ─────────────────────────────────────────────────────────────

function parseReports(raw, sourceName) {
  if (
    typeof raw !== "string" ||
    raw.trim() === ""
  ) {
    throw new Error(
      `${sourceName} está vacío`
    );
  }

  const parsed = JSON.parse(raw);

  if (!Array.isArray(parsed)) {
    throw new Error(
      `${sourceName} no contiene un array`
    );
  }

  return parsed;
}


// ─────────────────────────────────────────────────────────────
// PRESERVAR ARCHIVOS CORRUPTOS
// ─────────────────────────────────────────────────────────────

async function preserveCorruptFile(raw) {
  try {
    await ensureDirectories();

    const corruptPath = path.join(
      CORRUPT_DIR,
      `reports-corrupt-${timestampForFile()}.json`
    );

    await atomicWriteRaw(
      corruptPath,
      raw || ""
    );

    console.error(
      "🛟 Copia del reports.json corrupto guardada en:",
      corruptPath
    );
  } catch (error) {
    console.error(
      "No se pudo preservar reports.json corrupto:",
      error
    );
  }
}


// ─────────────────────────────────────────────────────────────
// BACKUPS
// ─────────────────────────────────────────────────────────────

async function cleanupOldBackups() {
  try {
    const files =
      await fs.readdir(BACKUP_DIR);

    const backups = files
      .filter(
        (name) =>
          name.startsWith("reports-") &&
          name.endsWith(".json")
      )
      .sort()
      .reverse();

    if (
      backups.length <= MAX_BACKUPS
    ) {
      return;
    }

    const filesToDelete =
      backups.slice(MAX_BACKUPS);

    for (const fileName of filesToDelete) {
      try {
        await fs.unlink(
          path.join(
            BACKUP_DIR,
            fileName
          )
        );
      } catch (error) {
        console.error(
          "No se pudo borrar backup antiguo:",
          fileName,
          error
        );
      }
    }
  } catch (error) {
    if (error.code !== "ENOENT") {
      console.error(
        "Error limpiando backups de reports:",
        error
      );
    }
  }
}


async function createBackupFromCurrentFile() {
  let raw;

  try {
    raw = await fs.readFile(
      FILE_PATH,
      "utf-8"
    );
  } catch (error) {
    if (error.code === "ENOENT") {
      return;
    }

    throw error;
  }

  // No hacemos backup de un JSON corrupto
  try {
    parseReports(
      raw,
      "reports.json"
    );
  } catch (error) {
    console.error(
      "⚠️ reports.json actual NO es válido."
    );

    console.error(
      "⚠️ reports.json.bak NO será sobrescrito."
    );

    return;
  }

  // Última versión válida
  await atomicWriteRaw(
    BACKUP_PATH,
    raw
  );

  // Backup histórico
  const historicalPath =
    path.join(
      BACKUP_DIR,
      `reports-${timestampForFile()}-${Date.now()}.json`
    );

  await atomicWriteRaw(
    historicalPath,
    raw
  );

  await cleanupOldBackups();
}


// ─────────────────────────────────────────────────────────────
// BUSCAR BACKUP VÁLIDO
// ─────────────────────────────────────────────────────────────

async function findLatestValidBackup() {
  const candidates = [];

  candidates.push(BACKUP_PATH);

  try {
    const files =
      await fs.readdir(BACKUP_DIR);

    const historical = files
      .filter(
        (name) =>
          name.startsWith("reports-") &&
          name.endsWith(".json")
      )
      .sort()
      .reverse();

    for (const fileName of historical) {
      candidates.push(
        path.join(
          BACKUP_DIR,
          fileName
        )
      );
    }
  } catch (error) {
    if (error.code !== "ENOENT") {
      console.error(
        "Error leyendo backups:",
        error
      );
    }
  }

  for (const candidate of candidates) {
    try {
      const raw =
        await fs.readFile(
          candidate,
          "utf-8"
        );

      const data =
        parseReports(
          raw,
          candidate
        );

      return {
        path: candidate,
        raw,
        data,
      };
    } catch {
      // Intentamos el siguiente backup
    }
  }

  return null;
}


// ─────────────────────────────────────────────────────────────
// RECUPERACIÓN AUTOMÁTICA
// ─────────────────────────────────────────────────────────────

async function recoverReports(
  corruptedRaw
) {
  // Guardamos el archivo dañado antes de hacer nada
  await preserveCorruptFile(
    corruptedRaw
  );

  const backup =
    await findLatestValidBackup();

  if (!backup) {
    throw new Error(
      "reports.json está corrupto y NO existe " +
      "ningún backup válido. El archivo NO será " +
      "reseteado automáticamente."
    );
  }

  console.warn(
    "♻️ Recuperando reports.json desde:",
    backup.path
  );

  await atomicWriteRaw(
    FILE_PATH,
    backup.raw
  );

  console.warn(
    `✅ reports.json recuperado. ` +
    `${backup.data.length} reportes restaurados.`
  );

  return backup.data;
}


// ─────────────────────────────────────────────────────────────
// CREACIÓN INICIAL
// ─────────────────────────────────────────────────────────────

async function ensureFile() {
  await ensureDirectories();

  try {
    await fs.access(FILE_PATH);
  } catch (error) {
    if (error.code !== "ENOENT") {
      throw error;
    }

    console.log(
      "📄 reports.json no existe. Creando archivo inicial."
    );

    await atomicWriteRaw(
      FILE_PATH,
      "[]\n"
    );
  }
}


// ─────────────────────────────────────────────────────────────
// LECTURA
// ─────────────────────────────────────────────────────────────

async function readReportsInternal() {
  await ensureFile();

  const raw =
    await fs.readFile(
      FILE_PATH,
      "utf-8"
    );

  try {
    return parseReports(
      raw,
      "reports.json"
    );
  } catch (error) {
    console.error(
      "🚨 ERROR leyendo reports.json:",
      error.message
    );

    console.error(
      "🚨 reports.json NO será reseteado."
    );

    return await recoverReports(
      raw
    );
  }
}


// ─────────────────────────────────────────────────────────────
// ESCRITURA
// ─────────────────────────────────────────────────────────────

async function writeReportsInternal(
  data
) {
  if (!Array.isArray(data)) {
    throw new TypeError(
      "writeReports esperaba un array"
    );
  }

  const json =
    JSON.stringify(
      data,
      null,
      2
    ) + "\n";

  // Validación antes de tocar el archivo real
  const validation =
    JSON.parse(json);

  if (!Array.isArray(validation)) {
    throw new Error(
      "El JSON generado no es válido"
    );
  }

  // Guardar estado anterior
  await createBackupFromCurrentFile();

  // Escritura atómica
  await atomicWriteRaw(
    FILE_PATH,
    json
  );
}


// ─────────────────────────────────────────────────────────────
// LOCK DE FILESYSTEM
// ─────────────────────────────────────────────────────────────

async function acquireFileLock() {
  await ensureDirectories();

  const startedAt =
    Date.now();

  while (true) {
    try {
      const handle =
        await fs.open(
          LOCK_PATH,
          "wx"
        );

      try {
        await handle.writeFile(
          JSON.stringify({
            pid: process.pid,
            createdAt:
              new Date().toISOString(),
          }),
          "utf-8"
        );
      } catch {}

      return async () => {
        try {
          await handle.close();
        } catch {}

        try {
          await fs.unlink(
            LOCK_PATH
          );
        } catch (error) {
          if (error.code !== "ENOENT") {
            console.error(
              "Error liberando lock:",
              error
            );
          }
        }
      };
    } catch (error) {
      if (error.code !== "EEXIST") {
        throw error;
      }

      // Comprobar si es un lock abandonado
      try {
        const stats =
          await fs.stat(
            LOCK_PATH
          );

        const lockAge =
          Date.now() -
          stats.mtimeMs;

        if (
          lockAge > LOCK_STALE_MS
        ) {
          console.warn(
            "⚠️ Lock abandonado de reports detectado. Eliminándolo."
          );

          try {
            await fs.unlink(
              LOCK_PATH
            );
          } catch {}

          continue;
        }
      } catch (statError) {
        if (
          statError.code === "ENOENT"
        ) {
          continue;
        }
      }

      if (
        Date.now() -
          startedAt >
        LOCK_TIMEOUT_MS
      ) {
        throw new Error(
          "Timeout esperando acceso exclusivo a reports.json"
        );
      }

      await sleep(
        50 +
          Math.floor(
            Math.random() * 100
          )
      );
    }
  }
}


// ─────────────────────────────────────────────────────────────
// COLA LOCAL
// ─────────────────────────────────────────────────────────────

let operationQueue =
  Promise.resolve();

function withExclusiveOperation(
  operation
) {
  const run =
    operationQueue.then(
      async () => {
        const release =
          await acquireFileLock();

        try {
          return await operation();
        } finally {
          await release();
        }
      },
      async () => {
        const release =
          await acquireFileLock();

        try {
          return await operation();
        } finally {
          await release();
        }
      }
    );

  // Aunque una operación falle,
  // la cola debe seguir funcionando.
  operationQueue =
    run.catch(() => {});

  return run;
}


// ─────────────────────────────────────────────────────────────
// API PÚBLICA
// ─────────────────────────────────────────────────────────────

async function getAllReports() {
  return withExclusiveOperation(
    async () => {
      return await readReportsInternal();
    }
  );
}


async function findReportForModel(
  modelName,
  date,
  start
) {
  return withExclusiveOperation(
    async () => {
      const all =
        await readReportsInternal();

      return (
        all.find(
          (report) =>
            report.modelName ===
              modelName &&
            report.date === date &&
            (report.start || "") ===
              (start || "")
        ) || null
      );
    }
  );
}


// Upsert por:
//
// modelName + date + start
async function saveReport(entry) {
  return withExclusiveOperation(
    async () => {
      if (
        !entry ||
        typeof entry !== "object"
      ) {
        throw new TypeError(
          "saveReport recibió un entry inválido"
        );
      }

      if (
        !entry.modelName ||
        !entry.date ||
        !entry.start
      ) {
        throw new Error(
          "saveReport requiere modelName, date y start"
        );
      }

      const all =
        await readReportsInternal();

      const index =
        all.findIndex(
          (report) =>
            report.modelName ===
              entry.modelName &&
            report.date ===
              entry.date &&
            (report.start || "") ===
              (entry.start || "")
        );

      if (index >= 0) {
        all[index] = {
          ...all[index],
          ...entry,
        };
      } else {
        all.push(entry);
      }

      await writeReportsInternal(
        all
      );

      console.log(
        "✅ Reporte guardado:",
        entry.modelName,
        entry.date,
        entry.start
      );

      return entry;
    }
  );
}


async function deleteReportForModel(
  modelName,
  date,
  start
) {
  return withExclusiveOperation(
    async () => {
      const all =
        await readReportsInternal();

      const filtered =
        all.filter(
          (report) =>
            !(
              report.modelName ===
                modelName &&
              report.date === date &&
              (report.start || "") ===
                (start || "")
            )
        );

      if (
        filtered.length ===
        all.length
      ) {
        console.warn(
          "⚠️ No se encontró reporte para eliminar:",
          modelName,
          date,
          start
        );

        return false;
      }

      await writeReportsInternal(
        filtered
      );

      console.log(
        "🗑️ Reporte eliminado:",
        modelName,
        date,
        start
      );

      return true;
    }
  );
}


// ─────────────────────────────────────────────────────────────
// EXPORTS
// ─────────────────────────────────────────────────────────────

module.exports = {
  getAllReports,
  findReportForModel,
  saveReport,
  deleteReportForModel,
};