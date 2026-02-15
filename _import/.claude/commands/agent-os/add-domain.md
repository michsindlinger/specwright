# Add Domain

Add or update a business domain area in the domain skill.

## Purpose

Document business processes and domain knowledge that the agent will keep updated during development.

## When to Use

- Starting work on a new feature area
- Documenting existing business logic
- Creating process documentation
- Formalizing domain knowledge

## Usage

```bash
# Interactive mode (recommended)
/add-domain

# With domain name
/add-domain "User Registration"
```

## What It Does

1. Creates domain skill if it doesn't exist
2. Asks for domain area name (if not provided)
3. Asks for process description
4. Creates domain process document from template
5. Updates domain skill index

## Example Output

Creates: `.claude/skills/domain-[project]/user-registration.md`

```markdown
# User Registration

## Overview
User registration process for new accounts...

## Process Flow
1. User submits registration form
2. System validates email uniqueness
3. System creates account
4. System sends verification email

## Business Rules
1. Email must be unique
2. Password minimum 8 characters
3. Email verification required within 24h
```

## Self-Updating

The agent automatically updates this document when:
- Business logic changes
- Process flow is modified
- New rules are added

Refer to the instructions located in @agent-os/workflows/core/add-domain.md
