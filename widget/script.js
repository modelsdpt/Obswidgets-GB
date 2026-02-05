const MODEL_ID = "roman001";
const ws = new WebSocket(
  `wss://obswidgets-gb-production.up.railway.app/?modelId=${MODEL_ID}`
);

let scores = {};

ws.onmessage = (msg) => {
  let data;
  try {
    data = JSON.parse(msg.data || "{}");
  } catch {
    return;
  }

  if (data.type === "tip") {
    const name = (data.payload?.name || "").trim();
    const amount = Number(data.payload?.amount || 0);
    if (!name || isNaN(amount) || amount <= 0) return;

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

  sorted.forEach(([name, total], idx) => {
    const row = document.createElement("div");
    row.className = "tip";

    // clases por posición
    if (idx === 0) row.classList.add("mvp");
    if (idx === 1) row.classList.add("second");
    if (idx === 2) row.classList.add("third");

    // icono según posición
    const icon =
      idx === 0
        ? "👑" // corona
        : "🏆"; // trofeo (lo estilamos plata / bronce en CSS)

    row.innerHTML = `
      <span class="rank-icon">${icon}</span>
      <span class="name">${name}</span>
      <span class="amount">$${total}</span>
    `;

    list.appendChild(row);
  });
}
