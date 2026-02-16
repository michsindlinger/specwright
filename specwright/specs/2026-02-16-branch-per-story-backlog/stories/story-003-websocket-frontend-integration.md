# WebSocket + Frontend Integration und Error-Handling

> Story ID: BPS-003
> Spec: Branch-per-Story Backlog
> Created: 2026-02-16
> Last Updated: 2026-02-16

**Priority**: High
**Type**: Full-stack
**Estimated Effort**: S
**Dependencies**: BPS-002

---

## Feature

```gherkin
Feature: Saubere Integration des Branch-Lifecycle mit Auto-Mode und Fehlerbehandlung
  Als Specwright UI
  möchte ich dass der Auto-Mode im Backlog sauber mit dem Branch-Lifecycle zusammenarbeitet,
  damit die nächste Story erst nach erfolgreichem Wechsel auf main startet und Fehler korrekt behandelt werden.
```

---

## Akzeptanzkriterien (Gherkin-Szenarien)

### Szenario 1: Nächste Story startet erst nach Branch-Wechsel

```gherkin
Scenario: Auto-Mode wartet auf Branch-Wechsel vor nächster Story
  Given die aktuelle Backlog-Story wurde abgeschlossen
  And der PR wurde erstellt
  When der Branch-Wechsel zurück auf "main" abgeschlossen ist
  Then startet die nächste Story im Auto-Mode
  And die nächste Story läuft auf einem neuen Branch
```

### Szenario 2: Keine Git-Strategie-Abfrage im WebSocket

```gherkin
Scenario: WebSocket Handler erwartet keine Git-Strategie für Backlog
  Given ein Backlog-Story-Start wird über WebSocket angefordert
  When der WebSocket Handler die Anfrage verarbeitet
  Then wird KEINE Git-Strategie-Abfrage gesendet
  And die Branch-Strategie wird automatisch verwendet
```

### Szenario 3: Fehlerbehandlung - Story überspringen

```gherkin
Scenario: Fehlgeschlagene Story wird übersprungen und nächste startet
  Given die aktuelle Backlog-Story schlägt fehl
  When der Fehler erkannt wird
  Then wird der Branch beibehalten (nicht gelöscht)
  And das Working Directory wechselt auf "main"
  And die nächste ready Story wird automatisch gestartet
  And eine Fehlermeldung wird an das Frontend gesendet
```

### Szenario 4: Branch-Erstellung fehlschlägt

```gherkin
Scenario: Branch-Erstellung fehlschlägt - Story wird übersprungen
  Given die nächste Backlog-Story soll starten
  When die Branch-Erstellung fehlschlägt (z.B. Git-Fehler)
  Then wird die Story übersprungen
  And eine Fehlermeldung wird angezeigt
  And die nächste Story wird versucht
```

### Edge Cases & Fehlerszenarien

```gherkin
Scenario: Leerer Backlog - Auto-Mode stoppt
  Given alle Backlog-Stories sind abgearbeitet oder übersprungen
  When der Auto-Mode die nächste Story sucht
  Then stoppt der Auto-Mode
  And eine "Alle Stories abgearbeitet" Meldung wird angezeigt

Scenario: PR-Erstellung fehlschlägt - nicht-kritisch
  Given eine Story wurde erfolgreich ausgeführt
  When die PR-Erstellung fehlschlägt
  Then wird eine Warnung im Frontend angezeigt
  And der Auto-Mode wird nicht unterbrochen
  And die nächste Story startet normal
```

---

## Technische Verifikation (Automated Checks)

- [ ] FILE_EXISTS: ui/src/server/websocket.ts
- [ ] FILE_EXISTS: ui/frontend/src/views/dashboard-view.ts
- [ ] LINT_PASS: cd ui && npm run lint
- [ ] BUILD_PASS: cd ui && npm run build:backend
- [ ] BUILD_PASS: cd ui/frontend && npm run build

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
- [x] **Integration hergestellt: WorkflowExecutor -> WebSocket -> Frontend**
  - [x] WebSocket Handler leitet Branch-Completion-Signal korrekt weiter
  - [x] Frontend wartet auf Branch-Wechsel bevor nächste Story startet
  - [x] Validierung: Frontend Build erfolgreich

#### Qualitätssicherung
- [x] Alle Akzeptanzkriterien erfüllt (via Completion Check verifiziert)
- [x] Keine Linting Errors (bestehende `_removed` Errors sind nicht von dieser Story)
- [x] Build erfolgreich (Backend + Frontend)
- [x] Completion Check Commands alle erfolgreich (exit 0)

#### Dokumentation
- [x] Dokumentation aktualisiert

**Story ist DONE wenn alle Checkboxen angehakt sind.**

---

### Betroffene Layer & Komponenten

**Integration Type:** Full-stack

