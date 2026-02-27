# MCP Tools Uebersicht im Frontend

> Story ID: MCP-002
> Spec: MCP Tools Management
> Created: 2026-02-27
> Last Updated: 2026-02-27

**Priority**: High
**Type**: Frontend
**Estimated Effort**: S
**Dependencies**: MCP-001

---

## Feature

```gherkin
Feature: MCP-Server als Karten in der Team-View anzeigen
  Als Entwickler
  moechte ich alle verfuegbaren MCP-Tools als Karten im Team-Bereich sehen,
  damit ich auf einen Blick weiss welche externen Tools im Projekt installiert sind.
```

---

## Akzeptanzkriterien (Gherkin-Szenarien)

### Szenario 1: MCP-Server-Karten werden angezeigt

```gherkin
Scenario: Anzeige der MCP-Server-Karten in der Team-View
  Given das Projekt hat 3 MCP-Server konfiguriert (perplexity, playwright, context7)
  When ich die Team-View oeffne
  Then sehe ich eine neue Sektion "MCP Tools"
  And die Sektion zeigt 3 Karten
  And jede Karte zeigt den Server-Namen, Typ und Command-Info
```

### Szenario 2: Leere MCP-Sektion

```gherkin
Scenario: Keine MCP-Konfiguration vorhanden
  Given das Projekt hat keine `.mcp.json`
  When ich die Team-View oeffne
  Then sehe ich die MCP-Sektion mit dem Hinweis "Keine MCP-Konfiguration gefunden"
```

### Szenario 3: MCP-Sektion Position

```gherkin
Scenario: MCP-Sektion wird nach den Team-Kategorien angezeigt
  Given das Projekt hat MCP-Server und Team-Mitglieder konfiguriert
  When ich die Team-View oeffne
  Then erscheint die MCP-Sektion als eigener Bereich
  And die bestehenden Team-Kategorien bleiben unveraendert
```

### Edge Cases & Fehlerszenarien

```gherkin
Scenario: Fehlerhafter API-Aufruf
  Given die MCP-Config API gibt einen Fehler zurueck
  When ich die Team-View oeffne
  Then sehe ich eine Fehlermeldung in der MCP-Sektion
  And die restliche Team-View funktioniert weiterhin
```

---

## Technische Verifikation (Automated Checks)

### Datei-Pruefungen

- [x] FILE_EXISTS: ui/frontend/src/components/team/aos-mcp-server-card.ts

### Inhalt-Pruefungen

- [x] CONTAINS: ui/frontend/src/views/team-view.ts enthaelt "mcp-config"
- [x] CONTAINS: ui/frontend/src/views/team-view.ts enthaelt "aos-mcp-server-card"

### Funktions-Pruefungen

- [x] BUILD_PASS: `cd ui/frontend && npm run build` exits with code 0

---

## Required MCP Tools

Keine MCP-Tools erforderlich.

---

## Technisches Refinement (vom Architect)

### DoR (Definition of Ready) - Vom Architect

#### Fachliche Anforderungen
- [x] Fachliche requirements klar definiert
- [x] Akzeptanzkriterien sind spezifisch und pruefbar
- [x] Business Value verstanden

#### Technische Vorbereitung
- [x] Technischer Ansatz definiert (WAS/WIE/WO)
- [x] Abhaengigkeiten identifiziert
- [x] Betroffene Komponenten bekannt
- [x] Erforderliche MCP Tools dokumentiert (keine erforderlich)
- [x] Story ist angemessen geschaetzt (3 Dateien, ~200 LOC)

#### Full-Stack Konsistenz
- [x] **Alle betroffenen Layer identifiziert** (Frontend-only)
- [x] **Integration Type bestimmt** (Frontend-only)
- [x] **Kritische Integration Points dokumentiert** (API Call + Component Binding)
- [x] **Handover-Dokumente definiert** (n/a - nutzt API Contract aus MCP-001)

**Story ist READY wenn alle Checkboxen angehakt sind.**

---

### DoD (Definition of Done) - Vom Architect

#### Implementierung
- [x] Code implementiert und folgt Style Guide
- [x] Architektur-Vorgaben eingehalten (WIE section)
- [x] MCP-Sektion zeigt Server-Karten an

#### Qualitaetssicherung
- [x] Alle Akzeptanzkriterien erfuellt (via Completion Check verifiziert)
- [x] Completion Check Commands alle erfolgreich (exit 0)

#### Dokumentation
- [x] Keine Linting Errors
- [x] Frontend Build erfolgreich

#### Integration (Verbindung: team-view -> aos-mcp-server-card)
- [x] **Integration hergestellt: team-view.ts -> GET /api/team/:path/mcp-config**
  - [x] Fetch-Call existiert in team-view.ts
  - [x] Daten werden in State gespeichert
