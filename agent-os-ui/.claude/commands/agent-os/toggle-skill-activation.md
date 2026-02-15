---
description: Toggle skill activation mode between auto-load, explicit, and always-active
---

# /toggle-skill-activation

Change how a skill is activated by Claude Code. Toggle between auto-load (via file patterns), explicit invocation only, or always active.

## What This Does

Modifies a skill's YAML frontmatter to change its activation behavior:
- **Auto-Load**: Skill loads automatically when working with matching files
- **Explicit Only**: Skill loads only when you explicitly invoke it
- **Always Active**: Skill is always loaded

## When to Use

- Make a skill auto-activate for specific file types
- Prevent a skill from loading automatically
- Make utility skills explicitly invoked only
- Set project standards to always be active

## Usage

### Interactive Mode
```
/toggle-skill-activation
```
Prompts you to select a skill and choose its activation mode.

### Direct Mode
```
/toggle-skill-activation [skill-name]
```
Skips skill selection, directly modifies the specified skill.

## Activation Modes

### Auto-Load
Best for framework-specific or file-type-specific skills.

**Example:**
```yaml
---
globs:
  - "src/**/*.java"
  - "**/*.ts"
---
```

Skill loads when matching files are being worked on.

### Explicit Only
Best for utility skills, git workflows, general-purpose skills.

**Example:**
```yaml
---
# No globs field
always_apply: false
---
```

Skill loads only when you mention its name.

### Always Active
Best for project standards, coding conventions.

**Example:**
```yaml
---
always_apply: true
---
```

Skill is always loaded for every conversation.

## Example

```
/toggle-skill-activation my-project-backend-logic-implementing

Current: Auto-Load for src/**/*.java
New mode: [Select one]

✅ Skill Activation Updated!

Skill: my-project-backend-logic-implementing
New Mode: Explicit Only

Invoke this skill by mentioning its name in prompts.
```

## See Also

- `/migrate-skills` - Add frontmatter to legacy skills
- `/build-development-team` - Create skills with proper frontmatter
- Spec: `agent-os/specs/2026-01-14-skill-yaml-frontmatter/spec.md`
