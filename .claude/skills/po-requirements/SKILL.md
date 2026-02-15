---
description: Product Owner requirements gathering and story creation for Agent OS Web UI
globs: []
alwaysApply: false
---

# PO Requirements Skill

> Project: Agent OS Web UI
> Generated: 2026-01-30
> Purpose: Guide for gathering requirements and creating user stories

## When to Use

This skill guides you when:
- Creating new user stories with `/create-spec`
- Adding stories with `/add-story`
- Adding quick tasks with `/add-todo`
- Creating bug stories with `/add-bug`

## Quick Reference

### User Story Format
```gherkin
Feature: [Feature Name]
  Als [User Role]
  möchte ich [Action],
  damit [Benefit].
```

### Acceptance Criteria (Gherkin)
- **Ein Verhalten pro Szenario**: Fokussiert und testbar
- **Konkrete Werte**: "100€" nicht "einen Betrag"
- **Nutzer-Perspektive**: WAS passiert, nicht WIE
- **Max 2-3 "And" Steps**: Pro Given/When/Then

### Requirements Dialog Questions

**Story Context:**
1. Was soll erreicht werden?
2. Wer braucht das? (User Role)
3. Warum ist das wichtig? (Business Value)

**Story Details:**
4. Was sind die Akzeptanzkriterien? (2-5 Szenarien)
5. Welche Edge Cases gibt es?
6. Gibt es Abhängigkeiten zu anderen Stories?

**Prioritization:**
7. Wie kritisch ist das? (Critical/High/Medium/Low)
8. Welcher User-Type profitiert am meisten?

---

## Detailed Guidance

### Gherkin Best Practices

**Good Example:**
```gherkin
Scenario: Erfolgreiche Projekt-Auswahl
  Given ich bin auf der Dashboard-Seite
  And multiple Projekte sind in der config.json definiert
  When ich auf das Projekt-Dropdown klicke
  And ich "my-saas-project" auswähle
  Then wird das Dashboard für my-saas-project geladen
  And die Sidebar zeigt den Projektnamen an
```

**Bad Example (avoid):**
```gherkin
# ❌ Zu technisch, mehrere Verhaltensweisen
Scenario: Projekt wechseln und Daten laden
  Given ich navigiere zu /dashboard
  When ich das Dropdown öffne und klicke
  Then wird ein GET zu /api/projects/:id gemacht
  And die Datenbank enthält die Projekte
```

### Story Sizing

**XS (1 SP):** Single file, < 50 LOC
- Beispiel: "Add loading spinner to aos-button"

**S (2-3 SP):** 2-3 files, < 200 LOC
- Beispiel: "User can switch between projects"

**M (5 SP):** 4-5 files, < 400 LOC
- Beispiel: "Chat message streaming with WebSocket"

**Too Large:**
- If > 5 files or > 400 LOC: Split into multiple stories
- If multiple features: Create separate stories

### Priority Guidelines

**Critical:**
- System doesn't work without it
- Blocker for other work
- Security issue

**High:**
- Important for MVP release
- High user value
- Core feature (Dashboard, Chat, Workflow)

**Medium:**
- Nice to have
- Improves UX
- Polish items

**Low:**
- Future enhancement
- Edge case
- Rarely used

---

## Project-Specific Patterns

### Agent OS Web UI User Roles

- **Developer**: Primary user, uses all three views
- **Power User**: Uses keyboard shortcuts, command palette

### Common Story Types

**Dashboard/Kanban:**
```gherkin
Feature: Kanban Card Drag-Drop
  Als Developer
  möchte ich Tasks zwischen Spalten ziehen,
  damit ich den Status schnell ändern kann.
```

**Chat Interface:**
```gherkin
Feature: Chat Message Streaming
  Als Developer
  möchte ich Claude's Antwort in Echtzeit sehen,
  damit ich den Fortschritt verfolgen kann.
```

**Workflow Execution:**
```gherkin
Feature: Workflow Progress Display
  Als Developer
  möchte ich den Fortschritt meiner Workflows sehen,
  damit ich weiß welcher Schritt gerade läuft.
```

---

## Checklist for Good Stories

When creating a story, verify:
- [ ] Clear user role (Developer, Power User)
- [ ] Specific action (was?)
- [ ] Clear benefit (warum?)
- [ ] 2-5 concrete acceptance criteria
- [ ] Appropriate size (XS/S/M)
- [ ] No technical implementation details
- [ ] Testable scenarios
- [ ] Dependencies identified