- [x] **Integration hergestellt: team-view.ts -> aos-mcp-server-card**
  - [x] Import existiert
  - [x] Property Binding `.server=${...}` im Template

**Story ist DONE wenn alle Checkboxen angehakt sind.**

---

### Betroffene Layer & Komponenten

**Integration Type:** Frontend-only

**Betroffene Komponenten:**

| Layer | Komponenten | Aenderung |
|-------|-------------|----------|
| Frontend | aos-mcp-server-card.ts (NEU) | Neue Lit-Komponente fuer MCP-Server-Karte |
| Frontend | team-view.ts | MCP-Daten laden, neue Sektion rendern |
| Frontend | theme.css | CSS fuer MCP-Server-Cards und MCP-Sektion |

**Kritische Integration Points:**
- team-view.ts -> GET /api/team/:path/mcp-config (REST API Call)
- team-view.ts -> aos-mcp-server-card (Lit Component Import + Property Binding)

---

### Technical Details

**WAS:**
1. Neue Lit-Komponente `aos-mcp-server-card`: Zeigt einen einzelnen MCP-Server als Karte an (Name, Typ, Command/Args-Info)
2. Erweiterung `team-view.ts`: Neuer State fuer MCP-Daten (`mcpServers`, `mcpLoadState`), Fetch-Call zu GET mcp-config, neue Sektion "MCP Tools" in `renderGrouped()`
3. Erweiterung `theme.css`: CSS fuer MCP-Server-Card und MCP-Sektion (wiederverwendet `.team-section` Pattern)

**WIE (Architektur-Guidance ONLY):**
- `aos-mcp-server-card` folgt dem bestehenden Card-Pattern aus `aos-team-card.ts`: Light DOM, `@property()` fuer Daten, BEM-CSS-Klassen
- Property: `.server` vom Typ `McpServerSummary` (aus team.protocol.ts importiert)
- Karte zeigt: Name (Heading), Typ-Badge (z.B. "stdio"), Command + Args als kompakte Info
- Kein Click-Event noetig (read-only Karte, kein Detail-Modal)
- `team-view.ts` laedt MCP-Config parallel zu Skills in `loadSkills()` (oder eigene `loadMcpConfig()`-Methode)
- MCP-Sektion wird NACH den bestehenden Team-Sektionen in `renderGrouped()` angezeigt, nutzt bestehende `.team-section` / `.team-section__title` CSS-Klassen
- Fehlerbehandlung: Wenn API-Call fehlschlaegt, zeigt die MCP-Sektion eine Fehlermeldung, der Rest der Team-View bleibt unberuehrt
- Leerer Zustand: Wenn keine Server vorhanden, Hinweis "Keine MCP-Konfiguration gefunden"
- MCP-Daten (`McpServerSummary[]`) werden als State gespeichert und spaeter an MCP-003 und MCP-004 weitergereicht (per Property an Cards/Modals)

**WO:**
- `ui/frontend/src/components/team/aos-mcp-server-card.ts` - NEU erstellen
- `ui/frontend/src/views/team-view.ts` - MCP-Sektion hinzufuegen
- `ui/frontend/src/styles/theme.css` - CSS fuer MCP-Server-Cards

**Abhaengigkeiten:** MCP-001 (Backend API muss verfuegbar sein)

**Geschaetzte Komplexitaet:** S

**Relevante Skills:**

| Skill | Pfad | Grund |
|-------|------|-------|
| frontend-lit | .claude/skills/frontend-lit/SKILL.md | Lit Component Patterns und Light DOM Conventions |
| domain-specwright-ui | .claude/skills/domain-specwright-ui/SKILL.md | Team-View Architektur und bestehende Section-Patterns |

---

### Creates Reusable Artifacts

**Creates Reusable:** yes

**Reusable Artifacts:**

| Artefakt | Typ | Pfad | Beschreibung |
|----------|-----|------|--------------|
| aos-mcp-server-card | UI Component | ui/frontend/src/components/team/aos-mcp-server-card.ts | Lit-Komponente fuer MCP-Server-Karte |

---

### Completion Check

```bash
# Auto-Verify Commands
test -f ui/frontend/src/components/team/aos-mcp-server-card.ts
grep -q "mcp-config" ui/frontend/src/views/team-view.ts
grep -q "aos-mcp-server-card" ui/frontend/src/views/team-view.ts
cd ui/frontend && npm run build
```

**Story ist DONE wenn:**
1. Alle FILE_EXISTS/CONTAINS checks bestanden
2. Alle *_PASS commands exit 0
3. Git diff zeigt nur erwartete Aenderungen
