---
description: Spec Phase 3 - Execute one user story (JSON v5.0)
version: 5.0
---

# Spec Phase 3: Execute Story (Direct Execution)

## What's New in v5.0

- **JSON-Based Kanban**: Liest/schreibt kanban.json statt kanban-board.md
- **Strukturierte Story-Updates**: stories[].status, timing, implementation in JSON
- **boardStatus Sync**: Automatische Zähler-Updates in boardStatus
- **changeLog Tracking**: Alle Änderungen werden im changeLog protokolliert

## What's New in v4.1

- **Project Knowledge Update**: story-999 aktualisiert automatisch das Project Knowledge
  - Extrahiert Artefakte aus Stories mit "Creates Reusable: yes"
  - Aktualisiert knowledge-index.md mit neuen Einträgen
  - Erstellt/aktualisiert Detail-Dateien (ui-components.md, etc.)
  - Unterstützt dynamische Kategorie-Erstellung

## What's New in v4.0

- **System Story Detection**: Erkennt automatisch System Stories (story-997, 998, 999)
- **System Story Execution**: Spezielle Execution Logic für jede System Story:
  - story-997: Code Review (git diff, review-report.md)
  - story-998: Integration Validation
  - story-999: Finalize PR
- **Backward Compatibility**: Reguläre Stories werden weiterhin normal ausgeführt

## What's New in v3.3

- **Integration Requirements Check**: Prüft VOR Implementierung welche Verbindungen hergestellt werden müssen
- **Integration Verification**: Verifiziert NACH Implementierung dass Verbindungen AKTIV sind (nicht nur Code existiert)
- **FIX: "Komponenten gebaut aber nicht verbunden"** - Erzwingt dass Verbindungen tatsächlich hergestellt werden

## What's New in v3.2

- **User-Todo Collection**: Captures manual tasks that arise during implementation
- **Automatic user-todos.md Creation**: Creates file when first todo is identified
- **Priority Classification**: Todos are categorized as Critical/Important/Optional

## What's New in v3.1

- **Integration Context**: Reads previous story context before implementation
- **Context Update**: Updates integration-context.md after story completion
- **Better Cross-Session Integration**: No more "orphaned" code after /clear

## What's New in v3.0

- **No Sub-Agent Delegation**: Main agent implements story directly
- **Skills Load Automatically**: Via glob patterns in .claude/skills/
- **Self-Review**: DoD checklist instead of separate review agents
- **Self-Learning**: Updates dos-and-donts.md when learning
- **Domain Updates**: Keeps domain documentation current

## Purpose

Execute ONE user story completely. The main agent implements directly,
maintaining full context throughout the story.

## Entry Condition

- kanban.json exists
- resumeContext.currentPhase = "2-complete" OR "story-complete"
- Stories remain with status = "ready"

## Actions

<step name="load_next_task">
  ### Load Next Task via Smart MCP Tool

  **NEW: Single tool call replaces multiple file reads and parsing.**

  CALL MCP TOOL: kanban_get_next_task
  Input:
  {
    "specId": "{SELECTED_SPEC}"
  }

  RECEIVE: Complete task context in one structured response
  {
    "success": true,
    "story": {
      "id": "{STORY_ID}",
      "title": "{TITLE}",
      "type": "{TYPE}",
      "priority": "{PRIORITY}",
      "effort": {EFFORT},
      "dependencies": ["{DEP_IDS}"],
      "model": "{MODEL}",
      "feature": "```gherkin\nFeature: ...",
      "scenarios": ["```gherkin\nScenario: ..."],
      "technicalDetails": {
        "was": "{WHAT_TO_BUILD}",
        "wie": "{ARCHITECTURE_GUIDANCE}",
        "wo": ["{FILE_PATHS}"]
      },
      "dod": ["{DOD_ITEMS}"]
    },
    "integrationContext": {
      "completedStories": [
        {"id": "{PREV_ID}", "summary": "{WHAT_WAS_BUILT}", "files": ["{FILES}"]}
      ],
      "newExports": {
        "components": ["{COMPONENT_EXPORTS}"],
        "services": ["{SERVICE_EXPORTS}"],
        "hooks": ["{HOOK_EXPORTS}"]
      }
    },
    "resumeInfo": {
      "currentPhase": "{PHASE}",
      "gitStrategy": "{STRATEGY}",
      "gitBranch": "{BRANCH}",
      "progressIndex": {N},
      "totalStories": {TOTAL}
    },
    "boardSummary": {
      "ready": {N}, "inProgress": {N}, "done": {N}
    }
  }

  VERIFY: Tool returns success=true
  SET: SELECTED_STORY = response.story
  SET: INTEGRATION_CONTEXT = response.integrationContext

  LOG: "Loaded next task: {STORY_ID} - {TITLE} (Story {progressIndex+1}/{totalStories})"

  IF no ready stories (success=false):
    LOG: "No ready stories found - all stories are in_progress, done, or blocked"
    STOP: Execution complete

  **Token Savings:**
  - Old method: ~3300 tokens (kanban.json + story.md + integration.md reads + parsing)
  - New method: ~450 tokens (1 tool call + compact JSON response)
  - Saved: ~2850 tokens (86%) per story
  - Parser: Regex (free, 95% cases) with Haiku fallback ($0.001, 5% cases)

  **What the tool does (server-side, zero Opus tokens):**
  - Reads kanban.json to find next ready story
  - Parses story .md file using layered parser (regex → Haiku fallback)
  - Reads and filters integration-context.md (only relevant completed stories)
  - Returns everything bundled as structured JSON
