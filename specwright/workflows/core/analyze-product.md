---
description: Analyze existing product and install Specwright with documentation
globs:
alwaysApply: false
version: 2.0
encoding: UTF-8
installation: global
---

# Analyze Product Workflow

## What's New in v2.0

- **Main Agent Pattern**: Steps 1-7, 9-10 executed by Main Agent directly (was: context-fetcher/product-strategist Sub-Agents)
- **Skill Loading**: Product Strategy Skill loaded for product brief generation
- **Path fixes**: `specwright/product/` instead of `.specwright/product/`
- **Kept**: file-creator (Utility) for Step 8

## Overview

Install Specwright into an existing codebase by analyzing the current product state, extracting patterns, and creating comprehensive documentation.

<pre_flight_check>
  EXECUTE: @specwright/workflows/meta/pre-flight.md
</pre_flight_check>

<process_flow>

<step number="1" name="codebase_analysis">

### Step 1: Deep Codebase Analysis

Perform comprehensive analysis of the existing codebase.

<analysis_areas>
  <project_structure>
    - Directory organization
    - File naming patterns
    - Module structure
    - Build configuration
  </project_structure>

  <technology_detection>
    - Frameworks (package.json, Gemfile, requirements.txt, pom.xml)
    - Database systems (migrations, schema files)
    - Frontend framework (React, Vue, Angular, etc.)
    - Infrastructure configuration (Docker, K8s, etc.)
  </technology_detection>

  <architecture_detection>
    - Layer separation (controllers, services, repositories)
    - Domain structure (entities, value objects)
    - Dependency direction (clean architecture compliance)
    - Patterns in use (Repository, Factory, Strategy, etc.)
  </architecture_detection>

  <implementation_progress>
    - Completed features (functional endpoints, pages)
    - Authentication/authorization state
    - API endpoints count
    - Database tables/models
    - Test coverage
  </implementation_progress>

  <code_patterns>
    - Coding style (naming, formatting)
    - File organization patterns
    - Testing approach
    - Error handling patterns
  </code_patterns>
</analysis_areas>

**Output:** Internal analysis summary for next steps

</step>

<step number="2" name="gather_product_context">

### Step 2: Gather Product Context from User

Supplement codebase analysis with business context.

**Prompt User:**
```
Based on my analysis of your codebase, I can see you're building a [DETECTED_TYPE].

Tech Stack Detected:
- Backend: [DETECTED]
- Frontend: [DETECTED]
- Database: [DETECTED]

To properly set up Specwright, I need to understand:

1. Product Vision: What problem does this solve? Who are the target users?
2. Current State: Are there features I should know about that aren't obvious from the code?
3. Roadmap: What features are planned next?
4. Architecture Intent: Was a specific architecture pattern intended (Hexagonal, Clean, DDD)?
5. Team Practices: Any coding standards or practices I should capture?
```

**Store:** User responses for documentation

</step>

<step number="3" name="generate_product_brief">

### Step 3: Generate Product Brief

Create product-brief.md from analysis and user input.

<skill_loading>
  LOAD SKILL: Product Strategy
  PATH: .claude/skills/product-strategy/SKILL.md
  FALLBACK: ~/.specwright/templates/skills/product-strategy/SKILL.md
  PURPOSE: Guide product brief creation with strategic structure
</skill_loading>

**Process:**
1. Combine codebase analysis with user context
2. Extract features from existing code
3. Identify target users from user input
4. Document current state as baseline

**Prompt User for Review:**
```
I've created a Product Brief based on your codebase and our discussion.

Please review: specwright/product/product-brief.md

Is this accurate? Any corrections needed?
```

**Template:** `@specwright/templates/documents/product-brief.md`

<template_lookup>
  PATH: specwright/templates/documents/product-brief.md

  LOOKUP STRATEGY (Hybrid):
    1. TRY: Read from project (specwright/templates/documents/product-brief.md)
    2. IF NOT FOUND: Read from global (~/.specwright/templates/documents/product-brief.md)
    3. IF STILL NOT FOUND: Error - setup-devteam-global.sh not run

  NOTE: Most projects use global templates. Project override only when customizing.
</template_lookup>

**Output:** `specwright/product/product-brief.md`

</step>

<step number="4" name="generate_product_brief_lite">

### Step 4: Generate Product Brief Lite

Create condensed version for AI context.

**Template:** `@specwright/templates/documents/product-brief-lite.md`

<template_lookup>
  LOOKUP: specwright/templates/ (project) → ~/.specwright/templates/ (global fallback)
</template_lookup>

**Output:** `specwright/product/product-brief-lite.md`

</step>

<step number="5" name="generate_tech_stack">

### Step 5: Document Tech Stack

Create tech-stack.md from detected technologies.

**Process:**
1. Document all detected technologies with versions
2. Note infrastructure setup
3. Include deployment information
4. Add any gaps identified

**Prompt User:**
```
I've documented the tech stack I detected:

[SUMMARY_OF_DETECTED_STACK]

Please confirm or add any missing technologies:
```

**Template:** `@specwright/templates/documents/tech-stack.md`

<template_lookup>
  LOOKUP: specwright/templates/ (project) → ~/.specwright/templates/ (global fallback)
</template_lookup>

**Output:** `specwright/product/tech-stack.md`

</step>

<step number="6" name="generate_roadmap">

### Step 6: Generate Roadmap with Phase 0

Create roadmap with completed features in Phase 0.

**Process:**
1. Mark all detected features as completed in Phase 0
2. Add user-provided planned features to Phase 1+
3. Estimate effort for planned features

