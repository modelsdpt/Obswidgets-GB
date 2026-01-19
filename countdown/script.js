const MODEL_ID = "roman001";
const ws = new WebSocket(
  `wss://obswidgets-gb-production.up.railway.app/?modelId=${MODEL_ID}`
);

let remaining = 0;
let timerId = null;

const timerBox = document.querySelector(".timer-box");
const timerValue = document.getElementById("timer-value");
const audioEl = document.getElementById("timerEndSound");

function formatTime(sec) {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

function clearTimerClasses() {
  if (!timerBox) return;
  timerBox.classList.remove("timer-running", "timer-finished");
}

function startTimer(seconds) {
  if (!timerBox || !timerValue) return;

  clearInterval(timerId);
  remaining = seconds;

  clearTimerClasses();
  timerBox.classList.add("timer-running");
  timerValue.textContent = formatTime(remaining);

  timerId = setInterval(() => {
    remaining -= 1;
    if (remaining <= 0) {
      remaining = 0;
      timerValue.textContent = formatTime(remaining);
      clearInterval(timerId);
      timerId = null;
      onTimerEnd();
    } else {
      timerValue.textContent = formatTime(remaining);
    }
  }, 1000);
}

function stopTimer() {
  clearInterval(timerId);
  timerId = null;
  remaining = 0;
  clearTimerClasses();
  if (timerValue) timerValue.textContent = "00:00";
}

function onTimerEnd() {
  if (!timerBox) return;
  clearTimerClasses();
  timerBox.classList.add("timer-finished");

  if (audioEl) {
    try {
      audioEl.currentTime = 0;
      audioEl.volume = 1;
      audioEl.play().catch(() => {});
    } catch {}
  }
}

// WebSocket: órdenes desde el panel
ws.onmessage = (msg) => {
  let data;
  try {
    data = JSON.parse(msg.data || "{}");
  } catch {
    return;
  }

  if (data.type === "actionTimer") {
    const seconds = Number(data.payload?.seconds || 0);
    if (!isNaN(seconds) && seconds > 0) {
      startTimer(seconds);
    }
  }

  if (data.type === "actionTimerStop") {
    stopTimer();
  }
};
