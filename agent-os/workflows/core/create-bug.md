# Create Bug Specification - Core Instructions

## Overview

Create a structured bug specification that integrates with the standard feature workflow. Bug-Specs are created in `agent-os/specs/` and executed via `execute-tasks`, ensuring consistent quality gates, git management, and agent delegation.

**Key Principle:** Bugs are treated as "mini-features" with their own specifications, user-stories, and technical analysis - executed through the same workflow as features.

<pre_flight_check>
  EXECUTE: @~/.agent-os/workflows/meta/pre-flight.md
</pre_flight_check>

<process_flow>

<step number="1" name="initial_information_gathering">

### Step 1: Initial Information Gathering

Orchestrator collects basic bug information from user before delegating to PO Agent.

<information_collection>
  ASK user via AskUserQuestion:

  **Required Information:**
  - **Bug Title**: Short, descriptive title (will become spec name)
  - **Bug Description**: Detailed description of the issue
  - **Severity Level**: Critical | High | Medium | Low
  - **Priority**: Urgent | High | Normal | Low
  - **Environment**: Development | Staging | Production
  - **Bug Type** (for agent assignment): Backend | Frontend | DevOps | Full-Stack

  **Additional Context (ask if not provided):**
  - Reproduction steps
  - Expected vs actual behavior
  - Error messages or logs
  - Affected users/functionality
</information_collection>

<spec_naming>
  CREATE spec folder name:
    FORMAT: YYYY-MM-DD-bugfix-[bug-title-slug]
    EXAMPLE: 2026-01-12-bugfix-login-session-expires

  STORE: SPEC_FOLDER for subsequent steps
</spec_naming>

<instructions>
  ACTION: Gather initial bug information interactively
  CREATE: Spec folder name from bug title
  STORE: Information for PO Agent delegation
  VALIDATE: All required fields collected
</instructions>

</step>

<step number="2" name="po_agent_spec_creation">

### Step 2: PO Agent - Bug Spec Creation

Delegate to PO Agent to create the bug specification with user-stories.

