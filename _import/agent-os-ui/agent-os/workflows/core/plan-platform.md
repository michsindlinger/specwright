---
description: Platform Planning for multi-module projects with Agent OS
globs:
alwaysApply: false
version: 1.1
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
  EXECUTE: @agent-os/workflows/meta/pre-flight.md
</pre_flight_check>

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
    1. @~/.agent-os/standards/tech-stack.md
    2. @CLAUDE.md
  </fallback_sequence>
</data_sources>

</step>

<step number="2" subagent="product-strategist" name="platform_brief_creation">

### Step 2: Platform Brief Creation (Interactive)

Use product-strategist agent to create comprehensive platform brief.

**Process:**
1. Analyze user input for completeness
2. Identify platform-level information:
   - Overall vision and goals
   - Platform-wide target audience
   - Core problem being solved
   - Platform-level success metrics
   - Integration points between modules
3. Ask clarifying questions interactively
4. Generate platform-brief.md when complete

**Template:** `agent-os/templates/platform/platform-brief-template.md`
**Output:** `agent-os/product/platform-brief.md`

<template_lookup>
  PATH: agent-os/templates/platform/platform-brief-template.md

  LOOKUP STRATEGY (Hybrid):
    1. TRY: Read from project (agent-os/templates/platform/platform-brief-template.md)
    2. IF NOT FOUND: Read from global (~/.agent-os/templates/platform/platform-brief-template.md)
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

Please review: agent-os/product/platform-brief.md

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

<step number="4" subagent="product-strategist" name="module_identification">

### Step 4: Module Identification & Brief Creation

Use product-strategist agent to identify modules and create individual module briefs.

<delegation>
  DELEGATE to product-strategist via Task tool:

  PROMPT:
  "Extract modules from platform brief and create module briefs.

  Context:
  - Platform Brief: agent-os/product/platform-brief.md

  Tasks:
  1. Identify distinct modules from platform brief
  2. For each module, create module-brief.md with:
     - Module name and purpose
     - Module-specific features
     - Dependencies on other modules
     - Module-specific tech requirements
     - Module success criteria
  3. Create directory structure:
     agent-os/product/modules/
     ├── [module-1-name]/
     │   └── module-brief.md
     ├── [module-2-name]/
     │   └── module-brief.md
     └── ...

  Template (hybrid lookup):
  - TRY: agent-os/templates/platform/module-brief-template.md
  - FALLBACK: ~/.agent-os/templates/platform/module-brief-template.md

  Ensure each module brief is focused and distinct."

  WAIT for product-strategist completion
  RECEIVE module briefs
</delegation>

**Template:** `agent-os/templates/platform/module-brief-template.md`
**Output:** `agent-os/product/modules/[module-name]/module-brief.md` (multiple)

</step>

<step number="5" subagent="tech-architect" name="tech_stack_recommendation">

### Step 5: Platform-Wide Tech Stack Recommendation

Use tech-architect agent to analyze platform requirements and recommend tech stack.

