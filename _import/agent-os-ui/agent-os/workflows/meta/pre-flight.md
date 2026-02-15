---
description: Common Pre-Flight Steps for Agent OS Instructions
globs:
alwaysApply: false
version: 2.0
encoding: UTF-8
---

# Pre-Flight Rules

- Process XML blocks sequentially

- Use exact templates as provided

## Template Lookup Rule (CRITICAL)

When loading templates, ALWAYS use this fallback strategy:

```
1. TRY: agent-os/templates/[category]/[template].md (project)
2. IF "Error reading file" OR "File does not exist":
   READ: ~/.agent-os/templates/[category]/[template].md (global fallback)
3. IF both fail: Error - run setup-devteam-global.sh
```

**Categories:**
- `docs/` - Story templates, index templates
- `product/` - Product briefs, tech stack, roadmap
- `platform/` - Platform briefs, module templates
- `agents/dev-team/` - Agent templates
- `skills/` - Skill templates

⚠️ **WICHTIG:** Bei "Error reading file" NIEMALS abbrechen - IMMER den ~/.agent-os/ Fallback-Pfad versuchen!
