# Implementation Plan: Unified Kanban Board

**Status:** APPROVED
**Created:** 2026-02-13
**Spec:** 2026-02-13-unified-kanban-board

---

## Executive Summary

Die bestehende `aos-kanban-board` Komponente (aktuell nur Spec-spezifisch) wird via `mode`-Property (`spec` | `backlog`) und optionalen Feature-Flag Properties generisch gemacht. Dadurch kann das inline Backlog-Kanban-Rendering in `dashboard-view.ts` (ca. 250 Zeilen duplizierten Rendering-Codes) durch ein einziges `<aos-kanban-board mode="backlog">` ersetzt werden. Der Backlog erhält alle 5 Spalten und nutzt die gleiche hochwertige `aos-story-card` Komponente.

---

## Architektur-Entscheidungen

### Gewählter Ansatz

**Mode-Property Pattern mit Feature-Flag Properties** - Die bestehende `aos-kanban-board` Komponente wird um `mode: 'spec' | 'backlog'` und individuelle Boolean Properties (`showChat`, `showSpecViewer`, `showGitStrategy`, `showAutoMode`) erweitert.

### Begründung

1. Das Kanban Board ist bereits eine ausgereifte Komponente (1640 Zeilen) mit Drag&Drop, Workflow-Integration, Auto-Mode, Chat-Sidebar und Spec-Viewer. Duplikation wäre verschwenderisch.
2. Der Mode-Property-Ansatz ist minimalinvasiv: Bestehendes Spec-Verhalten bleibt als Default erhalten, Backlog-Verhalten wird nur bei explizitem Opt-in aktiviert.
3. Die Alternative (Shared Base Class oder Higher-Order Component) würde 1640 Zeilen umstrukturieren - unverhältnismäßiger Aufwand.

### Patterns & Technologien

- **Pattern:** Property-driven Conditional Rendering (bestehendes Lit-Pattern im Codebase)
- **Technologie:** Lit reactive Properties, TypeScript Union Types
- **Datenfluss:** `dashboard-view.ts` bleibt Orchestrator. Es mappt Backlog-Daten zu `KanbanBoard`-Objekten via Adapter, übergibt sie an `aos-kanban-board`, und handhabt zurückkommende Events.

---

## Komponenten-Übersicht

### Neue Komponenten

Keine. Dieses Feature nutzt ausschließlich bestehende Komponenten.

### Zu ändernde Komponenten

| Komponente | Pfad | Änderungsart | Grund |
|------------|------|--------------|-------|
| `aos-kanban-board` | `ui/src/components/kanban-board.ts` | Erweitern | `mode`-Property + Feature-Flag Properties + Conditional Rendering |
| `aos-story-card` | `ui/src/components/story-card.ts` | Erweitern | `in_review` zu StoryInfo Status-Union hinzufügen |
| `aos-story-status-badge` | `ui/src/components/story-status-badge.ts` | Erweitern | `in-review` Status-Support hinzufügen |
| `BacklogReader` | `src/server/backlog-reader.ts` | Erweitern | `BacklogStoryInfo` um `dorComplete`, `dependencies`, `blocked`/`in_review` erweitern |
| `dashboard-view.ts` | `ui/src/views/dashboard-view.ts` | Refactoring (Remove + Replace) | Inline Backlog-Rendering entfernen, durch `<aos-kanban-board mode="backlog">` ersetzen |
| `theme.css` | `ui/src/styles/theme.css` | Aufräumen | Backlog-spezifische Kanban-CSS-Styles entfernen |
| `websocket.ts` | `src/server/websocket.ts` | Minimal | `blocked`/`in_review` Statuses in Backlog-Handler akzeptieren |

### Nicht betroffen (explizit)

- **Chat sidebar** (`aos-spec-chat.ts`) - Wird in Backlog-Mode ausgeblendet, keine Änderungen
- **Git strategy dialog** (`git-strategy-dialog.ts`) - Wird in Backlog-Mode ausgeblendet
- **Spec viewer** (`aos-docs-viewer.ts`, `aos-spec-file-tabs.ts`) - Wird in Backlog-Mode ausgeblendet
- **WebSocket-Protokoll** - `backlog.story.start` bleibt distinkt von `workflow.story.start`

---

## Komponenten-Verbindungen (KRITISCH)

### Verbindungs-Matrix

| Source | Target | Verbindungsart | Zuständige Story | Validierung |
|--------|--------|----------------|-------------------|-------------|
| `BacklogReader.getKanbanBoard()` | `dashboard-view` (via WebSocket) | WebSocket `backlog.kanban` | Story 3 (Backend) | Response enthält `dorComplete`/`dependencies` Felder |
| `dashboard-view.backlogKanbanAsStandard` | `aos-kanban-board` | Lit Property Binding `.kanban` | Story 4 (Dashboard) | Adapter mappt `BacklogKanbanBoard` → `KanbanBoard` |
| `aos-kanban-board` (backlog mode) | `aos-story-card` | Lit Property Binding `.story` | Story 2 (Properties) | Story Card rendert Backlog-Items mit StoryInfo Interface |
| `aos-kanban-board` | `dashboard-view` | Custom Events `story-move`, `story-select`, `auto-mode-toggle` | Story 5 (Event Routing) | Dashboard routet zu korrekten WebSocket-Messages basierend auf Mode |
| `dashboard-view` | WebSocket `backlog.story.start` / `backlog.story-status` | `gateway.send()` | Story 5 (Event Routing) | Korrekter Message-Type basierend auf `viewMode` |

