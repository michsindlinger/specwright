---
description: Product Planning for new projects with Specwright
globs:
alwaysApply: false
version: 5.0
encoding: UTF-8
installation: global
---

# Product Planning Workflow

Generate comprehensive product documentation for new projects: product-brief, tech-stack, roadmap, architecture decisions, and boilerplate structure.

<pre_flight_check>
  EXECUTE: @specwright/workflows/meta/pre-flight.md
</pre_flight_check>

<version_history>

**v5.0 Changes (Architecture Migration):**
- **BREAKING: Steps 3, 5, 5.5, 5.6, 5.7, 7 - Main Agent + Skills** - All complex tasks now executed by main agent guided by dedicated skills (was: Sub-Agent delegation)
- **NEW: 5 Planning Skills** - product-strategy, tech-stack-recommendation, design-system-extraction, ux-patterns-definition, architecture-decision
- **REMOVED: Sub-Agent delegations** - No more `<delegation>` blocks for non-utility agents
- **KEPT: Utility Agents** - file-creator (7.5, 8, 9), context-fetcher (1)
- **ENHANCED: Hybrid Skill Lookup** - .claude/skills/ → ~/.specwright/templates/skills/ fallback

**v4.1 Changes:**
- Added Step 5.6 (Design System Extraction)
- Added Step 5.7 (UX Patterns Definition)
- Added Step 7.5 (Secrets Setup)

</version_history>

<process_flow>

<step number="1" subagent="context-fetcher" name="check_existing_product_brief">

### Step 1: Check for Existing Product Brief

Use context-fetcher to check if product-brief.md already exists (e.g., from validate-market).

<conditional_logic>
  IF specwright/product/product-brief.md exists:
    LOAD: product-brief.md
    INFORM user: "Found existing product-brief.md from validation phase. Using this as base."
    GENERATE: product-brief-lite.md from existing
    SKIP: Steps 2-4
    PROCEED to step 5
  ELSE:
    PROCEED to step 2
</conditional_logic>

</step>

<step number="2" name="product_idea_capture">

### Step 2: Gather Product Information

Request product information from user.

**Prompt User:**
```
Please describe your product:

1. Main idea (elevator pitch)
2. Key features (minimum 3)
3. Target users (who is this for?)
4. What problem does it solve?
```

<data_sources>
  <primary>user_direct_input</primary>
  <fallback_sequence>
    1. @~/.specwright/standards/tech-stack.md
    2. @CLAUDE.md
  </fallback_sequence>
</data_sources>

</step>

<step number="3" name="idea_sharpening">

### Step 3: Idea Sharpening (Interactive)

Main agent refines the product idea interactively, guided by the product-strategy skill.

<skill_loading>
  LOAD skill: product-strategy

  LOOKUP STRATEGY (Hybrid):
    1. TRY: .claude/skills/product-strategy/SKILL.md (project)
    2. IF NOT FOUND: ~/.specwright/templates/skills/product-strategy/SKILL.md (global)
    3. IF STILL NOT FOUND: Continue without skill (use general product knowledge)
</skill_loading>

**Process (guided by product-strategy skill):**
1. Analyze user input for completeness
2. Identify missing template fields
3. Ask clarifying questions interactively:
   - Specific target audience
   - Measurable problem
   - Core features (3-5)
   - Value proposition
   - Success metrics
4. Generate product-brief.md when all fields complete

**Template:** `specwright/templates/product/product-brief-template.md`
**Output:** `specwright/product/product-brief.md`

<template_lookup>
  PATH: specwright/templates/product/product-brief-template.md

  LOOKUP STRATEGY (Hybrid):
    1. TRY: Read from project (specwright/templates/product/product-brief-template.md)
    2. IF NOT FOUND: Read from global (~/.specwright/templates/product/product-brief-template.md)
    3. IF STILL NOT FOUND: Error - setup-devteam-global.sh not run

  NOTE: Most projects use global templates. Project override only when customizing.
</template_lookup>

<quality_check>
  Product brief must include:
  - Specific target audience
  - Measurable problem
  - 3-5 concrete features
  - Clear value proposition
  - Differentiation

  IF incomplete:
    CONTINUE asking questions
  ELSE:
    PROCEED to step 4
</quality_check>

</step>

<step number="4" name="user_review_product_brief">

### Step 4: User Review Gate - Product Brief

**PAUSE FOR USER APPROVAL**

**Prompt User:**
```
I've created your Product Brief.

Please review: specwright/product/product-brief.md

Options:
1. Approve and continue
2. Request changes
```

<conditional_logic>
  IF user approves:
    GENERATE: product-brief-lite.md
    PROCEED to step 5
  ELSE:
    MAKE changes
    RETURN to step 4
