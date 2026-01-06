const express = require("express");
const cors = require("cors");
const http = require("http");
const { WebSocketServer } = require("ws");
const path = require("path");
const fs = require("fs");

const app = express();
app.use(cors());
app.use(express.json());

const {
  getAllSchedules,
  findScheduleForModel,
  saveSchedule,
} = require("./scheduleStore");

const {
  getAllReports,
  findReportForModel,
  saveReport,
} = require("./reportStore");


// Mostrar carpetas
console.log("Archivos en backend:", fs.readdirSync(__dirname));

app.use("/widget", express.static(path.join(__dirname, "widget")));
app.use("/panel", express.static(path.join(__dirname, "panel")));
app.use("/bar", express.static(path.join(__dirname, "bar")));
app.use("/overlay", express.static(path.join(__dirname, "overlay")));
app.use("/roulette", express.static(path.join(__dirname, "roulette")));
app.use("/countdown", express.static(path.join(__dirname, "countdown")));
app.use("/models", express.static(path.join(__dirname, "models")));
app.use("/admin", express.static(path.join(__dirname, "admin")));



console.log("Rutas estáticas:");
console.log(" -> /widget  =>", path.join(__dirname, "widget"));
console.log(" -> /countdown  =>", path.join(__dirname, "countdown"));
console.log(" -> /panel   =>", path.join(__dirname, "panel"));
console.log(" -> /bar     =>", path.join(__dirname, "bar"));
console.log(" -> /overlay     =>", path.join(__dirname, "overlay"));
console.log(" -> /roulette     =>", path.join(__dirname, "roulette"));

// MULTICONEXIONES POR modelId
const connections = new Map();

// ===== API PARA ENVIAR MENSAJES =====
app.post("/api/send", (req, res) => {
  const { modelId, type, payload } = req.body;

  console.log("POST /api/send modelId:", modelId);
  console.log("Conexiones:", Array.from(connections.keys()));

  const clientList = connections.get(modelId) || [];

  if (clientList.length === 0) {
    return res.json({ ok: false, error: "El modelo no tiene conexiones activas" });
  }

  clientList.forEach(client => {
    if (client.readyState === 1) {
      client.send(JSON.stringify({ type, payload }));
    }
  });

  return res.json({ ok: true });
});


// POST: registrar horario de una modelo (solo una vez)
app.post("/api/model-schedule", async (req, res) => {
  try {
    const { modelName, date, start } = req.body;

    // ahora solo validamos que haya datos
    if (!modelName || !date || !start) {
      return res
        .status(400)
        .json({ success: false, message: "Datos incompletos" });
    }

    const now = new Date().toISOString();
    const existing = await findScheduleForModel(modelName);

    // si ya existe, lo ACTUALIZAMOS; si no, lo creamos
    const entry = {
      modelName,
      date,
      start,
      // fin lo rellenas tú luego desde el dashboard si quieres
      end: existing?.end || "",
      locked: false, // ya no usamos bloqueo
      createdAt: existing?.createdAt || now,
      updatedAt: now,
    };

    await saveSchedule(entry);

    return res.json({ success: true });
  } catch (err) {
    console.error("Error en POST /api/model-schedule:", err);
    return res
      .status(500)
      .json({ success: false, message: "Error interno del servidor" });
  }
});


// GET /api/reports  -> listado de reportes de livestreams
app.get("/api/reports", async (req, res) => {
  try {
    const all = await getAllReports();
    return res.json(all);
  } catch (err) {
    console.error("Error en GET /api/reports:", err);
    return res.status(500).json({ message: "Error interno" });
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

// POST /api/reports/admin-update
// Guarda feedback, monto, views, hora de fin, etc.
app.post("/api/reports/admin-update", async (req, res) => {
  try {
    const {
      modelName,
      date,
      start,
      end,
      feedback,
      collectedAmount,
      views,
    } = req.body;

    if (!modelName) {
      return res
        .status(400)
        .json({ success: false, message: "Falta modelName" });
    }

    const now = new Date().toISOString();
    const existing = await findReportForModel(modelName);

    const entry = {
      modelName,
      date: date || existing?.date || "",
      start: start || existing?.start || "",
      end: typeof end === "string" ? end : (existing?.end || ""),
      feedback: typeof feedback === "string" ? feedback : (existing?.feedback || ""),
      collectedAmount: Number(
        collectedAmount ?? existing?.collectedAmount ?? 0
      ),
      views: Number(views ?? existing?.views ?? 0),
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

  ws.on("close", () => {
    console.log("🔌 Widget desconectado:", modelId);

    const list = connections.get(modelId) || [];
    const updated = list.filter(c => c !== ws);
    connections.set(modelId, updated);
  });
});

const PORT = process.env.PORT || 8080;
server.listen(PORT, () => {
  console.log(`Backend corriendo en http://localhost:${PORT}`);
});
