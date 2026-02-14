---
description: Detect testing framework, version, and configuration in the project
version: 1.0
encoding: UTF-8
---

# Testing Framework Detection

## Overview

Auto-detect testing frameworks used in the project, including framework name, version, test types (unit, integration, e2e), and configuration details.

## Supported Frameworks

- Playwright (E2E - Node.js)
- Jest (Unit/Integration - JavaScript/TypeScript)
- Pytest (Unit/Integration - Python)
- RSpec (Unit/Integration - Ruby)
- Vitest (Unit - Vite ecosystem)
- Cypress (E2E - JavaScript/TypeScript)

## Detection Process

<detection_flow>

<step number="1" name="initial_scan">

### Step 1: Initial File System Scan

Scan project for testing framework indicator files.

<file_indicators>
  SEARCH: Project root and test directories
  LOOK_FOR:
    - package.json (JavaScript/TypeScript frameworks)
    - playwright.config.ts/js (Playwright)
    - jest.config.js/ts (Jest)
    - vitest.config.ts/js (Vitest)
    - cypress.config.js/ts (Cypress)
    - pytest.ini, pyproject.toml (Pytest)
    - .rspec, spec/spec_helper.rb (RSpec)
    - Gemfile (Ruby testing gems)
    - requirements.txt (Python testing packages)
</file_indicators>

<instructions>
  ACTION: Use Glob tool to find indicator files
  PATTERN: Look for testing configuration files
  RECORD: Found files for framework determination
</instructions>

</step>

<step number="2" name="playwright_detection">

### Step 2: Playwright Detection

Detect Playwright E2E testing framework and version.

<detection_criteria>
  REQUIRED: One of the following
    - package.json with @playwright/test dependency
    - playwright.config.ts/js file

  CONFIDENCE_HIGH: If both package.json AND config file found
  CONFIDENCE_MEDIUM: If only package.json with @playwright/test
</detection_criteria>

<package_json_detection>
  IF package.json exists:
    READ: package.json file
    SEARCH: In devDependencies:
      - "@playwright/test": "version"

    EXTRACT: Version from dependency declaration
      - Exact: "1.40.0"
      - Range: "^1.40.0"

    CONFIDENCE: MEDIUM if @playwright/test found
</package_json_detection>

<config_file_detection>
  IF playwright.config.ts OR playwright.config.js exists:
    READ: Config file
    VERIFY: Valid Playwright configuration
    LOOK_FOR:
      - import { defineConfig } from '@playwright/test'
      - testDir: '...'
      - use: { ... }
      - projects: [ ... ]

    CONFIDENCE: HIGH if valid config found
</config_file_detection>

<test_file_detection>
  SEARCH: For Playwright test files
    PATTERN: [
      "**/*.spec.ts",
      "**/*.spec.js",
      "tests/**/*.ts",
      "e2e/**/*.spec.ts"
    ]
    LOOK_FOR: import { test, expect } from '@playwright/test'

    IF test files found:
      test_files_count: N
      CONFIDENCE_BOOST: Confirms Playwright usage
</test_file_detection>

<configuration_analysis>
  IF playwright.config file exists:
    EXTRACT:
      - testDir: Location of test files
      - projects: Browser configurations (chromium, firefox, webkit)
      - use.baseURL: Base URL for tests
      - use.headless: Headless mode setting
      - workers: Parallel execution workers
      - retries: Retry configuration
      - reporter: Test reporter configuration
</configuration_analysis>

<result_structure>
  IF Playwright detected:
    RETURN:
      framework: "playwright"
      version: "[detected version]"
      test_type: "e2e"
      confidence: "high" | "medium"
      configuration:
        test_dir: "[path]"
        browsers: ["chromium", "firefox", "webkit"]
        workers: N
        reporter: "[type]"
      indicators:
        - package.json found: yes
        - @playwright/test found: yes
        - playwright.config found: yes/no
        - test files found: yes/no
        - test_files_count: N
</result_structure>

</step>

<step number="3" name="jest_detection">

### Step 3: Jest Detection

Detect Jest unit/integration testing framework and version.

