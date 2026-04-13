---
description: Add quick task to backlog with lightweight PO + Architect refinement
globs:
alwaysApply: false
version: 2.1
encoding: UTF-8
---

# Add Todo Workflow

## Overview

Add a lightweight task to the backlog without full spec creation. Uses same story template as create-spec but with minimal overhead.

**v2.1 Changes (Gradient Scoring):**
- **ENHANCED: Step 4.5** - Replaces binary pass/fail validation with Gradient Scoring (like /add-bug)
- **NEW: Complexity Score** - Multi-factor scoring: files, layers, complexity, integration points, dependencies
- **NEW: 3-tier decision** - SIMPLE (proceed), MODERATE (advisory with S-Spec option), COMPLEX (strong /create-spec recommendation)
- **NEW: S-Spec option** - Moderate tasks can choose S-Spec as middle ground between /add-todo and full /create-spec

**v2.0 Changes (JSON Migration):**
- **BREAKING: JSON statt Markdown** - backlog.json als Single Source of Truth
- **NEW: Structured Data** - Items werden als JSON-Objekte gespeichert
- **NEW: Statistics** - Automatische Berechnung von Backlog-Statistiken
- **NEW: Change Log** - Audit Trail für alle Änderungen
- **REMOVED: story-index.md** - Ersetzt durch backlog.json

**Use Cases:**
- Small UI tweaks (e.g., "Add loading state to modal")
- Minor bug fixes
- Quick enhancements
- Tasks that don't warrant full specification

<pre_flight_check>
  EXECUTE: specwright/workflows/meta/pre-flight.md
</pre_flight_check>

<process_flow>

<step number="1" name="backlog_setup">

### Step 1: Backlog Setup (JSON)

<mandatory_actions>
  1. CHECK: Does specwright/backlog/ directory exist?
     ```bash
     ls -la specwright/backlog/ 2>/dev/null
     ```

  2. IF directory NOT exists:
     CREATE: specwright/backlog/ directory
     CREATE: specwright/backlog/stories/ subdirectory

  3. CHECK: Does specwright/backlog/backlog.json exist?

     IF NOT exists:
       CREATE: specwright/backlog/backlog.json (from template)

       <template_lookup>
         PATH: backlog-template.json

         LOOKUP STRATEGY (MUST TRY BOTH):
           1. READ: specwright/templates/json/backlog-template.json
           2. IF file not found OR read error:
              READ: ~/.specwright/templates/json/backlog-template.json
           3. IF both fail: Error - run setup-devteam-global.sh

         ⚠️ WICHTIG: Bei "Error reading file" IMMER den Fallback-Pfad versuchen!
       </template_lookup>

       REPLACE placeholders:
         - {{CREATED_AT}} → Current ISO 8601 timestamp

     ELSE:
       READ: specwright/backlog/backlog.json
       PARSE: JSON content

  4. USE: date-checker to get current date (YYYY-MM-DD)

  5. DETERMINE: Next todo index for today
     FROM backlog.json:
       FILTER: items where id starts with today's date AND type = "todo"
       COUNT: Number of matching items
     NEXT_INDEX = count + 1 (formatted as 3 digits: 001, 002, etc.)

  6. GENERATE: Todo ID = YYYY-MM-DD-[INDEX]
     Example: 2025-01-15-001, 2025-01-15-002

  7. GENERATE: Slug from todo title
     TRANSFORM: lowercase, replace spaces with hyphens, remove special chars
     Example: "Loading State Modal" → "loading-state-modal"
</mandatory_actions>

</step>

<step number="2" name="po_quick_dialog">

### Step 2: PO Phase - Quick Requirements Dialog

⚠️ **LIGHTWEIGHT:** Unlike create-spec, this is a brief dialog (2-4 questions max).

<mandatory_actions>
  1. IF user provided task description in command:
     EXTRACT: Task description from input

  2. ASK quick clarifying questions (only if needed):
     - What exactly should be done? (if unclear)
     - Where in the app? (which component/page)
     - Any special acceptance criteria?

  3. DETERMINE: Story type
     - Frontend (UI changes)
     - Backend (API/Logic changes)
     - DevOps (Infrastructure)
     - Test (Test additions)

  4. KEEP IT BRIEF:
     - No extensive requirements gathering
     - No clarification document
     - Direct to story creation
