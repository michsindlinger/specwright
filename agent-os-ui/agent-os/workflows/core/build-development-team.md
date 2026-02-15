---
description: Build Development Team Skills for Main Agent (Direct Execution)
globs:
alwaysApply: false
version: 3.0
encoding: UTF-8
installation: global
---

# Build Development Team v3.0

Set up project-specific skills for the main agent based on tech stack. The main agent loads these skills automatically and executes stories directly - no sub-agents.

## What's New in v3.0

- **No Sub-Agents**: Skills are for the main agent, not separate agents
- **Standard Skill Path**: Skills in `.claude/skills/[name]/SKILL.md` (Claude Code standard)
- **One Skill per Technology**: Consolidated skills with sub-documents
- **Self-Learning**: Each skill has `dos-and-donts.md` for project learnings
- **Domain Skills**: Optional business domain documentation
- **Project Context**: Skills are customized from project documents

## Removed in v3.0

- ❌ No `.claude/agents/dev-team/` folder
- ❌ No `agent-os/skills/` folder (old flat structure)
- ❌ No `skill-index.md` (skills load automatically via globs)
- ❌ No agent assignment in stories

<pre_flight_check>
  EXECUTE: @agent-os/workflows/meta/pre-flight.md
</pre_flight_check>

---

<process_flow>

<step number="1" name="analyze_tech_stack">

### Step 1: Analyze Tech Stack

Load and analyze tech-stack.md to determine required skills.
Both Product and Platform projects use agent-os/product/tech-stack.md.

<conditional_logic>
  IF agent-os/product/tech-stack.md exists:
    READ: agent-os/product/tech-stack.md
    ANALYZE: Technologies in use

    DETECT: Project type
    - IF platform-brief.md exists: SET PROJECT_TYPE = "platform"
    - ELSE: SET PROJECT_TYPE = "product"

    PROCEED to step 2
  ELSE:
    INFORM user: "No tech-stack.md found. Please run /plan-product or /plan-platform first."
    EXIT workflow
</conditional_logic>

**Detection Rules:**
- Angular/React/Vue → Frontend Skill
- Rails/NestJS/Spring → Backend Skill
- Docker/GitHub Actions → DevOps Skill

**Store:**
- PROJECT_TYPE (product | platform)
- Detected technologies for later steps

</step>

<step number="2" name="load_project_context">

### Step 2: Load Project Context Documents

Read all relevant project documents for skill customization.
Both Product and Platform projects use agent-os/product/.

<context_loading>
  CREATE: Empty context object

  **Required Documents:**

  1. READ: agent-os/product/tech-stack.md (already read in Step 1)
     EXTRACT:
     - Framework versions
     - Libraries and dependencies
     - Testing frameworks
     - Build tools
     STORE in: context.techStack

  2. READ: Architecture document (try multiple locations)
     TRY:
       a) agent-os/product/architecture-decision.md (Product projects)
       b) agent-os/product/architecture/platform-architecture.md (Platform projects)

     IF found:
       EXTRACT:
       - Service layer patterns
       - API design patterns
       - Data access patterns
       - Error handling patterns
       STORE in: context.architecture
     ELSE:
       SET context.architecture = "Not defined"

  3. READ: agent-os/product/architecture-structure.md (if exists)
     EXTRACT:
     - Project folder structure
     - Naming conventions
     - File organization rules
     STORE in: context.structure
     IF NOT exists: SET context.structure = "Not defined"

  **Frontend-Specific Documents:**

  4. READ: agent-os/product/design-system.md (if exists)
     EXTRACT:
     - Colors and color tokens
     - Typography scale
     - Spacing system
     - Component patterns
     STORE in: context.designSystem
     IF NOT exists: SET context.designSystem = "Not defined"

  5. READ: agent-os/product/ux-patterns.md (if exists)
     EXTRACT:
     - Navigation patterns
     - User flow patterns
     - Feedback states (loading, error, empty, success)
     - Accessibility requirements
     STORE in: context.uxPatterns
     IF NOT exists: SET context.uxPatterns = "Not defined"
</context_loading>

**Output:** Populated context object for skill customization

</step>

<step number="3" name="create_skill_directory">

### Step 3: Create Skill Directory Structure

Create the `.claude/skills/` directory if it doesn't exist.

```bash
mkdir -p .claude/skills
```

</step>

<step number="4" name="create_universal_skills">

### Step 4: Create Universal Skills (Always)

These skills are ALWAYS created for every project.

