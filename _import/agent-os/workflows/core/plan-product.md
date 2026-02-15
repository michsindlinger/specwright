---
description: Product Planning for new projects with Agent OS
globs:
alwaysApply: false
version: 4.1
encoding: UTF-8
installation: global
---

# Product Planning Workflow

Generate comprehensive product documentation for new projects: product-brief, tech-stack, roadmap, architecture decisions, and boilerplate structure.

<pre_flight_check>
  EXECUTE: @agent-os/workflows/meta/pre-flight.md
</pre_flight_check>

<process_flow>

<step number="1" subagent="context-fetcher" name="check_existing_product_brief">

### Step 1: Check for Existing Product Brief

Use context-fetcher to check if product-brief.md already exists (e.g., from validate-market).

<conditional_logic>
  IF agent-os/product/product-brief.md exists:
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
    1. @~/.agent-os/standards/tech-stack.md
    2. @CLAUDE.md
  </fallback_sequence>
</data_sources>

</step>

<step number="3" subagent="product-strategist" name="idea_sharpening">

### Step 3: Idea Sharpening (Interactive)

Use product-strategist agent to refine the idea until complete.

**Process:**
1. Analyze user input for completeness
2. Identify missing template fields
3. Ask clarifying questions interactively:
   - Specific target audience
   - Measurable problem
   - Core features (3-5)
   - Value proposition
   - Success metrics
4. Generate product-brief.md when all fields complete

**Template:** `agent-os/templates/product/product-brief-template.md`
**Output:** `agent-os/product/product-brief.md`

<template_lookup>
  PATH: agent-os/templates/product/product-brief-template.md

  LOOKUP STRATEGY (Hybrid):
    1. TRY: Read from project (agent-os/templates/product/product-brief-template.md)
    2. IF NOT FOUND: Read from global (~/.agent-os/templates/product/product-brief-template.md)
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

Please review: agent-os/product/product-brief.md

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

**Template:** `agent-os/templates/product/product-brief-lite-template.md`

<template_lookup>
  LOOKUP: agent-os/templates/ (project) → ~/.agent-os/templates/ (global fallback)
</template_lookup>

**Output:** `agent-os/product/product-brief-lite.md`

</step>

<step number="5" subagent="tech-architect" name="tech_stack_recommendation">

### Step 5: Tech Stack Recommendation

Use tech-architect agent to analyze product requirements and recommend appropriate tech stack.

<delegation>
  DELEGATE to tech-architect via Task tool:

  PROMPT:
  "Analyze product requirements and recommend tech stack.

  Context:
  - Product Brief: agent-os/product/product-brief.md
  - Product Brief Lite: agent-os/product/product-brief-lite.md

  Tasks:
  1. Load tech-stack-template.md (hybrid lookup: project → global)
  2. Analyze product requirements (platform, scale, complexity, integrations)
  3. Recommend tech stack (backend, frontend, database, hosting, ci/cd)
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

</step>

<step number="5.5" subagent="tech-architect" name="generate_project_standards">

### Step 5.5: Generate Project-Specific Standards (Optional)

Use tech-architect agent to optionally generate tech-stack-aware coding standards for the project.

<user_choice>
  ASK user:
  "Generate project-specific coding standards?

  YES (Recommended):
  → Standards customized for your tech stack (Rails → Ruby style, React → TS style)
  → Saved to agent-os/standards/code-style.md and best-practices.md
  → Overrides global ~/.agent-os/standards/

  NO:
  → Use global standards from ~/.agent-os/standards/
  → Faster setup, consistent across all your projects

  Your choice: [YES/NO]"
</user_choice>

