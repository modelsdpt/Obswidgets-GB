const MODEL_ID = "roman001";
const ws = new WebSocket(
  `wss://obswidgets-gb-production.up.railway.app/?modelId=${MODEL_ID}`
);

let goal = 0;
let current = 0;
let goalCompleted = false;
let tipVolume = 1; // 100%

const bar = document.getElementById("bar-fill");
const goalTitle = document.querySelector(".goal-title");
const amountText = document.querySelector(".goal-amount");
const tipSound = document.getElementById("tipSound");

function playTip() {
  if (!tipSound) return;
  try {
    tipSound.currentTime = 0;
    tipSound.volume = tipVolume; // 👈 controlado por el panel
    tipSound.play().catch(() => {});
  } catch (e) {
    console.log("Audio error:", e);
  }
}

ws.onmessage = (event) => {
  let data;
  try {
    data = JSON.parse(event.data || "{}");
  } catch {
    return;
  }

  if (data.type === "setGoal") {
    goal = Number(data.payload?.goal || 0);
    current = 0;
    goalCompleted = false;
    updateBar(false);
  }

  if (data.type === "tip") {
    const amount = Number(data.payload?.amount || 0);
    if (!isNaN(amount) && amount > 0) {
      current += amount;
      updateBar(true);
    }
  }

  if (data.type === "clearGoal") {
    goal = 0;
    current = 0;
    goalCompleted = false;
    updateBar(false);
  }
    if (data.type === "tipVolume") {
    const v = Number(data.payload?.volume);
    if (!isNaN(v)) {
      tipVolume = Math.max(0, Math.min(1, v));
      console.log("Nuevo volumen de tip:", tipVolume);
    }
  }

};

function updateBar(fromTip) {
  const percent = goal ? Math.min((current / goal) * 100, 100) : 0;

  if (bar) {
    bar.style.width = percent + "%";
  }

  if (amountText) {
    amountText.textContent = goal > 0 ? `$${current} / $${goal}` : "";
  }

  if (goalTitle) {
    if (percent >= 100 && goal > 0) {
      goalTitle.classList.add("neon");
      if (!goalCompleted) {
        goalCompleted = true;
        // sonidito extra cuando se llena: un shuffle más
        playTip();
      }
    } else {
      goalTitle.classList.remove("neon");
      if (percent < 100) goalCompleted = false;
    }
  }

  if (fromTip) {
    playTip();
  }
}
