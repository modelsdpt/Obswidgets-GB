/* =========================================================
   LIVESTREAM GB — CALENDAR
   script.js
   ========================================================= */


/* =========================================================
   1. API
   ========================================================= */

const API_URL = "/api/model-schedule";
const REPORTS_URL = "/api/reports";


/* =========================================================
   2. CONFIGURACIÓN DE ARCHIVOS
   ========================================================= */

const MAX_EXTRA_FLYERS = 3;
const MAX_FILE_SIZE_MB = 15;
const MAX_FILE_SIZE_BYTES =
  MAX_FILE_SIZE_MB * 1024 * 1024;

const ALLOWED_FILE_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp"
];


/* =========================================================
   3. MODELOS ACTIVAS
   ========================================================= */

const ACTIVE_MODELS = [
  "Misty",
  "Sarah",
  "Megan",
  "Molly",
  "Cassie",
  "Zoe",
  "Sophia",
  "Nikki",
  "Lisa",
  "Nana",
  "Paula",
  "Jade",
  "Minnie",
  "Alaska",
  "Maxine"
];


/*
  Compatibilidad con nombres históricos.

  Los registros antiguos pueden tener:

  Sara  -> Sarah
  Sophi -> Sophia

  Esto NO modifica los JSON.
  Solo los muestra correctamente en el calendario.
*/

const MODEL_ALIASES = {
  Sara: "Sarah",
  Sophi: "Sophia"
};


/* =========================================================
   4. HORARIOS DE LAS MODELOS
   ========================================================= */

