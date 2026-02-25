# Requirements Clarification - Dev-Team Visualization

**Created:** 2026-02-25
**Status:** Pending User Approval

## Feature Overview

Visualisierung des Specwright Entwickler-Teams als Karten-basierte Ansicht in der Web UI. Das "Team" wird in Specwright durch Skills abgebildet (`.claude/skills/[name]/SKILL.md`) und soll als eigene Seite mit Team-Mitglieder-Karten dargestellt werden - inklusive Lernfortschritt (Dos/Don'ts).

## Target Users

- **Primr:** Entwickler, die ihr Agent-Team berblicken und verstehen wollen
- **Sekundr:** Neue Teammitglieder, die sich orientieren wollen, welche Skills/Rollen verfgbar sind

## Business Value

- **Transparenz:** bersicht ber alle verfgbaren Skills und deren Rollen im Projekt
- **Lernfortschritt:** Sichtbarkeit, wie viel jeder Skill bereits gelernt hat (Dos/Don'ts)
- **Onboarding:** Neue Nutzer verstehen sofort, welche Agenten-Rollen im Projekt aktiv sind

## Functional Requirements

### FR-1: Team-bersichtsseite
- Eigene Seite "/team" in der Web UI
- Eigener Menpunkt "Team" in der Seitenleiste
- Grid-Layout mit Team-Mitglieder-Karten

### FR-2: Team-Mitglieder-Karte
Jede Karte zeigt:
- **Skill-Name** (z.B. "Frontend Lit", "Backend Express")
- **Rolle/Kategorie** (z.B. "Frontend", "Backend", "QA", "Architecture")
- **Beschreibung** (aus SKILL.md extrahiert)
- **Lernfortschritt** als einfache Zahlen: "X Dos, Y Don'ts" (aus `dos-and-donts.md`)

### FR-3: Detailansicht (Modal)
- Klick auf eine Karte ffnet ein Modal/Overlay
- Modal zeigt:
  - Vollstndigen Skill-Inhalt (aus SKILL.md)
  - Dos-and-Donts Liste (aus `dos-and-donts.md`)
  - Liste der letzten Learnings (einsehbar)

### FR-4: Leerer Zustand (Empty State)
- Wenn keine Skills existieren (frisch installiertes Projekt):
  - Hinweis anzeigen: "Erstelle dein Team mit `/build-development-team`"
  - Kein leeres Grid, sondern informativer Empty State

### FR-5: Backend-Endpunkt
- REST-Endpunkt der Skills aus dem Dateisystem liest (`.claude/skills/[name]/`)
- Liefert strukturiertes JSON mit:
  - Skill-Name, Beschreibung, Rolle
  - Dos/Don'ts Zhlung und Inhalte
  - SKILL.md Inhalt (fr Detailansicht)

## Affected Areas & Dependencies

- **Frontend (Lit):** Neue Seite + Komponenten (`aos-team-view`, `aos-team-card`, `aos-team-detail-modal`)
- **Backend (Express):** Neuer API-Endpunkt zum Lesen der Skills aus dem Dateisystem
- **Navigation:** Seitenleiste muss um "Team" Menpunkt erweitert werden
- **Dateisystem:** Lese-Zugriff auf `.claude/skills/[name]/SKILL.md` und `dos-and-donts.md`

## Edge Cases & Error Scenarios

- **Keine Skills vorhanden:** Empty State mit Hinweis auf `/build-development-team`
- **Skill ohne `dos-and-donts.md`:** Lernfortschritt zeigt "0 Dos, 0 Don'ts" - kein Fehler
- **Skill ohne Beschreibung in SKILL.md:** Fallback-Text "Keine Beschreibung verfgbar"
- **Dateisystem-Fehler:** Graceful Error Handling wenn Skills-Verzeichnis nicht lesbar
- **Groe Anzahl Skills:** Grid skaliert (CSS Grid mit responsive Spalten)

## Security & Permissions

- Read-Only Zugriff auf Dateisystem (keine Schreiboperationen)
- Keine besonderen Berechtigungen ntig (lokale Anwendung)

## Performance Considerations

- Skills werden bei Seitenaufruf geladen (kein Caching ntig bei berschaubarer Anzahl)
- SKILL.md Inhalte fr Modal knnen lazy geladen werden (erst bei Klick)

## Scope Boundaries

**IN SCOPE:**
- Team-bersichtsseite mit Karten-Grid
- Team-Mitglieder-Karten mit Name, Rolle, Beschreibung, Lernfortschritt
- Detail-Modal mit SKILL.md + Dos-and-Donts
- Backend-Endpunkt zum Lesen der Skills
- Empty State fr leere Projekte
- Navigation-Eintrag "Team" in Seitenleiste

**OUT OF SCOPE:**
- Skills erstellen/bearbeiten ber die UI
- Skills lschen ber die UI
- Drag & Drop Sortierung
- Skill-Zuordnung zu Stories/Specs
- Filterung/Suche (kann spter ergnzt werden)
- Skill-Konfiguration (Einstellungen ndern)

## Open Questions

- Keine offenen Fragen

## Proposed User Stories (High Level)

1. **Backend: Skills-API-Endpunkt** - REST-Endpunkt der alle Skills mit Metadaten aus dem Dateisystem liest
2. **Frontend: Team-bersichtsseite** - Neue Seite mit Grid-Layout und Team-Mitglieder-Karten
3. **Frontend: Team-Detail-Modal** - Modal/Overlay mit vollstndiger Skill-Ansicht (SKILL.md + Dos-and-Donts)
4. **Frontend: Navigation & Routing** - "Team" Menpunkt in Seitenleiste + Routing zur Team-Seite
5. **Frontend: Empty State** - Informativer Hinweis wenn keine Skills vorhanden

---
*Review this document carefully. Once approved, detailed user stories will be generated.*
