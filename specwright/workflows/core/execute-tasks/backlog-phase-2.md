---
description: Backlog Phase 2 - Execute one backlog story (JSON v4.0)
version: 4.0
---

# Backlog Phase 2: Execute Story (Direct Execution)

## What's New in v4.0

- **JSON-Based Kanban**: Liest/schreibt execution-kanban.json
- **Backlog Sync**: Synchronisiert Status zurück nach backlog.json
- **Strukturierte Updates**: JSON-Feld-Updates statt MD-Parsing

## What's New in v3.0

- **No Sub-Agent Delegation**: Main agent implements story directly
- **Skills Load Automatically**: Via glob patterns in .claude/skills/
- **Self-Review**: DoD checklist instead of separate review
- **Self-Learning**: Updates dos-and-donts.md when learning

## Purpose

Execute ONE backlog story. Simpler than spec execution (no git worktree, no integration phase).

## Entry Condition

- executions/kanban-[TODAY].json exists
- resumeContext.currentPhase = "1-complete" OR "item-complete"
- Items remain with executionStatus = "queued"

## Actions

<step name="load_state">
  ### Load State from JSON

  READ: specwright/backlog/executions/kanban-{TODAY}.json

  EXTRACT:
  - resumeContext (currentPhase, currentItem, progressIndex)
  - items[] array
  - executionOrder[] array
  - boardStatus

  IDENTIFY: Next item from executionOrder where executionStatus = "queued"
</step>

<step name="story_selection">
  ### Select Next Item

  FIND: First item in executionOrder where:
  - items[id].executionStatus = "queued"

  IF no queued items:
    LOG: "All items completed"
    GOTO: phase_complete (all done)

  SET: SELECTED_ITEM = items[selected_id]
</step>

<step name="update_kanban_in_progress">
  ### Mark Item Started via MCP Tool

  CALL MCP TOOL: backlog_start_item
  Input:
  {
    "executionId": "kanban-{TODAY}",
    "itemId": "{SELECTED_ITEM.id}"
  }

  VERIFY: Tool returns {"success": true, "item": {...}}
  LOG: "Item {SELECTED_ITEM.id} marked as in_progress via MCP tool"

  NOTE: The MCP tool automatically updates:
  - item.executionStatus → in_progress
  - item.timing.startedAt
  - resumeContext (currentItem, currentPhase, lastAction, nextAction)
  - boardStatus counters (queued -1, inProgress +1)
  - changeLog entry
  - All atomic with file lock (prevents race conditions)
</step>

<step name="load_story">
  ### Load Story Details

  READ: Story file from SELECTED_ITEM.sourceFile
  (Path stored in execution-kanban.json items[].sourceFile)

  EXTRACT:
  - Story ID and Title
  - Feature description
  - Acceptance Criteria
  - DoD Checklist
  - Domain reference (if specified)

  NOTE: Skills load automatically when you edit matching files.
</step>

<step name="implement">
  ### Direct Implementation (v3.0)

  **The main agent implements the story directly.**

  <implementation_process>
    1. UNDERSTAND: Story requirements

    2. IMPLEMENT: The task
       - Create/modify files as needed
       - Skills load automatically when editing matching files
       - Keep it focused (backlog tasks are smaller)

    3. RUN: Tests
       - Ensure tests pass

    4. VERIFY: Acceptance criteria satisfied

    **This is a quick task:**
    - No extensive refactoring
    - Keep changes minimal
    - Focus on the specific requirement
  </implementation_process>
</step>

<step name="self_review">
  ### Self-Review with DoD Checklist

  <review_process>
    1. READ: DoD checklist from story

    2. VERIFY each item:
       - [ ] Implementation complete
       - [ ] Tests passing
       - [ ] Linter passes
       - [ ] Acceptance criteria met

    3. RUN: Completion Check commands from story

    IF all checks pass:
      PROCEED to self_learning_check
    ELSE:
      FIX issues and re-verify
  </review_process>
</step>

<step name="self_learning_check">
  ### Self-Learning Check (v3.0)

  <learning_detection>
    REFLECT: Did you learn something during implementation?

    IF YES:
      1. IDENTIFY: The learning
      2. LOCATE: Target dos-and-donts.md file
         - Frontend: .claude/skills/frontend-[framework]/dos-and-donts.md
         - Backend: .claude/skills/backend-[framework]/dos-and-donts.md
         - DevOps: .claude/skills/devops-[stack]/dos-and-donts.md

      3. APPEND: Learning entry
         ```markdown
         ### [DATE] - [Short Title]
         **Context:** [What you were trying to do]
         **Issue:** [What didn't work]
         **Solution:** [What worked]
         ```

    IF NO learning:
      SKIP: No update needed
  </learning_detection>
</step>

<step name="move_story_to_done">
  ### Move Item File to Done

  MOVE: Item file to done/ folder
  ```bash
  mkdir -p specwright/backlog/done
  mv specwright/backlog/{SELECTED_ITEM.sourceFile} specwright/backlog/done/
  ```

  EXAMPLE:
  ```bash
  mkdir -p specwright/backlog/done
  mv specwright/backlog/items/improvement-003-*.md specwright/backlog/done/
  ```

  NOTE: This prevents the item from being picked up in future executions
  VERIFY: File was moved successfully
  ```bash
  ls specwright/backlog/done/ | grep -q "$(basename {SELECTED_ITEM.sourceFile})" && echo "✓ Moved"
  ```
