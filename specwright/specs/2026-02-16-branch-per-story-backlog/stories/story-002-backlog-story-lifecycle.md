# Backlog-Story-Lifecycle im Workflow-Executor

> Story ID: BPS-002
> Spec: Branch-per-Story Backlog
> Created: 2026-02-16
> Last Updated: 2026-02-16

**Priority**: High
**Type**: Backend
**Estimated Effort**: S
**Dependencies**: BPS-001

---

## Feature

```gherkin
Feature: Branch-Lifecycle pro Backlog-Story im Workflow-Executor
  Als Specwright Backend
  möchte ich vor jeder Backlog-Story einen Branch erstellen und nach Abschluss einen PR erstellen und auf main zurückwechseln,
  damit jede Backlog-Story isoliert auf ihrem eigenen Branch ausgeführt wird.
```

---

## Akzeptanzkriterien (Gherkin-Szenarien)

### Szenario 1: Branch wird vor Story-Ausführung erstellt

```gherkin
Scenario: Vor Backlog-Story-Start wird ein Feature-Branch erstellt
  Given der Auto-Modus auf dem Backlog Kanban Board ist aktiv
  And die nächste Story "Add Logging" mit Slug "add-logging" ist ready
  When die Story-Ausführung startet
  Then wird ein Branch "feature/add-logging" von "main" erstellt
  And die Story wird auf dem Branch "feature/add-logging" ausgeführt
```

### Szenario 2: PR wird nach erfolgreicher Story erstellt

```gherkin
Scenario: Nach erfolgreicher Backlog-Story wird ein PR erstellt
  Given die Story "Add Logging" wurde erfolgreich auf Branch "feature/add-logging" ausgeführt
  When die Story als abgeschlossen markiert wird
  Then wird der Branch "feature/add-logging" zum Remote gepusht
  And ein Pull Request wird von "feature/add-logging" nach "main" erstellt
  And das Working Directory wechselt zurück auf "main"
```

### Szenario 3: Nächste Story startet auf neuem Branch

```gherkin
Scenario: Nächste Story bekommt eigenen Branch
  Given die Story "Add Logging" wurde abgeschlossen und PR erstellt
  And das Working Directory ist zurück auf "main"
  When die nächste Story "Fix Header" mit Slug "fix-header" startet
  Then wird ein neuer Branch "feature/fix-header" von "main" erstellt
  And die Story wird auf "feature/fix-header" ausgeführt
```

### Szenario 4: Backlog nutzt immer Branch-Strategie

```gherkin
Scenario: Keine Git-Strategie-Abfrage beim Backlog
  Given der Auto-Modus auf dem Backlog Kanban Board wird gestartet
  When die erste Story beginnt
  Then wird KEINE Abfrage zur Git-Strategie angezeigt
  And es wird automatisch die Branch-Strategie verwendet
```

### Edge Cases & Fehlerszenarien

```gherkin
Scenario: Story schlägt fehl - Branch bleibt bestehen
  Given die Story "Add Logging" wird auf Branch "feature/add-logging" ausgeführt
  When die Story-Ausführung fehlschlägt
  Then bleibt der Branch "feature/add-logging" bestehen
  And das Working Directory wechselt zurück auf "main"
  And die nächste Story startet auf einem neuen Branch

Scenario: PR-Erstellung schlägt fehl - Story gilt trotzdem als bearbeitet
  Given die Story "Add Logging" wurde erfolgreich ausgeführt
  When die PR-Erstellung fehlschlägt (z.B. Netzwerkfehler)
  Then wird eine Warnung geloggt
  And das Working Directory wechselt trotzdem zurück auf "main"
  And die nächste Story startet normal
```

---

## Technische Verifikation (Automated Checks)

- [ ] FILE_EXISTS: ui/src/server/workflow-executor.ts
- [ ] CONTAINS: ui/src/server/workflow-executor.ts enthält "createBranch"
- [ ] CONTAINS: ui/src/server/workflow-executor.ts enthält "createPullRequest"
- [ ] CONTAINS: ui/src/server/workflow-executor.ts enthält "checkoutMain"
- [ ] CONTAINS: ui/src/server/workflow-executor.ts enthält "feature/"
- [ ] LINT_PASS: cd ui && npm run lint
- [ ] BUILD_PASS: cd ui && npm run build:backend

---

## Required MCP Tools

Keine MCP Tools erforderlich.

---

## Technisches Refinement (vom Architect)

> **Dieser Abschnitt wird in Step 3 vom Architect ausgefüllt.**

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

#### Full-Stack Konsistenz
- [x] Alle betroffenen Layer identifiziert
- [x] Integration Type bestimmt
- [x] Kritische Integration Points dokumentiert (wenn Full-stack)
- [x] WO deckt ALLE Layer ab (wenn Full-stack)

