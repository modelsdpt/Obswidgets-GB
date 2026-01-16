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

// 🔊 buscamos los audios SIEMPRE en el momento de reproducir
function playTipSound() {
  const tipSound = document.getElementById("tipSound");
  if (!tipSound) {
    console.log("tipSound no encontrado en el DOM");
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
  const goalSound = document.getElementById("goalSound");
  if (!goalSound) {
    console.log("goalSound no encontrado en el DOM");
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
      updateBar(true); // viene de tip => pika
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

  // GOAL completada
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

  // sonido por tip
  if (fromTip) {
    playTipSound();
  }
}
