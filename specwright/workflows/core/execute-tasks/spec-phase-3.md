---
description: Spec Phase 3 - Execute one user story (JSON v5.5)
version: 5.5
---

# Spec Phase 3: Execute Story (Direct Execution)

## Purpose

Execute ONE user story completely. The main agent implements directly,
maintaining full context throughout the story.

Regular stories execute inline. System stories (997/998/999) are routed
to dedicated workflow files — load them only when needed:
- `spec-phase-3-code-review.md` — Story 997
- `spec-phase-3-integration-validation.md` — Story 998
- `spec-phase-3-finalize-pr.md` — Story 999

## Entry Condition

- kanban.json exists
- resumeContext.currentPhase = "2-complete" OR "story-complete"
- Stories remain with status = "ready"

## Actions

<step name="load_next_task">
  ### Load Next Task via Smart MCP Tool

  **MANDATORY: Call kanban_get_next_task BEFORE any implementation.**
  **DO NOT read story files directly.**

  The MCP tool returns context that is NOT available from the story file alone:
  - `specContext`: Executive Summary, Component Connections, Current Phase from implementation-plan.md
  - `specLite`: Project overview with tech stack, key constraints
  - `crossCuttingDecisions`: Project-wide architectural rules
  - `integrationContext`: What previous stories built, available exports and APIs
  - `resumeInfo`: Git strategy, branch, spec tier

  IF SINGLE_STORY_MODE = true AND TARGET_STORY_ID is set:
    CALL MCP TOOL: kanban_get_next_task
    Input: { "specId": "{SELECTED_SPEC}", "storyId": "{TARGET_STORY_ID}" }
  ELSE:
    CALL MCP TOOL: kanban_get_next_task
    Input: { "specId": "{SELECTED_SPEC}" }

  RECEIVE: Complete task context (story, integrationContext, resumeInfo, specContext, specLite, crossCuttingDecisions, boardSummary)

  VERIFY: Tool returns success=true
  SET: SELECTED_STORY = response.story
  SET: INTEGRATION_CONTEXT = response.integrationContext
  SET: SPEC_CONTEXT = response.specContext
  SET: SPEC_LITE = response.specLite
  SET: CROSS_CUTTING = response.crossCuttingDecisions

  LOG: "Loaded next task: {STORY_ID} - {TITLE} (Story {progressIndex+1}/{totalStories})"

  IF no ready stories (success=false):
    LOG: "No ready stories found"
    STOP: Execution complete
</step>

<step name="verify_integration_requirements">
  ### Verify Integration Requirements

  **CRITICAL: Check BEFORE implementation which connections this story MUST establish.**

  <integration_check>
    1. READ: Story file
       SEARCH for: "Integration DoD" section OR "Integration hergestellt:" items

    2. IF Integration DoD items found:
       EXTRACT: All required connections
       ```
       Integration: [Source] → [Target]
       Validierung: [Command]
       ```

       FOR EACH required connection:
         a. Source exists? (grep/ls if from previous story; note if this story creates it)
         b. Target exists? (READ code if from previous story; note if this story creates it)
         c. IF Source AND Target already exist:
            READ both component files
            NOTE: "Diese Story MUSS [Source] mit [Target] verbinden via [Method]"

       LOG: "Integration Requirements: [Source] → [Target]: [Status]"

    3. IF no Integration DoD items: PROCEED normal implementation.

    4. **REMINDER:** At story end, Integration-DoD items are VERIFIED.
       Code existence is NOT enough — the connection must be ACTIVE (Import + call).
  </integration_check>
</step>

<step name="story_selection">
  ANALYZE: Backlog stories; CHECK dependencies for each.

  FOR each story in Backlog:
    IF dependencies = "None" OR all_dependencies_in_done:
      SELECT this story; BREAK

  IF no eligible story:
    ERROR: "All remaining stories have unmet dependencies"
    LIST: Blocked stories and their dependencies
</step>

