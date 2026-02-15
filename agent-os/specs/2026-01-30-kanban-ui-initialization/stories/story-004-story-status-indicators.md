# UI: Story Status Indicators

> Story ID: KBI-004
> Spec: Kanban Board UI Initialization
> Created: 2026-01-30
> Last Updated: 2026-01-30

**Priority**: Medium
**Type**: Frontend
**Estimated Effort**: S
**Dependencies**: KBI-002
**Status**: Done

---

## Feature

```gherkin
Feature: Visual Story Status Indicators
  Als Benutzer
  möchte ich auf einen Blick sehen, ob eine Story bereit ist oder blockiert,
  damit ich den Fokus auf die richtige Arbeit legen kann.
```

---

## Akzeptanzkriterien (Gherkin-Szenarien)

### Szenario 1: Ready Indicator

```gherkin
Scenario: Grüner Indicator für bereit Stories
  Given eine Story hat alle DoR-Checkboxen markiert
  When das Kanban Board gerendert wird
  Then zeigt die Story einen grünen Punkt/Badge
  And der Tooltip sagt "Ready for execution"
```

### Szenario 2: Blocked Indicator

```gherkin
Scenario: Roter Indicator für blockierte Stories
  Given eine Story hat nicht alle DoR-Checkboxen markiert
  When das Kanban Board gerendert wird
  Then zeigt die Story einen roten Punkt/Badge
  And der Tooltip sagt "Blocked - incomplete DoR"
```

### Szenario 3: In Progress Indicator

```gherkin
Scenario: Blauer Indicator für laufende Stories
  Given eine Story ist in "In Progress"
  When das Kanban Board gerendert wird
  Then zeigt die Story einen blauen Punkt/Badge
```

### Edge Cases & Fehlerszenarien

```gherkin
Scenario: Unbekannter Status
  Given eine Story hat einen unbekannten Status
  When das Board gerendert wird
  Then zeigt die Story einen grauen Indicator
```

---

## Technische Verifikation (Automated Checks)

### Datei-Prüfungen

- [ ] FILE_EXISTS: agent-os-ui/src/client/components/story-status-badge.ts
- [ ] CONTAINS: Status Badge Component mit Icons

### Inhalt-Prüfungen

- [ ] CONTAINS: CSS für Status Colors (Green, Red, Blue, Gray)
- [ ] CONTAINS: Tooltip Implementation

### Funktions-Prüfungen

- [ ] BUILD_PASS: cd agent-os-ui && npm run build:frontend
- [ ] LINT_PASS: cd agent-os-ui && npm run lint

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
- [x] Code Review durchgeführt (self-review)

#### Dokumentation
- [x] Keine Linting Errors
- [x] Completion Check Commands erfolgreich

---

### Betroffene Layer & Komponenten

**Integration Type:** Frontend-only

| Layer | Komponenten | Änderung |
|-------|-------------|----------|
| Frontend | src/client/components/story-status-badge.ts | NEU: Status Badge Component |
| Frontend | src/client/components/kanban-board.ts | UPDATE: Use status badge |

---

### Technical Details

**WAS:**
- aos-story-status-badge Lit Web Component
- Visual Indicators: Green (Ready), Red (Blocked), Blue (In Progress), Gray (Unknown)
- Tooltips für Status-Erklärung
- Optional: Icon Support

**WIE:**
- Lit Component mit @property status: 'ready' | 'blocked' | 'in-progress' | 'unknown'
- CSS Custom Properties für Status Colors
- Title Attribute für native Tooltips

**WO:**
```
agent-os-ui/
└── src/
    └── client/
        └── components/
            ├── story-status-badge.ts   # NEU: Status Badge
            └── kanban-board.ts          # UPDATE: Use badge
```

**WER:** dev-team__frontend-developer

**Abhängigkeiten:** KBI-002

**Geschätzte Komplexität:** S

---

### Completion Check

```bash
# Verify files exist
test -f agent-os-ui/src/client/components/story-status-badge.ts && echo "OK: story-status-badge.ts exists"

# Verify usage
grep -q "aos-story-status-badge" agent-os-ui/src/client/components/kanban-board.ts && echo "OK: Badge used in kanban-board"

# Build check
cd agent-os-ui && npm run build:frontend && echo "OK: Frontend builds"
```
