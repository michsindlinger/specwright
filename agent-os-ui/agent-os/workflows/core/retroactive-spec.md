---
description: Create specification for existing features via codebase analysis
globs:
alwaysApply: false
version: 1.0
encoding: UTF-8
---

# Retroactive Spec Workflow

## Overview

Create detailed specifications for ALREADY IMPLEMENTED features by analyzing existing code.

**Key Characteristics:**
- Interactive dialog for clarifying implementation details
- Codebase analysis to understand current state
- No story generation (feature is already built)
- Output: spec.md + spec-lite.md + code-references.md

**When to use:**
- Documenting legacy features without specs
- Reverse-engineering existing functionality
- Creating specs for features implemented before Agent OS adoption
- Understanding undocumented code

**Output Structure:**
```
agent-os/specs/YYYY-MM-DD-retro-[feature-name]/
├── spec.md                # Full specification
├── spec-lite.md           # Quick reference
└── code-references.md     # Referenced code files
```

**Difference from /retroactive-doc:**
- This creates spec files (spec.md, spec-lite.md) ready for change management
- /retroactive-doc creates user-facing documentation in .agent-os/docs/

<pre_flight_check>
  EXECUTE: @~/.agent-os/workflows/meta/pre-flight.md
</pre_flight_check>

<process_flow>

<step number="1" name="feature_identification">

### Step 1: Feature Identification

User describes the feature that needs to be documented.

<mandatory_actions>
  1. CHECK if specs already exist:
     - LIST: agent-os/specs/ directory
     - LOOK FOR: Any spec with [feature-name] in the folder name
     - GREP: For feature keywords in existing spec.md files

  2. IF existing spec found:
     INFORM: "A specification already exists for this feature: [path]"
     PRESENT: Options via AskUserQuestion:
       ```
       Question: "A spec already exists for this feature. What would you like to do?"

       Options:
       1. Use existing spec
          → Exit and reference existing spec

       2. Update existing spec with changes
          → Redirect to /change-spec command

       3. Continue with retroactive-spec anyway
          → Create parallel documentation (e.g., for different perspective)
       ```
     IF choice = "Use existing": EXIT with reference to existing spec
     IF choice = "Update existing": INFORM: "Use /change-spec to update the existing specification"

  3. ASK user to describe the feature:
     - What is the feature called?
     - What does it do from a user perspective?
     - Who uses it?

  4. GATHER optional code file hints:
     - Ask: "Do you know which code files are relevant? (optional)"
     - Collect file paths if provided

  5. STORE: Feature description for analysis phase
</mandatory_actions>

</step>

<step number="2" name="codebase_analysis">

### Step 2: Codebase Analysis

Analyze existing code to understand the implementation.

<substep number="2.1" name="discover_code">

### Step 2.1: Code Discovery

<mandatory_actions>
  IF user provided file paths:
    1. VERIFY all files exist
    2. GROUP files by type (components, services, APIs, etc.)
    3. PROCEED to Step 2.2

  IF no files provided OR partial information:
    1. DELEGATE to codebase-analyzer agent:

       PROMPT:
       """
       Find all code files related to the feature: [FEATURE_NAME]

       Feature description: [USER_DESCRIPTION]

       Search strategy:
       1. Use Glob to find relevant directories
       2. Use Grep to find feature-related code
       3. Check:
          - UI components (src/components/, src/pages/)
          - API endpoints (src/api/, src/controllers/, src/routes/)
          - Services (src/services/)
          - Database models (src/models/, src/entities/)
          - Configuration files

       Return:
       - List of all relevant files with paths
       - Brief description of what each file does
       - Entry points (where feature starts/interacts)
       """

    2. RECEIVE: File list from codebase-analyzer
</mandatory_actions>

</substep>

<substep number="2.2" name="analyze_implementation">

### Step 2.2: Implementation Analysis

<mandatory_actions>
  1. READ all discovered code files

  2. DELEGATE to codebase-analyzer:

     PROMPT:
     """
     Analyze the implementation of [FEATURE_NAME]:

     Files to analyze:
     [LIST OF FILE PATHS]

     Create a comprehensive analysis report covering:

     1. **Entry Points**: Where does the feature start? (UI components, API endpoints)
     2. **Data Models**: What data structures are involved?
     3. **Business Logic**: What are the core operations?
     4. **APIs/Interfaces**: How does it communicate? (endpoints, methods)
     5. **UI Components**: What does the user see/interact with?
     6. **Dependencies**: What does it rely on? (libraries, services)
     7. **Configuration**: How is it configured?
     8. **Data Flow**: How does information move through the feature?

     Return structured analysis using the Analysis Report format.
     Highlight any unclear areas that need user clarification.
     """

  3. RECEIVE: Analysis report from codebase-analyzer

  4. STORE: Analysis for validation step
