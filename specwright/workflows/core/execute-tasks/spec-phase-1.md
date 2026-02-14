---
description: Spec Phase 1 - Initialize and create Kanban Board (JSON v4.0)
version: 4.0
---

# Spec Phase 1: Initialize

## What's New in v4.0

**JSON-Based Kanban:**
- Creates `kanban.json` statt `kanban-board.md`
- Falls kanban.json bereits existiert (von /create-spec), wird es nur validiert
- Strukturierte Daten für bessere Resumability

## What's New in v3.2

**Hybrid Template Lookup:**
- Templates are now searched in order: local → global
- Local: `specwright/templates/json/`
- Global: `~/.specwright/templates/json/`

## What's New in v3.1

**Integration Context:**
- Creates `integration-context.md` for cross-story context preservation
- Enables proper integration when stories execute in separate sessions

## Purpose
Select specification and validate/create Kanban Board. One-time setup phase.

## Entry Condition
- No kanban.json exists OR kanban.json needs initialization

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

<step name="check_existing_kanban_json">
  ### Check for Existing kanban.json

  CHECK: Does kanban.json already exist?
  ```bash
  ls specwright/specs/${SELECTED_SPEC}/kanban.json 2>/dev/null
  ```

  IF kanban.json EXISTS:
    READ: kanban.json
    VALIDATE: JSON structure is valid

    IF resumeContext.currentPhase != "1-kanban-setup":
      LOG: "kanban.json already initialized by /create-spec"
      GOTO: create_integration_context

    ELSE:
      LOG: "kanban.json exists but needs completion"
      CONTINUE: To story parsing

  ELSE (no kanban.json):
    LOG: "Creating new kanban.json"
    CONTINUE: To create_kanban_json
</step>

<step name="create_kanban_json">
  ### Create Kanban JSON via MCP Tool

  LIST: All story files in specwright/specs/{SELECTED_SPEC}/stories/
  ```bash
  ls specwright/specs/${SELECTED_SPEC}/stories/story-*.md
  ```

  SET: stories_data = []

  FOR EACH story file:
    READ: Story file
    EXTRACT:
    - Story ID (from file or content)
    - Title (from # heading)
    - Type (from metadata: frontend/backend/devops/test/docs/integration)
    - Dependencies (from metadata, array of story IDs)
    - Effort (from metadata, as NUMBER of story points)
    - Priority (from metadata: critical/high/medium/low)

    VALIDATE DoR:
    - CHECK: All DoR checkboxes are marked [x]
    - IF any [ ] unchecked: status = "blocked"
    - IF all [x]: status = "ready"

    ADD to stories_data[]:
    {
      "id": "{STORY_ID}",
      "title": "{TITLE}",
      "file": "stories/{FILENAME}",
      "type": "{TYPE}",
      "priority": "{PRIORITY}",
      "effort": {EFFORT_NUMBER},
      "status": "ready|blocked",
      "dependencies": ["{DEP_1}", "{DEP_2}"]
    }

  CALL MCP TOOL: kanban_create
  Input:
  {
    "specId": "{SELECTED_SPEC}",
    "specName": "{SPEC_NAME}",
    "specPrefix": "{SPEC_PREFIX}",
    "stories": [{stories_data array}]
  }

  VERIFY: Tool returns {"success": true, "path": "...", "storyCount": N}
  LOG: "Kanban created with {storyCount} stories via MCP tool"

  NOTE: The MCP tool creates the full KanbanJsonV1 structure including:
  - spec metadata, resumeContext (phase 1-complete), execution (not_started)
  - stories array with timing/implementation/verification
  - boardStatus (calculated), statistics, executionPlan, changeLog
</step>

<step name="create_integration_context" subagent="file-creator">
  USE: file-creator subagent

  PROMPT: "Create integration context file for spec execution.

  Output: specwright/specs/{SELECTED_SPEC}/integration-context.md

  Content:
  ```markdown
  # Integration Context

  > **Purpose:** Cross-story context preservation for multi-session execution.
  > **Auto-updated** after each story completion.
  > **READ THIS** before implementing the next story.

  ---

  ## Completed Stories

  | Story | Summary | Key Changes |
  |-------|---------|-------------|
  | - | No stories completed yet | - |

  ---

  ## New Exports & APIs

  ### Components
  <!-- New UI components created -->
  _None yet_

  ### Services
  <!-- New service classes/modules -->
  _None yet_

  ### Hooks / Utilities
  <!-- New hooks, helpers, utilities -->
  _None yet_

  ### Types / Interfaces
  <!-- New type definitions -->
  _None yet_

  ---

  ## Integration Notes

  <!-- Important integration information for subsequent stories -->
  _None yet_

  ---

  ## File Change Summary

  | File | Action | Story |
  |------|--------|-------|
  | - | No changes yet | - |
  ```
  "

  WAIT: For file-creator completion
</step>

## Phase Completion

<phase_complete>
  ### Finalize kanban.json

  READ: specwright/specs/{SELECTED_SPEC}/kanban.json

  UPDATE (if not already set):
  - resumeContext.currentPhase = "1-complete"
  - resumeContext.nextPhase = "2-worktree-setup"
  - resumeContext.lastAction = "Phase 1 complete - Kanban initialized"
  - resumeContext.nextAction = "Setup git strategy (worktree, branch, or current-branch)"

  ADD to changeLog[]:
  ```json
  {
    "timestamp": "{NOW}",
    "action": "phase_completed",
    "storyId": null,
    "details": "Phase 1 complete - {boardStatus.total} stories ready"
  }
  ```

  WRITE: kanban.json

  OUTPUT to user:
  ---
  ## Phase 1 Complete: Initialization

  **Created:**
  - Kanban JSON: specwright/specs/{SELECTED_SPEC}/kanban.json
  - Integration Context: specwright/specs/{SELECTED_SPEC}/integration-context.md
  - Stories loaded: {boardStatus.ready} ready, {boardStatus.blocked} blocked

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
