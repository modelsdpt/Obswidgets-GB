// ======================================================
// OF WIDGETS - LIVESTREAM CONTROL PANEL
// Panel 1 = group1
// Panel 2 = group2
// ======================================================


// ======================================================
// CONFIG
// ======================================================

const MODEL_ID = "roman001";

const API_URL = "/api/send";
const RESYNC_URL = "/api/resync";

const MAX_RECENT_NAMES = 30;


// ======================================================
// ESTADO INDEPENDIENTE POR GRUPO
// ======================================================

const panelStates = new Map();


function createInitialState() {
  return {
    recentNames: [],
    raffleEntries: [],
    raffleWinner: "",
  };
}


function getPanelState(groupId) {
  if (!panelStates.has(groupId)) {
    panelStates.set(
      groupId,
      createInitialState()
    );
  }

  return panelStates.get(groupId);
}


// ======================================================
// INIT
// ======================================================

document.addEventListener(
  "DOMContentLoaded",
  () => {

    initNavigation();

    const panels =
      document.querySelectorAll(
        ".stream-panel[data-group-id]"
      );

    panels.forEach((panel) => {
      initStreamPanel(panel);
    });

  }
);


// ======================================================
// NAVEGACIÓN PANEL 1 / PANEL 2
// ======================================================

function initNavigation() {

  const navButtons =
    document.querySelectorAll(
      "[data-panel-target]"
    );

  const panels =
    document.querySelectorAll(
      "[data-stream-panel]"
    );


  navButtons.forEach((button) => {

    button.addEventListener(
      "click",
      () => {

        const target =
          button.dataset.panelTarget;


        // -----------------------------
        // Sidebar
        // -----------------------------

        navButtons.forEach(
          (navButton) => {

            navButton.classList.toggle(
              "active",
              navButton === button
            );

          }
        );


        // -----------------------------
        // Panel visible
        // -----------------------------

        panels.forEach(
          (panel) => {

            panel.classList.toggle(
              "active",
              panel.dataset.streamPanel === target
            );

          }
        );

      }
    );

  });

}


// ======================================================
// INICIALIZAR CADA PANEL
// ======================================================

function initStreamPanel(panel) {

  const groupId =
    panel.dataset.groupId;

  if (!groupId) {
    console.error(
      "Panel sin data-group-id:",
      panel
    );

    return;
  }


  // Crear estado independiente
  getPanelState(groupId);


  bindTipControls(
    panel,
    groupId
  );

  bindGoalControls(
    panel,
    groupId
  );

  bindTimerControls(
    panel,
    groupId
  );

  bindRaffleControls(
    panel,
    groupId
  );

  bindResyncControl(
    panel,
    groupId
  );

  bindExtraControls(
    panel,
    groupId
  );


  // Dibujar estados iniciales
  renderRecentNames(
    panel,
    groupId
  );

  renderRaffle(
    panel,
    groupId
  );

}


// ======================================================
// HELPERS DE DOM
// ======================================================

function getRole(
  panel,
  role
) {

  return panel.querySelector(
    `[data-role="${role}"]`
  );

}


function getAction(
  panel,
  action
) {

  return panel.querySelector(
    `[data-action="${action}"]`
  );

}


// ======================================================
// API GENERAL
// ======================================================

async function sendToServer(
  groupId,
  type,
  payload = {}
) {

  try {

    const response =
      await fetch(
        API_URL,
        {

          method: "POST",

          headers: {
            "Content-Type":
              "application/json",
          },

          body:
            JSON.stringify({

              modelId:
                MODEL_ID,

              groupId,

              type,

              payload,

            }),

        }
      );


    const contentType =
      response.headers.get(
        "content-type"
      ) || "";


    const data =
      contentType.includes(
        "application/json"
      )
        ? await response.json()
        : null;


    if (!response.ok) {

      console.error(
        "❌ HTTP error:",
        response.status,
        data
      );

      return null;
    }


    // El backend puede responder HTTP 200
    // pero con ok:false si no hay widgets conectados.
    if (
      data &&
      data.ok === false
    ) {

      console.warn(
        `⚠️ ${groupId}:`,
        data.error ||
          "Evento no entregado."
      );

    } else {

      console.log(
        `✅ ${groupId} → ${type}`,
        data || ""
      );

    }


    return data;

  } catch (error) {

    console.error(
      `❌ Error enviando ${type} a ${groupId}:`,
      error
    );

    return null;

  }

}


// ======================================================
// TIP / MVP
// ======================================================

