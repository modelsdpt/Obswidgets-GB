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

  const totalHours = Math.floor(diff / 3600000);
  const minutes = Math.floor((diff / 60000) % 60);
  const seconds = Math.floor((diff / 1000) % 60);

  el.hours.textContent = String(totalHours).padStart(2, "0");
  el.minutes.textContent = String(minutes).padStart(2, "0");
  el.seconds.textContent = String(seconds).padStart(2, "0");
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