</conditional_logic>

**Template:** `specwright/templates/product/product-brief-lite-template.md`

<template_lookup>
  LOOKUP: specwright/templates/ (project) → ~/.specwright/templates/ (global fallback)
</template_lookup>

**Output:** `specwright/product/product-brief-lite.md`

</step>

<step number="5" name="tech_stack_recommendation">

### Step 5: Tech Stack Recommendation

Main agent analyzes product requirements and recommends appropriate tech stack, guided by the tech-stack-recommendation skill.

<skill_loading>
  LOAD skill: tech-stack-recommendation

  LOOKUP STRATEGY (Hybrid):
    1. TRY: .claude/skills/tech-stack-recommendation/SKILL.md (project)
    2. IF NOT FOUND: ~/.specwright/templates/skills/tech-stack-recommendation/SKILL.md (global)
    3. IF STILL NOT FOUND: Continue without skill (use general tech knowledge)
</skill_loading>

**Process (guided by tech-stack-recommendation skill):**
1. Load tech-stack-template.md (hybrid lookup: project → global)
2. Read product-brief.md and product-brief-lite.md for context
3. Analyze product requirements (platform, scale, complexity, integrations)
4. Recommend tech stack (backend, frontend, database, hosting, ci/cd)
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

</step>

<step number="5.5" name="generate_project_standards">

### Step 5.5: Generate Project-Specific Standards (Optional)

Main agent optionally generates tech-stack-aware coding standards, guided by the tech-stack-recommendation skill (already loaded in Step 5).

<user_choice>
  ASK user:
  "Generate project-specific coding standards?

  YES (Recommended):
  → Standards customized for your tech stack (Rails → Ruby style, React → TS style)
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
    1. Read tech-stack.md to understand frameworks
    2. Read global standards as base (~/.specwright/standards/code-style.md, best-practices.md)
    3. Enhance with tech-stack-specific rules:
       - Rails → Ruby style, RSpec conventions
       - React → TypeScript style, component patterns
       - Node.js → JavaScript/TS style, async patterns
    4. Write to specwright/standards/code-style.md
    5. Write to specwright/standards/best-practices.md

    NOTE: "Project-specific standards generated"

  ELSE:
    NOTE: "Using global standards from ~/.specwright/standards/"
    SKIP standards generation
</conditional_logic>

</step>

<step number="5.6" name="extract_design_system">

### Step 5.6: Extract Design System (Optional)

Main agent analyzes existing design references and creates design-system.md, guided by the design-system-extraction skill.

<user_choice>
  ASK user:
  "Do you have existing design references (URL or screenshots)?

  This will create a design system (colors, typography, spacing, components)
  for the frontend team to follow.

  Options:
  1. YES - I have a URL (Figma, existing site, competitor)
  2. YES - I have screenshots
  3. SKIP - No design reference"

  Your choice: [1/2/3]"
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

  ELSE:
    NOTE: "Skipping design system extraction"
    SKIP to Step 6
</conditional_logic>

**Template:** `specwright/templates/product/design-system-template.md`

<template_lookup>
  LOOKUP STRATEGY (Hybrid):
    1. TRY: specwright/templates/product/design-system-template.md (project)
    2. IF NOT FOUND: ~/.specwright/templates/product/design-system-template.md (global)
</template_lookup>

**Output:** `specwright/product/design-system.md` (optional)

</step>

<step number="5.7" name="define_ux_patterns">

### Step 5.7: Define UX Patterns (Optional, if Frontend exists)

Main agent defines overarching UX patterns interactively, guided by the ux-patterns-definition skill.

<conditional_logic>
  CHECK tech-stack.md:
  IF frontend_framework_exists:
    PROCEED with UX pattern definition
  ELSE:
    NOTE: "No frontend detected, skipping UX patterns"
    SKIP to Step 6
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
2. Read product-brief.md, tech-stack.md, and design-system.md (if exists) for context
3. Analyze product type and user context
4. Recommend UX patterns for:
   - Navigation (top nav, sidebar, tabs, etc.)
   - User flows (key workflows)
   - Interaction patterns (buttons, forms, drag-drop)
   - Feedback patterns (loading, success, error, empty states)
   - Mobile patterns (if applicable)
   - Accessibility (WCAG level, keyboard nav, screen readers)
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

**Output:** `specwright/product/ux-patterns.md` (optional, frontend only)

</step>

<step number="6" name="roadmap_generation">

### Step 6: Roadmap Generation

Generate development roadmap based on product-brief features.

