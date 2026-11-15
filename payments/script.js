/* =========================================================
   LIVESTREAM PAYMENTS
   script.js
   ========================================================= */


/* =========================================================
   1. API
   ========================================================= */

const REPORTS_URL =
  "/api/reports";

const SCHEDULES_URL =
  "/api/model-schedule";


/* =========================================================
   2. CONFIGURACIÓN
   ========================================================= */

const MODEL_PERCENTAGE =
  0.30;


/*
  Compatibilidad con nombres históricos.

  No modifica los JSON.
  Solo permite que registros antiguos:

  Sara  -> Sarah
  Sophi -> Sophia

  aparezcan bajo el nombre actual.
*/

const MODEL_ALIASES = {

  Sara: "Sarah",

  Sophi: "Sophia"

};


/* =========================================================
   3. REFERENCIAS DEL DOM
   ========================================================= */

const modelSelect =
  document.getElementById(
    "modelSelect"
  );

const monthSelect =
  document.getElementById(
    "monthSelect"
  );

const fortnightSelect =
  document.getElementById(
    "fortnightSelect"
  );


const searchBtn =
  document.getElementById(
    "searchBtn"
  );

const refreshBtn =
  document.getElementById(
    "refreshBtn"
  );


const emptyState =
  document.getElementById(
    "emptyState"
  );

const resultsSection =
  document.getElementById(
    "resultsSection"
  );


const resultModelName =
  document.getElementById(
    "resultModelName"
  );

const resultPeriod =
  document.getElementById(
    "resultPeriod"
  );

const periodBadge =
  document.getElementById(
    "periodBadge"
  );


const livestreamCount =
  document.getElementById(
    "livestreamCount"
  );

const totalGross =
  document.getElementById(
    "totalGross"
  );

const modelPayment =
  document.getElementById(
    "modelPayment"
  );


const detailCount =
  document.getElementById(
    "detailCount"
  );

const livestreamList =
  document.getElementById(
    "livestreamList"
  );

const noLivestreams =
  document.getElementById(
    "noLivestreams"
  );


const finalPeriodTitle =
  document.getElementById(
    "finalPeriodTitle"
  );

const finalGross =
  document.getElementById(
    "finalGross"
  );

const finalModelPayment =
  document.getElementById(
    "finalModelPayment"
  );


const statusEl =
  document.getElementById(
    "status"
  );


/* =========================================================
   4. ESTADO
   ========================================================= */

let reports = [];

let schedules = [];


/*
  Aquí guardaremos los reportes
  ya preparados para la página.

  Cada elemento tendrá:

  modelName
  date
  gross
  report
  schedule
*/

let paymentEntries = [];


/* =========================================================
   5. UTILIDADES GENERALES
   ========================================================= */

function normalizeModelName(
  name
) {

  const cleanName =
    String(
      name || ""
    ).trim();


  return (
    MODEL_ALIASES[
      cleanName
    ] ||
    cleanName
  );

}


function pad2(
  value
) {

  return String(
    value
  ).padStart(
    2,
    "0"
  );

}


/* =========================================================
   6. PARSEAR FECHAS
   ========================================================= */

function parseISODate(
  dateString
) {

  if (!dateString) {
    return null;
  }


  const [
    year,
    month,
    day
  ] =
    String(
      dateString
    )
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


/* =========================================================
   7. FORMATO DE FECHA
   ========================================================= */

function formatLivestreamDate(
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
      day: "2-digit",
      month: "short",
      year: "numeric"
    }
  )
    .format(date)
    .replace(".", "");

}


/* =========================================================
   8. FORMATO DEL MES
   ========================================================= */

function formatMonthName(
  monthKey
) {

  if (!monthKey) {
    return "";
  }


  const [
    year,
    month
  ] =
    monthKey
      .split("-")
      .map(Number);


  if (
    !year ||
    !month
  ) {

    return monthKey;

  }


  const date =
    new Date(
      year,
      month - 1,
      1
    );


  const formatted =
    new Intl.DateTimeFormat(
      "es",
      {
        month: "long",
        year: "numeric"
      }
    ).format(date);


  return (
    formatted
      .charAt(0)
      .toUpperCase() +
    formatted.slice(1)
  );

}


