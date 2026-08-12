const express = require("express");
const cors = require("cors");
const http = require("http");
const { WebSocketServer } = require("ws");
const path = require("path");
const fs = require("fs");
const multer = require("multer");

const app = express();

app.use(cors());
app.use(express.json());

// ───────── STORES ─────────
const {
  getAllSchedules,
  findScheduleForModel,
  saveSchedule,
  deleteScheduleForModel,
} = require("./scheduleStore");

const {
  getAllReports,
  findReportForModel,
  saveReport,
  deleteReportForModel,
} = require("./reportStore");

// ───────── CONFIGURACIÓN DE UPLOADS / FLYERS ─────────

// Detecta si Railway tiene el volumen persistente montado.
// En Railway usaremos /app/data.
// En local seguirá usando Backend/uploads.
const UPLOADS_DIR = process.env.RAILWAY_ENVIRONMENT_ID
  ? path.join("/app/data", "uploads")
  : path.join(__dirname, "uploads");

const FLYERS_DIR = path.join(UPLOADS_DIR, "flyers");

const MAX_FLYER_SIZE = 15 * 1024 * 1024;

// Crear las carpetas automáticamente si todavía no existen
fs.mkdirSync(FLYERS_DIR, { recursive: true });

console.log("📁 Directorio de uploads:", UPLOADS_DIR);
console.log("🖼️ Directorio de flyers:", FLYERS_DIR);

function sanitizeFileName(value) {
  return String(value || "flyer")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9._-]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^[-.]+|[-.]+$/g, "")
    .toLowerCase();
}

const flyerStorage = multer.diskStorage({
  destination: (req, file, callback) => {
    callback(null, FLYERS_DIR);
  },

  filename: (req, file, callback) => {
    const extension = path
      .extname(file.originalname || "")
      .toLowerCase();

    const originalBase = path.basename(
      file.originalname || "flyer",
      extension
    );

    const safeBase =
      sanitizeFileName(originalBase) || "flyer";

    const uniquePart =
      `${Date.now()}-${Math.round(Math.random() * 1e9)}`;

    callback(
      null,
      `${uniquePart}-${safeBase}${extension}`
    );
  },
});

const flyerUpload = multer({
  storage: flyerStorage,

  limits: {
    fileSize: MAX_FLYER_SIZE,

    // 1 principal + 1 Reddit + 3 adicionales
    files: 5,
  },

  fileFilter: (req, file, callback) => {
    const allowedMimeTypes = new Set([
      "image/jpeg",
      "image/png",
      "image/webp",
    ]);

    const allowedExtensions = new Set([
      ".jpg",
      ".jpeg",
      ".png",
      ".webp",
    ]);

    const extension = path
      .extname(file.originalname || "")
      .toLowerCase();

    const validMimeType =
      allowedMimeTypes.has(file.mimetype);

    const validExtension =
      allowedExtensions.has(extension);

    if (!validMimeType || !validExtension) {
      return callback(
        new multer.MulterError(
          "LIMIT_UNEXPECTED_FILE",
          file.fieldname
        )
      );
    }

    callback(null, true);
  },
});

const scheduleFlyerUpload = flyerUpload.fields([
  {
    name: "flyer",
    maxCount: 1,
  },
  {
    name: "reddit",
    maxCount: 1,
  },
  {
    name: "flyers",
    maxCount: 3,
  },
]);

function makePublicFlyerRecord(file) {
  if (!file) {
    return null;
  }

  return {
    url: `/uploads/flyers/${file.filename}`,
    fileName: file.filename,
    originalName: file.originalname,
    mimeType: file.mimetype,
    size: file.size,
  };
}

function getStoredFileUrl(value) {
  if (!value) {
    return "";
  }

  if (typeof value === "string") {
    return value;
  }

  if (
    typeof value === "object" &&
    typeof value.url === "string"
  ) {
    return value.url;
  }

  return "";
}

