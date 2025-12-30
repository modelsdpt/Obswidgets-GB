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
    .sort((a,b) => b[1]-a[1])
    .slice(0,3);

  const leader = sorted[0]?.[0];

  sorted.forEach(([name, total], i) => {
    const div = document.createElement("div");
    div.className = "tip" + (i===0 ? " mvp" : "");

    const deco = i===0 ? " 👑" : " ❄️";
    div.innerHTML = `<span>${name}${deco}</span><span>$${total}</span>`;
    list.appendChild(div);
  });

  lastLeader = leader;
}

function boomEffect(element) {
  document.getElementById("mvpSound")?.play().catch(()=>{});
  element.style.animation = "boom .4s ease-out";
  setTimeout(() => element.style.animation = "", 400);
}

