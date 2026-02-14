---
description: Interactive framework selection for Mode B (best practices mode)
version: 1.0
encoding: UTF-8
---

# Framework Selection for Best Practices Mode

## Overview

Guide users through selecting the appropriate framework when using Mode B (--best-practices), which generates skills based on framework best practices without analyzing existing code.

## Selection Process

<selection_flow>

<step number="1" name="determine_skill_type">

### Step 1: Determine Skill Type

Identify what type of skill the user wants to create.

<skill_type_question>
  USE: AskUserQuestion tool

  QUESTION: "What type of skill would you like to create?"
  HEADER: "Skill Type"
  OPTIONS:
    - label: "API / Backend Patterns"
      description: "Controller, service, repository, and data access patterns"
    - label: "Component / Frontend Patterns"
      description: "UI components, state management, and styling patterns"
    - label: "Testing Patterns"
      description: "Unit tests, integration tests, and E2E test patterns"
    - label: "Deployment / CI/CD Patterns"
      description: "Build, test, deploy, and infrastructure patterns"
  MULTI_SELECT: false

  RESULT: skill_type = "api" | "component" | "testing" | "deployment"
</skill_type_question>

</step>

<step number="2" name="auto_detect_framework">

### Step 2: Auto-Detect Framework (Optional)

Attempt to detect framework from project files before asking.

<detection_strategy>
  IF Mode B requested:
    TRY: Framework detection using existing utilities
      LOAD: @specwright/workflows/skill/utils/detect-backend.md (if api)
      LOAD: @specwright/workflows/skill/utils/detect-frontend.md (if component)
      LOAD: @specwright/workflows/skill/utils/detect-testing.md (if testing)
      LOAD: @specwright/workflows/skill/utils/detect-cicd.md (if deployment)

    IF framework detected with HIGH confidence:
      SUGGEST: Detected framework as default
      ALLOW: User override

    ELSE:
      PROCEED: To manual selection
</detection_strategy>

</step>

<step number="3" name="select_framework">

### Step 3: Select Framework

Ask user to select or confirm the framework.

<framework_questions>
  API_SKILL:
    IF auto_detected:
      QUESTION: "Detected {framework} {version}. Use this framework?"
      OPTIONS:
        - "Yes, use {framework} (Recommended)"
        - "No, choose different framework"

      IF "No":
        SHOW: Manual selection

    MANUAL_SELECTION:
      QUESTION: "Which backend framework are you using?"
      HEADER: "Backend Framework"
      OPTIONS:
        - label: "Spring Boot (Recommended)"
          description: "Java/Kotlin REST APIs with Spring ecosystem"
        - label: "Express"
          description: "Node.js minimalist web framework"
        - label: "FastAPI"
          description: "Modern Python web framework with automatic API docs"
        - label: "Django"
          description: "High-level Python web framework"
        - label: "Ruby on Rails"
          description: "Ruby web application framework"
      MULTI_SELECT: false

      FOLLOW_UP: "Which version?" (if relevant)

  COMPONENT_SKILL:
    IF auto_detected:
      QUESTION: "Detected {framework} {version}. Use this framework?"
      OPTIONS:
        - "Yes, use {framework} (Recommended)"
        - "No, choose different framework"

    MANUAL_SELECTION:
      QUESTION: "Which frontend framework are you using?"
      HEADER: "Frontend Framework"
      OPTIONS:
        - label: "React (Recommended)"
          description: "Popular library for building UIs with components and hooks"
        - label: "Angular"
          description: "Full-featured framework with TypeScript and RxJS"
        - label: "Vue"
          description: "Progressive framework with Composition or Options API"
        - label: "Svelte"
          description: "Compiler-based framework with reactive programming"
      MULTI_SELECT: false

      FOLLOW_UP: "Using TypeScript?" (Yes/No)

  TESTING_SKILL:
    QUESTION: "Which testing framework are you using?"
    HEADER: "Testing Framework"
    OPTIONS:
      - label: "Playwright (Recommended for E2E)"
        description: "Modern E2E testing with auto-waiting and multiple browsers"
      - label: "Jest"
        description: "Popular JavaScript testing framework for unit/integration tests"
      - label: "Vitest"
        description: "Fast unit test framework for Vite projects"
      - label: "Pytest"
        description: "Python testing framework with fixtures and parametrization"
      - label: "RSpec"
        description: "Ruby testing framework with BDD style"
      - label: "Cypress"
        description: "E2E testing framework with time-travel debugging"
    MULTI_SELECT: false

  DEPLOYMENT_SKILL:
    QUESTION: "Which CI/CD platform are you using?"
    HEADER: "CI/CD Platform"
    OPTIONS:
      - label: "GitHub Actions (Recommended)"
        description: "Native CI/CD for GitHub with YAML workflows"
      - label: "GitLab CI/CD"
        description: "Integrated CI/CD for GitLab with pipelines"
      - label: "Jenkins"
        description: "Self-hosted automation server with Groovy pipelines"
      - label: "Docker"
        description: "Containerization with Dockerfile and docker-compose"
    MULTI_SELECT: false

    FOLLOW_UP: "Using Docker for containerization?" (if not Docker selected)
