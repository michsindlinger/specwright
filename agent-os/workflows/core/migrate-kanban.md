---
description: Migrate existing Markdown kanban boards to JSON format
globs:
alwaysApply: false
version: 1.0
encoding: UTF-8
---

# Migrate Kanban Workflow

## Overview

Migrate existing Markdown-based kanban boards (`kanban-board.md`, `story-index.md`) to the new JSON format (`kanban.json`, `backlog.json`).

**Use Cases:**
- Upgrade existing specs to JSON kanban
- Migrate backlog from story-index.md to backlog.json
- Batch migration of all specs in a project

**Benefits of Migration:**
- No more Markdown table parsing errors
- Reliable status updates
- Better resume/recovery after /clear
- Machine-readable format

<process_flow>

<step number="1" name="mode_detection">

### Step 1: Migration Mode Detection

<mandatory_actions>
  1. CHECK: Was a parameter provided?

     IF parameter = "backlog":
       SET: MIGRATION_MODE = "backlog"
       GOTO: Step 2 (Backlog Migration)

     ELSE IF parameter = [spec-name]:
       SET: MIGRATION_MODE = "single-spec"
       SET: SELECTED_SPEC = [spec-name]
       VALIDATE: Spec exists
       GOTO: Step 3 (Spec Migration)

     ELSE (no parameter):
       SET: MIGRATION_MODE = "auto-detect"
       GOTO: Auto-Detection

  2. AUTO-DETECTION:
     ```bash
     # Find specs with old kanban-board.md but no kanban.json
     SPECS_TO_MIGRATE=$(for spec in agent-os/specs/*/; do
       if [[ -f "${spec}kanban-board.md" ]] && [[ ! -f "${spec}kanban.json" ]]; then
         basename "$spec"
       fi
     done)

     # Check backlog
     BACKLOG_NEEDS_MIGRATION=false
     if [[ -f "agent-os/backlog/story-index.md" ]] && [[ ! -f "agent-os/backlog/backlog.json" ]]; then
       BACKLOG_NEEDS_MIGRATION=true
     fi
     ```

  3. PRESENT migration candidates to user:

     IF no migrations needed:
       INFORM: "All kanbans are already using JSON format. Nothing to migrate."
       STOP

     ELSE:
       ASK via AskUserQuestion:
       "Found items to migrate. What would you like to do?

       Options:
       1. Migrate All ([N] specs + backlog)
       2. Migrate Backlog Only
       3. Select Specific Spec
       4. Cancel"

       BASED ON choice:
         - "Migrate All" → Migrate backlog first, then all specs
         - "Migrate Backlog Only" → Step 2
         - "Select Specific Spec" → Ask which spec, then Step 3
         - "Cancel" → STOP
</mandatory_actions>

</step>

<step number="2" name="backlog_migration">

### Step 2: Backlog Migration

Migrate from `story-index.md` + individual story files to `backlog.json`.