</mandatory_actions>

</step>

<step number="3" name="create_story_file">

### Step 3: Create User Story File

<mandatory_actions>
  1. GENERATE: File name
     FORMAT: user-story-[YYYY-MM-DD]-[INDEX]-[slug].md
     Example: user-story-2025-01-15-001-loading-state-modal.md

  2. USE: story-template.md (same as create-spec)

     <template_lookup>
       PATH: story-template.md

       LOOKUP STRATEGY (MUST TRY BOTH):
         1. READ: specwright/templates/docs/story-template.md
         2. IF file not found OR read error:
            READ: ~/.specwright/templates/docs/story-template.md
         3. IF both fail: Error - run setup-devteam-global.sh

       ⚠️ WICHTIG: Bei "Error reading file" IMMER den Fallback-Pfad versuchen!
     </template_lookup>

  3. FILL fachliche content im **GHERKIN-STYLE** (PO perspective):

     **Feature-Block:**
     ```gherkin
     Feature: [Feature-Name]
       Als [User-Rolle]
       möchte ich [Aktion],
       damit [Nutzen].
     ```

     **Akzeptanzkriterien als Gherkin-Szenarien (2-3 für Todos):**
     ```gherkin
     Scenario: [Hauptszenario - Happy Path]
       Given [Ausgangssituation]
       When [Nutzeraktion]
       Then [Erwartetes Ergebnis]

     Scenario: [Edge-Case oder Fehlerfall]
       Given [Fehler-Ausgangssituation]
       When [Aktion]
       Then [Erwartete Fehlerbehandlung]
     ```

     **Gherkin Best Practices (auch für kleine Todos):**
     - Ein Verhalten pro Szenario
     - Konkrete Werte ("Laden-Animation" nicht "eine Animation")
     - Nutzer-Perspektive, keine technischen Details
     - Kurz und prägnant (2-3 Szenarien reichen für Todos)

     **Beispiel für Todo "Loading State in Modal":**
     ```gherkin
     Feature: Loading State im Modal
       Als Benutzer
       möchte ich einen Ladezustand sehen wenn Daten geladen werden,
       damit ich weiß dass die Anwendung arbeitet.

     Scenario: Ladezustand wird angezeigt während Daten laden
       Given ich öffne das Modal
       When die Daten noch geladen werden
       Then sehe ich eine Lade-Animation
       And die Interaktions-Buttons sind deaktiviert

     Scenario: Ladezustand verschwindet nach erfolgreichem Laden
       Given das Modal zeigt den Ladezustand
       When die Daten erfolgreich geladen wurden
       Then verschwindet die Lade-Animation
       And ich sehe die geladenen Daten
     ```

     - Priority: Low/Medium/High
     - Type: Frontend/Backend/DevOps/Test

  4. LEAVE technical sections EMPTY (Architect fills in Step 4):
     - DoR/DoD checkboxes (unchecked)
     - WAS/WIE/WO/WER fields
     - Technische Verifikation (FILE_EXISTS, LINT_PASS, etc.)
     - Completion Check commands

  **WICHTIG für Gherkin:**
  - Keine technischen Details in Gherkin-Szenarien
  - Keine UI-Implementierung ("klicke Button mit id=xyz")
  - Fokus auf Nutzer-Erlebnis, nicht Code

  5. WRITE: Story file to specwright/backlog/stories/
     PATH: specwright/backlog/stories/todo-[TODO_ID]-[SLUG].md
     Example: specwright/backlog/stories/todo-2025-01-15-001-loading-state-modal.md
</mandatory_actions>

<story_file_structure>
  specwright/backlog/stories/todo-YYYY-MM-DD-[INDEX]-[slug].md
</story_file_structure>

</step>

<step number="3.5" name="pre_refinement_layer_analysis">

### Step 3.5: Pre-Refinement Layer Analysis (NEU)

