const express = require("express");
const cors = require("cors");
const http = require("http");
const { WebSocketServer } = require("ws");
const path = require("path");
const fs = require("fs");

const app = express();
app.use(cors());
app.use(express.json());

// Mostrar carpetas
console.log("Archivos en backend:", fs.readdirSync(__dirname));

app.use("/widget", express.static(path.join(__dirname, "widget")));
app.use("/panel", express.static(path.join(__dirname, "panel")));
app.use("/bar", express.static(path.join(__dirname, "bar")));
app.use("/overlay", express.static(path.join(__dirname, "overlay")));
app.use("/roulette", express.static(path.join(__dirname, "roulette")));



console.log("Rutas estáticas:");
console.log(" -> /widget  =>", path.join(__dirname, "widget"));
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
