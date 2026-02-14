---
description: Platform Planning for multi-module projects with Specwright
globs:
alwaysApply: false
version: 2.0
encoding: UTF-8
installation: global
---

# Platform Planning Workflow

Generate comprehensive platform documentation for multi-module projects: platform-brief, module briefs, dependencies, architecture, and roadmap.

**Use this workflow when:**
- Project consists of multiple interconnected modules/subsystems
- Different modules have distinct purposes but share common infrastructure
- Example: AI System = Hardware + Knowledge Management + Use Cases + Security + Operations

**Use /plan-product instead when:**
- Single cohesive product
- All features share same codebase and architecture

<pre_flight_check>
  EXECUTE: @specwright/workflows/meta/pre-flight.md
</pre_flight_check>

<version_history>

**v2.0 Changes (Architecture Migration):**
- **BREAKING: Steps 2, 4, 5, 5.6, 6, 7 - Main Agent + Skills** - All complex tasks now executed by main agent guided by dedicated skills (was: Sub-Agent delegation)
- **NEW: Step 5.5 (Project Standards)** - Optional tech-stack-aware coding standards generation
- **NEW: Step 5.7 (UX Patterns)** - Optional UX patterns definition for frontend modules
- **REUSES: 5 Planning Skills from plan-product** - product-strategy, tech-stack-recommendation, design-system-extraction, ux-patterns-definition, architecture-decision
- **REMOVED: Sub-Agent delegations** - No more `<delegation>` blocks for non-utility agents
- **KEPT: Utility Agents** - file-creator (5.8, 10), context-fetcher (if needed)
- **RENUMBERED: Secrets Setup** - Was 5.6, now 5.8 (to accommodate new steps)

**v1.1 Changes:**
- Initial platform planning workflow
- Sub-Agent delegation pattern

</version_history>

<process_flow>

<step number="1" name="platform_idea_capture">

### Step 1: Gather Platform Information

Request platform information from user to understand the multi-module nature.

**Prompt User:**
```
Please describe your platform:

1. Platform Vision (what's the overall system?)
2. Core Modules (what are the main subsystems?)
3. Target Users (who uses this platform?)
4. What problem does the platform solve?

Example structure:
Platform: Local AI System
Modules:
- Hardware Setup (Mac Studio installation)
- Knowledge Management (RAG, ETL, Vector DB)
- Use Cases (Spec Analysis, Videos, Requirements, Contracts)
- Security (Roles, Permissions, Data Protection)
- Operations (Queueing, Backup, Monitoring)
```

<data_sources>
  <primary>user_direct_input</primary>
  <fallback_sequence>
    1. @~/.specwright/standards/tech-stack.md
    2. @CLAUDE.md
  </fallback_sequence>
</data_sources>

</step>

<step number="2" name="platform_brief_creation">

### Step 2: Platform Brief Creation (Interactive)

Main agent creates comprehensive platform brief interactively, guided by the product-strategy skill.

<skill_loading>
  LOAD skill: product-strategy

  LOOKUP STRATEGY (Hybrid):
    1. TRY: .claude/skills/product-strategy/SKILL.md (project)
    2. IF NOT FOUND: ~/.specwright/templates/skills/product-strategy/SKILL.md (global)
    3. IF STILL NOT FOUND: Continue without skill (use general product knowledge)
</skill_loading>

**Process (guided by product-strategy skill):**
1. Analyze user input for completeness
2. Identify platform-level information:
   - Overall vision and goals
   - Platform-wide target audience
   - Core problem being solved
   - Platform-level success metrics
   - Integration points between modules
3. Ask clarifying questions interactively
4. Generate platform-brief.md when complete

**Template:** `specwright/templates/platform/platform-brief-template.md`
**Output:** `specwright/product/platform-brief.md`

<template_lookup>
  PATH: specwright/templates/platform/platform-brief-template.md

  LOOKUP STRATEGY (Hybrid):
    1. TRY: Read from project (specwright/templates/platform/platform-brief-template.md)
    2. IF NOT FOUND: Read from global (~/.specwright/templates/platform/platform-brief-template.md)
    3. IF STILL NOT FOUND: Error - platform templates not installed

  NOTE: Global templates preferred for consistency.
</template_lookup>

<quality_check>
  Platform brief must include:
  - Clear platform vision
  - Module overview (3+ modules)
  - Platform-wide target audience
  - Core problem statement
  - Integration strategy
  - Success metrics

  IF incomplete:
    CONTINUE asking questions
  ELSE:
    PROCEED to step 3
