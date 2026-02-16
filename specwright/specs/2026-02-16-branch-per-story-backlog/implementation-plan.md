# Implementierungsplan: Branch-per-Story Backlog

> **Status:** APPROVED
> **Spec:** specwright/specs/2026-02-16-branch-per-story-backlog/
> **Erstellt:** 2026-02-16
> **Basiert auf:** requirements-clarification.md

---

## Executive Summary

Beim Ausführen von Backlog Stories im Auto-Modus (UI Kanban Board) soll pro Story automatisch ein separater Feature Branch `feature/{story-slug}` von `main` erstellt, die Story darauf ausgeführt, ein PR via `gh pr create` erstellt und anschließend auf `main` zurückgewechselt werden. Bei Fehlern wird die Story übersprungen, der Branch bleibt bestehen, und die nächste Story startet sauber auf einem neuen Branch von `main`. Dieses Feature betrifft ausschließlich den Backlog-Execution-Pfad in der UI -- der Spec-Execution-Flow bleibt unverändert.

---

## Architektur-Entscheidungen

### Gewählter Ansatz

Die Branch-per-Story Logik wird als Erweiterung der bestehenden `startBacklogStoryExecution`-Methode in `workflow-executor.ts` implementiert. Vor dem Start jeder Backlog Story werden die Git-Operationen (Branch erstellen, Working Directory prüfen) ausgeführt, nach Abschluss werden PR-Erstellung und Branch-Wechsel zurück auf `main` angehängt. Die bestehende Auto-Mode-Kette in `dashboard-view.ts` (via `_processBacklogAutoExecution` -> `backlog.story.start` -> `startBacklogStoryExecution`) bleibt strukturell erhalten und wird um den Git-Lifecycle erweitert.

### Begründung

1. **Minimale Änderungen**: Die Backlog-Execution nutzt bereits `startBacklogStoryExecution` als zentralen Einstiegspunkt. Dort die Git-Operationen hinzuzufügen, ist der natürlichste Punkt -- analog zur `startStoryExecution`-Methode, die bereits Branch/Worktree-Logik für Specs enthält.
2. **Kein neuer Service nötig**: Die existierende `GitService` hat bereits `checkout`, `commit`, und Hilfsfunktionen. Branch-Erstellung und PR-Erstellung können direkt über `execSync`/`spawn` im Workflow-Executor erledigt werden (selbes Pattern wie bei Spec-Execution).
3. **Keine UI-Änderung**: Der Auto-Toggle im Backlog Kanban Board existiert bereits. Die Frontend-Logik ändert sich nicht.
4. **Keine Workflow-Änderung**: Die `backlog-phase-2.md`-Workflow-Datei ist für die CLI-Nutzung via Claude Code CLI. Die UI nutzt `workflow-executor.ts` direkt. Die Workflow-Dateien müssen daher nur optional aktualisiert werden (Dokumentation).

### Patterns und Technologien

- **Pattern:** Erweiterung des bestehenden Execution-Lifecycle in `workflow-executor.ts` (analog zu `startStoryExecution` Branch-Handling)
- **Technologie:** `execSync`/`spawn` für Git-Befehle (bestehender Ansatz), `gh pr create` für PR-Erstellung
- **Begründung:** Einheitlich mit dem vorhandenen Code, kein neues Dependency nötig

---

## Komponenten-Übersicht

### Neue Komponenten

| Komponente | Typ | Verantwortlichkeit |
|------------|-----|-------------------|
| Keine neuen Komponenten | - | Alle Änderungen in bestehenden Dateien |

### Zu ändernde Komponenten

| Komponente | Dateipfad | Änderungsart | Grund |
|------------|-----------|---------------|-------|
| WorkflowExecutor | `ui/src/server/workflow-executor.ts` | Erweitern | `startBacklogStoryExecution` um Branch-Lifecycle erweitern (Branch erstellen, PR erstellen, zurück auf main) |
| WorkflowExecutor (Completion) | `ui/src/server/workflow-executor.ts` | Erweitern | `handleStoryCompletionAndContinue` oder neuer Handler für Post-Backlog-Story PR + Branch-Wechsel |
| GitService | `ui/src/server/services/git.service.ts` | Erweitern | `createBranch`, `checkoutMain`, `pushBranch`, `createPullRequest`, `isWorkingDirectoryClean` Methoden hinzufügen |
| WebSocket Handler | `ui/src/server/websocket.ts` | Erweitern | `handleBacklogStoryStart` braucht keine Git-Strategy-Abfrage (immer Branch). Post-Story-Completion-Logik (PR + checkout main) integrieren |
| Dashboard View | `ui/frontend/src/views/dashboard-view.ts` | Minimal | `_processBacklogAutoExecution` und `onBacklogStoryComplete` sicherstellen, dass nächste Story erst nach erfolgreichem Branch-Wechsel auf `main` startet |

### Nicht betroffen (explizit)

