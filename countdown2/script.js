// ======================================================
// COUNTDOWN 2 - GROUP 2
// Panel 2 → group2 → countdown2
// ======================================================


// ======================================================
// CONFIG
// ======================================================

const MODEL_ID = "roman001";
const GROUP_ID = "group2";


// ======================================================
// TIMER STATE
// ======================================================

let remaining = 0;
let timerId = null;


// ======================================================
// WEBSOCKET STATE
// ======================================================

let ws = null;
let reconnectTimeout = null;
let heartbeatInterval = null;


// ======================================================
// DOM HELPERS
// ======================================================

function getTimerBox() {
  return document.querySelector(
    ".timer-box"
  );
}


function getTimerValue() {
  return document.getElementById(
    "timer-value"
  );
}


function getTimerEndSound() {
  return document.getElementById(
    "timerEndSound"
  );
}


// ======================================================
// FORMATEAR TIEMPO
// ======================================================

function formatTime(seconds) {

  const safeSeconds =
    Math.max(
      0,
      Math.floor(seconds)
    );


  const minutes =
    Math.floor(
      safeSeconds / 60
    );


  const secs =
    safeSeconds % 60;


  return (
    String(minutes).padStart(
      2,
      "0"
    ) +
    ":" +
    String(secs).padStart(
      2,
      "0"
    )
  );

}


// ======================================================
// ACTUALIZAR TIMER EN PANTALLA
// ======================================================

function updateTimerDisplay() {

  const timerValue =
    getTimerValue();


  if (!timerValue) {
    return;
  }


  timerValue.textContent =
    formatTime(
      remaining
    );

}


// ======================================================
// QUITAR ESTADO DE FINALIZADO
// ======================================================

function clearFinishedState() {

  const timerBox =
    getTimerBox();


  if (!timerBox) {
    return;
  }


  timerBox.classList.remove(
    "timer-finished"
  );

}


// ======================================================
// START / ADD TIMER
// ======================================================

function startOrAddTimer(seconds) {

  const amount =
    Number(seconds);


  if (
    !Number.isFinite(amount) ||
    amount <= 0
  ) {

    return;

  }


  clearFinishedState();


  // ====================================================
  // SI YA ESTÁ CORRIENDO
  // ====================================================

  if (timerId) {

    remaining +=
      Math.floor(amount);


    updateTimerDisplay();


    console.log(
      "[COUNTDOWN 2] Added:",
      amount,
      "seconds. Remaining:",
      remaining
    );


    return;

  }


  // ====================================================
  // INICIAR NUEVO TIMER
  // ====================================================

  remaining =
    Math.floor(amount);


  updateTimerDisplay();


  console.log(
    "[COUNTDOWN 2] Started:",
    remaining,
    "seconds"
  );


  timerId =
    setInterval(
      () => {

        remaining -= 1;


        if (
          remaining <= 0
        ) {

          remaining = 0;

          updateTimerDisplay();

          onTimerEnd();

          return;

        }


        updateTimerDisplay();

      },
      1000
    );

}


// ======================================================
// STOP TIMER
// ======================================================

function stopTimer() {

  if (timerId) {

    clearInterval(
      timerId
    );

    timerId = null;

  }


  remaining = 0;


  clearFinishedState();

  updateTimerDisplay();


  console.log(
    "[COUNTDOWN 2] Timer stopped"
  );

}


// ======================================================
// TIMER FINISHED
// ======================================================

function onTimerEnd() {

  if (timerId) {

    clearInterval(
      timerId
    );

    timerId = null;

  }


  remaining = 0;

  updateTimerDisplay();


  const timerBox =
    getTimerBox();


  if (timerBox) {

    timerBox.classList.add(
      "timer-finished"
    );

  }


  playTimerEndSound();


  console.log(
    "[COUNTDOWN 2] Timer finished"
  );

}


// ======================================================
// TIMER END SOUND
// ======================================================

