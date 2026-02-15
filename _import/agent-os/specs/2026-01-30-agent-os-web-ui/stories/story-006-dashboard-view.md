# Dashboard View

> Story ID: AOSUI-006
> Spec: Agent OS Web UI
> Created: 2026-01-30
> Last Updated: 2026-01-30

**Priority**: High
**Type**: Full-stack
**Estimated Effort**: M
**Dependencies**: AOSUI-001, AOSUI-002, AOSUI-003

---

## Feature

```gherkin
Feature: Dashboard mit Kanban-Board
  Als Benutzer
  möchte ich alle Specs und Stories im Überblick sehen,
  damit ich den Status meiner Projekte verstehe.
```

---

## Akzeptanzkriterien (Gherkin-Szenarien)

### Szenario 1: Spec-Liste anzeigen

```gherkin
Scenario: Alle Specs des Projekts werden angezeigt
  Given das Projekt "agent-os-extended" ist ausgewählt
  And es gibt 3 Specs im agent-os/specs/ Ordner
  When ich den Dashboard-View öffne
  Then sehe ich eine Liste mit 3 Spec-Karten
  And jede Karte zeigt den Spec-Namen und das Erstellungsdatum
```

### Szenario 2: Kanban-Board für Stories

```gherkin
Scenario: Stories als Kanban-Board
  Given ich habe einen Spec mit 5 Stories ausgewählt
  When ich auf den Spec klicke
  Then sehe ich ein Kanban-Board mit 3 Spalten
  And die Spalten sind "Backlog", "In Progress", "Done"
  And die Stories sind als Karten in den passenden Spalten
```

### Szenario 3: Story-Status aus kanban-board.md

```gherkin
Scenario: Status wird aus Kanban-Datei gelesen
  Given es existiert eine kanban-board.md im Spec-Ordner
  And Story AOSUI-001 ist dort als "Done" markiert
  When ich das Kanban-Board öffne
  Then ist AOSUI-001 in der "Done"-Spalte
```

### Szenario 4: Story-Details anzeigen

```gherkin
Scenario: Klick auf Story zeigt Details
  Given ich sehe das Kanban-Board
  When ich auf eine Story-Karte klicke
  Then öffnet sich ein Sidebar mit Story-Details
  And ich sehe die Akzeptanzkriterien
  And ich sehe den DoR/DoD Status
```

### Edge Cases & Fehlerszenarien

```gherkin
Scenario: Projekt ohne Specs
  Given das ausgewählte Projekt hat keinen agent-os/specs/ Ordner
  When ich den Dashboard-View öffne
  Then sehe ich einen Hinweis "Keine Specs gefunden"
  And es gibt einen Button "Ersten Spec erstellen" (→ Workflow-View)
```

```gherkin
Scenario: Spec ohne kanban-board.md
  Given ein Spec hat keine kanban-board.md
  When ich den Spec öffne
  Then werden alle Stories als "Backlog" angezeigt
  And ich sehe einen Hinweis "Kanban noch nicht initialisiert"
```

---

## Technische Verifikation (Automated Checks)

### Datei-Prüfungen

- [x] FILE_EXISTS: agent-os-ui/ui/src/views/dashboard-view.ts
- [x] FILE_EXISTS: agent-os-ui/ui/src/components/spec-card.ts
- [x] FILE_EXISTS: agent-os-ui/ui/src/components/kanban-board.ts
- [x] FILE_EXISTS: agent-os-ui/ui/src/components/story-card.ts
- [x] FILE_EXISTS: agent-os-ui/src/server/specs-reader.ts

### Inhalt-Prüfungen

- [x] CONTAINS: dashboard-view.ts enthält "@customElement"
- [x] CONTAINS: specs-reader.ts enthält "kanban-board.md"
- [x] CONTAINS: kanban-board.ts enthält "Backlog"

### Funktions-Prüfungen

