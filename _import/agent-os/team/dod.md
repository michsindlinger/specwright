# Definition of Done (DoD)

> Project: Agent OS Web UI
> Last Updated: 2026-01-30

## Overview

A story is considered DONE when all of the following criteria are met.

---

## Code Quality

### All Stories
- [ ] Code compiles without errors (`npm run build`)
- [ ] All tests pass (`npm test`)
- [ ] Linter passes (`npm run lint`)
- [ ] No console.log or debug statements in production code
- [ ] No hardcoded secrets or credentials
- [ ] No TODO comments without ticket reference

### TypeScript Specific
- [ ] No `any` types (strict mode enforced)
- [ ] All interfaces properly typed
- [ ] Proper null/undefined handling

---

## Testing

### Backend Stories
- [ ] Unit tests for new services/functions
- [ ] API route tests with supertest
- [ ] Error cases covered

### Frontend Stories
- [ ] Component tests with @open-wc/testing
- [ ] User interaction scenarios tested
- [ ] Accessibility tested (keyboard navigation)

### Full-Stack Stories
- [ ] Backend tests pass
- [ ] Frontend tests pass
- [ ] Integration verified manually

---

## Documentation

- [ ] Code is self-documenting (clear naming)
- [ ] Complex logic has comments explaining "why"
- [ ] Public APIs have JSDoc comments
- [ ] README updated if new setup steps required

---

## Accessibility (Frontend Stories)

- [ ] Keyboard navigation works
- [ ] ARIA labels on interactive elements
- [ ] Color contrast meets WCAG AA
- [ ] Focus indicators visible

---

## Performance

- [ ] No obvious performance issues
- [ ] Large lists use virtualization if > 100 items
- [ ] WebSocket connections properly managed
- [ ] No memory leaks (cleanup in disconnectedCallback)

---

## Security

- [ ] User input validated
- [ ] No XSS vulnerabilities
- [ ] No sensitive data in logs
- [ ] CORS configured correctly

---

## Review

- [ ] Self-review completed
- [ ] Acceptance criteria verified
- [ ] Manual testing performed

---

## Completion Checklist

When a story is done:
1. All checkboxes above are checked
2. Tests added and passing
3. No lint errors
4. Code builds successfully
5. Manual verification complete

---

*This document is referenced by the quality-gates skill and should be updated when project requirements change.*
