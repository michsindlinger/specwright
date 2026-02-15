# WebSocket Terminal Protocol

> Story ID: PTY-002
> Spec: Workflow Terminal Integration
> Created: 2026-02-02
> Last Updated: 2026-02-02
> Status: Done
> Integration: TerminalManager → websocket.ts → gateway.ts

**Priority**: Critical
**Type**: Full-stack
**Estimated Effort**: TBD
**Dependencies**: PTY-001

---

## Feature

```gherkin
Feature: WebSocket-Protokoll für Terminal I/O
  Als System
  möchte ich Terminal-Daten über WebSocket in Binary Frames übertragen,
  damit Terminal I/O mit <100ms Latency bidirektional funktioniert.
```

---

## Akzeptanzkriterien (Gherkin-Szenarien)

### Szenario 1: PTY-Output wird über WebSocket an Frontend gesendet

```gherkin
Scenario: TerminalManager emittiert Output und WebSocket sendet ihn an Client
  Given ein PTY-Prozess läuft für Execution-ID "exec-123"
  And ein Frontend-Client ist via WebSocket verbunden
  When der PTY-Prozess "Hello World\n" ausgibt
  Then empfängt der Frontend-Client ein "terminal.data" Message mit "Hello World\n"
  And das Message-Format ist Binary WebSocket Frame
  And die Latency ist <100ms
```

### Szenario 2: Frontend-Input wird über WebSocket an PTY gesendet

```gherkin
Scenario: User gibt Text im Terminal ein und Input erreicht PTY
  Given ein PTY-Prozess läuft für Execution-ID "exec-123"
  And ein Frontend-Client ist verbunden
  When der Frontend-Client "terminal.input" Message mit "yes\n" sendet
  Then empfängt der PTY-Prozess "yes\n" auf stdin
  And der Workflow kann die User-Eingabe verarbeiten
```

### Szenario 3: WebSocket-Reconnect restored Terminal-Buffer

```gherkin
Scenario: Client verliert Verbindung und reconnected
  Given ein PTY-Prozess läuft und hat 50 Zeilen Output produziert
  And der Frontend-Client disconnected
  When der Client reconnected nach 3 Sekunden
  Then empfängt der Client alle 50 Zeilen aus dem Buffer
  And der Client kann weiter interagieren ohne Datenverlust
```

### Edge Cases & Fehlerszenarien

```gherkin
Scenario: PTY-Prozess sendet sehr viel Output (1000+ Zeilen)
  Given ein PTY-Prozess läuft
  When der Prozess 1000 Zeilen Output in 5 Sekunden produziert
  Then werden alle 1000 Zeilen über WebSocket gesendet
  And keine Zeile geht verloren
  And die Performance bleibt <100ms pro Message
```

---

## Business Value

**Wert für Entwickler:**
- Bidirektionale Terminal-Interaktion wie native CLI
- Keine Output-Verzögerungen durch effiziente Binary Frames
- Automatischer Buffer-Restore bei Reconnect (keine verlorenen Daten)

**Technischer Wert:**
- Binary Frames = 3-5x kleinere Payloads als JSON
- Wiederverwendung von gateway.ts Reconnect-Logic (Exponential Backoff)
- Konsistentes Message-Pattern mit bestehenden WebSocket-Types

---

## Technisches Refinement (vom Architect)

### Betroffene Layer & Komponenten

- **Integration Type:** Full-stack

- **Betroffene Komponenten Table:**

| Layer | Komponenten | Änderung |
|-------|-------------|----------|
| Backend | terminal-manager.ts, websocket.ts | Emit terminal.* events, add terminal.* message handlers |
| Frontend | gateway.ts | Add terminal.* message handling, bidirectional I/O |
| Shared | terminal.protocol.ts | Extend with WebSocket message types |

- **Kritische Integration Points:**
  - TerminalManager → websocket.ts (event emission: terminal.data, terminal.exit)
  - websocket.ts → gateway.ts (WebSocket messages: binary frames)
  - gateway.ts → (aos-terminal in PTY-003) (Custom Events)

- **Handover-Dokumente:**
  - terminal.protocol.ts extended with WebSocketTerminalMessage types
  - Binary frame format documented in code comments

### DoR (Definition of Ready)

- [x] Fachliche requirements clear (WebSocket protocol for terminal I/O)
- [x] Technical approach defined (Binary frames, message-based protocol)
- [x] Dependencies identified (PTY-001 must be complete)
- [x] Affected components known (TerminalManager, websocket.ts, gateway.ts)
- [x] Required MCP Tools documented (N/A)
- [x] Story is appropriately sized (3 files, ~350 LOC)
- [x] Full-Stack Konsistenz:
  - [x] Alle betroffenen Layer identifiziert (Backend + Frontend)
  - [x] Integration Type bestimmt (Full-stack)
  - [x] Kritische Integration Points dokumentiert
  - [x] WO deckt alle Layer ab (Backend + Frontend)