const MODEL_SLOTS = {

  // ─────────────────────────────────────────
  // COLOMBIA
  // Venezuela está 1 hora adelante de Colombia
  // ─────────────────────────────────────────

  Misty: [
    {
      start: "09:00",
      label: "10:00 AM VENEZUELA / 9:00 AM COLOMBIA"
    },
    {
      start: "10:00",
      label: "11:00 AM VENEZUELA / 10:00 AM COLOMBIA"
    },
    {
      start: "11:00",
      label: "12:00 PM VENEZUELA / 11:00 AM COLOMBIA"
    },
    {
      start: "12:00",
      label: "1:00 PM VENEZUELA / 12:00 PM COLOMBIA"
    },

    {
      start: "19:00",
      label: "8:00 PM VENEZUELA / 7:00 PM COLOMBIA"
    },
    {
      start: "20:00",
      label: "9:00 PM VENEZUELA / 8:00 PM COLOMBIA"
    },
    {
      start: "21:00",
      label: "10:00 PM VENEZUELA / 9:00 PM COLOMBIA"
    },
    {
      start: "22:00",
      label: "11:00 PM VENEZUELA / 10:00 PM COLOMBIA"
    }
  ],


  Megan: [
    {
      start: "09:00",
      label: "10:00 AM VENEZUELA / 9:00 AM COLOMBIA"
    },
    {
      start: "10:00",
      label: "11:00 AM VENEZUELA / 10:00 AM COLOMBIA"
    },
    {
      start: "11:00",
      label: "12:00 PM VENEZUELA / 11:00 AM COLOMBIA"
    },
    {
      start: "12:00",
      label: "1:00 PM VENEZUELA / 12:00 PM COLOMBIA"
    },

    {
      start: "19:00",
      label: "8:00 PM VENEZUELA / 7:00 PM COLOMBIA"
    },
    {
      start: "20:00",
      label: "9:00 PM VENEZUELA / 8:00 PM COLOMBIA"
    },
    {
      start: "21:00",
      label: "10:00 PM VENEZUELA / 9:00 PM COLOMBIA"
    },
    {
      start: "22:00",
      label: "11:00 PM VENEZUELA / 10:00 PM COLOMBIA"
    }
  ],


  Cassie: [
    {
      start: "09:00",
      label: "10:00 AM VENEZUELA / 9:00 AM COLOMBIA"
    },
    {
      start: "10:00",
      label: "11:00 AM VENEZUELA / 10:00 AM COLOMBIA"
    },
    {
      start: "11:00",
      label: "12:00 PM VENEZUELA / 11:00 AM COLOMBIA"
    },
    {
      start: "12:00",
      label: "1:00 PM VENEZUELA / 12:00 PM COLOMBIA"
    },

    {
      start: "19:00",
      label: "8:00 PM VENEZUELA / 7:00 PM COLOMBIA"
    },
    {
      start: "20:00",
      label: "9:00 PM VENEZUELA / 8:00 PM COLOMBIA"
    },
    {
      start: "21:00",
      label: "10:00 PM VENEZUELA / 9:00 PM COLOMBIA"
    },
    {
      start: "22:00",
      label: "11:00 PM VENEZUELA / 10:00 PM COLOMBIA"
    }
  ],


  Zoe: [
    {
      start: "09:00",
      label: "10:00 AM VENEZUELA / 9:00 AM COLOMBIA"
    },
    {
      start: "10:00",
      label: "11:00 AM VENEZUELA / 10:00 AM COLOMBIA"
    },
    {
      start: "11:00",
      label: "12:00 PM VENEZUELA / 11:00 AM COLOMBIA"
    },
    {
      start: "12:00",
      label: "1:00 PM VENEZUELA / 12:00 PM COLOMBIA"
    },

    {
      start: "19:00",
      label: "8:00 PM VENEZUELA / 7:00 PM COLOMBIA"
    },
    {
      start: "20:00",
      label: "9:00 PM VENEZUELA / 8:00 PM COLOMBIA"
    },
    {
      start: "21:00",
      label: "10:00 PM VENEZUELA / 9:00 PM COLOMBIA"
    },
    {
      start: "22:00",
      label: "11:00 PM VENEZUELA / 10:00 PM COLOMBIA"
    }
  ],


  Nikki: [
    {
      start: "09:00",
      label: "10:00 AM VENEZUELA / 9:00 AM COLOMBIA"
    },
    {
      start: "10:00",
      label: "11:00 AM VENEZUELA / 10:00 AM COLOMBIA"
    },
    {
      start: "11:00",
      label: "12:00 PM VENEZUELA / 11:00 AM COLOMBIA"
    },
    {
      start: "12:00",
      label: "1:00 PM VENEZUELA / 12:00 PM COLOMBIA"
    },

    {
      start: "19:00",
      label: "8:00 PM VENEZUELA / 7:00 PM COLOMBIA"
    },
    {
      start: "20:00",
      label: "9:00 PM VENEZUELA / 8:00 PM COLOMBIA"
    },
    {
      start: "21:00",
      label: "10:00 PM VENEZUELA / 9:00 PM COLOMBIA"
    },
    {
      start: "22:00",
      label: "11:00 PM VENEZUELA / 10:00 PM COLOMBIA"
    }
  ],


  Lisa: [
    {
      start: "09:00",
      label: "10:00 AM VENEZUELA / 9:00 AM COLOMBIA"
    },
    {
      start: "10:00",
      label: "11:00 AM VENEZUELA / 10:00 AM COLOMBIA"
    },
    {
      start: "11:00",
      label: "12:00 PM VENEZUELA / 11:00 AM COLOMBIA"
    },
    {
      start: "12:00",
      label: "1:00 PM VENEZUELA / 12:00 PM COLOMBIA"
    },

    {
      start: "19:00",
      label: "8:00 PM VENEZUELA / 7:00 PM COLOMBIA"
    },
    {
      start: "20:00",
      label: "9:00 PM VENEZUELA / 8:00 PM COLOMBIA"
    },
    {
      start: "21:00",
      label: "10:00 PM VENEZUELA / 9:00 PM COLOMBIA"
    },
    {
      start: "22:00",
      label: "11:00 PM VENEZUELA / 10:00 PM COLOMBIA"
    }
  ],


  Paula: [
    {
      start: "09:00",
      label: "10:00 AM VENEZUELA / 9:00 AM COLOMBIA"
    },
    {
      start: "10:00",
      label: "11:00 AM VENEZUELA / 10:00 AM COLOMBIA"
    },
    {
      start: "11:00",
      label: "12:00 PM VENEZUELA / 11:00 AM COLOMBIA"
    },
    {
      start: "12:00",
      label: "1:00 PM VENEZUELA / 12:00 PM COLOMBIA"
    },

    {
      start: "19:00",
      label: "8:00 PM VENEZUELA / 7:00 PM COLOMBIA"
    },
    {
      start: "20:00",
      label: "9:00 PM VENEZUELA / 8:00 PM COLOMBIA"
    },
    {
      start: "21:00",
      label: "10:00 PM VENEZUELA / 9:00 PM COLOMBIA"
    },
    {
      start: "22:00",
      label: "11:00 PM VENEZUELA / 10:00 PM COLOMBIA"
    }
  ],

   Camille: [
    {
      start: "09:00",
      label: "10:00 AM VENEZUELA / 9:00 AM COLOMBIA"
    },
    {
      start: "10:00",
      label: "11:00 AM VENEZUELA / 10:00 AM COLOMBIA"
    },
    {
      start: "11:00",
      label: "12:00 PM VENEZUELA / 11:00 AM COLOMBIA"
    },
    {
      start: "12:00",
      label: "1:00 PM VENEZUELA / 12:00 PM COLOMBIA"
    },

    {
      start: "19:00",
      label: "8:00 PM VENEZUELA / 7:00 PM COLOMBIA"
    },
    {
      start: "20:00",
      label: "9:00 PM VENEZUELA / 8:00 PM COLOMBIA"
    },
    {
      start: "21:00",
      label: "10:00 PM VENEZUELA / 9:00 PM COLOMBIA"
    },
    {
      start: "22:00",
      label: "11:00 PM VENEZUELA / 10:00 PM COLOMBIA"
    }
  ],


   Jade2: [
    {
      start: "09:00",
      label: "10:00 AM VENEZUELA / 9:00 AM COLOMBIA"
    },
    {
      start: "10:00",
      label: "11:00 AM VENEZUELA / 10:00 AM COLOMBIA"
    },
    {
      start: "11:00",
      label: "12:00 PM VENEZUELA / 11:00 AM COLOMBIA"
    },
    {
      start: "12:00",
      label: "1:00 PM VENEZUELA / 12:00 PM COLOMBIA"
    },

    {
      start: "19:00",
      label: "8:00 PM VENEZUELA / 7:00 PM COLOMBIA"
    },
    {
      start: "20:00",
      label: "9:00 PM VENEZUELA / 8:00 PM COLOMBIA"
    },
    {
      start: "21:00",
      label: "10:00 PM VENEZUELA / 9:00 PM COLOMBIA"
    },
    {
      start: "22:00",
      label: "11:00 PM VENEZUELA / 10:00 PM COLOMBIA"
    }
  ],


  Maxine: [
    {
      start: "09:00",
      label: "10:00 AM VENEZUELA / 9:00 AM COLOMBIA"
    },
    {
      start: "10:00",
      label: "11:00 AM VENEZUELA / 10:00 AM COLOMBIA"
    },
    {
      start: "11:00",
      label: "12:00 PM VENEZUELA / 11:00 AM COLOMBIA"
    },
    {
      start: "12:00",
      label: "1:00 PM VENEZUELA / 12:00 PM COLOMBIA"
    },

    {
      start: "19:00",
      label: "8:00 PM VENEZUELA / 7:00 PM COLOMBIA"
    },
    {
      start: "20:00",
      label: "9:00 PM VENEZUELA / 8:00 PM COLOMBIA"
    },
    {
      start: "21:00",
      label: "10:00 PM VENEZUELA / 9:00 PM COLOMBIA"
    },
    {
      start: "22:00",
      label: "11:00 PM VENEZUELA / 10:00 PM COLOMBIA"
    }
  ],


  Molly: [
    {
      start: "09:00",
      label: "10:00 AM VENEZUELA / 9:00 AM COLOMBIA"
    },
    {
      start: "10:00",
      label: "11:00 AM VENEZUELA / 10:00 AM COLOMBIA"
    },
    {
      start: "11:00",
      label: "12:00 PM VENEZUELA / 11:00 AM COLOMBIA"
    },
    {
      start: "12:00",
      label: "1:00 PM VENEZUELA / 12:00 PM COLOMBIA"
    },
    {
      start: "13:00",
      label: "2:00 PM VENEZUELA / 1:00 PM COLOMBIA"
    },
    {
      start: "14:00",
      label: "3:00 PM VENEZUELA / 2:00 PM COLOMBIA"
    },

    {
      start: "19:00",
      label: "8:00 PM VENEZUELA / 7:00 PM COLOMBIA"
    },
    {
      start: "20:00",
      label: "9:00 PM VENEZUELA / 8:00 PM COLOMBIA"
    },
    {
      start: "21:00",
      label: "10:00 PM VENEZUELA / 9:00 PM COLOMBIA"
    },
    {
      start: "22:00",
      label: "11:00 PM VENEZUELA / 10:00 PM COLOMBIA"
    }
  ],


  // ─────────────────────────────────────────
  // ARGENTINA
  // Argentina está 1 hora adelante de Venezuela
  // ─────────────────────────────────────────

  Nana: [
    {
      start: "10:00",
      label: "9:00 AM VENEZUELA / 10:00 AM ARGENTINA"
    },
    {
      start: "11:00",
      label: "10:00 AM VENEZUELA / 11:00 AM ARGENTINA"
    },
    {
      start: "12:00",
      label: "11:00 AM VENEZUELA / 12:00 PM ARGENTINA"
    },
    {
      start: "13:00",
      label: "12:00 PM VENEZUELA / 1:00 PM ARGENTINA"
    },
    {
      start: "14:00",
      label: "1:00 PM VENEZUELA / 2:00 PM ARGENTINA"
    },

    {
      start: "20:00",
      label: "7:00 PM VENEZUELA / 8:00 PM ARGENTINA"
    },
    {
      start: "21:00",
      label: "8:00 PM VENEZUELA / 9:00 PM ARGENTINA"
    },
    {
      start: "22:00",
      label: "9:00 PM VENEZUELA / 10:00 PM ARGENTINA"
    },
    {
      start: "23:00",
      label: "10:00 PM VENEZUELA / 11:00 PM ARGENTINA"
    }
  ],


  // ─────────────────────────────────────────
  // CHILE
  // Actualmente Chile está 1 hora adelante de Venezuela
  // ─────────────────────────────────────────

  Minnie: [
    {
      start: "10:00",
      label: "9:00 AM VENEZUELA / 10:00 AM CHILE"
    },
    {
      start: "11:00",
      label: "10:00 AM VENEZUELA / 11:00 AM CHILE"
    },
    {
      start: "12:00",
      label: "11:00 AM VENEZUELA / 12:00 PM CHILE"
    },
    {
      start: "13:00",
      label: "12:00 PM VENEZUELA / 1:00 PM CHILE"
    },
    {
      start: "14:00",
      label: "1:00 PM VENEZUELA / 2:00 PM CHILE"
    },

    {
      start: "20:00",
      label: "7:00 PM VENEZUELA / 8:00 PM CHILE"
    },
    {
      start: "21:00",
      label: "8:00 PM VENEZUELA / 9:00 PM CHILE"
    },
    {
      start: "22:00",
      label: "9:00 PM VENEZUELA / 10:00 PM CHILE"
    },
    {
      start: "23:00",
      label: "10:00 PM VENEZUELA / 11:00 PM CHILE"
    }
  ],


  // ─────────────────────────────────────────
  // KENYA
  // Kenya está 7 horas adelante de Venezuela
  // ─────────────────────────────────────────

  Jade: [
    {
      start: "17:00",
      label: "10:00 AM VENEZUELA / 5:00 PM KENYA"
    },
    {
      start: "18:00",
      label: "11:00 AM VENEZUELA / 6:00 PM KENYA"
    },
    {
      start: "19:00",
      label: "12:00 PM VENEZUELA / 7:00 PM KENYA"
    },
    {
      start: "20:00",
      label: "1:00 PM VENEZUELA / 8:00 PM KENYA"
    },
    {
      start: "21:00",
      label: "2:00 PM VENEZUELA / 9:00 PM KENYA"
    },
    {
      start: "22:00",
      label: "3:00 PM VENEZUELA / 10:00 PM KENYA"
    },

    {
      start: "04:00",
      label: "9:00 PM VENEZUELA / 4:00 AM KENYA"
    },
    {
      start: "05:00",
      label: "10:00 PM VENEZUELA / 5:00 AM KENYA"
    },
    {
      start: "06:00",
      label: "11:00 PM VENEZUELA / 6:00 AM KENYA"
    }
  ],


  // ─────────────────────────────────────────
  // SLOVAKIA
  // Después del cambio de octubre:
  // Slovakia está 5 horas adelante de Venezuela
  // ─────────────────────────────────────────

  Sarah: [
    {
      start: "15:00",
      label: "10:00 AM VENEZUELA / 3:00 PM SLOVAKIA"
    },
    {
      start: "16:00",
      label: "11:00 AM VENEZUELA / 4:00 PM SLOVAKIA"
    },
    {
      start: "17:00",
      label: "12:00 PM VENEZUELA / 5:00 PM SLOVAKIA"
    },
    {
      start: "18:00",
      label: "1:00 PM VENEZUELA / 6:00 PM SLOVAKIA"
    },
    {
      start: "19:00",
      label: "2:00 PM VENEZUELA / 7:00 PM SLOVAKIA"
    },
    {
      start: "20:00",
      label: "3:00 PM VENEZUELA / 8:00 PM SLOVAKIA"
    },
    {
      start: "21:00",
      label: "4:00 PM VENEZUELA / 9:00 PM SLOVAKIA"
    },
    {
      start: "22:00",
      label: "5:00 PM VENEZUELA / 10:00 PM SLOVAKIA"
    },

    {
      start: "03:00",
      label: "10:00 PM VENEZUELA / 3:00 AM SLOVAKIA"
    },
    {
      start: "04:00",
      label: "11:00 PM VENEZUELA / 4:00 AM SLOVAKIA"
    }
  ],


  Sophia: [
    {
      start: "15:00",
      label: "10:00 AM VENEZUELA / 3:00 PM SLOVAKIA"
    },
    {
      start: "16:00",
      label: "11:00 AM VENEZUELA / 4:00 PM SLOVAKIA"
    },
    {
      start: "17:00",
      label: "12:00 PM VENEZUELA / 5:00 PM SLOVAKIA"
    },
    {
      start: "18:00",
      label: "1:00 PM VENEZUELA / 6:00 PM SLOVAKIA"
    },
    {
      start: "19:00",
      label: "2:00 PM VENEZUELA / 7:00 PM SLOVAKIA"
    },
    {
      start: "20:00",
      label: "3:00 PM VENEZUELA / 8:00 PM SLOVAKIA"
    },
    {
      start: "21:00",
      label: "4:00 PM VENEZUELA / 9:00 PM SLOVAKIA"
    },
    {
      start: "22:00",
      label: "5:00 PM VENEZUELA / 10:00 PM SLOVAKIA"
    },

    {
      start: "03:00",
      label: "10:00 PM VENEZUELA / 3:00 AM SLOVAKIA"
    },
    {
      start: "04:00",
      label: "11:00 PM VENEZUELA / 4:00 AM SLOVAKIA"
    }
  ],


  // ─────────────────────────────────────────
  // SPAIN
  // Después del cambio de octubre:
  // España está 5 horas adelante de Venezuela
  // ─────────────────────────────────────────

  Alaska: [
    {
      start: "15:00",
      label: "10:00 AM VENEZUELA / 3:00 PM SPAIN"
    },
    {
      start: "16:00",
      label: "11:00 AM VENEZUELA / 4:00 PM SPAIN"
    },
    {
      start: "17:00",
      label: "12:00 PM VENEZUELA / 5:00 PM SPAIN"
    },
    {
      start: "18:00",
      label: "1:00 PM VENEZUELA / 6:00 PM SPAIN"
    },
    {
      start: "19:00",
      label: "2:00 PM VENEZUELA / 7:00 PM SPAIN"
    },
    {
      start: "20:00",
      label: "3:00 PM VENEZUELA / 8:00 PM SPAIN"
    },
    {
      start: "21:00",
      label: "4:00 PM VENEZUELA / 9:00 PM SPAIN"
    },
    {
      start: "22:00",
      label: "5:00 PM VENEZUELA / 10:00 PM SPAIN"
    },

    {
      start: "03:00",
      label: "10:00 PM VENEZUELA / 3:00 AM SPAIN"
    },
    {
      start: "04:00",
      label: "11:00 PM VENEZUELA / 4:00 AM SPAIN"
    }
  ]

};


