# Technical Stack: Specwright

> Version: 1.0
> Created: 2026-02-14
> Last Updated: 2026-02-14

---

## Overview

Specwright is a framework repository, not a traditional application. Its "tech stack" consists of Markdown-based workflow definitions, Shell scripts for installation, TypeScript for MCP server tooling, and YAML/JSON for configuration and schemas. The framework is technology-agnostic and installs into projects of any tech stack.

---

## Core Technologies

### Framework Core

| Category | Technology | Version | Rationale |
|----------|------------|---------|-----------|
| Workflow Language | Markdown + XML | - | Human-readable, versionable, works with any editor and Claude Code |
| Configuration | YAML | - | Clean syntax for project configuration (config.yml) |
| Schemas | JSON | - | Structured data for kanban boards, backlogs, estimation configs |
| Installation | Bash/Shell | - | Universal availability on macOS/Linux, `curl \| bash` pattern |
| MCP Server | TypeScript | ES2022 | Type-safe kanban operations, prevents JSON corruption |

### Runtime Dependencies

| Category | Technology | Version | Rationale |
|----------|------------|---------|-----------|
| AI Runtime | Claude Code CLI | Latest | Primary execution environment for all workflows |
| Node.js | Node.js | 22+ | Required for MCP server (optional) |
| Shell | Bash/Zsh | 5+ | Setup scripts, auto-execute automation |
| Version Control | Git | 2.x | Worktrees, branching strategies per feature |

### Supported Target Tech Stacks (Skill Templates)

| Category | Technologies | Skill Templates |
|----------|-------------|-----------------|
| Frontend | Angular, React, Vue | Components, State Management, Forms, API Integration, Dos-and-Donts |
| Backend | Spring Boot, NestJS, Rails | API Design, Models, Services, Testing, Dos-and-Donts |
| DevOps | Docker, GitHub Actions | CI/CD, Docker, Dos-and-Donts |
| Testing | Playwright, Chrome DevTools MCP | E2E Testing, Automated Validation |

---

## Infrastructure

### Distribution & Installation

| Category | Approach | Details |
|----------|----------|---------|
| Distribution | GitHub Raw Content | `curl -sSL` from raw.githubusercontent.com |
| Global Install | `~/.specwright/` | Templates, standards, skill templates as fallback |
| Project Install | `specwright/` directory | Workflows, config, local overrides |
| Claude Code Integration | `.claude/` directory | Commands, agents, skills |
| MCP Server | Local npx execution | Kanban board operations |

### Installation Scripts

| Script | Purpose | Scope |
|--------|---------|-------|
| `setup.sh` | Core project installation | Project-level |
| `setup-claude-code.sh` | Slash commands & agents | Project-level |
| `setup-devteam-global.sh` | Global templates & standards | User-level (~/.specwright/) |
| `setup-mcp.sh` | Kanban MCP server | Project-level |
| `setup-market-validation-global.sh` | Market validation templates | User-level |
| `setup-market-validation-project.sh` | Market validation workflows | Project-level |

### Update System

| Script | Purpose |
|--------|---------|
| `update-all.sh` | Update everything |
| `update-instructions.sh` | Update workflows only |
| `update-standards.sh` | Update coding standards only |
| `update-specwright.sh` | Update core specwright directory |

---

## Development Environment

### Local Setup

| Tool | Version | Purpose |
|------|---------|---------|
| Claude Code | Latest | Primary AI runtime |
| Node.js | 22+ | MCP server, npx execution |
| Git | 2.x+ | Version control, worktrees |
| curl | Any | Installation scripts |
| Bash/Zsh | 5+ | Script execution |

### IDE & Tools

| Tool | Purpose |
|------|---------|
| Any Editor | Markdown editing (VS Code, Cursor, Vim, etc.) |
| Claude Code CLI | Workflow execution via slash commands |
| GitHub | Repository hosting, issue tracking |

---

## MCP Server Stack

