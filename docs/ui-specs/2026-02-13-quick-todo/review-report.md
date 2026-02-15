# Code Review Report - Quick-To-Do

**Datum:** 2026-02-13
**Branch:** feature/quick-todo
**Reviewer:** Claude (Opus)

## Review Summary

**Geprüfte Commits:** 6
**Geprüfte Dateien:** 8 (Implementation) + 6 (Spec/Docs)
**Gefundene Issues:** 4

| Schweregrad | Anzahl |
|-------------|--------|
| Critical | 0 |
| Major | 1 |
| Minor | 3 |

## Geprüfte Dateien

| Datei | Status | Bewertung |
|-------|--------|-----------|
| `agent-os-ui/ui/src/components/aos-quick-todo-modal.ts` | New | OK |
| `agent-os-ui/ui/src/utils/image-upload.utils.ts` | New | OK (Minor) |
| `agent-os-ui/src/server/backlog-item-storage.ts` | New | OK |
| `agent-os-ui/src/server/routes/quick-todo.routes.ts` | New | OK |
| `agent-os-ui/ui/src/app.ts` | Modified | OK |
| `agent-os-ui/ui/src/components/aos-context-menu.ts` | Modified | OK |
| `agent-os-ui/src/server/index.ts` | Modified | OK |
| `agent-os-ui/ui/src/styles/theme.css` | Modified | OK |

## Issues

### Major

#### M-001: Hardcoded color value in CSS
**Datei:** `agent-os-ui/ui/src/styles/theme.css`
**Zeile:** `.quick-todo-modal__save-btn:hover:not(:disabled)` - Zeilen mit `background-color: #7c3aed` und `border-color: #7c3aed`
**Beschreibung:** Hardcoded hex Farbwert `#7c3aed` anstelle einer CSS Custom Property. Das gesamte Projekt nutzt CSS Custom Properties für Farben (z.B. `var(--color-accent-secondary)`). Dieser Wert sollte als Variable definiert oder eine bestehende Variable referenzieren, um Konsistenz im Dark Theme sicherzustellen.
**Empfehlung:** Ersetzen durch eine bestehende CSS Variable oder eine neue `--color-accent-secondary-hover` definieren.

### Minor

#### m-001: Re-Export von StagedImage Type über Indirektion
**Datei:** `agent-os-ui/ui/src/utils/image-upload.utils.ts:1,58`
**Beschreibung:** `StagedImage` wird aus `chat-view.js` importiert (Zeile 1) und dann in Zeile 58 re-exportiert. Dieser Type lebt in einem View-Modul und wird nun von einem Utility genutzt. Dies schafft eine ungewöhnliche Abhängigkeitsrichtung (Utility → View). Idealerweise sollte der Type in einem shared Types-Modul liegen.
**Empfehlung:** Bei zukünftiger Refaktorierung den `StagedImage` Type in ein eigenes Types-File verschieben. Kein Blocker für Merge.

#### m-002: Fehlende Validierung der `description` Länge im Backend
**Datei:** `agent-os-ui/src/server/routes/quick-todo.routes.ts`
**Beschreibung:** Der `title` wird auf Pflichtfeld validiert, die `description` wird aber ohne Längenprüfung akzeptiert. Das Frontend begrenzt auf `maxlength="1000"`, aber es fehlt eine serverseitige Validierung.
**Empfehlung:** Optional: Server-seitige Längenvalidierung für `description` hinzufügen (z.B. max 2000 Zeichen) als Defense-in-Depth.

#### m-003: Doppelte Filename-Extension bei Image-Speicherung
**Datei:** `agent-os-ui/src/server/backlog-item-storage.ts:104-106`
**Beschreibung:** `sanitizeFilename()` entfernt die Extension vom Original-Dateinamen, dann wird eine neue Extension basierend auf dem MIME-Type angehängt. Wenn eine Datei z.B. `photo.jpeg` heißt, wird daraus `photo.jpg` - was korrekt ist. Aber wenn eine Datei `my.photo.jpeg` heißt, wird nur `.jpeg` entfernt und dann `.jpg` angehängt → `my-photo.jpg`. Dies ist nicht wirklich ein Bug, aber ein Edge Case. Kein Handlungsbedarf.

## Architektur & Patterns

### Positiv
- **BEM-Naming in CSS:** Durchgehend korrekt angewandt (`quick-todo-modal__header`, `quick-todo-modal__save-btn`)
- **Lit Component Patterns:** `createRenderRoot() { return this; }` für Light DOM konsistent mit bestehenden Komponenten
- **Event-basierte Kommunikation:** Custom Events (`quick-todo-saved`, `modal-close`) für lose Kopplung
- **Atomic Index-Write:** `backlog-item-storage.ts` verwendet Temp-File + Rename für atomisches Schreiben
- **Path Traversal Prevention:** `sanitizeFilename()` nutzt `basename()` und entfernt gefährliche Zeichen
- **MIME-Type Whitelist:** Sowohl Frontend als auch Backend validieren erlaubte Bildformate
- **Focus Trap:** Modal implementiert korrekte Tab-Navigation für Accessibility
- **Overlay Click to Close:** Korrekte Implementierung mit `e.target === e.currentTarget` Check
- **Drag & Drop:** Saubere Implementation mit `dragover`/`dragleave`/`drop` Event Handling
- **Guard Clauses:** Modal-Guards in `handleContextMenu` verhindern gleichzeitiges Öffnen mehrerer Modals
- **Body Size Limit:** Express Router hat `30mb` Limit für Base64-Bilder konfiguriert

### TypeScript Strict Mode
- **Keine `any` Types** in neuen Dateien
- Korrekte Typisierung für Request/Response Interfaces
- Korrekte Type Guards und Type Assertions
- Einziger TS-Fehler: Pre-existenter `chat-view.ts` CSSResultGroup Mismatch (nicht durch dieses Feature verursacht)

### Sicherheit
- **Path Traversal:** `basename()` + Character Sanitization in `sanitizeFilename()` - ausreichend
- **XSS:** Lit Templates nutzen automatisches HTML-Escaping
- **Input Validation:** Serverseitige Validierung für Pflichtfelder und Priority-Enum
- **File Type Validation:** MIME-Type Whitelist auf beiden Seiten (Client + Server)
- **Base64 Decoding:** Korrekte Data-URL Prefix Entfernung

## Empfehlungen

1. **M-001 beheben:** Hardcoded `#7c3aed` durch CSS Variable ersetzen
2. **Langfristig:** `StagedImage` Type in shared Types-Modul extrahieren (m-001)
3. **Optional:** Server-seitige Längenvalidierung für `description` (m-002)

## Fazit

**Review bestanden mit Anmerkungen.**

Der Code ist insgesamt gut strukturiert, sicher und konsistent mit dem bestehenden Codebase-Style. Ein Major Issue (hardcoded Farbwert) und drei Minor Issues wurden identifiziert. Keines der Issues ist ein Blocker für den Merge. Das Major Issue (M-001) sollte idealerweise vor dem Merge behoben werden, ist aber kein funktionales Problem.