</quality_check>

</step>

<step number="3" name="user_review_platform_brief">

### Step 3: User Review Gate - Platform Brief

**PAUSE FOR USER APPROVAL**

**Prompt User:**
```
I've created your Platform Brief.

Please review: specwright/product/platform-brief.md

Options:
1. Approve and continue to module planning
2. Request changes
```

<conditional_logic>
  IF user approves:
    PROCEED to step 4
  ELSE:
    MAKE changes
    RETURN to step 3
</conditional_logic>

</step>

<step number="4" name="module_identification">

### Step 4: Module Identification & Brief Creation

Main agent identifies modules and creates individual module briefs, guided by the product-strategy skill (already loaded in Step 2).

**Process (guided by product-strategy skill):**
1. Read platform-brief.md for context
2. Identify distinct modules from platform brief
3. For each module, create module-brief.md with:
   - Module name and purpose
   - Module-specific features
   - Dependencies on other modules
   - Module-specific tech requirements
   - Module success criteria
4. Create directory structure:
   ```
   specwright/product/modules/
   ├── [module-1-name]/
   │   └── module-brief.md
   ├── [module-2-name]/
   │   └── module-brief.md
   └── ...
   ```

**Template:** `specwright/templates/platform/module-brief-template.md`

<template_lookup>
  LOOKUP STRATEGY (Hybrid):
    1. TRY: specwright/templates/platform/module-brief-template.md (project)
    2. IF NOT FOUND: ~/.specwright/templates/platform/module-brief-template.md (global)
</template_lookup>

**Output:** `specwright/product/modules/[module-name]/module-brief.md` (multiple)

</step>

<step number="5" name="tech_stack_recommendation">

### Step 5: Platform-Wide Tech Stack Recommendation

Main agent analyzes platform requirements and recommends tech stack, guided by the tech-stack-recommendation skill.

<skill_loading>
  LOAD skill: tech-stack-recommendation

  LOOKUP STRATEGY (Hybrid):
    1. TRY: .claude/skills/tech-stack-recommendation/SKILL.md (project)
    2. IF NOT FOUND: ~/.specwright/templates/skills/tech-stack-recommendation/SKILL.md (global)
    3. IF STILL NOT FOUND: Continue without skill (use general tech knowledge)
</skill_loading>

**Process (guided by tech-stack-recommendation skill):**
1. Load tech-stack-template.md (hybrid lookup: project → global)
2. Read platform-brief.md and all module briefs for context
3. Analyze platform-wide requirements:
   - Cross-module technologies (shared infrastructure)
   - Module-specific technologies (per-module needs)
   - Integration requirements
   - Scalability needs
4. Recommend tech stack at TWO levels:
   a) Platform-level (shared): hosting, CI/CD, monitoring, databases
   b) Module-level (specific): frameworks, libraries per module
5. Present recommendations to user via AskUserQuestion
6. Fill template with user's choices
7. Write to specwright/product/tech-stack.md

**Template:** `specwright/templates/product/tech-stack-template.md`

<template_lookup>
  LOOKUP STRATEGY (Hybrid):
    1. TRY: specwright/templates/product/tech-stack-template.md (project)
    2. IF NOT FOUND: ~/.specwright/templates/product/tech-stack-template.md (global)
</template_lookup>

**Output:** `specwright/product/tech-stack.md`

<note>
  Tech stack should distinguish:
  - Platform-wide technologies (shared infrastructure)
  - Module-specific technologies (per-module requirements)
</note>

</step>

<step number="5.5" name="generate_project_standards">

### Step 5.5: Generate Project-Specific Standards (Optional)

Main agent optionally generates tech-stack-aware coding standards, guided by the tech-stack-recommendation skill (already loaded in Step 5).

<user_choice>
  ASK user:
  "Generate project-specific coding standards?

  YES (Recommended):
  → Standards customized for your platform tech stack
  → Covers platform-wide AND module-specific conventions
  → Saved to specwright/standards/code-style.md and best-practices.md
  → Overrides global ~/.specwright/standards/

  NO:
  → Use global standards from ~/.specwright/standards/
  → Faster setup, consistent across all your projects

  Your choice: [YES/NO]"
</user_choice>