⚠️ **PFLICHT:** Vor dem Architect-Refinement systematisch alle betroffenen Layer identifizieren.

<mandatory_actions>
  1. EXTRACT from Story (Step 3):
     - User Story (wer, was, warum)
     - Fachliche Akzeptanzkriterien
     - Story Type (Frontend/Backend/DevOps/Test)

  2. ANALYZE affected layers:
     ```
     Layer Analysis Checklist:
     - [ ] Frontend (UI, Components, JavaScript/TypeScript)
     - [ ] Backend (API, Services, Controller, Logic)
     - [ ] Database (Schema, Queries, Migrations)
     - [ ] External APIs (Integrations, Third-Party)
     - [ ] DevOps (Build, Deploy, Config, Environment)
     - [ ] Security (Auth, Permissions, Validation)
     ```

  3. FOR EACH affected layer:
     Document:
     - WHY affected (impact description)
     - WHAT touch points (specific components/files)
     - HOW connected (integration dependencies)

  4. DETERMINE Integration Type:
     - IF only 1 layer affected: "[Layer]-only"
     - IF 2+ layers affected: "Full-stack" or "Multi-layer"

  5. GENERATE Layer Summary:
     ```
     Integration Type: [Backend-only / Frontend-only / Full-stack / Multi-layer]
     Affected Layers: [List with brief description]
     Critical Integration Points: [List connections between layers]
     ```

  6. IF Integration Type = "Full-stack" OR "Multi-layer":
     FLAG: For additional validation in Step 4.5
     ADD to story notes: "Full-Stack task - ensure all layers are addressed"

  7. PASS Layer Summary to Architect in Step 4
</mandatory_actions>

<output>
  Layer Summary for Architect:
  - Integration Type
  - Affected Layers (with touch points)
  - Critical Integration Points (if multi-layer)
</output>

</step>

<step number="4" name="architect_refinement">

### Step 4: Architect Phase - Technical Refinement (v3.0)

Main agent does technical refinement guided by architect-refinement skill.

<refinement_process>
  LOAD skill: .claude/skills/architect-refinement/SKILL.md
  (This skill provides guidance for technical refinement)

  **Story Context:**
  - Story File: specwright/backlog/user-story-[YYYY-MM-DD]-[INDEX]-[slug].md
  - Pre-Refinement Layer Analysis (from Step 3.5): [LAYER_SUMMARY]
  - Tech Stack: specwright/product/tech-stack.md
  - Architecture: Try both locations:
    1. specwright/product/architecture-decision.md
    2. specwright/product/architecture/platform-architecture.md
  - Architecture Structure: specwright/product/architecture-structure.md (if exists)
  - DoR/DoD: specwright/team/dor.md and dod.md (if exist)

  **Tasks (guided by architect-refinement skill):**
  1. READ the story file
  2. ANALYZE the fachliche requirements
  3. ANALYZE the Pre-Refinement Layer Analysis
  4. FILL technical sections:

     **DoR (Definition of Ready):**
     - Load project DoR from specwright/team/dor.md (if exists)
     - Apply relevant DoR criteria to this story
     - Mark ALL checkboxes as [x] when complete

     **DoD (Definition of Done):**
     - Load project DoD from specwright/team/dod.md (if exists)
     - Apply relevant DoD criteria to this story
     - Define completion criteria (start unchecked [ ])

     **Betroffene Layer & Komponenten (PFLICHT):**
     Based on Pre-Refinement Layer Analysis:
     - Integration Type: [Backend-only / Frontend-only / Full-stack]
     - Betroffene Komponenten Table (fill from analysis)
     - Kritische Integration Points (if Full-stack)
     - Handover-Dokumente (if Multi-Layer)

     **Technical Details:**
     - WAS: Components to create/modify (no code)
     - WIE: Architecture guidance (patterns, constraints)
     - WO: File paths (MUST cover ALL layers!)
     - Domain: Optional domain area reference
     - Abhängigkeiten: None (backlog stories are independent)
     - Geschätzte Komplexität: XS or S

     **Completion Check:**
     - Add bash verify commands

  5. VALIDATE story size:
     - If >5 files or >400 LOC: Consider /create-spec instead

  **IMPORTANT (v3.0):**
  - NO "WER" field (main agent implements directly)
  - Skills auto-load during implementation
  - Follow architect-refinement skill guidance
  - Keep lightweight (XS or S complexity)
  - Mark ALL DoR checkboxes as [x] when ready
