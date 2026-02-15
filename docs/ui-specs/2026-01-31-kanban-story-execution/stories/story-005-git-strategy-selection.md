# KSE-005: Git Strategy Auswahl

> Story ID: KSE-005
> Spec: 2026-01-31-kanban-story-execution
> Created: 2026-01-31
> Last Updated: 2026-01-31

**Priority**: Medium
**Type**: Full-Stack
**Estimated Effort**: M
**Dependencies**: KSE-003

---

## Feature

```gherkin
Feature: Git Strategy Auswahl beim Story-Start
  Als Entwickler
  möchte ich beim ersten Drag einer Story nach "In Progress" wählen können ob ein Git Branch oder ein Git Worktree erstellt wird,
  damit ich die für mich passende Arbeitsweise nutzen kann.
```

---

## Akzeptanzkriterien (Gherkin-Szenarien)

### Szenario 1: Dialog erscheint bei erster Story im Spec

```gherkin
Scenario: Git Strategy Dialog wird angezeigt
  Given ich bin im Kanban Board der Spec "2026-01-31-kanban-story-execution"
  And keine Story ist aktuell "in_progress"
  And es gibt keine aktive Git-Strategie für diesen Spec
  When ich die erste Story von "Backlog" nach "In Progress" ziehe
  Then erscheint ein Dialog mit der Frage "Wie möchtest du arbeiten?"
  And ich sehe zwei Optionen: "Git Branch" und "Git Worktree"
  And jede Option hat eine kurze Erklärung
```

### Szenario 2: Git Branch Option Erklärung

```gherkin
Scenario: Git Branch Option wird erklärt
  Given der Git Strategy Dialog ist geöffnet
  When ich die Option "Git Branch" betrachte
  Then sehe ich die Beschreibung "Einfacher Branch im aktuellen Verzeichnis - empfohlen für die meisten Workflows"
```

### Szenario 3: Git Worktree Option Erklärung

```gherkin
Scenario: Git Worktree Option wird erklärt
  Given der Git Strategy Dialog ist geöffnet
  When ich die Option "Git Worktree" betrachte
  Then sehe ich die Beschreibung "Separates Arbeitsverzeichnis - ideal für parallele Arbeit an mehreren Features"
```

### Szenario 4: Auswahl Branch startet Workflow

```gherkin
Scenario: Git Branch Auswahl startet Workflow
  Given der Git Strategy Dialog ist geöffnet
  When ich "Git Branch" auswähle
  And ich auf "Starten" klicke
  Then wird der Dialog geschlossen
  And der Workflow wird mit gitStrategy "branch" gestartet
  And die Story wird nach "In Progress" verschoben
```

### Szenario 5: Auswahl Worktree startet Workflow

```gherkin
Scenario: Git Worktree Auswahl startet Workflow
  Given der Git Strategy Dialog ist geöffnet
  When ich "Git Worktree" auswähle
  And ich auf "Starten" klicke
  Then wird der Dialog geschlossen
  And der Workflow wird mit gitStrategy "worktree" gestartet
  And die Story wird nach "In Progress" verschoben
```

### Szenario 6: Dialog abbrechen

```gherkin
Scenario: Dialog kann abgebrochen werden
  Given der Git Strategy Dialog ist geöffnet
  When ich auf "Abbrechen" klicke
  Then wird der Dialog geschlossen
  And die Story bleibt im "Backlog"
  And kein Workflow wird gestartet
```

### Szenario 7: Kein Dialog bei weiteren Stories

```gherkin
Scenario: Kein Dialog bei laufendem Spec
  Given ich bin im Kanban Board
  And eine Story ist bereits "in_progress" oder "done"
  When ich eine weitere Story von "Backlog" nach "In Progress" ziehe
  Then erscheint kein Git Strategy Dialog
  And der Workflow startet direkt mit der bestehenden Strategie
```

### Szenario 8: Worktree wird erstellt mit Symlink

