# Execute Task

Execute the next task using phase-based architecture for optimal context usage.

## How It Works
1. Entry point detects current state from kanban board
2. Loads ONLY the relevant phase file (~100-200 lines instead of 1600)
3. Executes that single phase
4. Prompts for `/clear` before next phase

## Usage
- `/execute-tasks` - Auto-detect mode and phase
- `/execute-tasks backlog` - Execute backlog tasks
- `/execute-tasks [spec-name]` - Execute specific spec

Refer to the instructions located in @agent-os/workflows/core/execute-tasks/entry-point.md
