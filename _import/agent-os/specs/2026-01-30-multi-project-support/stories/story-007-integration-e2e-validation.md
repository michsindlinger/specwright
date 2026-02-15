# Integration & E2E Validation

> Story ID: MPRO-007
> Spec: multi-project-support
> Created: 2026-01-30
> Last Updated: 2026-01-30

**Priority**: High
**Type**: Test
**Estimated Effort**: S
**Dependencies**: MPRO-001, MPRO-002, MPRO-003, MPRO-004, MPRO-005, MPRO-006

---

## Feature

```gherkin
Feature: Integration & End-to-End Validation
  Als Systemadministrator
  möchte ich dass alle Komponenten des Multi-Project-Support zusammenwirken,
  damit das Feature vollständig funktioniert.
```

---

## Akzeptanzkriterien (Gherkin-Szenarien)

### Szenario 1: Kompletter Flow - Projekt hinzufügen und wechseln

```gherkin
Scenario: End-to-End Projekt hinzufügen via Recently Opened
  Given die Anwendung ist gestartet
  And ich habe das Projekt "project-a" geöffnet
  When ich auf das Plus-Icon klicke
  And ich "project-b" aus der Recently Opened Liste auswähle
  Then sehe ich zwei Tabs: "project-a" und "project-b"
  And "project-b" ist der aktive Tab
  And die Specs von "project-b" werden angezeigt
```

### Szenario 2: Parallele Workflows in verschiedenen Projekten

```gherkin
Scenario: Workflows laufen unabhängig voneinander
  Given ich habe Projekt "project-a" und "project-b" geöffnet
  And ich starte einen Workflow in "project-a"
  When ich zu "project-b" wechsle
  And ich einen anderen Workflow in "project-b" starte
  Then laufen beide Workflows parallel
  And ich kann zwischen den Projekten wechseln und den jeweiligen Status sehen
```

### Szenario 3: Persistenz nach Browser-Refresh

```gherkin
Scenario: Session wird nach Refresh wiederhergestellt
  Given ich habe die Projekte "project-a", "project-b", "project-c" geöffnet
  And "project-b" ist der aktive Tab
  When ich den Browser neu lade
  Then werden alle drei Tabs wiederhergestellt
  And "project-b" ist weiterhin der aktive Tab
  And die Recently Opened Liste enthält alle drei Projekte
```

### Szenario 4: Fehlerbehandlung bei ungültigen Projekten

```gherkin
Scenario: Ungültiges Projekt wird abgefangen
  Given ich habe ein Projekt geöffnet
  When ich versuche einen ungültigen Ordner hinzuzufügen
  Then sehe ich eine klare Fehlermeldung
  And die Anwendung bleibt stabil
  And ich kann mit dem gültigen Projekt weiterarbeiten
```

### Szenario 5: WebSocket-Integration

```gherkin
Scenario: WebSocket-Verbindungen werden korrekt verwaltet
  Given ich habe Projekt "project-a" mit aktivem Workflow
  When ich "project-b" öffne und einen Workflow starte
  Then existieren zwei WebSocket-Verbindungen
  And Nachrichten werden an das richtige Projekt zugestellt
  When ich "project-a" schließe
  Then wird nur die Verbindung von "project-a" geschlossen
```

### Edge Cases & Fehlerszenarien

```gherkin
Scenario: Letztes Projekt schließen
  Given ich habe nur noch das Projekt "project-a" geöffnet
  When ich das Projekt schließe
  Then sehe ich den leeren Zustand
  And ich kann ein neues Projekt öffnen
```

```gherkin
Scenario: Schnelles Tab-Wechseln unter Last
  Given ich habe 5 Projekte geöffnet
  When ich schnell zwischen allen Tabs wechsle
  Then gibt es keine Race-Conditions
  And der angezeigte Inhalt entspricht immer dem aktiven Tab
```

---

## Technische Verifikation (Automated Checks)

### Integration Tests

- [x] INTEGRATION_PASS: All integration tests from spec.md pass
- [x] END_TO_END: Complete user journey works
- [x] COMPONENT_INTEGRATION: Backend and Frontend are connected

### Funktions-Prüfungen

- [x] TEST_PASS: npm run test exits with code 0
- [x] BUILD_PASS: npm run build exits with code 0

### Browser-Prüfungen (optional - erfordern MCP-Tool)

- [ ] MCP_PLAYWRIGHT: Multi-project E2E flow works in browser (optional - no Playwright MCP available)

---

