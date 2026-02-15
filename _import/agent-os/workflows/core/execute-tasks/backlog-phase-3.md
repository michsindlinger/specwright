---
description: Backlog Phase 3 - Daily Summary (JSON v4.0)
version: 4.0
---

# Backlog Phase 3: Daily Summary

## What's New in v4.0

- **JSON-Based**: Liest aus execution-kanban.json
- **Backlog Statistics**: Aktualisiert backlog.json Statistiken
- **Execution History**: Speichert Ausführungshistorie in backlog.json

## Purpose
Summarize today's work and update backlog statistics.

## Entry Condition
- executions/kanban-{TODAY}.json shows: resumeContext.currentPhase = "all-items-done"
- All items with executionStatus = "done"

## Actions

<step name="load_execution_data">
  ### Load Execution Data

  READ: agent-os/backlog/executions/kanban-{TODAY}.json

  EXTRACT:
  - items[] where executionStatus = "done"
  - boardStatus (total, done counts)
  - execution.startedAt
  - execution.completedAt
  - changeLog[]

  SET: completed_items = filtered items
  SET: TOTAL_COMPLETED = completed_items.length
</step>

<step name="update_backlog_statistics">
  ### Update Backlog Statistics

  READ: agent-os/backlog/backlog.json

  UPDATE resumeContext:
  - activeKanban = null
  - currentPhase = "idle"
  - lastExecution = "{TODAY}"
  - lastAction = "Daily execution completed"
  - nextAction = "Add items or start next execution"

  UPDATE executions[] entry for kanban-{TODAY}:
  - status = "completed"
  - completedItems = {TOTAL_COMPLETED}

  ADD to changeLog[]:
  ```json
  {
    "timestamp": "{NOW}",
    "action": "execution_completed",
    "itemId": null,
    "details": "Completed {TOTAL_COMPLETED} items in kanban-{TODAY}"
  }
  ```

  WRITE: backlog.json
</step>

<step name="finalize_kanban_json">
  ### Finalize Execution Kanban

  READ: agent-os/backlog/executions/kanban-{TODAY}.json

  UPDATE:
  - resumeContext.currentPhase = "complete"
  - resumeContext.lastAction = "Daily summary generated"
  - resumeContext.nextAction = "None - execution complete"

  ADD to changeLog[]:
  ```json
  {
    "timestamp": "{NOW}",
    "action": "execution_finalized",
    "itemId": null,
    "details": "Daily summary generated"
  }
  ```

  WRITE: kanban-{TODAY}.json
</step>

## Phase Completion

<phase_complete>
  OUTPUT to user:
  ---
  ## Daily Backlog Execution Complete!

  ### Today's Summary ({TODAY})

  **Completed Items:** {TOTAL_COMPLETED}

  | Item ID | Title | Type |
  |---------|-------|------|
  {FOR EACH completed_item: | {item.id} | {item.title} | {item.type} |}

  **Execution Kanban:** agent-os/backlog/executions/kanban-{TODAY}.json
  **Backlog Updated:** agent-os/backlog/backlog.json

  ### What's Next?
  1. Add more tasks: `/add-todo "[description]"` or `/add-bug "[description]"`
  2. Create spec for larger features: `/create-spec`
  3. Tomorrow: `/execute-tasks backlog` for new daily kanban

  ---
  **Backlog execution finished for today.**
  ---
</phase_complete>
