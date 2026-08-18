// ======================================================
// GOAL BAR - GROUP 1
// Auto-reconnect + heartbeat + multi-stage
// Soporta suma y resta de tips
// ======================================================


// ======================================================
// CONFIG
// ======================================================

const MODEL_ID = "roman001";
const GROUP_ID = "group2";


// ======================================================
// WEBSOCKET
// ======================================================

let ws = null;
let reconnectTimeout = null;
let heartbeatInterval = null;


// ======================================================
// ESTADO GOAL BAR
// ======================================================

// Total acumulado de tips
let current = 0;

// Metas acumulativas:
//
// [
//   {
//     target: 200,
//     label: "Goal 1"
//   },
//   {
//     target: 400,
//     label: "Goal 2"
//   }
// ]

let stages = [];

let goalCompleted = false;


// ======================================================
// ELEMENTOS DEL DOM
// ======================================================

const bar =
  document.getElementById(
    "bar-fill"
  );

const goalTitle =
  document.querySelector(
    ".goal-title"
  );

const amountText =
  document.querySelector(
    ".goal-amount"
  );

const tipSound =
  document.getElementById(
    "tipSound"
  );


// ======================================================
// WS BASE
// ======================================================

function getWSBase() {

  // LOCAL:
  //
  // http://localhost:8080
  // →
  // ws://localhost:8080
  //
  // RAILWAY:
  //
  // https://xxx.railway.app
  // →
  // wss://xxx.railway.app

  return window.location.origin.replace(
    /^http/,
    "ws"
  );

}


// ======================================================
// AUDIO
// ======================================================

function playTip() {

  if (!tipSound) {
    return;
  }


  try {

    tipSound.currentTime = 0;

    tipSound.volume = 1;


    tipSound
      .play()
      .catch(() => {});

  } catch (error) {

    console.log(
      "[GOAL] Audio error:",
      error
    );

  }

}


// ======================================================
// CONEXIÓN WEBSOCKET
// ======================================================

