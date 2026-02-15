---
description: Spec Phase 5 - Finalize with PR creation (JSON v5.0)
version: 5.0
---

# Spec Phase 5: Finalize

## What's New in v5.0

- **JSON-Based**: Liest/schreibt kanban.json statt kanban-board.md

## What's New in v4.0

- **Legacy Check**: This phase is now a legacy check for backward compatibility
- **System Story 999**: For specs with System Stories, story-999 handles finalization
- **Skip Logic**: If story-999 exists and is Done, this phase only shows completion summary

## What's New in v3.3

- **Test-Szenarien Generation**: Creates test-scenarios.md for manual/AI testing
- **User-Todos Finalization**: Finalizes and validates user-todos.md if present
- **Handover Documentation**: Better documentation for feature handoff

## Purpose

Create pull request, generate test documentation, and provide final summary.

**Note:** For specs created with create-spec v3.0+, this functionality is handled by story-999.

## Entry Condition

- kanban.json shows: resumeContext.currentPhase = "5-ready" OR "all-stories-done"
- All stories with status = "done"

## Legacy Check (v5.0)

<legacy_check>
  **BEFORE executing legacy logic, check for System Story 999:**

  READ: agent-os/specs/{SELECTED_SPEC}/kanban.json
  FIND: Story in stories[] where id contains "999"

  IF story-999 exists in kanban.json:
    EXTRACT: stories[999].status

    IF status = "done":
      LOG: "story-999 (Finalize PR) already completed - showing completion summary only"

      # Just show the final summary - everything else was done by story-999
      EXTRACT: PR URL from resumeContext.lastAction if present

      OUTPUT to user:
      ---
      ## Spec Execution Complete!

      **Note:** Finalization was handled by System Story 999.

      ### Kanban Status
      - View: agent-os/specs/{SELECTED_SPEC}/kanban.json

      ### Handover-Dokumentation
      - **Test-Szenarien:** agent-os/specs/{SELECTED_SPEC}/test-scenarios.md
      - **User-Todos:** agent-os/specs/{SELECTED_SPEC}/user-todos.md (if exists)
      - **Review Report:** agent-os/specs/{SELECTED_SPEC}/review-report.md

      ---
      **Spec execution finished. No further phases.**
      ---

      STOP: Execution complete

    ELSE (status != "done"):
      LOG: "story-999 exists but not done - returning to Phase 3"

      UPDATE: kanban.json
      - resumeContext.currentPhase = "story-complete"
      - resumeContext.nextAction = "Execute story-999"

      WRITE: kanban.json

      INFORM: "System Story 999 needs to be executed. Run /execute-tasks again."
      STOP: Return to Phase 3 for story-999

  ELSE (no story-999):
    LOG: "Legacy spec without System Stories - executing Phase 5"
    CONTINUE: Execute legacy finalization below
</legacy_check>

## Actions (Legacy - for specs without System Stories)

<step name="final_test_run" subagent="test-runner">
  USE: test-runner subagent
  "Run full test suite to verify no regressions"

  IF failures: FIX before proceeding
</step>

<step name="generate_test_scenarios">
  ### Generate Test-Szenarien (v3.3)

  **Create documentation for manual testing or AI-based E2E tests.**

  <test_scenarios_generation>
    1. READ: All completed stories from agent-os/specs/{SELECTED_SPEC}/stories/

    2. CREATE: agent-os/specs/{SELECTED_SPEC}/test-scenarios.md

       **TEMPLATE LOOKUP (Hybrid):**
       1. Local: agent-os/templates/docs/test-scenarios-template.md
       2. Global: ~/.agent-os/templates/docs/test-scenarios-template.md
       Use the FIRST one found.

    3. FILL: Header information
       - [SPEC_NAME] → Spec folder name
       - [DATE] → Current date
       - [SPEC_PATH] → Full path to spec folder

    4. FOR EACH completed story:
       GENERATE: Test scenario section with:

       **Happy Path:**
       - Extract main flow from Gherkin scenarios in story
       - Convert to step-by-step test instructions
       - Define expected results for each step

       **Edge Cases:**
       - Identify boundary conditions from acceptance criteria
       - List alternative flows mentioned in story

       **Fehlerfälle:**
       - Extract error scenarios from story
       - Define how to trigger each error
       - Document expected error messages

    5. ADD: Regressions-Checkliste
       - List existing functionality that might be affected
       - Include quick verification steps

    6. ADD: Automatisierungs-Hinweise (if applicable)
       - Data-testid selectors if frontend components created
       - API endpoints if backend routes created
       - Mock data examples

    OUTPUT: "Test-Szenarien generated: agent-os/specs/{SELECTED_SPEC}/test-scenarios.md"
  </test_scenarios_generation>
</step>

