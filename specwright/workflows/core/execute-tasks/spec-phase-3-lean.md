---
description: Spec Phase 3 Lean - Execute one task using implementation plan (v2.0)
version: 2.0
---

# Spec Phase 3 Lean: Execute Task (V2 Lean Mode)

## Purpose

Execute ONE task completely. Unlike V1, technical context comes from the
implementation plan section referenced by `task.planSection` instead of
a separate story .md file with WAS/WIE/WO.

## Entry Condition

- kanban.json exists with `mode: "lean"` or `version: "2.0"`
- resumeContext.currentPhase = "2-complete" OR "task-complete"
- Tasks remain with status = "ready"

## Actions

<step name="load_next_task">
  ### Load Next Task via Smart MCP Tool

  **MANDATORY: Call kanban_get_next_task BEFORE any implementation.**
  **DO NOT read files directly.**

  The MCP tool returns context not available from kanban.json alone:
  - `planContext`: Executive Summary, Component Connections, relevant plan section
  - `specLite`: Project overview with tech stack
  - `integrationContext`: What previous tasks built
  - `resumeInfo`: Git strategy, branch, spec tier

  IF SINGLE_STORY_MODE = true AND TARGET_STORY_ID is set:
    CALL MCP TOOL: kanban_get_next_task
    Input: { "specId": "{SELECTED_SPEC}", "storyId": "{TARGET_STORY_ID}" }
  ELSE:
    CALL MCP TOOL: kanban_get_next_task
    Input: { "specId": "{SELECTED_SPEC}" }

  RECEIVE: Complete task context (task, integrationContext, resumeInfo, planContext, specLite, boardSummary)

  VERIFY: Tool returns success=true
  SET: SELECTED_TASK = response.task
  SET: PLAN_CONTEXT = response.planContext
  SET: INTEGRATION_CONTEXT = response.integrationContext
  SET: SPEC_LITE = response.specLite

  LOG: "Loaded next task: {TASK_ID} - {TITLE} (Task {progressIndex+1}/{totalTasks})"

  IF no ready tasks (success=false):
    LOG: "No ready tasks found"
    STOP: Execution complete
</step>

<step name="detect_system_task">
  ### Detect System Task

  EXTRACT: Task ID from selected task

  IF task ID endsWith "-997" OR task ID equals "997":
    LOAD: specwright/workflows/core/execute-tasks/spec-phase-3-code-review.md
    (hybrid lookup: project -> ~/.specwright/workflows/core/execute-tasks/)
    FOLLOW: Its instructions end-to-end
    RETURN: To phase_complete after completion

  ELSE IF task ID endsWith "-999" OR task ID equals "999":
    LOAD: specwright/workflows/core/execute-tasks/spec-phase-3-finalize-pr.md
    FOLLOW: Its instructions end-to-end
    STOP: Execution complete

  ELSE:
    SET: SYSTEM_TASK_TYPE = "regular"
    CONTINUE: Normal task execution
</step>

<step name="update_kanban_in_progress">
  ### Update Kanban JSON - Task Started

  CALL MCP TOOL: kanban_start_story
  Input:
  {
    "specId": "{SELECTED_SPEC}",
    "storyId": "{SELECTED_TASK.id}",
    "model": "{CURRENT_MODEL_ID}"
  }

  VERIFY: Tool returns {"success": true}
  LOG: "Task {SELECTED_TASK.id} marked as in_progress"
</step>

<step name="analyze_context">
  ### Analyze Technical Context

  **This replaces the V1 Technical Refinement that was done during create-spec.**
  **Context is generated on-the-fly from the implementation plan + codebase.**

  1. READ: PLAN_CONTEXT.relevantSection (the implementation plan section for this task)
  2. READ: PLAN_CONTEXT.executiveSummary (overall spec strategy)
  3. READ: PLAN_CONTEXT.componentConnections (how components connect)

  4. ANALYZE: Based on the plan section, identify:
     - Affected files and directories
     - Components to create or modify
     - Patterns to follow (from existing codebase)
     - Integration points with other components

  5. IF INTEGRATION_CONTEXT has completed tasks:
     READ: Their exports (components, services, hooks)
     NOTE: "Previous task {ID} created {exports} -- must integrate with these"

  SET: IMPLEMENTATION_PLAN = synthesized technical approach