**Process:**
1. Extract features from product-brief.md
2. Categorize by priority (MoSCoW)
3. Organize into phases:
   - Phase 1: MVP (Must Have)
   - Phase 2: Growth (Should Have)
   - Phase 3: Scale (Could Have)
4. Add effort estimates (XS/S/M/L/XL)

**Prompt User:**
```
I've created a development roadmap with [N] phases.

Please review: specwright/product/roadmap.md

Options:
1. Approve roadmap
2. Adjust priorities or phases
```

<conditional_logic>
  IF user approves:
    PROCEED to step 7
  ELSE:
    APPLY adjustments
    REGENERATE roadmap
    RETURN to review
</conditional_logic>

**Template:** `specwright/templates/product/roadmap-template.md`

<template_lookup>
  LOOKUP: specwright/templates/ (project) → ~/.specwright/templates/ (global fallback)
</template_lookup>

**Output:** `specwright/product/roadmap.md`

</step>

<step number="7" name="architecture_decision">

### Step 7: Architecture Decision

Main agent analyzes product complexity and recommends appropriate architecture pattern, guided by the architecture-decision skill.

<skill_loading>
  LOAD skill: architecture-decision

  LOOKUP STRATEGY (Hybrid):
    1. TRY: .claude/skills/architecture-decision/SKILL.md (project)
    2. IF NOT FOUND: ~/.specwright/templates/skills/architecture-decision/SKILL.md (global)
    3. IF STILL NOT FOUND: Continue without skill (use general architecture knowledge)
</skill_loading>

**Process (guided by architecture-decision skill):**
1. Load architecture-decision-template.md (hybrid lookup: project → global)
2. Read product-brief.md and tech-stack.md for context
3. Analyze product complexity:
   - Domain complexity (simple CRUD vs rich domain)
   - Business rules complexity
   - External integrations count
   - Team size
   - Scalability requirements
4. Recommend architecture pattern based on analysis.

   IMPORTANT: NOT limited to predefined patterns!
   Analyze and recommend most appropriate pattern:

   Common Patterns:
   - Layered (3-Tier) → Simple CRUD, rapid development
   - Clean Architecture → Medium complexity, good testability
   - Hexagonal (Ports & Adapters) → Many integrations, domain-driven
   - Domain-Driven Design (DDD) → Complex business domain
   - Microservices → Independent services, team autonomy
   - Event-Driven → Async processing, event sourcing
   - Serverless → Variable load, cost optimization
   - Modular Monolith → Start simple, prepare for scale
   - JAMstack → Static sites + APIs
   - CQRS → Command/Query separation
   - Plugin Architecture → Extensibility focus
   - Micro-frontends → Independent frontend modules
   - OTHER → Analyze and recommend based on specific needs

5. Present recommendation to user with:
   - Pattern name
   - Rationale (why this pattern fits)
   - Trade-offs (pros and cons)
   - Alternatives considered
6. Get user approval or alternative choice
7. Fill template with chosen pattern and rationale
8. Write to specwright/product/architecture-decision.md

**Template:** `specwright/templates/product/architecture-decision-template.md`

<template_lookup>
  LOOKUP STRATEGY (Hybrid):
    1. TRY: specwright/templates/product/architecture-decision-template.md (project)
    2. IF NOT FOUND: ~/.specwright/templates/product/architecture-decision-template.md (global)
</template_lookup>

**Output:** `specwright/product/architecture-decision.md`

</step>

<step number="7.5" subagent="file-creator" name="secrets_setup">

### Step 7.5: Secrets and Credentials Setup

Use file-creator agent to set up the secrets management template.

<delegation>
  DELEGATE to file-creator via Task tool:

  PROMPT:
  "Set up secrets management template for the project.

  Context:
  - Product Name: from specwright/product/product-brief.md

  Tasks:
  1. Load secrets-template.md (hybrid lookup: project → global)
     - TRY: specwright/templates/product/secrets-template.md
     - FALLBACK: ~/.specwright/templates/product/secrets-template.md
  2. Extract product name
  3. Replace [PROJECT_NAME] placeholder
  4. Write to: specwright/product/secrets.md

  Note: This file is used to track required credentials for the project lifecycle.
  It is ignored by git for security."

  WAIT for file-creator completion
  NOTE: "Secrets template created at specwright/product/secrets.md"
</delegation>

**Template:** `specwright/templates/product/secrets-template.md`
**Output:** `specwright/product/secrets.md`

</step>

<step number="8" subagent="file-creator" name="boilerplate_generation">

### Step 8: Boilerplate Structure Generation

Generate project folder structure based on architecture decision.

