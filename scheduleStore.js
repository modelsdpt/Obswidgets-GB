const fs = require("fs").promises;
const path = require("path");

// ─────────────────────────────────────────────────────────────
// CONFIGURACIÓN
// ─────────────────────────────────────────────────────────────

// En Railway tu volumen está montado en /app/data.
// RAILWAY_VOLUME_MOUNT_PATH se usa si Railway lo proporciona.
// En local seguirá utilizando ./data.
const DATA_DIR =
  process.env.RAILWAY_VOLUME_MOUNT_PATH ||
  path.join(__dirname, "data");

const FILE_PATH = path.join(DATA_DIR, "schedules.json");

// Backup inmediato de la última versión válida
const BACKUP_PATH = path.join(
  DATA_DIR,
  "schedules.json.bak"
);

// Backups históricos
const BACKUP_DIR = path.join(
  DATA_DIR,
  "backups",
  "schedules"
);

// Archivos corruptos preservados para diagnóstico
const CORRUPT_DIR = path.join(
  DATA_DIR,
  "corrupt"
);

// Lock para evitar escrituras simultáneas
const LOCK_PATH = path.join(
  DATA_DIR,
  ".schedules.lock"
);

// Cantidad máxima de backups históricos
const MAX_BACKUPS = 100;

// Tiempo máximo esperando el lock
const LOCK_TIMEOUT_MS = 15000;

// Si un proceso murió dejando el lock,
// después de este tiempo se considera abandonado.
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
//
// IMPORTANTE:
//
// NUNCA escribimos directamente sobre schedules.json.
//
// Primero:
// schedules.json.xxxxx.tmp
//
// Después verificamos que esté escrito.
//
// Finalmente:
// rename() -> schedules.json
//
// En Linux/Railway el rename dentro del mismo volumen
// es atómico.
// ─────────────────────────────────────────────────────────────

