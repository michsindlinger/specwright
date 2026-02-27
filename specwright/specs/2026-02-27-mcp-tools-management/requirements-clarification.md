# Requirements Clarification - MCP Tools Management

**Created:** 2026-02-27
**Status:** Pending User Approval

## Feature Overview
MCP Tools Management im Teambereich der Specwright UI: Anzeige der installierten MCP-Server aus der Projekt-`.mcp.json` und Zuweisung von MCP-Tools zu Teammitgliedern (Claude Code Skills) via neuem Frontmatter-Feld.

## Target Users
Entwickler und Tech Leads, die Specwright UI nutzen und ihren Agents gezielt MCP-Tools zuweisen wollen.

## Business Value
Transparenz: User sehen auf einen Blick welche MCP-Tools im Projekt verfügbar sind. Kontrolle: Durch die Zuweisung zu Skills wird klar definiert, welche Agents welche externen Tools nutzen duerfen/sollen. Das verbessert die Nachvollziehbarkeit und ermoeglicht gezieltere Agent-Konfiguration.

## Functional Requirements

### MCP Tools Uebersicht (Read-only)
1. Die Team-View zeigt eine neue Sektion "MCP Tools" neben den bestehenden Team-Kategorien (DevTeam, Custom Teams, Individual Contributors)
2. Alle MCP-Server aus der Projekt-`.mcp.json` werden als Karten dargestellt
3. Jede Karte zeigt: Server-Name, Typ (stdio etc.), Command/Args als Kurzinfo
4. Die Uebersicht ist rein lesend - kein Hinzufuegen/Entfernen/Editieren von MCP-Servern

### MCP-Zuweisung zu Teammitgliedern
5. SKILL.md erhaelt ein neues optionales Frontmatter-Feld: `mcpTools: [tool1, tool2]`
6. Im Team-Edit-Modal (aos-team-edit-modal) wird eine neue Sektion "MCP Tools" mit Checkboxen fuer alle verfuegbaren MCP-Tools angezeigt
7. Beim Speichern werden die ausgewaehlten MCP-Tools ins Frontmatter der SKILL.md geschrieben
8. Im Team-Detail-Modal und Team-Card wird angezeigt, welche MCP-Tools dem Skill zugewiesen sind

### Warnung bei verwaisten Referenzen
9. Wenn ein Skill ein MCP-Tool referenziert, das nicht mehr in `.mcp.json` existiert, wird eine Warnung angezeigt (z.B. Badge "MCP Tool nicht verfuegbar")

## Affected Areas & Dependencies
- **Team View (Frontend)** - Neue MCP-Sektion, erweiterte Cards/Modals
- **Team Routes (Backend)** - Neuer Endpoint zum Lesen der `.mcp.json`
- **Skills Reader Service (Backend)** - Parsing des neuen `mcpTools` Frontmatter-Felds
- **Team Protocol (Shared Types)** - Erweiterung von SkillSummary/SkillDetail um mcpTools
- **SKILL.md Frontmatter** - Neues optionales Feld `mcpTools`

## Edge Cases & Error Scenarios
- `.mcp.json` existiert nicht im Projekt → MCP-Sektion zeigt Hinweis "Keine MCP-Konfiguration gefunden"
- `.mcp.json` ist fehlerhaft (invalid JSON) → Fehlermeldung in der MCP-Sektion
- Skill referenziert MCP-Tool das nicht mehr in `.mcp.json` existiert → Warnung-Badge am Skill
- `.mcp.json` hat keine `mcpServers` property → Leere MCP-Sektion mit Hinweis
- Skill hat kein `mcpTools`-Feld im Frontmatter → Keine MCP-Tools zugewiesen (Standard)

## Security & Permissions
- Read-only fuer `.mcp.json` - kein Schreibzugriff ueber die UI
- MCP-Tool-Zuweisung aendert nur die SKILL.md (bestehender PUT-Endpoint)

## Performance Considerations
- `.mcp.json` wird beim Laden der Team-View einmal gelesen (kein Polling)
- Kein Caching noetig (kleine Datei, seltene Aenderungen)

## Scope Boundaries

**IN SCOPE:**
- Read-only Anzeige der MCP-Server aus Projekt-`.mcp.json`
- Neue Sektion in der Team-View fuer MCP-Tools
- MCP-Tool-Karten mit Name, Typ, Command-Info
- `mcpTools`-Frontmatter-Feld in SKILL.md
- Checkbox-basierte Zuweisung im Team-Edit-Modal
- Anzeige zugewiesener MCP-Tools in Card/Detail-Modal
- Warnung bei verwaisten MCP-Tool-Referenzen
- Backend-API zum Lesen der `.mcp.json`

**OUT OF SCOPE:**
- Hinzufuegen/Entfernen von MCP-Servern ueber die UI
- Editieren der MCP-Server-Konfiguration (command, args, env)
- Globale `~/.claude/.mcp.json` Unterstuetzung
- MCP-Server Health-Checking oder Live-Status
- MCP-Server-Logs oder Debugging-Informationen

## Open Questions
- Keine

## Proposed User Stories (High Level)
1. **MCP Tools API** - Backend-Endpoint zum Lesen und Parsen der `.mcp.json`
2. **MCP Tools Uebersicht** - Neue Sektion in der Team-View mit MCP-Server-Karten
3. **MCP-Zuweisung in Skills** - Erweiterung des Frontmatter-Parsings und Team-Edit-Modals
4. **MCP-Anzeige und Warnungen** - Anzeige zugewiesener Tools in Cards/Modals + Orphan-Warnungen

---
*Review this document carefully. Once approved, detailed user stories will be generated.*
