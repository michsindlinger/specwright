# Architecture Structure: [PROJECT_NAME]

> Version: 1.0
> Created: [DATE]
> Architecture: [HEXAGONAL | CLEAN | DDD | LAYERED]

---

## Overview

This document describes the file and folder organization for the project, based on the chosen architecture pattern. It serves as a reference for where different types of code should be placed.

---

## Project Root Structure

```
[PROJECT_ROOT]/
├── backend/                    # Backend application
├── frontend/                   # Frontend application
├── infrastructure/             # Infrastructure as Code
├── docs/                       # Documentation
├── scripts/                    # Build and utility scripts
├── .specwright/                  # Specwright configuration
└── docker-compose.yml          # Local development setup
```

---

## Backend Structure

### [ARCHITECTURE_PATTERN] Layout

```
backend/
├── src/
│   ├── domain/                 # Domain Layer (Core Business Logic)
│   │   ├── entities/           # Domain Entities
│   │   ├── value-objects/      # Value Objects
│   │   ├── services/           # Domain Services
│   │   ├── events/             # Domain Events
│   │   └── repositories/       # Repository Interfaces (Ports)
│   │
│   ├── application/            # Application Layer (Use Cases)
│   │   ├── use-cases/          # Application Use Cases
│   │   ├── services/           # Application Services
│   │   ├── dtos/               # Data Transfer Objects
│   │   ├── commands/           # Command Handlers (CQRS)
│   │   └── queries/            # Query Handlers (CQRS)
│   │
│   ├── infrastructure/         # Infrastructure Layer (Adapters)
│   │   ├── persistence/        # Database Implementations
│   │   │   ├── repositories/   # Repository Implementations
│   │   │   ├── migrations/     # Database Migrations
│   │   │   └── seeds/          # Seed Data
│   │   ├── external/           # External Service Adapters
│   │   │   ├── email/          # Email Service
│   │   │   ├── payment/        # Payment Gateway
│   │   │   └── storage/        # File Storage
│   │   ├── messaging/          # Message Queue Adapters
│   │   └── config/             # Configuration
│   │
│   ├── presentation/           # Presentation Layer (Controllers)
│   │   ├── rest/               # REST API Controllers
│   │   │   ├── controllers/    # Route Handlers
│   │   │   ├── middleware/     # HTTP Middleware
│   │   │   └── validators/     # Request Validators
│   │   ├── graphql/            # GraphQL Resolvers (if used)
│   │   └── websocket/          # WebSocket Handlers (if used)
│   │
│   └── shared/                 # Shared Utilities
│       ├── errors/             # Custom Error Classes
│       ├── utils/              # Utility Functions
│       └── types/              # Shared Type Definitions
│
├── tests/
│   ├── unit/                   # Unit Tests
│   ├── integration/            # Integration Tests
│   └── e2e/                    # End-to-End Tests
│
├── config/                     # Configuration Files
└── [FRAMEWORK_CONFIG_FILES]    # Framework-specific configs
```

---

## Frontend Structure

```
frontend/
├── src/
│   ├── components/             # Reusable UI Components
│   │   ├── common/             # Generic components (Button, Input)
│   │   ├── layout/             # Layout components (Header, Footer)
│   │   └── [feature]/          # Feature-specific components
│   │
│   ├── pages/                  # Page Components / Routes
│   │   ├── home/
│   │   ├── auth/
│   │   └── [feature]/
│   │
│   ├── features/               # Feature Modules (if using feature-based)
│   │   └── [feature]/
│   │       ├── components/     # Feature components
│   │       ├── hooks/          # Feature hooks
│   │       ├── services/       # Feature API services
│   │       └── types/          # Feature types
│   │
│   ├── services/               # API Services
│   │   ├── api/                # API Client
│   │   └── [domain]/           # Domain-specific services
│   │
│   ├── stores/                 # State Management
│   │   ├── [store]/            # Individual stores
│   │   └── index.ts            # Store configuration
│   │
│   ├── hooks/                  # Custom React Hooks
│   │
│   ├── utils/                  # Utility Functions
│   │
│   ├── types/                  # TypeScript Types
│   │
│   ├── styles/                 # Global Styles
│   │   ├── globals.css
│   │   └── variables.css
│   │
│   └── assets/                 # Static Assets
│       ├── images/
│       ├── fonts/
│       └── icons/
│
├── public/                     # Public Static Files
├── tests/                      # Test Files
│   ├── unit/
│   ├── integration/
│   └── e2e/
│
└── [FRAMEWORK_CONFIG_FILES]    # Framework-specific configs
```

---

## File Placement Rules

### Backend Rules

