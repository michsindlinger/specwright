# Code Review

> Story ID: MSK-997
> Spec: Model Selection for Kanban Board
> Created: 2026-02-02
> Last Updated: 2026-02-02

**Priority**: High
**Type**: System
**Estimated Effort**: XS
**Dependencies**: MSK-001, MSK-002, MSK-003, MSK-004

---

## Feature

```gherkin
Feature: Code Review des gesamten Features
  Als Entwickler,
  möchte ich dass ein starkes Model (Opus) den gesamten Feature-Diff reviewt,
  damit Code-Qualität, Architektur-Konformität und Best Practices eingehalten werden.
```

---

## System Story Purpose

Diese System Story führt einen umfassenden Code Review durch:
- Review des gesamten Git-Diffs seit Branch-Erstellung
- Prüfung auf Code-Qualität und Best Practices
- Architektur-Konformität Validierung
- Identifikation potenzieller Bugs oder Security Issues

---

## Akzeptanzkriterien (Gherkin-Szenarien)

### Szenario 1: Diff Review durchgeführt

```gherkin
Scenario: Vollständiger Code Review
  Given alle Feature-Stories sind abgeschlossen
  When der Code Review startet
  Then wird der gesamte Git-Diff analysiert
  And ein Review-Report wird erstellt
```

### Szenario 2: Quality Gates geprüft

```gherkin
Scenario: Quality Gate Validierung
  Given der Code Review läuft
  When Quality Gates geprüft werden
  Then werden TypeScript Strict Mode, Lint Errors und Code Style validiert
  And Verstöße werden dokumentiert
```

### Szenario 3: Review-Bericht erstellt

```gherkin
Scenario: Review Report generiert
  Given der Review ist abgeschlossen
  When der Bericht erstellt wird
  Then enthält er alle Findings mit Severity
  And Empfehlungen für Verbesserungen
```

---

## Technisches Refinement (vom Architect)

> **Refined:** 2026-02-02

### DoR (Definition of Ready) - Vom Architect

- [x] Alle Feature-Stories (MSK-001 bis MSK-004) sind abgeschlossen
- [x] Git Branch enthält alle Änderungen
- [x] Keine laufenden Story-Ausführungen

### DoD (Definition of Done) - Vom Architect

- [x] Git Diff wurde vollständig analysiert
- [x] Review-Report erstellt in `implementation-reports/`
- [x] Kritische Findings wurden behoben (handleStoryModelChange fix)
- [x] Code-Qualität validiert (lint + build pass)

---

### Technical Details

**WAS:**
- Git Diff seit Branch-Erstellung analysieren
- Code-Qualität, Architektur, Best Practices prüfen
- Review-Report erstellen

**WIE:**
1. `git diff main...HEAD` ausführen
2. Alle geänderten Dateien analysieren
3. Quality Gates prüfen (Lint, Type Check)
4. Review-Report mit Findings erstellen

**WO:**
- `agent-os/specs/2026-02-01-model-selection-kanban/implementation-reports/code-review.md` (NEU)

**WER:** Opus Model (starkes Review-Modell)

---

### Completion Check

```bash
# Review Report existiert
test -f agent-os/specs/2026-02-01-model-selection-kanban/implementation-reports/code-review.md

# Keine kritischen Lint Errors
cd agent-os-ui && npm run lint

# Build erfolgreich
cd agent-os-ui && npm run build
```