- **Spec-Execution-Flow** (`startStoryExecution`, `spec-phase-*.md`) -- bleibt komplett unverändert
- **Kanban Board UI** (`ui/frontend/src/components/kanban-board.ts`) -- Auto-Toggle existiert bereits
- **MCP Kanban Server** (`specwright/scripts/mcp/kanban-mcp-server.ts`) -- keine Änderung nötig
- **Backlog Workflow Files** (`backlog-phase-*.md`) -- CLI-seitig bleibt alles gleich
- **Queue Handler** (`ui/src/server/handlers/queue.handler.ts`) -- profitiert automatisch da `startBacklogStoryExecution` erweitert wird

---

## Umsetzungsphasen

### Phase 1: Git-Service-Erweiterungen

**Ziel:** Die fehlenden Git-Operationen im GitService bereitstellen
**Komponenten:** `git.service.ts`
**Abhängig von:** Nichts (Startphase)

Inhalte:
- `createBranch(projectPath, branchName, fromBranch?)` -- Branch von `main` erstellen und darauf wechseln. Edge Case: Branch existiert bereits -> wiederverwenden
- `checkoutMain(projectPath)` -- Sicher zurück auf `main` wechseln
- `isWorkingDirectoryClean(projectPath)` -- Prüfen ob uncommitted changes vorliegen
- `createPullRequest(projectPath, branchName, title, body?)` -- `gh pr create` ausführen
- `pushBranch(projectPath, branchName)` -- Branch zum Remote pushen

### Phase 2: Backlog-Story-Lifecycle im Workflow-Executor

**Ziel:** Branch-Erstellung vor Story, PR + Wechsel nach Story
**Komponenten:** `workflow-executor.ts`
**Abhängig von:** Phase 1

Inhalte:
- `startBacklogStoryExecution` erweitern:
  1. Vor Ausführung: Working Directory prüfen (clean?), Branch `feature/{story-slug}` von `main` erstellen, darauf wechseln
  2. Slug-Generierung: Story-Titel zu Branch-kompatiblem Slug
- Post-Execution-Hook (nach Terminal/Process Exit):
  1. Bei Erfolg: `git push`, `gh pr create`, `git checkout main`
  2. Bei Fehler: Branch behalten, nicht löschen, zurück auf `main` wechseln, nächste Story starten

### Phase 3: WebSocket + Frontend Integration und Error-Handling

**Ziel:** Saubere Integration mit Auto-Mode und Fehlerbehandlung
**Komponenten:** `websocket.ts`, `dashboard-view.ts`
**Abhängig von:** Phase 2

Inhalte:
- `handleBacklogStoryStart` in `websocket.ts`: Keine Git-Strategy-Abfrage (Backlog = immer Branch)
- `onBacklogStoryComplete` in `dashboard-view.ts`: Nächste Auto-Execution erst nach erfolgreichem `git checkout main`
- Fehlerbehandlung: Branch-Erstellung fehlschlägt -> Story überspringen, Fehler melden
- PR-Erstellung fehlschlägt -> Nicht-kritisch: Warning loggen, trotzdem weiter

---

## Komponenten-Verbindungen

| Source | Target | Verbindungsart | Zuständige Story | Validierung |
|--------|--------|----------------|-------------------|-------------|
| GitService (neue Methoden) | WorkflowExecutor | Direct Import / Method Call | Story 1 + 2 | `grep "createBranch\|createPullRequest" ui/src/server/workflow-executor.ts` |
| WorkflowExecutor (pre-execution) | GitService.createBranch | Synchroner Aufruf vor Execution | Story 2 | `grep "createBranch" ui/src/server/workflow-executor.ts` |
| WorkflowExecutor (post-completion) | GitService.createPullRequest | Async Aufruf nach Story-Ende | Story 2 | `grep "createPullRequest" ui/src/server/workflow-executor.ts` |
| WorkflowExecutor (post-completion) | GitService.checkoutMain | Async Aufruf nach PR | Story 2 | `grep "checkoutMain" ui/src/server/workflow-executor.ts` |
| dashboard-view (auto-execution) | WebSocket backlog.story.start | Bestehendes Event | Keine Änderung | Bereits verbunden |
| WebSocket handleBacklogStoryStart | WorkflowExecutor.startBacklogStoryExecution | Bestehender Aufruf | Story 3 | Bereits verbunden |

### Verbindungs-Checkliste
- [x] Jede Komponente hat mindestens eine Verbindung definiert
- [x] Jede Verbindung ist einer Story zugeordnet
- [x] Validierungsbefehle sind ausführbar

---

## Abhängigkeiten

### Interne Abhängigkeiten
```
Phase 1 (GitService) ──used by──> Phase 2 (WorkflowExecutor)
Phase 2 (WorkflowExecutor) ──used by──> Phase 3 (WebSocket + Frontend)
```

### Externe Abhängigkeiten
- **`gh` CLI**: Muss installiert und authentifiziert sein für PR-Erstellung (bestehende Voraussetzung)
- **Git Remote**: Branch muss vor PR-Erstellung gepusht werden

---

## Risiken und Mitigationen

