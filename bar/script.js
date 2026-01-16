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
  if (!tipSound) {
    console.log("tipSound no encontrado");
    return;
  }
  try {
    tipSound.currentTime = 0;
    tipSound.volume = 1;
    tipSound.play().catch((err) => {
      console.log("Error reproduciendo tipSound:", err);
    });
  } catch (err) {
    console.log("Error inesperado tipSound:", err);
  }
}

function playGoalSound() {
  if (!goalSound) {
    console.log("goalSound no encontrado");
    return;
  }
  try {
    goalSound.currentTime = 0;
    goalSound.volume = 1;
    goalSound.play().catch((err) => {
      console.log("Error reproduciendo goalSound:", err);
    });
  } catch (err) {
    console.log("Error inesperado goalSound:", err);
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
    goal = Number(data.payload && data.payload.goal) || 0;
    current = 0;
    goalCompleted = false;
    updateBar(false);
  }

  if (data.type === "tip") {
    const amt = Number(data.payload && data.payload.amount);
    if (!isNaN(amt) && amt > 0) {
      current += amt;
      updateBar(true); // viene de tip => debe sonar PIKA
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

  // efecto cuando la goal se completa
  if (goalTitle) {
    if (percent >= 100 && goal > 0) {
      goalTitle.classList.add("neon");
      if (!goalCompleted) {
        goalCompleted = true;
        playGoalSound(); // ⚡ thunderbolt
      }
    } else {
      goalTitle.classList.remove("neon");
      if (percent < 100) {
        goalCompleted = false;
      }
    }
  }

  // si vino de TIP, disparamos PIKA
  if (fromTip) {
    playTipSound();
  }
}