/* =========================================================
   5. OFFSETS
   IMPORTANTE:
   SE MANTIENEN EXACTAMENTE COMO LOS DEFINISTE
   ========================================================= */

const MODEL_OFFSET_TO_EST = {

  // Colombia
  Misty: 0,
  Megan: 0,
  Molly: 0,
  Cassie: 0,
  Zoe: 0,
  Nikki: 0,
  Lisa: 0,
  Camille: 0,
  Jade2: 0,
  Paula: 0,
  Maxine: 0,

  // Argentina
  Nana: 1,

  // Chile — actualmente UTC-3
  Minnie: 1,

  // Kenya
  Jade: 7,

  // Slovakia — CET desde el 25 de octubre
  Sarah: 5,
  Sophia: 5,

  // Spain — CET desde el 25 de octubre
  Alaska: 5

};


/* =========================================================
   6. REFERENCIAS DEL DOM
   ========================================================= */

const statusEl =
  document.getElementById("status");

const saveBtn =
  document.getElementById("saveBtn");

const modelSelect =
  document.getElementById("model");

const slotSelect =
  document.getElementById("slot");

const dateInput =
  document.getElementById("date");

const themeInput =
  document.getElementById("theme");


const flyerInput =
  document.getElementById("flyer");

const flyer1Input =
  document.getElementById("flyer1");