function bindTipControls(
  panel,
  groupId
) {

  const sendButton =
    getAction(
      panel,
      "send-tip"
    );


  const clearButton =
    getAction(
      panel,
      "clear-mvp"
    );


  const nameInput =
    getRole(
      panel,
      "tip-name"
    );


  const amountInput =
    getRole(
      panel,
      "tip-amount"
    );


  const volumeInput =
    getRole(
      panel,
      "tip-volume"
    );


  // -----------------------------
  // SEND TIP
  // -----------------------------

  sendButton?.addEventListener(
    "click",
    () => {

      sendTip(
        panel,
        groupId
      );

    }
  );


  // Enter desde monto
  amountInput?.addEventListener(
    "keydown",
    (event) => {

      if (
        event.key === "Enter"
      ) {

        event.preventDefault();

        sendTip(
          panel,
          groupId
        );

      }

    }
  );


  // Enter desde nombre
  nameInput?.addEventListener(
    "keydown",
    (event) => {

      if (
        event.key === "Enter"
      ) {

        event.preventDefault();

        amountInput?.focus();

      }

    }
  );


  // -----------------------------
  // CLEAR MVP
  // -----------------------------

  clearButton?.addEventListener(
    "click",
    () => {

      clearMVP(
        panel,
        groupId
      );

    }
  );


  // -----------------------------
  // VOLUME
  // -----------------------------

  volumeInput?.addEventListener(
    "input",
    () => {

      updateVolumeLabel(
        panel,
        volumeInput.value
      );

    }
  );


  volumeInput?.addEventListener(
    "change",
    () => {

      sendTipVolume(
        groupId,
        volumeInput.value
      );

    }
  );

}


// ======================================================
// SEND TIP
// ======================================================

function sendTip(
  panel,
  groupId
) {

  const nameInput =
    getRole(
      panel,
      "tip-name"
    );


  const amountInput =
    getRole(
      panel,
      "tip-amount"
    );


  if (
    !nameInput ||
    !amountInput
  ) {

    console.error(
      "Inputs de tip no encontrados."
    );

    return;
  }


  const name =
    nameInput.value.trim();


  const amount =
    Number(
      amountInput.value
    );


  // Permite:
  //
  //  20
  //  50
  // -20
  // -50
  //
  // Solo 0 es inválido.

  if (
    !name ||
    !Number.isFinite(amount) ||
    amount === 0
  ) {

    alert(
      "Debes escribir un nombre y un monto distinto de 0."
    );

    return;
  }


  addRecentName(
    panel,
    groupId,
    name
  );


  sendToServer(
    groupId,
    "tip",
    {
      name,
      amount,
    }
  );


  // Dejamos el nombre
  // para poder mandar varios tips
  // al mismo spender rápidamente.

  amountInput.value = "";

  amountInput.focus();

}


// ======================================================
// CLEAR MVP
// ======================================================

function clearMVP(
  panel,
  groupId
) {

  sendToServer(
    groupId,
    "clear"
  );


  const state =
    getPanelState(
      groupId
    );


  state.recentNames = [];


  renderRecentNames(
    panel,
    groupId
  );

}


// ======================================================
// RECENT NAMES
// ======================================================

function addRecentName(
  panel,
  groupId,
  name
) {

  const state =
    getPanelState(
      groupId
    );


  const cleanName =
    String(
      name || ""
    ).trim();


  if (!cleanName) {
    return;
  }


  const lower =
    cleanName.toLowerCase();


  state.recentNames = [

    cleanName,

    ...state.recentNames.filter(
      (item) =>
        item.toLowerCase() !==
        lower
    ),

  ];


  if (
    state.recentNames.length >
    MAX_RECENT_NAMES
  ) {

    state.recentNames.length =
      MAX_RECENT_NAMES;

  }


  renderRecentNames(
    panel,
    groupId
  );

}


function renderRecentNames(
  panel,
  groupId
) {

  const list =
    getRole(
      panel,
      "names-list"
    );


  if (!list) {
    return;
  }


  const state =
    getPanelState(
      groupId
    );


  list.innerHTML = "";


  if (
    !state.recentNames.length
  ) {

    const empty =
      document.createElement(
        "div"
      );


    empty.className =
      "empty-state";


    empty.textContent =
      "Aún no hay nombres.";


    list.appendChild(
      empty
    );


    return;

  }


  state.recentNames.forEach(
    (name) => {

      const pill =
        document.createElement(
          "button"
        );


      pill.type =
        "button";


      pill.className =
        "name-pill";


      pill.textContent =
        name;


      pill.addEventListener(
        "click",
        () => {

          const input =
            getRole(
              panel,
              "tip-name"
            );


          const amountInput =
            getRole(
              panel,
              "tip-amount"
            );


          if (input) {

            input.value =
              name;

          }


          amountInput?.focus();

        }
      );


      list.appendChild(
        pill
      );

    }
  );

}


