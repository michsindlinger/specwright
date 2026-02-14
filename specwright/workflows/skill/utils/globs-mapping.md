---
description: Framework-specific glob patterns for skill auto-activation
version: 1.0
encoding: UTF-8
---

# Globs Mapping by Framework and Skill Type

## Overview

This document defines file glob patterns for each framework and skill type combination. These globs are used in skill frontmatter to enable automatic skill loading when working with relevant files.

## Usage

```yaml
# In skill frontmatter
globs:
  - "pattern1"
  - "pattern2"
```

## Backend Framework Globs

### Spring Boot (Java)

**File Extension:** `.java`

| Skill Type | Globs |
|------------|-------|
| logic-implementing | `src/**/*Service.java`, `src/**/service/**/*.java`, `src/main/java/**/*Service.java` |
| persistence-adapter | `src/**/*Repository.java`, `src/**/repository/**/*.java`, `src/main/java/**/*Repository.java` |
| integration-adapter | `src/**/*Client.java`, `src/**/client/**/*.java`, `src/**/*Adapter.java` |
| test-engineering | `src/test/**/*Test.java`, `src/test/**/*Tests.java`, `**/*Test.java` |

### Ruby on Rails

**File Extension:** `.rb`

| Skill Type | Globs |
|------------|-------|
| logic-implementing | `app/services/**/*.rb` |
| persistence-adapter | `app/models/**/*.rb` |
| integration-adapter | `app/services/**/*_client.rb`, `app/**/*_adapter.rb` |
| test-engineering | `spec/**/*_spec.rb`, `test/**/*_test.rb` |

### Express.js (Node.js)

**File Extensions:** `.ts`, `.js`

| Skill Type | Globs |
|------------|-------|
| logic-implementing | `src/**/*Service.{ts,js}`, `src/services/**/*.{ts,js}` |
| persistence-adapter | `src/**/*Repository.{ts,js}`, `src/repositories/**/*.{ts,js}`, `src/models/**/*.{ts,js}` |
| integration-adapter | `src/**/*Client.{ts,js}`, `src/clients/**/*.{ts,js}` |
| test-engineering | `src/**/*.test.{ts,js}`, `src/**/*.spec.{ts,js}`, `tests/**/*.{ts,js}` |

### FastAPI (Python)

**File Extension:** `.py`

| Skill Type | Globs |
|------------|-------|
| logic-implementing | `app/**/*service*.py`, `app/services/**/*.py` |
| persistence-adapter | `app/**/*repository*.py`, `app/repositories/**/*.py`, `app/models/**/*.py` |
| integration-adapter | `app/**/*client*.py`, `app/clients/**/*.py` |
| test-engineering | `tests/**/*.py`, `test_*.py`, `*_test.py` |

### Django (Python)

**File Extension:** `.py`

| Skill Type | Globs |
|------------|-------|
| logic-implementing | `**/services/**/*.py`, `**/*service.py` |
| persistence-adapter | `**/models.py`, `**/models/**/*.py` |
| integration-adapter | `**/clients/**/*.py`, `**/*client.py` |
| test-engineering | `**/test_*.py`, `**/tests.py`, `**/tests/**/*.py` |

## Frontend Framework Globs

### React (TypeScript/JavaScript)

**File Extensions:** `.tsx`, `.jsx`, `.ts`, `.js`

| Skill Type | Globs |
|------------|-------|
| ui-component-architecture | `src/**/*.{tsx,jsx}`, `src/components/**/*`, `src/pages/**/*` |
| state-management | `src/**/context/**/*`, `src/**/store/**/*`, `src/**/state/**/*`, `src/hooks/**/*.{ts,js}` |
| api-bridge-building | `src/**/api/**/*.{ts,js}`, `src/**/services/**/*.{ts,js}`, `src/**/http/**/*.{ts,js}` |
| interaction-designing | `src/**/*.{tsx,jsx}`, `src/components/**/*.{tsx,jsx}` |

### Angular

**File Extension:** `.ts`

| Skill Type | Globs |
|------------|-------|
| ui-component-architecture | `src/**/*.component.ts`, `src/**/*.directive.ts`, `src/**/*.pipe.ts` |
| state-management | `src/**/*.service.ts`, `src/**/store/**/*`, `src/**/state/**/*` |
| api-bridge-building | `src/**/services/**/*`, `src/**/api/**/*` |
| interaction-designing | `src/**/*.component.ts`, `src/**/*.directive.ts` |

### Vue.js

**File Extensions:** `.vue`, `.ts`, `.js`

| Skill Type | Globs |
|------------|-------|
| ui-component-architecture | `src/**/*.vue`, `src/components/**/*.vue` |
| state-management | `src/stores/**/*.{ts,js}`, `src/**/pinia/**/*.{ts,js}`, `src/**/vuex/**/*.{ts,js}` |
| api-bridge-building | `src/**/api/**/*.{ts,js}`, `src/**/services/**/*.{ts,js}` |
| interaction-designing | `src/**/*.vue`, `src/components/**/*.vue` |

### Svelte

**File Extensions:** `.svelte`, `.ts`, `.js`

| Skill Type | Globs |
|------------|-------|
| ui-component-architecture | `src/**/*.svelte`, `src/lib/**/*.svelte`, `src/routes/**/*.svelte` |
| state-management | `src/stores/**/*.{ts,js}`, `src/**/stores/**/*.{ts,js}` |
| api-bridge-building | `src/**/api/**/*.{ts,js}`, `src/**/services/**/*.{ts,js}` |
| interaction-designing | `src/**/*.svelte` |

