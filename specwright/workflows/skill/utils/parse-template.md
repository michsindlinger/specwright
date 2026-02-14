---
description: Parse skill template and extract markers for replacement
version: 1.0
encoding: UTF-8
---

# Template Marker Parsing

## Overview

Parse skill template files to identify and extract markers that need to be replaced with project-specific content, discovered patterns, or best practices.

## Marker Types

<marker_categories>
  PROJECT_MARKERS:
    Format: [PROJECT:MARKER_NAME]
    Purpose: Project metadata and configuration
    Examples:
      - [PROJECT:NAME] → "my-app"
      - [PROJECT:FRAMEWORK] → "spring-boot"
      - [PROJECT:FRAMEWORK_VERSION] → "3.2.0"
      - [PROJECT:DATE] → "2025-12-31"
      - [PROJECT:LANGUAGE] → "java"
      - [PROJECT:BUILD_TOOL] → "maven"
      - [PROJECT:DATABASE] → "postgresql"
      - [PROJECT:ORM] → "spring-data-jpa"
      - [PROJECT:TYPESCRIPT] → "true"
      - [PROJECT:MODE] → "analyze" | "best-practices"
      - [PROJECT:MODE_DESCRIPTION] → "Analyzed from existing codebase"

  CUSTOMIZE_MARKERS:
    Format: [CUSTOMIZE:MARKER_NAME]
    Purpose: Content to be filled with patterns or best practices
    Examples:
      - [CUSTOMIZE:CONTROLLER_PATTERNS]
      - [CUSTOMIZE:SERVICE_PATTERNS]
      - [CUSTOMIZE:ROUTING_EXAMPLE]
      - [CUSTOMIZE:ERROR_HANDLING_PATTERNS]
      - [CUSTOMIZE:VALIDATION_PATTERNS]

  GLOB_MARKERS:
    Format: [PROJECT:TYPE_GLOBS]
    Purpose: File glob patterns for skill activation
    Examples:
      - [PROJECT:API_GLOBS] → Controller, Service, Repository patterns
      - [PROJECT:COMPONENT_GLOBS] → Component file patterns
      - [PROJECT:TEST_GLOBS] → Test file patterns
      - [PROJECT:DEPLOYMENT_GLOBS] → CI/CD config patterns

  CONDITIONAL_MARKERS:
    Format: [IF:CONDITION]...[ENDIF:CONDITION]
    Purpose: Conditional sections based on project configuration
    Examples:
      - [IF:TYPESCRIPT]TypeScript-specific content[ENDIF:TYPESCRIPT]
      - [IF:DOCKER]Docker configuration[ENDIF:DOCKER]
</marker_categories>

## Parsing Process

<parsing_flow>

<step number="1" name="load_template">

### Step 1: Load Template

Load appropriate template based on skill type.

<template_selection>
  SKILL_TYPE_MAPPING:
    api: "@specwright/templates/skills/api-patterns.md.template"
    component: "@specwright/templates/skills/component-patterns.md.template"
    testing: "@specwright/templates/skills/testing-patterns.md.template"
    deployment: "@specwright/templates/skills/deployment-patterns.md.template"

  ACTION:
    READ: Template file
    VALIDATE: File exists and is readable
    STORE: Template content
</template_selection>

</step>

<step number="2" name="extract_markers">

### Step 2: Extract All Markers

Identify all markers in the template.

<marker_extraction>
  REGEX_PATTERNS:
    PROJECT_MARKER: /\[PROJECT:([A-Z_]+)\]/g
    CUSTOMIZE_MARKER: /\[CUSTOMIZE:([A-Z_]+)\]/g
    CONDITIONAL_START: /\[IF:([A-Z_]+)\]/g
    CONDITIONAL_END: /\[ENDIF:([A-Z_]+)\]/g

  EXTRACTION:
    FOR each regex pattern:
      FIND: All matches in template
      EXTRACT: Marker name
      RECORD: Marker position (line number, character offset)

  OUTPUT:
    {
      project_markers: [
        { name: "NAME", position: { line: 2, char: 6 }, full: "[PROJECT:NAME]" },
        { name: "FRAMEWORK", position: { line: 3, char: 15 }, full: "[PROJECT:FRAMEWORK]" },
        ...
      ],
      customize_markers: [
        { name: "CONTROLLER_PATTERNS", position: { line: 42, char: 0 }, full: "[CUSTOMIZE:CONTROLLER_PATTERNS]" },
        ...
      ],
      conditional_blocks: [
        {
          condition: "TYPESCRIPT",
          start: { line: 120, char: 0 },
          end: { line: 135, char: 0 },
          content: "..."
        }
      ]
    }
</marker_extraction>

</step>

<step number="3" name="validate_markers">

### Step 3: Validate Markers

Ensure all markers are valid and will have replacement values.

<validation>
  FOR each marker:
    CHECK: Marker name is recognized
    CHECK: Replacement source is available
    CHECK: No orphaned conditional blocks

  RECOGNIZED_MARKERS:
    PROJECT_MARKERS: [NAME, FRAMEWORK, FRAMEWORK_VERSION, DATE, LANGUAGE, ...]
    CUSTOMIZE_MARKERS: [CONTROLLER_PATTERNS, SERVICE_PATTERNS, ...]
    CONDITIONAL_FLAGS: [TYPESCRIPT, DOCKER, AUTH, ...]

  VALIDATION_ERRORS:
    - Unknown marker name
    - Mismatched conditional blocks [IF without ENDIF]
    - Nested conditional blocks (not supported)
    - Duplicate marker names in same section
