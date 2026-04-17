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

  READ: Comments from {projectDir}/backlog/items/attachments/{SELECTED_ITEM.id}/comments.json
  (File may not exist - skip gracefully if absent)

  IF comments exist:
    PRESENT as supplementary context:
    ---
    ## User Comments on This Item
    (Each comment: author, date, text)
    ---
    Treat these as additional requirements or guidance for implementation.
    You may respond to comments using the `backlog_add_comment` MCP tool.

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

<step name="verify_implementation_exists">
  ### Pre-flight: Verify Implementation Changes Exist

  **Before touching any state tracking, confirm the implement step actually produced changes.**

  ```bash
  # Are there any changes at all (staged, unstaged, or untracked)?
  test -n "$(git status --porcelain)" && echo "HAS_CHANGES" || echo "NO_CHANGES"
  ```

  IF output is `NO_CHANGES`:
    STOP the workflow. Output:
    ```
    ⚠️  No implementation changes for {SELECTED_ITEM.id}.
    The fix did not happen. Do NOT mark the story as done.
    ```
    Skip the remaining steps so the backend post-execution hook sees "no fix" and
    keeps the story in `open`.

  IF output is `HAS_CHANGES`: proceed.
</step>

<step name="update_kanban_json_done">
  ### Mark Item Complete via MCP Tool (writes JSON tracking files)

  **Order matters:** this step runs BEFORE `story_commit` so the MCP's writes to
  `kanban-{TODAY}.json` and `backlog-index.json` land in the same fix commit as the
  implementation — otherwise post-commit writes get stashed by the backend safety-net.

  CALL MCP TOOL: backlog_complete_item
  Input:
  {
    "executionId": "kanban-{TODAY}",
    "itemId": "{SELECTED_ITEM.id}",
    "filesModified": []
  }

  VERIFY: Tool returns {
    "success": true,
    "item": {...},
    "remaining": N
  }

  LOG: "Item {SELECTED_ITEM.id} completed via MCP tool. Remaining: {remaining}"

  NOTE: The MCP tool writes files but does NOT commit. The next step (`story_commit`)
  stages everything — implementation + moved story file + MCP's JSON updates —
  into a single fix commit.
</step>

<step name="story_commit">
  ### Commit Everything (MANDATORY)

  Run these bash commands inline (do NOT delegate — inline is more reliable in `--print` mode):

  ```bash
  # Stage everything: implementation + move_story_to_done + update_kanban_json_done
  git add -A
  # Commit with a meaningful fix/feat prefix
  git commit -m "fix: {SELECTED_ITEM.id} {SELECTED_ITEM.title}"
  ```

  Choose `fix:` for bugs, `feat:` for features/improvements/TODOs.

  IF the commit fails because there is nothing to stage:
    Output:
    ```
    ⚠️  Nothing to commit for {SELECTED_ITEM.id}. The MCP update ran but no code changed.
    ```
    Leave the workflow here; the backend safety-net will keep the story open.
</step>

<step name="verify_fix_commit">
  ### Verify Fix Commit Exists

  Final sanity check before ending the session:

  ```bash
  # Count commits on this branch that are NOT `chore:` status updates
  git log $(git merge-base HEAD origin/main 2>/dev/null || git merge-base HEAD main 2>/dev/null || git merge-base HEAD develop)..HEAD --no-merges --pretty=format:%s | grep -vE "^chore:" | wc -l
  ```

  If the count is 0: the commit did not land — output a clear error.
  If the count is ≥ 1: proceed to `session_end`.
</step>

<step name="session_end">
  ### End of Single-Item Execution

  This workflow executes ONE backlog item per session. Output the completion message:

  ```
  ✅ Item complete: {SELECTED_ITEM.id}
  ```

  Then end the session normally. The backend orchestrates the next item.
  Do not load or process additional items in this session.
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