</mandatory_actions>

</substep>

<substep number="2.3" name="interactive_clarification">

### Step 2.3: Interactive Clarification (Iterative)

<mandatory_actions>
  1. REVIEW analysis for unclear areas

  2. IDENTIFY questions based on code analysis:
     - Unclear business logic
     - Missing context for decisions
     - Unclear user flows
     - Ambiguous naming or purposes
     - Unclear error scenarios

  3. IF questions exist:
     ASK user via AskUserQuestion (one at a time):
     ```
     Question: "I found [OBSERVATION] in the code, but I'm not sure about [UNCLEAR_ASPECT].

     Context: [CODE_SNIPPET_OR_REFERENCE]

     Can you clarify: [SPECIFIC_QUESTION]?"

     Options:
     - [Specific answer option]
     - [Specific answer option]
     - [Specific answer option]
     - Custom (user types explanation)
     ```

  4. DOCUMENT: User clarifications

  5. REPEAT: Until all questions are answered

  6. CONFIRM: Feature understanding with user
</mandatory_actions>

</substep>

</step>

<step number="3" name="feature_validation">

### Step 3: Feature Understanding Validation

Present the understood feature to the user for confirmation.

<mandatory_actions>
  1. SYNTHESIZE understanding from analysis + clarifications:

  2. PRESENT to user:
     ```
     ## Feature Understanding Summary

     ### Feature: [NAME]

     **Purpose:** [What problem it solves]

     **Primary Users:** [Who uses it]

     **Entry Points:**
     - [Entry point 1]
     - [Entry point 2]

     **Core Functionality:**
     1. [Function 1]
     2. [Function 2]
     3. [Function 3]

     **Data Flow:**
     [Brief description of how data moves]

     **Key Components:**
     - [Component 1]: [Purpose]
     - [Component 2]: [Purpose]

     **Dependencies:**
     - [Dependency 1]
     - [Dependency 2]

     ### Files Analyzed
     - [file path] - [purpose]
     - [file path] - [purpose]
     ```

  3. ASK for confirmation:
     ```
     Question: "Is this understanding of the feature correct?"

     Options:
     1. Yes, proceed with spec generation
        → Understanding is correct, create spec files

     2. Partially correct, need changes
        → I'll ask follow-up questions to clarify

     3. Missing important aspects
        → Return to code analysis with new focus
     ```

  4. IF user requests changes:
     - Collect feedback
     - Update understanding
     - Re-present to user
     - Repeat until confirmed
</mandatory_actions>

</step>

<step number="4" subagent="date-checker" name="date_determination">

### Step 4: Date Determination

<mandatory_actions>
  DELEGATE to date-checker:
  PROMPT: "Get current date in YYYY-MM-DD format for spec folder creation"

  RECEIVE: Current date
  STORE: For folder naming
</mandatory_actions>

</step>

<step number="5" subagent="file-creator" name="spec_generation">

### Step 5: Spec Generation

Create spec.md, spec-lite.md, and kanban.json based on code analysis.

