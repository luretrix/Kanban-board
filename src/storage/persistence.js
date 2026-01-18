// src/storage/persistence.js
import { isTauri, loadTauriPersistence } from "./tauriBridge";

let _ready = null;

async function ready() {
  if (_ready) return _ready;
  _ready = (async () => {
    if (!(await isTauri())) {
      throw new Error("Tauri runtime not available");
    }
    const { dialog, fs, Store } = await loadTauriPersistence();
    // FIX: Tauri Store v2 requires Store.load() instead of new Store()
    const settingsStore = await Store.load("settings.json");

    // Bug 11 fix: Import Tauri's path API
    const { dirname, join } = await import("@tauri-apps/api/path");

    return { dialog, fs, settingsStore, dirname, join };
  })();
  return _ready;
}

export async function getDataFilePath() {
  const { settingsStore } = await ready();
  return (await settingsStore.get("dataFilePath")) ?? null;
}

export async function setDataFilePath(path) {
  const { settingsStore } = await ready();
  await settingsStore.set("dataFilePath", path);
  await settingsStore.save();
}

export async function pickExistingDataFile() {
  const { dialog } = await ready();
  const path = await dialog.open({
    multiple: false,
    filters: [{ name: "Kanban data", extensions: ["json"] }],
  });
  return path ?? null;
}

export async function createNewDataFile() {
  const { dialog } = await ready();
  const path = await dialog.save({
    filters: [{ name: "Kanban data", extensions: ["json"] }],
    defaultPath: "kanban_data.json",
  });
  return path ?? null;
}

export function makeDefaultData() {
  return {
    schemaVersion: 1,
    updatedAt: new Date().toISOString(),
    columns: {},
  };
}

// Bug 4 fix: Håndter korrupt JSON
export async function loadDataFile(path) {
  const { fs } = await ready();
  const ok = await fs.exists(path);
  if (!ok) return null;

  const txt = await fs.readTextFile(path);

  try {
    return JSON.parse(txt);
  } catch (e) {
    console.error(`Failed to parse JSON from ${path}:`, e);
    throw new Error(`Corrupt data file: ${path}. JSON parsing failed: ${e.message}`);
  }
}

function pad2(n) {
  return String(n).padStart(2, "0");
}

function backupName() {
  const d = new Date();
  const stamp =
    d.getFullYear() +
    "-" +
    pad2(d.getMonth() + 1) +
    "-" +
    pad2(d.getDate()) +
    "_" +
    pad2(d.getHours()) +
    "-" +
    pad2(d.getMinutes()) +
    "-" +
    pad2(d.getSeconds());

  return `kanban_backup_${stamp}.json`;
}

export async function saveDataFileAtomic(path, data, opts = {}) {
  const { fs } = await ready();

  const payload = JSON.stringify(
    { ...data, updatedAt: new Date().toISOString() },
    null,
    2
  );

  // Skriv hovedfil
  await fs.writeTextFile(path, payload, { create: true });

  // Backup kun hvis eksplisitt bedt om
  if (opts.createBackup) {
    await createBackup(path, payload, opts.keepBackups ?? 50);
  }
}

// Separat funksjon for backup
async function createBackup(path, payload, keepBackups) {
  const { fs, dirname, join } = await ready();

  try {
    const dir = await dirname(path);
    const backupsDir = await join(dir, "backups");

    // Opprett backup-mappe hvis den ikke finnes
    const dirExists = await fs.exists(backupsDir);
    if (!dirExists) {
      await fs.mkdir(backupsDir, { recursive: true });
    }

    const backupPath = await join(backupsDir, backupName());
    await fs.writeTextFile(backupPath, payload, { create: true });

    // Roter backups
    const entries = await fs.readDir(backupsDir);
    if (!Array.isArray(entries)) return;

    const files = entries
      .filter((e) => e.isFile && e.name?.endsWith(".json"))
      .sort((a, b) => (a.name < b.name ? 1 : -1));

    const toDelete = files.slice(keepBackups);
    for (const f of toDelete) {
      try {
        await fs.remove(await join(backupsDir, f.name));
      } catch (removeErr) {
        console.error(`Failed to remove backup ${f.name}:`, removeErr);
      }
    }
  } catch (err) {
    console.error("Backup failed:", err);
  }
}