<conditional_logic>
  IF user_choice = YES:
    USE skill: tech-stack-recommendation (already loaded from Step 5)

    Process:
    1. Read tech-stack.md to understand frameworks (platform + module level)
    2. Read global standards as base (~/.specwright/standards/code-style.md, best-practices.md)
    3. Enhance with tech-stack-specific rules:
       - Platform-wide conventions (shared infrastructure patterns)
       - Module-specific conventions per tech stack
    4. Write to specwright/standards/code-style.md
    5. Write to specwright/standards/best-practices.md

    NOTE: "Project-specific standards generated"

  ELSE:
    NOTE: "Using global standards from ~/.specwright/standards/"
    SKIP standards generation
</conditional_logic>

</step>

<step number="5.6" name="extract_design_system">

### Step 5.6: Extract Platform Design System (Optional)

Main agent analyzes existing design references and creates design-system.md for frontend guidance, guided by the design-system-extraction skill.

<user_choice>
  ASK user:
  "Does this platform have a user interface (web app, dashboard, mobile app)?

  If yes: Do you have existing design references?

  Options:
  1. YES - I have a URL (Figma, existing site, competitor)
  2. YES - I have screenshots
  3. NO UI - Skip (backend-only platform)
  4. LATER - Skip for now, run /extract-design later"
</user_choice>

<conditional_logic>
  IF user_choice = 1 (URL) OR 2 (Screenshots):

    <skill_loading>
      LOAD skill: design-system-extraction

      LOOKUP STRATEGY (Hybrid):
        1. TRY: .claude/skills/design-system-extraction/SKILL.md (project)
        2. IF NOT FOUND: ~/.specwright/templates/skills/design-system-extraction/SKILL.md (global)
        3. IF STILL NOT FOUND: Continue without skill (use general design knowledge)
    </skill_loading>

    Process (guided by design-system-extraction skill):
    1. Load design-system-template.md (hybrid lookup: project → global)
    2. Analyze design source:
       - IF URL: Fetch and analyze via WebFetch
       - IF Screenshots: Read and analyze via multimodal (Read tool)
    3. Extract:
       - Color palette (primary, secondary, semantic)
       - Typography (fonts, sizes, weights)
       - Spacing patterns
       - UI components catalog
       - Layout patterns
    4. Fill template with extracted values
    5. Write to: specwright/product/design-system.md
    6. If screenshots: Copy to specwright/product/design/screenshots/

    NOTE: "Design system created at specwright/product/design-system.md"

  ELSE IF user selects "NO UI" or "LATER":
    NOTE: "Skipping design system extraction"
    IF "LATER":
      NOTE: "Run /extract-design when ready to setup design system"
</conditional_logic>

**Template:** `specwright/templates/product/design-system-template.md`

<template_lookup>
  LOOKUP STRATEGY (Hybrid):
    1. TRY: specwright/templates/product/design-system-template.md (project)
    2. IF NOT FOUND: ~/.specwright/templates/product/design-system-template.md (global)
</template_lookup>

**Output:** `specwright/product/design-system.md` (optional)

<note>
  Design system is optional for platforms without UI.
  Can be extracted later via standalone /extract-design command.
  Frontend modules will use this during implementation.
</note>

</step>

<step number="5.7" name="define_ux_patterns">

### Step 5.7: Define UX Patterns (Optional, if Frontend modules exist)

Main agent defines overarching UX patterns interactively, guided by the ux-patterns-definition skill.

<conditional_logic>
  CHECK tech-stack.md:
  IF frontend_framework_exists (in any module):
    PROCEED with UX pattern definition
  ELSE:
    NOTE: "No frontend detected in any module, skipping UX patterns"
    SKIP to Step 5.8
</conditional_logic>

<skill_loading>
  LOAD skill: ux-patterns-definition

  LOOKUP STRATEGY (Hybrid):
    1. TRY: .claude/skills/ux-patterns-definition/SKILL.md (project)
    2. IF NOT FOUND: ~/.specwright/templates/skills/ux-patterns-definition/SKILL.md (global)
    3. IF STILL NOT FOUND: Continue without skill (use general UX knowledge)
</skill_loading>

**Process (guided by ux-patterns-definition skill):**
1. Load ux-patterns-template.md (hybrid lookup: project → global)
2. Read platform-brief.md, module briefs, tech-stack.md, and design-system.md (if exists) for context
3. Analyze platform type and user context across modules
4. Recommend UX patterns for:
   - Navigation (cross-module navigation, module switching)
   - User flows (key workflows spanning multiple modules)
   - Interaction patterns (buttons, forms, drag-drop)
   - Feedback patterns (loading, success, error, empty states)
   - Mobile patterns (if applicable)
   - Accessibility (WCAG level, keyboard nav, screen readers)
   - Cross-module consistency (shared patterns across modules)
