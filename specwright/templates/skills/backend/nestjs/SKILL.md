---
description: NestJS backend development patterns for [PROJECT_NAME]
globs:
  - "src/**/*.ts"
  - "src/**/*.module.ts"
  - "src/**/*.controller.ts"
  - "src/**/*.service.ts"
alwaysApply: false
---

# NestJS Backend Skill

> Project: [PROJECT_NAME]
> Framework: NestJS [VERSION]
> Generated: [DATE]

## Quick Reference

### Modules
- Feature modules for organization
- Shared modules for common functionality
- Global modules for app-wide services

### Controllers
- Handle HTTP requests
- Use decorators for routing
- Delegate to services

### Services
- Business logic
- Injectable via DI
- Database operations

### DTOs
- Input validation with class-validator
- Transform with class-transformer

## Available Modules

| Module | File | Use When |
|--------|------|----------|
| Service Patterns | services.md | Business logic |
| Controller Patterns | api-design.md | REST APIs |
| Database | models.md | TypeORM/Prisma |
| Testing | testing.md | Jest testing |
| Dos and Don'ts | dos-and-donts.md | Project learnings |

## Project Context

### Tech Stack
<!-- Extracted from specwright/product/tech-stack.md -->
- **Framework:** NestJS [NESTJS_VERSION]
- **Node Version:** [NODE_VERSION]
- **Database:** [DATABASE]
- **ORM:** [ORM_LIBRARY]
- **Testing:** [TESTING_FRAMEWORK]
- **Authentication:** [AUTH_LIBRARY]

### Architecture Patterns
<!-- Extracted from specwright/product/architecture-decision.md -->

**Service Layer:**
[SERVICE_LAYER_PATTERN]

**API Design:**
[API_DESIGN_PATTERN]

**Data Access:**
[DATA_ACCESS_PATTERN]

**Error Handling:**
[ERROR_HANDLING_PATTERN]

### Project Structure
<!-- Extracted from specwright/product/architecture-structure.md -->
```
[PROJECT_STRUCTURE]
```

### Naming Conventions
[NAMING_CONVENTIONS]

---

## Self-Learning

→ Füge Erkenntnisse zu `dos-and-donts.md` hinzu.
