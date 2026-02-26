# Requirements Clarification - Custom Team Members

**Created:** 2026-02-26
**Status:** Pending User Approval

## Feature Overview
Erweiterung der Team-Seite um die Möglichkeit, eigene Teammitglieder (Einzelpersonen oder Teams) zu erstellen, zu bearbeiten und zu löschen. Die Erstellung erfolgt interaktiv im Dialog mit Claude Code über einen neuen `/add-team-member` Slash-Command. Der Command funktioniert sowohl standalone im Terminal als auch über die UI.

## Target Users
Hauptbenutzer von Specwright bzw. Entwickler/Projektleiter, die Specwright in ihren Projekten nutzen.

## Business Value
- Erweitert Specwright über reine Software-Entwicklung hinaus - beliebige Experten (Steuerberater, Marketing, Social Media) können als Skills abgebildet werden
- Nutzer können ihr gesamtes "virtuelles Team" zentral in Specwright verwalten
- Interaktive Erstellung senkt die Einstiegshürde für nicht-technische Skills
- Skills können eigene Dokumenten-Templates mitbringen für konsistente Outputs

## Functional Requirements

### 1. Neuer Slash-Command `/add-team-member`
- Neuer Workflow: `specwright/workflows/team/add-team-member.md`
- Neuer Command: `.claude/commands/specwright/add-team-member.md`
- Funktioniert standalone im Terminal (ohne UI)
- Kann über UI-Button auf der Team-Seite getriggert werden

### 2. Interaktiver Dialog-Flow
Claude fragt im Dialog folgende Informationen ab:
- **Name** des Teammitglieds/Teams (z.B. "Steuerberater", "Marketing Team")
- **Typ:** Einzelperson (`individual`) oder Team (`team`)
- **Rolle/Beschreibung:** Was macht diese Person/dieses Team?
- **Wissensgebiete:** Worin ist die Person/das Team Experte?
- **Verhaltensregeln:** Wie soll sich der Agent verhalten? (Ton, Stil, Fokus)
- **Kontext-Dateien:** Auf welche Dateien/Muster soll der Skill reagieren? (`globs`)
- **Dokumenten-Templates** (optional): Falls der Skill Dokumente erstellen muss, können Templates angelegt werden, die eine konsistente Struktur sicherstellen

### 3. Skill-Erstellung (Output)
- Erstellt Skill-Ordner unter `.claude/skills/[skill-name]/`
- Generiert `SKILL.md` mit erweitertem Frontmatter:
  ```yaml
  ---
  description: [Beschreibung]
  globs: [Kontext-Dateien]
  alwaysApply: false
  teamType: individual | team    # NEU
  teamName: [Anzeigename]        # NEU
  ---
  ```
- Generiert leere `dos-and-donts.md` (für späteres Self-Learning)
- Optional: Erstellt Template-Dateien im Skill-Ordner

### 4. Team-Seite: Gruppierte Darstellung
- **Development Team:** Bestehende DevTeam-Skills (ohne `teamType` oder `teamType: devteam`)
- **Custom Teams:** Skills mit `teamType: team` - gruppiert nach Team-Name
- **Einzelpersonen:** Skills mit `teamType: individual` - eigene Sektion
- Jede Gruppe hat eigene Überschrift und visuell erkennbare Trennung

### 5. Bearbeiten (Edit)
- Button auf Team-Karte oder im Detail-Modal
- Öffnet Modal mit Markdown-Editor für SKILL.md
- Optional: Benutzer kann stattdessen einen interaktiven Dialog starten (Re-Run des Workflows)

### 6. Löschen (Delete)
- Button auf Team-Karte oder im Detail-Modal
- Confirmation Dialog vor dem Löschen
- Löscht den gesamten Skill-Ordner
- Umsetzung über MCP-Command (nicht API-Call)