</step>

<step name="implement">
  ### Direct Implementation

  <implementation_process>
    1. READ: Implementation plan section (PLAN_CONTEXT.relevantSection)
    2. UNDERSTAND: Architecture guidance, patterns, constraints from plan
    3. CONSULT: PLAN_CONTEXT.componentConnections for integration requirements
    4. EXPLORE: Existing codebase for patterns to follow
    5. IMPLEMENT: Create/modify files per plan section
    6. RUN: Unit tests + ensure existing tests pass
    7. VERIFY: Implementation matches plan section goals

    **File Organization (CRITICAL):**
    - NO files in project root
    - Implementation code per plan section guidance
    - Reports: specwright/specs/{SELECTED_SPEC}/implementation-reports/
  </implementation_process>

  OUTPUT: Implementation complete, ready for self-review
</step>

<step name="collect_user_todos">
  ### Collect User-Todos

  REFLECT: Did implementation reveal tasks that cannot be automated?

  **Common Categories:**
  1. Secrets & Credentials (API keys, OAuth apps, production env vars)
  2. External Services (third-party accounts, webhooks, DNS)
  3. Infrastructure (prod config, deployment pipelines, manual migrations)
  4. Access & Permissions (team access, service accounts, repo secrets)
  5. Documentation & Communication (user notifications, external docs)

  IF any manual tasks identified:
    CHECK: Does user-todos.md exist?
    IF NOT: CREATE from template (hybrid: project -> global)
            specwright/templates/docs/user-todos-template.md
            FILL: [SPEC_NAME], [DATE], [SPEC_PATH]

    APPEND each todo to appropriate section

  IF no manual tasks: SKIP
</step>

<step name="self_review">
  ### Self-Review

  <review_process>
    1. VERIFY: Implementation matches plan section goals
    2. VERIFY: Code style, architecture patterns, security/performance
    3. RUN: Linter and type checker
    4. RUN: Unit + integration tests
    5. VERIFY: Component connections established per plan

    IF all checks pass: PROCEED to self_learning_check
    ELSE: FIX and re-verify
  </review_process>
</step>

<step name="self_learning_check">
  ### Self-Learning Check

  REFLECT on the implementation process. DID any of these occur?
  - Initial approach didn't work
  - Had to refactor/retry
  - Discovered unexpected behavior
  - Found a better pattern than first tried
  - Encountered framework quirk

  IF YES:
    IDENTIFY: Context / what didn't work / what worked
    LOCATE: .claude/skills/frontend-[framework]/ | backend-[framework]/ | devops-[stack]/
    APPEND learning entry to dos-and-donts.md

  IF NO: SKIP
</step>

<step name="update_kanban_json_done">
  ### Update Kanban JSON - Task Complete

  GET: Modified files + last commit
  ```bash
  git diff --name-only HEAD~1
  git log -1 --format="%H|%s|%aI"
  ```

  CALL MCP TOOL: kanban_complete_story
  Input:
  {
    "specId": "{SELECTED_SPEC}",
    "storyId": "{SELECTED_TASK.id}",
    "filesModified": ["{FILE1}", ...],
    "commits": [{ "hash": "{H}", "message": "{M}", "timestamp": "{T}" }]
  }

  VERIFY: Returns {"success": true, "remaining": N}
</step>

