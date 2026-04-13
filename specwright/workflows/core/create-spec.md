---
description: Create Feature Specification with DevTeam (PO + Architect)
globs:
alwaysApply: false
version: 3.9.0
encoding: UTF-8
---

# Create Spec Workflow

## Overview

Create detailed feature specifications: Main agent gathers fachliche requirements (PO role), then adds technical refinement guided by architect-refinement skill.

**v3.9 Changes (Adaptive Documentation Depth):**
- **NEW: Spec Tier System** - Adaptive doc depth based on feature size: S (1-2 stories), M (3-5), L (6+)
- **NEW: Step 2.3.1 Down-Sizing Detection** - Advisory scoring after requirements clarification
- **NEW: Tier Classification in Step 2.6** - Automatic tier assignment after story generation
- **ENHANCED: Conditional Steps** - S-Spec skips implementation plan, simplifies DoR, conditionally skips story-998
- **ENHANCED: System Stories** - story-998 conditionally skipped for S-Spec single-layer features
- **ENHANCED: L-Spec** - cross-cutting-decisions.md becomes mandatory, sub-spec splitting advisory for >8 stories
- **BENEFIT:** ~15-25% token savings for S-Specs, no behavior change for existing M-Specs

**v3.1 Changes:**
- **NEW: Project Knowledge Integration** - Load existing project artifacts at spec creation
  - Step 2.1: Load knowledge-index.md to show available components/services
  - Step 2.5: Load relevant detail files based on implementation plan keywords
  - Step 3: Architect marks "Creates Reusable" for stories that add to knowledge
- **NEW: Knowledge Templates** - 5 new templates in specwright/templates/knowledge/
- **ENHANCED: Story Template** - "Creates Reusable" field for knowledge tracking

**v3.0 Changes:**
- **NEW: System Stories** - 3 automatisch generierte Stories am Ende jeder Spec:
  - story-997: Code Review (Opus reviewt gesamten Feature-Diff)
  - story-998: Integration Validation
  - story-999: Finalize PR (User-Todos, PR, Cleanup)

**v2.9 Changes:**
- **NEW: Komponenten-Verbindungen** - Explizite Definition WIE Komponenten verbunden werden
- **NEW: Verbindungs-Matrix** im Implementation Plan Template mit Source/Target/Story-Zuordnung
- **NEW: Integration DoD** - Stories mit Verbindungs-Verantwortung bekommen Integration-DoD-Punkte
- **NEW: Verbindungs-Validierung** im Self-Review (Step 2.5.2)
- **ENHANCED: Story Generation** - Stories erhalten Integration-Metadata wenn zuständig für Verbindung
- **FIX: "Komponenten gebaut aber nicht verbunden"** - Verhindert isolierte Implementierung

**v3.6 Changes (Context Window Optimization):**
- **NEW: Phase Detection** - Resume support via optional spec folder path argument
  - `/specwright:create-spec` (no argument) → Starts fresh from Step 1
  - `/specwright:create-spec specwright/specs/YYYY-MM-DD-name/` → Auto-detects phase and resumes
- **NEW: Phase Completion Messages** - After each major phase, user is informed they can `/clear` and resume
  - Phase 1 complete → After requirements clarification approved (Step 2.3)
  - Phase 2 complete → After stories generated from plan (Step 2.6)
  - Phase 3 complete → After technical refinement (Step 3.5)
- **BENEFIT:** Prevents context window compaction during large spec creation
- **BACKWARD COMPATIBLE:** Without argument, workflow behaves exactly as before

**v3.5 Changes (Architecture Migration):**
- **BREAKING: Step 3 - Main Agent + Skill** - Architect refinement is now done by main agent guided by architect-refinement skill (was: Sub-Agent delegation)
- **REMOVED: WER field** - Stories no longer contain WER field (main agent implements directly)
- **REMOVED: skill-index.md references** - Skills auto-load via `.claude/skills/[name]/SKILL.md`
- **FIXED: Skill paths** - Now use `.claude/skills/` (was: `specwright/skills/`)
- **FIXED: Step 3.4 DoR fix** - Main agent fixes DoR directly (was: re-delegate to architect)
- **KEPT: Step 2.5 Plan Agent** - Plan delegation preserved (documented input, benefits from focused context)

**v3.4 Changes:**
- **NEW: Optional Effort Estimation** - Step 3.5.1 asks user (default: skip)
- **ENHANCED: Model Parameters** - Use haiku for simple tasks to reduce costs
- **CHANGED: Step 4 Summary** - Handles both with/without effort estimation

**v3.3 Changes (JSON Migration):**
- **NEW: kanban.json** - JSON-basiertes Kanban als Single Source of Truth
- **NEW: Structured Story Data** - Stories werden als JSON-Objekte in kanban.json gespeichert
- **NEW: Execution Plan in JSON** - Phasen und Dependencies als strukturierte Daten
- **ENHANCED: story-index.md** - Bleibt als Human-Readable View, abgeleitet aus kanban.json
- **NEW: Statistics** - Automatische Berechnung von Spec-Statistiken
- **NEW: Resume Context** - Bessere Recovery nach /clear durch JSON-State

**v3.2 Changes:**
- Plan-Agent Delegation - Step 2.5 delegiert an spezialisierten Plan-Agenten
- Getrennte Kontext-Fenster - Planung und Ausführung nutzen separate Agenten
- Konsistentes Verhalten - Gleicher Plan-Prozess wie direkter Prompt

**v2.8 Changes:**
- **NEW: Implementation Plan (Step 2.5)** - Lückenloser Plan mit Self-Review und Minimalinvasiv-Analyse
- **NEW: Kollegen-Methode** - Kritischer Self-Review vor Story-Generierung
- **NEW: Editor-Option** - User kann Plan direkt im Editor bearbeiten
- **NEW: implementation-plan.md** - Template für strukturierte Planung
- **CHANGED: Step 2.4 → 2.6** - Stories werden jetzt aus dem Plan abgeleitet, nicht nur aus Clarification
- **NEW: /review-implementation-plan Skill** - Standalone Review für existierende Pläne

**v2.7 Changes:**
- Automatic Effort Estimation (Step 3.6) - Dual estimation: Human-only + Human+AI Agent
- effort-estimation.md - Per-Story und Gesamt-Schätzung im Spec-Ordner
- Step 4 Summary zeigt Aufwandsschätzung mit Zeitersparnis durch KI

**v2.6 Changes:**
- **NEW: Gherkin-Style User Stories** - PO schreibt Akzeptanzkriterien im Given-When-Then Format
- **NEW: Best Practices für Gherkin** - Ein Verhalten pro Szenario, konkrete Werte, Nutzer-Perspektive
- **ENHANCED: Story Template** - Trennung zwischen fachlichen Gherkin-Szenarien und technischer Verifikation
- **ENHANCED: Acceptance Criteria** - Fachlich (Gherkin) + Technisch (FILE_EXISTS, etc.) getrennt

**v2.5 Changes:**
- Pre-Refinement Layer Analysis - Systematic identification of all affected layers before technical refinement
- "Betroffene Layer & Komponenten" section in story template for Full-Stack consistency
- Integration Type classification (Backend-only / Frontend-only / Full-stack)
- Critical Integration Points documentation for cross-layer dependencies
- Cross-Layer Detection in Step 3.5 validates layer coverage in WO section
- DoR checkboxes now include Full-Stack consistency checks

**v2.4 Changes:**
- Architect now selects relevant skills from skill-index.md for each story
- Story template includes "Relevante Skills" section
- Skills are used by Orchestrator during /execute-tasks for pattern extraction

<pre_flight_check>
  EXECUTE: specwright/workflows/meta/pre-flight.md
</pre_flight_check>

<phase_detection>

### Phase Detection (Resume Support - v3.6)

This workflow supports resuming from a previous session to prevent context window compaction.
The user can provide a spec folder path as argument to resume where they left off.

**Usage:**
- Fresh start: `/specwright:create-spec` (no argument)
- Resume: `/specwright:create-spec specwright/specs/YYYY-MM-DD-spec-name/`

<detection_logic>
  IF $ARGUMENTS contains a path to a spec folder:

    1. VALIDATE folder exists:
       - IF folder does NOT exist: ERROR "Spec folder not found: [path]. Start fresh with /specwright:create-spec (without path)."

    2. STORE spec folder path for use in subsequent steps (skip folder creation in Step 2.2)

    3. DETECT current state by checking file existence:

       CHECK_A: [spec-folder]/requirements-clarification.md
       CHECK_B: [spec-folder]/implementation-plan.md
       CHECK_C: [spec-folder]/stories/ (directory exists and contains .md files)
       CHECK_D: First story file has filled "WAS:" section (technical refinement done)
       CHECK_E: [spec-folder]/kanban.json → read `spec.specTier` (if exists)

    4. DETERMINE resume point:

       a. IF CHECK_A = false (no clarification):
          → ERROR: "No requirements-clarification.md found in [path]. Start fresh with /specwright:create-spec (without path)."

       b. IF CHECK_A = true AND CHECK_B = false (clarification exists, no plan):
          → READ CHECK_E: If kanban.json exists, read spec.specTier
          → IF specTier = "S" (S-Spec skips implementation plan):
            → INFORM user:
              ```
              Resuming S-Spec (Implementation Plan skipped for S-Specs).
              Phase 1 (PO Requirements) was completed in a previous session.
              Loading: requirements-clarification.md
              ```
            → READ: [spec-folder]/requirements-clarification.md
            → JUMP TO: Step 2.6 (Generate Stories directly from Clarification)
          → ELSE:
            → INFORM user:
              ```
              Resuming from Phase 2 (Implementation Plan).
              Phase 1 (PO Requirements) was completed in a previous session.
              Loading: requirements-clarification.md
              ```
            → READ: [spec-folder]/requirements-clarification.md
            → JUMP TO: Step 2.5 (Implementation Plan)

       c. IF CHECK_A = true AND CHECK_B = true AND CHECK_C = true AND CHECK_D = false
          (plan + stories exist, but stories not yet refined):
          → INFORM user:
            ```
            Resuming from Phase 3 (Technical Refinement).
            Phase 1 (PO Requirements) and Phase 2 (Planning) were completed in previous sessions.
            Loading: spec context files
            ```
          → READ: [spec-folder]/requirements-clarification.md (for reference)
          → READ: [spec-folder]/implementation-plan.md
          → READ: [spec-folder]/spec.md
          → JUMP TO: Step 3 (Technical Refinement)

       d. IF CHECK_A = true AND CHECK_B = true AND CHECK_C = true AND CHECK_D = true
          (stories already have technical refinement):
          → INFORM user:
            ```
            Spec appears to be mostly complete. Running final validations.
            ```
          → JUMP TO: Step 3.4 (DoR Validation)

  ELSE (no argument provided):
    → Start from Step 1 (Feature Selection) - normal flow

</detection_logic>

</phase_detection>

<process_flow>

<step number="1" name="spec_initiation">

### Step 1: Feature Selection from Roadmap

ALWAYS present roadmap features as options to user, even if they provided a custom idea.

