---
description: Replace template markers with actual content from patterns or best practices
version: 1.0
encoding: UTF-8
---

# Template Marker Replacement

## Overview

Replace all markers in the parsed template with actual content from discovered patterns, best practices, or project metadata to generate the final skill file.

## Replacement Process

<replacement_flow>

<step number="1" name="replace_project_markers">

### Step 1: Replace Project Markers

Replace simple project metadata markers.

<project_marker_replacement>
  INPUT: Replacement map from parse-template.md
  INPUT: Template content

  FOR each project_marker:
    FIND: [PROJECT:MARKER_NAME] in template
    REPLACE: With value from replacement_map

  SIMPLE_REPLACEMENTS:
    [PROJECT:NAME] → project_name
    [PROJECT:FRAMEWORK] → framework_name
    [PROJECT:FRAMEWORK_VERSION] → framework_version
    [PROJECT:DATE] → current_date
    [PROJECT:LANGUAGE] → programming_language
    [PROJECT:BUILD_TOOL] → build_tool_name
    [PROJECT:MODE] → "analyze" | "best-practices"

  EXAMPLE:
    Template: "Framework: [PROJECT:FRAMEWORK] [PROJECT:FRAMEWORK_VERSION]"
    Replaced: "Framework: spring-boot 3.2.0"
</project_marker_replacement>

<mode_description_replacement>
  [PROJECT:MODE_DESCRIPTION]:
    IF mode == "analyze":
      REPLACE: "Analyzed from existing codebase"
    ELSE:
      REPLACE: "Generated from framework best practices"
</mode_description_replacement>

</step>

<step number="2" name="replace_glob_markers">

### Step 2: Replace Glob Markers

Replace file glob patterns based on framework and skill type.

<glob_marker_replacement>
  [PROJECT:API_GLOBS]:
    SPRING_BOOT:
      - "src/**/*Controller.java"
      - "src/**/*Service.java"
      - "src/**/*Repository.java"
      - "src/**/dto/**/*.java"

    EXPRESS:
      - "src/**/*Controller.ts"
      - "src/**/*Service.ts"
      - "src/routes/**/*.ts"
      - "src/middleware/**/*.ts"

    FASTAPI:
      - "app/routers/**/*.py"
      - "app/services/**/*.py"
      - "app/schemas/**/*.py"

  [PROJECT:COMPONENT_GLOBS]:
    REACT:
      - "src/**/*.tsx"
      - "src/**/*.jsx"
      - "src/components/**/*"
      - "src/hooks/**/*.ts"

    ANGULAR:
      - "src/**/*.component.ts"
      - "src/**/*.service.ts"
      - "src/**/*.module.ts"

    VUE:
      - "src/**/*.vue"
      - "src/composables/**/*.ts"
      - "src/stores/**/*"

    SVELTE:
      - "src/**/*.svelte"
      - "src/lib/**/*.svelte"
      - "src/stores/**/*.ts"

  [PROJECT:TEST_GLOBS]:
    PLAYWRIGHT:
      - "**/*.spec.ts"
      - "tests/**/*.ts"
      - "e2e/**/*.spec.ts"

    JEST:
      - "**/*.test.ts"
      - "**/*.spec.ts"
      - "**/__tests__/**/*"

  [PROJECT:DEPLOYMENT_GLOBS]:
    GITHUB_ACTIONS:
      - ".github/workflows/**/*.yml"
      - ".github/workflows/**/*.yaml"

    DOCKER:
      - "Dockerfile"
      - "docker-compose.yml"
      - ".dockerignore"

  FORMAT: As YAML array for frontmatter
    ```yaml
    globs:
      - "src/**/*Controller.java"
      - "src/**/*Service.java"
      - "src/**/*Repository.java"
    ```
</glob_marker_replacement>

</step>

<step number="3" name="replace_customize_markers">

### Step 3: Replace CUSTOMIZE Markers

Replace content markers with patterns or best practices.

<customize_replacement_strategy>
  IF mode == "analyze":
    SOURCE: Discovered patterns + applied improvements
    PROCESS: Extract relevant pattern content
    FORMAT: For template insertion

  ELSE IF mode == "best-practices":
    SOURCE: Framework best practices knowledge base
    PROCESS: Extract relevant sections
    FORMAT: For template insertion
</customize_replacement_strategy>

<pattern_based_replacement>
  MODE A (Analyze):
    [CUSTOMIZE:CONTROLLER_PATTERNS]:
      SOURCE: Discovered controller patterns
      EXTRACT: Top-ranked controller patterns
      FORMAT:
        "Based on analysis of {file_count} controller files, the following patterns were found:

        ### Primary Pattern ({usage_percentage}% usage)
        {pattern_description}

        ```{language}
        {pattern_code_example}
        ```

        Files using this pattern: {file_list}
        "

      IF improvements_applied:
        ADD:
          "✅ Enhanced with: {improvement_title}
           {improvement_description}"

    [CUSTOMIZE:SERVICE_PATTERNS]:
      SOURCE: Discovered service patterns
      SIMILAR_PROCESS: As controller patterns

    [CUSTOMIZE:ERROR_HANDLING_PATTERNS]:
      SOURCE: Error handling patterns + improvements
      IF centralized_handler_added:
        EMPHASIZE: New pattern from improvement
        SHOW: Before/after comparison

    [CUSTOMIZE:VALIDATION_PATTERNS]:
      SOURCE: Validation patterns
      FORMAT: Validation approach description + examples

    [CUSTOMIZE:*_EXAMPLE]:
      SOURCE: Best examples from pattern extraction
      SELECT: Clearest, most representative example
      FORMAT: Code block with syntax highlighting
