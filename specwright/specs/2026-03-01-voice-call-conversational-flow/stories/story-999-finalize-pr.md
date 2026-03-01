# Finalize Pull Request

> Story ID: VCF-999
> Spec: Voice Call Conversational Flow
> Created: 2026-03-01
> Last Updated: 2026-03-01

**Priority**: High
**Type**: System/Finalization
**Estimated Effort**: S
**Dependencies**: VCF-998 (Integration Validation)

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
  When ich den Pull Request erstelle
  Then wird ein PR gegen main erstellt
  And enthaelt eine Summary aller Aenderungen
  And referenziert alle implementierten Stories
```

### Szenario 3: Project Knowledge aktualisieren

```gherkin
Scenario: Aktualisierung des Project Knowledge
  Given Stories mit "Creates Reusable: yes" wurden implementiert
  When ich das Project Knowledge aktualisiere
  Then werden neue Artefakte in knowledge-index.md eingetragen
  And entsprechende Detail-Dateien werden erstellt/aktualisiert
```

---

## DoR (Definition of Ready) - System Story

- [x] VCF-998 (Integration Validation) ist abgeschlossen
- [x] Alle Tests bestanden
- [x] Keine ungeloesten Probleme

---

## DoD (Definition of Done) - System Story

- [x] user-todos.md finalisiert (nicht vorhanden - keine manuellen Tasks)
- [x] Project Knowledge aktualisiert (13 Artefakte aus 8 Stories)
- [x] Alle Aenderungen committed
- [x] Pull Request erstellt (PR #20)
- [x] PR URL dokumentiert: https://github.com/michsindlinger/specwright/pull/20
- [x] Worktree aufgeraeumt (nicht verwendet - Branch-Strategy)
- [x] Kanban-Board auf "complete" gesetzt

---

## Technisches Refinement

**WAS:** PR-Finalisierung mit Knowledge Update und Cleanup

**WIE:**
- User-Todos bereinigen
- Project Knowledge aktualisieren (Stories mit "Creates Reusable: yes")
- PR erstellen mit gh cli
- Worktree aufraeumen

**WO:**
- Output: `specwright/specs/2026-03-01-voice-call-conversational-flow/user-todos.md`
- Output: `specwright/knowledge/knowledge-index.md` (wenn Artefakte vorhanden)
- Output: Pull Request auf GitHub

**Abhaengigkeiten:** VCF-998

**Geschaetzte Komplexitaet:** S

---

## Completion Check

```bash
# Verify PR was created (requires gh cli)
gh pr view --json url 2>/dev/null && echo "PR exists"
```
