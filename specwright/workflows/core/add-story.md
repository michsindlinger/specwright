---
description: Add new user story to existing specification
globs:
alwaysApply: false
version: 2.0
encoding: UTF-8
---

# Add Story Workflow

## Overview

Add a new user story to an existing specification. Use this when requirements change or expand during implementation.

**v2.0 Changes (JSON Migration):**
- **BREAKING: JSON statt Markdown Kanban** - kanban.json als Single Source of Truth
- **NEW: Structured Story Data** - Stories werden als JSON-Objekte hinzugefügt
- **NEW: Automatic Statistics** - boardStatus und statistics werden automatisch aktualisiert
- **NEW: Change Log** - Audit Trail für hinzugefügte Stories
- **REMOVED: kanban-board.md Update** - Ersetzt durch kanban.json

**Use Cases:**
- Neue Anforderung während laufender Implementierung
- Feature-Erweiterung einer bestehenden Spec
- Nachträgliche Ergänzung nach User-Feedback

**Key Difference to /add-todo:**
- Story gehört zu einer bestehenden Spec (nicht Backlog)
- Story-ID folgt Spec-Präfix (z.B. PROF-004)
- Kann Abhängigkeiten zu anderen Stories haben
- Wird mit der Spec zusammen ausgeführt

<pre_flight_check>
  EXECUTE: specwright/workflows/meta/pre-flight.md
</pre_flight_check>

<process_flow>

<step number="1" name="spec_selection">

### Step 1: Spec Selection

<mandatory_actions>
  1. CHECK: Was spec name provided as parameter?
     - /add-story [spec-name] "Story description"
     - /add-story "Story description" (will ask for spec)

  2. IF spec name provided:
     VALIDATE: specwright/specs/[spec-name]/ exists
     SET: SELECTED_SPEC = [spec-name]

  3. ELSE (no spec name):
     LIST: Available specs
     ```bash
     ls -1 specwright/specs/ | sort -r
     ```

     ASK via AskUserQuestion:
     "Which specification should this story be added to?

     Options:
     - [Spec 1] - [Brief description from spec-lite.md]
     - [Spec 2] - [Brief description from spec-lite.md]
     - [Spec 3] - [Brief description from spec-lite.md]
     "

  4. LOAD spec context:
     READ: specwright/specs/[SELECTED_SPEC]/spec.md
     READ: specwright/specs/[SELECTED_SPEC]/spec-lite.md
     READ: specwright/specs/[SELECTED_SPEC]/story-index.md

  5. EXTRACT: Spec prefix for story ID
     - Parse from existing stories (e.g., PROF-001 → prefix = PROF)
     - Or derive from spec name

  6. DETERMINE: Next story number
     COUNT: Existing stories in stories/ directory
     NEXT_NUMBER = count + 1 (formatted as 3 digits: 001, 002, etc.)

  7. GENERATE: Story ID = [PREFIX]-[NEXT_NUMBER]
     Example: PROF-004, AUTH-003
</mandatory_actions>

</step>

<step number="2" name="po_requirements_dialog">

### Step 2: PO Phase - Requirements Dialog

Gather fachliche requirements for the new story. Keep it focused since spec context already exists.

<mandatory_actions>
  1. PRESENT spec context to user:
     "Adding story to: [SPEC_NAME]

     **Spec Summary:**
     [Content from spec-lite.md]

     **Existing Stories:**
     [List from story-index.md]
     "

  2. IF user provided story description in command:
     EXTRACT: Story description from input

  3. ASK clarifying questions:

     **Was soll hinzugefügt werden?**
     - Kurze Beschreibung der neuen Anforderung

     **Warum jetzt?**
     - Was hat sich geändert / warum ist das nötig?

     **Wer braucht das?**
     - Welcher User-Typ profitiert davon?

     **Akzeptanzkriterien:**
     - Wann ist die Story fertig? (2-4 Kriterien)

  4. CHECK for dependencies:
     "Hängt diese Story von anderen Stories ab?

     Existing Stories:
     - [STORY-001]: [Title]
     - [STORY-002]: [Title]
     - [STORY-003]: [Title]

     Abhängigkeiten: [None / Story-IDs]"

  5. DETERMINE: Story type
     - Frontend
     - Backend
     - DevOps
     - Test
     - Integration
</mandatory_actions>

</step>

<step number="3" name="create_story_file">

### Step 3: Create Story File