// ======================================================
// TIP VOLUME
// ======================================================

function updateVolumeLabel(
  panel,
  value
) {

  const label =
    getRole(
      panel,
      "volume-label"
    );


  if (label) {

    label.textContent =
      `${value}%`;

  }

}


function sendTipVolume(
  groupId,
  value
) {

  const volume =
    Math.max(
      0,
      Math.min(
        1,
        Number(value) / 100
      )
    );


  sendToServer(
    groupId,
    "tipVolume",
    {
      volume,
    }
  );

}


// ======================================================
// GOAL BAR
// ======================================================

function bindGoalControls(
  panel,
  groupId
) {

  const saveButton =
    getAction(
      panel,
      "save-goals"
    );


  const clearButton =
    getAction(
      panel,
      "clear-goals"
    );


  saveButton?.addEventListener(
    "click",
    () => {

      setGoals(
        panel,
        groupId
      );

    }
  );


  clearButton?.addEventListener(
    "click",
    () => {

      clearGoals(
        groupId
      );

    }
  );

}


// ======================================================
// SET GOALS
// ======================================================

function setGoals(
  panel,
  groupId
) {

  const goal1Amount =
    getRole(
      panel,
      "goal1-amount"
    );


  const goal1Title =
    getRole(
      panel,
      "goal1-title"
    );


  const goal2Amount =
    getRole(
      panel,
      "goal2-amount"
    );


  const goal2Title =
    getRole(
      panel,
      "goal2-title"
    );


  if (
    !goal1Amount ||
    !goal1Title ||
    !goal2Amount ||
    !goal2Title
  ) {

    alert(
      "Error interno: faltan campos de Goals."
    );

    return;
  }


  const amount1 =
    Number(
      goal1Amount.value || 0
    );


  const title1 =
    goal1Title.value.trim();


  const amount2 =
    Number(
      goal2Amount.value || 0
    );


  const title2 =
    goal2Title.value.trim();


  const stages = [];


  if (amount1 > 0) {

    stages.push({

      target:
        amount1,

      label:
        title1 ||
        "Goal 1",

    });

  }


  if (amount2 > 0) {

    stages.push({

      target:
        amount2,

      label:
        title2 ||
        "Goal 2",

    });

  }


  if (!stages.length) {

    alert(
      "Debes configurar al menos una Goal con un monto mayor a 0."
    );

    return;
  }


  // Siempre de menor a mayor.

  stages.sort(
    (a, b) =>
      a.target -
      b.target
  );


  sendToServer(
    groupId,
    "setGoalConfig",
    {

      stages,

      current: 0,

    }
  );

}


// ======================================================
// CLEAR GOALS
// ======================================================

function clearGoals(
  groupId
) {

  sendToServer(
    groupId,
    "clearGoal"
  );

}


// ======================================================
// TIMER
// ======================================================

function bindTimerControls(
  panel,
  groupId
) {

  const timerButtons =
    panel.querySelectorAll(
      '[data-action="timer"]'
    );


  timerButtons.forEach(
    (button) => {

      button.addEventListener(
        "click",
        () => {

          const seconds =
            Number(
              button.dataset.seconds
            );


          if (
            !Number.isFinite(seconds) ||
            seconds <= 0
          ) {

            return;

          }


          sendToServer(
            groupId,
            "actionTimer",
            {
              seconds,
            }
          );

        }
      );

    }
  );


  const stopButton =
    getAction(
      panel,
      "timer-stop"
    );


  stopButton?.addEventListener(
    "click",
    () => {

      sendToServer(
        groupId,
        "actionTimerStop"
      );

    }
  );

}


// ======================================================
// RE-SYNC
// ======================================================

function bindResyncControl(
  panel,
  groupId
) {

  const button =
    getAction(
      panel,
      "resync"
    );


  button?.addEventListener(
    "click",
    () => {

      resyncWidgets(
        panel,
        groupId
      );

    }
  );

}