<mandatory_actions>
  1. READ specwright/product/roadmap.md

  2. EXTRACT uncompleted features from all phases (MVP, Growth, Scale)

  3. PRESENT to user via AskUserQuestion:
     ```
     Question: "What feature would you like to create a specification for?"

     Options:
     - [Roadmap Feature 1] - [One-line description]
     - [Roadmap Feature 2] - [One-line description]
     - [Roadmap Feature 3] - [One-line description]
     - [Roadmap Feature 4] - [One-line description]

     (User can also type custom feature via "Other" option)
     ```

  4. WAIT for user selection

  5. STORE selected feature for Step 2
</mandatory_actions>

<instructions>
  ACTION: Always show roadmap features first
  FORMAT: Use AskUserQuestion tool with roadmap features as options
  ALLOW: User can choose "Other" to enter custom feature
  PROCEED: To Step 2 with selected feature
</instructions>

</step>

<step number="2" name="po_fachliche_requirements_dialog">

### Step 2: PO Phase - Dialog-Based Requirements Gathering

⚠️ **NEW APPROACH:** For larger/complex features, engage in iterative dialog with user
to fully understand requirements BEFORE generating user stories.

<process_overview>
  1. **Requirements Dialog** (Iterative clarification)
  2. **Clarification Document** (Summary for approval)
  3. **User Approval** (User confirms or requests changes)
  4. **Implementation Plan** (NEW v2.8 - Lückenloser Plan mit Self-Review)
  5. **User Story Generation** (Only after plan approval)
</process_overview>

<substep number="2.1" name="requirements_dialog">

### Step 2.1: Requirements Dialog (Iterative)

