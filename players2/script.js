// ======================================================
// RAFFLE WIDGET - GROUP 1
// Panel 1 → group1 → players
// ======================================================


// ======================================================
// CONFIG
// ======================================================

const MODEL_ID = "roman001";
const GROUP_ID = "group2";


// ======================================================
// WEBSOCKET STATE
// ======================================================

let ws = null;
let reconnectTimer = null;
let heartbeatTimer = null;


// ======================================================
// RAFFLE TIMERS
// ======================================================

let spinTimer = null;
let hideTimer = null;


// ======================================================
// RAFFLE STATE
// ======================================================

const raffleState = {
  entries: [],
  expandedTickets: [],
  winner: null,
  isRunning: false,
};


// ======================================================
// WS BASE
// ======================================================

function getWSBase() {
  return window.location.origin.replace(
    /^http/,
    "ws"
  );
}


// ======================================================
// CONNECT WEBSOCKET
// ======================================================

function connectWS() {

  const WS_BASE = getWSBase();

  const url =
    `${WS_BASE}/` +
    `?modelId=${encodeURIComponent(MODEL_ID)}` +
    `&groupId=${encodeURIComponent(GROUP_ID)}`;


  console.log(
    "[RAFFLE 1] Connecting:",
    url
  );


  ws = new WebSocket(url);


  // ====================================================
  // OPEN
  // ====================================================

  ws.onopen = () => {

    console.log(
      `[RAFFLE 1] CONNECTED → ${MODEL_ID}:${GROUP_ID}`
    );


    if (reconnectTimer) {

      clearTimeout(
        reconnectTimer
      );

      reconnectTimer = null;

    }


    startHeartbeat();

  };


  // ====================================================
  // MESSAGE
  // ====================================================

  ws.onmessage = (msg) => {

    let data;


    try {

      data = JSON.parse(
        msg.data || "{}"
      );

    } catch {

      return;

    }


    // Heartbeat response
    if (data.type === "pong") {
      return;
    }


    // Start raffle
    if (
      data.type === "raffleStart"
    ) {

      handleRaffleStart(
        data.payload || {}
      );

      return;

    }


    // Clear raffle
    if (
      data.type === "raffleClear" ||
      data.type === "clear"
    ) {

      handleRaffleClear();

      return;

    }

  };


  // ====================================================
  // ERROR
  // ====================================================

  ws.onerror = (err) => {

    console.error(
      "[RAFFLE 1] WebSocket error:",
      err
    );


    try {
      ws.close();
    } catch {}

  };


  // ====================================================
  // CLOSE
  // ====================================================

  ws.onclose = () => {

    console.log(
      "[RAFFLE 1] WebSocket cerrado. Reintentando..."
    );


    stopHeartbeat();


    clearTimeout(
      reconnectTimer
    );


    reconnectTimer =
      setTimeout(
        connectWS,
        2000
      );

  };

}


// ======================================================
// HEARTBEAT
// ======================================================

function startHeartbeat() {

  stopHeartbeat();


  heartbeatTimer =
    setInterval(
      () => {

        if (
          !ws ||
          ws.readyState !== WebSocket.OPEN
        ) {
          return;
        }


        try {

          ws.send(
            JSON.stringify({
              type: "ping",
              ts: Date.now(),
            })
          );

        } catch (error) {

          console.log(
            "[RAFFLE 1] Heartbeat error:",
            error
          );

        }

      },
      30000
    );

}


function stopHeartbeat() {

  if (!heartbeatTimer) {
    return;
  }


  clearInterval(
    heartbeatTimer
  );


  heartbeatTimer = null;

}


// ======================================================
// BUILD TICKETS
// ======================================================

function buildTickets(entries) {

  const tickets = [];


  entries.forEach(
    (entry) => {

      const name =
        String(
          entry.name || ""
        ).trim();


      const count =
        Math.floor(
          Number(
            entry.tickets || 0
          )
        );


      if (
        !name ||
        !Number.isFinite(count) ||
        count <= 0
      ) {
        return;
      }


      for (
        let i = 0;
        i < count;
        i += 1
      ) {

        tickets.push(
          name
        );

      }

    }
  );


  return tickets;

}


// ======================================================
// PICK WEIGHTED WINNER
// ======================================================

function pickWeightedWinner(
  entries
) {

  const tickets =
    buildTickets(
      entries
    );


  if (!tickets.length) {
    return null;
  }


  const randomIndex =
    Math.floor(
      Math.random() *
      tickets.length
    );


  return tickets[
    randomIndex
  ];

}


// ======================================================
// RENDER NAMES
// ======================================================

function renderNames(
  activeName = ""
) {

  const namesEl =
    document.getElementById(
      "raffle-names"
    );


  if (!namesEl) {
    return;
  }


  namesEl.innerHTML = "";


  raffleState.entries.forEach(
    (entry) => {

      const item =
        document.createElement(
          "div"
        );


      item.className =
        "raffle-name-item";


      if (
        activeName &&
        entry.name === activeName
      ) {

        item.classList.add(
          "active"
        );

      }


      const name =
        document.createElement(
          "span"
        );


      name.className =
        "raffle-name";


      name.textContent =
        entry.name;


      const tickets =
        document.createElement(
          "span"
        );


      tickets.className =
        "raffle-tickets";


      tickets.textContent =
        `${entry.tickets} ticket${
          entry.tickets === 1
            ? ""
            : "s"
        }`;


      item.appendChild(
        name
      );


      item.appendChild(
        tickets
      );


      namesEl.appendChild(
        item
      );

    }
  );

}