<delegation>
  DELEGATE to tech-architect via Task tool:

  PROMPT:
  "Analyze platform and recommend tech stack.

  Context:
  - Platform Brief: agent-os/product/platform-brief.md
  - Module Briefs: agent-os/product/modules/*/module-brief.md

  Tasks:
  1. Load tech-stack-template.md (hybrid lookup: project → global)
  2. Analyze platform-wide requirements:
     - Cross-module technologies (shared infrastructure)
     - Module-specific technologies (per-module needs)
     - Integration requirements
     - Scalability needs
  3. Recommend tech stack at TWO levels:
     a) Platform-level (shared): hosting, CI/CD, monitoring, databases
     b) Module-level (specific): frameworks, libraries per module
  4. Present recommendations to user via AskUserQuestion
  5. Fill template with user's choices
  6. Write to agent-os/product/tech-stack.md

  Use hybrid template lookup:
  - TRY: agent-os/templates/product/tech-stack-template.md
  - FALLBACK: ~/.agent-os/templates/product/tech-stack-template.md"

  WAIT for tech-architect completion
  RECEIVE tech-stack.md output
</delegation>

**Template:** `agent-os/templates/product/tech-stack-template.md`
**Output:** `agent-os/product/tech-stack.md`

<note>
  Tech stack should distinguish:
  - Platform-wide technologies (shared infrastructure)
  - Module-specific technologies (per-module requirements)
</note>

</step>

<step number="5.5" subagent="design-extractor" name="extract_design_system">

### Step 5.5: Extract Platform Design System (Optional)

Use design-extractor agent to analyze existing design and create design-system.md for frontend guidance.

<conditional_check>
  ASK user via AskUserQuestion:
  "Does this platform have a user interface (web app, dashboard, mobile app)?

  If yes: Do you have existing design references?
  - URL of existing website/app
  - Screenshots of the design

  This will create a design system (colors, typography, spacing, components)
  that frontend developers will use during implementation.

  Options:
  1. YES - Provide URL
  2. YES - Provide screenshots
  3. NO UI - Skip (backend-only platform)
  4. LATER - Skip for now, run /extract-design later"
</conditional_check>

<conditional_logic>
  IF user selects URL or Screenshots:
    DELEGATE to design-extractor via Task tool:

    PROMPT:
    "Extract design system from platform UI reference.

    [IF URL:] Source URL: [user provided URL]
    [IF Screenshots:] Screenshots provided by user

    Context:
    - Platform Brief: agent-os/product/platform-brief.md
    - This is a multi-module platform

    Tasks:
    1. Load design-system-template.md (hybrid lookup: project → global)
    2. Analyze design source:
       - Color palette (primary, secondary, accent, backgrounds, text)
       - Typography (fonts, sizes, weights, line heights)
       - Spacing system (base unit, section padding, gaps)
       - Component styles (buttons, cards, inputs, navigation)
       - Visual effects (shadows, gradients, animations)
       - Layout patterns (grid, breakpoints, containers)
    3. Create CSS variables for design tokens
    4. Write to: agent-os/product/design-system.md
    5. If screenshots: Copy to agent-os/product/design/screenshots/

    Templates (hybrid lookup):
    - TRY: agent-os/templates/product/design-system-template.md
    - FALLBACK: ~/.agent-os/templates/product/design-system-template.md

    Output:
    - Complete design-system.md with colors, typography, spacing, components
    - Design tokens as CSS variables for frontend implementation"

    WAIT for design-extractor completion
    NOTE: "Design system created at agent-os/product/design-system.md"

  ELSE IF user selects "NO UI" or "LATER":
    NOTE: "Skipping design system extraction"
    IF "LATER":
      NOTE: "Run /extract-design when ready to setup design system"
</conditional_logic>

**Template:** `agent-os/templates/product/design-system-template.md`
**Output:** `agent-os/product/design-system.md` (optional)

<note>
  Design system is optional for platforms without UI.
  Can be extracted later via standalone /extract-design command.
  Frontend modules will use this during implementation.
</note>

</step>

<step number="5.6" subagent="file-creator" name="secrets_setup">

### Step 5.6: Secrets and Credentials Setup

Use file-creator agent to set up the secrets management template.

<delegation>
  DELEGATE to file-creator via Task tool:

  PROMPT:
  "Set up secrets management template for the platform.

  Context:
  - Platform Name: from agent-os/product/platform-brief.md

  Tasks:
  1. Load secrets-template.md (hybrid lookup: project → global)
     - TRY: agent-os/templates/product/secrets-template.md
     - FALLBACK: ~/.agent-os/templates/product/secrets-template.md
  2. Extract platform name
  3. Replace [PROJECT_NAME] placeholder
  4. Write to: agent-os/product/secrets.md

  Note: This file is used to track required credentials for the platform lifecycle.
  It is ignored by git for security."

  WAIT for file-creator completion
  NOTE: "Secrets template created at agent-os/product/secrets.md"
</delegation>

**Template:** `agent-os/templates/product/secrets-template.md`
**Output:** `agent-os/product/secrets.md`

</step>

<step number="6" subagent="tech-architect" name="dependency_analysis">

### Step 6: Module Dependency Analysis

Use tech-architect agent to analyze and document dependencies between modules.

<delegation>
  DELEGATE to tech-architect via Task tool:

  PROMPT:
  "Analyze module dependencies and create dependency graph.

  Context:
  - Platform Brief: agent-os/product/platform-brief.md
  - Module Briefs: agent-os/product/modules/*/module-brief.md
  - Tech Stack: agent-os/product/tech-stack.md

  Tasks:
  1. Load module-dependencies-template.md (hybrid lookup)
  2. Analyze dependencies between modules:
     - Data dependencies (Module A needs data from Module B)
     - Service dependencies (Module A calls Module B APIs)
     - Infrastructure dependencies (shared resources)
     - Deployment dependencies (Module A must deploy before Module B)
  3. Create dependency graph (Mermaid diagram)
  4. Document each dependency:
     - Type (data/service/infrastructure/deployment)
     - Direction (A → B)
     - Coupling level (tight/loose)
     - Critical path (blocking/non-blocking)
  5. Identify circular dependencies (red flag)
  6. Recommend dependency resolution strategies
  7. Write to: agent-os/product/architecture/module-dependencies.md

  Templates (hybrid lookup):
  - TRY: agent-os/templates/platform/module-dependencies-template.md
  - FALLBACK: ~/.agent-os/templates/platform/module-dependencies-template.md"

  WAIT for tech-architect completion
  RECEIVE module-dependencies.md
</delegation>

**Template:** `agent-os/templates/platform/module-dependencies-template.md`
**Output:** `agent-os/product/architecture/module-dependencies.md`

</step>

<step number="7" subagent="tech-architect" name="platform_architecture">

### Step 7: Platform Architecture Design

Use tech-architect agent to design overall platform architecture.

