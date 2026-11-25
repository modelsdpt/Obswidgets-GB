/* =========================================================
   BOMB COUNTDOWN
   GROUP 1
   script.js
   ========================================================= */


/* =========================================================
   1. CONFIG
   ========================================================= */

/*
  Mantiene el mismo MODEL_ID de tu widget actual.

  También permitimos cambiarlo desde la URL:

  /countdown/bomb/?modelId=roman001&groupId=group1

  Si no se envía nada:
  roman001 + group1
*/

const URL_PARAMS =
  new URLSearchParams(
    window.location.search
  );


const MODEL_ID =
  URL_PARAMS.get("modelId") ||
  "roman001";


const GROUP_ID =
  URL_PARAMS.get("groupId") ||
  "group1";


/* =========================================================
   2. TIMER STATE
   ========================================================= */

let remaining = 0;

let timerId = null;


/*
  totalDuration se utiliza para
  calcular la barra de progreso.

  Si se agrega más tiempo mientras
  corre el timer, también aumenta.
*/

let totalDuration = 0;


/* =========================================================
   3. WEBSOCKET STATE
   ========================================================= */

let ws = null;

let reconnectTimeout = null;

let heartbeatInterval = null;


/* =========================================================
   4. DOM
   ========================================================= */

const bombWidget =
  document.getElementById(
    "bomb-widget"
  );


const timerBox =
  document.getElementById(
    "timer-box"
  );


const timerValue =
  document.getElementById(
    "timer-value"
  );


const statusLight =
  document.getElementById(
    "status-light"
  );


const statusText =
  document.getElementById(
    "status-text"
  );


const armedLabel =
  document.getElementById(
    "armed-label"
  );


const connectionLight =
  document.getElementById(
    "connection-light"
  );


const connectionText =
  document.getElementById(
    "connection-text"
  );


const dangerProgress =
  document.getElementById(
    "danger-progress"
  );


const timerEndSound =
  document.getElementById(
    "timerEndSound"
  );


/* =========================================================
   5. FORMAT TIME
   ========================================================= */

function formatTime(
  seconds
) {

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


/* =========================================================
   6. UPDATE DISPLAY
   ========================================================= */

function updateTimerDisplay() {

  if (!timerValue) {
    return;
  }


  timerValue.textContent =
    formatTime(
      remaining
    );


  updateVisualState();

  updateProgress();

}


/* =========================================================
   7. UPDATE PROGRESS
   ========================================================= */

/*
  La barra comienza vacía.

  A medida que el contador se acerca
  a 00:00 se llena hasta 100%.
*/

function updateProgress() {

  if (!dangerProgress) {
    return;
  }


  if (
    totalDuration <= 0
  ) {

    dangerProgress.style.width =
      "0%";

    return;

  }


  const elapsed =
    totalDuration -
    remaining;


  let percentage =
    (
      elapsed /
      totalDuration
    ) * 100;


  percentage =
    Math.max(
      0,
      Math.min(
        100,
        percentage
      )
    );


  dangerProgress.style.width =
    `${percentage}%`;

}


/* =========================================================
   8. VISUAL STATE
   ========================================================= */

function updateVisualState() {

  if (
    !bombWidget ||
    !timerBox
  ) {

    return;

  }


  /*
    Limpiamos estados temporales.
  */

  timerBox.classList.remove(
    "timer-danger",
    "timer-critical"
  );


  /*
    TIMER DETENIDO
  */

  if (
    !timerId ||
    remaining <= 0
  ) {

    if (
      !timerBox.classList.contains(
        "timer-finished"
      )
    ) {

      bombWidget.classList.remove(
        "is-running"
      );


      if (statusText) {

        statusText.textContent =
          "STANDBY";

      }


      if (armedLabel) {

        armedLabel.textContent =
          "READY";

      }

    }


    return;

  }


  /*
    TIMER ACTIVO
  */

  bombWidget.classList.add(
    "is-running"
  );


  if (statusText) {

    statusText.textContent =
      "ARMED";

  }


  if (armedLabel) {

    armedLabel.textContent =
      "ARMED";

  }


  /*
    ÚLTIMOS 10 SEGUNDOS
  */

  if (
    remaining <= 10
  ) {

    timerBox.classList.add(
      "timer-danger"
    );

  }


  /*
    ÚLTIMOS 5 SEGUNDOS
  */

  if (
    remaining <= 5
  ) {

    timerBox.classList.add(
      "timer-critical"
    );

  }

}


/* =========================================================
   9. TICK ANIMATION
   ========================================================= */

function triggerTickAnimation() {

  if (!timerBox) {
    return;
  }


  timerBox.classList.remove(
    "timer-tick"
  );


  /*
    Fuerza al navegador a reiniciar
    la animación CSS.
  */

  void timerBox.offsetWidth;


  timerBox.classList.add(
    "timer-tick"
  );


  setTimeout(
    () => {

      timerBox.classList.remove(
        "timer-tick"
      );

    },
    220
  );

}


/* =========================================================
   10. CLEAR FINISHED STATE
   ========================================================= */

function clearFinishedState() {

  if (!timerBox) {
    return;
  }


  timerBox.classList.remove(
    "timer-finished"
  );

}


/* =========================================================
   11. START OR ADD TIMER
   ========================================================= */

/*
  Igual que tu Countdown actual:

  Si NO está corriendo:
  empieza el timer.

  Si YA está corriendo:
  agrega segundos al tiempo restante.
*/

function startOrAddTimer(
  seconds
) {

  const amount =
    Number(seconds);


  if (
    !Number.isFinite(
      amount
    ) ||
    amount <= 0
  ) {

    console.warn(
      "[BOMB COUNTDOWN] Invalid seconds:",
      seconds
    );

    return;

  }


  const secondsToAdd =
    Math.floor(
      amount
    );


  clearFinishedState();


  /* =====================================================
     TIMER YA CORRIENDO
  ====================================================== */

  if (timerId) {

    remaining +=
      secondsToAdd;


    totalDuration +=
      secondsToAdd;


    updateTimerDisplay();


    triggerTickAnimation();


    console.log(
      "[BOMB COUNTDOWN] Added:",
      secondsToAdd,
      "seconds → remaining:",
      remaining
    );


    return;

  }


  /* =====================================================
     NUEVO TIMER
  ====================================================== */

  remaining =
    secondsToAdd;


  totalDuration =
    secondsToAdd;


  updateTimerDisplay();


  triggerTickAnimation();


  console.log(
    "[BOMB COUNTDOWN] Started:",
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


        triggerTickAnimation();


        updateTimerDisplay();

      },
      1000
    );

}


