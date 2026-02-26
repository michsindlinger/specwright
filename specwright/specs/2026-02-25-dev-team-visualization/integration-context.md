# Integration Context - Dev-Team Visualization

> Cross-session context for story integration

## Completed Stories

| Story ID | Summary | Key Files/Functions |
|----------|---------|---------------------|
| TEAM-001 | Backend Skills-API: REST-Endpunkte zum Lesen von Skills | skills-reader.service.ts, team.routes.ts, team.protocol.ts |

## New Exports & APIs

**Types:**
- `ui/src/shared/types/team.protocol.ts` → `SkillSummary` - Skill summary for list view (id, name, description, category, learningsCount, globs, alwaysApply)
- `ui/src/shared/types/team.protocol.ts` → `SkillDetail` - Full skill detail (includes skillContent, dosAndDontsContent, subDocuments)
- `ui/src/shared/types/team.protocol.ts` → `SkillsListResponse` - API response for skills list
- `ui/src/shared/types/team.protocol.ts` → `SkillDetailResponse` - API response for skill detail

**Services:**
- `ui/src/server/services/skills-reader.service.ts` → `skillsReaderService.listSkills(projectPath)` - Returns SkillSummary[]
- `ui/src/server/services/skills-reader.service.ts` → `skillsReaderService.getSkillDetail(projectPath, skillId)` - Returns SkillDetail | null

**API Endpoints:**
- `GET /api/team/:projectPath/skills` → Lists all skills (SkillsListResponse)
- `GET /api/team/:projectPath/skills/:skillId` → Skill detail (SkillDetailResponse)

## Integration Notes

- projectPath ist URL-encoded (wie bei quick-todo.routes.ts)
- Skills werden aus `.claude/skills/` gelesen, Pfad: `join(projectPath, '.claude', 'skills')`
- Kategorie wird aus Verzeichnisname abgeleitet (prefix vor erstem `-`)
- Learnings-Count basiert auf `###` Headings in dos-and-donts.md nach `## Entries`

## File Change Summary

| File | Action | Story |
|------|--------|-------|
| ui/src/shared/types/team.protocol.ts | Created | TEAM-001 |
| ui/src/server/services/skills-reader.service.ts | Created | TEAM-001 |
| ui/src/server/routes/team.routes.ts | Created | TEAM-001 |
| ui/src/server/index.ts | Modified | TEAM-001 |