<detection_criteria>
  REQUIRED: One of the following
    - package.json with jest dependency
    - jest.config.js/ts file

  CONFIDENCE_HIGH: If both package.json AND test files found
  CONFIDENCE_MEDIUM: If only package.json with jest
</detection_criteria>

<package_json_detection>
  IF package.json exists:
    READ: package.json file
    SEARCH: In devDependencies:
      - "jest": "version"
      - "@types/jest": "version" (TypeScript)

    CHECK: package.json scripts for jest
      - "test": "jest"
      - "test:coverage": "jest --coverage"

    CONFIDENCE: MEDIUM if jest found
</package_json_detection>

<config_file_detection>
  IF jest.config.js OR jest.config.ts exists:
    READ: Config file
    VERIFY: Valid Jest configuration
    LOOK_FOR:
      - module.exports = { ... }
      - preset: '...'
      - testEnvironment: '...'
      - collectCoverage: true/false

    CONFIDENCE_BOOST: Confirms Jest setup
</config_file_detection>

<typescript_detection>
  CHECK: If TypeScript is used with Jest
    LOOK_FOR: "@types/jest" in package.json
    LOOK_FOR: "ts-jest" in devDependencies
    LOOK_FOR: preset: 'ts-jest' in config

    IF TypeScript detected:
      typescript: true
</typescript_detection>

<test_file_detection>
  SEARCH: For Jest test files
    PATTERN: [
      "**/*.test.ts",
      "**/*.test.js",
      "**/*.spec.ts",
      "**/*.spec.js",
      "**/__tests__/**/*.ts",
      "**/__tests__/**/*.js"
    ]
    LOOK_FOR:
      - describe('...', () => { ... })
      - test('...', () => { ... })
      - it('...', () => { ... })
      - expect(...).toBe(...)

    IF test files found:
      test_files_count: N
      CONFIDENCE_BOOST: Increases to HIGH
</test_file_detection>

<react_testing_detection>
  CHECK: If React Testing Library is used
    LOOK_FOR: "@testing-library/react" in package.json
    LOOK_FOR: "@testing-library/jest-dom"

    IF found:
      testing_library: "react"
      INDICATES: React component testing
</react_testing_detection>

<configuration_analysis>
  IF jest.config exists:
    EXTRACT:
      - testEnvironment: "node" | "jsdom"
      - coverageThreshold: Minimum coverage requirements
      - collectCoverageFrom: Files to include in coverage
      - setupFilesAfterEnv: Setup files
      - testMatch: Test file patterns
</configuration_analysis>

<result_structure>
  IF Jest detected:
    RETURN:
      framework: "jest"
      version: "[detected version]"
      test_type: "unit" | "integration"
      typescript: true | false
      testing_library: "react" | "vue" | null
      confidence: "high" | "medium"
      configuration:
        test_environment: "node" | "jsdom"
        coverage_enabled: true | false
        setup_files: [...]
      indicators:
        - package.json found: yes
        - jest dependency found: yes
        - jest.config found: yes/no
        - test files found: yes/no
        - test_files_count: N
        - typescript: yes/no
</result_structure>

</step>

<step number="4" name="vitest_detection">

### Step 4: Vitest Detection

Detect Vitest unit testing framework (Vite ecosystem).

<detection_criteria>
  REQUIRED: One of the following
    - package.json with vitest dependency
    - vitest.config.ts/js file

  CONFIDENCE_HIGH: If both package.json AND test files found
  CONFIDENCE_MEDIUM: If only package.json with vitest
</detection_criteria>

<package_json_detection>
  IF package.json exists:
    READ: package.json file
    SEARCH: In devDependencies:
      - "vitest": "version"

    CHECK: package.json scripts for vitest
      - "test": "vitest"
      - "test:ui": "vitest --ui"

    CONFIDENCE: MEDIUM if vitest found
</package_json_detection>

<config_file_detection>
  IF vitest.config.ts OR vitest.config.js OR vite.config.ts exists:
    READ: Config file
    LOOK_FOR: test: { ... } section in Vite config
    VERIFY: Vitest configuration present

    CONFIDENCE_BOOST: Confirms Vitest setup
