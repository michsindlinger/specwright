# User Stories - Kanban Auto-Execution

> Spec: kanban-auto-execution
> Created: 2026-01-31
> Last Updated: 2026-01-31
> Status: Ready for Implementation

---

## Overview

Diese Spezifikation implementiert einen **Auto-Mode Toggle** im Kanban Board Header, der die automatische Ausführung aller Stories einer Spec ermöglicht - ähnlich wie das Terminal-Script `auto-execute.sh`, aber direkt in der UI integriert.

### Business Value

- **Effizienz:** Keine manuelle Drag-and-Drop-Aktion pro Story erforderlich
- **Konsistenz:** Gleiche Auto-Execution-Logik wie Terminal-Script
- **Übersicht:** Visueller Fortschritt direkt im UI sichtbar
- **Flexibilität:** UI ergänzt Terminal-Script, ersetzt es nicht

---

## User Stories Summary

| Story ID | Title | Type | Effort | Priority | Dependencies | Status |
|----------|-------|------|--------|----------|--------------|--------|
| KAE-001 | Auto-Mode Toggle Component | Frontend | S | High | None | Backlog |
| KAE-002 | Auto-Execution Engine | Full-Stack | M | High | KAE-001 | Backlog |
| KAE-003 | Progress Summary Display | Frontend | S | Medium | KAE-001, KAE-002 | Backlog |
| KAE-004 | Error Handling Modal | Frontend | S | Medium | KAE-001, KAE-002 | Backlog |
| KAE-005 | Git Strategy Integration | Frontend | S | High | KAE-001, KAE-002 | Backlog |

---

## Dependency Graph

```
KAE-001 (Toggle Component)
    │
    ├──► KAE-002 (Auto-Execution Engine)
    │        │
    │        ├──► KAE-003 (Progress Summary)
    │        │
    │        ├──► KAE-004 (Error Handling)
    │        │
    │        └──► KAE-005 (Git Strategy Integration)
```

**Empfohlene Reihenfolge:**
1. KAE-001 → KAE-002 (kritischer Pfad)
2. KAE-005 (Git Strategy ist für erste Story essenziell)
3. KAE-003, KAE-004 (können parallel entwickelt werden)

---

## Story Details

### KAE-001: Auto-Mode Toggle Component

**Type:** Frontend | **Effort:** S | **Priority:** High

Toggle-Schalter im Kanban Board Header mit On/Off Status und visuellem Feedback.

**Kernfunktionen:**
- @state() `autoModeEnabled: boolean`
- Toggle neben Spec-Titel
- CustomEvent 'auto-mode-toggle'
- Puls-Animation bei aktivem Status

**Dateien:**
- `agent-os-ui/ui/src/components/kanban-board.ts` (Anpassen)

[📄 Vollständige Story](./stories/story-001-auto-mode-toggle-component.md)

---

### KAE-002: Auto-Execution Engine

**Type:** Full-Stack | **Effort:** M | **Priority:** High

Backend-Logik für automatische Story-Queuing und sequentielle Ausführung.

**Kernfunktionen:**
- `getNextReadyStory()` - Findet nächste ausführbare Story
- `processAutoExecution()` - Startet nächste Story
- 2-Sekunden Delay zwischen Story-Completions
- Respektiert Dependencies und DoR-Status

**Dateien:**
- `agent-os-ui/ui/src/components/kanban-board.ts`
- `agent-os-ui/ui/src/views/dashboard-view.ts`
- `agent-os-ui/ui/src/gateway.ts`
- `agent-os-ui/src/server/websocket.ts` (minimal)

[📄 Vollständige Story](./stories/story-002-auto-execution-engine.md)

---

### KAE-003: Progress Summary Display

**Type:** Frontend | **Effort:** S | **Priority:** Medium

Anzeige der aktuellen Phase und Story im Header während Auto-Mode.

**Kernfunktionen:**
- Zeigt Story-ID und Titel
- Zeigt aktuelle Phase (1-5)
- Nur sichtbar wenn Auto-Mode aktiv
- Completion-Nachricht nach letzter Story

**Dateien:**
- `agent-os-ui/ui/src/components/kanban-board.ts`
- `agent-os-ui/ui/src/gateway.ts`

[📄 Vollständige Story](./stories/story-003-progress-summary-display.md)

---

### KAE-004: Error Handling Modal

**Type:** Frontend | **Effort:** S | **Priority:** Medium

Modal Dialog für Fehler mit Resume/Stop Optionen.

**Kernfunktionen:**
- Zeigt Fehlerbeschreibung und betroffene Story
- "Resume" Button zum Fortfahren
- "Stop" Button zum Beenden
- Keyboard Navigation (Escape/Enter)