</step>

<step name="verify_integration_requirements">
  ### Verify Integration Requirements (v3.3 - NEU)

  **CRITICAL: Prüfe VOR der Implementierung welche Verbindungen diese Story herstellen MUSS.**

  <integration_check>
    1. READ: Story file
       SEARCH for: "Integration DoD" section OR "Integration hergestellt:" items

    2. IF Integration DoD items found:

       EXTRACT: Alle Verbindungen die diese Story herstellen muss
       ```
       Integration: [Source] → [Target]
       Validierung: [Command]
       ```

       FOR EACH required connection:
         a. CHECK: Existiert die Source-Komponente bereits?
            - IF Source in previous story: Verify it exists (grep/ls)
            - IF Source in THIS story: Note to create it

         b. CHECK: Existiert die Target-Komponente bereits?
            - IF Target in previous story: READ the Target code
            - IF Target in THIS story: Note to create it

         c. IF Source AND Target already exist (from prior stories):
            READ: Both component files
            UNDERSTAND: Available exports/APIs
            NOTE: "Diese Story MUSS [Source] mit [Target] verbinden via [Method]"

       LOG: "Integration Requirements für diese Story:"
       LOG: "- [Source] → [Target]: [Status: existing/to-create]"

    3. IF NO Integration DoD items:
       NOTE: "Story hat keine expliziten Integration-Anforderungen"
       PROCEED: Normal implementation

    4. **CRITICAL REMINDER:**
       Am Ende dieser Story werden die Integration-DoD-Punkte VERIFIZIERT.
       Es reicht NICHT, dass Code existiert.
       Die Verbindung muss AKTIV hergestellt sein (Import + Aufruf).
  </integration_check>
</step>

<step name="story_selection">
  ANALYZE: Backlog stories
  CHECK: Dependencies for each story

  FOR each story in Backlog:
    IF dependencies = "None" OR all_dependencies_in_done:
      SELECT: This story
      BREAK

  IF no eligible story:
    ERROR: "All remaining stories have unmet dependencies"
    LIST: Blocked stories and their dependencies
</step>

<step name="detect_system_story">
  ### Detect System Story (v4.0)

  **CHECK: Is selected story a System Story?**

  <system_story_detection>
    EXTRACT: Story ID from selected story filename

    IF story ID matches "story-997*" OR story ID matches "*-997*":
      SET: SYSTEM_STORY_TYPE = "code-review"
      GOTO: execute_system_story_997

    ELSE IF story ID matches "story-998*" OR story ID matches "*-998*":
      SET: SYSTEM_STORY_TYPE = "integration-validation"
      GOTO: execute_system_story_998

    ELSE IF story ID matches "story-999*" OR story ID matches "*-999*":
      SET: SYSTEM_STORY_TYPE = "finalize-pr"
      GOTO: execute_system_story_999

    ELSE:
      SET: SYSTEM_STORY_TYPE = "regular"
      CONTINUE: Normal story execution (proceed to update_kanban_in_progress)
  </system_story_detection>
</step>

