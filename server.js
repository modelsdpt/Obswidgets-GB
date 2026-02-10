const express = require("express");
const cors = require("cors");
const http = require("http");
const { WebSocketServer } = require("ws");
const path = require("path");
const fs = require("fs");

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

// Mostrar carpetas (debug)
console.log("Archivos en backend:", fs.readdirSync(__dirname));

// ───────── RUTAS ESTÁTICAS ─────────
app.use("/widget",   express.static(path.join(__dirname, "widget")));
app.use("/widget2",  express.static(path.join(__dirname, "widget2")));

app.use("/panel",    express.static(path.join(__dirname, "panel")));

app.use("/bar",      express.static(path.join(__dirname, "bar")));
app.use("/bar2",     express.static(path.join(__dirname, "bar2")));

app.use("/overlay",  express.static(path.join(__dirname, "overlay")));
app.use("/roulette", express.static(path.join(__dirname, "roulette")));

app.use("/countdown",  express.static(path.join(__dirname, "countdown")));
app.use("/countdown2", express.static(path.join(__dirname, "countdown2")));

app.use("/models",   express.static(path.join(__dirname, "models")));
app.use("/admin",    express.static(path.join(__dirname, "admin")));
app.use("/players",  express.static(path.join(__dirname, "players")));

console.log("Rutas estáticas:");
console.log(" -> /widget     =>", path.join(__dirname, "widget"));
console.log(" -> /widget2    =>", path.join(__dirname, "widget2"));
console.log(" -> /panel      =>", path.join(__dirname, "panel"));
console.log(" -> /bar        =>", path.join(__dirname, "bar"));
console.log(" -> /bar2       =>", path.join(__dirname, "bar2"));
console.log(" -> /countdown  =>", path.join(__dirname, "countdown"));
console.log(" -> /countdown2 =>", path.join(__dirname, "countdown2"));
console.log(" -> /overlay    =>", path.join(__dirname, "overlay"));
console.log(" -> /roulette   =>", path.join(__dirname, "roulette"));
console.log(" -> /models     =>", path.join(__dirname, "models"));
console.log(" -> /admin      =>", path.join(__dirname, "admin"));
console.log(" -> /players    =>", path.join(__dirname, "players"));

// ───────── WEBSOCKET: MULTICONEXIONES + HISTORIAL ─────────
const connections = new Map(); // modelId -> [ws]
const eventLogs   = new Map(); // modelId -> [ { type, payload } ]

function appendEvent(modelId, type, payload) {
  if (!eventLogs.has(modelId)) eventLogs.set(modelId, []);
  const log = eventLogs.get(modelId);
  log.push({ type, payload });

  // límite de seguridad
  if (log.length > 500) {
    log.splice(0, log.length - 500);
  }
}

// API para enviar eventos a los widgets conectados
app.post("/api/send", (req, res) => {
  const { modelId, type, payload } = req.body;

  if (!modelId || !type) {
    return res
      .status(400)
      .json({ ok: false, error: "Faltan modelId o type" });
  }

  console.log("POST /api/send modelId:", modelId, "type:", type);
  console.log("Conexiones activas:", Array.from(connections.keys()));

  const clientList = connections.get(modelId) || [];

  // Tipos que significan "reset" de estado (limpiar top 3, limpiar goal, etc.)
  const resetTypes = ["clear", "clearGoal", "resetWidgets", "resetAll"];

  if (resetTypes.includes(type)) {
    // Empezamos show nuevo: vaciamos historial
    eventLogs.set(modelId, []);
  } else {
    appendEvent(modelId, type, payload);
  }

  // Enviar evento a los widgets conectados
  clientList.forEach((client) => {
    if (client.readyState === 1) {
      client.send(JSON.stringify({ type, payload }));
    }
  });

  if (clientList.length === 0) {
    return res.json({
      ok: false,
      error: "El modelo no tiene conexiones activas",
    });
  }

  return res.json({ ok: true });
});

// ───────── BOTÓN PANEL: RE-SYNC WIDGETS ─────────
app.post("/api/resync", (req, res) => {
  const { modelId } = req.body;

  if (!modelId) {
    return res
      .status(400)
      .json({ ok: false, error: "Falta modelId" });
  }

  const log = eventLogs.get(modelId) || [];
  const clientList = connections.get(modelId) || [];

  clientList.forEach((client) => {
    if (client.readyState === 1) {
      log.forEach((evt) => {
        try {
          client.send(JSON.stringify(evt));
        } catch (e) {
          console.error("Error reenviando evento en /api/resync:", e);
        }
      });
    }
  });

  return res.json({
    ok: true,
    eventsReplayed: log.length,
    clients: clientList.length,
  });
});

// ───────── API: SCHEDULE DE MODELOS ─────────

// POST: registrar / actualizar horario de una modelo
app.post("/api/model-schedule", async (req, res) => {
  try {
    const { modelName, date, start, originalDate, originalStart } = req.body;

    if (!modelName || !date || !start) {
      return res
        .status(400)
        .json({ success: false, message: "Faltan campos" });
    }

    const entry = {
      modelName,
      date,
      start,
      originalDate,
      originalStart,
    };

    // upsert por (modelName + date + start) dentro de schedules.json
    await saveSchedule(entry);

    return res.json({ success: true });
  } catch (err) {
    console.error("Error en POST /api/model-schedule:", err);
    return res
      .status(500)
      .json({ success: false, message: "Error interno del servidor" });
  }
});

