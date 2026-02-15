---
description: DEPRECATED in v3.0 - Skills now auto-load via globs
version: 3.0
deprecated: true
---

# Skill Extraction (DEPRECATED)

## Status: DEPRECATED in v3.0

This file is no longer used. Skills now load automatically via glob patterns.

## Why Deprecated?

In v3.0:
- Skills are in `.claude/skills/[name]/SKILL.md` (Claude Code standard)
- Skills have `globs` in YAML frontmatter
- Skills auto-load when editing matching files
- No manual extraction needed

## Migration

**v2.x (Old):**
```
1. Orchestrator reads story
2. Extracts skill paths from "Relevante Skills" section
3. Reads skills and extracts "Quick Reference"
4. Passes patterns to sub-agent
```

**v3.0 (New):**
```
1. Main agent reads story
2. Main agent implements directly
3. Skills auto-load when editing matching files
4. No extraction needed
```

## Replacement

Stories no longer need "Relevante Skills" section.
Instead, skills activate based on file patterns:

```yaml
# Example: frontend-angular/Skill.md
---
globs:
  - "src/app/**/*.ts"
  - "src/app/**/*.html"
---
```

When the agent edits `src/app/components/user.component.ts`,
the frontend-angular skill loads automatically.
