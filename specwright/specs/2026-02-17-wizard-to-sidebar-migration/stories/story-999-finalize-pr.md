# Finalize Pull Request

> Story ID: WSM-999
> Spec: Wizard-to-Sidebar Migration
> Created: 2026-02-17
> Last Updated: 2026-02-17

**Priority**: High
**Type**: System/Finalization
**Estimated Effort**: S
**Dependencies**: WSM-998 (Integration Validation)

---

## Feature

```gherkin
Feature: Finalize Pull Request
  Als Entwickler
  moechte ich einen vollstaendigen Pull Request erstellen,
  damit das Feature zur Review und Merge bereit ist.
```

---

## Akzeptanzkriterien (Gherkin-Szenarien)

### Szenario 1: User-Todos finalisieren

```gherkin
Scenario: Finalisierung der manuellen Aufgaben
  Given waehrend der Implementierung wurden manuelle Tasks gesammelt
  When ich die User-Todos finalisiere
  Then ist user-todos.md vollstaendig und bereinigt
  And alle Todos sind nach Prioritaet sortiert
```

### Szenario 2: Pull Request erstellen

```gherkin
Scenario: Erstellung des Pull Requests
  Given alle Validierungen sind abgeschlossen
  And die Dokumentation ist vollstaendig
  When ich den Pull Request erstelle
  Then wird ein PR gegen main erstellt
  And enthaelt eine Summary aller Aenderungen
  And referenziert alle implementierten Stories
```

---

## System Story Execution (Automatisch)

### Execution Steps

1. **User-Todos finalisieren:**
   - user-todos.md bereinigen
   - Zusammenfassung hinzufuegen

2. **Pull Request erstellen:**
   - Alle Aenderungen committen
   - Branch pushen
   - PR mit gh cli erstellen

3. **Abschluss:**
   - Kanban-Board finalisieren

---

## DoR (Definition of Ready) - System Story

- [x] story-998 (Integration Validation) ist abgeschlossen
- [x] Alle Tests bestanden
- [x] Keine ungeloesten Probleme

---

## DoD (Definition of Done) - System Story

- [ ] user-todos.md finalisiert (wenn vorhanden)
- [ ] Alle Aenderungen committed
- [ ] Pull Request erstellt
- [ ] PR URL dokumentiert
- [ ] Kanban-Board auf "complete" gesetzt

---

## Technisches Refinement

**WAS:** PR-Finalisierung und Cleanup

**WIE:**
- User-Todos bereinigen
- PR erstellen mit gh cli

**WO:**
- Output: `specwright/specs/2026-02-17-wizard-to-sidebar-migration/user-todos.md`
- Output: Pull Request auf GitHub

**Abhaengigkeiten:** WSM-998

**Geschaetzte Komplexitaet:** S

---

## Completion Check

```bash
# Verify PR was created (requires gh cli)
gh pr view --json url 2>/dev/null && echo "PR exists"
```
