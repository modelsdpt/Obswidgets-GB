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
app.use("/marketing", express.static(path.join(__dirname, "marketing")));

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
console.log(" -> /marketing  =>", path.join(__dirname, "marketing"));
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


// ───────── API: ANALYTICS / STATS ─────────

function parseReportDateTime(dateStr, timeStr) {
  if (!dateStr) return null;
  const safeTime = (timeStr && timeStr.length >= 4) ? timeStr : "00:00";
  const iso = `${dateStr}T${safeTime}:00`;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return d;
}

app.get("/api/analytics/monthly", async (req, res) => {
  try {
    const reports = await getAllReports(); // viene de reportStore.js

    const monthlyMap = new Map();

    for (const r of reports) {
      const modelName = (r.modelName || "Desconocida").trim();
      if (!modelName) continue;

      const startDt = parseReportDateTime(r.date, r.start);
      const endDt = parseReportDateTime(r.date, r.end);
      if (!startDt) continue;

      const monthKey = `${startDt.getFullYear()}-${String(
        startDt.getMonth() + 1
      ).padStart(2, "0")}`;

      const mapKey = `${modelName}__${monthKey}`;

      const amount = Number(r.collectedAmount || 0) || 0;
      const views = Number(r.views || 0) || 0;
      const durationMin = endDt
        ? Math.max(0, Math.round((endDt - startDt) / 60000))
        : 0;

      // día vs noche (ajusta rangos si quieres)
      const hour = startDt.getHours();
      const isDay = hour >= 10 && hour < 22;
      const slot = isDay ? "day" : "night";

      if (!monthlyMap.has(mapKey)) {
        monthlyMap.set(mapKey, {
          modelName,
          month: monthKey,            // "2026-02"
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

      const m = monthlyMap.get(mapKey);
      m.totalAmount += amount;
      m.totalViews += views;
      m.totalDurationMin += durationMin;
      m.livestreamCount += 1;

      if (slot === "day") {
        m.dayStreams += 1;
        m.dayAmount += amount;
      } else {
        m.nightStreams += 1;
        m.nightAmount += amount;
      }
    }

    const monthly = Array.from(monthlyMap.values()).sort((a, b) => {
      const byModel = a.modelName.localeCompare(b.modelName);
      if (byModel !== 0) return byModel;
      return a.month.localeCompare(b.month);
    });

    // lista de modelos disponibles para el selector
    const models = Array.from(
      new Set(monthly.map((m) => m.modelName))
    ).sort((a, b) => a.localeCompare(b));

    res.json({ monthly, models });
  } catch (err) {
    console.error("Error en GET /api/analytics/monthly:", err);
    return res.status(500).json({ message: "Error interno del servidor" });
  }
});


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


// ───────── API: INGEST TIP (AUTOMATIZADO) ─────────
// No rompe nada manual. Internamente reutiliza /api/send logic.
app.post("/api/tip", (req, res) => {
  const { modelId, name, amount } = req.body;

  if (!modelId || !name || amount == null) {
    return res.status(400).json({ ok: false, error: "Faltan modelId, name o amount" });
  }

  const cleanName = String(name).trim();
  const cleanAmount = Number(amount);

  if (!cleanName || !Number.isFinite(cleanAmount) || cleanAmount <= 0) {
    return res.status(400).json({ ok: false, error: "name/amount inválidos" });
  }

  const type = "tip";
  const payload = { name: cleanName, amount: cleanAmount };

  // Reutiliza exactamente la misma lógica que /api/send
  const clientList = connections.get(modelId) || [];

  const resetTypes = ["clear", "clearGoal", "resetWidgets", "resetAll"];
  if (resetTypes.includes(type)) {
    eventLogs.set(modelId, []);
  } else {
    appendEvent(modelId, type, payload);
  }

  clientList.forEach((client) => {
    if (client.readyState === 1) {
      client.send(JSON.stringify({ type, payload }));
    }
  });

  // Importante: aunque no haya widgets conectados, respondemos ok:true
  // porque la automatización debe "enviar" igual (ya se verá en el widget cuando conecte)
  return res.json({ ok: true, deliveredTo: clientList.length });
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
    console.log("BODY /api/model-schedule =>", req.body);

    const { modelName, theme, date, start, originalDate, originalStart } = req.body;

    if (!modelName || !theme || !date || !start) {
      return res
        .status(400)
        .json({ success: false, message: "Faltan campos" });
    }

    const entry = {
      modelName,
      theme,
      date,
      start,
      originalDate,
      originalStart,
    };

    console.log("ENTRY A GUARDAR =>", entry);

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

  // 🔹 Escuchamos mensajes desde los widgets (MVP, goal, timer, etc.)
  ws.on("message", (raw) => {
    let data;
    try {
      data = JSON.parse(raw.toString());
    } catch {
      return;
    }

    // Heartbeat: el widget manda { type: "ping", ts: ... }
    if (data.type === "ping") {
      // opcional responder
      try {
        ws.send(JSON.stringify({ type: "pong", ts: Date.now() }));
      } catch (e) {
        console.log("Error enviando pong:", e);
      }
    }

    // Aquí en el futuro podrías manejar cosas tipo:
    // if (data.type === "widgetReady") { ... }
    // if (data.type === "reportError") { ... }
  });

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
