---
description: Discover deployment and CI/CD patterns using Explore agent
version: 1.0
encoding: UTF-8
---

# Deployment Pattern Discovery

## Overview

Use the Explore agent to discover deployment patterns including CI/CD workflows, build processes, Docker configurations, environment management, and deployment strategies.

## Discovery Process

<discovery_flow>

<step number="1" name="platform_based_search">

### Step 1: Platform-Based Search Strategy

<platform_strategies>
  GITHUB_ACTIONS:
    PATTERNS: [".github/workflows/*.yml", ".github/workflows/*.yaml"]
    FOCUS: Workflow triggers, jobs, steps, deployment strategies

  GITLAB_CI:
    PATTERNS: [".gitlab-ci.yml"]
    FOCUS: Stages, jobs, artifacts, deployment environments

  JENKINS:
    PATTERNS: ["Jenkinsfile", "Jenkinsfile.*"]
    FOCUS: Pipeline stages, agents, deployment steps

  DOCKER:
    PATTERNS: ["Dockerfile", "docker-compose.yml", ".dockerignore"]
    FOCUS: Multi-stage builds, optimizations, service orchestration

  KUBERNETES:
    PATTERNS: ["k8s/**/*.yaml", "kubernetes/**/*.yaml", "*.k8s.yaml"]
    FOCUS: Deployments, services, ingress, config maps
</platform_strategies>

</step>

<step number="2" name="explore_cicd_files">

### Step 2: Explore CI/CD Files

