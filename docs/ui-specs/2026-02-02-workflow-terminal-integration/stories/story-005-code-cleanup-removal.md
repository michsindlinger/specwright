# Code Cleanup & Removal

> Story ID: PTY-005
> Spec: Workflow Terminal Integration
> Created: 2026-02-02
> Last Updated: 2026-02-02

**Priority**: Medium
**Type**: Refactoring
**Estimated Effort**: TBD
**Dependencies**: PTY-004
**Status**: Done

---

## Feature

```gherkin
Feature: Entfernung der alten Ask Question UI
  Als Entwickler
  möchte ich toten Code und obsolete Komponenten entfernen,
  damit die Codebase wartbar bleibt und keine Verwirrung entsteht.
```

---

## Akzeptanzkriterien (Gherkin-Szenarien)

### Szenario 1: workflow-question.ts ist gelöscht

```gherkin
Scenario: Alte Single-Question-Komponente wird entfernt
  Given die neue Terminal-Integration ist vollständig funktionsfähig
  When alle Regression-Tests erfolgreich sind
  Then ist die Datei workflow-question.ts gelöscht
  And keine Importe auf workflow-question.ts existieren mehr
```

### Szenario 2: workflow-question-batch.ts ist gelöscht

```gherkin
Scenario: Alte Batch-Question-Komponente wird entfernt
  Given die neue Terminal-Integration funktioniert
  When alle Tests grün sind
  Then ist die Datei workflow-question-batch.ts gelöscht
  And keine Komponente rendert mehr <aos-workflow-question-batch>
```

### Szenario 3: Ask Question Logic in WorkflowExecutor ist simplifiziert

```gherkin
Scenario: WorkflowExecutor enthält keine Custom-Question-Handling-Logic mehr
  Given TerminalManager übernimmt Terminal-I/O
  When die Integration vollständig ist
  Then ist handleAskUserQuestion() in WorkflowExecutor entfernt
  And detectTextQuestions() ist entfernt
  And sendQuestionBatch() ist entfernt
  And WorkflowExecutor hat weniger LOC als vorher
```

### Edge Cases & Fehlerszenarien

```gherkin
Scenario: Regression Tests validieren dass nichts kaputt ist
  Given alle alten Komponenten sind gelöscht
  When ich die vollständige Test-Suite laufe
  Then sind alle Tests grün (0 Failures)
  And keine Tests referenzieren die gelöschten Komponenten
```

---

## Business Value

**Wert für Entwickler:**
- Weniger Code = weniger Bugs = weniger Maintenance
- Keine toten Code-Pfade mehr (Verwirrung reduziert)
- ~930 LOC gespart (inkl. Custom ANSI-Parser, Theme-Switcher)

**Technischer Wert:**
- Codebase ist fokussierter (Single Responsibility)
- Tests sind schneller (weniger Code zu testen)
- Future-Dev verstehen System schneller (keine Legacy-Altlasten)

---

## Technisches Refinement (vom Architect)

### Betroffene Layer & Komponenten

- **Integration Type:** Full-stack (removes components from frontend + backend)

- **Betroffene Komponenten Table:**

| Layer | Komponenten | Änderung |
|-------|-------------|----------|
| Frontend | workflow-question.ts, workflow-question-batch.ts | DELETE components |
| Backend | workflow-executor.ts | SIMPLIFY - remove custom question handling logic |

- **Kritische Integration Points:**
  - None (this story removes code, no new integrations)

- **Handover-Dokumente:**
  - None (cleanup story)

### DoR (Definition of Ready)

- [x] Fachliche requirements clear (Remove old Ask Question UI)
- [x] Technical approach defined (Delete files, remove logic, run regression tests)
- [x] Dependencies identified (PTY-004 must be complete - new UI must work)
- [x] Affected components known (workflow-question.ts, workflow-question-batch.ts, workflow-executor.ts)
- [x] Required MCP Tools documented (N/A)
- [x] Story is appropriately sized (3 files deletion, ~200 LOC removal)
- [x] Full-Stack Konsistenz:
  - [x] Alle betroffenen Layer identifiziert (Frontend + Backend)
  - [x] Integration Type bestimmt (Full-stack cleanup)
  - [x] Kritische Integration Points dokumentiert (None - removal)
  - [x] WO deckt alle Layer ab

### DoD (Definition of Done)

- [x] Code implemented and follows Style Guide (Code removed, no new code)
- [x] Architecture requirements met (Dead code removed, codebase simplified)
- [x] Security/Performance requirements satisfied (N/A)
- [x] All acceptance criteria met (Files deleted, logic removed, tests pass)
- [x] Tests written and passing (Obsolete tests removed, remaining tests pass)
- [x] Code review approved (Self-review: all deletions confirmed)
- [x] Documentation updated (Imports and references removed)
- [x] No linting errors
- [x] Completion Check commands successful

### Technical Details

**WAS:**

- Delete workflow-question.ts (old single-question component)
- Delete workflow-question-batch.ts (old batch-question component)
- Remove handleAskUserQuestion() method from WorkflowExecutor
- Remove detectTextQuestions() method from WorkflowExecutor
- Remove sendQuestionBatch() method from WorkflowExecutor
- Remove all imports/references to deleted components
- Run regression tests to ensure nothing breaks

**WIE (Architecture Guidance ONLY):**

- **Safe deletion strategy:** Run regression tests BEFORE committing deletions
- **Check for imports:** Use grep to find all references before deleting
- **Constraints:**
  - Must NOT delete until PTY-004 is complete (new UI must work first)
  - Must run full test suite after deletion (no broken tests)
  - Must check for any dead code paths in WorkflowExecutor (remove them too)
- **Code reduction:** Target ~200-300 LOC removal (simplifies maintenance)

**WO:**

- agent-os-ui/ui/src/components/workflow-question.ts (DELETE)
- agent-os-ui/ui/src/components/workflow-question-batch.ts (DELETE)
- agent-os-ui/src/server/workflow-executor.ts (SIMPLIFY - remove methods)

**WER:**

Full-stack Developer

**Abhängigkeiten:**

PTY-004 (View switching must work, terminal must be fully functional)

**Geschätzte Komplexität:**

XS (Extra Small - mostly deletion, low risk if dependencies are met)

**Relevante Skills:**

N/A (skill-index.md not available)

**Completion Check:**

```bash
# Auto-Verify Commands - all must exit with 0
test ! -f agent-os-ui/ui/src/components/workflow-question.ts && echo "✓ workflow-question.ts deleted"
test ! -f agent-os-ui/ui/src/components/workflow-question-batch.ts && echo "✓ workflow-question-batch.ts deleted"
! grep -q "handleAskUserQuestion" agent-os-ui/src/server/workflow-executor.ts && echo "✓ handleAskUserQuestion removed"
! grep -q "detectTextQuestions" agent-os-ui/src/server/workflow-executor.ts && echo "✓ detectTextQuestions removed"
npm test && echo "✓ All regression tests pass"
npm run lint && echo "✓ No lint errors"
```

**Story ist DONE wenn:**

1. Alle FILE_EXISTS/CONTAINS checks bestanden (files do NOT exist)
2. Alle *_PASS commands exit 0
3. Git diff zeigt nur erwartete Änderungen (3 files: 2 deletions, 1 simplification)