const flyer2Input =
  document.getElementById("flyer2");

const flyer3Input =
  document.getElementById("flyer3");


const flyerHelp =
  document.getElementById("flyerHelp");

const flyer1Help =
  document.getElementById("flyer1Help");

const flyer2Help =
  document.getElementById("flyer2Help");

const flyer3Help =
  document.getElementById("flyer3Help");


const calendarGrid =
  document.getElementById("calendarGrid");

const monthTitle =
  document.getElementById("monthTitle");

const controlMonthLabel =
  document.getElementById("controlMonthLabel");

const modelControlGrid =
  document.getElementById("modelControlGrid");


const completedCountEl =
  document.getElementById("completedCount");

const scheduledCountEl =
  document.getElementById("scheduledCount");

const coveredCountEl =
  document.getElementById("coveredCount");

const monthMetric =
  document.getElementById("monthMetric");


const selectedDateTitle =
  document.getElementById("selectedDateTitle");

const selectedDateBadge =
  document.getElementById("selectedDateBadge");


/* =========================================================
   7. ESTADO DEL CALENDARIO
   ========================================================= */

let schedules = [];
let reports = [];
let calendarEvents = [];


const currentDate = new Date();

let visibleMonth =
  new Date(
    currentDate.getFullYear(),
    currentDate.getMonth(),
    1
  );


/* =========================================================
   8. UTILIDADES
   ========================================================= */

function normalizeModelName(name) {

  const cleanName =
    String(name || "").trim();

  return (
    MODEL_ALIASES[cleanName] ||
    cleanName
  );

}


function isActiveModel(name) {

  return ACTIVE_MODELS.includes(
    normalizeModelName(name)
  );

}


function pad2(value) {

  return String(value)
    .padStart(2, "0");

}


function dateToISO(date) {

  return [
    date.getFullYear(),
    pad2(
      date.getMonth() + 1
    ),
    pad2(
      date.getDate()
    )
  ].join("-");

}


function parseISODate(dateString) {

  if (!dateString) {
    return null;
  }

  const [
    year,
    month,
    day
  ] =
    dateString
      .split("-")
      .map(Number);


  if (
    !year ||
    !month ||
    !day
  ) {
    return null;
  }


  return new Date(
    year,
    month - 1,
    day
  );

}


function getMonthKey(dateString) {

  return String(
    dateString || ""
  ).slice(0, 7);

}


function getVisibleMonthKey() {

  return (
    `${visibleMonth.getFullYear()}-` +
    `${pad2(
      visibleMonth.getMonth() + 1
    )}`
  );

}


function formatMonth(date) {

  return new Intl.DateTimeFormat(
    "es",
    {
      month: "long",
      year: "numeric"
    }
  ).format(date);

}


function formatLongDate(
  dateString
) {

  const date =
    parseISODate(
      dateString
    );


  if (!date) {
    return dateString;
  }


  return new Intl.DateTimeFormat(
    "es",
    {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric"
    }
  ).format(date);

}


function formatTime12(
  timeString
) {

  if (!timeString) {
    return "";
  }


  const [
    hoursRaw,
    minutesRaw
  ] =
    timeString
      .split(":")
      .map(Number);


  if (
    !Number.isFinite(
      hoursRaw
    )
  ) {
    return timeString;
  }


  const hours =
    ((hoursRaw % 24) + 24) % 24;

  const minutes =
    Number.isFinite(
      minutesRaw
    )
      ? minutesRaw
      : 0;


  const suffix =
    hours >= 12
      ? "PM"
      : "AM";


  const hour12 =
    hours % 12 || 12;


  return (
    `${hour12}:` +
    `${pad2(minutes)} ` +
    suffix
  );

}


/* =========================================================
   9. SELECTOR DE HORARIOS
   ========================================================= */

function updateModelSlots(
  selectedStart = ""
) {

  const model =
    modelSelect.value;


  slotSelect.innerHTML =
    '<option value="">Selecciona un horario</option>';


  if (
    !model ||
    !MODEL_SLOTS[model]
  ) {

    return;

  }


  MODEL_SLOTS[model]
    .forEach(
      (slot) => {

        const option =
          document.createElement(
            "option"
          );


        option.value =
          slot.start;


        option.textContent =
          slot.label;


        if (
          selectedStart &&
          selectedStart ===
            slot.start
        ) {

          option.selected =
            true;

        }


        slotSelect
          .appendChild(
            option
          );

      }
    );

}


/* =========================================================
   10. LLAVE SCHEDULE / REPORT
   ========================================================= */

/*
  El backend relaciona los datos por:

  modelName + date + start

  Usamos la misma lógica aquí.
*/

function createEventKey(
  item
) {

  return [
    normalizeModelName(
      item?.modelName
    ),

    String(
      item?.date || ""
    ),

    String(
      item?.start || ""
    )

  ].join("|");

}


/* =========================================================
   11. FECHA Y HORA VISUAL DEL SCHEDULE
   ========================================================= */

/*
  Para mostrar el calendario usamos primero:

  originalDate
  originalStart

  porque representan lo que seleccionó la modelo.

  Para relacionarlo con reports usamos:

  date
  start
*/

function getDisplayDate(
  schedule
) {

  return (
    String(
      schedule?.originalDate || ""
    ).trim() ||

    String(
      schedule?.date || ""
    ).trim()
  );

}


function getDisplayStart(
  schedule
) {

  return (
    String(
      schedule?.originalStart || ""
    ).trim() ||

    String(
      schedule?.start || ""
    ).trim()
  );

}


/* =========================================================
   12. CONSTRUIR EVENTOS DEL CALENDARIO
   ========================================================= */

