// ===== CONFIG GENERAL =====
const MAX_MONTHS = 12;

let SCHEDULES = [];
let REPORTS = [];
let monthlyRows = [];

let chartAmount = null;
let chartViews = null;

// ===== UTILIDADES FECHA / HORA =====

function parseHourMinute(str) {
  if (!str) return null;
  const s = String(str).trim().toUpperCase();
  // Formatos tipo "10:30 PM", "9 PM", "21:30"
  const m = s.match(/^(\d{1,2})(?::(\d{2}))?\s*(AM|PM)?$/);
  let h, min;

  if (m) {
    h = parseInt(m[1], 10);
    min = parseInt(m[2] || "0", 10);
    const ampm = m[3];

    if (ampm === "PM" && h < 12) h += 12;
    if (ampm === "AM" && h === 12) h = 0;
  } else {
    const parts = s.split(":");
    h = parseInt(parts[0], 10);
    min = parseInt(parts[1] || "0", 10);
  }

  if (isNaN(h) || isNaN(min)) return null;
  return { h, m: min };
}

function computeMinutesBetween(startStr, endStr) {
  const s = parseHourMinute(startStr);
  const e = parseHourMinute(endStr);
  if (!s || !e) return 0;

  const startMin = s.h * 60 + s.m;
  const endMin = e.h * 60 + e.m;
  const diff = endMin - startMin;
  return diff > 0 ? diff : 0;
}

function isNightHour(hour) {
  // 18:00–05:59 => Noche
  return hour >= 18 || hour < 6;
}

function prettyMonth(ym) {
  // "2026-02" => "Feb 2026"
  if (!ym || ym.length < 7) return ym || "";
  const [y, m] = ym.split("-");
  const idx = parseInt(m, 10) - 1;
  const names = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];
  return `${names[idx] || m} ${y}`;
}

// ===== CARGA DE DATA =====

function scheduleKey(modelName, date, start) {
  return `${modelName}__${date || "nodate"}__${start || "nostart"}`;
}

function getReportForSchedule(modelName, date, start) {
  return (
    REPORTS.find(
      (r) =>
        r.modelName === modelName &&
        r.date === date &&
        (r.start || "") === (start || "")
    ) || null
  );
}

function loadData() {
  Promise.all([
    fetch("/api/model-schedule").then((r) => r.json()),
    fetch("/api/reports").then((r) => r.json()),
  ])
    .then(([schedules, reports]) => {
      SCHEDULES = schedules || [];
      REPORTS = reports || [];
      buildMonthlyRows();
      initFilters();
      renderAll();
    })
    .catch((err) => {
      console.error("Error cargando datos:", err);
      const tbody = document.querySelector("#monthly-table tbody");
      if (tbody) {
        tbody.innerHTML =
          '<tr><td colspan="8">Error cargando datos.</td></tr>';
      }
      const cardsRow = document.getElementById("cards-row");
      if (cardsRow) cardsRow.innerHTML = "";
    });
}

// ===== AGRUPACIÓN POR MODELO + MES =====

function buildMonthlyRows() {
  const groups = new Map();

  SCHEDULES.forEach((sch) => {
    const model = sch.modelName || "Sin nombre";
    const date = sch.date || "";
    if (!date) return; // sin fecha no podemos sacar mes

    const month = date.slice(0, 7); // YYYY-MM
    const start = sch.start || "";

    const report = getReportForSchedule(model, date, start) || {};
    const collected = Number(report.collectedAmount || 0);
    const views = Number(report.views || 0);

    let isNight = false;
    const hm = parseHourMinute(start);
    if (hm) {
      isNight = isNightHour(hm.h);
    }

    const minutes =
      report.end && start
        ? computeMinutesBetween(start, report.end)
        : 0;

    const key = `${model}__${month}`;
    let row = groups.get(key);
    if (!row) {
      row = {
        modelName: model,
        month,
        totalAmount: 0,
        totalViews: 0,
        totalMinutes: 0,
        streams: 0,
        dayStreams: 0,
        nightStreams: 0,
      };
      groups.set(key, row);
    }

    row.totalAmount += collected;
    row.totalViews += views;
    row.totalMinutes += minutes;
    row.streams += 1;
    if (isNight) row.nightStreams++;
    else row.dayStreams++;
  });

  let rows = Array.from(groups.values());

  // Limitar a últimos N meses
  const allMonths = Array.from(new Set(rows.map((r) => r.month))).sort();
  const allowedMonths = allMonths.slice(-MAX_MONTHS);
  rows = rows.filter((r) => allowedMonths.includes(r.month));

  rows.sort((a, b) => {
    if (a.month === b.month) return a.modelName.localeCompare(b.modelName);
    return a.month.localeCompare(b.month);
  });

  monthlyRows = rows;
}