<mandatory_actions>
  1. CREATE spec folder:
     agent-os/specs/YYYY-MM-DD-retro-[feature-name]/

  2. CREATE spec.md:

     <spec_template>
       # Spec: [FEATURE_NAME]

       > **Type:** Retroactive (already implemented)
       > **Created:** [DATE]
       > **Source:** Codebase Analysis

       ## Overview

       [1-2 sentence description of what the feature does]

       ## Implementation Status

       **Status:** ✅ Already Implemented

       This specification was created through retroactive analysis of existing code.

       ## Functionality

       ### User Capabilities
       [List what users can do with this feature]

       ### Entry Points
       - [UI route/component or API endpoint]
       - [Entry point 2]

       ## Architecture

       ### Components
       | Component | Type | Location | Purpose |
       |-----------|------|----------|---------|
       | [Name] | [UI/API/Service] | [path] | [purpose] |

       ### Data Models
       ```typescript
       // Key data structures
       [From code analysis]
       ```

       ### API Endpoints (if applicable)
       | Method | Path | Description |
       |--------|------|-------------|
       | GET/POST | /api/... | [description] |

       ### Business Logic Flow
       1. [Step 1]
       2. [Step 2]
       3. [Step 3]

       ## Dependencies

       ### Internal
       - [Dependency 1]: [How it's used]

       ### External
       - [External library/service]: [Purpose]

       ## Configuration

       [Any configuration options or environment variables]

       ## Integration Points

       [How this feature connects to other parts of the system]

       ## Known Limitations (if any)

       [Document any limitations discovered during analysis]

       ## Code References

       See: code-references.md for complete file list

       ---

       ## Changelog

       ### [DATE] - Initial Retroactive Documentation
       - **Status:** Completed
       - **Stories:** N/A (feature already implemented)
       - **Summary:** Created spec through codebase analysis
     </spec_template>

  3. CREATE spec-lite.md:

     <spec_lite_template>
       # [FEATURE_NAME] - Quick Reference

       **[1-3 sentence summary of the feature]**

       ## What It Does
       [Brief description]

       ## Key Components
       - [Component 1]: [One-line description]
       - [Component 2]: [One-line description]

       ## Quick Access
       - Entry: [Where to find it in the app]
       - Main File: [key file path]

       ## Status
       ✅ Implemented and documented retroactively
     </spec_lite_template>

  4. CREATE code-references.md:

     <code_references_template>
       # Code References: [FEATURE_NAME]

       ## Files Analyzed

       ### UI Components
       | File | Purpose | Lines |
       |------|---------|-------|
       | [path] | [description] | ~[count] |

       ### Services/Logic
       | File | Purpose | Lines |
       |------|---------|-------|
       | [path] | [description] | ~[count] |

       ### API/Backend
       | File | Purpose | Lines |
       |------|---------|-------|
       | [path] | [description] | ~[count] |

       ### Configuration
       | File | Purpose |
       |------|---------|
       | [path] | [description] |

       ## Analysis Notes

       ### Key Findings
       - [Finding 1]
       - [Finding 2]

       ### Architecture Patterns
       [Describe patterns found in the code]

       ### Potential Refactoring Areas
       [If any issues were noticed - optional]
     </code_references_template>

  5. CREATE kanban.json from template:
     - LOAD template: @agent-os/templates/json/spec-kanban-template.json
     - REPLACE placeholders:
       - {{SPEC_ID}}: "retro-[feature-name]"
       - {{SPEC_NAME}}: [FEATURE_NAME]
       - {{SPEC_PREFIX}}: "RETRO"
       - {{CREATED_AT}}: [CURRENT_DATE]
       - {{TOTAL_STORIES}}: 0
       - {{TOTAL_EFFORT}}: 0
     - SET values for retroactive spec:
       - resumeContext.currentPhase: "completed"
       - resumeContext.nextPhase: null
       - resumeContext.progressIndex: 0
       - resumeContext.totalStories: 0
       - boardStatus.total: 0
       - boardStatus.ready: 0
       - statistics.totalEffort: 0
       - statistics.remainingEffort: 0
       - execution.status: "completed"
       - stories: []
       - executionPlan.phases: []
     - SAVE to: agent-os/specs/YYYY-MM-DD-retro-[feature-name]/kanban.json
</mandatory_actions>

</step>

<step number="6" name="spec_review">

### Step 6: User Review and Completion

Present completed spec to user for review.

<mandatory_actions>
  1. PRESENT summary:
     ```
     ✅ Retroactive specification created!

     **Location:** agent-os/specs/YYYY-MM-DD-retro-[feature-name]/

     **Files Created:**
     - spec.md - Full specification
     - spec-lite.md - Quick reference
     - code-references.md - Analyzed code files
     - kanban.json - Empty kanban (feature already implemented)

     **Feature Summary:**
     - [Brief description]
     - [Number] code files analyzed
     - [Key components identified]

     **No stories created** (feature already implemented)
     ```

  2. ASK for review:
     ```
     Question: "Please review the specification. What would you like to do?"

     Options:
     1. Specification is complete
        → Ready for future change management

     2. I need to edit the spec
        → I'll open the files for you to edit

     3. Missing something important
        → Let me know what's missing and I'll update
     ```

  3. IF user wants to edit:
     - INFORM: "Files are at: agent-os/specs/YYYY-MM-DD-retro-[feature-name]/"
     - INFORM: "After editing, you can use /change-spec to manage future changes"

  4. DOCUMENT completion
</mandatory_actions>

</step>

</process_flow>

## Final Checklist

<verify>
  - [ ] Feature identified and confirmed
  - [ ] Checked that spec doesn't already exist (or user chose to continue)
  - [ ] Code files discovered and analyzed
  - [ ] Interactive clarification completed
  - [ ] Feature understanding validated by user
  - [ ] spec.md created with architecture details
  - [ ] spec-lite.md created as quick reference
  - [ ] code-references.md created with file inventory
  - [ ] kanban.json created (empty, retroactive spec)
  - [ ] User reviewed and approved
  - [ ] Marked as retroactive (not forward-planned)
</verify>
