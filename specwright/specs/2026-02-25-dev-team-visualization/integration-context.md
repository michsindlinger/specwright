# Integration Context - Dev-Team Visualization

> Cross-session context for story integration

## Completed Stories

| Story ID | Summary | Key Files/Functions |
|----------|---------|---------------------|
| TEAM-001 | Backend Skills-API: REST-Endpunkte zum Lesen von Skills | skills-reader.service.ts, team.routes.ts, team.protocol.ts |
| TEAM-002 | Navigation & Routing: Team-Route und NavItem hinzugefügt | route.types.ts, app.ts, team-view.ts |
| TEAM-003 | Team View + Team Card: Grid-Layout, API-Anbindung, Loading/Error/Empty States | team-view.ts, aos-team-card.ts, theme.css |
| TEAM-004 | Team Detail Modal: Skill-Detail mit Tabs (Skill/Learnings), Escape/Overlay-Close | aos-team-detail-modal.ts, team-view.ts, theme.css |
| TEAM-005 | Integration Tests: Vitest Service- und Route-Tests, Build/Lint verifiziert | skills-reader.service.test.ts, team.routes.test.ts |

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

**Components:**
- `ui/frontend/src/views/team-view.ts` → `<aos-team-view>` - Team-Übersichtsseite mit Grid-Layout, API-Anbindung, Loading/Error/Empty States
- `ui/frontend/src/components/team/aos-team-card.ts` → `<aos-team-card .skill=${skillSummary}>` - Skill-Karte mit Badge, Beschreibung, Learnings. Dispatcht `card-click` Event mit `{ skillId }`
- `ui/frontend/src/components/team/aos-team-detail-modal.ts` → `<aos-team-detail-modal .open=${bool} .skillId=${string}>` - Modal mit Skill-Detail und Learnings-Tabs. Dispatcht `modal-close` Event

**Routes:**
- `ui/frontend/src/types/route.types.ts` → `ViewType` includes `'team'`, `VALID_VIEWS` includes `'team'`
- Navigation: `/#team` → `aos-team-view`

## Integration Notes

- projectPath ist URL-encoded (wie bei quick-todo.routes.ts)
- Skills werden aus `.claude/skills/` gelesen, Pfad: `join(projectPath, '.claude', 'skills')`
- Kategorie wird aus Verzeichnisname abgeleitet (prefix vor erstem `-`)
- Learnings-Count basiert auf `###` Headings in dos-and-donts.md nach `## Entries`
- Team NavItem ist zwischen Dashboard und Getting Started platziert
- Team-View vollständig implementiert mit Grid, Loading, Error, Empty States
- aos-team-card dispatcht `card-click` Event mit `{ skillId }` - wird von TEAM-004 (Detail Modal) konsumiert
- `team-skill-select` Event wird von aos-team-view nach oben propagiert (bubbles+composed)
- aos-team-detail-modal: Modal öffnet bei card-click, lädt Skill-Detail lazy via API, hat Tabs (Skill/Learnings)
- Modal schließt via Close-Button, Escape-Taste und Click-Outside (Overlay)
- Leere Learnings zeigen "Keine Learnings vorhanden" Zustand
- Category-Badge farbcodiert: frontend=blau, backend=grün, architecture=lila, quality=gelb, domain=pink, devops=teal, product=orange
- CSS-Klassen: `.team-grid`, `.team-card`, `.team-card__badge.category-*`, `.team-view__empty`
- Tests: 18 Vitest-Tests (12 Service, 6 Route), alle bestanden, Build + Lint clean

## File Change Summary

| File | Action | Story |
|------|--------|-------|
| ui/src/shared/types/team.protocol.ts | Created | TEAM-001 |
| ui/src/server/services/skills-reader.service.ts | Created | TEAM-001 |
| ui/src/server/routes/team.routes.ts | Created | TEAM-001 |
| ui/src/server/index.ts | Modified | TEAM-001 |
| ui/frontend/src/types/route.types.ts | Modified | TEAM-002 |
| ui/frontend/src/app.ts | Modified | TEAM-002 |
| ui/frontend/src/views/team-view.ts | Created | TEAM-002 |
| ui/frontend/src/views/team-view.ts | Modified | TEAM-003 |
| ui/frontend/src/components/team/aos-team-card.ts | Created | TEAM-003 |
| ui/frontend/src/styles/theme.css | Modified | TEAM-003 |
| ui/frontend/src/components/team/aos-team-detail-modal.ts | Created | TEAM-004 |
| ui/frontend/src/views/team-view.ts | Modified | TEAM-004 |
| ui/frontend/src/styles/theme.css | Modified | TEAM-004 |
| ui/tests/team/skills-reader.service.test.ts | Created | TEAM-005 |
| ui/tests/team/team.routes.test.ts | Created | TEAM-005 |