**Roadmap Structure:**
```markdown
## Phase 0: Already Completed

- [x] [DETECTED_FEATURE_1]
- [x] [DETECTED_FEATURE_2]
- [x] [DETECTED_FEATURE_3]

## Phase 1: Current Development

- [ ] [USER_PLANNED_FEATURE_1]
- [ ] [USER_PLANNED_FEATURE_2]
```

**Template:** `@specwright/templates/documents/roadmap.md`

<template_lookup>
  LOOKUP: specwright/templates/ (project) → ~/.specwright/templates/ (global fallback)
</template_lookup>

**Output:** `specwright/product/roadmap.md`

</step>

<step number="7" name="architecture_analysis">

### Step 7: Architecture Decision & Analysis

Analyze existing architecture and document patterns.

**Process:**
1. Detect current architecture pattern from code structure
2. Assess compliance with pattern
3. Identify deviations or inconsistencies
4. Recommend approach for future development

**Prompt User with AskUserQuestion:**
```
I detected the following architecture pattern: [DETECTED_PATTERN]

Compliance Assessment:
- [ASPECT_1]: [COMPLIANT/PARTIAL/NON_COMPLIANT]
- [ASPECT_2]: [COMPLIANT/PARTIAL/NON_COMPLIANT]

Some existing code doesn't follow the pattern. Options:

1. Document current state, apply pattern only to new features (Recommended for large codebases)
2. Plan refactoring to align existing code with pattern
3. Define new pattern and apply to new features only
```

<conditional_logic>
  IF user chooses option 1:
    DOCUMENT: Current state as-is
    NOTE: "Apply pattern to new features only"
  ELIF user chooses option 2:
    CREATE: Refactoring tasks in roadmap
    DOCUMENT: Target architecture
  ELSE:
    ASK: Which pattern to use going forward
    DOCUMENT: New pattern for future
</conditional_logic>

**Template:** `@specwright/templates/documents/architecture-decision.md`

<template_lookup>
  LOOKUP: specwright/templates/ (project) → ~/.specwright/templates/ (global fallback)
</template_lookup>

**Output:** `specwright/product/architecture-decision.md`

</step>

<step number="8" subagent="file-creator" name="boilerplate_generation">

### Step 8: Generate Boilerplate for New Features

USE: file-creator subagent

Create boilerplate structure for future feature development.

**Process:**
1. Based on architecture-decision.md
2. Match existing code patterns where compliant
3. Provide clean structure for new features
4. Document where each file type goes

**Output:**
- `specwright/product/boilerplate/` (directory structure)
- `specwright/product/architecture-structure.md`

**Template:** `@specwright/templates/documents/architecture-structure.md`

<template_lookup>
  LOOKUP: specwright/templates/ (project) → ~/.specwright/templates/ (global fallback)
</template_lookup>

</step>

<step number="9" name="refactoring_analysis">

### Step 9: Refactoring Analysis (Optional)

If user chose refactoring in Step 7, create refactoring plan.

<conditional_logic>
  IF refactoring chosen:
    ANALYZE: Code areas needing refactoring
    ESTIMATE: Effort for each area
    PRIORITIZE: By impact and risk
    ADD: Refactoring tasks to roadmap

    **Prompt User:**
    ```
    Refactoring Recommendations:

    High Priority:
    - [AREA_1]: [REASON] - Effort: [M]

    Medium Priority:
    - [AREA_2]: [REASON] - Effort: [L]

    Low Priority (Leave as-is):
    - [AREA_3]: [REASON]

    Shall I add these to the roadmap?
    ```
  ELSE:
    SKIP this step
</conditional_logic>

</step>

<step number="10" name="summary">

### Step 10: Installation Summary

Present summary of Specwright installation.

**Summary:**
```
Specwright Successfully Installed!

What I Found:
- Tech Stack: [SUMMARY]
- Completed Features: [COUNT]
- Code Patterns: [DETECTED_PATTERNS]
- Architecture: [DETECTED_OR_RECOMMENDED]

Created Documentation:
- product-brief.md - Product definition (based on analysis)
- product-brief-lite.md - Condensed version
- tech-stack.md - Detected technologies
- roadmap.md - Phase 0 (completed) + planned features
- architecture-decision.md - Patterns and decisions
- architecture-structure.md - File placement guide
- boilerplate/ - Structure for new features

Location: specwright/product/

Next Steps:
1. Review generated documentation for accuracy
2. Run /build-development-team to set up agents
3. Start using /create-spec for new features

Your codebase is now Specwright-enabled!
```

</step>

</process_flow>

## Error Handling

<error_scenarios>
  <scenario name="no_clear_structure">
    <condition>Cannot determine project type or structure</condition>
    <action>Ask user for clarification about project</action>
  </scenario>
  <scenario name="multiple_patterns">
    <condition>Multiple architecture patterns detected</condition>
    <action>Ask user which pattern to document as primary</action>
  </scenario>
  <scenario name="missing_dependencies">
    <condition>Cannot determine full tech stack</condition>
    <action>List detected technologies and ask for missing pieces</action>
  </scenario>
</error_scenarios>

## Output Files

| File | Description | Special Notes |
|------|-------------|---------------|
| product-brief.md | From analysis + user input | Reflects current state |
| product-brief-lite.md | Condensed version | |
| tech-stack.md | Detected technologies | With versions |
| roadmap.md | Phase 0 = completed | Based on code analysis |
| architecture-decision.md | Detected patterns | Includes compliance assessment |
| architecture-structure.md | File placement | May differ from existing code |
| boilerplate/ | For new features | Clean architecture template |

## Execution Summary

**Duration:** 20-30 minutes
**User Interactions:** 4-5 decision points
**Output:** 6 files + 1 directory structure
