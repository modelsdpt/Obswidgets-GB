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

// helper para reproducir sonido de forma segura
function playBell() {
  try {
    if (!bell) {
      // fallback por si el elemento no se encontró
      bell = new Audio("https://www.myinstants.com/media/sounds/trompetas-dj-yu.mp3");
      bell.preload = "auto";
    }
    bell.currentTime = 0;
    bell.volume = 1;
    bell.play().catch((err) => {
      console.log("Error reproduciendo audio:", err);
    });
  } catch (err) {
    console.log("Error inesperado de audio:", err);
  }
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

  // TEXTO DE ABAJO (progreso)
  if (amountText) {
    if (goal > 0) {
      amountText.textContent = `${current} / ${goal}`;
    } else {
      amountText.textContent = "";
    }
  }

  // efecto “completado” en el título
  if (goalTitle) {
    if (percent >= 100) {
      goalTitle.classList.add("neon");
    } else {
      goalTitle.classList.remove("neon");
    }
  }

  if (playFx) {
    playBell();
    spawnParticles();
  }
}

// Pequeñas partículas doradas al recibir tip
function spawnParticles() {
  const container = document.querySelector(".particles");
  if (!container) return;

  for (let i = 0; i < 8; i++) {
    const p = document.createElement("div");
    p.className = "particle";
    p.style.left = `${10 + Math.random() * 80}%`;
    p.style.top = `${20 + Math.random() * 60}%`;
    p.style.animationDuration = `${1 + Math.random() * 0.5}s`;
    container.appendChild(p);

    setTimeout(() => p.remove(), 1600);
  }
}
