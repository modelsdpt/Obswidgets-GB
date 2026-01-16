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

const tipSound = document.getElementById("tipSound");
const goalSound = document.getElementById("goalSound");

function playTipSound() {
  if (!tipSound) return;
  try {
    tipSound.currentTime = 0;
    tipSound.volume = 1;
    tipSound.play().catch(() => {});
  } catch {}
}

function playGoalSound() {
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
    updateBar(false);
  }

  if (data.type === "tip") {
    const amt = Number(data.payload && data.payload.amount);
    if (!isNaN(amt) && amt > 0) {
      current += amt;
      updateBar(true); // viene de tip => sonar
    }
  }

  if (data.type === "clearGoal") {
    goal = 0;
    current = 0;
    goalCompleted = false;
    updateBar(false);
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

  // efecto de "goal completada"
  if (goalTitle) {
    if (percent >= 100 && goal > 0) {
      goalTitle.classList.add("neon");
      if (!goalCompleted) {
        goalCompleted = true;
        playGoalSound();
      }
    } else {
      goalTitle.classList.remove("neon");
      if (percent < 100) {
        goalCompleted = false;
      }
    }
  }

  if (fromTip) {
    playTipSound();
  }
}
