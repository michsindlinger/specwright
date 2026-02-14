---
description: Entry point for task execution - routes to appropriate phase
globs:
alwaysApply: false
version: 4.0
encoding: UTF-8
---

# Task Execution Entry Point

## What's New in v4.0

**JSON-Based Kanban (Breaking Change):**
- Specs: `kanban.json` replaces `kanban-board.md` as Single Source of Truth
- Backlog: `backlog.json` + `executions/kanban-*.json` replaces daily MD kanbans
- Resume Context now read from JSON instead of MD tables
- All status updates written to JSON for better parsing and reliability
- Backward compatible: Falls back to MD parsing if JSON not found

**Requires create-spec v3.3:**
- `kanban.json` generated alongside story-index.md
- JSON schema validation for all kanban operations

**Requires add-bug/add-todo v2.0+/v3.0+:**
- Items stored in `backlog.json`
- Story details in `stories/` subdirectory

## What's New in v3.6

**System Stories Support:**
- Detects System Stories (story-997, 998, 999) in specs
- Routes to Phase 3 when System Stories are pending (even if regular backlog is empty)
- Phase 4.5 and 5 become legacy checks (skip if System Stories exist and are Done)
- Backward compatible: Specs without System Stories work unchanged

**Requires create-spec v3.0:**
- System Stories (997, 998, 999) are automatically generated
- story-997: Code Review
- story-998: Integration Validation (replaces Phase 4.5)
- story-999: Finalize PR (replaces Phase 5)

## What's New in v3.5

**Integration Verification (Phase 3):**
- `verify_integration_requirements` step: Prüft VOR Implementierung welche Verbindungen nötig sind
- `self_review` erweitert: Verifiziert dass Verbindungen AKTIV hergestellt wurden (nicht nur Code existiert)
- FIX: "Komponenten gebaut aber nicht verbunden" - Erzwingt echte Integration per Story

**Requires create-spec v2.9:**
- Komponenten-Verbindungen Matrix im Implementation Plan
- Integration DoD items in Stories mit Verbindungs-Verantwortung

## What's New in v3.4

**Hybrid Template Lookup:**
- Templates searched in order: local (`specwright/templates/`) → global (`~/.specwright/templates/`)
- Fixes "template not found" for projects without local templates
- Applies to: kanban-board, test-scenarios, user-todos templates

**Handover Documentation (Spec only):**
- Phase 3: Collects user-todos during implementation (tasks requiring manual action)
- Phase 5: Generates test-scenarios.md with Happy-Path, Edge-Cases, Fehlerfälle
- Phase 5: Finalizes user-todos.md with summary and priority classification
- New templates: test-scenarios-template.md, user-todos-template.md

## What's New in v3.3

**External Worktree Support:**
- Worktrees are now located OUTSIDE the project: `../{project}-worktrees/{feature}`
- CWD check updated to support external worktree paths
- No symlinks needed - worktree contains full `.claude/` and `specwright/` folders

## What's New in v3.2

**Worktree CWD Check:**
- Entry point now checks if agent is running in the correct working directory
- When Git Strategy is "worktree", validates CWD matches the Worktree Path
- Displays clear warning with copy-paste command to switch directories
- Automatically detects Claude mode (Max vs API) for correct command suggestion
- Backward compatible: Branch strategy and legacy specs work unchanged

## What's New in v3.1

**Kanban Auto-Sync:**
- New stories added after kanban creation are now automatically detected
- Entry point syncs new `user-story-*.md` and `bug-*.md` files to existing kanban
- No more "forgotten" tasks when using `/add-bug` or `/add-todo` mid-session

## What's New in v3.0

**Phase Files Updated:**
- `spec-phase-3.md` → Direct Execution (no sub-agents)
- `backlog-phase-2.md` → Direct Execution (no sub-agents)

**Key Changes:**
- Main agent implements stories directly
- Skills auto-load via glob patterns
- Self-review replaces separate review agents
- Self-learning mechanism added