<mandatory_actions>
  ⚠️ **CRITICAL: This workflow creates a NEW spec only!**
  - NEVER modify, continue, or reference existing specs in specwright/specs/
  - NEVER ask the user which existing spec to work on
  - ALWAYS create a fresh spec folder with today's date
  - If user wants to modify existing spec → inform them to edit the spec files directly

  1. LOAD context:
     - Product Brief: specwright/product/product-brief-lite.md
     - Roadmap: specwright/product/roadmap.md (if from roadmap)

  2. LOAD project knowledge (v3.1 - if exists):
     TRY READ: specwright/knowledge/knowledge-index.md

     IF file exists AND has entries:
       INFORM user: "Folgende Projekt-Artefakte sind verfügbar:"

       EXTRACT: Quick Summary section
       SHOW to user:
       ```
       📦 Verfügbare Projekt-Artefakte:
       - UI: [components from Quick Summary]
       - API: [endpoints from Quick Summary]
       - Services: [services from Quick Summary]
       - Models: [models from Quick Summary]

       💡 Diese können in der neuen Spec wiederverwendet werden.
       ```

       USE: Knowledge context for requirements dialog
       - Suggest reuse of existing components when relevant
       - Reference existing APIs when discussing integrations
       - Follow established patterns from knowledge

     ELSE IF file doesn't exist OR empty:
       NOTE: "Noch keine Projekt-Artefakte vorhanden (wird nach erster Spec-Fertigstellung gefüllt)"

  3. INITIAL questions to user:
     - What is the feature? (user's perspective)
     - Who needs it? (target users)
     - Why is it valuable? (business value)
     - What problem does it solve?

  4. ITERATIVE clarification (CONTINUE until complete):
     - What are the edge cases?
     - Where does this feature affect the system? (explore dependencies)
     - What existing features/components are related?
     - What should happen in error scenarios?
     - What is IN scope? What is OUT of scope?
     - Are there permissions/security considerations?
     - Are there performance requirements?

  5. DEEP-DIVE based on complexity:
     - If complex: Ask follow-up about integration points
     - If affects multiple components: Map the relationships
     - If unclear: Request examples or use cases
     - If risky: Discuss mitigation strategies

  6. CONTINUE asking questions until:
     - All aspects are clear
     - Dependencies are mapped
     - Edge cases are identified
     - User confirms "no more questions"
</mandatory_actions>

<instructions>
  ACTION: Engage in dialog with user
  FORMAT: Ask questions one section at a time
  WAIT: For user answers before proceeding
  PROBE: Deeper into unclear areas
  DOCUMENT: Keep track of all answers
  STOP: Only when user says requirements are complete
</instructions>

</substep>

<substep number="2.2" name="clarification_document">

### Step 2.2: Create Clarification Document

Before generating user stories, create a summary document for user approval.

<mandatory_actions>
  1. DELEGATE to date-checker via Task tool (model="haiku") to get current date (YYYY-MM-DD)

  2. Create spec folder: specwright/specs/YYYY-MM-DD-spec-name/

  3. CREATE requirements-clarification.md:

     <clarification_template>
       # Requirements Clarification - [SPEC_NAME]

       **Created:** [DATE]
       **Status:** Pending User Approval

       ## Feature Overview
       [1-2 sentence summary of the feature]

       ## Target Users
       [Who will use this feature]

       ## Business Value
       [Why this feature matters]

       ## Functional Requirements
       [List of WHAT the feature should do - user-facing]

       ## Affected Areas & Dependencies
       [Where this feature impacts the system]
       - [Component 1] - [Impact description]
       - [Component 2] - [Impact description]
       - [External System] - [Integration point]

       ## Edge Cases & Error Scenarios
       [What happens when things go wrong]
       - [Edge case 1] - [Expected behavior]
       - [Edge case 2] - [Expected behavior]

       ## Security & Permissions
       [Who can access what]

       ## Performance Considerations
       [Any performance requirements]

       ## Scope Boundaries
       **IN SCOPE:**
       - [Item 1]
       - [Item 2]

       **OUT OF SCOPE:**
       - [Item 1]
       - [Item 2]

       ## Open Questions (if any)
       - [Question 1]
       - [Question 2]

       ## Proposed User Stories (High Level)
       [List of story titles with brief descriptions - NOT full stories yet]
       1. [Story 1 Title] - [Brief description]
       2. [Story 2 Title] - [Brief description]
       3. [Story 3 Title] - [Brief description]

       ---
       *Review this document carefully. Once approved, detailed user stories will be generated.*
     </clarification_template>

  4. PRESENT clarification document to user
  5. OPEN document preview via MCP tool `document_preview_open`:
     - filePath: "specwright/specs/[YYYY-MM-DD-spec-name]/requirements-clarification.md"
     - This shows the clarification document in the sidebar so the user can review it while answering
</mandatory_actions>

</substep>

<substep number="2.3" name="user_approval">

### Step 2.3: User Approval

<mandatory_actions>
  1. ASK user via AskUserQuestion:

     ```
     Question: "I've created a Requirements Clarification document based on our discussion.
                Please review it before I generate the detailed user stories."

     Options:
     1. Approve & Generate Stories
        → Requirements are correct
        → Proceed to generate full user stories

     2. Request Changes
        → Need to modify the clarification
        → I'll update based on your feedback

     3. Continue Discussion
        → Need to explore more aspects
        → Return to dialog mode
     ```

  2. BASED on user choice:
     - If "Approve":
       - CLOSE document preview via MCP tool `document_preview_close`
       - ASK user via AskUserQuestion:
         ```
         Phase 1 complete! Requirements clarification approved.
         Saved to: specwright/specs/[YYYY-MM-DD-spec-name]/requirements-clarification.md

         How would you like to proceed?
         ```
         Options:
         1. "Continue in this session" - Proceed directly to Implementation Plan
         2. "Clear context and resume" - Stop here, free up context for optimal planning quality
       - If "Continue in this session":
         - Proceed to Step 2.5 (Implementation Plan)
       - If "Clear context and resume":
         - PRESENT resume instructions:
           ```
           To resume with a fresh context:
           1. Run /clear
           2. Then run: /specwright:create-spec specwright/specs/[YYYY-MM-DD-spec-name]/

           The workflow will automatically detect Phase 1 is complete and continue with the Implementation Plan.
           ```
         - STOP workflow execution here (do NOT proceed to Step 2.5)
     - If "Request Changes": Update clarification, re-ask approval
     - If "Continue": Return to Step 2.1 with focused questions
</mandatory_actions>

</substep>

<substep number="2.3.1" name="down_sizing_detection">

### Step 2.3.1: Down-Sizing Detection (v3.9 - Advisory)

**Purpose:** Analyze approved requirements to detect if the feature is small enough for /add-todo
or an S-Spec, preventing unnecessary overhead for simple features.

⚠️ **This is ADVISORY only - the user always decides.**

<mandatory_actions>
  1. ANALYZE the approved requirements-clarification.md:

     EXTRACT metrics:
     - proposed_stories: Count of items in "Proposed User Stories" section
     - func_reqs: Count of items in "Functional Requirements" section
     - affected_areas: Count of items in "Affected Areas & Dependencies" section
     - is_single_layer: true if all affected areas are in same layer (Frontend-only OR Backend-only)

  2. CALCULATE Advisory Score:
     ```
     Score = 0
     IF proposed_stories <= 2:    Score += 3
     IF func_reqs <= 3:           Score += 2
     IF affected_areas <= 1:      Score += 2
     IF is_single_layer:          Score += 1
     ```

  3. APPLY decision:

     **IF Score 0-3 (APPROPRIATE for /create-spec):**
       LOG: "Feature size appropriate for /create-spec - continuing"
       PROCEED: To Step 2.5 (Implementation Plan) - or Step 2.6 if S-Spec

     **IF Score 4-6 (MODERATE - Advisory):**
       INFORM user:
       ```
       Advisory: This feature appears relatively small based on the requirements analysis.

       Metrics:
       - Proposed stories: [N]
       - Functional requirements: [N]
       - Affected areas: [N]
       - Single layer: [yes/no]
       - Advisory Score: [N]/8

       You have 3 options:
       ```

       ASK user via AskUserQuestion:
       Options:
       1. "Switch to /add-todo" - Lightweight task, minimal overhead
       2. "Continue as S-Spec" - Spec with simplified process (no implementation plan, simplified DoR)
       3. "Continue as full M-Spec" - Standard /create-spec process

       IF "Switch to /add-todo":
         INFORM: "Switching to /add-todo. The task description will be used as starting point."
         INVOKE: /add-todo with feature description
         STOP: This workflow

       IF "Continue as S-Spec":
         SET: SPEC_TIER = "S"
         LOG: "S-Spec: Implementation Plan will be skipped, DoR simplified"
         PROCEED: To Step 2.6 (skip Step 2.5)

       IF "Continue as full M-Spec":
         SET: SPEC_TIER = "M"
         PROCEED: To Step 2.5 (Implementation Plan)

     **IF Score 7+ (STRONG recommendation for /add-todo):**
       INFORM user:
       ```
       Strong Advisory: This feature is very small and would benefit from /add-todo instead.

       Metrics:
       - Proposed stories: [N]
       - Functional requirements: [N]
       - Affected areas: [N]
       - Advisory Score: [N]/8

       /add-todo saves significant overhead for small tasks.
       ```

       ASK user via AskUserQuestion:
       Options:
       1. "Switch to /add-todo (Recommended)" - Lightweight task
       2. "Continue as S-Spec" - Minimal spec process
       3. "Continue as full M-Spec" - Standard process

       HANDLE: Same as Score 4-6 options above

</mandatory_actions>

</substep>

<substep number="2.5" name="implementation_plan">

### Step 2.5: Implementation Plan (Kollegen-Methode mit Plan-Agenten)

⚠️ **CONDITIONAL (v3.9):** This step is SKIPPED for S-Specs.
- IF SPEC_TIER = "S": LOG "S-Spec: Implementation Plan skipped" → JUMP TO Step 2.6
- IF SPEC_TIER = "M" or "L" or not set: Continue with this step

**Ziel:** Lückenlosen Implementierungsplan erstellen, kritisch reviewen, und minimalinvasiv optimieren - BEVOR Stories geschrieben werden.

**NEU v3.2:** Delegation an spezialisierten Plan-Agenten (wie EnterPlanMode) für bessere Planungsqualität und getrennte Kontext-Fenster.

> Basierend auf bewährtem Prompt:
> "Erstelle zunächst einen lückenlosen, sorgfältig durchdachten Implementierungsplan.
> Mache dann einen kritischen Review. Solltest du auf Probleme stoßen, suche einen
> besseren Weg. Analysiere dann, wie du minimalinvasiv vorgehen kannst OHNE auf
> Features zu verzichten."

<delegation>
  <!-- Uses default model (opus) for complex planning with self-review -->
  DELEGATE to Plan Agent via Task tool:

  PROMPT:
  """
  Create a detailed implementation plan for the following feature requirements.

  ⚠️ **CRITICAL: This is a PLANNING task only!**
  - You are creating a strategic/architectural plan
  - NO implementation code, NO detailed file paths yet
  - Focus on: What components, how they connect, execution phases
  - Output: implementation-plan.md document

  **Input Context:**
  - Requirements Clarification: specwright/specs/[spec-name]/requirements-clarification.md
  - Tech Stack: specwright/product/tech-stack.md
  - Architecture: specwright/product/architecture-structure.md (if exists)

  **Step 1: Load Project Knowledge (if available)**
  TRY READ: specwright/knowledge/knowledge-index.md

  IF file exists:
    ANALYZE: Requirements and planned implementation topics
    MATCH: Against knowledge-index.md "Trigger-Keywords" column

    FOR EACH matched category:
      LOAD: specwright/knowledge/[category-file].md
      USE: For implementation planning

    INFORM user which knowledge was loaded

  **Step 2: Explore Codebase**
  BEFORE creating the plan:
  - Search for similar features already implemented
  - Identify reusable patterns and components
  - Understand existing architecture decisions
  - Check what infrastructure already exists

  **Step 3: Create Lückenlosen Implementation Plan**

  CREATE file: specwright/specs/[spec-name]/implementation-plan.md

  Use template (hybrid lookup):
  - TRY: specwright/templates/docs/implementation-plan-template.md
  - FALLBACK: ~/.specwright/templates/docs/implementation-plan-template.md

  Fill with:
  - **Executive Summary** - What is being built and why (1-2 sentences)
  - **Architecture Decisions** - Which patterns/approaches to use
  - **Component Overview** - What needs to be created/changed
  - **Implementation Phases** - Rough execution order
  - **Dependencies** - What depends on what
  - **Risks & Mitigations** - Potential problems

  IMPORTANT: NO detailed file paths or story breakdown yet!
  This is architectural/strategic, not tactical.

  **Step 4: Critical Self-Review (Kollegen-Methode)**

  Perform a critical review of your plan:

  ```
  Critical Review Checklist:

  1. COMPLETENESS
     - Are all requirements from clarification covered?
     - Are any important aspects missing?

  2. CONSISTENCY
     - Are there contradictions in the plan?
     - Do architecture decisions fit together?

  3. RISKS
     - What problems could occur?
     - Are there critical dependencies?

  4. ALTERNATIVES
     - Is there a better way?
     - What are the trade-offs?

  5. COMPONENT CONNECTIONS (CRITICAL - v2.9)
     - Is EVERY new component connected to at least one other?
     - Is EVERY connection assigned to a specific story?
     - Are there "orphaned" components without connections?
     - Are connection validations executable?

  If you find problems, suggest improvements that fulfill ALL
  requirements WITHOUT compromises.
  ```

  Connection Validation:
  ```
  FOR EACH component in "New Components" table:
    CHECK: Does this component have at least one entry in
           "Component Connections" (as Source OR Target)?

    IF NOT:
      FLAG: "Orphaned component: [NAME] - no connection defined!"
      REQUIRE: Add connection OR remove component

  FOR EACH connection in "Component Connections" table:
    CHECK: Is a "Responsible Story" specified?

    IF NOT:
      FLAG: "Connection without story: [Source] → [Target]"
      REQUIRE: Assign story
  ```

  Output: Fill `## Self-Review Results` section in the plan

  **Step 5: Minimal-Invasive Analysis**

  1. Perform codebase exploration:
     - Find existing patterns that can be reused
     - Identify similar features in the project
     - Check what infrastructure already exists

  2. Perform analysis:
  ```
  Analyze the plan for minimal invasiveness:

  1. REUSE
     - Which existing code can be used?
     - Which patterns already exist in the project?

  2. CHANGE SCOPE
     - Which changes are really necessary?
     - What can be avoided?

  3. FEATURE PRESERVATION (CRITICAL!)
     - Validate: NO feature is sacrificed!
     - Every optimization must preserve all requirements

  Optimize the plan based on your findings.
  Document each optimization with rationale.
  ```

  3. Output: Fill `## Minimal-Invasive Optimizations` section in the plan

  4. Feature-Preservation Checklist:
     - [ ] All requirements from clarification are covered
     - [ ] No feature was sacrificed
     - [ ] All acceptance criteria remain achievable

  **Step 6: Mark Plan as Ready for Review**

  Set status in implementation-plan.md to "PENDING_USER_REVIEW"
  """

  WAIT for Plan Agent completion
  RECEIVE:
    - specwright/specs/[spec-name]/implementation-plan.md (complete with self-review and optimizations)

</delegation>

<mandatory_actions>

#### Step 2.5.1 - Plan Agent Results verarbeiten

**Input:** Vom Plan-Agenten erstellter `implementation-plan.md`

1. VERIFY plan exists and contains all required sections:
   - Executive Summary
   - Architecture Decisions
   - Component Overview
   - Component Connections table (v2.9)
   - Implementation Phases
   - Self-Review Results
   - Minimal-Invasive Optimizations

2. INFORM user about plan creation:
   ```
   ✅ Der Plan-Agent hat einen detaillierten Implementation Plan erstellt.
   Der Plan enthält:
   - Architektur-Entscheidungen
   - Komponenten-Übersicht mit Verbindungen
   - Umsetzungsphasen
   - Kritischen Self-Review
   - Minimalinvasiv-Optimierungen
   ```

#### Step 2.5.2 - User Review (mit Editor-Option)

1. PRESENT den Implementation Plan dem User
2. OPEN document preview via MCP tool `document_preview_open`:
   - filePath: "specwright/specs/[spec-name]/implementation-plan.md"
   - This shows the implementation plan in the sidebar so the user can review it while answering

3. ASK user via AskUserQuestion:
   ```
   Question: "Der Plan-Agent hat einen Implementation Plan erstellt. Der Plan enthält
              Self-Review und Minimalinvasiv-Optimierungen."

   Options:
   1. Plan genehmigen
      → Weiter zu Step 2.6 (Story-Generierung aus Plan)

   2. Im Editor öffnen
      → Ich zeige dir den Dateipfad
      → Du bearbeitest die Datei
      → Sage 'fertig' wenn du bereit bist

   3. Änderungen besprechen
      → Beschreibe die gewünschten Anpassungen
      → Ich aktualisiere den Plan

   4. Zurück zur Clarification
      → Fundamentale Anforderungsänderungen nötig
      → Zurück zu Step 2.1
   ```

4. BASED on user choice:
   - If "Plan genehmigen":
     - Set Status: APPROVED
     - CLOSE document preview via MCP tool `document_preview_close`
     - Proceed to Step 2.6

   - If "Im Editor öffnen":
     - SHOW: "Der Plan liegt unter: specwright/specs/[spec-name]/implementation-plan.md"
     - INFORM: "Öffne die Datei, bearbeite sie, und sage 'fertig' wenn du bereit bist"
     - WAIT for user confirmation
     - READ plan again
     - VALIDATE changes preserve all requirements
     - Re-ask approval

   - If "Änderungen besprechen":
     - COLLECT user feedback
     - UPDATE plan accordingly
     - For significant changes: Re-delegate to Plan Agent for revised plan
     - Re-ask approval

   - If "Zurück zur Clarification":
     - RETURN to Step 2.1

</mandatory_actions>

<instructions>
  ACTION: Delegate to Plan Agent for implementation planning
  WAIT: For plan agent to complete with self-review and optimizations
  VERIFY: Plan contains all required sections
  PRESENT: To user with edit options
  REDELEGATE: To Plan Agent if significant changes requested
  REFERENCE: specwright/standards/plan-review-guidelines.md
</instructions>

**Output:**
- `specwright/specs/[spec-name]/implementation-plan.md` (APPROVED)

</substep>

<substep number="2.6" name="generate_stories">

### Step 2.6: Generate User Stories from Implementation Plan

<mandatory_actions>
  **Input:**
  - Genehmigter `implementation-plan.md` (aus Step 2.5)
  - `requirements-clarification.md` (als Referenz für Akzeptanzkriterien)

  **Story-Ableitung aus Plan:**
  Der Implementation Plan definiert die Phasen und Komponenten.
  Jede Phase/Komponente wird zu einer oder mehreren Stories.

  **Mapping:**
  | Plan-Element | Story-Typ |
  |--------------|-----------|
  | Neue Komponente | Feature Story |
  | Änderung an Bestehendem | Enhancement Story |
  | Integration zwischen Komponenten | Integration Story |
  | Kritisches Risiko | Spike/Research Story |

  1. USE date-checker to get current date (YYYY-MM-DD) - if not already done

  2. CREATE spec folder structure (if not already exists):
     ```
     specwright/specs/YYYY-MM-DD-spec-name/
     ├── stories/              # NEW: Individual story files
     │   ├── story-001-[slug].md
     │   ├── story-002-[slug].md
     │   └── ...
     ├── spec.md
     ├── spec-lite.md
     ├── story-index.md       # Human-readable story overview
     ├── kanban.json          # NEW v3.3: Machine-readable kanban (Single Source of Truth)
     └── requirements-clarification.md
     ```

  3. CREATE spec.md (load template with hybrid lookup):
     - Overview (1-2 sentences goal)
     - User stories list
     - Spec scope (what's included)
     - Out of scope (what's excluded)
     - Expected deliverable (testable outcomes)
     - **Integration Requirements** (NEW - critical for end-to-end validation):
       * Integration Type: Backend-only, Frontend-only, or Full-stack
       * Integration Test Commands (bash commands to run)
       * End-to-End Scenarios (user journeys to validate)
       * For each test: mark if MCP tool required (e.g., Playwright)

  **INTEGRATION REQUIREMENTS GUIDELINES:**
  - If spec has Backend + Frontend stories: Integration Type = "Full-stack"
  - If spec only affects one layer: Integration Type = "Backend-only" or "Frontend-only"
  - Include at least 1-2 integration tests that verify the complete feature works
  - Integration tests should be bash commands that exit 0 if successful
  - Mark Playwright/browser tests with "Requires MCP: yes" (they will be optional)
  - These tests will be executed automatically via System Story 998 during execute-tasks

  4. CREATE spec-lite.md (load template with hybrid lookup):
     - 1-3 sentence summary of core goal

  5. CREATE stories/ directory

  6. CREATE individual story files (stories/story-XXX-[slug].md):
     FOR EACH story derived from Implementation Plan phases/components:
     - Generate story ID: [SPEC_PREFIX]-### (e.g., PROF-001, PROF-002)
     - Create file: stories/story-###-[slug].md
       where [slug] = title lowercase with hyphens
     - Use template: specwright/templates/docs/story-template.md
     - Fill with FACHLICHE content im **GHERKIN-STYLE**:

       **Feature-Block (Pflicht):**
       ```gherkin
       Feature: [Feature-Name]
         Als [User-Rolle]
         möchte ich [Aktion],
         damit [Nutzen/Wert].
       ```

       **Akzeptanzkriterien als Gherkin-Szenarien (Pflicht):**
       - Schreibe 2-5 Szenarien im Given-When-Then Format
       - Ein Verhalten pro Szenario (fokussiert & testbar)
       - Verwende konkrete Werte ("100€" nicht "einen Betrag")
       - Schreibe aus Nutzer-Perspektive (keine technischen Details)
       - Beschreibe WAS passiert, nicht WIE
       - Max. 2-3 "And"-Schritte pro Abschnitt
       - Inkludiere mindestens 1 Edge-Case/Fehlerszenario

       **Gherkin-Beispiel:**
       ```gherkin
       Scenario: Erfolgreicher Login mit gültigen Zugangsdaten
         Given ich bin auf der Login-Seite
         And ich bin ein registrierter Benutzer mit Email "max@example.com"
         When ich meine Zugangsdaten eingebe
         And ich die Anmeldung bestätige
         Then sehe ich mein persönliches Dashboard
         And ich bin für 24 Stunden eingeloggt

       Scenario: Login schlägt fehl bei falschem Passwort
         Given ich bin auf der Login-Seite
         When ich ein falsches Passwort eingebe
         Then sehe ich eine Fehlermeldung "Ungültige Zugangsdaten"
         And ich kann es erneut versuchen
       ```

       **Anti-Patterns (VERMEIDEN):**
       - ❌ "Given ich navigiere zu /login.html" (technisch)
       - ❌ "When ich auf den Button mit id='submit' klicke" (Implementation)
       - ❌ Mehrere unabhängige Tests in einem Szenario
       - ❌ Vage Beschreibungen ohne konkrete Werte

       **Scenario Outline für Variationen:**
       ```gherkin
       Scenario Outline: Validierung von Eingabefeldern
         Given ich bin im Registrierungsformular
         When ich <feld> mit "<wert>" ausfülle
         Then sehe ich <ergebnis>

         Examples:
           | feld     | wert           | ergebnis                    |
           | Email    | ungültig       | "Bitte gültige Email"       |
           | Email    | test@valid.com | keine Fehlermeldung         |
           | Passwort | 123            | "Mindestens 8 Zeichen"      |
       ```

       * Business value explanation
       * Required MCP Tools (if applicable)
     - Leave technical sections EMPTY (filled in Step 3):
       * DoR/DoD checkboxes (unchecked)
       * WAS/WIE/WO fields
       * Technische Verifikation (FILE_EXISTS, etc.)
       * Completion Check commands

  7. CREATE story-index.md (load template with hybrid lookup):
     - Use template: specwright/templates/docs/story-index-template.md
     - Fill with:
       * Story Summary table (all stories)
       * Dependency Graph (initially all "None")
       * Execution Plan (initially all parallel)
       * List of story files
       * Blocked Stories section (initially empty)

  8. **SPEC TIER CLASSIFICATION (v3.9):**

     CALCULATE business_story_count:
     - COUNT all stories generated above
     - SUBTRACT system stories (997, 998, 999) from count

     CLASSIFY Spec Tier:
     - IF business_story_count <= 2: SPEC_TIER = "S"
     - IF business_story_count >= 3 AND <= 5: SPEC_TIER = "M"
     - IF business_story_count >= 6: SPEC_TIER = "L"

     NOTE: If SPEC_TIER was already set in Step 2.3.1, validate consistency:
     - If user chose "S-Spec" but stories > 2: WARN and ask user to confirm or upgrade to M
     - If not set yet: Use calculated tier

     INFORM user:
     ```
     Spec Tier: [S/M/L] ([business_story_count] business stories)

     What this means:
     - S-Spec: Simplified DoR (4 checks), story-998 conditional, no story-index.md
     - M-Spec: Standard process (no changes)
     - L-Spec: cross-cutting-decisions.md mandatory, sub-spec splitting advisory if >8 stories
     ```

     ASK user if they want to override (up or down):
     - "Keep [TIER]" (default)
     - "Override to [other tier]"

     **L-Spec Advisory (>8 stories):**
     IF business_story_count > 8 AND SPEC_TIER = "L":
       INFORM user:
       ```
       Advisory: This spec has [N] stories. Consider splitting into sub-specs
       for better context efficiency during execution. Each sub-spec can be
       executed independently with /execute-tasks.
       ```

  8.1 **CONDITIONAL ARTIFACTS (v3.9):**

     **story-index.md:**
     - S-Spec: SKIP story-index.md creation (only 1-2 stories, kanban.json is sufficient)
     - M/L-Spec: Create as usual (see point 7 above)

     **spec.md:**
     - S-Spec: Simplified spec.md (Overview + Scope only, no Multi-Phase Roadmap)
     - M/L-Spec: Full spec.md as usual

     **cross-cutting-decisions.md:**
     - S-Spec: SKIP (not needed for 1-2 stories)
     - M-Spec: Optional (as before)
     - L-Spec: MANDATORY (must be created even if no obvious cross-cutting concerns)

  8.2 CREATE kanban.json (Single Source of Truth for /execute-tasks):
     - Use template: specwright/templates/json/spec-kanban-template.json
     - Fill with:
       * spec.id = folder name (YYYY-MM-DD-spec-name)
       * spec.name = human-readable name
       * spec.prefix = derived from spec name (e.g., "WSD" from "Workflow Specific Documents")
       * spec.specTier = SPEC_TIER (S/M/L)
       * stories[] = array of story objects with:
         - id: PREFIX-NNN (e.g., WSD-001)
         - title: story title
         - slug: url-safe title
         - classification: { type, priority, effort, complexity }
         - dependencies: [] (initially empty)
         - status: "ready" (or "blocked" if missing DoR)
         - dorStatus: "ready" or "incomplete"
         - storyFile: relative path to story MD
         - timing: { createdAt, updatedAt }
         - implementation: { filesModified: [], testsAdded: [], commits: [] }
         - verification: { dorChecked: false, dodChecked: false }
       * boardStatus = calculated from stories
       * statistics = calculated (totalEffort, byType, byPriority)
       * executionPlan.phases = derived from implementation-plan.md phases
       * changeLog = initial entry "Kanban created from /create-spec"

     REPLACE placeholders:
       - {{SPEC_TIER}} → SPEC_TIER value (S/M/L)
       - Other placeholders as before

     TEMPLATE LOOKUP (hybrid):
       1. TRY READ: specwright/templates/json/spec-kanban-template.json
       2. IF file not found or error:
          READ: ~/.specwright/templates/json/spec-kanban-template.json
       3. IF still not found: Error - run setup-devteam-global.sh

  Templates (hybrid lookup - MUST TRY BOTH):
  FOR EACH template needed (story-template.md, story-index-template.md, spec-kanban-template.json, etc.):
    1. TRY READ: specwright/templates/[docs|json]/[template]
    2. IF file not found or error:
       READ: ~/.specwright/templates/[docs|json]/[template]
    3. IF still not found: Error - run setup-devteam-global.sh

  STORY SIZING:
  - Keep stories small (max 5 files, max 400 LOC)
  - Automated validation occurs in Step 3.5
  - Full guidelines: specwright/docs/story-sizing-guidelines.md

  ACCEPTANCE CRITERIA FORMAT:

  **Fachliche Kriterien (PO schreibt - Gherkin-Style):**
  - Schreibe Akzeptanzkriterien als Gherkin-Szenarien (Given-When-Then)
  - Ein Verhalten pro Szenario
  - Konkrete Werte, Nutzer-Perspektive, deklarativ
  - Min. 2 Szenarien, inkl. mindestens 1 Edge-Case

  **Technische Verifikation (Architect ergänzt später):**
  - Use prefix format: FILE_EXISTS:, CONTAINS:, LINT_PASS:, TEST_PASS:
  - Each criterion must be verifiable via bash command
  - Include exact file paths
  - For browser tests: MCP_PLAYWRIGHT: prefix
  - Avoid MANUAL: criteria when possible

  Reference: specwright/templates/docs/story-template.md

  IMPORTANT:
  - **Stories are derived from Implementation Plan phases/components**
  - **Reference plan section in story for traceability**
  - Write ONLY fachliche (business) content
  - **USE GHERKIN-STYLE for all acceptance criteria (Given-When-Then)**
  - **Nutzer-Perspektive, keine technischen Details in Szenarien**
  - **Konkrete Werte, ein Verhalten pro Szenario**
  - NO technical details (WAS/WIE/WO) - filled in Step 3
  - NO DoR/DoD (filled in Step 3)
  - NO dependencies (Architect adds this in Step 3)
  - NO technical verification (FILE_EXISTS, etc.) - Architect adds this
  - Focus on WHAT user needs, not HOW to implement
  - Stories must be small enough for single Claude Code session
  - Each story gets its OWN file for better context efficiency
  - **Story grouping follows Implementation Plan phases**

  **INTEGRATION REQUIREMENTS (v2.9 - KRITISCH):**
  - CHECK: "Komponenten-Verbindungen" section in implementation-plan.md
  - FOR EACH story that is "Zuständige Story" for a connection:
    - ADD to story metadata: `Integration: [Source] → [Target]`
    - This will be used by Architect to add Integration-DoD items
  - Stories with integration responsibility MUST connect components, not just create them

  9. ASK user via AskUserQuestion (v3.7):
     ```
     Phase 2 complete! Implementation plan approved and [N] stories generated.

     Saved to: specwright/specs/[YYYY-MM-DD-spec-name]/
     - implementation-plan.md (approved)
     - spec.md, spec-lite.md
     - story-index.md, kanban.json
     - stories/ ([N] story files, fachlich only)

     The next phase (Technical Refinement) processes every story individually
     and benefits greatly from a fresh context window.

     How would you like to proceed?
     ```
     Options:
     1. "Clear context and resume (Recommended)" - Stop here, free up context for Technical Refinement
     2. "Continue in this session" - Proceed directly to Technical Refinement
     - If "Clear context and resume":
       - PRESENT resume instructions:
         ```
         To resume with a fresh context:
         1. Run /clear
         2. Then run: /specwright:create-spec specwright/specs/[YYYY-MM-DD-spec-name]/

         The workflow will automatically detect Phase 2 is complete and continue with Technical Refinement.
         ```
       - STOP workflow execution here (do NOT proceed to next phase)
     - If "Continue in this session":
       - Proceed to next phase (Technical Refinement)
</mandatory_actions>

</substep>

**Output:**
- `specwright/specs/YYYY-MM-DD-spec-name/requirements-clarification.md` (approved)
- `specwright/specs/YYYY-MM-DD-spec-name/implementation-plan.md` (approved - from Step 2.5)
- `specwright/specs/YYYY-MM-DD-spec-name/spec.md`
- `specwright/specs/YYYY-MM-DD-spec-name/spec-lite.md`
- `specwright/specs/YYYY-MM-DD-spec-name/story-index.md` (human-readable)
- `specwright/specs/YYYY-MM-DD-spec-name/kanban.json` (NEW v3.3 - Single Source of Truth)
- `specwright/specs/YYYY-MM-DD-spec-name/stories/story-001-[slug].md` (fachlich only, derived from plan)
- `specwright/specs/YYYY-MM-DD-spec-name/stories/story-002-[slug].md` (fachlich only, derived from plan)
- ... (one file per story, grouped by plan phases)

</step>

<step number="3" name="architect_technical_refinement">

### Step 3: Architect Phase - Technical Refinement (v3.5)

Main agent does technical refinement guided by architect-refinement skill.

<refinement_process>
  LOAD skill (hybrid lookup):
    1. TRY: .claude/skills/architect-refinement/SKILL.md
    2. FALLBACK: ~/.specwright/templates/skills/architect-refinement/SKILL.md
    3. IF both fail: WARN user to run /build-development-team first
  (This skill provides guidance for technical refinement)

  **Context to load:**
  - Spec: specwright/specs/[YYYY-MM-DD-spec-name]/spec.md
  - Implementation Plan: specwright/specs/[YYYY-MM-DD-spec-name]/implementation-plan.md
  - Story Index: specwright/specs/[YYYY-MM-DD-spec-name]/story-index.md
  - Story Files: specwright/specs/[YYYY-MM-DD-spec-name]/stories/*.md
  - Tech Stack: specwright/product/tech-stack.md
  - Architecture Decision: specwright/product/architecture-decision.md (if exists)
  - Architecture Structure: specwright/product/architecture-structure.md (if exists)
  - DoD: specwright/team/dod.md (if exists, otherwise use standard DoD)
  - DoR: specwright/team/dor.md (if exists, otherwise use standard DoR)

  **Available Skills (auto-discovery):**
  - Skills are located in `.claude/skills/[name]/SKILL.md`
  - List available skills: `ls .claude/skills/`
  - Select 1-3 relevant skills per story based on story content

  **Tasks (guided by architect-refinement skill):**

  1. LIST all story files: ls specwright/specs/[spec-name]/stories/

  2. FOR EACH story file in stories/ directory:

     a. READ the story file to understand fachliche requirements

     b. **PRE-REFINEMENT LAYER ANALYSIS (NEU - PFLICHT):**
        BEFORE filling technical sections, analyze affected layers:

        i. EXTRACT from story:
           - User Story (wer, was, warum)
           - Akzeptanzkriterien (fachlich)
           - Story Type (Frontend/Backend/DevOps/Test)

        ii. ANALYZE affected layers:
           ```
           Layer Analysis Checklist:
           - [ ] Frontend (UI, Components, JavaScript/TypeScript)
           - [ ] Backend (API, Services, Controller, Logic)
           - [ ] Database (Schema, Queries, Migrations)
           - [ ] External APIs (Integrations, Third-Party)
           - [ ] DevOps (Build, Deploy, Config, Environment)
           - [ ] Security (Auth, Permissions, Validation)
           ```

        iii. FOR EACH affected layer:
           Document:
           - WHY affected (impact description)
           - WHAT touch points (specific components/files)
           - HOW connected to other layers (integration points)

        iv. DETERMINE Integration Type:
           - IF only 1 layer affected: "[Layer]-only"
           - IF 2+ layers affected: "Full-stack"

        v. IF Integration Type = "Full-stack":
           FLAG: Story for additional validation
           DOCUMENT: All critical integration points
           ENSURE: WO section will cover ALL layers
           CONSIDER: If story should be split by layer

     c. FIND the '## Technisches Refinement (vom Architect)' section
        (This section should already exist but be EMPTY/incomplete)

     d. FILL IN the following sections:

        **DoR (Definition of Ready):**

        **v3.9: DoR is tier-aware. Read SPEC_TIER from kanban.json (default "M").**

        **S-Spec DoR (simplified - 4 checkboxes):**
        - [x] Fachliche Requirements klar
        - [x] Technischer Ansatz definiert (WAS/WIE/WO)
        - [x] Betroffene Dateien identifiziert
        - [x] Story passend dimensioniert
        SKIP: Full-Stack Konsistenz checks (unless Integration Type = "Full-stack")

        **M/L-Spec DoR (standard - full checkboxes):**
        - Mark ALL checkboxes as [x] complete when done
        - Fachliche requirements clear
        - Technical approach defined
        - Dependencies identified
        - Affected components known
        - Required MCP Tools documented (if applicable)
        - Story is appropriately sized (max 5 files, 400 LOC)
        - **Full-Stack Konsistenz:**
          - [x] Alle betroffenen Layer identifiziert
          - [x] Integration Type bestimmt
          - [x] Kritische Integration Points dokumentiert (wenn Full-stack)
          - [x] WO deckt ALLE Layer ab (wenn Full-stack)

        **DoD (Definition of Done):**
        - Define completion criteria (all start unchecked [ ])
        - Code implemented and follows Style Guide
        - Architecture requirements met
        - Security/Performance requirements satisfied
        - All acceptance criteria met
        - Tests written and passing
        - Code review approved
        - Documentation updated
        - No linting errors
        - Completion Check commands successful

        **Integration DoD (v2.9 - wenn Story Verbindung herstellt):**
        CHECK: Hat diese Story einen "Integration:" Eintrag in der Metadata?
        CHECK: Ist diese Story "Zuständige Story" für eine Verbindung im Plan?

        IF YES:
          READ: implementation-plan.md "Komponenten-Verbindungen" section
          EXTRACT: Die Verbindung(en) für die diese Story zuständig ist

          ADD Integration-DoD items:
          - [ ] **Integration hergestellt: [Source] → [Target]**
            - [ ] Import/Aufruf existiert in Code
            - [ ] Verbindung ist funktional (nicht nur Stub)
            - [ ] Validierung: `[Validierungsbefehl aus Plan]`

          ADD to Completion Check:
          ```bash
          # Integration Validation
          [Validierungsbefehl aus Plan, z.B.:]
          grep -q "import.*ServiceName" src/path/to/file.ts && echo "✓ Import exists"
          ```

          **WICHTIG:** Diese Story ist NICHT done, wenn nur Code existiert.
          Die Verbindung muss AKTIV hergestellt und validiert sein!

        **Betroffene Layer & Komponenten (NEU - PFLICHT):**

        Based on Pre-Refinement Layer Analysis, fill out:

        - **Integration Type:** [Backend-only / Frontend-only / Full-stack]

        - **Betroffene Komponenten Table:**
          | Layer | Komponenten | Änderung |
          |-------|-------------|----------|
          | Frontend | [components/files] | [what changes] |
          | Backend | [services/controllers] | [what changes] |
          | Database | [tables/schema] | [what changes] |
          | DevOps | [config/pipeline] | [what changes] |

        - **Kritische Integration Points (if Full-stack):**
          - [Source] → [Target] (e.g., "Backend API Response → Frontend UserProfile")
          - [Source] → [Target] (e.g., "Database Schema Change → Backend Query Update")

        - **Handover-Dokumente (if Multi-Layer):**
          - API Contracts: [Define or reference]
          - Data Structures: [Define or reference]
          - Shared Types: [Define or reference]

        ⚠️ **WICHTIG:** If Integration Type = "Full-stack":
           - WO section MUST cover ALL affected layers
           - EVERY Integration Point must have source AND target in WO
           - Consider splitting story if >5 files across multiple layers

        **Technical Details:**

        **WAS:** [What components/features need to be created or modified - NO code]

        **WIE (Architecture Guidance ONLY):**
        - Which architectural patterns to apply (e.g., "Use Repository Pattern", "Apply Service Object")
        - Constraints to respect (e.g., "No direct DB calls from controllers", "Must use existing AuthService")
        - Existing patterns to follow (e.g., "Follow pattern from existing UserController")
        - Security/Performance considerations (e.g., "Requires rate limiting", "Use caching")

        ⚠️ IMPORTANT: NO implementation code, NO pseudo-code, NO detailed algorithms.
        The implementer decides HOW to write the code - you only set guardrails.

        **WO:** [Which files/folders to modify or create - paths only, no content]
        ⚠️ MUST cover ALL layers from "Betroffene Komponenten" table!
        ⚠️ MUST include BOTH source AND target files for each Integration Point!

        **Abhängigkeiten:** [Story IDs this depends on, or "None"]

        **Geschätzte Komplexität:** [XS/S/M/L/XL]

        **Relevante Skills:** (v3.5 - auto-discovery from .claude/skills/)
        ANALYZE: Story content (WAS, user story, technical scope)
        LIST: Available skills via `ls .claude/skills/`
        SELECT: 1-3 most relevant skills

        | Skill | Pfad | Grund |
        |-------|------|-------|
        | [skill-name] | .claude/skills/[skill]/SKILL.md | [Why this skill is relevant] |

        Example selections:
        - Backend service story → backend-logic-implementing, backend-test-engineering
        - Frontend component story → frontend-ui-component-architecture, frontend-state-management
        - API integration story → backend-integration-adapter, frontend-api-bridge-building
        - Database story → backend-persistence-adapter
        - DevOps story → devops-pipeline-engineering, devops-infrastructure-provisioning

        **Creates Reusable Artifacts:** (v3.1 - FILL for Project Knowledge)
        ANALYZE: Does this story create artifacts that other stories might reuse?

        **Criteria for "Creates Reusable: yes":**
        - New UI components (Button, Input, Modal, etc.)
        - New shared services (AuthService, ApiClient, etc.)
        - New hooks/utilities (useAuth, formatDate, etc.)
        - New API endpoints that will be called by other features
        - New data models/types that will be used elsewhere

        **Criteria for "Creates Reusable: no":**
        - Page-specific components (UserProfilePage, etc.)
        - Bug fixes
        - Configuration changes
        - One-time features

        IF "Creates Reusable: yes":
          FILL "Reusable Artifacts" table in story:
          | Artefakt | Typ | Pfad | Beschreibung |
          |----------|-----|------|--------------|
          | [Name] | [UI/API/Service/Model] | [Path] | [Brief description] |

          These artifacts will be added to Project Knowledge after spec completion.

        **Completion Check:**
        ```bash
        # Auto-Verify Commands - all must exit with 0
        [VERIFY_COMMAND_1]
        [VERIFY_COMMAND_2]
        ```

        **Story ist DONE wenn:**
        1. Alle FILE_EXISTS/CONTAINS checks bestanden
        2. Alle *_PASS commands exit 0
        3. Git diff zeigt nur erwartete Änderungen

     d. UPDATE the story file with filled technical sections (including Relevante Skills)

     e. UPDATE story-index.md:
        - Mark story status as "Ready" if DoR is complete
        - Mark story status as "Blocked" if DoR is incomplete
        - Update Dependencies column
        - Update Type column (Backend/Frontend/DevOps/Test)

  3. AFTER all stories are refined:

     a. ANALYZE dependencies across ALL stories:
        - Can stories run in parallel?
        - Must some finish before others start?
        - Document dependency chain

     b. UPDATE story-index.md:
        - Update Dependency Graph
        - Update Execution Plan (parallel vs sequential)
        - Update Total Estimated Effort

     c. For dependent stories, note required handover documents:
        - API contracts
        - Data structures
        - Integration points

  4. EVALUATE cross-cutting concerns:
     - New external dependencies?
     - Global technical patterns needed?
     - Security patterns?
     - Performance requirements?

     **Tier-aware rules (v3.9):**
     - S-Spec: SKIP cross-cutting-decisions.md
     - M-Spec: Create IF cross-cutting concerns identified (optional, as before)
     - L-Spec: MANDATORY - always create cross-cutting-decisions.md

     If YES (or L-Spec), create:
     specwright/specs/[spec-name]/sub-specs/cross-cutting-decisions.md

     Include:
     - External dependencies (with justification)
     - Global patterns (auth, error handling)
     - Performance requirements
     - Security patterns

  5. ⚠️ **SYSTEM STORIES REQUIREMENT** (v3.0, updated v3.9 for Tier-Awareness):

     **Create system stories at the END of EVERY spec (tier-aware):**

     These stories are executed AFTER all regular stories are done.

     READ: SPEC_TIER from kanban.json (default "M")
     READ: Integration Type from stories (any "Full-stack" story?)

     <system_story_generation>

       ### story-997: Code Review (ALWAYS created - all tiers)

       CREATE: specwright/specs/[SPEC_NAME]/stories/story-997-code-review.md

       **TEMPLATE LOOKUP (Hybrid):**
       1. Local: specwright/templates/docs/system-story-997-code-review-template.md
       2. Global: ~/.specwright/templates/docs/system-story-997-code-review-template.md

       FILL placeholders:
       - [SPEC_PREFIX] → Spec prefix (e.g., PROF)
       - [SPEC_NAME] → Full spec name
       - [CREATED_DATE] → Current date

       **Purpose:** Starkes Modell (Opus) reviewt den gesamten Feature-Diff
       **Type:** System/Review
       **Dependencies:** Alle regulären Stories dieser Spec

       ---

       ### story-998: Integration Validation (CONDITIONAL - v3.9)

       **Tier-aware creation rules:**
       - S-Spec + Single-Layer (no Full-stack stories): SKIP story-998
         - LOG: "S-Spec single-layer: story-998 (Integration Validation) skipped"
       - S-Spec + Full-stack (at least one Full-stack story): CREATE (simplified)
         - Simplified: Only smoke tests (lint + build + basic test run)
         - No full E2E or component integration tests
       - M/L-Spec: CREATE as usual (full Integration Validation)

       IF creating story-998:
         CREATE: specwright/specs/[SPEC_NAME]/stories/story-998-integration-validation.md

         **TEMPLATE LOOKUP (Hybrid):**
         1. Local: specwright/templates/docs/system-story-998-integration-validation-template.md
         2. Global: ~/.specwright/templates/docs/system-story-998-integration-validation-template.md

         FILL placeholders:
         - [SPEC_PREFIX] → Spec prefix
         - [SPEC_NAME] → Full spec name
         - [CREATED_DATE] → Current date

         **Purpose:** Integration Tests aus spec.md ausführen
         **Type:** System/Integration
         **Dependencies:** story-997

       ---

       ### story-999: Finalize PR (ALWAYS created - all tiers)

       CREATE: specwright/specs/[SPEC_NAME]/stories/story-999-finalize-pr.md

       **TEMPLATE LOOKUP (Hybrid):**
       1. Local: specwright/templates/docs/system-story-999-finalize-pr-template.md
       2. Global: ~/.specwright/templates/docs/system-story-999-finalize-pr-template.md

       FILL placeholders:
       - [SPEC_PREFIX] → Spec prefix
       - [SPEC_NAME] → Full spec name
       - [CREATED_DATE] → Current date

       **Purpose:** User-Todos, PR, Worktree Cleanup
       **Type:** System/Finalization
       **Dependencies:**
       - IF story-998 was created: story-998
       - IF story-998 was SKIPPED: story-997 (direct dependency)

     </system_story_generation>

     UPDATE story-index.md (if created - M/L specs) to include system stories:
     - Mark them as "System" type
     - Set dependencies correctly:
       - If story-998 exists: 997 → 998 → 999
       - If story-998 skipped: 997 → 999
     - Note: They execute AFTER all regular stories

     **IMPORTANT:**
     - story-997 and story-999 are ALWAYS created (all tiers)
     - story-998 is conditional: SKIPPED for S-Spec single-layer features
     - They ensure consistent quality and process for ALL specs

  Templates (hybrid lookup):
  - story-template.md (for structure reference)
  - story-index-template.md (for index structure)
  - cross-cutting-decisions-template.md (if needed)

  IMPORTANT:
  - Add ONLY technical sections (WAS/WIE/WO/DoR/DoD)
  - Do NOT modify fachliche descriptions
  - **NO "WER" field in v3.5** (main agent implements directly)
  - **MUST mark ALL DoR checkboxes as [x] complete** when story is ready
  - Define clear DoD per story
  - Map ALL dependencies
  - **MUST select relevant skills from .claude/skills/ for each story**
  - **MUST set "Creates Reusable" field for each story** (v3.1)
  - Add Completion Check section with bash verify commands
  - Keep stories small (automated validation in Step 3.5)
  - **DoR validation will run in Step 3.4 - all checkboxes must be [x]**
  - Update story-index.md after refining each story
  - **MUST create 3 System Stories (997, 998, 999) for ALL specs** (v3.0)
  - Follow patterns from architect-refinement skill
  - Reference: specwright/docs/story-sizing-guidelines.md
  - Reference: specwright/knowledge/knowledge-index.md (for existing artifacts)

  FULL-STACK KONSISTENZ (NEU v2.5):
  - **MUST fill "Betroffene Layer & Komponenten" section for EVERY story**
  - **MUST identify Integration Type** (Backend-only/Frontend-only/Full-stack)
  - **For Full-stack stories:**
    - WO section MUST cover files from ALL affected layers
    - Integration Points MUST have source AND target files in WO
    - Consider splitting into separate stories per layer if >5 files
    - ALWAYS create Integration Story to verify cross-layer connection
  - **Validation in Step 3.5 will check:**
    - All layers from "Betroffene Komponenten" are covered in WO
    - All Integration Points have complete file coverage
    - Stories with incomplete coverage will be flagged as CRITICAL

  ARCHITECTURE GUIDANCE RULES:
  - WIE = Architectural constraints and patterns ONLY
  - NO code snippets, NO pseudo-code, NO implementation details
  - Focus on: What patterns to use, what to avoid, what to reuse
  - Let the implementer decide the actual code
  - Example GOOD: 'Use Service Object pattern, follow UserService as template'
  - Example BAD: 'Create a method that takes user_id, calls find(), then updates...'
  - If you find yourself writing code, you're doing the implementer's job
</refinement_process>

**Output:**
- `specwright/specs/[spec-name]/stories/*.md` (COMPLETE with technical refinement + skill selection)
- `specwright/specs/[spec-name]/story-index.md` (updated with dependencies and status)
- `specwright/specs/[spec-name]/sub-specs/cross-cutting-decisions.md` (optional)

</step>

<step number="3.4" name="dor_validation">

### Step 3.4: Definition of Ready (DoR) Validation

Validate that all stories have complete DoR before proceeding to execution.

<validation_process>
  LIST all story files: ls specwright/specs/[spec-name]/stories/

  FOR EACH story file in stories/ directory:
    <extract_dor_checkboxes>
      READ: The story file
      FIND: "### Technisches Refinement (vom Architect)" section
      FIND: "DoR (Definition of Ready)" subsection
      EXTRACT: All checkbox lines starting with "- [" or "- [x]"
    </extract_dor_checkboxes>

    <check_completion>
      COUNT: Total number of DoR checkboxes
      COUNT: Number of checked checkboxes [x]

      IF checked_count < total_count:
        FLAG: Story as "DoR Incomplete"
        LIST: Unchecked DoR items
        SEVERITY: Critical - Story cannot start execution
    </check_completion>
</validation_process>

<decision_tree>
  IF all stories have complete DoR:
    LOG: "✅ All stories have complete DoR - Ready for execution"
    PROCEED: To Step 3.5 (Story Size Validation)

  ELSE (stories with incomplete DoR):
    GENERATE: DoR Validation Report

    <dor_report_format>
      ⚠️ Definition of Ready Validation - INCOMPLETE

      **Stories with Incomplete DoR:**

      **Story [ID]: [Title]**
      - Total DoR items: [N]
      - Checked: [N]
      - Unchecked: [N]

      **Missing DoR Items:**
      - [ ] [Unchecked item 1]
      - [ ] [Unchecked item 2]
      - [ ] [Unchecked item 3]

      ---

      **Summary:**
      - Total stories: [N]
      - Stories with complete DoR: [N]
      - Stories with incomplete DoR: [N] ⚠️

      **IMPORTANT:** Stories with incomplete DoR cannot start execution.
      The Architect must complete all DoR items before /execute-tasks can run.
    </dor_report_format>

    PRESENT: DoR Validation Report to user

    INFORM: "All DoR checkboxes must be completed before stories can be executed.
             Incomplete DoR means stories are not ready for implementation."

    ASK user via AskUserQuestion:
    "How would you like to proceed?

    Options:
    1. Return to fix DoR
       → Complete all unchecked DoR items (guided by architect-refinement skill)
       → Validation will run again after completion

    2. Review and manually complete DoR
       → You can manually complete DoR items in story files
       → Re-run validation after edits

    3. Proceed anyway (NOT RECOMMENDED)
       → Stories with incomplete DoR will fail during execution
       → Risk: Blocked stories, missing requirements, unclear implementation"

    WAIT for user choice

    <user_choice_handling>
      IF choice = "Return to fix DoR":
        FOR EACH story file with incomplete DoR:
          1. READ the story file
          2. REVIEW the unchecked DoR items
          3. COMPLETE the required analysis/design (guided by architect-refinement skill)
          4. MARK all DoR items as [x] complete
          5. UPDATE story-index.md to mark story as 'Ready'

        REPEAT: Step 3.4 (DoR Validation)

      ELSE IF choice = "Review and manually edit":
        INFORM: "Please edit the story files in: specwright/specs/[spec-name]/stories/"
        INFORM: "Mark all DoR checkboxes as [x] complete in each story file"
        PAUSE: Wait for user to edit
        ASK: "Ready to re-validate? (yes/no)"
        IF yes:
          REPEAT: Step 3.4 (DoR Validation)
        ELSE:
          PROCEED: To Step 3.5 with warning flag

      ELSE IF choice = "Proceed anyway":
        WARN: "⚠️ Proceeding with incomplete DoR
               - Stories may be blocked during execution
               - Missing requirements may cause implementation issues
               - Architect should complete DoR before execution"

        LOG: DoR validation bypassed by user
        PROCEED: To Step 3.5
    </user_choice_handling>
</decision_tree>

<instructions>
  ACTION: Validate all DoR checkboxes are marked [x]
  CHECK: Each story file's DoR section
  REQUIRE: All checkboxes must be checked before execution
  BLOCK: Stories with incomplete DoR from starting
  REFERENCE: specwright/team/dor.md (if exists)
</instructions>

**Output:**
- DoR validation report (if issues found)
- User decision on how to proceed
- Updated story files (if DoR completed)

</step>

<step number="3.5" name="story_size_validation">

### Step 3.5: Story Size Validation

Validate that all stories comply with size guidelines to prevent mid-execution context compaction.

<validation_process>
  LIST all story files: ls specwright/specs/[spec-name]/stories/
  READ: specwright/standards/story-size-guidelines.md (for reference thresholds)

  FOR EACH story file in stories/ directory:
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
          FLAG: Story as "Too Large - File Count"
          SEVERITY: High

      CHECK: Complexity rating
        IF complexity in [M, L, XL]:
          FLAG: Story as "Too Complex"
          SEVERITY: High

      CHECK: Estimated LOC
        IF estimated_loc > 600:
          FLAG: Story as "Too Large - Code Volume"
          SEVERITY: Medium
        ELSE IF estimated_loc > 400:
          FLAG: Story as "Watch - Approaching Limit"
          SEVERITY: Low

      CHECK: Cross-layer detection (Enhanced)
        EXTRACT: "Betroffene Layer & Komponenten" section
        IF Integration Type = "Full-stack":
          CHECK: WO section covers ALL layers from "Betroffene Komponenten" table
          IF missing_layers detected:
            FLAG: Story as "Incomplete Full-Stack Coverage"
            SEVERITY: Critical
            LIST: "Missing file paths for layers: [missing_layers]"
            SUGGEST: "Add ALL layer files to WO section"
            WARN: "Incomplete layer coverage will cause integration issues!"

          CHECK: Integration Points validation
          IF Critical Integration Points defined:
            VERIFY: Each integration point has:
              - Source file in WO
              - Target file in WO
            IF missing connection files:
              FLAG: Story as "Missing Integration Files"
              SEVERITY: High
              LIST: "Integration points missing file coverage: [points]"
              SUGGEST: "Add missing source/target files for integration points"

          CHECK: Story splitting recommendation
          IF files > 5 AND layers > 2:
            FLAG: Story as "Consider Splitting"
            SEVERITY: Medium
            SUGGEST: "Split by layer (one story per layer with integration story)"

        ELSE (Legacy check for stories without Layer section):
          IF WO contains backend AND frontend paths:
            FLAG: Story as "Multi-Layer (Legacy Detection)"
            SEVERITY: Medium
            SUGGEST: "Fill Betroffene Layer section, then split by layer"
    </check_thresholds>

    <record_issues>
      IF any flags raised:
        ADD to validation_report:
          - Story ID
          - Story Title
          - Issue(s) detected
          - Current metrics (files, complexity, LOC)
          - Recommended action
          - Suggested split pattern
    </record_issues>
</validation_process>

<decision_tree>
  IF no stories flagged:
    LOG: "✅ All stories pass size validation"
    PROCEED: To Step 4 (Spec Complete)

  ELSE (stories flagged):
    GENERATE: Validation Report

    <validation_report_format>
      ⚠️ Story Size Validation Issues

      **Stories Exceeding Guidelines:**

      **Story [ID]: [Title]**
      - Files: [count] (recommended: max 5) ❌
      - Complexity: [rating] (recommended: max S) ❌
      - Est. LOC: ~[count] (recommended: max 400-600) ⚠️
      - Issue: [description]

      **Recommendation:** Split into [N] stories:
      [Suggested split pattern based on story content]

      ---

      **Story [ID]: [Title]**
      ...

      **Summary:**
      - Total stories: [N]
      - Stories passing validation: [N]
      - Stories flagged: [N]
        - High severity: [N]
        - Medium severity: [N]
        - Low severity: [N]

      **Impact if proceeding with large stories:**
      - Higher token consumption per story
      - Risk of mid-story auto-compaction
      - Potential context loss during execution
      - Higher costs (possibly crossing 200K threshold)
    </validation_report_format>

    PRESENT: Validation Report to user

    ASK user via AskUserQuestion:
    "Story Size Validation detected issues. How would you like to proceed?

    Options:
    1. Review and manually edit stories (Recommended)
       → Edit the story files in stories/ directory
       → Re-run validation after edits

    2. Proceed anyway
       → Accept higher token costs
       → Risk mid-story compaction
       → Continue to execution

    3. Auto-split flagged stories
       → System suggests splits based on content
       → User reviews and approves splits
       → New story files created automatically"

    WAIT for user choice

    <user_choice_handling>
      IF choice = "Review and manually edit":
        INFORM: "Please edit the story files in: specwright/specs/[spec-name]/stories/"
        INFORM: "Split large stories following patterns in:
                 specwright/standards/story-size-guidelines.md"
        PAUSE: Wait for user to edit
        ASK: "Ready to re-validate? (yes/no)"
        IF yes:
          REPEAT: Step 3.5 (this validation step)
        ELSE:
          PROCEED: To Step 4 with warning flag

      ELSE IF choice = "Proceed anyway":
        WARN: "⚠️ Proceeding with oversized stories
               - Expect higher token costs
               - Mid-story compaction likely
               - Resume Context will preserve state if needed"
        LOG: Validation bypassed by user
        PROCEED: To Step 4

      ELSE IF choice = "Auto-split flagged stories":
        FOR EACH flagged_story:
          <suggest_split>
            ANALYZE: Story content (WAS/WIE/WO fields)

            DETERMINE: Split pattern
              IF multi_layer (backend + frontend):
                SUGGEST: "Split by layer"
                SUB_STORIES:
                  - Story [ID].1: Backend implementation
                  - Story [ID].2: Frontend implementation
                  - Story [ID].3: Integration

              ELSE IF high_file_count:
                SUGGEST: "Split by component"
                SUB_STORIES:
                  - Story [ID].1: Core component
                  - Story [ID].2: Supporting components
                  - Story [ID].3: Tests

              ELSE IF complex_feature:
                SUGGEST: "Split by vertical slice"
                SUB_STORIES:
                  - Story [ID].1: Basic functionality
                  - Story [ID].2: Advanced features
                  - Story [ID].3: Edge cases + tests
          </suggest_split>

          PRESENT: Suggested split to user
          ASK: "Accept this split for Story [ID]? (yes/no/custom)"

          IF yes:
            CREATE: New story files for sub-stories
            UPDATE: story-index.md with new stories
            UPDATE: Dependencies (sub-stories link to each other)
            MARK: Original story file as "Split into [IDs]"

          ELSE IF custom:
            ALLOW: User to describe custom split
            UPDATE: Based on user input

        AFTER all splits:
          INFORM: "Stories have been split. Re-running validation..."
          REPEAT: Step 3.5 (this validation step)
    </user_choice_handling>
</decision_tree>

<instructions>
  ACTION: Validate all stories against size guidelines
  CHECK: File count, complexity, estimated LOC, cross-layer detection
  REPORT: Any issues found with specific recommendations
  OFFER: Three options (edit, proceed, auto-split)
  ENFORCE: Validation loop until passed or user explicitly bypasses
  REFERENCE: specwright/docs/story-sizing-guidelines.md
</instructions>

**Output:**
- Validation report (if issues found)
- User decision on how to proceed
- Updated story files (if stories were split)
- Updated story-index.md (if stories were split)

</step>

<substep number="3.5.1" name="effort_estimation_choice">

### Step 3.5.1: Effort Estimation Decision

<user_choice>
  ASK user via AskUserQuestion:

  Question: "Story size validation complete. Would you like to create an effort estimation?"

  Options:
  1. Skip effort estimation (Recommended)
     → Proceed directly to Step 4 (Spec Complete)
     → You can estimate effort later if needed

  2. Create effort estimation now
     → Generate dual estimation (Human + AI-Adjusted)
     → Adds effort-estimation.md to spec folder
     → Takes 1-2 minutes
</user_choice>

<decision_handling>
  IF choice = "Skip effort estimation":
    LOG: "Effort estimation skipped"
    PROCEED: To Step 4 (skip Step 3.6)

  ELSE IF choice = "Create effort estimation now":
    PROCEED: To Step 3.6 (execute effort estimation)
</decision_handling>

</substep>

<step number="3.6" name="effort_estimation">

### Step 3.6: Effort Estimation (Dual: Human + AI-Adjusted)

Generate effort estimation for all stories with dual perspective: Human-only and Human+AI Agent.

<estimation_process>

  **Purpose:**
  Provide realistic effort estimates showing:
  1. **Human Baseline** - Traditional estimate (developer without AI tools)
  2. **AI-Adjusted** - Realistic estimate with AI agent support (Claude Code, Cursor, etc.)

  <substep number="3.6.1" name="load_stories">

  ### Step 3.6.1: Load Story Data

  <mandatory_actions>
    1. LIST all story files: ls specwright/specs/[spec-name]/stories/

    2. FOR EACH story file:
       READ and EXTRACT:
       - Story ID
       - Story Title
       - Geschätzte Komplexität (XS/S/M/L/XL)
       - WAS section (scope of work)
       - WO section (files affected)
       - Story Type (Backend/Frontend/DevOps/Test - from WO and technical scope)

    3. COLLECT data for estimation
  </mandatory_actions>

  </substep>

  <substep number="3.6.2" name="estimate_per_story">

  ### Step 3.6.2: Estimate Each Story

  FOR EACH story:

  **Step A: Complexity to Hours Mapping (Human Baseline)**

  Convert "Geschätzte Komplexität" to human baseline hours:

  | Komplexität | Human Hours | Description |
  |-------------|-------------|-------------|
  | XS | 2-4h | Triviale Änderung, 1-2 Dateien |
  | S | 4-8h | Kleine Story, max 3 Dateien |
  | M | 8-16h | Mittlere Story, 3-5 Dateien |
  | L | 16-32h | Große Story (sollte gesplittet werden) |
  | XL | 32-64h | Sehr große Story (MUSS gesplittet werden) |

  USE median of range for calculation.

  **Step B: Determine AI-Acceleration Category**

  ANALYZE story content (WAS, WER, Type) and categorize:

  **HIGH AI-Acceleration (Factor 0.20 = 80% reduction):**
  - Boilerplate code, CRUD operations, API endpoints
  - Database migrations, configuration files
  - Documentation, test writing, type definitions
  - Standard refactoring, utilities
  → Typical for: Backend CRUD, simple Frontend components

  **MEDIUM AI-Acceleration (Factor 0.40 = 60% reduction):**
  - Business logic, algorithms, state management
  - Complex form validation, API integration
  - Standard bug fixes, performance optimization
  → Typical for: Complex Backend logic, Frontend with state

  **LOW AI-Acceleration (Factor 0.70 = 30% reduction):**
  - New technology exploration, architecture decisions
  - Complex bug investigation, poorly documented APIs
  - Performance profiling, security analysis
  → Typical for: Research stories, complex debugging

  **NO AI-Acceleration (Factor 1.00 = no reduction):**
  - Manual QA, user acceptance testing
  - Design decisions, business clarification
  - Code review (human oversight required)
  → Typical for: Integration stories, QA stories

  **Step C: Calculate AI-Adjusted Hours**

  ```
  ai_adjusted_hours = human_baseline_hours × ai_factor
  ```

  **Step D: Document Per-Story Estimate**

  FOR EACH story, record:
  - Story ID
  - Title
  - Komplexität
  - Human Hours (baseline)
  - AI Factor (category)
  - AI-Adjusted Hours
  - Time Saved (hours)

  </substep>

  <substep number="3.6.3" name="calculate_totals">

  ### Step 3.6.3: Calculate Totals

  AGGREGATE all stories:

  ```
  Total Human Hours = Σ(story human_baseline_hours)
  Total AI-Adjusted Hours = Σ(story ai_adjusted_hours)
  Total Hours Saved = Total Human Hours - Total AI-Adjusted Hours
  Reduction Percentage = (Hours Saved / Human Hours) × 100%
  ```

  CONVERT to work days/weeks:
  - 1 day = 8 hours
  - 1 week = 40 hours (5 days)

  CALCULATE breakdown by AI category:
  - High AI-Acceleration: [N] stories, [X]h → [Y]h
  - Medium AI-Acceleration: [N] stories, [X]h → [Y]h
  - Low AI-Acceleration: [N] stories, [X]h → [Y]h
  - No AI-Acceleration: [N] stories, [X]h (unchanged)

  </substep>

  <substep number="3.6.4" name="create_estimation_file">

  ### Step 3.6.4: Create effort-estimation.md

  CREATE file: specwright/specs/[spec-name]/effort-estimation.md

  <effort_estimation_template>
    # Aufwandsschätzung: [SPEC_NAME]

    **Erstellt:** [DATE]
    **Spec:** [SPEC_NAME]
    **Anzahl Stories:** [N]

    ---

    ## 📊 Zusammenfassung

    | Metrik | Human-only | Human + KI Agent | Ersparnis |
    |--------|------------|------------------|-----------|
    | **Stunden** | [X]h | [Y]h | [Z]h ([%]%) |
    | **Arbeitstage** | [X]d | [Y]d | [Z]d |
    | **Arbeitswochen** | [X]w | [Y]w | [Z]w |

    ### Was bedeutet das?

    **Human-only:** So lange würde die Implementierung dauern, wenn ein Entwickler komplett manuell arbeitet (ohne KI-Unterstützung).

    **Human + KI Agent:** So lange dauert es realistisch mit modernen KI-Werkzeugen (Claude Code, Cursor, GitHub Copilot, etc.). Der Entwickler bleibt verantwortlich für Architektur, Code-Review und Qualitätssicherung.

    ---

    ## 📋 Schätzung pro Story

    | ID | Story | Komplexität | Human (h) | KI-Faktor | KI-Adjusted (h) | Ersparnis |
    |----|-------|-------------|-----------|-----------|-----------------|-----------|
    | [ID] | [Title] | [XS/S/M/L] | [X]h | [high/med/low/none] | [Y]h | [Z]h |
    | [ID] | [Title] | [XS/S/M/L] | [X]h | [high/med/low/none] | [Y]h | [Z]h |
    | ... | ... | ... | ... | ... | ... | ... |
    | **TOTAL** | | | **[X]h** | | **[Y]h** | **[Z]h** |

    ---

    ## 🤖 KI-Beschleunigung nach Kategorie

    | Kategorie | Stories | Human (h) | KI-Adjusted (h) | Reduktion |
    |-----------|---------|-----------|-----------------|-----------|
    | **High** (80% schneller) | [N] | [X]h | [Y]h | -80% |
    | **Medium** (60% schneller) | [N] | [X]h | [Y]h | -60% |
    | **Low** (30% schneller) | [N] | [X]h | [Y]h | -30% |
    | **None** (keine Beschleunigung) | [N] | [X]h | [X]h | 0% |

    ### Erklärung der Kategorien

    - **High (Faktor 0.20):** Boilerplate, CRUD, Tests, Dokumentation - KI kann 5x schneller helfen
    - **Medium (Faktor 0.40):** Business-Logik, State Management, API-Integration - KI hilft 2.5x schneller
    - **Low (Faktor 0.70):** Neue Technologien, komplexe Bugs, Architektur - KI hilft 1.4x schneller
    - **None (Faktor 1.00):** QA, Design-Entscheidungen, Code-Review - menschliches Urteil erforderlich

    ---

    ## ⚠️ Annahmen & Hinweise

    - Schätzungen basieren auf der Komplexitätsbewertung des Architects
    - KI-Faktoren setzen aktive Nutzung von AI-Tools voraus (Claude Code, Cursor, etc.)
    - Qualitätssicherung und Code-Review bleiben unverändert wichtig
    - Unvorhergesehene Probleme können Aufwand erhöhen (+20-30% Puffer empfohlen)

    ---

    ## 🎯 Empfehlung

    **Geplanter Aufwand:** [AI-Adjusted Hours]h ([AI-Adjusted Days]d / [AI-Adjusted Weeks]w)
    **Mit Puffer (+25%):** [Buffered Hours]h ([Buffered Days]d / [Buffered Weeks]w)

    ---

    *Erstellt mit Specwright /create-spec v2.7*
  </effort_estimation_template>

  </substep>

</estimation_process>

<instructions>
  ACTION: Generate dual effort estimation for all stories
  CALCULATE: Human baseline + AI-adjusted hours for each story
  AGGREGATE: Total hours, days, weeks with breakdown by AI category
  CREATE: effort-estimation.md in spec folder
  FORMAT: Clear tables with both perspectives
  NOTE: Use complexity ratings from Architect (Step 3)
</instructions>

**Output:**
- `specwright/specs/[spec-name]/effort-estimation.md`
- Dual estimation: Human-only AND Human+AI Agent
- Per-story breakdown with AI factors
- Total aggregation with time savings

</step>

<step number="4" name="spec_complete">

### Step 4: Spec Ready for Execution

Present completed specification to user.

<summary_template>
  ✅ Specification complete!

  **Location:** specwright/specs/[YYYY-MM-DD-spec-name]/

  **Files:**
  - requirements-clarification.md - Approved requirements summary
  - implementation-plan.md - Self-reviewed plan with minimalinvasiv optimizations (v2.8)
  - spec.md - Full specification
  - spec-lite.md - Quick reference summary
  - story-index.md - Story overview and dependency mapping (human-readable)
  - kanban.json - Machine-readable kanban (Single Source of Truth for /execute-tasks) (v3.3)
  - effort-estimation.md - Aufwandsschätzung (Human + AI)
  - stories/ - Individual story files (fachlich + technisch)
    * story-001-[slug].md, story-002-[slug].md, etc.
    * Stories derived from Implementation Plan phases
    * Fachliche descriptions (PO)
    * Technical refinement: WAS/WIE/WO/DoR/DoD (guided by architect-refinement skill)
    * Dependencies mapped

  [IF cross-cutting exists:]
  - sub-specs/cross-cutting-decisions.md - Spec-wide technical decisions

  **Story Summary:**
  - Total stories: [N]
  - Can run parallel: [N]
  - Sequential dependencies: [N]

  [CHECK if file exists: specwright/specs/[spec-name]/effort-estimation.md]

  [IF EXISTS:]
  **📊 Aufwandsschätzung:**

  | Metrik | Human-only | Human + KI | Ersparnis |
  |--------|------------|------------|-----------|
  | Stunden | [X]h | [Y]h | [Z]h ([%]%) |
  | Arbeitstage | [X]d | [Y]d | [Z]d |

  💡 **Mit KI-Unterstützung** sparen Sie ca. **[%]%** der Entwicklungszeit!

  Details: specwright/specs/[spec-name]/effort-estimation.md

  [IF NOT EXISTS:]
  **📊 Aufwandsschätzung:**
  Skipped - Effort estimation can be done separately if needed

  **Next Steps:**

  1. Review specification:
     → specwright/specs/[spec-name]/story-index.md (overview)
     → specwright/specs/[spec-name]/stories/ (individual stories)
     → specwright/specs/[spec-name]/effort-estimation.md (Aufwand)

  2. When ready, execute:
     → /execute-tasks
     → Creates kanban-board.md
     → Executes stories via DevTeam
     → Quality gates enforced
     → Docs generated per story
     → Per-story commits
     → Final PR

  What would you like to do?
  1. Review the spec first
  2. Start execution (/execute-tasks)
  3. Add more stories
</summary_template>

</step>

<step number="5" name="auto_git_commit">

### Step 5: Auto Git Commit

Automatically commit all spec files so the working tree is clean before execution.

<mandatory_actions>
  1. DELEGATE to git-workflow via Task tool (model="haiku"):

     PROMPT:
     """
     Create a git commit for the newly created spec files.

     1. Stage all new files:
        ```bash
        git add specwright/specs/[SPEC_FOLDER_NAME]/
        ```

     2. Create commit:
        ```bash
        git commit -m "spec: create [SPEC_NAME]"
        ```

        Where [SPEC_NAME] is the human-readable spec name (e.g., "auto-git-commit-after-commands").

     3. Do NOT push to remote.
     """

  2. VERIFY: Commit was successful (exit code 0)

  3. IF commit fails:
     WARN user: "Auto-Commit fehlgeschlagen. Bitte manuell committen."
     SHOW: git status output
     CONTINUE: Do not block workflow completion
</mandatory_actions>

<instructions>
  ACTION: Automatically commit spec files after creation
  FORMAT: spec: create [spec-name]
  PUSH: Never push automatically
  FAIL: Warn but do not block on commit failure
</instructions>

</step>

</process_flow>

## Final Checklist

<verify>
  - [ ] Spec folder created (YYYY-MM-DD prefix)
  - [ ] requirements-clarification.md created and approved by user
  - [ ] **implementation-plan.md created by Plan Agent with Self-Review and Minimalinvasiv-Analyse (Step 2.5)** (v3.2)
  - [ ] **Implementation Plan approved by user** (v2.8)
  - [ ] spec.md complete (all sections)
  - [ ] spec-lite.md concise
  - [ ] story-index.md created with all stories listed (human-readable)
  - [ ] **kanban.json created with all stories as JSON objects** (v3.3)
  - [ ] **Stories derived from Implementation Plan phases** (v2.8)
  - [ ] stories/ directory created with individual story files
  - [ ] Each story file has fachlich + technical content
  - [ ] All stories have DoR/DoD
  - [ ] **No WER field in stories** (v3.5)
  - [ ] **All DoR checkboxes are marked [x] complete**
  - [ ] **Each story has "Relevante Skills" section filled (from .claude/skills/)**
  - [ ] Dependencies identified in story-index.md
  - [ ] Cross-cutting decisions (if applicable)
  - [ ] **DoR validation passed (Step 3.4)**
  - [ ] **Story size validation passed (Step 3.5)**
  - [ ] **effort-estimation.md created (OPTIONAL - Step 3.6)** (v2.7)
  - [ ] **System Stories created (story-997, story-998, story-999)** (v3.0)
  - [ ] **Auto Git Commit erstellt (Step 5)** - Clean working tree
  - [ ] Ready for /execute-tasks
</verify>
