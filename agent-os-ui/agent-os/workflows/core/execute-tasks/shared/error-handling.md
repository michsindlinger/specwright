---
description: Error Handling Protocols - shared across all phases
version: 3.0
---

# Error Handling Protocols

## Blocking Issues

```
UPDATE: kanban-board.md → Story status = Blocked
UPDATE: Resume Context → Last Action = "Blocked: [reason]"
NOTIFY: User
STOP: Phase (user can resume after resolving)
```

## Agent Failures

```
RETRY: Up to 2 times
IF still failing:
  UPDATE: Resume Context → Last Action = "Agent failed: [details]"
  ESCALATE: To user
  STOP: Phase
```

## Common Error Scenarios

| Error | Action |
|-------|--------|
| Story has unmet dependencies | Skip story, select next eligible |
| All stories blocked | Stop execution, inform user |
| Git conflict | Stop, ask user to resolve |
| Test failures | Delegate back to developer |
| Integration failure | Create integration-fix story |
