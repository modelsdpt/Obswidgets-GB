const MODEL_ID = "roman001";
const ws = new WebSocket(
  `wss://obswidgets-gb-production.up.railway.app/?modelId=${MODEL_ID}`
);

let scores = {};
let lastLeader = null;

// Manejo de mensajes desde el backend
ws.onmessage = (msg) => {
  const data = JSON.parse(msg.data || "{}");

  if (data.type === "tip") {
    const { name, amount } = data.payload || {};
    if (!name || !amount) return;

    scores[name] = (scores[name] || 0) + Number(amount);
    render();
  }

  if (data.type === "clear") {
    scores = {};
    lastLeader = null;
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

  if (sorted.length === 0) {
    return;
  }

  const newLeader = sorted[0][0];
  let mvpElement = null;

  sorted.forEach(([name, total], index) => {
    const div = document.createElement("div");
    div.className = "tip" + (index === 0 ? " mvp" : "");

    const deco =
      index === 0
        ? ' <span class="crown">👑</span>'
        : " ✨";

    // nombre + monto + rayo ⚡ en una sola línea
    const amountText = `$${total} ⚡`;

    div.innerHTML = `
      <span class="tip-line">
        ${name}${deco} ${amountText}
      </span>
    `;

    if (index === 0) {
      mvpElement = div;
    }

    list.appendChild(div);
  });

  // si cambió el líder, pequeño efecto boom al nuevo MVP
  if (mvpElement && newLeader !== lastLeader) {
    boomEffect(mvpElement);
  }

  lastLeader = newLeader;
}

function boomEffect(element) {
  if (!element) return;

  element.style.animation = "boom 0.4s ease-out";
  setTimeout(() => {
    element.style.animation = "";
  }, 400);
}