<step name="detect_system_story">
  ### Detect System Story

  EXTRACT: Story ID from selected story filename

  IF story ID matches "story-997*" OR "*-997*":
    LOAD: specwright/workflows/core/execute-tasks/spec-phase-3-code-review.md
    (hybrid lookup: project → ~/.specwright/workflows/core/execute-tasks/)
    FOLLOW: Its instructions end-to-end
    RETURN: To phase_complete after completion

  ELSE IF story ID matches "story-998*" OR "*-998*":
    **Tier-aware gating (before loading 998 workflow):**
    READ: specTier from resumeInfo (default "M")
    CHECK: Any story has Integration Type = "Full-stack"?

    IF specTier = "S" AND no Full-stack stories:
      LOG: "S-Spec single-layer: story-998 skipped"
      MARK: story-998 as Done (kanban_complete_story with empty filesModified/commits)
      PROCEED: To next story (story-999)
      GOTO: phase_complete

    IF specTier = "S" AND has Full-stack stories:
      LOG: "S-Spec Full-stack: simplified mode"
      SET: SIMPLIFIED_998 = true

    LOAD: specwright/workflows/core/execute-tasks/spec-phase-3-integration-validation.md
    FOLLOW: Its instructions (SIMPLIFIED_998 is honored inside)
    RETURN: To phase_complete after completion

  ELSE IF story ID matches "story-999*" OR "*-999*":
    LOAD: specwright/workflows/core/execute-tasks/spec-phase-3-finalize-pr.md
    FOLLOW: Its instructions end-to-end
    STOP: Execution complete (no further phases)

  ELSE:
    SET: SYSTEM_STORY_TYPE = "regular"
    CONTINUE: Normal story execution (proceed to update_kanban_in_progress)
</step>

<step name="update_kanban_in_progress">
  ### Update Kanban JSON - Story Started

  CALL MCP TOOL: kanban_start_story
  Input:
  {
    "specId": "{SELECTED_SPEC}",
    "storyId": "{SELECTED_STORY.id}",
    "model": "{CURRENT_MODEL_ID}"
  }

  VERIFY: Tool returns {"success": true}

  NOTE: The tool automatically updates story.status, story.phase, timing.startedAt,
  model, resumeContext, boardStatus counters, execution.status, changeLog.

  UPDATE: Story file (specwright/specs/{SELECTED_SPEC}/stories/{STORY_FILE})
    - FIND: "Status: Ready" → REPLACE WITH: "Status: In Progress"
</step>

<step name="load_story">
  ### Story Details Available

  **Story data already loaded via kanban_get_next_task — no additional reads needed.**

  AVAILABLE from SELECTED_STORY:
  - id, title, feature, scenarios[], technicalDetails (was/wie/wo), dod[]

  AVAILABLE from INTEGRATION_CONTEXT:
  - Completed stories and their exports (components, services, hooks)

  AVAILABLE from SPEC_CONTEXT (if implementation-plan.md exists):
  - executiveSummary, componentConnections, currentPhase

  NOTE: Skills auto-load when editing files matching their glob patterns.
</step>

