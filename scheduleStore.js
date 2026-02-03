const fs = require("fs").promises;
const path = require("path");

const DATA_DIR = path.join(__dirname, "data");
const FILE_PATH = path.join(DATA_DIR, "schedules.json");

async function ensureFile() {
  try {
    await fs.mkdir(DATA_DIR, { recursive: true });
    await fs.access(FILE_PATH);
  } catch {
    await fs.writeFile(FILE_PATH, "[]", "utf-8");
  }
}

async function writeSchedules(data) {
  await fs.writeFile(FILE_PATH, JSON.stringify(data, null, 2), "utf-8");
}

async function getAllSchedules() {
  await ensureFile();
  const raw = await fs.readFile(FILE_PATH, "utf-8");
  try {
    const data = JSON.parse(raw);
    return Array.isArray(data) ? data : [];
  } catch (e) {
    console.error("Error parseando schedules.json, reseteando:", e);
    await fs.writeFile(FILE_PATH, "[]", "utf-8");
    return [];
  }
}

// Si llamas solo con modelName, te busca la primera coincidencia.
// Si llamas con (modelName, date, start), busca por la “llave completa”.
async function findScheduleForModel(modelName, date, start) {
  const all = await getAllSchedules();

  if (date && start) {
    return (
      all.find(
        (s) =>
          s.modelName === modelName &&
          s.date === date &&
          (s.start || "") === (start || "")
      ) || null
    );
  }

  return all.find((s) => s.modelName === modelName) || null;
}

// upsert por (modelName + date + start)
async function saveSchedule(entry) {
  const all = await getAllSchedules();

  const idx = all.findIndex(
    (s) =>
      s.modelName === entry.modelName &&
      s.date === entry.date &&
      (s.start || "") === (entry.start || "")
  );

  if (idx >= 0) {
    all[idx] = { ...all[idx], ...entry };
  } else {
    all.push(entry);
  }

  await writeSchedules(all);
}

async function deleteScheduleForModel(modelName, date, start) {
  const all = await getAllSchedules();
  const filtered = all.filter(
    (s) =>
      !(
        s.modelName === modelName &&
        s.date === date &&
        (s.start || "") === (start || "")
      )
  );
  await writeSchedules(filtered);
}

module.exports = {
  getAllSchedules,
  findScheduleForModel,
  saveSchedule,
  deleteScheduleForModel,
};