</pattern_based_replacement>

<best_practices_replacement>
  MODE B (Best Practices):
    [CUSTOMIZE:CONTROLLER_PATTERNS]:
      SOURCE: best-practices/{framework}.md
      EXTRACT: Controller section
      FORMAT: Best practice description + examples

    [CUSTOMIZE:SERVICE_PATTERNS]:
      SOURCE: Service section from best practices
      INCLUDE: Transaction management, DI, error handling

    [CUSTOMIZE:ERROR_HANDLING_PATTERNS]:
      SOURCE: Error handling section
      INCLUDE: Centralized handling, custom exceptions

    [CUSTOMIZE:*_EXAMPLE]:
      SOURCE: Code examples from best practices
      USE: Framework-specific examples
      FORMAT: Clean, well-commented code blocks
</best_practices_replacement>

</step>

<step number="4" name="format_replacements">

### Step 4: Format Replacement Content

Ensure replacement content is properly formatted.

<formatting_rules>
  CODE_BLOCKS:
    - Add proper language identifier (java, typescript, python, yaml)
    - Maintain indentation (2 spaces)
    - Include helpful comments
    - Keep examples concise (< 30 lines per example)

  LISTS:
    - Use consistent bullet style (-)
    - Maintain indentation levels
    - Keep items concise

  SECTIONS:
    - Preserve markdown heading levels
    - Add blank lines between sections
    - Keep hierarchy consistent

  YAML_FORMATTING (for globs):
    - Proper YAML syntax
    - 2-space indentation
    - Quote patterns if they contain special characters
</formatting_rules>

<indentation_handling>
  IF marker appears indented:
    PRESERVE: Indentation level
    APPLY: Same indentation to all lines of replacement

  EXAMPLE:
    Template:
      ```
        API Patterns:
          [CUSTOMIZE:CONTROLLER_PATTERNS]
      ```

    Replacement content (multi-line):
      ```
      Controller best practices:
      - Use @RestController
      - Return ResponseEntity
      ```

    Result:
      ```
        API Patterns:
          Controller best practices:
          - Use @RestController
          - Return ResponseEntity
      ```
</indentation_handling>

</step>

<step number="5" name="validate_replacements">

### Step 5: Validate Replacements

Ensure all replacements are valid and complete.

<validation>
  CHECK_COMPLETENESS:
    - All required markers have replacements
    - No markers remain in final content
    - Conditional blocks processed correctly

  CHECK_FORMAT:
    - YAML syntax valid (in frontmatter)
    - Code blocks have language identifiers
    - Markdown syntax valid
    - No broken links

  CHECK_CONTENT:
    - No empty required sections
    - Code examples present
    - References included
    - Minimum content length met

  VALIDATION_RESULT:
    {
      valid: true,
      completeness: {
        all_markers_replaced: true,
        required_sections_filled: true,
        examples_present: true
      },
      warnings: [
        "Section X is longer than recommended (500 lines)",
        "Reference link Y may be broken"
      ],
      errors: []
    }
</validation>

</step>

<step number="6" name="generate_output">

### Step 6: Generate Final Output

Produce the complete skill file content.

<final_output>
  PROCESS:
    1. Start with template content
    2. Replace project markers
    3. Replace glob markers
    4. Process conditional blocks
    5. Replace customize markers (largest content)
    6. Validate result
    7. Format final content

  OUTPUT:
    {
      skill_content: "[Complete skill markdown]",
      skill_metadata: {
        name: "my-app-api-patterns",
        framework: "spring-boot",
        version: "3.2.0",
        patterns_count: 35,
        examples_count: 42,
        improvements_applied: 8,
        size: "12.5 KB",
        lines: 542
      },
      validation_result: {...},
      ready_to_save: true
    }
</final_output>

</step>

</replacement_flow>

## Example Transformation

<example>
  TEMPLATE:
    ```markdown
    # [PROJECT:FRAMEWORK] API Patterns

    Framework: [PROJECT:FRAMEWORK] [PROJECT:FRAMEWORK_VERSION]

    ## Controller Layer

    [CUSTOMIZE:CONTROLLER_PATTERNS]

    **Example:**
    ```[PROJECT:LANGUAGE]
    [CUSTOMIZE:ROUTING_EXAMPLE]
    ```

    [IF:TYPESCRIPT]
    ### TypeScript Configuration
    TypeScript is enabled for this project.
    [ENDIF:TYPESCRIPT]
    ```

  REPLACEMENT_MAP:
    {
      project: {
        FRAMEWORK: "spring-boot",
        FRAMEWORK_VERSION: "3.2.0",
        LANGUAGE: "java"
      },
      customize: {
        CONTROLLER_PATTERNS: "Use @RestController for REST APIs...",
        ROUTING_EXAMPLE: "@GetMapping(\"/users/{id}\")..."
      },
      conditional: {
        TYPESCRIPT: false
      }
    }

  RESULT:
    ```markdown
    # Spring Boot API Patterns

    Framework: spring-boot 3.2.0

    ## Controller Layer

    Use @RestController for REST APIs...

    **Example:**
    ```java
    @GetMapping("/users/{id}")...
    ```
    ```
</example>

## Related Utilities

- `@specwright/workflows/skill/utils/parse-template.md`
- `@specwright/workflows/skill/utils/generate-frontmatter.md`
- `@specwright/workflows/skill/utils/assemble-skill.md`