<github_actions_exploration>
  WORKFLOW_DISCOVERY:
    PROMPT: "Discover GitHub Actions workflow patterns:
             - Search for: .github/workflows/*.yml
             - Focus on: Triggers, jobs, steps, caching, deployment
             - Extract: Build process, test execution, deployment strategy
             - Identify: Common workflow patterns"

    EXPECTED:
      - Workflow triggers (push, pull_request, release)
      - Job organization
      - actions/checkout, actions/setup-node usage
      - Caching strategies (actions/cache)
      - Environment secrets usage
      - Deployment steps
      - Matrix builds
</github_actions_exploration>

<docker_exploration>
  DOCKERFILE_DISCOVERY:
    PROMPT: "Discover Docker patterns:
             - Search for: Dockerfile, docker-compose.yml
             - Focus on: Multi-stage builds, optimization, services
             - Extract: Base images, build steps, runtime configuration
             - Identify: Containerization patterns"

    EXPECTED:
      - Multi-stage build usage
      - Base image choices (alpine, slim, etc.)
      - Layer optimization
      - COPY/ADD patterns
      - ENV variable management
      - EXPOSE ports
      - Health checks
      - docker-compose service definitions
</docker_exploration>

</step>

<step number="3" name="extract_patterns">

### Step 3: Extract Deployment Patterns

<workflow_patterns>
  GITHUB_ACTIONS:
    ```yaml
    name: CI/CD Pipeline

    on:
      push:
        branches: [main, develop]
      pull_request:
        branches: [main]

    jobs:
      test:
        runs-on: ubuntu-latest
        steps:
          - uses: actions/checkout@v4
          - uses: actions/setup-node@v4
            with:
              node-version: '20'
              cache: 'npm'
          - run: npm ci
          - run: npm test
          - run: npm run build

      deploy:
        needs: test
        if: github.ref == 'refs/heads/main'
        runs-on: ubuntu-latest
        environment: production
        steps:
          - uses: actions/checkout@v4
          - name: Deploy to production
            env:
              API_KEY: ${{ secrets.API_KEY }}
            run: |
              npm run deploy
    ```

  GITLAB_CI:
    ```yaml
    stages:
      - build
      - test
      - deploy

    build:
      stage: build
      script:
        - npm ci
        - npm run build
      artifacts:
        paths:
          - dist/

    test:
      stage: test
      script:
        - npm test

    deploy_production:
      stage: deploy
      script:
        - npm run deploy
      only:
        - main
      environment: production
    ```
</workflow_patterns>

<docker_patterns>
  MULTI_STAGE_BUILD:
    ```dockerfile
    # Build stage
    FROM node:20-alpine AS builder
    WORKDIR /app
    COPY package*.json ./
    RUN npm ci
    COPY . .
    RUN npm run build

    # Production stage
    FROM node:20-alpine
    WORKDIR /app
    COPY --from=builder /app/dist ./dist
    COPY package*.json ./
    RUN npm ci --only=production
    EXPOSE 3000
    CMD ["node", "dist/index.js"]
    ```

  DOCKER_COMPOSE:
    ```yaml
    version: '3.8'
    services:
      app:
        build: .
        ports:
          - "3000:3000"
        environment:
          - NODE_ENV=production
          - DATABASE_URL=${DATABASE_URL}
        depends_on:
          - db
        restart: unless-stopped

      db:
        image: postgres:16-alpine
        volumes:
          - postgres_data:/var/lib/postgresql/data
        environment:
          POSTGRES_PASSWORD: ${DB_PASSWORD}

    volumes:
      postgres_data:
    ```
</docker_patterns>

<caching_patterns>
  GITHUB_ACTIONS:
    - actions/cache for dependencies
    - actions/cache for build outputs
    - Docker layer caching
    - Artifact caching between jobs

    ```yaml
    - name: Cache dependencies
      uses: actions/cache@v3
      with:
        path: ~/.npm
        key: ${{ runner.os }}-node-${{ hashFiles('**/package-lock.json') }}
        restore-keys: |
          ${{ runner.os }}-node-
    ```

  DOCKER:
    - BuildKit caching
    - Multi-stage build layer reuse
    - .dockerignore optimization

  GITLAB_CI:
    - cache: key and paths
    - artifacts between stages
</caching_patterns>

<deployment_strategies>
  CONTINUOUS_DEPLOYMENT:
    - Auto-deploy on main branch push
    - Environment-based deployment
    - Blue-green deployment
    - Canary releases

  ENVIRONMENT_MANAGEMENT:
    - Dev/staging/production environments
    - Environment-specific secrets
    - Approval gates for production
    - Environment URLs

  ROLLBACK_STRATEGIES:
    - Version tagging
    - Docker image tags
    - Deployment history
    - Health check verification
</deployment_strategies>

<build_optimization_patterns>
  CACHING:
    - Dependency caching
    - Build artifact caching
    - Docker layer optimization

  PARALLELIZATION:
    - Matrix builds for multiple versions
    - Parallel test execution
    - Concurrent deployments

  INCREMENTAL_BUILDS:
    - Only rebuild changed parts
    - Monorepo selective builds
    - Affected project detection
</build_optimization_patterns>

<security_patterns>
  SECRETS_MANAGEMENT:
    - GitHub Secrets
    - Environment variables
    - .env file patterns
    - Secret scanning

  IMAGE_SECURITY:
    - Vulnerability scanning
    - Base image updates
    - Minimal base images (alpine)
    - Non-root user execution

  ACCESS_CONTROL:
    - GITHUB_TOKEN permissions
    - Service account usage
    - OIDC authentication
    - Environment protection rules
</security_patterns>

</step>

<step number="4" name="pattern_summary">

### Step 4: Generate Pattern Summary

<summary_structure>
  {
    platform: "github-actions",
    docker_usage: true,
    files_analyzed: 8,
    patterns: {
      build_process: {
        dominant: "npm ci → npm run build",
        caching: true,
        optimization: "Node modules cached"
      },
      test_execution: {
        dominant: "Run tests before build",
        parallel: false,
        coverage: true
      },
      deployment: {
        strategy: "Continuous deployment on main",
        environments: ["staging", "production"],
        approval_required: true
      },
      docker: {
        multi_stage: true,
        base_image: "node:20-alpine",
        optimization: "Layer caching, small base image"
      }
    },
    recommendations: [
      "Add matrix builds for multiple Node versions",
      "Implement blue-green deployment strategy",
      "Add automated rollback on health check failure",
      "Enable Dependabot for dependency updates"
    ]
  }
</summary_structure>

</step>

</discovery_flow>

## Output Format

<output>
  {
    discovery_summary: {
      platform: "github-actions",
      docker_usage: true,
      files_analyzed: 8,
      patterns_found: 18,
      confidence: "high"
    },
    patterns: {
      workflows: [...],
      build_process: [...],
      test_execution: [...],
      deployment_strategy: [...],
      docker_configuration: [...],
      caching: [...],
      security: [...]
    },
    optimization_opportunities: [...],
    recommendations: [...]
  }
</output>

## Error Handling

<error_protocols>
  <no_cicd_found>
    WARN: "No CI/CD configuration detected"
    SUGGEST: "Consider using --best-practices mode for CI/CD templates"
  </no_cicd_found>

  <incomplete_workflows>
    NOTE: "Partial CI/CD setup detected"
    EXTRACT: Available patterns
    SUGGEST: "Additions for complete CI/CD pipeline"
  </incomplete_workflows>
</error_protocols>

## Related Utilities

- `@specwright/workflows/skill/utils/extract-patterns.md`
- `@specwright/workflows/skill/utils/detect-cicd.md`
