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

/**
 * Nuevo comportamiento:
 * - Si NO hay timer corriendo -> inicia con esos segundos.
 * - Si YA hay timer corriendo -> suma esos segundos al restante.
 */
function startOrAddTimer(seconds) {
  if (!timerBox || !timerValue) return;

  const extra = Number(seconds) || 0;
  if (extra <= 0) return;

  // Si ya hay timer corriendo, solo sumamos
  if (timerId && remaining > 0) {
    remaining += extra;
    timerValue.textContent = formatTime(remaining);
    return;
  }

  // Si no hay timer activo, iniciamos uno nuevo
  clearInterval(timerId);
  remaining = extra;

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
      // antes: startTimer(seconds)
      startOrAddTimer(seconds);
    }
  }

  if (data.type === "actionTimerStop") {
    stopTimer();
  }
};