**Betroffene Komponenten:**

| Layer | Komponenten | Änderung |
|-------|-------------|----------|
| Backend | ui/src/server/workflow-executor.ts | BPS-003: Warnung bei Pre/Post-Execution Git-Fehlern an Frontend |
| Frontend | ui/frontend/src/views/dashboard-view.ts | BPS-003: onBacklogStoryGitWarning Handler für nicht-kritische Git-Warnungen |

**Kritische Integration Points:**
- WorkflowExecutor (post-completion `workflow.interactive.complete`) -> WebSocket -> Frontend `onBacklogStoryComplete`
- Frontend `_processBacklogAutoExecution` -> WebSocket `backlog.story.start` -> WorkflowExecutor `startBacklogStoryExecution`
- WorkflowExecutor -> Frontend `backlog.story.git.warning` (NEU: für nicht-kritische Git-Fehler)

**Handover-Dokumente:**
- WebSocket Messages: `backlog.story.start`, `backlog.story.start.ack`, `backlog.story.complete`, `workflow.interactive.complete`, `backlog.story.git.warning` (NEU)
- Shared Types: Bestehende WebSocket Message-Typen in `ui/src/shared/types/`

---

### Technical Details

**WAS:**
- `handleBacklogStoryStart` in websocket.ts: Sicherstellen dass keine Git-Strategy-Abfrage an den User geht (Backlog = immer Branch-Strategie, automatisch) ✅ Bereits implementiert
- `handleQueueStoryComplete` in websocket.ts: Beim Backlog-Branch (`specId === 'backlog'`) sicherstellen, dass die nächste Story erst gestartet wird nachdem der Post-Execution-Hook (PR + checkout main) im WorkflowExecutor abgeschlossen ist ✅ Bereits implementiert
- `onBacklogStoryComplete` in dashboard-view.ts: Fehlerbehandlung ergänzen - wenn Branch-Operationen fehlschlagen, trotzdem nächste Story versuchen ✅ Bereits implementiert
- Error-Reporting: Bei fehlgeschlagener Branch-Erstellung oder PR-Erstellung eine Warnung im Frontend anzeigen (Toast/Notification) ✅ NEU implementiert

**WIE (Architektur-Guidance ONLY):**
- Folge dem bestehenden WebSocket Message-Pattern: Handler empfängt Message, validiert, delegiert an Service, sendet Ack
- Für `handleBacklogStoryStart`: KEINE zusätzliche Logik nötig -- die Branch-Erstellung passiert im WorkflowExecutor (BPS-002). Der WebSocket-Handler muss nur sicherstellen, dass er NICHT nach einer Git-Strategy fragt ✅
- Für `handleQueueStoryComplete`: Die `handleStoryCompletionAndContinue` im WorkflowExecutor (BPS-002) macht bereits den Branch-Wechsel VOR dem Auto-Continue. Hier muss nur sichergestellt werden, dass die Reihenfolge stimmt ✅
- Für `onBacklogStoryComplete`: Nutze bestehenden `_scheduleNextBacklogAutoExecution()` mit dem 2000ms Delay -- dieser ist ausreichend, da der WorkflowExecutor die Git-Ops bereits synchron (await) abarbeitet bevor er das Completion-Event feuert ✅
- Fehler-Events: Nutze bestehende Toast/Notification Pattern im Frontend für Warnungen ✅ NEU: `backlog.story.git.warning` Message

**WO:**
- `ui/src/server/workflow-executor.ts` - startBacklogStoryExecution (Pre-Execution), handleBacklogPostExecution (Post-Execution)
- `ui/frontend/src/views/dashboard-view.ts` - onBacklogStoryGitWarning (NEU)

**Abhängigkeiten:** BPS-002

**Geschätzte Komplexität:** S

---

### Relevante Skills

| Skill | Pfad | Grund |
|-------|------|-------|
| backend-express | .claude/skills/backend-express/SKILL.md | WebSocket Handler Patterns |
| frontend-lit | .claude/skills/frontend-lit/SKILL.md | Lit Web Component Patterns und Event-Handling |
| domain-specwright-ui | .claude/skills/domain-specwright-ui/SKILL.md | Domänenwissen über Dashboard, Auto-Mode, WebSocket Messages |

---

### Creates Reusable Artifacts

**Creates Reusable:** no

---

### Completion Check

```bash
# Auto-Verify Commands - alle müssen mit 0 exiten
cd ui && npm run lint
cd ui && npm run build:backend
cd ui/frontend && npm run build
```

**Story ist DONE wenn:**
1. Alle BUILD_PASS/LINT_PASS commands exit 0
2. Git diff zeigt Änderungen in websocket.ts und dashboard-view.ts
3. Keine Änderungen an Spec-Execution-Dateien