<delegation>
  DELEGATE: dev-team__po OR product-strategist via Task tool

  PROMPT: "Create Bug Specification for: [Bug Title]

  **Initial Information:**
  - Title: [USER_PROVIDED_TITLE]
  - Description: [USER_PROVIDED_DESCRIPTION]
  - Severity: [SEVERITY]
  - Priority: [PRIORITY]
  - Environment: [ENVIRONMENT]
  - Bug Type: [BUG_TYPE]

  **Spec Folder:** agent-os/specs/[SPEC_FOLDER]/

  **Your Tasks:**

  1. Conduct interactive investigation by asking clarifying questions:
     - Browser/platform/OS being used?
     - When was issue first noticed?
     - Does it happen consistently or intermittently?
     - What steps lead to this issue?
     - What did you expect to happen?
     - What actually happened instead?
     - Any error messages or logs?
     - Who is affected by this bug?
     - Any workarounds available?

  2. Create Bug Spec Structure:

     **spec.md** (agent-os/specs/[SPEC_FOLDER]/spec.md):
     ```markdown
     # Bug Specification: [Bug Title]

     **Type**: Bug Fix
     **Created**: [DATE]
     **Severity**: [SEVERITY]
     **Priority**: [PRIORITY]
     **Status**: Open

     ## Problem Statement
     [Detailed description of the bug and its impact]

     ## Environment
     - Platform: [OS/Browser/Environment]
     - Version: [Application version if known]
     - Context: [Development/Staging/Production]

     ## Reproduction Steps
     1. [Step 1]
     2. [Step 2]
     3. [Step 3]

     ## Expected Behavior
     [What should happen]

     ## Actual Behavior
     [What actually happens]

     ## Impact Assessment
     - Users Affected: [Number or description]
     - Functionality Affected: [What's broken]
     - Business Impact: [Revenue, user experience, etc.]

     ## Error Messages/Logs
     ```
     [Any error messages or relevant log entries]
     ```

     ## Acceptance Criteria
     - [ ] Bug no longer reproducible with original steps
     - [ ] All existing tests pass
     - [ ] New regression test added
     - [ ] No side effects on related functionality
     ```

     **user-stories.md** (agent-os/specs/[SPEC_FOLDER]/user-stories.md):
     ```markdown
     # User Stories - [Bug Title]

     ## Overview
     Bug fix implementation stories for [Bug Title].

     ---

     ## Story 1: Investigate and Fix Root Cause

     ### Beschreibung
     Als Entwickler muss ich die Ursache des Bugs identifizieren und beheben,
     damit [expected behavior] wieder funktioniert.

     ### Fachliche Beschreibung
     Der Bug '[Bug Title]' verursacht [actual behavior] anstatt [expected behavior].
     Die Ursache muss identifiziert und eine Lösung implementiert werden.

     ### Technische Verfeinerung

     #### WAS (Anforderungen)
     - Root-Cause-Analyse durchführen
     - Fix implementieren, der die Ursache behebt (nicht nur Symptome)
     - Sicherstellen, dass keine Side-Effects entstehen

     #### WIE (Implementierung)
     - [To be refined by Architect in technical-spec.md]

     #### WO (Betroffene Dateien)
     - [To be refined by Architect in technical-spec.md]

     #### WER (Zuständigkeit)
     - **Primary**: [BUG_TYPE]-developer
     - **Review**: Architect

     ### Definition of Ready (DoR)
     - [ ] Bug-Beschreibung verstanden
     - [ ] Reproduction Steps verifiziert
     - [ ] Betroffene Komponenten identifiziert
     - [ ] Technical-Spec vom Architekten vorhanden

     ### Definition of Done (DoD)
     - [ ] Root-Cause dokumentiert
     - [ ] Fix implementiert
     - [ ] Bug nicht mehr reproduzierbar
     - [ ] Keine Regression in bestehenden Tests
     - [ ] Architect Review bestanden

     ### Story Points
     [To be estimated]

     ### Dependencies
     None

     ---

     ## Story 2: Add Regression Test

     ### Beschreibung
     Als QA-Spezialist muss ich einen Regression-Test erstellen,
     damit dieser Bug in Zukunft automatisch erkannt wird.

     ### Fachliche Beschreibung
     Ein automatisierter Test muss erstellt werden, der das ursprüngliche
     Bug-Szenario abdeckt und bei Regression fehlschlägt.

     ### Technische Verfeinerung

     #### WAS (Anforderungen)
     - Test erstellen, der das Bug-Szenario reproduziert
     - Test muss fehlschlagen wenn Bug wieder auftritt
     - Test muss bestehen mit dem Fix

     #### WIE (Implementierung)
     - [Based on project test framework]

     #### WO (Betroffene Dateien)
     - [Test file location based on bug type]

     #### WER (Zuständigkeit)
     - **Primary**: QA-Specialist OR [BUG_TYPE]-developer
     - **Review**: Architect

     ### Definition of Ready (DoR)
     - [ ] Story 1 abgeschlossen
     - [ ] Bug-Szenario klar definiert
     - [ ] Test-Strategie festgelegt

     ### Definition of Done (DoD)
     - [ ] Regression-Test implementiert
     - [ ] Test besteht mit Fix
     - [ ] Test schlägt fehl ohne Fix (verifiziert)
     - [ ] Test in CI integriert

     ### Story Points
     [To be estimated]

     ### Dependencies
     - Story 1 (Bug Fix)
     ```

  3. Create spec-lite.md (summary version):
     ```markdown
     # Bug: [Bug Title]

     **Severity**: [SEVERITY] | **Priority**: [PRIORITY] | **Type**: [BUG_TYPE]

     ## Problem
     [One paragraph summary]

     ## Fix Scope
     - 2 Stories: Bug Fix + Regression Test
     - Assigned Agent: [BUG_TYPE]-developer

     ## Acceptance
     - Bug no longer reproducible
     - Regression test added
     ```

  **Deliverable:**
  - Created spec folder with spec.md, user-stories.md, spec-lite.md
  - Report path back to orchestrator"
</delegation>

<po_validation>
  WAIT: For PO Agent completion
  VERIFY: Spec folder created
  VERIFY: spec.md, user-stories.md, spec-lite.md exist
  STORE: SPEC_FOLDER_PATH for Architect step
</po_validation>

<instructions>
  ACTION: Delegate to PO Agent for spec creation
  WAIT: For completion
  VALIDATE: Bug spec created correctly with user-stories
  PROCEED: To Architect technical analysis
</instructions>

</step>

<step number="3" name="architect_technical_analysis">

### Step 3: Architect - Technical Analysis

Delegate to Architect for technical analysis, identifying affected components and refining user-stories.

