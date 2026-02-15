---
description: Spec Phase 4.5 - Integration Validation before PR (JSON v5.0)
version: 5.0
---

# Spec Phase 4.5: Integration Validation

## What's New in v5.0

- **JSON-Based**: Liest/schreibt kanban.json statt kanban-board.md

## What's New in v4.0

- **Legacy Check**: This phase is now a legacy check for backward compatibility
- **System Story 998**: For specs with System Stories, story-998 handles integration validation
- **Skip Logic**: If story-998 exists and is Done, this phase is skipped

## Purpose
Validate complete system works end-to-end AFTER all stories complete, BEFORE creating PR.
Prevents "stories done but system doesn't work" problem.

**Note:** For specs created with create-spec v3.0+, this functionality is handled by story-998.

## Entry Condition
- kanban.json shows: resumeContext.currentPhase = "all-stories-done"
- All stories with status = "done"

## Legacy Check (v5.0)

<legacy_check>
  **BEFORE executing legacy logic, check for System Story 998:**

  READ: agent-os/specs/{SELECTED_SPEC}/kanban.json
  FIND: Story in stories[] where id contains "998"

  IF story-998 exists in kanban.json:
    EXTRACT: stories[998].status

    IF status = "done":
      LOG: "story-998 (Integration Validation) already completed - skipping Phase 4.5"

      UPDATE: kanban.json
      - resumeContext.currentPhase = "5-ready"
      - resumeContext.lastAction = "Phase 4.5 skipped (handled by story-998)"

      ADD to changeLog[]:
      ```json
      {
        "timestamp": "{NOW}",
        "action": "phase_skipped",
        "storyId": "story-998",
        "details": "Phase 4.5 handled by System Story 998"
      }
      ```

      WRITE: kanban.json
      GOTO: phase_complete (skip to Phase 5)

    ELSE (status != "done"):
      LOG: "story-998 exists but not done - returning to Phase 3"

      UPDATE: kanban.json
      - resumeContext.currentPhase = "story-complete"
      - resumeContext.nextAction = "Execute story-998"

      WRITE: kanban.json

      INFORM: "System Story 998 needs to be executed. Run /execute-tasks again."
      STOP: Return to Phase 3 for story-998

  ELSE (no story-998):
    LOG: "Legacy spec without System Stories - executing Phase 4.5"
    CONTINUE: Execute legacy integration validation below
</legacy_check>

## Actions (Legacy - for specs without System Stories)

<step name="load_spec_integration_requirements">
  READ: agent-os/specs/{SELECTED_SPEC}/spec.md
  EXTRACT: Integration Requirements section
  CHECK: Does spec have integration requirements defined?
</step>

<step name="check_mcp_tools">
  RUN: claude mcp list
  EXTRACT: Available MCP tools (playwright, browser automation)
  NOTE: Tests requiring unavailable MCP tools will be skipped
</step>

<step name="detect_integration_type">
  ANALYZE: Integration Type from spec.md

  | Integration Type | Action |
  |------------------|--------|
  | Backend-only | API + DB integration tests |
  | Frontend-only | Component tests, optional browser |
  | Full-stack | All tests + E2E |
  | Not defined | Basic smoke tests |
</step>

<step name="run_integration_tests" subagent="test-runner">
  USE: test-runner subagent

  PROMPT: "Run integration validation for spec: {SELECTED_SPEC}

  **Integration Requirements from spec.md:**
  [EXTRACT integration test commands]

  **Test Execution Strategy:**
  1. Skip tests requiring unavailable MCP tools
  2. Execute in order: Backend → Frontend → E2E
  3. Report: PASSED / FAILED / SKIPPED

  **Important:**
  - Not about unit tests (ran during story execution)
  - About validating components work TOGETHER"
</step>

<step name="handle_integration_failures">
  CHECK: Integration test results

  IF all tests PASSED:
    LOG: "Integration validation passed"
    PROCEED: To Phase 5

  ELSE (some FAILED):
    GENERATE: Integration Fix Report

    CREATE: Integration fix story
    - File: agent-os/specs/{SELECTED_SPEC}/stories/story-999-integration-fix.md

    UPDATE: kanban-board.md
    - Add integration-fix story to Backlog
    - Set Phase: 4.5 (Integration Fix Needed)

    ASK via AskUserQuestion:
    "Integration validation failed. Options:
    1. Execute integration-fix story now (Recommended)
    2. Review and manually fix
    3. Skip and create PR anyway (NOT RECOMMENDED)"

    | Choice | Action |
    |--------|--------|
    | 1 | Execute fix story, repeat Phase 4.5 |
    | 2 | Stop, wait for manual fix |
    | 3 | Warn and proceed to Phase 5 |
</step>

## Phase Completion

<phase_complete>
  READ: agent-os/specs/{SELECTED_SPEC}/kanban.json

  UPDATE:
  - resumeContext.currentPhase = "5-ready"
  - resumeContext.nextPhase = "5-finalize"
  - resumeContext.lastAction = "Integration validation: PASSED"
  - resumeContext.nextAction = "Create pull request"

  ADD to changeLog[]:
  ```json
  {
    "timestamp": "{NOW}",
    "action": "phase_completed",
    "storyId": null,
    "details": "Phase 4.5 complete - Integration validation passed"
  }
  ```

  WRITE: kanban.json

  OUTPUT to user:
  ---
  ## Phase 4.5 Complete: Integration Validation

  **Integration Tests:** All passed

  **System Status:** Fully functional and integrated

  **Next Phase:** Create Pull Request

  ---
  **To continue, run:**
  ```
  /clear
  /execute-tasks
  ```
  ---

  STOP: Do not proceed to Phase 5
</phase_complete>