</framework_questions>

</step>

<step number="4" name="version_selection">

### Step 4: Version Selection (if applicable)

Determine framework version for version-specific best practices.

<version_questions>
  SPRING_BOOT:
    IF version not auto-detected:
      QUESTION: "Which Spring Boot version?"
      HEADER: "Spring Boot Version"
      OPTIONS:
        - label: "3.x (Recommended)"
          description: "Latest with Java 17+ and Spring Framework 6"
        - label: "2.7.x"
          description: "LTS version with Java 8-17 support"
      MULTI_SELECT: false

  REACT:
    QUESTION: "Which React features are you using?"
    HEADER: "React Setup"
    OPTIONS:
      - label: "Functional components with Hooks (Recommended)"
        description: "Modern React with useState, useEffect, etc."
      - label: "Class components"
        description: "Legacy React with lifecycle methods"
    MULTI_SELECT: false

  VUE:
    QUESTION: "Which Vue version?"
    HEADER: "Vue Version"
    OPTIONS:
      - label: "Vue 3 with Composition API (Recommended)"
        description: "Latest with <script setup> and improved TypeScript"
      - label: "Vue 3 with Options API"
        description: "Vue 3 using traditional Options API"
      - label: "Vue 2"
        description: "Legacy version (maintenance mode)"
    MULTI_SELECT: false

  ANGULAR:
    IF version not auto-detected:
      QUESTION: "Which Angular version?"
      HEADER: "Angular Version"
      OPTIONS:
        - label: "17+ (Recommended)"
          description: "Latest with standalone components and signals"
        - label: "15-16"
          description: "Recent versions with improved DX"
        - label: "14 or earlier"
          description: "Older versions"
      MULTI_SELECT: false
</version_questions>

</step>

<step number="5" name="additional_context">

### Step 5: Gather Additional Context

Collect information about related technologies and preferences.

<contextual_questions>
  IF skill_type == "api":
    QUESTION: "Which database are you using?"
    OPTIONS: ["PostgreSQL", "MySQL", "MongoDB", "None/Other"]

    QUESTION: "Which ORM/query library?"
    OPTIONS:
      - Spring Boot: "Spring Data JPA" | "MyBatis" | "JDBC Template"
      - Express: "Prisma" | "TypeORM" | "Sequelize" | "Mongoose"
      - Django: "Django ORM" | "SQLAlchemy"

  IF skill_type == "component":
    QUESTION: "Which styling approach?"
    OPTIONS:
      - React: "Tailwind CSS" | "CSS Modules" | "styled-components" | "Emotion"
      - Angular: "Component styles" | "Tailwind CSS" | "Angular Material"
      - Vue: "Scoped styles" | "Tailwind CSS" | "Vuetify"

    QUESTION: "State management library?"
    OPTIONS:
      - React: "Context API" | "Redux Toolkit" | "Zustand" | "MobX"
      - Angular: "Services" | "NgRx" | "Akita"
      - Vue: "Composition API" | "Pinia" | "Vuex"

  IF skill_type == "deployment":
    IF platform != "Docker":
      QUESTION: "Using Docker for containerization?"
      OPTIONS: ["Yes", "No"]

    QUESTION: "Deployment target?"
    OPTIONS: ["AWS", "Google Cloud", "Azure", "DigitalOcean", "Vercel", "Netlify", "Self-hosted"]
</contextual_questions>

</step>

<step number="6" name="confirmation">

### Step 6: Confirm Selections

Show summary and confirm before proceeding.

<confirmation_display>
  MESSAGE:
    "📋 Framework Selection Summary

    Skill Type: {skill_type}
    Framework: {framework} {version}
    Additional Technologies:
    - {tech_1}
    - {tech_2}
    - {tech_3}

    I'll generate a skill file with best practices for this stack,
    including:
    - Framework-specific patterns and conventions
    - Code examples and templates
    - Common pitfalls and anti-patterns
    - Performance and security recommendations

    Proceed with these selections?"

  OPTIONS: "Yes, continue" | "Change framework" | "Cancel"

  IF "Change framework":
    RETURN: To step 3

  IF "Yes, continue":
    PROCEED: To best practices loading
</confirmation_display>

</step>

<step number="7" name="load_best_practices">

### Step 7: Load Best Practices

