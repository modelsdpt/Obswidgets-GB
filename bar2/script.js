// GOAL BAR – auto-reconnect + heartbeat
const MODEL_ID = "roman001";

let ws = null;
let reconnectTimeout = null;
let heartbeatInterval = null;

let goal = 0;
let current = 0;
let goalCompleted = false;

const bar = document.getElementById("bar-fill");
const goalTitle = document.querySelector(".goal-title");
const amountText = document.querySelector(".goal-amount");
const tipSound = document.getElementById("tipSound");

// -------------------- AUDIO --------------------
function playTip() {
  if (!tipSound) return;
  try {
    tipSound.currentTime = 0;
    tipSound.volume = 1;
    tipSound.play().catch(() => {});
  } catch (e) {
    console.log("Audio error:", e);
  }
}

// -------------------- WS CONEXIÓN --------------------
function connectWS() {
  const url = `wss://obswidgets-gb-production.up.railway.app/?modelId=${MODEL_ID}`;
  console.log("[GOAL WS] connecting to", url);

  ws = new WebSocket(url);

  ws.onopen = () => {
    console.log("[GOAL WS] CONNECTED");

    if (reconnectTimeout) {
      clearTimeout(reconnectTimeout);
      reconnectTimeout = null;
    }

    startHeartbeat();
  };

  ws.onmessage = (event) => {
    let data;
    try {
      data = JSON.parse(event.data || "{}");
    } catch {
      return;
    }

    if (data.type === "pong") {
      // opcional: console.log("[GOAL WS] pong");
      return;
    }

    handleMessage(data);
  };

  ws.onerror = (err) => {
    console.log("[GOAL WS] ERROR", err);
    try { ws.close(); } catch {}
  };

  ws.onclose = (ev) => {
    console.log("[GOAL WS] CLOSED", ev.code, ev.reason);
    stopHeartbeat();
    scheduleReconnect();
  };
}

function scheduleReconnect() {
  if (reconnectTimeout) return;
  console.log("[GOAL WS] scheduling reconnect in 3s...");
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
      console.log("[GOAL WS] heartbeat error", e);
    }
  }, 30000); // 30s
}

function stopHeartbeat() {
  if (heartbeatInterval) {
    clearInterval(heartbeatInterval);
    heartbeatInterval = null;
  }
}

// -------------------- LÓGICA GOAL BAR --------------------
function handleMessage(data) {
  if (data.type === "setGoal") {
    goal = Number(data.payload?.goal || 0);
    current = 0;
    goalCompleted = false;
    updateBar(false);
  }

  if (data.type === "tip") {
    const amount = Number(data.payload?.amount || 0);
    if (!isNaN(amount) && amount > 0) {
      current += amount;
      updateBar(true);
    }
  }

  if (data.type === "clearGoal") {
    goal = 0;
    current = 0;
    goalCompleted = false;
    updateBar(false);
  }
}

function updateBar(fromTip) {
  const percent = goal ? Math.min((current / goal) * 100, 100) : 0;

  if (bar) {
    bar.style.width = percent + "%";
  }

  if (amountText) {
    amountText.textContent = goal > 0 ? `$${current} / $${goal}` : "";
  }

  if (goalTitle) {
    if (percent >= 100 && goal > 0) {
      goalTitle.classList.add("neon");
      if (!goalCompleted) {
        goalCompleted = true;
        playTip();
      }
    } else {
      goalTitle.classList.remove("neon");
      if (percent < 100) goalCompleted = false;
    }
  }

  if (fromTip) {
    playTip();
  }
}

// arrancar conexión al cargar el widget
connectWS();