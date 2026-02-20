// GOAL BAR – auto-reconnect + heartbeat + multi-stage
const MODEL_ID = "roman001";

let ws = null;
let reconnectTimeout = null;
let heartbeatInterval = null;

// total acumulado de tips
let current = 0;
// metas por tramos (cumulativas): [{ target, label }]
let stages = [];
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
    console.log("[GOAL] Audio error:", e);
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

// Normaliza stages que vengan del panel
function setStagesFromPayload(payload) {
  const raw = Array.isArray(payload?.stages) ? payload.stages : [];

  stages = raw
    .map((s) => ({
      target: Number(s.target ?? s.goal ?? 0),
      label: (s.label ?? s.title ?? "").trim() || "Goal",
    }))
    .filter((s) => s.target > 0)
    .sort((a, b) => a.target - b.target);

  // opcional: permitir enviar current inicial desde el panel
  const initial = Number(payload?.current ?? 0);
  current = isNaN(initial) || initial < 0 ? 0 : initial;

  goalCompleted = false;
  updateBar(false);
}

function handleMessage(data) {
  // NUEVO: configuración multi-goal
  if (data.type === "setGoalConfig") {
    setStagesFromPayload(data.payload || {});
    return;
  }

  // COMPAT: meta simple antigua (un solo goal)
  if (data.type === "setGoal") {
    const g = Number(data.payload?.goal || 0);
    const label = (data.payload?.label || data.payload?.title || "").trim() || "Goal";
    if (g > 0) {
      stages = [{ target: g, label }];
    } else {
      stages = [];
    }
    current = 0;
    goalCompleted = false;
    updateBar(false);
    return;
  }

  if (data.type === "tip") {
    const amount = Number(data.payload?.amount || 0);
    if (!isNaN(amount) && amount > 0) {
      current += amount;          // total acumulado
      updateBar(true);
    }
    return;
  }

  if (data.type === "clearGoal") {
    stages = [];
    current = 0;
    goalCompleted = false;
    updateBar(false);
    return;
  }
}

function updateBar(fromTip) {
  let percent = 0;
  let labelText = "";
  let amountLabel = "";

  if (!stages.length) {
    // si no hay configuración, escondemos todo
    if (bar) bar.style.width = "0%";
    if (amountText) amountText.textContent = "";
    if (goalTitle) {
      goalTitle.textContent = "";
      goalTitle.classList.remove("neon");
    }
    return;
  }

  const lastStage = stages[stages.length - 1];

  // ¿qué tramo está activo para el total actual?
  let activeIndex = stages.findIndex((s) => current <= s.target);
  let allDone = false;

  if (activeIndex === -1) {
    // superó la última meta -> usamos la última como referencia,
    // y marcamos como completado
    activeIndex = stages.length - 1;
    allDone = true;
  }

  const activeStage = stages[activeIndex];
  const prevTarget = activeIndex > 0 ? stages[activeIndex - 1].target : 0;
  const span = Math.max(1, activeStage.target - prevTarget);
  const stageProgress = Math.max(0, current - prevTarget);

  percent = Math.min((stageProgress / span) * 100, 100);
  labelText = activeStage.label;
  amountLabel = `$${current} / $${activeStage.target}`;

  if (allDone && current >= lastStage.target) {
    percent = 100;
  }

  if (bar) {
    bar.style.width = `${percent}%`;
  }

  if (goalTitle) {
    goalTitle.textContent = labelText;
    if (current >= lastStage.target) {
      goalTitle.classList.add("neon");
      if (!goalCompleted) {
        goalCompleted = true;
        playTip();
      }
    } else {
      goalTitle.classList.remove("neon");
      goalCompleted = false;
    }
  }

  if (amountText) {
    amountText.textContent = amountLabel;
  }

  if (fromTip && !goalCompleted) {
    playTip();
  }
}

// arrancar conexión al cargar el widget
connectWS();