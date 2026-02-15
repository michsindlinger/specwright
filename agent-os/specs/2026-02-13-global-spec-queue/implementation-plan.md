# Implementation Plan: Global Spec Queue

**Status: APPROVED**

## Architekturübersicht

### Konzept
Das Bottom Panel wird als **globale Komponente** in `aos-app` injiziert (wie Cloud Terminal Sidebar), positioniert am unteren Bildschirmrand mit 2 Tabs:
- **Queue & Specs** (Split-View): Queue links, Specs rechts - Drag & Drop direkt nebeneinander
- **Log**: Execution Log der Queue-Ausführung

### Layout-Integration
```
┌─────────┬──────────────────────────────────────────┐
│         │  Header (64px)                           │
│         ├──────────────────────────────────────────┤
│ Sidebar │  Project Tabs                            │
│ (280px) │  Git Status Bar                          │
│         ├──────────────────────────────────────────┤
│  [📊]   │                                          │
│  [💬]   │  View Container (flex: 1)                │
│  [⚡]   │  (Dashboard / Chat / Workflows / etc.)   │
│  [⚙️]   │                                          │
│         │                                          │
│  ----   ├──────────────────────────────────────────┤
│  [📋]   │  Bottom Panel (resizable, 300px default) │
│  Queue  │  [Queue & Specs] [Log]                   │
│         │  ─────────────────────────────────────── │
│         │  │ Queue (left)    │ Specs (right)  │    │
│         │  │ Drop Zone       │ Drag Source    │    │
│         │  │ Start/Stop      │ By Project     │    │
└─────────┴──────────────────────────────────────────┘
```

### Split-View Detail (Queue & Specs Tab)
```
┌────────────────────────────┬────────────────────────────┐
│ QUEUE                      │ SPECS (All Projects)       │
│ ┌─────────────────────┐   │ ▼ Project Alpha            │
│ │ [▶ Start] [■ Stop]  │   │   ┌──────────────────────┐ │
│ │ Items: 3  Running: 1│   │   │ Auth Feature   [+Q]  │ │
│ └─────────────────────┘   │   │ ██████░░ 4/6  branch │ │
│                            │   └──────────────────────┘ │
│ ┌──────────────────────┐  │   ┌──────────────────────┐ │
│ │ 1. Auth (Alpha) ███▓ │  │   │ Dashboard     [+Q]  │ │
│ │    running  4/6      │  │   │ ████████ 8/8  done   │ │
│ │ 2. API (Beta)  ░░░░ │  │   └──────────────────────┘ │
│ │    pending  0/4      │  │ ▼ Project Beta             │
│ │ 3. UI (Alpha)  ░░░░ │  │   ┌──────────────────────┐ │
│ │    pending  0/3      │  │   │ API Spec      [+Q]  │ │
│ └──────────────────────┘  │   │ ░░░░░░░░ 0/4  ready │ │
│                            │   └──────────────────────┘ │
│    ← Drag Specs here →    │     ← Drag from here →     │
└────────────────────────────┴────────────────────────────┘
```

### Datenfluss
```
Frontend (aos-app)
  └── aos-global-queue-panel
       ├── Queue & Specs Tab (Split-View)
       │    ├── Queue Section  ← queue.state, queue.progress Events
       │    └── Specs Section  ← specs.list-all (neuer Endpoint)
       └── Log Tab             ← queue.log Events

Backend
  └── QueueService (refactored zu globalem State)
       ├── Globaler QueueState (ein State, Items mit projectPath)
       ├── Multi-Project Spec Loading via SpecsReader
       └── Execution Log Buffer
```

## Implementierungsschritte

### Phase 1: Backend - Globale Queue & Multi-Project Specs

**Story 1: Backend Queue-Service auf Global umstellen**
- `queue.service.ts`: Von `Map<string, QueueState>` zu einem einzelnen `QueueState`
- `QueueItem` erweitern um `projectPath: string` und `projectName: string`
- Queue-Methoden: `projectPath` wird pro Item übergeben statt als Queue-Key
- `add(specId, specName, projectPath, projectName, gitStrategy?, position?)`
- `remove(queueItemId)`, `reorder(queueItemId, newPosition)` bleiben gleich
- `start()` / `stop()` arbeiten global
- `getNextPending()` liefert nächstes Item unabhängig vom Projekt
- Broadcast an alle verbundenen Clients (nicht nur project-spezifisch)
- `queue.handler.ts`: Messages anpassen für globalen State, projectPath aus Payload statt aus Connection