<delegation>
  DELEGATE: dev-team__architect OR tech-architect via Task tool

  PROMPT: "Technical Analysis for Bug Spec: [Bug Title]

  **Spec Location:** agent-os/specs/[SPEC_FOLDER]/

  **Your Tasks:**

  1. Read the bug spec created by PO Agent:
     - spec.md for bug context
     - user-stories.md for story structure

  2. Conduct Technical Analysis:
     - Identify affected components/modules in codebase
     - Analyze potential root causes
     - Review related code areas
     - Check for similar past issues
     - Assess complexity of fix

  3. Create sub-specs/technical-spec.md:
     ```markdown
     # Technical Specification - [Bug Title]

     ## Root Cause Analysis

     ### Suspected Root Cause
     [Analysis of what's likely causing the bug]

     ### Related Code Areas
     - [File 1]: [Why it's related]
     - [File 2]: [Why it's related]

     ### Similar Past Issues
     - [Any similar bugs or patterns found]

     ## Technical Approach

     ### Investigation Strategy
     1. [Step to verify root cause]
     2. [Step to isolate the issue]

     ### Fix Strategy
     [Recommended approach to fix the bug]

     ### Risk Assessment
     - **Complexity**: Simple | Medium | Complex
     - **Side Effect Risk**: Low | Medium | High
     - **Areas to Test**: [List components that need testing]

     ## Story Refinements

     ### Story 1: Bug Fix
     **WIE (Implementation):**
     - [Specific implementation steps]
     - [Code patterns to follow]

     **WO (Affected Files):**
     - `[file-path-1]` - [what to change]
     - `[file-path-2]` - [what to change]

     ### Story 2: Regression Test
     **WO (Test Files):**
     - `[test-file-path]` - [test to add]

     ## Estimation
     - Story 1 (Bug Fix): [X] Story Points
     - Story 2 (Regression Test): [Y] Story Points
     - Total: [X+Y] Story Points
     ```

  4. Update user-stories.md:
     - Fill in WIE sections with implementation details
     - Fill in WO sections with specific file paths
     - Add Story Point estimates
     - Update DoR to reflect technical readiness

  **Deliverable:**
  - Technical spec created at sub-specs/technical-spec.md
  - User-stories.md updated with technical details
  - Complexity and estimation provided"
</delegation>

<architect_validation>
  WAIT: For Architect completion
  VERIFY: technical-spec.md created
  VERIFY: user-stories.md updated with technical details
</architect_validation>

<instructions>
  ACTION: Delegate to Architect for technical analysis
  WAIT: For completion
  VALIDATE: Technical spec complete
  PROCEED: To story size validation
</instructions>

</step>

<step number="3.5" name="story_size_validation">

### Step 3.5: Story Size Validation

Validate that bug fix stories comply with size guidelines to prevent mid-execution context compaction.

<validation_process>
  READ: agent-os/specs/[SPEC_FOLDER]/user-stories.md
  READ: agent-os/standards/story-size-guidelines.md (for reference thresholds)

  FOR EACH story in user-stories.md:
    <extract_metrics>
      ANALYZE: WO (Where) field
        COUNT: Number of file paths mentioned
        EXTRACT: File paths list

      ANALYZE: Story Points field
        EXTRACT: Estimated story points
        IF story_points > 5:
          FLAG: As potentially too complex

      ANALYZE: WAS (What) field
        ESTIMATE: Lines of code based on components mentioned
        HEURISTIC:
          - Each bug fix file ~50-150 lines
          - Tests ~50-100 lines per test file
          - Investigation/analysis minimal LOC impact
    </extract_metrics>

    <check_thresholds>
      CHECK: Number of files
        IF files > 5:
          FLAG: Story as "Too Large - File Count"
          SEVERITY: High

      CHECK: Story points
        IF story_points > 8:
          FLAG: Story as "Too Complex - High Story Points"
          SEVERITY: High
        ELSE IF story_points > 5:
          FLAG: Story as "Watch - Moderate Complexity"
          SEVERITY: Medium

      CHECK: Estimated LOC
        IF estimated_loc > 600:
          FLAG: Story as "Too Large - Code Volume"
          SEVERITY: Medium

      CHECK: Cross-layer detection
        IF WO contains backend AND frontend paths:
          FLAG: Story as "Multi-Layer Bug"
          SEVERITY: Medium
          SUGGEST: "Split by layer (investigate + fix backend, then frontend)"
    </check_thresholds>

    <record_issues>
      IF any flags raised:
        ADD to validation_report:
          - Story ID
          - Story Title
          - Issue(s) detected
          - Current metrics (files, story points, LOC)
          - Recommended action
          - Suggested split pattern
    </record_issues>
