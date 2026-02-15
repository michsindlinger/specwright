# Change Spec

Manage changes to existing specifications with status checking, implementation verification, and story adjustment.

This command handles the complete change workflow:
1. Checks current spec status (spec.md, spec-lite.md, story statuses)
2. Verifies implementation state matches spec status
3. Interactively clarifies your change requirements
4. Creates detailed implementation plan
5. Evaluates and adjusts existing stories (in-progress and backlog)
6. Creates new stories or rollback stories as needed

**Story Adjustments:**
- Delete stories that are no longer relevant
- Update stories that need modification
- Create new stories for new requirements
- Create rollback stories when completed features need to be reverted

Refer to the instructions located in agent-os/workflows/core/change-spec.md
