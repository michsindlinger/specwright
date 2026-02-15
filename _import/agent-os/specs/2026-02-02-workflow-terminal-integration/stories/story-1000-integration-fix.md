# Integration Edge Case Fixes

> Story ID: PTY-1000
> Spec: Workflow Terminal Integration
> Created: 2026-02-02
> Status: Done

**Priority**: High
**Type**: Bug Fix
**Estimated Effort**: S (Small)
**Dependencies**: PTY-999

---

## Feature

```gherkin
Feature: Terminal Integration Edge Case Fixes
  Als System
  möchte ich dass Edge-Cases in der Terminal-Integration korrekt behandelt werden,
  damit das System robust und produktionsreif ist.
```

---

## Akzeptanzkriterien (Gherkin-Szenarien)

### Szenario 1: Session Cleanup nach Kill

```gherkin
Scenario: Session wird sofort nach kill() entfernt
  Given ein Terminal-Session existiert für executionId "exec-1"
  When terminalManager.kill("exec-1") aufgerufen wird
  Then returned die Methode true
  And die Session existiert nicht mehr in terminalManager.sessions
  And getActiveSessionIds() enthält "exec-1" nicht mehr
```

### Szenario 2: Graceful Error Handling bei Write

```gherkin
Scenario: Write zu nicht-existierender Session wirft keinen Exception
  Given keine Terminal-Session existiert für executionId "non-existent"
  When terminalManager.write("non-existent", "test input") aufgerufen wird
  Then wird KEIN Exception geworfen
  And die Methode returned false oder loggt eine Warning
```

### Szenario 3: Deprecated done() Callbacks

```gherkin
Scenario: Terminal.exit Event Test nutzt async/await statt done()
  Given ein PTY-Prozess läuft
  When der Prozess mit Exit-Code 0 endet
  Then wird terminal.exit Event emitted
  And der Test verwendet async/await pattern (nicht done())
```

---

## Business Value

**Wert für Entwickler:**
- Produktionsreife Error-Handling-Implementierung
- Keine unerwarteten Exceptions bei Edge-Cases
- Moderne async/await Patterns (keine deprecated done() callbacks)

**Technischer Wert:**
- **100% Integration Test Pass Rate:** Alle 37 Tests grün
- Robuste Session-Verwaltung (immediate cleanup after kill)
- Graceful degradation bei nicht-existierenden Sessions

---

## Technisches Refinement

### Betroffene Layer & Komponenten

- **Integration Type:** Backend-only (TerminalManager service)

- **Betroffene Komponenten Table:**

| Layer | Komponenten | Änderung |
|-------|-------------|----------|
| Backend | terminal-manager.ts | Fix kill() cleanup, fix write() error handling |
| Test | terminal-spawn.test.ts | Replace done() with async/await |

### DoR (Definition of Ready)

- [x] Fachliche requirements clear (Fix 2 high-priority issues from integration validation)
- [x] Technical approach defined (Immediate session deletion, graceful error handling)
- [x] Dependencies identified (PTY-999 complete)
- [x] Affected components known (terminal-manager.ts, terminal-spawn.test.ts)
- [x] Story is appropriately sized (2 small fixes, ~10 LOC changes)

### DoD (Definition of Done)

- [x] Code implemented and follows Style Guide
- [x] All acceptance criteria met
- [x] Tests written and passing (37/37 integration tests pass)
- [x] Code review approved (self-review)
- [x] No linting errors
- [x] Completion Check commands successful

### Technical Details

**WAS:**

Fix 2 high-priority edge cases from integration validation:

1. **Session Cleanup in kill()** (terminal-manager.ts:182-196)
   - Current: Session persists after kill() returns true
   - Expected: Session immediately deleted from this.sessions
   - Fix: Add `this.sessions.delete(executionId)` immediately after kill

2. **Graceful Error Handling in write()** (terminal-manager.ts:124-133)
   - Current: Throws exception for non-existent session
   - Expected: Returns false or logs warning (no exception)
   - Fix: Change throw to return false + warning log

3. **Replace deprecated done() callback** (terminal-spawn.test.ts:81)
   - Current: Uses done() callback pattern
   - Expected: Uses async/await pattern
   - Fix: Convert test to async function, use await instead of done()

**WIE (Implementation Guidance):**

1. **terminal-manager.ts - kill() method:**
   ```typescript
   public kill(executionId: string): boolean {
     const session = this.sessions.get(executionId);
     if (!session) return false;

     try {
       session.pty.kill();
       this.sessions.delete(executionId); // ADD THIS LINE
       return true;
     } catch (error) {
       return false;
     }
   }
   ```

2. **terminal-manager.ts - write() method:**
   ```typescript
   public write(executionId: string, data: string): boolean {
     const session = this.sessions.get(executionId);
     if (!session) {
       console.warn(`Terminal session not found: ${executionId}`);
       return false; // CHANGE: return false instead of throw
     }

     try {
       session.pty.write(data);
       return true;
     } catch (error) {
       console.error(`Failed to write to terminal ${executionId}:`, error);
       return false;
     }
   }
   ```

3. **terminal-spawn.test.ts - async/await conversion:**
   ```typescript
   // BEFORE:
   it('should emit terminal.exit event when process completes', (done) => {
     eventEmitter.once('terminal.exit', (data) => {
       expect(data.executionId).toBe(executionId);
       expect(data.exitCode).toBe(0);
       done(); // REMOVE
     });
     // ...
   });

   // AFTER:
   it('should emit terminal.exit event when process completes', async () => {
     const exitPromise = new Promise((resolve) => {
       eventEmitter.once('terminal.exit', resolve);
     });
     // ...
     const data = await exitPromise;
     expect(data.executionId).toBe(executionId);
     expect(data.exitCode).toBe(0);
   });
   ```

**WO:**

- agent-os-ui/src/server/services/terminal-manager.ts (EDIT - 2 methods)
- agent-os-ui/tests/integration/terminal-spawn.test.ts (EDIT - 1 test)

**WER:**

Backend Developer

**Abhängigkeiten:**

PTY-999 (Integration & Validation)

**Geschätzte Komplexität:**

S (Small - 3 small fixes, ~10 LOC total)

**Completion Check:**

```bash
# Run all integration tests - must pass 37/37
npm run test:integration

# Specific tests that failed before:
npm run test:integration -- terminal-spawn.test.ts  # Should pass 10/10
npm run test:integration -- terminal-io.test.ts     # Should pass 10/10
npm run test:integration -- terminal-multi.test.ts  # Should pass 8/8

# Linting
npm run lint

# Verify fixes:
grep -q "this.sessions.delete(executionId)" agent-os-ui/src/server/services/terminal-manager.ts && echo "✓ Session cleanup fixed"
grep -q "return false" agent-os-ui/src/server/services/terminal-manager.ts && grep -q "console.warn" agent-os-ui/src/server/services/terminal-manager.ts && echo "✓ Graceful error handling fixed"
! grep -q "done()" agent-os-ui/tests/integration/terminal-spawn.test.ts && echo "✓ done() callback removed"
```

**Story ist DONE wenn:**

1. All 3 fixes implemented in correct files
2. All 37 integration tests pass (100% pass rate)
3. No linting errors
4. Git diff shows only expected changes (~10 LOC)
5. Self-review completed