/* =========================================================
   12. STOP TIMER
   ========================================================= */

function stopTimer() {

  if (timerId) {

    clearInterval(
      timerId
    );


    timerId = null;

  }


  remaining = 0;

  totalDuration = 0;


  clearFinishedState();


  if (timerBox) {

    timerBox.classList.remove(
      "timer-danger",
      "timer-critical",
      "timer-tick"
    );

  }


  if (bombWidget) {

    bombWidget.classList.remove(
      "is-running"
    );

  }


  if (statusText) {

    statusText.textContent =
      "STANDBY";

  }


  if (armedLabel) {

    armedLabel.textContent =
      "READY";

  }


  updateTimerDisplay();


  console.log(
    "[BOMB COUNTDOWN] Timer stopped"
  );

}


/* =========================================================
   13. FINISH TIMER
   ========================================================= */

function finishTimer() {

  if (timerId) {

    clearInterval(
      timerId
    );


    timerId = null;

  }


  remaining = 0;


  if (bombWidget) {

    bombWidget.classList.remove(
      "is-running"
    );

  }


  if (timerBox) {

    timerBox.classList.remove(
      "timer-danger",
      "timer-critical",
      "timer-tick"
    );


    timerBox.classList.add(
      "timer-finished"
    );

  }


  if (statusText) {

    statusText.textContent =
      "TIME OUT";

  }


  if (armedLabel) {

    armedLabel.textContent =
      "COMPLETE";

  }


  if (dangerProgress) {

    dangerProgress.style.width =
      "100%";

  }


  updateTimerDisplay();


  playTimerEndSound();


  console.log(
    "[BOMB COUNTDOWN] Timer finished"
  );


  /*
    Después de la animación final
    dejamos 00:00 visible pero quitamos
    el flash y la sacudida.
  */

  setTimeout(
    () => {

      if (timerBox) {

        timerBox.classList.remove(
          "timer-finished"
        );

      }


      if (statusText) {

        statusText.textContent =
          "STANDBY";

      }


      if (armedLabel) {

        armedLabel.textContent =
          "READY";

      }

    },
    2200
  );

}


/* =========================================================
   14. SOUND
   ========================================================= */

function playTimerEndSound() {

  if (!timerEndSound) {
    return;
  }


  /*
    Como por ahora el <audio> no tiene
    archivo asignado, simplemente no hace
    nada.

    Más adelante podemos agregar un sonido
    de alarma/explosión.
  */

  const source =
    timerEndSound.getAttribute(
      "src"
    );


  if (!source) {

    console.log(
      "[BOMB COUNTDOWN] No end sound configured."
    );

    return;

  }


  try {

    timerEndSound.currentTime = 0;


    timerEndSound
      .play()
      .catch(
        () => {}
      );


  } catch (error) {

    console.log(
      "[BOMB COUNTDOWN] Audio error:",
      error
    );

  }

}


/* =========================================================
   15. WEBSOCKET BASE
   ========================================================= */

function getWSBase() {

  return window.location.origin.replace(
    /^http/,
    "ws"
  );

}


/* =========================================================
   16. CONNECT WEBSOCKET
   ========================================================= */