</refinement_process>

</step>

<step number="4.5" name="story_size_validation">

### Step 4.5: Story Size Validation (v2.1 - Gradient Scoring)

Validate task complexity using gradient scoring (inspired by /add-bug pattern).
Replaces binary pass/fail with multi-factor scoring and tiered recommendations.

<validation_process>
  READ: The story file from specwright/backlog/user-story-[...].md

  <extract_metrics>
    ANALYZE: WO (Where) field
      COUNT: Number of file paths mentioned → affected_files
      EXTRACT: File paths list

    ANALYZE: Geschätzte Komplexität field
      EXTRACT: Complexity rating (XS/S/M/L/XL) → complexity_rating

    ANALYZE: "Betroffene Layer & Komponenten" section
      EXTRACT: Integration Type → is_cross_layer (true if Full-stack or Multi-layer)
      COUNT: Critical Integration Points → integration_points

    CHECK: External dependencies
      EXTRACT: New external dependencies mentioned → new_external_dependency (boolean)

    CHECK: Database changes
      EXTRACT: Database/migration mentioned in WAS/WO → database_migration_needed (boolean)
  </extract_metrics>

  <calculate_complexity_score>
    CALCULATE Complexity Score:
    ```
    Complexity Indicators:
    - affected_files > 5:         +3 points
    - affected_files > 3:         +1 point
    - cross_layer (Full-stack):   +2 points
    - complexity_rating >= M:     +2 points
    - complexity_rating >= L:     +4 points (replaces M bonus)
    - integration_points > 2:     +1 point
    - new_external_dependency:    +1 point
    - database_migration_needed:  +1 point
    ```

    TOTAL = sum of all applicable points
    LOG: "Complexity Score: {TOTAL} (files:{affected_files}, complexity:{complexity_rating}, cross-layer:{is_cross_layer})"
  </calculate_complexity_score>
</validation_process>

