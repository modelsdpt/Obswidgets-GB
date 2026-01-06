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
    const { modelName, date, start, end } = req.body;

    if (!modelName || !date || !start || !end) {
      return res
        .status(400)
        .json({ success: false, message: "Datos incompletos" });
    }

    const existing = await findScheduleForModel(modelName);

    // hard-lock: si ya tiene locked = true, no puede cambiarlo
    if (existing && existing.locked) {
      return res.status(403).json({
        success: false,
        message: "Este modelo ya tiene un horario registrado",
      });
    }

    const entry = {
      modelName,
      date,   // YYYY-MM-DD (tal como viene del input)
      start,  // HH:MM
      end,    // HH:MM
      locked: true,
      createdAt: new Date().toISOString(),
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
