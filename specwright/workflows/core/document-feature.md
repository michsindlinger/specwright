---
description: Feature Documentation - Create user-facing docs from completed specs
globs:
alwaysApply: false
version: 2.0
encoding: UTF-8
installation: global
---

# Document Feature Workflow

## What's New in v2.0

- **Main Agent Pattern**: Steps 1-3 executed by Main Agent directly (was: context-fetcher Sub-Agent)
- **Path fixes**: `specwright/docs/` instead of `.specwright/docs/`
- **Kept**: date-checker (Utility), file-creator (Utility)

## Overview

Create comprehensive user-facing documentation for completed features in the hierarchical docs/ structure, transforming development specs into application documentation.

**IMPORTANT: All feature documentation must be written in English, regardless of the application's target language or market.**

**When to use:**
- After completing a feature via /create-spec + /execute-tasks
- When a spec has all stories done and needs user documentation
- Completes the Feature Lifecycle: plan → implement → **document**

<pre_flight_check>
  EXECUTE: @specwright/workflows/meta/pre-flight.md
</pre_flight_check>

<process_flow>

<step number="1" name="spec_selection">

### Step 1: Completed Spec Selection

Identify completed specs in specwright/specs/ that are ready for user documentation.

<selection_criteria>
  Completion indicators:
  - kanban.json with all stories status = "done"
  - OR tasks.md with all items completed
  - Implementation finished
  - User confirmation of completion

  Documentation status:
  - Not yet documented in docs/ structure
  - OR existing docs/ entry that needs updating
</selection_criteria>

<user_interaction>
  IF multiple completed specs:
    PRESENT numbered list of completed specs
    WAIT for user selection
  ELSE IF single completed spec:
    CONFIRM with user
  ELSE IF no completed specs:
    SUGGEST completing implementation first
    EXIT process
</user_interaction>

</step>

<step number="2" name="spec_analysis">

### Step 2: Spec Analysis

Thoroughly analyze the selected completed spec and any related changes.

