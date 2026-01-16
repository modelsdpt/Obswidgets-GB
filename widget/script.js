const MODEL_ID = "roman001";
const ws = new WebSocket(
  `wss://obswidgets-gb-production.up.railway.app/?modelId=${MODEL_ID}`
);

let scores = {};
let lastLeader = null;

ws.onmessage = (msg) => {
  const data = JSON.parse(msg.data);

  if (data.type === "tip") {
    const { name, amount } = data.payload;
    scores[name] = (scores[name] || 0) + Number(amount);
    render();
  }

  if (data.type === "clear") {
    scores = {};
    render();
  }
};

function render() {
  const list = document.getElementById("top-list");
  list.innerHTML = "";

  const sorted = Object.entries(scores)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3);

  const leader = sorted[0]?.[0];

  sorted.forEach(([name, total], index) => {
    const div = document.createElement("div");
    const isMvp = index === 0;

    div.className = "tip" + (isMvp ? " mvp" : "");

    const badge = isMvp ? `<span class="tip-badge">⚡</span>` : "";
    div.innerHTML = `
      <span>${name}${badge}</span>
      <span>$${total}</span>
    `;

    list.appendChild(div);

    if (isMvp && leader !== lastLeader) {
      // pequeño bump cuando cambia el MVP
      div.style.transform = "scale(1.05)";
      setTimeout(() => {
        div.style.transform = "scale(1)";
      }, 250);
    }
  });

  lastLeader = leader;
}