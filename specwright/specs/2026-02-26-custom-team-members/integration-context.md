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
| CTM-004 | Edit-Modal mit CodeMirror-Editor für SKILL.md | aos-team-edit-modal.ts (NEU), Edit-Buttons in Card + Detail-Modal, PUT API |
| CTM-005 | Delete mit Confirm-Dialog und REST DELETE | Delete-Buttons in Card + Detail-Modal, aos-confirm-dialog, DELETE API |
| CTM-006 | Add-Button + workflow-start-interactive Event | team-view.ts (Add-Button), app.ts (Event-Handler) |

---

## New Exports & APIs

### Components
<!-- New UI components created -->
- `ui/frontend/src/components/team/aos-team-edit-modal.ts` → `<aos-team-edit-modal .open=${bool} .skillId=${string} @modal-close @skill-saved>`

### Services
<!-- New service classes/modules -->
- `ui/src/server/services/skills-reader.service.ts` → `updateSkillContent(projectPath, skillId, content)` - Schreibt SKILL.md
- `ui/src/server/services/skills-reader.service.ts` → `deleteSkill(projectPath, skillId)` - Löscht Skill-Verzeichnis

### Hooks / Utilities
<!-- New hooks, helpers, utilities -->
_None yet_

### API Endpoints
- `PUT /api/team/:projectPath/skills/:skillId` → Body: `{ content: string }` → Response: `SkillUpdateResponse`
- `DELETE /api/team/:projectPath/skills/:skillId` → Response: `SkillUpdateResponse`

### Types / Interfaces
<!-- New type definitions -->
- `ui/src/shared/types/team.protocol.ts` → `SkillSummary.teamType: 'devteam' | 'team' | 'individual'`
- `ui/src/shared/types/team.protocol.ts` → `SkillSummary.teamName: string`
- `ui/src/shared/types/team.protocol.ts` → `SkillDetail.teamType` + `SkillDetail.teamName` (gleiche Felder)
- `ui/src/shared/types/team.protocol.ts` → `SkillUpdateResponse { success: boolean; error?: string }`

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
- **Edit-Modal (CTM-004):** `aos-team-edit-modal` nutzt `aos-file-editor` (CodeMirror 6) als Editor. Speichern via PUT `/api/team/:projectPath/skills/:skillId`. Events: `edit-click` (von Card/Detail-Modal), `skill-saved` (nach erfolgreichem Speichern → löst Reload in team-view aus).
- **Edit-Buttons (CTM-004):** `aos-team-card` hat Edit-Button (sichtbar bei Hover), `aos-team-detail-modal` hat Edit-Button im Header. Beide dispatchen `edit-click` Event.
- **Delete-Flow (CTM-005):** `aos-team-card` und `aos-team-detail-modal` dispatchen `delete-click` Event mit `{skillId, skillName, teamType}`. `team-view` orchestriert: `aos-confirm-dialog` öffnen → bei Bestätigung DELETE API-Call → Skills-Refresh. DevTeam-Skills erhalten zusätzliche Warnung im Dialog.
- **Workflow-Trigger (CTM-006):** "Teammitglied hinzufügen" Button in `team-view.ts` Header dispatcht `workflow-start-interactive` Event mit `{ commandId: 'specwright:add-team-member' }`. Event wird in `app.ts` auf `<aos-team-view>` gefangen und startet Terminal-Workflow. Auto-Refresh nach Workflow via `updated()` Lifecycle-Hook (re-mount bei Navigation zurück zur Team-Seite).

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
| ui/frontend/src/components/team/aos-team-edit-modal.ts | Created | CTM-004 |
| ui/frontend/src/components/team/aos-team-card.ts | Modified | CTM-004 |
| ui/frontend/src/components/team/aos-team-detail-modal.ts | Modified | CTM-004 |
| ui/frontend/src/views/team-view.ts | Modified | CTM-004 |
| ui/frontend/src/styles/theme.css | Modified | CTM-004 |
| ui/src/shared/types/team.protocol.ts | Modified | CTM-004 |
| ui/src/server/services/skills-reader.service.ts | Modified | CTM-004 |
| ui/src/server/routes/team.routes.ts | Modified | CTM-004 |
| ui/frontend/src/views/team-view.ts | Modified | CTM-005 |
| ui/frontend/src/components/team/aos-team-card.ts | Modified | CTM-005 |
| ui/frontend/src/components/team/aos-team-detail-modal.ts | Modified | CTM-005 |
| ui/src/server/services/skills-reader.service.ts | Modified | CTM-005 |
| ui/src/server/routes/team.routes.ts | Modified | CTM-005 |
| ui/frontend/src/views/team-view.ts | Modified | CTM-006 |
| ui/frontend/src/app.ts | Modified | CTM-006 |