<mandatory_reads>
  READ:
  - specwright/specs/[SELECTED_SPEC]/spec.md
  - specwright/specs/[SELECTED_SPEC]/spec-lite.md
  - specwright/specs/[SELECTED_SPEC]/stories/ (all story files)

  IF EXISTS:
  - specwright/specs/[SELECTED_SPEC]/changes/*.md (change history)
  - specwright/specs/[SELECTED_SPEC]/kanban.json
</mandatory_reads>

<analysis_output>
  EXTRACT:
  - Feature summary (synthesize complete feature description)
  - User benefits (identify end-user value proposition)
  - Functionality scope (determine all implemented capabilities)
  - Sub-features (identify logical feature groupings)
</analysis_output>

</step>

<step number="3" name="documentation_structure_planning">

### Step 3: Documentation Structure Planning

Determine optimal documentation structure based on feature complexity and scope.

<structure_decision>
  IF feature has multiple distinct capabilities:
    PLAN hierarchical structure with sub-features
    CREATE main feature.md + sub-features/ folder

  ELSE IF feature is a cohesive single capability:
    PLAN single document structure
    CREATE single feature.md

  ELSE IF feature extends existing documented feature:
    PLAN update to existing documentation
    UPDATE existing docs/ structure
</structure_decision>

<folder_naming>
  Main feature:
  - Format: Feature-Name (PascalCase with hyphens)
  - Location: specwright/docs/Feature-Name/
  - Main file: feature.md

  Sub-features:
  - Location: specwright/docs/Feature-Name/sub-features/
  - Format: sub-feature-name.md (kebab-case)
</folder_naming>

**Examples:**
```
# Single feature
specwright/docs/Password-Reset/feature.md

# Hierarchical feature
specwright/docs/User-Management/feature.md
specwright/docs/User-Management/sub-features/registration.md
specwright/docs/User-Management/sub-features/profile-editing.md
specwright/docs/User-Management/sub-features/account-deletion.md
```

</step>

<step number="4" subagent="date-checker" name="date_determination">

### Step 4: Date Determination

USE: date-checker subagent
PROMPT: "Get current date in YYYY-MM-DD format for documentation headers"

STORE: Date for use in documentation headers

</step>

<step number="5" subagent="file-creator" name="docs_structure_creation">

### Step 5: Documentation Structure Creation

USE: file-creator subagent

CREATE directory structure:
- specwright/docs/[FEATURE_NAME]/
- specwright/docs/[FEATURE_NAME]/sub-features/ (if hierarchical)

</step>

<step number="6" subagent="file-creator" name="main_feature_documentation">

### Step 6: Main Feature Documentation

USE: file-creator subagent

CREATE: specwright/docs/[FEATURE_NAME]/feature.md

**Required sections:**

```markdown
# [FEATURE_NAME]

> Feature Documentation
> Last Updated: [DATE]
> Implementation: Completed

## Purpose

[User-focused description of feature purpose and value]

## What This Feature Does

### Core Functionality
- [PRIMARY_CAPABILITY_1]: [USER_IMPACT]
- [PRIMARY_CAPABILITY_2]: [USER_IMPACT]

### Additional Capabilities
- [SECONDARY_CAPABILITY_1]: [USER_BENEFIT]

## How to Use

### Getting Started
1. [FIRST_STEP_FOR_USER]
2. [SECOND_STEP_FOR_USER]
3. [THIRD_STEP_FOR_USER]

### Step-by-Step Guide

#### [USE_CASE_1]
1. Navigate to [LOCATION/UI_ELEMENT]
2. [ACTION_TO_TAKE]
3. [EXPECTED_RESULT]

## Key Benefits

### For Users
- **[BENEFIT_1]**: [EXPLANATION_OF_VALUE]
- **[BENEFIT_2]**: [EXPLANATION_OF_VALUE]

### For Organizations
- **[ORGANIZATIONAL_BENEFIT_1]**: [BUSINESS_VALUE]

## Related Features (if applicable)

This feature works together with:
- **[RELATED_FEATURE]**: [HOW_THEY_WORK_TOGETHER]

## Technical Notes (if relevant to users)

### Limitations
- [LIMITATION_1]: [WORKAROUND_IF_AVAILABLE]
```

**Writing style:**
- Language: English (all documentation must be in English)
- Audience: End users, not developers
- Tone: Clear and helpful
- Focus: What the user gains

</step>

<step number="7" subagent="file-creator" name="sub_feature_documentation">

### Step 7: Sub-Feature Documentation (Conditional)

IF hierarchical structure planned AND sub-features identified:

USE: file-creator subagent

FOR EACH sub-feature:
  CREATE: specwright/docs/[FEATURE_NAME]/sub-features/[sub-feature-name].md

  **Template:**
  ```markdown
  # [SUB_FEATURE_NAME]

  > Sub-Feature of: [MAIN_FEATURE_NAME]
  > Part of: specwright/docs/[MAIN_FEATURE_NAME]/feature.md
  > Last Updated: [DATE]

  ## Purpose

  [Specific purpose of this sub-feature]

  ## How It Works

  [Focused explanation of this specific functionality]

  ## User Instructions

  ### To Use This Feature:
  1. [SPECIFIC_STEP_1]
  2. [SPECIFIC_STEP_2]
  3. [EXPECTED_RESULT]
  ```

ELSE:
  SKIP this step

</step>

<step number="8" subagent="file-creator" name="documentation_index_update">

### Step 8: Documentation Index Update

IF multiple features documented OR first feature:

UPDATE or CREATE: specwright/docs/README.md

```markdown
# Feature Documentation Index

> Application Feature Documentation
> Generated: [DATE]

## Available Features

- **[Feature-Name-1]**: [BRIEF_DESCRIPTION] → specwright/docs/[Feature-Name-1]/feature.md
- **[Feature-Name-2]**: [BRIEF_DESCRIPTION] → specwright/docs/[Feature-Name-2]/feature.md

## How to Use This Documentation

Each feature has its own folder with comprehensive documentation:
- **feature.md**: Complete feature overview and instructions
- **sub-features/**: Detailed documentation for specific capabilities (where applicable)
```

</step>

<step number="9" name="cross_reference_creation">

### Step 9: Cross-Reference Creation

<mandatory_actions>
  1. ADD reference in original spec.md pointing to docs:
     ```markdown
     ---

     ## Documentation

     User documentation: specwright/docs/[FEATURE_NAME]/feature.md
     ```

  2. VERIFY all cross-references are valid
</mandatory_actions>

</step>

<step number="10" name="user_review">

### Step 10: User Review

PRESENT completed documentation:
```
Feature Documentation Complete!

Created:
- Main Documentation: specwright/docs/[FEATURE_NAME]/feature.md
[- Sub-feature docs (if created)]
[- Documentation index updated]

This transforms the development spec into user-facing documentation
focused on practical usage and benefits.

Please review and let me know if any adjustments are needed.
```

IF user approves: COMPLETE
IF user requests changes: UPDATE and repeat review

</step>

</process_flow>

## Final Checklist

<verify>
  - [ ] Completed spec selected and analyzed
  - [ ] Documentation structure planned appropriately
  - [ ] Main feature.md created with all sections
  - [ ] Sub-feature docs created if needed
  - [ ] Documentation index updated
  - [ ] Cross-references established
  - [ ] User-focused language throughout (English)
  - [ ] Clear instructions and examples provided
  - [ ] All user-visible functionality covered
</verify>