```gherkin
Scenario: Worktree-Modus erstellt Worktree mit Spec-Symlink
  Given ich habe "Git Worktree" im Dialog ausgewählt
  When der Workflow startet
  Then wird ein Git Worktree in "agent-os/worktrees/[spec-name]/" erstellt
  And ein Feature Branch wird im Worktree erstellt
  And ein Symlink wird erstellt: "worktree/agent-os/specs/[spec-name]" → "root/agent-os/specs/[spec-name]"
  And der User erhält Anweisung Claude Code im Worktree zu starten
  And der Befehl berücksichtigt den Claude Startmodus (Max vs. API)
```

### Szenario 9: Branch-Modus arbeitet im Hauptverzeichnis

```gherkin
Scenario: Branch-Modus behält aktuelles Verzeichnis
  Given ich habe "Git Branch" im Dialog ausgewählt
  When der Workflow startet
  Then wird ein neuer Git Branch erstellt
  And der Workflow-Agent arbeitet im Hauptprojektverzeichnis
  And kein separates Worktree-Verzeichnis wird erstellt
```

### Szenario 10: Resume Context speichert Git Strategy

```gherkin
Scenario: Git Strategy wird im Kanban Board gespeichert
  Given ich habe eine Git Strategy ausgewählt
  When der Workflow erfolgreich startet
  Then wird die gewählte Strategy im Resume Context der kanban-board.md gespeichert
  And nachfolgende Story-Executions nutzen dieselbe Strategy
```

---

## Technische Verifikation (Automated Checks)

### Datei-Prüfungen

- [ ] FILE_EXISTS: agent-os-ui/ui/src/components/git-strategy-dialog.ts
- [ ] FILE_EXISTS: agent-os-ui/ui/src/components/kanban-board.ts (modified)
- [ ] FILE_EXISTS: agent-os-ui/src/server/websocket.ts (modified)
- [ ] FILE_EXISTS: agent-os-ui/src/server/workflow-executor.ts (modified)

### Inhalt-Prüfungen (Frontend)

- [ ] CONTAINS: git-strategy-dialog.ts enthält "@customElement('aos-git-strategy-dialog')"
- [ ] CONTAINS: git-strategy-dialog.ts enthält "gitStrategy"
- [ ] CONTAINS: git-strategy-dialog.ts enthält "branch" und "worktree" Optionen
- [ ] CONTAINS: kanban-board.ts enthält "aos-git-strategy-dialog"
- [ ] CONTAINS: kanban-board.ts enthält "showGitStrategyDialog"

### Inhalt-Prüfungen (Backend)

- [ ] CONTAINS: websocket.ts enthält "gitStrategy"
- [ ] CONTAINS: workflow-executor.ts enthält "worktree" oder "git worktree"
- [ ] CONTAINS: workflow-executor.ts enthält "workingDirectory" oder "cwd"

### Funktions-Prüfungen

- [ ] LINT_PASS: npm run lint (agent-os-ui/ui) exits with code 0
- [ ] LINT_PASS: npm run lint (agent-os-ui) exits with code 0
- [ ] BUILD_PASS: npm run build exits with code 0
- [ ] TEST_PASS: npm test exits with code 0

---

## Required MCP Tools

| Tool | Purpose | Blocking |
|------|---------|----------|
| - | Keine MCP Tools erforderlich | - |

---

## Technisches Refinement (vom Architect)

### DoR (Definition of Ready) - Vom Architect

#### Fachliche Anforderungen
- [x] Fachliche requirements klar definiert
- [x] Akzeptanzkriterien sind spezifisch und prüfbar
- [x] Business Value verstanden

#### Technische Vorbereitung
- [x] Technischer Ansatz definiert (WAS/WIE/WO)
- [x] Abhängigkeiten identifiziert
- [x] Betroffene Komponenten bekannt
- [x] Erforderliche MCP Tools dokumentiert (falls zutreffend)
- [x] Story ist angemessen geschätzt (max 5 Dateien, 400 LOC)

#### Full-Stack Konsistenz (NEU)
- [x] **Alle betroffenen Layer identifiziert** (Frontend/Backend/Database/DevOps)
- [x] **Integration Type bestimmt** (Backend-only/Frontend-only/Full-stack)
- [x] **Kritische Integration Points dokumentiert** (wenn Full-stack)
- [x] **Handover-Dokumente definiert** (bei Multi-Layer: API Contracts, Data Structures)