5. Discuss with user interactively:
   - Present recommendations with rationale
   - Ask about preferences and constraints
   - Show alternatives with pros/cons
   - Iterate until user approves
6. Fill template with approved patterns
7. Write to: specwright/product/ux-patterns.md

**Template:** `specwright/templates/product/ux-patterns-template.md`

<template_lookup>
  LOOKUP STRATEGY (Hybrid):
    1. TRY: specwright/templates/product/ux-patterns-template.md (project)
    2. IF NOT FOUND: ~/.specwright/templates/product/ux-patterns-template.md (global)
</template_lookup>

**Output:** `specwright/product/ux-patterns.md` (optional, frontend modules only)

</step>

<step number="5.8" subagent="file-creator" name="secrets_setup">

### Step 5.8: Secrets and Credentials Setup

Use file-creator agent to set up the secrets management template.

<delegation>
  DELEGATE to file-creator via Task tool:

  PROMPT:
  "Set up secrets management template for the platform.

  Context:
  - Platform Name: from specwright/product/platform-brief.md

  Tasks:
  1. Load secrets-template.md (hybrid lookup: project → global)
     - TRY: specwright/templates/product/secrets-template.md
     - FALLBACK: ~/.specwright/templates/product/secrets-template.md
  2. Extract platform name
  3. Replace [PROJECT_NAME] placeholder
  4. Write to: specwright/product/secrets.md

  Note: This file is used to track required credentials for the platform lifecycle.
  It is ignored by git for security."

  WAIT for file-creator completion
  NOTE: "Secrets template created at specwright/product/secrets.md"
</delegation>

**Template:** `specwright/templates/product/secrets-template.md`
**Output:** `specwright/product/secrets.md`

</step>

<step number="6" name="dependency_analysis">

### Step 6: Module Dependency Analysis

Main agent analyzes and documents dependencies between modules, guided by the architecture-decision skill.

<skill_loading>
  LOAD skill: architecture-decision

  LOOKUP STRATEGY (Hybrid):
    1. TRY: .claude/skills/architecture-decision/SKILL.md (project)
    2. IF NOT FOUND: ~/.specwright/templates/skills/architecture-decision/SKILL.md (global)
    3. IF STILL NOT FOUND: Continue without skill (use general architecture knowledge)
</skill_loading>

**Process (guided by architecture-decision skill):**
1. Load module-dependencies-template.md (hybrid lookup: project → global)
2. Read platform-brief.md, all module briefs, and tech-stack.md for context
3. Analyze dependencies between modules:
   - Data dependencies (Module A needs data from Module B)
   - Service dependencies (Module A calls Module B APIs)
   - Infrastructure dependencies (shared resources)
   - Deployment dependencies (Module A must deploy before Module B)
4. Create dependency graph (Mermaid diagram)
5. Document each dependency:
   - Type (data/service/infrastructure/deployment)
   - Direction (A → B)
   - Coupling level (tight/loose)
   - Critical path (blocking/non-blocking)
6. Identify circular dependencies (red flag)
7. Recommend dependency resolution strategies
8. Write to: specwright/product/architecture/module-dependencies.md

**Template:** `specwright/templates/platform/module-dependencies-template.md`

<template_lookup>
  LOOKUP STRATEGY (Hybrid):
    1. TRY: specwright/templates/platform/module-dependencies-template.md (project)
    2. IF NOT FOUND: ~/.specwright/templates/platform/module-dependencies-template.md (global)
</template_lookup>

**Output:** `specwright/product/architecture/module-dependencies.md`

</step>

<step number="7" name="platform_architecture">

### Step 7: Platform Architecture Design

Main agent designs overall platform architecture, guided by the architecture-decision skill (already loaded in Step 6).

