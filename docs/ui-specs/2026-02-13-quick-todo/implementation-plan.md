# Implementation Plan: Quick-To-Do

**Created:** 2026-02-13
**Status:** PENDING_USER_REVIEW
**Spec:** 2026-02-13-quick-todo

---

## Executive Summary

Quick-To-Do fügt einen leichtgewichtigen Erfassungs-Flow zum Kontextmenü hinzu, der es ermöglicht, Backlog-Items mit optionalen Bildern zu erstellen - ohne einen Workflow zu starten. Es wird ein neues Modal (`aos-quick-todo-modal`), ein neuer Backend REST-Endpoint und ein neuer Kontextmenü-Eintrag eingeführt, die sich nahtlos in die bestehende App-Architektur einfügen.

## Architecture Decisions

**AD-1: Eigenständiges Modal (NICHT Workflow-basiert)**
Das bestehende `aos-create-spec-modal` leitet durch den Workflow-Executor, der eine Claude Code Terminal-Session startet. Quick-To-Do nutzt dieses Pattern NICHT. Stattdessen wird direkt per REST-API gespeichert. Kein AI-Involvement, nur Datenpersistenz.

**AD-2: REST-Endpoint statt WebSocket für Erstellung**
Bestehende Backlog-Operationen laufen über WebSocket. Quick-To-Do enthält jedoch Bild-Uploads, die besser über einen REST-Endpoint mit JSON-Body (Base64-encoded Images) funktionieren. Das bestehende `image-upload.routes.ts` zeigt dieses Pattern bereits.

**AD-3: Wiederverwendung der Image-Handling-Patterns aus chat-view**
`StagedImage`-Interface, `ALLOWED_MIME_TYPES`, Validierung, Paste/Drag-Drop-Handling aus `chat-view.ts` werden wiederverwendet. Die bestehende `aos-image-staging-area` Komponente wird für Thumbnails genutzt.

**AD-4: Light DOM für CSS-Vererbung**
Alle Komponenten im Projekt nutzen `createRenderRoot() { return this; }`. Die neue Modal-Komponente folgt diesem Pattern.

**AD-5: Bild-Speicherpfad**
Bilder werden in `agent-os/backlog/items/attachments/ITEM-XXX/` gespeichert, NICHT im Chat-Images-Ordner. Neue `BacklogItemStorageService` Klasse auf dem Backend.

**AD-6: backlog-index.json Initialisierung**
Backend erstellt `backlog-index.json` und Ordnerstruktur automatisch, falls nicht vorhanden.

## Component Overview

| # | Komponente | Typ | Pfad | Status | Beschreibung |
|---|-----------|------|------|--------|-------------|
| 1 | `aos-quick-todo-modal` | Lit Component | `ui/src/components/aos-quick-todo-modal.ts` | NEU | Modal mit Formular, Bild-Upload, Keyboard-Shortcuts |
| 2 | `aos-context-menu` | Lit Component | `ui/src/components/aos-context-menu.ts` | MODIFY | 5. Menüeintrag "Quick-To-Do" |
| 3 | `AosApp` | Lit Component | `ui/src/app.ts` | MODIFY | Quick-To-Do Modal State, Import, Handler, Render |
| 4 | `quick-todo.routes.ts` | Express Router | `src/server/routes/quick-todo.routes.ts` | NEU | REST-Endpoint POST /api/backlog/:projectPath/quick-todo |
| 5 | `backlog-item-storage.ts` | Service | `src/server/backlog-item-storage.ts` | NEU | Atomische Erstellung von Backlog-Item (Index + MD + Bilder) |
| 6 | `index.ts` | Server Entry | `src/server/index.ts` | MODIFY | Neue Route registrieren |
| 7 | `theme.css` | Stylesheet | `ui/src/styles/theme.css` | MODIFY | Quick-To-Do Modal Styles |
| 8 | `image-upload.utils.ts` | Utility | `ui/src/utils/image-upload.utils.ts` | NEU | Extrahierte Image-Handling-Funktionen (Validierung, Lesen) |
| 9 | `aos-image-staging-area` | Lit Component | `ui/src/components/aos-image-staging-area.ts` | UNVERÄNDERT | Bestehend, wird im Modal wiederverwendet |
| 10 | `gateway.ts` | Gateway | `ui/src/gateway.ts` | MINIMAL | Optional: Backlog-Refresh nach REST-Erstellung |

## Komponenten-Verbindungen

| Source | Target | Verbindungstyp | Richtung | Zuständige Story |
|--------|--------|----------------|----------|------------------|
| `aos-context-menu` | `AosApp` | Custom Event `menu-item-select` → `action: 'quick-todo'` | Source → Target | QTD-001 |
| `AosApp` | `aos-quick-todo-modal` | Property `.open`, Events `@modal-close`, `@quick-todo-saved` | Bidirektional | QTD-001 |
| `aos-quick-todo-modal` | `image-upload.utils.ts` | Function Import (Validierung, File-Reading) | Import | QTD-002 |
| `aos-quick-todo-modal` | `aos-image-staging-area` | Property `.images`, Event `@image-removed` | Bidirektional | QTD-002 |
| `aos-quick-todo-modal` | REST `/api/backlog/.../quick-todo` | HTTP POST (fetch) | Request/Response | QTD-003 |
| `quick-todo.routes.ts` | `backlog-item-storage.ts` | Service-Aufruf `createQuickTodoItem()` | Import | QTD-003 |
| `backlog-item-storage.ts` | Filesystem | Write backlog-index.json, MD-Datei, Bilder | I/O | QTD-003 |
| `AosApp` (on `@quick-todo-saved`) | Toast | `showToast()` Aufruf | Direkt | QTD-004 |

