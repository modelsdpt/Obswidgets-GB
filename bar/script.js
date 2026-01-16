// script.js – Goal bar
const MODEL_ID = "roman001";
const ws = new WebSocket(
  `wss://obswidgets-gb-production.up.railway.app/?modelId=${MODEL_ID}`
);

let goal = 0;
let current = 0;

const bar = document.getElementById("bar-fill");
const goalTitle = document.querySelector(".goal-title");
const amountText = document.querySelector(".goal-amount");
let bell = document.getElementById("bellSound");

// un solo sonido para cada tip (y también cuando se llena)
function playBell() {
  try {
    if (!bell) {
      bell =
        document.getElementById("bellSound") ||
        new Audio(
          "https://www.myinstants.com/media/sounds/pikachu-thunderbolt.mp3"
        );
      bell.preload = "auto";
    }
    bell.currentTime = 0;
    bell.volume = 1;
    bell.play().catch(() => {});
  } catch {
    // silent fail para OBS
  }
}

ws.onmessage = (msg) => {
  let data;
  try {
    data = JSON.parse(msg.data || "{}");
  } catch {
    return;
  }

  if (data.type === "setGoal") {
    goal = Number(data.payload?.goal || 0);
    current = 0;
    updateBar(false);
    return;
  }

  if (data.type === "tip") {
    const amt = Number(data.payload?.amount || 0);
    if (!isNaN(amt) && amt > 0) {
      current += amt;
      updateBar(true); // viene de tip → sonar
    }
    return;
  }

  if (data.type === "clearGoal") {
    goal = 0;
    current = 0;
    updateBar(false);
    return;
  }
};

function updateBar(playFx) {
  const percent = goal ? Math.min((current / goal) * 100, 100) : 0;

  if (bar) {
    bar.style.width = percent + "%";
  }

  if (amountText) {
    amountText.textContent = goal > 0 ? `${current} / ${goal}` : "";
  }

  if (goalTitle) {
    if (percent >= 100 && goal > 0) {
      goalTitle.classList.add("neon");
    } else {
      goalTitle.classList.remove("neon");
    }
  }

  if (playFx) {
    playBell();
  }
}