</step>

<step name="update_kanban_json_done">
  ### Mark Item Complete via MCP Tool

  GET: Modified files (optional)
  ```bash
  git diff --name-only HEAD~1 2>/dev/null || echo ""
  ```

  CALL MCP TOOL: backlog_complete_item
  Input:
  {
    "executionId": "kanban-{TODAY}",
    "itemId": "{SELECTED_ITEM.id}",
    "filesModified": ["{modified_files if available}"]
  }

  VERIFY: Tool returns {
    "success": true,
    "item": {...},
    "remaining": N
  }

  LOG: "Item {SELECTED_ITEM.id} completed via MCP tool. Remaining: {remaining}"

  NOTE: The MCP tool automatically updates BOTH:

  **Execution Kanban (kanban-{TODAY}.json):**
  - item.executionStatus → done
  - item.timing.completedAt
  - resumeContext (currentItem → null, progressIndex +1, lastAction, nextAction)
  - boardStatus counters (inProgress -1, done +1)
  - changeLog entry

  **Backlog Index (backlog-index.json):**
  - item.status → done
  - item.completedAt timestamp
  - changeLog entry

  All atomic with file lock (no corruption risk).
</step>

<step name="story_commit" subagent="git-workflow">
  ### Commit Changes

  USE: git-workflow subagent
  "Commit backlog item {SELECTED_ITEM.id}:

  **WORKING_DIR:** {PROJECT_ROOT}

  - Message: fix/feat: {SELECTED_ITEM.id} {SELECTED_ITEM.title}
  - Stage all changes including:
    - Implementation files
    - Moved item file in done/
    - specwright/backlog/executions/kanban-{TODAY}.json
    - specwright/backlog/backlog-index.json
    - Any dos-and-donts.md updates
  - Push to current branch"
</step>

<step name="session_end">
  ### End of Single-Item Execution

  **CRITICAL INSTRUCTION:**

  This workflow is designed for SINGLE-ITEM execution.
  You MUST stop now and let the user decide whether to continue.

  DO NOT:
  - ❌ Load the next item
  - ❌ Read the kanban again
  - ❌ Continue to another step
  - ❌ Auto-execute remaining items

  REASON:
  - Context preservation (each item starts fresh)
  - User oversight (review each item's changes)
  - Token efficiency (avoid context buildup)

  **Your session ends here. Output the completion message and STOP.**
</step>

## Phase Completion

<phase_complete>
  ### Check Remaining Items

  READ: specwright/backlog/executions/kanban-{TODAY}.json
  COUNT: Items where executionStatus = "queued"

  IF queued items remain:

    NOTE: Kanban already updated via backlog_complete_item MCP tool
    (currentPhase = "item-complete", progressIndex incremented)

    OUTPUT to user (and STOP immediately after):
    ---
    ## ✅ Item Complete: {SELECTED_ITEM.id}

    **Progress:** {boardStatus.done} of {boardStatus.total} items completed today
    **Remaining:** {remaining} items

    **Self-Learning:** [Updated/No updates]

    ---

    ## ⚠️ IMPORTANT: Single-Item Execution Mode

    **This workflow executes ONE item at a time to preserve context quality.**

    **Remaining items:** {remaining}
    - Next item: {next_item_id_if_available}

    **To continue with next item, run:**
    ```bash
    /clear
    /execute-tasks backlog
    ```

    **Why /clear?**
    - Clears this session's context
    - Prevents token buildup
    - Each item starts fresh

    ---

    **CRITICAL: DO NOT CONTINUE TO NEXT ITEM IN THIS SESSION.**
    **STOP EXECUTION NOW. USER MUST RUN /clear FIRST.**

    ---

    STOP: End of Phase 2 - Single item execution complete

  ELSE (all items done):

    NOTE: Update execution completion status

    READ: specwright/backlog/executions/kanban-{TODAY}.json
    UPDATE:
    - resumeContext.currentPhase = "all-items-done"
    - resumeContext.nextAction = "Generate daily summary"
    - execution.status = "completed"
    - execution.completedAt = "{NOW}"
    WRITE: kanban-{TODAY}.json

    READ: specwright/backlog/backlog-index.json
    UPDATE:
    - resumeContext.currentPhase = "execution-complete"
    - resumeContext.lastAction = "Execution completed for {TODAY}"
    - executions (find kanban-{TODAY}, set status = "completed")
    WRITE: backlog-index.json

    OUTPUT to user:
    ---
    ## All Backlog Items Complete!

    **Today's Progress:** {boardStatus.total} items completed

    **Next Phase:** Daily Summary

    ---
    **To continue, run:**
    ```
    /clear
    /execute-tasks backlog
    ```
    ---

    STOP: Do not proceed to Backlog Phase 3
</phase_complete>

---

## Quick Reference: v3.0 Changes

| v2.x (Sub-Agents) | v3.0 (Direct Execution) |
|-------------------|-------------------------|
| extract_skill_paths_backlog | Skills auto-load via globs |
| DELEGATE to dev-team__* | Main agent implements |
| quick_review (separate) | Self-review with DoD |
| - | self_learning_check (NEW) |

**Benefits:**
- Full context for each task
- Faster execution (no delegation overhead)
- Self-learning improves backlog workflow too
