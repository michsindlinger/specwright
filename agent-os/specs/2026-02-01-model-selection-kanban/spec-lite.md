# Spec-Lite: Model Selection for Kanban Board

**ID:** 2026-02-01-model-selection-kanban
**Stories:** 4 | **Effort:** S-XS

## Quick Summary
Model-Auswahl (Opus/Sonnet/Haiku) als Dropdown auf Story-Cards im Kanban Board.

## Stories
1. **MSK-001** Frontend Dropdown Component (S)
2. **MSK-002** Backend Markdown Parsing (S)
3. **MSK-003** Workflow Executor Integration (S)
4. **MSK-004** Integration Testing (XS)

## Key Files
- `story-card.ts` - Dropdown UI
- `kanban-board.ts` - Event handling
- `specs-reader.ts` / `backlog-reader.ts` - Model parsing
- `websocket.ts` - Model update message
- `workflow-executor.ts` - --model flag
