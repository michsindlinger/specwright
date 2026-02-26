# Team View + Team Card Komponenten

> Story ID: TEAM-003
> Spec: Dev-Team Visualization
> Created: 2026-02-25
> Last Updated: 2026-02-25

**Priority**: High
**Type**: Frontend
**Estimated Effort**: S
**Dependencies**: TEAM-001, TEAM-002

---

## Feature

```gherkin
Feature: Team-Übersichtsseite mit Skill-Karten
  Als Entwickler
  möchte ich mein Agent-Team als Karten-Grid sehen,
  damit ich alle verfügbaren Skills und deren Lernfortschritt überblicken kann.
```

---

## Akzeptanzkriterien (Gherkin-Szenarien)

### Szenario 1: Team-Karten im Grid

```gherkin
Scenario: Skills werden als Karten-Grid angezeigt
  Given mein Projekt hat 5 Skills unter .claude/skills/
  When ich die Team-Seite öffne
  Then sehe ich 5 Karten in einem responsiven Grid
  And jede Karte zeigt den Skill-Namen
  And jede Karte zeigt die Rolle/Kategorie als Badge
  And jede Karte zeigt eine Kurzbeschreibung
  And jede Karte zeigt die Anzahl der Learnings
```

### Szenario 2: Karte anklicken

```gherkin
Scenario: Klick auf Skill-Karte öffnet Detail-Modal
  Given ich bin auf der Team-Seite mit Skills
  When ich auf eine Skill-Karte klicke
  Then öffnet sich ein Detail-Modal für diesen Skill
```

### Szenario 3: Loading State

```gherkin
Scenario: Ladezustand beim Abrufen der Skills
  Given ich navigiere zur Team-Seite
  When die Skills noch geladen werden
  Then sehe ich einen Ladezustand
  And nach dem Laden sehe ich die Skill-Karten
```

### Edge Cases & Fehlerszenarien

```gherkin
Scenario: Keine Skills vorhanden (Empty State)
  Given mein Projekt hat kein .claude/skills/ Verzeichnis
  When ich die Team-Seite öffne
  Then sehe ich einen informativen Hinweis
  And der Hinweis empfiehlt "/build-development-team" zu verwenden

Scenario: API-Fehler beim Laden
  Given die Skills-API ist nicht erreichbar
  When ich die Team-Seite öffne
  Then sehe ich eine Fehlermeldung
  And ich kann die Seite neu laden
```

---

## Technische Verifikation (Automated Checks)

### Datei-Prüfungen

- [x] FILE_EXISTS: ui/frontend/src/views/aos-team-view.ts
- [x] FILE_EXISTS: ui/frontend/src/components/team/aos-team-card.ts

### Inhalt-Prüfungen

- [x] CONTAINS: ui/frontend/src/views/aos-team-view.ts enthält "aos-team-card"
- [x] CONTAINS: ui/frontend/src/views/aos-team-view.ts enthält "/api/team"
- [x] CONTAINS: ui/frontend/src/components/team/aos-team-card.ts enthält "card-click"

### Funktions-Prüfungen

- [x] BUILD_PASS: `cd ui/frontend && npm run build` exits with code 0

---

## Required MCP Tools

Keine MCP Tools erforderlich.

---

## Technisches Refinement (vom Architect)

### DoR (Definition of Ready) - Vom Architect

#### Fachliche Anforderungen
- [x] Fachliche requirements klar definiert
- [x] Akzeptanzkriterien sind spezifisch und prüfbar
- [x] Business Value verstanden

#### Technische Vorbereitung
- [x] Technischer Ansatz definiert (WAS/WIE/WO)
- [x] Abhängigkeiten identifiziert
- [x] Betroffene Komponenten bekannt
- [x] Erforderliche MCP Tools dokumentiert (falls zutreffend)
- [x] Story ist angemessen geschätzt (max 5 Dateien, 400 LOC)

#### Full-Stack Konsistenz
- [x] Alle betroffenen Layer identifiziert
- [x] Integration Type bestimmt
- [x] Kritische Integration Points dokumentiert
- [x] Handover-Dokumente definiert

