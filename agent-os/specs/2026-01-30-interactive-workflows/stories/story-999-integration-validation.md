# Integration & End-to-End Validation

> Story ID: WKFL-999
> Spec: Interactive Workflows
> Created: 2026-01-30
> Last Updated: 2026-01-30

**Priority**: Critical
**Type**: Test/Integration
**Estimated Effort**: S
**Dependencies**: WKFL-001, WKFL-002, WKFL-003, WKFL-004, WKFL-005, WKFL-006, WKFL-007, WKFL-008

---

## Feature

```gherkin
Feature: Vollständige Workflow-Integration
  Als Systemadministrator
  möchte ich dass alle Workflow-Komponenten zusammenwirken,
  damit interaktive Workflows vollständig funktionieren.
```

---

## Akzeptanzkriterien (Gherkin-Szenarien)

### Szenario 1: Kompletter create-spec Workflow

```gherkin
Scenario: Create-spec Workflow vollständig durchlaufen
  Given ich bin in der Workflow-View
  When ich auf "create-spec" klicke
  Then startet der Workflow
  And ich sehe den Progress-Indikator "Step 1/4"
  When ich die erste Frage beantworte
  Then fährt der Workflow fort
  And ich sehe generierte Dokumente im Docs-Viewer
  When ich alle Fragen beantwortet habe
  Then zeigt der Indikator "Completed"
  And ich sehe eine Erfolgsmeldung
```

### Szenario 2: Workflow abbrechen und neu starten

```gherkin
Scenario: Workflow abbrechen und neu starten
  Given ein Workflow läuft
  When ich auf "Abbrechen" klicke
  And ich bestätige
  Then wird der Workflow beendet
  When ich denselben Workflow erneut starte
  Then beginnt er von vorne
  And es gibt keine Konflikte mit dem vorherigen Lauf
```

### Szenario 3: Fehler und Recovery

```gherkin
Scenario: Workflow nach Fehler fortsetzen
  Given ein Workflow läuft
  And ein Netzwerkfehler tritt auf
  Then sehe ich eine Fehlermeldung
  When ich auf "Erneut versuchen" klicke
  Then wird die letzte Aktion wiederholt
  And der Workflow fährt erfolgreich fort
```

### Szenario 4: Docs-Viewer Integration

```gherkin
Scenario: Generierte Dateien im Docs-Viewer
  Given ein create-spec Workflow läuft
  When requirements-clarification.md erstellt wird
  Then öffnet sich der Docs-Viewer
  And ich sehe den Inhalt der Datei
  When später spec.md erstellt wird
  Then kann ich zwischen den Dokumenten wechseln
```

---

## Technische Verifikation (Automated Checks)

### Integration Tests

- [x] INTEGRATION_PASS: WebSocket connection zwischen Frontend und Backend
- [x] INTEGRATION_PASS: Workflow.question von Backend zu Frontend
- [x] INTEGRATION_PASS: Workflow.answer von Frontend zu Backend
- [x] INTEGRATION_PASS: Docs-Viewer erhält File-Updates

### End-to-End

- [x] END_TO_END: Vollständiger create-spec Workflow durchlaufen
- [x] END_TO_END: Workflow Cancel funktioniert
- [x] END_TO_END: Error Retry funktioniert

### Browser Tests (optional - erfordern MCP)

- [ ] MCP_PLAYWRIGHT: http://localhost:5173/workflows - Workflow-Karten sichtbar
- [ ] MCP_PLAYWRIGHT: http://localhost:5173/workflows - Workflow startet bei Klick
- [ ] MCP_PLAYWRIGHT: http://localhost:5173/workflows - Fragen erscheinen als Buttons

---

## Required MCP Tools

| Tool | Purpose | Blocking |
|------|---------|----------|
| Playwright MCP | Browser E2E Tests | No (optional) |

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
| Frontend | `agent-os-ui/ui/src/views/workflow-view.ts` | Validierung der Integration |
| Backend | `agent-os-ui/src/server/workflow-executor.ts` | Validierung der Integration |
| Test | `agent-os-ui/tests/integration/workflow.test.ts` (NEU) | Integration Tests |
| Test | `agent-os-ui/tests/e2e/workflow.spec.ts` (NEU, optional) | E2E Tests |

**Kritische Integration Points:**
- Frontend → Backend → Claude CLI → Backend → Frontend (vollständiger Roundtrip)
- Docs-Viewer → File-System → WebSocket → Frontend

---

### Technical Details

**WAS:**
- Integration Tests für WebSocket-Kommunikation
- E2E Test für kompletten Workflow-Durchlauf
- Smoke Tests für kritische Pfade

**WIE (Architektur-Guidance ONLY):**
- Vitest für Unit/Integration Tests (bereits konfiguriert)
- Optional: Playwright für Browser E2E Tests
- Mock Claude CLI für deterministische Tests (spawn mock)
- Test-Szenarien: Start, Question/Answer, Cancel, Error/Retry, Complete

**WO:**
- `agent-os-ui/tests/integration/workflow.test.ts` (NEU)
- `agent-os-ui/tests/e2e/workflow.spec.ts` (NEU, optional)

**WER:** dev-team__qa-specialist (oder test-runner)

**Abhängigkeiten:** WKFL-001 bis WKFL-008 (alle anderen Stories)

**Geschätzte Komplexität:** S

**Relevante Skills:**

| Skill | Pfad | Grund |
|-------|------|-------|
| quality-gates | agent-os/team/skills/quality-gates.md | Test-Standards und Quality Gates |

---

### Completion Check

```bash
# Auto-Verify Commands
test -f agent-os-ui/tests/integration/workflow.test.ts
npm run test -- --grep "workflow.*integration"
npm run lint
# Optional E2E (wenn Playwright verfügbar):
# npx playwright test workflow
```

**Story ist DONE wenn:**
1. Alle Integration Tests bestanden
2. Alle Lint checks bestanden
3. Manueller Durchlauf eines create-spec Workflows erfolgreich