</validation_process>

<decision_tree>
  IF no stories flagged:
    LOG: "✅ All bug fix stories pass size validation"
    PROCEED: To Step 4 (Completion Summary)

  ELSE (stories flagged):
    GENERATE: Validation Report

    <validation_report_format>
      ⚠️ Bug Story Size Validation Issues

      **Bug fix stories exceeding guidelines:**

      **Story [ID]: [Title]**
      - Files: [count] (recommended: max 5) ❌
      - Story Points: [points] (recommended: max 5-8) ⚠️
      - Est. LOC: ~[count] (recommended: max 400-600) ⚠️
      - Issue: [description]

      **Recommendation for Bug Fix:** Split into [N] stories:
      [Suggested split pattern based on story content]

      ---

      **Summary:**
      - Total bug stories: [N]
      - Stories passing validation: [N]
      - Stories flagged: [N]
        - High severity: [N]
        - Medium severity: [N]

      **Impact if proceeding with large bug stories:**
      - Higher token consumption during bug investigation
      - Risk of mid-story auto-compaction
      - Potential context loss during complex debugging
      - Higher costs (possibly crossing 200K threshold)
    </validation_report_format>

    PRESENT: Validation Report to user

    ASK user via AskUserQuestion:
    "Bug Story Size Validation detected issues. How would you like to proceed?

    Options:
    1. Review and manually edit stories (Recommended)
       → Opens user-stories.md for editing
       → Re-run validation after edits

    2. Proceed anyway
       → Accept higher token costs
       → Risk mid-story compaction during debugging
       → Continue to execution

    3. Auto-split flagged stories
       → System suggests splits based on bug complexity
       → User reviews and approves splits
       → Stories updated automatically"

    WAIT for user choice

    <user_choice_handling>
      IF choice = "Review and manually edit":
        INFORM: "Please edit: agent-os/specs/[SPEC_FOLDER]/user-stories.md"
        INFORM: "Split large bug stories following patterns in:
                 agent-os/standards/story-size-guidelines.md

                 Common bug story split patterns:
                 - Story 1: Investigation & Root Cause Analysis
                 - Story 2: Implement Fix (Backend)
                 - Story 3: Implement Fix (Frontend) [if multi-layer]
                 - Story 4: Add Regression Tests
                 - Story 5: Documentation Update"
        PAUSE: Wait for user to edit
        ASK: "Ready to re-validate? (yes/no)"
        IF yes:
          REPEAT: Step 3.5 (this validation step)
        ELSE:
          PROCEED: To Step 4 with warning flag

      ELSE IF choice = "Proceed anyway":
        WARN: "⚠️ Proceeding with oversized bug stories
               - Expect higher token costs during investigation
               - Mid-story compaction likely during debugging
               - Resume Context will preserve state if needed"
        LOG: Validation bypassed by user
        PROCEED: To Step 4

      ELSE IF choice = "Auto-split flagged stories":
        FOR EACH flagged_story:
          <suggest_split>
            ANALYZE: Story content (WAS/WIE/WO fields)

            DETERMINE: Split pattern for bugs
              IF multi_layer (backend + frontend bug):
                SUGGEST: "Split by layer"
                SUB_STORIES:
                  - Story [ID].1: Investigation & Root Cause Analysis
                  - Story [ID].2: Fix Backend Components
                  - Story [ID].3: Fix Frontend Components
                  - Story [ID].4: Add Regression Tests

              ELSE IF high_file_count OR high_story_points:
                SUGGEST: "Split investigation from fix"
                SUB_STORIES:
                  - Story [ID].1: Investigation & Root Cause Analysis
                  - Story [ID].2: Implement Fix
                  - Story [ID].3: Add Regression Tests

              ELSE IF complex_debugging:
                SUGGEST: "Split by phase"
                SUB_STORIES:
                  - Story [ID].1: Reproduce & Isolate Bug
                  - Story [ID].2: Identify Root Cause
                  - Story [ID].3: Implement & Test Fix
          </suggest_split>

          PRESENT: Suggested split to user
          ASK: "Accept this split for Bug Story [ID]? (yes/no/custom)"

          IF yes:
            UPDATE: user-stories.md with sub-stories
            UPDATE: Dependencies (investigation before fix before tests)
            MARK: Original story as "Split into [IDs]"

          ELSE IF custom:
            ALLOW: User to describe custom split
            UPDATE: Based on user input

        AFTER all splits:
          INFORM: "Bug stories have been split. Re-running validation..."
          REPEAT: Step 3.5 (this validation step)
    </user_choice_handling>