**Story 2: Multi-Project Spec-Loading**
- `specs-reader.ts`: Neue Methode `listAllSpecs(projectPaths: string[]): Promise<ProjectSpecs[]>`
- Neues Interface: `ProjectSpecs { projectPath, projectName, specs: SpecInfo[] }`
- `SpecInfo` erweitern um `projectPath` und `projectName`
- Neuer WebSocket-Handler `specs.list-all` der alle offenen Projekte abfragt
- Response: `{ projects: ProjectSpecs[] }`

**Story 3: Execution Log Service**
- Neuer `execution-log.service.ts` (Singleton)
- Interface: `LogEntry { id, timestamp, type, projectPath, projectName, specId, specName, storyId?, storyTitle?, message }`
- Log-Typen: `spec-start`, `story-start`, `story-complete`, `spec-complete`, `queue-complete`, `error`
- Buffer-Limit: 500 Einträge mit FIFO-Rotation
- WebSocket: `queue.log.entry` für neue Einträge, `queue.log.state` für initialen State
- Integration: Queue-Handler ruft LogService bei jedem State-Übergang auf

### Phase 2: Frontend - Bottom Panel Grundstruktur

**Story 4: aos-global-queue-panel Komponente**
- Neue Komponente `agent-os-ui/ui/src/components/queue/aos-global-queue-panel.ts`
- Light DOM mit injected Styles (exakt wie `aos-cloud-terminal-sidebar`)
- Fixed Position: `bottom: 0; left: var(--sidebar-width); right: 0;`
- z-index: 999 (unter Cloud Terminal z-index: 1000)
- Resizable Höhe via Drag-Handle oben (Pointer-Events, wie Terminal resize aber vertikal)
- Min: 200px, Max: 60vh, Default: 300px
- **2 Tabs**: Queue & Specs | Log
- Open/Close: `transform: translateY(100%)` / `translateY(0)` mit Transition
- State via Properties: `isOpen`, `activeTab`, `height`
- localStorage Persistierung: `global-queue-panel-height`, `global-queue-panel-tab`

**Story 5: App Shell Integration**
- `app.ts`: Bottom Panel als globale Komponente im render() einbinden (neben Cloud Terminal)
- Neue State-Properties: `isBottomPanelOpen`, `bottomPanelHeight`, `bottomPanelActiveTab`
- Queue-State Properties hochziehen: `globalQueue: QueueItem[]`, `isQueueRunning: boolean`
- Sidebar Navigation: Queue-Icon hinzufügen, unter Settings mit Divider getrennt
- Badge am Icon wenn `isQueueRunning === true`
- Keyboard Shortcut: **Cmd/Ctrl+Shift+Q** zum Togglen
- CSS: `main-content` erhält dynamisches `padding-bottom` wenn Panel offen
- Gateway Message Handlers für Queue registrieren (aus Dashboard hochgezogen)

### Phase 3: Frontend - Queue & Specs Split-View

**Story 6: Queue Section (linke Hälfte)**
- Neue Komponente `aos-queue-section.ts` (linke Seite des Split-View)
- Logik aus `aos-queue-sidebar.ts` extrahieren (~70% wiederverwendbar):
  - Message Handler Pattern (boundMessageHandlers Map)
  - Event Dispatching (queue-add, -remove, -reorder, -start, -stop)
  - Git Strategy Dialog Integration
  - Progress Tracking (Map-basiert)
  - Drag-Drop Reordering innerhalb Queue
- Layout: Vertikal scrollbare Queue-Item-Liste
  - Header: Start/Stop Controls + Item-Count + Running-Indicator
  - Queue-Items: Kompakte Cards mit Projekt-Badge, Progress-Bar, Status
  - Reordering: Drag-Drop innerhalb der Queue
- **Drop-Zone**: Akzeptiert Drag von Specs-Section (rechte Seite) UND Dashboard Spec-Cards
  - `dataTransfer` prüft auf `text/drag-type === 'spec'`
  - Visuelles Feedback: Highlight der Drop-Zone während Drag-Over
  - Position-Targeting für Insert-Position

**Story 7: Specs Section (rechte Hälfte)**
- Neue Komponente `aos-specs-section.ts` (rechte Seite des Split-View)
- Lädt Specs über `gateway.send({ type: 'specs.list-all' })`
- Darstellung: Gruppiert nach Projekt (collapsible Sektionen)
  - Projekt-Header mit Name + Spec-Count (klickbar zum Auf-/Zuklappen)
  - Kompakte Spec-Cards: Name, Status-Badge, Story-Progress (x/y), Git-Strategy
- **Draggable Spec-Cards** für direktes Drag in Queue (links):
  - `dataTransfer`: `text/plain` (specId), `text/spec-name`, `text/drag-type` (spec), `text/project-path`, `text/git-strategy`
  - Drag-Ghost zeigt Spec-Name + Projekt