/* =========================================================
   9. FORMATO DE DINERO
   ========================================================= */

function formatMoney(
  amount
) {

  const safeAmount =
    Number.isFinite(
      Number(amount)
    )
      ? Number(amount)
      : 0;


  return new Intl.NumberFormat(
    "en-US",
    {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }
  ).format(
    safeAmount
  );

}


/* =========================================================
   10. CONVERTIR COLLECTED AMOUNT
   ========================================================= */

/*
  Normalmente tu backend ya guarda
  collectedAmount como Number.

  Aun así esta función permite
  manejar valores como:

  185
  "185"
  "$185.00"
  "1,250.00"
*/

function parseGrossAmount(
  value
) {

  if (
    typeof value ===
    "number"
  ) {

    return Number.isFinite(
      value
    )
      ? value
      : 0;

  }


  const clean =
    String(
      value ?? ""
    )
      .replace(
        /[^0-9.-]/g,
        ""
      );


  const number =
    Number(clean);


  return Number.isFinite(
    number
  )
    ? number
    : 0;

}


/* =========================================================
   11. LLAVE REPORT / SCHEDULE
   ========================================================= */

/*
  El sistema ya relaciona:

  modelName + date + start

  Usamos exactamente la misma
  relación para buscar el schedule
  correspondiente a cada report.
*/

