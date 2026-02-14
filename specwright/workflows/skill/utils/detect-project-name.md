---
description: Auto-detect project name from various sources for skill file naming
version: 1.0
encoding: UTF-8
---

# Project Name Detection

## Overview

Auto-detect the project name from multiple sources with fallback strategies, normalize it for use in skill file naming, and provide user confirmation.

## Detection Sources (Priority Order)

1. Specwright config (specwright/config.yml)
2. Package.json (Node.js projects)
3. Gemfile or gemspec (Ruby projects)
4. pyproject.toml or setup.py (Python projects)
5. pom.xml or build.gradle (Java projects)
6. Current directory name
7. User prompt (fallback)

## Detection Process

<detection_flow>

<step number="1" name="agent_os_config">

### Step 1: Check Specwright Config

Highest priority source - project name from Specwright configuration.

<config_detection>
  IF specwright/config.yml exists:
    READ: specwright/config.yml file
    PARSE: YAML content
    LOOK_FOR: project.name field

    EXAMPLE:
      ```yaml
      project:
        name: my-awesome-app
        description: "..."
      ```

    EXTRACT: project.name value
    VALIDATE: Name format is valid

    IF valid name found:
      RETURN: project_name with HIGH confidence
      SOURCE: "specwright-config"
</config_detection>

<confidence>
  CONFIDENCE: HIGH
  REASON: Explicitly configured by user in Specwright
  SKIP_VALIDATION: Assume already validated
</confidence>

</step>

<step number="2" name="package_json">

### Step 2: Check package.json

For Node.js projects - extract name from package.json.

<package_json_detection>
  IF package.json exists AND no name from step 1:
    READ: package.json file
    PARSE: JSON content
    EXTRACT: name field

    EXAMPLE:
      ```json
      {
        "name": "my-app",
        "version": "1.0.0",
        ...
      }
      ```

    or with npm scope:
      ```json
      {
        "name": "@company/my-app",
        ...
      }
      ```

    PROCESS: Name extraction
      IF name has scope (starts with @):
        REMOVE: Scope prefix
        EXAMPLE: "@company/my-app" → "my-app"
      ELSE:
        USE: Name as-is

    IF valid name found:
      RETURN: project_name with HIGH confidence
      SOURCE: "package.json"
</package_json_detection>

<confidence>
  CONFIDENCE: HIGH
  REASON: Standard npm package name
  NOTE: Already follows npm naming conventions
</confidence>

</step>

<step number="3" name="gemfile">

### Step 3: Check Gemfile or gemspec

For Ruby projects - extract name from Gem specification.

<gemspec_detection>
  IF *.gemspec file exists AND no name from steps 1-2:
    FIND: .gemspec file in project root
    READ: Gemspec file
    SEARCH: For gem name
      PATTERN: spec.name = "..." or spec.name = '...'

    EXAMPLE:
      ```ruby
      Gem::Specification.new do |spec|
        spec.name = "my_gem"
        ...
      end
      ```

    EXTRACT: Gem name
    CONVERT: Underscores to hyphens (my_gem → my-gem)

    IF valid name found:
      RETURN: project_name with HIGH confidence
      SOURCE: "gemspec"
</gemspec_detection>

<gemfile_detection>
  IF Gemfile exists AND spec.name not found:
    NOTE: Gemfile usually doesn't contain project name
    SKIP: To next detection method
</gemfile_detection>

<confidence>
  CONFIDENCE: HIGH (gemspec) | LOW (Gemfile)
  REASON: Gemspec is authoritative for Ruby gems
</confidence>

</step>

<step number="4" name="pyproject_toml">

### Step 4: Check pyproject.toml or setup.py

For Python projects - extract name from Python project configuration.

<pyproject_toml_detection>
  IF pyproject.toml exists AND no name from steps 1-3:
    READ: pyproject.toml file
    PARSE: TOML content
    SEARCH: In [project] or [tool.poetry] sections
      - [project] name = "..."
      - [tool.poetry] name = "..."

    EXAMPLE:
      ```toml
      [project]
      name = "my-python-app"
      version = "1.0.0"
      ```

    EXTRACT: Name value
    CONVERT: Underscores to hyphens if needed

    IF valid name found:
      RETURN: project_name with HIGH confidence
      SOURCE: "pyproject.toml"
</pyproject_toml_detection>