<step name="execute_system_story_997">
  ### Execute System Story 997: Code Review (v4.0)

  **Purpose:** Starkes Modell reviewt den gesamten Feature-Diff

  <code_review_execution>
    1. UPDATE: kanban.json
       - MOVE: story-997 to "In Progress"
       - UPDATE resumeContext

    2. GET: Full diff between main and current branch
       ```bash
       git diff main...HEAD --name-only > /tmp/changed_files.txt
       git diff main...HEAD --stat
       ```

    3. CATEGORIZE: Changed files
       - New files (Added)
       - Modified files
       - Deleted files

    4. REVIEW: Each changed file
       FOR EACH file in changed_files:
         READ: File content
         ANALYZE:
         - Code style conformance
         - Architecture patterns followed
         - Security best practices
         - Performance considerations
         - Error handling
         - Test coverage

         RECORD: Issues found (Critical/Major/Minor)

    5. CREATE: specwright/specs/{SELECTED_SPEC}/review-report.md

       **Content:**
       ```markdown
       # Code Review Report - [SPEC_NAME]

       **Datum:** [DATE]
       **Branch:** [BRANCH_NAME]
       **Reviewer:** Claude (Opus)

       ## Review Summary

       **Geprüfte Commits:** [N]
       **Geprüfte Dateien:** [N]
       **Gefundene Issues:** [N]

       | Schweregrad | Anzahl |
       |-------------|--------|
       | Critical | [N] |
       | Major | [N] |
       | Minor | [N] |

       ## Geprüfte Dateien

       [List of all reviewed files with status]

       ## Issues

       ### Critical Issues

       [Keine gefunden / Issue-Liste mit Datei, Zeile, Beschreibung, Empfehlung]

       ### Major Issues

       [Keine gefunden / Issue-Liste mit Datei, Zeile, Beschreibung, Empfehlung]

       ### Minor Issues

       [Keine gefunden / Issue-Liste mit Datei, Zeile, Beschreibung, Empfehlung]

       ## Fix Status

       | # | Schweregrad | Issue | Status | Fix-Details |
       |---|-------------|-------|--------|-------------|
       | 1 | [Critical/Major/Minor] | [Kurzbeschreibung] | [pending/fixed/skipped/deferred] | [Was wurde gefixt] |

       ## Empfehlungen

       [List of recommendations]

       ## Fazit

       [Summary: Review passed / Review with notes / Review failed]
       ```

    6. EVALUATE and AUTO-FIX: Review Results

       COUNT: Total issues found (Critical + Major + Minor)

       IF total issues = 0:
         LOG: "Code Review passed - keine Issues gefunden"
         GOTO: step_997_mark_done

       ELSE (issues found):
         LOG: "Code Review hat {TOTAL} Issues gefunden (Critical: {N}, Major: {N}, Minor: {N}) - starte Auto-Fix"

         <auto_fix>
           ### Auto-Fix: Systematisches Beheben aller Findings

           **WICHTIG:** Findings werden automatisch gefixt ohne User-Abfrage.
           Dies ermöglicht Auto-Mode-Execution (Kanban-Board arbeitet Stories nacheinander ab).
           Nur bei fehlgeschlagenem Fix wird ein Bug-Ticket erstellt.

           COLLECT: All issues from review-report.md
           SORT: By severity (Critical first, then Major, then Minor)
           SET: TOTAL_ISSUES = count of all issues
           SET: FIXED_COUNT = 0
           SET: FAILED_FIXES = []

           FOR EACH issue in sorted_issues:
             SET: CURRENT_ISSUE = issue

             LOG: "Fixing issue {FIXED_COUNT + 1}/{TOTAL_ISSUES}: [{severity}] {description}"

             1. READ: The affected file at the specified location

             2. UNDERSTAND: The issue and the recommended fix from the review

             3. IMPLEMENT: The fix
                - Apply the recommended change
                - Keep the fix minimal and focused
                - Do NOT introduce new issues

             4. VERIFY: The fix resolves the issue
                - Check that the specific problem is addressed
                - Run linter on the affected file if applicable
                ```bash
                # Verify fix (e.g., lint check on affected file)
                ```

             5. IF fix successful:
                UPDATE: Fix Status in review-report.md
                - Change issue status from "pending" to "fixed"
                - Add Fix-Details describing what was changed
                SET: FIXED_COUNT = FIXED_COUNT + 1
                LOG: "Fixed {FIXED_COUNT}/{TOTAL_ISSUES}: [{severity}] {description}"

             6. IF fix failed (cannot resolve, introduces new issues, or lint fails):
                LOG: "Fix failed for [{severity}] {description} - creating bug ticket"
                UPDATE: Fix Status in review-report.md
                - Change issue status from "pending" to "fix-failed"
                - Add Fix-Details: "Auto-Fix fehlgeschlagen - Bug-Ticket erstellt"

                CREATE: Bug ticket via kanban_add_item
                - itemType: "fix"
                - data:
                  - id: "{SPEC_PREFIX}-FIX-{NUMBER}"
                  - title: "Fix: {issue description}"
                  - type: "{affected layer}"
                  - priority: "{severity mapped: Critical->critical, Major->high, Minor->medium}"
                  - effort: 1
                  - status: "ready"
                  - dependencies: []
                  - fixFor: "{SPEC_PREFIX}-997"
                  - errorOutput: "{issue details from review-report}"

                APPEND: issue to FAILED_FIXES list

           END FOR

           LOG: "Auto-Fix complete: {FIXED_COUNT}/{TOTAL_ISSUES} fixed, {len(FAILED_FIXES)} failed"
         </auto_fix>

         <re_review>
           ### Re-Review: Delta-Review der gefixten Dateien

           **Purpose:** Verify fixes didn't introduce new issues

           IF FIXED_COUNT = 0:
             LOG: "No fixes applied - skipping Re-Review"
             GOTO: step_997_update_report

           1. COLLECT: All files that were modified during the Auto-Fix
              ```bash
              git diff --name-only
              ```

           2. FOR EACH modified file:
              READ: Current file content
              ANALYZE: Only the changed sections (Delta-Review)
              CHECK:
              - Fix is correct and complete
              - No new issues introduced
              - Code style still conformant

              IF new issue found:
                RECORD: New issue
                FIX: Immediately (inline fix)
                LOG: "Re-Review: New issue found and fixed in {file}"

           3. RUN: Project-wide checks
              ```bash
              # Run lint
              [LINT_COMMAND]

              # Run tests
              [TEST_COMMAND]
              ```
         </re_review>

         <step_997_update_report>
           ### Update Review Report

           UPDATE: review-report.md

           IF FAILED_FIXES is empty:
             - Update "## Fazit" to: "Review passed (after fixes)"
           ELSE:
             - Update "## Fazit" to: "Review passed (after fixes) - {len(FAILED_FIXES)} Issues als Bug-Tickets erstellt"

           - Update issue counts to reflect fixes
           - Add "## Re-Review" section:
             ```markdown
             ## Re-Review

             **Datum:** [DATE]
             **Geprüfte Dateien:** [N] (nur geänderte)
             **Neue Issues:** [N]
             **Auto-Fix Ergebnis:** {FIXED_COUNT}/{TOTAL_ISSUES} gefixt, {len(FAILED_FIXES)} als Bug-Tickets erstellt
             **Ergebnis:** Review bestanden
             ```

           LOG: "Review Report updated"
           GOTO: step_997_mark_done
         </step_997_update_report>

    <step_997_mark_done>
    7. MARK: story-997 as Done
       UPDATE: kanban.json
       COMMIT: "feat: [story-997] Code Review completed"

    8. PROCEED: To next story (story-998)
    </step_997_mark_done>
  </code_review_execution>

  GOTO: phase_complete
