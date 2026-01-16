// script.js – MVP (top tippers)
const MODEL_ID = "roman001";
const ws = new WebSocket(
  `wss://obswidgets-gb-production.up.railway.app/?modelId=${MODEL_ID}`
);

let scores = {};
let lastLeader = null;

ws.onmessage = (msg) => {
  let data;
  try {
    data = JSON.parse(msg.data || "{}");
  } catch {
    return;
  }

  if (data.type === "tip") {
    const payload = data.payload || {};
    const name = String(payload.name || "").trim();
    const amount = Number(payload.amount || 0);

    if (!name || !amount) return;

    scores[name] = (scores[name] || 0) + amount;
    render();
  }

  if (data.type === "clear") {
    scores = {};
    render();
  }
};

function render() {
  const list = document.getElementById("top-list");
  if (!list) return;

  list.innerHTML = "";

  const sorted = Object.entries(scores)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3);

  const leader = sorted[0]?.[0] || null;

  if (!sorted.length) {
    list.innerHTML = `<div class="empty">Aún no hay tips</div>`;
    lastLeader = null;
    return;
  }

  sorted.forEach(([name, total], index) => {
    const div = document.createElement("div");
    div.className = "tip" + (index === 0 ? " mvp" : "");

    const deco = index === 0 ? " ⚡" : " ✨";

    // misma línea: "Nombre 60$"
    div.innerHTML = `
      <span class="tip-name">${name}${deco}</span>
      <span class="tip-amount">$${total}</span>
    `;

    list.appendChild(div);

    // animación suave cuando cambia el líder
    if (index === 0 && leader && leader !== lastLeader) {
      boomEffect(div);
    }
  });

  lastLeader = leader;
}

function boomEffect(el) {
  if (!el) return;
  el.style.animation = "boom .4s ease-out";
  setTimeout(() => {
    el.style.animation = "";
  }, 400);
}

// render inicial vacío
render();