</config_file_detection>

<test_file_detection>
  SEARCH: For Vitest test files
    PATTERN: [
      "**/*.test.ts",
      "**/*.test.js",
      "**/*.spec.ts",
      "**/*.spec.js"
    ]
    LOOK_FOR:
      - import { describe, it, expect } from 'vitest'
      - import { test } from 'vitest'

    IF test files found:
      test_files_count: N
      CONFIDENCE_BOOST: Increases to HIGH
</test_file_detection>

<result_structure>
  IF Vitest detected:
    RETURN:
      framework: "vitest"
      version: "[detected version]"
      test_type: "unit"
      typescript: true | false
      confidence: "high" | "medium"
      indicators:
        - package.json found: yes
        - vitest dependency found: yes
        - vitest.config found: yes/no
        - test files found: yes/no
        - test_files_count: N
</result_structure>

</step>

<step number="5" name="cypress_detection">

### Step 5: Cypress Detection

Detect Cypress E2E testing framework and version.

<detection_criteria>
  REQUIRED: One of the following
    - package.json with cypress dependency
    - cypress.config.js/ts file

  CONFIDENCE_HIGH: If both package.json AND cypress directory found
  CONFIDENCE_MEDIUM: If only package.json with cypress
</detection_criteria>

<package_json_detection>
  IF package.json exists:
    READ: package.json file
    SEARCH: In devDependencies:
      - "cypress": "version"

    CONFIDENCE: MEDIUM if cypress found
</package_json_detection>

<config_file_detection>
  IF cypress.config.js OR cypress.config.ts exists:
    READ: Config file
    VERIFY: Valid Cypress configuration
    LOOK_FOR:
      - e2e: { ... }
      - baseUrl: "..."
      - specPattern: "..."

    CONFIDENCE_BOOST: Confirms Cypress setup
</config_file_detection>

<cypress_directory_detection>
  CHECK: For cypress directory structure
    LOOK_FOR: cypress/ directory
    LOOK_FOR: cypress/e2e/ directory
    LOOK_FOR: cypress/fixtures/
    LOOK_FOR: cypress/support/

    IF cypress directory found:
      CONFIDENCE_BOOST: Increases to HIGH
</cypress_directory_detection>

<result_structure>
  IF Cypress detected:
    RETURN:
      framework: "cypress"
      version: "[detected version]"
      test_type: "e2e"
      confidence: "high" | "medium"
      indicators:
        - package.json found: yes
        - cypress dependency found: yes
        - cypress.config found: yes/no
        - cypress directory found: yes/no
</result_structure>

</step>

<step number="6" name="pytest_detection">

### Step 6: Pytest Detection

Detect Pytest unit/integration testing framework and version.

<detection_criteria>
  REQUIRED: One of the following
    - requirements.txt with pytest
    - pyproject.toml with pytest dependency
    - pytest.ini file

  CONFIDENCE_HIGH: If dependency file AND test files found
  CONFIDENCE_MEDIUM: If only dependency file with pytest
</detection_criteria>

<requirements_detection>
  IF requirements.txt exists:
    READ: requirements.txt file
    SEARCH: For patterns:
      - pytest==X.Y.Z
      - pytest>=X.Y.Z
      - pytest

    EXTRACT: Version from dependency
    CONFIDENCE: MEDIUM if pytest found
</requirements_detection>

<pyproject_toml_detection>
  IF pyproject.toml exists:
    READ: pyproject.toml file
    PARSE: TOML content
    SEARCH: In [tool.poetry.dev-dependencies] or [project.optional-dependencies]:
      - pytest = "version"

    EXTRACT: Version from dependency
    CONFIDENCE: MEDIUM if pytest found
</pyproject_toml_detection>

<pytest_ini_detection>
  IF pytest.ini exists:
    READ: pytest.ini file
    VERIFY: Valid pytest configuration
    LOOK_FOR:
      - [pytest]
      - testpaths = ...
      - python_files = ...
      - python_classes = ...
      - python_functions = ...

    CONFIDENCE_BOOST: Confirms pytest setup
</pytest_ini_detection>

