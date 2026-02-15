# Code Style Guide

## Context

Universal code style rules for Agent OS projects.

**Framework-specific patterns** (React, Rails, Node.js, etc.) are defined in agent skills, not here.

---

## General Formatting

### Indentation
- Use 2 spaces for indentation (never tabs)
- Maintain consistent indentation throughout files
- Align nested structures for readability

### Naming Conventions
- **Methods and Variables**: Use snake_case (e.g., `user_profile`, `calculate_total`)
- **Classes and Modules**: Use PascalCase (e.g., `UserProfile`, `PaymentProcessor`)
- **Constants**: Use UPPER_SNAKE_CASE (e.g., `MAX_RETRY_COUNT`)

### String Formatting
- Use single quotes for strings: `'Hello World'`
- Use double quotes only when interpolation is needed
- Use template literals for multi-line strings or complex interpolation

### Code Comments
- Add brief comments above non-obvious business logic
- Document complex algorithms or calculations
- Explain the "why" behind implementation choices
- Never remove existing comments unless removing the associated code
- Update comments when modifying code to maintain accuracy
- Keep comments concise and relevant

### File Organization
- One class/component per file (unless tightly coupled)
- Group related files in directories
- Use index files for clean imports
- Keep files focused and cohesive

### Code Readability
- Maximum line length: 100-120 characters
- Blank lines between logical sections
- Consistent spacing around operators
- Clear variable and function names (self-documenting)

---

## Framework-Specific Patterns

Framework-specific code patterns (React hooks, Rails controllers, etc.) are defined in **agent skills**, not in this global style guide.

**Skills contain:**
- Component architecture patterns
- State management conventions
- API design patterns
- Database query patterns
- Testing patterns
- Framework best practices

**Where to find:**
- Frontend patterns: `frontend-dev skills` (ui-component-architecture, state-management, etc.)
- Backend patterns: `backend-dev skills` (logic-implementing, persistence-adapter, etc.)
- DevOps patterns: `devops skills` (pipeline-engineering, infrastructure-provisioning, etc.)

---

## Usage

**This file provides:** Universal formatting rules applicable to ALL code.

**Agent skills provide:** Framework and technology-specific patterns.

**DoD enforces:** Both universal style (from this file) and skill-specific patterns.