<skill_creation>
  **1. Quality Gates Skill (alwaysApply: true)**

  LOAD template: agent-os/templates/skills/quality-gates/SKILL.md
  (Fallback: ~/.agent-os/templates/skills/quality-gates/SKILL.md)

  REPLACE placeholders:
  - [PROJECT_NAME] → from tech-stack.md or folder name
  - [DATE] → current date
  - [TEST_COMMAND] → from tech-stack.md testing section
  - [LINT_COMMAND] → from tech-stack.md linting section

  CREATE directory: .claude/skills/quality-gates/
  WRITE to: .claude/skills/quality-gates/SKILL.md

  **2. PO Requirements Skill (for story creation)**

  LOAD template: agent-os/templates/skills/po-requirements/SKILL.md
  (Fallback: ~/.agent-os/templates/skills/po-requirements/SKILL.md)

  REPLACE placeholders:
  - [PROJECT_NAME] → from tech-stack.md or folder name
  - [DATE] → current date

  CREATE directory: .claude/skills/po-requirements/
  WRITE to: .claude/skills/po-requirements/SKILL.md

  **3. Architect Refinement Skill (for story creation)**

  LOAD template: agent-os/templates/skills/architect-refinement/SKILL.md
  (Fallback: ~/.agent-os/templates/skills/architect-refinement/SKILL.md)

  REPLACE placeholders:
  - [PROJECT_NAME] → from tech-stack.md or folder name
  - [DATE] → current date
  - [ARCHITECTURE_PATTERNS] → from context.architecture
  - [PROJECT_STRUCTURE] → from context.structure
  - [NAMING_CONVENTIONS] → from context.structure

  CREATE directory: .claude/skills/architect-refinement/
  WRITE to: .claude/skills/architect-refinement/SKILL.md

  OUTPUT: "Universal skills created: quality-gates, po-requirements, architect-refinement"
</skill_creation>

</step>

<step number="5" name="create_frontend_skill">

### Step 5: Create Frontend Skill (If Detected)

<conditional_logic>
  IF frontend framework detected (Angular/React/Vue):

    DETERMINE: Which framework
    SET: FRAMEWORK_NAME = angular | react | vue

    LOAD templates from:
    - agent-os/templates/skills/frontend/[FRAMEWORK_NAME]/SKILL.md
    - agent-os/templates/skills/frontend/[FRAMEWORK_NAME]/components.md
    - agent-os/templates/skills/frontend/[FRAMEWORK_NAME]/state-management.md
    - agent-os/templates/skills/frontend/[FRAMEWORK_NAME]/api-integration.md
    - agent-os/templates/skills/frontend/[FRAMEWORK_NAME]/forms-validation.md
    - agent-os/templates/skills/frontend/[FRAMEWORK_NAME]/dos-and-donts.md

    (Fallback to ~/.agent-os/templates/... if project templates not found)

    CREATE directory: .claude/skills/frontend-[FRAMEWORK_NAME]/

    FOR EACH template file:
      REPLACE placeholders with context values:

      **From context.techStack:**
      - [ANGULAR_VERSION] / [REACT_VERSION] / [VUE_VERSION]
      - [STATE_MANAGEMENT_LIBRARY]
      - [UI_LIBRARY]
      - [TESTING_FRAMEWORK]
      - [BUILD_TOOL]

      **From context.architecture:**
      - [ARCHITECTURE_PATTERNS]

      **From context.structure:**
      - [PROJECT_STRUCTURE]

      **From context.designSystem:**
      - [DESIGN_COLORS]
      - [DESIGN_TYPOGRAPHY]
      - [DESIGN_SPACING]
      - [DESIGN_COMPONENTS]

      **From context.uxPatterns:**
      - [UX_NAVIGATION]
      - [UX_USER_FLOWS]
      - [UX_FEEDBACK_STATES]
      - [UX_ACCESSIBILITY]

      **General:**
      - [PROJECT_NAME]
      - [DATE]

      WRITE to: .claude/skills/frontend-[FRAMEWORK_NAME]/[filename]

    OUTPUT: "Frontend skill created: .claude/skills/frontend-[FRAMEWORK_NAME]/"

  ELSE:
    SKIP: "No frontend framework detected"
</conditional_logic>

</step>

<step number="6" name="create_backend_skill">

### Step 6: Create Backend Skill (If Detected)

