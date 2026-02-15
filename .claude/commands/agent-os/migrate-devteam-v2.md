---
description: Migrate existing DevTeam to v2.0 (skill-index pattern)
---

# /migrate-devteam-v2

Migrate an existing DevTeam setup from v1.x to v2.0.

## What This Does

Converts your DevTeam from the old architecture (skills assigned to agents) to the new v2.0 architecture (skill-index pattern).

**Before (v1.x):**
- Skills assigned in agent YAML frontmatter
- Sub-agents load ALL skills at startup (~2700 lines)
- Skills in `.claude/skills/`

**After (v2.0):**
- No skills in agent YAML frontmatter
- Orchestrator extracts only "Quick Reference" on-demand (~100 lines)
- Skills in `agent-os/skills/`
- Skill-index for Architect/Orchestrator lookup

## Usage

```bash
/migrate-devteam-v2
```

## Prerequisites

- Existing DevTeam setup (agents in `.claude/agents/dev-team/`)
- Skills in `.claude/skills/` (optional, will be migrated if present)

## Workflow

Execute the migration workflow:

```
@agent-os/workflows/core/migrate-devteam-v2.md
```

Follow the interactive prompts to complete the migration.