Load appropriate best practices based on selections.

<best_practices_loading>
  BASED_ON: Framework selection

  SPRING_BOOT:
    LOAD: @specwright/workflows/skill/validation/best-practices/spring-boot.md
    INCLUDE:
      - Controller patterns (REST, validation, responses)
      - Service layer (transactions, business logic)
      - Repository patterns (JPA, queries, pagination)
      - Exception handling (@ControllerAdvice)
      - Security (authentication, authorization)
      - Configuration (application.yml, profiles)

  EXPRESS:
    LOAD: @specwright/workflows/skill/validation/best-practices/express.md
    INCLUDE:
      - Routing patterns (Express Router, middleware)
      - Controller structure (async/await, error handling)
      - Service organization
      - Validation (express-validator, Joi)
      - Security (helmet, CORS, rate limiting)
      - Error handling middleware

  REACT:
    LOAD: @specwright/workflows/skill/validation/best-practices/react.md
    INCLUDE:
      - Component patterns (functional, hooks, composition)
      - Props and TypeScript interfaces
      - State management (useState, useReducer, Context, Redux)
      - Performance (useMemo, useCallback, React.memo)
      - Event handling
      - Styling patterns

  ANGULAR:
    LOAD: @specwright/workflows/skill/validation/best-practices/angular.md
    INCLUDE:
      - Component patterns (decorators, templates, change detection)
      - Services and dependency injection
      - RxJS patterns (observables, operators, subscriptions)
      - Standalone components
      - Module organization
      - Forms (reactive, template-driven)

  PLAYWRIGHT:
    LOAD: @specwright/workflows/skill/validation/best-practices/playwright.md
    INCLUDE:
      - Test structure (describe, test, fixtures)
      - Locator strategies (getByRole, getByTestId)
      - Page Object Model
      - Assertions and auto-waiting
      - Test isolation and setup/teardown
      - Best practices for reliable tests

  GITHUB_ACTIONS:
    LOAD: @specwright/workflows/skill/validation/best-practices/github-actions.md
    INCLUDE:
      - Workflow structure (triggers, jobs, steps)
      - Caching strategies
      - Matrix builds
      - Secrets management
      - Deployment patterns
      - Security best practices
</best_practices_loading>

</step>

</selection_flow>

## Output Format

<output>
  {
    skill_type: "api" | "component" | "testing" | "deployment",
    framework: {
      name: "spring-boot" | "express" | "react" | "angular" | "playwright" | "github-actions",
      version: "3.2.0" | "latest" | ...,
      detected: true | false,
      confidence: "high" | "medium" | "low" | null
    },
    additional_context: {
      typescript: true | false,
      database: "postgresql" | ...,
      orm: "spring-data-jpa" | ...,
      styling: "tailwind" | ...,
      state_management: "zustand" | ...,
      containerization: true | false,
      deployment_target: "aws" | ...
    },
    best_practices_loaded: true,
    best_practices_path: "@specwright/workflows/skill/validation/best-practices/{framework}.md"
  }
</output>

## User Experience Guidelines

<ux_principles>
  SIMPLICITY:
    - Start with broad question (skill type)
    - Narrow down progressively
    - Show most common options first
    - Mark recommended options

  AUTO_DETECTION:
    - Try to detect framework first
    - Make detection transparent
    - Allow easy override
    - Show confidence level

  CLARITY:
    - Provide clear descriptions for each option
    - Explain what each choice means
    - Show examples when helpful
    - Summarize selections before proceeding

  EFFICIENCY:
    - Skip unnecessary questions
    - Provide sensible defaults
    - Allow quick confirmation of detections
    - Minimize clicks for common scenarios
</ux_principles>

## Error Handling

<error_protocols>
  <unsupported_framework>
    IF framework not in supported list:
      MESSAGE: "Framework '{framework}' is not yet supported."
      SUGGEST: "Choose from: {supported_frameworks}"
      OFFER: "Continue with similar framework" | "Cancel"
  </unsupported_framework>

  <detection_failure>
    IF auto-detection fails:
      NOTE: "Could not auto-detect framework"
      FALLBACK: Manual selection
      PROCEED: Normally
  </detection_failure>

  <user_cancellation>
    IF user cancels during selection:
      CONFIRM: "Cancel skill generation?"
      OPTIONS: "Yes, cancel" | "No, continue selecting"
  </user_cancellation>
</error_protocols>

## Related Utilities

- `@specwright/workflows/skill/utils/detect-backend.md`
- `@specwright/workflows/skill/utils/detect-frontend.md`
- `@specwright/workflows/skill/utils/detect-testing.md`
- `@specwright/workflows/skill/utils/detect-cicd.md`
- `@specwright/workflows/skill/validation/best-practices/*.md`
