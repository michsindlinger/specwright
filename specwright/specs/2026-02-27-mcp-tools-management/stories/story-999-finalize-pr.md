# Finalize Pull Request

> Story ID: MCP-999
> Spec: MCP Tools Management
> Created: 2026-02-27
> Last Updated: 2026-02-27

**Priority**: High
**Type**: System/Finalization
**Estimated Effort**: S
**Dependencies**: MCP-998 (Integration Validation)

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

## Technisches Refinement

**WAS:** PR-Finalisierung mit Knowledge Update und Cleanup

**WIE:**
- User-Todos bereinigen
- Project Knowledge aktualisieren (Stories mit "Creates Reusable: yes")
- PR erstellen mit gh cli
- Worktree aufraeumen

**WO:**
- Output: `specwright/specs/2026-02-27-mcp-tools-management/user-todos.md` (aktualisiert)
- Output: `specwright/knowledge/knowledge-index.md` (wenn Artefakte vorhanden)
- Output: Pull Request auf GitHub

**Abhaengigkeiten:** MCP-998

**Geschaetzte Komplexitaet:** S

---

## Completion Check

```bash
# Verify PR was created (requires gh cli)
gh pr view --json url 2>/dev/null && echo "PR exists"
```

**Story ist DONE wenn:**
1. user-todos.md wurde finalisiert (wenn vorhanden)
2. Project Knowledge wurde aktualisiert (wenn "Creates Reusable" Stories vorhanden)
3. Pull Request wurde erstellt
4. Worktree wurde aufgeraeumt (wenn verwendet)
5. Kanban-Board zeigt "complete"