| Component | Technology | Purpose |
|-----------|------------|---------|
| Server Runtime | TypeScript + npx | Kanban board atomic operations |
| kanban-mcp-server.ts | MCP Protocol | Server entry point |
| story-parser.ts | TypeScript | Parse story markdown to structured data |
| item-templates.ts | TypeScript | Story/task item templates |
| kanban-lock.ts | TypeScript | File locking for concurrent access |

---

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────┐
│                    Developer (Human)                      │
│  Spezifizieren, Reviewen, Entscheiden                    │
└──────────────────────┬──────────────────────────────────┘
                       │ Slash Commands (/plan-product, /create-spec, etc.)
                       ▼
┌─────────────────────────────────────────────────────────┐
│                   Claude Code CLI                         │
│  ┌──────────────────────────────────────────────────┐   │
│  │              Main Agent (Orchestrator)             │   │
│  │  Loads Skills on demand, executes workflows       │   │
│  └──────────────────────┬───────────────────────────┘   │
│                         │                                │
│  ┌──────────┐  ┌────────┴───────┐  ┌──────────────┐    │
│  │ Utility  │  │   Skill Files  │  │  MCP Server   │    │
│  │ Agents   │  │  (.claude/     │  │  (Kanban)     │    │
│  │          │  │   skills/)     │  │               │    │
│  └──────────┘  └────────────────┘  └──────────────┘    │
└──────────────────────┬──────────────────────────────────┘
                       │ Reads/Writes
                       ▼
┌─────────────────────────────────────────────────────────┐
│                   Project Filesystem                      │
│                                                          │
│  specwright/          .claude/          .specwright/      │
│  ├── workflows/       ├── commands/     ├── product/     │
│  ├── templates/       ├── agents/       ├── specs/       │
│  ├── standards/       └── skills/       └── team/        │
│  └── config.yml                                          │
│                                                          │
│  ~/.specwright/  (Global Fallback)                        │
│  ├── templates/                                          │
│  └── standards/                                          │
└─────────────────────────────────────────────────────────┘
```

---

## Version Management

### Versioning Strategy

- **Framework:** Semantic Versioning (3.0.0)
- **Workflows:** Individual version numbers in frontmatter (e.g., v5.0, v3.5, v2.0)
- **Templates:** Versioned through framework releases
- **Installation:** Always pulls latest from main branch

### Current Versions

| Component | Current | Notes |
|-----------|---------|-------|
| Framework | 3.0.0 | Post-migration release |
| plan-product | v5.0 | Migrated to Main Agent + Skills |
| create-spec | v3.5 | Migrated, Plan Agent remains |
| execute-tasks | v3.0 | Phase-based architecture |
| build-dev-team | v3.1 | Gold standard (fully aligned) |
| add-bug | v3.2 | Migrated, Plan Agent remains |

---

## Multi-LLM Configuration

| Provider | Usage | Notes |
|----------|-------|-------|
| Anthropic (Claude) | Default provider | Claude Code native, highest quality |
| GLM | Alternative | Local/cloud deployment |
| MiniMax | Alternative | On-premise capable |
| Kimi K2 | Alternative | Cost-efficient for bulk operations |
| Custom | Configurable per story | Any OpenAI-compatible API |

---

## Notes & Decisions

### Why Markdown for Workflows?

Markdown with embedded XML provides human-readable workflow definitions that work natively with Claude Code, are version-controllable, and can be edited in any editor. No build step or compilation required.

### Why Not a Traditional Application Architecture?

Specwright is a framework that installs into existing projects. It has no runtime of its own - it relies on Claude Code CLI as its execution environment. This keeps the framework lightweight, universal, and compatible with any tech stack.

### Why Hybrid Lookup?

The two-level lookup (project -> global fallback) enables global defaults for all projects while allowing per-project customization. This reduces setup time for new projects while maintaining flexibility.

---

## References

- Claude Code Documentation: https://docs.anthropic.com/en/docs/claude-code
- Specwright GitHub: https://github.com/michsindlinger/specwright
- Architecture Decision: @specwright/product/architecture-decision.md