| File Type | Location | Naming Convention |
|-----------|----------|-------------------|
| Domain Entity | `src/domain/entities/` | `[Entity].ts` |
| Value Object | `src/domain/value-objects/` | `[ValueObject].ts` |
| Repository Interface | `src/domain/repositories/` | `[Entity]Repository.ts` |
| Repository Implementation | `src/infrastructure/persistence/repositories/` | `[Entity]RepositoryImpl.ts` |
| Use Case | `src/application/use-cases/` | `[Action][Entity]UseCase.ts` |
| DTO | `src/application/dtos/` | `[Entity]Dto.ts` |
| Controller | `src/presentation/rest/controllers/` | `[Entity]Controller.ts` |
| Middleware | `src/presentation/rest/middleware/` | `[Name]Middleware.ts` |
| Migration | `src/infrastructure/persistence/migrations/` | `[TIMESTAMP]_[description].ts` |
| Unit Test | `tests/unit/[layer]/` | `[FileName].test.ts` |
| Integration Test | `tests/integration/` | `[Feature].integration.test.ts` |

### Frontend Rules

| File Type | Location | Naming Convention |
|-----------|----------|-------------------|
| Component | `src/components/[category]/` | `[ComponentName].tsx` |
| Page | `src/pages/[feature]/` | `[PageName]Page.tsx` |
| Hook | `src/hooks/` | `use[HookName].ts` |
| Service | `src/services/[domain]/` | `[domain]Service.ts` |
| Store | `src/stores/[store]/` | `[store]Store.ts` |
| Type | `src/types/` | `[domain].types.ts` |
| Utility | `src/utils/` | `[name].ts` |
| Component Test | `src/components/[category]/` | `[ComponentName].test.tsx` |

---

## Module Dependencies

### Allowed Dependencies

```
presentation → application → domain
infrastructure → domain
infrastructure → application

domain → (nothing external)
application → domain only
presentation → application, domain
infrastructure → application, domain
```

### Forbidden Dependencies

```
domain → infrastructure (NEVER)
domain → presentation (NEVER)
domain → application (NEVER - domain is the core)
application → infrastructure (use dependency injection)
application → presentation (NEVER)
```

---

## Naming Conventions

### Files

| Type | Convention | Example |
|------|------------|---------|
| Entity | PascalCase | `User.ts` |
| Service | PascalCase + Suffix | `UserService.ts` |
| Controller | PascalCase + Suffix | `UserController.ts` |
| Repository | PascalCase + Suffix | `UserRepository.ts` |
| Use Case | PascalCase + Suffix | `CreateUserUseCase.ts` |
| DTO | PascalCase + Suffix | `CreateUserDto.ts` |
| Test | Original + .test | `User.test.ts` |
| Migration | Timestamp + snake_case | `20240101120000_create_users.ts` |

### Directories

| Type | Convention | Example |
|------|------------|---------|
| Feature | kebab-case | `user-management/` |
| Component Category | kebab-case | `form-elements/` |
| Domain | kebab-case | `order-processing/` |

---

## Example Module: User Management

### Backend

```
src/
├── domain/
│   ├── entities/
│   │   └── User.ts
│   ├── value-objects/
│   │   └── Email.ts
│   └── repositories/
│       └── UserRepository.ts
├── application/
│   ├── use-cases/
│   │   ├── CreateUserUseCase.ts
│   │   ├── GetUserUseCase.ts
│   │   └── UpdateUserUseCase.ts
│   └── dtos/
│       ├── CreateUserDto.ts
│       └── UserResponseDto.ts
├── infrastructure/
│   └── persistence/
│       └── repositories/
│           └── UserRepositoryImpl.ts
└── presentation/
    └── rest/
        └── controllers/
            └── UserController.ts
```

### Frontend

```
src/
├── features/
│   └── user-management/
│       ├── components/
│       │   ├── UserList.tsx
│       │   ├── UserForm.tsx
│       │   └── UserCard.tsx
│       ├── hooks/
│       │   └── useUsers.ts
│       ├── services/
│       │   └── userService.ts
│       └── types/
│           └── user.types.ts
└── pages/
    └── users/
        ├── UsersPage.tsx
        └── UserDetailPage.tsx
```

---

## Validation Checklist

### Before Creating a New File

- [ ] Does the file belong to the correct layer?
- [ ] Does the file follow naming conventions?
- [ ] Are the imports respecting dependency rules?
- [ ] Is there a corresponding test file?

### Code Review Checklist

- [ ] No domain layer imports from infrastructure
- [ ] No business logic in controllers
- [ ] DTOs used at layer boundaries
- [ ] Repository pattern used for data access

---

## Tools for Enforcement

### Recommended

- **ESLint/TSLint Rules:** Enforce import restrictions
- **Architecture Tests:** Validate layer dependencies
- **Pre-commit Hooks:** Block violations before commit

### Example ESLint Rule

```json
{
  "rules": {
    "import/no-restricted-paths": [
      "error",
      {
        "zones": [
          {
            "target": "./src/domain",
            "from": "./src/infrastructure"
          }
        ]
      }
    ]
  }
}
```

---

## References

- Architecture Decision: @specwright/product/architecture-decision.md
- Tech Stack: @specwright/product/tech-stack.md