async function resyncWidgets(
  panel,
  groupId
) {

  const status =
    getRole(
      panel,
      "resync-status"
    );


  try {

    const response =
      await fetch(
        RESYNC_URL,
        {

          method: "POST",

          headers: {

            "Content-Type":
              "application/json",

          },

          body:
            JSON.stringify({

              modelId:
                MODEL_ID,

              groupId,

            }),

        }
      );


    const data =
      await response.json();


    if (!response.ok) {

      throw new Error(
        data?.error ||
        "Error en Re-sync"
      );

    }


    const events =
      data?.eventsReplayed ??
      0;


    const clients =
      data?.clients ??
      0;


    if (status) {

      status.textContent =
        `Re-sync completado: ${events} evento(s) enviados a ${clients} widget(s).`;


      status.classList.add(
        "show"
      );


      setTimeout(
        () => {

          status.classList.remove(
            "show"
          );

        },
        4000
      );

    }


    console.log(
      `🔄 Re-sync ${groupId}:`,
      data
    );

  } catch (error) {

    console.error(
      `❌ Re-sync ${groupId}:`,
      error
    );


    if (status) {

      status.textContent =
        "Error al hacer Re-sync. Revisa la consola.";


      status.classList.add(
        "show"
      );


      setTimeout(
        () => {

          status.classList.remove(
            "show"
          );

        },
        4000
      );

    }

  }

}


// ======================================================
// RAFFLE
// ======================================================

function bindRaffleControls(
  panel,
  groupId
) {

  const addButton =
    getAction(
      panel,
      "raffle-add"
    );


  const runButton =
    getAction(
      panel,
      "raffle-run"
    );


  const clearButton =
    getAction(
      panel,
      "raffle-clear"
    );


  const ticketsInput =
    getRole(
      panel,
      "raffle-tickets"
    );


  addButton?.addEventListener(
    "click",
    () => {

      addRaffleEntry(
        panel,
        groupId
      );

    }
  );


  runButton?.addEventListener(
    "click",
    () => {

      runRaffle(
        panel,
        groupId
      );

    }
  );


  clearButton?.addEventListener(
    "click",
    () => {

      clearRaffle(
        panel,
        groupId
      );

    }
  );


  ticketsInput?.addEventListener(
    "keydown",
    (event) => {

      if (
        event.key === "Enter"
      ) {

        event.preventDefault();


        addRaffleEntry(
          panel,
          groupId
        );

      }

    }
  );

}


// ======================================================
// AGREGAR PARTICIPANTE RAFFLE
// ======================================================

function addRaffleEntry(
  panel,
  groupId
) {

  const nameInput =
    getRole(
      panel,
      "raffle-name"
    );


  const ticketsInput =
    getRole(
      panel,
      "raffle-tickets"
    );


  if (
    !nameInput ||
    !ticketsInput
  ) {

    alert(
      "Error interno: faltan campos del Raffle."
    );

    return;
  }


  const name =
    nameInput.value.trim();


  const tickets =
    Number(
      ticketsInput.value
    );


  if (
    !name ||
    !Number.isFinite(tickets) ||
    tickets <= 0
  ) {

    alert(
      "Debes escribir un nombre y una cantidad válida de tickets."
    );

    return;
  }


  const state =
    getPanelState(
      groupId
    );


  const existing =
    state.raffleEntries.find(
      (entry) =>
        entry.name.toLowerCase() ===
        name.toLowerCase()
    );


  if (existing) {

    existing.tickets +=
      tickets;

  } else {

    state.raffleEntries.push({

      name,

      tickets,

    });

  }


  // Al modificar participantes
  // quitamos ganador anterior.

  state.raffleWinner = "";


  nameInput.value = "";

  ticketsInput.value = "";

  nameInput.focus();


  renderRaffle(
    panel,
    groupId
  );

}


// ======================================================
// ELIMINAR PARTICIPANTE
// ======================================================

function removeRaffleEntry(
  panel,
  groupId,
  index
) {

  const state =
    getPanelState(
      groupId
    );


  state.raffleEntries.splice(
    index,
    1
  );


  state.raffleWinner = "";


  renderRaffle(
    panel,
    groupId
  );

}


// ======================================================
// GENERAR TICKETS
// ======================================================

function buildRaffleTickets(
  entries
) {

  const tickets = [];


  entries.forEach(
    (entry) => {

      const amount =
        Math.max(
          0,
          Math.floor(
            Number(
              entry.tickets
            ) || 0
          )
        );


      for (
        let i = 0;
        i < amount;
        i += 1
      ) {

        tickets.push(
          entry.name
        );

      }

    }
  );


  return tickets;

}


// ======================================================
// ELEGIR GANADOR
// ======================================================

