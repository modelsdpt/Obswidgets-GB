// ======================================================
// COUNTDOWN 1 - GROUP 1
// Panel 1 → group1 → countdown
// ======================================================


// ======================================================
// CONFIG
// ======================================================

const MODEL_ID = "roman001";
const GROUP_ID = "group1";


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

function getTimerValue() {

  // Intentamos varios selectores para que
  // funcione aunque Countdown 1 tenga
  // un HTML diferente a Countdown 2.

  const selectors = [
    "#timer-value",
    "#timer",
    "#countdown",
    "#countdown-value",
    ".timer-value",
    ".timer-number",
    ".countdown-value",
    ".countdown-number",
    "[data-timer-value]",
  ];


  for (const selector of selectors) {

    const element =
      document.querySelector(selector);

    if (element) {
      return element;
    }

  }


  // Último recurso:
  // buscar un elemento que ya muestre algo
  // como 00:00.

  const elements =
    Array.from(
      document.querySelectorAll(
        "body *"
      )
    );


  const detected =
    elements.find(
      (element) => {

        if (
          element.children.length > 0
        ) {
          return false;
        }


        const text =
          String(
            element.textContent || ""
          ).trim();


        return /^\d{1,3}:\d{2}$/.test(
          text
        );

      }
    );


  return detected || null;

}


function getTimerBox() {

  const selectors = [
    ".timer-box",
    "#timer-box",
    ".countdown-box",
    "#countdown-box",
    ".timer-container",
    ".countdown-container",
  ];


  for (const selector of selectors) {

    const element =
      document.querySelector(selector);

    if (element) {
      return element;
    }

  }


  const timerValue =
    getTimerValue();


  return (
    timerValue?.parentElement ||
    null
  );

}


function getTimerEndSound() {

  return (
    document.getElementById(
      "timerEndSound"
    ) ||
    document.getElementById(
      "timer-end-sound"
    ) ||
    document.querySelector(
      "audio"
    ) ||
    null
  );

}


// ======================================================
// FORMAT TIME
// ======================================================

function formatTime(seconds) {

  const safeSeconds =
    Math.max(
      0,
      Math.floor(
        Number(seconds) || 0
      )
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
// UPDATE DISPLAY
// ======================================================

function updateTimerDisplay() {

  const timerValue =
    getTimerValue();


  if (!timerValue) {

    console.warn(
      "[COUNTDOWN 1] No encontré el elemento visual del timer."
    );

    return;

  }


  timerValue.textContent =
    formatTime(
      remaining
    );

}


// ======================================================
// FINISHED STATE
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
// START OR ADD TIMER
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
  // TIMER YA CORRIENDO
  // ====================================================

  if (timerId) {

    remaining +=
      Math.floor(amount);


    updateTimerDisplay();


    console.log(
      "[COUNTDOWN 1] Added:",
      amount,
      "seconds → remaining:",
      remaining
    );


    return;

  }


  // ====================================================
  // NUEVO TIMER
  // ====================================================

  remaining =
    Math.floor(amount);


  updateTimerDisplay();


  console.log(
    "[COUNTDOWN 1] Started:",
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

          finishTimer();

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
    "[COUNTDOWN 1] Timer stopped"
  );

}


// ======================================================
// FINISH TIMER
// ======================================================

function finishTimer() {

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
    "[COUNTDOWN 1] Timer finished"
  );

}


// ======================================================
// SOUND
// ======================================================

function playTimerEndSound() {

  const sound =
    getTimerEndSound();


  if (!sound) {

    console.log(
      "[COUNTDOWN 1] No end sound found."
    );

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
      "[COUNTDOWN 1] Audio error:",
      error
    );

  }

}


// ======================================================
// WEBSOCKET BASE
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
    "[COUNTDOWN 1 WS] connecting to",
    url
  );


  ws =
    new WebSocket(
      url
    );


  // ====================================================
  // OPEN
  // ====================================================

  ws.onopen = () => {

    console.log(
      `[COUNTDOWN 1 WS] CONNECTED → ${MODEL_ID}:${GROUP_ID}`
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

    } catch {

      console.warn(
        "[COUNTDOWN 1 WS] Invalid message:",
        event.data
      );

      return;

    }


    if (
      data.type === "pong"
    ) {

      return;

    }


    console.log(
      "[COUNTDOWN 1 WS] EVENT:",
      data.type,
      data.payload || {}
    );


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
      "[COUNTDOWN 1 WS] ERROR",
      error
    );


    try {

      ws.close();

    } catch {}

  };


  // ====================================================
  // CLOSE
  // ====================================================

  ws.onclose = (
    event
  ) => {

    console.log(
      "[COUNTDOWN 1 WS] CLOSED",
      event.code,
      event.reason
    );


    stopHeartbeat();

    scheduleReconnect();

  };

}


// ======================================================
// HANDLE EVENTS
// ======================================================

function handleMessage(data) {

  // ====================================================
  // START / ADD
  // ====================================================

  if (
    data.type ===
    "actionTimer"
  ) {

    const seconds =
      Number(
        data.payload?.seconds
      );


    console.log(
      "[COUNTDOWN 1] actionTimer received:",
      seconds
    );


    if (
      !Number.isFinite(seconds) ||
      seconds <= 0
    ) {

      console.warn(
        "[COUNTDOWN 1] Invalid seconds:",
        seconds
      );

      return;

    }


    startOrAddTimer(
      seconds
    );


    return;

  }


  // ====================================================
  // STOP
  // ====================================================

  if (
    data.type ===
    "actionTimerStop"
  ) {

    console.log(
      "[COUNTDOWN 1] actionTimerStop received"
    );


    stopTimer();


    return;

  }

}


// ======================================================
// RECONNECT
// ======================================================

function scheduleReconnect() {

  if (
    reconnectTimeout
  ) {

    return;

  }


  console.log(
    "[COUNTDOWN 1 WS] reconnecting in 3 seconds..."
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
            "[COUNTDOWN 1 WS] Heartbeat error:",
            error
          );

        }

      },
      30000
    );

}


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
// START
// ======================================================

updateTimerDisplay();

connectWS();