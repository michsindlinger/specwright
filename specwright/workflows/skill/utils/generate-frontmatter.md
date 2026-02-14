---
description: Generate YAML frontmatter for skill files with metadata and globs
version: 1.0
encoding: UTF-8
---

# Frontmatter Generation

## Overview

Generate proper YAML frontmatter for skill files including name, description, version, framework info, file globs, and metadata.

## Generation Process

<generation_flow>

<step number="1" name="generate_skill_name">

### Step 1: Generate Skill Name

Create skill name following naming convention.

<naming_convention>
  FORMAT: {project_name}-{skill_type}-patterns

  EXAMPLES:
    - my-app-api-patterns
    - user-portal-component-patterns
    - ecommerce-testing-patterns
    - webapp-deployment-patterns

  VALIDATION:
    - Lowercase with hyphens
    - No special characters except hyphens
    - Descriptive and unique
</naming_convention>

<skill_name_generation>
  INPUT:
    - project_name: "my-app" (from detect-project-name.md)
    - skill_type: "api" | "component" | "testing" | "deployment"

  PROCESS:
    skill_name = `${project_name}-${skill_type}-patterns`

  VALIDATE:
    - Not empty
    - Valid characters only
    - Unique within .claude/skills/ directory

  IF name_conflict:
    APPEND: Numeric suffix
    EXAMPLE: my-app-api-patterns-2
</skill_name_generation>

</step>

<step number="2" name="generate_description">

### Step 2: Generate Description

Create human-readable skill description.

<description_generation>
  FORMAT: "{Framework} {skill_type} patterns for {project_name}"

  EXAMPLES:
    - "Spring Boot 3.2.0 API patterns for my-app"
    - "React 18.2.0 component patterns for user-portal"
    - "Playwright 1.40.0 testing patterns for ecommerce"
    - "GitHub Actions deployment patterns for webapp"

  ENHANCEMENTS:
    IF mode == "analyze":
      APPEND: " (analyzed from existing codebase)"

    IF typescript == true:
      INSERT: "TypeScript" before framework
      EXAMPLE: "TypeScript React 18.2.0 component patterns..."

    IF improvements_count > 0:
      APPEND: " with {count} improvements applied"
</description_generation>

</step>

<step number="3" name="generate_globs">

### Step 3: Generate File Glob Patterns

Create file glob patterns for skill activation.

<glob_generation>
  BASED_ON: Framework and skill type

  API_GLOBS:
    SPRING_BOOT:
      - "src/**/*Controller.java"
      - "src/**/*Service.java"
      - "src/**/*Repository.java"
      - "src/**/dto/**/*.java"
      - "src/**/config/**/*.java"

    EXPRESS:
      - "src/**/*Controller.{ts,js}"
      - "src/**/*Service.{ts,js}"
      - "src/routes/**/*.{ts,js}"
      - "src/middleware/**/*.{ts,js}"
      - "src/models/**/*.{ts,js}"

    FASTAPI:
      - "app/routers/**/*.py"
      - "app/services/**/*.py"
      - "app/schemas/**/*.py"
      - "app/models/**/*.py"

    DJANGO:
      - "**/views.py"
      - "**/views/**/*.py"
      - "**/serializers.py"
      - "**/models.py"

    RAILS:
      - "app/controllers/**/*_controller.rb"
      - "app/services/**/*.rb"
      - "app/models/**/*.rb"

  COMPONENT_GLOBS:
    REACT:
      - "src/**/*.{tsx,jsx}"
      - "src/components/**/*"
      - "src/hooks/**/*.{ts,js}"
      - "src/pages/**/*"
      - "src/context/**/*"

    ANGULAR:
      - "src/**/*.component.ts"
      - "src/**/*.service.ts"
      - "src/**/*.directive.ts"
      - "src/**/*.pipe.ts"

    VUE:
      - "src/**/*.vue"
      - "src/components/**/*.vue"
      - "src/composables/**/*.{ts,js}"
      - "src/stores/**/*"

    SVELTE:
      - "src/**/*.svelte"
      - "src/lib/**/*.svelte"
      - "src/routes/**/*.svelte"
      - "src/stores/**/*.{ts,js}"

  TEST_GLOBS:
    PLAYWRIGHT:
      - "**/*.spec.{ts,js}"
      - "tests/**/*.{ts,js}"
      - "e2e/**/*.spec.{ts,js}"

    JEST:
      - "**/*.test.{ts,js}"
      - "**/*.spec.{ts,js}"
      - "**/__tests__/**/*"

    PYTEST:
      - "**/test_*.py"
      - "**/*_test.py"
      - "tests/**/*.py"

    RSPEC:
      - "spec/**/*_spec.rb"

  DEPLOYMENT_GLOBS:
    GITHUB_ACTIONS:
      - ".github/workflows/**/*.{yml,yaml}"

    GITLAB_CI:
      - ".gitlab-ci.yml"

    JENKINS:
      - "Jenkinsfile"
      - "Jenkinsfile.*"

    DOCKER:
      - "Dockerfile"
      - "docker-compose.{yml,yaml}"
      - ".dockerignore"
</glob_generation>

<glob_customization>
  IF mode == "analyze" AND custom_paths_discovered:
    MERGE: Discovered paths with standard globs
    EXAMPLE:
      Standard: "src/**/*Controller.java"
      Discovered: "api/v1/**/*Controller.java"
      Result: Include both patterns
</glob_customization>

</step>

