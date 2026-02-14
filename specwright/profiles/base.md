---
name: "Base"
inherits: null
description: "Base profile with universal standards applicable to all project types"
version: "2.0.0"
tech_stack:
  version_control: "Git"
  documentation: "Markdown"
skills:
  - security-best-practices
  - git-workflow-patterns
  - code-review-standards
---

# Base Profile

This is the base profile that all other profiles inherit from. It contains universal standards and best practices applicable to any software development project.

## Included Standards

### Security Best Practices
- Input validation
- Authentication and authorization
- Data encryption
- Secure communication (HTTPS)
- Secret management

### Git Workflow
- Branch naming conventions
- Commit message standards
- Pull request process
- Code review guidelines

### Code Quality
- Consistent formatting
- Clear naming conventions
- Self-documenting code
- Minimal comments (only where necessary)

### Documentation Standards
- README.md for every project
- Inline documentation for complex logic
- API documentation for public interfaces
- Architecture decision records (ADRs) for significant decisions

## Usage

This profile is automatically inherited by all specialized profiles. You typically won't use this profile directly, but rather one of the specialized profiles like `java-spring-boot`, `react-frontend`, or `angular-frontend`.

## Profile Inheritance

```
base
 ├── java-spring-boot
 ├── react-frontend
 └── angular-frontend
```

All specialized profiles inherit these universal standards and add their own specific guidelines on top.