</validation>

<error_handling>
  IF unknown_marker found:
    WARN: "Unknown marker: [marker_name]"
    OPTIONS:
      - Skip marker (leave as-is in output)
      - Replace with placeholder
      - Ask user for value

  IF conditional_mismatch:
    ERROR: "Conditional block mismatch: [IF:X] without [ENDIF:X]"
    FAIL: Template processing

  IF no_replacement_available:
    WARN: "No replacement value for marker: [marker_name]"
    FALLBACK: Use empty string or default value
</error_handling>

</step>

<step number="4" name="create_replacement_map">

### Step 4: Create Replacement Map

Build mapping of markers to replacement values.

<replacement_map_structure>
  {
    project_replacements: {
      "NAME": "my-app",
      "FRAMEWORK": "spring-boot",
      "FRAMEWORK_VERSION": "3.2.0",
      "DATE": "2025-12-31",
      "LANGUAGE": "java",
      "BUILD_TOOL": "maven",
      "DATABASE": "postgresql",
      "MODE": "analyze",
      "MODE_DESCRIPTION": "Analyzed from existing codebase"
    },

    customize_replacements: {
      "CONTROLLER_PATTERNS": "[Pattern content from analysis or best practices]",
      "SERVICE_PATTERNS": "[Pattern content]",
      "ROUTING_EXAMPLE": "[Code example]",
      ...
    },

    glob_replacements: {
      "API_GLOBS": [
        "src/**/*Controller.java",
        "src/**/*Service.java",
        "src/**/*Repository.java"
      ],
      "COMPONENT_GLOBS": [...],
      "TEST_GLOBS": [...],
      "DEPLOYMENT_GLOBS": [...]
    },

    conditional_values: {
      "TYPESCRIPT": true,
      "DOCKER": true,
      "AUTH": false
    }
  }
</replacement_map_structure>

<data_sources>
  PROJECT_MARKERS:
    SOURCE: Project detection results
      - detect-project-name.md results
      - detect-backend.md / detect-frontend.md results
      - Current date/time

  CUSTOMIZE_MARKERS:
    IF mode == "analyze":
      SOURCE: Discovered patterns + applied improvements
        - Pattern extraction results
        - Enhancement data from apply-improvements.md
    ELSE IF mode == "best-practices":
      SOURCE: Framework best practices
        - Loaded from best-practices/{framework}.md
        - Framework-specific examples

  GLOB_MARKERS:
    SOURCE: Framework-specific file patterns
      - Based on detected framework
      - Common patterns for that framework type

  CONDITIONAL_VALUES:
    SOURCE: Project configuration detection
      - TypeScript detected: true/false
      - Docker detected: true/false
      - Features detected
</data_sources>

</step>

<step number="5" name="handle_conditionals">

### Step 5: Handle Conditional Blocks

Process conditional sections based on project configuration.

<conditional_processing>
  FOR each conditional_block:
    EVALUATE: Condition value (true/false)

    IF condition == true:
      KEEP: Block content
      REMOVE: [IF:X] and [ENDIF:X] markers
      PROCESS: Any markers within the block

    ELSE:
      REMOVE: Entire block including [IF:X] and [ENDIF:X]

  EXAMPLE:
    Template:
      ```
      [IF:TYPESCRIPT]
      TypeScript configuration:
      - Use strict mode
      - Enable type checking
      [ENDIF:TYPESCRIPT]
      ```

    IF typescript == true:
      Result:
        ```
        TypeScript configuration:
        - Use strict mode
        - Enable type checking
        ```

    IF typescript == false:
      Result: (empty - entire block removed)
</conditional_processing>

</step>

</parsing_flow>

## Output Format

<output>
  {
    template_content: "[original template string]",
    template_path: "[path to template file]",

    markers: {
      total_count: 45,
      project_markers: [...],
      customize_markers: [...],
      glob_markers: [...],
      conditional_blocks: [...]
    },

    replacement_map: {
      project_replacements: {...},
      customize_replacements: {...},
      glob_replacements: {...},
      conditional_values: {...}
    },

    validation: {
      valid: true,
      errors: [],
      warnings: []
    },

    ready_for_replacement: true
  }
</output>

## Error Handling

<error_protocols>
  <template_not_found>
    ERROR: "Template file not found: {path}"
    FALLBACK: Use generic template
    SUGGEST: Available templates
  </template_not_found>

  <invalid_marker_syntax>
    WARN: "Invalid marker syntax at line {line}: {marker}"
    ACTION: Skip marker or ask for clarification
  </invalid_marker_syntax>

  <missing_replacement>
    WARN: "No replacement value for marker: {marker_name}"
    FALLBACK: Empty string or placeholder
    LOG: For manual review
  </missing_replacement>
</error_protocols>

## Performance Considerations

- Parse template once, reuse marker map
- Use efficient regex patterns
- Limit template size (< 10000 lines recommended)
- Cache parsed results for multiple operations

## Related Utilities

- `@specwright/workflows/skill/utils/replace-markers.md`
- `@specwright/workflows/skill/utils/generate-frontmatter.md`
- `@specwright/workflows/skill/utils/assemble-skill.md`
