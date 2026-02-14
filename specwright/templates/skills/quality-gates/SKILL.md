---
description: Universal quality standards and checklists for [PROJECT_NAME]
globs: []
alwaysApply: true
---

# Quality Gates

> Project: [PROJECT_NAME]
> Generated: [DATE]
> Purpose: Universal quality standards applied to ALL code changes

## Before Every Commit

- [ ] Code compiles without errors
- [ ] All tests pass (`[TEST_COMMAND]`)
- [ ] Linter passes (`[LINT_COMMAND]`)
- [ ] No console.log / debug statements left in code
- [ ] No hardcoded secrets or credentials
- [ ] No TODO comments without ticket reference

## Code Review Checklist

- [ ] Follows project coding conventions
- [ ] No obvious security vulnerabilities
- [ ] Error handling is implemented
- [ ] Edge cases are considered
- [ ] No code duplication (DRY principle)
- [ ] Functions/methods are focused (single responsibility)

## Performance Checklist

- [ ] No N+1 queries (for database operations)
- [ ] Large data sets are paginated
- [ ] Expensive operations are cached where appropriate
- [ ] No memory leaks (event listeners cleaned up, subscriptions unsubscribed)

## Accessibility Checklist (Frontend)

- [ ] Images have alt text
- [ ] Form inputs have labels
- [ ] Color contrast meets WCAG standards
- [ ] Keyboard navigation works

---

## Self-Learning Rules

**WICHTIG:** Diese Regeln sind aktiv während JEDER Implementierung.

### Technische Erkenntnisse dokumentieren

Wenn du während der Implementierung lernst:
- Etwas funktioniert nicht wie erwartet
- Du brauchst mehrere Anläufe
- Du findest einen besseren Ansatz

**→ Dokumentiere es in der entsprechenden `dos-and-donts.md` Datei:**

```
.claude/skills/frontend-[framework]/dos-and-donts.md  # Frontend Learnings
.claude/skills/backend-[framework]/dos-and-donts.md   # Backend Learnings
.claude/skills/devops-[stack]/dos-and-donts.md        # DevOps Learnings
```

**Format für Einträge:**
```markdown
### [DATUM] - [Kurzer Titel]
**Context:** Was du versucht hast
**Issue:** Was nicht funktioniert hat
**Solution:** Was funktioniert hat
```

### Fachliche Änderungen dokumentieren

Wenn du Code änderst der Geschäftslogik betrifft:

1. Prüfe ob ein Domain-Dokument existiert: `.claude/skills/domain-[projekt]/`
2. Wenn ja: Aktualisiere das entsprechende Prozess-Dokument
3. Wenn die Beschreibung nicht mehr stimmt: Korrigiere sie
4. Wenn ein neuer Prozess entsteht: Erstelle ein neues Dokument

**→ Domain-Dokumentation soll IMMER aktuell sein.**

---

## Definition of Done Reference

Für projektspezifische DoD siehe: `specwright/team/dod.md`

## Definition of Ready Reference

Für Story-Readiness-Kriterien siehe: `specwright/team/dor.md`