<mandatory_actions>
  1. GENERATE: File name
     FORMAT: story-[NUMBER]-[slug].md
     Example: story-004-bulk-export.md

  2. USE: story-template.md (hybrid lookup)

     <template_lookup>
       PATH: story-template.md

       LOOKUP STRATEGY (MUST TRY BOTH):
         1. READ: specwright/templates/docs/story-template.md
         2. IF file not found OR read error:
            READ: ~/.specwright/templates/docs/story-template.md
         3. IF both fail: Error - run setup-devteam-global.sh

       ⚠️ WICHTIG: Bei "Error reading file" IMMER den Fallback-Pfad versuchen!
     </template_lookup>

  3. FILL fachliche content (PO perspective):
     - Story ID: [PREFIX]-[NUMBER]
     - Spec: [SELECTED_SPEC]
     - Story Title
     - Als [User] möchte ich [Aktion], damit [Nutzen]
     - Fachliche acceptance criteria (2-5 items)
     - Priority: Based on urgency
     - Type: Frontend/Backend/etc.
     - Dependencies: From Step 2

  4. LEAVE technical sections EMPTY:
     - DoR/DoD checkboxes (unchecked)
     - WAS/WIE/WO/WER fields
     - Completion Check commands

  5. WRITE: Story file to specwright/specs/[SELECTED_SPEC]/stories/
</mandatory_actions>

</step>

<step number="4" name="architect_refinement">

### Step 4: Architect Phase - Technical Refinement (v3.0)

Main agent does technical refinement guided by architect-refinement skill.

<refinement_process>
  LOAD skill: .claude/skills/architect-refinement/SKILL.md
  (This skill provides guidance for technical refinement)

  **Story Context:**
  - New Story: specwright/specs/[SELECTED_SPEC]/stories/story-[NUMBER]-[slug].md
  - Spec: specwright/specs/[SELECTED_SPEC]/spec.md
  - Existing Stories: specwright/specs/[SELECTED_SPEC]/stories/
  - Tech Stack: specwright/product/tech-stack.md
  - Architecture: Try both locations:
    1. specwright/product/architecture-decision.md
    2. specwright/product/architecture/platform-architecture.md

  **Tasks:**
  1. READ the new story file
  2. READ existing stories to understand context and patterns
  3. CHECK for consistency with existing stories

  4. FILL technical sections (guided by architect-refinement skill):

     **DoR (Definition of Ready):**
     - Mark ALL checkboxes as [x] when complete
     - Ensure consistency with spec's other stories

     **DoD (Definition of Done):**
     - Define completion criteria (start unchecked [ ])
     - Align with spec's DoD patterns

     **Technical Details:**
     - WAS: Components to create/modify (no code)
     - WIE: Architecture guidance (patterns, constraints)
     - WO: File paths (consistent with spec)
     - Domain: Optional domain area reference
     - Abhängigkeiten: Story IDs this depends on
     - Geschätzte Komplexität: XS/S/M

     **Completion Check:**
     - Add bash verify commands

  5. VALIDATE dependencies:
     - If story depends on other stories, verify those exist
     - If other stories should depend on THIS story, note that

  6. IF story seems too large or doesn't fit spec:
     WARN: 'This story may not fit this spec. Consider:'
     - Split into multiple stories
     - Create separate spec
     ASK: 'Proceed, split, or create new spec?'

  **IMPORTANT:**
  - NO "WER" field in v3.0 (main agent implements directly)
  - Follow patterns from architect-refinement skill
  - Follow patterns established in existing stories
  - Keep story appropriately sized (max 5 files, 400 LOC)
  - Mark ALL DoR checkboxes as [x] when ready
</refinement_process>

</step>

<step number="5" name="update_story_index">

### Step 5: Update Story Index

<mandatory_actions>
  1. READ: specwright/specs/[SELECTED_SPEC]/story-index.md

  2. ADD new story to Story Summary table:
     | Story ID | Title | Type | Priority | Dependencies | Status | Points |

  3. UPDATE Dependency Graph:
     - Add new story
     - Show dependencies (if any)

  4. UPDATE Execution Plan:
     - If no dependencies: Add to parallel execution
     - If has dependencies: Add to sequential execution

  5. UPDATE Story Files list

  6. UPDATE totals:
     - Total Stories: +1
     - Estimated Effort: +[points]

  7. UPDATE: Last Updated date

  8. WRITE: Updated story-index.md
</mandatory_actions>

</step>

<step number="6" name="update_kanban_json">

### Step 6: Add Story to Kanban via MCP Tool