</step>

<step name="execute_system_story_998">
  ### Execute System Story 998: Integration Validation (v4.0)

  **Purpose:** Integration Tests aus spec.md ausführen

  <integration_validation_execution>
    1. UPDATE: kanban.json
       - MOVE: story-998 to "In Progress"
       - UPDATE resumeContext

    2. LOAD: Integration Requirements from spec.md
       READ: specwright/specs/{SELECTED_SPEC}/spec.md
       EXTRACT: "## Integration Requirements" section

    3. CHECK: MCP tools available
       ```bash
       claude mcp list
       ```
       NOTE: Tests requiring unavailable MCP tools will be skipped

    4. DETECT: Integration Type
       | Integration Type | Action |
       |------------------|--------|
       | Backend-only | API + DB integration tests |
       | Frontend-only | Component tests, optional browser |
       | Full-stack | All tests + E2E |
       | Not defined | Basic smoke tests |

    5. RUN: Integration Tests
       FOR EACH test command in Integration Requirements:
         RUN: Test command
         RECORD: Result (PASSED / FAILED / SKIPPED)

    6. VERIFY: Komponenten-Verbindungen
       IF implementation-plan.md has "Komponenten-Verbindungen" section:
         FOR EACH defined connection:
           VERIFY: Connection is active (import + usage exists)

    7. HANDLE: Test Results
       IF all tests PASSED:
         LOG: "Integration validation passed"
         PROCEED: Mark story as Done

       ELSE (some FAILED):
         GENERATE: Integration Fix Report
         ASK user via AskUserQuestion:
         "Integration validation failed. Options:
         1. Fix issues now (Recommended)
         2. Review and manually fix
         3. Skip and continue anyway (NOT RECOMMENDED)"

         IF fix now:
           FIX: Issues
           RE-RUN: Failed tests
         ELSE IF skip:
           WARN: "Proceeding with failed tests"

    8. MARK: story-998 as Done
       UPDATE: kanban.json
       COMMIT: "feat: [story-998] Integration Validation completed"

    9. PROCEED: To next story (story-999)
  </integration_validation_execution>

  GOTO: phase_complete
</step>

