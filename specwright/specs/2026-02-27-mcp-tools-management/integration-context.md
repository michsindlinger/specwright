# Integration Context - MCP Tools Management

## Completed Stories

| Story ID | Summary | Key Files |
|----------|---------|-----------|
| MCP-001 | Shared Types & Backend MCP Service - Types, MCP config reader, mcpTools parsing | team.protocol.ts, mcp-config-reader.service.ts, skills-reader.service.ts, team.routes.ts |
| MCP-002 | MCP Server cards in Team-View - New card component, MCP section in team-view | aos-mcp-server-card.ts, team-view.ts, theme.css |
| MCP-003 | MCP-Zuweisung zu Skills - Checkboxen im Edit-Modal, Badges in Card, Tools in Detail-Modal | aos-team-edit-modal.ts, aos-team-card.ts, aos-team-detail-modal.ts, team-view.ts, theme.css |
| MCP-004 | Verwaiste Referenzen & Edge Cases - Orphaned badges in Card/Detail, empty MCP message | aos-team-card.ts, aos-team-detail-modal.ts, team-view.ts, theme.css |
| MCP-005 | Backend Tests - McpConfigReaderService tests, mcpTools parsing/writing tests, MCP route tests | mcp-config-reader.service.test.ts, skills-reader.service.test.ts, team.routes.test.ts |
| MCP-997 | Code Review - Full diff review, 1 minor CSS fix (--font-mono → --font-family-mono) | review-report.md, theme.css |
| MCP-998 | Integration Validation - 60/60 tests passed, builds OK, lint OK, all 9 connections active | spec.md, story-998-integration-validation.md |

## New Exports & APIs

**Types (ui/src/shared/types/team.protocol.ts):**
- `McpServerSummary` - `{ name: string, type: string, command: string, args: string[] }`
- `McpConfigResponse` - `{ success: boolean, servers?: McpServerSummary[], message?: string, error?: string }`
- `SkillSummary.mcpTools: string[]` - MCP tool names from SKILL.md frontmatter
- `SkillDetail.mcpTools: string[]` - MCP tool names from SKILL.md frontmatter

**Services (ui/src/server/services/mcp-config-reader.service.ts):**
- `mcpConfigReaderService.readConfig(projectPath)` - Returns `{ servers: McpServerSummary[], message?: string }`

**Services (ui/src/server/services/skills-reader.service.ts):**
- `skillsReaderService.updateSkillContent(projectPath, skillId, content, mcpTools?)` - Now accepts optional `mcpTools: string[]`
- `parseFrontmatter()` now returns `mcpTools: string[]` from `mcpTools: [tool1, tool2]` frontmatter field

**API Endpoints (ui/src/server/routes/team.routes.ts):**
- `GET /:projectPath/mcp-config` - Returns `McpConfigResponse` with MCP servers (env stripped)
- `PUT /:projectPath/skills/:skillId` - Now accepts optional `mcpTools: string[]` in body

**Components (ui/frontend/src/components/team/aos-mcp-server-card.ts):**
- `<aos-mcp-server-card .server=${McpServerSummary}>` - Read-only card displaying MCP server name, type badge, command+args

**Views (ui/frontend/src/views/team-view.ts):**
- `mcpServers: McpServerSummary[]` - State holding loaded MCP servers
- `mcpLoadState: McpLoadState` - Loading state for MCP config ('idle' | 'loading' | 'loaded' | 'error')
- `loadMcpConfig()` - Fetches GET /:projectPath/mcp-config
- `renderMcpSection()` - Renders MCP section after team sections (handles loaded, empty, error states)
- `availableMcpToolNames` getter returns MCP server names when loaded (used for orphaned detection)
- `availableMcpTools` passed to `aos-team-card`, `aos-team-detail-modal`, and `aos-team-edit-modal`

**Components (ui/frontend/src/components/team/aos-team-edit-modal.ts):**
- `availableMcpTools: string[]` - Property for available MCP tool names
- `selectedMcpTools: string[]` - State for currently selected MCP tools
- MCP checkboxes section rendered when `availableMcpTools.length > 0`
- Save sends `{ content, mcpTools }` in PUT request body

**Components (ui/frontend/src/components/team/aos-team-card.ts):**
- `availableMcpTools: string[]` - Property for orphaned tool detection
- MCP tool badges rendered in footer from `skill.mcpTools`
- Orphaned tools get `.team-card__mcp-badge--orphaned` class + title tooltip

**Components (ui/frontend/src/components/team/aos-team-detail-modal.ts):**
- `availableMcpTools: string[]` - Property for orphaned tool detection
- MCP tools section rendered in Skill tab from `skillDetail.mcpTools`
- Orphaned tools get warning class + "MCP Tool nicht verfuegbar" text

## Integration Notes

- `.mcp.json` is read from project root with fallback to parent directory (monorepo support)
- env field is NEVER exposed to frontend (security critical)
- mcpTools in SKILL.md frontmatter uses YAML inline array format: `mcpTools: [tool1, tool2]`
- Empty mcpTools = `[]` (not undefined)
- MCP section renders AFTER team sections (Development Team, Custom Teams, Einzelpersonen) in renderGrouped()
- MCP data loads in parallel to skills data (both triggered in updated())
- MCP error does not affect team skills display (isolated error handling)
- Orphaned detection: tool in `skill.mcpTools` not in `availableMcpTools` (only when availableMcpTools.length > 0)
- Empty MCP section shows "Keine MCP-Server konfiguriert" (not "Keine MCP-Konfiguration gefunden")

## File Change Summary

| File | Action | Story |
|------|--------|-------|
| ui/src/shared/types/team.protocol.ts | Modified | MCP-001 |
| ui/src/server/services/mcp-config-reader.service.ts | Created | MCP-001 |
| ui/src/server/services/skills-reader.service.ts | Modified | MCP-001 |
| ui/src/server/routes/team.routes.ts | Modified | MCP-001 |
| ui/frontend/src/components/team/aos-mcp-server-card.ts | Created | MCP-002 |
| ui/frontend/src/views/team-view.ts | Modified | MCP-002 |
| ui/frontend/src/styles/theme.css | Modified | MCP-002 |
| ui/frontend/src/components/team/aos-team-edit-modal.ts | Modified | MCP-003 |
| ui/frontend/src/components/team/aos-team-card.ts | Modified | MCP-003 |
| ui/frontend/src/components/team/aos-team-detail-modal.ts | Modified | MCP-003 |
| ui/frontend/src/views/team-view.ts | Modified | MCP-003 |
| ui/frontend/src/styles/theme.css | Modified | MCP-003 |
| ui/frontend/src/components/team/aos-team-card.ts | Modified | MCP-004 |
| ui/frontend/src/components/team/aos-team-detail-modal.ts | Modified | MCP-004 |
| ui/frontend/src/views/team-view.ts | Modified | MCP-004 |
| ui/frontend/src/styles/theme.css | Modified | MCP-004 |