### DoD (Definition of Done)

- [x] Code implemented and follows Style Guide (TypeScript strict mode)
- [x] Architecture requirements met (Message-based protocol, Binary frames ready)
- [x] Security/Performance requirements satisfied (Binary encoding supported)
- [x] All acceptance criteria met (bidirectional I/O, reconnect with buffer restore)
- [x] Tests written and passing (Integration tests for protocol layer)
- [x] Code review approved (Self-review completed)
- [x] Documentation updated (WebSocket protocol documented in code comments)
- [x] No linting errors
- [x] Completion Check commands successful

**Integration DoD (v2.9):**

- [x] **Integration hergestellt: TerminalManager → websocket.ts**
  - [x] Import/Aufruf existiert in Code
  - [x] Verbindung ist funktional (nicht nur Stub)
  - [x] Validierung: `grep -q "emit.*terminal.data" src/server/services/terminal-manager.ts` ✓

- [x] **Integration hergestellt: websocket.ts → gateway.ts**
  - [x] Import/Aufruf existiert in Code
  - [x] Verbindung ist funktional (nicht nur Stub)
  - [x] Validierung: `grep -q "terminal\\.data" ui/src/gateway.ts` ✓

### Technical Details

**WAS:**

- Extend websocket.ts with terminal.* message handlers (terminal.data, terminal.input, terminal.resize, terminal.exit)
- Extend gateway.ts with bidirectional terminal I/O (send terminal.input, receive terminal.data)
- Add binary frame encoding/decoding (use Buffer for terminal output)
- Implement reconnect logic with buffer restore (reuse gateway.ts exponential backoff pattern)
- Extend terminal.protocol.ts with WebSocket message types

**WIE (Architecture Guidance ONLY):**

- **Follow existing WebSocket message pattern:** Copy pattern from handleWorkflowStart in websocket.ts
- **Use Binary WebSocket Frames:** Send terminal output as Buffer (not JSON) for performance
- **Reuse gateway.ts reconnect logic:** Apply existing exponential backoff pattern for terminal reconnect
- **Follow DEC-003 WebSocket Communication Pattern:** Use typed message contracts with type/payload/timestamp structure
- **Constraints:**
  - All terminal messages must use binary frames (not JSON text frames)
  - Reconnect must restore buffer from TerminalManager (no data loss)
  - Must handle terminal.resize for xterm.js auto-resize in PTY-003
  - Max 10 reconnect attempts with exponential backoff (5s → 10s → 20s → max 30s)
- **Performance:** Target <100ms WebSocket latency for terminal I/O

**WO:**

- agent-os-ui/src/server/services/terminal-manager.ts (MODIFY - add event emission)
- agent-os-ui/src/server/websocket.ts (MODIFY - add terminal.* handlers)
- agent-os-ui/ui/src/gateway.ts (MODIFY - add terminal message handling)
- agent-os-ui/src/shared/types/terminal.protocol.ts (EXTEND - add WebSocket types)

**WER:**

Full-stack Developer

**Abhängigkeiten:**

PTY-001 (TerminalManager must exist and emit events)

**Geschätzte Komplexität:**

M (Medium - extends existing WebSocket infrastructure, full-stack coordination needed)

**Relevante Skills:**

N/A (skill-index.md not available)

**Completion Check:**

```bash
# Auto-Verify Commands - all must exit with 0
grep -q "emit.*terminal.data" agent-os-ui/src/server/services/terminal-manager.ts && echo "✓ TerminalManager emits events"
grep -q "on.*terminal\\.input" agent-os-ui/src/server/websocket.ts && echo "✓ websocket.ts handles terminal.input"
grep -q "terminal\\.data" agent-os-ui/ui/src/gateway.ts && echo "✓ gateway.ts handles terminal.data"
npm run lint -- agent-os-ui/src/server/websocket.ts agent-os-ui/ui/src/gateway.ts && echo "✓ No lint errors"
npm test -- websocket-terminal.spec.ts && echo "✓ Integration tests pass"
```

**Story ist DONE wenn:**

1. Alle FILE_EXISTS/CONTAINS checks bestanden
2. Alle *_PASS commands exit 0
3. Git diff zeigt nur erwartete Änderungen (4 files: terminal-manager.ts events, websocket.ts handlers, gateway.ts messages, terminal.protocol.ts types)