**Process:**
1. Read architecture-decision.md for chosen pattern
2. Read tech-stack.md for technologies
3. Create boilerplate directory structure
4. Include demo module as example
5. Generate architecture-structure.md documentation

**Folder Structure Example (Hexagonal):**
```
boilerplate/
├── backend/
│   └── src/
│       ├── domain/
│       │   ├── entities/
│       │   ├── value-objects/
│       │   └── repositories/
│       ├── application/
│       │   ├── use-cases/
│       │   └── dtos/
│       ├── infrastructure/
│       │   ├── persistence/
│       │   └── external/
│       └── presentation/
│           └── rest/
├── frontend/
│   └── src/
│       ├── components/
│       ├── pages/
│       ├── services/
│       └── stores/
└── infrastructure/
    └── docker/
```

**Output:**
- `specwright/product/boilerplate/` (directory structure)
- `specwright/product/architecture-structure.md`

**Template:** `specwright/templates/product/boilerplate-structure-template.md`

<template_lookup>
  LOOKUP: specwright/templates/ (project) → ~/.specwright/templates/ (global fallback)
</template_lookup>

</step>

<step number="9" subagent="file-creator" name="update_claude_md">

### Step 9: Update Project CLAUDE.md

Use file-creator agent to update the project's CLAUDE.md with product-specific configuration.

<delegation>
  DELEGATE to file-creator via Task tool:

  PROMPT:
  "Update project CLAUDE.md with product configuration.

  Context:
  - Product Brief: specwright/product/product-brief.md
  - Tech Stack: specwright/product/tech-stack.md

  Tasks:
  1. Load CLAUDE-LITE.md template (hybrid lookup: project → global)
     - TRY: specwright/templates/CLAUDE-LITE.md
     - FALLBACK: ~/.specwright/templates/CLAUDE-LITE.md
  2. Extract product information:
     - Product name from product-brief.md
     - Current date
  3. Replace placeholders in template:
     - [PROJECT_NAME] → Actual product name
     - [CURRENT_DATE] → Today's date (YYYY-MM-DD)
  4. Write to project root: CLAUDE.md

  Ensure CLAUDE.md is properly formatted and all placeholders are replaced."

  WAIT for file-creator completion
  NOTE: "CLAUDE.md updated with product configuration"
</delegation>

**Template:** `specwright/templates/CLAUDE-LITE.md`
**Output:** `CLAUDE.md` (project root)

</step>

<step number="10" name="summary">

### Step 10: Planning Summary

Present summary of all created documentation.

**Summary:**
```
Product Planning Complete!

Created Documentation:
✅ product-brief.md - Product definition
✅ product-brief-lite.md - Condensed version
✅ tech-stack.md - Technology choices
✅ secrets.md - Required credentials tracking
✅ roadmap.md - Development phases
✅ architecture-decision.md - Architecture pattern
✅ architecture-structure.md - Folder conventions
✅ boilerplate/ - Project structure template
✅ CLAUDE.md - Updated with product configuration

Location: specwright/product/

CLAUDE.md (project root) - Updated with product references

Next Steps:
1. Review all documentation
2. Run /build-development-team to set up agents
3. Run /create-spec to start first feature
4. Copy boilerplate/ to your project root
```

</step>

</process_flow>

## User Review Gates

1. **Step 4:** Product Brief approval
2. **Step 6:** Roadmap approval
3. **Step 7:** Architecture decision

## Output Files

| File | Description | Template |
|------|-------------|----------|
| product-brief.md | Complete product definition | product-brief.md |
| product-brief-lite.md | Condensed for AI context | product-brief-lite.md |
| tech-stack.md | Technology choices | tech-stack.md |
| secrets.md | Required credentials tracking | secrets-template.md |
| roadmap.md | Development phases | roadmap.md |
| architecture-decision.md | Architecture ADRs | architecture-decision.md |
| architecture-structure.md | Folder conventions | architecture-structure.md |
| boilerplate/ | Directory template | Generated |
| CLAUDE.md (project root) | Project configuration | CLAUDE-LITE.md |

## Skills Used

| Skill | Steps | Purpose |
|-------|-------|---------|
| product-strategy | 3 | Idea sharpening, product brief quality |
| tech-stack-recommendation | 5, 5.5 | Tech stack analysis, standards generation |
| design-system-extraction | 5.6 | Design system from URLs/screenshots |
| ux-patterns-definition | 5.7 | Navigation, flows, interactions, accessibility |
| architecture-decision | 7 | Complexity assessment, pattern selection |

## Execution Summary

**Duration:** 15-25 minutes
**User Interactions:** 3-4 decision points
**Output:** 7 files + 1 directory structure + CLAUDE.md update
