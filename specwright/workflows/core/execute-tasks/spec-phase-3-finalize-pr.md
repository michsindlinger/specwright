---
description: Spec Phase 3 — System Story 999 (Finalize PR + Project Knowledge Update)
version: 1.0
---

# System Story 999: Finalize PR

**Purpose:** User-Todos, Project Knowledge Update, PR creation, Worktree cleanup.

<finalize_pr_execution>
  1. UPDATE: kanban.json
     - MOVE: story-999 to "In Progress"
     - UPDATE resumeContext

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

  8. MARK: story-999 as Done
     UPDATE: kanban.json
     - resumeContext.currentPhase: complete
     - resumeContext.lastAction: PR created - [PR URL]

     STAGE + COMMIT (final sweep — captures all spec housekeeping that
     accumulated after previous story commits: the just-updated kanban.json,
     story-xxx.md status markers written post-commit, integration-context.md
     additions, and any residual markdown from non-committing stories):
     ```bash
     git add specwright/specs/{SELECTED_SPEC}/ 2>/dev/null || true
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