function rebuildCalendarEvents() {

  const reportMap =
    new Map();


  reports.forEach(
    (report) => {

      if (
        !isActiveModel(
          report.modelName
        )
      ) {
        return;
      }


      reportMap.set(
        createEventKey(report),
        report
      );

    }
  );


  const matchedReports =
    new Set();


  calendarEvents =
    schedules
      .filter(
        (schedule) =>
          isActiveModel(
            schedule.modelName
          )
      )
      .map(
        (schedule) => {

          const key =
            createEventKey(
              schedule
            );


          const report =
            reportMap.get(key) ||
            null;


          if (report) {

            matchedReports.add(
              key
            );

          }


          return {

            modelName:
              normalizeModelName(
                schedule.modelName
              ),

            originalModelName:
              schedule.modelName,

            displayDate:
              getDisplayDate(
                schedule
              ),

            displayStart:
              getDisplayStart(
                schedule
              ),

            storageDate:
              schedule.date,

            storageStart:
              schedule.start,

            theme:
              schedule.theme || "",

            schedule,

            report,

            completed:
              Boolean(report)

          };

        }
      )
      .filter(
        (event) =>
          Boolean(
            event.displayDate
          )
      );


  /*
    Si existe un reporte pero no existe
    schedule asociado, también lo mostramos
    como live realizado.
  */

  reports.forEach(
    (report) => {

      if (
        !isActiveModel(
          report.modelName
        )
      ) {
        return;
      }


      const key =
        createEventKey(
          report
        );


      if (
        matchedReports.has(key)
      ) {
        return;
      }


      calendarEvents.push({

        modelName:
          normalizeModelName(
            report.modelName
          ),

        originalModelName:
          report.modelName,

        displayDate:
          report.date,

        displayStart:
          report.start,

        storageDate:
          report.date,

        storageStart:
          report.start,

        theme: "",

        schedule: null,

        report,

        completed: true

      });

    }
  );


  calendarEvents.sort(
    (a, b) => {

      const byDate =
        a.displayDate.localeCompare(
          b.displayDate
        );


      if (byDate !== 0) {
        return byDate;
      }


      const byTime =
        String(
          a.displayStart || ""
        ).localeCompare(
          String(
            b.displayStart || ""
          )
        );


      if (byTime !== 0) {
        return byTime;
      }


      return (
        a.modelName.localeCompare(
          b.modelName
        )
      );

    }
  );

}


/* =========================================================
   13. ESTADO DEL EVENTO
   ========================================================= */

function getEventStatus(
  event
) {

  /*
    Si existe report:
    LIVE REALIZADO.
  */

  if (event.completed) {
    return "done";
  }


  const eventDate =
    parseISODate(
      event.displayDate
    );


  if (!eventDate) {
    return "scheduled";
  }


  const today =
    new Date();


  today.setHours(
    0,
    0,
    0,
    0
  );


  /*
    Fecha pasada sin reporte:
    SIN REPORTE.
  */

  if (
    eventDate < today
  ) {
    return "overdue";
  }


  /*
    Fecha futura:
    AGENDADO.
  */

  return "scheduled";

}


function getEventStatusText(
  event
) {

  const status =
    getEventStatus(
      event
    );


  if (
    status === "done"
  ) {
    return "Realizado";
  }


  if (
    status === "overdue"
  ) {
    return "Sin reporte";
  }


  return "Agendado";

}


/* =========================================================
   14. RENDERIZAR CALENDARIO
   ========================================================= */

function renderCalendar() {

  monthTitle.textContent =
    formatMonth(
      visibleMonth
    );


  controlMonthLabel.textContent =
    formatMonth(
      visibleMonth
    );


  monthMetric.textContent =
    formatMonth(
      visibleMonth
    );


  calendarGrid.innerHTML =
    "";


  const year =
    visibleMonth.getFullYear();

  const month =
    visibleMonth.getMonth();


  /*
    Primer día del mes.
  */

  const firstDay =
    new Date(
      year,
      month,
      1
    );


  /*
    Día inicial del grid.
    Siempre comenzamos domingo.
  */

  const gridStart =
    new Date(
      year,
      month,
      1 -
        firstDay.getDay()
    );


  const todayISO =
    dateToISO(
      new Date()
    );


  const selectedDate =
    dateInput.value;


  /*
    6 semanas x 7 días
    = 42 celdas.
  */

  for (
    let index = 0;
    index < 42;
    index++
  ) {

    const cellDate =
      new Date(
        gridStart.getFullYear(),
        gridStart.getMonth(),
        gridStart.getDate() +
          index
      );


    const dateString =
      dateToISO(
        cellDate
      );


    const outsideMonth =
      cellDate.getMonth() !==
      month;


    const dayEvents =
      calendarEvents.filter(
        (event) =>
          event.displayDate ===
          dateString
      );


    const dayElement =
      document.createElement(
        "div"
      );


    dayElement.className =
      "day";


    if (outsideMonth) {

      dayElement.classList.add(
        "outside"
      );

    }


    if (
      dateString ===
      todayISO
    ) {

      dayElement.classList.add(
        "today"
      );

    }


    if (
      dateString ===
      selectedDate
    ) {

      dayElement.classList.add(
        "selected"
      );

    }


    /*
      CABECERA DEL DÍA
    */

    const dayHead =
      document.createElement(
        "div"
      );


    dayHead.className =
      "day-head";


    const dayNumber =
      document.createElement(
        "span"
      );


    dayNumber.className =
      "day-number";


    dayNumber.textContent =
      cellDate.getDate();


    const dayCount =
      document.createElement(
        "span"
      );


    dayCount.className =
      "day-count";


    if (
      dayEvents.length > 0
    ) {

      dayCount.textContent =
        `${dayEvents.length} ` +
        `${
          dayEvents.length === 1
            ? "live"
            : "lives"
        }`;

    }


    dayHead.append(
      dayNumber,
      dayCount
    );


    /*
      EVENTOS
    */

    const eventsContainer =
      document.createElement(
        "div"
      );


    eventsContainer.className =
      "events";


    dayEvents.forEach(
      (event) => {

        const status =
          getEventStatus(
            event
          );


        const eventButton =
          document.createElement(
            "button"
          );


        eventButton.type =
          "button";


        eventButton.className =
          `event ${status}`;


        eventButton.title =
          [
            event.modelName,

            event.displayStart
              ? formatTime12(
                  event.displayStart
                )
              : "",

            event.theme,

            getEventStatusText(
              event
            )

          ]
            .filter(Boolean)
            .join(" · ");


        /*
          NOMBRE
        */

        const modelLine =
          document.createElement(
            "span"
          );


        modelLine.className =
          "event-model";


        let symbol = "•";


        if (
          status === "done"
        ) {

          symbol = "✓";

        }


        if (
          status === "overdue"
        ) {

          symbol = "!";

        }


        modelLine.textContent =
          `${symbol} ${event.modelName}`;


        /*
          HORA + THEME
        */

        const metaLine =
          document.createElement(
            "span"
          );


        metaLine.className =
          "event-meta";


        metaLine.textContent =
          [
            event.displayStart
              ? formatTime12(
                  event.displayStart
                )
              : "",

            event.theme

          ]
            .filter(Boolean)
            .join(" · ");


        eventButton.append(
          modelLine,
          metaLine
        );


        /*
          CLICK EN EVENTO
        */

        eventButton
          .addEventListener(
            "click",
            (clickEvent) => {

              clickEvent
                .stopPropagation();


              loadEventIntoForm(
                event
              );

            }
          );


        eventsContainer
          .appendChild(
            eventButton
          );

      }
    );


    dayElement.append(
      dayHead,
      eventsContainer
    );


    /*
      CLICK EN DÍA
    */

    dayElement
      .addEventListener(
        "click",
        () => {

          selectCalendarDate(
            dateString
          );

        }
      );


    calendarGrid
      .appendChild(
        dayElement
      );

  }


  renderModelControl();

}


