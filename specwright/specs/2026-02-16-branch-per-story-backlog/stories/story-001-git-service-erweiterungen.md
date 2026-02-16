# Git-Service-Erweiterungen

> Story ID: BPS-001
> Spec: Branch-per-Story Backlog
> Created: 2026-02-16
> Last Updated: 2026-02-16

**Priority**: High
**Type**: Backend
**Estimated Effort**: S
**Dependencies**: None

---

## Feature

```gherkin
Feature: Git-Service-Methoden für Branch-per-Story
  Als Specwright Backend
  möchte ich Git-Operationen für Branch-Erstellung, PR-Erstellung und Branch-Wechsel bereitstellen,
  damit der Backlog-Execution-Flow pro Story einen eigenen Branch-Lifecycle durchführen kann.
```

---

## Akzeptanzkriterien (Gherkin-Szenarien)

### Szenario 1: Branch von main erstellen

```gherkin
Scenario: Neuer Feature-Branch wird von main erstellt
  Given das Working Directory ist auf dem "main" Branch
  And das Working Directory ist clean (keine uncommitted changes)
  When ein neuer Branch "feature/add-logging" erstellt wird
  Then existiert der Branch "feature/add-logging" lokal
  And das Working Directory ist auf "feature/add-logging" gewechselt
```

### Szenario 2: Branch existiert bereits

```gherkin
Scenario: Branch wird wiederverwendet wenn er bereits existiert
  Given der Branch "feature/add-logging" existiert bereits lokal
  When ein Branch "feature/add-logging" erstellt werden soll
  Then wird auf den existierenden Branch "feature/add-logging" gewechselt
  And es wird kein Fehler geworfen
```

### Szenario 3: Pull Request erstellen

```gherkin
Scenario: PR wird nach erfolgreicher Story-Ausführung erstellt
  Given ich bin auf dem Branch "feature/add-logging"
  And es gibt Commits auf diesem Branch
  And der Branch wurde zum Remote gepusht
  When ein Pull Request erstellt wird
  Then existiert ein offener PR von "feature/add-logging" nach "main"
  And der PR-Titel enthält den Story-Titel
```

### Szenario 4: Zurück auf main wechseln

```gherkin
Scenario: Nach PR-Erstellung wird auf main zurückgewechselt
  Given ich bin auf dem Branch "feature/add-logging"
  When auf "main" zurückgewechselt wird
  Then ist das Working Directory auf dem "main" Branch
```

### Edge Cases & Fehlerszenarien

```gherkin
Scenario: Working Directory ist nicht clean vor Branch-Erstellung
  Given das Working Directory hat uncommitted changes
  When ein neuer Branch erstellt werden soll
  Then werden die Änderungen automatisch gestasht oder committed
  And der neue Branch wird erstellt

Scenario: gh CLI ist nicht verfügbar für PR-Erstellung
  Given die gh CLI ist nicht installiert oder nicht authentifiziert
  When ein Pull Request erstellt werden soll
  Then wird eine Warnung geloggt
  And die Story gilt trotzdem als abgeschlossen
  And der Prozess wird nicht unterbrochen
```

---

## Technische Verifikation (Automated Checks)

- [ ] FILE_EXISTS: ui/src/server/services/git.service.ts
- [ ] CONTAINS: ui/src/server/services/git.service.ts enthält "createBranch"
- [ ] CONTAINS: ui/src/server/services/git.service.ts enthält "checkoutMain"
- [ ] CONTAINS: ui/src/server/services/git.service.ts enthält "pushBranch"
- [ ] CONTAINS: ui/src/server/services/git.service.ts enthält "createPullRequest"
- [ ] CONTAINS: ui/src/server/services/git.service.ts enthält "isWorkingDirectoryClean"
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

#### Qualitätssicherung
- [x] Alle Akzeptanzkriterien erfüllt (via Completion Check verifiziert)
- [x] Keine Linting Errors
- [x] Build erfolgreich
- [x] Completion Check Commands alle erfolgreich (exit 0)

