// ================= CONFIG =================
const MODEL_ID = "roman001";
const TARGET_DATE_EST = "2026-01-01T00:00:00-05:00";

// ================= WEBSOCKET =================
const ws = new WebSocket(
  `wss://obswidgets-gb-production.up.railway.app/?modelId=${MODEL_ID}`
);

const scores = {};

// ================= COUNTDOWN =================
const el = {
  days: document.getElementById("days"),
  hours: document.getElementById("hours"),
  minutes: document.getElementById("minutes"),
  seconds: document.getElementById("seconds"),
};

function updateCountdown() {
  const target = new Date(TARGET_DATE_EST).getTime();
  const now = Date.now();
  let diff = Math.max(0, target - now);

  const d = Math.floor(diff / 86400000);
  const h = Math.floor((diff / 3600000) % 24);
  const m = Math.floor((diff / 60000) % 60);
  const s = Math.floor((diff / 1000) % 60);

  el.days.textContent = String(d).padStart(2, "0");
  el.hours.textContent = String(h).padStart(2, "0");
  el.minutes.textContent = String(m).padStart(2, "0");
  el.seconds.textContent = String(s).padStart(2, "0");
}

setInterval(updateCountdown, 1000);
updateCountdown();

// ================= CONFETI =================
function spawnConfetti() {
  for (let i = 0; i < 12; i++) {
    const c = document.createElement("div");
    c.className = `confetti ${Math.random() > 0.5 ? "gold" : "white"}`;
    c.style.left = Math.random() * 100 + "vw";
    c.style.animationDuration = 3 + Math.random() * 3 + "s";
    document.body.appendChild(c);

    setTimeout(() => c.remove(), 6000);
  }
}

setInterval(spawnConfetti, 5000);

// ================= LEADERBOARD =================
ws.onmessage = (event) => {
  const data = JSON.parse(event.data);

  if (data.type === "tip") {
    const { name, amount } = data.payload;
    scores[name] = (scores[name] || 0) + Number(amount);
    renderLeaderboard();
  }

  if (data.type === "clear") {
    Object.keys(scores).forEach(k => delete scores[k]);
    renderLeaderboard();
  }
};

function renderLeaderboard() {
  const list = document.getElementById("top-list");
  list.innerHTML = "";

  Object.entries(scores)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .forEach(([name, total], index) => {
      const row = document.createElement("div");
      row.className = "tip" + (index === 0 ? " mvp" : "");
      row.innerHTML = `
        <span>${name} ${index === 0 ? "👑" : "❄️"}</span>
        <span>$${total}</span>
      `;
      list.appendChild(row);
    });
}