<mandatory_actions>
  1. CHECK: Does agent-os/backlog/ exist?
     IF NOT: SKIP backlog migration

  2. CREATE directory structure:
     ```bash
     mkdir -p agent-os/backlog/stories
     mkdir -p agent-os/backlog/executions
     ```

  3. SCAN for existing story files:
     ```bash
     # Find all story files
     BUG_FILES=$(ls agent-os/backlog/bug-*.md 2>/dev/null)
     TODO_FILES=$(ls agent-os/backlog/user-story-*.md 2>/dev/null)
     ```

  4. FOR EACH story file found:
     READ: Story file content
     EXTRACT:
       - ID from filename (e.g., "2026-01-15-001" from "bug-2026-01-15-001-title.md")
       - Title from first heading
       - Type from filename prefix (bug- or user-story-)
       - Priority from "Priority:" field
       - Status from "Status:" field (default: "ready")
       - Category/Type from "Type:" field

     CREATE item object:
     ```json
     {
       "id": "[EXTRACTED_ID]",
       "type": "[bug/todo]",
       "title": "[EXTRACTED_TITLE]",
       "slug": "[GENERATED_SLUG]",
       "priority": "[EXTRACTED_PRIORITY]",
       "severity": "[FOR_BUGS_ONLY]",
       "effort": [EXTRACTED_OR_DEFAULT_2],
       "status": "[EXTRACTED_STATUS]",
       "category": "[EXTRACTED_CATEGORY]",
       "storyFile": "stories/[ORIGINAL_FILENAME]",
       "rootCause": "[FOR_BUGS_ONLY]",
       "createdAt": "[FROM_FILE_OR_NOW]",
       "updatedAt": "[NOW]",
       "executedIn": null,
       "completedAt": null
     }
     ```

     MOVE: Story file to stories/ subdirectory
     ```bash
     mv agent-os/backlog/bug-*.md agent-os/backlog/stories/ 2>/dev/null
     mv agent-os/backlog/user-story-*.md agent-os/backlog/stories/ 2>/dev/null
     ```

  5. BUILD backlog.json:

     LOAD template: agent-os/templates/json/backlog-template.json
     (Use hybrid lookup: local → global)

     FILL:
       - metadata.created = earliest story creation date
       - metadata.lastUpdated = now
       - items = array of extracted items
       - statistics = calculated from items

     CALCULATE statistics:
       - total = items.length
       - byStatus = count per status
       - byType = count bug vs todo
       - byCategory = count per category
       - totalEffort = sum of effort
       - completedEffort = sum where status = done

     ADD changeLog entry:
     ```json
     {
       "timestamp": "[NOW]",
       "action": "item_added",
       "itemId": null,
       "details": "Migrated from story-index.md: [N] bugs, [M] todos"
     }
     ```

  6. WRITE: agent-os/backlog/backlog.json

  7. BACKUP old file:
     ```bash
     mv agent-os/backlog/story-index.md agent-os/backlog/story-index.md.bak
     ```

  8. VERIFY:
     ```bash
     cat agent-os/backlog/backlog.json | python3 -m json.tool > /dev/null && echo "Valid JSON"
     ```

  9. REPORT:
     ```
     ✅ Backlog Migration Complete

     **Migrated:**
     - Bugs: [N]
     - Todos: [M]
     - Total Items: [N+M]

     **Files:**
     - Created: agent-os/backlog/backlog.json
     - Moved: [N+M] story files to stories/
     - Backup: story-index.md → story-index.md.bak

     **Next:** Use /add-bug or /add-todo to add new items (now writes to JSON)
     ```
</mandatory_actions>

</step>

<step number="3" name="spec_migration">

### Step 3: Spec Kanban Migration

Migrate from `kanban-board.md` to `kanban.json`.

