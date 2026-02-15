# CLAUDE.md - Specwright

> Specwright Development Guide
> Last Updated: 2026-02-15
> Type: Framework Repository (Monorepo: Framework + Web UI)

## Purpose
Essential guidance for Claude Code development in the Specwright repository. This is the **framework repository** that provides workflows, templates, agents, and skills for spec-driven development, plus an optional **Web UI** for visual project management.

## Repository Structure

**This is NOT a product project - it's the Specwright framework itself.**

```
specwright/                          # Repository root
├── specwright/                      # Framework
│   ├── workflows/
│   │   ├── core/                    # Core workflows (plan-product, create-spec, etc.)
│   │   ├── team/                    # Team workflows (create-project-agents, assign-skills)
│   │   ├── skill/                   # Skill creation workflows
│   │   ├── validation/              # Market validation workflows
│   │   └── meta/                    # Meta workflows (pre-flight)
│   ├── templates/                   # All templates (product, platform, docs, skills)
│   ├── standards/                   # Global coding standards
│   ├── docs/                        # Documentation and guides
│   ├── profiles/                    # Tech-stack profiles
│   ├── scripts/mcp/                 # MCP server files
│   └── config.yml                   # Configuration
│
├── ui/                              # Web UI (Express + Lit)
│   ├── package.json                 # Backend dependencies
│   ├── tsconfig.json
│   ├── vitest.config.ts
│   ├── nodemon.json
│   ├── config.json                  # UI project configuration
│   ├── src/
│   │   ├── server/                  # Express + WebSocket + Claude SDK
│   │   └── shared/                  # Shared types
│   ├── tests/                       # Vitest tests
│   └── frontend/                    # Lit frontend
│       ├── package.json
│       ├── vite.config.ts
│       ├── index.html
│       └── src/                     # 70+ Lit components (aos-*)
│
├── .claude/
│   ├── commands/specwright/         # 34 slash command definitions
│   ├── agents/                      # 13 utility agents
│   └── skills/                      # User-invocable + UI skills
│       ├── review-implementation-plan/
│       ├── architect-refinement/    # UI: Architecture refinement
│       ├── backend-express/         # UI: Express backend patterns
│       ├── frontend-lit/            # UI: Lit component patterns
│       ├── domain-specwright-ui/    # UI: Business domain knowledge
│       ├── po-requirements/         # UI: PO requirements
│       └── quality-gates/           # UI: Quality standards
│
├── docs/
│   └── ui-specs/                    # UI feature specifications
│
├── setup.sh                         # Framework installation
├── setup-claude-code.sh             # Claude Code commands (--with-ui for UI skills)
├── setup-devteam-global.sh          # Global templates installation
├── setup-mcp.sh                     # MCP server installation
└── setup-ui.sh                      # UI dependency installation
```

## Development Standards (load via context-fetcher when needed)
- **Tech Stack Defaults**: specwright/standards/tech-stack.md
- **Code Style Preferences**: specwright/standards/code-style.md
- **Best Practices Philosophy**: specwright/standards/best-practices.md

## Critical Rules
- **FOLLOW ALL INSTRUCTIONS** - Mandatory, not optional
- **ASK FOR CLARIFICATION** - If uncertain about any requirement
- **MINIMIZE CHANGES** - Edit only what's necessary
- **PRESERVE BACKWARD COMPATIBILITY** - Changes affect all users of the framework

## Framework Development Guidelines

**When modifying workflows:**
- Test changes conceptually before committing
- Update version numbers in workflow frontmatter
- Ensure template references use hybrid lookup (project -> global)
- Update setup scripts if new files are added

**When adding templates:**
- Add to `specwright/templates/` directory
- Update `setup-devteam-global.sh` to include in global installation
- Use consistent placeholder naming: `[PLACEHOLDER_NAME]`

**When adding commands:**
- Create in `.claude/commands/specwright/`
- Reference corresponding workflow in `specwright/workflows/`

## UI Development Guidelines

**Tech Stack:**
- Backend: Express.js + TypeScript, WebSocket (ws), Claude Code SDK
- Frontend: Lit Web Components, Vite, TypeScript strict mode
- Testing: Vitest
- All components use `aos-` prefix (e.g., `aos-kanban-board`, `aos-chat-view`)