<conditional_logic>
  IF user_choice = YES:
    DELEGATE to tech-architect via Task tool:

    PROMPT:
    "Generate tech-stack-aware coding standards.

    Context:
    - Tech Stack: agent-os/product/tech-stack.md
    - Global Standards: ~/.agent-os/standards/code-style.md, best-practices.md

    Tasks:
    1. Read tech-stack.md to understand frameworks
    2. Read global standards as base
    3. Enhance with tech-stack-specific rules:
       - Rails → Ruby style, RSpec conventions
       - React → TypeScript style, component patterns
       - Node.js → JavaScript/TS style, async patterns
    4. Write to agent-os/standards/code-style.md
    5. Write to agent-os/standards/best-practices.md

    Generate tech-stack-aware standards that enhance global defaults."

    WAIT for tech-architect completion
    NOTE: "Project-specific standards generated"

  ELSE:
    NOTE: "Using global standards from ~/.agent-os/standards/"
    SKIP standards generation
</conditional_logic>

</step>

<step number="5.6" subagent="design-extractor" name="extract_design_system">

### Step 5.6: Extract Design System (Optional)

Use design-extractor agent to analyze existing design and create design-system.md for frontend guidance.

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
    DELEGATE to design-extractor via Task tool:

    PROMPT:
    "Extract design system from [URL or Screenshots].

    Source:
    [IF URL:] User will provide URL
    [IF Screenshots:] Screenshots in agent-os/design/screenshots/

    Tasks:
    1. Load design-system-template.md (hybrid lookup: project → global)
    2. Analyze design source:
       - Extract color palette (primary, secondary, semantic)
       - Identify typography (fonts, sizes, weights)
       - Extract spacing patterns
       - Catalog UI components
       - Note layout patterns
    3. Fill template with extracted values
    4. Write to: agent-os/product/design-system.md
    5. If screenshots: Copy to agent-os/product/design/screenshots/

    Templates (hybrid lookup):
    - TRY: agent-os/templates/product/design-system-template.md
    - FALLBACK: ~/.agent-os/templates/product/design-system-template.md

    Deliverable:
    - Complete design-system.md with colors, typography, spacing, components"

    WAIT for design-extractor completion
    NOTE: "Design system created at agent-os/product/design-system.md"

  ELSE:
    NOTE: "Skipping design system extraction"
    SKIP to Step 6
</conditional_logic>

**Template:** `agent-os/templates/product/design-system-template.md`
**Output:** `agent-os/product/design-system.md` (optional)

</step>

<step number="5.7" subagent="ux-designer" name="define_ux_patterns">

### Step 5.7: Define UX Patterns (Optional, if Frontend exists)

Use ux-designer agent to define overarching UX patterns interactively.

<conditional_logic>
  CHECK tech-stack.md:
  IF frontend_framework_exists:
    PROCEED with UX pattern definition
  ELSE:
    NOTE: "No frontend detected, skipping UX patterns"
    SKIP to Step 6
</conditional_logic>

<delegation>
  DELEGATE to ux-designer via Task tool:

  PROMPT:
  "Analyze product and define UX patterns.

  Context:
  - Product Brief: agent-os/product/product-brief.md
  - Tech Stack: agent-os/product/tech-stack.md (check if frontend exists)
  - Design System: agent-os/product/design-system.md (if exists)

  Tasks:
  1. Load ux-patterns-template.md (hybrid lookup: project → global)
  2. Analyze product type and user context
  3. Recommend UX patterns for:
     - Navigation (top nav, sidebar, tabs, etc.)
     - User flows (key workflows)
     - Interaction patterns (buttons, forms, drag-drop)
     - Feedback patterns (loading, success, error, empty states)
     - Mobile patterns (if applicable)
     - Accessibility (WCAG level, keyboard nav, screen readers)
  4. Discuss with user interactively:
     - Present recommendations with rationale
     - Ask about preferences and constraints
     - Show alternatives with pros/cons
     - Iterate until user approves
  5. Fill template with approved patterns
  6. Write to: agent-os/product/ux-patterns.md

  Templates (hybrid lookup):
  - TRY: agent-os/templates/product/ux-patterns-template.md
  - FALLBACK: ~/.agent-os/templates/product/ux-patterns-template.md

  Deliverable:
  - Complete ux-patterns.md with navigation, flows, interactions, feedback, accessibility patterns"

  WAIT for ux-designer completion
  RECEIVE ux-patterns.md
</delegation>

