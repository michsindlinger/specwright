---
description: Migrate existing skills to include proper YAML frontmatter
---

# /migrate-skills

Migrate existing skills in `.claude/skills/` to include proper YAML frontmatter for Claude Code compatibility.

## What This Does

- Scans all skills in `.claude/skills/`
- Identifies skills missing or with incomplete YAML frontmatter
- Adds proper `name`, `description`, `globs`, and other required fields
- Creates backup files (*.old) before modifying
- Preserves existing skill content

## When to Use

- After upgrading Agent OS to version with frontmatter support
- When skills are not auto-activating as expected
- When Claude Code doesn't recognize your skills
- After running older version of `/build-development-team`

## Usage

Simply run:
```
/migrate-skills
```

## Process

1. **Scan**: Find all skill files in `.claude/skills/`
2. **Analyze**: Check each for proper frontmatter
3. **Detect**: Load project context (framework, project name)
4. **Generate**: Create frontmatter for each skill
5. **Preview**: Show changes before applying
6. **Migrate**: Update files with new frontmatter
7. **Verify**: Ensure all migrations succeeded
8. **Backup**: Keep *.old files for rollback

## Example Output

```
✅ Skill Migration Complete!

📊 Results:
- Skills migrated: 15
- Already compliant: 3
- Failed: 0

📁 Files created:
- Migrated skills: .claude/skills/*/
- Backups: .claude/skills/*/*.old

✨ Skills now have:
- Proper YAML frontmatter
- Auto-activation via globs
- Clear descriptions
- Claude Code compatibility
```

## Rollback

If something goes wrong:
- Backup files are saved as `*.old`
- Use `git checkout` to revert
- Or restore from backups manually

## See Also

- `/toggle-skill-activation` - Change skill activation mode
- `/build-development-team` - Create new skills with frontmatter
- Spec: `agent-os/specs/2026-01-14-skill-yaml-frontmatter/spec.md`