**Directory naming (backward compatibility):**
- Server code supports both `specwright/` and `agent-os/` project directories
- Use `ui/src/server/utils/project-dirs.ts` for path resolution
- Never hardcode `agent-os` or `specwright` directory names in server code

**When modifying UI backend:**
- Run `cd ui && npm test` after changes
- Run `cd ui && npm run lint` to check for errors
- Use `projectDir()` / `projectDotDir()` from `project-dirs.ts` for project paths

**When modifying UI frontend:**
- Follow Lit component patterns from `.claude/skills/frontend-lit/`
- Use `aos-` prefix for all new components
- Run `cd ui/frontend && npm run build` to verify

**Starting the UI locally:**
- `cd ui && npm run dev:backend` (Port 3001)
- `cd ui/frontend && npm run dev` (Port 5173)

## Sub-Agents

### Utility & Support
- **context-fetcher** - Load documents on demand
- **date-checker** - Determine today's date
- **file-creator** - Create files and apply templates
- **git-workflow** - Git operations, commits, PRs

## Essential Commands

```bash
# Product Planning
/plan-product            # Single-product planning
/plan-platform           # Multi-module platform planning

# Team Setup
/build-development-team  # Create DevTeam skills
/create-project-agents   # Create project-specific agents
/assign-skills-to-agent  # Assign skills to agents

# Feature Development
/create-spec             # Create detailed specifications
/change-spec             # Modify existing spec (add/remove/change features)
/add-story               # Add story to existing spec
/execute-tasks           # Execute planned tasks
/document-feature        # Document completed features
/retroactive-doc         # Document existing features
/retroactive-spec        # Create spec from existing code

# Bug Management & Quick Tasks
/add-bug                 # Add bug with root-cause analysis
/add-todo                # Add lightweight task to backlog

# Analysis & Estimation
/analyze-product         # Analyze existing codebase for Specwright setup
/analyze-feasibility     # Feasibility analysis on product brief
/analyze-blockers        # External dependency/blocker analysis
/estimate-spec           # Effort estimation for spec
/validate-estimation     # Validate existing estimation

# Feedback & Changelog
/process-feedback        # Categorize customer feedback (spec/bug/todo)
/update-changelog        # Generate bilingual changelog

# Skill Management
/add-skill               # Create custom skills
/add-learning            # Add insight to skill dos-and-donts
/add-domain              # Add business domain documentation

# Brainstorming
/start-brainstorming     # Interactive idea exploration
/brainstorm-upselling-ideas  # Brainstorm upselling opportunities
/transfer-and-create-spec  # Convert brainstorming to spec
/transfer-and-create-bug   # Convert brainstorming to bug
/transfer-and-plan-product # Convert brainstorming to product plan

# Design & Marketing
/extract-design          # Extract design system from URL/screenshot
/create-instagram-account  # Instagram marketing strategy
/create-content-plan     # 7-day Instagram content plan

# Market Validation
/validate-market         # Validate new product ideas
/validate-market-for-existing  # Validate existing products
```

## Quality Requirements

**Framework Checks:**
- Ensure all workflow steps are numbered correctly
- Verify template paths use hybrid lookup
- Check that setup scripts include all new files
- Test slash commands work correctly

**UI Checks (when modifying ui/):**
- `cd ui && npm test` - all tests pass
- `cd ui && npm run lint` - no errors
- `cd ui && npm run build:backend` - backend compiles
- `cd ui/frontend && npm run build` - frontend compiles
- Follow TypeScript strict mode (no `any` types)

## Production Safety Rules

**CRITICAL RESTRICTIONS:**
- Never break backward compatibility without migration path
- Never remove templates without deprecation notice
- Always update setup scripts when adding files
- Test changes in a separate project before committing

## Workflow Development

**Adding a new workflow:**
1. Create workflow in `specwright/workflows/core/[workflow-name].md`
2. Create command in `.claude/commands/specwright/[command-name].md`
3. Add any new templates to `specwright/templates/`
4. Update `setup.sh` to download the workflow
5. Update `setup-claude-code.sh` to download the command
6. Update `setup-devteam-global.sh` for new templates

---

**Remember:** This repository is used by many projects. Changes here affect all Specwright users. Quality, backward compatibility, and documentation are paramount. The Web UI is an optional component - framework changes must never depend on the UI being installed.