<mandatory_actions>
  1. CHECK: Does kanban.json exist?
     ```bash
     ls specwright/specs/[SELECTED_SPEC]/kanban.json 2>/dev/null
     ```

  2. IF kanban.json EXISTS:

     EXTRACT from created story file:
     - Story ID: [STORY_ID]
     - Title: [STORY_TITLE]
     - Type: [TYPE]
     - Priority: [PRIORITY]
     - Effort: [EFFORT_POINTS] (as number)
     - Dependencies: [DEPENDENCY_IDS]
     - Complexity: [XS/S/M]

     CALL MCP TOOL: kanban_add_item
     Input:
     {
       "specId": "[SELECTED_SPEC]",
       "itemType": "story",
       "data": {
         "id": "[STORY_ID]",
         "title": "[STORY_TITLE]",
         "type": "[TYPE]",
         "priority": "[PRIORITY]",
         "effort": [EFFORT_NUMBER],
         "status": "ready",
         "dependencies": [DEPENDENCY_IDS]
       }
     }

     VERIFY: Tool returns {
       "success": true,
       "item": { "id": "...", "file": "stories/story-NNN-slug.md" },
       "newTotal": N
     }

     LOG: "Story {STORY_ID} added to kanban via MCP tool. Total stories: {newTotal}"

     NOTE: The MCP tool automatically:
     - Validates story ID is unique
     - Validates dependencies exist
     - Reads the story .md file we created in Step 3
     - Adds story to kanban.stories[]
     - Updates boardStatus (total +1, ready +1)
     - Recalculates statistics
     - Adds changeLog entry
     - All atomic with file lock (no corruption risk)

  ELSE (no kanban.json):
     NOTE to user:
       "No kanban.json found. Story added to stories/ directory.
        Run /execute-tasks [SPEC] to create kanban and execute."
</mandatory_actions>

</step>

<step number="7" name="completion_summary">

### Step 7: Story Added Confirmation

<summary_template>
  ✅ Story added to specification!

  **Story ID:** [PREFIX]-[NUMBER]
  **Spec:** [SELECTED_SPEC]
  **File:** specwright/specs/[SELECTED_SPEC]/stories/story-[NUMBER]-[slug].md

  **Summary:**
  - Title: [Story Title]
  - Type: [Frontend/Backend/etc.]
  - Complexity: [XS/S/M]
  - Dependencies: [None / Story-IDs]
  - Status: Ready

  **Spec Status:**
  - Total stories: [N]
  - New story: #[NUMBER]
  - [IF kanban exists]: Added to Backlog

  **Next Steps:**
  1. Add more stories: /add-story [spec-name] "[description]"
  2. Execute spec: /execute-tasks [spec-name]
  3. View spec: specwright/specs/[SELECTED_SPEC]/story-index.md
</summary_template>

</step>

<step number="8" name="auto_git_commit">

### Step 8: Auto Git Commit

Automatically commit all story files so the working tree is clean before execution.

<mandatory_actions>
  1. DELEGATE to git-workflow via Task tool (model="haiku"):

     PROMPT:
     """
     Create a git commit for the newly added story files.

     1. Stage all new/modified files:
        ```bash
        git add specwright/specs/[SELECTED_SPEC]/
        ```

     2. Create commit:
        ```bash
        git commit -m "story: add [STORY_ID] to [SPEC_NAME]"
        ```

        Where [STORY_ID] is the story ID (e.g., "PROF-004") and
        [SPEC_NAME] is the spec folder name (e.g., "2026-02-17-user-profiles").

     3. Do NOT push to remote.
     """

  2. VERIFY: Commit was successful (exit code 0)

  3. IF commit fails:
     WARN user: "Auto-Commit fehlgeschlagen. Bitte manuell committen."
     SHOW: git status output
     CONTINUE: Do not block workflow completion
</mandatory_actions>

<instructions>
  ACTION: Automatically commit story files after creation
  FORMAT: story: add [story-id] to [spec-name]
  PUSH: Never push automatically
  FAIL: Warn but do not block on commit failure
</instructions>

</step>

</process_flow>

## Final Checklist

<verify>
  - [ ] Spec selected and validated
  - [ ] Story description gathered
  - [ ] Dependencies identified
  - [ ] Story file created in stories/ directory
  - [ ] Story ID follows spec prefix
  - [ ] Technical refinement complete
  - [ ] All DoR checkboxes marked [x]
  - [ ] Story-index.md updated
  - [ ] **kanban.json updated with new story object** (v2.0)
  - [ ] **boardStatus and statistics recalculated** (v2.0)
  - [ ] **changeLog entry added** (v2.0)
  - [ ] **Auto Git Commit erstellt (Step 8)** - Clean working tree
  - [ ] Ready for /execute-tasks
</verify>

## When NOT to Use /add-story

Consider alternatives when:
- Story doesn't fit the spec's scope → Create new spec
- Story is independent of spec → Use /add-todo
- Story is a bug → Use /add-bug
- Multiple new stories needed → May need spec revision
- Story changes spec's core purpose → Discuss with user first