**Process (guided by architecture-decision skill):**
1. Load platform-architecture-template.md (hybrid lookup: project → global)
2. Read all context:
   - Platform Brief: specwright/product/platform-brief.md
   - Module Briefs: specwright/product/modules/*/module-brief.md
   - Tech Stack: specwright/product/tech-stack.md
   - Dependencies: specwright/product/architecture/module-dependencies.md
3. Design architecture covering:
   - System overview diagram (all modules)
   - Data flow between modules
   - API/Integration layer
   - Shared infrastructure
   - Security boundaries
   - Deployment architecture
4. Recommend architecture patterns:
   - Monolith vs Microservices vs Modular Monolith
   - Event-driven vs Request/Response
   - Sync vs Async communication
5. Present recommendations to user with trade-offs
6. Get user approval
7. Write to: specwright/product/architecture/platform-architecture.md

**Template:** `specwright/templates/platform/platform-architecture-template.md`

<template_lookup>
  LOOKUP STRATEGY (Hybrid):
    1. TRY: specwright/templates/platform/platform-architecture-template.md (project)
    2. IF NOT FOUND: ~/.specwright/templates/platform/platform-architecture-template.md (global)
</template_lookup>

**Output:** `specwright/product/architecture/platform-architecture.md`

</step>

<step number="8" name="platform_roadmap">

### Step 8: Platform Roadmap Generation

Generate platform roadmap with module implementation phases.

**Process:**
1. Analyze module dependencies from step 6
2. Identify critical path (which modules must be built first)
3. Group modules into phases based on:
   - Dependencies (prerequisite modules first)
   - Business priority (high-value modules early)
   - Complexity (quick wins vs complex modules)
   - Risk (de-risk early vs defer)
4. Create phased roadmap:
   - Phase 1: Foundation (core infrastructure + critical modules)
   - Phase 2: Core Features (main value-generating modules)
   - Phase 3: Enhancement (additional modules)
   - Phase 4: Optimization (performance, monitoring, advanced features)
5. Add effort estimates per module (XS/S/M/L/XL)

**Prompt User:**
```
I've created a platform roadmap with [N] phases across [M] modules.

Please review: specwright/product/roadmap/platform-roadmap.md

Options:
1. Approve roadmap
2. Adjust module priorities or phases
3. Change phase groupings
```

<conditional_logic>
  IF user approves:
    PROCEED to step 9
  ELSE:
    APPLY adjustments
    REGENERATE roadmap
    RETURN to review
</conditional_logic>

**Template:** `specwright/templates/platform/platform-roadmap-template.md`

<template_lookup>
  LOOKUP: specwright/templates/ (project) → ~/.specwright/templates/ (global fallback)
</template_lookup>

**Output:** `specwright/product/roadmap/platform-roadmap.md`

</step>

<step number="9" name="module_roadmaps">

### Step 9: Per-Module Roadmap Generation

Generate individual roadmaps for each module showing internal features.

**Process:**
1. For each module in specwright/product/modules/:
   - Extract module features from module-brief.md
   - Create module-specific roadmap
   - Align with platform roadmap phase
   - Add module-specific milestones
2. Create directory structure:
   ```
   specwright/product/roadmap/
   ├── platform-roadmap.md          # Overall phases
   └── modules/
       ├── [module-1]/
       │   └── roadmap.md            # Module-specific features
       ├── [module-2]/
       │   └── roadmap.md
       └── ...
   ```

**Template:** `specwright/templates/platform/module-roadmap-template.md`

<template_lookup>
  LOOKUP: specwright/templates/ (project) → ~/.specwright/templates/ (global fallback)
</template_lookup>

**Output:** `specwright/product/roadmap/modules/[module-name]/roadmap.md` (multiple)

</step>

<step number="10" subagent="file-creator" name="update_claude_md">

### Step 10: Update Project CLAUDE.md

Use file-creator agent to update the project's CLAUDE.md with platform-specific configuration.

<delegation>
  DELEGATE to file-creator via Task tool:

  PROMPT:
  "Update project CLAUDE.md with platform configuration.

  Context:
  - Platform Brief: specwright/product/platform-brief.md
  - Modules: specwright/product/modules/*/module-brief.md

  Tasks:
  1. Load CLAUDE-PLATFORM.md template (hybrid lookup: project → global)
     - TRY: specwright/templates/CLAUDE-PLATFORM.md
     - FALLBACK: ~/.specwright/templates/CLAUDE-PLATFORM.md
  2. Extract platform information:
     - Platform name from platform-brief.md
     - List of all modules from specwright/product/modules/
     - Module count
  3. Replace placeholders in template:
     - [PLATFORM_NAME] → Actual platform name
     - [CURRENT_DATE] → Today's date (YYYY-MM-DD)
     - [MODULE_COUNT] → Number of modules
     - [MODULE_LIST] → Formatted list of modules with descriptions
     - [MODULE_BRIEF_PATHS] → List of module brief paths
     - [MODULE_ROADMAP_PATHS] → List of module roadmap paths
  4. Write to project root: CLAUDE.md

  Module list format:
  - **[Module Name]**: [Short description from module brief]

  Module paths format:
  - **[Module Name]**: specwright/product/modules/[module-name]/module-brief.md

  Ensure CLAUDE.md is properly formatted and all placeholders are replaced."

  WAIT for file-creator completion
  NOTE: "CLAUDE.md updated with platform configuration"