function createKey(
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
   12. OBTENER FECHA REAL DEL LIVE
   ========================================================= */

/*
  Si encontramos el schedule:

  usamos originalDate.

  Esto es importante porque esa es
  la fecha que originalmente fue
  seleccionada al agendar el live.

  Si no existe originalDate:

  usamos report.date.
*/

function getEffectiveDate(
  report,
  schedule
) {

  const originalDate =
    String(
      schedule?.originalDate ||
      ""
    ).trim();


  if (originalDate) {

    return originalDate;

  }


  return String(
    report?.date || ""
  ).trim();

}


/* =========================================================
   13. PREPARAR REPORTES
   ========================================================= */

function buildPaymentEntries() {

  /*
    Indexamos schedules para
    encontrarlos rápidamente.
  */

  const scheduleMap =
    new Map();


  schedules.forEach(
    (schedule) => {

      scheduleMap.set(
        createKey(
          schedule
        ),
        schedule
      );

    }
  );


  paymentEntries =
    reports
      .map(
        (report) => {

          const schedule =
            scheduleMap.get(
              createKey(
                report
              )
            ) || null;


          const date =
            getEffectiveDate(
              report,
              schedule
            );


          return {

            modelName:
              normalizeModelName(
                report.modelName
              ),

            date,

            gross:
              parseGrossAmount(
                report.collectedAmount
              ),

            report,

            schedule

          };

        }
      )
      .filter(
        (entry) => {

          return (
            entry.modelName &&
            entry.date
          );

        }
      );


  /*
    Orden cronológico.
  */

  paymentEntries.sort(
    (a, b) => {

      const byDate =
        a.date.localeCompare(
          b.date
        );


      if (byDate !== 0) {

        return byDate;

      }


      return (
        String(
          a.report?.start || ""
        ).localeCompare(
          String(
            b.report?.start || ""
          )
        )
      );

    }
  );

}


/* =========================================================
   14. CREAR LISTA DE MESES
   ========================================================= */

function populateMonthSelect() {

  const previousValue =
    monthSelect.value;


  const months =
    new Set();


  paymentEntries.forEach(
    (entry) => {

      const monthKey =
        String(
          entry.date || ""
        ).slice(
          0,
          7
        );


      if (
        /^\d{4}-\d{2}$/.test(
          monthKey
        )
      ) {

        months.add(
          monthKey
        );

      }

    }
  );


  /*
    Si no existen reportes todavía,
    mostramos al menos el mes actual.
  */

  if (
    months.size === 0
  ) {

    const today =
      new Date();


    const currentMonth =
      `${today.getFullYear()}-` +
      `${pad2(
        today.getMonth() + 1
      )}`;


    months.add(
      currentMonth
    );

  }


  /*
    Más reciente primero.
  */

  const sortedMonths =
    Array
      .from(months)
      .sort()
      .reverse();


  monthSelect.innerHTML =
    '<option value="">Selecciona un mes</option>';


  sortedMonths.forEach(
    (monthKey) => {

      const option =
        document.createElement(
          "option"
        );


      option.value =
        monthKey;


      option.textContent =
        formatMonthName(
          monthKey
        );


      monthSelect
        .appendChild(
          option
        );

    }
  );


  /*
    Conservamos selección
    si todavía existe.
  */

  if (
    previousValue &&
    sortedMonths.includes(
      previousValue
    )
  ) {

    monthSelect.value =
      previousValue;

  }

}


/* =========================================================
   15. OBTENER ÚLTIMO DÍA DEL MES
   ========================================================= */

function getLastDayOfMonth(
  monthKey
) {

  const [
    year,
    month
  ] =
    monthKey
      .split("-")
      .map(Number);


  return new Date(
    year,
    month,
    0
  ).getDate();

}


/* =========================================================
   16. OBTENER TEXTO DE QUINCENA
   ========================================================= */

function getFortnightInfo(
  monthKey,
  fortnight
) {

  const lastDay =
    getLastDayOfMonth(
      monthKey
    );


  if (
    fortnight ===
    "first"
  ) {

    return {

      startDay: 1,

      endDay: 15,

      title:
        "Primera quincena",

      range:
        "1 al 15"

    };

  }


  return {

    startDay: 16,

    endDay:
      lastDay,

    title:
      "Segunda quincena",

    range:
      `16 al ${lastDay}`

  };

}


/* =========================================================
   17. FILTRAR REPORTES
   ========================================================= */

function getFilteredEntries(
  modelName,
  monthKey,
  fortnight
) {

  const period =
    getFortnightInfo(
      monthKey,
      fortnight
    );


  return paymentEntries
    .filter(
      (entry) => {

        /*
          MODELO
        */

        if (
          entry.modelName !==
          modelName
        ) {

          return false;

        }


        /*
          MES
        */

        if (
          !entry.date.startsWith(
            monthKey
          )
        ) {

          return false;

        }


        /*
          DÍA
        */

        const date =
          parseISODate(
            entry.date
          );


        if (!date) {

          return false;

        }


        const day =
          date.getDate();


        return (
          day >=
            period.startDay &&
          day <=
            period.endDay
        );

      }
    )
    .sort(
      (a, b) =>
        a.date.localeCompare(
          b.date
        )
    );

}


/* =========================================================
   18. CALCULAR TOTALES
   ========================================================= */

function calculateTotals(
  entries
) {

  const gross =
    entries.reduce(
      (
        total,
        entry
      ) => {

        return (
          total +
          entry.gross
        );

      },
      0
    );


  const modelPay =
    gross *
    MODEL_PERCENTAGE;


  return {

    gross,

    modelPay

  };

}


/* =========================================================
   19. RENDER DE UN LIVESTREAM
   ========================================================= */

function createLivestreamItem(
  entry
) {

  const gross =
    entry.gross;


  const modelPay =
    gross *
    MODEL_PERCENTAGE;


  /*
    CONTENEDOR
  */

  const item =
    document.createElement(
      "article"
    );


  item.className =
    "livestream-item";


  /*
    FECHA
  */

  const dateContainer =
    document.createElement(
      "div"
    );


  const dateElement =
    document.createElement(
      "span"
    );


  dateElement.className =
    "livestream-date";


  dateElement.textContent =
    formatLivestreamDate(
      entry.date
    );


  const dateLabel =
    document.createElement(
      "span"
    );


  dateLabel.className =
    "livestream-label";


  dateLabel.textContent =
    "Livestream realizado";


  dateContainer.append(
    dateElement,
    dateLabel
  );


  /*
    DINERO
  */

  const moneyContainer =
    document.createElement(
      "div"
    );


  moneyContainer.className =
    "livestream-money";


  const grossElement =
    document.createElement(
      "span"
    );


  grossElement.className =
    "livestream-gross";


  /*
    Tal como pediste:

    $185.00 Gross
  */

  grossElement.textContent =
    `${formatMoney(
      gross
    )} Gross`;


  const modelPaymentElement =
    document.createElement(
      "span"
    );


  modelPaymentElement.className =
    "livestream-model-payment";


  modelPaymentElement.textContent =
    `30% para la modelo: ` +
    `${formatMoney(
      modelPay
    )}`;


  moneyContainer.append(
    grossElement,
    modelPaymentElement
  );


  item.append(
    dateContainer,
    moneyContainer
  );


  return item;

}


/* =========================================================
   20. MOSTRAR RESULTADOS
   ========================================================= */

function renderResults() {

  clearStatus();


  const modelName =
    normalizeModelName(
      modelSelect.value
    );


  const monthKey =
    monthSelect.value;


  const fortnight =
    fortnightSelect.value;


  /*
    VALIDACIÓN
  */

  if (
    !modelName ||
    !monthKey ||
    !fortnight
  ) {

    showError(
      "Selecciona una modelo, un mes y una quincena."
    );

    return;

  }


  const period =
    getFortnightInfo(
      monthKey,
      fortnight
    );


  const entries =
    getFilteredEntries(
      modelName,
      monthKey,
      fortnight
    );


  const totals =
    calculateTotals(
      entries
    );


  /*
    Ocultamos estado inicial.
  */

  emptyState.classList.add(
    "hidden"
  );


  /*
    Mostramos resultados.
  */

  resultsSection.classList.remove(
    "hidden"
  );


  /*
    CABECERA
  */

  resultModelName.textContent =
    modelName;


  resultPeriod.textContent =
    `${formatMonthName(
      monthKey
    )} · ` +
    `${period.title}`;


  periodBadge.textContent =
    `${period.title} · ` +
    `${period.range}`;


  /*
    MÉTRICAS
  */

  livestreamCount.textContent =
    entries.length;


  /*
    Gross en la misma línea.

    Ejemplo:

    $800.00 Gross
  */

  totalGross.textContent =
    `${formatMoney(
      totals.gross
    )} Gross`;


  modelPayment.textContent =
    formatMoney(
      totals.modelPay
    );


  /*
    DETALLE
  */

  detailCount.textContent =
    `${entries.length} ` +
    `${
      entries.length === 1
        ? "live"
        : "lives"
    }`;


  livestreamList.innerHTML =
    "";


  if (
    entries.length === 0
  ) {

    noLivestreams.classList.remove(
      "hidden"
    );

  } else {

    noLivestreams.classList.add(
      "hidden"
    );


    entries.forEach(
      (entry) => {

        livestreamList.appendChild(
          createLivestreamItem(
            entry
          )
        );

      }
    );

  }


  /*
    TOTAL FINAL
  */

  finalPeriodTitle.textContent =
    `${modelName} · ` +
    `${period.title}`;


  finalGross.textContent =
    `${formatMoney(
      totals.gross
    )} Gross`;


  finalModelPayment.textContent =
    formatMoney(
      totals.modelPay
    );


  /*
    Scroll hacia resultados.
  */

  resultsSection.scrollIntoView({
    behavior: "smooth",
    block: "start"
  });

}


/* =========================================================
   21. CARGAR DATOS
   ========================================================= */

async function loadPaymentData() {

  const currentMonthSelection =
    monthSelect.value;


  refreshBtn.disabled =
    true;


  searchBtn.disabled =
    true;


  refreshBtn.textContent =
    "Actualizando...";


  clearStatus();


  try {

    /*
      REPORTS ES EL DATO PRINCIPAL.

      Si reports falla, no podemos
      calcular pagos.
    */

    const reportsResponse =
      await fetch(
        REPORTS_URL,
        {
          cache: "no-store"
        }
      );


    if (
      !reportsResponse.ok
    ) {

      throw new Error(
        `No se pudieron cargar los reportes. HTTP ${reportsResponse.status}`
      );

    }


    const reportsData =
      await reportsResponse.json();


    reports =
      Array.isArray(
        reportsData
      )
        ? reportsData
        : [];


    /*
      SCHEDULES ES COMPLEMENTARIO.

      Lo usamos principalmente para
      obtener originalDate.

      Si falla schedules, la página
      continúa funcionando utilizando
      report.date.
    */

    try {

      const schedulesResponse =
        await fetch(
          SCHEDULES_URL,
          {
            cache: "no-store"
          }
        );


      if (
        schedulesResponse.ok
      ) {

        const schedulesData =
          await schedulesResponse.json();


        schedules =
          Array.isArray(
            schedulesData
          )
            ? schedulesData
            : [];

      } else {

        console.warn(
          "No se pudieron cargar schedules:",
          schedulesResponse.status
        );


        schedules = [];

      }


    } catch (
      scheduleError
    ) {

      console.warn(
        "Error cargando schedules:",
        scheduleError
      );


      schedules = [];

    }


    /*
      Preparamos la información.
    */

    buildPaymentEntries();


    populateMonthSelect();


    /*
      Restauramos el mes seleccionado
      si todavía existe.
    */

    if (
      currentMonthSelection
    ) {

      const optionExists =
        Array
          .from(
            monthSelect.options
          )
          .some(
            (option) =>
              option.value ===
              currentMonthSelection
          );


      if (
        optionExists
      ) {

        monthSelect.value =
          currentMonthSelection;

      }

    }


    console.log(
      "Livestream Payments cargado:"
    );


    console.log(
      "Reports:",
      reports.length
    );


    console.log(
      "Schedules:",
      schedules.length
    );


    console.log(
      "Payment entries:",
      paymentEntries.length
    );


  } catch (error) {

    console.error(
      "Error cargando pagos:",
      error
    );


    reports = [];

    schedules = [];

    paymentEntries = [];


    showError(
      error.message ||
      "No se pudo cargar la información de pagos."
    );


  } finally {

    refreshBtn.disabled =
      false;


    searchBtn.disabled =
      false;


    refreshBtn.textContent =
      "Actualizar";

  }

}


/* =========================================================
   22. LIMPIAR STATUS
   ========================================================= */

function clearStatus() {

  statusEl.textContent =
    "";


  statusEl.className =
    "status";

}


/* =========================================================
   23. MOSTRAR ERROR
   ========================================================= */

function showError(
  message
) {

  statusEl.textContent =
    message;


  statusEl.className =
    "status error";

}


/* =========================================================
   24. BOTÓN VER RESULTADOS
   ========================================================= */

searchBtn.addEventListener(
  "click",
  () => {

    renderResults();

  }
);


/* =========================================================
   25. BOTÓN ACTUALIZAR
   ========================================================= */

refreshBtn.addEventListener(
  "click",
  async () => {

    await loadPaymentData();


    /*
      Si ya están seleccionados
      los tres filtros, volvemos
      a calcular automáticamente.
    */

    if (
      modelSelect.value &&
      monthSelect.value &&
      fortnightSelect.value
    ) {

      renderResults();

    }

  }
);


/* =========================================================
   26. CAMBIO DE MODELO
   ========================================================= */

modelSelect.addEventListener(
  "change",
  () => {

    /*
      Ocultamos resultados viejos
      hasta volver a consultar.
    */

    resultsSection.classList.add(
      "hidden"
    );


    emptyState.classList.remove(
      "hidden"
    );


    clearStatus();

  }
);


/* =========================================================
   27. CAMBIO DE MES
   ========================================================= */

monthSelect.addEventListener(
  "change",
  () => {

    resultsSection.classList.add(
      "hidden"
    );


    emptyState.classList.remove(
      "hidden"
    );


    clearStatus();

  }
);


/* =========================================================
   28. CAMBIO DE QUINCENA
   ========================================================= */

fortnightSelect.addEventListener(
  "change",
  () => {

    resultsSection.classList.add(
      "hidden"
    );


    emptyState.classList.remove(
      "hidden"
    );


    clearStatus();

  }
);


/* =========================================================
   29. CARGA INICIAL
   ========================================================= */

loadPaymentData();