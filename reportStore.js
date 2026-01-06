// Backend/reportStore.js
const fs = require("fs/promises");
const path = require("path");

const DB_PATH = path.join(__dirname, "data", "reports.json");

async function loadAll() {
  try {
    const content = await fs.readFile(DB_PATH, "utf8");
    if (!content.trim()) return [];
    return JSON.parse(content);
  } catch (err) {
    if (err.code === "ENOENT") return [];
    console.error("Error leyendo reports.json:", err);
    return [];
  }
}

async function saveAll(list) {
  const json = JSON.stringify(list, null, 2);
  await fs.writeFile(DB_PATH, json, "utf8");
}

async function getAllReports() {
  return loadAll();
}

// por ahora 1 reporte por modelo (suficiente para tu flujo actual)
async function findReportForModel(modelName) {
  const all = await loadAll();
  return all.find((r) => r.modelName === modelName) || null;
}

// upsert por modelName
async function saveReport(entry) {
  const all = await loadAll();
  const idx = all.findIndex((r) => r.modelName === entry.modelName);

  if (idx >= 0) {
    all[idx] = entry;
  } else {
    all.push(entry);
  }

  await saveAll(all);
}

module.exports = {
  getAllReports,
  findReportForModel,
  saveReport,
};