<step name="execute_system_story_999">
  ### Execute System Story 999: Finalize PR (v4.1)

  **Purpose:** User-Todos, PR, Worktree Cleanup, **Project Knowledge Update**

  <finalize_pr_execution>
    1. UPDATE: kanban.json
       - MOVE: story-999 to "In Progress"
       - UPDATE resumeContext

    2. FINALIZE: user-todos.md (if exists)
       CHECK: Does user-todos.md exist?
       ```bash
       ls specwright/specs/{SELECTED_SPEC}/user-todos.md 2>/dev/null
       ```

       IF EXISTS:
         - Remove duplicates
         - Verify priority classification
         - Remove unused sections
         - Add summary at top

    3. UPDATE: Project Knowledge (v4.1 - NEW)
       <update_project_knowledge>

         **Purpose:** Extrahiere wiederverwendbare Artefakte aus dieser Spec und füge sie zum Project Knowledge hinzu.

         1. SCAN: All story files for reusable artifacts
            ```
            FOR EACH story file in specwright/specs/{SELECTED_SPEC}/stories/:
              SKIP: System stories (997, 998, 999)

              READ: Story file
              CHECK: "Creates Reusable" field

              IF "Creates Reusable" = "yes":
                EXTRACT: "Reusable Artifacts" table entries
                COLLECT: Artifact name, type, path, description
                LOG: "Found reusable artifact: [name] ([type])"

              ELSE:
                SKIP: Story not knowledge-worthy
            ```

         2. IF no reusable artifacts found:
            LOG: "Keine wiederverwendbaren Artefakte in dieser Spec"
            SKIP: Rest of knowledge update
            PROCEED: To step 5

         3. ENSURE: Knowledge directory exists
            ```bash
            mkdir -p specwright/knowledge
            ```

         4. UPDATE/CREATE: knowledge-index.md
            CHECK: Does specwright/knowledge/knowledge-index.md exist?

            IF NOT exists:
              COPY from template (hybrid lookup):
              1. Local: specwright/templates/knowledge/knowledge-index-template.md
              2. Global: ~/.specwright/templates/knowledge/knowledge-index-template.md

            READ: Current knowledge-index.md

            FOR EACH collected artifact:
              DETERMINE: Category based on artifact type:
              | Artifact Type | Category | Detail File |
              |---------------|----------|-------------|
              | UI Component | UI Components | ui-components.md |
              | API Endpoint | API Contracts | api-contracts.md |
              | Service/Hook/Utility | Shared Services | shared-services.md |
              | Model/Schema/Type | Data Models | data-models.md |

              IF type doesn't match existing categories:
                INFER: New category name from artifact
                CREATE: New category file
                ADD: New row to Categories table in index

              UPDATE: "Einträge" count in matching category row
              UPDATE: "Zuletzt aktualisiert" date
              UPDATE: "Quick Summary" section with new artifact names

         5. UPDATE/CREATE: Detail files
            FOR EACH category with new artifacts:

              CHECK: Does specwright/knowledge/[category].md exist?

              IF NOT exists:
                COPY from template (hybrid lookup):
                1. Local: specwright/templates/knowledge/[category]-template.md
                2. Global: ~/.specwright/templates/knowledge/[category]-template.md

              READ: Current detail file

              FOR EACH artifact in this category:
                ADD to overview table:
                | [Name] | [Path] | [Props/Signature] | [SPEC_NAME] ([DATE]) |

                ADD detail section (following template format):
                - Name, Path, Description
                - Usage example (if available)
                - Reference to spec where created

         6. COMMIT: Knowledge updates
            ```bash
            git add specwright/knowledge/
            git commit -m "docs: Update Project Knowledge from {SELECTED_SPEC}"
            ```

            LOG: "Project Knowledge aktualisiert mit [N] neuen Artefakten"

       </update_project_knowledge>

    4. CREATE: Pull Request
       USE: git-workflow subagent
       "Create PR for spec: {SELECTED_SPEC}

       **WORKING_DIR:** {PROJECT_ROOT} (or {WORKTREE_PATH} if USE_WORKTREE = true)

       - Commit any remaining changes
       - Push all commits
       - Create PR to main branch
       - Include summary of all stories
       - Reference user-todos.md if exists"

       CAPTURE: PR URL

    5. UPDATE: Roadmap (if applicable)
       CHECK: Did this spec complete a roadmap item?
       IF yes: UPDATE specwright/product/roadmap.md

    6. CLEANUP: Worktree (if used)
       CHECK: Resume Context for "Git Strategy" value

       IF "Git Strategy" = "worktree":
         USE: git-workflow subagent
         "Clean up git worktree: {SELECTED_SPEC}
         - Verify PR was created
         - Remove worktree
         - Verify cleanup"

    7. PLAY: Completion sound
       ```bash
       afplay /System/Library/Sounds/Glass.aiff 2>/dev/null || true
       ```

    8. MARK: story-999 as Done
       UPDATE: kanban.json
       - Set resumeContext.currentPhase: complete
       - Set resumeContext.lastAction: PR created - [PR URL]
       COMMIT: "feat: [story-999] PR finalized"

    9. OUTPUT: Final summary to user
       ---
       ## Spec Execution Complete!

       ### What's Been Done
       [List all completed stories]

       ### Pull Request
       [PR URL]

       ### Handover-Dokumentation
       - **User-Todos:** [IF EXISTS: specwright/specs/{SELECTED_SPEC}/user-todos.md]

       ---
       **Spec execution finished. No further phases.**
       ---
  </finalize_pr_execution>

  STOP: Execution complete
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

  VERIFY: Tool returns {"success": true, "story": {...}}
  LOG: "Story {SELECTED_STORY.id} marked as in_progress via MCP tool"

  NOTE: The MCP tool automatically updates:
  - story.status → in_progress, story.phase → implementing
  - story.timing.startedAt, story.model
  - resumeContext.currentStory, currentStoryPhase, lastAction, nextAction
  - boardStatus counters (ready -1, inProgress +1)
  - execution.status → executing, execution.startedAt (if null)
  - Adds changeLog entry

  UPDATE: Story file (specwright/specs/{SELECTED_SPEC}/stories/{STORY_FILE})
    - FIND: Line containing "Status: Ready"
    - REPLACE WITH: "Status: In Progress"
</step>

<step name="load_story">
  ### Story Details Available

  **Story data already loaded via kanban_get_next_task (previous step).**

  AVAILABLE from SELECTED_STORY:
  - Story ID and Title
  - Feature description (SELECTED_STORY.feature)
  - Acceptance Criteria (SELECTED_STORY.scenarios[])
  - Technical Details (SELECTED_STORY.technicalDetails: was, wie, wo)
  - DoD Checklist (SELECTED_STORY.dod[])

  AVAILABLE from INTEGRATION_CONTEXT:
  - Completed stories and their exports
  - New components, services, hooks to reuse

  NOTE: Skills load automatically when you edit files matching their glob patterns.
  No additional file reads needed - all data pre-parsed by MCP tool.
</step>