<step number="4" name="generate_metadata">

### Step 4: Generate Additional Metadata

Add supplementary metadata fields.

<metadata_fields>
  REQUIRED:
    - name: skill_name
    - description: skill_description
    - globs: [file_patterns]

  OPTIONAL:
    - version: framework_version
    - framework: framework_name
    - created: creation_date
    - mode: "analyze" | "best-practices"
    - patterns_count: number
    - improvements_applied: number
    - files_analyzed: number (mode A only)
    - encoding: "UTF-8"

  EXAMPLE:
    ```yaml
    ---
    name: my-app-api-patterns
    description: Spring Boot 3.2.0 API patterns for my-app
    version: 3.2.0
    framework: spring-boot
    created: 2025-12-31
    mode: analyze
    patterns_count: 35
    improvements_applied: 8
    files_analyzed: 45
    encoding: UTF-8
    globs:
      - "src/**/*Controller.java"
      - "src/**/*Service.java"
      - "src/**/*Repository.java"
    ---
    ```
</metadata_fields>

</step>

<step number="5" name="format_yaml">

### Step 5: Format YAML Frontmatter

Generate valid YAML frontmatter.

<yaml_formatting>
  STRUCTURE:
    ```yaml
    ---
    {key}: {value}
    {key}: {value}
    {key}:
      - {array_item_1}
      - {array_item_2}
    ---
    ```

  FORMATTING_RULES:
    - Use 2-space indentation
    - Quote strings with special characters
    - Use array format for globs (not inline)
    - No trailing spaces
    - Start and end with --- markers

  EXAMPLE:
    ```yaml
    ---
    name: my-app-api-patterns
    description: Spring Boot 3.2.0 API patterns for my-app
    version: 3.2.0
    framework: spring-boot
    created: 2025-12-31
    mode: analyze
    globs:
      - "src/**/*Controller.java"
      - "src/**/*Service.java"
      - "src/**/*Repository.java"
      - "src/**/dto/**/*.java"
    ---
    ```
</yaml_formatting>

<yaml_validation>
  VALIDATE:
    - Proper YAML syntax
    - All required fields present
    - Glob patterns are valid
    - No special characters breaking YAML
    - Proper escaping of quotes and colons

  IF validation_fails:
    FIX: Syntax errors
    ESCAPE: Special characters
    QUOTE: Values with colons or special chars
</yaml_validation>

</step>

</generation_flow>

## Output Format

<output>
  {
    frontmatter_yaml: "[Complete YAML string]",
    frontmatter_object: {
      name: "my-app-api-patterns",
      description: "Spring Boot 3.2.0 API patterns for my-app",
      version: "3.2.0",
      framework: "spring-boot",
      created: "2025-12-31",
      mode: "analyze",
      patterns_count: 35,
      improvements_applied: 8,
      globs: [
        "src/**/*Controller.java",
        "src/**/*Service.java",
        "src/**/*Repository.java"
      ]
    },
    validation: {
      valid: true,
      errors: []
    }
  }
</output>

## Example Frontmatter

<examples>
  SPRING_BOOT_API:
    ```yaml
    ---
    name: user-management-api-patterns
    description: Spring Boot 3.2.0 API patterns for user-management (analyzed from existing codebase)
    version: 3.2.0
    framework: spring-boot
    created: 2025-12-31
    mode: analyze
    patterns_count: 35
    improvements_applied: 8
    files_analyzed: 45
    globs:
      - "src/**/*Controller.java"
      - "src/**/*Service.java"
      - "src/**/*Repository.java"
      - "src/**/dto/**/*.java"
    ---
    ```

  REACT_COMPONENT:
    ```yaml
    ---
    name: my-app-component-patterns
    description: TypeScript React 18.2.0 component patterns for my-app
    version: 18.2.0
    framework: react
    created: 2025-12-31
    mode: best-practices
    typescript: true
    state_management: zustand
    styling: tailwind
    globs:
      - "src/**/*.{tsx,jsx}"
      - "src/components/**/*"
      - "src/hooks/**/*.ts"
    ---
    ```

  PLAYWRIGHT_TESTING:
    ```yaml
    ---
    name: ecommerce-testing-patterns
    description: Playwright 1.40.0 testing patterns for ecommerce
    version: 1.40.0
    framework: playwright
    created: 2025-12-31
    mode: analyze
    test_type: e2e
    patterns_count: 24
    files_analyzed: 32
    globs:
      - "**/*.spec.ts"
      - "tests/**/*.ts"
      - "e2e/**/*.spec.ts"
    ---
    ```
</examples>

## Error Handling

<error_protocols>
  <invalid_yaml>
    ERROR: "Generated YAML is invalid"
    ACTION: Escape special characters
    RETRY: YAML generation
    FALLBACK: Minimal valid frontmatter
  </invalid_yaml>

  <missing_required_field>
    ERROR: "Required field {field} is missing"
    ACTION: Use default value or ask user
    REQUIRED: name, description, globs
  </missing_required_field>

  <invalid_glob_pattern>
    WARN: "Invalid glob pattern: {pattern}"
    ACTION: Remove invalid pattern
    CONTINUE: With valid patterns
  </invalid_glob_pattern>
</error_protocols>

## Related Utilities

- `@specwright/workflows/skill/utils/detect-project-name.md`
- `@specwright/workflows/skill/utils/assemble-skill.md`
- `@specwright/workflows/skill/utils/replace-markers.md`
