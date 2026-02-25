# Finalize Pull Request

> Story ID: TEAM-999
> Spec: Dev-Team Visualization
> Created: 2026-02-25
> Last Updated: 2026-02-25

**Priority**: High
**Type**: System/Finalization
**Estimated Effort**: S
**Dependencies**: TEAM-998 (Integration Validation)

---

## Feature

```gherkin
Feature: Finalize Pull Request
  Als Entwickler
  möchte ich einen vollständigen Pull Request erstellen,
  damit das Feature zur Review und Merge bereit ist.
```

---

## Akzeptanzkriterien (Gherkin-Szenarien)

### Szenario 1: Pull Request erstellen

```gherkin
Scenario: Erstellung des Pull Requests
  Given alle Validierungen sind abgeschlossen
  When ich den Pull Request erstelle
  Then wird ein PR gegen main erstellt
  And enthält eine Summary aller Änderungen
  And referenziert alle implementierten Stories
```

### Szenario 2: Project Knowledge aktualisieren

```gherkin
Scenario: Aktualisierung des Project Knowledge
  Given Stories mit "Creates Reusable: yes" wurden implementiert
  When ich das Project Knowledge aktualisiere
  Then werden neue Artefakte in knowledge-index.md eingetragen
  And der Quick Summary wird aktualisiert
```

---

## System Story Execution (Automatisch)

### Execution Steps

1. **User-Todos finalisieren** (wenn vorhanden)
2. **Project Knowledge aktualisieren** (Stories TEAM-001, TEAM-003, TEAM-004 haben "Creates Reusable: yes")
3. **Pull Request erstellen** via gh cli
4. **Worktree Cleanup** (wenn verwendet)
5. **Kanban-Board finalisieren**

---

## DoR (Definition of Ready) - System Story

- [x] story-998 (Integration Validation) ist abgeschlossen
- [x] Alle Tests bestanden
- [x] Keine ungelösten Probleme

## DoD (Definition of Done) - System Story

- [ ] user-todos.md finalisiert (wenn vorhanden)
- [ ] Project Knowledge aktualisiert
- [ ] Alle Änderungen committed
- [ ] Pull Request erstellt
- [ ] PR URL dokumentiert
- [ ] Worktree aufgeräumt (wenn verwendet)
- [ ] Kanban-Board auf "complete" gesetzt

---

## Technisches Refinement

**WAS:** PR-Finalisierung mit Knowledge Update und Cleanup

**WIE:** User-Todos bereinigen, Knowledge aktualisieren, PR erstellen via gh cli, Worktree aufräumen

**WO:**
- Output: Pull Request auf GitHub
- Output: specwright/knowledge/knowledge-index.md (aktualisiert)
- Output: specwright/knowledge/ui-components.md (aktualisiert)

**Abhängigkeiten:** TEAM-998

**Geschätzte Komplexität:** S

---

### Completion Check

```bash
gh pr view --json url 2>/dev/null && echo "PR exists"
```