<step name="implement">
  ### Direct Implementation (v3.0)

  **The main agent implements the story directly.**

  <implementation_process>
    1. READ: Technical requirements from story (WAS, WIE, WO sections)

    2. UNDERSTAND: Architecture guidance from story
       - Which patterns to apply
       - Which constraints to follow
       - Which files to create/modify

    3. IMPLEMENT: The feature
       - Create/modify files as specified in WO section
       - Follow architecture patterns from WIE section
       - Skills load automatically when you edit matching files

    4. RUN: Tests as you implement
       - Unit tests for new code
       - Ensure existing tests pass

    5. VERIFY: Each acceptance criterion
       - Work through each Gherkin scenario
       - Ensure all are satisfied

    **Skills Auto-Loading:**
    When you edit files, relevant skills activate automatically:
    - `src/app/**/*.ts` → frontend skill loads
    - `app/**/*.rb` → backend skill loads
    - `Dockerfile` → devops skill loads

    **File Organization (CRITICAL):**
    - NO files in project root
    - Implementation code: As specified in WO section
    - Reports: specwright/specs/{SELECTED_SPEC}/implementation-reports/
  </implementation_process>

  OUTPUT: Implementation complete, ready for self-review
</step>

<step name="collect_user_todos">
  ### Collect User-Todos (v3.2)

  **DURING or AFTER implementation, identify tasks that require manual user action.**

  <todo_detection>
    REFLECT: Did implementation reveal tasks that cannot be automated?

    **Common Categories:**

    1. **Secrets & Credentials**
       - API keys that need to be obtained
       - OAuth apps that need to be registered
       - Environment variables to set in production

    2. **External Services**
       - Third-party accounts to create
       - Webhooks to configure
       - DNS entries to add

    3. **Infrastructure**
       - Production environment configuration
       - Deployment pipeline updates
       - Database migrations to run manually

    4. **Access & Permissions**
       - Team member access to grant
       - Service account permissions
       - Repository secrets to add

    5. **Documentation & Communication**
       - Users to notify about changes
       - External documentation to update

    6. **Sonstige manuelle Aufgaben**
       - Alles, was nicht in die obigen Kategorien passt
       - z.B. Design-Reviews, Daten-Importe, manuelle Tests auf bestimmten Geräten, Content-Pflege

    IF any manual tasks identified:

      CHECK: Does user-todos.md exist?
      ```bash
      ls specwright/specs/{SELECTED_SPEC}/user-todos.md 2>/dev/null
      ```

      IF NOT exists:
        CREATE: specwright/specs/{SELECTED_SPEC}/user-todos.md

        **TEMPLATE LOOKUP (Hybrid):**
        1. Local: specwright/templates/docs/user-todos-template.md
        2. Global: ~/.specwright/templates/docs/user-todos-template.md
        Use the FIRST one found.

        FILL: [SPEC_NAME], [DATE], [SPEC_PATH]

      APPEND: Each identified todo to appropriate section:

      **Priority Classification:**
      - **Kritisch**: Feature won't work without this
      - **Wichtig**: Required for production
      - **Optional**: Nice to have, recommended

      **Format for each todo:**
      ```markdown
      - [ ] **[Todo Title]**
        - Beschreibung: [What needs to be done]
        - Grund: [Why it must be manual]
        - Hinweis: [Helpful links or instructions]
        - Story: [STORY_ID]
      ```

      LOG: "User-Todo added: [TODO_TITLE]"

    IF no manual tasks:
      SKIP: No user-todos to collect
  </todo_detection>
</step>

<step name="self_review">
  ### Self-Review with DoD Checklist (v3.0)

  Replaces separate Architect/UX/QA review agents.

  <review_process>
    1. READ: DoD checklist from story file

    2. VERIFY each item:

       **Implementation:**
       - [ ] Code implemented and follows style guide
       - [ ] Architecture patterns followed (WIE section)
       - [ ] Security/performance requirements met

       **Quality:**
       - [ ] All acceptance criteria satisfied
       - [ ] Unit tests written and passing
       - [ ] Integration tests written and passing
       - [ ] Linter passes (run lint command)

       **Documentation:**
       - [ ] Code is self-documenting or has necessary comments
       - [ ] No debug code left in

    3. RUN: Verification commands from story
       ```bash
       # Run commands from Completion Check section
       [VERIFY_COMMAND_1]
       [VERIFY_COMMAND_2]
       ```

    4. **INTEGRATION VERIFICATION (v3.3 - KRITISCH):**

       CHECK: Hat diese Story Integration-DoD items?

       IF YES:
         FOR EACH "Integration hergestellt: [Source] → [Target]" item:

           a. VERIFY: Connection code exists
              ```bash
              # Beispiel: Prüfe ob Import existiert
              grep -r "import.*{ServiceName}" src/components/
              ```

           b. VERIFY: Connection is USED (not just imported)
              ```bash
              # Beispiel: Prüfe ob Service aufgerufen wird
              grep -r "serviceName\." src/components/ComponentName/
              ```

           c. RUN: Validierungsbefehl aus Integration-DoD
              ```bash
              [Validierungsbefehl aus Story DoD]
              ```

           IF any verification FAILS:
             FLAG: "❌ Integration NICHT hergestellt: [Source] → [Target]"
             REQUIRE: Fix before proceeding

             **COMMON FIXES:**
             - Import fehlt → Add import statement
             - Import existiert aber nicht verwendet → Add actual usage
             - Stub statt echter Aufruf → Implement real connection

             FIX: Add the missing connection code
             RE-VERIFY: Run checks again

         LOG: "✅ Alle Integrationen verifiziert"

    5. FIX: Any issues found before proceeding

    IF all checks pass:
      PROCEED to self_learning_check
    ELSE:
      FIX issues and re-verify
  </review_process>
