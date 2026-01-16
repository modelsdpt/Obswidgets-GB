const MODEL_ID = "roman001";
const ws = new WebSocket(
  `wss://obswidgets-gb-production.up.railway.app/?modelId=${MODEL_ID}`
);

let goal = 0;
let current = 0;

const bar = document.getElementById("bar-fill");
const goalTitle = document.querySelector(".goal-title");
const amountText = document.querySelector(".goal-amount");

const THUNDER_URL = "https://www.myinstants.com/media/sounds/pikachu-thunderbolt.mp3";

// --- PRIMAR AUDIO PARA BYPASS DE AUTOPLAY ---
let audioPrimed = false;
function primeAudioOnce() {
  if (audioPrimed) return;
  audioPrimed = true;
  try {
    const a = new Audio(THUNDER_URL);
    a.volume = 0;              // mudo
    a.play().then(() => {
      a.pause();
      a.currentTime = 0;
      console.log("[PikaGoal] Audio primed OK");
    }).catch((err) => {
      console.log("[PikaGoal] No se pudo primar audio:", err);
    });
  } catch (err) {
    console.log("[PikaGoal] Error primando audio:", err);
  }
}
document.addEventListener("click", primeAudioOnce, { once: true });

// --- SONIDO EN CADA TIP ---
function playThunder() {
  try {
    console.log("[PikaGoal] playThunder()");
    const audio = new Audio(THUNDER_URL);
    audio.volume = 1;
    audio.play().catch(err => {
      console.log("[PikaGoal] Error reproduciendo audio:", err);
    });
  } catch (err) {
    console.log("[PikaGoal] Error inesperado de audio:", err);
  }
}

ws.onmessage = (event) => {
  let data;
  try {
    data = JSON.parse(event.data || "{}");
  } catch (err) {
    console.log("[PikaGoal] Error parseando mensaje WS:", err);
    return;
  }

  console.log("[PikaGoal] WS message:", data);

  if (data.type === "setGoal") {
    goal = Number(data.payload && data.payload.goal) || 0;
    current = 0;
    updateBar(false); // sin sonido
  }

  if (data.type === "tip") {
    const amt = Number(data.payload && data.payload.amount);
    console.log("[PikaGoal] tip recibido:", amt);

    if (!isNaN(amt) && amt > 0) {
      current += amt;
      updateBar(true); // viene de tip -> sonido
    }
  }

  if (data.type === "clearGoal") {
    goal = 0;
    current = 0;
    updateBar(false); // sin sonido
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

  if (goalTitle) {
    if (percent >= 100 && goal > 0) {
      goalTitle.classList.add("neon");
    } else {
      goalTitle.classList.remove("neon");
    }
  }

  if (fromTip) {
    playThunder();
  }
}