function collectScheduleFlyerUrls(schedule) {
  if (!schedule) {
    return [];
  }

  const urls = [];

  const mainFlyerUrl =
    getStoredFileUrl(schedule.flyer);

  const redditFlyerUrl =
    getStoredFileUrl(schedule.reddit);

  if (mainFlyerUrl) {
    urls.push(mainFlyerUrl);
  }

  if (redditFlyerUrl) {
    urls.push(redditFlyerUrl);
  }

  if (Array.isArray(schedule.flyers)) {
    schedule.flyers.forEach((item) => {
      const url = getStoredFileUrl(item);

      if (url) {
        urls.push(url);
      }
    });
  }

  // Compatibilidad con posibles formatos anteriores
  if (schedule.flyerUrl) {
    urls.push(schedule.flyerUrl);
  }

  if (schedule.redditUrl) {
    urls.push(schedule.redditUrl);
  }

  return [...new Set(urls)];
}

async function deleteFlyerFileByUrl(fileUrl) {
  if (
    !fileUrl ||
    typeof fileUrl !== "string"
  ) {
    return;
  }

  const cleanUrl = fileUrl.split("?")[0];

  if (!cleanUrl.startsWith("/uploads/")) {
    return;
  }

  const relativePath = cleanUrl.replace(
    /^\/uploads\//,
    ""
  );

  const absolutePath = path.resolve(
    UPLOADS_DIR,
    relativePath
  );

  const safeUploadsRoot =
    `${path.resolve(UPLOADS_DIR)}${path.sep}`;

  // Evita borrar archivos fuera de /uploads
  if (!absolutePath.startsWith(safeUploadsRoot)) {
    console.warn(
      "Ruta de flyer rechazada por seguridad:",
      fileUrl
    );

    return;
  }

  try {
    await fs.promises.unlink(absolutePath);
  } catch (error) {
    if (error.code !== "ENOENT") {
      console.error(
        "No se pudo eliminar el flyer:",
        absolutePath,
        error
      );
    }
  }
}

async function deleteUploadedRequestFiles(filesObject) {
  if (
    !filesObject ||
    typeof filesObject !== "object"
  ) {
    return;
  }

  const files = Object
    .values(filesObject)
    .flat()
    .filter(Boolean);

  await Promise.all(
    files.map(async (file) => {
      try {
        await fs.promises.unlink(file.path);
      } catch (error) {
        if (error.code !== "ENOENT") {
          console.error(
            "No se pudo limpiar un upload incompleto:",
            file.path,
            error
          );
        }
      }
    })
  );
}

function getMulterErrorMessage(error) {
  if (!error) {
    return "Error al subir los archivos";
  }

  if (error.code === "LIMIT_FILE_SIZE") {
    return "Cada imagen debe pesar como máximo 15 MB.";
  }

  if (error.code === "LIMIT_FILE_COUNT") {
    return (
      "Solo se permiten cinco imágenes: " +
      "una principal, una de Reddit y tres adicionales."
    );
  }

  if (error.code === "LIMIT_UNEXPECTED_FILE") {
    return (
      "Archivo no permitido o cantidad de imágenes " +
      "superior al límite. Usa JPG, PNG o WEBP."
    );
  }

  return (
    error.message ||
    "Error al subir los archivos"
  );
}

// Mostrar carpetas en consola
console.log(
  "Archivos en backend:",
  fs.readdirSync(__dirname)
);

// ───────── RUTAS ESTÁTICAS ─────────

// Permite acceder públicamente a los flyers
app.use(
  "/uploads",
  express.static(UPLOADS_DIR)
);

app.use(
  "/widget",
  express.static(path.join(__dirname, "widget"))
);

app.use(
  "/widget2",
  express.static(path.join(__dirname, "widget2"))
);

app.use(
  "/panel",
  express.static(path.join(__dirname, "panel"))
);

app.use(
  "/marketing",
  express.static(path.join(__dirname, "marketing"))
);