<test_file_detection>
  SEARCH: For pytest test files
    PATTERN: [
      "**/test_*.py",
      "**/*_test.py",
      "tests/**/*.py"
    ]
    LOOK_FOR:
      - def test_...():
      - import pytest
      - @pytest.fixture
      - @pytest.mark.*

    IF test files found:
      test_files_count: N
      CONFIDENCE_BOOST: Increases to HIGH
</test_file_detection>

<plugins_detection>
  CHECK: For common pytest plugins
    LOOK_FOR:
      - pytest-cov (coverage)
      - pytest-django (Django integration)
      - pytest-asyncio (async testing)
      - pytest-mock (mocking)

    RECORD: Detected plugins
</plugins_detection>

<result_structure>
  IF Pytest detected:
    RETURN:
      framework: "pytest"
      version: "[detected version]"
      test_type: "unit" | "integration"
      confidence: "high" | "medium"
      plugins: ["pytest-cov", "pytest-django", ...]
      configuration:
        test_paths: [...]
        coverage_enabled: true | false
      indicators:
        - requirements.txt found: yes/no
        - pyproject.toml found: yes/no
        - pytest.ini found: yes/no
        - pytest dependency found: yes
        - test files found: yes/no
        - test_files_count: N
</result_structure>

</step>

<step number="7" name="rspec_detection">

### Step 7: RSpec Detection

Detect RSpec unit/integration testing framework and version.

<detection_criteria>
  REQUIRED: One of the following
    - Gemfile with rspec or rspec-rails gem
    - .rspec configuration file
    - spec/spec_helper.rb file

  CONFIDENCE_HIGH: If Gemfile AND spec directory found
  CONFIDENCE_MEDIUM: If only Gemfile with rspec
</detection_criteria>

<gemfile_detection>
  IF Gemfile exists:
    READ: Gemfile file
    SEARCH: For patterns:
      - gem 'rspec'
      - gem 'rspec-rails'
      - group :test do ... rspec ... end

    EXTRACT: Version from gem declaration
    CONFIDENCE: MEDIUM if rspec gem found
</gemfile_detection>

<gemfile_lock_detection>
  IF Gemfile.lock exists:
    READ: Gemfile.lock file
    SEARCH: For rspec entry in SPECS section
    EXTRACT: Exact installed version
    EXAMPLE:
      rspec-rails (6.1.0)
        rspec-core (~> 3.12)
</gemfile_lock_detection>

<rspec_file_detection>
  IF .rspec exists:
    READ: .rspec file
    VERIFY: RSpec configuration
    LOOK_FOR:
      - --require spec_helper
      - --format documentation
      - --color

    CONFIDENCE_BOOST: Confirms RSpec setup
</rspec_file_detection>

<spec_directory_detection>
  CHECK: For spec directory structure
    LOOK_FOR: spec/ directory
    LOOK_FOR: spec/spec_helper.rb
    LOOK_FOR: spec/rails_helper.rb (if Rails)

    IF spec directory found:
      CONFIDENCE_BOOST: Increases to HIGH
</spec_directory_detection>

<test_file_detection>
  SEARCH: For RSpec test files
    PATTERN: [
      "spec/**/*_spec.rb"
    ]
    LOOK_FOR:
      - describe '...' do
      - context '...' do
      - it '...' do
      - expect(...).to ...

    IF test files found:
      test_files_count: N
      CONFIDENCE_BOOST: Confirms RSpec usage
</test_file_detection>

<result_structure>
  IF RSpec detected:
    RETURN:
      framework: "rspec"
      version: "[detected version]"
      test_type: "unit" | "integration"
      rails_integration: true | false
      confidence: "high" | "medium"
      indicators:
        - Gemfile found: yes
        - rspec gem found: yes
        - .rspec found: yes/no
        - spec directory found: yes/no
        - test files found: yes/no
        - test_files_count: N
        - rails_helper present: yes/no
</result_structure>

</step>

<step number="8" name="consolidate_results">

### Step 8: Consolidate Results

Aggregate all detection results and determine primary testing framework.

