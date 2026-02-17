# Integration Validation

> Story ID: WSM-998
> Spec: Wizard-to-Sidebar Migration
> Created: 2026-02-17
> Last Updated: 2026-02-17

**Priority**: High
**Type**: System/Integration
**Estimated Effort**: S
**Dependencies**: WSM-997 (Code Review)

---

## Feature

```gherkin
Feature: Integration Validation nach Code-Review
  Als System
  moechte ich alle Komponenten auf korrekte Integration pruefen,
  damit das Feature vollstaendig und funktional ist.
```

---

## Akzeptanzkriterien (Gherkin-Szenarien)

### Szenario 1: Alle Integration Tests bestehen

```gherkin
Scenario: Erfolgreiche Integration aller Komponenten
  Given der Code-Review (story-997) ist abgeschlossen
  And alle Integration Tests sind in spec.md definiert
  When ich alle Integration Tests aus spec.md ausfuehre
  Then bestehen alle Tests
  And die Komponenten arbeiten korrekt zusammen
```

### Szenario 2: Komponenten-Verbindungen verifizieren

```gherkin
Scenario: Verifizierung der Komponenten-Verbindungen
  Given alle Komponenten wurden implementiert
  When ich die Verbindungen zwischen Komponenten pruefe
  Then sind alle definierten Verbindungen aktiv
  And keine Komponente ist isoliert
```

---

## System Story Execution (Automatisch)

### Execution Steps

1. **Integration Requirements laden:**
   ```bash
   cat specwright/specs/2026-02-17-wizard-to-sidebar-migration/spec.md | grep -A 50 "## Integration Requirements"
   ```

2. **Integration Tests ausfuehren:**
   ```bash
   cd ui/frontend && npm run build
   cd ui && npm run build:backend
   cd ui/frontend && npm run lint
   ```

3. **Komponenten-Verbindungen pruefen:**
   - Event: start-setup-terminal (getting-started -> app.ts)
   - Method: _openSetupTerminalTab (app.ts -> Gateway)
   - Listener: cloud-terminal:closed (Gateway -> app.ts -> Re-Validierung)

---

## DoR (Definition of Ready) - System Story

- [x] story-997 (Code Review) ist abgeschlossen
- [x] Integration Tests sind in spec.md definiert
- [x] Alle regulaeren Stories haben Status "Done"

---

## DoD (Definition of Done) - System Story

- [x] Integration Tests aus spec.md extrahiert
- [x] Alle Integration Tests ausgefuehrt
- [x] Alle Tests bestanden (oder Fehler dokumentiert)
- [x] Komponenten-Verbindungen verifiziert

---

## Technisches Refinement

**WAS:** Integration Validation aller Komponenten

**WIE:**
- Integration Tests aus spec.md laden
- Tests nacheinander ausfuehren
- Ergebnisse sammeln
- Verbindungen verifizieren

**WO:**
- Input: `specwright/specs/2026-02-17-wizard-to-sidebar-migration/spec.md`
- Input: `specwright/specs/2026-02-17-wizard-to-sidebar-migration/implementation-plan.md`

**Abhaengigkeiten:** WSM-997

**Geschaetzte Komplexitaet:** S

---

## Completion Check

```bash
# Run frontend build
cd ui/frontend && npm run build

# Run backend build
cd ui && npm run build:backend

# Run lint
cd ui/frontend && npm run lint
```