#### Dokumentation
- [x] Dokumentation aktualisiert

**Story ist DONE - alle Checkboxen angehakt.**

---

### Betroffene Layer & Komponenten

**Integration Type:** Backend-only

**Betroffene Komponenten:**

| Layer | Komponenten | Änderung |
|-------|-------------|----------|
| Backend | ui/src/server/services/git.service.ts | 5 neue async Methoden in bestehender GitService Klasse |

---

### Technical Details

**WAS:**
- 5 neue Methoden in der bestehenden `GitService` Klasse hinzufügen:
  - `createBranch(projectPath, branchName, fromBranch?)` - Branch erstellen und darauf wechseln
  - `checkoutMain(projectPath)` - Auf main Branch zurückwechseln
  - `pushBranch(projectPath, branchName)` - Branch zum Remote pushen mit `-u` Flag
  - `createPullRequest(projectPath, branchName, title, body?)` - PR via `gh pr create` erstellen
  - `isWorkingDirectoryClean(projectPath)` - Prüfen ob uncommitted changes vorliegen

**WIE (Architektur-Guidance ONLY):**
- Folge dem bestehenden Pattern der GitService: `execGit()` Private-Methode für alle Git-Befehle (nutzt `execFile` statt `exec` aus Sicherheitsgründen)
- Nutze `promisify(execFile)` für async/await (bestehendes Pattern)
- Fehlerbehandlung: Werfe `GitError` mit spezifischen Error-Codes (bestehendes Pattern: `GIT_NOT_FOUND`, `TIMEOUT`, `OPERATION_FAILED`)
- Für `createPullRequest`: Nutze `gh` CLI via separaten `execFile('gh', ...)` Aufruf (nicht über `execGit`, da `gh` kein Git-Befehl ist)
- Timeout: Nutze bestehenden `GIT_CONFIG.OPERATION_TIMEOUT_MS` (30s)
- Branch-Existenz-Prüfung: `git rev-parse --verify {branchName}` vor `checkout -b`
- `isWorkingDirectoryClean`: Nutze `git status --porcelain` und prüfe auf leeren Output

**WO:**
- `ui/src/server/services/git.service.ts` - Einzige zu ändernde Datei

**Abhängigkeiten:** None

**Geschätzte Komplexität:** S

---

### Relevante Skills

| Skill | Pfad | Grund |
|-------|------|-------|
| backend-express | .claude/skills/backend-express/SKILL.md | Express/TypeScript Backend Patterns und Service-Architektur |
| quality-gates | .claude/skills/quality-gates/SKILL.md | Qualitätsstandards für Implementierung |

---

### Creates Reusable Artifacts

**Creates Reusable:** yes

**Reusable Artifacts:**

| Artefakt | Typ | Pfad | Beschreibung |
|----------|-----|------|--------------|
| GitService.createBranch | Service | ui/src/server/services/git.service.ts | Branch von beliebigem Base-Branch erstellen |
| GitService.createPullRequest | Service | ui/src/server/services/git.service.ts | PR via gh CLI erstellen |

---

### Completion Check

```bash
# Auto-Verify Commands - alle müssen mit 0 exiten
grep -q "createBranch" ui/src/server/services/git.service.ts && echo "createBranch exists"
grep -q "checkoutMain" ui/src/server/services/git.service.ts && echo "checkoutMain exists"
grep -q "pushBranch" ui/src/server/services/git.service.ts && echo "pushBranch exists"
grep -q "createPullRequest" ui/src/server/services/git.service.ts && echo "createPullRequest exists"
grep -q "isWorkingDirectoryClean" ui/src/server/services/git.service.ts && echo "isWorkingDirectoryClean exists"
cd ui && npm run lint
cd ui && npm run build:backend
```

**Story ist DONE wenn:**
1. Alle CONTAINS checks bestanden
2. Alle *_PASS commands exit 0
3. Git diff zeigt nur Änderungen in git.service.ts