// ===== FILTROS (MODELO + PERIODOS) =====

function initFilters() {
  const modelSelect = document.getElementById("model-select");
  const baseSelect = document.getElementById("period-base");
  const compareSelect = document.getElementById("period-compare");

  if (!modelSelect || !baseSelect || !compareSelect) return;

  // Modelos
  const models = Array.from(
    new Set(monthlyRows.map((r) => r.modelName))
  ).sort();

  modelSelect.innerHTML =
    '<option value="_all">Todos los modelos</option>' +
    models.map((m) => `<option value="${m}">${m}</option>`).join("");

  // Meses disponibles
  const months = Array.from(
    new Set(monthlyRows.map((r) => r.month))
  ).sort();

  baseSelect.innerHTML = months
    .map((m) => `<option value="${m}">${prettyMonth(m)}</option>`)
    .join("");

  compareSelect.innerHTML = months
    .map((m) => `<option value="${m}">${prettyMonth(m)}</option>`)
    .join("");

  // Por defecto: último como comparado, penúltimo como base (si existe)
  if (months.length) {
    const last = months[months.length - 1];
    compareSelect.value = last;
    if (months.length >= 2) {
      baseSelect.value = months[months.length - 2];
    } else {
      baseSelect.value = last;
    }
  }

  modelSelect.onchange = renderAll;
  baseSelect.onchange = renderAll;
  compareSelect.onchange = renderAll;
}

// ===== RENDER GENERAL =====

function renderAll() {
  if (!monthlyRows.length) return;

  const modelSelect = document.getElementById("model-select");
  const baseSelect = document.getElementById("period-base");
  const compareSelect = document.getElementById("period-compare");
  const model = modelSelect ? modelSelect.value : "_all";
  const baseMonth = baseSelect ? baseSelect.value : "";
  const compareMonth = compareSelect ? compareSelect.value : "";

  updateCards(model, baseMonth, compareMonth);
  updateCharts(model);
  renderTable(model);
}

// ===== AGREGADORES =====

function aggregateFor(model, month) {
  const rows = monthlyRows.filter(
    (r) =>
      (model === "_all" || r.modelName === model) &&
      (!month || r.month === month)
  );

  return rows.reduce(
    (acc, r) => {
      acc.amount += r.totalAmount;
      acc.views += r.totalViews;
      acc.minutes += r.totalMinutes;
      acc.streams += r.streams;
      return acc;
    },
    { amount: 0, views: 0, minutes: 0, streams: 0 }
  );
}

function formatMinutes(mins) {
  if (!mins) return "0 min";
  const h = Math.floor(mins / 60);
  const m = Math.round(mins % 60);
  if (h <= 0) return `${m} min`;
  return `${h}h ${m}m`;
}

function formatDiff(newVal, oldVal, suffix) {
  const diff = newVal - oldVal;
  if (!oldVal && !newVal) return { text: "Sin cambio", cls: "neutral" };
  if (!oldVal && newVal > 0) return { text: `+∞ ${suffix}`, cls: "positive" };

  const pct = ((diff / oldVal) * 100).toFixed(1);
  if (diff > 0) return { text: `+${pct}% vs base`, cls: "positive" };
  if (diff < 0) return { text: `${pct}% vs base`, cls: "negative" };
  return { text: `= Igual que base`, cls: "neutral" };
}

// ===== CARDS (COMPARACIÓN) =====

