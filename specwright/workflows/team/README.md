# Team Development System - Comprehensive Guide

> **Phase B: Development Team with Smart Task Routing**
> Version: 2.0

## Table of Contents

1. [Overview](#overview)
2. [Installation](#installation)
3. [How It Works](#how-it-works)
4. [Specialist Agents](#specialist-agents)
5. [Task Routing](#task-routing)
6. [Configuration](#configuration)
7. [Templates](#templates)
8. [Skills](#skills)
9. [Example Workflows](#example-workflows)
10. [Customization](#customization)
11. [Troubleshooting](#troubleshooting)
12. [FAQ](#faq)

---

## Overview

The **Team Development System** extends `/execute-tasks` with intelligent task routing to specialized development agents. Instead of implementing everything yourself, describe your tasks and let specialists handle their domains:

- **backend-dev** → API implementation (Spring Boot, Node.js)
- **frontend-dev** → UI implementation (React, Angular)
- **qa-specialist** → Comprehensive testing with auto-fix
- **devops-specialist** → CI/CD and deployment automation

### Key Innovation

**Transparent Integration**: Works seamlessly with existing `/execute-tasks` workflow through keyword-based task detection. No new commands to learn.

### Benefits

✅ **Faster Development** - Specialists generate complete implementations automatically
✅ **Higher Quality** - Built-in best practices from skills
✅ **Consistent Patterns** - Templates ensure uniformity
✅ **Comprehensive Testing** - Auto-fix test failures
✅ **Production-Ready** - CI/CD generated automatically
✅ **Clear Coordination** - Handoffs between specialists
✅ **Backward Compatible** - Disable for existing projects

---

## Installation

### Global Installation (Recommended)

**Step 1: Install globally** (once):

```bash
curl -sSL https://raw.githubusercontent.com/michsindlinger/specwright/main/setup-team-system-global.sh | bash
```

**What This Installs**:
- 2 skills → `specwright/skills/base/`
  - `testing-best-practices.md`
  - `devops-patterns.md`
- 12 templates → `specwright/templates/team-development/`
  - 4 backend templates
  - 4 frontend templates
  - 2 QA templates
  - 2 DevOps templates
- 5 agents → `.claude/agents/`
  - `backend-dev.md`
  - `frontend-dev.md`
  - `qa-specialist.md`
  - `devops-specialist.md`
  - `mock-generator.md`
- Skill symlinks → `.claude/skills/`

**Step 2: Setup in project**:

```bash
cd your-project
curl -sSL https://raw.githubusercontent.com/michsindlinger/specwright/main/setup-team-system-project.sh | bash
```

**What This Does**:
- Creates `specwright/templates/team-development/` (for overrides)
- Creates `.claude/agents/` (for overrides)
- Adds `team_system` section to `specwright/config.yml`

### Project-Specific Installation

Install everything locally (no global dependencies):

```bash
cd your-project
curl -sSL https://raw.githubusercontent.com/michsindlinger/specwright/main/setup.sh | bash
curl -sSL https://raw.githubusercontent.com/michsindlinger/specwright/main/setup-claude-code.sh | bash
```

### Verify Installation

```bash
# Check global installation
ls ~/.claude/agents/backend-dev.md
ls specwright/skills/base/testing-best-practices.md
ls specwright/templates/team-development/backend/api-spec.md

# Check project setup
cat specwright/config.yml | grep team_system
```

---

## How It Works

### Workflow Overview

```
User creates tasks.md
    ↓
User runs /execute-tasks
    ↓
System analyzes each task description
    ↓
System detects task type (keywords)
    ↓
System routes to specialist (if team_system.enabled)
    ↓
Specialist executes task
    ↓
Specialist creates handoff for next specialist
    ↓
All tasks complete → Tests pass → CI/CD ready
```

### Smart Task Routing

**Keyword Detection** (case-insensitive):

```yaml
Backend Keywords:
  - api, endpoint, controller, service, repository
  - rest, graphql, database, backend, server

Frontend Keywords:
  - component, page, view, ui, frontend
  - react, angular, state, redux, interface

QA Keywords:
  - test, spec, coverage, e2e, integration, unit
  - playwright, cypress, jest, junit, testing

DevOps Keywords:
  - deploy, ci, cd, docker, pipeline
  - github actions, kubernetes, aws, deployment, infrastructure
```

**Routing Logic**:

```
1. Analyze task description
2. Match against keyword lists
3. IF keywords found: Route to specialist
4. IF no keywords: Direct execution (fallback)
5. IF team_system.enabled = false: Direct execution (all tasks)
```

**Priority** (if multiple keyword matches):
```
Backend > Frontend > QA > DevOps
```

### Example Task Analysis

**Task**: "Create POST /api/users endpoint with validation"

```
Analysis:
  Keywords found: [api, endpoint]
  Task type: backend
  Specialist: backend-dev

Execution:
  backend-dev loads skills:
    - java-core-patterns
    - spring-boot-conventions
    - jpa-best-practices
    - security-best-practices

  backend-dev generates:
    - UserController.java
    - UserService.java
    - UserRepository.java
    - User.java (entity)
    - UserDTO.java, UserCreateRequest.java, UserUpdateRequest.java
    - UserNotFoundException.java, DuplicateEmailException.java
    - GlobalExceptionHandler.java (updated)
    - UserServiceTest.java (24 tests, 92% coverage)
    - api-mocks/users.json
    - backend-handoff.md

  Result: ✅ Complete API implementation ready
```

---

## Specialist Agents

### 1. backend-dev

**Expertise**: Backend API implementation

**Tech Stacks**:
- **Primary**: Java Spring Boot 3.x
- **Secondary**: Node.js/Express (future)

**Auto-Loaded Skills**:
- java-core-patterns (SOLID, design patterns, modern Java)
- spring-boot-conventions (DI, controllers, services, configuration)
- jpa-best-practices (N+1 prevention, caching, optimizations)
- security-best-practices (auth, validation, encryption)

**Generates**:
- **Controllers** - @RestController with all endpoints (GET, POST, PUT, DELETE)
- **Services** - Business logic with @Service annotation
- **Repositories** - Spring Data JPA repositories
- **Entities** - JPA entities with relationships
- **DTOs** - Request/response objects with @Valid annotations
- **Exception Handling** - Custom exceptions, @ControllerAdvice
- **Unit Tests** - JUnit 5 + Mockito, >80% coverage
- **API Mocks** - JSON mocks for frontend development
- **Handoff** - API documentation for frontend team

**Example Output**:
```
src/main/java/com/example/
├── controller/
│   └── UserController.java (REST endpoints)
├── service/
│   └── UserService.java (business logic)
├── repository/
│   └── UserRepository.java (data access)
├── entity/
│   └── User.java (JPA entity)
├── dto/
│   ├── UserDTO.java
│   ├── UserCreateRequest.java
│   └── UserUpdateRequest.java
└── exception/
    ├── UserNotFoundException.java
    └── DuplicateEmailException.java

src/test/java/com/example/
└── service/
    └── UserServiceTest.java (24 tests)

api-mocks/
└── users.json (API mocks)
```

**Configuration**:
```yaml
specialists:
  backend_dev:
    enabled: true
    default_stack: java_spring_boot  # or nodejs_express
    code_generation: full            # or scaffolding, guidance
```

---

### 2. frontend-dev

**Expertise**: Frontend UI implementation

**Tech Stacks**:
- **Primary**: React 18+ with TypeScript
- **Secondary**: Angular 17+ with TypeScript

**Auto-Loaded Skills (React)**:
- react-component-patterns (composition, props, rendering optimization)
- react-hooks-best-practices (useState, useEffect, useMemo, custom hooks)
- typescript-react-patterns (types, generics, type guards)

**Auto-Loaded Skills (Angular)**:
- angular-component-patterns (standalone, lifecycle, OnPush)
- angular-services-patterns (DI, HTTP, state management)
- rxjs-best-practices (operators, subscriptions, error handling)

**Generates**:
- **Components** - Functional components (React) or standalone (Angular)
- **Services** - API integration using backend mocks
- **Types** - TypeScript interfaces matching backend DTOs
- **Hooks** - Custom hooks (React) or services (Angular)
- **Forms** - Validation with React Hook Form or Reactive Forms
- **Tests** - React Testing Library or Angular Testing Library, >80% coverage
- **Handoff** - E2E test scenarios for QA team

**Example Output (React)**:
```
src/
├── components/
│   ├── UserList/
│   │   ├── UserList.tsx
│   │   ├── UserList.module.css
│   │   └── UserList.test.tsx
│   ├── UserCard/
│   │   ├── UserCard.tsx
│   │   ├── UserCard.module.css
│   │   └── UserCard.test.tsx
│   └── UserForm/
│       ├── UserForm.tsx
│       ├── UserForm.module.css
│       └── UserForm.test.tsx
├── services/
│   └── UserService.ts (uses api-mocks/users.json in dev)
├── types/
│   └── User.ts (interfaces)
└── hooks/
    └── useUsers.ts (custom hook)
```

**Configuration**:
```yaml
specialists:
  frontend_dev:
    enabled: true
    default_framework: react  # or angular
    code_generation: full
```

---

### 3. qa-specialist

**Expertise**: Comprehensive testing and quality assurance

**Testing Pyramid**:
```
        /\
       /E2E\      ← 5-10 critical flows (slowest)
      /------\
     /Integr.\   ← All API endpoints (medium)
    /----------\
   /   Unit     \ ← All functions/components (fast)
  /--------------\
```

**Auto-Loaded Skills**:
- testing-best-practices (test patterns, coverage strategies, E2E best practices)

**Capabilities**:
- **Unit Tests** - Execute backend (JUnit) and frontend (Jest) separately
- **Integration Tests** - Test API endpoints with database
- **E2E Tests** - Playwright or Cypress for critical user flows
- **Coverage Analysis** - Verify ≥80% coverage target
- **Auto-Fix Loop** - Analyze failures, delegate to specialists, max 3 retries
- **Quality Gates** - Enforce gates before deployment handoff
- **Test Reporting** - Comprehensive test execution report

**Test Tools by Stack**:
- **Java Backend**: JUnit 5, Mockito, TestContainers, Spring Test
- **Node.js Backend**: Jest, Supertest
- **React Frontend**: Jest, React Testing Library, MSW (mocks)
- **Angular Frontend**: Jasmine/Karma or Jest, Angular Testing Library
- **E2E**: Playwright (preferred) or Cypress

**Auto-Fix Loop**:
```
1. Run tests (mvn test, npm test)
2. IF failures detected:
   a. Analyze error messages and stack traces
   b. Identify root cause
   c. Determine responsible specialist (backend-dev or frontend-dev)
   d. Delegate fix with specific error details
   e. Specialist fixes code
   f. Re-run tests
   g. Repeat up to 3 times
   h. IF still failing: Report to user, pause workflow
3. IF all tests pass:
   → Generate test-report.md
   → Handoff to devops-specialist
```

**Generates**:
- Test execution results
- Coverage reports
- test-report.md (comprehensive report)
- Quality gate verification

**Configuration**:
```yaml
specialists:
  qa_specialist:
    enabled: true
    test_types: [unit, integration, e2e]
    coverage_target: 80        # Minimum coverage %
    auto_fix_attempts: 3       # Max fix iterations
```

---

### 4. devops-specialist

**Expertise**: CI/CD automation and deployment

**Auto-Loaded Skills**:
- devops-patterns (CI/CD best practices, Docker patterns, deployment strategies)
- security-best-practices (secrets management, container security)

**Capabilities**:
- **CI Pipelines** - GitHub Actions for automated testing and building
- **CD Pipelines** - Staging auto-deploy, production manual approval
- **Containerization** - Docker multi-stage builds
- **Local Development** - docker-compose for multi-container setup
- **Deployment Documentation** - Complete deployment plan
- **Security** - Secrets management, container hardening

**Generates**:
- `.github/workflows/ci.yml` - CI pipeline (test + build on every push)
- `.github/workflows/deploy-staging.yml` - Auto-deploy to staging on main
- `.github/workflows/deploy-production.yml` - Manual production deployment
- `backend/Dockerfile` - Multi-stage Spring Boot image
- `frontend/Dockerfile` - Multi-stage React/Angular + Nginx image
- `docker-compose.yml` - Local multi-container development
- `.dockerignore` - Exclude unnecessary files
- `deployment-plan.md` - Complete deployment guide with secrets setup

**GitHub Actions Features**:
- Parallel backend + frontend testing
- Dependency caching (Maven, npm)
- Docker layer caching
- E2E tests run after unit tests pass
- Smoke tests after deployment
- Environment-specific secrets
- Manual approval for production

**Configuration**:
```yaml
specialists:
  devops_specialist:
    enabled: true
    ci_platform: github_actions  # or gitlab_ci, jenkins
    containerization: docker     # or none
```

---

### 5. mock-generator

**Expertise**: API mock generation utility

**Purpose**: Generate realistic JSON mocks for frontend development (enables frontend work without running backend)

**Capabilities**:
- **From Code**: Analyze backend controllers, DTOs, entities
- **From OpenAPI**: Parse OpenAPI/Swagger specifications
- **Realistic Data**: Generate representative sample data
- **All Cases**: Success responses + validation errors + edge cases
- **Exact Structure**: Match actual API response format

**Generates**:
```json
{
  "GET /api/users": {
    "status": 200,
    "body": [
      { "id": 1, "email": "alice@example.com", "name": "Alice Johnson" }
    ]
  },
  "GET /api/users/999": {
    "status": 404,
    "body": {
      "status": 404,
      "message": "User not found with id: 999",
      "timestamp": "2025-12-28T10:30:00Z"
    }
  },
  "POST /api/users [invalid email]": {
    "status": 400,
    "body": {
      "status": 400,
      "message": "Email must be valid",
      "timestamp": "2025-12-28T10:30:00Z"
    }
  }
}
```

**Used By**:
- backend-dev (generates mocks)
- frontend-dev (consumes mocks in development)

---

## Task Routing

### How Task Routing Works

**Step 1: Task Analysis**

System reads task description from `tasks.md`:
```markdown
1. Create POST /api/users endpoint with validation
```

**Step 2: Keyword Detection**

```
Task: "Create POST /api/users endpoint with validation"
Keywords found: [api, endpoint]
Match: Backend keywords
Task type: backend
```

**Step 3: Specialist Selection**

```
IF team_system.enabled = true AND task_type = backend:
  Route to: backend-dev specialist
ELSE:
  Direct execution (current behavior)
```

**Step 4: Delegation**

```
Delegate to backend-dev with:
  - Task description
  - Spec folder path
  - Task number and subtasks
  - Auto-load skills (java-core-patterns, spring-boot-conventions, etc.)
```

**Step 5: Execution**

```
backend-dev:
  1. Analyzes requirements
  2. Generates complete implementation
  3. Runs tests (>80% coverage)
  4. Creates API mocks
  5. Generates handoff document
  6. Commits with backend-dev attribution
```

### Routing Examples

**Example 1: Backend Task**
```markdown
Task: "Implement user authentication API with JWT tokens"
Keywords: [api, authentication]
Routes to: backend-dev
```

**Example 2: Frontend Task**
```markdown
Task: "Create responsive dashboard component with charts"
Keywords: [component, dashboard]
Routes to: frontend-dev
```

**Example 3: QA Task**
```markdown
Task: "Add E2E tests for user registration flow"
Keywords: [e2e, tests]
Routes to: qa-specialist
```

**Example 4: DevOps Task**
```markdown
Task: "Setup Docker containers for local development"
Keywords: [docker, containers]
Routes to: devops-specialist
```

**Example 5: Unknown Task**
```markdown
Task: "Optimize database indexes for faster queries"
Keywords: None matching
Routes to: Direct execution (fallback)
```

**Example 6: Mixed Tasks**
```markdown
1. Create user CRUD API       → backend-dev
2. Create user list UI        → frontend-dev
3. Optimize query performance → Direct execution
4. Run comprehensive tests    → qa-specialist
5. Deploy to staging          → devops-specialist
```

### Keyword Priority

If task has multiple keyword matches:

```
Priority order: backend > frontend > qa > devops

Example: "Create API endpoint with React component"
  Keywords: [api, endpoint, component, react]
  Matches: Backend (api, endpoint), Frontend (component, react)
  Selected: Backend (higher priority)
```

**Override**: Be specific in task description to force routing:
```markdown
# Force frontend routing
1. Frontend: Create UserList React component

# Force backend routing
1. Backend: Create POST /api/users endpoint
```

---

## Configuration

### Minimal Configuration

```yaml
# specwright/config.yml
team_system:
  enabled: true
```

That's it! Default settings work for most Java Spring Boot + React projects.

### Full Configuration

```yaml
# specwright/config.yml
team_system:
  # Enable team-based development
  enabled: true

  # File lookup order (project overrides global)
  lookup_order:
    - project  # Check specwright/ and .claude/ in project
    - global   # Fallback to global installation

  # Coordination mode
  coordination_mode: sequential  # MVP (parallel in Phase C)

  # Smart task routing
  task_routing:
    enabled: true       # Enable automatic routing
    auto_delegate: true # Auto-delegate (no manual confirmation)

  # Specialist configuration
  specialists:
    backend_dev:
      enabled: true
      default_stack: java_spring_boot  # Options: java_spring_boot, nodejs_express
      code_generation: full            # Options: full, scaffolding, guidance

    frontend_dev:
      enabled: true
      default_framework: react  # Options: react, angular
      code_generation: full

    qa_specialist:
      enabled: true
      test_types: [unit, integration, e2e]
      coverage_target: 80       # Minimum coverage %
      auto_fix_attempts: 3      # Max auto-fix iterations

    devops_specialist:
      enabled: true
      ci_platform: github_actions  # Options: github_actions, gitlab_ci, jenkins
      containerization: docker     # Options: docker, none

  # Quality gates (enforced by qa-specialist)
  quality_gates:
    unit_tests_required: true
    integration_tests_required: true
    coverage_minimum: 80
    build_success_required: true
```

### Configuration Options Explained

**enabled** (boolean):
- `true` - Smart routing active in /execute-tasks
- `false` - Direct execution (backward compatible)

**coordination_mode** (string):
- `sequential` - MVP, one specialist at a time
- `parallel` - Future (Phase C), multiple specialists simultaneously

**task_routing.enabled** (boolean):
- `true` - Automatic task type detection and routing
- `false` - Manual routing (not implemented)

**task_routing.auto_delegate** (boolean):
- `true` - Delegate without confirmation
- `false` - Ask user before delegating (verbose)

**default_stack** (backend_dev):
- `java_spring_boot` - Generate Java Spring Boot code
- `nodejs_express` - Generate Node.js/Express code (future)

**default_framework** (frontend_dev):
- `react` - Generate React components
- `angular` - Generate Angular components

**code_generation**:
- `full` - Complete implementation (recommended)
- `scaffolding` - Basic structure only
- `guidance` - Instructions only (no code)

**test_types** (qa_specialist):
- `[unit, integration, e2e]` - Run all test types
- `[unit, integration]` - Skip E2E tests
- `[unit]` - Only unit tests

**coverage_target** (qa_specialist):
- `80` - 80% minimum coverage (recommended)
- `90` - 90% for critical applications
- `70` - 70% for prototypes

**auto_fix_attempts** (qa_specialist):
- `3` - Max 3 auto-fix iterations (recommended)
- `5` - More attempts for complex issues
- `1` - Single attempt only

**ci_platform** (devops_specialist):
- `github_actions` - Generate GitHub Actions workflows
- `gitlab_ci` - GitLab CI (future)
- `jenkins` - Jenkins pipelines (future)

**containerization** (devops_specialist):
- `docker` - Generate Dockerfiles and docker-compose
- `none` - No containerization

---

## Templates

Templates provide structure for specialist outputs. Each specialist uses templates to generate documentation.

### Backend Templates

**Location**: `specwright/templates/team-development/backend/`

**Templates**:

1. **api-spec.md** - REST API endpoint specification
   - Endpoint documentation (GET, POST, PUT, DELETE)
   - Request/response models with TypeScript interfaces
   - Validation rules table
   - Business rules
   - Implementation checklist

2. **service-class.md** - Service layer specification
   - Method signatures
   - Business logic description
   - Error handling strategy
   - Helper methods
   - Testing requirements

3. **repository-class.md** - Repository/DAO specification
   - Standard CRUD methods
   - Custom query methods
   - Performance considerations (indexing, N+1 prevention)
   - Integration testing

4. **backend-handoff.md** - Backend → Frontend handoff
   - API endpoints table
   - Request/response examples (JSON)
   - Integration notes (base URL, authentication, CORS)
   - API mock file reference
   - Test results

**Usage**: backend-dev fills these templates when generating handoff docs

### Frontend Templates

**Location**: `specwright/templates/team-development/frontend/`

**Templates**:

1. **component-spec.md** - Component specification
   - Props interface
   - State management
   - Event handlers
   - Side effects (useEffect, lifecycle)
   - API integration
   - UI states (loading, error, empty, success)

2. **page-spec.md** - Page/view specification
   - Routing configuration
   - Page structure and layout
   - Child components
   - Data loading strategy
   - Query parameters
   - Navigation

3. **state-management.md** - State management approach
   - Context API (React)
   - Redux setup
   - NgRx (Angular)
   - Service-based state (Angular)

4. **frontend-handoff.md** - Frontend → QA handoff
   - Components implemented (table)
   - Pages with routes
   - API service integration
   - TypeScript types
   - Form validation rules
   - E2E test scenarios (critical flows)

**Usage**: frontend-dev fills these templates when generating handoff docs

### QA Templates

**Location**: `specwright/templates/team-development/qa/`

**Templates**:

1. **test-plan.md** - Test strategy
   - Testing pyramid distribution
   - Unit test cases (backend + frontend)
   - Integration test cases (API endpoints)
   - E2E test scenarios (critical flows)
   - Pass/fail criteria
   - Test environment setup

2. **test-report.md** - Test execution results
   - Test execution summary (passed, failed, coverage)
   - Unit test results (backend + frontend)
   - Integration test results
   - E2E test results with browser coverage
   - Bug reports (if any)
   - Quality gate assessment
   - QA approval/sign-off

**Usage**: qa-specialist fills these templates after test execution

### DevOps Templates

**Location**: `specwright/templates/team-development/devops/`

**Templates**:

1. **ci-cd-config.md** - CI/CD pipeline configuration
   - GitHub Actions workflow templates
   - Caching strategies
   - Secrets configuration
   - Environment setup (staging, production)
   - Notification configuration

2. **deployment-plan.md** - Deployment documentation
   - Environment matrix (dev, staging, production)
   - Server setup procedures
   - Deployment workflows (automated staging, manual production)
   - Database migration strategy
   - Monitoring and health checks
   - Backup and recovery procedures
   - Security checklist
   - Troubleshooting guide

**Usage**: devops-specialist fills these templates when generating deployment docs

### Template Override

**Global Template** (default):
```
specwright/templates/team-development/backend/api-spec.md
```

**Project Override**:
```bash
# Copy global template to project
mkdir -p specwright/templates/team-development/backend
cp specwright/templates/team-development/backend/api-spec.md \
   specwright/templates/team-development/backend/

# Customize for this project
vim specwright/templates/team-development/backend/api-spec.md
# Add: GraphQL schema section, custom pagination format

# Next time backend-dev runs in THIS project:
# Uses: projekt/specwright/templates/team-development/backend/api-spec.md
```

---

## Skills

Skills are auto-loaded by specialists based on their domain.

### New Skills (2)

**testing-best-practices.md**:
- Unit test patterns (AAA, Given-When-Then, test isolation)
- Integration test strategies (TestContainers, test databases)
- E2E test best practices (page objects, wait strategies, flake prevention)
- Coverage strategies (what to test, what to skip)
- Mocking patterns (when to mock, how to mock)

**devops-patterns.md**:
- CI/CD pipeline design (test stages, deployment gates)
- Docker best practices (multi-stage builds, layer caching, security)
- GitHub Actions patterns (workflow reuse, matrix builds, caching)
- Deployment strategies (blue-green, canary, rolling)
- Environment management (dev, staging, production)
- Monitoring and logging

### Existing Skills (Reused)

**Backend** (auto-loaded by backend-dev):
- java-core-patterns
- spring-boot-conventions
- jpa-best-practices
- security-best-practices

**Frontend React** (auto-loaded by frontend-dev):
- react-component-patterns
- react-hooks-best-practices
- typescript-react-patterns

**Frontend Angular** (auto-loaded by frontend-dev):
- angular-component-patterns
- angular-services-patterns
- rxjs-best-practices

**Universal**:
- git-workflow-patterns (all specialists)

### Skill Activation

**Automatic**: Skills load based on specialist role and detected tech stack

**Example**:
```
Task: "Create POST /api/users endpoint"
Routes to: backend-dev
Tech stack detected: Java (pom.xml found)
Skills loaded:
  ✓ java-core-patterns
  ✓ spring-boot-conventions
  ✓ jpa-best-practices
  ✓ security-best-practices
```

---

## Example Workflows

### Example 1: Simple CRUD Feature

**tasks.md**:
```markdown
1. Implement product management feature
   1.1. Create product CRUD API endpoints
   1.2. Create product list and detail pages
   1.3. Add tests
```

**Execution**:

```bash
/execute-tasks
```

**What Happens**:

**Task 1.1** → backend-dev:
- Generates: ProductController, ProductService, ProductRepository
- Generates: Product entity, ProductDTO, ProductCreateRequest, ProductUpdateRequest
- Generates: Exception classes
- Generates: Unit tests (28 tests, 89% coverage)
- Generates: api-mocks/products.json
- Handoff: Documents 5 API endpoints

**Task 1.2** → frontend-dev:
- Reads: Backend handoff (API structure)
- Generates: ProductList, ProductCard, ProductForm, ProductDetail components
- Generates: ProductService (uses api-mocks/products.json)
- Generates: TypeScript types
- Generates: Component tests (22 tests, 86% coverage)
- Handoff: E2E test scenarios

**Task 1.3** → qa-specialist:
- Runs: Backend unit tests (28 tests ✅)
- Runs: Frontend unit tests (22 tests ✅)
- Runs: Integration tests (API endpoints)
- Runs: E2E tests (5 critical flows)
- All pass ✅, coverage 87.5%
- Handoff: Test report to devops

**Result**: Complete CRUD feature with 50+ tests, ready for deployment

---

### Example 2: Full-Stack Feature with CI/CD

**tasks.md**:
```markdown
1. Implement order management system
   1.1. Create order CRUD API with status workflow
   1.2. Create order dashboard UI with filters
   1.3. Add comprehensive testing
   1.4. Setup CI/CD pipeline for deployment
```

**Task 1.1** → backend-dev:
```
Generates:
  ✓ OrderController.java (REST endpoints)
  ✓ OrderService.java (business logic + status workflow)
  ✓ OrderRepository.java (Spring Data JPA)
  ✓ Order.java (entity with @Enumerated for status)
  ✓ OrderDTO, OrderCreateRequest, OrderUpdateRequest
  ✓ OrderNotFoundException, InvalidOrderStatusException
  ✓ Unit tests (35 tests, 91% coverage)
  ✓ api-mocks/orders.json

Handoff:
  5 endpoints: GET /orders, GET /orders/{id}, POST, PUT, DELETE
  Status workflow: PENDING → CONFIRMED → SHIPPED → DELIVERED
  Mock file: api-mocks/orders.json
```

**Task 1.2** → frontend-dev:
```
Generates:
  ✓ OrderDashboard.tsx (page with filters)
  ✓ OrderList.tsx (list with pagination)
  ✓ OrderCard.tsx (individual order)
  ✓ OrderForm.tsx (create/edit order)
  ✓ OrderStatusBadge.tsx (status display)
  ✓ OrderService.ts (uses api-mocks/orders.json)
  ✓ TypeScript types (Order, OrderStatus enum)
  ✓ useOrders.ts (custom hook)
  ✓ Component tests (28 tests, 84% coverage)

Handoff:
  E2E scenarios:
    1. Create order flow
    2. Change order status
    3. Filter orders by status
    4. Search orders
```

**Task 1.3** → qa-specialist:
```
Executes:
  ✓ Backend unit tests: 35 tests ✅
  ✓ Frontend unit tests: 28 tests ✅
  ✓ Integration tests: 15 API endpoint tests ✅
  ✓ E2E tests: 6 critical flows ✅
  ✓ Coverage: Backend 91%, Frontend 84%

Auto-fix (2 failures):
  ❌ Frontend test: OrderCard displays status incorrectly
  → Delegates to frontend-dev
  → frontend-dev fixes OrderStatusBadge.tsx
  → Re-run: ✅ All pass

Quality gates: ✅ All passed

Handoff:
  Test report: 78 total tests, 100% pass rate
  Ready for deployment
```

**Task 1.4** → devops-specialist:
```
Generates:
  ✓ .github/workflows/ci.yml (parallel backend+frontend tests)
  ✓ .github/workflows/deploy-staging.yml (auto-deploy on main)
  ✓ .github/workflows/deploy-production.yml (manual with approval)
  ✓ backend/Dockerfile (multi-stage Spring Boot)
  ✓ frontend/Dockerfile (multi-stage React + Nginx)
  ✓ docker-compose.yml (backend + frontend + postgres + redis)
  ✓ .dockerignore
  ✓ deployment-plan.md (complete guide)

Handoff:
  GitHub Actions setup instructions
  Secrets to configure: DOCKER_USERNAME, DATABASE_URL, etc.
  Deployment URLs: staging.myapp.com, myapp.com
```

**Result**: Production-ready feature with 78 tests, CI/CD pipeline, Docker setup!

---

### Example 3: Testing-Only Task

**tasks.md**:
```markdown
1. Add missing tests for authentication module
```

**Task 1** → qa-specialist (keyword: "tests"):
```
Analyzes:
  Existing code: AuthController, AuthService
  Current coverage: 62% (below 80% target)

Generates:
  ✓ AuthServiceTest.java (15 new tests)
  ✓ AuthController integration tests (8 tests)
  ✓ E2E: Login flow test (Playwright)

Executes:
  ✓ Run all tests: 23 tests ✅
  ✓ Coverage: 85% (above 80% target)

Result: Coverage increased from 62% to 85%
```

---

### Example 4: DevOps-Only Task

**tasks.md**:
```markdown
1. Add GitHub Actions CI/CD pipeline
```

**Task 1** → devops-specialist (keywords: "github actions", "ci/cd", "pipeline"):
```
Analyzes:
  Project structure: Java backend, React frontend
  Existing tests: JUnit (backend), Jest (frontend)

Generates:
  ✓ .github/workflows/ci.yml
    - Backend tests (mvn test)
    - Frontend tests (npm test)
    - E2E tests (npx playwright test)
    - Parallel execution
  ✓ .github/workflows/deploy-staging.yml
    - Docker build + push
    - SSH deploy to staging
    - Smoke tests
  ✓ Dockerfile (backend + frontend)
  ✓ docker-compose.yml
  ✓ deployment-plan.md

Handoff:
  Next steps:
    1. Configure GitHub Secrets
    2. Create GitHub Environments
    3. Push to trigger CI
```

---

## Customization

### Override Specialist Agents

**Use Case**: Project needs custom backend patterns

```bash
# Copy global agent to project
cp .claude/agents/backend-dev.md .claude/agents/

# Customize
vim .claude/agents/backend-dev.md

# Example changes:
# - Add custom DTO mapping pattern
# - Add project-specific validation rules
# - Change test coverage target to 90%
# - Add custom exception handling pattern

# Result: This project uses custom backend-dev
```

### Override Templates

**Use Case**: Project uses different API response format

```bash
# Copy global template to project
mkdir -p specwright/templates/team-development/backend
cp specwright/templates/team-development/backend/api-spec.md \
   specwright/templates/team-development/backend/

# Customize
vim specwright/templates/team-development/backend/api-spec.md

# Example changes:
# - Add GraphQL schema section
# - Change pagination format to cursor-based
# - Add custom error format

# Result: backend-dev uses custom template in this project
```

### Change Tech Stack

**Use Case**: Project uses Node.js instead of Java

```yaml
# specwright/config.yml (project-specific)
team_system:
  specialists:
    backend_dev:
      default_stack: nodejs_express
```

**Use Case**: Project uses Angular instead of React

```yaml
team_system:
  specialists:
    frontend_dev:
      default_framework: angular
```

### Adjust Quality Thresholds

**Use Case**: Critical application needs higher coverage

```yaml
team_system:
  specialists:
    qa_specialist:
      coverage_target: 90  # Increase from 80%

  quality_gates:
    coverage_minimum: 90
```

### Disable Specialists

**Use Case**: Handle DevOps manually for this project

```yaml
team_system:
  specialists:
    devops_specialist:
      enabled: false  # Manual DevOps
```

**Result**: DevOps tasks execute directly (not delegated)

---

## Troubleshooting

### Task Not Routing to Expected Specialist

**Problem**: Task should go to backend-dev but executes directly

**Debug**:
1. Check task description has backend keywords
2. Verify `team_system.enabled: true` in config.yml
3. Verify `task_routing.enabled: true`
4. Check specialist is enabled: `specialists.backend_dev.enabled: true`

**Solution**:
```markdown
# Add explicit keywords to task
1. Backend API: Create POST /api/users endpoint
```

### Specialist Not Found

**Problem**: Error: "Agent backend-dev not found"

**Cause**: Global installation missing or agent file not in .claude/agents/

**Solution**:
```bash
# Check global installation
ls .claude/agents/backend-dev.md

# If missing, run global setup
curl -sSL https://raw.githubusercontent.com/michsindlinger/specwright/main/setup-team-system-global.sh | bash
```

### Tests Failing After Specialist Implementation

**Problem**: qa-specialist reports test failures

**Expected**: Auto-fix loop should handle this (max 3 attempts)

**If Still Failing**:
- Review error message from qa-specialist
- Fix manually or adjust code
- Re-run /execute-tasks

**Prevention**:
```yaml
# Increase auto-fix attempts
qa_specialist:
  auto_fix_attempts: 5
```

### Wrong Tech Stack Generated

**Problem**: backend-dev generates Java but project uses Node.js

**Solution**:
```yaml
# Override in project config.yml
team_system:
  specialists:
    backend_dev:
      default_stack: nodejs_express
```

### Template Not Found

**Problem**: Specialist can't find template

**Cause**: Template not in project or global location

**Solution**:
```bash
# Check global templates exist
ls specwright/templates/team-development/backend/api-spec.md

# If missing, run global setup
bash setup-team-system-global.sh
```

### Skill Not Loading

**Problem**: Specialist doesn't have expected skill knowledge

**Cause**: Skill symlink missing or broken

**Solution**:
```bash
# Check skill symlinks
ls -la .claude/skills/

# Recreate symlinks
ln -sf specwright/skills/base/testing-best-practices.md \
       .claude/skills/testing-best-practices.md
```

### Coverage Below Target

**Problem**: qa-specialist reports coverage 75% (target: 80%)

**Expected**: qa-specialist should request more tests from specialist

**Manual Fix**:
```markdown
# Add specific task for missing tests
1. Add unit tests for UserService edge cases
   → Routes to backend-dev
   → Generates additional test cases
```

### CI/CD Pipeline Fails

**Problem**: GitHub Actions workflow fails

**Debug**:
1. Check GitHub Actions logs (detailed error)
2. Verify secrets configured in GitHub
3. Check deployment-plan.md for setup requirements

**Common Issues**:
- Missing GitHub Secrets → Configure in repo settings
- SSH key invalid → Regenerate and update secret
- Docker build fails → Check Dockerfile syntax

---

## FAQ

### Q: How do I enable Team System?

**A**: Add to `specwright/config.yml`:
```yaml
team_system:
  enabled: true
```

Then use `/execute-tasks` as normal. Smart routing activates automatically.

---

### Q: Can I use Team System with existing projects?

**A**: Yes! It's backward compatible. If `team_system.enabled: false` or not configured, `/execute-tasks` behaves exactly as before.

---

### Q: What if a task doesn't match any keywords?

**A**: Falls back to direct execution (current /execute-tasks behavior). No specialist routing for that task.

---

### Q: Can I mix routed and direct execution tasks?

**A**: Yes! Tasks with keywords → routed to specialists. Tasks without keywords → direct execution.

---

### Q: How do I override a specialist for one project?

**A**: Copy from global to project:
```bash
cp .claude/agents/backend-dev.md .claude/agents/
vim .claude/agents/backend-dev.md  # Customize
```

---

### Q: Can I use different tech stacks per project?

**A**: Yes! Configure in project's `specwright/config.yml`:
```yaml
team_system:
  specialists:
    backend_dev:
      default_stack: nodejs_express  # This project uses Node.js
```

---

### Q: How do specialists know which tech stack to use?

**A**: Detection order:
1. Check `active_profile` in config.yml
2. Check `default_stack` / `default_framework` in specialist config
3. Analyze project files (pom.xml → Java, package.json → Node.js/React/Angular)

---

### Q: What happens if tests fail during auto-fix?

**A**: qa-specialist tries up to 3 times (configurable):
1. Analyzes failure
2. Delegates fix to specialist
3. Re-runs tests
4. If still failing after 3 attempts → Reports to user, pauses workflow

---

### Q: Can I disable a specific specialist?

**A**: Yes:
```yaml
team_system:
  specialists:
    devops_specialist:
      enabled: false  # Handle DevOps manually
```

---

### Q: How do I see which specialist handled which task?

**A**: Git commits include co-author attribution:
```
Co-Authored-By: backend-dev <backend-dev@specwright>
Co-Authored-By: frontend-dev <frontend-dev@specwright>
Co-Authored-By: qa-specialist <qa-specialist@specwright>
```

---

### Q: Can I use Team System without Docker?

**A**: Yes:
```yaml
team_system:
  specialists:
    devops_specialist:
      containerization: none  # No Docker
```
DevOps specialist will generate CI/CD without Dockerfiles.

---

### Q: How do I adjust code coverage targets?

**A**: In `specwright/config.yml`:
```yaml
team_system:
  specialists:
    qa_specialist:
      coverage_target: 90  # Increase from 80%
  quality_gates:
    coverage_minimum: 90
```

---

### Q: What if I want guidance only (no code generation)?

**A**: Change code generation mode:
```yaml
team_system:
  specialists:
    backend_dev:
      code_generation: guidance  # Instructions only, no code
    frontend_dev:
      code_generation: scaffolding  # Basic structure only
```

---

### Q: How do handoffs work between specialists?

**A**: Each specialist generates handoff document:
- **backend-dev** → Creates API mocks + endpoint docs → **frontend-dev** reads before starting
- **frontend-dev** → Creates E2E test scenarios → **qa-specialist** reads before testing
- **qa-specialist** → Creates test report → **devops-specialist** reads for CI/CD setup

Handoffs stored in specialist output, not separate files (unless configured).

---

### Q: Can I see what the specialist is doing?

**A**: Yes! Task tool shows specialist execution in real-time. You'll see:
- Which specialist is active
- What files are being generated
- Test execution results
- Handoff summaries

---

### Q: Is Team System suitable for prototypes?

**A**: For quick prototypes, disable team system (overhead not worth it):
```yaml
team_system:
  enabled: false
```

For production features, enable team system (quality and consistency worth it).

---

### Q: How do I update global installation?

**A**: Re-run global setup:
```bash
curl -sSL https://raw.githubusercontent.com/michsindlinger/specwright/main/setup-team-system-global.sh | bash
```

Updates propagate to all projects (unless they have local overrides).

---

### Q: Can specialists work in parallel?

**A**: Not in MVP (Phase B). Sequential execution only:
```
Backend → Frontend → QA → DevOps
```

Parallel execution planned for Phase C:
```
Backend  ┐
         ├→ QA → DevOps
Frontend ┘
```

---

## Advanced Topics

### Custom Specialist Agent

**Use Case**: Add domain-specific specialist (e.g., ml-specialist)

**Steps**:
1. Create `.claude/agents/ml-specialist.md`
2. Define expertise, code generation patterns, skills
3. Add keywords to task routing (in execute-tasks.md)
4. Enable in config.yml

**Not officially supported yet** - planned for Phase C

---

### Template Inheritance

**Use Case**: Extend global template with project-specific sections

**Current**: Override completely (copy global → edit)

**Future**: Template inheritance with `extends:` frontmatter

---

### Multi-Agent Collaboration

**Use Case**: backend-dev and frontend-dev discuss API contract

**Current**: Sequential with handoffs

**Future (Phase E)**: Round-table discussions

---

## Performance Optimization

### Task Routing Performance

**Overhead**: <10% (keyword detection is very fast)

**Measurement**:
- Task analysis: ~50ms per task
- Specialist delegation: ~200ms setup
- Total overhead: <1 second for typical 10-task execution

**Optimization**: Keywords are simple string matching (no AI inference needed)

---

### Specialist Execution Time

**Typical Times** (for standard CRUD feature):

- **backend-dev**: 5-8 minutes (generate 10+ files, run tests)
- **frontend-dev**: 4-6 minutes (generate 8+ components, run tests)
- **qa-specialist**: 2-4 minutes (run all tests, analyze coverage)
- **devops-specialist**: 3-5 minutes (generate workflows, Docker config)

**Total**: 15-25 minutes for complete full-stack feature with tests and CI/CD

**Comparison**: Manual implementation typically 2-4 hours

---

## System Architecture

### Component Interaction

```
/execute-tasks (workflow)
    ↓
Task Routing Logic (execute-tasks.md Step 5)
    ↓
Specialist Agent (Task tool delegation)
    ↓
Skills Auto-Loading (based on role + tech stack)
    ↓
Template Usage (handoff generation)
    ↓
Code Generation + Testing
    ↓
Handoff to Next Specialist
    ↓
Quality Gates Verification (qa-specialist)
    ↓
Complete Implementation ✅
```

### File Locations

**Global**:
```
specwright/
├── skills/base/
│   ├── testing-best-practices.md
│   └── devops-patterns.md
├── templates/team-development/
│   ├── backend/ (4 templates)
│   ├── frontend/ (4 templates)
│   ├── qa/ (2 templates)
│   └── devops/ (2 templates)
├── workflows/
│   ├── core/execute-tasks.md (modified for routing)
│   └── team/README.md (this file)
└── config.yml (team_system section)

.claude/
├── agents/
│   ├── backend-dev.md
│   ├── frontend-dev.md
│   ├── qa-specialist.md
│   ├── devops-specialist.md
│   └── mock-generator.md
└── skills/
    ├── testing-best-practices.md → symlink
    └── devops-patterns.md → symlink
```

**Project (Overrides)**:
```
projekt/
├── specwright/
│   ├── templates/team-development/ (optional overrides)
│   └── config.yml (project-specific settings)
└── .claude/
    └── agents/ (optional overrides)
```

---

## Roadmap

### Phase B (Current - MVP)
✅ 4 Development specialists (backend, frontend, qa, devops)
✅ Smart task routing in /execute-tasks
✅ Sequential coordination
✅ API mock generation
✅ Auto-fix test failures
✅ Multi-stack support (Java/Node.js, React/Angular)

### Phase C (Future)
- ❌ Parallel execution (backend + frontend simultaneously)
- ❌ Real server lifecycle management (start/stop backend for integration)
- ❌ Advanced testing (visual regression, performance)

### Phase D (Future)
- ❌ Product team (product-manager, ux-designer, user-researcher)
- ❌ Advanced deployment (Kubernetes, AWS, multi-environment)

### Phase E (Future)
- ❌ Round-table discussions (multi-agent collaboration)
- ❌ Architecture reviews

### Phase F (Future)
- ❌ Scrum events (/write-user-stories, /plan-sprint, /daily-standup)

---

## Contributing

Found a bug or want to suggest improvements?

**Specialist Agent Issues**:
- Report in GitHub Issues with tag: `team-system`

**Template Improvements**:
- Submit PR with updated template
- Explain use case for change

**New Tech Stack Support**:
- Request in GitHub Issues
- Provide example project structure

---

## Related Documentation

- **Spec**: `specwright/specs/2025-12-28-team-development-system/spec.md`
- **Main README**: `README.md` (Team Development System section)
- **Config**: `specwright/config.yml` (team_system section)
- **Execute Tasks**: `specwright/workflows/core/execute-tasks.md` (routing logic)

---

**Team Development System v2.0 (Phase B)** - Coordinated feature development with specialist agents.

**Status**: ✅ Production Ready
