const express = require("express");
const cors = require("cors");
const http = require("http");
const { WebSocketServer } = require("ws");
const path = require("path");
const fs = require("fs");

const app = express();
app.use(cors());
app.use(express.json());

// Servir carpetas estáticas
app.use("/widget", express.static(path.join(__dirname, "widget")));
app.use("/panel", express.static(path.join(__dirname, "panel")));
app.use("/bar", express.static(path.join(__dirname, "bar")));
app.use("/overlay", express.static(path.join(__dirname, "overlay")));
app.use("/roulette", express.static(path.join(__dirname, "roulette")));

const connections = new Map();

// API para enviar mensajes desde el Panel a los Widgets
app.post("/api/send", (req, res) => {
  const { modelId, type, payload } = req.body;
  console.log(`Petición de envío para: ${modelId}`);

  const clientList = connections.get(modelId) || [];
  if (clientList.length === 0) {
    return res.json({ ok: false, error: "No hay widgets conectados para este modelo" });
  }

  clientList.forEach(client => {
    if (client.readyState === 1) { // 1 = OPEN
      client.send(JSON.stringify({ type, payload }));
    }
  });

  return res.json({ ok: true });
});

const server = http.createServer(app);
const wss = new WebSocketServer({ noServer: true });

// Lógica de conexión WebSocket (Upgrade de HTTP a WS)
server.on("upgrade", (req, socket, head) => {
  const url = new URL(req.url, `http://${req.headers.host}`);
  const modelId = url.searchParams.get("modelId");

  if (!modelId) {
    console.log("⚠️ Conexión rechazada: Falta modelId en la URL");
    socket.destroy();
    return;
  }

  wss.handleUpgrade(req, socket, head, (wsocket) => {
    wss.emit("connection", wsocket, modelId);
  });
});

wss.on("connection", (ws, modelId) => {
  console.log(`✅ Widget conectado: ${modelId}`);

  if (!connections.has(modelId)) {
    connections.set(modelId, []);
  }
  connections.get(modelId).push(ws);

  ws.on("close", () => {
    console.log(`❌ Widget desconectado: ${modelId}`);
    const list = connections.get(modelId) || [];
    connections.set(modelId, list.filter(c => c !== ws));
  });

  // Mantener la conexión viva (Heartbeat)
  ws.on("pong", () => { ws.isAlive = true; });
});

// Railway usa process.env.PORT obligatoriamente
const PORT = process.env.PORT || 8080;
server.listen(PORT, "0.0.0.0", () => {
  console.log(`🚀 Servidor listo en el puerto ${PORT}`);
});