---

### DoD (Definition of Done) - Vom Architect

#### Implementierung
- [x] Code implementiert und folgt Style Guide
- [x] Architektur-Vorgaben eingehalten
- [x] Security/Performance Anforderungen erfüllt

#### Qualitätssicherung
- [x] Alle Akzeptanzkriterien erfüllt
- [x] Code Review durchgeführt und genehmigt

#### Dokumentation
- [x] Keine Linting Errors
- [x] Completion Check Commands alle erfolgreich

---

### Betroffene Layer & Komponenten

**Integration Type:** Frontend-only

| Layer | Komponenten | Änderung |
|-------|-------------|----------|
| Frontend | aos-team-view.ts | Neue View: Grid-Layout, API-Call, Loading/Error/Empty States |
| Frontend | aos-team-card.ts | Neue Komponente: Skill-Karte mit Badge, Beschreibung, Learnings |

**Kritische Integration Points:**
- aos-team-view → team.routes.ts: HTTP fetch() für Skills-Liste (API aus TEAM-001)
- aos-team-view → aos-team-card: Property Binding `.skill=${skillSummary}`
- aos-team-card → aos-team-view: Custom Event `@card-click` mit `{ skillId }`

---

### Technical Details

**WAS:** Team-Übersichtsseite (aos-team-view) mit responsivem Karten-Grid und Team-Mitglieder-Karte (aos-team-card).

**WIE (Architektur-Guidance ONLY):**
- aos-team-view: Folge Pattern von `aos-getting-started-view.ts` (View mit Context + Data Loading)
- aos-team-card: Folge Pattern von `spec-card.ts` (Karte mit Click-Event)
- Light DOM Pattern (`createRenderRoot() { return this; }`)
- `@consume` projectContext für aktiven Projektpfad
- CSS Grid mit responsiven Spalten via bestehende theme.css Variables
- Empty State als informative Card mit `/build-development-team` Hinweis
- Kategorie-Badge farbcodiert (Frontend=blau, Backend=grün, Architecture=lila etc.)

**WO:**
- NEU: `ui/frontend/src/views/aos-team-view.ts`
- NEU: `ui/frontend/src/components/team/aos-team-card.ts`

**Abhängigkeiten:** TEAM-001 (Backend API), TEAM-002 (Routing)

**Geschätzte Komplexität:** S

---

### Relevante Skills

| Skill | Pfad | Grund |
|-------|------|-------|
| frontend-lit | .claude/skills/frontend-lit/SKILL.md | Lit Component Patterns, Light DOM, Context API |

---

### Creates Reusable Artifacts

**Creates Reusable:** yes

| Artefakt | Typ | Pfad | Beschreibung |
|----------|-----|------|--------------|
| aos-team-view | UI Component | ui/frontend/src/views/aos-team-view.ts | Team-Übersichtsseite mit Grid-Layout |
| aos-team-card | UI Component | ui/frontend/src/components/team/aos-team-card.ts | Skill-Karte mit Badge und Learnings-Anzeige |

---

### Completion Check

```bash
# Verify files exist
test -f ui/frontend/src/views/aos-team-view.ts && echo "aos-team-view exists"
test -f ui/frontend/src/components/team/aos-team-card.ts && echo "aos-team-card exists"

# Verify API integration
grep -q "/api/team" ui/frontend/src/views/aos-team-view.ts && echo "API call exists"

# Verify card component used
grep -q "aos-team-card" ui/frontend/src/views/aos-team-view.ts && echo "card component used"

# Verify card click event
grep -q "card-click" ui/frontend/src/components/team/aos-team-card.ts && echo "card-click event exists"

# Verify frontend compiles
cd ui/frontend && npm run build
```

**Story ist DONE wenn:**
1. Team-View rendert Skills als Karten-Grid
2. Empty State wird bei fehlenden Skills angezeigt
3. Karten-Klick dispatcht card-click Event
4. Frontend kompiliert fehlerfrei