function connectWS() {

  const WS_BASE =
    getWSBase();


  const url =
    `${WS_BASE}/` +
    `?modelId=${encodeURIComponent(MODEL_ID)}` +
    `&groupId=${encodeURIComponent(GROUP_ID)}`;


  console.log(
    "[GOAL WS] connecting to",
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
      `[GOAL WS] CONNECTED → ${MODEL_ID}:${GROUP_ID}`
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

  ws.onmessage = (event) => {

    let data;


    try {

      data =
        JSON.parse(
          event.data || "{}"
        );

    } catch {

      console.warn(
        "[GOAL WS] Mensaje inválido"
      );

      return;

    }


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

  ws.onerror = (error) => {

    console.log(
      "[GOAL WS] ERROR",
      error
    );


    try {

      ws.close();

    } catch {}

  };


  // ====================================================
  // CLOSE
  // ====================================================

  ws.onclose = (event) => {

    console.log(
      "[GOAL WS] CLOSED",
      event.code,
      event.reason
    );


    stopHeartbeat();

    scheduleReconnect();

  };

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
    "[GOAL WS] reconnecting in 3s..."
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
            "[GOAL WS] heartbeat error",
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
// CONFIGURAR MULTI-GOALS
// ======================================================

function setStagesFromPayload(
  payload
) {

  const raw =
    Array.isArray(
      payload?.stages
    )
      ? payload.stages
      : [];


  stages =
    raw
      .map(
        (stage) => {

          return {

            target:
              Number(
                stage.target ??
                stage.goal ??
                0
              ),

            label:
              String(
                stage.label ??
                stage.title ??
                ""
              ).trim() ||
              "Goal",

          };

        }
      )
      .filter(
        (stage) =>
          Number.isFinite(
            stage.target
          ) &&
          stage.target > 0
      )
      .sort(
        (a, b) =>
          a.target -
          b.target
      );


  // Permitir current inicial
  // enviado desde el Panel.

  const initial =
    Number(
      payload?.current ?? 0
    );


  current =
    Number.isFinite(initial)
      ? Math.max(
          0,
          initial
        )
      : 0;


  goalCompleted =
    false;


  updateBar(
    false
  );

}


// ======================================================
// MANEJAR EVENTOS
// ======================================================

function handleMessage(
  data
) {

  // ====================================================
  // CONFIGURACIÓN MULTI GOAL
  // ====================================================

  if (
    data.type ===
    "setGoalConfig"
  ) {

    setStagesFromPayload(
      data.payload || {}
    );

    return;

  }


  // ====================================================
  // COMPATIBILIDAD META SIMPLE
  // ====================================================

  if (
    data.type ===
    "setGoal"
  ) {

    const goal =
      Number(
        data.payload?.goal ||
        0
      );


    const label =
      String(
        data.payload?.label ||
        data.payload?.title ||
        ""
      ).trim() ||
      "Goal";


    if (
      Number.isFinite(goal) &&
      goal > 0
    ) {

      stages = [
        {
          target: goal,
          label,
        },
      ];

    } else {

      stages = [];

    }


    current = 0;

    goalCompleted =
      false;


    updateBar(
      false
    );

    return;

  }


  // ====================================================
  // TIP
  // ====================================================

  if (
    data.type === "tip"
  ) {

    const amount =
      Number(
        data.payload?.amount
      );


    // Permitimos:
    //
    // +20
    // +50
    // -20
    // -50
    //
    // Rechazamos:
    //
    // NaN
    // 0

    if (
      !Number.isFinite(amount) ||
      amount === 0
    ) {

      return;

    }


    const previous =
      current;


    // SUMAR O RESTAR
    //
    // Nunca dejamos que el total
    // sea menor que cero.

    current =
      Math.max(
        0,
        current + amount
      );


    console.log(
      "[GOAL]",
      previous,
      amount >= 0
        ? `+${amount}`
        : amount,
      "→",
      current
    );


    // true solamente si fue
    // un tip positivo.
    //
    // Así una corrección -20
    // NO reproduce sonido.

    updateBar(
      amount > 0
    );


    return;

  }


  // ====================================================
  // CLEAR GOAL
  // ====================================================

  if (
    data.type ===
    "clearGoal"
  ) {

    stages = [];

    current = 0;

    goalCompleted =
      false;


    updateBar(
      false
    );

    return;

  }

}


// ======================================================
// ACTUALIZAR BARRA
// ======================================================

function updateBar(
  fromPositiveTip
) {

  // ====================================================
  // SIN GOALS
  // ====================================================

  if (
    !stages.length
  ) {

    if (bar) {

      bar.style.height =
        "0%";

    }


    if (amountText) {

      amountText.textContent =
        "";

    }


    if (goalTitle) {

      goalTitle.textContent =
        "";

      goalTitle.classList.remove(
        "neon"
      );

    }


    goalCompleted =
      false;


    return;

  }


  // ====================================================
  // ÚLTIMA META
  // ====================================================

  const lastStage =
    stages[
      stages.length - 1
    ];



  // ====================================================
  // ENCONTRAR META ACTIVA
  // ====================================================

  // Ejemplo:
  //
  // Goal 1 = 200
  // Goal 2 = 400
  //
  // current = 150
  // → Goal 1
  //
  // current = 250
  // → Goal 2
  //
  // current = 450
  // → Goal 2 completado


  let activeIndex =
    stages.findIndex(
      (stage) =>
        current <=
        stage.target
    );


  let allDone =
    false;


  if (
    activeIndex === -1
  ) {

    activeIndex =
      stages.length - 1;

    allDone =
      true;

  }


  const activeStage =
    stages[
      activeIndex
    ];


  const previousTarget =
    activeIndex > 0
      ? stages[
          activeIndex - 1
        ].target
      : 0;


  const span =
    Math.max(
      1,
      activeStage.target -
      previousTarget
    );


  const stageProgress =
    Math.max(
      0,
      current -
      previousTarget
    );


  let percent =
    Math.min(
      (
        stageProgress /
        span
      ) * 100,
      100
    );


  // ====================================================
  // SI TODAS LAS GOALS ESTÁN COMPLETADAS
  // ====================================================

  if (
    allDone &&
    current >=
      lastStage.target
  ) {

    percent = 100;

  }


  // ====================================================
  // ACTUALIZAR ALTURA
  // ====================================================

  if (bar) {

    bar.style.height =
      `${percent}%`;

  }


  // ====================================================
  // ACTUALIZAR TÍTULO
  // ====================================================

  if (goalTitle) {

    goalTitle.textContent =
      activeStage.label;


    // Solo consideramos TODO completado
    // si llegamos a la última meta.

    if (
      current >=
      lastStage.target
    ) {

      goalTitle.classList.add(
        "neon"
      );


      // Sonido una sola vez
      // cuando se completa.

      if (
        !goalCompleted &&
        fromPositiveTip
      ) {

        playTip();

      }


      goalCompleted =
        true;

    } else {

      // Si hacemos una corrección
      // y bajamos nuevamente de la meta,
      // quitamos el estado completado.

      goalTitle.classList.remove(
        "neon"
      );


      goalCompleted =
        false;

    }

  }


  // ====================================================
  // MONTO
  // ====================================================

  if (amountText) {

    amountText.textContent =
      `$${formatAmount(current)} / $${formatAmount(activeStage.target)}`;

  }


  // ====================================================
  // SONIDO TIP NORMAL
  // ====================================================

  // Solo para tips positivos
  // que NO hayan completado la última goal.

  if (
    fromPositiveTip &&
    !goalCompleted
  ) {

    playTip();

  }

}


// ======================================================
// FORMATO DE MONTO
// ======================================================

function formatAmount(
  value
) {

  const number =
    Number(value) || 0;


  if (
    Number.isInteger(
      number
    )
  ) {

    return String(
      number
    );

  }


  return number.toFixed(
    2
  );

}


// ======================================================
// START
// ======================================================

connectWS();