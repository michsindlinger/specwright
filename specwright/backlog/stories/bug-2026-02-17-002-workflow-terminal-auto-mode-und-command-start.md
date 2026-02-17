# Bug: Workflow Terminal Tabs - Auto-Mode oeffnet Terminal & Command startet nicht

> Bug ID: 2026-02-17-002
> Created: 2026-02-17
> Severity: Medium
> Status: Ready

**Priority**: High
**Type**: Bug - Integration (Frontend + Backend)
**Affected Component**: Kanban Auto-Mode + Cloud Terminal Manager
**Related Spec**: specwright/specs/2026-02-16-workflow-terminal-tabs/

---

## Bug Description

### Symptom

Zwei zusammenhaengende Fehler aus der Implementierung der Workflow Terminal Tabs (Spec 2026-02-16):

**Bug A:** Wenn Auto-Mode im Kanban-Board gestartet wird (`/execute-tasks`), oeffnet sich ein Cloud Terminal Fenster. Dies soll nicht passieren, da Auto-Mode im Hintergrund laeuft. Nur Aktionen aus dem Kontextmenue sollen ein Terminal oeffnen.

**Bug B:** Wenn ein Workflow-Prozess im Cloud-Terminal gestartet wird, oeffnet sich das Terminal und man sieht den eingefuegten Befehl, aber er wird nicht automatisch ausgefuehrt.

### Reproduktion

**Bug A:**
1. Kanban-Board mit Stories oeffnen
2. Auto-Mode aktivieren (Toggle-Button)
3. Auto-Mode startet eine Story
4. Cloud Terminal Sidebar oeffnet sich mit neuem Terminal-Tab

**Bug B:**
1. Story ueber Kontextmenue starten (oder anderen Workflow-Trigger)
2. Cloud Terminal oeffnet sich
3. Command-Text ist sichtbar im Terminal (z.B. `/execute-tasks specId storyId`)
4. Command wird NICHT automatisch ausgefuehrt - manuelles Enter noetig

### Expected vs. Actual

**Bug A:**
- **Expected:** Auto-Mode fuehrt Stories im Hintergrund aus, ohne Terminal zu oeffnen
- **Actual:** Jede Auto-Mode-Ausfuehrung oeffnet ein Cloud Terminal Tab

**Bug B:**
- **Expected:** Workflow-Command wird automatisch nach Terminal-Oeffnung ausgefuehrt
- **Actual:** Command-Text ist sichtbar, wird aber nicht gestartet

---

## User-Input (aus Step 2.5)

> Dokumentation des Benutzer-Wissens vor der RCA

**Hat User Vermutungen geteilt:** Nein

---

## Root-Cause-Analyse

### Hypothesen (vor Analyse)

| # | Hypothese | Wahrscheinlichkeit | Quelle | Pruefmethode |
|---|-----------|-------------------|--------|-------------|
| 1 | `triggerWorkflowStart()` dispatched `workflow-terminal-request` IMMER, ohne Auto-Mode-Check | 60% | Agent | kanban-board.ts:1303-1341 analysieren |
| 2 | Backend sendet Command mit falschem Timing an PTY (Claude CLI nicht bereit) | 25% | Agent | cloud-terminal-manager.ts:222-236 und sendInput() pruefen |
| 3 | Frontend-Session wird inkorrekt konfiguriert | 15% | Agent | aos-terminal-session.ts startWorkflowSession() pruefen |

### Pruefung

**Hypothese 1 pruefen:** triggerWorkflowStart() dispatched Terminal-Request bei Auto-Mode
- Aktion: `kanban-board.ts:1303-1341` analysiert
- Befund: Zeile 1318-1330 dispatched `workflow-terminal-request` bedingungslos. `startStoryAutoExecution()` (Zeile 1556) ruft `triggerWorkflowStart()` auf, ohne Auto-Mode-Unterscheidung. Der `autoModeEnabled`-State wird zwar in der Backend-Message (Zeile 1339) mitgesendet, aber NICHT fuer die Terminal-Request-Entscheidung genutzt.
- Ergebnis: BESTAETIGT (Bug A)
- Begruendung: Es fehlt `if (!this.autoModeEnabled)` vor dem `workflow-terminal-request` Event-Dispatch