## Implementation Phases

### Phase 1: Frontend - Modal + Kontextmenü (QTD-001, QTD-002)

**QTD-001: Kontextmenü-Integration + Modal-Shell**
- `aos-context-menu.ts`: 5. Menüeintrag "Quick-To-Do" hinzufügen
- `app.ts`: State `showQuickTodoModal`, Handler, Import, Render
- `aos-quick-todo-modal.ts`: Neue Lit-Komponente mit Formular (Titel, Beschreibung, Priorität)
- `theme.css`: Modal-Styles

**QTD-002: Bild-Upload im Modal**
- `image-upload.utils.ts`: Extrahierte Bild-Funktionen (Validierung, readFileAsDataUrl)
- `aos-quick-todo-modal.ts`: Paste, Drag & Drop, File-Input, `aos-image-staging-area` Integration
- Thumbnail-Vorschau mit Entfernen-Button, Zähler "3/5"

### Phase 2: Backend - API + Speicherung (QTD-003)

**QTD-003: Backend REST-Endpoint + Storage Service**
- `backlog-item-storage.ts`: Service für atomische Item-Erstellung
- `quick-todo.routes.ts`: POST-Endpoint mit Validierung
- `index.ts`: Route registrieren
- Ordnerstruktur automatisch erstellen wenn nötig

### Phase 3: Integration + Polish (QTD-004)

**QTD-004: End-to-End Integration + UX-Polish**
- Modal Save-Handler: Formular → REST-API → Feedback
- Toast-Notification bei Erfolg
- Error-Handling bei Fehlern
- Loading-State auf Save-Button
- Backlog-Refresh nach Speichern

## Dependencies

```
QTD-001 (Kontextmenü + Modal) → QTD-002 (Bilder) → QTD-003 (Backend) → QTD-004 (Integration)
```

Sequentiell, da jede Story auf der vorherigen aufbaut. QTD-003 könnte theoretisch parallel zu QTD-002 entwickelt werden, aber die lineare Reihenfolge ist sicherer.

## Risks & Mitigations

| Risiko | Impact | Wahrscheinlichkeit | Mitigation |
|--------|--------|---------------------|------------|
| `backlog-index.json` existiert nicht | Backend-Fehler | Hoch | Graceful Initialization: Ordner + leere Datei automatisch erstellen |
| Base64-Bilder überschreiten Express Body-Limit | 413 Error | Hoch | `express.json({ limit: '30mb' })` speziell für Quick-To-Do Route |
| Enter-Taste im Textarea löst Save aus | Unerwartetes Verhalten | Mittel | Save nur wenn aktives Element NICHT die Textarea ist |
| Mehrere Modals gleichzeitig offen | UI-Konflikt | Mittel | `showQuickTodoModal` zu Guard in `handleContextMenu()` hinzufügen |

## Self-Review Results

**1. VOLLSTÄNDIGKEIT** - Alle 6 Requirements abgedeckt: Kontextmenü (Req 1), Modal (Req 2), Bild-Upload (Req 3), Speicherung (Req 4), Backend-API (Req 5), Toast (Req 6).

**2. KONSISTENZ** - Keine Widersprüche. Alle Patterns folgen bestehender Architektur (Light DOM, CSS BEM, Event-Naming).

**3. RISIKEN** - Größtes Risiko ist die fehlende backlog-index.json. Mitigiert durch automatische Initialisierung. Kein Risiko für bestehende Funktionalität da vollständig additiv.

**4. ALTERNATIVEN** - WebSocket statt REST abgelehnt (Image-Upload besser per REST). MCP-Tool abgelehnt (für Agent-Kontext, nicht für direkte UI-Operationen). Wiederverwendung des Workflow-Modals abgelehnt (zu stark gekoppelt an Workflow-Executor).

**5. KOMPONENTEN-VERBINDUNGEN** - Alle Komponenten verbunden. Alle Verbindungen einer Story zugeordnet. Kein verwaister Komponent.

## Minimal-Invasive Optimizations

1. **`aos-image-staging-area` direkt wiederverwendet** - Keine Modifikation nötig. Akzeptiert `StagedImage[]`, feuert `image-removed`.

2. **CSS Overlay-Pattern wiederverwendet** - Gleiche `.modal-overlay` Klasse wie `create-spec-modal`.

3. **Minimale `app.ts` Änderungen** - Nur 4 Ergänzungen: eine State-Variable, ein Import, ein Case im Switch, eine Komponente im Render. Folgt exakt dem bestehenden Modal-Pattern.

4. **Image-Utils als optionale Extraktion** - Falls Dateianzahl minimal gehalten werden soll, können die ~30 Zeilen Image-Konstanten/Funktionen direkt im Modal inline sein statt eine separate Utils-Datei zu erstellen.

5. **Feature-Preservation Checklist:**
   - [x] Alle Requirements aus Clarification abgedeckt
   - [x] Kein Feature wurde geopfert
   - [x] Alle Akzeptanzkriterien bleiben erreichbar

---

*Plan erstellt mit Agent OS /create-spec v3.4*
