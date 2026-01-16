const MODEL_ID = "roman001";
const ws = new WebSocket(
  `wss://obswidgets-gb-production.up.railway.app/?modelId=${MODEL_ID}`
);

let goal = 0;
let current = 0;
let goalCompleted = false;

const bar = document.getElementById("bar-fill");
const goalTitle = document.querySelector(".goal-title");
const amountText = document.querySelector(".goal-amount");

const goalSound = document.getElementById("goalSound");

// un único sonido que usamos en cada tip
function playThunder() {
  if (!goalSound) return;
  try {
    goalSound.currentTime = 0;
    goalSound.volume = 1;
    goalSound.play().catch(() => {});
  } catch {}
}

ws.onmessage = (event) => {
  let data;
  try {
    data = JSON.parse(event.data || "{}");
  } catch {
    return;
  }

  if (data.type === "setGoal") {
    goal = Number(data.payload && data.payload.goal) || 0;
    current = 0;
    goalCompleted = false;
    updateBar(false); // no sonido
  }

  if (data.type === "tip") {
    const amt = Number(data.payload && data.payload.amount);
    if (!isNaN(amt) && amt > 0) {
      current += amt;
      updateBar(true); // viene de tip => suena
    }
  }

  if (data.type === "clearGoal") {
    goal = 0;
    current = 0;
    goalCompleted = false;
    updateBar(false); // no sonido
  }
};

function updateBar(fromTip) {
  const percent = goal ? Math.min((current / goal) * 100, 100) : 0;

  if (bar) {
    bar.style.width = percent + "%";
  }

  if (amountText) {
    amountText.textContent = goal > 0 ? `${current} / ${goal}` : "";
  }

  // solo efecto visual cuando se llena, SIN sonido especial
  if (goalTitle) {
    if (percent >= 100 && goal > 0) {
      goalTitle.classList.add("neon");
      goalCompleted = true;
    } else {
      goalTitle.classList.remove("neon");
      if (percent < 100) {
        goalCompleted = false;
      }
    }
  }

  // sonido únicamente cuando viene de tip
  if (fromTip) {
    playThunder();
  }
}
