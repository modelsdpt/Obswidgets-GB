// script.js  – Poll Widget (WebSocket, estilo rosa)

// Usa el mismo MODEL_ID y endpoint que tus otros widgets
const MODEL_ID = "roman001";
const ws = new WebSocket(
  `wss://obswidgets-gb-production.up.railway.app/?modelId=${MODEL_ID}`
);

// Estado interno de la encuesta
const pollState = {
  question: "",
  optionA: "",
  optionB: "",
  votesA: 0,
  votesB: 0,
};

// ----- Render -----

function applyPollToUI() {
  const widget = document.getElementById("poll-widget");

  const qEl = document.getElementById("poll-question");

  const labelA = document.getElementById("label-a");
  const labelB = document.getElementById("label-b");
  const percentA = document.getElementById("percent-a");
  const percentB = document.getElementById("percent-b");
  const fillA = document.getElementById("fill-a");
  const fillB = document.getElementById("fill-b");
  const votesAEl = document.getElementById("votes-a");
  const votesBEl = document.getElementById("votes-b");
  const totalEl = document.getElementById("poll-total");

  const active = !!pollState.question;

  // Si no hay encuesta activa, dejamos todo en cero y ocultamos el widget
  if (!active) {
    if (qEl) qEl.textContent = "Waiting for next poll...";
    if (labelA) labelA.textContent = "Option A";
    if (labelB) labelB.textContent = "Option B";
    if (percentA) percentA.textContent = "0%";
    if (percentB) percentB.textContent = "0%";
    if (fillA) fillA.style.width = "0%";
    if (fillB) fillB.style.width = "0%";
    if (votesAEl) votesAEl.textContent = "0 votes";
    if (votesBEl) votesBEl.textContent = "0 votes";
    if (totalEl) totalEl.textContent = "Total: 0 votes";
    if (widget) widget.classList.add("hidden");
    return;
  }

  const total = pollState.votesA + pollState.votesB;
  const pctA = total ? Math.round((pollState.votesA * 100) / total) : 0;
  const pctB = total ? Math.round((pollState.votesB * 100) / total) : 0;

  if (qEl) qEl.textContent = pollState.question;
  if (labelA) labelA.textContent = pollState.optionA || "Option A";
  if (labelB) labelB.textContent = pollState.optionB || "Option B";

  if (percentA) percentA.textContent = `${pctA}%`;
  if (percentB) percentB.textContent = `${pctB}%`;

  if (fillA) fillA.style.width = `${pctA}%`;
  if (fillB) fillB.style.width = `${pctB}%`;

  if (votesAEl) {
    votesAEl.textContent = `${pollState.votesA} vote${
      pollState.votesA === 1 ? "" : "s"
    }`;
  }
  if (votesBEl) {
    votesBEl.textContent = `${pollState.votesB} vote${
      pollState.votesB === 1 ? "" : "s"
    }`;
  }

  if (totalEl) {
    totalEl.textContent = `Total: ${total} vote${total === 1 ? "" : "s"}`;
  }

  if (widget) widget.classList.remove("hidden");
}

// ----- Handlers de mensajes -----

function handlePollState(payload = {}) {
  pollState.question = payload.question || "";
  pollState.optionA = payload.optionA || "";
  pollState.optionB = payload.optionB || "";
  pollState.votesA = Number(payload.votesA || 0);
  pollState.votesB = Number(payload.votesB || 0);
  applyPollToUI();
}

function handlePollClear() {
  pollState.question = "";
  pollState.optionA = "";
  pollState.optionB = "";
  pollState.votesA = 0;
  pollState.votesB = 0;
  applyPollToUI();
}

// ----- WebSocket -----

ws.onmessage = (msg) => {
  let data;
  try {
    data = JSON.parse(msg.data || "{}");
  } catch {
    return;
  }

  // Esperamos algo tipo:
  // { type: "pollState", payload: { question, optionA, optionB, votesA, votesB } }
  // { type: "pollClear" }
  // (Y si desde el panel envías "clear" global, también podemos limpiar la encuesta)

  if (data.type === "pollState") {
    handlePollState(data.payload || {});
  }

  if (data.type === "pollClear" || data.type === "clear") {
    handlePollClear();
  }
};

ws.onerror = (err) => {
  console.error("[POLL] WebSocket error:", err);
};

// Estado inicial
applyPollToUI();
