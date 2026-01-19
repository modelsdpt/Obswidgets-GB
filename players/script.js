const MODEL_ID = "roman001";
const ws = new WebSocket(
  `wss://obswidgets-gb-production.up.railway.app/?modelId=${MODEL_ID}`
);

ws.onmessage = (msg) => {
  let data;
  try {
    data = JSON.parse(msg.data || "{}");
  } catch {
    return;
  }

  if (data.type === "blackjackPlayers") {
    const playing = Array.isArray(data.payload?.playing)
      ? data.payload.playing
      : [];
    const waiting = Array.isArray(data.payload?.waiting)
      ? data.payload.waiting
      : [];

    renderPlayers(playing, waiting);
  }

  // si quieres limpiar al hacer "clear"
  if (data.type === "clear") {
    renderPlayers([], []);
  }
};

function renderPlayers(playing, waiting) {
  const playingList = document.getElementById("playing-list");
  const waitingList = document.getElementById("waiting-list");
  if (!playingList || !waitingList) return;

  playingList.innerHTML = "";
  waitingList.innerHTML = "";

  playing.forEach((name, idx) => {
    const li = document.createElement("li");
    li.className = "player-row playing";
    li.innerHTML = `
      <span class="player-seat">${idx + 1}.</span>
      <span class="player-name">${name}</span>
      <span class="player-tag">playing</span>
    `;
    playingList.appendChild(li);
  });

  waiting.forEach((name, idx) => {
    const li = document.createElement("li");
    li.className = "player-row waiting";
    li.innerHTML = `
      <span class="player-seat">${idx + 1}.</span>
      <span class="player-name">${name}</span>
      <span class="player-tag">waiting</span>
    `;
    waitingList.appendChild(li);
  });
}