<step name="story_commit" subagent="git-workflow">
  USE: git-workflow subagent
  "Commit task {SELECTED_TASK.id}:

  **WORKING_DIR:** {PROJECT_ROOT} (or {WORKTREE_PATH} if resumeContext.gitStrategy = worktree)

  - Message: feat/fix: {SELECTED_TASK.id} {SELECTED_TASK.title}
  - Stage ALL changes including:
    - Implementation files
    - kanban.json
    - integration-context.md updates
    - Any dos-and-donts.md / domain doc updates
  - Push to remote"
</step>

<step name="update_integration_context">
  ### Update Integration Context (Tier-Aware)

  READ: specTier from kanban.json → spec.specTier (default "M")
  IF specTier = "S":
    LOG: "S-Spec: integration-context.md update skipped"
    GOTO: phase_complete

  IF NOT EXISTS:
    CREATE with initial template (same as Phase 1)
    LOG: "Created missing integration-context.md (self-healing)"

  READ: specwright/specs/{SELECTED_SPEC}/integration-context.md

  UPDATE with information from THIS task:

  1. **Completed Tasks Table** -- ADD row:
     | [TASK-ID] | [Brief 5-10 word summary] | [Key files/functions] |

  2. **New Exports & APIs** -- ADD any new:
     - Components: `path/to/Component.tsx` -> `<ComponentName prop={value} />`
     - Services: `path/to/service.ts` -> `functionName(params)` -- description
     - Hooks/Utilities: `path/to/hook.ts` -> `useHookName()` -- returns
     - Types/Interfaces: `path/to/types.ts` -> `InterfaceName` -- meaning

  3. **Integration Notes** -- ADD if relevant

  4. **File Change Summary Table** -- ADD per file:
     | [file path] | Created/Modified | [TASK-ID] |

  **IMPORTANT:** Be concise; focus on EXPORTS with import paths so next session uses them directly.
</step>

## Phase Completion

<phase_complete>
  ### Check Remaining Tasks

  READ: specwright/specs/{SELECTED_SPEC}/kanban.json
  COUNT: Tasks where status = "ready" OR "blocked"

  IF ready tasks remain:
    UPDATE: kanban.json
    - resumeContext.currentPhase = "task-complete"
    - resumeContext.nextPhase = "3-execute-task"
    - resumeContext.nextAction = "Execute next task"

    ADD changeLog entry:
    ```json
    {
      "timestamp": "{NOW}",
      "action": "task_completed",
      "storyId": "{SELECTED_TASK.id}",
      "details": "Progress: {boardStatus.done}/{boardStatus.total}"
    }
    ```

    WRITE: kanban.json

    OUTPUT to user:
    ---
    ## Task Complete: {SELECTED_TASK.id} - {SELECTED_TASK.title}

    **Progress:** {boardStatus.done} of {boardStatus.total} tasks ({statistics.progressPercent}%)
    **Remaining:** {boardStatus.ready} tasks
    **Self-Learning:** [Updated/No updates]

    ---
    **To continue:**
    ```
    /clear
    /execute-tasks
    ```
    ---

    STOP: Do not proceed to next task

  ELSE (all tasks done):
    UPDATE: kanban.json
    - resumeContext.currentPhase = "all-tasks-done"
    - resumeContext.nextPhase = "3-execute-task"
    - resumeContext.nextAction = "Execute System Tasks (997, 999)"
    - execution.status = "tasks-complete"

    ADD changeLog entry:
    ```json
    {
      "timestamp": "{NOW}",
      "action": "all_tasks_completed",
      "storyId": null,
      "details": "All {boardStatus.total} tasks completed"
    }
    ```

    WRITE: kanban.json

    OUTPUT to user:
    ---
    ## All Tasks Complete!

    **Progress:** {boardStatus.total} of {boardStatus.total} tasks (100%)
    **Next:** System Tasks (Code Review, Finalize PR)

    ---
    **To continue:**
    ```
    /clear
    /execute-tasks
    ```
    ---

    STOP: Do not proceed to System Tasks
</phase_complete>