// GET: devolver horarios para el panel admin
app.get("/api/model-schedule", async (req, res) => {
  try {
    const all = await getAllSchedules();
    return res.json(all);
  } catch (err) {
    console.error("Error en GET /api/model-schedule:", err);
    return res.status(500).json({ message: "Error interno" });
  }
});

// POST: eliminar COMPLETAMENTE un livestream (horario + reporte)
app.post("/api/model-schedule/delete", async (req, res) => {
  try {
    const { modelName, date, start } = req.body;

    if (!modelName || !date || !start) {
      return res
        .status(400)
        .json({
          success: false,
          message: "Faltan modelName, date o start",
        });
    }

    await deleteScheduleForModel(modelName, date, start);
    await deleteReportForModel(modelName, date, start);

    return res.json({ success: true });
  } catch (err) {
    console.error("Error en POST /api/model-schedule/delete:", err);
    return res
      .status(500)
      .json({ success: false, message: "Error interno del servidor" });
  }
});

// ───────── API: REPORTES DE LIVESTREAM ─────────

// GET /api/reports -> listado de reportes de livestreams
app.get("/api/reports", async (req, res) => {
  try {
    const all = await getAllReports();
    return res.json(all);
  } catch (err) {
    console.error("Error en GET /api/reports:", err);
    return res.status(500).json({ message: "Error interno" });
  }
});

// POST /api/reports/admin-update -> guarda feedbacks, nota, views, monto, fin
app.post("/api/reports/admin-update", async (req, res) => {
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

    if (!modelName || !date || !start) {
      return res
        .status(400)
        .json({
          success: false,
          message: "Faltan modelName, date o start",
        });
    }

    const now = new Date().toISOString();
    const existing = await findReportForModel(modelName, date, start);

    const entry = {
      modelName,
      date,
      start,
      end: typeof end === "string" ? end : existing?.end || "",
      collectedAmount: Number(
        collectedAmount ?? existing?.collectedAmount ?? 0
      ),
      views: Number(views ?? existing?.views ?? 0),

      shadowerFeedback:
        typeof shadowerFeedback === "string"
          ? shadowerFeedback
          : existing?.shadowerFeedback || "",
      caFeedback:
        typeof caFeedback === "string"
          ? caFeedback
          : existing?.caFeedback || "",
      livestreamFeedback:
        typeof livestreamFeedback === "string"
          ? livestreamFeedback
          : existing?.livestreamFeedback || "",
      note:
        typeof note === "string"
          ? note
          : existing?.note || "",

      createdAt: existing?.createdAt || now,
      updatedAt: now,
    };

    await saveReport(entry);

    return res.json({ success: true });
  } catch (err) {
    console.error("Error en POST /api/reports/admin-update:", err);
    return res
      .status(500)
      .json({ success: false, message: "Error interno del servidor" });
  }
});

// mantenemos este endpoint por si lo necesitas en otro lado
app.post("/api/reports/delete", async (req, res) => {
  try {
    const { modelName, date, start } = req.body;
    if (!modelName || !date || !start) {
      return res
        .status(400)
        .json({
          success: false,
          message: "Faltan modelName, date o start",
        });
    }

    await deleteReportForModel(modelName, date, start);
    return res.json({ success: true });
  } catch (err) {
    console.error("Error en POST /api/reports/delete:", err);
    return res
      .status(500)
      .json({ success: false, message: "Error interno del servidor" });
  }
});

// ───────── WEBSOCKET SERVER ─────────
const server = http.createServer(app);
const wss = new WebSocketServer({ noServer: true });

server.on("upgrade", (req, socket, head) => {
  const url = new URL(req.url, "http://localhost");
  const modelId = url.searchParams.get("modelId");

  if (!modelId) return socket.destroy();

  wss.handleUpgrade(req, socket, head, (wsocket) => {
    wss.emit("connection", wsocket, modelId);
  });
});

wss.on("connection", (ws, modelId) => {
  console.log("🎧 Widget conectado:", modelId);

  if (!connections.has(modelId)) {
    connections.set(modelId, []);
  }
  connections.get(modelId).push(ws);

  // Reenviar historial al nuevo widget
  const log = eventLogs.get(modelId) || [];
  if (log.length) {
    console.log(`Reenviando ${log.length} eventos a widget de ${modelId}`);
    log.forEach((evt) => {
      try {
        ws.send(JSON.stringify(evt));
      } catch (e) {
        console.error("Error reenviando evento en on(connection):", e);
      }
    });
  }

  ws.on("close", () => {
    console.log("🔌 Widget desconectado:", modelId);

    const list = connections.get(modelId) || [];
    const updated = list.filter((c) => c !== ws);
    connections.set(modelId, updated);
  });
});

// ───────── START ─────────
const PORT = process.env.PORT || 8080;
server.listen(PORT, () => {
  console.log(`Backend corriendo en http://localhost:${PORT}`);
});