---

# Task Execution Entry Point

## Overview

Lightweight router that detects current state and loads ONLY the relevant phase.
This reduces context usage by ~70-80% compared to loading the full workflow.

**Phase Files Location:** `specwright/workflows/core/execute-tasks/`

---

## Execution Mode Detection

<mode_detection>
  WHEN /execute-tasks is invoked:

  1. CHECK: Was a parameter provided?

     IF parameter = "backlog":
       SET: EXECUTION_MODE = "backlog"
       GOTO: Backlog State Detection

     ELSE IF parameter = [spec-name]:
       SET: EXECUTION_MODE = "spec"
       SET: SELECTED_SPEC = [spec-name]
       GOTO: Spec State Detection

     ELSE (no parameter):
       GOTO: Auto-Detection

  <auto_detection>
    CHECK: Are there active kanban boards?

    ```bash
    # Check for active spec kanbans (JSON preferred, MD fallback)
    SPEC_KANBANS_JSON=$(ls specwright/specs/*/kanban.json 2>/dev/null | head -5)
    SPEC_KANBANS_MD=$(ls specwright/specs/*/kanban-board.md 2>/dev/null | head -5)

    # Check for backlog (JSON preferred)
    BACKLOG_JSON=$(ls specwright/backlog/backlog.json 2>/dev/null)

    # Check for active backlog execution (today)
    TODAY=$(date +%Y-%m-%d)
    BACKLOG_EXECUTION=$(ls specwright/backlog/executions/kanban-${TODAY}.json 2>/dev/null)

    # Fallback: Check legacy MD backlog
    BACKLOG_KANBAN_MD=$(ls specwright/backlog/kanban-${TODAY}.md 2>/dev/null)
    ```

    IF active kanban exists (spec JSON/MD or backlog execution):
      DETECT: Which kanban is active
      RESUME: That execution automatically

    ELSE IF backlog.json has ready items AND specs exist:
      ASK via AskUserQuestion:
      "What would you like to execute?
      1. Execute Backlog ([N] quick tasks)
      2. Execute Spec (select from available)
      3. View status only"

    ELSE IF only backlog has ready items:
      SET: EXECUTION_MODE = "backlog"

    ELSE IF only specs exist:
      SET: EXECUTION_MODE = "spec"

    ELSE:
      ERROR: "No tasks to execute. Use /add-todo or /create-spec first."
  </auto_detection>
</mode_detection>

---

## Backlog State Detection