<decision_tree>

  **IF Score 0-2 (SIMPLE):**

    LOG: "Score {TOTAL}/12 → SIMPLE: Task appropriate for /add-todo"
    PROCEED: To Step 5 (Update Backlog JSON)

  ---

  **IF Score 3-4 (MODERATE):**

    INFORM user:
    ```
    Complexity Advisory: This task has moderate complexity.

    Metrics:
    - Files: [affected_files]
    - Complexity: [complexity_rating]
    - Cross-layer: [yes/no]
    - Integration points: [N]
    - Complexity Score: [TOTAL]/12

    This task is within /add-todo limits but has some complexity factors.
    Consider whether a lightweight spec would provide better structure.
    ```

    ASK user via AskUserQuestion:
    "Task has moderate complexity (Score: {TOTAL}). How would you like to proceed?

    Options:
    1. Continue as Todo
       → Proceed with current /add-todo process
       → Suitable if you're confident about the approach

    2. Switch to /create-spec S-Spec
       → Lightweight spec with simplified process
       → No implementation plan, simplified DoR
       → Better structure than todo, less overhead than full spec

    3. Reduce scope
       → Edit the story to narrow focus
       → Re-run validation after edits"

    WAIT for user choice

    IF choice = "Continue as Todo":
      LOG: "Moderate complexity - user chose to continue as todo"
      PROCEED: To Step 5

    ELSE IF choice = "Switch to /create-spec S-Spec":
      INFORM: "Switching to /create-spec as S-Spec.
               The task description will be used as starting point."
      DELETE: The backlog story file (optional cleanup)
      INVOKE: /create-spec with task description
      STOP: This workflow

    ELSE IF choice = "Reduce scope":
      INFORM: "Please edit the story file: specwright/backlog/[story-file].md"
      INFORM: "Reduce the scope by:
               - Fewer files in WO section
               - Smaller complexity rating
               - Narrower focus on core functionality"
      PAUSE: Wait for user to edit
      ASK: "Ready to re-validate? (yes/no)"
      IF yes:
        REPEAT: Step 4.5 (this validation step)
      ELSE:
        PROCEED: To Step 5 with warning flag

  ---

  **IF Score 5+ (COMPLEX):**

    INFORM user:
    ```
    Complexity Warning: This task exceeds /add-todo guidelines.

    Metrics:
    - Files: [affected_files]
    - Complexity: [complexity_rating]
    - Cross-layer: [yes/no]
    - Integration points: [N]
    - New dependencies: [yes/no]
    - DB migration: [yes/no]
    - Complexity Score: [TOTAL]/12

    Why this matters:
    - /add-todo is designed for quick, small tasks
    - Complex tasks benefit from proper planning and story splitting
    - Full specs provide dependency mapping and integration stories
    ```

    ASK user via AskUserQuestion:
    "Task exceeds /add-todo complexity guidelines (Score: {TOTAL}). How would you like to proceed?

    Options:
    1. Switch to /create-spec (Recommended)
       → Full specification with proper planning
       → Story splitting and dependency mapping
       → Better context efficiency

    2. Reduce scope
       → Edit the story to narrow focus
       → Re-run validation after edits

    3. Proceed anyway (Not recommended)
       → Accept higher token costs
       → Risk mid-execution context compaction
       → Continue with current task"

    WAIT for user choice

    IF choice = "Switch to /create-spec":
      INFORM: "Switching to /create-spec workflow.
               The task description will be used as starting point."
      DELETE: The backlog story file (optional cleanup)
      INVOKE: /create-spec with task description
      STOP: This workflow

    ELSE IF choice = "Reduce scope":
      INFORM: "Please edit the story file: specwright/backlog/[story-file].md"
      PAUSE: Wait for user to edit
      ASK: "Ready to re-validate? (yes/no)"
      IF yes:
        REPEAT: Step 4.5 (this validation step)
      ELSE:
        PROCEED: To Step 5 with warning flag

    ELSE IF choice = "Proceed anyway":
      WARN: "Proceeding with complex task despite recommendation.
             - Expect higher token costs
             - Mid-execution compaction possible
             - Consider breaking into smaller tasks next time"
      LOG: Validation bypassed by user (Score: {TOTAL})
      PROCEED: To Step 5

</decision_tree>

<instructions>
  ACTION: Validate task using gradient complexity scoring
  CALCULATE: Multi-factor score (files, complexity, layers, integrations, dependencies, migrations)
  DECIDE: SIMPLE (0-2) → proceed | MODERATE (3-4) → advisory | COMPLEX (5+) → strong recommendation
  OFFER: Tier-appropriate options including S-Spec as middle ground
  ENFORCE: Validation before adding to backlog
</instructions>

**Output:**
- Complexity Score with breakdown
- User decision on how to proceed
- Task either validated, escalated to S-Spec, or escalated to /create-spec

</step>

<step number="5" name="update_backlog_json">

### Step 5: Add Todo to Backlog via MCP Tool

<mandatory_actions>
  EXTRACT from previous steps:
  - Todo Title: [TODO_TITLE]
  - Description: [From story file or Step 2]
  - Priority: [PRIORITY]
  - Type/Category: [CATEGORY]
  - Effort: [EFFORT_POINTS]

  CALL MCP TOOL: backlog_add_item
  Input:
  {
    "itemType": "todo",
    "data": {
      "title": "[TODO_TITLE]",
      "description": "[TODO_DESCRIPTION from Step 2 + Gherkin scenarios]",
      "priority": "[PRIORITY]",
      "source": "/add-todo command",
      "estimatedEffort": [EFFORT_POINTS]
    }
  }

  VERIFY: Tool returns {
    "success": true,
    "itemId": "TODO-NNN",
    "path": "items/todo-NNN-slug.md"
  }

  LOG: "Todo {itemId} added to backlog via MCP tool"

  NOTE: The MCP tool automatically:
  - Generates unique todo ID (TODO-001, TODO-002, etc.)
  - Creates todo item file in specwright/backlog/items/
  - Creates/updates backlog-index.json
  - Uses todo template with all metadata
  - All atomic with file lock (no corruption risk)

  NOTE: The story file created in Step 3 remains in specwright/backlog/stories/
        for backward compatibility. The MCP tool creates a separate item file
        in specwright/backlog/items/ for the index.
