---
description: Detect backend framework, version, and configuration in the project
version: 1.0
encoding: UTF-8
---

# Backend Framework Detection

## Overview

Auto-detect backend frameworks used in the project, including framework name, version, and key configuration details.

## Supported Frameworks

- Spring Boot (Java)
- Express (Node.js)
- FastAPI (Python)
- Django (Python)
- Ruby on Rails (Ruby)

## Detection Process

<detection_flow>

<step number="1" name="initial_scan">

### Step 1: Initial File System Scan

Scan project root for framework indicator files.

<file_indicators>
  SEARCH: Project root and common directories
  LOOK_FOR:
    - pom.xml (Maven - Spring Boot)
    - build.gradle / build.gradle.kts (Gradle - Spring Boot)
    - package.json (Node.js - Express)
    - requirements.txt / pyproject.toml (Python - FastAPI/Django)
    - Gemfile / Gemfile.lock (Ruby - Rails)
    - manage.py (Django)
</file_indicators>

<instructions>
  ACTION: Use Glob tool to find indicator files
  PATTERN: Look for common build/dependency files
  RECORD: Found files for framework determination
</instructions>

</step>

<step number="2" name="spring_boot_detection">

### Step 2: Spring Boot Detection

Detect Spring Boot framework and version.

<detection_criteria>
  REQUIRED: One of the following
    - pom.xml with spring-boot-starter-* dependencies
    - build.gradle with 'org.springframework.boot' plugin
    - build.gradle.kts with Spring Boot dependencies

  CONFIDENCE_HIGH: If both build file AND @SpringBootApplication annotation found
  CONFIDENCE_MEDIUM: If only build file with Spring Boot dependencies
</detection_criteria>

<pom_xml_detection>
  IF pom.xml exists:
    READ: pom.xml file
    SEARCH: For patterns:
      - <groupId>org.springframework.boot</groupId>
      - <artifactId>spring-boot-starter-*</artifactId>
      - <parent> with spring-boot-starter-parent

    EXTRACT: Version from:
      - <parent><version>X.Y.Z</version></parent>
      - <spring-boot.version>X.Y.Z</spring-boot.version>
      - Direct dependency version

    CONFIDENCE: HIGH if parent is spring-boot-starter-parent
</pom_xml_detection>

<gradle_detection>
  IF build.gradle OR build.gradle.kts exists:
    READ: Build file
    SEARCH: For patterns:
      - id 'org.springframework.boot' version 'X.Y.Z'
      - implementation 'org.springframework.boot:spring-boot-starter-*'
      - spring-boot-gradle-plugin

    EXTRACT: Version from:
      - Plugin version declaration
      - Dependency version
      - ext.springBootVersion variable

    CONFIDENCE: HIGH if plugin is declared
</gradle_detection>

<annotation_detection>
  OPTIONAL: Verify with source code scan
    SEARCH: For @SpringBootApplication annotation
    PATTERN: "**/*Application.java"
    LOOK_FOR: "@SpringBootApplication" in file
    CONFIDENCE_BOOST: Increases confidence to HIGH
</annotation_detection>

<result_structure>
  IF Spring Boot detected:
    RETURN:
      framework: "spring-boot"
      version: "[detected version]"
      build_tool: "maven" | "gradle"
      confidence: "high" | "medium"
      indicators:
        - pom.xml found: yes/no
        - build.gradle found: yes/no
        - @SpringBootApplication found: yes/no
</result_structure>

</step>

<step number="3" name="express_detection">

### Step 3: Express Detection

Detect Express.js framework and version.

<detection_criteria>
  REQUIRED: package.json with express dependency

  CONFIDENCE_HIGH: If both package.json AND Express app initialization found
  CONFIDENCE_MEDIUM: If only package.json with express
</detection_criteria>

<package_json_detection>
  IF package.json exists:
    READ: package.json file
    PARSE: JSON content
    SEARCH: In dependencies and devDependencies:
      - "express": "version"

    EXTRACT: Version from dependency declaration
      - Exact: "4.18.2"
      - Range: "^4.18.0"
      - Latest: "*" or "latest"

    CONFIDENCE: MEDIUM if express found in dependencies
</package_json_detection>