/* =========================================================
   15. CONTROL MENSUAL DE MODELOS
   ========================================================= */

function renderModelControl() {

  const monthKey =
    getVisibleMonthKey();


  const monthEvents =
    calendarEvents.filter(
      (event) =>
        getMonthKey(
          event.displayDate
        ) ===
        monthKey
    );


  /*
    MÉTRICAS GENERALES
  */

  const completedEvents =
    monthEvents.filter(
      (event) =>
        event.completed
    );


  const pendingEvents =
    monthEvents.filter(
      (event) =>
        !event.completed
    );


  completedCountEl.textContent =
    completedEvents.length;


  scheduledCountEl.textContent =
    pendingEvents.length;


  const coveredModels =
    new Set(
      completedEvents.map(
        (event) =>
          event.modelName
      )
    );


  coveredCountEl.textContent =
    `${coveredModels.size}/` +
    `${ACTIVE_MODELS.length}`;


  /*
    TARJETAS DE MODELOS
  */

  modelControlGrid.innerHTML =
    "";


  ACTIVE_MODELS.forEach(
    (modelName) => {

      const modelEvents =
        monthEvents.filter(
          (event) =>
            event.modelName ===
            modelName
        );


      const completedCount =
        modelEvents.filter(
          (event) =>
            event.completed
        ).length;


      const scheduledCount =
        modelEvents.filter(
          (event) =>
            !event.completed &&
            getEventStatus(event) ===
              "scheduled"
        ).length;


      const overdueCount =
        modelEvents.filter(
          (event) =>
            !event.completed &&
            getEventStatus(event) ===
              "overdue"
        ).length;


      let status =
        "pending";


      let statusText =
        "PENDIENTE";


      /*
        Si hizo al menos un live:
        REALIZADO.
      */

      if (
        completedCount > 0
      ) {

        status =
          "done";

        statusText =
          "REALIZADO";

      }

      /*
        Si no hizo live,
        pero tiene uno próximo:
        AGENDADO.
      */

      else if (
        scheduledCount > 0
      ) {

        status =
          "scheduled";

        statusText =
          "AGENDADO";

      }

      /*
        Si tenía uno pasado
        pero no tiene reporte:
        SIN REPORTE.
      */

      else if (
        overdueCount > 0
      ) {

        status =
          "overdue";

        statusText =
          "SIN REPORTE";

      }


      const card =
        document.createElement(
          "article"
        );


      card.className =
        `model-card ${status}`;


      /*
        NOMBRE
      */

      const nameElement =
        document.createElement(
          "span"
        );


      nameElement.className =
        "model-name";


      nameElement.textContent =
        modelName;


      /*
        STATUS
      */

      const badge =
        document.createElement(
          "span"
        );


      badge.className =
        `badge ${status}`;


      badge.textContent =
        statusText;


      /*
        CONTADORES
      */

      const counters =
        document.createElement(
          "div"
        );


      counters.className =
        "model-counts";


      let counterText =
        `${completedCount} realizado`;


      if (
        completedCount !== 1
      ) {

        counterText += "s";

      }


      counterText +=
        ` · ${scheduledCount} agendado`;


      if (
        scheduledCount !== 1
      ) {

        counterText += "s";

      }


      if (
        overdueCount > 0
      ) {

        counterText +=
          ` · ${overdueCount} sin reporte`;

      }


      counters.textContent =
        counterText;


      card.append(
        nameElement,
        badge,
        counters
      );


      /*
        CLICK EN MODELO
      */

      card.addEventListener(
        "click",
        () => {

          modelSelect.value =
            modelName;


          updateModelSlots();


          /*
            Si todavía no hay fecha
            seleccionada usamos hoy,
            si estamos viendo el mes actual.

            Si estamos viendo otro mes,
            usamos el día 1.
          */

          if (
            !dateInput.value
          ) {

            const today =
              new Date();


            let targetDate;


            if (
              today.getFullYear() ===
                visibleMonth.getFullYear() &&

              today.getMonth() ===
                visibleMonth.getMonth()
            ) {

              targetDate =
                today;

            } else {

              targetDate =
                new Date(
                  visibleMonth.getFullYear(),
                  visibleMonth.getMonth(),
                  1
                );

            }


            selectCalendarDate(
              dateToISO(
                targetDate
              ),
              false
            );

          }


          document
            .getElementById(
              "scheduleCard"
            )
            .scrollIntoView({
              behavior: "smooth",
              block: "start"
            });

        }
      );


      modelControlGrid
        .appendChild(
          card
        );

    }
  );

}


/* =========================================================
   16. SELECCIONAR FECHA DESDE EL CALENDARIO
   ========================================================= */

function selectCalendarDate(
  dateString,
  scrollToForm = true
) {

  dateInput.value =
    dateString;


  const formatted =
    formatLongDate(
      dateString
    );


  if (formatted) {

    selectedDateTitle.textContent =
      formatted
        .charAt(0)
        .toUpperCase() +
      formatted.slice(1);

  } else {

    selectedDateTitle.textContent =
      dateString;

  }


  selectedDateBadge.textContent =
    dateString;


  /*
    Re-render para mostrar
    borde en el día seleccionado.
  */

  renderCalendar();


  if (scrollToForm) {

    document
      .getElementById(
        "scheduleCard"
      )
      .scrollIntoView({
        behavior: "smooth",
        block: "start"
      });

  }

}


/* =========================================================
   17. CLICK EN LIVE EXISTENTE
   ========================================================= */

function loadEventIntoForm(
  event
) {

  selectCalendarDate(
    event.displayDate,
    false
  );


  const normalizedModel =
    normalizeModelName(
      event.originalModelName
    );


  if (
    ACTIVE_MODELS.includes(
      normalizedModel
    )
  ) {

    modelSelect.value =
      normalizedModel;


    updateModelSlots(
      event.displayStart
    );

  }


  if (
    event.theme
  ) {

    themeInput.value =
      event.theme;

  }


  document
    .getElementById(
      "scheduleCard"
    )
    .scrollIntoView({
      behavior: "smooth",
      block: "start"
    });

}


