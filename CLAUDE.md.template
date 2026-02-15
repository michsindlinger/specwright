# CLAUDE.md - Agent OS Extended

> Agent OS Extended Development Guide
> Last Updated: 2026-01-16
> Type: Framework Repository

## Purpose
Essential guidance for Claude Code development in the Agent OS Extended repository. This is the **framework repository** that provides workflows, templates, agents, and skills for other projects.

## Repository Structure

**This is NOT a product project - it's the Agent OS framework itself.**

```
agent-os-extended/
├── agent-os/
│   ├── workflows/core/       # Core workflows (plan-product, create-spec, etc.)
│   ├── workflows/meta/       # Meta workflows (pre-flight)
│   ├── templates/            # All templates (product, platform, docs, skills)
│   ├── standards/            # Global coding standards
│   └── docs/                 # Documentation and guides
├── .claude/
│   ├── commands/agent-os/    # Slash command definitions
│   └── agents/               # Agent definitions
├── setup.sh                  # Project installation script
├── setup-claude-code.sh      # Claude Code installation script
└── setup-devteam-global.sh   # Global templates installation script
```

## Development Standards (load via context-fetcher when needed)
- **Tech Stack Defaults**: agent-os/standards/tech-stack.md
- **Code Style Preferences**: agent-os/standards/code-style.md
- **Best Practices Philosophy**: agent-os/standards/best-practices.md

## Critical Rules
- **FOLLOW ALL INSTRUCTIONS** - Mandatory, not optional
- **ASK FOR CLARIFICATION** - If uncertain about any requirement
- **MINIMIZE CHANGES** - Edit only what's necessary
- **PRESERVE BACKWARD COMPATIBILITY** - Changes affect all users of the framework

## Framework Development Guidelines

**When modifying workflows:**
- Test changes conceptually before committing
- Update version numbers in workflow frontmatter
- Ensure template references use hybrid lookup (project → global)
- Update setup scripts if new files are added

**When adding templates:**
- Add to `agent-os/templates/` directory
- Update `setup-devteam-global.sh` to include in global installation
- Use consistent placeholder naming: `[PLACEHOLDER_NAME]`

**When adding commands:**
- Create in `.claude/commands/agent-os/`
- Reference corresponding workflow in `agent-os/workflows/core/`

## Sub-Agents

### Utility & Support
- **context-fetcher** - Load documents on demand
- **date-checker** - Determine today's date
- **file-creator** - Create files and apply templates
- **git-workflow** - Git operations, commits, PRs

## File Organization Rules

**CRITICAL - No Files in Project Root:**
- Implementation reports: `agent-os/specs/[spec-name]/implementation-reports/`
- Architecture docs: `agent-os/product/`
- Team docs: `agent-os/team/`

## Essential Commands (for testing the framework)

```bash
# Product Planning
/plan-product            # Single-product planning
/plan-platform           # Multi-module platform planning

# Team Setup
/build-development-team  # Create DevTeam agents and skills

# Feature Development
/create-spec             # Create detailed specifications
/execute-tasks           # Execute planned tasks
/retroactive-doc         # Document existing features

# Bug Management
/create-bug              # Create bug specification
/add-bug                 # Add bug to existing spec

# Quick Tasks
/add-todo                # Add lightweight task to backlog

# Skill Management
/add-skill               # Create custom skills
/migrate-skills          # Add YAML frontmatter to existing skills
```

## Quality Requirements

**Mandatory Checks:**
- Ensure all workflow steps are numbered correctly
- Verify template paths use hybrid lookup
- Check that setup scripts include all new files
- Test slash commands work correctly

## Production Safety Rules

**CRITICAL RESTRICTIONS:**
- Never break backward compatibility without migration path
- Never remove templates without deprecation notice
- Always update setup scripts when adding files
- Test changes in a separate project before committing

## Workflow Development

**Adding a new workflow:**
1. Create workflow in `agent-os/workflows/core/[workflow-name].md`
2. Create command in `.claude/commands/agent-os/[command-name].md`
3. Add any new templates to `agent-os/templates/`
4. Update `setup.sh` to download the workflow
5. Update `setup-claude-code.sh` to download the command
6. Update `setup-devteam-global.sh` for new templates

**Modifying existing workflows:**
1. Read the current workflow completely
2. Understand all steps and their dependencies
3. Make minimal changes to achieve the goal
4. Update version number in frontmatter
5. Test conceptually with edge cases

---

**Remember:** This repository is used by many projects. Changes here affect all Agent OS users. Quality, backward compatibility, and documentation are paramount.
