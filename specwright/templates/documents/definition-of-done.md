# Definition of Done: [PROJECT_NAME]

> Version: 1.0
> Created: [DATE]
> Last Updated: [DATE]

---

## Overview

A User Story or Task is considered **DONE** when ALL applicable criteria below are met. This ensures consistent quality and completeness across the team.

---

## Code Quality

### General

- [ ] Code compiles/builds without errors
- [ ] Code follows project coding standards and conventions
- [ ] No linting errors or warnings (ESLint, Rubocop, etc.)
- [ ] No TypeScript errors (if applicable)
- [ ] No console.log or debug statements left in code
- [ ] No commented-out code blocks
- [ ] No hardcoded secrets, API keys, or credentials

### Architecture

- [ ] Code follows defined architecture patterns (see architecture-decision.md)
- [ ] Code is placed in correct layer/folder (see architecture-structure.md)
- [ ] Dependencies flow in correct direction (domain ← app ← infrastructure)
- [ ] No business logic in controllers/presentation layer
- [ ] Repository pattern used for data access

### Clean Code

- [ ] Functions/methods have single responsibility
- [ ] Functions are reasonably sized (< 30 lines recommended)
- [ ] Meaningful variable and function names
- [ ] No code duplication (DRY principle)
- [ ] Complex logic is documented with comments

---

## Testing

### Unit Tests

- [ ] Unit tests written for new business logic
- [ ] Unit tests cover happy path scenarios
- [ ] Unit tests cover edge cases and error scenarios
- [ ] All unit tests pass
- [ ] Code coverage meets minimum threshold: [X]%

### Integration Tests

- [ ] Integration tests written for new API endpoints
- [ ] Integration tests verify database interactions
- [ ] All integration tests pass

### E2E Tests (if applicable)

- [ ] E2E tests written for critical user flows
- [ ] E2E tests pass in CI environment

### Manual Testing

- [ ] Feature manually tested in development environment
- [ ] Feature tested across required browsers: [BROWSER_LIST]
- [ ] Feature tested on required devices: [DEVICE_LIST]

---

## Documentation

### Code Documentation

- [ ] Public APIs documented (JSDoc, RDoc, etc.)
- [ ] Complex algorithms explained in comments
- [ ] README updated if setup/usage changed

### User Documentation

- [ ] User-facing documentation updated (if applicable)
- [ ] API documentation updated (Swagger/OpenAPI)
- [ ] Changelog entry added (if applicable)

---

## Security

- [ ] Input validation implemented
- [ ] SQL injection prevention verified
- [ ] XSS prevention verified (output encoding)
- [ ] Authentication/authorization properly implemented
- [ ] Sensitive data encrypted or properly handled
- [ ] No security vulnerabilities introduced (dependency scan)

---

## Performance

- [ ] No N+1 queries introduced
- [ ] Database queries optimized (indexes used)
- [ ] No memory leaks introduced
- [ ] Performance within acceptable thresholds

---

## Accessibility (Frontend)

- [ ] Semantic HTML used
- [ ] ARIA attributes added where needed
- [ ] Keyboard navigation works
- [ ] Color contrast meets WCAG AA standards
- [ ] Screen reader tested (for critical features)

---

## Code Review

- [ ] Pull Request created with descriptive title and description
- [ ] PR linked to ticket/issue
- [ ] Code reviewed by at least [N] team member(s)
- [ ] All review comments addressed
- [ ] Approved by required reviewers

---

## Deployment

- [ ] Feature branch merged to development/main branch
- [ ] CI pipeline passes (build, tests, linting)
- [ ] No deployment blockers
- [ ] Feature verified in staging environment
- [ ] Rollback plan identified (if applicable)

---

## Acceptance

- [ ] Acceptance criteria from User Story met
- [ ] Product Owner/Stakeholder accepted (if required)
- [ ] No open blockers or dependencies

---

## Quick Checklist by Type

### For Bug Fixes

- [ ] Root cause identified and documented
- [ ] Fix addresses root cause (not just symptom)
- [ ] Regression test added
- [ ] Bug cannot be reproduced after fix

### For New Features

- [ ] Feature complete as per acceptance criteria
- [ ] Feature flag implemented (if applicable)
- [ ] Analytics/tracking implemented (if applicable)
- [ ] Feature documented

### For Refactoring

- [ ] Behavior unchanged (existing tests still pass)
- [ ] No new bugs introduced
- [ ] Performance not degraded
- [ ] Architecture improvements documented

### For API Changes

- [ ] API versioned appropriately
- [ ] Backward compatibility maintained (or migration path provided)
- [ ] API documentation updated
- [ ] Client impact assessed

---

## Exceptions

The following items may be waived with explicit approval:

| Item | Approver | Reason for Exception |
|------|----------|---------------------|
| [ITEM] | [ROLE] | [VALID_REASONS] |

---

## Review Schedule

This Definition of Done should be reviewed and updated:
- Quarterly (minimum)
- When team composition changes significantly
- When project requirements change
- When quality issues are identified

---

## References

- Architecture Decision: @specwright/product/architecture-decision.md
- Architecture Structure: @specwright/product/architecture-structure.md
- Code Style Guide: @specwright/standards/code-style.md
