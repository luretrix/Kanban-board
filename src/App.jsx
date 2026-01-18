import { getCurrentWebviewWindow } from "@tauri-apps/api/webviewWindow";

import { isTauri } from "./storage/tauriBridge";

import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import {
  createNewDataFile,
  getDataFilePath,
  loadDataFile,
  pickExistingDataFile,
  saveDataFileAtomic,
  setDataFilePath,
  makeDefaultData,
} from "./storage/persistence";


// import { useMemo, useState } from "react";




import Board from "./components/Board";
import TaskDrawer from "./components/TaskDrawer";


import {
  COMPANIES,
  COMPANY_DEFAULT_ID,
  COMPANY_FILTER_ALL_ID,
  PRIORITY_DEFAULT_ID,
  WORKTYPE_DEFAULT_ID,
  COLUMNS,
  DEFAULT_COLUMN_ID,
} from "./config/options";

// Hjelpefunksjon for stabil JSON sammenligning (sorterer nøkler rekursivt)
const stableStringify = (obj) => {
  if (obj === null || obj === undefined) return String(obj);
  if (typeof obj !== 'object') return JSON.stringify(obj);
  if (Array.isArray(obj)) {
    return '[' + obj.map(item => stableStringify(item)).join(',') + ']';
  }

  const keys = Object.keys(obj).sort();
  const parts = keys.map(key => {
    return JSON.stringify(key) + ':' + stableStringify(obj[key]);
  });
  return '{' + parts.join(',') + '}';
};