<setup_py_detection>
  IF setup.py exists AND pyproject.toml not found:
    READ: setup.py file
    SEARCH: For setup( call with name= parameter
      PATTERN: name="..." or name='...'

    EXAMPLE:
      ```python
      setup(
          name="my_package",
          version="1.0.0",
          ...
      )
      ```

    EXTRACT: Name value
    CONVERT: Underscores to hyphens

    IF valid name found:
      RETURN: project_name with MEDIUM confidence
      SOURCE: "setup.py"
</setup_py_detection>

<confidence>
  CONFIDENCE: HIGH (pyproject.toml) | MEDIUM (setup.py)
  REASON: pyproject.toml is modern standard, setup.py is legacy
</confidence>

</step>

<step number="5" name="pom_xml">

### Step 5: Check pom.xml or build.gradle

For Java projects - extract name from Maven or Gradle configuration.

<pom_xml_detection>
  IF pom.xml exists AND no name from steps 1-4:
    READ: pom.xml file
    PARSE: XML content
    SEARCH: For <artifactId> and <name> elements

    EXAMPLE:
      ```xml
      <project>
        <groupId>com.example</groupId>
        <artifactId>my-java-app</artifactId>
        <name>My Java Application</name>
        ...
      </project>
      ```

    PRIORITY:
      1. <name> element (if user-friendly)
      2. <artifactId> element

    EXTRACT: Value
    NORMALIZE: Remove group ID, keep artifact ID format

    IF valid name found:
      RETURN: project_name with HIGH confidence
      SOURCE: "pom.xml"
</pom_xml_detection>

<build_gradle_detection>
  IF build.gradle OR build.gradle.kts exists AND pom.xml not found:
    READ: Build file
    SEARCH: For rootProject.name or project name settings

    EXAMPLE (settings.gradle):
      ```groovy
      rootProject.name = 'my-gradle-app'
      ```

    EXAMPLE (build.gradle):
      ```groovy
      project.name = 'my-app'
      ```

    EXTRACT: Name value
    REMOVE: Quotes

    IF valid name found:
      RETURN: project_name with HIGH confidence
      SOURCE: "build.gradle"
</build_gradle_detection>

<confidence>
  CONFIDENCE: HIGH
  REASON: Standard Maven/Gradle project identifiers
</confidence>

</step>

<step number="6" name="directory_name">

### Step 6: Use Current Directory Name

Fallback to using the current directory name.

<directory_extraction>
  IF no name from steps 1-5:
    GET: Current working directory path
    EXTRACT: Last component of path
      EXAMPLE: /Users/john/projects/my-app → my-app

    CLEAN: Directory name
      - Convert to lowercase
      - Replace spaces with hyphens
      - Remove special characters (except hyphens)
      - Trim leading/trailing hyphens

    VALIDATE: Result is not empty and not generic
      GENERIC_NAMES: ["src", "app", "project", "test", "code", "workspace"]
      IF name in GENERIC_NAMES:
        SKIP: This is too generic
        PROCEED: To step 7 (user prompt)

    IF valid name extracted:
      RETURN: project_name with LOW confidence
      SOURCE: "directory-name"
</directory_extraction>

<confidence>
  CONFIDENCE: LOW
  REASON: Directory name may not reflect actual project
  REQUIRES: User confirmation
</confidence>

</step>

<step number="7" name="user_prompt">

### Step 7: Prompt User for Project Name

Final fallback - ask user directly.

<user_prompt>
  IF no valid name from steps 1-6:
    USE: AskUserQuestion tool
    PROMPT: "What is your project name?"

    PROVIDE: Suggestion if directory name was attempted
      DEFAULT: Cleaned directory name (if not generic)

    QUESTION:
      "We couldn't automatically detect your project name.
       Please enter your project name (used for skill file naming):"

    INPUT_VALIDATION:
      - Must not be empty
      - Must be alphanumeric + hyphens
      - Will be normalized automatically

    RECEIVE: User input
    NORMALIZE: User-provided name (see step 8)

    RETURN: project_name with HIGH confidence
    SOURCE: "user-input"
</user_prompt>

<confidence>
  CONFIDENCE: HIGH
  REASON: Explicitly provided by user
  NOTE: User knows their project best
</confidence>

</step>

<step number="8" name="name_normalization">

### Step 8: Name Normalization

Normalize detected name to valid format for skill files.

<normalization_rules>
  APPLY: Standardization steps
    1. Convert to lowercase
       EXAMPLE: "MyApp" → "myapp"

    2. Replace spaces with hyphens
       EXAMPLE: "my app" → "my-app"

    3. Replace underscores with hyphens (for consistency)
       EXAMPLE: "my_app" → "my-app"

    4. Remove special characters (except hyphens)
       ALLOWED: a-z, 0-9, hyphen (-)
       REMOVE: All other characters
       EXAMPLE: "my@app!" → "myapp"

    5. Collapse multiple consecutive hyphens
       EXAMPLE: "my---app" → "my-app"

    6. Trim leading and trailing hyphens
       EXAMPLE: "-my-app-" → "my-app"

    7. Validate minimum length (at least 2 characters)
       IF length < 2:
         ERROR: "Project name too short"
</normalization_rules>

<validation>
  FINAL_CHECKS:
    - Not empty after normalization
    - At least 2 characters
    - Only contains: a-z, 0-9, hyphen
    - Doesn't start or end with hyphen
    - Not a reserved name (e.g., "test", "tmp")

  IF validation fails:
    RETRY: Ask user for valid name
    PROVIDE: Clear error message with requirements
</validation>

<output>
  RETURN:
    normalized_name: "my-app"
    original_name: "My App"
    source: "package.json" | "specwright-config" | etc.
    confidence: "high" | "medium" | "low"
</output>

</step>

<step number="9" name="user_confirmation">

### Step 9: User Confirmation

Confirm detected name with user.

<confirmation_strategy>
  IF confidence = HIGH AND source != "user-input":
    DISPLAY: Detected name
    MESSAGE: "Detected project name: [name] (from [source])"
    ASK: "Is this correct?"
    OPTIONS:
      - "Yes" → Use detected name
      - "No" → Prompt for different name

  IF confidence = MEDIUM OR LOW:
    DISPLAY: Detected name
    MESSAGE: "Detected project name: [name] (from [source], low confidence)"
    ASK: "Use this name or enter a different one?"
    OPTIONS:
      - "Use '[name]'" → Use detected name
      - "Enter different name" → Prompt for input

  IF user provides different name:
    NORMALIZE: New name (step 8)
    UPDATE: project_name
    SOURCE: "user-input"
    CONFIDENCE: HIGH
</confirmation_strategy>

<save_to_config>
  IF project name confirmed AND specwright/config.yml exists:
    ASK: "Save this name to specwright/config.yml for future use?"
    IF yes:
      UPDATE: specwright/config.yml
        ADD OR UPDATE: project.name field
        PRESERVE: Other configuration

      EXAMPLE:
        ```yaml
        project:
          name: my-app
          description: "Existing description..."
        ```

      SUCCESS: "Project name saved to config"
</save_to_config>

</step>

</detection_flow>

## Output Structure

<final_output>
  {
    project_name: "my-app",
    original_name: "My App",
    source: "package.json",
    confidence: "high",
    detection_path: [
      {step: "specwright-config", result: "not_found"},
      {step: "package.json", result: "found", value: "my-app"}
    ],
    normalized: true,
    saved_to_config: true | false
  }
</final_output>

## Error Handling

<error_protocols>
  <file_read_error>
    LOG: File path and error
    SKIP: That detection method
    CONTINUE: To next priority source
  </file_read_error>

  <parse_error>
    LOG: File and parsing error
    SKIP: That detection method
    CONTINUE: To next priority source
  </parse_error>

  <invalid_name>
    REJECT: Invalid name
    PROVIDE: Clear error message
    REQUEST: User to provide valid name
  </invalid_name>

  <all_methods_failed>
    FALLBACK: User prompt (step 7)
    ENSURE: User provides valid name before proceeding
  </all_methods_failed>
</error_protocols>

## Usage Example

<example>
  INPUT: Node.js project with package.json

  PROCESS:
    1. Check specwright/config.yml → Not found
    2. Check package.json → Found: "@mycompany/awesome-app"
    3. Remove scope → "awesome-app"
    4. Normalize → "awesome-app" (already valid)
    5. Confirm with user → User accepts
    6. Ask to save → User says yes
    7. Save to specwright/config.yml

  OUTPUT:
    {
      project_name: "awesome-app",
      original_name: "@mycompany/awesome-app",
      source: "package.json",
      confidence: "high",
      normalized: true,
      saved_to_config: true
    }
</example>

## Performance Considerations

- Check files in priority order, stop after first valid name found
- Cache file reads if multiple detections needed
- Skip parsing if file doesn't exist (check existence first)
- Use lightweight file existence checks before reading

## Related Utilities

- `@specwright/workflows/skill/utils/generate-frontmatter.md`
- `@specwright/workflows/skill/utils/assemble-skill.md`