## Required MCP Tools

| Tool | Purpose | Blocking |
|------|---------|----------|
| Playwright MCP | Browser E2E Tests | No (optional) |

---

## Technisches Refinement (vom Architect)

> **Ausgefüllt:** 2026-01-30

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
- [x] **Alle betroffenen Layer identifiziert**
- [x] **Integration Type bestimmt**
- [x] **Kritische Integration Points dokumentiert** (wenn Full-stack)
- [x] **Handover-Dokumente definiert** (bei Multi-Layer)

**Story ist READY wenn alle Checkboxen angehakt sind.**

---

### DoD (Definition of Done) - Vom Architect

#### Implementierung
- [x] Code implementiert und folgt Style Guide
- [x] Architektur-Vorgaben eingehalten (WIE section)
- [x] Security/Performance Anforderungen erfüllt

#### Qualitätssicherung
- [x] Alle Akzeptanzkriterien erfüllt (via Completion Check verifiziert)
- [x] Unit Tests geschrieben und bestanden
- [x] Integration Tests geschrieben und bestanden
- [x] Code Review durchgeführt und genehmigt

#### Dokumentation
- [x] Dokumentation aktualisiert
- [x] Keine Linting Errors
- [x] Completion Check Commands alle erfolgreich (exit 0)

**Story ist DONE wenn alle Checkboxen angehakt sind.**

---

### Betroffene Layer & Komponenten

**Integration Type:** Full-stack (Test)

**Betroffene Komponenten:**

| Layer | Komponenten | Änderung |
|-------|-------------|----------|
| Frontend | All multi-project components | Validate integration |
| Backend | Project context, WebSocket | Validate integration |
| Test | multi-project.integration.test.ts | Neu erstellen |
| Test | multi-project.e2e.test.ts | Neu erstellen (optional) |

**Kritische Integration Points:**
- Frontend Tab Navigation -> Backend Project Context Switch
- Frontend Project State -> WebSocket Multi-Connection
- Recently Opened Service -> Project Add Modal
- Session Persistence -> Browser Refresh Recovery

---

### Technical Details

**WAS:**
- Integration Tests für Multi-Project Feature
- Backend API Tests (project switch, validate, current)
- Frontend-Backend Integration Tests
- WebSocket Multi-Connection Tests
- Optional: E2E Tests mit Playwright MCP (wenn verfügbar)

**WIE (Architektur-Guidance ONLY):**
- Vitest für Unit- und Integration-Tests
- supertest für Backend API Tests
- Mock WebSocket für Connection-Tests
- Test-Fixtures: Mindestens 2 Mock-Projekt-Verzeichnisse mit agent-os/
- Test-Isolation: Jeder Test startet mit Clean State
- Async/Await Pattern für WebSocket-Test-Assertions
- Optional: Playwright MCP für Browser E2E (falls MCP verfügbar)

**WO:**
- `agent-os-ui/tests/integration/multi-project.integration.test.ts` (Neu)
- `agent-os-ui/tests/e2e/multi-project.e2e.test.ts` (Neu, optional)
- `agent-os-ui/tests/fixtures/mock-project-a/agent-os/` (Neu)
- `agent-os-ui/tests/fixtures/mock-project-b/agent-os/` (Neu)

**WER:** dev-team__qa-specialist

**Abhängigkeiten:** MPRO-001, MPRO-002, MPRO-003, MPRO-004, MPRO-005, MPRO-006

**Geschätzte Komplexität:** M

**Relevante Skills:**
- `backend-express` - Testing Patterns (supertest)
- `quality-gates` - Test Coverage Requirements

**Creates Reusable:** no
<!-- Test-Dateien und Fixtures sind projekt-spezifisch, nicht wiederverwendbar -->

---

### Completion Check

```bash
# Auto-Verify Commands - alle müssen mit 0 exiten
test -f agent-os-ui/tests/integration/multi-project.integration.test.ts && echo "Integration tests exist"
test -d agent-os-ui/tests/fixtures/mock-project-a/agent-os && echo "Test fixture A exists"
test -d agent-os-ui/tests/fixtures/mock-project-b/agent-os && echo "Test fixture B exists"
cd agent-os-ui && npm run lint
cd agent-os-ui && npm run test
cd agent-os-ui && npm run build
```

**Story ist DONE wenn:**
1. Alle FILE_EXISTS/CONTAINS checks bestanden
2. Alle *_PASS commands exit 0
3. Git diff zeigt nur erwartete Änderungen
