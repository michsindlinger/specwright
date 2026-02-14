# Skill Index

> Project: [PROJECT_NAME]
> Generated: [CURRENT_DATE]
> Purpose: Lookup table for Architect and Orchestrator skill selection

## How to Use

### For Architect (Technical Refinement in /create-spec)

1. Review story requirements (user story, acceptance criteria)
2. Find matching skills by trigger keywords below
3. Select 1-3 most relevant skills per story
4. Add skill paths to story's "Relevante Skills" section

### For Orchestrator (Task Execution in /execute-tasks)

1. Read story's "Relevante Skills" section
2. Load only the specified skill files
3. Extract "## Quick Reference" section from each skill
4. Include extracted patterns in task prompt for sub-agent

---

## Skill Catalog

### Backend Skills

| Skill | Path | Trigger Keywords |
|-------|------|------------------|
| Logic Implementing | specwright/skills/backend-logic-implementing.md | service objects, business logic, domain models, use cases, validation |
| Persistence Adapter | specwright/skills/backend-persistence-adapter.md | database, models, queries, migrations, ActiveRecord, SQL, repositories |
| Integration Adapter | specwright/skills/backend-integration-adapter.md | external APIs, HTTP clients, webhooks, third-party services |
| Test Engineering | specwright/skills/backend-test-engineering.md | unit tests, integration tests, RSpec, fixtures, mocks, factories |

### Frontend Skills

| Skill | Path | Trigger Keywords |
|-------|------|------------------|
| UI Component Architecture | specwright/skills/frontend-ui-component-architecture.md | components, props, composition, layout, rendering |
| State Management | specwright/skills/frontend-state-management.md | state, context, stores, reducers, hooks, data flow |
| API Bridge Building | specwright/skills/frontend-api-bridge-building.md | API calls, data fetching, caching, SWR, React Query |
| Interaction Designing | specwright/skills/frontend-interaction-designing.md | forms, validation, user input, UX patterns, accessibility |

### Architect Skills

| Skill | Path | Trigger Keywords |
|-------|------|------------------|
| Pattern Enforcement | specwright/skills/architect-pattern-enforcement.md | architecture review, pattern compliance, code structure |
| API Designing | specwright/skills/architect-api-designing.md | API design, endpoints, REST, GraphQL, contracts |
| Security Guidance | specwright/skills/architect-security-guidance.md | security review, authentication, authorization, OWASP |
| Data Modeling | specwright/skills/architect-data-modeling.md | data models, schemas, relationships, normalization |
| Dependency Checking | specwright/skills/architect-dependency-checking.md | dependencies, versions, conflicts, compatibility |

### DevOps Skills

| Skill | Path | Trigger Keywords |
|-------|------|------------------|
| Infrastructure Provisioning | specwright/skills/devops-infrastructure-provisioning.md | infrastructure, servers, cloud, Docker, Kubernetes |
| Pipeline Engineering | specwright/skills/devops-pipeline-engineering.md | CI/CD, GitHub Actions, pipelines, deployment automation |
| Observability | specwright/skills/devops-observability.md | logging, monitoring, alerts, metrics, tracing |
| Security Hardening | specwright/skills/devops-security-hardening.md | security hardening, compliance, secrets management |

### QA Skills

| Skill | Path | Trigger Keywords |
|-------|------|------------------|
| Test Strategy | specwright/skills/qa-test-strategy.md | test planning, coverage strategy, quality gates |
| Test Automation | specwright/skills/qa-test-automation.md | automated tests, E2E, Playwright, Cypress, frameworks |
| Quality Metrics | specwright/skills/qa-quality-metrics.md | quality metrics, code coverage, defect tracking |
| Regression Testing | specwright/skills/qa-regression-testing.md | regression tests, test suites, stability |

### PO Skills

| Skill | Path | Trigger Keywords |
|-------|------|------------------|
| Backlog Organization | specwright/skills/po-backlog-organization.md | backlog, prioritization, grooming, sprint planning |
| Requirements Engineering | specwright/skills/po-requirements-engineering.md | requirements, user stories, acceptance criteria |
| Acceptance Testing | specwright/skills/po-acceptance-testing.md | acceptance tests, UAT, validation, sign-off |
| Data Analysis | specwright/skills/po-data-analysis.md | analytics, metrics, data-driven decisions |

### Documenter Skills

| Skill | Path | Trigger Keywords |
|-------|------|------------------|
| Changelog Generation | specwright/skills/documenter-changelog-generation.md | changelog, release notes, version history |
| API Documentation | specwright/skills/documenter-api-documentation.md | API docs, OpenAPI, Swagger, endpoint documentation |
| User Guide Writing | specwright/skills/documenter-user-guide-writing.md | user guides, tutorials, how-to, documentation |
| Code Documentation | specwright/skills/documenter-code-documentation.md | code comments, docstrings, README, inline docs |

### Custom Skills (Project-Specific)

<!-- Auto-populated if custom skills were generated in build-development-team Step 6.5 -->

| Skill | Path | Trigger Keywords |
|-------|------|------------------|
| [CUSTOM_SKILL_NAME] | specwright/skills/custom-[name].md | [keywords] |

### Design/UX Skills (If Applicable)

<!-- Auto-populated if design-system.md or ux-patterns.md exist -->

| Skill | Path | Trigger Keywords |
|-------|------|------------------|
| Design System | specwright/skills/frontend-design-system.md | colors, typography, spacing, design tokens |
| UX Patterns | specwright/skills/frontend-ux-patterns.md | navigation, user flows, interactions, feedback states |

---

## Example: Skill Selection for Stories

### Backend Service Story

**Story:** "Implement User Registration Service"

**Trigger Keywords Found:** service, validation, database, user model

**Selected Skills:**
| Skill | Pfad | Grund |
|-------|------|-------|
| Logic Implementing | specwright/skills/backend-logic-implementing.md | Service Object pattern for registration |
| Persistence Adapter | specwright/skills/backend-persistence-adapter.md | User model creation |
| Test Engineering | specwright/skills/backend-test-engineering.md | Unit tests for service |

### Frontend Component Story

**Story:** "Create User Profile Component"

**Trigger Keywords Found:** component, state, API calls, form

**Selected Skills:**
| Skill | Pfad | Grund |
|-------|------|-------|
| UI Component Architecture | specwright/skills/frontend-ui-component-architecture.md | Component structure |
| State Management | specwright/skills/frontend-state-management.md | Profile state handling |
| API Bridge Building | specwright/skills/frontend-api-bridge-building.md | Fetch user data from API |

### DevOps Story

**Story:** "Set up CI/CD Pipeline"

**Trigger Keywords Found:** CI/CD, GitHub Actions, deployment

**Selected Skills:**
| Skill | Pfad | Grund |
|-------|------|-------|
| Pipeline Engineering | specwright/skills/devops-pipeline-engineering.md | GitHub Actions workflow |
| Security Hardening | specwright/skills/devops-security-hardening.md | Secrets management |

---

## Notes

- Each skill file should have a "## Quick Reference" section (50-100 lines)
- Orchestrator extracts only Quick Reference, not full skill content
- This reduces context from ~600 lines per skill to ~50-100 lines
- Skills are NOT loaded by sub-agents automatically
- Patterns are provided via task prompts from Orchestrator
