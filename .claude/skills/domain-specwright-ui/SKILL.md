---
description: Business domain knowledge for Agent OS Web UI
globs: []
alwaysApply: false
---

# Domain Knowledge: Agent OS Web UI

> Project: Agent OS Web UI
> Generated: 2026-01-30
> Purpose: Document business processes and domain logic

## Overview

Agent OS Web UI is a local web interface for controlling Claude Code through three main views: Dashboard (Kanban), Chat Interface, and Workflow Execution.

## Domain Areas

| Area | Document | Description |
|------|----------|-------------|
| Project Management | [project-management.md](./project-management.md) | How projects are discovered, selected, and managed |
| Chat Interaction | [chat-interaction.md](./chat-interaction.md) | How users interact with Claude Code via chat |
| Workflow Execution | [workflow-execution.md](./workflow-execution.md) | How workflows are triggered and monitored |
| Task Tracking | [task-tracking.md](./task-tracking.md) | How tasks/stories are displayed and managed |

## Key Concepts

### Project
A folder containing Agent OS configuration (`agent-os/` directory). Projects are discovered from a central config file and can be switched at any time.

### Session
An active connection to Claude Code for a specific project. Sessions are ephemeral (not persisted across restarts) and allow streaming communication.

### Task
A unit of work from a spec's user story. Tasks are displayed on the Kanban board and can be moved between status columns.

### Workflow
A predefined sequence of Claude Code operations (like `/execute-tasks`). Workflows show step-by-step progress with live output.

---

## Update Rules

**IMPORTANT:** When implementing features that change business logic:

1. Check if the change affects a documented domain area
2. Update the corresponding document to reflect the new behavior
3. Add new concepts if they emerge during implementation
4. Keep documentation in sync with actual implementation

This ensures domain knowledge stays current and useful.
