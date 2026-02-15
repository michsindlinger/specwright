# View Switching Logic

> Story ID: PTY-004
> Spec: Workflow Terminal Integration
> Created: 2026-02-02
> Last Updated: 2026-02-02
> Status: Done
> Integration: workflow-view.ts → aos-terminal, execution-store.ts → aos-terminal

**Priority**: High
**Type**: Frontend
**Estimated Effort**: TBD
**Dependencies**: PTY-003

---

## Feature

```gherkin
Feature: Automatischer View-Switch zu Terminal bei Workflow-Start
  Als Entwickler
  möchte ich automatisch das Terminal sehen wenn ein Workflow startet,
  damit ich nicht manuell zwischen Views wechseln muss.
```

---

## Akzeptanzkriterien (Gherkin-Szenarien)

### Szenario 1: Terminal erscheint automatisch bei Workflow-Start

```gherkin
Scenario: User startet Workflow vom Dashboard
  Given ich bin auf dem Dashboard
  And ich sehe eine Workflow-Karte "Execute Story PTY-001"
  When ich auf "Start Workflow" klicke
  Then wechselt die View automatisch zum Terminal
  And das Terminal zeigt sofort den Workflow-Output
  And die Chat-UI ist nicht mehr sichtbar
```

### Szenario 2: Terminal bleibt offen nach Workflow-Ende

```gherkin
Scenario: Workflow endet erfolgreich
  Given ein Workflow läuft und das Terminal zeigt Output
  When der Workflow mit Exit-Code 0 beendet wird
  Then bleibt das Terminal sichtbar mit letztem Output
  And ich sehe einen "Zurück zum Dashboard"-Button
  And ich sehe den Exit-Code "Process exited with code 0"
```

### Szenario 3: User kann zurück zum Dashboard

```gherkin
Scenario: User klickt "Zurück zum Dashboard" nach Workflow-Ende
  Given ein Workflow ist beendet und das Terminal zeigt Exit-Code
  When ich auf "Zurück zum Dashboard" klicke
  Then wechselt die View zurück zum Dashboard
  And die Terminal-Session wird geschlossen
```

### Szenario 4: Mehrere Workflows haben isolierte Terminals

```gherkin
Scenario: User startet 2 Workflows parallel
  Given ich starte Workflow A vom Dashboard
  And das Terminal A zeigt Output von Workflow A
  When ich zurück zum Dashboard gehe und Workflow B starte
  Then öffnet sich Terminal B mit Output von Workflow B
  And ich kann zwischen beiden Workflows wechseln via Dashboard
  And jedes Terminal zeigt nur seinen eigenen Output
```

### Edge Cases & Fehlerszenarien

```gherkin
Scenario: Workflow crashed mit Fehler
  Given ein Workflow läuft
  When der Workflow mit Exit-Code 1 crashed
  Then bleibt das Terminal offen mit Fehler-Output
  And ich sehe "Process exited with code 1"
  And der "Zurück zum Dashboard"-Button ist verfügbar
```

---

## Business Value

**Wert für Entwickler:**
- Nahtloser UX-Flow (kein manuelles Switching)
- Terminal bleibt offen für Review nach Workflow-Ende
- Multi-Workflow-Support ohne UI-Confusion

**Technischer Wert:**
- Wiederverwendung von execution-store.ts für State-Management
- Conditional Rendering (einfach testbar)
- Clean Separation: workflow-view.ts orchestriert, aos-terminal rendert

---

## Technisches Refinement (vom Architect)

### Betroffene Layer & Komponenten

- **Integration Type:** Frontend-only

- **Betroffene Komponenten Table:**

| Layer | Komponenten | Änderung |
|-------|-------------|----------|
| Frontend | workflow-view.ts | Add conditional rendering for terminal vs chat |
| Frontend | execution-store.ts | Add terminal session state management |
| Frontend | aos-terminal | Bind terminalSessionId property from execution-store |

- **Kritische Integration Points:**
  - workflow-view.ts → aos-terminal (Component render: `<aos-terminal>`)
  - execution-store.ts → aos-terminal (Property binding: terminalSessionId)

- **Handover-Dokumente:**
  - execution-store.ts state interface documented for future features

### DoR (Definition of Ready)