app.use(
  "/bar",
  express.static(path.join(__dirname, "bar"))
);

app.use(
  "/bar2",
  express.static(path.join(__dirname, "bar2"))
);

app.use(
  "/overlay",
  express.static(path.join(__dirname, "overlay"))
);

app.use(
  "/roulette",
  express.static(path.join(__dirname, "roulette"))
);

app.use(
  "/countdown",
  express.static(path.join(__dirname, "countdown"))
);

app.use(
  "/countdown2",
  express.static(path.join(__dirname, "countdown2"))
);

app.use(
  "/models",
  express.static(path.join(__dirname, "models"))
);

app.use(
  "/admin",
  express.static(path.join(__dirname, "admin"))
);

app.use(
  "/players",
  express.static(path.join(__dirname, "players"))
);

console.log("Rutas estáticas:");

console.log(
  " -> /widget =>",
  path.join(__dirname, "widget")
);

console.log(
  " -> /widget2 =>",
  path.join(__dirname, "widget2")
);

console.log(
  " -> /panel =>",
  path.join(__dirname, "panel")
);

console.log(
  " -> /bar =>",
  path.join(__dirname, "bar")
);

console.log(
  " -> /marketing =>",
  path.join(__dirname, "marketing")
);

console.log(
  " -> /bar2 =>",
  path.join(__dirname, "bar2")
);

console.log(
  " -> /countdown =>",
  path.join(__dirname, "countdown")
);

console.log(
  " -> /countdown2 =>",
  path.join(__dirname, "countdown2")
);

console.log(
  " -> /overlay =>",
  path.join(__dirname, "overlay")
);

console.log(
  " -> /roulette =>",
  path.join(__dirname, "roulette")
);

console.log(
  " -> /models =>",
  path.join(__dirname, "models")
);

console.log(
  " -> /admin =>",
  path.join(__dirname, "admin")
);

console.log(
  " -> /players =>",
  path.join(__dirname, "players")
);

// ───────── WEBSOCKET: MULTICONEXIONES + HISTORIAL ─────────

const connections = new Map();
const eventLogs = new Map();

function appendEvent(modelId, type, payload) {
  if (!eventLogs.has(modelId)) {
    eventLogs.set(modelId, []);
  }

  const log = eventLogs.get(modelId);

  log.push({
    type,
    payload,
  });

  // Límite de seguridad del historial
  if (log.length > 500) {
    log.splice(
      0,
      log.length - 500
    );
  }
}

// ───────── API: ANALYTICS / STATS ─────────

function parseReportDateTime(dateStr, timeStr) {
  if (!dateStr) {
    return null;
  }

  const safeTime =
    timeStr && timeStr.length >= 4
      ? timeStr
      : "00:00";

  const iso =
    `${dateStr}T${safeTime}:00`;

  const date = new Date(iso);

  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return date;
}

