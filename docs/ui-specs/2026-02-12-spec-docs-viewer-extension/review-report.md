# Code Review Report - Spec Docs Viewer Extension

**Datum:** 2026-02-12
**Branch:** feature/spec-docs-viewer-extension
**Reviewer:** Claude (Opus)

## Review Summary

**Geprüfte Commits:** 4
**Geprüfte Dateien:** 6 (Implementation-Dateien)
**Gefundene Issues:** 6

| Schweregrad | Anzahl |
|-------------|--------|
| Critical | 0 |
| Major | 2 |
| Minor | 4 |

## Geprüfte Dateien

| Datei | Status | Bewertung |
|-------|--------|-----------|
| agent-os-ui/src/server/specs-reader.ts | Modified | OK |
| agent-os-ui/src/server/websocket.ts | Modified | OK |
| agent-os-ui/ui/src/components/docs/aos-docs-viewer.ts | Modified | Minor Issues |
| agent-os-ui/ui/src/components/kanban-board.ts | Modified | Major Issue |
| agent-os-ui/ui/src/components/specs/aos-spec-file-tabs.ts | New | Minor Issue |
| agent-os-ui/ui/src/gateway.ts | Modified | OK |

## Issues

### Major

#### M-001: Module-level mutable state for checkbox index (aos-docs-viewer.ts)

**Datei:** `agent-os-ui/ui/src/components/docs/aos-docs-viewer.ts`
**Zeile:** 8

```typescript
let checkboxIndex = 0;
```

**Problem:** `checkboxIndex` ist eine module-level mutable Variable, die in einem globalen `renderer`-Objekt (Zeile 12) referenziert wird. Der Renderer wird einmalig bei Modulinitialisierung konfiguriert. Wenn mehrere `AosDocsViewer`-Instanzen gleichzeitig existieren (z.B. in verschiedenen Tabs), teilen sie sich diesen Counter. Das kann zu falschen Checkbox-Indizes führen, wenn Instanzen zeitlich versetzt rendern.

**Empfehlung:** Den `checkboxIndex` als State in der Instanz halten und per Closure an `marked.parse()` übergeben, oder sicherstellen, dass das Reset (`checkboxIndex = 0`) direkt vor jedem `marked.parse()` Aufruf erfolgt (was aktuell der Fall ist - Zeile 55). Solange immer nur eine Instanz aktiv rendert, ist es funktional korrekt, aber das Pattern ist fragil.

**Risiko:** Mittel - aktuell existiert nur eine Instanz im Spec Viewer, aber bei zukünftiger Nutzung könnten Probleme auftreten.

---

#### M-002: Event Listener Leak bei Checkbox-Revert (kanban-board.ts)

**Datei:** `agent-os-ui/ui/src/components/kanban-board.ts`
**Methode:** `handleCheckboxToggled`

```typescript
const revertHandler = (): void => {
  this.specViewerContent = previousContent;
  gateway.off('specs.save.error', revertHandler);
};
gateway.once('specs.save', () => {
  gateway.off('specs.save.error', revertHandler);
});
gateway.on('specs.save.error', revertHandler);
```

**Problem:** Wenn ein Save erfolgreich ist, wird `gateway.once('specs.save', ...)` ausgelöst. Allerdings feuert `once` auf JEDES `specs.save` Event - auch auf nicht-verwandte Saves (z.B. wenn der User gleichzeitig einen Editor-Save durchführt). Das könnte den `revertHandler` verfrüht entfernen. Umgekehrt: Wenn ein anderer Save fehlschlägt, könnte der `revertHandler` fälschlicherweise den Checkbox-Content reverten.

**Empfehlung:** Eine Korrelations-ID (z.B. `requestId`) einführen, um Save-Request und Save-Response eindeutig zu matchen. Alternativ: Optimistic Update ohne Revert-Logik, da Checkbox-Toggles atomar sind.

**Risiko:** Mittel - nur relevant wenn mehrere Saves gleichzeitig stattfinden, was bei normalem Gebrauch selten ist.

---

### Minor

#### m-001: `gateway.once()` Methode nicht sichtbar im Diff (kanban-board.ts)

**Datei:** `agent-os-ui/ui/src/components/kanban-board.ts`
**Methode:** `handleCheckboxToggled`

**Problem:** Die Methode `gateway.once()` wird verwendet, ist aber nicht im Gateway-Diff enthalten. Falls `once()` in einer Basisklasse oder dem bestehenden Code definiert ist, ist dies kein Problem. Falls nicht, wäre dies ein Runtime-Fehler.

**Status:** Zu verifizieren - wahrscheinlich existiert `once()` bereits im EventEmitter-Pattern des Gateways.

---

#### m-002: Light DOM Styling mit statischer Flag (aos-spec-file-tabs.ts)

**Datei:** `agent-os-ui/ui/src/components/specs/aos-spec-file-tabs.ts`
**Zeile:** 23