- [x] Fachliche requirements clear (Automatic view switch to terminal on workflow start)
- [x] Technical approach defined (Conditional rendering, execution-store state)
- [x] Dependencies identified (PTY-003 aos-terminal must exist)
- [x] Affected components known (workflow-view.ts, execution-store.ts, aos-terminal)
- [x] Required MCP Tools documented (N/A)
- [x] Story is appropriately sized (2 files, ~150 LOC)
- [x] Full-Stack Konsistenz:
  - [x] Alle betroffenen Layer identifiziert (Frontend-only)
  - [x] Integration Type bestimmt (Frontend-only)
  - [x] Kritische Integration Points dokumentiert
  - [x] WO deckt alle Layer ab

### DoD (Definition of Done)

- [x] Code implemented and follows Style Guide (TypeScript strict mode, Lit conventions)
- [x] Architecture requirements met (Conditional rendering, state management)
- [x] Security/Performance requirements satisfied (N/A for view logic)
- [x] All acceptance criteria met (auto-switch, terminal stays open, back button, multi-workflow)
- [x] Tests written and passing (UI tests for view switching)
- [x] Code review approved
- [x] Documentation updated (State management documented)
- [x] No linting errors
- [x] Completion Check commands successful

**Integration DoD (v2.9):**

- [x] **Integration hergestellt: workflow-view.ts → aos-terminal**
  - [x] Import/Aufruf existiert in Code
  - [x] Verbindung ist funktional (nicht nur Stub)
  - [x] Validierung: `grep -q "<aos-terminal" agent-os-ui/ui/src/views/workflow-view.ts`

- [x] **Integration hergestellt: execution-store.ts → aos-terminal**
  - [x] Import/Aufruf existiert in Code
  - [x] Verbindung ist funktional (nicht nur Stub)
  - [x] Validierung: `grep -q "terminalSessionId" agent-os-ui/ui/src/components/aos-terminal.ts`

### Technical Details

**WAS:**

- Modify workflow-view.ts to conditionally render terminal (when workflow active) or chat (when workflow inactive)
- Extend execution-store.ts with terminal session state (terminalSessionId, terminalActive, exitCode)
- Add "Back to Dashboard" button to workflow-view when workflow ends
- Bind aos-terminal.terminalSessionId to execution-store state
- Implement multi-workflow support (each execution has own terminal session)

**WIE (Architecture Guidance ONLY):**

- **Use Conditional Rendering:** Follow Lit pattern `${this.terminalActive ? html'<aos-terminal>' : html'<chat-view>'}`
- **Reuse execution-store pattern:** Follow existing state management in execution-store.ts
- **Follow Lit reactive properties:** Use @property() and requestUpdate() for state changes
- **Constraints:**
  - Terminal must auto-show on workflow start (no manual switching)
  - Terminal must remain visible after workflow end (for review)
  - Back button only visible when workflow ended (exitCode !== null)
  - Each workflow execution must have isolated terminal (use executionId as key)
- **UX:** Smooth transition (no flicker) between chat and terminal views

**WO:**

- agent-os-ui/ui/src/views/workflow-view.ts (MODIFY - conditional rendering)
- agent-os-ui/ui/src/state/execution-store.ts (EXTEND - terminal session state)

**WER:**

Frontend Developer

**Abhängigkeiten:**

PTY-003 (aos-terminal component must exist and be renderable)

**Geschätzte Komplexität:**

S (Small - mostly conditional rendering, state management is straightforward)

**Relevante Skills:**

N/A (skill-index.md not available)

**Completion Check:**

```bash
# Auto-Verify Commands - all must exit with 0
grep -q "<aos-terminal" agent-os-ui/ui/src/views/workflow-view.ts && echo "✓ workflow-view renders terminal"
grep -q "terminalSessionId" agent-os-ui/ui/src/state/execution-store.ts && echo "✓ execution-store has terminal state"
grep -q "terminalSessionId" agent-os-ui/ui/src/components/aos-terminal.ts && echo "✓ aos-terminal accepts sessionId"
npm run lint -- agent-os-ui/ui/src/views/workflow-view.ts agent-os-ui/ui/src/state/execution-store.ts && echo "✓ No lint errors"
npm test -- workflow-view.spec.ts && echo "✓ UI tests pass"
```

**Story ist DONE wenn:**

1. Alle FILE_EXISTS/CONTAINS checks bestanden
2. Alle *_PASS commands exit 0
3. Git diff zeigt nur erwartete Änderungen (2 files: workflow-view.ts conditional rendering, execution-store.ts state extension)