function connectWS() {

  const WS_BASE =
    getWSBase();


  const url =
    `${WS_BASE}/` +
    `?modelId=${encodeURIComponent(
      MODEL_ID
    )}` +
    `&groupId=${encodeURIComponent(
      GROUP_ID
    )}`;


  console.log(
    "[BOMB COUNTDOWN WS] connecting to",
    url
  );


  try {

    ws =
      new WebSocket(
        url
      );


  } catch (error) {

    console.log(
      "[BOMB COUNTDOWN WS] Could not create WebSocket:",
      error
    );


    setConnectionState(
      false
    );


    scheduleReconnect();


    return;

  }


  /* =====================================================
     OPEN
  ====================================================== */

  ws.onopen =
    () => {

      console.log(
        `[BOMB COUNTDOWN WS] CONNECTED → ${MODEL_ID}:${GROUP_ID}`
      );


      setConnectionState(
        true
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


  /* =====================================================
     MESSAGE
  ====================================================== */

  ws.onmessage =
    (event) => {

      let data;


      try {

        data =
          JSON.parse(
            event.data ||
            "{}"
          );


      } catch {

        console.warn(
          "[BOMB COUNTDOWN WS] Invalid message:",
          event.data
        );


        return;

      }


      /*
        HEARTBEAT RESPONSE
      */

      if (
        data.type ===
        "pong"
      ) {

        return;

      }


      console.log(
        "[BOMB COUNTDOWN WS] EVENT:",
        data.type,
        data.payload || {}
      );


      handleMessage(
        data
      );

    };


  /* =====================================================
     ERROR
  ====================================================== */

  ws.onerror =
    (error) => {

      console.log(
        "[BOMB COUNTDOWN WS] ERROR",
        error
      );


      setConnectionState(
        false
      );


      try {

        ws.close();

      } catch {}

    };


  /* =====================================================
     CLOSE
  ====================================================== */

  ws.onclose =
    (event) => {

      console.log(
        "[BOMB COUNTDOWN WS] CLOSED",
        event.code,
        event.reason
      );


      setConnectionState(
        false
      );


      stopHeartbeat();


      scheduleReconnect();

    };

}


/* =========================================================
   17. CONNECTION VISUAL STATE
   ========================================================= */

function setConnectionState(
  online
) {

  if (!bombWidget) {
    return;
  }


  if (online) {

    bombWidget.classList.add(
      "is-online"
    );


    if (connectionText) {

      connectionText.textContent =
        "ONLINE";

    }


  } else {

    bombWidget.classList.remove(
      "is-online"
    );


    if (connectionText) {

      connectionText.textContent =
        "OFFLINE";

    }

  }

}


/* =========================================================
   18. HANDLE WEBSOCKET EVENTS
   ========================================================= */

function handleMessage(
  data
) {

  if (!data) {
    return;
  }


  /* =====================================================
     START / ADD TIME
  ====================================================== */

  if (
    data.type ===
    "actionBombTimer"
  ) {

    const seconds =
      Number(
        data.payload?.seconds
      );


    console.log(
      "[BOMB COUNTDOWN] actionBombTimer received:",
      seconds
    );


    if (
      !Number.isFinite(
        seconds
      ) ||
      seconds <= 0
    ) {

      console.warn(
        "[BOMB COUNTDOWN] Invalid seconds:",
        seconds
      );


      return;

    }


    startOrAddTimer(
      seconds
    );


    return;

  }


  /* =====================================================
     STOP TIMER
  ====================================================== */

  if (
    data.type ===
    "actionBombTimerStop"
  ) {

    console.log(
      "[BOMB COUNTDOWN] actionBombTimerStop received"
    );


    stopTimer();


    return;

  }


  /* =====================================================
     RESET GENERAL
  ====================================================== */

  if (
    data.type ===
      "resetWidgets" ||
    data.type ===
      "resetAll" ||
    data.type ===
      "clear"
  ) {

    console.log(
      "[BOMB COUNTDOWN] Reset event received:",
      data.type
    );


    stopTimer();


    return;

  }

}


/* =========================================================
   19. RECONNECT
   ========================================================= */

function scheduleReconnect() {

  if (
    reconnectTimeout
  ) {

    return;

  }


  console.log(
    "[BOMB COUNTDOWN WS] reconnecting in 3 seconds..."
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


/* =========================================================
   20. HEARTBEAT
   ========================================================= */

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
              ts: Date.now()
            })
          );


        } catch (error) {

          console.log(
            "[BOMB COUNTDOWN WS] Heartbeat error:",
            error
          );

        }

      },
      30000
    );

}


/* =========================================================
   21. STOP HEARTBEAT
   ========================================================= */

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


/* =========================================================
   22. INITIAL STATE
   ========================================================= */

function initializeWidget() {

  remaining = 0;

  totalDuration = 0;


  setConnectionState(
    false
  );


  if (statusText) {

    statusText.textContent =
      "STANDBY";

  }


  if (armedLabel) {

    armedLabel.textContent =
      "READY";

  }


  if (connectionText) {

    connectionText.textContent =
      "OFFLINE";

  }


  updateTimerDisplay();


  console.log(
    "[BOMB COUNTDOWN] Initialized"
  );


  console.log(
    "[BOMB COUNTDOWN] MODEL_ID:",
    MODEL_ID
  );


  console.log(
    "[BOMB COUNTDOWN] GROUP_ID:",
    GROUP_ID
  );


  connectWS();

}


/* =========================================================
   23. START
   ========================================================= */

initializeWidget();