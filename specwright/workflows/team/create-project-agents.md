---
description: Create project-specific specialist agents from global templates
version: 1.0
encoding: UTF-8
---

# Create Project Agents Workflow

## Overview

Create customized specialist agents for the project by selecting which agents are needed, detecting the tech stack, and generating project-specific agent files from templates.

## Process Flow

<process_flow>

<step number="1" name="select_agents">

### Step 1: Select Which Agents to Create

Ask user which specialist agents they need.

<instructions>
  USE: AskUserQuestion
  QUESTION: "Which specialist agents do you need for this project?"
  HEADER: "Agent Selection"
  MULTI_SELECT: true

  OPTIONS:
    - label: "Backend Dev"
      description: "API development, services, repositories, database"

    - label: "Frontend Dev"
      description: "Components, pages, state management, UI"

    - label: "QA Specialist"
      description: "Testing, test automation, quality assurance"

    - label: "DevOps Specialist"
      description: "CI/CD, deployment, infrastructure, monitoring"

  RECEIVE: User selections
    selected_agents = ["Backend Dev", "Frontend Dev", "QA Specialist", "DevOps Specialist"]

  NORMALIZE: Agent names to file names
    "Backend Dev" → "backend-dev"
    "Frontend Dev" → "frontend-dev"
    "QA Specialist" → "qa-specialist"
    "DevOps Specialist" → "devops-specialist"

  OUTPUT:
    agents_to_create: ["backend-dev", "frontend-dev", "qa-specialist", "devops-specialist"]
</instructions>

</step>

<step number="2" name="detect_tech_stack">

### Step 2: Detect Project Tech Stack

Auto-detect frameworks and technologies for agent customization.

<instructions>
  ACTION: Detect backend framework (if backend-dev selected)

    IF "backend-dev" IN agents_to_create:
      USE: Glob tool
        - SEARCH pattern="pom.xml"
        - SEARCH pattern="build.gradle*"
        - SEARCH pattern="package.json"
        - SEARCH pattern="requirements.txt"
        - SEARCH pattern="Gemfile"

      IF pom.xml OR build.gradle found:
        READ: File
        IF "spring-boot" in content:
          backend_framework = "Spring Boot"
          READ: pom.xml or build.gradle for version
          backend_language = "Java"
          database = Detect from dependencies (PostgreSQL, MySQL, etc.)
          orm = "Spring Data JPA" (if spring-data found)

      ELSE IF package.json found:
        READ: package.json
        PARSE: JSON
        IF dependencies["express"]:
          backend_framework = "Express.js"
          backend_language = "TypeScript" (if typescript in devDependencies) OR "JavaScript"
          Check for: Prisma, TypeORM, Sequelize

      ELSE IF requirements.txt found:
        IF "fastapi" in content:
          backend_framework = "FastAPI"
          backend_language = "Python"
        ELSE IF "django" in content:
          backend_framework = "Django"
          backend_language = "Python"

      ELSE IF Gemfile found:
        IF "rails" in content:
          backend_framework = "Ruby on Rails"
          backend_language = "Ruby"

  ACTION: Detect frontend framework (if frontend-dev selected)

    IF "frontend-dev" IN agents_to_create:
      USE: Glob pattern="package.json"
      IF found:
        READ: package.json
        PARSE: JSON

        IF dependencies["react"]:
          frontend_framework = "React"
          frontend_version = dependencies["react"]
          typescript = devDependencies["typescript"] ? true : false
          state_management = Detect: Redux, Zustand, MobX, Context API
          styling = Detect: Tailwind, CSS Modules, styled-components

        ELSE IF dependencies["@angular/core"]:
          frontend_framework = "Angular"
          typescript = true
          state_management = "NgRx" (if detected) OR "Services"

        ELSE IF dependencies["vue"]:
          frontend_framework = "Vue"
          vue_version = "3" (if ^3.x) OR "2"
          state_management = "Pinia" OR "Vuex"

  ACTION: Detect testing framework (if qa-specialist selected)

    IF "qa-specialist" IN agents_to_create:
      USE: Glob tool
        - pattern="playwright.config.*"
        - pattern="jest.config.*"
        - pattern="pytest.ini"

      SET: Primary test frameworks
        unit_framework = "Jest" OR "Pytest" OR "RSpec"
        e2e_framework = "Playwright" OR "Cypress"

  ACTION: Detect CI/CD (if devops-specialist selected)

    IF "devops-specialist" IN agents_to_create:
      USE: Glob tool
        - pattern=".github/workflows/*.yml"
        - pattern=".gitlab-ci.yml"
        - pattern="Dockerfile"

      SET: CI/CD platforms
        cicd_platform = "GitHub Actions" OR "GitLab CI" OR "Jenkins"
        containerization = true (if Dockerfile found)

  OUTPUT:
    tech_stack: {
      backend: {
        framework: "Spring Boot",
        version: "3.2.0",
        language: "Java 17",
        database: "PostgreSQL",
        orm: "Spring Data JPA"
      },
      frontend: {
        framework: "React",
        version: "18.2.0",
        typescript: true,
        state_management: "Zustand",
        styling: "Tailwind CSS"
      },
      testing: {
        unit: "Jest",
        e2e: "Playwright"
      },
      deployment: {
        cicd: "GitHub Actions",
        containerization: true
      }
    }