<conditional_logic>
  IF backend framework detected (Rails/NestJS/Spring):

    DETERMINE: Which framework
    SET: FRAMEWORK_NAME = rails | nestjs | spring

    LOAD templates from:
    - agent-os/templates/skills/backend/[FRAMEWORK_NAME]/SKILL.md
    - agent-os/templates/skills/backend/[FRAMEWORK_NAME]/services.md
    - agent-os/templates/skills/backend/[FRAMEWORK_NAME]/models.md
    - agent-os/templates/skills/backend/[FRAMEWORK_NAME]/api-design.md
    - agent-os/templates/skills/backend/[FRAMEWORK_NAME]/testing.md
    - agent-os/templates/skills/backend/[FRAMEWORK_NAME]/dos-and-donts.md

    CREATE directory: .claude/skills/backend-[FRAMEWORK_NAME]/

    FOR EACH template file:
      REPLACE placeholders with context values:

      **From context.techStack:**
      - [RAILS_VERSION] / [NESTJS_VERSION] / [SPRING_VERSION]
      - [RUBY_VERSION] / [NODE_VERSION] / [JAVA_VERSION]
      - [DATABASE]
      - [ORM_LIBRARY]
      - [TESTING_FRAMEWORK]
      - [AUTH_LIBRARY]
      - [BACKGROUND_JOBS]

      **From context.architecture:**
      - [SERVICE_LAYER_PATTERN]
      - [API_DESIGN_PATTERN]
      - [DATA_ACCESS_PATTERN]
      - [ERROR_HANDLING_PATTERN]

      **From context.structure:**
      - [PROJECT_STRUCTURE]
      - [NAMING_CONVENTIONS]

      **General:**
      - [PROJECT_NAME]
      - [DATE]

      WRITE to: .claude/skills/backend-[FRAMEWORK_NAME]/[filename]

    OUTPUT: "Backend skill created: .claude/skills/backend-[FRAMEWORK_NAME]/"

  ELSE:
    SKIP: "No backend framework detected"
</conditional_logic>

</step>

<step number="7" name="create_devops_skill">

### Step 7: Create DevOps Skill (If Detected)

<conditional_logic>
  IF DevOps tools detected (Docker, GitHub Actions, etc.):

    LOAD templates from:
    - agent-os/templates/skills/devops/docker-github/SKILL.md
    - agent-os/templates/skills/devops/docker-github/docker.md
    - agent-os/templates/skills/devops/docker-github/ci-cd.md
    - agent-os/templates/skills/devops/docker-github/dos-and-donts.md

    CREATE directory: .claude/skills/devops-docker-github/

    FOR EACH template file:
      REPLACE placeholders with context values:

      **From context.techStack:**
      - [CONTAINER_RUNTIME]
      - [CI_CD_PLATFORM]
      - [CLOUD_PROVIDER]
      - [CONTAINER_REGISTRY]

      **From context.architecture:**
      - [DEPLOYMENT_STRATEGY]
      - [ENVIRONMENT_MANAGEMENT]
      - [SECRETS_MANAGEMENT]

      **From context.structure:**
      - [INFRA_STRUCTURE]

      WRITE to: .claude/skills/devops-docker-github/[filename]

    OUTPUT: "DevOps skill created: .claude/skills/devops-docker-github/"

  ELSE:
    SKIP: "No DevOps tools detected"
</conditional_logic>

</step>

<step number="8" name="ask_about_domain_skill">

### Step 8: Ask About Domain Skill

<user_interaction>
  ASK via AskUserQuestion:

  question: "Do you want to create a Domain Knowledge skill?"
  header: "Domain"
  options:
    - label: "Yes, create domain skill (Recommended)"
      description: "Create self-updating documentation for business processes"
    - label: "No, skip for now"
      description: "Can be added later with /add-domain"

  IF user selects "Yes":
    PROCEED to Step 9
  ELSE:
    SKIP to Step 10
</user_interaction>

</step>

<step number="9" name="create_domain_skill">

### Step 9: Create Domain Skill (If Requested)

<skill_creation>
  LOAD template: agent-os/templates/skills/domain/SKILL.md

  REPLACE placeholders:
  - [PROJECT_NAME] → from tech-stack.md or folder name
  - [DATE] → current date
  - [BUSINESS_CONTEXT_DESCRIPTION] → "To be filled during development"

  CREATE directory: .claude/skills/domain-[PROJECT_SLUG]/
  WRITE to: .claude/skills/domain-[PROJECT_SLUG]/SKILL.md

  ASK via AskUserQuestion:
  question: "What are the main business areas in this project?"
  header: "Domains"
  (Free text input)

  IF user provides areas:
    FOR EACH area mentioned:
      LOAD template: agent-os/templates/skills/domain/process.md
      REPLACE [PROCESS_NAME] with area name
      WRITE to: .claude/skills/domain-[PROJECT_SLUG]/[area-slug].md
      UPDATE: Domain Areas table in SKILL.md