// ======================================================
// SHOW WIDGET
// ======================================================

function showWidget() {

  const widget =
    document.getElementById(
      "raffle-widget"
    );


  if (widget) {

    widget.classList.remove(
      "hidden"
    );

  }

}


// ======================================================
// HIDE WIDGET
// ======================================================

function hideWidget() {

  const widget =
    document.getElementById(
      "raffle-widget"
    );


  if (widget) {

    widget.classList.add(
      "hidden"
    );

  }

}


// ======================================================
// SHOW WINNER
// ======================================================

function showWinner(name) {

  if (!name) {
    return;
  }


  const winnerScreen =
    document.getElementById(
      "raffle-winner-screen"
    );


  const winnerName =
    document.getElementById(
      "raffle-winner-name"
    );


  const title =
    document.getElementById(
      "raffle-title"
    );


  if (title) {

    title.textContent =
      "Winner selected!";

  }


  if (winnerName) {

    winnerName.textContent =
      name;

  }


  if (winnerScreen) {

    winnerScreen.classList.remove(
      "hidden"
    );


    winnerScreen.classList.add(
      "show"
    );

  }


  clearTimeout(
    hideTimer
  );


  hideTimer =
    setTimeout(
      () => {

        handleRaffleClear();

      },
      5000
    );

}


// ======================================================
// START RAFFLE
// ======================================================

function handleRaffleStart(
  payload = {}
) {

  const entries =
    Array.isArray(
      payload.entries
    )
      ? payload.entries
      : [];


  const cleanEntries =
    entries
      .map(
        (entry) => ({
          name:
            String(
              entry.name || ""
            ).trim(),

          tickets:
            Math.floor(
              Number(
                entry.tickets || 0
              )
            ),
        })
      )
      .filter(
        (entry) =>
          entry.name &&
          Number.isFinite(
            entry.tickets
          ) &&
          entry.tickets > 0
      );


  if (!cleanEntries.length) {

    console.warn(
      "[RAFFLE 1] No hay participantes válidos."
    );

    return;

  }


  clearInterval(
    spinTimer
  );


  clearTimeout(
    hideTimer
  );


  raffleState.entries =
    cleanEntries;


  raffleState.expandedTickets =
    buildTickets(
      cleanEntries
    );


  raffleState.winner =
    String(
      payload.winner || ""
    ).trim() ||
    pickWeightedWinner(
      cleanEntries
    );


  raffleState.isRunning =
    true;


  const title =
    document.getElementById(
      "raffle-title"
    );


  const winnerScreen =
    document.getElementById(
      "raffle-winner-screen"
    );


  if (title) {

    title.textContent =
      "Choosing winner...";

  }


  if (winnerScreen) {

    winnerScreen.classList.add(
      "hidden"
    );


    winnerScreen.classList.remove(
      "show"
    );

  }


  showWidget();

  renderNames();


  let elapsed = 0;


  const requestedDuration =
    Number(
      payload.durationMs
    );


  const duration =
    Number.isFinite(
      requestedDuration
    ) &&
    requestedDuration > 0
      ? requestedDuration
      : 5000;


  const tickSpeed = 120;


  spinTimer =
    setInterval(
      () => {

        elapsed +=
          tickSpeed;


        const randomName =
          raffleState.expandedTickets[
            Math.floor(
              Math.random() *
              raffleState
                .expandedTickets
                .length
            )
          ];


        renderNames(
          randomName
        );


        if (
          elapsed >= duration
        ) {

          clearInterval(
            spinTimer
          );


          spinTimer =
            null;


          renderNames(
            raffleState.winner
          );


          setTimeout(
            () => {

              showWinner(
                raffleState.winner
              );

            },
            500
          );

        }

      },
      tickSpeed
    );

}


// ======================================================
// CLEAR RAFFLE
// ======================================================

function handleRaffleClear() {

  clearInterval(
    spinTimer
  );


  clearTimeout(
    hideTimer
  );


  spinTimer = null;
  hideTimer = null;


  raffleState.entries = [];

  raffleState.expandedTickets = [];

  raffleState.winner = null;

  raffleState.isRunning = false;


  const namesEl =
    document.getElementById(
      "raffle-names"
    );


  const winnerScreen =
    document.getElementById(
      "raffle-winner-screen"
    );


  const winnerName =
    document.getElementById(
      "raffle-winner-name"
    );


  const title =
    document.getElementById(
      "raffle-title"
    );


  if (namesEl) {

    namesEl.innerHTML = "";

  }


  if (winnerName) {

    winnerName.textContent =
      "---";

  }


  if (title) {

    title.textContent =
      "Choosing winner...";

  }


  if (winnerScreen) {

    winnerScreen.classList.add(
      "hidden"
    );


    winnerScreen.classList.remove(
      "show"
    );

  }


  hideWidget();

}


// ======================================================
// START
// ======================================================

handleRaffleClear();

connectWS();