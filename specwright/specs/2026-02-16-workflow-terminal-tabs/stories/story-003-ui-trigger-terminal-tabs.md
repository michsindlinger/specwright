# UI-Trigger auf Terminal-Tabs umleiten

> Story ID: WTT-003
> Spec: Workflow Terminal Tabs
> Created: 2026-02-16
> Last Updated: 2026-02-16

**Priority**: High
**Type**: Full-stack
**Estimated Effort**: S
**Dependencies**: WTT-002

---

## Feature

```gherkin
Feature: Workflow-Start oeffnet Terminal-Tab
  Als Entwickler
  moechte ich dass UI-Aktionen wie "Execute Story" automatisch einen Terminal-Tab oeffnen,
  damit ich nicht manuell ein Terminal oeffnen und den Befehl eingeben muss.
```

---

## Akzeptanzkriterien (Gherkin-Szenarien)

### Szenario 1: Execute Story im Kanban oeffnet Terminal-Tab

```gherkin
Scenario: Story-Ausfuehrung aus dem Kanban Board
  Given ich bin im Kanban Board mit Story "FE-001"
  When ich auf "Execute Story" klicke
  Then oeffnet sich die Terminal-Sidebar mit einem neuen Workflow-Tab
  And der Tab zeigt "execute-tasks: FE-001"
  And der Workflow startet automatisch
```

### Szenario 2: Workflow aus dem Dashboard starten

```gherkin
Scenario: Story-Ausfuehrung aus dem Dashboard
  Given ich bin in der Dashboard-Ansicht
  When ich eine Story zur Ausfuehrung auswaehle
  Then oeffnet sich ein neuer Terminal-Tab fuer den Workflow
  And die Dashboard-Ansicht bleibt weiterhin nutzbar
```

### Szenario 3: Queue-basierte Ausfuehrung

```gherkin
Scenario: Queue startet Workflow im Terminal-Tab
  Given die Execution Queue hat Stories in der Warteschlange
  When die Queue eine Story zur Ausfuehrung startet
  Then wird ein neuer Terminal-Tab fuer diese Story erzeugt
  And der Tab-Titel enthaelt den Story-Namen
```

### Edge Cases & Fehlerszenarien

```gherkin
Scenario: Workflow-Start bei geschlossener Sidebar
  Given die Terminal-Sidebar ist eingeklappt
  When ich einen Workflow ueber das Kanban Board starte
  Then oeffnet sich die Sidebar automatisch
  And der Workflow-Tab ist sofort sichtbar und aktiv
```

---

## Technische Verifikation (Automated Checks)

### Datei-Pruefungen

- [ ] CONTAINS: ui/frontend/src/app.ts enthaelt "workflow-terminal-request"
- [ ] CONTAINS: ui/frontend/src/components/kanban-board.ts enthaelt "workflow-terminal-request"

### Funktions-Pruefungen

- [ ] BUILD_PASS: cd ui/frontend && npm run build
- [ ] BUILD_PASS: cd ui && npm run build:backend

---

## Required MCP Tools

Keine MCP Tools erforderlich.

---

## Technisches Refinement (vom Architect)

### DoR (Definition of Ready) - Vom Architect

#### Fachliche Anforderungen
- [x] Fachliche requirements klar definiert
- [x] Akzeptanzkriterien sind spezifisch und pruefbar
- [x] Business Value verstanden

#### Technische Vorbereitung
- [x] Technischer Ansatz definiert (WAS/WIE/WO)
- [x] Abhaengigkeiten identifiziert
- [x] Betroffene Komponenten bekannt
- [x] Erforderliche MCP Tools dokumentiert (falls zutreffend)
- [x] Story ist angemessen geschaetzt (max 5 Dateien, 400 LOC)

#### Full-Stack Konsistenz
- [x] Alle betroffenen Layer identifiziert
- [x] Integration Type bestimmt
- [x] Kritische Integration Points dokumentiert (wenn Full-stack)
- [x] Handover-Dokumente definiert (bei Multi-Layer)

---

### DoD (Definition of Done) - Vom Architect

#### Implementierung
- [ ] Code implementiert und folgt Style Guide
- [ ] Architektur-Vorgaben eingehalten
- [ ] Security/Performance Anforderungen erfuellt