function App() {
  // Build columns from config (single source of truth)
  const [columns, setColumns] = useState(() => {
    const base = {};
    for (const c of COLUMNS) {
      base[c.id] = { name: c.label, items: [] };
    }

    // Optional demo tasks (safe to delete)
    base.inbox?.items?.push({
      id: "1",
      title: "Bytt turbo Subaru",
      notes: "",
      obstacles: "",
      priority: "high",
      workType: "maintenance",
      company: COMPANY_DEFAULT_ID,
      estimate: { value: 3, unit: "d" },
      scheduledStart: null,
      checklist: [],
      progressPct: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    base.todo?.items?.push({
      id: "2",
      title: "Ring leverandør",
      notes: "",
      obstacles: "",
      priority: "low",
      workType: "admin",
      company: "pa_plass_as",
      estimate: { value: 30, unit: "m" },
      scheduledStart: null,
      checklist: [],
      progressPct: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    base.blocked?.items?.push({
      id: "3",
      title: "Bestille deler til fres",
      notes: "",
      obstacles: "Mangler deleliste / delenr. fra manual.",
      priority: "medium",
      workType: "maintenance",
      company: "alt_det_andre",
      estimate: { value: 1, unit: "h" },
      scheduledStart: null,
      checklist: [],
      progressPct: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    return base;
  });

  // Drag/drop optimization: use ref to avoid re-renders during drag
  const draggedItemRef = useRef(null);

  // filter
  const [companyFilter, setCompanyFilter] = useState(COMPANY_FILTER_ALL_ID);

  // drawer
  const [selectedTaskId, setSelectedTaskId] = useState(null);
  const [drawerMode, setDrawerMode] = useState("view"); // "view" | "create"


  const [dataFilePath, setDataFilePathState] = useState(null);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isCreatingFile, setIsCreatingFile] = useState(false);
  const [isOpeningFile, setIsOpeningFile] = useState(false);
  const didHydrateRef = useRef(false);
  const isSavingRef = useRef(false); // Bug 2 fix: lås for å forhindre race conditions
  const columnsRef = useRef(columns); // Bug 1 fix: ref for siste versjon av columns
  const lastSavedColumnsRef = useRef(null); // Sporer sist lagret data for å unngå unødvendig lagring

  // Bug 1 & 2 fix: Sync columnsRef og bruk lås
  useEffect(() => {
    columnsRef.current = columns;
  }, [columns]);

  const flushSaveNow = async () => {
    if (!didHydrateRef.current) return;
    if (!(await isTauri())) return;
    if (!dataFilePath) return;

    // Bug 2 fix: Sjekk om lagring pågår - vent istedenfor å skippe
    let attempts = 0;
    while (isSavingRef.current && attempts < 10) {
      await new Promise(resolve => setTimeout(resolve, 50));
      attempts++;
    }

    // Hvis fortsatt låst etter 500ms, gi opp
    if (isSavingRef.current) {
      console.log("Save already in progress, skipping after timeout");
      return;
    }

    try {
      isSavingRef.current = true;
      await saveDataFileAtomic(
        dataFilePath,
        { schemaVersion: 1, columns: columnsRef.current },
        { createBackup: true, keepBackups: 50 }
      );
      // Oppdater lastSaved siden vi nettopp lagret - bruk stabil sammenligning
      lastSavedColumnsRef.current = stableStringify(columnsRef.current);
    } catch (e) {
      console.error("Flush save failed:", e);
    } finally {
      isSavingRef.current = false;
    }
  };
  
  // Column styling (extendable)
  const columnStyles = {
    inbox: {
      header: "bg-gradient-to-r from-zinc-600 to-zinc-500",
      border: "border-zinc-500",
    },
    todo: {
      header: "bg-gradient-to-r from-blue-600 to-blue-400",
      border: "border-blue-400",
    },
    inProgress: {
      header: "bg-gradient-to-r from-yellow-600 to-yellow-400",
      border: "border-yellow-400",
    },
    blocked: {
      header: "bg-gradient-to-r from-rose-700 to-rose-500",
      border: "border-rose-500",
    },
    done: {
      header: "bg-gradient-to-r from-green-600 to-green-400",
      border: "border-green-400",
    },
  };


  // Ingen close handler nødvendig - autosave lagrer ved hver endring
  


  useEffect(() => {
    (async () => {
      if (!(await isTauri())) {
        didHydrateRef.current = true;
        return;
      }

      try {
        const path = await getDataFilePath();

        // ✅ alltid oppdater state slik UI viser det
        setDataFilePathState(path ?? null);

        if (!path) {
          // Ingen fil lagret, la brukeren velge
          didHydrateRef.current = true;
          return;
        }

        // Prøv å laste filen
        const data = await loadDataFile(path);
        if (data?.columns) {
          setColumns(data.columns);
          // Oppdater lastSaved for å unngå at autosave lagrer samme data tilbake - bruk stabil sammenligning
          lastSavedColumnsRef.current = stableStringify(data.columns);
        }

        didHydrateRef.current = true;
      } catch (e) {
        console.error("Startup load failed:", e);
        // BUG 1 FIX: Vis kun feilmelding hvis vi faktisk hadde en path å laste
        const currentPath = await getDataFilePath().catch(() => null);
        if (currentPath) {
          const errorMsg = e?.message || String(e);
          alert(`Kunne ikke laste datafil:\n${errorMsg}\n\nVennligst velg en ny datafil i innstillinger.`);
        }
        // Nullstill path så brukeren kan velge ny fil
        setDataFilePathState(null);
        await setDataFilePath(null);
        didHydrateRef.current = true;
      }
    })();
  }, []);
  




  // Autosave UTEN debounce - umiddelbar lagring ved endring
  useEffect(() => {
    // Ikke lagre før vi har lastet inn data
    if (!didHydrateRef.current) {
      console.log("[Autosave] Skipped - not hydrated yet");
      return;
    }

    // Må ha en aktiv fil valgt
    if (!dataFilePath) {
      console.log("[Autosave] Skipped - no dataFilePath");
      return;
    }

    // Ikke lagre hvis drag pågår
    if (draggedItemRef.current) {
      console.log("[Autosave] Skipped - drag in progress");
      return;
    }

    // Stabil JSON sammenligning - sammenlign med sist lagret
    const columnsJson = stableStringify(columns);
    if (columnsJson === lastSavedColumnsRef.current) {
      console.log("[Autosave] Skipped - no changes detected (stable comparison)");
      return;
    }

    // Sjekk om lagring allerede pågår
    if (isSavingRef.current) {
      console.log("[Autosave] Skipped - save in progress");
      return;
    }

    // Umiddelbar lagring
    (async () => {
      // Dobbeltsjekk Tauri
      if (!(await isTauri())) return;

      try {
        isSavingRef.current = true;
        console.log("[Autosave] Starting save...");

        // Oppdater lastSaved FØR lagring for å unngå duplikate kall
        lastSavedColumnsRef.current = stableStringify(columnsRef.current);

        await saveDataFileAtomic(
          dataFilePath,
          { schemaVersion: 1, columns: columnsRef.current }
        );
        console.log("[Autosave] Save completed successfully");
      } catch (e) {
        console.error("[Autosave] Save failed:", e);
        // Ved feil, nullstill lastSaved slik at neste endring prøver igjen
        lastSavedColumnsRef.current = null;
      } finally {
        isSavingRef.current = false;
      }
    })();
  }, [columns, dataFilePath]);
  


  // ----- Drag & Drop -----
  // Drag/drop optimization: use useCallback to prevent re-renders
  const handleDragStart = useCallback((columnId, item) => {
    draggedItemRef.current = { columnId, item };
  }, []);

  const handleDragOver = useCallback((e) => {
    e.preventDefault();
  }, []);

  // Bug 3 fix: Deep copy for immutable pattern
  // Drag/drop optimization: use useCallback and ref to avoid re-renders
  const handleDrop = useCallback((e, targetColumnId) => {
    e.preventDefault();
    const draggedItem = draggedItemRef.current;
    if (!draggedItem) return;

    const { columnId: sourceColumnId, item } = draggedItem;

    // Alltid nullstill draggedItem
    draggedItemRef.current = null;

    // Samme kolonne - ingenting å gjøre
    if (sourceColumnId === targetColumnId) {
      return;
    }

    // Flytt item til ny kolonne
    setColumns((prevColumns) => ({
      ...prevColumns,
      [sourceColumnId]: {
        ...prevColumns[sourceColumnId],
        items: prevColumns[sourceColumnId].items.filter((i) => i.id !== item.id),
      },
      [targetColumnId]: {
        ...prevColumns[targetColumnId],
        items: [...prevColumns[targetColumnId].items, item],
      },
    }));
  }, []);

  // ----- Tasks CRUD -----
  const removeTask = (columnId, taskId) => {
    const updatedColumns = { ...columns };

    updatedColumns[columnId].items = updatedColumns[columnId].items.filter(
      (item) => item.id !== taskId
    );

    setColumns(updatedColumns);

    if (selectedTaskId === taskId) setSelectedTaskId(null);
  };

  const findTaskById = (taskId) => {
    for (const columnId of Object.keys(columns)) {
      const found = columns[columnId].items.find((t) => t.id === taskId);
      if (found) return found;
    }
    return null;
  };

  const selectedTask = useMemo(
    () => (selectedTaskId ? findTaskById(selectedTaskId) : null),
    [selectedTaskId, columns]
  );

  const updateTask = (updatedTask) => {
    const updatedColumns = { ...columns };

    for (const columnId of Object.keys(updatedColumns)) {
      updatedColumns[columnId].items = updatedColumns[columnId].items.map((t) =>
        t.id === updatedTask.id ? updatedTask : t
      );
    }

    setColumns(updatedColumns);
  };

  // ----- Create mode -----
  // Bug 13 fix: Changed from useMemo to function to generate fresh timestamps
  const getNewTaskTemplate = () => ({
    id: "NEW",
    title: "",
    notes: "",
    obstacles: "",
    priority: PRIORITY_DEFAULT_ID,
    workType: WORKTYPE_DEFAULT_ID,
    company: COMPANY_DEFAULT_ID,
    estimate: null,
    scheduledStart: null,
    deadline: null,
    checklist: [],
    progressPct: 0,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  });

  const drawerTask =
    drawerMode === "create" ? getNewTaskTemplate() : selectedTask;

  const openCreate = () => {
    setDrawerMode("create");
    setSelectedTaskId("NEW");
  };

  const openExisting = (taskId) => {
    setDrawerMode("view");
    setSelectedTaskId(taskId);
  };

  const saveTaskFromDrawer = (t) => {
    if (!t) return;

    if (drawerMode === "create" || t.id === "NEW") {
      const created = {
        ...t,
        // id: Date.now().toString(),
        id: crypto.randomUUID(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      const updated = { ...columns };
      updated[DEFAULT_COLUMN_ID].items = [
        created,
        ...updated[DEFAULT_COLUMN_ID].items,
      ];
      setColumns(updated);
    } else {
      updateTask({
        ...t,
        updatedAt: new Date().toISOString(),
      });
    }

    setSelectedTaskId(null);
  };

  // ----- Filtering -----
  const filteredColumns = useMemo(() => {
    if (companyFilter === COMPANY_FILTER_ALL_ID) return columns;

    const out = {};
    for (const [colId, col] of Object.entries(columns)) {
      out[colId] = {
        ...col,
        items: col.items.filter(
          (t) => (t.company ?? COMPANY_DEFAULT_ID) === companyFilter
        ),
      };
    }
    return out;
  }, [columns, companyFilter]);

  return (
    <div className="w-full min-h-screen bg-gradient-to-b from-zinc-900 to-zinc-800">

<div className="w-full h-full flex flex-col gap-4 p-6">

        <h1 className="text-6xl font-bold mb-2 text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 via-amber-500 to-rose-400">
          Svein's awsome prosjektstyrings prosjekt - dashboard!
        </h1>

        {/* Company filter (top) */}
{/* Top bar: New task + Company filter */}
<div className="w-full flex flex-col gap-3 mb-2">
  <div className="w-full flex items-center justify-between gap-3">
    <button
      onClick={openCreate}
      className="px-4 py-2 rounded-xl bg-gradient-to-r from-yellow-600 to-amber-500 text-white font-semibold hover:from-yellow-500 hover:to-amber-500 transition"
    >
      + Ny oppgave
    </button>

    <div className="flex flex-wrap items-center justify-end gap-2">
      <button
        onClick={() => setCompanyFilter(COMPANY_FILTER_ALL_ID)}
        className={`px-3 py-1.5 rounded-full text-sm border transition ${
          companyFilter === COMPANY_FILTER_ALL_ID
            ? "bg-amber-500/20 border-amber-400/40 text-amber-200"
            : "bg-zinc-800 border-zinc-700 text-zinc-200 hover:bg-zinc-700"
        }`}
      >
        All
      </button>

      {COMPANIES.map((c) => (
        <button
          key={c.id}
          onClick={() => setCompanyFilter(c.id)}
          className={`px-3 py-1.5 rounded-full text-sm border transition ${
            companyFilter === c.id
              ? "bg-amber-500/20 border-amber-400/40 text-amber-200"
              : "bg-zinc-800 border-zinc-700 text-zinc-200 hover:bg-zinc-700"
          }`}
        >
          {c.label}
        </button>
        
      ))}
    </div>
    <button
      onClick={() => setIsSettingsOpen(true)}
      className="px-3 py-2 rounded-xl bg-zinc-800 border border-zinc-700 text-zinc-200 hover:bg-zinc-700 transition"
      title="Innstillinger"
    >
      ⚙
    </button>
    {isSettingsOpen && (
  <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
    <div
      className="absolute inset-0 bg-black/60"
      onClick={() => setIsSettingsOpen(false)}
    />
    <div className="relative w-full max-w-xl rounded-2xl bg-zinc-900 border border-zinc-700 shadow-2xl overflow-hidden">
      <div className="p-5 border-b border-zinc-800 flex items-center justify-between">
        <div className="text-white font-semibold">Innstillinger</div>
        <button
          onClick={() => setIsSettingsOpen(false)}
          className="px-3 py-2 rounded-md bg-zinc-800 text-zinc-200 hover:bg-zinc-700 transition"
        >
          Lukk
        </button>
      </div>

      <div className="p-5 space-y-4">
        {/* Aktiv datafil - fremhevet boks */}
        <div className="p-4 rounded-lg bg-zinc-800/60 border border-zinc-700">
          <div className="font-semibold text-amber-400 mb-2">Aktiv datafil:</div>
          <div className="break-all text-zinc-300 font-mono text-sm">
            {dataFilePath ? dataFilePath : "Ingen fil valgt - velg eller opprett en datafil nedenfor"}
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            className="px-4 py-2 rounded-lg bg-zinc-800 border border-zinc-700 text-zinc-200 hover:bg-zinc-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
            disabled={isCreatingFile}
            onClick={async () => {
              setIsCreatingFile(true);
              try {
                const path = await createNewDataFile();
                if (!path) return;

                // lag en ny fil med initialdata
                const base = makeDefaultData();
                base.columns = columns; // start med nåværende, eller tomt hvis du vil
                await saveDataFileAtomic(path, base);

                // Oppdater lastSaved siden vi nettopp lagret - bruk stabil sammenligning
                lastSavedColumnsRef.current = stableStringify(columns);

                await setDataFilePath(path);
                setDataFilePathState(path);
                didHydrateRef.current = true;
                setIsSettingsOpen(false);
              } catch (e) {
                console.error("Failed to create file:", e);
                alert(`Kunne ikke opprette fil: ${e?.message || String(e)}`);
              } finally {
                setIsCreatingFile(false);
              }
            }}
          >
            {isCreatingFile ? "Laster..." : "Opprett ny datafil…"}
          </button>

          <button
            className="px-4 py-2 rounded-lg bg-zinc-800 border border-zinc-700 text-zinc-200 hover:bg-zinc-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
            disabled={isOpeningFile}
            onClick={async () => {
              setIsOpeningFile(true);
              try {
                const path = await pickExistingDataFile();
                if (!path) return;

                const data = await loadDataFile(path);
                if (data?.columns) {
                  setColumns(data.columns);
                  // Oppdater lastSaved for å unngå at autosave lagrer samme data tilbake - bruk stabil sammenligning
                  lastSavedColumnsRef.current = stableStringify(data.columns);
                }

                await setDataFilePath(path);
                setDataFilePathState(path);
                didHydrateRef.current = true;

                setIsSettingsOpen(false);
              } catch (e) {
                console.error("Failed to open file:", e);
                alert(`Kunne ikke åpne fil: ${e?.message || String(e)}`);
              } finally {
                setIsOpeningFile(false);
              }
            }}
          >
            {isOpeningFile ? "Laster..." : "Åpne eksisterende…"}
          </button>
        </div>

        <button
  className="px-4 py-2 rounded-lg bg-amber-600 border border-amber-500 text-white font-semibold transition disabled:opacity-50 disabled:cursor-not-allowed hover:enabled:bg-amber-500"
  disabled={!dataFilePath || isSavingRef.current}
  onClick={async () => {
    if (!dataFilePath || isSavingRef.current) return;
    isSavingRef.current = true;

    try {
      await saveDataFileAtomic(
        dataFilePath,
        { schemaVersion: 1, columns: columnsRef.current },
        { createBackup: true, keepBackups: 200 }
      );
      lastSavedColumnsRef.current = stableStringify(columnsRef.current);
      alert("Data lagret!");
    } catch (e) {
      console.error("Save failed:", e);
      alert(`Lagring feilet: ${e?.message || String(e)}`);
    } finally {
      isSavingRef.current = false;
    }
  }}
>
  Lagre
</button>



        <div className="text-xs text-zinc-500">
          Tips: legg datafila i OneDrive/Dropbox hvis du vil synke mellom maskiner
          – appen lagrer alltid direkte til fila.
        </div>
      </div>
    </div>
  </div>
)}

  </div>
</div>


        {/* Main layout: Sidebar + Board */}
{/* Board */}
<div className="w-full min-w-0">
  <div className="overflow-x-auto pb-2">
    <Board
      columns={filteredColumns}
      columnStyles={columnStyles}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
      onRemove={removeTask}
      onOpen={openExisting}
    />
  </div>
</div>



        <TaskDrawer
          isOpen={Boolean(selectedTaskId)}
          task={drawerTask}
          onClose={() => setSelectedTaskId(null)}
          onSave={saveTaskFromDrawer}
        />
      </div>
    </div>
  );
}

export default App;
