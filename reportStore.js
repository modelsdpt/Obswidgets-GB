const fs = require("fs").promises;
const path = require("path");

const DATA_DIR = path.join(__dirname, "data");
const FILE_PATH = path.join(DATA_DIR, "reports.json");

async function ensureFile() {
  try {
    await fs.mkdir(DATA_DIR, { recursive: true });
    await fs.access(FILE_PATH);
  } catch {
    await fs.writeFile(FILE_PATH, "[]", "utf-8");
  }
}

async function getAllReports() {
  await ensureFile();
  const raw = await fs.readFile(FILE_PATH, "utf-8");
  try {
    const data = JSON.parse(raw);
    return Array.isArray(data) ? data : [];
  } catch (e) {
    console.error("Error parseando reports.json, reseteando:", e);
    await fs.writeFile(FILE_PATH, "[]", "utf-8");
    return [];
  }
}

async function findReportForModel(modelName, date, start) {
  const all = await getAllReports();
  return (
    all.find(
      (r) =>
        r.modelName === modelName &&
        r.date === date &&
        (r.start || "") === (start || "")
    ) || null
  );
}


async function saveReport(entry) {
  const all = await getAllReports();

  const idx = all.findIndex(
    (r) =>
      r.modelName === entry.modelName &&
      r.date === entry.date &&
      (r.start || "") === (entry.start || "")
  );

  if (idx >= 0) {
    all[idx] = { ...all[idx], ...entry };
  } else {
    all.push(entry);
  }

  await writeReports(all); // el helper que uses para persistir
}

async function deleteReportForModel(modelName, date, start) {
  const all = await getAllReports();
  const filtered = all.filter(
    (r) =>
      !(
        r.modelName === modelName &&
        r.date === date &&
        (r.start || "") === (start || "")
      )
  );
  await writeReports(filtered);
}


module.exports = {
  getAllReports,
  findReportForModel,
  saveReport,
  deleteReportForModel,
};
