# Backend PTY Service

> Story ID: PTY-001
> Spec: Workflow Terminal Integration
> Created: 2026-02-02
> Last Updated: 2026-02-02
> Integration: WorkflowExecutor → TerminalManager

**Priority**: Critical
**Type**: Backend
**Estimated Effort**: TBD
**Dependencies**: None

---

## Feature

```gherkin
Feature: Backend PTY Service für Terminal-Integration
  Als Backend-System
  möchte ich PTY-Prozesse für Workflows spawnen und verwalten,
  damit Terminal-Output nativ erfasst und weitergeleitet werden kann.
```

---

## Akzeptanzkriterien (Gherkin-Szenarien)

> **Gherkin Best Practices:**
> - Ein Verhalten pro Szenario (fokussiert & testbar)
> - Konkrete Werte statt Platzhalter
> - Nutzer-Perspektive, keine technischen Details
> - Deklarativ: WAS passiert, nicht WIE

### Szenario 1: PTY-Prozess wird erfolgreich gespawnt

```gherkin
Scenario: WorkflowExecutor startet einen Workflow und spawnt PTY-Prozess
  Given der WorkflowExecutor erhält einen Workflow-Start-Request mit Execution-ID "exec-123"
  When der WorkflowExecutor den TerminalManager aufruft
  Then wird ein PTY-Prozess für "exec-123" gespawnt
  And der PTY-Prozess läuft mit PID > 0
  And der PTY-Output wird in einem Buffer gespeichert
```

### Szenario 2: PTY-Output wird erfasst und gebuffert

```gherkin
Scenario: PTY-Prozess sendet Output und Buffer speichert ihn
  Given ein PTY-Prozess läuft für Execution-ID "exec-123"
  When der PTY-Prozess 100 Zeilen Output produziert
  Then sind alle 100 Zeilen im Terminal-Buffer gespeichert
  And der Buffer enthält alle ANSI-Escape-Codes unverändert
```

### Szenario 3: Mehrere PTY-Prozesse laufen isoliert

```gherkin
Scenario: Mehrere Workflows spawnen isolierte PTY-Prozesse
  Given WorkflowExecutor startet Workflow "exec-1" mit Command "npm test"
  And WorkflowExecutor startet Workflow "exec-2" mit Command "npm run build"
  When beide PTY-Prozesse laufen gleichzeitig
  Then haben beide Prozesse unterschiedliche PIDs
  And der Output von "exec-1" ist isoliert von "exec-2"
  And jeder Buffer enthält nur Output seines eigenen Prozesses
```

### Edge Cases & Fehlerszenarien

```gherkin
Scenario: PTY-Prozess crashed mit Exit-Code
  Given ein PTY-Prozess läuft für Execution-ID "exec-123"
  When der PTY-Prozess mit Exit-Code 1 terminiert
  Then wird ein "terminal.exit" Event mit Code 1 emittiert
  And der Terminal-Buffer bleibt erhalten (für Review)
  And der PTY-Prozess wird aus der Process-Map entfernt
```

```gherkin
Scenario: WorkflowExecutor ruft TerminalManager mit ungültiger Execution-ID
  Given der TerminalManager läuft
  When WorkflowExecutor versucht einen PTY-Prozess mit leerer Execution-ID zu spawnen
  Then wird ein Error geworfen mit "executionId is required"
  And kein PTY-Prozess wird gespawnt
```

---

## Technische Verifikation (Automated Checks)

> **Hinweis:** Wird vom Architect gefüllt

---

## Business Value

**Wert für Entwickler:**
- Workflow-Output wird nativ erfasst (keine Mapping-Fehler mehr)
- PTY ermöglicht volle Terminal-Features (ANSI-Codes, Resize, Signals)
- Session-Isolation verhindert Cross-Contamination zwischen Workflows

**Technischer Wert:**
- Saubere Separation of Concerns (WorkflowExecutor → TerminalManager)
- Testbar durch klare Interfaces
- Wiederverwendung von bewährtem WorkflowExecutor.executionMap Pattern

**Risiko-Mitigation:**
- Automatisches Cleanup verhindert Memory-Leaks
- Max-Buffer-Size verhindert Overflows
- Isolation verhindert Security-Issues

---

## Technisches Refinement (vom Architect)

### Betroffene Layer & Komponenten

- **Integration Type:** Backend-only

- **Betroffene Komponenten Table:**

| Layer | Komponenten | Änderung |
|-------|-------------|----------|
| Backend | TerminalManager (neu), workflow-executor.ts | Create TerminalManager service, integrate with WorkflowExecutor |
| Backend | terminal.protocol.ts (neu) | Define TypeScript types for terminal messages |