### Verbindungs-Checkliste
- [x] Jede geänderte Komponente hat mindestens eine Verbindung definiert
- [x] Jede Verbindung ist einer Story zugeordnet
- [x] Validierungskriterien sind definiert

---

## Umsetzungsphasen

### Phase 1: Backend Data Model Alignment
**Ziel:** `BacklogStoryInfo` produziert Daten kompatibel mit `StoryInfo`
**Komponenten:** `backlog-reader.ts`, `websocket.ts`
**Abhängig von:** Nichts (Startphase)

- `BacklogStoryInfo` Interface erweitern: `dorComplete: boolean` (immer `true`), `dependencies: string[]` (immer `[]`)
- Status-Union erweitern um `blocked` und `in_review`
- `BacklogKanbanBoard` um `specId: 'backlog'` erweitern
- `websocket.ts`: `blocked` und `in_review` als gültige Zielstatuses akzeptieren

### Phase 2: Frontend Type Unification
**Ziel:** Einziges `StoryInfo` Interface für Spec und Backlog
**Komponenten:** `story-card.ts`, `kanban-board.ts`, `story-status-badge.ts`
**Abhängig von:** Phase 1

- `in_review` zu `StoryInfo.status` Union in `story-card.ts` hinzufügen
- `in_review` Mapping in `getEffectiveStatus()` hinzufügen
- `in-review` Status in `story-status-badge.ts` unterstützen (gelbes Badge)
- Doppelte `StoryInfo` Export-Situation konsolidieren

### Phase 3: Kanban Board Generalization
**Ziel:** `aos-kanban-board` funktioniert in `spec` und `backlog` Mode
**Komponenten:** `kanban-board.ts`
**Abhängig von:** Phase 2

- `mode: 'spec' | 'backlog'` Property hinzufügen (Default: `'spec'`)
- Feature-Flag Properties: `showChat`, `showSpecViewer`, `showGitStrategy`, `showAutoMode`
- Conditional Rendering: Chat-Button, Spec-Docs-Button, Chat-Sidebar, Spec-Viewer-Modal, Git-Strategy-Dialog
- `connectedCallback()`: Feature-Handler nur bei Bedarf initialisieren
- Header: Im Backlog-Mode "Backlog" statt Spec-Name, angepasster Back-Button

### Phase 4: Dashboard Integration
**Ziel:** Inline Backlog-Rendering durch `<aos-kanban-board mode="backlog">` ersetzen
**Komponenten:** `dashboard-view.ts`, `theme.css`
**Abhängig von:** Phase 3

- Adapter-Getter `backlogKanbanAsStandard` erstellen (mappt `BacklogKanbanBoard` → `KanbanBoard`)
- `renderBacklogView()` nutzt `<aos-kanban-board mode="backlog">`
- Entfernen: `renderBacklogKanban()`, `renderBacklogColumn()`, `renderBacklogStoryCard()`, `handleBacklogStoryDragStart/End()`, `handleBacklogDragOver()`, `handleBacklogDrop()`
- `theme.css`: Obsolete Backlog-Kanban-CSS entfernen

### Phase 5: Event Routing & Auto-Mode Integration
**Ziel:** Backlog-spezifische Events werden korrekt durch das generische Board geroutet
**Komponenten:** `kanban-board.ts`, `dashboard-view.ts`
**Abhängig von:** Phase 3, Phase 4

- Kanban-Board emittiert gleiche Events unabhängig vom Mode
- `dashboard-view.ts` checkt `viewMode === 'backlog'` in Event-Handlern und routet zu korrekten WebSocket-Messages
- Backlog Auto-Mode: Bestehende `handleBacklogAutoMode*` Handler an Kanban-Board Events anschließen
- Guard: Im Backlog-Mode niemals `specs.*` WebSocket-Endpoints aufrufen

---

## Abhängigkeiten

### Interne Abhängigkeiten
```
story-card.ts StoryInfo ──used by──> kanban-board.ts (muss zuerst vereinheitlicht werden)
backlog-reader.ts ──produces data for──> kanban-board.ts (via dashboard-view Adapter)
kanban-board.ts ──emits events to──> dashboard-view.ts (muss nach Mode routen)
```

### Externe Abhängigkeiten
Keine. Alle Änderungen sind intern an bestehenden Komponenten.

---

## Risiken & Mitigationen