**Story ist READY - alle Checkboxen angehakt.**

---

### DoD (Definition of Done) - Vom Architect

#### Implementierung
- [x] Code implementiert und folgt Style Guide
- [x] Architektur-Vorgaben eingehalten (WIE section)
- [x] Security/Performance Anforderungen erfüllt

#### Integration
- [x] **Integration hergestellt: GitService -> WorkflowExecutor**
  - [x] Import/Aufruf von gitService existiert in workflow-executor.ts
  - [x] Verbindung ist funktional (nicht nur Stub)
  - [x] Validierung: `grep -q "gitService" ui/src/server/workflow-executor.ts`

#### Qualitätssicherung
- [x] Alle Akzeptanzkriterien erfüllt (via Completion Check verifiziert)
- [x] Keine Linting Errors
- [x] Build erfolgreich
- [x] Completion Check Commands alle erfolgreich (exit 0)

#### Dokumentation
- [x] Dokumentation aktualisiert

**Story ist DONE wenn alle Checkboxen angehakt sind.**

---

### Betroffene Layer & Komponenten

**Integration Type:** Backend-only

**Betroffene Komponenten:**

| Layer | Komponenten | Änderung |
|-------|-------------|----------|
| Backend | ui/src/server/workflow-executor.ts | startBacklogStoryExecution um Pre-Execution (Branch erstellen) und Post-Execution (PR + checkout main) erweitern |

**Kritische Integration Points:**
- GitService.createBranch -> WorkflowExecutor.startBacklogStoryExecution (Pre-Execution)
- GitService.pushBranch + createPullRequest + checkoutMain -> WorkflowExecutor terminal.exit Handler (Post-Execution)

---

### Technical Details

**WAS:**
- `startBacklogStoryExecution` erweitern um Pre-Execution Git-Operationen:
  1. `isWorkingDirectoryClean` prüfen (ggf. stash)
  2. `checkoutMain` sicherstellen (falls nicht auf main)
  3. `createBranch` mit `feature/{story-slug}` von `main`
- Post-Execution Hook im terminal.exit Handler erweitern:
  - Bei Erfolg: `pushBranch`, `createPullRequest`, `checkoutMain`
  - Bei Fehler: `checkoutMain` (Branch behalten)
- Slug-Generierung für Branch-Namen aus Story-Titel

**WIE (Architektur-Guidance ONLY):**
- Folge dem Pattern von `startStoryExecution` (KSE-005), welche bereits Branch/Worktree-Logik enthält
- Importiere `gitService` Singleton aus `services/git.service.ts`
- Pre-Execution: VOR dem `runClaudeCommand` Aufruf die Git-Operationen durchführen
- Post-Execution: Im bestehenden `terminal.exit` Event-Handler (Zeile ~157) einen Branch für Backlog-Executions hinzufügen
- Post-Completion MUSS VOR `handleStoryCompletionAndContinue` laufen (sequentiell, await)
- Speichere `branchName` im `WorkflowExecution`-Objekt für den Post-Execution-Hook
- PR-Titel-Format: `feat: {storyTitle}` (konsistent mit Spec-Execution)
- Fehlerbehandlung: try/catch um jeden Git-Schritt. Bei Fehler: loggen und weitermachen (nicht den gesamten Flow abbrechen)

**WO:**
- `ui/src/server/workflow-executor.ts` - Einzige zu ändernde Datei

**Abhängigkeiten:** BPS-001

**Geschätzte Komplexität:** S

---

### Relevante Skills

| Skill | Pfad | Grund |
|-------|------|-------|
| backend-express | .claude/skills/backend-express/SKILL.md | Express/TypeScript Backend Patterns |
| domain-specwright-ui | .claude/skills/domain-specwright-ui/SKILL.md | Domänenwissen über Workflow-Executor und Backlog-Execution |

---

### Creates Reusable Artifacts

**Creates Reusable:** no

---

### Completion Check

```bash
# Auto-Verify Commands - alle müssen mit 0 exiten
grep -q "createBranch" ui/src/server/workflow-executor.ts && echo "createBranch call exists"
grep -q "createPullRequest" ui/src/server/workflow-executor.ts && echo "createPullRequest call exists"
grep -q "checkoutMain" ui/src/server/workflow-executor.ts && echo "checkoutMain call exists"
grep -q "feature/" ui/src/server/workflow-executor.ts && echo "feature/ prefix exists"
cd ui && npm run lint
cd ui && npm run build:backend
```

**Story ist DONE wenn:**
1. Alle CONTAINS checks bestanden
2. Alle *_PASS commands exit 0
3. Git diff zeigt Änderungen in workflow-executor.ts