app.get(
  "/api/analytics/monthly",
  async (req, res) => {
    try {
      const reports =
        await getAllReports();

      const monthlyMap = new Map();

      for (const report of reports) {
        const modelName = (
          report.modelName ||
          "Desconocida"
        ).trim();

        if (!modelName) {
          continue;
        }

        const startDateTime =
          parseReportDateTime(
            report.date,
            report.start
          );

        const endDateTime =
          parseReportDateTime(
            report.date,
            report.end
          );

        if (!startDateTime) {
          continue;
        }

        const monthKey =
          `${startDateTime.getFullYear()}-${String(
            startDateTime.getMonth() + 1
          ).padStart(2, "0")}`;

        const mapKey =
          `${modelName}__${monthKey}`;

        const amount =
          Number(report.collectedAmount || 0) || 0;

        const views =
          Number(report.views || 0) || 0;

        const durationMin = endDateTime
          ? Math.max(
              0,
              Math.round(
                (endDateTime - startDateTime) /
                  60000
              )
            )
          : 0;

        const hour =
          startDateTime.getHours();

        const isDay =
          hour >= 10 && hour < 22;

        const slot =
          isDay ? "day" : "night";

        if (!monthlyMap.has(mapKey)) {
          monthlyMap.set(mapKey, {
            modelName,
            month: monthKey,
            totalAmount: 0,
            totalViews: 0,
            totalDurationMin: 0,
            livestreamCount: 0,
            dayStreams: 0,
            nightStreams: 0,
            dayAmount: 0,
            nightAmount: 0,
          });
        }

        const monthlyData =
          monthlyMap.get(mapKey);

        monthlyData.totalAmount += amount;
        monthlyData.totalViews += views;
        monthlyData.totalDurationMin +=
          durationMin;

        monthlyData.livestreamCount += 1;

        if (slot === "day") {
          monthlyData.dayStreams += 1;
          monthlyData.dayAmount += amount;
        } else {
          monthlyData.nightStreams += 1;
          monthlyData.nightAmount += amount;
        }
      }

      const monthly = Array
        .from(monthlyMap.values())
        .sort((a, b) => {
          const byModel =
            a.modelName.localeCompare(
              b.modelName
            );

          if (byModel !== 0) {
            return byModel;
          }

          return a.month.localeCompare(
            b.month
          );
        });

      const models = Array
        .from(
          new Set(
            monthly.map(
              (item) => item.modelName
            )
          )
        )
        .sort((a, b) =>
          a.localeCompare(b)
        );

      return res.json({
        monthly,
        models,
      });
    } catch (error) {
      console.error(
        "Error en GET /api/analytics/monthly:",
        error
      );

      return res.status(500).json({
        message:
          "Error interno del servidor",
      });
    }
  }
);

// ───────── API PARA WIDGETS ─────────

app.post("/api/send", (req, res) => {
  const {
    modelId,
    type,
    payload,
  } = req.body;

  if (!modelId || !type) {
    return res.status(400).json({
      ok: false,
      error:
        "Faltan modelId o type",
    });
  }

  console.log(
    "POST /api/send modelId:",
    modelId,
    "type:",
    type
  );

  console.log(
    "Conexiones activas:",
    Array.from(connections.keys())
  );

  const clientList =
    connections.get(modelId) || [];

  const resetTypes = [
    "clear",
    "clearGoal",
    "resetWidgets",
    "resetAll",
  ];

  if (resetTypes.includes(type)) {
    eventLogs.set(modelId, []);
  } else {
    appendEvent(
      modelId,
      type,
      payload
    );
  }

  clientList.forEach((client) => {
    if (client.readyState === 1) {
      client.send(
        JSON.stringify({
          type,
          payload,
        })
      );
    }
  });

  if (clientList.length === 0) {
    return res.json({
      ok: false,
      error:
        "El modelo no tiene conexiones activas",
    });
  }

  return res.json({
    ok: true,
  });
});

// ───────── API: INGEST TIP ─────────

app.post("/api/tip", (req, res) => {
  const {
    modelId,
    name,
    amount,
  } = req.body;

  if (
    !modelId ||
    !name ||
    amount == null
  ) {
    return res.status(400).json({
      ok: false,
      error:
        "Faltan modelId, name o amount",
    });
  }

  const cleanName =
    String(name).trim();

  const cleanAmount =
    Number(amount);

  if (
    !cleanName ||
    !Number.isFinite(cleanAmount) ||
    cleanAmount <= 0
  ) {
    return res.status(400).json({
      ok: false,
      error:
        "name/amount inválidos",
    });
  }

  const type = "tip";

  const payload = {
    name: cleanName,
    amount: cleanAmount,
  };

  const clientList =
    connections.get(modelId) || [];

  appendEvent(
    modelId,
    type,
    payload
  );

  clientList.forEach((client) => {
    if (client.readyState === 1) {
      client.send(
        JSON.stringify({
          type,
          payload,
        })
      );
    }
  });

  return res.json({
    ok: true,
    deliveredTo: clientList.length,
  });
});