**Template:** `agent-os/templates/product/ux-patterns-template.md`
**Output:** `agent-os/product/ux-patterns.md` (optional, frontend only)

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

Please review: agent-os/product/roadmap.md

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

**Template:** `agent-os/templates/product/roadmap-template.md`

<template_lookup>
  LOOKUP: agent-os/templates/ (project) → ~/.agent-os/templates/ (global fallback)
</template_lookup>

**Output:** `agent-os/product/roadmap.md`

</step>

<step number="7" subagent="tech-architect" name="architecture_decision">

### Step 7: Architecture Decision

Use tech-architect agent to analyze product complexity and recommend appropriate architecture pattern.

<delegation>
  DELEGATE to tech-architect via Task tool:

  PROMPT:
  "Analyze product and recommend architecture pattern.

  Context:
  - Product Brief: agent-os/product/product-brief.md
  - Tech Stack: agent-os/product/tech-stack.md

  Tasks:
  1. Load architecture-decision-template.md (hybrid lookup: project → global)
  2. Analyze product complexity:
     - Domain complexity (simple CRUD vs rich domain)
     - Business rules complexity
     - External integrations count
     - Team size
     - Scalability requirements
  3. Recommend architecture pattern based on analysis.

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

  4. Present recommendation to user with:
     - Pattern name
     - Rationale (why this pattern fits)
     - Trade-offs (pros and cons)
     - Alternatives considered
  5. Get user approval or alternative choice
  6. Fill template with chosen pattern and rationale
  7. Write to agent-os/product/architecture-decision.md

  Use hybrid template lookup:
  - TRY: agent-os/templates/product/architecture-decision-template.md
  - FALLBACK: ~/.agent-os/templates/product/architecture-decision-template.md

  Recommend based on ACTUAL product needs, not preset rules."

  WAIT for tech-architect completion
  RECEIVE architecture-decision.md
</delegation>

**Template:** `agent-os/templates/product/architecture-decision-template.md`
**Output:** `agent-os/product/architecture-decision.md`

</step>

<step number="7.5" subagent="file-creator" name="secrets_setup">

### Step 7.5: Secrets and Credentials Setup

Use file-creator agent to set up the secrets management template.

<delegation>
  DELEGATE to file-creator via Task tool:

  PROMPT:
  "Set up secrets management template for the project.

  Context:
  - Product Name: from agent-os/product/product-brief.md

  Tasks:
  1. Load secrets-template.md (hybrid lookup: project → global)
     - TRY: agent-os/templates/product/secrets-template.md
     - FALLBACK: ~/.agent-os/templates/product/secrets-template.md
  2. Extract product name
  3. Replace [PROJECT_NAME] placeholder
  4. Write to: agent-os/product/secrets.md

  Note: This file is used to track required credentials for the project lifecycle.
  It is ignored by git for security."

  WAIT for file-creator completion
  NOTE: "Secrets template created at agent-os/product/secrets.md"
</delegation>

**Template:** `agent-os/templates/product/secrets-template.md`
**Output:** `agent-os/product/secrets.md`

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
- `agent-os/product/boilerplate/` (directory structure)
- `agent-os/product/architecture-structure.md`

**Template:** `agent-os/templates/product/boilerplate-structure-template.md`

<template_lookup>
  LOOKUP: agent-os/templates/ (project) → ~/.agent-os/templates/ (global fallback)
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
  - Product Brief: agent-os/product/product-brief.md
  - Tech Stack: agent-os/product/tech-stack.md

  Tasks:
  1. Load CLAUDE-LITE.md template (hybrid lookup: project → global)
     - TRY: agent-os/templates/CLAUDE-LITE.md
     - FALLBACK: ~/.agent-os/templates/CLAUDE-LITE.md
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

**Template:** `agent-os/templates/CLAUDE-LITE.md`
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

Location: agent-os/product/

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

## Execution Summary

**Duration:** 15-25 minutes
**User Interactions:** 3-4 decision points
**Output:** 7 files + 1 directory structure + CLAUDE.md update