## DevOps Skill Globs

**Technology Agnostic**

| Skill Type | Globs |
|------------|-------|
| infrastructure-provisioning | `terraform/**/*`, `k8s/**/*`, `kubernetes/**/*`, `ansible/**/*`, `puppet/**/*`, `chef/**/*`, `docker/**/*` |
| pipeline-engineering | `.github/workflows/**/*.{yml,yaml}`, `.gitlab-ci.yml`, `Jenkinsfile*`, `azure-pipelines.yml`, `cloudbuild.yaml`, `.circleci/**/*` |
| observability-management | `prometheus/**/*`, `grafana/**/*`, `**/monitoring/**/*`, `**/metrics/**/*`, `**/logging/**/*`, `**/alerts/**/*` |
| security-hardening | `**/security/**/*`, `**/*.security.yaml`, `**/policies/**/*` |

## QA Skill Globs

**Technology Agnostic**

| Skill Type | Globs |
|------------|-------|
| test-strategy | `**/test-plan.md`, `**/testing-strategy.md`, `**/test-approach.md` |
| test-automation | `tests/**/*`, `test/**/*`, `e2e/**/*`, `spec/**/*`, `__tests__/**/*`, `**/*.spec.{ts,js,py}`, `**/*.test.{ts,js,py}` |
| quality-metrics | `**/quality-report.md`, `**/metrics/**/*`, `**/coverage/**/*` |
| regression-testing | `tests/regression/**/*`, `**/regression/**/*` |

## Architect Skill Globs

**Technology Agnostic**

| Skill Type | Globs |
|------------|-------|
| pattern-enforcement | `**/architecture.md`, `**/patterns.md`, `**/conventions.md` |
| api-designing | `**/api-spec.md`, `**/openapi.yaml`, `**/swagger.yaml`, `src/**/*Controller.*`, `src/**/*Route.*` |
| security-guidance | `**/security.md`, `**/auth/**/*`, `src/**/auth/**/*` |
| data-modeling | `**/schema/**/*`, `src/**/models/**/*`, `src/**/entities/**/*`, `**/database-schema.sql` |
| dependency-checking | `package.json`, `pom.xml`, `build.gradle`, `Gemfile`, `requirements.txt`, `go.mod`, `composer.json` |

## PO (Product Owner) Skill Globs

**Technology Agnostic**

| Skill Type | Globs |
|------------|-------|
| backlog-organization | `**/backlog.md`, `**/stories/**/*`, `**/user-stories.md` |
| requirements-engineering | `**/requirements.md`, `**/specs/**/*`, `**/features/**/*` |
| acceptance-testing | `**/acceptance-criteria.md`, `**/acceptance-tests/**/*` |
| data-analysis | `**/analytics/**/*`, `**/metrics/**/*`, `**/reports/**/*` |

## Documenter Skill Globs

**Technology Agnostic**

| Skill Type | Globs |
|------------|-------|
| changelog-generation | `CHANGELOG.md`, `CHANGES.md`, `**/changelog/**/*` |
| api-documentation | `**/api-docs/**/*`, `**/api-documentation.md`, `**/README.md` |
| user-guide-writing | `**/docs/user/**/*`, `**/guides/**/*`, `**/tutorial/**/*` |
| code-documentation | `**/README.md`, `**/docs/**/*` |

## Generic Patterns

### Configuration Files

```yaml
config_globs:
  - "**/*.config.{js,ts,json,yaml,yml}"
  - "**/.*rc.{js,yml,yaml}"
  - "**/.env*"
  - "**/config/**/*"
```

### Documentation Files

```yaml
docs_globs:
  - "**/*.md"
  - "**/docs/**/*"
  - "**/README*"
```

### Test Files (Universal)

```yaml
test_globs:
  - "**/*.test.*"
  - "**/*.spec.*"
  - "**/test/**/*"
  - "**/tests/**/*"
  - "**/__tests__/**/*"
  - "**/spec/**/*"
```

## Framework Detection Heuristics

### How to Detect Framework from File Patterns

| Framework | Detection Files |
|-----------|-----------------|
| Spring Boot | `pom.xml`, `build.gradle`, `mvnw` |
| Rails | `Gemfile`, `config/application.rb` |
| Express.js | `package.json` with `express` dependency |
| FastAPI | `requirements.txt` with `fastapi`, `pyproject.toml` |
| Django | `manage.py`, `requirements.txt` with `django` |
| React | `package.json` with `react` |
| Angular | `angular.json`, `package.json` with `@angular/core` |
| Vue.js | `package.json` with `vue` |
| Svelte | `package.json` with `svelte` |

## Example: Complete Skill Frontmatter with Globs

```yaml
---
name: my-project-backend-logic-implementing
description: "Backend logic implementation for my-project. Use when: (1) Implementing business logic services, (2) Creating service layer classes, (3) Implementing domain logic, (4) Working with service patterns"
version: 1.0
framework: spring-boot
created: 2026-01-14
encoding: UTF-8
globs:
  - "src/**/*Service.java"
  - "src/**/service/**/*.java"
  - "src/main/java/**/*Service.java"
always_apply: false
---
```

## Notes

- Globs use standard gitignore-style pattern matching
- Double `**` matches any number of directories
- Single `*` matches any characters within a directory/file name
- Patterns are relative to project root
- Multiple patterns are OR'd together (any match activates the skill)