**Dateien:**
- `agent-os-ui/ui/src/components/auto-mode-error-modal.ts` (Neu)
- `agent-os-ui/ui/src/components/kanban-board.ts`

[📄 Vollständige Story](./stories/story-004-error-handling-modal.md)

---

### KAE-005: Git Strategy Integration

**Type:** Frontend | **Effort:** S | **Priority:** High

Auto-Mode wartet auf Git Strategy Auswahl bei erster Story.

**Kernfunktionen:**
- Dialog bei erster Story wenn keine Strategie gesetzt
- Auto-Mode pausiert während Dialog offen
- Gewählte Strategie für alle Folge-Stories
- Dialog-Abbruch deaktiviert Auto-Mode

**Dateien:**
- `agent-os-ui/ui/src/components/kanban-board.ts`

[📄 Vollständige Story](./stories/story-005-git-strategy-integration.md)

---

## Technical Architecture

### Integration Points

```
┌─────────────────────────────────────────────────────────────┐
│                    Frontend (Lit Components)                 │
├─────────────────────────────────────────────────────────────┤
│  dashboard-view.ts                                          │
│    └── Auto-Mode State Management                           │
│         ├── autoModeEnabled: boolean                        │
│         └── Event Handlers für Toggle/Resume/Stop           │
│                                                             │
│  kanban-board.ts                                            │
│    ├── Toggle Component (KAE-001)                           │
│    ├── Auto-Execution Logic (KAE-002)                       │
│    ├── Progress Summary (KAE-003)                           │
│    ├── Error Modal Integration (KAE-004)                    │
│    └── Git Strategy Integration (KAE-005)                   │
│                                                             │
│  auto-mode-error-modal.ts (NEU)                             │
│    └── Error Dialog mit Resume/Stop                         │
├─────────────────────────────────────────────────────────────┤
│                    WebSocket Gateway                         │
├─────────────────────────────────────────────────────────────┤
│  workflow.interactive.complete → Trigger nächste Story      │
│  workflow.interactive.error → Trigger Error Modal           │
│  workflow.interactive.message → Phase Updates               │
├─────────────────────────────────────────────────────────────┤
│                    Backend (Express + WS)                    │
├─────────────────────────────────────────────────────────────┤
│  websocket.ts                                               │
│    └── Events erweitern um specId                           │
│                                                             │
│  workflow-executor.ts                                       │
│    └── Bestehende Logik (keine große Änderung)              │
└─────────────────────────────────────────────────────────────┘
```

### Event Flow

```
User: Toggle aktivieren
    │
    ▼
KAE-001: dispatch 'auto-mode-toggle' { enabled: true }
    │
    ▼
KAE-005: isFirstStoryExecution() → true?
    │ yes                    │ no
    ▼                        ▼
Git Strategy Dialog    processAutoExecution()
    │                        │
    ▼                        ▼
Strategy Selected      getNextReadyStory()
    │                        │
    ▼                        ▼
processAutoExecution() triggerWorkflowStart()
    │
    ▼
WebSocket: workflow.story.start
    │
    ▼
Backend: startStoryExecution()
    │
    ▼
[Story Execution läuft...]
    │
    ▼
WebSocket: workflow.interactive.complete
    │
    ▼
KAE-002: setTimeout(processAutoExecution, 2000)
    │
    ▼
[Nächste Story oder Auto-Mode Ende]
```

---

## Scope Boundaries

### IN SCOPE

- Auto-Mode Toggle im Kanban Header
- Automatische Story-Ausführung (sequentiell)
- Summary Progress Anzeige (Phase + Story)
- Error Handling mit Modal Dialog
- Pause/Resume Funktionalität
- Integration mit bestehendem Git Strategy Dialog

### OUT OF SCOPE

- Voller Claude Output Stream in UI
- Persistenz des Auto-Mode Status nach Refresh
- Parallele Story-Execution
- Automatische Git Strategy Auswahl
- Ersatz des Terminal-Scripts (bleibt als Alternative)
- Konfigurierbare Delays zwischen Stories

---

## Definition of Ready (Spec-Level)

- [x] Alle Stories haben vollständiges technisches Refinement
- [x] Dependencies sind klar dokumentiert
- [x] Architektur-Entscheidungen getroffen
- [x] Keine offenen fachlichen Fragen
- [x] Integration Points mit bestehendem Code identifiziert

---

## Approval

**Requirements Clarification:** ✅ Approved 2026-01-31
**User Stories:** ✅ Ready for Implementation

---

*Diese Spezifikation ist bereit für `/execute-tasks kanban-auto-execution`*
