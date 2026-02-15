# Integration Validation

> Story ID: MPRO-998
> Spec: multi-project-support
> Created: 2026-02-02
> Last Updated: 2026-02-02

**Priority**: High
**Type**: System/Integration
**Estimated Effort**: S
**Dependencies**: MPRO-997
**Status**: Ready

---

## Feature

```gherkin
Feature: Integration Validation
  Als Qualitätssicherung
  möchte ich alle Integration-Tests aus der spec.md ausführen,
  damit das End-to-End Zusammenspiel aller Komponenten validiert wird.
```

---

## Akzeptanzkriterien (Gherkin-Szenarien)

### Szenario 1: Backend Integration Tests

```gherkin
Scenario: Backend API Tests werden ausgeführt
  Given der Server läuft auf localhost:3000
  When die Backend-Integration-Tests gestartet werden
  Then wird der Project-Switch-Endpoint getestet
  And wird der Current-Project-Endpoint getestet
  And alle Tests bestehen
```

### Szenario 2: Frontend Component Tests

```gherkin
Scenario: Frontend Unit Tests werden ausgeführt
  Given alle Frontend-Komponenten sind implementiert
  When npm run test ausgeführt wird
  Then bestehen alle Tests für aos-project-tabs
  And bestehen alle Tests für aos-project-add-modal
  And bestehen alle Tests für recently-opened-service
  And bestehen alle Tests für project-context
```

### Szenario 3: End-to-End Szenarien

```gherkin
Scenario: E2E Szenarien aus spec.md werden validiert
  Given die Anwendung läuft
  When die E2E-Szenarien manuell oder automatisch getestet werden
  Then funktioniert "Projekt hinzufügen via Recently Opened"
  And funktioniert "Projekt hinzufügen via File-Picker"
  And funktioniert "Projekt-Wechsel mit aktivem Workflow"
  And funktioniert "Projekt schließen"
```

---

## Technische Verifikation (Automated Checks)

### Funktions-Prüfungen

- [ ] TEST_PASS: `cd agent-os-ui && npm run test` exits with code 0
- [ ] LINT_PASS: `cd agent-os-ui && npm run lint` exits with code 0
- [ ] BUILD_PASS: `cd agent-os-ui && npm run build` exits with code 0

### Integration Test Commands (aus spec.md)

```bash
# Backend Multi-Project Context Test
curl -X POST http://localhost:3000/api/project/switch \
  -H "Content-Type: application/json" \
  -d '{"projectPath": "/path/to/project"}' \
  && echo "Backend project switch: OK"

# Frontend Tab Navigation Test
npm run test -- --filter="aos-project-tabs"
```

---

## Required MCP Tools

| Tool | Purpose | Blocking |
|------|---------|----------|
| Playwright (optional) | E2E Browser Tests | No |

---

## Technisches Refinement (vom Architect)

> **Ausgefüllt:** 2026-02-02

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
- [ ] Alle Unit Tests bestehen
- [ ] Alle Integration Tests bestehen
- [ ] Build erfolgreich

#### Qualitätssicherung
- [ ] E2E Szenarien manuell oder automatisch validiert
- [ ] Integration-Bericht erstellt
- [ ] Keine Blocker für PR

#### Dokumentation
- [ ] Test-Ergebnisse dokumentiert
- [ ] Offene Issues erfasst (falls vorhanden)

**Story ist DONE wenn alle Checkboxen angehakt sind.**

---

### Betroffene Layer & Komponenten

**Integration Type:** Validation-only (keine Code-Änderungen)

**Betroffene Komponenten:**

| Layer | Komponenten | Änderung |
|-------|-------------|----------|
| Test | Alle Test-Dateien | Ausführung |
| Build | Build-Pipeline | Validierung |

**Kritische Integration Points:**
- Frontend ↔ Backend API Kommunikation
- WebSocket-Verbindung mit projectId
- Context-Switching zwischen Views

---

### Technical Details

**WAS:**
- Alle Unit Tests ausführen
- Alle Integration Tests ausführen
- Build-Prozess validieren
- E2E Szenarien aus spec.md testen

**WIE (Architektur-Guidance ONLY):**
- `npm run test` für Unit Tests
- `npm run lint` für Code-Qualität
- `npm run build` für Build-Validierung
- curl-Commands für API-Tests (wenn Server läuft)
- Manuelle E2E Tests oder Playwright (optional)

**WO:**
- Input: Alle Test-Dateien, spec.md Integration Requirements
- Output: `agent-os/specs/2026-01-30-multi-project-support/implementation-reports/integration-report.md`

**WER:** Orchestrator / Test-Runner

**Abhängigkeiten:** MPRO-997 (Code Review)

**Geschätzte Komplexität:** S

**Relevante Skills:**
- `quality-gates` - Test-Ausführung und Validierung

**Creates Reusable:** no

---

### Completion Check

```bash
# Auto-Verify Commands - alle müssen mit 0 exiten
cd agent-os-ui && npm run lint
cd agent-os-ui && npm run test
cd agent-os-ui && npm run build
# Optional wenn Server läuft:
# curl -s http://localhost:3000/api/project/current | grep -q "path"
```

**Story ist DONE wenn:**
1. Alle Tests bestehen (exit 0)
2. Build erfolgreich
3. Integration-Bericht erstellt