function updateCards(model, baseMonth, compareMonth) {
  const cardsRow = document.getElementById("cards-row");
  const labelEl = document.getElementById("compare-period-label");
  if (!cardsRow) return;

  const baseAgg = aggregateFor(model, baseMonth);
  const compAgg = aggregateFor(model, compareMonth);

  if (labelEl) {
    labelEl.textContent = `Comparando ${prettyMonth(
      compareMonth
    )} vs ${prettyMonth(baseMonth)} ${
      model === "_all" ? "(todos los modelos)" : `(${model})`
    }`;
  }

  const diffAmount = formatDiff(compAgg.amount, baseAgg.amount, "$");
  const diffViews = formatDiff(compAgg.views, baseAgg.views, "views");
  const diffMinutes = formatDiff(compAgg.minutes, baseAgg.minutes, "min");
  const diffStreams = formatDiff(compAgg.streams, baseAgg.streams, "shows");

  cardsRow.innerHTML = `
    <div class="card">
      <div class="card-label">Monto total</div>
      <div class="card-main">$${compAgg.amount.toFixed(2)}</div>
      <div class="card-secondary">Base: $${baseAgg.amount.toFixed(2)}</div>
      <div class="card-diff ${diffAmount.cls}">${diffAmount.text}</div>
    </div>

    <div class="card">
      <div class="card-label">Views</div>
      <div class="card-main">${compAgg.views}</div>
      <div class="card-secondary">Base: ${baseAgg.views}</div>
      <div class="card-diff ${diffViews.cls}">${diffViews.text}</div>
    </div>

    <div class="card">
      <div class="card-label">Tiempo online</div>
      <div class="card-main">${formatMinutes(compAgg.minutes)}</div>
      <div class="card-secondary">Base: ${formatMinutes(baseAgg.minutes)}</div>
      <div class="card-diff ${diffMinutes.cls}">${diffMinutes.text}</div>
    </div>

    <div class="card">
      <div class="card-label">Streams</div>
      <div class="card-main">${compAgg.streams}</div>
      <div class="card-secondary">Base: ${baseAgg.streams}</div>
      <div class="card-diff ${diffStreams.cls}">${diffStreams.text}</div>
    </div>
  `;
}

// ===== GRÁFICAS =====

function updateCharts(model) {
  const months = Array.from(
    new Set(monthlyRows.map((r) => r.month))
  ).sort();

  const labels = [];
  const amountData = [];
  const viewsData = [];

  months.forEach((m) => {
    const agg = aggregateFor(model, m);
    labels.push(prettyMonth(m));
    amountData.push(agg.amount);
    viewsData.push(agg.views);
  });

  const amountCtx = document.getElementById("chart-amount");
  const viewsCtx = document.getElementById("chart-views");
  if (!amountCtx || !viewsCtx) return;

  if (!chartAmount) {
    chartAmount = new Chart(amountCtx, {
      type: "bar",
      data: {
        labels,
        datasets: [
          {
            label: "Monto ($)",
            data: amountData,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          x: {
            ticks: { color: "#f7f7ff" },
          },
          y: {
            ticks: { color: "#f7f7ff" },
          },
        },
        plugins: {
          legend: {
            labels: { color: "#f7f7ff" },
          },
        },
      },
    });
  } else {
    chartAmount.data.labels = labels;
    chartAmount.data.datasets[0].data = amountData;
    chartAmount.update();
  }

  if (!chartViews) {
    chartViews = new Chart(viewsCtx, {
      type: "bar",
      data: {
        labels,
        datasets: [
          {
            label: "Views",
            data: viewsData,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          x: {
            ticks: { color: "#f7f7ff" },
          },
          y: {
            ticks: { color: "#f7f7ff" },
          },
        },
        plugins: {
          legend: {
            labels: { color: "#f7f7ff" },
          },
        },
      },
    });
  } else {
    chartViews.data.labels = labels;
    chartViews.data.datasets[0].data = viewsData;
    chartViews.update();
  }
}

// ===== TABLA DETALLE =====

function renderTable(model) {
  const tbody = document.querySelector("#monthly-table tbody");
  if (!tbody) return;

  const rows = monthlyRows.filter(
    (r) => model === "_all" || r.modelName === model
  );

  if (!rows.length) {
    tbody.innerHTML =
      '<tr><td colspan="8">Sin datos para ese filtro.</td></tr>';
    return;
  }

  tbody.innerHTML = rows
    .map((r) => {
      const timeStr = formatMinutes(r.totalMinutes);
      return `
        <tr>
          <td>${r.modelName}</td>
          <td>${prettyMonth(r.month)}</td>
          <td>$${r.totalAmount.toFixed(2)}</td>
          <td>${r.totalViews}</td>
          <td>${timeStr}</td>
          <td>${r.streams}</td>
          <td><span class="badge badge-day">${r.dayStreams}</span></td>
          <td><span class="badge badge-night">${r.nightStreams}</span></td>
        </tr>
      `;
    })
    .join("");
}

// ===== INIT =====
loadData();