</delegation>

**Template:** `specwright/templates/CLAUDE-PLATFORM.md`
**Output:** `CLAUDE.md` (project root)

</step>

<step number="11" name="summary">

### Step 11: Planning Summary

Present summary of all created documentation.

**Summary:**
```
Platform Planning Complete!

Created Documentation:
✅ platform-brief.md - Platform vision
✅ [N] module-brief.md files - Module definitions
✅ tech-stack.md - Technology choices (platform + modules)
✅ code-style.md + best-practices.md - Project standards (if generated)
✅ secrets.md - Required credentials tracking
✅ design-system.md - UI design tokens (if platform has UI)
✅ ux-patterns.md - UX patterns (if frontend modules exist)
✅ module-dependencies.md - Dependency graph
✅ platform-architecture.md - System architecture
✅ platform-roadmap.md - Implementation phases
✅ [N] module roadmaps - Per-module feature plans
✅ CLAUDE.md - Updated with platform configuration

Directory Structure:
specwright/product/
├── platform-brief.md
├── tech-stack.md
├── secrets.md
├── design-system.md          # Optional (if UI exists)
├── ux-patterns.md             # Optional (if frontend modules)
├── modules/
│   ├── [module-1]/
│   │   └── module-brief.md
│   ├── [module-2]/
│   │   └── module-brief.md
│   └── ...
├── architecture/
│   ├── module-dependencies.md
│   └── platform-architecture.md
└── roadmap/
    ├── platform-roadmap.md
    └── modules/
        ├── [module-1]/
        │   └── roadmap.md
        └── ...

specwright/standards/          # Optional (if generated)
├── code-style.md
└── best-practices.md

CLAUDE.md (project root) - Updated with platform references

Next Steps:
1. Review all documentation
2. Run /build-development-team for platform-wide agents
3. If UI exists but design not extracted: Run /extract-design
4. Start with Phase 1 modules from platform-roadmap.md
5. Use /create-spec for each module's features
```

</step>

</process_flow>

## User Review Gates

1. **Step 3:** Platform Brief approval
2. **Step 7:** Platform Architecture approval
3. **Step 8:** Platform Roadmap approval

## Output Files

| File | Description | Template |
|------|-------------|----------|
| platform-brief.md | Platform vision | platform-brief-template.md |
| modules/[name]/module-brief.md | Module definitions | module-brief-template.md |
| tech-stack.md | Tech choices | tech-stack-template.md |
| code-style.md | Coding standards (optional) | Generated from global base |
| best-practices.md | Best practices (optional) | Generated from global base |
| secrets.md | Required credentials tracking | secrets-template.md |
| design-system.md | UI design tokens (optional) | design-system-template.md |
| ux-patterns.md | UX patterns (optional) | ux-patterns-template.md |
| architecture/module-dependencies.md | Dependency graph | module-dependencies-template.md |
| architecture/platform-architecture.md | System architecture | platform-architecture-template.md |
| roadmap/platform-roadmap.md | Platform phases | platform-roadmap-template.md |
| roadmap/modules/[name]/roadmap.md | Module roadmaps | module-roadmap-template.md |
| CLAUDE.md (project root) | Project configuration | CLAUDE-PLATFORM.md |

## Skills Used

| Skill | Steps | Purpose |
|-------|-------|---------|
| product-strategy | 2, 4 | Platform brief creation, module identification |
| tech-stack-recommendation | 5, 5.5 | Tech stack analysis, standards generation |
| design-system-extraction | 5.6 | Design system from URLs/screenshots |
| ux-patterns-definition | 5.7 | Cross-module navigation, flows, interactions |
| architecture-decision | 6, 7 | Dependency analysis, architecture design |

## Execution Summary

**Duration:** 30-45 minutes
**User Interactions:** 3-4 decision points
**Output:** 6+ core files + N module briefs + N module roadmaps + CLAUDE.md update

## Differences from /plan-product

**Use /plan-platform when:**
- Multiple distinct subsystems/modules
- Complex inter-module dependencies
- Different teams per module
- Phased rollout needed
- Example: AI System, E-commerce Platform, Multi-tenant SaaS

**Use /plan-product when:**
- Single cohesive product
- Unified codebase
- Single deployment
- Example: Todo App, Blog, CRM