/* =========================================================
   18. CARGAR SCHEDULES + REPORTS
   ========================================================= */

async function loadCalendarData() {

  const refreshButton =
    document.getElementById(
      "refreshBtn"
    );

  refreshButton.disabled = true;

  refreshButton.textContent =
    "Actualizando...";


  try {

    /*
      Primero cargamos schedules.
      Si reports falla, el calendario
      NO deja de funcionar.
    */

    const schedulesResponse =
      await fetch(
        API_URL,
        {
          cache: "no-store"
        }
      );


    if (!schedulesResponse.ok) {

      throw new Error(
        `Error cargando schedules. HTTP ${schedulesResponse.status}`
      );

    }


    const schedulesData =
      await schedulesResponse.json();


    schedules =
      Array.isArray(
        schedulesData
      )
        ? schedulesData
        : [];


    /*
      REPORTS

      Si falla reports, seguimos mostrando
      los schedules y permitimos agendar.
    */

    try {

      const reportsResponse =
        await fetch(
          REPORTS_URL,
          {
            cache: "no-store"
          }
        );


      if (!reportsResponse.ok) {

        console.error(
          "Error cargando reports:",
          reportsResponse.status
        );

        reports = [];

      } else {

        const reportsData =
          await reportsResponse.json();


        reports =
          Array.isArray(
            reportsData
          )
            ? reportsData
            : [];

      }


    } catch (reportsError) {

      console.error(
        "No se pudieron cargar reports:",
        reportsError
      );

      reports = [];

    }


    /*
      Construimos los eventos aunque
      reports esté vacío.
    */

    rebuildCalendarEvents();

    renderCalendar();


    console.log(
      "Calendario cargado:"
    );

    console.log(
      "Schedules:",
      schedules.length
    );

    console.log(
      "Reports:",
      reports.length
    );


  } catch (error) {

    console.error(
      "Error cargando schedules:",
      error
    );


    /*
      MUY IMPORTANTE:

      Aunque falle la API,
      dejamos el calendario visible
      para poder seleccionar una fecha.
    */

    schedules = [];
    reports = [];

    rebuildCalendarEvents();

    renderCalendar();


    showError(
      "No se pudieron cargar los lives anteriores, pero puedes intentar agendar un nuevo live."
    );


  } finally {

    refreshButton.disabled = false;

    refreshButton.textContent =
      "Actualizar";

  }

}


/* =========================================================
   19. CONVERSIÓN DE HORA LOCAL
   ========================================================= */

/*
  ESTA FUNCIÓN CONSERVA LA MISMA LÓGICA
  QUE TENÍAS ORIGINALMENTE.
*/

function convertLocalToEst(
  dateStr,
  timeStr,
  modelName
) {

  const offset =
    MODEL_OFFSET_TO_EST[
      modelName
    ] ?? 0;


  const [
    year,
    month,
    day
  ] =
    dateStr
      .split("-")
      .map(Number);


  const [
    hours,
    minutes
  ] =
    timeStr
      .split(":")
      .map(Number);


  let totalMinutes =
    hours * 60 +
    minutes;


  totalMinutes -=
    offset * 60;


  let dayShift = 0;


  if (
    totalMinutes < 0
  ) {

    totalMinutes +=
      24 * 60;

    dayShift = -1;

  }

  else if (
    totalMinutes >=
    24 * 60
  ) {

    totalMinutes -=
      24 * 60;

    dayShift = 1;

  }


  const estHour =
    String(
      Math.floor(
        totalMinutes / 60
      )
    ).padStart(
      2,
      "0"
    );


  const estMinute =
    String(
      totalMinutes % 60
    ).padStart(
      2,
      "0"
    );


  const convertedDate =
    new Date(
      Date.UTC(
        year,
        month - 1,
        day
      )
    );


  convertedDate.setUTCDate(
    convertedDate.getUTCDate() +
      dayShift
  );


  const estYear =
    convertedDate
      .getUTCFullYear();


  const estMonth =
    String(
      convertedDate
        .getUTCMonth() +
        1
    ).padStart(
      2,
      "0"
    );


  const estDay =
    String(
      convertedDate
        .getUTCDate()
    ).padStart(
      2,
      "0"
    );


  return {

    date:
      `${estYear}-` +
      `${estMonth}-` +
      `${estDay}`,

    start:
      `${estHour}:` +
      `${estMinute}`

  };

}


/* =========================================================
   20. GUARDAR SCHEDULE
   ========================================================= */

async function saveSchedule() {

  const modelName =
    modelSelect.value;


  const dateLocal =
    dateInput.value;


  const startLocal =
    slotSelect.value;


  const theme =
    themeInput.value.trim();


  const flyerFile =
    flyerInput.files?.[0] ||
    null;


  const flyer1File =
    flyer1Input.files?.[0] ||
    null;


  const flyer2File =
    flyer2Input.files?.[0] ||
    null;


  const flyer3File =
    flyer3Input.files?.[0] ||
    null;


  const additionalFlyers = [

    flyer1File,
    flyer2File,
    flyer3File

  ].filter(Boolean);


  clearStatus();


  /*
    VALIDACIÓN PRINCIPAL
  */

  if (
    !modelName ||
    !dateLocal ||
    !startLocal ||
    !theme
  ) {

    showError(
      "Selecciona un día, modelo, horario y temática."
    );

    return;

  }


  /*
    MÁXIMO 3 FLYERS EXTRA
  */

  if (
    additionalFlyers.length >
    MAX_EXTRA_FLYERS
  ) {

    showError(
      `Solo puedes subir un máximo de ${MAX_EXTRA_FLYERS} flyers adicionales.`
    );

    return;

  }


  const allSelectedFiles = [

    flyerFile,
    ...additionalFlyers

  ].filter(Boolean);


  /*
    VALIDAR FORMATO
  */

  const invalidFile =
    allSelectedFiles.find(
      (file) =>
        !isValidImage(file)
    );


  if (invalidFile) {

    showError(
      `El archivo "${invalidFile.name}" no tiene un formato válido.`
    );

    return;

  }


  /*
    VALIDAR PESO
  */

  const oversizedFile =
    allSelectedFiles.find(
      (file) =>
        file.size >
        MAX_FILE_SIZE_BYTES
    );


  if (oversizedFile) {

    showError(
      `El archivo "${oversizedFile.name}" supera los ${MAX_FILE_SIZE_MB} MB.`
    );

    return;

  }


  /*
    CONVERSIÓN
  */

  const converted =
    convertLocalToEst(
      dateLocal,
      startLocal,
      modelName
    );


  /*
    FORM DATA
  */

  const formData =
    new FormData();


  formData.append(
    "modelName",
    modelName
  );


  formData.append(
    "theme",
    theme
  );


  formData.append(
    "date",
    converted.date
  );


  formData.append(
    "start",
    converted.start
  );


  formData.append(
    "originalDate",
    dateLocal
  );


  formData.append(
    "originalStart",
    startLocal
  );


  /*
    FLYER PRINCIPAL
  */

  if (flyerFile) {

    formData.append(
      "flyer",
      flyerFile
    );

  }


  /*
    FLYERS EXTRA
  */

  additionalFlyers
    .forEach(
      (file) => {

        formData.append(
          "flyers",
          file
        );

      }
    );


  /*
    UI GUARDANDO
  */

  saveBtn.disabled =
    true;


  saveBtn.textContent =
    "Guardando...";


  try {

    const response =
      await fetch(
        API_URL,
        {
          method: "POST",
          body: formData
        }
      );


    let data = null;


    try {

      data =
        await response.json();

    } catch {

      data = null;

    }


    if (
      !response.ok
    ) {

      throw new Error(
        data?.message ||
        `Error HTTP ${response.status}`
      );

    }


    if (
      !data?.success
    ) {

      throw new Error(
        data?.message ||
        "Error desconocido"
      );

    }


    /*
      ÉXITO
    */

    statusEl.textContent =
      "Horario guardado correctamente. El calendario fue actualizado ♥";


    statusEl.className =
      "status ok";


    themeInput.value =
      "";


    slotSelect.value =
      "";


    resetFileInputs();


    /*
      Volvemos a leer schedules
      y reports para actualizar
      el calendario inmediatamente.
    */

    await loadCalendarData();


  } catch (error) {

    console.error(
      "Error guardando el horario:",
      error
    );


    showError(
      error.message ||
      "Hubo un problema guardando tu horario. Intenta más tarde."
    );


  } finally {

    saveBtn.disabled =
      false;


    saveBtn.textContent =
      "Guardar horario";

  }

}