<aggregation>
  COLLECT: All detection results from steps 2-7
  FILTER: Results with confidence >= MEDIUM
  SORT: By confidence (HIGH first, then MEDIUM)
</aggregation>

<multi_framework_handling>
  IF multiple testing frameworks detected:
    CATEGORIZE: By test type
      - E2E: Playwright, Cypress
      - Unit/Integration: Jest, Vitest, Pytest, RSpec

    COMMON_COMBINATIONS:
      - Jest (unit) + Playwright (e2e)
      - Vitest (unit) + Playwright (e2e)
      - Pytest (unit) + Playwright (e2e)
      - RSpec (unit) + Cypress (e2e)

    RETURN: All detected frameworks categorized by type
    NOTE: Multiple testing frameworks is normal and expected
</multi_framework_handling>

<no_framework_handling>
  IF no testing frameworks detected:
    RETURN:
      frameworks: []
      message: "No supported testing framework detected"
      suggestion: "Consider using --framework flag to specify manually"
</no_framework_handling>

<result_structure>
  RETURN:
    testing_frameworks:
      e2e: [
        {name: "playwright", version: "...", confidence: "high", ...}
      ]
      unit: [
        {name: "jest", version: "...", confidence: "high", ...}
      ]
      integration: [...]

    primary_unit_framework: {name: "...", version: "...", ...}
    primary_e2e_framework: {name: "...", version: "...", ...}

    detection_summary:
      total_frameworks_found: N
      has_unit_tests: true | false
      has_integration_tests: true | false
      has_e2e_tests: true | false
      detection_method: "file-based" | "code-scan" | "hybrid"
</result_structure>

</step>

</detection_flow>

## Confidence Scoring

<confidence_levels>
  HIGH (90-100%):
    - Dependency/gem file found
    - Configuration file found
    - Test files found in codebase
    - Framework-specific patterns detected

  MEDIUM (60-89%):
    - Dependency/gem file found
    - Framework listed in dependencies
    - No test files verified

  LOW (0-59%):
    - Only indirect indicators
    - Configuration exists but no tests
    - Unclear signals
</confidence_levels>

## Error Handling

<error_protocols>
  <file_not_readable>
    LOG: File path and read error
    SKIP: That detection method
    CONTINUE: With other detection methods
  </file_not_readable>

  <invalid_config>
    LOG: Config file parse error
    FALLBACK: Dependency-based detection only
  </invalid_config>

  <no_frameworks_found>
    RETURN: Empty result with suggestion
    SUGGEST: Manual framework specification
    OFFER: List of supported frameworks
  </no_frameworks_found>
</error_protocols>

## Usage Example

<example>
  INPUT: Project with Jest (unit) and Playwright (e2e)

  PROCESS:
    1. Scan for indicator files → Found: package.json, jest.config.js, playwright.config.ts
    2. Run Jest detection → Found "jest": "^29.0.0", config file, 45 test files
    3. Run Playwright detection → Found "@playwright/test": "^1.40.0", config file, 12 test files
    4. Consolidate results → Both frameworks detected

  OUTPUT:
    {
      testing_frameworks: {
        unit: [{
          name: "jest",
          version: "29.0.0",
          typescript: true,
          test_files_count: 45,
          confidence: "high"
        }],
        e2e: [{
          name: "playwright",
          version: "1.40.0",
          test_files_count: 12,
          confidence: "high"
        }]
      },
      primary_unit_framework: { name: "jest", ... },
      primary_e2e_framework: { name: "playwright", ... },
      detection_summary: {
        total_frameworks_found: 2,
        has_unit_tests: true,
        has_e2e_tests: true,
        detection_method: "hybrid"
      }
    }
</example>

## Performance Considerations

- Cache dependency file reads (package.json, requirements.txt, Gemfile)
- Limit test file counting to first 100 files for large projects
- Use efficient Glob patterns to avoid full codebase scans
- Stop unit framework detection after first HIGH confidence match

## Related Utilities

- `@specwright/workflows/skill/utils/detect-backend.md`
- `@specwright/workflows/skill/utils/detect-frontend.md`
- `@specwright/workflows/skill/utils/detect-cicd.md`
