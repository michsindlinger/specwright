# API: Board Initialization Endpoint

> Story ID: KBI-003
> Spec: Kanban Board UI Initialization
> Created: 2026-01-30
> Last Updated: 2026-01-30

**Priority**: High
**Type**: Full-stack
**Estimated Effort**: S
**Dependencies**: KBI-001
**Status**: Done

---

## Feature

```gherkin
Feature: Board Initialization API Endpoint
  Als Frontend-Entwickler
  möchte ich über eine REST-API ein Kanban-Board initialisieren können,
  damit ich die UI von außen trigger kann.
```

---

## Akzeptanzkriterien (Gherkin-Szenarien)

### Szenario 1: POST Endpoint erstellt Board

```gherkin
Scenario: POST /api/specs/:specId/initialize-board
  Given der Backend-Server läuft
  When ich POST /api/specs/2026-01-30-feature/initialize-board aufrufe
  Then wird der Status 200 zurückgegeben
  And die Antwort enthält { success: true, boardPath: "..." }
  And das Kanban-Board ist im Dateisystem erstellt
```

### Szenario 2: Spec nicht gefunden

```gherkin
Scenario: 404 wenn Spec nicht existiert
  Given der Backend-Server läuft
  When ich POST /api/specs/nonexistent/initialize-board aufrufe
  Then wird der Status 404 zurückgegeben
  And die Antwort enthält { error: "Spec not found" }
```

### Edge Cases & Fehlerszenarien

```gherkin
Scenario: Server-Fehler bei Board-Erstellung
  Given die initializeKanbanBoard() Methode wirft einen Fehler
  When ich den Endpoint aufrufe
  Then wird der Status 500 zurückgegeben
  And die Antwort enthält die Fehlermeldung
```

---

## Technische Verifikation (Automated Checks)

### Datei-Prüfungen

- [ ] FILE_EXISTS: agent-os-ui/src/server/routes/specs.ts
- [ ] CONTAINS: POST /api/specs/:specId/initialize-board Route definiert

### Inhalt-Prüfungen

- [ ] CONTAINS: Route ruft specsReader.initializeKanbanBoard() auf
- [ ] CONTAINS: Error Handler für 404
- [ ] CONTAINS: Error Handler für 500

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
| Backend | src/server/routes/specs.ts | NEU: API Routes |
| Backend | src/server/index.ts | UPDATE: Mount routes |

---

### Technical Details

**WAS:**
- Express Route POST /api/specs/:specId/initialize-board
- Spec Path Resolution (agent-os/specs/:specId)
- Response Format: { success: boolean, boardPath?: string, error?: string }
- Error Handling: 404 (Spec nicht gefunden), 500 (Server Error)

**WIE:**
- Express Router Pattern
- Async Handler mit try/catch
- specsReader.initializeKanbanBoard() Aufruf
- JSON Response Format

**WO:**
```
agent-os-ui/
└── src/
    └── server/
        ├── routes/
        │   └── specs.ts                 # NEU: API Routes
        └── index.ts                     # UPDATE: Mount routes
```

**WER:** dev-team__backend-developer

**Abhängigkeiten:** KBI-001

**Geschätzte Komplexität:** S

---

### Completion Check

```bash
# Verify files exist
test -f agent-os-ui/src/server/routes/specs.ts && echo "OK: specs.ts exists"

# Verify route defined
grep -q "initialize-board" agent-os-ui/src/server/routes/specs.ts && echo "OK: Route defined"

# Build check
cd agent-os-ui && npm run build:backend && echo "OK: Backend builds"
```
