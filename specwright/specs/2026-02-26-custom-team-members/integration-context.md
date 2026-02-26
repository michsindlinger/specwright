# Integration Context

> **Purpose:** Cross-story context preservation for multi-session execution.
> **Auto-updated** after each story completion.
> **READ THIS** before implementing the next story.

---

## Completed Stories

| Story | Summary | Key Changes |
|-------|---------|-------------|
| CTM-002 | /add-team-member Workflow & Command erstellt | Workflow + Command Markdown-Dateien |

---

## New Exports & APIs

### Components
<!-- New UI components created -->
_None yet_

### Services
<!-- New service classes/modules -->
_None yet_

### Hooks / Utilities
<!-- New hooks, helpers, utilities -->
_None yet_

### Types / Interfaces
<!-- New type definitions -->
_None yet_

---

## Integration Notes

<!-- Important integration information for subsequent stories -->
- **SKILL.md Frontmatter-Format** (definiert in CTM-002 Workflow):
  ```yaml
  teamType: individual | team
  teamName: "Display Name"
  ```
  Skills ohne `teamType` werden als DevTeam behandelt (Default: `devteam`).
- **Workflow-Pfad:** `specwright/workflows/team/add-team-member.md`
- **Command-Pfad:** `.claude/commands/specwright/add-team-member.md`
- **Skill-Ordner-Struktur:** `.claude/skills/{name}/SKILL.md` + `dos-and-donts.md` + optionale Templates

---

## File Change Summary

| File | Action | Story |
|------|--------|-------|
| specwright/workflows/team/add-team-member.md | Created | CTM-002 |
| .claude/commands/specwright/add-team-member.md | Created | CTM-002 |
