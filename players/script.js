// script.js — Raffle Widget

const MODEL_ID = "roman001";

const WS_URL = `wss://obswidgets-gb-production.up.railway.app/?modelId=${MODEL_ID}`;

let ws = null;
let reconnectTimer = null;
let spinTimer = null;
let hideTimer = null;

const raffleState = {
  entries: [],
  expandedTickets: [],
  winner: null,
  isRunning: false,
};

function connectWS() {
  ws = new WebSocket(WS_URL);

  ws.onopen = () => {
    console.log("[RAFFLE] WebSocket conectado");
  };

  ws.onmessage = (msg) => {
    let data;

    try {
      data = JSON.parse(msg.data || "{}");
    } catch {
      return;
    }

    if (data.type === "raffleStart") {
      handleRaffleStart(data.payload || {});
    }

    if (data.type === "raffleClear" || data.type === "clear") {
      handleRaffleClear();
    }
  };

  ws.onerror = (err) => {
    console.error("[RAFFLE] WebSocket error:", err);
  };

  ws.onclose = () => {
    console.log("[RAFFLE] WebSocket cerrado. Reintentando...");
    clearTimeout(reconnectTimer);
    reconnectTimer = setTimeout(connectWS, 2000);
  };
}

function buildTickets(entries) {
  const tickets = [];

  entries.forEach((entry) => {
    const name = String(entry.name || "").trim();
    const count = Number(entry.tickets || 0);

    if (!name || !Number.isFinite(count) || count <= 0) return;

    for (let i = 0; i < count; i++) {
      tickets.push(name);
    }
  });

  return tickets;
}

function pickWeightedWinner(entries) {
  const tickets = buildTickets(entries);

  if (!tickets.length) return null;

  const randomIndex = Math.floor(Math.random() * tickets.length);
  return tickets[randomIndex];
}

function renderNames(activeName = "") {
  const namesEl = document.getElementById("raffle-names");
  if (!namesEl) return;

  namesEl.innerHTML = "";

  raffleState.entries.forEach((entry) => {
    const item = document.createElement("div");
    item.className = "raffle-name-item";

    if (activeName && entry.name === activeName) {
      item.classList.add("active");
    }

    item.innerHTML = `
      <span class="raffle-name">${entry.name}</span>
      <span class="raffle-tickets">${entry.tickets} ticket${entry.tickets === 1 ? "" : "s"}</span>
    `;

    namesEl.appendChild(item);
  });
}

function showWidget() {
  const widget = document.getElementById("raffle-widget");
  if (widget) widget.classList.remove("hidden");
}

function hideWidget() {
  const widget = document.getElementById("raffle-widget");
  if (widget) widget.classList.add("hidden");
}

function showWinner(name) {
  const winnerScreen = document.getElementById("raffle-winner-screen");
  const winnerName = document.getElementById("raffle-winner-name");
  const title = document.getElementById("raffle-title");

  if (title) title.textContent = "Winner selected!";

  if (winnerName) winnerName.textContent = name;

  if (winnerScreen) {
    winnerScreen.classList.remove("hidden");
    winnerScreen.classList.add("show");
  }

  clearTimeout(hideTimer);

  hideTimer = setTimeout(() => {
    handleRaffleClear();
  }, 5000);
}

function handleRaffleStart(payload = {}) {
  const entries = Array.isArray(payload.entries) ? payload.entries : [];

  const cleanEntries = entries
    .map((entry) => ({
      name: String(entry.name || "").trim(),
      tickets: Number(entry.tickets || 0),
    }))
    .filter((entry) => entry.name && entry.tickets > 0);

  if (!cleanEntries.length) {
    console.warn("[RAFFLE] No hay participantes válidos.");
    return;
  }

  clearInterval(spinTimer);
  clearTimeout(hideTimer);

  raffleState.entries = cleanEntries;
  raffleState.expandedTickets = buildTickets(cleanEntries);
  raffleState.winner = payload.winner || pickWeightedWinner(cleanEntries);
  raffleState.isRunning = true;

  const title = document.getElementById("raffle-title");
  const winnerScreen = document.getElementById("raffle-winner-screen");

  if (title) title.textContent = "Choosing winner...";

  if (winnerScreen) {
    winnerScreen.classList.add("hidden");
    winnerScreen.classList.remove("show");
  }

  showWidget();
  renderNames();

  let elapsed = 0;
  const duration = Number(payload.durationMs || 5000);
  const tickSpeed = 120;

  spinTimer = setInterval(() => {
    elapsed += tickSpeed;

    const randomName =
      raffleState.expandedTickets[
        Math.floor(Math.random() * raffleState.expandedTickets.length)
      ];

    renderNames(randomName);

    if (elapsed >= duration) {
      clearInterval(spinTimer);
      spinTimer = null;

      renderNames(raffleState.winner);

      setTimeout(() => {
        showWinner(raffleState.winner);
      }, 500);
    }
  }, tickSpeed);
}

function handleRaffleClear() {
  clearInterval(spinTimer);
  clearTimeout(hideTimer);

  spinTimer = null;
  hideTimer = null;

  raffleState.entries = [];
  raffleState.expandedTickets = [];
  raffleState.winner = null;
  raffleState.isRunning = false;

  const namesEl = document.getElementById("raffle-names");
  const winnerScreen = document.getElementById("raffle-winner-screen");
  const winnerName = document.getElementById("raffle-winner-name");
  const title = document.getElementById("raffle-title");

  if (namesEl) namesEl.innerHTML = "";
  if (winnerName) winnerName.textContent = "---";
  if (title) title.textContent = "Choosing winner...";

  if (winnerScreen) {
    winnerScreen.classList.add("hidden");
    winnerScreen.classList.remove("show");
  }

  hideWidget();
}

connectWS();
handleRaffleClear();