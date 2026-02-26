# Integration Context

> **Purpose:** Cross-story context preservation for multi-session execution.
> **Auto-updated** after each story completion.
> **READ THIS** before implementing the next story.

---

## Completed Stories

| Story | Summary | Key Changes |
|-------|---------|-------------|
| CTM-002 | /add-team-member Workflow & Command erstellt | Workflow + Command Markdown-Dateien |
| CTM-003 | Frontend gruppierte Darstellung nach teamType | team-view.ts, aos-team-card.ts, theme.css + Backend: types, service |

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
- `ui/src/shared/types/team.protocol.ts` → `SkillSummary.teamType: 'devteam' | 'team' | 'individual'`
- `ui/src/shared/types/team.protocol.ts` → `SkillSummary.teamName: string`
- `ui/src/shared/types/team.protocol.ts` → `SkillDetail.teamType` + `SkillDetail.teamName` (gleiche Felder)

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
- **Frontend-Gruppierung (CTM-003):** `team-view.ts` gruppiert nach `teamType`: DevTeam / Custom Teams / Einzelpersonen. Leere Sektionen werden nicht gerendert. Custom Teams werden zusätzlich nach `teamName` sub-gruppiert.
- **Backend-Parsing (CTM-003):** `parseFrontmatter()` in `skills-reader.service.ts` extrahiert `teamType`/`teamName` aus SKILL.md Frontmatter. Default: `devteam` wenn kein teamType gesetzt.
- **TeamType Badge (CTM-003):** `aos-team-card.ts` zeigt teamType-Badge neben dem Category-Badge. CSS-Klassen: `team-type--devteam`, `team-type--team`, `team-type--individual`.

---

## File Change Summary

| File | Action | Story |
|------|--------|-------|
| specwright/workflows/team/add-team-member.md | Created | CTM-002 |
| .claude/commands/specwright/add-team-member.md | Created | CTM-002 |
| ui/src/shared/types/team.protocol.ts | Modified | CTM-003 |
| ui/src/server/services/skills-reader.service.ts | Modified | CTM-003 |
| ui/frontend/src/views/team-view.ts | Modified | CTM-003 |
| ui/frontend/src/components/team/aos-team-card.ts | Modified | CTM-003 |
| ui/frontend/src/styles/theme.css | Modified | CTM-003 |