</mandatory_actions>

</step>

<step number="6" name="completion_summary">

### Step 6: Task Added Confirmation

⚠️ **Note:** Only reached if task passed size validation (Step 4.5)

<summary_template>
  ✅ Task added to backlog!

  **Todo ID:** [YYYY-MM-DD-INDEX]
  **Story File:** specwright/backlog/stories/todo-[YYYY-MM-DD]-[INDEX]-[slug].md
  **Backlog:** specwright/backlog/backlog.json

  **Summary:**
  - Title: [Todo Title]
  - Type: [Frontend/Backend/etc.]
  - Complexity: [XS/S]
  - Status: Ready

  **Backlog Status (from backlog.json):**
  - Total items: [statistics.total]
  - Bugs: [statistics.byType.bug]
  - Todos: [statistics.byType.todo]
  - Ready for execution: [statistics.byStatus.ready]

  **Next Steps:**
  1. Add more tasks: /add-todo "[description]"
  2. Add bugs: /add-bug "[description]"
  3. Execute backlog: /execute-tasks backlog
  4. View backlog: specwright/backlog/backlog.json
</summary_template>

</step>

<step number="7" name="auto_git_commit">

### Step 7: Auto Git Commit

Automatically commit all todo files so the working tree is clean before execution.

<mandatory_actions>
  1. DELEGATE to git-workflow via Task tool (model="haiku"):

     PROMPT:
     """
     Create a git commit for the newly created todo files.

     1. Stage all new/modified files:
        ```bash
        git add specwright/backlog/
        ```

     2. Create commit:
        ```bash
        git commit -m "todo: add [TODO_TITLE]"
        ```

        Where [TODO_TITLE] is the short todo title (e.g., "loading-state-modal").

     3. Do NOT push to remote.
     """

  2. VERIFY: Commit was successful (exit code 0)

  3. IF commit fails:
     WARN user: "Auto-Commit fehlgeschlagen. Bitte manuell committen."
     SHOW: git status output
     CONTINUE: Do not block workflow completion
</mandatory_actions>

<instructions>
  ACTION: Automatically commit todo files after creation
  FORMAT: todo: add [todo-title]
  PUSH: Never push automatically
  FAIL: Warn but do not block on commit failure
</instructions>

</step>

</process_flow>

## Final Checklist

<verify>
  - [ ] Backlog directory exists (specwright/backlog/)
  - [ ] Backlog JSON exists (specwright/backlog/backlog.json)
  - [ ] Story file created in stories/ subdirectory
  - [ ] Todo ID format: YYYY-MM-DD-[INDEX]
  - [ ] Fachliche content complete (brief)
  - [ ] Technical refinement complete
  - [ ] All DoR checkboxes marked [x]
  - [ ] **Complexity scoring passed or user override (Step 4.5)**
  - [ ] **backlog.json updated with new item**
  - [ ] **statistics recalculated**
  - [ ] **changeLog entry added**
  - [ ] **Auto Git Commit erstellt (Step 7)** - Clean working tree
  - [ ] Ready for /execute-tasks backlog
</verify>

## When NOT to Use /add-todo

Suggest /create-spec instead when:
- Task requires multiple stories
- Task needs clarification document
- Complexity Score >= 5 (Step 4.5 Gradient Scoring)
- Task affects >5 files
- Task needs extensive requirements gathering
- Task is a major feature

**Gradient Scoring thresholds (v2.1):**
- Score 0-2: Appropriate for /add-todo (proceed)
- Score 3-4: Advisory - consider S-Spec as middle ground
- Score 5+: Strong recommendation to use /create-spec
