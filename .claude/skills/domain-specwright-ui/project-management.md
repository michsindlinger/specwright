# Domain: Project Management

## Overview

How Agent OS Web UI discovers, displays, and manages projects.

## Project Discovery

Projects are defined in a central configuration file (`config.json` in the app directory or user home). Each project entry contains:

- **id**: Unique identifier
- **name**: Display name
- **path**: Absolute path to project root

Projects are automatically validated on load (check if path exists, contains `agent-os/` directory).

## Project Selection

Users select a project from the sidebar dropdown. Selection:
1. Updates the current project context across all views
2. Loads project-specific data (tasks, specs, settings)
3. Persists to URL for reload support

## Project Context

When a project is selected:
- Dashboard shows tasks from that project's specs
- Chat sessions are associated with the project
- Workflows execute in the project's directory

## Recent Projects

The UI tracks recently accessed projects (stored in localStorage) for quick access. Maximum of 5 recent projects displayed.

---

*Last Updated: 2026-01-30*