</step>

<step name="self_learning_check">
  ### Self-Learning Check (v3.0)

  Update dos-and-donts.md if you learned something during implementation.

  <learning_detection>
    REFLECT: On the implementation process

    DID any of these occur?
    - Initial approach didn't work
    - Had to refactor/retry
    - Discovered unexpected behavior
    - Found a better pattern than first tried
    - Encountered framework quirk

    IF YES:
      1. IDENTIFY: The learning
         - What was the context?
         - What didn't work?
         - What worked?

      2. DETERMINE: Category
         - Technical → dos-and-donts.md in relevant tech skill
         - Domain → domain skill process document

      3. LOCATE: Target file
         - Frontend: .claude/skills/frontend-[framework]/dos-and-donts.md
         - Backend: .claude/skills/backend-[framework]/dos-and-donts.md
         - DevOps: .claude/skills/devops-[stack]/dos-and-donts.md

      4. APPEND: Learning entry
         ```markdown
         ### [DATE] - [Short Title]
         **Context:** [What you were trying to do]
         **Issue:** [What didn't work]
         **Solution:** [What worked]
         ```

      5. ADD to appropriate section:
         - Dos ✅ (positive pattern discovered)
         - Don'ts ❌ (anti-pattern discovered)
         - Gotchas ⚠️ (unexpected behavior)

    IF NO learning:
      SKIP: No update needed
  </learning_detection>
</step>

<step name="domain_update_check">
  ### Domain Update Check (v3.0)

  Keep domain documentation current when business logic changes.

  <domain_check>
    ANALYZE: Did this story change business logic?

    CHECK: Story has Domain field?
    - IF yes: Domain area is specified
    - IF no: Check if changes affect business processes

    IF business logic changed:
      1. LOCATE: Domain skill
         .claude/skills/domain-[project]/

      2. FIND: Relevant process document
         .claude/skills/domain-[project]/[process].md

      3. CHECK: Is description still accurate?
         - Does the process flow still match?
         - Are business rules still correct?
         - Is related code section up to date?

      4. IF outdated:
         UPDATE: The process document
         - Correct any inaccurate descriptions
         - Update process flow if changed
         - Update Related Code section

      5. LOG: "Domain doc updated: [process].md"

    IF no domain skill exists:
      SKIP: No domain documentation to update

    IF no business logic changed:
      SKIP: No domain update needed
  </domain_check>
</step>

<step name="mark_story_done">
  UPDATE: Story file (specwright/specs/{SELECTED_SPEC}/stories/{STORY_FILE})
    - FIND: Line containing "Status: In Progress"
    - REPLACE WITH: "Status: Done"
    - CHECK: All DoD items marked as [x]
</step>

<step name="update_kanban_json_done">
  ### Update Kanban JSON - Story Complete

  GET: Modified files from git
  ```bash
  git diff --name-only HEAD~1
  ```

  GET: Last commit info
  ```bash
  git log -1 --format="%H|%s|%aI"
  ```

  PARSE: Git output into variables
  - modified_files[] array
  - commit_hash, commit_message, commit_timestamp

  CALL MCP TOOL: kanban_complete_story
  Input:
  {
    "specId": "{SELECTED_SPEC}",
    "storyId": "{SELECTED_STORY.id}",
    "filesModified": ["{FILE1}", "{FILE2}", ...],
    "commits": [
      {
        "hash": "{COMMIT_HASH}",
        "message": "{COMMIT_MSG}",
        "timestamp": "{COMMIT_TIME}"
      }
    ]
  }

  VERIFY: Tool returns {"success": true, "story": {...}, "remaining": N}
  LOG: "Story {SELECTED_STORY.id} marked as done via MCP tool. Remaining stories: {remaining}"

  NOTE: The MCP tool automatically updates:
  - story.status → done, story.phase → completed
  - story.timing.completedAt
  - story.implementation.filesModified, commits
  - story.verification.dodChecked → true
  - resumeContext.currentStory → null, progressIndex +1, lastAction, nextAction
  - boardStatus counters (inProgress -1, done +1)
  - statistics (completedEffort, remainingEffort, progressPercent)
  - execution.status → "completed" (if all stories done)
  - Adds changeLog entry
</step>

<step name="story_commit" subagent="git-workflow">
  USE: git-workflow subagent
  "Commit story {SELECTED_STORY.id}:

  **WORKING_DIR:** {PROJECT_ROOT} (or {WORKTREE_PATH} if resumeContext.gitStrategy = worktree)

  - Message: feat/fix: {SELECTED_STORY.id} {SELECTED_STORY.title}
  - Stage all changes including:
    - Implementation files
    - Story file with Status: Done
    - kanban.json
    - integration-context.md updates
    - Any dos-and-donts.md updates
    - Any domain doc updates
  - Push to remote"
