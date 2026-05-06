---
description: Spec Phase 3 — System Story 999 (Finalize PR + Project Knowledge Update)
version: 1.1
---

# System Story 999: Finalize PR

**Purpose:** User-Todos, Project Knowledge Update, PR creation, Worktree cleanup.

> **MCP routing note:** kanban.json is a *mutable* file and lives in the main
> project (never copied into worktrees). All reads/writes MUST go through the
> kanban MCP server, which routes to `SPECWRIGHT_MAIN_PROJECT_PATH` when the
> CWD is a worktree. Never `ls`/`READ`/`WRITE`/`git add` kanban.json directly.

<finalize_pr_execution>
  1. CALL MCP TOOL: kanban_start_story
     Input: { specId: "{SELECTED_SPEC}", storyId: "{STORY-999-ID}", model: "{CURRENT_MODEL_ID}" }
     VERIFY: Returns {"success": true}

     The tool atomically updates story.status, story.phase, timing.startedAt,
     model, resumeContext, boardStatus counters, execution.status, changeLog.

  2. FINALIZE: user-todos.md (if exists)
     ```bash
     ls specwright/specs/{SELECTED_SPEC}/user-todos.md 2>/dev/null
     ```
     IF EXISTS:
       - Remove duplicates
       - Verify priority classification
       - Remove unused sections
       - Add summary at top

  3. UPDATE: Project Knowledge
     <update_project_knowledge>

       **Purpose:** Extract reusable artifacts from this spec into Project Knowledge.

       1. SCAN: All story files for reusable artifacts
          FOR EACH story file in specwright/specs/{SELECTED_SPEC}/stories/:
            SKIP: System stories (997, 998, 999)
            READ: Story file
            CHECK: "Creates Reusable" field
            IF "Creates Reusable" = "yes":
              EXTRACT: "Reusable Artifacts" table entries
              COLLECT: name, type, path, description

       2. IF no reusable artifacts:
          LOG: "Keine wiederverwendbaren Artefakte"
          SKIP to step 5

       3. ENSURE: `mkdir -p specwright/knowledge`

       4. UPDATE/CREATE: knowledge-index.md
          IF NOT exists: COPY from template (hybrid: project → global)
            - specwright/templates/knowledge/knowledge-index-template.md
            - ~/.specwright/templates/knowledge/knowledge-index-template.md

          FOR EACH artifact:
            Category by type:
            | Artifact Type | Category | Detail File |
            |---|---|---|
            | UI Component | UI Components | ui-components.md |
            | API Endpoint | API Contracts | api-contracts.md |
            | Service/Hook/Utility | Shared Services | shared-services.md |
            | Model/Schema/Type | Data Models | data-models.md |

            IF type has no matching category: CREATE new category file + row
            UPDATE: "Einträge" count, "Zuletzt aktualisiert", "Quick Summary"

       5. UPDATE/CREATE: Detail files per category
          IF NOT exists: COPY from template (hybrid lookup)
          FOR EACH artifact in this category:
            ADD to overview table: `| [Name] | [Path] | [Props/Signature] | [SPEC_NAME] ([DATE]) |`
            ADD detail section (name, path, description, usage, spec reference)

       6. COMMIT: Knowledge updates
          ```bash
          git add specwright/knowledge/
          git commit -m "docs: Update Project Knowledge from {SELECTED_SPEC}"
          ```
          LOG: "Project Knowledge updated with [N] new artifacts"

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
     IF this spec completed a roadmap item: UPDATE specwright/product/roadmap.md

  6. CLEANUP: Worktree (if used)
     IF resumeContext.gitStrategy = "worktree":
       USE: git-workflow subagent
       "Clean up git worktree: {SELECTED_SPEC}
        - Verify PR was created
        - Remove worktree
        - Verify cleanup"

  7. PLAY: Completion sound
     ```bash
     afplay /System/Library/Sounds/Glass.aiff 2>/dev/null || true
     ```

  8. CALL MCP TOOL: kanban_complete_story
     Input:
     {
       "specId": "{SELECTED_SPEC}",
       "storyId": "{STORY-999-ID}",
       "filesModified": [...],
       "commits": [...]
     }
     VERIFY: Returns {"success": true, "remaining": N}

     NOTE: when remaining=0, the tool itself sets currentPhase="complete"
     + execution.status="completed" — no follow-up phase update for that
     transition is needed.

  8b. CALL MCP TOOL: kanban_update_phase
      Input:
      {
        "specId": "{SELECTED_SPEC}",
        "currentPhase": "complete",
        "lastAction": "PR created - {PR_URL}"
      }
      (idempotent overwrite of lastAction with the PR URL)

     NOTE: kanban.json is committed main-side by the auto-mode orchestrator
     after each story-complete event — never `git add` it from the worktree.

     STAGE + COMMIT (worktree-side final sweep — story-xxx.md status
     markers, integration-context.md additions, user-todos.md, residual
     markdown from non-committing stories):
     ```bash
     git add specwright/specs/{SELECTED_SPEC}/stories/ \
             specwright/specs/{SELECTED_SPEC}/integration-context.md \
             specwright/specs/{SELECTED_SPEC}/user-todos.md 2>/dev/null || true
     git diff --cached --quiet || git commit -m "feat: [story-999] PR finalized"
     ```

  9. OUTPUT: Final summary
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