/* =========================================================
   21. VALIDACIÓN DE IMÁGENES
   ========================================================= */

function isValidImage(
  file
) {

  if (!file) {
    return false;
  }


  if (
    ALLOWED_FILE_TYPES.includes(
      file.type
    )
  ) {

    return true;

  }


  return /\.(jpe?g|png|webp)$/i
    .test(
      file.name
    );

}


/* =========================================================
   22. MOSTRAR NOMBRE DEL ARCHIVO
   ========================================================= */

function showSingleFileName(
  input,
  helpElement,
  emptyMessage
) {

  const file =
    input.files?.[0];


  helpElement.classList.remove(
    "selected",
    "error"
  );


  if (!file) {

    helpElement.textContent =
      emptyMessage;

    return;

  }


  if (
    !isValidImage(file)
  ) {

    input.value = "";


    helpElement.textContent =
      "Solo se permiten imágenes JPG, PNG o WEBP.";


    helpElement.classList.add(
      "error"
    );


    return;

  }


  if (
    file.size >
    MAX_FILE_SIZE_BYTES
  ) {

    input.value = "";


    helpElement.textContent =
      `El archivo no puede superar los ${MAX_FILE_SIZE_MB} MB.`;


    helpElement.classList.add(
      "error"
    );


    return;

  }


  helpElement.textContent =
    `Seleccionado: ${file.name}`;


  helpElement.classList.add(
    "selected"
  );

}


/* =========================================================
   23. RESET DE FLYERS
   ========================================================= */

function resetFileInputs() {

  flyerInput.value = "";
  flyer1Input.value = "";
  flyer2Input.value = "";
  flyer3Input.value = "";


  flyerHelp.textContent =
    "Ningún flyer principal seleccionado.";


  flyer1Help.textContent =
    "Ningún Flyer 1 seleccionado.";


  flyer2Help.textContent =
    "Ningún Flyer 2 seleccionado.";


  flyer3Help.textContent =
    "Ningún Flyer 3 seleccionado.";


  flyerHelp.className =
    "file-help";


  flyer1Help.className =
    "file-help";


  flyer2Help.className =
    "file-help";


  flyer3Help.className =
    "file-help";

}


/* =========================================================
   24. STATUS
   ========================================================= */

function clearStatus() {

  statusEl.textContent =
    "";


  statusEl.className =
    "status";

}


function showError(
  message
) {

  statusEl.textContent =
    message;


  statusEl.className =
    "status error";

}


/* =========================================================
   25. EVENTOS — MODELO
   ========================================================= */

modelSelect.addEventListener(
  "change",
  () => {

    updateModelSlots();

  }
);


/* =========================================================
   26. EVENTOS — FLYERS
   ========================================================= */

flyerInput.addEventListener(
  "change",
  () => {

    showSingleFileName(
      flyerInput,
      flyerHelp,
      "Ningún flyer principal seleccionado."
    );

  }
);


flyer1Input.addEventListener(
  "change",
  () => {

    showSingleFileName(
      flyer1Input,
      flyer1Help,
      "Ningún Flyer 1 seleccionado."
    );

  }
);


flyer2Input.addEventListener(
  "change",
  () => {

    showSingleFileName(
      flyer2Input,
      flyer2Help,
      "Ningún Flyer 2 seleccionado."
    );

  }
);


flyer3Input.addEventListener(
  "change",
  () => {

    showSingleFileName(
      flyer3Input,
      flyer3Help,
      "Ningún Flyer 3 seleccionado."
    );

  }
);


/* =========================================================
   27. EVENTO — GUARDAR
   ========================================================= */

saveBtn.addEventListener(
  "click",
  saveSchedule
);


/* =========================================================
   28. CALENDARIO — MES ANTERIOR
   ========================================================= */

document
  .getElementById(
    "prevMonthBtn"
  )
  .addEventListener(
    "click",
    () => {

      visibleMonth =
        new Date(
          visibleMonth.getFullYear(),
          visibleMonth.getMonth() - 1,
          1
        );


      renderCalendar();

    }
  );


/* =========================================================
   29. CALENDARIO — MES SIGUIENTE
   ========================================================= */

document
  .getElementById(
    "nextMonthBtn"
  )
  .addEventListener(
    "click",
    () => {

      visibleMonth =
        new Date(
          visibleMonth.getFullYear(),
          visibleMonth.getMonth() + 1,
          1
        );


      renderCalendar();

    }
  );


/* =========================================================
   30. CALENDARIO — HOY
   ========================================================= */

document
  .getElementById(
    "todayBtn"
  )
  .addEventListener(
    "click",
    () => {

      const today =
        new Date();


      visibleMonth =
        new Date(
          today.getFullYear(),
          today.getMonth(),
          1
        );


      selectCalendarDate(
        dateToISO(today),
        false
      );

    }
  );


/* =========================================================
   31. ACTUALIZAR DATOS
   ========================================================= */

document
  .getElementById(
    "refreshBtn"
  )
  .addEventListener(
    "click",
    loadCalendarData
  );


/* =========================================================
   32. CARGA INICIAL
   ========================================================= */

loadCalendarData();