async function atomicWriteRaw(
  destination,
  content
) {
  await ensureDirectories();

  const tempPath =
    `${destination}.${process.pid}.` +
    `${Date.now()}.tmp`;

  let handle;

  try {
    handle = await fs.open(
      tempPath,
      "w"
    );

    await handle.writeFile(
      content,
      "utf-8"
    );

    // Fuerza el contenido al filesystem antes del rename.
    await handle.sync();

    await handle.close();
    handle = null;

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

function parseSchedules(raw, sourceName) {
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
// PRESERVAR ARCHIVO CORRUPTO
// ─────────────────────────────────────────────────────────────

async function preserveCorruptFile(raw) {
  try {
    await ensureDirectories();

    const corruptPath = path.join(
      CORRUPT_DIR,
      `schedules-corrupt-${timestampForFile()}.json`
    );

    await atomicWriteRaw(
      corruptPath,
      raw || ""
    );

    console.error(
      "🛟 Copia del JSON corrupto guardada en:",
      corruptPath
    );
  } catch (error) {
    console.error(
      "No se pudo preservar schedules.json corrupto:",
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
          name.startsWith("schedules-") &&
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

    for (
      const fileName of filesToDelete
    ) {
      try {
        await fs.unlink(
          path.join(
            BACKUP_DIR,
            fileName
          )
        );
      } catch (error) {
        console.error(
          "No se pudo eliminar backup antiguo:",
          fileName,
          error
        );
      }
    }
  } catch (error) {
    if (error.code !== "ENOENT") {
      console.error(
        "Error limpiando backups:",
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

  // MUY IMPORTANTE:
  // solamente hacemos backup si el archivo actual
  // es JSON válido.
  try {
    parseSchedules(
      raw,
      "schedules.json"
    );
  } catch (error) {
    console.error(
      "⚠️ schedules.json actual NO es válido."
    );

    console.error(
      "⚠️ No se sobrescribirá schedules.json.bak."
    );

    return;
  }

  // Backup rápido: última versión válida
  await atomicWriteRaw(
    BACKUP_PATH,
    raw
  );

  // Backup histórico
  const historicalPath =
    path.join(
      BACKUP_DIR,
      `schedules-${timestampForFile()}-${Date.now()}.json`
    );

  await atomicWriteRaw(
    historicalPath,
    raw
  );

  await cleanupOldBackups();
}


// ─────────────────────────────────────────────────────────────
// RECUPERACIÓN AUTOMÁTICA
// ─────────────────────────────────────────────────────────────
//
// Si schedules.json está corrupto:
//
// 1. NO lo convierte en []
// 2. Guarda una copia en /corrupt
// 3. Busca schedules.json.bak
// 4. Si no funciona, busca backups históricos
// 5. Restaura el backup válido más reciente
// 6. Si no existe ninguno, lanza error
//
// ─────────────────────────────────────────────────────────────

async function findLatestValidBackup() {
  const candidates = [];

  // Primero el .bak inmediato
  candidates.push(BACKUP_PATH);

  try {
    const files =
      await fs.readdir(BACKUP_DIR);

    const historical = files
      .filter(
        (name) =>
          name.startsWith("schedules-") &&
          name.endsWith(".json")
      )
      .sort()
      .reverse();

    for (
      const fileName of historical
    ) {
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

  for (
    const candidate of candidates
  ) {
    try {
      const raw =
        await fs.readFile(
          candidate,
          "utf-8"
        );

      const data =
        parseSchedules(
          raw,
          candidate
        );

      return {
        path: candidate,
        raw,
        data,
      };
    } catch {
      // Si ese backup también está corrupto,
      // probamos el siguiente.
    }
  }

  return null;
}


async function recoverSchedules(
  corruptedRaw
) {
  await preserveCorruptFile(
    corruptedRaw
  );

  const backup =
    await findLatestValidBackup();

  if (!backup) {
    throw new Error(
      "schedules.json está corrupto y NO existe " +
      "ningún backup válido. " +
      "El archivo NO será reseteado automáticamente."
    );
  }

  console.warn(
    "♻️ Recuperando schedules.json desde:",
    backup.path
  );

  await atomicWriteRaw(
    FILE_PATH,
    backup.raw
  );

  console.warn(
    `✅ schedules.json recuperado. ` +
    `${backup.data.length} schedules restaurados.`
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
      "📄 schedules.json no existe. Creando archivo inicial."
    );

    await atomicWriteRaw(
      FILE_PATH,
      "[]\n"
    );
  }
}


// ─────────────────────────────────────────────────────────────
// LECTURA INTERNA
// ─────────────────────────────────────────────────────────────

async function readSchedulesInternal() {
  await ensureFile();

  const raw =
    await fs.readFile(
      FILE_PATH,
      "utf-8"
    );

  try {
    return parseSchedules(
      raw,
      "schedules.json"
    );
  } catch (error) {
    console.error(
      "🚨 ERROR leyendo schedules.json:",
      error.message
    );

    console.error(
      "🚨 schedules.json NO será reseteado."
    );

    return await recoverSchedules(
      raw
    );
  }
}


// ─────────────────────────────────────────────────────────────
// ESCRITURA INTERNA
// ─────────────────────────────────────────────────────────────

async function writeSchedulesInternal(
  data
) {
  if (!Array.isArray(data)) {
    throw new TypeError(
      "writeSchedules esperaba un array"
    );
  }

  // Serializamos.
  const json =
    JSON.stringify(
      data,
      null,
      2
    ) + "\n";

  // Verificación adicional antes de escribir.
  const validation =
    JSON.parse(json);

  if (!Array.isArray(validation)) {
    throw new Error(
      "El JSON generado no es válido"
    );
  }

  // Guardamos la versión actual ANTES de cambiarla.
  await createBackupFromCurrentFile();

  // Escritura atómica.
  await atomicWriteRaw(
    FILE_PATH,
    json
  );
}


// ─────────────────────────────────────────────────────────────
// LOCK ENTRE PROCESOS
// ─────────────────────────────────────────────────────────────
//
// Evita que dos peticiones:
//
// saveSchedule()
// deleteScheduleForModel()
//
// puedan hacer read -> write al mismo tiempo.
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
          if (
            error.code !== "ENOENT"
          ) {
            console.error(
              "Error liberando lock:",
              error
            );
          }
        }
      };
    } catch (error) {
      if (
        error.code !== "EEXIST"
      ) {
        throw error;
      }

      // Revisar si quedó un lock abandonado.
      try {
        const stats =
          await fs.stat(
            LOCK_PATH
          );

        const lockAge =
          Date.now() -
          stats.mtimeMs;

        if (
          lockAge >
          LOCK_STALE_MS
        ) {
          console.warn(
            "⚠️ Lock abandonado detectado. Eliminándolo."
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
          "Timeout esperando acceso exclusivo a schedules.json"
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
//
// Además del lock de filesystem,
// serializamos operaciones dentro de este proceso Node.
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

  // La cola debe continuar aunque una operación falle.
  operationQueue =
    run.catch(() => {});

  return run;
}


// ─────────────────────────────────────────────────────────────
// API PÚBLICA
// ─────────────────────────────────────────────────────────────

async function getAllSchedules() {
  return withExclusiveOperation(
    async () => {
      return await readSchedulesInternal();
    }
  );
}


// Si llamas solo con modelName,
// busca la primera coincidencia.
//
// Si llamas:
// modelName + date + start
//
// utiliza la llave completa.
async function findScheduleForModel(
  modelName,
  date,
  start
) {
  return withExclusiveOperation(
    async () => {
      const all =
        await readSchedulesInternal();

      if (date && start) {
        return (
          all.find(
            (schedule) =>
              schedule.modelName ===
                modelName &&
              schedule.date === date &&
              (schedule.start || "") ===
                (start || "")
          ) || null
        );
      }

      return (
        all.find(
          (schedule) =>
            schedule.modelName ===
            modelName
        ) || null
      );
    }
  );
}


// Upsert por:
//
// modelName + date + start
async function saveSchedule(entry) {
  return withExclusiveOperation(
    async () => {
      if (
        !entry ||
        typeof entry !== "object"
      ) {
        throw new TypeError(
          "saveSchedule recibió un entry inválido"
        );
      }

      if (
        !entry.modelName ||
        !entry.date ||
        !entry.start
      ) {
        throw new Error(
          "saveSchedule requiere modelName, date y start"
        );
      }

      const all =
        await readSchedulesInternal();

      const index =
        all.findIndex(
          (schedule) =>
            schedule.modelName ===
              entry.modelName &&
            schedule.date ===
              entry.date &&
            (schedule.start || "") ===
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

      await writeSchedulesInternal(
        all
      );

      console.log(
        "✅ Schedule guardado:",
        entry.modelName,
        entry.date,
        entry.start
      );

      return entry;
    }
  );
}


async function deleteScheduleForModel(
  modelName,
  date,
  start
) {
  return withExclusiveOperation(
    async () => {
      const all =
        await readSchedulesInternal();

      const filtered =
        all.filter(
          (schedule) =>
            !(
              schedule.modelName ===
                modelName &&
              schedule.date ===
                date &&
              (schedule.start || "") ===
                (start || "")
            )
        );

      // Si no encontramos nada,
      // no hacemos una escritura innecesaria.
      if (
        filtered.length ===
        all.length
      ) {
        console.warn(
          "⚠️ No se encontró schedule para eliminar:",
          modelName,
          date,
          start
        );

        return false;
      }

      await writeSchedulesInternal(
        filtered
      );

      console.log(
        "🗑️ Schedule eliminado:",
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
  getAllSchedules,
  findScheduleForModel,
  saveSchedule,
  deleteScheduleForModel,
};