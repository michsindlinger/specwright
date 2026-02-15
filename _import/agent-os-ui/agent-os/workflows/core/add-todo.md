---
description: Add quick task to backlog with lightweight PO + Architect refinement
globs:
alwaysApply: false
version: 2.0
encoding: UTF-8
---

# Add Todo Workflow

## Overview

Add a lightweight task to the backlog without full spec creation. Uses same story template as create-spec but with minimal overhead.

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
  EXECUTE: agent-os/workflows/meta/pre-flight.md
</pre_flight_check>

<process_flow>

<step number="1" name="backlog_setup">

### Step 1: Backlog Setup (JSON)

<mandatory_actions>
  1. CHECK: Does agent-os/backlog/ directory exist?
     ```bash
     ls -la agent-os/backlog/ 2>/dev/null
     ```

  2. IF directory NOT exists:
     CREATE: agent-os/backlog/ directory
     CREATE: agent-os/backlog/stories/ subdirectory

  3. CHECK: Does agent-os/backlog/backlog.json exist?

     IF NOT exists:
       CREATE: agent-os/backlog/backlog.json (from template)

       <template_lookup>
         PATH: backlog-template.json

         LOOKUP STRATEGY (MUST TRY BOTH):
           1. READ: agent-os/templates/json/backlog-template.json
           2. IF file not found OR read error:
              READ: ~/.agent-os/templates/json/backlog-template.json
           3. IF both fail: Error - run setup-devteam-global.sh

         ⚠️ WICHTIG: Bei "Error reading file" IMMER den Fallback-Pfad versuchen!
       </template_lookup>

       REPLACE placeholders:
         - {{CREATED_AT}} → Current ISO 8601 timestamp

     ELSE:
       READ: agent-os/backlog/backlog.json
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
         1. READ: agent-os/templates/docs/story-template.md
         2. IF file not found OR read error:
            READ: ~/.agent-os/templates/docs/story-template.md
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

  5. WRITE: Story file to agent-os/backlog/stories/
     PATH: agent-os/backlog/stories/todo-[TODO_ID]-[SLUG].md
     Example: agent-os/backlog/stories/todo-2025-01-15-001-loading-state-modal.md
</mandatory_actions>

<story_file_structure>
  agent-os/backlog/stories/todo-YYYY-MM-DD-[INDEX]-[slug].md
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
  - Story File: agent-os/backlog/user-story-[YYYY-MM-DD]-[INDEX]-[slug].md
  - Pre-Refinement Layer Analysis (from Step 3.5): [LAYER_SUMMARY]
  - Tech Stack: agent-os/product/tech-stack.md
  - Architecture: Try both locations:
    1. agent-os/product/architecture-decision.md
    2. agent-os/product/architecture/platform-architecture.md
  - Architecture Structure: agent-os/product/architecture-structure.md (if exists)
  - DoR/DoD: agent-os/team/dor.md and dod.md (if exist)

  **Tasks (guided by architect-refinement skill):**
  1. READ the story file
  2. ANALYZE the fachliche requirements
  3. ANALYZE the Pre-Refinement Layer Analysis
  4. FILL technical sections:

     **DoR (Definition of Ready):**
     - Load project DoR from agent-os/team/dor.md (if exists)
     - Apply relevant DoR criteria to this story
     - Mark ALL checkboxes as [x] when complete

     **DoD (Definition of Done):**
     - Load project DoD from agent-os/team/dod.md (if exists)
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

### Step 4.5: Story Size Validation

Validate that the task complies with size guidelines for single-session execution.

<validation_process>
  READ: The story file from agent-os/backlog/user-story-[...].md

  <extract_metrics>
    ANALYZE: WO (Where) field
      COUNT: Number of file paths mentioned
      EXTRACT: File paths list

    ANALYZE: Geschätzte Komplexität field
      EXTRACT: Complexity rating (XS/S/M/L/XL)

    ANALYZE: WAS (What) field
      ESTIMATE: Lines of code based on components mentioned
      HEURISTIC:
        - Each new file/component ~100-150 lines
        - Each modified file ~50-100 lines
        - Tests ~50-100 lines per test file
  </extract_metrics>

  <check_thresholds>
    CHECK: Number of files
      IF files > 5:
        FLAG: Task as "Too Large - File Count"
        SEVERITY: High

    CHECK: Complexity rating
      IF complexity in [M, L, XL]:
        FLAG: Task as "Too Complex for /add-todo"
        SEVERITY: High

    CHECK: Estimated LOC
      IF estimated_loc > 400:
        FLAG: Task as "Too Large - Code Volume"
        SEVERITY: High
      ELSE IF estimated_loc > 300:
        FLAG: Task as "Watch - Approaching Limit"
        SEVERITY: Low

    CHECK: Cross-layer detection (Enhanced)
      EXTRACT: "Betroffene Layer & Komponenten" section
      IF Integration Type = "Full-stack" OR "Multi-layer":
        CHECK: WO section covers ALL layers from "Betroffene Komponenten" table
        IF missing_layers detected:
          FLAG: Task as "Incomplete Full-Stack Coverage"
          SEVERITY: High
          LIST: "Missing file paths for layers: [missing_layers]"
          SUGGEST: "Add file paths for ALL affected layers to WO section"
        ELSE:
          FLAG: Task as "Full-Stack (Complete)"
          SEVERITY: Medium
          SUGGEST: "Multi-layer task - ensure ALL layers are implemented together"

      CHECK: Integration Points validation
        IF Critical Integration Points defined:
          VERIFY: Each integration point has:
            - Source file in WO
            - Target file in WO
          IF missing connection files:
            FLAG: Task as "Missing Integration Files"
            SEVERITY: High
            LIST: "Integration points missing file coverage: [points]"
  </check_thresholds>