**Story ist READY wenn alle Checkboxen angehakt sind.**

---

### DoD (Definition of Done) - Vom Architect

#### Implementierung
- [x] Code implementiert und folgt Style Guide
- [x] Architektur-Vorgaben eingehalten (WIE section)
- [x] Security/Performance Anforderungen erfüllt

#### Qualitätssicherung
- [x] Alle Akzeptanzkriterien erfüllt (via Completion Check verifiziert)
- [x] Unit Tests geschrieben und bestanden
- [x] Integration Tests geschrieben und bestanden
- [x] Code Review durchgeführt und genehmigt

#### Dokumentation
- [x] Dokumentation aktualisiert
- [x] Keine Linting Errors
- [x] Completion Check Commands alle erfolgreich (exit 0)

**Story ist DONE wenn alle Checkboxen angehakt sind.**

---

### Betroffene Layer & Komponenten

**Integration Type:** Full-Stack

**Betroffene Komponenten:**

| Layer | Komponenten | Änderung |
|-------|-------------|----------|
| Frontend | git-strategy-dialog.ts | Neuer Dialog-Component |
| Frontend | kanban-board.ts | Dialog-Integration, Strategy-State |
| Backend | websocket.ts | gitStrategy Parameter verarbeiten |
| Backend | workflow-executor.ts | Worktree erstellen, Working Directory setzen |
| Backend | specs-reader.ts | Resume Context mit gitStrategy speichern |

**Kritische Integration Points:**
- Frontend Dialog → Kanban Board State Management
- Frontend workflow.story.start → Backend mit gitStrategy Parameter
- Backend WebSocket Handler → WorkflowExecutor mit Working Directory
- WorkflowExecutor → Git Worktree/Branch erstellen
- Resume Context → gitStrategy und worktreePath speichern

**Handover-Dokumente (bei Multi-Layer):**
```typescript
// Message Format
interface WorkflowStoryStartMessage {
  type: 'workflow.story.start';
  specId: string;
  storyId: string;
  gitStrategy: 'branch' | 'worktree';
}

// Backend Response
interface WorkflowStartResponse {
  success: boolean;
  workingDirectory: string;  // Hauptverzeichnis oder Worktree-Pfad
  gitBranch: string;
  worktreePath?: string;     // Nur bei gitStrategy: 'worktree'
}
```

---

### Technical Details

**WAS:**

**Frontend:**
1. Neuer Dialog-Component `aos-git-strategy-dialog` erstellen
2. Dialog zeigt zwei Optionen: "Git Branch" und "Git Worktree" mit Erklärungen
3. Kanban-Board prüft ob erste Story (keine Story in_progress/done im Spec)
4. Bei erster Story: Dialog anzeigen statt direkt Workflow starten
5. Ausgewählte Strategy an `workflow.story.start` Message übergeben

**Backend:**
6. WebSocket Handler erweitern um `gitStrategy` Parameter zu verarbeiten
7. **Bei `gitStrategy: 'branch'`:**
   - Neuen Git Branch erstellen (feature/[spec-name])
   - Working Directory bleibt Hauptprojektverzeichnis
   - Branch-Name im Resume Context speichern
8. **Bei `gitStrategy: 'worktree'`:**
   - Git Worktree in `agent-os/worktrees/[spec-name]/` erstellen
   - Feature Branch im Worktree erstellen
   - **Symlink erstellen:** `agent-os/worktrees/[spec-name]/agent-os/specs/[spec-name]` → `../../agent-os/specs/[spec-name]`
   - Worktree-Pfad UND Branch im Resume Context speichern
   - **User-Anweisung ausgeben:** Claude Code muss im Worktree gestartet werden
9. Resume Context in kanban-board.md aktualisieren mit:
   - `Git Strategy`: branch | worktree
   - `Worktree Path`: Pfad oder (none)

**Wichtig: Symlink-Konzept**
Der Symlink sorgt dafür, dass die Spec-Dateien (Stories, Kanban-Board) nur eine Source of Truth haben (im Root), aber der Agent im Worktree arbeiten kann und die Specs dort "sieht".