</instructions>

</step>

<step number="3" name="detect_project_name">

### Step 3: Detect Project Name

Get project name for skill naming conventions.

<instructions>
  ACTION: Try detection sources

    PRIORITY_1: specwright/config.yml
      USE: Glob pattern="specwright/config.yml"
      IF found:
        READ: File
        PARSE: YAML
        IF project.name exists:
          project_name = value

    PRIORITY_2: package.json
      USE: Glob pattern="package.json"
      IF found AND project_name not set:
        READ: File
        PARSE: JSON
        project_name = name (remove @scope if present)

    PRIORITY_3: Directory name
      IF project_name still not set:
        GET: pwd
        EXTRACT: Last component
        CLEAN: Lowercase, hyphens, no special chars
        project_name = cleaned_name

  ACTION: Confirm with user
    MESSAGE: "Project name: {project_name}"
    USE: AskUserQuestion
    QUESTION: "Is this correct?"
    OPTIONS: ["Yes", "Enter different name"]

    IF "Enter different name":
      ASK: For name
      NORMALIZE: Input
      project_name = normalized_input

  OUTPUT:
    project_name: "my-app"
</instructions>

</step>

<step number="4" name="create_agents">

### Step 4: Create Agent Files from Templates

Generate customized agents for each selected specialist.

<instructions>
  ACTION: Create .claude/agents/ directory
    USE: Bash command: mkdir -p .claude/agents

  FOR each agent IN agents_to_create:
    ACTION: Load template
      template_path = "@specwright/templates/team-development/agents/{agent}-template.md"

      IF agent == "backend-dev":
        READ: @specwright/templates/team-development/agents/backend-dev-template.md
      ELSE IF agent == "frontend-dev":
        READ: @specwright/templates/team-development/agents/frontend-dev-template.md
      ELSE IF agent == "qa-specialist":
        READ: @specwright/templates/team-development/agents/qa-specialist-template.md
      ELSE IF agent == "devops-specialist":
        READ: @specwright/templates/team-development/agents/devops-specialist-template.md

      STORE: template_content

    ACTION: Replace [PROJECT NAME] placeholders
      REPLACE: "[PROJECT NAME]" WITH project_name in template

    ACTION: Replace [CUSTOMIZE] sections based on agent type

      IF agent == "backend-dev":
        REPLACE: "**Framework**: [e.g., Spring Boot...]"
          WITH: "**Framework**: {backend_framework} {version}"

        REPLACE: "**Language**: [e.g., Java 17...]"
          WITH: "**Language**: {backend_language}"

        REPLACE: "**Database**: [e.g., PostgreSQL...]"
          WITH: "**Database**: {database}"

        REPLACE: "**ORM/Data Access**: [e.g., JPA/Hibernate...]"
          WITH: "**ORM/Data Access**: {orm}"

        REPLACE: "- `[your-backend-patterns]`"
          WITH: "- `{project_name}-api-patterns` - Auto-loaded when files match globs"

        REPLACE: "**[LIST KEY PROJECT DEPENDENCIES]**"
          WITH: Detected dependencies from pom.xml/package.json

      ELSE IF agent == "frontend-dev":
        REPLACE: "**Framework**: [e.g., React...]"
          WITH: "**Framework**: {frontend_framework} {version}"

        REPLACE: "**Language**: [e.g., TypeScript...]"
          WITH: "**Language**: {typescript ? "TypeScript" : "JavaScript"}"

        REPLACE: "**State Management**: [e.g., Redux...]"
          WITH: "**State Management**: {state_management}"

        REPLACE: "**Styling**: [e.g., Tailwind...]"
          WITH: "**Styling**: {styling}"

        REPLACE: "- `[your-component-patterns]`"
          WITH: "- `{project_name}-component-patterns` - Auto-loaded when files match globs"

      ELSE IF agent == "qa-specialist":
        REPLACE: "**Unit Testing**: [e.g., Jest...]"
          WITH: "**Unit Testing**: {unit_framework}"

        REPLACE: "**E2E Testing**: [e.g., Playwright...]"
          WITH: "**E2E Testing**: {e2e_framework}"

        REPLACE: "- `[your-testing-patterns]`"
          WITH: "- `{project_name}-testing-patterns` - Auto-loaded when files match globs"

      ELSE IF agent == "devops-specialist":
        REPLACE: "**CI/CD Platform**: [e.g., GitHub Actions...]"
          WITH: "**CI/CD Platform**: {cicd_platform}"

        REPLACE: "**Containerization**: [e.g., Docker...]"
          WITH: "**Containerization**: {containerization ? "Docker" : "None"}"

        REPLACE: "- `[your-deployment-patterns]`"
          WITH: "- `{project_name}-deployment-patterns` - Auto-loaded when files match globs"

    ACTION: Write agent file
      USE: Write tool
      FILE_PATH: .claude/agents/{agent}.md
      CONTENT: {customized_agent_content}

    LOG: "Created {agent}.md"

  OUTPUT:
    created_agents: [
      ".claude/agents/backend-dev.md",
      ".claude/agents/frontend-dev.md",
      ".claude/agents/qa-specialist.md",
      ".claude/agents/devops-specialist.md"
    ]