</skill_creation>

</step>

<step number="9.5" name="detect_custom_skills" subagent="tech-architect">

### Step 9.5: Detect and Generate Custom Skills (Optional)

Use tech-architect agent to analyze tech-stack.md and existing code for specialized technologies requiring custom skills.

<custom_skill_detection>
  DELEGATE to tech-architect via Task tool:

  PROMPT:
  "Analyze tech stack and code for specialized technologies requiring custom skills.

  Context:
  - Tech Stack: agent-os/product/tech-stack.md
  - Standard Skills: Quality Gates + [detected frameworks] already generated

  Task:
  1. READ tech-stack.md thoroughly

  2. Identify specialized technologies/libraries that need custom skills:

     **Blockchain/Crypto:**
     - ethers.js, web3.js, @solana/web3.js, wagmi, viem
     - Wallet management, key signing, smart contracts
     - DEX/CEX integrations (Uniswap, CCXT)

     **Desktop/Electron:**
     - Electron framework
     - IPC communication
     - Native modules (node-keytar, better-sqlite3, ffi-napi)
     - Electron-specific testing

     **ML/AI:**
     - TensorFlow, PyTorch, OpenAI API, Anthropic SDK
     - Model training, inference
     - Data pipelines, embeddings

     **IoT:**
     - MQTT, CoAP protocols
     - Device communication
     - Sensor data processing

     **Game Development:**
     - Unity, Unreal Engine, Godot
     - Game logic, physics

     **Specialized APIs:**
     - Payment (Stripe, PayPal, Adyen)
     - Communication (Twilio, SendGrid)
     - Maps/Location (Google Maps, Mapbox)

     **Real-time/WebSockets:**
     - Socket.io, WebRTC
     - Real-time sync patterns

     **Mobile:**
     - React Native, Flutter
     - Native modules, platform APIs

  3. For EACH specialized technology found:
     a) Research best practices (use WebSearch for [technology] best practices 2026)
     b) Create custom skill in .claude/skills/custom-[technology]/
     c) Follow same structure as standard skills:
        - SKILL.md (index with Quick Reference)
        - [aspect-1].md (detailed patterns)
        - [aspect-2].md
        - dos-and-donts.md (empty initially)
     d) Include YAML frontmatter with appropriate globs
     e) Extract framework-specific patterns, code examples, testing strategies

  4. Generate skill content based on research:
     - Quick Reference section (key patterns, when to use)
     - Detailed pattern sections as sub-documents
     - Code examples from documentation
     - Security considerations
     - Testing patterns
     - Performance tips

  5. Report back:
     - List of custom skills created
     - Brief description of what each skill covers
     - Which technologies triggered the creation

  Examples:

  **If Electron detected:**
  Create: .claude/skills/custom-electron/
  ├── SKILL.md (globs: ['**/*.js' in main/renderer processes])
  ├── ipc-patterns.md
  ├── native-modules.md
  ├── testing.md
  └── dos-and-donts.md

  **If Blockchain detected:**
  Create: .claude/skills/custom-blockchain/
  ├── SKILL.md (globs: ['src/contracts/**/*', 'src/web3/**/*'])
  ├── wallet-integration.md
  ├── contract-interaction.md
  ├── security.md
  └── dos-and-donts.md

  NOTE: Only create custom skills if specialized technology is detected.
  Don't create skills for standard frameworks already covered."

  WAIT for tech-architect completion

  IF custom skills created:
    OUTPUT: "Custom skills created for: [LIST_OF_TECHNOLOGIES]"
    UPDATE: Summary to include custom skills
  ELSE:
    OUTPUT: "No specialized technologies detected. Standard skills are sufficient."
</custom_skill_detection>

</step>

<step number="10" name="create_dod_dor">

### Step 10: Create Definition of Done / Ready

(Renumbered from v2.0 - was Step 8/9)

<file_creation>
  CREATE directory: agent-os/team/ (if not exists)

  LOAD template: agent-os/templates/docs/dod-template.md
  (Fallback: ~/.agent-os/templates/docs/dod-template.md)

  CUSTOMIZE with:
  - Testing framework from tech-stack.md
  - Linting tools from tech-stack.md
  - Quality gates from context

  WRITE to: agent-os/team/dod.md

  LOAD template: agent-os/templates/docs/dor-template.md
  WRITE to: agent-os/team/dor.md
</file_creation>

</step>

<step number="11" name="report_missing_documents">

### Step 11: Report Missing Documents

