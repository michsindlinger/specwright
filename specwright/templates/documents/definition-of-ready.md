# Definition of Ready: [PROJECT_NAME]

> Version: 1.0
> Created: [DATE]
> Last Updated: [DATE]

---

## Overview

A User Story or Task is considered **READY** for development when ALL applicable criteria below are met. This ensures the development team has everything needed to start work without blockers.

---

## User Story Criteria

### Story Format

- [ ] User Story follows standard format:
  ```
  As a [USER_TYPE]
  I want to [ACTION]
  So that [BENEFIT]
  ```
- [ ] Story title is clear and descriptive
- [ ] Story is linked to Epic/Feature (if applicable)

### Clarity

- [ ] Story is understandable without additional context
- [ ] Business value is clearly articulated
- [ ] Target user/persona is identified
- [ ] Scope is well-defined (what's in/out)

### Size

- [ ] Story is small enough to complete in one sprint
- [ ] Story has been estimated by the team
- [ ] Story effort is ≤ [X] story points (or [Y] days)
- [ ] If too large, story has been split

---

## Acceptance Criteria

### Format

- [ ] Acceptance criteria written in Given/When/Then format:
  ```
  Given [PRECONDITION]
  When [ACTION]
  Then [EXPECTED_RESULT]
  ```
- [ ] OR as a checklist of verifiable outcomes

### Completeness

- [ ] All happy path scenarios covered
- [ ] Edge cases identified and documented
- [ ] Error scenarios specified
- [ ] Minimum of [3] acceptance criteria defined
- [ ] Criteria are testable (not vague)

### Examples

- [ ] Concrete examples provided for complex logic
- [ ] Sample data provided (if applicable)
- [ ] Expected behavior clearly described

---

## Technical Requirements

### Design & UX

- [ ] UI/UX design available (if UI changes)
- [ ] Design reviewed and approved
- [ ] Responsive requirements specified
- [ ] Accessibility requirements noted

### Technical Details

- [ ] API contracts defined (if applicable)
- [ ] Data model changes documented (if applicable)
- [ ] Integration points identified
- [ ] Performance requirements specified (if applicable)

### Dependencies

- [ ] External dependencies identified
- [ ] Dependent stories/tasks completed or planned
- [ ] Third-party services available
- [ ] Required data/content available

---

## Architecture & Design

### Architecture Fit

- [ ] Fits within existing architecture
- [ ] Architecture changes documented (if any)
- [ ] Security implications reviewed

### Technical Approach

- [ ] Technical approach discussed (if complex)
- [ ] Spikes completed (if needed)
- [ ] Risks identified and mitigated

---

## Estimation

### Story Points / Effort

- [ ] Story estimated by development team
- [ ] Estimate considers all work (dev, test, docs)
- [ ] Team confident in estimate

### Capacity

- [ ] Fits within sprint capacity
- [ ] No resource conflicts identified

---

## Stakeholder Alignment

### Approval

- [ ] Product Owner approved the story
- [ ] Stakeholders aligned on requirements
- [ ] No conflicting requirements

### Priority

- [ ] Priority is clear
- [ ] Story is in prioritized backlog
- [ ] Dependencies on other teams coordinated

---

## Quick Checklist

### Minimum Requirements (All Stories)

- [ ] Clear title and description
- [ ] User Story format complete
- [ ] At least 3 acceptance criteria
- [ ] Estimated by team
- [ ] No blocking dependencies
- [ ] Product Owner approved

### Additional for UI Stories

- [ ] Design mockups attached
- [ ] Responsive breakpoints defined
- [ ] Component library components identified

### Additional for API Stories

- [ ] API specification defined
- [ ] Request/Response examples provided
- [ ] Error codes documented

### Additional for Database Stories

- [ ] Data model documented
- [ ] Migration strategy defined
- [ ] Performance considerations noted

### Additional for Integration Stories

- [ ] Third-party API documentation available
- [ ] Credentials/access available
- [ ] Error handling defined

---

## INVEST Criteria

Use INVEST to validate story quality:

| Criterion | Question | Status |
|-----------|----------|--------|
| **I**ndependent | Can be developed independently? | [ ] |
| **N**egotiable | Scope can be discussed? | [ ] |
| **V**aluable | Delivers value to users? | [ ] |
| **E**stimable | Team can estimate it? | [ ] |
| **S**mall | Small enough for one sprint? | [ ] |
| **T**estable | Can be verified when done? | [ ] |

---

## Red Flags (Not Ready If...)

The story is **NOT READY** if any of these apply:

- [ ] "TBD" or "[PLACEHOLDER]" text in description
- [ ] Missing acceptance criteria
- [ ] Depends on unstarted work
- [ ] Requires unavailable third-party service
- [ ] Design not finalized for UI story
- [ ] No estimate from team
- [ ] Unclear who the user is
- [ ] Scope is unbounded ("make it better")

---

## Refinement Process

### Before Refinement

1. Product Owner drafts story
2. Technical lead reviews feasibility
3. Story added to refinement backlog

### During Refinement

1. Team discusses requirements
2. Questions answered
3. Acceptance criteria refined
4. Story estimated
5. Definition of Ready checklist completed

### After Refinement

1. Story moves to "Ready" column
2. Available for sprint planning
3. Can be pulled into sprint

---

## Templates

### User Story Template

```markdown
## User Story

**As a** [USER_TYPE]
**I want to** [ACTION]
**So that** [BENEFIT]

## Description

[ADDITIONAL_CONTEXT]

## Acceptance Criteria

1. **Given** [PRECONDITION]
   **When** [ACTION]
   **Then** [EXPECTED_RESULT]

2. **Given** [PRECONDITION]
   **When** [ACTION]
   **Then** [EXPECTED_RESULT]

3. **Given** [PRECONDITION]
   **When** [ACTION]
   **Then** [EXPECTED_RESULT]

## Out of Scope

- [ITEM_1]
- [ITEM_2]

## Technical Notes

[TECHNICAL_CONSIDERATIONS]

## Design

[LINK_TO_DESIGN]

## Dependencies

- [DEPENDENCY_1]
- [DEPENDENCY_2]
```

---

## Review Schedule

This Definition of Ready should be reviewed:
- Quarterly (minimum)
- When team velocity changes significantly
- When quality issues traced to poor requirements
- When onboarding new team members

---

## References

- Definition of Done: @specwright/product/definition-of-done.md
- Product Brief: @specwright/product/product-brief.md