</instructions>

</step>

<step number="5" name="display_summary">

### Step 5: Display Creation Summary

Show what was created and next steps.

<instructions>
  DISPLAY: Success message
    "✅ Project agents created successfully!

    Created {agent_count} specialist agents in .claude/agents/:
    {FOR each created_agent:
      - {agent_name}.md - {description}
    }

    📋 Tech Stack Detected:
    {IF backend detected:
      Backend: {backend_framework} {version} with {database}
    }
    {IF frontend detected:
      Frontend: {frontend_framework} {version} with {state_management}
    }
    {IF testing detected:
      Testing: {unit_framework} (unit), {e2e_framework} (E2E)
    }
    {IF deployment detected:
      CI/CD: {cicd_platform}
    }

    🎯 Skills Expected:

    Each agent expects project-specific skills with naming convention:
    {FOR each agent:
      - {agent_name} expects: `{project_name}-{skill_type}-patterns`
    }

    📦 Next Steps:

    1. Create project-specific skills:
       /add-skill --analyze --type api
       /add-skill --analyze --type component
       /add-skill --analyze --type testing
       /add-skill --analyze --type deployment

    2. (Optional) Manually assign additional skills:
       /assign-skills-to-agent

    3. Enable Team Development System in specwright/config.yml:
       team_system:
         enabled: true

    4. Use /execute-tasks - agents activate automatically!

    💡 Tip: Agents auto-load skills via naming convention.
        No manual assignment needed if skill names match pattern!
    "

  OPTIONAL:
    USE: AskUserQuestion
    QUESTION: "Create skills now?"
    OPTIONS:
      - "Yes, create API skill (/add-skill --analyze --type api)"
      - "Yes, create Component skill (/add-skill --analyze --type component)"
      - "No, I'll do it later"

    IF user selects create option:
      MESSAGE: "Run the /add-skill command to continue"
</instructions>

</step>

</process_flow>

## Error Handling

<error_protocols>
  <no_templates_found>
    ERROR: "Agent templates not found. Please run global installation first:"
    DISPLAY: "curl -sSL https://... | bash"
    EXIT: Workflow
  </no_templates_found>

  <agent_file_exists>
    IF .claude/agents/{agent}.md already exists:
      USE: AskUserQuestion
      QUESTION: "Agent {agent}.md already exists. Overwrite?"
      OPTIONS: ["Yes, overwrite", "Skip this agent", "Cancel all"]

      IF "Yes, overwrite":
        CREATE: Backup (.claude/agents/{agent}.md.backup)
        WRITE: New agent file

      ELSE IF "Skip this agent":
        CONTINUE: With next agent

      ELSE IF "Cancel all":
        EXIT: Workflow
  </agent_file_exists>

  <tech_stack_not_detected>
    IF tech stack detection fails:
      USE: AskUserQuestion
      QUESTION: "Could not detect {component}. Please specify:"
      PROVIDE: Manual input option
      USE: User-provided value
  </tech_stack_not_detected>
</error_protocols>

## Template Marker Reference

**Markers to replace:**
- `[PROJECT NAME]` → Detected project name
- `**Framework**: [e.g., Spring Boot...]` → Detected framework
- `**Language**: [e.g., Java 17...]` → Detected language
- `**Database**: [e.g., PostgreSQL...]` → Detected database
- `**[LIST KEY PROJECT DEPENDENCIES]**` → Detected dependencies
- `- [your-backend-patterns]` → {project_name}-api-patterns
- `- [your-component-patterns]` → {project_name}-component-patterns
- `- [your-testing-patterns]` → {project_name}-testing-patterns
- `- [your-deployment-patterns]` → {project_name}-deployment-patterns

## Example Output

**Input:**
- Selected: Backend Dev, Frontend Dev
- Project: my-app
- Stack: Spring Boot + React

**Creates:**
```
.claude/agents/backend-dev.md:
---
name: backend-dev
description: my-app backend development specialist
skills_project:
  - my-app-api-patterns
---
# Backend Development Specialist
You are a backend development specialist for my-app.
Framework: Spring Boot 3.2.0
Language: Java 17
Database: PostgreSQL
...
```

```
.claude/agents/frontend-dev.md:
---
name: frontend-dev
description: my-app frontend development specialist
skills_project:
  - my-app-component-patterns
---
# Frontend Development Specialist
You are a frontend development specialist for my-app.
Framework: React 18.2.0
Language: TypeScript
State: Zustand
Styling: Tailwind CSS
...
```