**WIE (Architektur-Guidance ONLY):**
- **Lit Component Pattern:** Neuer Dialog als Modal-Overlay mit Light DOM
- **State Management:** `showGitStrategyDialog: boolean` State in Kanban-Board
- **Event Pattern:** Dialog emittiert Custom Event mit selected strategy
- **CSS:** Bestehende Modal-Styles oder CSS Custom Properties
- **Git Worktree:** `git worktree add agent-os/worktrees/[name] -b feature/[name]`
- **Git Branch:** `git checkout -b feature/[name]`
- **Working Directory Propagation:** Beim Starten des Workflow-Agents (z.B. via claude -p) muss das CWD explizit gesetzt werden
- **Resume Context Update:** specs-reader.ts Methode nutzen/erweitern

**WO:**
- `agent-os-ui/ui/src/components/git-strategy-dialog.ts` - Neuer Dialog
- `agent-os-ui/ui/src/components/kanban-board.ts` - Dialog Integration
- `agent-os-ui/src/server/websocket.ts` - gitStrategy Handler
- `agent-os-ui/src/server/workflow-executor.ts` - Git Setup, Working Directory
- `agent-os-ui/src/server/specs-reader.ts` - Resume Context Update

**Domain:** kanban-workflow

**Abhängigkeiten:** KSE-003

**Geschätzte Komplexität:** M

---

### Completion Check

```bash
# === FRONTEND CHECKS ===

# Dialog Component exists
test -f agent-os-ui/ui/src/components/git-strategy-dialog.ts && echo "PASS: Dialog component exists" || echo "FAIL: Dialog component missing"

# Dialog is a Lit component
grep -q "@customElement('aos-git-strategy-dialog')" agent-os-ui/ui/src/components/git-strategy-dialog.ts && echo "PASS: Dialog is Lit component" || echo "FAIL: Not a Lit component"

# Dialog has both options
grep -q "branch" agent-os-ui/ui/src/components/git-strategy-dialog.ts && grep -q "worktree" agent-os-ui/ui/src/components/git-strategy-dialog.ts && echo "PASS: Both options present" || echo "FAIL: Options missing"

# Dialog integrated in Kanban Board
grep -q "aos-git-strategy-dialog" agent-os-ui/ui/src/components/kanban-board.ts && echo "PASS: Dialog integrated" || echo "FAIL: Dialog not integrated"

# gitStrategy in workflow message (frontend)
grep -q "gitStrategy" agent-os-ui/ui/src/components/kanban-board.ts && echo "PASS: gitStrategy used" || echo "FAIL: gitStrategy missing"

# === BACKEND CHECKS ===

# Backend handles gitStrategy
grep -q "gitStrategy" agent-os-ui/src/server/websocket.ts && echo "PASS: Backend gitStrategy handler" || echo "FAIL: Backend gitStrategy missing"

# Worktree creation logic
grep -qE "(worktree|git.*worktree)" agent-os-ui/src/server/workflow-executor.ts && echo "PASS: Worktree logic" || echo "FAIL: Worktree logic missing"

# Working directory handling
grep -qE "(workingDirectory|cwd|working.*dir)" agent-os-ui/src/server/workflow-executor.ts && echo "PASS: Working directory handling" || echo "FAIL: Working directory missing"

# === BUILD & LINT CHECKS ===

# Lint frontend
cd agent-os-ui/ui && npm run lint && echo "PASS: Frontend Lint" || echo "FAIL: Frontend Lint errors"

# Lint backend
cd agent-os-ui && npm run lint && echo "PASS: Backend Lint" || echo "FAIL: Backend Lint errors"

# Build passes
cd agent-os-ui && npm run build && echo "PASS: Build" || echo "FAIL: Build errors"

# Tests pass
cd agent-os-ui && npm test && echo "PASS: Tests" || echo "FAIL: Test errors"
```

**Story ist DONE wenn:**
1. Alle FILE_EXISTS/CONTAINS checks bestanden
2. Alle *_PASS commands exit 0
3. Git diff zeigt nur erwartete Änderungen
4. Dialog zeigt beide Optionen mit Erklärungen
5. Backend erstellt Worktree bei entsprechender Auswahl
6. Working Directory wird korrekt an Workflow-Agent übergeben