### 7. Rückwärtskompatibilität
- Bestehende Skills ohne `teamType` werden als "devteam" behandelt
- Keine Migration bestehender Skills nötig
- Backend erkennt automatisch den Typ anhand Frontmatter

## Affected Areas & Dependencies
- **Team-View Frontend** (`ui/frontend/src/views/team-view.ts`) - Gruppierte Darstellung, Buttons
- **Team-Card Component** (`ui/frontend/src/components/team/aos-team-card.ts`) - Edit/Delete Buttons
- **Team-Detail-Modal** (`ui/frontend/src/components/team/aos-team-detail-modal.ts`) - Edit/Delete, Markdown-Editor
- **Skills-Reader Service** (`ui/src/server/services/skills-reader.service.ts`) - teamType Parsing
- **Team Routes** (`ui/src/server/routes/team.routes.ts`) - Gruppierte Response, Edit/Delete Endpoints
- **MCP Server** (`specwright/scripts/mcp/`) - Neuer Command für Delete/Edit
- **Workflow** (`specwright/workflows/team/`) - Neuer add-team-member Workflow
- **Command** (`.claude/commands/specwright/`) - Neuer add-team-member Command
- **Shared Types** (`ui/src/shared/types/team.protocol.ts`) - teamType, teamName Felder

## Edge Cases & Error Scenarios
- **Doppelter Name:** Skill-Ordner existiert bereits → Fehlermeldung mit Vorschlag für alternativen Namen
- **Leere Pflichtfelder:** Name und Typ sind Pflicht → Validierung im Dialog
- **Löschen von DevTeam-Skills:** Soll möglich sein, aber mit Warnung ("Dieser Skill gehört zum Development Team")
- **Ungültige Zeichen im Namen:** Skill-Ordner-Name wird sanitized (lowercase, hyphens)
- **Skill wird von aktivem Workflow genutzt:** Löschen trotzdem erlauben (Skills werden per Pfad referenziert)

## Security & Permissions
- Keine besonderen Sicherheitsanforderungen - lokale Dateisystem-Operationen
- Löschen erfordert Confirmation Dialog als Sicherheitsnetz

## Performance Considerations
- Keine besonderen Performance-Anforderungen
- Skill-Listing bleibt performant (Dateisystem-basiert, kein DB)

## Scope Boundaries

**IN SCOPE:**
- Neuer `/add-team-member` Workflow + Command
- Interaktiver Dialog zur Skill-Erstellung
- Erweiterte Frontmatter-Felder (teamType, teamName)
- Gruppierte Darstellung auf der Team-Seite (DevTeam / Teams / Einzelpersonen)
- Edit-Funktionalität (Markdown-Editor Modal + optionaler Dialog)
- Delete-Funktionalität (MCP-Command)
- Dokumenten-Templates als Teil des Skills
- Standalone-Terminal-Nutzung

**OUT OF SCOPE:**
- Migration bestehender Skills (Rückwärtskompatibel)
- Team-übergreifende Kommunikation zwischen Skills
- Rollen-basierte Zugriffsrechte
- Import/Export von Skills
- Vorgefertigte Skill-Templates (z.B. "Marketing-Experte" Vorlage)

## Open Questions
- Keine offenen Fragen

## Proposed User Stories (High Level)
1. **Workflow & Command erstellen** - `/add-team-member` Workflow mit interaktivem Dialog und Skill-Generierung
2. **Frontmatter-Erweiterung & Backend** - teamType/teamName Parsing, gruppierte API-Response
3. **Team-Seite: Gruppierte Darstellung** - Frontend-Umbau mit Sektionen für DevTeam, Teams, Einzelpersonen
4. **Edit-Funktionalität** - Markdown-Editor Modal für Skill-Bearbeitung
5. **Delete-Funktionalität** - MCP-Command + Confirmation Dialog + UI-Integration
6. **Dokumenten-Templates im Workflow** - Optionale Template-Erstellung im Dialog

---
*Review this document carefully. Once approved, detailed user stories will be generated.*