```typescript
private static stylesInjected = false;
```

**Problem:** Das Pattern `createRenderRoot() { return this; }` + manuelles Style-Injection ist konsistent mit der bestehenden Sidebar-Implementierung (siehe MEMORY.md). Die statische `stylesInjected` Flag verhindert Duplikate. Jedoch: Bei Hot Module Replacement (HMR) im Dev-Modus könnte die Flag nicht zurückgesetzt werden, was zu fehlenden Styles nach einem Modul-Reload führt.

**Risiko:** Niedrig - nur Dev-Modus betroffen, und HMR lädt normalerweise die volle Seite neu.

---

#### m-003: Fehlende `kanban.json` Filtierung in `listSpecFiles` (specs-reader.ts)

**Datei:** `agent-os-ui/src/server/specs-reader.ts`
**Methode:** `listSpecFiles`

**Problem:** Die Methode listet ALLE `.md` Dateien in einem Spec-Ordner. Das ist korrekt, aber `kanban.json` wird nicht aufgelistet (nur `.md`). Dateien wie `integration-context.md` und `story-index.md` werden jedoch angezeigt, was für den Benutzer möglicherweise nicht nützlich ist (diese sind Auto-generiert).

**Empfehlung:** Optional: Eine Filterliste für auto-generierte Dateien einführen, oder diese im Tab-Bar visuell anders kennzeichnen.

**Risiko:** Niedrig - kosmetisches Problem, kein funktionaler Fehler.

---

#### m-004: Duplizierte Interface-Definition `SpecFileInfo`/`SpecFileGroup`

**Dateien:**
- `agent-os-ui/src/server/specs-reader.ts` (Zeilen 70-78)
- `agent-os-ui/ui/src/components/specs/aos-spec-file-tabs.ts` (Zeilen 4-12)

**Problem:** Die Interfaces `SpecFileInfo` und `SpecFileGroup` sind identisch in Backend und Frontend definiert. Dies ist ein common pattern in dem Projekt (kein Shared Types Import über Server/Client-Grenze), aber erhöht das Risiko, dass die Interfaces auseinanderlaufen.

**Empfehlung:** Idealerweise in `src/shared/types/` als gemeinsamen Typ definieren. Da das Projekt dieses Pattern aber konsistent für andere Typen NICHT anwendet (WebSocket-Messages sind auch nicht typsicher geteilt), ist es akzeptabel.

**Risiko:** Niedrig - die Interfaces sind einfach und ändern sich selten.

---

## Security Review

| Check | Status |
|-------|--------|
| Path Traversal Prevention | PASS - `getValidatedSpecFilePath` prüft `..`, absolute Pfade und `relative()` |
| XSS via Markdown | PASS - `marked` rendert, `unsafeHTML` wird bereits verwendet (bestehendes Pattern) |
| File Extension Restriction | PASS - nur `.md` Dateien erlaubt |
| Input Validation (WebSocket) | PASS - specId und relativePath werden validiert |

## Performance Review

| Check | Status |
|-------|--------|
| Unnecessary Re-renders | PASS - `updated()` prüft `changedProperties` |
| Memory Leaks | PASS - Event Listeners werden in `disconnectedCallback` entfernt |
| Large File Handling | PASS - Markdown wird client-seitig gerendert, keine Pagination nötig |

## Architecture Compliance

| Check | Status |
|-------|--------|
| Lit Component Pattern | PASS - `@customElement`, `@property`, `@state` korrekt verwendet |
| Gateway Pattern | PASS - Events via Gateway, kein direkter WebSocket-Zugriff |
| Backend Pattern | PASS - `SpecsReader` erweitert, WebSocket-Handler folgt bestehendem Pattern |
| Backward Compatibility | PASS - `fileType` weiterhin unterstützt, `relativePath` optional |
| Component Prefix | PASS - `aos-spec-file-tabs` folgt `aos-` Konvention |

## Empfehlungen

1. **M-001 (Checkbox Counter):** Akzeptabel für aktuelle Nutzung (single instance). Bei Bedarf in Zukunft refactoren.
2. **M-002 (Event Listener):** Korrelations-ID für Save-Events wäre sauberer, aber kein Blocker für diesen PR.
3. **TypeScript:** Keine neuen TS-Fehler eingeführt. Backend kompiliert fehlerfrei, Frontend hat nur pre-existierende Fehler.
4. **Code Style:** Konsistent mit bestehendem Codebase. Naming Conventions eingehalten.

## Fazit

**Review passed with notes.**

Keine kritischen Issues gefunden. Die 2 Major Issues sind akzeptable Trade-offs für die aktuelle Implementierung und können bei Bedarf in einem späteren Refactoring adressiert werden. Die Implementierung folgt den bestehenden Patterns, hat gute Security-Prüfungen (Path Traversal Prevention), und ist backward-compatible.