- **"Add to Queue" Button** (`[+Q]`) pro Spec-Card (Alternative zu Drag)
- Auto-Refresh: Reagiert auf `project-opened` / `project-closed` Events
- Git-Strategy Dialog: Öffnet sich bei Queue-Add wenn Spec keine Strategy hat
- Resizable Split: Optionaler Divider zwischen Queue und Specs Section

### Phase 4: Frontend - Log Tab

**Story 8: Execution Log Tab**
- Neue Komponente `aos-execution-log-tab.ts`
- Log-Einträge als scrollbare Liste (neueste unten)
- Layout pro Eintrag: `[Timestamp] [Projekt] [Spec] [Story?] Message`
- Farbcodierung:
  - `spec-start`: blau
  - `story-start`: default (grau)
  - `story-complete`: grün
  - `spec-complete`: grün bold
  - `error`: rot
  - `queue-complete`: gold/accent
- Auto-Scroll: Automatisch nach unten scrollen bei neuen Einträgen
  - Deaktiviert sich wenn User manuell hochscrollt
  - Re-aktiviert wenn User ganz nach unten scrollt
- "Clear Log" Button in Tab-Header
- Initial-Load: `queue.log.state` Message beim Tab-Öffnen

### Phase 5: Dashboard-Migration & Cleanup

**Story 9: Dashboard Queue-Sidebar entfernen**
- `dashboard-view.ts`:
  - `aos-queue-sidebar` Referenz und Import entfernen
  - Queue-State Properties entfernen (`queue`, `isQueueRunning`)
  - Queue Event-Handler entfernen (`handleQueueAdd/Remove/Reorder/Start/Stop`)
  - Gateway Queue-Message Handler entfernen (jetzt in app.ts)
  - `dashboard-content-with-queue` CSS → `dashboard-content` (volle Breite)
- `aos-queue-sidebar.ts`: Datei kann entfernt werden (Logik lebt in `aos-queue-section.ts`)
- `aos-queue-item.ts`: Prüfen ob Wiederverwendung in Queue-Section oder neue Item-Komponente
- Spec-Cards im Dashboard: Drag-Fähigkeit beibehalten
  - `dataTransfer` um `text/project-path` erweitern (aktuelles Projekt)
  - Drop-Target ist jetzt das Bottom Panel Queue-Section

### Phase 6: System Stories

**Story 997: Fix-Story (Fehlerkorrektur nach Integration)**
**Story 998: Code Review**
**Story 999: Finale Integration & TypeScript Check**

## Technische Entscheidungen

### Light DOM Pattern (wie Cloud Terminal)
- Konsistent mit bestehendem Architekturmuster
- Ermöglicht Theme-Variablen-Zugriff
- Styles werden per `document.head.appendChild(style)` mit Static-Flag injiziert

### Split-View statt separate Tabs
- **Begründung**: Drag & Drop zwischen Queue und Specs erfordert gleichzeitige Sichtbarkeit
- Queue (links) und Specs (rechts) sind im selben Tab als Split-View
- Kein Tab-Auto-Switch-Hack nötig, D&D ist direkt und intuitiv
- Split-Ratio: 50/50 default, optional resizable
- Log bleibt eigener Tab (benötigt kein D&D-Target)

### WebSocket Message Types (Punkt-Notation, konsistent mit bestehendem Codebase)
```
queue.add          → { specId, projectPath, projectName, specName, gitStrategy?, position? }
queue.remove       → { queueItemId }
queue.reorder      → { queueItemId, newPosition }
queue.start        → {}
queue.stop         → {}
queue.state        → Response: { items[], isRunning, currentSpec? }
queue.progress     → { queueItemId, done, total, currentStory? }
queue.log.entry    → { entry: LogEntry }
queue.log.state    → { entries: LogEntry[] }
specs.list-all     → Response: { projects: ProjectSpecs[] }
```

### Resize-Mechanismus (adaptiert von Cloud Terminal)
- Drag-Handle (4px) am oberen Rand des Panels
- `cursor: row-resize` (statt `col-resize`)
- Pointer-Events: mousedown → mousemove → mouseup
- Höhe wird in `localStorage('global-queue-panel-height')` persistiert
- `main-content` erhält dynamisches `padding-bottom` wenn Panel offen

### Drag & Drop Strategie (vereinfacht durch Split-View)
- **Innerhalb Queue-Section**: Reordering via Position-Targeting (bestehendes Pattern)
- **Specs-Section → Queue-Section**: Direktes Drag von rechts nach links (gleicher Container!)
  - `dataTransfer` mit specId + projectPath + specName + gitStrategy
  - Kein Tab-Wechsel nötig - beide Bereiche sind gleichzeitig sichtbar
- **Dashboard Spec-Cards → Bottom Panel**: Bestehendes Spec-Card Drag-Pattern, erweitert um `text/project-path`
  - Funktioniert auch wenn Panel offen und Queue-Tab aktiv ist