<backlog_routing>
  USE: date-checker to get current date (YYYY-MM-DD)

  ## Check for Backlog JSON (v4.0)

  1. CHECK: Does backlog.json exist?
     ```bash
     ls specwright/backlog/backlog.json 2>/dev/null
     ```

     IF NO backlog.json:
       ERROR: "No backlog found. Use /add-bug or /add-todo first."
       STOP

  2. READ: specwright/backlog/backlog.json
     PARSE: JSON content

  3. CHECK: Is there an active execution kanban for today?
     ```bash
     ls specwright/backlog/executions/kanban-${TODAY}.json 2>/dev/null
     ```

     OR CHECK: backlog.json → resumeContext.activeKanban

  IF NO active execution:
    LOAD: @specwright/workflows/core/execute-tasks/backlog-phase-1.md
    STOP: After loading

  IF active execution exists:
    READ: specwright/backlog/executions/kanban-${TODAY}.json
    EXTRACT: "currentPhase" from resumeContext (JSON field)

    <kanban_sync_json>
      ## Auto-Sync: Check for New Items in backlog.json (v4.0)

      BEFORE loading phase, sync any new items added after execution kanban creation:

      1. READ: backlog.json → items[]
         FILTER: items where status = "ready"

      2. READ: execution kanban → items[]
         COLLECT: All item IDs in execution

      3. COMPARE: Find new ready items
         FOR EACH item in backlog.json where status = "ready":
           IF item.id NOT in execution kanban:
             ADD to NEW_ITEMS list

      4. IF NEW_ITEMS is not empty:
         FOR EACH new item:
           ADD: Item object to execution kanban → items[]
           SET: executionStatus = "queued"

         UPDATE: execution kanban → boardStatus.queued
         UPDATE: execution kanban → boardStatus.total

         ADD changeLog entry:
         {
           "timestamp": "[NOW]",
           "action": "kanban_synced",
           "itemId": null,
           "details": "Synced {N} new items: {ITEM_IDS}"
         }

         WRITE: Updated execution kanban

         INFORM user:
         "📥 **Kanban Sync:** Added {N} new items to today's execution: {ITEM_IDS}"
    </kanban_sync_json>

    ## Backlog Phase Routing Table (v4.0)

    | currentPhase (JSON) | Load Phase File |
    |---------------------|-----------------|
    | 1-kanban-setup | backlog-phase-1.md |
    | 1-complete | backlog-phase-2.md |
    | item-complete | backlog-phase-2.md |
    | in_progress | backlog-phase-2.md |
    | all-items-done | backlog-phase-3.md |
    | complete | INFORM: "Backlog execution complete for today" |

    LOAD: Appropriate phase file
    STOP: After loading

  ## Fallback: Legacy MD Kanban (backward compatibility)

  IF backlog.json not found AND kanban-${TODAY}.md exists:
    WARN: "Using legacy MD kanban. Consider upgrading to JSON."
    READ: specwright/backlog/kanban-${TODAY}.md
    EXTRACT: "Current Phase" from Resume Context (MD table)
    CONTINUE with legacy routing
</backlog_routing>

---

## Spec State Detection

