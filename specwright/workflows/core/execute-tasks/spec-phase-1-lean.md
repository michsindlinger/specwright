---
description: Spec Phase 1 Lean - Initialize for V2 Lean Kanban (JSON v2.0)
version: 2.0
---

# Spec Phase 1 Lean: Initialize (V2 Lean Mode)

## Purpose

Initialize spec execution for V2 (Lean) kanban.json. Unlike V1, no story file
parsing is needed -- tasks are already embedded in kanban.json.

## Entry Condition

- kanban.json exists with `mode: "lean"` or `version: "2.0"`
- resumeContext.currentPhase = "1-kanban-setup" OR kanban needs initialization

## Actions

<step name="spec_selection">
  CHECK: Did user provide spec name as parameter?

  IF parameter provided:
    VALIDATE: specwright/specs/[spec-name]/ exists
    SET: SELECTED_SPEC = [spec-name]

  ELSE:
    LIST: Available specs
    ```bash
    ls -1 specwright/specs/ | sort -r
    ```

    IF 1 spec: CONFIRM with user
    IF multiple: ASK user via AskUserQuestion
</step>

<step name="validate_v2_kanban">
  ### Validate V2 Kanban JSON

  CHECK: Does kanban.json exist?
  ```bash
  ls specwright/specs/${SELECTED_SPEC}/kanban.json 2>/dev/null
  ```

  IF kanban.json EXISTS:
    READ: kanban.json
    VALIDATE: JSON structure is valid
    VALIDATE: `mode === "lean"` OR `version === "2.0"`

    IF NOT V2:
      ERROR: "This spec uses V1 kanban. Use standard /execute-tasks workflow."
      STOP

    IF resumeContext.currentPhase != "1-kanban-setup":
      LOG: "V2 kanban already initialized"
      GOTO: create_integration_context

    ELSE:
      LOG: "V2 kanban exists but needs completion"
      CONTINUE

  ELSE:
    ERROR: "No kanban.json found. Run /create-spec first."
    STOP
</step>

<step name="verify_tasks">
  ### Verify Tasks

  READ: kanban.json → tasks[]

  COUNT: Tasks with status "ready" or "blocked"
  LOG: "Found {ready} ready, {blocked} blocked tasks (total: {total})"

  IF no tasks found:
    ERROR: "No tasks in kanban.json"
    STOP
</step>

<step name="create_integration_context">
  ### Create Integration Context (Tier-Aware)

  READ: specTier from kanban.json → spec.specTier (default "M")

  IF specTier = "S":
    LOG: "S-Spec: integration-context.md creation skipped"
    SKIP: This step entirely
    GOTO: phase_complete

  CHECK: Does integration-context.md exist?
  ```bash
  ls specwright/specs/${SELECTED_SPEC}/integration-context.md 2>/dev/null
  ```

  IF EXISTS:
    LOG: "integration-context.md already exists"
    GOTO: phase_complete

  USE: file-creator subagent

  PROMPT: "Create integration context file for lean spec execution.

  Output: specwright/specs/{SELECTED_SPEC}/integration-context.md

  Content:
  ```markdown
  # Integration Context

  > **Purpose:** Cross-task context preservation for multi-session execution.
  > **Auto-updated** after each task completion.
  > **READ THIS** before implementing the next task.

  ---

  ## Completed Tasks

  | Task | Summary | Key Changes |
  |------|---------|-------------|
  | - | No tasks completed yet | - |

  ---

  ## New Exports & APIs

  ### Components
  _None yet_

  ### Services
  _None yet_

  ### Hooks / Utilities
  _None yet_

  ### Types / Interfaces
  _None yet_

  ---

  ## Integration Notes
  _None yet_

  ---

  ## File Change Summary

  | File | Action | Task |
  |------|--------|------|
  | - | No changes yet | - |
  ```
  "

  WAIT: For file-creator completion
</step>

## Phase Completion

<phase_complete>
  ### Finalize kanban.json

  READ: specwright/specs/${SELECTED_SPEC}/kanban.json

  UPDATE (if not already set):
  - resumeContext.currentPhase = "1-complete"
  - resumeContext.nextPhase = "2-worktree-setup"
  - resumeContext.lastAction = "Phase 1 complete - Lean kanban initialized"
  - resumeContext.nextAction = "Setup git strategy"

  ADD to changeLog[]:
  ```json
  {
    "timestamp": "{NOW}",
    "action": "phase_completed",
    "storyId": null,
    "details": "Phase 1 complete (lean) - {boardStatus.total} tasks ready"
  }
  ```

  WRITE: kanban.json

  OUTPUT to user:
  ---
  ## Phase 1 Complete: Lean Initialization

  **Validated:**
  - V2 Kanban JSON: specwright/specs/{SELECTED_SPEC}/kanban.json
  - Integration Context: specwright/specs/{SELECTED_SPEC}/integration-context.md
  - Tasks loaded: {boardStatus.ready} ready, {boardStatus.blocked} blocked

  **Mode:** Lean (V2) — no story files, tasks from kanban.json

  **Next Phase:** Git Strategy Setup

  ---
  **To continue, run:**
  ```
  /clear
  /execute-tasks
  ```
  ---

  STOP: Do not proceed to Phase 2
</phase_complete>
