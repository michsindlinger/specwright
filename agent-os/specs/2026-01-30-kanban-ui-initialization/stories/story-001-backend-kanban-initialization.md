# Backend: Kanban Board Initialization Service

> Story ID: KBI-001
> Spec: Kanban Board UI Initialization
> Created: 2026-01-30
> Last Updated: 2026-01-30

**Priority**: Critical
**Type**: Backend
**Estimated Effort**: M
**Dependencies**: None

---

## Feature

```gherkin
Feature: Kanban Board Initialization Service
  Als Agent OS Workflow System
  möchte ich automatisch Kanban-Boards aus Story-Dateien erstellen können,
  damit ich den Fortschritt bei der Story-Ausführung visualisieren kann.
```

---

## Akzeptanzkriterien (Gherkin-Szenarien)

### Szenario 1: Kanban Board wird aus Story-Dateien erstellt

```gherkin
Scenario: initializeKanbanBoard() erstellt Board aus Stories
  Given ein Spec-Ordner enthält Story-Dateien (user-story-*.md, bug-*.md)
  When ich initializeKanbanBoard(specPath) aufrufe
  Then wird kanban-board.md erstellt
  And das Board enthält alle Stories in der richtigen Spalte
  And die Board-Status-Zahlen sind korrekt berechnet
```

### Szenario 2: DoR Validierung

```gherkin
Scenario: Stories mit unvollständiger DoR werden als Blocked markiert
  Given eine Story hat nicht alle DoR-Checkboxen markiert
  When das Kanban Board erstellt wird
  Then wird die Story mit Status "⚠️ Blocked" im Board angezeigt
  And die Blocked-Count ist erhöht
```

### Szenario 3: Integration Context wird erstellt

```gherkin
Scenario: Integration Context Datei wird mit Templates erstellt
  Given initializeKanbanBoard() wird ausgeführt
  Then wird integration-context.md erstellt
  And die Datei enthält leere Tabellen für Completed Stories
  And die Datei enthält Sektionen für New Exports & APIs
```

### Szenario 4: Concurrent Call Prevention

```gherkin
Scenario: Gleichzeitige Aufrufe werden serialized
  Given initializeKanbanBoard() wird ausgeführt
  When ein zweiter Aufruf erfolgt während der erste läuft
  Then wartet der zweite Aufruf bis der erste fertig ist
  And die Boards werden korrekt erstellt ohne Race Conditions
```

### Edge Cases & Fehlerszenarien

```gherkin
Scenario: Spec-Ordner existiert nicht
  Given der specPath existiert nicht
  When initializeKanbanBoard() aufgerufen wird
  Then wird ein Fehler geworfen mit klarer Meldung
```

```gherkin
Scenario: Keine Story-Dateien gefunden
  Given der Spec-Ordner enthält keine Story-Dateien
  When initializeKanbanBoard() aufgerufen wird
  Then wird ein leeres Board mit 0 Stories erstellt
```

---

## Technische Verifikation (Automated Checks)

### Datei-Prüfungen

- [ ] FILE_EXISTS: agent-os-ui/src/server/specs-reader.ts
- [ ] CONTAINS: specs-reader.ts exportiert initializeKanbanBoard()
- [ ] CONTAINS: specs-reader.ts implementiert Mutex Lock

### Inhalt-Prüfungen

- [ ] CONTAINS: Story File Parsing für user-story-*.md
- [ ] CONTAINS: Story File Parsing für bug-*.md
- [ ] CONTAINS: DoR Validierung (unchecked = Blocked)
- [ ] CONTAINS: Kanban Board Template Generierung
- [ ] CONTAINS: Integration Context Template Generierung

### Funktions-Prüfungen

- [ ] BUILD_PASS: cd agent-os-ui && npm run build:backend
- [ ] LINT_PASS: cd agent-os-ui && npm run lint
- [ ] TYPE_CHECK: TypeScript strict mode ohne Fehler

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
| Backend | src/server/specs-reader.ts | NEU: Kanban Initialization Service |
| Backend | src/server/index.ts | UPDATE: Export specsReader |

---

### Technical Details

**WAS:**
- SpecsReader Klasse mit initializeKanbanBoard(specPath: string) Methode
- Story File Parsing (user-story-*.md, bug-*.md)
- DoR Checkbox Validierung
- Kanban Board Markdown Generierung
- Integration Context Creation
- Mutex Lock für Concurrent Call Prevention

**WIE:**
- fs/promises für File I/O
- RegExp Pattern für Story ID Extraction aus Filename
- Markdown Table Format für Kanban Board
- Simple Mutex Pattern (Promise + Lock Flag)
- DoR Check: Parse "[x]" vs "[ ]" in DoR Section

**WO:**
```
agent-os-ui/
└── src/
    └── server/
        ├── specs-reader.ts            # NEU: Kanban Initialization Service
        └── index.ts                   # UPDATE: Export specsReader instance
```

**WER:** dev-team__backend-developer

**Abhängigkeiten:** None

**Geschätzte Komplexität:** M

---

### Completion Check

```bash
# Verify files exist
test -f agent-os-ui/src/server/specs-reader.ts && echo "OK: specs-reader.ts exists"

# Verify exports
grep -q "initializeKanbanBoard" agent-os-ui/src/server/specs-reader.ts && echo "OK: initializeKanbanBoard exported"

# Build check
cd agent-os-ui && npm run build:backend && echo "OK: Backend builds"

# Lint check
cd agent-os-ui && npm run lint && echo "OK: No linting errors"
```