<delegation>
  DELEGATE to tech-architect via Task tool:

  PROMPT:
  "Design platform architecture showing how modules integrate.

  Context:
  - Platform Brief: agent-os/product/platform-brief.md
  - Module Briefs: agent-os/product/modules/*/module-brief.md
  - Tech Stack: agent-os/product/tech-stack.md
  - Dependencies: agent-os/product/architecture/module-dependencies.md

  Tasks:
  1. Load platform-architecture-template.md (hybrid lookup)
  2. Design architecture covering:
     - System overview diagram (all modules)
     - Data flow between modules
     - API/Integration layer
     - Shared infrastructure
     - Security boundaries
     - Deployment architecture
  3. Recommend architecture patterns:
     - Monolith vs Microservices vs Modular Monolith
     - Event-driven vs Request/Response
     - Sync vs Async communication
  4. Present recommendations to user with trade-offs
  5. Get user approval
  6. Write to: agent-os/product/architecture/platform-architecture.md

  Templates (hybrid lookup):
  - TRY: agent-os/templates/platform/platform-architecture-template.md
  - FALLBACK: ~/.agent-os/templates/platform/platform-architecture-template.md"

  WAIT for tech-architect completion
  RECEIVE platform-architecture.md
</delegation>

**Template:** `agent-os/templates/platform/platform-architecture-template.md`
**Output:** `agent-os/product/architecture/platform-architecture.md`

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

Please review: agent-os/product/roadmap/platform-roadmap.md

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

**Template:** `agent-os/templates/platform/platform-roadmap-template.md`

<template_lookup>
  LOOKUP: agent-os/templates/ (project) → ~/.agent-os/templates/ (global fallback)
</template_lookup>

**Output:** `agent-os/product/roadmap/platform-roadmap.md`

</step>

<step number="9" name="module_roadmaps">

### Step 9: Per-Module Roadmap Generation

Generate individual roadmaps for each module showing internal features.

**Process:**
1. For each module in agent-os/product/modules/:
   - Extract module features from module-brief.md
   - Create module-specific roadmap
   - Align with platform roadmap phase
   - Add module-specific milestones
2. Create directory structure:
   ```
   agent-os/product/roadmap/
   ├── platform-roadmap.md          # Overall phases
   └── modules/
       ├── [module-1]/
       │   └── roadmap.md            # Module-specific features
       ├── [module-2]/
       │   └── roadmap.md
       └── ...
   ```

**Template:** `agent-os/templates/platform/module-roadmap-template.md`

<template_lookup>
  LOOKUP: agent-os/templates/ (project) → ~/.agent-os/templates/ (global fallback)
</template_lookup>

**Output:** `agent-os/product/roadmap/modules/[module-name]/roadmap.md` (multiple)

</step>

<step number="10" subagent="file-creator" name="update_claude_md">

### Step 10: Update Project CLAUDE.md

Use file-creator agent to update the project's CLAUDE.md with platform-specific configuration.

<delegation>
  DELEGATE to file-creator via Task tool:

  PROMPT:
  "Update project CLAUDE.md with platform configuration.

  Context:
  - Platform Brief: agent-os/product/platform-brief.md
  - Modules: agent-os/product/modules/*/module-brief.md

  Tasks:
  1. Load CLAUDE-PLATFORM.md template (hybrid lookup: project → global)
     - TRY: agent-os/templates/CLAUDE-PLATFORM.md
     - FALLBACK: ~/.agent-os/templates/CLAUDE-PLATFORM.md
  2. Extract platform information:
     - Platform name from platform-brief.md
     - List of all modules from agent-os/product/modules/
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
  - **[Module Name]**: agent-os/product/modules/[module-name]/module-brief.md

  Ensure CLAUDE.md is properly formatted and all placeholders are replaced."

  WAIT for file-creator completion
  NOTE: "CLAUDE.md updated with platform configuration"
</delegation>

**Template:** `agent-os/templates/CLAUDE-PLATFORM.md`
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
✅ secrets.md - Required credentials tracking
✅ design-system.md - UI design tokens (if platform has UI)
✅ module-dependencies.md - Dependency graph
✅ platform-architecture.md - System architecture
✅ platform-roadmap.md - Implementation phases
✅ [N] module roadmaps - Per-module feature plans
✅ CLAUDE.md - Updated with platform configuration

Directory Structure:
agent-os/product/
├── platform-brief.md
├── tech-stack.md
├── secrets.md
├── design-system.md          # Optional (if UI exists)
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
| secrets.md | Required credentials tracking | secrets-template.md |
| design-system.md | UI design tokens (optional) | design-system-template.md |
| architecture/module-dependencies.md | Dependency graph | module-dependencies-template.md |
| architecture/platform-architecture.md | System architecture | platform-architecture-template.md |
| roadmap/platform-roadmap.md | Platform phases | platform-roadmap-template.md |
| roadmap/modules/[name]/roadmap.md | Module roadmaps | module-roadmap-template.md |
| CLAUDE.md (project root) | Project configuration | CLAUDE-PLATFORM.md |

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