</validation_process>

<decision_tree>
  IF no flags raised OR only low severity:
    LOG: "✅ Task passes size validation - appropriate for /add-todo"
    PROCEED: To Step 5 (Update Story Index)

  ELSE (task flagged with Medium/High severity):
    GENERATE: Validation Report

    <validation_report_format>
      ⚠️ Task Size Validation - Issues Detected

      **Task:** [Story Title]
      **File:** [Story file path]

      **Metrics:**
      - Files: [count] (max recommended: 5) [✅/❌]
      - Complexity: [rating] (max recommended: S) [✅/❌]
      - Est. LOC: ~[count] (max recommended: 400) [✅/❌]
      - Cross-layer: [Yes/No] [✅/⚠️]

      **Issue:** [Description of what exceeds guidelines]

      **Why this matters:**
      - /add-todo is designed for quick, small tasks
      - Larger tasks benefit from full specification process
      - Full specs provide better planning, dependencies, and integration stories

      **Recommendation:** Use /create-spec instead for:
      - Better requirements clarification
      - Proper story splitting
      - Dependency mapping
      - Integration story generation
    </validation_report_format>

    PRESENT: Validation Report to user

    ASK user via AskUserQuestion:
    "This task exceeds /add-todo size guidelines. How would you like to proceed?

    Options:
    1. Switch to /create-spec (Recommended)
       → Full specification with proper planning
       → Story splitting if needed
       → Better context efficiency

    2. Edit task to reduce scope
       → Modify the story file manually
       → Re-run validation after edits

    3. Proceed anyway
       → Accept higher context usage
       → Risk mid-execution context compaction
       → Continue with current task"

    WAIT for user choice

    <user_choice_handling>
      IF choice = "Switch to /create-spec":
        INFORM: "Switching to /create-spec workflow.
                 The task description will be used as starting point."

        DELETE: The backlog story file (optional cleanup)

        INVOKE: /create-spec with task description
        STOP: This workflow

      ELSE IF choice = "Edit task to reduce scope":
        INFORM: "Please edit the story file: agent-os/backlog/[story-file].md"
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

      ELSE IF choice = "Proceed anyway":
        WARN: "⚠️ Proceeding with oversized task
               - Expect higher token costs
               - Mid-execution compaction possible
               - Consider breaking into smaller tasks next time"
        LOG: Validation bypassed by user
        PROCEED: To Step 5
    </user_choice_handling>
</decision_tree>

<instructions>
  ACTION: Validate task against size guidelines
  CHECK: File count, complexity, estimated LOC, cross-layer detection
  THRESHOLD: Max 5 files, max S complexity, max 400 LOC
  REPORT: Issues found with specific recommendations
  OFFER: Three options (switch to create-spec, edit, proceed)
  ENFORCE: Validation before adding to backlog
</instructions>

**Output:**
- Validation report (if issues found)
- User decision on how to proceed
- Task either validated, edited, or escalated to /create-spec

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
  - Creates todo item file in agent-os/backlog/items/
  - Creates/updates backlog-index.json
  - Uses todo template with all metadata
  - All atomic with file lock (no corruption risk)

  NOTE: The story file created in Step 3 remains in agent-os/backlog/stories/
        for backward compatibility. The MCP tool creates a separate item file
        in agent-os/backlog/items/ for the index.
</mandatory_actions>

</step>

<step number="6" name="completion_summary">

### Step 6: Task Added Confirmation

⚠️ **Note:** Only reached if task passed size validation (Step 4.5)

<summary_template>
  ✅ Task added to backlog!

  **Todo ID:** [YYYY-MM-DD-INDEX]
  **Story File:** agent-os/backlog/stories/todo-[YYYY-MM-DD]-[INDEX]-[slug].md
  **Backlog:** agent-os/backlog/backlog.json

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
  4. View backlog: agent-os/backlog/backlog.json
</summary_template>

</step>

</process_flow>

## Final Checklist

<verify>
  - [ ] Backlog directory exists (agent-os/backlog/)
  - [ ] Backlog JSON exists (agent-os/backlog/backlog.json)
  - [ ] Story file created in stories/ subdirectory
  - [ ] Todo ID format: YYYY-MM-DD-[INDEX]
  - [ ] Fachliche content complete (brief)
  - [ ] Technical refinement complete
  - [ ] All DoR checkboxes marked [x]
  - [ ] **Story size validation passed (Step 4.5)**
  - [ ] **backlog.json updated with new item**
  - [ ] **statistics recalculated**
  - [ ] **changeLog entry added**
  - [ ] Ready for /execute-tasks backlog
</verify>

## When NOT to Use /add-todo

Suggest /create-spec instead when:
- Task requires multiple stories
- Task needs clarification document
- Estimated complexity > S
- Task affects >5 files
- Task needs extensive requirements gathering
- Task is a major feature