<warning_output>
  IF any project documents were missing:

    OUTPUT:
    "⚠️ Some project documents were not found:

    Missing Documents:
    [LIST_OF_MISSING_DOCUMENTS]

    These documents help customize skills for your project:
    - tech-stack.md: Framework versions, libraries
    - architecture-decision.md: Architecture patterns
    - architecture-structure.md: Project structure
    - design-system.md: Colors, typography, components (Frontend)
    - ux-patterns.md: Navigation, user flows (Frontend)

    Run /plan-product to create these documents."
</warning_output>

</step>

<step number="12" name="summary">

### Step 12: Summary

<output_summary>
  OUTPUT:
  "
  ## Development Team v3.0 Ready!

  **Project Type:** [PROJECT_TYPE] (Product or Platform)
  **Context Source:** agent-os/product/

  ### Skills Created

  **Universal Skills (always created):**
  | Skill | Path | Purpose |
  |-------|------|---------|
  | Quality Gates | .claude/skills/quality-gates/ | Always active for all code |
  | PO Requirements | .claude/skills/po-requirements/ | Story creation guidance |
  | Architect Refinement | .claude/skills/architect-refinement/ | Technical refinement guidance |

  **Technology Skills (auto-load based on files):**
  | Skill | Path | Auto-Loads For |
  |-------|------|----------------|
  [| Frontend [FRAMEWORK] | .claude/skills/frontend-[name]/ | src/app/**/* |]
  [| Backend [FRAMEWORK] | .claude/skills/backend-[name]/ | app/**/*.rb |]
  [| DevOps | .claude/skills/devops-docker-github/ | Dockerfile, .github/** |]

  **Optional Skills:**
  | Skill | Path | Purpose |
  |-------|------|---------|
  [| Domain | .claude/skills/domain-[project]/ | Business knowledge (if created) |]
  [| Custom [TECH] | .claude/skills/custom-[tech]/ | Specialized technology (if detected) |]

  ### Quality Standards

  - Definition of Done: agent-os/team/dod.md
  - Definition of Ready: agent-os/team/dor.md

  ### How It Works (v3.0)

  1. **Skills load automatically** via glob patterns when you edit matching files
  2. **Main agent implements stories directly** - no delegation to sub-agents
  3. **Self-learning**: Agent updates dos-and-donts.md when learning
  4. **Domain docs stay current**: Agent updates when business logic changes

  ### Next Steps

  1. Review skills in .claude/skills/
  2. Run /create-spec to create your first feature
  3. Run /execute-tasks to implement stories

  ### Custom Skills (Optional)

  [IF tech-architect detected specialized technologies:]
  - Blockchain/Crypto: .claude/skills/custom-blockchain/
  - Electron/Desktop: .claude/skills/custom-electron/
  - ML/AI: .claude/skills/custom-ml/
  - [Other specialized technologies detected]

  [ELSE:]
  - No specialized technologies detected

  ### New Commands

  - /add-learning - Add insight to a skill's dos-and-donts.md
  - /add-domain - Add a new business domain area
  "
</output_summary>

</step>

</process_flow>

---

## Quick Reference

### Skill Structure

```
.claude/skills/
├── quality-gates/           # Always active
│   └── SKILL.md
├── frontend-[framework]/    # Auto-loads for frontend files
│   ├── SKILL.md             # Index + Quick Reference
│   ├── components.md
│   ├── state-management.md
│   ├── api-integration.md
│   ├── forms-validation.md
│   └── dos-and-donts.md     # Self-learning
├── backend-[framework]/     # Auto-loads for backend files
│   ├── SKILL.md
│   ├── services.md
│   ├── models.md
│   ├── api-design.md
│   ├── testing.md
│   └── dos-and-donts.md
├── devops-docker-github/    # Auto-loads for DevOps files
│   ├── SKILL.md
│   ├── docker.md
│   ├── ci-cd.md
│   └── dos-and-donts.md
└── domain-[project]/        # Business knowledge
    ├── SKILL.md             # Index of domain areas
    └── [process].md         # Individual processes
```

### Context Sources

| Document | Information | Used By |
|----------|-------------|---------|
| tech-stack.md | Versions, libraries | All skills |
| architecture-decision.md | Patterns, decisions | All skills |
| architecture-structure.md | Folder structure | All skills |
| design-system.md | Colors, typography | Frontend |
| ux-patterns.md | Navigation, flows | Frontend |

### Template Lookup Order

1. `agent-os/templates/skills/...` (project)
2. `~/.agent-os/templates/skills/...` (global)
