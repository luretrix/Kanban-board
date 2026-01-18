// src/storage/tauriBridge.js
export async function isTauri() {
  // Robust: i Tauri finnes __TAURI_INTERNALS__ (v2) eller __TAURI__ (v1/v2)
  return (
    typeof window !== "undefined" &&
    (Boolean(window.__TAURI_INTERNALS__) || Boolean(window.__TAURI__))
  );
}

export async function loadTauriPersistence() {
  const dialog = await import("@tauri-apps/plugin-dialog");
  const fs = await import("@tauri-apps/plugin-fs");
  const storeMod = await import("@tauri-apps/plugin-store");
  return { dialog, fs, Store: storeMod.Store };
}