function playTimerEndSound() {

  const sound =
    getTimerEndSound();


  if (!sound) {
    return;
  }


  try {

    sound.currentTime = 0;


    sound
      .play()
      .catch(
        () => {}
      );

  } catch (error) {

    console.log(
      "[COUNTDOWN 2] Audio error:",
      error
    );

  }

}


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

  const WS_BASE =
    getWSBase();


  const url =
    `${WS_BASE}/` +
    `?modelId=${encodeURIComponent(MODEL_ID)}` +
    `&groupId=${encodeURIComponent(GROUP_ID)}`;


  console.log(
    "[COUNTDOWN 2 WS] connecting to",
    url
  );


  ws =
    new WebSocket(
      url
    );


  // ====================================================
  // CONNECTED
  // ====================================================

  ws.onopen = () => {

    console.log(
      `[COUNTDOWN 2 WS] CONNECTED → ${MODEL_ID}:${GROUP_ID}`
    );


    if (
      reconnectTimeout
    ) {

      clearTimeout(
        reconnectTimeout
      );

      reconnectTimeout =
        null;

    }


    startHeartbeat();

  };


  // ====================================================
  // MESSAGE
  // ====================================================

  ws.onmessage = (
    event
  ) => {

    let data;


    try {

      data =
        JSON.parse(
          event.data || "{}"
        );

    } catch (error) {

      console.log(
        "[COUNTDOWN 2 WS] Invalid message:",
        event.data
      );

      return;

    }


    // Respuesta heartbeat

    if (
      data.type === "pong"
    ) {

      return;

    }


    handleMessage(
      data
    );

  };


  // ====================================================
  // ERROR
  // ====================================================

  ws.onerror = (
    error
  ) => {

    console.log(
      "[COUNTDOWN 2 WS] ERROR",
      error
    );


    try {

      ws.close();

    } catch {}

  };


  // ====================================================
  // CLOSED
  // ====================================================

  ws.onclose = (
    event
  ) => {

    console.log(
      "[COUNTDOWN 2 WS] CLOSED",
      event.code,
      event.reason
    );


    stopHeartbeat();

    scheduleReconnect();

  };

}


// ======================================================
// HANDLE SERVER EVENTS
// ======================================================

function handleMessage(
  data
) {

  // ====================================================
  // ADD / START TIMER
  // ====================================================

  if (
    data.type ===
    "actionTimer"
  ) {

    const seconds =
      Number(
        data.payload?.seconds
      );


    if (
      !Number.isFinite(seconds) ||
      seconds <= 0
    ) {

      return;

    }


    console.log(
      "[COUNTDOWN 2] actionTimer:",
      seconds
    );


    startOrAddTimer(
      seconds
    );


    return;

  }


  // ====================================================
  // STOP TIMER
  // ====================================================

  if (
    data.type ===
    "actionTimerStop"
  ) {

    console.log(
      "[COUNTDOWN 2] actionTimerStop"
    );


    stopTimer();


    return;

  }

}


// ======================================================
// AUTO RECONNECT
// ======================================================

function scheduleReconnect() {

  if (
    reconnectTimeout
  ) {

    return;

  }


  console.log(
    "[COUNTDOWN 2 WS] reconnecting in 3s..."
  );


  reconnectTimeout =
    setTimeout(
      () => {

        reconnectTimeout =
          null;


        connectWS();

      },
      3000
    );

}


// ======================================================
// HEARTBEAT
// ======================================================

function startHeartbeat() {

  stopHeartbeat();


  heartbeatInterval =
    setInterval(
      () => {

        if (
          !ws ||
          ws.readyState !==
            WebSocket.OPEN
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
            "[COUNTDOWN 2 WS] Heartbeat error:",
            error
          );

        }

      },
      30000
    );

}


// ======================================================
// STOP HEARTBEAT
// ======================================================

function stopHeartbeat() {

  if (
    heartbeatInterval
  ) {

    clearInterval(
      heartbeatInterval
    );


    heartbeatInterval =
      null;

  }

}


// ======================================================
// INITIAL DISPLAY
// ======================================================

updateTimerDisplay();


// ======================================================
// START WEBSOCKET
// ======================================================

connectWS();