- [x] BUILD_PASS: cd agent-os-ui && npm run build
- [x] LINT_PASS: cd agent-os-ui && npm run lint

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
- [x] Kritische Integration Points dokumentiert (wenn Full-stack)
- [x] Handover-Dokumente definiert (bei Multi-Layer)

---

### DoD (Definition of Done) - Vom Architect

#### Implementierung
- [x] Code implementiert und folgt Style Guide
- [x] Architektur-Vorgaben eingehalten
- [x] Security/Performance Anforderungen erfüllt

#### Qualitätssicherung
- [x] Alle Akzeptanzkriterien erfüllt
- [x] Unit Tests geschrieben und bestanden
- [x] Code Review durchgeführt

#### Dokumentation
- [x] Keine Linting Errors
- [x] Completion Check Commands erfolgreich

---

### Betroffene Layer & Komponenten

**Integration Type:** Full-stack

| Layer | Komponenten | Änderung |
|-------|-------------|----------|
| Backend | src/server/specs-reader.ts | Spec/Story/Kanban Parser |
| Frontend | ui/src/views/dashboard-view.ts | Spec List + Kanban Board |
| Frontend | ui/src/components/spec-card.ts | Spec Overview Card |
| Frontend | ui/src/components/kanban-board.ts | 3-Column Kanban |
| Frontend | ui/src/components/story-card.ts | Story Card mit Status |

**Kritische Integration Points:**
- WebSocket Event: `specs.list` → Array von Specs im Projekt
- WebSocket Event: `specs.detail` → Spec mit Stories
- WebSocket Event: `specs.kanban` → Kanban Status aus kanban-board.md

---

### Technical Details

**WAS:**
- Specs Reader (parst .agent-os/specs/ Verzeichnis)
- Spec Card mit Name, Datum, Story Count
- Kanban Board mit Backlog/In Progress/Done Spalten
- Story Card mit Titel, Type, Complexity Badge
- Story Detail Sidebar mit Akzeptanzkriterien
- Leere State Handling (keine Specs, kein Kanban)

**WIE:**
- Backend liest spec.md, story-index.md, kanban-board.md
- Markdown-Frontmatter Parsing für Spec-Metadaten
- Kanban Status aus kanban-board.md Sections
- CSS Grid für Kanban-Spalten
- Lit slot für Sidebar Content
- Click Handler für Story-Details

**WO:**
```
agent-os-ui/
├── src/
│   └── server/
│       └── specs-reader.ts         # NEU: Spec/Story Parser
└── ui/
    └── src/
        ├── views/
        │   └── dashboard-view.ts   # UPDATE: Full Implementation
        └── components/
            ├── spec-card.ts        # NEU: Spec Overview
            ├── kanban-board.ts     # NEU: 3-Column Board
            └── story-card.ts       # NEU: Story Card
```

**WER:** dev-team__fullstack-developer

**Abhängigkeiten:** AOSUI-001, AOSUI-002, AOSUI-003

**Geschätzte Komplexität:** M

---

### Completion Check

```bash
# Verify files exist
test -f agent-os-ui/src/server/specs-reader.ts && echo "OK: specs-reader.ts exists"
test -f agent-os-ui/ui/src/views/dashboard-view.ts && echo "OK: dashboard-view.ts exists"
test -f agent-os-ui/ui/src/components/spec-card.ts && echo "OK: spec-card.ts exists"
test -f agent-os-ui/ui/src/components/kanban-board.ts && echo "OK: kanban-board.ts exists"
test -f agent-os-ui/ui/src/components/story-card.ts && echo "OK: story-card.ts exists"

# Verify kanban support
grep -q "kanban-board.md" agent-os-ui/src/server/specs-reader.ts && echo "OK: Reads kanban file"
grep -q "Backlog" agent-os-ui/ui/src/components/kanban-board.ts && echo "OK: Has Backlog column"

# Verify Lit components
grep -q "@customElement" agent-os-ui/ui/src/views/dashboard-view.ts && echo "OK: Lit component"

# Build check
cd agent-os-ui && npm run build && echo "OK: Full build passes"
```