</decision_tree>

<instructions>
  ACTION: Validate all bug fix stories against size guidelines
  CHECK: File count, story points, estimated LOC, cross-layer detection
  REPORT: Any issues found with bug-specific recommendations
  OFFER: Three options (edit, proceed, auto-split)
  ENFORCE: Validation loop until passed or user explicitly bypasses
  REFERENCE: agent-os/docs/story-sizing-guidelines.md
  NOTE: Bug fixes often need investigation stories - use that for splitting
</instructions>

**Output:**
- Validation report (if issues found)
- User decision on how to proceed
- Updated user-stories.md (if bug stories were split)

</step>

<step number="4" name="completion_summary">

### Step 4: Completion Summary

Provide comprehensive summary to user with next steps.

<summary_template>
  ## ✅ Bug Specification Created

  **Spec Location:** agent-os/specs/[SPEC_FOLDER]/

  ## 📋 Summary

  - **Bug Title:** [Bug Title]
  - **Severity:** [Severity]
  - **Priority:** [Priority]
  - **Type:** [Bug Type]
  - **Complexity:** [Simple/Medium/Complex from Architect]
  - **Estimated:** [X] Story Points

  ## 📁 Created Files

  - `spec.md` - Bug specification
  - `user-stories.md` - Implementation stories (2 stories)
  - `spec-lite.md` - Quick summary
  - `sub-specs/technical-spec.md` - Technical analysis

  ## 📊 Stories

  | # | Story | Agent | Points |
  |---|-------|-------|--------|
  | 1 | Investigate and Fix Root Cause | [BUG_TYPE]-dev | [X] |
  | 2 | Add Regression Test | QA-Specialist | [Y] |

  ## ▶️ Next Steps

  Run `/execute-tasks [SPEC_FOLDER]` to start bug resolution.

  The execute-tasks workflow will:
  - Create git branch: `bugfix/[bug-name]`
  - Assign appropriate agents based on bug type
  - Enforce quality gates (Architect + QA review)
  - Create kanban board for tracking
  - Commit and push changes
</summary_template>

<instructions>
  ACTION: Display completion summary
  INCLUDE: All created artifacts
  HIGHLIGHT: Next steps with execute-tasks command
</instructions>

</step>

</process_flow>

## Directory Structure

Bug specs follow the standard spec structure:

```
agent-os/specs/YYYY-MM-DD-bugfix-[bug-name]/
├── spec.md                    # Bug specification (by PO)
├── spec-lite.md              # Quick summary
├── user-stories.md           # Bug fix stories (by PO)
├── sub-specs/
│   └── technical-spec.md     # Technical analysis (by Architect)
├── kanban-board.md           # Created by execute-tasks
├── implementation-reports/   # Created during execution
└── handover-docs/            # If needed for dependencies
```

## Integration with execute-tasks

When running `/execute-tasks` on a bug spec:

1. **Git Branch**: Creates `bugfix/[bug-name]` instead of feature branch
2. **Agent Assignment**: Uses Bug Type field to select agent
3. **Quality Gates**: Same Architect + QA review as features
4. **Kanban Board**: Tracks bug stories like feature stories
5. **Commits**: Uses `fix:` prefix in commit messages

## Error Handling

<error_protocols>
  <missing_po_agent>
    IF dev-team__po not available:
      USE: product-strategist as fallback
      NOTIFY: User of fallback
  </missing_po_agent>

  <missing_architect>
    IF dev-team__architect not available:
      USE: tech-architect as fallback
      NOTIFY: User of fallback
  </missing_architect>

  <insufficient_information>
    ACTION: Ask clarifying questions
    PROVIDE: Examples of good bug descriptions
    GUIDE: User through process step by step
    RULE: Never create incomplete bug specs
  </insufficient_information>
</error_protocols>

## Quality Checklist

<final_checklist>
  <verify>
    - [ ] Bug information collected completely
    - [ ] Spec folder created with correct naming
    - [ ] spec.md contains full bug context
    - [ ] user-stories.md contains implementation stories
    - [ ] spec-lite.md provides quick summary
    - [ ] technical-spec.md contains Architect analysis
    - [ ] Stories have DoR and DoD defined
    - [ ] Story Points estimated
    - [ ] Next steps provided to user
  </verify>
</final_checklist>
