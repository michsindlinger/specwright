---
description: Error Handling Protocols - shared across all phases
version: 4.0
---

# Error Handling Protocols

## Blocking Issues

```
UPDATE: kanban.json → stories[storyId].status = "blocked"
UPDATE: resumeContext.lastAction = "Blocked: [reason]"
ADD: changeLog entry with action "story_blocked"
NOTIFY: User via output message
STOP: Phase (user can resume after resolving via /execute-tasks)
```

## Implementation Failures

```
RETRY: Up to 2 times with different approach
IF still failing:
  UPDATE: kanban.json → resumeContext.lastAction = "Failed: [details]"
  ADD: changeLog entry with action "implementation_failed"
  ESCALATE: To user with clear description of what failed
  STOP: Phase
```

## Common Error Scenarios

| Error | Action |
|-------|--------|
| Story has unmet dependencies | Skip story, select next eligible |
| All stories blocked | Stop execution, inform user |
| Git conflict | Stop, ask user to resolve |
| Test failures | Main agent fixes and re-runs |
| Integration failure | Create integration-fix story |
| MCP tool unavailable | Fall back to direct JSON file read/write |
| kanban.json corrupted | Attempt recovery from changeLog, else ask user |