</step>

<step name="update_integration_context">
  ### Update Integration Context (v3.1)

  **CRITICAL: Update context for next story session.**

  READ: specwright/specs/{SELECTED_SPEC}/integration-context.md

  UPDATE the file with information from THIS story:

  1. **Completed Stories Table** - ADD new row:
     | [STORY-ID] | [Brief 5-10 word summary] | [Key files/functions created] |

  2. **New Exports & APIs** - ADD any new:

     **Components** (if created):
     - `path/to/Component.tsx` → `<ComponentName prop={value} />`

     **Services** (if created):
     - `path/to/service.ts` → `functionName(params)` - brief description

     **Hooks / Utilities** (if created):
     - `path/to/hook.ts` → `useHookName()` - what it returns

     **Types / Interfaces** (if created):
     - `path/to/types.ts` → `InterfaceName` - what it represents

  3. **Integration Notes** - ADD if relevant:
     - How this story's code connects to existing code
     - Important patterns established
     - Things the next story should know

  4. **File Change Summary Table** - ADD rows for each file:
     | [file path] | Created/Modified | [STORY-ID] |

  **IMPORTANT:**
  - Be concise but informative
  - Focus on EXPORTS that other stories might use
  - Include import paths so next session can use them directly
</step>

## Phase Completion

<phase_complete>
  ### Check Remaining Stories

  READ: specwright/specs/{SELECTED_SPEC}/kanban.json
  COUNT: Stories where status = "ready" OR status = "blocked" (unresolved)

  IF ready stories remain:
    UPDATE: kanban.json
    - resumeContext.currentPhase = "story-complete"
    - resumeContext.nextPhase = "3-execute-story"
    - resumeContext.nextAction = "Execute next story"

    ADD to changeLog[]:
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
    **To continue, run:**
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

    ADD to changeLog[]:
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
    **To continue, run:**
    ```
    /clear
    /execute-tasks
    ```
    ---

    STOP: Do not proceed to System Stories
</phase_complete>

---

## Quick Reference: v5.0 Changes

| v4.1 (MD-Based) | v5.0 (JSON-Based) |
|-----------------|-------------------|
| kanban-board.md | kanban.json |
| MD table parsing | Direct JSON field access |
| Manual status updates | Structured stories[].status |
| No boardStatus sync | Automatic boardStatus counters |
| MD Change Log | JSON changeLog[] array |

**Benefits v5.0:**
- Reliable state tracking (no MD parsing errors)
- Easier resumability (structured JSON)
- Better tooling support (jq, scripts)
- Consistent with backlog.json pattern

## Quick Reference: v4.1 Changes

| v4.0 | v4.1 |
|------|------|
| No knowledge tracking | Project Knowledge Update in story-999 (NEW) |
| Artifacts not persisted | Reusable artifacts added to knowledge-index.md |
| - | Dynamic category creation for new artifact types |
| - | Detail files auto-created from templates |

## Quick Reference: v4.0 Changes

| v3.3 | v4.0 |
|------|------|
| No system story detection | detect_system_story step (NEW) |
| Separate integration phase | story-998 handles integration in Phase 3 |
| Separate finalization phase | story-999 handles finalization in Phase 3 |

## Quick Reference: v3.3 Changes

| v3.2 | v3.3 |
|------|------|
| No pre-check for integrations | verify_integration_requirements (NEW) |
| Code existence = done | Code + active connection = done |
| Integration issues found late | Integration verified per-story |
| "Komponenten gebaut aber nicht verbunden" | Forced connection verification |

## Quick Reference: v3.2 Changes

| v3.1 | v3.2 |
|------|------|
| No todo collection | collect_user_todos (NEW) |
| Manual tasks forgotten | user-todos.md tracks manual tasks |
| - | Priority classification for todos |

## Quick Reference: v3.1 Changes

| v3.0 | v3.1 |
|------|------|
| No cross-session context | load_integration_context (NEW) |
| Context lost after /clear | update_integration_context (NEW) |
| Stories executed in isolation | Stories build on each other |

## Quick Reference: v3.0 Changes

| v2.x (Sub-Agents) | v3.0 (Direct Execution) |
|-------------------|-------------------------|
| extract_skill_paths | Skills auto-load via globs |
| DELEGATE to dev-team__* | Main agent implements |
| architect_review agent | Self-review with DoD |
| ux_review agent | Self-review with DoD |
| qa_testing agent | Self-review with DoD |
| - | self_learning_check (NEW) |
| - | domain_update_check (NEW) |

**Benefits v3.1:**
- Cross-session context preservation
- Proper integration between stories
- No more "orphaned" functions after /clear
- Existing exports are reused, not recreated

**Benefits v3.0:**
- Full context throughout story
- No "lost in translation" between agents
- Better integration (agent sees all changes)
- Self-learning improves over time
- Domain docs stay current