<spec_routing>
  IF SELECTED_SPEC not set:
    LIST: Available specs
    ```bash
    ls -1 specwright/specs/ | sort -r
    ```
    IF 1 spec: SET SELECTED_SPEC automatically
    IF multiple: ASK user via AskUserQuestion

  ## Check for Kanban JSON (v4.0 - preferred)

  **IMPORTANT: ALWAYS check kanban.json FIRST before kanban-board.md!**

  1. FIRST: Check for kanban.json (preferred format)
  ```bash
  ls specwright/specs/${SELECTED_SPEC}/kanban.json 2>/dev/null
  ```

  IF kanban.json exists:
    READ: specwright/specs/${SELECTED_SPEC}/kanban.json
    PARSE: JSON content
    EXTRACT: resumeContext.currentPhase
    EXTRACT: resumeContext.worktreePath
    EXTRACT: resumeContext.gitBranch
    SET: USING_JSON = true

  ELSE (kanban.json NOT found):
    ## 2. ONLY THEN: Fallback to Legacy kanban-board.md
    **This is the FALLBACK - only used when kanban.json does NOT exist!**

    CHECK: Does kanban-board.md exist?
    ```bash
    ls specwright/specs/${SELECTED_SPEC}/kanban-board.md 2>/dev/null
    ```

    IF kanban-board.md exists:
      ## Migration Prompt (v4.0)
      ASK via AskUserQuestion:
      "Diese Spec nutzt noch das alte MD-Format (kanban-board.md).

      Möchtest du zu JSON migrieren für bessere Resumability?

      1. Ja, jetzt migrieren (Recommended) - Migriert zu JSON
      2. Nein, mit MD fortfahren - Nutzt Legacy-Modus"

      IF user chooses "Ja, jetzt migrieren":
        MIGRATE kanban-board.md to kanban.json for ${SELECTED_SPEC}
        AFTER migration:
          RE-READ: specwright/specs/${SELECTED_SPEC}/kanban.json
          SET: USING_JSON = true
          CONTINUE with JSON routing

      ELSE (user chooses MD):
        WARN: "⚠️ Using legacy MD kanban. Some features may not work optimally."
        READ: specwright/specs/${SELECTED_SPEC}/kanban-board.md
        EXTRACT: "Current Phase" from Resume Context (MD table)
        EXTRACT: "Git Strategy" from Resume Context (if present)
        EXTRACT: "Worktree Path" from Resume Context (if present)
        SET: USING_JSON = false

    ELSE:
      # No kanban at all - need to initialize (will create JSON)
      LOAD: @specwright/workflows/core/execute-tasks/spec-phase-1.md
      STOP: After loading

  IF kanban exists (JSON or MD):

    <cwd_check>
      ## Worktree CWD Check (v3.3)

      **Purpose:** Ensure agent is running in correct directory for worktree-based specs.

      1. GET: Git Strategy from Resume Context
         - "worktree" → Worktree strategy active
         - "branch" → Branch strategy (no CWD check needed)
         - Not set or "(none)" → Legacy spec (no CWD check needed)

      2. IF Git Strategy = "worktree":
         GET: Worktree Path from Resume Context (e.g., `../projekt-x-worktrees/my-feature`)
         GET: Current working directory

         ```bash
         # Get current working directory
         CWD=$(pwd)

         # Get worktree basename for comparison
         WORKTREE_BASENAME=$(basename "${WORKTREE_PATH}")
         CWD_BASENAME=$(basename "${CWD}")
         ```

         COMPARE: Check if CWD is the correct worktree
         - Compare directory basenames (feature name)
         - Verify parent directory ends with "-worktrees"

         ```bash
         # Check if we're in the right worktree
         CWD_PARENT=$(basename "$(dirname "${CWD}")")

         # Valid if: basename matches AND parent ends with "-worktrees"
         if [[ "${CWD_BASENAME}" == "${WORKTREE_BASENAME}" ]] && \
            [[ "${CWD_PARENT}" == *-worktrees ]]; then
           echo "In correct worktree"
         fi
         ```

         IF CWD is NOT the correct worktree:
           DETECT: Claude mode for correct command

           <mode_detection_logic>
             **Determine Claude startup command:**

             The agent should check its startup context:
             - If running with Claude Max account → use `claude`
             - If running with API token (GLM/Anthropic API) → use `claude --dangerously-skip-permissions`

             **Note:** In practice, check the environment or startup flags.
             For simplicity, assume API mode if `ANTHROPIC_API_KEY` is set or
             if started with `--dangerously-skip-permissions`.
           </mode_detection_logic>

           SET: CLAUDE_CMD based on detected mode
           - Claude Max: `claude`
           - API Mode: `claude --dangerously-skip-permissions`

           OUTPUT:
           ---
           ## ⚠️ Wrong Working Directory!

           **You are not in the correct worktree directory.**

           | Current | Expected |
           |---------|----------|
           | `{CWD}` | `{WORKTREE_PATH}` |

           **To continue, run this command:**
           ```bash
           cd {WORKTREE_PATH} && {CLAUDE_CMD}
           ```

           Then run `/execute-tasks` again.

           ---

           **STOP:** Execution cannot continue from wrong directory.
           ---

           STOP: Do not proceed - wrong working directory

         ELSE (CWD is correct worktree):
           CONTINUE: Proceed to phase loading

      3. IF Git Strategy = "branch" OR "current-branch" OR not set:
         CONTINUE: No CWD check needed, proceed normally
    </cwd_check>

    <system_stories_check>
      ## System Stories Detection (v4.0)

      **Before routing, check for System Stories:**

      IF USING_JSON = true:
        ## JSON-Based Check (preferred)
        1. READ: kanban.json → stories[] array

        2. FIND: System Stories by ID pattern
           - story-997 (Code Review)
           - story-998 (Integration Validation)
           - story-999 (Finalize PR)

        3. IF any System Story found in stories[]:
           SET: HAS_SYSTEM_STORIES = true

           CHECK: Status of each System Story
           - stories[997].status
           - stories[998].status
           - stories[999].status

           SET: SYSTEM_STORIES_DONE = true if ALL have status = "done"

        4. IF no System Stories in stories[]:
           SET: HAS_SYSTEM_STORIES = false
           NOTE: Use legacy Phase 4.5 and 5 routing

      ELSE (USING_JSON = false):
        ## Legacy Check (fallback)
        1. CHECK: Do System Stories exist in this spec?
           ```bash
           ls specwright/specs/${SELECTED_SPEC}/stories/story-997*.md \
              specwright/specs/${SELECTED_SPEC}/stories/story-998*.md \
              specwright/specs/${SELECTED_SPEC}/stories/story-999*.md 2>/dev/null
           ```

        2. IF System Stories exist:
           EXTRACT: Status of each System Story from story files

           SET: HAS_SYSTEM_STORIES = true
           SET: SYSTEM_STORIES_DONE = true if ALL (997, 998, 999) have Status: Done

        3. IF no System Stories:
           SET: HAS_SYSTEM_STORIES = false
           NOTE: Use legacy Phase 4.5 and 5 routing
    </system_stories_check>

    ## Phase Routing Table (v4.0)

    | currentPhase (JSON) | currentPhase (MD) | Condition | Load Phase File |
    |---------------------|-------------------|-----------|-----------------|
    | 1-kanban-setup | - | - | spec-phase-1.md |
    | 1-complete | 1-complete | - | spec-phase-2.md |
    | 2-complete | 2-complete | - | spec-phase-3.md |
    | 3-execute-story | - | - | spec-phase-3.md |
    | story-complete | story-complete | - | spec-phase-3.md |
    | all-stories-done | all-stories-done | HAS_SYSTEM_STORIES AND NOT SYSTEM_STORIES_DONE | spec-phase-3.md |
    | all-stories-done | all-stories-done | NOT HAS_SYSTEM_STORIES | spec-phase-4-5.md |
    | all-stories-done | all-stories-done | SYSTEM_STORIES_DONE | spec-phase-5.md |
    | 4.5-integration-validation | - | - | spec-phase-4-5.md |
    | 5-ready | 5-ready | - | spec-phase-5.md |
    | 5-finalize | - | - | spec-phase-5.md |
    | complete | complete | - | INFORM: "Spec execution complete." |

    **Routing Logic (v4.0):**

    ```
    IF USING_JSON:
      EXTRACT: currentPhase from kanban.json → resumeContext.currentPhase

    ELSE:
      EXTRACT: currentPhase from kanban-board.md → Resume Context table

    IF currentPhase = "all-stories-done":
      IF HAS_SYSTEM_STORIES AND NOT SYSTEM_STORIES_DONE:
        # System Stories pending - continue Phase 3
        LOAD: spec-phase-3.md

      ELSE IF NOT HAS_SYSTEM_STORIES:
        # Legacy spec - use old Phase 4.5
        LOAD: spec-phase-4-5.md

      ELSE IF SYSTEM_STORIES_DONE:
        # System Stories done - legacy check
        LOAD: spec-phase-5.md (will skip to completion)
    ```

    LOAD: Appropriate phase file
    STOP: After loading
</spec_routing>

---

## Phase File Reference

| Mode | Phase | File | Purpose |
|------|-------|------|---------|
| Spec | 1 | spec-phase-1.md | Initialize + Kanban |
| Spec | 2 | spec-phase-2.md | Git Worktree |
| Spec | 3 | spec-phase-3.md | Execute Story |
| Spec | 4.5 | spec-phase-4-5.md | Integration Validation |
| Spec | 5 | spec-phase-5.md | Finalize + PR |
| Backlog | 1 | backlog-phase-1.md | Daily Kanban |
| Backlog | 2 | backlog-phase-2.md | Execute Story |
| Backlog | 3 | backlog-phase-3.md | Daily Summary |

---

## Shared Resources

Common resources used across phases:

| Resource | Location |
|----------|----------|
| Resume Context Schema | shared/resume-context.md |
| Error Handling | shared/error-handling.md |
| Skill Extraction | shared/skill-extraction.md |