<mandatory_actions>
  1. READ: agent-os/specs/[SELECTED_SPEC]/kanban-board.md

  2. PARSE Markdown content:

     EXTRACT from Resume Context table:
       - Current Phase
       - Next Phase
       - Worktree Path
       - Git Branch
       - Current Story
       - Last Action
       - Next Action

     EXTRACT from Board Status table:
       - Total Stories
       - Completed count
       - In Progress count
       - etc.

     EXTRACT Stories from each section:
       - ## Backlog
       - ## In Progress
       - ## In Review
       - ## Testing
       - ## Done
       - ## Blocked

     FOR EACH story row in tables:
       PARSE: | Story ID | Title | Type | Dependencies | DoR Status | Points |
       MAP to status based on which section it's in

  3. READ spec metadata:
     - spec.md for spec name
     - Derive prefix from existing story IDs (e.g., "WSD" from "WSD-001")

  4. BUILD kanban.json:

     LOAD template: agent-os/templates/json/spec-kanban-template.json

     FILL spec section:
     ```json
     {
       "id": "[SPEC_FOLDER_NAME]",
       "name": "[FROM_SPEC.MD]",
       "prefix": "[DERIVED_PREFIX]",
       "specFile": "spec.md",
       "specLiteFile": "spec-lite.md",
       "createdAt": "[FROM_KANBAN_OR_NOW]"
     }
     ```

     FILL resumeContext:
     ```json
     {
       "currentPhase": "[MAPPED_FROM_MD]",
       "nextPhase": "[MAPPED_FROM_MD]",
       "worktreePath": "[FROM_MD_OR_NULL]",
       "gitBranch": "[FROM_MD_OR_NULL]",
       "currentStory": "[FROM_MD_OR_NULL]",
       "currentStoryPhase": null,
       "lastAction": "[FROM_MD]",
       "nextAction": "[FROM_MD]",
       "progressIndex": [CALCULATED],
       "totalStories": [COUNT]
     }
     ```

     FILL stories array:
     FOR EACH parsed story:
       CREATE story object with all fields
       MAP status from section name:
         - Backlog → "ready"
         - In Progress → "in_progress"
         - In Review → "in_review"
         - Testing → "testing"
         - Done → "done"
         - Blocked → "blocked"

     CALCULATE statistics and boardStatus

     ADD changeLog entry:
     ```json
     {
       "timestamp": "[NOW]",
       "action": "kanban_created",
       "storyId": null,
       "details": "Migrated from kanban-board.md"
     }
     ```

  5. WRITE: agent-os/specs/[SELECTED_SPEC]/kanban.json

  6. BACKUP old file:
     ```bash
     mv agent-os/specs/[SELECTED_SPEC]/kanban-board.md \
        agent-os/specs/[SELECTED_SPEC]/kanban-board.md.bak
     ```

  7. VERIFY:
     ```bash
     cat agent-os/specs/[SELECTED_SPEC]/kanban.json | python3 -m json.tool > /dev/null
     ```

  8. REPORT:
     ```
     ✅ Spec Migration Complete: [SPEC_NAME]

     **Migrated:**
     - Stories: [N]
     - Status preserved: [ready: X, in_progress: Y, done: Z]

     **Files:**
     - Created: kanban.json
     - Backup: kanban-board.md → kanban-board.md.bak

     **Next:** Use /execute-tasks [spec] to continue execution (now uses JSON)
     ```
</mandatory_actions>

</step>

<step number="4" name="batch_migration">

### Step 4: Batch Migration (if "Migrate All" selected)

<mandatory_actions>
  1. MIGRATE backlog first (if needed):
     EXECUTE: Step 2

  2. FOR EACH spec needing migration:
     SET: SELECTED_SPEC = spec name
     EXECUTE: Step 3

  3. FINAL REPORT:
     ```
     ✅ Batch Migration Complete

     **Summary:**
     - Backlog: [Migrated/Skipped]
     - Specs Migrated: [N]
       - [spec-1]: ✅
       - [spec-2]: ✅
       - ...

     **Total Items Migrated:**
     - Backlog Items: [N]
     - Spec Stories: [M]

     **Backup Files Created:**
     - agent-os/backlog/story-index.md.bak
     - agent-os/specs/[spec-1]/kanban-board.md.bak
     - ...

     **Next Steps:**
     1. Verify migrations: Check JSON files
     2. Test: Run /execute-tasks to verify
     3. Cleanup: Delete .bak files when confident
     ```
</mandatory_actions>

</step>

</process_flow>

## Phase Mapping Reference

| MD Phase | JSON currentPhase |
|----------|-------------------|
| "1-complete" | "2-worktree-setup" |
| "2-complete" | "3-story-execution" |
| "story-complete" | "3-story-execution" |
| "all-stories-done" | "5-completion" |
| "5-ready" | "5-completion" |
| "complete" | "6-cleanup" |

## Rollback

If migration fails or causes issues:

```bash
# Restore backlog
mv agent-os/backlog/story-index.md.bak agent-os/backlog/story-index.md
rm agent-os/backlog/backlog.json

# Restore spec
mv agent-os/specs/[spec]/kanban-board.md.bak agent-os/specs/[spec]/kanban-board.md
rm agent-os/specs/[spec]/kanban.json
```

## Final Checklist

<verify>
  - [ ] All target kanbans identified
  - [ ] Backlog migration complete (if applicable)
  - [ ] All spec migrations complete
  - [ ] JSON files are valid
  - [ ] Backup files created
  - [ ] Story files moved to correct locations
  - [ ] Statistics calculated correctly
</verify>
