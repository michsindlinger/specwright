# Finalize Pull Request

> Story ID: CTM-999
> Spec: Custom Team Members
> Created: 2026-02-26
> Last Updated: 2026-02-26

**Priority**: High
**Type**: System/Finalization
**Estimated Effort**: S
**Dependencies**: CTM-998 (Integration Validation)

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

### Szenario 1: User-Todos finalisieren

```gherkin
Scenario: Finalisierung der manuellen Aufgaben
  Given während der Implementierung wurden manuelle Tasks gesammelt
  When ich die User-Todos finalisiere
  Then ist user-todos.md vollständig und bereinigt
```

### Szenario 2: Pull Request erstellen

```gherkin
Scenario: Erstellung des Pull Requests
  Given alle Validierungen sind abgeschlossen
  When ich den Pull Request erstelle
  Then wird ein PR gegen main erstellt
  And enthält eine Summary aller Änderungen
  And referenziert alle implementierten Stories
```

### Szenario 3: Project Knowledge aktualisieren

```gherkin
Scenario: Aktualisierung des Project Knowledge
  Given Stories mit "Creates Reusable: yes" wurden implementiert
  When ich das Project Knowledge aktualisiere
  Then werden neue Artefakte in knowledge-index.md eingetragen
```

---

## System Story Execution (Automatisch)

### Execution Steps

1. **User-Todos finalisieren**
2. **Project Knowledge aktualisieren** (Stories mit "Creates Reusable: yes")
3. **Pull Request erstellen** via gh cli
4. **Worktree Cleanup** (wenn verwendet)
5. **Kanban-Board finalisieren**

---

## DoR (Definition of Ready) - System Story

- [x] story-998 (Integration Validation) ist abgeschlossen
- [x] Alle Tests bestanden
- [x] Keine ungelösten Probleme

---

## DoD (Definition of Done) - System Story

- [ ] user-todos.md finalisiert (wenn vorhanden)
- [ ] Project Knowledge aktualisiert (wenn "Creates Reusable" Stories vorhanden)
- [ ] Alle Änderungen committed
- [ ] Pull Request erstellt
- [ ] PR URL dokumentiert
- [ ] Worktree aufgeräumt (wenn verwendet)
- [ ] Kanban-Board auf "complete" gesetzt

---

## Technisches Refinement

**WAS:** PR-Finalisierung mit Knowledge Update und Cleanup

**WO:**
- Output: Pull Request auf GitHub
- Output: `specwright/knowledge/knowledge-index.md` (wenn Artefakte vorhanden)

**Abhängigkeiten:** CTM-998

**Geschätzte Komplexität:** S

---

## Completion Check

```bash
# Verify PR was created
gh pr view --json url 2>/dev/null && echo "PR exists"
```
