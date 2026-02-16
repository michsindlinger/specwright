# Legacy Cleanup

> Story ID: WTT-006
> Spec: Workflow Terminal Tabs
> Created: 2026-02-16
> Last Updated: 2026-02-16

**Priority**: High
**Type**: Full-stack
**Estimated Effort**: S
**Dependencies**: WTT-003, WTT-004, WTT-005

---

## Feature

```gherkin
Feature: Entfernung der alten Workflow-Chat und Execution-Tab Komponenten
  Als Maintainer
  moechte ich die veralteten und nicht funktionalen Execution-Komponenten entfernen,
  damit die Codebasis sauber bleibt und keine toten Pfade existieren.
```

---

## Akzeptanzkriterien (Gherkin-Szenarien)

### Szenario 1: Alte Komponenten entfernt

```gherkin
Scenario: Execution-Tab und Workflow-Chat Dateien existieren nicht mehr
  Given die neuen Terminal-Tab-Workflows funktionieren
  When ich die Codebasis pruefe
  Then existiert keine Datei "execution-tabs.ts" mehr
  And existiert keine Datei "execution-tab.ts" mehr
  And existiert keine Datei "workflow-chat.ts" mehr
```

### Szenario 2: Build funktioniert ohne Legacy-Code

```gherkin
Scenario: Frontend und Backend bauen erfolgreich
  Given alle Legacy-Komponenten wurden entfernt
  And alle Referenzen wurden bereinigt
  When der Build-Prozess laeuft
  Then kompiliert das Backend ohne Fehler
  And kompiliert das Frontend ohne Fehler
  And es gibt keine Linting-Fehler
```

### Szenario 3: WorkflowExecutor vereinfacht

```gherkin
Scenario: WorkflowExecutor ohne JSON-Streaming-Logik
  Given die Workflow-Ausfuehrung laeuft ueber Cloud Terminal
  When ich den WorkflowExecutor pruefe
  Then enthaelt er keine runClaudeCommand Methode mehr
  And enthaelt er keine handleClaudeEvent Methode mehr
  And die Git-Strategy-Logik ist weiterhin vorhanden
```

### Edge Cases & Fehlerszenarien

```gherkin
Scenario: Keine verwaisten Imports nach Cleanup
  Given alle Legacy-Dateien wurden entfernt
  When der TypeScript-Compiler prueft
  Then gibt es keine unaufgeloesten Imports
  And der Lint-Check zeigt keine Fehler
```

---

## Technische Verifikation (Automated Checks)

### Datei-Pruefungen

- [ ] FILE_NOT_EXISTS: ui/frontend/src/components/execution-tabs.ts
- [ ] FILE_NOT_EXISTS: ui/frontend/src/components/execution-tab.ts
- [ ] FILE_NOT_EXISTS: ui/frontend/src/components/workflow-chat.ts
- [ ] NOT_CONTAINS: ui/src/server/workflow-executor.ts enthaelt NICHT "runClaudeCommand"
- [ ] NOT_CONTAINS: ui/src/server/workflow-executor.ts enthaelt NICHT "handleClaudeEvent"

### Funktions-Pruefungen

- [ ] BUILD_PASS: cd ui && npm run build:backend
- [ ] BUILD_PASS: cd ui/frontend && npm run build
- [ ] LINT_PASS: cd ui && npm run lint

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

---

### Betroffene Layer & Komponenten

**Integration Type:** Full-stack

| Layer | Komponenten | Aenderung |
|-------|-------------|----------|
| Frontend | execution-tabs.ts | ENTFERNEN |
| Frontend | execution-tab.ts | ENTFERNEN |
| Frontend | workflow-chat.ts | ENTFERNEN |
| Frontend | workflow-view.ts | ENTFERNEN |
| Frontend | execution-store.ts | ENTFERNEN |
| Frontend | execution.ts (types) | ENTFERNEN |
| Frontend | app.ts | Workflow-View-Navigation entfernen |
| Frontend | theme.css | Execution-Tab-Styles entfernen |
| Backend | workflow-executor.ts | JSON-Streaming-Logik entfernen |
| Backend | websocket.ts | Alte workflow.interactive.* Handler bereinigen |

---

### Technical Details

**WAS:**
- Dateien loeschen: `execution-tabs.ts`, `execution-tab.ts`, `workflow-chat.ts`, `workflow-view.ts`, `execution-store.ts`, `execution.ts` (Types)
- `app.ts` bereinigen: Imports, Workflow-View-Route, `handleWorkflowStart` alte Logik entfernen
- `theme.css` bereinigen: `.execution-tab*` und `.workflow-chat*` CSS-Regeln entfernen
- `workflow-executor.ts` vereinfachen: `runClaudeCommand()`, `handleClaudeEvent()`, `resumeWithAnswer()`, `sendQuestionBatch()`, `detectTextQuestions()`, `handleAskUserQuestion()`, `submitAnswer()`, `submitAnswerBatch()` entfernen
- `websocket.ts` bereinigen: Alte `workflow.interactive.*` Handler entfernen die nicht mehr benoetigt werden

**WIE (Architektur-Guidance):**
- Zuerst alle Frontend-Dateien loeschen, dann Imports bereinigen
- `workflow-executor.ts` behaelt: `listCommands()`, `getTerminalManager()`, Git-Strategy-Logik (Branch/Worktree-Erstellung), Kanban-Update-Logik
- TypeScript-Compiler als Validierung nutzen: `npm run build:backend && npm run build` muss nach Cleanup fehlerfrei sein
- Route `/workflows` aus Router entfernen oder auf Dashboard umleiten
- Ausfuehrlich testen dass alle verbleibenden Features funktionieren

**WO:**
- `ui/frontend/src/components/execution-tabs.ts` (LOESCHEN)
- `ui/frontend/src/components/execution-tab.ts` (LOESCHEN)
- `ui/frontend/src/components/workflow-chat.ts` (LOESCHEN)
- `ui/frontend/src/views/workflow-view.ts` (LOESCHEN)
- `ui/frontend/src/stores/execution-store.ts` (LOESCHEN falls existent)
- `ui/frontend/src/types/execution.ts` (LOESCHEN falls existent)
- `ui/frontend/src/app.ts` (BEREINIGEN)
- `ui/frontend/src/styles/theme.css` (BEREINIGEN)
- `ui/src/server/workflow-executor.ts` (VEREINFACHEN)
- `ui/src/server/websocket.ts` (BEREINIGEN)

**Abhaengigkeiten:** WTT-003, WTT-004, WTT-005

**Geschaetzte Komplexitaet:** S

**Relevante Skills:**

| Skill | Pfad | Grund |
|-------|------|-------|
| frontend-lit | .claude/skills/frontend-lit/SKILL.md | Lit Component Cleanup |
| backend-express | .claude/skills/backend-express/SKILL.md | Express/WebSocket Cleanup |

---

### Creates Reusable Artifacts

**Creates Reusable:** no

---

### Completion Check

```bash
# Auto-Verify Commands
! test -f ui/frontend/src/components/execution-tabs.ts && echo "OK execution-tabs removed"
! test -f ui/frontend/src/components/execution-tab.ts && echo "OK execution-tab removed"
! test -f ui/frontend/src/components/workflow-chat.ts && echo "OK workflow-chat removed"
cd ui && npm run build:backend && echo "OK backend build"
cd ui/frontend && npm run build && echo "OK frontend build"
cd ui && npm run lint && echo "OK lint"
```