- **Kritische Integration Points:**
  - WorkflowExecutor → TerminalManager (method call: spawn/write/resize)

- **Handover-Dokumente:**
  - terminal.protocol.ts defines interfaces for PTY-002 to consume

### DoR (Definition of Ready)

- [x] Fachliche requirements clear (PTY service for workflow execution)
- [x] Technical approach defined (Adapter Pattern, node-pty)
- [x] Dependencies identified (None - this is the foundation)
- [x] Affected components known (TerminalManager, WorkflowExecutor)
- [x] Required MCP Tools documented (N/A)
- [x] Story is appropriately sized (3 files, ~300 LOC)
- [x] Full-Stack Konsistenz:
  - [x] Alle betroffenen Layer identifiziert (Backend-only)
  - [x] Integration Type bestimmt (Backend-only)
  - [x] Kritische Integration Points dokumentiert
  - [x] WO deckt alle Layer ab

### DoD (Definition of Done)

- [ ] Code implemented and follows Style Guide (TypeScript strict mode)
- [ ] Architecture requirements met (Adapter Pattern, Layered Architecture)
- [ ] Security/Performance requirements satisfied (Auth tokens, max buffer size, process cleanup)
- [ ] All acceptance criteria met (PTY spawn, buffer, isolation)
- [ ] Tests written and passing (Unit tests for TerminalManager)
- [ ] Code review approved
- [ ] Documentation updated (JSDoc for public APIs)
- [ ] No linting errors
- [ ] Completion Check commands successful

**Integration DoD (v2.9):**

- [ ] **Integration hergestellt: WorkflowExecutor → TerminalManager**
  - [ ] Import/Aufruf existiert in Code
  - [ ] Verbindung ist funktional (nicht nur Stub)
  - [ ] Validierung: `grep -q "terminalManager.spawn" agent-os-ui/src/server/workflow-executor.ts`

### Technical Details

**WAS:**

- Create TerminalManager service that wraps node-pty for PTY process lifecycle management
- Define terminal.protocol.ts with TypeScript interfaces for terminal messages and events
- Integrate TerminalManager into WorkflowExecutor (replace direct spawn() calls)
- Implement in-memory buffer for terminal output (up to 10MB per session)
- Implement session isolation using execution-ID-based Map
- Implement automatic cleanup after 5 minutes of inactivity

**WIE (Architecture Guidance ONLY):**

- **Use Adapter Pattern:** TerminalManager acts as adapter between WorkflowExecutor and node-pty
- **Follow existing WorkflowExecutor.executionMap pattern:** Use Map<executionId, TerminalSession> for session isolation
- **Follow EventEmitter pattern from WorkflowExecutor:** Emit events (terminal.data, terminal.exit) for PTY output
- **Use Service Layer pattern:** Place TerminalManager in server/services/ (same layer as WorkflowExecutor)
- **Constraints:**
  - No direct PTY access from WorkflowExecutor - all calls go through TerminalManager
  - Must use TypeScript strict mode (no `any` types)
  - Max buffer size 10MB per session (prevent memory overflow)
  - Automatic cleanup after 5min inactivity (prevent process leaks)
- **Security:** PTY processes run with same privileges as Node.js process (least privilege)

**WO:**

- agent-os-ui/src/server/services/terminal-manager.ts (NEW - TerminalManager class)
- agent-os-ui/src/server/workflow-executor.ts (MODIFY - integrate TerminalManager.spawn())
- agent-os-ui/src/shared/types/terminal.protocol.ts (NEW - TypeScript interfaces)

**WER:**

Backend Developer

**Abhängigkeiten:**

None

**Geschätzte Komplexität:**

M (Medium - new service with process management, but well-defined scope)

**Relevante Skills:**

N/A (skill-index.md not available)

**Completion Check:**

```bash
# Auto-Verify Commands - all must exit with 0
test -f agent-os-ui/src/server/services/terminal-manager.ts && echo "✓ TerminalManager exists"
test -f agent-os-ui/src/shared/types/terminal.protocol.ts && echo "✓ terminal.protocol.ts exists"
grep -q "terminalManager.spawn" agent-os-ui/src/server/workflow-executor.ts && echo "✓ Integration exists"
npm run lint -- agent-os-ui/src/server/services/terminal-manager.ts && echo "✓ No lint errors"
npm test -- terminal-manager.spec.ts && echo "✓ Tests pass"
```

**Story ist DONE wenn:**

1. Alle FILE_EXISTS/CONTAINS checks bestanden
2. Alle *_PASS commands exit 0
3. Git diff zeigt nur erwartete Änderungen (3 files: new TerminalManager, modified WorkflowExecutor, new protocol types)
