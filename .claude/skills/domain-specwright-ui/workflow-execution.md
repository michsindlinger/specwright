# Domain: Workflow Execution

## Overview

How Agent OS workflows are triggered, monitored, and controlled through the UI.

## Workflow Types

Workflows are Agent OS commands like:
- `/execute-tasks` - Execute tasks from a spec
- `/create-spec` - Create a new specification
- `/build-development-team` - Set up project skills

## Workflow Lifecycle

### 1. Trigger
- User initiates from Workflow view or task context action
- Backend starts Claude Code with the workflow command

### 2. Execution
- Steps are processed sequentially
- Each step emits progress updates
- Output streams to the live output panel

### 3. Completion
- Success: Summary with links to created files
- Error: Error message with option to retry
- Cancelled: Partial results may be available

## Progress Display

The UI shows:
- **Step list**: All steps with status icons (pending, running, done, error)
- **Current step**: Highlighted with progress indicator
- **Overall progress**: Percentage bar with step count
- **Live output**: Scrolling log of Claude Code output

## Controls

- **Pause**: Suspends execution (can Resume)
- **Cancel**: Stops execution with confirmation
- **View Output**: Shows detailed log even after completion

## Step States

| State | Icon | Description |
|-------|------|-------------|
| Pending | ○ | Not yet started |
| Running | ● | Currently executing |
| Done | ✓ | Completed successfully |
| Error | ✗ | Failed with error |
| Skipped | - | Skipped due to condition |

---

*Last Updated: 2026-01-30*
