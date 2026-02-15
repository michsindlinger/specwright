# Requirements Clarification - Cloud Terminal Erweiterung

**Created:** 2026-02-11
**Status:** Pending User Approval

## Feature Overview
Erweiterung der Cloud Terminal Sidebar um die Möglichkeit, neben Claude Code Sessions auch reguläre Shell-Terminals im Projektpfad zu öffnen. Beim Starten einer neuen Session kann der User wählen, ob ein normales Terminal (ohne Claude Code) oder eine Cloud Code Session (mit Provider/LLM-Auswahl) gestartet werden soll.

## Target Users
Entwickler, die Agent OS Web UI nutzen und sowohl AI-gestützte Claude Code Sessions als auch normale Shell-Terminals für manuelle Befehle im gleichen Interface benötigen.

## Business Value
- Entwickler müssen nicht mehr zwischen Web UI und einem externen Terminal wechseln
- Die Cloud Terminal Sidebar wird zu einem vollständigen Terminal-Hub
- Reduziert Context-Switching und erhöht die Produktivität
- Macht das Cloud Terminal als Feature deutlich wertvoller und vielseitiger

## Functional Requirements
1. **Terminal-Typ-Auswahl:** Beim Klick auf "Neue Session" erscheint als erste Option "Terminal" (normales Shell-Terminal), gefolgt von einem Separator, danach die bestehenden Provider/Model-Optionen für Claude Code
2. **Normales Terminal starten:** Bei Auswahl von "Terminal" wird sofort ein Shell-Terminal im Projektpfad geöffnet - ohne Provider- oder LLM-Auswahl
3. **Cloud Code Terminal:** Bei Auswahl eines Providers/Models wird wie bisher eine Claude Code Session gestartet
4. **Gemischte Tabs:** Normale Terminals und Cloud Code Terminals können gleichzeitig als Tabs in der gleichen Sidebar existieren
5. **Tab-Navigation:** Alle Terminals (normal und Cloud Code) nutzen das bestehende Tab-System ohne Unterschied

## Affected Areas & Dependencies
- `aos-cloud-terminal-sidebar` - Session-Erstellungs-Flow muss erweitert werden
- `aos-terminal-tabs` - Muss beide Terminal-Typen unterstützen (minimal changes erwartet)
- `aos-terminal-session` - Muss ohne Claude Code starten können
- `aos-model-dropdown` - Muss "Terminal"-Option als erste Gruppe anzeigen
- `CloudTerminalManager` (Backend) - Muss PTY ohne Claude Code spawnen können
- `CloudTerminalService` (Frontend) - Muss neuen Session-Typ verwalten
- `CloudTerminalProtocol` (Shared Types) - Muss neuen Terminal-Typ definieren

## Edge Cases & Error Scenarios
- **Terminal-Prozess beendet sich:** Gleiche Handhabung wie bei Cloud Code Sessions (bestehende Logik)
- **Alle Tabs geschlossen:** Gleiche Handhabung wie bisher
- **Mix aus beiden Typen:** Tabs müssen korrekt den jeweiligen Typ tracken, damit beim Schließen/Reconnect der richtige Prozess-Typ angesprochen wird

## Security & Permissions
- Normales Terminal hat dieselben Berechtigungen wie das bestehende Cloud Code Terminal (läuft lokal als User-Prozess)
- Keine zusätzlichen Security-Anforderungen

## Performance Considerations
- Keine besonderen Performance-Anforderungen über das bestehende System hinaus
- Normales Terminal sollte schneller starten als Cloud Code (keine LLM-Initialisierung nötig)

## Scope Boundaries
**IN SCOPE:**
- Terminal-Typ-Auswahl (Terminal vs. Cloud Code) im Session-Erstellungs-Flow
- "Terminal" als eigene Gruppe oben im Dropdown, mit Separator zu Providern
- Backend-Unterstützung für Plain-Shell PTY (ohne Claude Code)
- Tab-Management für gemischte Terminal-Typen
- Anpassung des Session-Datenmodells um Terminal-Typ zu tracken

**OUT OF SCOPE:**
- Umbenennung der Sidebar (bleibt "Cloud Terminal")
- Visuelle Unterscheidung zwischen Terminal-Typen in Tabs
- Terminal-spezifische Features (z.B. Split-View, Profiles)
- Custom Shell-Auswahl (immer Default-Shell des Systems)

## Open Questions
- Keine offenen Fragen

## Proposed User Stories (High Level)
1. **Terminal-Typ im Datenmodell** - Erweiterung der Types/Protokolle um Terminal-Typ (shell vs. claude-code)
2. **Backend: Plain Terminal Support** - CloudTerminalManager kann Shell-Terminals ohne Claude Code spawnen
3. **Frontend: Session-Erstellungs-UI** - Dropdown zeigt "Terminal" als eigene Gruppe, startet direkt Plain-Shell
4. **Integration: Tab-Management für gemischte Typen** - Tabs tracken und unterscheiden Terminal-Typen korrekt

---
*Review this document carefully. Once approved, detailed user stories will be generated.*
