// Backend/scheduleStore.js
const fs = require("fs/promises");
const path = require("path");

const DB_PATH = path.join(__dirname, "data", "schedules.json");

async function loadAll() {
  try {
    const content = await fs.readFile(DB_PATH, "utf8");
    return JSON.parse(content || "[]");
  } catch (err) {
    if (err.code === "ENOENT") return [];
    console.error("Error leyendo schedules.json:", err);
    return [];
  }
}

async function saveAll(list) {
  const json = JSON.stringify(list, null, 2);
  await fs.writeFile(DB_PATH, json, "utf8");
}

async function getAllSchedules() {
  return loadAll();
}

async function findScheduleForModel(modelName) {
  const all = await loadAll();
  return all.find((s) => s.modelName === modelName) || null;
}

async function saveSchedule(entry) {
  const all = await loadAll();

  const idx = all.findIndex((s) => s.modelName === entry.modelName);
  if (idx >= 0) {
    all[idx] = entry;
  } else {
    all.push(entry);
  }

  await saveAll(all);
}

module.exports = {
  getAllSchedules,
  findScheduleForModel,
  saveSchedule,
};