<step name="implement">
  ### Direct Implementation

  <implementation_process>
    1. READ: Technical requirements (WAS, WIE, WO) from story
    2. UNDERSTAND: Architecture guidance, patterns, constraints
    3. CONSULT: SPEC_CONTEXT (componentConnections, executiveSummary, currentPhase)
    4. IMPLEMENT: Create/modify files per WO; follow WIE patterns
    5. RUN: Unit tests + ensure existing tests pass
    6. VERIFY: Each Gherkin acceptance criterion

    **File Organization (CRITICAL):**
    - NO files in project root
    - Implementation code per WO section
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
  6. Sonstige (Design-Reviews, Daten-Importe, manuelle Tests, Content-Pflege)

  IF any manual tasks identified:
    CHECK: Does user-todos.md exist?
    IF NOT: CREATE from template (hybrid: project → global)
            specwright/templates/docs/user-todos-template.md
            ~/.specwright/templates/docs/user-todos-template.md
            FILL: [SPEC_NAME], [DATE], [SPEC_PATH]

    APPEND each todo to appropriate section:

    **Priority:** Kritisch (won't work without) / Wichtig (prod) / Optional

    **Format:**
    ```markdown
    - [ ] **[Todo Title]**
      - Beschreibung: [What needs to be done]
      - Grund: [Why it must be manual]
      - Hinweis: [Helpful links or instructions]
      - Story: [STORY_ID]
    ```

  IF no manual tasks: SKIP
</step>

<step name="self_review">
  ### Self-Review with DoD Checklist

  <review_process>
    1. READ: DoD checklist from story file

    2. VERIFY:
       **Implementation:** Code style, architecture patterns, security/performance
       **Quality:** Acceptance criteria, unit + integration tests, linter
       **Documentation:** Self-documenting or necessary comments, no debug code

    3. RUN: Verification commands from story's Completion Check section

    4. **INTEGRATION VERIFICATION (KRITISCH):**

       CHECK: Does this story have Integration-DoD items?

       IF YES:
         FOR EACH "Integration hergestellt: [Source] → [Target]" item:
           a. VERIFY: Connection code exists (`grep -r "import.*{Service}" src/`)
           b. VERIFY: Connection is USED, not just imported (`grep -r "service\." src/`)
           c. RUN: Validierungsbefehl from Integration-DoD

           IF any verification FAILS:
             FLAG: "Integration NOT established: [Source] → [Target]"
             **COMMON FIXES:** Missing import / imported but unused / stub instead of real call
             FIX: Add missing connection code
             RE-VERIFY

         LOG: "All integrations verified"

    5. FIX: Any issues before proceeding

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
    CATEGORY: Technical (→ dos-and-donts.md in tech skill) or Domain (→ domain skill)
    LOCATE: .claude/skills/frontend-[framework]/ | backend-[framework]/ | devops-[stack]/
    APPEND learning entry:
    ```markdown
    ### [DATE] - [Short Title]
    **Context:** [...]
    **Issue:** [...]
    **Solution:** [...]
    ```
    ADD to section: Dos / Don'ts / Gotchas

  IF NO: SKIP
</step>

<step name="domain_update_check">
  ### Domain Update Check

  ANALYZE: Did this story change business logic?

  IF business logic changed:
    LOCATE: .claude/skills/domain-[project]/[process].md
    CHECK: Description still accurate? Process flow matches? Business rules correct?
    IF outdated: UPDATE the process document; LOG "Domain doc updated: [process].md"

  IF no domain skill or no business change: SKIP
</step>

<step name="mark_story_done">
  UPDATE: Story file
    - FIND: "Status: In Progress" → REPLACE WITH: "Status: Done"
    - CHECK: All DoD items marked as [x]
</step>

<step name="update_kanban_json_done">
  ### Update Kanban JSON - Story Complete

  GET: Modified files + last commit
  ```bash
  git diff --name-only HEAD~1
  git log -1 --format="%H|%s|%aI"
  ```

  CALL MCP TOOL: kanban_complete_story
  Input:
  {
    "specId": "{SELECTED_SPEC}",
    "storyId": "{SELECTED_STORY.id}",
    "filesModified": ["{FILE1}", ...],
    "commits": [{ "hash": "{H}", "message": "{M}", "timestamp": "{T}" }]
  }

  VERIFY: Returns {"success": true, "remaining": N}

  NOTE: The tool automatically updates story.status/phase/timing/implementation,
  verification.dodChecked, resumeContext, boardStatus, statistics, execution.status,
  changeLog.
</step>

<step name="story_commit" subagent="git-workflow">
  USE: git-workflow subagent
  "Commit story {SELECTED_STORY.id}:

  **WORKING_DIR:** {PROJECT_ROOT} (or {WORKTREE_PATH} if resumeContext.gitStrategy = worktree)

  - Message: feat/fix: {SELECTED_STORY.id} {SELECTED_STORY.title}
  - Stage ALL changes including:
    - Implementation files
    - Story file with Status: Done
    - kanban.json
    - integration-context.md updates
    - Any dos-and-donts.md / domain doc updates
  - Push to remote"
</step>

<step name="update_integration_context">
  ### Update Integration Context (Tier-Aware)

  **Tier gating:**
  READ: specTier from kanban.json → spec.specTier (default "M")
  IF specTier = "S" AND no Full-stack stories:
    LOG: "S-Spec single-layer: integration-context.md update skipped"
    SKIP this step entirely; GOTO: story_commit

  **Self-Healing: Ensure integration-context.md exists**
  IF NOT EXISTS:
    CREATE with initial template:
    ```markdown
    # Integration Context

    ## Completed Stories

    | Story | Summary | Key Files |
    |-------|---------|-----------|

    ## New Exports & APIs

    ### Components
    _None yet_

    ### Services
    _None yet_

    ### Hooks / Utilities
    _None yet_

    ### Types / Interfaces
    _None yet_

    ## Integration Notes
    _None yet_
    ```
    LOG: "Created missing integration-context.md (self-healing)"

  READ: specwright/specs/{SELECTED_SPEC}/integration-context.md

  UPDATE with information from THIS story:

  1. **Completed Stories Table** — ADD row:
     | [STORY-ID] | [Brief 5-10 word summary] | [Key files/functions] |

  2. **New Exports & APIs** — ADD any new:
     - Components: `path/to/Component.tsx` → `<ComponentName prop={value} />`
     - Services: `path/to/service.ts` → `functionName(params)` — description
     - Hooks/Utilities: `path/to/hook.ts` → `useHookName()` — returns
     - Types/Interfaces: `path/to/types.ts` → `InterfaceName` — meaning

  3. **Integration Notes** — ADD if relevant (connections, patterns, next-story hints)

  4. **File Change Summary Table** — ADD per file:
     | [file path] | Created/Modified | [STORY-ID] |

  **IMPORTANT:** Be concise; focus on EXPORTS with import paths so next session uses them directly.
</step>

## Phase Completion

<phase_complete>
  ### Check Remaining Stories

  READ: specwright/specs/{SELECTED_SPEC}/kanban.json
  COUNT: Stories where status = "ready" OR "blocked"

  IF ready stories remain:
    UPDATE: kanban.json
    - resumeContext.currentPhase = "story-complete"
    - resumeContext.nextPhase = "3-execute-story"
    - resumeContext.nextAction = "Execute next story"

    ADD changeLog entry:
    ```json
    {
      "timestamp": "{NOW}",
      "action": "story_completed",
      "storyId": "{SELECTED_STORY.id}",
      "details": "Progress: {boardStatus.done}/{boardStatus.total}"
    }
    ```

    WRITE: kanban.json

    OUTPUT to user:
    ---
    ## Story Complete: {SELECTED_STORY.id} - {SELECTED_STORY.title}

    **Progress:** {boardStatus.done} of {boardStatus.total} stories ({statistics.progressPercent}%)
    **Remaining:** {boardStatus.ready} stories
    **Self-Learning:** [Updated/No updates]
    **Domain Docs:** [Updated/No updates]
    **Next:** Execute next story

    ---
    **To continue:**
    ```
    /clear
    /execute-tasks
    ```
    ---

    STOP: Do not proceed to next story

  ELSE (all stories done):
    UPDATE: kanban.json
    - resumeContext.currentPhase = "all-stories-done"
    - resumeContext.nextPhase = "3-execute-story"
    - resumeContext.nextAction = "Execute System Stories (997, 998, 999)"
    - execution.status = "stories-complete"

    ADD changeLog entry:
    ```json
    {
      "timestamp": "{NOW}",
      "action": "all_stories_completed",
      "storyId": null,
      "details": "All {boardStatus.total} stories completed"
    }
    ```

    WRITE: kanban.json

    OUTPUT to user:
    ---
    ## All Stories Complete!

    **Progress:** {boardStatus.total} of {boardStatus.total} stories (100%)
    **Next:** System Stories (Code Review, Integration Validation, Finalize PR)

    ---
    **To continue:**
    ```
    /clear
    /execute-tasks
    ```
    ---

    STOP: Do not proceed to System Stories
</phase_complete>