**Hypothese 2 pruefen:** Command-Timing bei PTY-Initialisierung
- Aktion: `cloud-terminal-manager.ts:222-236` analysiert
- Befund: `createWorkflowSession()` sendet den Command via `setTimeout(() => sendInput(...), 1500ms)`. Der fixe Delay (1500ms aus `CLOUD_TERMINAL_CONFIG.WORKFLOW_COMMAND_DELAY_MS`) ist unzuverlaessig - Claude CLI benoetigt variable Zeit fuer REPL-Initialisierung. Der Command-Text wird vom PTY-Terminal-Driver geecho'd (daher sichtbar), aber die CLI verarbeitet ihn nicht als Command, weil der REPL-Prompt noch nicht bereit ist.
- Ergebnis: BESTAETIGT (Bug B)
- Begruendung: Fixer Delay statt Shell-Readiness-Detection fuehrt zu Race Condition

**Hypothese 3:** Nicht weiter geprueft (H1 und H2 bestaetigt)

### Root Cause

**Bug A - Ursache:** `triggerWorkflowStart()` in `kanban-board.ts:1318-1330` dispatched `workflow-terminal-request` bedingungslos - sowohl fuer manuelle Kontextmenue-Aktionen als auch fuer Auto-Mode-Ausfuehrungen.

**Bug B - Ursache:** `createWorkflowSession()` in `cloud-terminal-manager.ts:222-236` verwendet einen fixen 1500ms Delay (`WORKFLOW_COMMAND_DELAY_MS`) bevor der Command an das PTY gesendet wird. Die Claude CLI hat zu diesem Zeitpunkt ihren REPL-Prompt noch nicht initialisiert.

**Betroffene Dateien:**
- `ui/frontend/src/components/kanban-board.ts`: triggerWorkflowStart() fehlt Auto-Mode-Guard
- `ui/src/server/services/cloud-terminal-manager.ts`: createWorkflowSession() nutzt fixen Delay statt Readiness-Check
- `ui/src/shared/types/cloud-terminal.protocol.ts`: WORKFLOW_COMMAND_DELAY_MS Config

---

## Feature (Bug-Fix)

```gherkin
Feature: Workflow Terminal Tabs Auto-Mode und Command-Start beheben
  Als Entwickler
  moechte ich dass Auto-Mode Stories im Hintergrund ausfuehrt ohne Terminal zu oeffnen,
  und dass manuell gestartete Workflows ihren Command automatisch ausfuehren,
  damit die Workflow Terminal Tabs wie spezifiziert funktionieren.
```

---

## Akzeptanzkriterien (Gherkin-Szenarien)

### Szenario 1: Auto-Mode startet Story ohne Terminal (Bug A Fix)

```gherkin
Scenario: Auto-Mode fuehrt Story im Hintergrund aus
  Given ich bin auf dem Kanban-Board mit Auto-Mode aktiviert
  And es gibt eine Story mit Status "ready"
  When Auto-Mode die naechste Story startet
  Then wird die Story im Hintergrund ausgefuehrt
  And die Cloud Terminal Sidebar oeffnet sich NICHT
  And kein neuer Terminal-Tab wird erstellt
```

### Szenario 2: Kontextmenue oeffnet Terminal korrekt (Regression)

```gherkin
Scenario: Manueller Story-Start oeffnet Terminal-Tab
  Given ich bin auf dem Kanban-Board
  When ich eine Story ueber das Kontextmenue starte
  Then oeffnet sich die Cloud Terminal Sidebar
  And ein neuer Terminal-Tab wird erstellt
  And der Workflow-Command wird automatisch ausgefuehrt
```

### Szenario 3: Command wird automatisch ausgefuehrt (Bug B Fix)

```gherkin
Scenario: Workflow-Command startet automatisch im Terminal
  Given ein Workflow-Terminal-Tab wird geoeffnet
  When die Claude CLI bereit ist (REPL-Prompt aktiv)
  Then wird der Workflow-Command automatisch gesendet
  And der Command beginnt sofort mit der Ausfuehrung
  And kein manuelles Enter ist erforderlich
```

### Szenario 4: Regression - Bestehende Terminal-Funktionalitaet

```gherkin
Scenario: Normales Cloud Terminal funktioniert weiterhin
  Given ich oeffne ein neues Cloud Terminal (nicht Workflow)
  When das Terminal bereit ist
  Then kann ich manuell Commands eingeben
  And die bisherige Funktionalitaet ist unveraendert
```

---

## Technische Verifikation

- [ ] BUG_A_FIXED: Auto-Mode startet keine Terminal-Tabs
- [ ] BUG_B_FIXED: Workflow-Commands werden nach CLI-Readiness automatisch ausgefuehrt
- [ ] TEST_PASS: Kontextmenue-Start oeffnet Terminal korrekt (Regression)
- [ ] LINT_PASS: No linting errors
- [ ] MANUAL: Beide Bugs nicht mehr reproduzierbar

---