// ───────── BOTÓN PANEL: RE-SYNC WIDGETS ─────────

app.post("/api/resync", (req, res) => {
  const { modelId } = req.body;

  if (!modelId) {
    return res.status(400).json({
      ok: false,
      error: "Falta modelId",
    });
  }

  const log =
    eventLogs.get(modelId) || [];

  const clientList =
    connections.get(modelId) || [];

  clientList.forEach((client) => {
    if (client.readyState !== 1) {
      return;
    }

    log.forEach((event) => {
      try {
        client.send(
          JSON.stringify(event)
        );
      } catch (error) {
        console.error(
          "Error reenviando evento en /api/resync:",
          error
        );
      }
    });
  });

  return res.json({
    ok: true,
    eventsReplayed: log.length,
    clients: clientList.length,
  });
});

// ───────── API: SCHEDULE DE MODELOS ─────────

// Registrar o actualizar un horario y sus flyers
app.post(
  "/api/model-schedule",
  (req, res) => {
    scheduleFlyerUpload(
      req,
      res,
      async (uploadError) => {
        if (uploadError) {
          await deleteUploadedRequestFiles(
            req.files
          );

          console.error(
            "Error de Multer en POST /api/model-schedule:",
            uploadError
          );

          return res.status(400).json({
            success: false,
            message:
              getMulterErrorMessage(
                uploadError
              ),
          });
        }

        try {
          console.log(
            "BODY /api/model-schedule =>",
            req.body
          );

          console.log(
            "FILES /api/model-schedule =>",
            req.files
          );

          const modelName = String(
            req.body.modelName || ""
          ).trim();

          const theme = String(
            req.body.theme || ""
          ).trim();

          const date = String(
            req.body.date || ""
          ).trim();

          const start = String(
            req.body.start || ""
          ).trim();

          const originalDate = String(
            req.body.originalDate || ""
          ).trim();

          const originalStart = String(
            req.body.originalStart || ""
          ).trim();

          if (
            !modelName ||
            !theme ||
            !date ||
            !start
          ) {
            await deleteUploadedRequestFiles(
              req.files
            );

            return res.status(400).json({
              success: false,
              message:
                "Faltan modelo, temática, fecha o horario.",
            });
          }

          const existing =
            await findScheduleForModel(
              modelName,
              date,
              start
            );

          const now =
            new Date().toISOString();

          const newMainFlyer =
            req.files?.flyer?.[0] ||
            null;

          const newRedditFlyer =
            req.files?.reddit?.[0] ||
            null;

          const newAdditionalFlyers =
            req.files?.flyers || [];

          // Conserva la información anterior
          const entry = {
            ...(existing || {}),
            modelName,
            theme,
            date,
            start,
            originalDate,
            originalStart,
            createdAt:
              existing?.createdAt || now,
            updatedAt: now,
          };

          const oldUrlsToDelete = [];

          // Reemplazar flyer principal
          if (newMainFlyer) {
            const oldUrl =
              getStoredFileUrl(
                existing?.flyer
              ) ||
              existing?.flyerUrl ||
              "";

            if (oldUrl) {
              oldUrlsToDelete.push(
                oldUrl
              );
            }

            entry.flyer =
              makePublicFlyerRecord(
                newMainFlyer
              );

            delete entry.flyerUrl;
            delete entry.flyerFileName;
          }

          // Reemplazar flyer de Reddit
          if (newRedditFlyer) {
            const oldUrl =
              getStoredFileUrl(
                existing?.reddit
              ) ||
              existing?.redditUrl ||
              "";

            if (oldUrl) {
              oldUrlsToDelete.push(
                oldUrl
              );
            }

            entry.reddit =
              makePublicFlyerRecord(
                newRedditFlyer
              );

            delete entry.redditUrl;
            delete entry.redditFileName;
          }

          // Reemplazar el grupo de tres flyers
          if (
            newAdditionalFlyers.length > 0
          ) {
            if (
              Array.isArray(
                existing?.flyers
              )
            ) {
              existing.flyers.forEach(
                (item) => {
                  const oldUrl =
                    getStoredFileUrl(
                      item
                    );

                  if (oldUrl) {
                    oldUrlsToDelete.push(
                      oldUrl
                    );
                  }
                }
              );
            }

            entry.flyers =
              newAdditionalFlyers.map(
                makePublicFlyerRecord
              );
          }

          console.log(
            "ENTRY A GUARDAR =>",
            entry
          );

          try {
            await saveSchedule(entry);
          } catch (saveError) {
            await deleteUploadedRequestFiles(
              req.files
            );

            throw saveError;
          }

          // Borrar los flyers que fueron reemplazados
          await Promise.all(
            [...new Set(oldUrlsToDelete)]
              .map(deleteFlyerFileByUrl)
          );

          return res.json({
            success: true,
            schedule: entry,
          });
        } catch (error) {
          console.error(
            "Error en POST /api/model-schedule:",
            error
          );

          return res.status(500).json({
            success: false,
            message:
              "Error interno del servidor",
          });
        }
      }
    );
  }
);