function pickRaffleWinner(
  entries
) {

  const tickets =
    buildRaffleTickets(
      entries
    );


  if (!tickets.length) {

    return null;

  }


  const index =
    Math.floor(
      Math.random() *
      tickets.length
    );


  return tickets[
    index
  ];

}


// ======================================================
// EJECUTAR RAFFLE
// ======================================================

function runRaffle(
  panel,
  groupId
) {

  const state =
    getPanelState(
      groupId
    );


  if (
    !state.raffleEntries.length
  ) {

    alert(
      "Agrega al menos un participante."
    );

    return;
  }


  const winner =
    pickRaffleWinner(
      state.raffleEntries
    );


  if (!winner) {

    alert(
      "No se pudo elegir ganador."
    );

    return;
  }


  state.raffleWinner =
    winner;


  renderRaffle(
    panel,
    groupId
  );


  sendToServer(
    groupId,
    "raffleStart",
    {

      // Copia para evitar modificaciones
      // accidentales posteriores.

      entries:
        state.raffleEntries.map(
          (entry) => ({
            ...entry,
          })
        ),

      winner,

      durationMs:
        5000,

    }
  );

}


// ======================================================
// LIMPIAR RAFFLE
// ======================================================

function clearRaffle(
  panel,
  groupId
) {

  const state =
    getPanelState(
      groupId
    );


  state.raffleEntries = [];

  state.raffleWinner = "";


  renderRaffle(
    panel,
    groupId
  );


  sendToServer(
    groupId,
    "raffleClear"
  );

}


// ======================================================
// RENDER RAFFLE
// ======================================================

function renderRaffle(
  panel,
  groupId
) {

  const title =
    getRole(
      panel,
      "raffle-title"
    );


  const list =
    getRole(
      panel,
      "raffle-list"
    );


  const winnerElement =
    getRole(
      panel,
      "raffle-winner"
    );


  if (!list) {
    return;
  }


  const state =
    getPanelState(
      groupId
    );


  list.innerHTML = "";


  // -----------------------------
  // SIN PARTICIPANTES
  // -----------------------------

  if (
    !state.raffleEntries.length
  ) {

    if (title) {

      title.textContent =
        "No hay participantes todavía.";

    }


    if (winnerElement) {

      winnerElement.textContent =
        "";

      winnerElement.style.display =
        "none";

    }


    return;

  }


  // -----------------------------
  // TOTAL TICKETS
  // -----------------------------

  const totalTickets =
    state.raffleEntries.reduce(
      (sum, entry) => {

        return (
          sum +
          Number(
            entry.tickets || 0
          )
        );

      },
      0
    );


  if (title) {

    title.textContent =
      `Participantes: ${state.raffleEntries.length} · Tickets: ${totalTickets}`;

  }


  // -----------------------------
  // LIST
  // -----------------------------

  state.raffleEntries.forEach(
    (entry, index) => {

      const row =
        document.createElement(
          "div"
        );


      row.className =
        "raffle-entry";


      const info =
        document.createElement(
          "div"
        );


      const name =
        document.createElement(
          "div"
        );


      name.className =
        "raffle-entry-name";


      name.textContent =
        entry.name;


      const metadata =
        document.createElement(
          "div"
        );


      metadata.className =
        "raffle-entry-meta";


      metadata.textContent =
        `${entry.tickets} ticket${
          Number(entry.tickets) === 1
            ? ""
            : "s"
        }`;


      info.appendChild(
        name
      );


      info.appendChild(
        metadata
      );


      const removeButton =
        document.createElement(
          "button"
        );


      removeButton.type =
        "button";


      removeButton.textContent =
        "Eliminar";


      removeButton.addEventListener(
        "click",
        () => {

          removeRaffleEntry(
            panel,
            groupId,
            index
          );

        }
      );


      row.appendChild(
        info
      );


      row.appendChild(
        removeButton
      );


      list.appendChild(
        row
      );

    }
  );


  // -----------------------------
  // GANADOR
  // -----------------------------

  if (winnerElement) {

    if (
      state.raffleWinner
    ) {

      winnerElement.textContent =
        `🏆 Ganador: ${state.raffleWinner}`;

      winnerElement.style.display =
        "block";

    } else {

      winnerElement.textContent =
        "";

      winnerElement.style.display =
        "none";

    }

  }

}


// ======================================================
// EXTRAS
// ======================================================

function bindExtraControls(
  panel,
  groupId
) {

  const rouletteButton =
    getAction(
      panel,
      "roulette"
    );


  rouletteButton?.addEventListener(
    "click",
    () => {

      sendToServer(
        groupId,
        "roulette"
      );

    }
  );

}