# Kanban Board - Prosjektdokumentasjon

## Oversikt
Desktop Kanban-board applikasjon for prosjektstyring.

## Tech Stack
- **Frontend:** React 19, Vite 6, Tailwind CSS 4
- **Desktop:** Tauri 2 (Rust backend)
- **Lagring:** JSON-filer (brukervalgt lokasjon)

## Viktige filer
- `src/App.jsx` - Hovedkomponent, state management, autosave
- `src/storage/persistence.js` - Fil I/O, Tauri Store, backup
- `src/storage/tauriBridge.js` - Tauri API integrasjon
- `src/config/options.js` - Konfigurasjon (kolonner, prioriteter, etc.)
- `src-tauri/capabilities/default.json` - Tauri permissions

## Arkitektur-beslutninger

### Autosave
- Lagrer umiddelbart ved hver endring (ingen debounce)
- Bruker `stableStringify()` for konsistent JSON-sammenligning
- `lastSavedColumnsRef` tracker sist lagrede data for å unngå duplikater
- `isSavingRef` lås forhindrer race conditions

### Backup
- Backup opprettes KUN ved manuell "Lagre"-knapp, ikke ved autosave
- Backups lagres i `backups/` undermappe
- Roterer og beholder maks 200 backups

### Tauri v2 API
- `Store.load()` i stedet for `new Store()`
- `fs.mkdir()` i stedet for `fs.createDir()`
- Permissions må ha egen scope per operasjon i `capabilities/default.json`

### Drag & Drop
- Bruker `draggedItemRef` (ref, ikke state) for å unngå re-renders
- Komponenter wrapped med `React.memo`
- Handlers wrapped med `useCallback`

## Kjente patterns
- `didHydrateRef` - settes til true etter initial datalasting
- `columnsRef` - synkronisert med columns state for bruk i async funksjoner
- `stableStringify()` - rekursiv JSON-stringifying med sorterte nøkler

## Kommandoer
```bash
npm run dev          # Vite dev server
npm run tauri:dev    # Full Tauri app (bruk denne)
npm run tauri:build  # Produksjonsbygg
```

## Vite config
- JSON-filer ignoreres i watch for å unngå reload ved lagring

## Tips
- Datafil bør ligge UTENFOR prosjektmappen (f.eks. Documents)
- Kan legges i OneDrive/Dropbox for synk mellom maskiner
