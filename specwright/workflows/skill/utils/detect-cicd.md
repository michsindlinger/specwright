---
description: Detect CI/CD platform, configuration, and deployment patterns in the project
version: 1.0
encoding: UTF-8
---

# CI/CD Platform Detection

## Overview

Auto-detect CI/CD platforms and containerization used in the project, including platform name, workflow configurations, and deployment patterns.

## Supported Platforms

- GitHub Actions
- GitLab CI/CD
- Jenkins
- Docker (containerization)
- CircleCI
- Travis CI

## Detection Process

<detection_flow>

<step number="1" name="initial_scan">

### Step 1: Initial File System Scan

Scan project for CI/CD platform indicator files.

<file_indicators>
  SEARCH: Project root and CI/CD directories
  LOOK_FOR:
    - .github/workflows/*.yml (GitHub Actions)
    - .gitlab-ci.yml (GitLab CI)
    - Jenkinsfile (Jenkins)
    - Dockerfile, docker-compose.yml (Docker)
    - .circleci/config.yml (CircleCI)
    - .travis.yml (Travis CI)
</file_indicators>

<instructions>
  ACTION: Use Glob tool to find indicator files
  PATTERN: Look for CI/CD configuration files
  RECORD: Found files for platform determination
</instructions>

</step>

<step number="2" name="github_actions_detection">

### Step 2: GitHub Actions Detection

Detect GitHub Actions workflows and configuration.

<detection_criteria>
  REQUIRED: .github/workflows/ directory with .yml or .yaml files

  CONFIDENCE_HIGH: If workflows directory exists with valid workflow files
  CONFIDENCE_MEDIUM: If directory exists but no workflows yet
</detection_criteria>

<workflows_directory_detection>
  IF .github/workflows/ directory exists:
    LIST: All .yml and .yaml files in directory
    COUNT: Number of workflow files

    FOR each workflow file:
      READ: Workflow file
      PARSE: YAML content
      EXTRACT: Workflow details

    CONFIDENCE: HIGH if valid workflow files found
</workflows_directory_detection>

<workflow_analysis>
  FOR each workflow file:
    EXTRACT:
      - name: Workflow name
      - on: Trigger events (push, pull_request, schedule, etc.)
      - jobs: Job definitions
      - runs-on: Runner OS (ubuntu-latest, windows-latest, etc.)
      - steps: Workflow steps

    CATEGORIZE workflows by purpose:
      - CI: Tests, linting, builds
      - CD: Deployment, release
      - Other: Automation, scheduled tasks
</workflow_analysis>

<common_patterns_detection>
  DETECT: Common GitHub Actions patterns
    BUILD_AND_TEST:
      LOOK_FOR:
        - npm install or npm ci
        - npm run build
        - npm test or npm run test
        - actions/checkout@v*
        - actions/setup-node@v*

    DEPLOYMENT:
      LOOK_FOR:
        - actions/deploy-* actions
        - docker/build-push-action
        - aws-actions/* actions
        - Azure deployment actions

    VERSIONING:
      LOOK_FOR:
        - actions/create-release
        - semantic-release
        - conventional changelog

    CACHING:
      LOOK_FOR:
        - actions/cache@v*
        - Cache npm dependencies
        - Cache build artifacts
</common_patterns_detection>

<secrets_and_env_detection>
  CHECK: For secrets and environment variables
    LOOK_FOR:
      - ${{ secrets.* }}
      - ${{ env.* }}
      - environment: production/staging/development

    RECORD: Required secrets (without values)
    DETECT: Environment configurations
</secrets_and_env_detection>

<result_structure>
  IF GitHub Actions detected:
    RETURN:
      platform: "github-actions"
      workflows_count: N
      confidence: "high" | "medium"
      workflows: [
        {
          name: "CI",
          file: "ci.yml",
          triggers: ["push", "pull_request"],
          jobs_count: N,
          has_tests: true,
          has_build: true,
          has_deployment: false
        },
        ...
      ]
      patterns:
        caching_enabled: true | false
        matrix_builds: true | false
        deployment_environments: ["production", "staging"]
        runners: ["ubuntu-latest", ...]
      indicators:
        - .github/workflows directory found: yes
        - workflow files found: N
        - valid YAML: yes
</result_structure>

</step>

<step number="3" name="gitlab_ci_detection">

### Step 3: GitLab CI Detection

Detect GitLab CI/CD pipeline configuration.

<detection_criteria>
  REQUIRED: .gitlab-ci.yml file in project root

  CONFIDENCE_HIGH: If valid .gitlab-ci.yml exists
  CONFIDENCE_MEDIUM: If file exists but invalid/empty
</detection_criteria>

<gitlab_ci_file_detection>
  IF .gitlab-ci.yml exists:
    READ: .gitlab-ci.yml file
    PARSE: YAML content
    VERIFY: Valid GitLab CI configuration

    LOOK_FOR:
      - stages: [build, test, deploy, ...]
      - image: Docker image
      - before_script: Global setup
      - jobs: Pipeline jobs

    CONFIDENCE: HIGH if valid configuration found
</gitlab_ci_file_detection>

<pipeline_analysis>
  EXTRACT: Pipeline configuration
    - stages: Ordered list of stages
    - image: Default Docker image
    - variables: CI/CD variables
    - cache: Cache configuration
    - artifacts: Build artifacts

  FOR each job:
    EXTRACT:
      - stage: Which stage the job belongs to
      - script: Commands to run
      - only/except: Branch/tag rules
      - when: Execution condition
      - needs: Job dependencies
</pipeline_analysis>

<stages_detection>
  CATEGORIZE: Jobs by stage
    BUILD: Compilation, bundling
    TEST: Unit tests, integration tests, linting
    DEPLOY: Deployment to environments
    CUSTOM: Other stages

  DETECT: Stage dependencies and flow
</stages_detection>

<docker_integration>
  CHECK: For Docker-in-Docker usage
    LOOK_FOR:
      - image: docker:*
      - services: - docker:dind
      - docker build commands in scripts

    IF Docker integration found:
      uses_docker: true
</docker_integration>

<result_structure>
  IF GitLab CI detected:
    RETURN:
      platform: "gitlab-ci"
      confidence: "high" | "medium"
      stages: ["build", "test", "deploy"]
      jobs_count: N
      uses_docker: true | false
      configuration:
        default_image: "node:18"
        cache_enabled: true | false
        artifacts_enabled: true | false
      jobs: [
        {
          name: "test",
          stage: "test",
          script: [...],
          needs: [...]
        },
        ...
      ]
      indicators:
        - .gitlab-ci.yml found: yes
        - valid YAML: yes
        - stages defined: yes
        - jobs count: N
</result_structure>

</step>

<step number="4" name="jenkins_detection">

### Step 4: Jenkins Detection

Detect Jenkins pipeline configuration.

<detection_criteria>
  REQUIRED: Jenkinsfile in project root

  CONFIDENCE_HIGH: If valid Jenkinsfile with pipeline definition
  CONFIDENCE_MEDIUM: If file exists but unclear structure
</detection_criteria>

<jenkinsfile_detection>
  IF Jenkinsfile exists:
    READ: Jenkinsfile
    DETECT: Pipeline type
      - Declarative: pipeline { ... }
      - Scripted: node { ... }

    VERIFY: Valid Jenkins pipeline syntax

    CONFIDENCE: HIGH if valid pipeline found
</jenkinsfile_detection>

<pipeline_analysis>
  IF declarative pipeline:
    EXTRACT:
      - agent: Where pipeline runs
      - stages: Pipeline stages
      - environment: Environment variables
      - tools: Build tools (maven, node, etc.)
      - post: Post-build actions

    FOR each stage:
      EXTRACT:
        - name: Stage name
        - steps: Commands to execute
        - when: Conditional execution

  IF scripted pipeline:
    EXTRACT:
      - node: Agent label
      - stage: Stage blocks
      - steps: Pipeline steps
</pipeline_analysis>

<shared_library_detection>
  CHECK: For Jenkins shared libraries
    LOOK_FOR:
      - @Library('...') import
      - Custom pipeline steps

    IF shared libraries found:
      uses_shared_libraries: true
      libraries: [...]
</shared_library_detection>

<result_structure>
  IF Jenkins detected:
    RETURN:
      platform: "jenkins"
      pipeline_type: "declarative" | "scripted"
      confidence: "high" | "medium"
      configuration:
        agent: "any" | "docker" | "label"
        tools: ["maven", "jdk", ...]
        stages: ["Build", "Test", "Deploy"]
      uses_shared_libraries: true | false
      indicators:
        - Jenkinsfile found: yes
        - valid syntax: yes
        - pipeline type: "[type]"
</result_structure>

</step>

<step number="5" name="docker_detection">

### Step 5: Docker Detection

Detect Docker containerization setup.

<detection_criteria>
  REQUIRED: One of the following
    - Dockerfile
    - docker-compose.yml
    - .dockerignore

  CONFIDENCE_HIGH: If Dockerfile with valid instructions
  CONFIDENCE_MEDIUM: If docker-compose.yml only
</detection_criteria>

<dockerfile_detection>
  IF Dockerfile exists:
    READ: Dockerfile
    PARSE: Docker instructions

    EXTRACT:
      - FROM: Base image
      - RUN: Build commands
      - COPY/ADD: File operations
      - EXPOSE: Exposed ports
      - CMD/ENTRYPOINT: Container command

    DETECT: Multi-stage builds
      LOOK_FOR: Multiple FROM statements with AS aliases

    CONFIDENCE: HIGH if valid Dockerfile found
</dockerfile_detection>

<compose_detection>
  IF docker-compose.yml OR docker-compose.yaml exists:
    READ: Compose file
    PARSE: YAML content

    EXTRACT:
      - version: Compose file version
      - services: Service definitions
      - networks: Network configuration
      - volumes: Volume mounts

    FOR each service:
      EXTRACT:
        - image OR build: Service image
        - ports: Port mappings
        - environment: Environment variables
        - depends_on: Service dependencies
        - volumes: Volume mounts

    DETECT: Service architecture
      - Number of services
      - Service types (app, database, cache, etc.)
</compose_detection>

<multi_stage_analysis>
  IF multi-stage build detected:
    IDENTIFY: Build stages
      - build: Compilation stage
      - production: Final runtime stage
      - test: Testing stage (if present)

    EXTRACT: Stage-specific instructions
    OPTIMIZATION: Check for layer optimization patterns
</multi_stage_analysis>

<base_image_analysis>
  ANALYZE: Base image choices
    OFFICIAL_IMAGES:
      - node:*, python:*, openjdk:*, ruby:*, etc.

    DISTRO:
      - alpine (small, minimal)
      - slim/slim-bullseye (Debian minimal)
      - ubuntu, debian (full)

    DETECT: Image optimization level
</base_image_analysis>

<result_structure>
  IF Docker detected:
    RETURN:
      platform: "docker"
      has_dockerfile: true | false
      has_compose: true | false
      confidence: "high" | "medium"
      dockerfile_analysis:
        base_image: "node:18-alpine"
        multi_stage: true | false
        stages: ["build", "production"]
        exposed_ports: [3000, ...]
      compose_analysis:
        services_count: N
        services: [
          {
            name: "app",
            image: "...",
            ports: ["3000:3000"],
            depends_on: ["database"]
          },
          ...
        ]
        has_database: true | false
        has_cache: true | false
      indicators:
        - Dockerfile found: yes/no
        - docker-compose.yml found: yes/no
        - multi-stage build: yes/no
        - services count: N
</result_structure>

</step>

<step number="6" name="circleci_detection">

### Step 6: CircleCI Detection

Detect CircleCI configuration.

<detection_criteria>
  REQUIRED: .circleci/config.yml file

  CONFIDENCE_HIGH: If valid config.yml exists
  CONFIDENCE_MEDIUM: If directory exists but empty/invalid
</detection_criteria>

<config_file_detection>
  IF .circleci/config.yml exists:
    READ: config.yml file
    PARSE: YAML content

    VERIFY: CircleCI configuration
    LOOK_FOR:
      - version: 2.1 or 2
      - jobs: Job definitions
      - workflows: Workflow definitions
      - orbs: Reusable config packages

    CONFIDENCE: HIGH if valid configuration found
</config_file_detection>

<result_structure>
  IF CircleCI detected:
    RETURN:
      platform: "circleci"
      version: "2.1" | "2"
      confidence: "high" | "medium"
      uses_orbs: true | false
      jobs_count: N
      workflows_count: N
      indicators:
        - .circleci/config.yml found: yes
        - valid configuration: yes
</result_structure>

</step>

<step number="7" name="travis_ci_detection">

### Step 7: Travis CI Detection

Detect Travis CI configuration.

<detection_criteria>
  REQUIRED: .travis.yml file

  CONFIDENCE_HIGH: If valid .travis.yml exists
  CONFIDENCE_MEDIUM: If file exists but minimal config
</detection_criteria>

<config_file_detection>
  IF .travis.yml exists:
    READ: .travis.yml file
    PARSE: YAML content

    VERIFY: Travis CI configuration
    LOOK_FOR:
      - language: Programming language
      - script: Test commands
      - deploy: Deployment configuration

    CONFIDENCE: HIGH if valid configuration found
</config_file_detection>

<result_structure>
  IF Travis CI detected:
    RETURN:
      platform: "travis-ci"
      language: "node_js" | "python" | "ruby" | ...
      confidence: "high" | "medium"
      has_deployment: true | false
      indicators:
        - .travis.yml found: yes
        - valid configuration: yes
</result_structure>

</step>

<step number="8" name="consolidate_results">

### Step 8: Consolidate Results

Aggregate all detection results and determine primary CI/CD platform.

<aggregation>
  COLLECT: All detection results from steps 2-7
  FILTER: Results with confidence >= MEDIUM
  SORT: By confidence (HIGH first, then MEDIUM)
</aggregation>

<multi_platform_handling>
  IF multiple CI/CD platforms detected:
    CATEGORIZE:
      - CI/CD: GitHub Actions, GitLab CI, Jenkins, CircleCI, Travis CI
      - Containerization: Docker

    COMMON_COMBINATIONS:
      - GitHub Actions + Docker
      - GitLab CI + Docker
      - Jenkins + Docker

    PRIMARY: CI/CD platform with highest confidence
    CONTAINERIZATION: Docker if detected
    NOTE: Docker + CI/CD platform combination is normal
</multi_platform_handling>

<no_platform_handling>
  IF no CI/CD platforms detected:
    RETURN:
      platforms: []
      message: "No CI/CD platform detected"
      suggestion: "Consider using --framework flag to specify manually"
      recommendation: "GitHub Actions recommended for new projects"
</no_platform_handling>

<result_structure>
  RETURN:
    cicd_platforms:
      primary: {
        name: "github-actions",
        confidence: "high",
        workflows_count: N,
        ...
      }
      containerization: {
        name: "docker",
        confidence: "high",
        has_compose: true,
        ...
      } | null

    all_detected_platforms: [
      {name: "github-actions", ...},
      {name: "docker", ...}
    ]

    detection_summary:
      total_platforms_found: N
      has_ci: true | false
      has_cd: true | false
      has_containerization: true | false
      primary_platform: "github-actions"
      detection_method: "file-based" | "config-scan"
</result_structure>

</step>

</detection_flow>

## Confidence Scoring

<confidence_levels>
  HIGH (90-100%):
    - Configuration file found
    - Valid YAML/Groovy syntax
    - Complete workflow/pipeline definitions
    - Active usage indicators

  MEDIUM (60-89%):
    - Configuration file found
    - Basic structure present
    - Minimal or template configuration

  LOW (0-59%):
    - Only directory exists
    - Empty or invalid configuration
    - Unclear signals
</confidence_levels>

## Error Handling

<error_protocols>
  <file_not_readable>
    LOG: File path and read error
    SKIP: That detection method
    CONTINUE: With other detection methods
  </file_not_readable>

  <invalid_yaml>
    LOG: File path and parse error
    TRY: Basic file presence detection
    MARK: As MEDIUM confidence with warning
  </invalid_yaml>

  <no_platforms_found>
    RETURN: Empty result with suggestion
    SUGGEST: Manual platform specification
    OFFER: List of supported platforms
    RECOMMEND: GitHub Actions for new projects
  </no_platforms_found>
</error_protocols>

## Usage Example

<example>
  INPUT: Project with GitHub Actions + Docker

  PROCESS:
    1. Scan for indicator files → Found: .github/workflows/, Dockerfile, docker-compose.yml
    2. Run GitHub Actions detection → Found 3 workflow files (ci.yml, cd.yml, release.yml)
    3. Run Docker detection → Found Dockerfile with multi-stage build, docker-compose with 3 services
    4. Consolidate results → Both platforms detected

  OUTPUT:
    {
      cicd_platforms: {
        primary: {
          name: "github-actions",
          workflows_count: 3,
          confidence: "high",
          workflows: [
            {name: "CI", triggers: ["push", "pull_request"], has_tests: true},
            {name: "CD", triggers: ["push"], has_deployment: true},
            {name: "Release", triggers: ["release"], has_deployment: true}
          ],
          patterns: {
            caching_enabled: true,
            deployment_environments: ["production", "staging"]
          }
        },
        containerization: {
          name: "docker",
          confidence: "high",
          has_dockerfile: true,
          has_compose: true,
          dockerfile_analysis: {
            base_image: "node:18-alpine",
            multi_stage: true,
            stages: ["build", "production"]
          },
          compose_analysis: {
            services_count: 3,
            services: ["app", "database", "redis"]
          }
        }
      },
      detection_summary: {
        total_platforms_found: 2,
        has_ci: true,
        has_cd: true,
        has_containerization: true,
        primary_platform: "github-actions"
      }
    }
</example>

## Performance Considerations

- Cache YAML file reads across detection steps
- Use Glob patterns efficiently to find config files
- Limit workflow/pipeline analysis depth for very large configs
- Stop CI/CD detection after first HIGH confidence match (unless checking for Docker)

## Related Utilities

- `@specwright/workflows/skill/utils/detect-backend.md`
- `@specwright/workflows/skill/utils/detect-frontend.md`
- `@specwright/workflows/skill/utils/detect-testing.md`