<step name="finalize_user_todos">
  ### Finalize User-Todos (v3.3)

  **Review and finalize user-todos.md if manual tasks were collected.**

  <user_todos_finalization>
    CHECK: Does user-todos.md exist?
    ```bash
    ls agent-os/specs/{SELECTED_SPEC}/user-todos.md 2>/dev/null
    ```

    IF EXISTS:
      1. READ: agent-os/specs/{SELECTED_SPEC}/user-todos.md

      2. REVIEW: All collected todos
         - Remove duplicates
         - Verify priority classification is correct
         - Ensure descriptions are clear and actionable

      3. CLEAN UP: Template placeholders
         - Remove unused sections with only placeholders
         - Keep only sections with actual todos

      4. VERIFY: Each todo still relevant
         - Some may have been resolved during later stories
         - Mark resolved ones as complete

      5. ADD: Summary at top (after header)
         ```markdown
         ## Zusammenfassung

         **Gesamt:** [N] offene Aufgaben
         - Kritisch: [X]
         - Wichtig: [Y]
         - Optional: [Z]

         **Geschätzte Zeit:** [ROUGH_ESTIMATE]
         ```

      OUTPUT: "User-Todos finalized: [N] manual tasks documented"

    ELSE (no user-todos.md):
      OUTPUT: "No manual tasks required - no user-todos.md created"
      SKIP: No finalization needed
  </user_todos_finalization>
</step>

<step name="create_pr" subagent="git-workflow">
  USE: git-workflow subagent
  "Create PR for spec: {SELECTED_SPEC}

  **WORKING_DIR:** {PROJECT_ROOT} (or {WORKTREE_PATH} if USE_WORKTREE = true)
  (Use this as the git repository root - do NOT operate in nested repos)

  - Commit any remaining changes (kanban-board.md)
  - Push all commits
  - Create PR to main branch
  - Include summary of all stories"

  CAPTURE: PR URL
</step>

<step name="roadmap_check">
  CHECK: Did this spec complete a roadmap item?
  IF yes: UPDATE agent-os/product/roadmap.md
</step>

<step name="completion_sound">
  RUN: afplay /System/Library/Sounds/Glass.aiff
</step>

<step name="worktree_cleanup" subagent="git-workflow" condition="Git Strategy = worktree">
  CHECK: Resume Context for "Git Strategy" value

  IF "Git Strategy" != "worktree" OR WORKTREE_PATH = "(none)" OR WORKTREE_PATH empty:
    SKIP: This step
    LOG: "No worktree cleanup needed (branch strategy or none created)"
    UPDATE: kanban-board.md - Last Action: Skipped worktree cleanup (none created)

  ELSE:
    USE: git-workflow subagent

    PROMPT: "Clean up git worktree: {SELECTED_SPEC}

    **WORKING_DIR:** {PROJECT_ROOT}
    (Use this as the git repository root - do NOT operate in nested repos)

    Read Resume Context for WORKTREE_PATH (external location, e.g., ../projekt-x-worktrees/feature-name)

    Cleanup:
    1. Verify PR was created
    2. Remove worktree: git worktree remove [WORKTREE_PATH]
       Note: WORKTREE_PATH is external (e.g., ../projekt-x-worktrees/feature-name)
    3. Verify: git worktree list
    4. Optionally remove empty worktrees directory if no other worktrees exist

    Edge Cases:
    - PR not created: Skip cleanup, warn
    - Uncommitted changes: Warn, don't remove
    - Path doesn't exist: Continue"

    WAIT: For completion
    UPDATE: kanban-board.md - Last Action: Worktree cleaned up
</step>

## Phase Completion

<phase_complete>
  READ: agent-os/specs/{SELECTED_SPEC}/kanban.json

  UPDATE:
  - resumeContext.currentPhase = "complete"
  - resumeContext.nextPhase = null
  - resumeContext.lastAction = "PR created - {PR_URL}"
  - resumeContext.nextAction = "Review and merge PR"
  - execution.status = "complete"
  - execution.completedAt = "{NOW}"

  ADD to changeLog[]:
  ```json
  {
    "timestamp": "{NOW}",
    "action": "execution_completed",
    "storyId": null,
    "details": "Spec execution complete - PR created: {PR_URL}"
  }
  ```

  WRITE: kanban.json

  OUTPUT to user:
  ---
  ## Spec Execution Complete!

  ### What's Been Done
  {FOR EACH story in stories[] where status = "done":
    - {story.id}: {story.title}
  }

  ### Kanban Status
  - Completed: {boardStatus.done} stories
  - Total Effort: {statistics.totalEffort} points
  - View: agent-os/specs/{SELECTED_SPEC}/kanban.json

  ### Pull Request
  {PR_URL}

  ### Handover-Dokumentation

  **Test-Szenarien:** agent-os/specs/{SELECTED_SPEC}/test-scenarios.md
  - Enthält Happy-Path, Edge-Cases und Fehlerfälle pro Story
  - Kann für manuelles Testen oder KI-basierte E2E-Tests verwendet werden

  **User-Todos:** [IF EXISTS: agent-os/specs/{SELECTED_SPEC}/user-todos.md]
  - [N] manuelle Aufgaben müssen noch erledigt werden
  - [OR: "Keine manuellen Aufgaben erforderlich"]

  ---
  **Spec execution finished. No further phases.**
  ---
</phase_complete>
