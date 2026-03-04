// MVP WIDGET – auto-reconnect + heartbeat
const MODEL_ID = "roman001";

let ws = null;
let reconnectTimeout = null;
let heartbeatInterval = null;


// mapa de scores tal como antes
let scores = {};

// -------------------- CONEXIÓN WS --------------------

function getWSBase() {
  // http://localhost:8080  -> ws://localhost:8080
  // https://xxx.railway.app -> wss://xxx.railway.app
  return window.location.origin.replace(/^http/, "ws");
}
function connectWS() {
  const WS_BASE = getWSBase();
  const url = `${WS_BASE}/?modelId=${encodeURIComponent(MODEL_ID)}`;

  console.log("[WS] connecting to", url);

  ws = new WebSocket(url);

  ws.onopen = () => {
    console.log("[WS] CONNECTED");

    if (reconnectTimeout) {
      clearTimeout(reconnectTimeout);
      reconnectTimeout = null;
    }

    startHeartbeat();
  };

  ws.onmessage = (msg) => {
    let data;
    try {
      data = JSON.parse(msg.data || "{}");
    } catch {
      return;
    }

    if (data.type === "pong") return;

    handleMessage(data);
  };

  ws.onerror = (err) => {
    console.log("[WS] ERROR", err);
    try { ws.close(); } catch {}
  };

  ws.onclose = (ev) => {
    console.log("[WS] CLOSED", ev.code, ev.reason);
    stopHeartbeat();
    scheduleReconnect();
  };
}
function scheduleReconnect() {
  if (reconnectTimeout) return; // ya hay un reconnect programado
  console.log("[WS] scheduling reconnect in 3s...");
  reconnectTimeout = setTimeout(() => {
    reconnectTimeout = null;
    connectWS();
  }, 3000);
}

// -------------------- HEARTBEAT --------------------
function startHeartbeat() {
  stopHeartbeat();
  heartbeatInterval = setInterval(() => {
    if (!ws || ws.readyState !== WebSocket.OPEN) return;
    try {
      ws.send(JSON.stringify({ type: "ping", ts: Date.now() }));
    } catch (e) {
      console.log("[WS] heartbeat send error", e);
    }
  }, 30000); // 30s
}

function stopHeartbeat() {
  if (heartbeatInterval) {
    clearInterval(heartbeatInterval);
    heartbeatInterval = null;
  }
}

// -------------------- LÓGICA DEL MVP --------------------
function handleMessage(data) {
  if (data.type === "tip") {
    const name = (data.payload?.name || "").trim();
    const amount = Number(data.payload?.amount || 0);
    if (!name || isNaN(amount) || amount <= 0) return;

    // suma al acumulado
    scores[name] = (scores[name] || 0) + amount;
    render();
  }

  if (data.type === "clear") {
    scores = {};
    render();
  }
}

function render() {
  const list = document.getElementById("top-list");
  if (!list) return;
  list.innerHTML = "";

  const sorted = Object.entries(scores)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3);

  sorted.forEach(([name, total], idx) => {
    const row = document.createElement("div");
    row.className = "tip";

    if (idx === 0) row.classList.add("mvp");
    if (idx === 1) row.classList.add("second");
    if (idx === 2) row.classList.add("third");

    row.innerHTML = `
      <span class="name">${name}</span>
      <span class="amount">$${total}</span>
    `;

    list.appendChild(row);
  });
}

// arrancar conexión al cargar el widget
connectWS();