## Technisches Refinement

### DoR (Definition of Ready)

#### Bug-Analyse
- [x] Bug reproduzierbar
- [x] Root Cause identifiziert
- [x] Betroffene Dateien bekannt

#### Technische Vorbereitung
- [x] Fix-Ansatz definiert (WAS/WIE/WO)
- [x] Abhaengigkeiten identifiziert
- [x] Risiken bewertet

**Bug ist READY wenn alle Checkboxen angehakt sind.**

---

### DoD (Definition of Done)

- [ ] Bug A behoben: Auto-Mode oeffnet kein Terminal
- [ ] Bug B behoben: Command wird nach CLI-Readiness automatisch ausgefuehrt
- [ ] Regression Test: Kontextmenue-Start funktioniert weiterhin
- [ ] Keine neuen Bugs eingefuehrt
- [ ] Code Review durchgefuehrt
- [ ] Original Reproduktionsschritte fuehren nicht mehr zum Bug

**Bug ist DONE wenn alle Checkboxen angehakt sind.**

---

### Betroffene Layer & Komponenten (Fix-Impact)

> **PFLICHT:** Basierend auf Fix-Impact Analysis (Step 3.5)

**Fix Type:** Frontend + Backend (2-Layer Fix)

**Betroffene Komponenten:**

| Layer | Komponenten | Impact | Aenderung |
|-------|-------------|--------|----------|
| Frontend (Presentation) | kanban-board.ts | Direct | Auto-Mode-Guard in triggerWorkflowStart() |
| Backend (Service) | cloud-terminal-manager.ts | Direct | Shell-Readiness-Detection statt fixem Delay |
| Shared (Types) | cloud-terminal.protocol.ts | Indirect | Config-Anpassung (optional) |

**Kritische Integration Points:**
- kanban-board.ts -> app.ts: `workflow-terminal-request` Event darf bei Auto-Mode NICHT dispatched werden
- cloud-terminal-manager.ts -> TerminalManager: `sendInput()` erst nach CLI-Prompt-Readiness

---

### Technical Details

**WAS:**

1. **Bug A Fix:** In `triggerWorkflowStart()` (kanban-board.ts:1303-1341) den `workflow-terminal-request` Event-Dispatch (Zeile 1318-1330) mit einer Bedingung versehen: Nur dispatchen wenn `!this.autoModeEnabled`. Die Backend-Message `workflow.story.start` (Zeile 1333-1340) wird weiterhin IMMER gesendet.

2. **Bug B Fix:** In `createWorkflowSession()` (cloud-terminal-manager.ts:222-236) den fixen `setTimeout(1500ms)` durch eine PTY-Output-basierte Readiness-Detection ersetzen. Auf den Claude CLI Prompt warten (z.B. Pattern-Match auf Terminal-Output), bevor der Command gesendet wird. Fallback: Retry-Mechanismus mit inkrementellem Delay.

**WIE (Architektur-Guidance ONLY):**

- Bug A: Einfacher Guard `if (!this.autoModeEnabled)` vor dem Event-Dispatch
- Bug B: Event-basierter Ansatz: `TerminalManager` Data-Events abhoeren, auf Prompt-Pattern warten, dann `sendInput()` ausfuehren. Max-Retry mit Timeout als Fallback (z.B. 10s max wait, dann Error loggen).
- Pattern: Bestehende `onData` Events von node-pty nutzen fuer Output-Monitoring
- Constraint: DevTeam-Setup-Pattern (websocket.ts:3610-3613) sollte ebenfalls aktualisiert werden fuer Konsistenz

**WO:**

- `ui/frontend/src/components/kanban-board.ts` (Zeile 1303-1341) - Auto-Mode-Guard
- `ui/src/server/services/cloud-terminal-manager.ts` (Zeile 206-243) - Readiness-Detection
- `ui/src/shared/types/cloud-terminal.protocol.ts` (Zeile 384) - Config ggf. anpassen

**Abhaengigkeiten:** Keine externen Abhaengigkeiten

**Geschaetzte Komplexitaet:** S (Small)

---

### Completion Check

```bash
# Verify Bug A: Auto-Mode should NOT open terminal
cd ui && npm run lint
cd ui && npm test

# Verify Bug B: Check workflow command timing
cd ui && npm run build:backend

# Manual test: Auto-Mode und Kontextmenue-Start testen
```

**Bug ist DONE wenn:**
1. Auto-Mode startet Stories ohne Terminal zu oeffnen
2. Kontextmenue-Start oeffnet Terminal und Command wird automatisch ausgefuehrt
3. Keine verwandten Fehler auftreten