| Risiko | Wahrscheinlichkeit | Impact | Mitigation |
|--------|-------------------|--------|------------|
| Doppelte StoryInfo Exports verursachen Type-Confusion | Medium | Medium | Konsolidierung zu Single Export in `story-card.ts`, Re-export aus `kanban-board.ts` |
| Backlog Auto-Mode bricht weil Events anders routen | Medium | High | Bestehende `backlogAutoMode*` Handler in dashboard-view wiederverwenden |
| Entfernung des Inline-Backlog-Renderings bricht Backlog-Story-Detail-View | Low | High | `backlog-story` View-Mode ist separat vom Kanban, nicht betroffen |
| `specId: 'backlog'` Sentinel-Wert triggert versehentlich Spec-spezifische Backend-Calls | Medium | High | Guard in kanban-board: wenn `mode === 'backlog'`, niemals `specs.*` Endpoints aufrufen |

---

## Self-Review Ergebnisse

### Validiert
- Alle 6 Functional Requirements (FR-1 bis FR-6) sind adressiert
- Der Ansatz bewahrt 100% der bestehenden Spec-Kanban-Funktionalität
- Backlog erhält alle 5 Spalten statt aktuell 3
- `aos-story-card` wird für Backlog-Items wiederverwendet
- Code-Reduktion: ca. 250 Zeilen Inline-Rendering und 80 Zeilen D&D-Handler aus dashboard-view entfernt

### Identifizierte Probleme & Lösungen

| Problem | Ursprünglicher Plan | Verbesserung |
|---------|---------------------|--------------|
| Zwei verschiedene `StoryInfo` Interfaces | Beide behalten eigene Version | Vereinheitlichung in `story-card.ts` mit `in_review` Status; `kanban-board.ts` re-exportiert |
| `BacklogKanbanBoard` hat kein `specId` Feld | Neues Interface erstellen | Adapter in dashboard-view erstellt `KanbanBoard` aus `BacklogKanbanBoard` mit `specId: 'backlog'` |
| Event-Routing unterschiedlich für Spec vs Backlog | Kanban-Board emittiert verschiedene Events pro Mode | Gleiche Events, dashboard-view checkt `viewMode` für Routing - einfacher, weniger Kopplung |
| `canMoveToInProgress()` Validierung unpassend für Backlog | Komplett umgehen im Backlog-Mode | dorComplete immer true, deps immer leer - Validierung passt natürlich, kein Bypass nötig |

---

## Minimalinvasiv-Optimierungen

### Wiederverwendbare Elemente

| Element | Gefunden in | Nutzbar für |
|---------|-------------|-------------|
| `aos-story-card` (Drag&Drop, Model-Selector, Status-Badge) | `story-card.ts` | Backlog-Items - ersetzt 40-Zeilen `renderBacklogStoryCard()` |
| `canMoveToInProgress()` Validierung | `kanban-board.ts` | Backlog-Items passieren natürlich (dorComplete=true, deps=[]) |
| `renderColumn()` Methode (5-Spalten-Layout) | `kanban-board.ts` | Backlog bekommt 5 Spalten gratis |
| Auto-Mode Toggle + Progress Display | `kanban-board.ts` | Backlog Auto-Mode nutzt gleiche UI |
| Drop-Zone Validierung (Visual Feedback) | `kanban-board.ts` | Backlog bekommt gleiche Drag&Drop-UX |

### Optimierungen

| Ursprünglich | Optimiert zu | Ersparnis |
|--------------|-------------|-----------|
| Separates Backlog-Rendering in dashboard-view | Einziges `<aos-kanban-board mode="backlog">` | ~250 Zeilen entfernt |
| Separate Backlog D&D Handler | Kanban-Board's eingebautes D&D mit Validierung | ~80 Zeilen entfernt |
| Separates CSS für Backlog-Kanban in theme.css | Kanban-Board's Scoped CSS | ~30 Zeilen entfernt |
| Zwei separate Auto-Mode Implementierungen | Kanban-Board's Auto-Mode mit Dashboard-Routing | ~50 Zeilen Duplikation entfernt |

### Feature-Preservation Checkliste
- [x] Alle Requirements aus der Clarification sind abgedeckt
- [x] Kein Feature wurde geopfert
- [x] Alle Akzeptanzkriterien bleiben erreichbar

---

## Proposed User Stories

1. **Story 1: StoryInfo Interface vereinheitlichen** (Phase 2) - Doppeltes StoryInfo Interface konsolidieren, `in_review` Status hinzufügen
2. **Story 2: Kanban Board Properties und Conditional Rendering** (Phase 3) - `mode`, `showChat`, `showSpecViewer`, `showGitStrategy`, `showAutoMode` Properties + bedingte Darstellung
3. **Story 3: Backend Backlog-Datenmodell erweitern** (Phase 1) - `dorComplete`, `dependencies`, erweiterte Status-Union in `BacklogStoryInfo`
4. **Story 4: Dashboard Backlog-Rendering durch aos-kanban-board ersetzen** (Phase 4) - Adapter-Getter, aos-kanban-board Nutzung, Inline-Code entfernen
5. **Story 5: Event-Routing und Auto-Mode Integration** (Phase 5) - Korrekte WebSocket-Message-Routing, Backlog Auto-Mode anbinden
6. **Story 6: CSS Cleanup** (Phase 4 cont.) - Obsolete Backlog-Kanban-Styles aus theme.css entfernen
