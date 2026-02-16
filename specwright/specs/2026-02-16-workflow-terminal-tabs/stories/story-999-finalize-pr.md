# Finalize Pull Request

> Story ID: WTT-999
> Spec: Workflow Terminal Tabs
> Created: 2026-02-16
> Last Updated: 2026-02-16

**Priority**: High
**Type**: System/Finalization
**Estimated Effort**: S
**Dependencies**: WTT-998 (Integration Validation)

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

### Szenario 1: Pull Request erstellen

```gherkin
Scenario: Erstellung des Pull Requests
  Given alle Validierungen sind abgeschlossen
  And die Dokumentation ist vollstaendig
  When ich den Pull Request erstelle
  Then wird ein PR gegen main erstellt
  And enthaelt eine Summary aller Aenderungen
  And referenziert alle implementierten Stories
```

### Szenario 2: Project Knowledge aktualisieren

```gherkin
Scenario: Aktualisierung des Project Knowledge
  Given Stories mit "Creates Reusable: yes" wurden implementiert
  When ich das Project Knowledge aktualisiere
  Then werden neue Artefakte in knowledge-index.md eingetragen
  And entsprechende Detail-Dateien werden erstellt/aktualisiert
```

### Szenario 3: Kanban finalisieren

```gherkin
Scenario: Kanban-Board auf complete setzen
  Given der Pull Request wurde erstellt
  When ich das Kanban-Board finalisiere
  Then zeigt das Board Status "complete"
  And alle Stories sind auf "done"
```

---

## System Story Execution (Automatisch)

### Execution Steps

1. **User-Todos finalisieren** (wenn vorhanden)
2. **Project Knowledge aktualisieren** (wenn "Creates Reusable" Stories)
3. **Pull Request erstellen** via gh cli
4. **Worktree Cleanup** (wenn verwendet)
5. **Kanban-Board finalisieren**

---

## DoR (Definition of Ready) - System Story

- [x] story-998 (Integration Validation) ist abgeschlossen
- [x] Alle Tests bestanden
- [x] Keine ungeloesten Probleme

---

## DoD (Definition of Done) - System Story

- [ ] user-todos.md finalisiert (wenn vorhanden)
- [ ] Project Knowledge aktualisiert (wenn "Creates Reusable" Stories vorhanden)
- [ ] Alle Aenderungen committed
- [ ] Pull Request erstellt
- [ ] PR URL dokumentiert
- [ ] Worktree aufgeraeumt (wenn verwendet)
- [ ] Kanban-Board auf "complete" gesetzt

---

## Completion Check

```bash
gh pr view --json url 2>/dev/null && echo "PR exists"
```