- **Visuelles Feedback**: Queue-Section zeigt Drop-Zone Highlight bei Drag-Over

### Workflow Execution Context-Switch
- Wenn Queue global startet und zum nächsten Spec wechselt:
  - Backend prüft `projectPath` des nächsten QueueItems
  - WorkflowExecutor erhält `projectPath` als Parameter
  - Kein Frontend-Navigation nötig - Ausführung läuft im Backend
  - Frontend zeigt Progress in Queue-Section unabhängig vom aktiven View

## Risiken & Mitigationen

| Risiko | Mitigation |
|--------|------------|
| Bottom Panel + Cloud Terminal kollidieren visuell | z-index 999 vs 1000, Bottom Panel passt sich an wenn Terminal offen |
| Split-View Platz bei kleinen Bildschirmen | Min-Panel-Höhe 200px, min-width pro Section 250px, untereinander bei < 600px Panelbreite |
| Queue-State Migration (per-project → global) | Breaking Change, Frontend + Backend werden gleichzeitig migriert |
| Performance bei vielen Specs/Projekten | Lazy Loading, nur offene Projekte, collapsible Sektionen |
| Cmd/Ctrl+Q kollidiert mit Browser | **Cmd/Ctrl+Shift+Q** verwenden |
| WebSocket Message-Format Inkonsistenz | Punkt-Notation beibehalten (queue.add statt queue:add) |
| Workflow Executor Project-Context | projectPath wird pro QueueItem mitgeführt und an Executor übergeben |

## Wiederverwendbare Elemente (Minimalinvasiv-Analyse)

| Element | Quelle | Wiederverwendung |
|---------|--------|-----------------|
| Light DOM + Style Injection | `aos-cloud-terminal-sidebar.ts` | Pattern 1:1 übernehmen |
| Resize-Mechanismus | `aos-cloud-terminal-sidebar.ts` L696-725 | Adaptieren (Breite→Höhe) |
| Queue-Logik (Handler, Events, Progress) | `aos-queue-sidebar.ts` | ~70% extrahieren |
| Drag-Drop Pattern | `spec-card.ts` + `aos-queue-sidebar.ts` | Erweitern um projectPath |
| localStorage Persistence | Cloud Terminal + Dashboard | try-catch Pattern kopieren |
| Keyboard Shortcut Pattern | `aos-create-spec-modal.ts` etc. | boundKeyHandler Pattern |
| Gateway Queue-Methoden | `gateway.ts` L373-499 | Erweitern um projectPath Parameter |
| Queue Backend Service | `queue.service.ts` | Refactor Map→Single State |

## Optimierungen nach Review

1. **Message-Format korrigiert**: `queue:` → `queue.` (Punkt-Notation, konsistent mit Codebase)
2. **Keyboard Shortcut geändert**: `Cmd/Ctrl+Q` → `Cmd/Ctrl+Shift+Q` (Browser-Konflikt vermieden)
3. **Workflow Context-Switch ergänzt**: Fehlte im Original-Plan, kritisch für projektübergreifende Ausführung
4. **Split-View statt 3 Tabs**: Löst Drag-zwischen-Tabs Problem elegant - Queue und Specs gleichzeitig sichtbar
5. **Gateway-Änderungen minimiert**: Nur projectPath Parameter ergänzen, keine neuen Methoden
6. **Backend-Änderung präzisiert**: Von Map<string,QueueState> zu einzelnem QueueState mit projectPath pro Item
7. **Story-Reduktion**: Von 9+3 Stories auf 9+3 Stories, aber Story 6+7 sind jetzt Sections statt separate Tabs

## Feature-Preservation Checkliste

- [x] Queue-Funktionalität: add, remove, reorder, start, stop
- [x] Drag & Drop in Queue (vereinfacht durch Split-View)
- [x] Queue Progress-Tracking
- [x] Git Strategy Dialog bei Queue-Add
- [x] Sequenzielle Ausführung (jetzt global statt per-project)
- [x] Spec-Ansicht mit Status/Progress (erweitert um alle Projekte)
- [x] Real-time WebSocket Updates
- [x] Dashboard Spec-Cards draggable

## Abhängigkeiten

```
Story 1 (Backend Queue Global) ──┐
Story 2 (Multi-Spec Loading)  ──┤
Story 3 (Log Service)         ──┼──→ Story 4 (Panel) → Story 5 (App Shell Integration)
                                 │
                                 ├──→ Story 6 (Queue Section)  ──┐
                                 ├──→ Story 7 (Specs Section)  ──┼──→ Story 9 (Dashboard Migration)
                                 └──→ Story 8 (Log Tab)        ──┘
```
