# [SPEC_NAME] - Lite Summary

> Created: [CREATED_DATE]
> Full Spec: @.specwright/specs/[SPEC_FOLDER]/spec.md

[ELEVATOR_PITCH]

## Key Points

- [KEY_POINT_1]
- [KEY_POINT_2]
- [KEY_POINT_3]
- [KEY_POINT_4]
- [KEY_POINT_5]

## Quick Reference

- **Status**: [STATUS]
- **Timeline**: [ESTIMATED_TIMELINE]
- **Dependencies**: [DEPENDENCIES]
- **Team Members**: [TEAM_MEMBERS]

## Context Links

- Full Specification: @.specwright/specs/[SPEC_FOLDER]/spec.md
- User Stories: @.specwright/specs/[SPEC_FOLDER]/user-stories.md
- Technical Details: @.specwright/specs/[SPEC_FOLDER]/sub-specs/technical-spec.md
- Tasks: @.specwright/specs/[SPEC_FOLDER]/tasks.md

---

## Template Usage Instructions

### Purpose
The spec-lite document provides a condensed version of the full spec optimized for:
- Quick context loading by AI agents
- Team member onboarding
- Executive summaries
- Context window optimization

### Placeholders
- `[SPEC_NAME]`: Same as full spec
- `[CREATED_DATE]`: ISO date format (YYYY-MM-DD)
- `[SPEC_FOLDER]`: Date-prefixed folder name
- `[ELEVATOR_PITCH]`: 2-3 sentence description of the feature and its value
- `[KEY_POINT_1-5]`: Most important aspects (scope, goals, constraints, outcomes)
- `[STATUS]`: Current status
- `[ESTIMATED_TIMELINE]`: Time estimate or sprint allocation
- `[DEPENDENCIES]`: Other specs or systems this depends on
- `[TEAM_MEMBERS]`: Who's working on this

### Guidelines
- Keep under 200 words total
- Focus on "what" and "why", not "how"
- Highlight critical constraints or decisions
- Include links to full documentation
- Update when major changes occur in full spec

### Example
```markdown
# User Profile Management - Lite Summary

> Created: 2026-01-09
> Full Spec: @.specwright/specs/2026-01-09-user-profiles/spec.md

A comprehensive user profile management system enabling users to view, edit, and configure their personal information, preferences, and privacy settings through an intuitive interface.

## Key Points

- Profile editing with real-time validation
- Profile picture upload with cropping functionality
- Privacy and notification preference controls
- Email verification for sensitive changes
- Mobile-responsive design
- Complete test coverage required

## Quick Reference

- **Status**: Planning
- **Timeline**: 2 sprints (3 weeks)
- **Dependencies**: Authentication system (complete), Email service (in progress)
- **Team Members**: @developer-1, @designer-1

## Context Links

- Full Specification: @.specwright/specs/2026-01-09-user-profiles/spec.md
- User Stories: @.specwright/specs/2026-01-09-user-profiles/user-stories.md
- Technical Details: @.specwright/specs/2026-01-09-user-profiles/sub-specs/technical-spec.md
- Tasks: @.specwright/specs/2026-01-09-user-profiles/tasks.md
```
