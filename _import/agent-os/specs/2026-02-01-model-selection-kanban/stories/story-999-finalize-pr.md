# Finalize PR

> Story ID: MSK-999
> Spec: Model Selection for Kanban Board
> Created: 2026-02-02
> Last Updated: 2026-02-02

**Priority**: High
**Type**: System
**Estimated Effort**: XS
**Dependencies**: MSK-998

---

## Feature

```gherkin
Feature: Pull Request finalisieren
  Als Entwickler,
  möchte ich dass die Spec-Implementierung mit einem sauberen PR abgeschlossen wird,
  damit die Änderungen reviewed und gemerged werden können.
```

---

## System Story Purpose

Diese System Story schließt die Spec-Implementierung ab:
- Test-Szenarien dokumentieren
- User-Todos erstellen (falls nötig)
- Pull Request erstellen
- Git Worktree Cleanup (optional)

---

## Akzeptanzkriterien (Gherkin-Szenarien)

### Szenario 1: Test-Szenarien dokumentiert

```gherkin
Scenario: Test-Dokumentation erstellt
  Given alle Stories und Validierungen sind abgeschlossen
  When test-scenarios.md erstellt wird
  Then enthält es alle manuellen und automatisierten Tests
  And das Format folgt dem Standard-Template
```

### Szenario 2: Pull Request erstellt

```gherkin
Scenario: PR mit korrektem Format
  Given alle Tests sind erfolgreich
  When der PR erstellt wird
  Then enthält er einen aussagekräftigen Titel
  And eine Summary mit allen Änderungen
  And einen Link zur Spec
```

### Szenario 3: Kanban Board aktualisiert

```gherkin
Scenario: Status auf complete gesetzt
  Given der PR ist erstellt
  When das Kanban Board aktualisiert wird
  Then ist der Status auf "spec-complete"
  And der PR-Link ist dokumentiert
```

---

## Technisches Refinement (vom Architect)

> **Refined:** 2026-02-02

### DoR (Definition of Ready) - Vom Architect

- [x] MSK-998 (Integration Validation) ist abgeschlossen
- [x] Alle Tests erfolgreich
- [x] Keine offenen kritischen Issues

### DoD (Definition of Done) - Vom Architect

- [ ] test-scenarios.md erstellt
- [ ] Pull Request erstellt mit `gh pr create`
- [ ] Kanban Board auf "spec-complete" gesetzt
- [ ] PR-URL im Kanban dokumentiert

---

### Technical Details

**WAS:**
- Test-Szenarien dokumentieren
- Pull Request erstellen
- Kanban Board finalisieren

**WIE:**
1. test-scenarios.md aus Completion Checks aller Stories generieren
2. `gh pr create` mit Template ausführen
3. Kanban Board Status auf "spec-complete" setzen
4. PR-URL in Change Log eintragen

**WO:**
- `agent-os/specs/2026-02-01-model-selection-kanban/test-scenarios.md` (NEU)
- `agent-os/specs/2026-02-01-model-selection-kanban/kanban-board.md` (UPDATE)

**WER:** git-workflow Agent

---

### Completion Check

```bash
# Test Scenarios existiert
test -f agent-os/specs/2026-02-01-model-selection-kanban/test-scenarios.md

# PR wurde erstellt (oder URL dokumentiert)
grep -q "PR" agent-os/specs/2026-02-01-model-selection-kanban/kanban-board.md || \
gh pr list --head feature/model-selection-kanban | grep -q "."

# Kanban Status ist spec-complete
grep -q "spec-complete" agent-os/specs/2026-02-01-model-selection-kanban/kanban-board.md
```