// Obtener todos los schedules
app.get(
  "/api/model-schedule",
  async (req, res) => {
    try {
      const all =
        await getAllSchedules();

      return res.json(all);
    } catch (error) {
      console.error(
        "Error en GET /api/model-schedule:",
        error
      );

      return res.status(500).json({
        message: "Error interno",
      });
    }
  }
);

// Eliminar solamente un flyer
//
// type:
// "flyer"  = flyer principal
// "reddit" = flyer de Reddit
// "flyers" = flyer adicional
//
// Para eliminar uno de los flyers adicionales,
// enviar index: 0, 1 o 2.
//
// Sin index se eliminan todos los adicionales.
app.post(
  "/api/model-schedule/delete-flyer",
  async (req, res) => {
    try {
      const modelName = String(
        req.body.modelName || ""
      ).trim();

      const date = String(
        req.body.date || ""
      ).trim();

      const start = String(
        req.body.start || ""
      ).trim();

      const type = String(
        req.body.type || ""
      ).trim();

      if (
        !modelName ||
        !date ||
        !start ||
        !type
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Faltan modelName, date, start o type.",
        });
      }

      const validTypes = [
        "flyer",
        "reddit",
        "flyers",
      ];

      if (!validTypes.includes(type)) {
        return res.status(400).json({
          success: false,
          message:
            "El tipo de flyer no es válido.",
        });
      }

      const existing =
        await findScheduleForModel(
          modelName,
          date,
          start
        );

      if (!existing) {
        return res.status(404).json({
          success: false,
          message:
            "No se encontró el livestream.",
        });
      }

      const urlsToDelete = [];

      const updatedEntry = {
        ...existing,
        updatedAt:
          new Date().toISOString(),
      };

      if (type === "flyer") {
        const url =
          getStoredFileUrl(
            existing.flyer
          ) ||
          existing.flyerUrl ||
          "";

        if (!url) {
          return res.status(404).json({
            success: false,
            message:
              "Este livestream no tiene flyer principal.",
          });
        }

        urlsToDelete.push(url);

        updatedEntry.flyer = null;

        delete updatedEntry.flyerUrl;
        delete updatedEntry.flyerFileName;
      }

      if (type === "reddit") {
        const url =
          getStoredFileUrl(
            existing.reddit
          ) ||
          existing.redditUrl ||
          "";

        if (!url) {
          return res.status(404).json({
            success: false,
            message:
              "Este livestream no tiene flyer de Reddit.",
          });
        }

        urlsToDelete.push(url);

        updatedEntry.reddit = null;

        delete updatedEntry.redditUrl;
        delete updatedEntry.redditFileName;
      }

      if (type === "flyers") {
        const currentFlyers =
          Array.isArray(
            existing.flyers
          )
            ? [...existing.flyers]
            : [];

        if (!currentFlyers.length) {
          return res.status(404).json({
            success: false,
            message:
              "Este livestream no tiene flyers adicionales.",
          });
        }

        const hasIndex =
          req.body.index !== undefined &&
          req.body.index !== null &&
          req.body.index !== "";

        if (hasIndex) {
          const index =
            Number(req.body.index);

          if (
            !Number.isInteger(index) ||
            index < 0 ||
            index >=
              currentFlyers.length
          ) {
            return res.status(400).json({
              success: false,
              message:
                "El índice del flyer no es válido.",
            });
          }

          const [removedFlyer] =
            currentFlyers.splice(
              index,
              1
            );

          const removedUrl =
            getStoredFileUrl(
              removedFlyer
            );

          if (removedUrl) {
            urlsToDelete.push(
              removedUrl
            );
          }

          updatedEntry.flyers =
            currentFlyers;
        } else {
          currentFlyers.forEach(
            (item) => {
              const url =
                getStoredFileUrl(item);

              if (url) {
                urlsToDelete.push(url);
              }
            }
          );

          updatedEntry.flyers = [];
        }
      }

      await saveSchedule(
        updatedEntry
      );

      await Promise.all(
        urlsToDelete.map(
          deleteFlyerFileByUrl
        )
      );

      return res.json({
        success: true,
        schedule: updatedEntry,
      });
    } catch (error) {
      console.error(
        "Error en POST /api/model-schedule/delete-flyer:",
        error
      );

      return res.status(500).json({
        success: false,
        message:
          "Error interno del servidor",
      });
    }
  }
);

