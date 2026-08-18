// ======================================================
// MVP WIDGET - GROUP 1
// Auto-reconnect + heartbeat + suma/resta de tips
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
// ESTADO MVP
// ======================================================

// Ejemplo:
//
// {
//   "Marco": 100,
//   "John": 75,
//   "Peter": 40
// }

let scores = {};


// ======================================================
// WS BASE
// ======================================================

function getWSBase() {

  // LOCAL:
  // http://localhost:8080
  // →
  // ws://localhost:8080
  //
  // RAILWAY:
  // https://xxxx.railway.app
  // →
  // wss://xxxx.railway.app

  return window.location.origin.replace(
    /^http/,
    "ws"
  );

}


// ======================================================
// CONEXIÓN WEBSOCKET
// ======================================================

function connectWS() {

  const WS_BASE = getWSBase();


  const url =
    `${WS_BASE}/` +
    `?modelId=${encodeURIComponent(MODEL_ID)}` +
    `&groupId=${encodeURIComponent(GROUP_ID)}`;


  console.log(
    "[MVP WS] connecting to",
    url
  );


  ws = new WebSocket(url);


  // ====================================================
  // CONNECTED
  // ====================================================

  ws.onopen = () => {

    console.log(
      `[MVP WS] CONNECTED → ${MODEL_ID}:${GROUP_ID}`
    );


    if (reconnectTimeout) {

      clearTimeout(
        reconnectTimeout
      );

      reconnectTimeout = null;

    }


    startHeartbeat();

  };


  // ====================================================
  // MESSAGE
  // ====================================================

  ws.onmessage = (event) => {

    let data;


    try {

      data = JSON.parse(
        event.data || "{}"
      );

    } catch {

      console.warn(
        "[MVP WS] Mensaje inválido"
      );

      return;

    }


    // Heartbeat
    if (
      data.type === "pong"
    ) {

      return;

    }


    handleMessage(data);

  };


  // ====================================================
  // ERROR
  // ====================================================

  ws.onerror = (error) => {

    console.log(
      "[MVP WS] ERROR",
      error
    );


    try {

      ws.close();

    } catch {}

  };


  // ====================================================
  // CLOSED
  // ====================================================

  ws.onclose = (event) => {

    console.log(
      "[MVP WS] CLOSED",
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

  if (reconnectTimeout) {

    return;

  }


  console.log(
    "[MVP WS] reconnecting in 3s..."
  );


  reconnectTimeout =
    setTimeout(
      () => {

        reconnectTimeout = null;

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
            "[MVP WS] heartbeat error",
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

    heartbeatInterval = null;

  }

}


// ======================================================
// BUSCAR SPENDER
// ======================================================

// Esto evita crear dos personas diferentes:
//
// Marco
// marco
// MARCO
//
// Si ya existe, usamos el nombre original.

function findExistingName(name) {

  const target =
    String(name || "")
      .trim()
      .toLowerCase();


  if (!target) {

    return null;

  }


  return (
    Object.keys(scores).find(
      (existingName) =>
        existingName
          .toLowerCase() ===
        target
    ) || null
  );

}


// ======================================================
// PROCESAR MENSAJES
// ======================================================

function handleMessage(data) {

  // ====================================================
  // TIP
  // ====================================================

  if (
    data.type === "tip"
  ) {

    const incomingName =
      String(
        data.payload?.name || ""
      ).trim();


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
    // Solamente rechazamos:
    //
    // 0
    // NaN
    // nombre vacío

    if (
      !incomingName ||
      !Number.isFinite(amount) ||
      amount === 0
    ) {

      return;

    }


    // Buscar si ya existe ese spender,
    // ignorando mayúsculas/minúsculas.

    const existingName =
      findExistingName(
        incomingName
      );


    const scoreName =
      existingName ||
      incomingName;


    const previousAmount =
      Number(
        scores[scoreName] || 0
      );


    // Sumar o restar.
    //
    // Nunca permitimos total negativo.

    const newAmount =
      Math.max(
        0,
        previousAmount + amount
      );


    // Si llegó a cero,
    // lo quitamos del ranking.

    if (
      newAmount <= 0
    ) {

      delete scores[
        scoreName
      ];

    } else {

      scores[
        scoreName
      ] = newAmount;

    }


    console.log(
      `[MVP] ${scoreName}:`,
      previousAmount,
      amount >= 0
        ? `+${amount}`
        : amount,
      "→",
      newAmount
    );


    render();

    return;

  }


  // ====================================================
  // CLEAR MVP
  // ====================================================

  if (
    data.type === "clear"
  ) {

    scores = {};

    render();

    return;

  }

}


// ======================================================
// RENDER MVP
// ======================================================

function render() {

  const list =
    document.getElementById(
      "top-list"
    );


  if (!list) {

    return;

  }


  list.innerHTML = "";


  // Ordenar de mayor a menor
  // y mostrar solamente Top 3.

  const sorted =
    Object.entries(scores)
      .filter(
        ([, total]) =>
          Number(total) > 0
      )
      .sort(
        (a, b) =>
          b[1] - a[1]
      )
      .slice(
        0,
        3
      );


  sorted.forEach(
    ([name, total], index) => {

      const row =
        document.createElement(
          "div"
        );


      row.className =
        "tip";


      // TOP 1
      if (
        index === 0
      ) {

        row.classList.add(
          "mvp"
        );

      }


      // TOP 2
      if (
        index === 1
      ) {

        row.classList.add(
          "second"
        );

      }


      // TOP 3
      if (
        index === 2
      ) {

        row.classList.add(
          "third"
        );

      }


      row.innerHTML = `
        <span class="name">
          ${escapeHTML(name)}
        </span>

        <span class="amount">
          $${formatAmount(total)}
        </span>
      `;


      list.appendChild(
        row
      );

    }
  );

}


// ======================================================
// FORMATEAR MONTO
// ======================================================

function formatAmount(value) {

  const number =
    Number(value) || 0;


  // Si es entero:
  //
  // 20 → 20
  //
  // Si tiene decimales:
  //
  // 20.50 → 20.50

  if (
    Number.isInteger(number)
  ) {

    return String(number);

  }


  return number.toFixed(2);

}


// ======================================================
// SEGURIDAD HTML
// ======================================================

function escapeHTML(value) {

  return String(value)
    .replaceAll(
      "&",
      "&amp;"
    )
    .replaceAll(
      "<",
      "&lt;"
    )
    .replaceAll(
      ">",
      "&gt;"
    )
    .replaceAll(
      '"',
      "&quot;"
    )
    .replaceAll(
      "'",
      "&#039;"
    );

}


// ======================================================
// START
// ======================================================

connectWS();