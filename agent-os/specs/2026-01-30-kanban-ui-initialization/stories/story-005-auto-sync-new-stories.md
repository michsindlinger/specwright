# Integration: Auto-Sync New Stories

> Story ID: KBI-005
> Spec: Kanban Board UI Initialization
> Created: 2026-01-30
> Last Updated: 2026-01-30

**Priority**: Medium
**Type**: Full-stack
**Estimated Effort**: M
**Dependencies**: KBI-001

---

## Feature

```gherkin
Feature: Auto-Sync New Stories to Kanban Board
  Als Agent OS Workflow System
  möchte ich automatisch neue Stories zum Kanban Board hinzufügen können,
  damit nicht manuell das Board aktualisiert werden muss.
```

---

## Akzeptanzkriterien (Gherkin-Szenarien)

### Szenario 1: Neue Stories werden automatisch erkannt

```gherkin
Scenario: Neue Story-Datei wird zum Board hinzugefügt
  Given ein Kanban-Board existiert
  When eine neue user-story-*.md Datei erstellt wird
  Then wird die Story automatisch zum "Backlog" hinzugefügt
  And die Board-Status-Zahlen werden aktualisiert
```

### Szenario 2: Sync beim Resume

```gherkin
Scenario: Board sync beim Workflow Resume
  Given neue Stories wurden erstellt nachdem das Board initialisiert wurde
  When /execute-tasks erneut aufgerufen wird
  Then werden die neuen Stories zum Board hinzugefügt
  Before die Phase geladen wird
```

### Szenario 3: Change Log Einträge

```gherkin
Scenario: Sync wird im Change Log dokumentiert
  Given neue Stories zum Board hinzugefügt wurden
  Then enthält der Change Log einen Eintrag
  With Format "{TIMESTAMP} | Synced {N} new stories: {STORY_IDS}"
```

### Edge Cases & Fehlerszenarien

```gherkin
Scenario: Story bereits im Board
  Given eine Story existiert bereits im Board
  When der Sync ausgeführt wird
  Then wird die Story nicht doppelt hinzugefügt
```

---

## Technische Verifikation (Automated Checks)

### Datei-Prüfungen

- [ ] FILE_EXISTS: agent-os-ui/src/server/specs-reader.ts
- [ ] CONTAINS: syncNewStories() Methode

### Inhalt-Prüfungen

- [ ] CONTAINS: Story ID Vergleich (Filename vs Board)
- [ ] CONTAINS: Change Log Update Logic
- [ ] CONTAINS: Board Status Recalculation

### Funktions-Prüfungen

- [ ] BUILD_PASS: cd agent-os-ui && npm run build:backend
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

**Integration Type:** Backend-only

| Layer | Komponenten | Änderung |
|-------|-------------|----------|
| Backend | src/server/specs-reader.ts | UPDATE: Add syncNewStories() |
| Backend | agent-os/workflows/execute-tasks/entry-point.md | UPDATE: Call sync before phase load |

---

### Technical Details

**WAS:**
- syncNewStories(specPath: string) Methode in SpecsReader
- Auto-Sync beim /execute-tasks Resume (Entry Point v3.1)
- Story ID Extraction aus Filename
- Duplicate Detection (Story ID already in board?)
- Change Log Update

**WIE:**
1. Liste alle Story-Dateien im Spec-Ordner
2. Parse bestehendes Kanban-Board für vorhandene Story IDs
3. Vergleiche: Neue Stories = Dateien - Board IDs
4. Für jede neue Story:
   - Parse Metadata (Title, Type, Priority, Points)
   - Füge zu "## Backlog" Tabelle hinzu
   - Update Board Status Totals
5. Add Change Log Entry

**WO:**
```
agent-os-ui/
└── src/
    └── server/
        └── specs-reader.ts            # UPDATE: Add syncNewStories()
```

```
agent-os/
└── workflows/
    └── execute-tasks/
        └── entry-point.md             # UPDATE: Kanban Sync Step
```

**WER:** dev-team__backend-developer

**Abhängigkeiten:** KBI-001

**Geschätzte Komplexität:** M

---

### Completion Check

```bash
# Verify method exists
grep -q "syncNewStories" agent-os-ui/src/server/specs-reader.ts && echo "OK: syncNewStories method exists"

# Verify entry point integration
grep -q "kanban_sync" agent-os/workflows/core/execute-tasks/entry-point.md && echo "OK: Entry point sync step exists"

# Build check
cd agent-os-ui && npm run build:backend && echo "OK: Backend builds"

# Lint check
cd agent-os-ui && npm run lint && echo "OK: No linting errors"
```