// Eliminar completamente un livestream:
// schedule + reporte + archivos físicos
app.post(
  "/api/model-schedule/delete",
  async (req, res) => {
    try {
      const {
        modelName,
        date,
        start,
      } = req.body;

      if (
        !modelName ||
        !date ||
        !start
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Faltan modelName, date o start",
        });
      }

      const existing =
        await findScheduleForModel(
          modelName,
          date,
          start
        );

      const flyerUrls =
        collectScheduleFlyerUrls(
          existing
        );

      await deleteScheduleForModel(
        modelName,
        date,
        start
      );

      await deleteReportForModel(
        modelName,
        date,
        start
      );

      await Promise.all(
        flyerUrls.map(
          deleteFlyerFileByUrl
        )
      );

      return res.json({
        success: true,
      });
    } catch (error) {
      console.error(
        "Error en POST /api/model-schedule/delete:",
        error
      );

      return res.status(500).json({
        success: false,
        message:
          "Error interno del servidor",
      });
    }
  }
);

// ───────── API: REPORTES DE LIVESTREAM ─────────

// Obtener reportes
app.get(
  "/api/reports",
  async (req, res) => {
    try {
      const all =
        await getAllReports();

      return res.json(all);
    } catch (error) {
      console.error(
        "Error en GET /api/reports:",
        error
      );

      return res.status(500).json({
        message: "Error interno",
      });
    }
  }
);

// Guardar o actualizar un reporte
app.post(
  "/api/reports/admin-update",
  async (req, res) => {
    try {
      const {
        modelName,
        date,
        start,
        end,
        collectedAmount,
        views,
        shadowerFeedback,
        caFeedback,
        livestreamFeedback,
        note,
      } = req.body;

      if (
        !modelName ||
        !date ||
        !start
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Faltan modelName, date o start",
        });
      }

      const now =
        new Date().toISOString();

      const existing =
        await findReportForModel(
          modelName,
          date,
          start
        );

      const entry = {
        modelName,
        date,
        start,

        end:
          typeof end === "string"
            ? end
            : existing?.end || "",

        collectedAmount: Number(
          collectedAmount ??
            existing?.collectedAmount ??
            0
        ),

        views: Number(
          views ??
            existing?.views ??
            0
        ),

        shadowerFeedback:
          typeof shadowerFeedback ===
          "string"
            ? shadowerFeedback
            : existing
                ?.shadowerFeedback ||
              "",

        caFeedback:
          typeof caFeedback ===
          "string"
            ? caFeedback
            : existing?.caFeedback ||
              "",

        livestreamFeedback:
          typeof livestreamFeedback ===
          "string"
            ? livestreamFeedback
            : existing
                ?.livestreamFeedback ||
              "",

        note:
          typeof note === "string"
            ? note
            : existing?.note || "",

        createdAt:
          existing?.createdAt || now,

        updatedAt: now,
      };

      await saveReport(entry);

      return res.json({
        success: true,
      });
    } catch (error) {
      console.error(
        "Error en POST /api/reports/admin-update:",
        error
      );

      return res.status(500).json({
        success: false,
        message:
          "Error interno del servidor",
      });
    }
  }
);