<app_initialization_detection>
  OPTIONAL: Verify with source code scan
    SEARCH: For Express app initialization
    PATTERN: ["**/app.js", "**/server.js", "**/index.js", "src/**/*.js"]
    LOOK_FOR:
      - const express = require('express')
      - import express from 'express'
      - const app = express()
      - app.listen(

    CONFIDENCE_BOOST: Increases confidence to HIGH
</app_initialization_detection>

<typescript_detection>
  CHECK: If TypeScript is used
    LOOK_FOR: "typescript" in package.json devDependencies
    LOOK_FOR: tsconfig.json file
    PATTERN: ["**/app.ts", "**/server.ts", "src/**/*.ts"]

    IF TypeScript detected:
      typescript: true
</typescript_detection>

<result_structure>
  IF Express detected:
    RETURN:
      framework: "express"
      version: "[detected version]"
      typescript: true | false
      confidence: "high" | "medium"
      indicators:
        - package.json found: yes
        - express dependency found: yes
        - app initialization found: yes/no
        - typescript: yes/no
</result_structure>

</step>

<step number="4" name="fastapi_detection">

### Step 4: FastAPI Detection

Detect FastAPI framework and version.

<detection_criteria>
  REQUIRED: One of the following
    - requirements.txt with fastapi
    - pyproject.toml with fastapi dependency

  CONFIDENCE_HIGH: If dependency file AND FastAPI app initialization found
  CONFIDENCE_MEDIUM: If only dependency file
</detection_criteria>

<requirements_txt_detection>
  IF requirements.txt exists:
    READ: requirements.txt file
    SEARCH: For patterns:
      - fastapi==X.Y.Z
      - fastapi>=X.Y.Z
      - fastapi

    EXTRACT: Version from:
      - Pinned version: fastapi==0.104.1
      - Minimum version: fastapi>=0.100.0
      - No version: fastapi (use "latest")

    CONFIDENCE: MEDIUM if fastapi found
</requirements_txt_detection>

<pyproject_toml_detection>
  IF pyproject.toml exists:
    READ: pyproject.toml file
    PARSE: TOML content
    SEARCH: In [tool.poetry.dependencies] or [project.dependencies]:
      - fastapi = "version"

    EXTRACT: Version from dependency declaration
    CONFIDENCE: MEDIUM if fastapi found
</pyproject_toml_detection>

<app_initialization_detection>
  OPTIONAL: Verify with source code scan
    SEARCH: For FastAPI app initialization
    PATTERN: ["**/main.py", "**/app.py", "src/**/*.py", "app/**/*.py"]
    LOOK_FOR:
      - from fastapi import FastAPI
      - app = FastAPI()
      - @app.get(
      - @app.post(

    CONFIDENCE_BOOST: Increases confidence to HIGH
</app_initialization_detection>

<uvicorn_detection>
  CHECK: If Uvicorn server is used
    LOOK_FOR: "uvicorn" in requirements.txt or pyproject.toml
    INDICATES: Production FastAPI setup
</uvicorn_detection>

<result_structure>
  IF FastAPI detected:
    RETURN:
      framework: "fastapi"
      version: "[detected version]"
      server: "uvicorn" | "unknown"
      confidence: "high" | "medium"
      indicators:
        - requirements.txt found: yes/no
        - pyproject.toml found: yes/no
        - fastapi dependency found: yes
        - app initialization found: yes/no
        - uvicorn found: yes/no
</result_structure>

</step>

<step number="5" name="django_detection">

### Step 5: Django Detection

Detect Django framework and version.

<detection_criteria>
  REQUIRED: One of the following
    - requirements.txt with Django
    - pyproject.toml with Django dependency
    - manage.py file (strong indicator)

  CONFIDENCE_HIGH: If manage.py found
  CONFIDENCE_MEDIUM: If only dependency file
</detection_criteria>

<manage_py_detection>
  IF manage.py exists:
    READ: manage.py file
    VERIFY: Contains Django management script
    LOOK_FOR:
      - from django.core.management import execute_from_command_line
      - os.environ.setdefault('DJANGO_SETTINGS_MODULE'

    CONFIDENCE: HIGH if manage.py is valid Django script
</manage_py_detection>

<requirements_detection>
  IF requirements.txt OR pyproject.toml exists:
    SEARCH: For Django dependency
    PATTERNS:
      - Django==X.Y.Z
      - Django>=X.Y.Z
      - django = "version"

    EXTRACT: Version from dependency declaration
</requirements_detection>

<settings_detection>
  OPTIONAL: Verify Django configuration
    SEARCH: For settings.py file
    PATTERN: ["**/settings.py", "config/settings.py", "*/settings/*.py"]
    LOOK_FOR:
      - INSTALLED_APPS = [
      - DATABASES = {
      - MIDDLEWARE = [

    CONFIDENCE_BOOST: Confirms Django project structure
</settings_detection>

<result_structure>
  IF Django detected:
    RETURN:
      framework: "django"
      version: "[detected version]"
      confidence: "high" | "medium"
      indicators:
        - manage.py found: yes/no
        - settings.py found: yes/no
        - Django dependency found: yes
        - valid settings structure: yes/no
</result_structure>

</step>

<step number="6" name="rails_detection">

### Step 6: Ruby on Rails Detection

Detect Rails framework and version.

<detection_criteria>
  REQUIRED: Gemfile with rails gem

  CONFIDENCE_HIGH: If Gemfile AND config/application.rb found
  CONFIDENCE_MEDIUM: If only Gemfile with rails
</detection_criteria>

<gemfile_detection>
  IF Gemfile exists:
    READ: Gemfile file
    SEARCH: For patterns:
      - gem 'rails', '~> X.Y.Z'
      - gem "rails", "X.Y.Z"
      - gem 'rails'

    EXTRACT: Version from:
      - Pessimistic version: '~> 7.0.0'
      - Exact version: '7.0.8'
      - No version: 'rails' (check Gemfile.lock)

    CONFIDENCE: MEDIUM if rails gem found
</gemfile_detection>

<gemfile_lock_detection>
  IF Gemfile.lock exists AND version not found in Gemfile:
    READ: Gemfile.lock file
    SEARCH: For rails entry in SPECS section
    EXTRACT: Exact installed version
    EXAMPLE:
      rails (7.0.8)
        actioncable (= 7.0.8)
        ...
</gemfile_lock_detection>

<config_detection>
  OPTIONAL: Verify Rails configuration
    SEARCH: For config/application.rb
    LOOK_FOR:
      - class Application < Rails::Application
      - Rails.application.configure

    CONFIDENCE_BOOST: Increases confidence to HIGH
</config_detection>

<result_structure>
  IF Rails detected:
    RETURN:
      framework: "rails"
      version: "[detected version]"
      confidence: "high" | "medium"
      indicators:
        - Gemfile found: yes
        - rails gem found: yes
        - Gemfile.lock found: yes/no
        - config/application.rb found: yes/no
</result_structure>

</step>

<step number="7" name="consolidate_results">

### Step 7: Consolidate Results

Aggregate all detection results and determine primary backend framework.

<aggregation>
  COLLECT: All detection results from steps 2-6
  FILTER: Results with confidence >= MEDIUM
  SORT: By confidence (HIGH first, then MEDIUM)
</aggregation>

<multi_framework_handling>
  IF multiple frameworks detected:
    PRIORITIZE: By confidence score
    PRIMARY: Framework with highest confidence
    SECONDARY: List other detected frameworks
    WARN: Multi-framework project detected
</multi_framework_handling>

<no_framework_handling>
  IF no frameworks detected:
    RETURN:
      framework: "none"
      message: "No supported backend framework detected"
      suggestion: "Consider using --framework flag to specify manually"
</no_framework_handling>

<result_structure>
  RETURN:
    primary_framework:
      name: "[framework name]"
      version: "[version]"
      confidence: "high" | "medium"
      indicators: [list of found indicators]
      additional_info: {...}

    secondary_frameworks: [
      {name: "...", version: "...", confidence: "..."}
    ]

    detection_summary:
      total_frameworks_found: N
      primary_confidence: "high" | "medium"
      detection_method: "file-based" | "code-scan" | "hybrid"
</result_structure>

</step>

</detection_flow>

## Confidence Scoring

<confidence_levels>
  HIGH (90-100%):
    - Build/dependency file found
    - Framework-specific files found (manage.py, @SpringBootApplication, etc.)
    - Application initialization code found

  MEDIUM (60-89%):
    - Build/dependency file found
    - Framework dependency listed
    - No source code verification

  LOW (0-59%):
    - Only indirect indicators
    - Outdated or unclear dependencies
    - Conflicting signals
</confidence_levels>

## Error Handling

<error_protocols>
  <file_not_readable>
    LOG: File path and read error
    SKIP: That detection method
    CONTINUE: With other detection methods
  </file_not_readable>

  <invalid_file_format>
    LOG: File path and parse error
    TRY: Alternative parsing method
    FALLBACK: File-based detection only
  </invalid_file_format>

  <no_frameworks_found>
    RETURN: Empty result with suggestion
    SUGGEST: Manual framework specification
    OFFER: List of supported frameworks
  </no_frameworks_found>
</error_protocols>

## Usage Example

<example>
  INPUT: Project directory with pom.xml

  PROCESS:
    1. Scan for indicator files → Found: pom.xml
    2. Run Spring Boot detection → Found spring-boot-starter-parent
    3. Extract version → 3.2.0
    4. Search for @SpringBootApplication → Found in src/main/java/App.java
    5. Calculate confidence → HIGH

  OUTPUT:
    {
      primary_framework: {
        name: "spring-boot",
        version: "3.2.0",
        build_tool: "maven",
        confidence: "high",
        indicators: [
          "pom.xml found",
          "spring-boot-starter-parent found",
          "@SpringBootApplication annotation found"
        ]
      },
      secondary_frameworks: [],
      detection_summary: {
        total_frameworks_found: 1,
        primary_confidence: "high",
        detection_method: "hybrid"
      }
    }
</example>

## Performance Considerations

- Cache file reads for common files (package.json, pom.xml, etc.)
- Use Glob patterns efficiently to avoid scanning entire codebase
- Limit code scanning to first 1000 lines of files
- Stop detection early if HIGH confidence already achieved

## Related Utilities

- `@specwright/workflows/skill/utils/detect-frontend.md`
- `@specwright/workflows/skill/utils/detect-testing.md`
- `@specwright/workflows/skill/utils/detect-cicd.md`