#### Qualitaetssicherung
- [ ] Alle Akzeptanzkriterien erfuellt
- [ ] Tests geschrieben und bestanden
- [ ] Code Review durchgefuehrt

#### Dokumentation
- [ ] Keine Linting Errors
- [ ] Completion Check Commands alle erfolgreich

**Integration DoD:**
- [ ] **Integration hergestellt: kanban-board -> app.ts (workflow-terminal-request)**
  - [ ] Custom Event wird dispatched und empfangen
  - [ ] Validierung: `grep -r "workflow-terminal-request" ui/frontend/src/`
- [ ] **Integration hergestellt: app.ts -> aos-cloud-terminal-sidebar (openWorkflowTab)**
  - [ ] Methode wird aufgerufen und oeffnet Tab
  - [ ] Validierung: `grep -r "openWorkflowTab" ui/frontend/src/`

---

### Betroffene Layer & Komponenten

**Integration Type:** Full-stack

| Layer | Komponenten | Aenderung |
|-------|-------------|----------|
| Frontend | app.ts | Neue Methode _openWorkflowTerminalTab(), Event-Listener |
| Frontend | kanban-board.ts | workflow-terminal-request Event statt workflow.story.start |
| Frontend | dashboard-view.ts | Story-Execution auf Terminal-Tab umleiten |
| Frontend | queue-section.ts | Queue-Execution auf Terminal-Tab umleiten |
| Backend | websocket.ts | handleWorkflowStoryStart anpassen (Git-Strategy + Terminal) |

**Kritische Integration Points:**
- kanban-board.ts -> app.ts (Custom Event workflow-terminal-request)
- app.ts -> aos-cloud-terminal-sidebar.ts (openWorkflowTab() Aufruf)
- websocket.ts -> CloudTerminalManager (Git-Strategy vor Session-Erstellung)

---

### Technical Details

**WAS:**
- Neue Methode `_openWorkflowTerminalTab()` in `app.ts` die Terminal-Sidebar oeffnet und Workflow-Tab erstellt
- Event-Listener in `app.ts` fuer `workflow-terminal-request` Custom Event
- Kanban-Board, Dashboard und Queue dispatchen `workflow-terminal-request` statt direkte WebSocket Messages
- Backend `handleWorkflowStoryStart` fuehrt Git-Strategy (Branch/Worktree) aus und erstellt dann Cloud Terminal Session

**WIE (Architektur-Guidance):**
- Nutze Document-Level Custom Events mit `bubbles: true, composed: true` fuer workflow-terminal-request
- Event-Detail enthaelt: `{ command, argument, model, specId?, storyId?, gitStrategy? }`
- `app.ts` faengt Event ab, ruft `_openWorkflowTerminalTab()` auf, das wiederum `openWorkflowTab()` auf der Sidebar-Referenz aufruft
- Backend: Git-Strategy-Logik aus bestehendem `handleWorkflowStoryStart` extrahieren in eigene Methode `prepareGitStrategy()`
- Danach `cloudTerminalManager.createWorkflowSession()` statt `workflowExecutor.startStoryExecution()`

**WO:**
- `ui/frontend/src/app.ts`
- `ui/frontend/src/components/kanban-board.ts`
- `ui/frontend/src/views/dashboard-view.ts`
- `ui/frontend/src/components/queue/aos-queue-section.ts`
- `ui/src/server/websocket.ts`

**Abhaengigkeiten:** WTT-002

**Geschaetzte Komplexitaet:** S

**Relevante Skills:**

| Skill | Pfad | Grund |
|-------|------|-------|
| frontend-lit | .claude/skills/frontend-lit/SKILL.md | Lit Web Component Event-Patterns |
| backend-express | .claude/skills/backend-express/SKILL.md | WebSocket Handler Patterns |

---

### Creates Reusable Artifacts

**Creates Reusable:** no

---

### Completion Check

```bash
# Auto-Verify Commands
grep -q "workflow-terminal-request" ui/frontend/src/app.ts && echo "OK app handler"
grep -q "workflow-terminal-request" ui/frontend/src/components/kanban-board.ts && echo "OK kanban trigger"
cd ui/frontend && npm run build
cd ui && npm run build:backend
```
