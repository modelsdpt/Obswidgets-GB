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
    return;
  }

  if (data.type === "clear") {
    scores = {};
    render();
    return;
  }
};

function render() {
  const list = document.getElementById("top-list");
  if (!list) return;

  list.innerHTML = "";

  const sorted = Object.entries(scores)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3);

  const leader = sorted[0]?.[0];

  if (!sorted.length) {
    list.innerHTML = `<div class="empty"></div>`;
    lastLeader = null;
    return;
  }

  sorted.forEach(([name, total], i) => {
    const div = document.createElement("div");
    div.className = "tip" + (i === 0 ? " mvp" : "");

    const deco = i === 0 ? ` <span class="crown">⚡</span>` : " ✨";

    // línea simple: "Nombre $60"
    div.innerHTML = `
      <span>${name}${deco}</span>
      <span>$${total}</span>
    `;

    list.appendChild(div);
  });

  lastLeader = leader;
}

// estado inicial vacío
render();