| Risiko | Wahrscheinlichkeit | Impact | Mitigation |
|--------|-------------------|--------|------------|
| `gh` CLI nicht installiert/authentifiziert | Low | Medium | Pre-check beim ersten Backlog-Auto-Start. PR-Schritt überspringen wenn `gh` fehlt |
| Branch-Name-Kollision (Branch existiert bereits) | Medium | Low | Branch wiederverwenden: `git checkout {branch}` falls vorhanden |
| Uncommitted Changes auf `main` vor Branch-Erstellung | Medium | Medium | Pre-check mit `git status --porcelain`. Auto-stash analog zu Spec-Execution Pattern |
| Story schlägt fehl mit halben Änderungen | High (erwartet) | Low | Branch bleibt bestehen. User kann später manuell PRen oder Branch löschen |
| PR-Erstellung schlägt fehl (Netzwerk, Auth) | Low | Low | Warning loggen, trotzdem zurück auf `main` wechseln und weitermachen |
| Race Condition: Nächste Story startet bevor checkout main fertig | Medium | High | `await` erzwingen: checkout main MUSS vor nächster Story-Execution abgeschlossen sein |

---

## Self-Review Ergebnisse

### Vollständigkeit validiert

Alle 7 funktionalen Requirements aus der Clarification sind abgedeckt:
- R1: Branch-Erstellung pro Story (Phase 2)
- R2: Automatischer PR pro Story (Phase 2)
- R3: Automatischer Wechsel zurück auf Main (Phase 2)
- R4: Fehlerbehandlung Skip & Continue (Phase 3)
- R5: Keine Git-Strategie-Abfrage (Phase 3, hardcoded 'branch' für Backlog)
- R6: Keine System Stories (N/A - Backlog hat keine, keine Änderung nötig)
- R7: PR-Merge nicht erforderlich (neuer Branch immer von `main`)

### Konsistenz bestätigt

- GitService-Erweiterungen sind isoliert und testbar
- WorkflowExecutor-Erweiterung folgt bestehendem Pattern (`startStoryExecution` hat identische Struktur)
- Keine UI-Änderungen nötig (konsistent mit Requirement)

### Identifizierte Verbesserungen

| Problem | Lösung |
|---------|--------|
| Post-Story PR/Checkout muss VOR `handleStoryCompletionAndContinue` laufen | Separater Post-Completion-Hook VOR Auto-Continue, da letztere die nächste Story startet |
| `startBacklogStoryExecution` hat keinen autoMode Parameter | Nicht nötig: Auto-Mode wird vom Frontend gesteuert. Executor macht immer Branch-Lifecycle für Backlog |

---

## Minimalinvasiv-Optimierungen

### Wiederverwendbare Elemente

| Element | Gefunden in | Nutzbar für |
|---------|-------------|-------------|
| Branch-Erstellungslogik | `workflow-executor.ts` Zeilen 519-550 | Identisches Pattern für Backlog-Branch-Erstellung |
| Auto-commit vor Branch | `workflow-executor.ts` Zeilen 428-445 | Clean-Working-Dir Check |
| `execSync` Git-Befehle | `workflow-executor.ts` durchgehend | Konsistentes Pattern für neue Git-Operationen |
| GitService.checkout | `git.service.ts` | Wiederverwendbar für checkout-main |
| `handleStoryCompletionAndContinue` | `workflow-executor.ts` | Nur erweitern, nicht neu schreiben |
| `_scheduleNextBacklogAutoExecution` | `dashboard-view.ts` | Bleibt unverändert |

### Optimierungen

| Ursprünglich | Optimiert zu | Ersparnis |
|--------------|-------------|-----------|
| Neuen BacklogGitService erstellen | GitService um 4-5 Methoden erweitern | Kein neuer Service, weniger Dateien |
| Branch-Logic in WebSocket Handler | Branch-Logic in WorkflowExecutor | Zentraler Punkt, Queue-Execution profitiert automatisch |
| Eigener Post-Completion-Handler | Bestehenden Terminal-Exit-Handler mit Backlog-Erkennung erweitern | Einheitlicher Code-Pfad |
| Neues WebSocket-Event | Bestehende Events nutzen, Git-Ops sind Backend-intern | Keine Frontend-Änderung nötig |

### Feature-Preservation bestätigt
- [x] Alle Requirements aus Clarification sind abgedeckt
- [x] Kein Feature wurde geopfert
- [x] Alle Akzeptanzkriterien bleiben erfüllbar
- [x] Spec-Execution bleibt komplett unverändert
- [x] Backlog Auto-Mode weiterhin funktional
- [x] Queue-Execution profitiert automatisch

---

## Kritische Dateien für Implementierung

| Datei | Rolle |
|-------|-------|
| `ui/src/server/services/git.service.ts` | Neue Methoden: createBranch, checkoutMain, pushBranch, createPullRequest, isWorkingDirectoryClean |
| `ui/src/server/workflow-executor.ts` | Core-Logik: startBacklogStoryExecution um Branch-Lifecycle erweitern |
| `ui/src/server/websocket.ts` | handleBacklogStoryStart + handleQueueStoryComplete für Backlog-Semantik |
| `ui/frontend/src/views/dashboard-view.ts` | onBacklogStoryComplete + _processBacklogAutoExecution: Timing für Branch-Wechsel |
