# Story Index

> Spec: [SPEC_NAME]
> Created: [CREATED_DATE]
> Last Updated: [LAST_UPDATED_DATE]

## Overview

This document provides an overview of all user stories for the [SPEC_NAME] specification.

**Total Stories**: [STORY_COUNT]
**Estimated Effort**: [TOTAL_EFFORT]

---

## Story Summary

| Story ID | Title | Type | Priority | Dependencies | Status | Points |
|----------|-------|------|----------|--------------|--------|--------|
| [STORY_ID] | [STORY_TITLE] | Backend/Frontend/DevOps/Test | Critical/High/Medium/Low | None or STORY-ID | Ready/Blocked | 1/2/3/5/8 |
| [STORY_ID] | [STORY_TITLE] | Backend/Frontend/DevOps/Test | Critical/High/Medium/Low | None or STORY-ID | Ready/Blocked | 1/2/3/5/8 |

---

## Dependency Graph

```
[STORY_ID-1] (No dependencies)
    ↓
[STORY_ID-2] (Depends on STORY-ID-1)
    ↓
[STORY_ID-3] (Depends on STORY-ID-2)
```

---

## Execution Plan

### Parallel Execution (No Dependencies)
- [STORY-ID-1]: [Story Title]
- [STORY-ID-2]: [Story Title]

### Sequential Execution (Has Dependencies)
1. [STORY-ID-3]: [Story Title] (depends on STORY-ID-1)
2. [STORY-ID-4]: [Story Title] (depends on STORY-ID-3)

---

## Story Files

Individual story files are located in the `stories/` subdirectory:

- `stories/story-001-[slug].md`
- `stories/story-002-[slug].md`
- `stories/story-003-[slug].md`

---

## Blocked Stories

The following stories are blocked due to incomplete DoR:

- **[STORY-ID]: [Story Title]**
  - Missing: [List missing DoR items]

---

## Template Usage Instructions

### Placeholders

**Document Level:**
- `[SPEC_NAME]`: Name of the parent specification
- `[CREATED_DATE]`: ISO date format (YYYY-MM-DD)
- `[LAST_UPDATED_DATE]`: ISO date format (YYYY-MM-DD)
- `[STORY_COUNT]`: Total number of stories
- `[TOTAL_EFFORT]`: Sum of all story estimates

**Story Level (in table):**
- `[STORY_ID]`: Unique identifier (e.g., PROF-001)
- `[STORY_TITLE]`: Brief descriptive title
- `[STORY_TYPE]`: Backend, Frontend, DevOps, Test
- `[PRIORITY]`: Critical, High, Medium, Low
- `[DEPENDENCIES]`: Other story IDs or "None"
- `[STATUS]`: Ready (DoR complete) or Blocked (DoR incomplete)
- `[POINTS]`: Story points (1, 2, 3, 5, 8)

### File Naming Convention

Story files should be named using the pattern:
```
story-[NUMBER]-[SLUG].md
```

Where:
- `[NUMBER]`: Sequential 3-digit number (001, 002, 003...)
- `[SLUG]`: URL-safe version of story title (lowercase, hyphens for spaces)

Examples:
- `story-001-create-user-profile-api.md`
- `story-002-user-authentication.md`
- `story-003-password-reset-flow.md`

### Status Values

- **Ready**: All DoR checkboxes are marked [x] - Story can be executed
- **Blocked**: Some DoR checkboxes are unchecked [ ] - Story needs architectural refinement

### Update Instructions

When stories are added, modified, or their status changes:

1. Update the Story Summary table
2. Update the Dependency Graph (if dependencies changed)
3. Update the Execution Plan (if execution order changed)
4. Update the Last Updated date
5. Add/remove blocked stories as needed
