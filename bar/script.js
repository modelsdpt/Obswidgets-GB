const MODEL_ID = "roman001";
const ws = new WebSocket(
  `wss://obswidgets-gb-production.up.railway.app/?modelId=${MODEL_ID}`
);

let goal = 0;
let current = 0;

const bar = document.getElementById("bar-fill");
const amountText = document.getElementById("goal-amount");
const goalLabel = document.querySelector(".goal-label");
const bell = document.getElementById("goalSound");

function playSound() {
  if (!bell) return;
  bell.currentTime = 0;
  bell.volume = 1;
  bell.play().catch(() => {});
}

ws.onmessage = (msg) => {
  const data = JSON.parse(msg.data);

  if (data.type === "setGoal") {
    goal = Number(data.payload.goal);
    current = 0;
    updateBar(false);
  }

  if (data.type === "tip") {
    current += Number(data.payload.amount);
    updateBar(true);
  }

  if (data.type === "clearGoal") {
    goal = 0;
    current = 0;
    updateBar(false);
  }
};

function updateBar(playFx) {
  const percent = goal
    ? Math.min((current / goal) * 100, 100)
    : 0;

  if (bar) {
    bar.style.width = percent + "%";
  }

  if (amountText) {
    amountText.textContent = goal > 0 ? `$${current} / $${goal}` : "";
  }

  if (goalLabel) {
    if (percent >= 100 && goal > 0) {
      goalLabel.classList.add("completed");
    } else {
      goalLabel.classList.remove("completed");
    }
  }

  if (playFx) {
    playSound();
  }
}