// Eliminar solamente un reporte
app.post(
  "/api/reports/delete",
  async (req, res) => {
    try {
      const {
        modelName,
        date,
        start,
      } = req.body;

      if (
        !modelName ||
        !date ||
        !start
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Faltan modelName, date o start",
        });
      }

      await deleteReportForModel(
        modelName,
        date,
        start
      );

      return res.json({
        success: true,
      });
    } catch (error) {
      console.error(
        "Error en POST /api/reports/delete:",
        error
      );

      return res.status(500).json({
        success: false,
        message:
          "Error interno del servidor",
      });
    }
  }
);
// ───────── WEBSOCKET SERVER ─────────

const server =
  http.createServer(app);

const wss =
  new WebSocketServer({
    noServer: true,
  });

server.on(
  "upgrade",
  (req, socket, head) => {
    const url = new URL(
      req.url,
      "http://localhost"
    );

    const modelId =
      url.searchParams.get(
        "modelId"
      );

    if (!modelId) {
      return socket.destroy();
    }

    wss.handleUpgrade(
      req,
      socket,
      head,
      (webSocket) => {
        wss.emit(
          "connection",
          webSocket,
          modelId
        );
      }
    );
  }
);

wss.on(
  "connection",
  (ws, modelId) => {
    console.log(
      "🎧 Widget conectado:",
      modelId
    );

    if (!connections.has(modelId)) {
      connections.set(
        modelId,
        []
      );
    }

    connections
      .get(modelId)
      .push(ws);

    ws.on("message", (raw) => {
      let data;

      try {
        data = JSON.parse(
          raw.toString()
        );
      } catch {
        return;
      }

      if (data.type === "ping") {
        try {
          ws.send(
            JSON.stringify({
              type: "pong",
              ts: Date.now(),
            })
          );
        } catch (error) {
          console.log(
            "Error enviando pong:",
            error
          );
        }
      }
    });

    ws.on("close", () => {
      console.log(
        "🔌 Widget desconectado:",
        modelId
      );

      const list =
        connections.get(modelId) ||
        [];

      const updated =
        list.filter(
          (client) => client !== ws
        );

      connections.set(
        modelId,
        updated
      );
    });
  }
);

// ───────── MANEJO GENERAL DE ERRORES DE MULTER ─────────

app.use(
  async (error, req, res, next) => {
    if (
      error instanceof
      multer.MulterError
    ) {
      await deleteUploadedRequestFiles(
        req.files
      );

      return res.status(400).json({
        success: false,
        message:
          getMulterErrorMessage(
            error
          ),
      });
    }

    if (error) {
      console.error(
        "Error general del servidor:",
        error
      );

      return res.status(500).json({
        success: false,
        message:
          "Error interno del servidor",
      });
    }

    next();
  }
);

// ───────── START ─────────

const PORT =
  process.env.PORT || 8080;

server.listen(PORT, () => {
  console.log(
    `Backend corriendo en http://localhost:${PORT}`
  );

  console.log(
    `Flyers disponibles en http://localhost:${PORT}/uploads/flyers/`
  );
});

