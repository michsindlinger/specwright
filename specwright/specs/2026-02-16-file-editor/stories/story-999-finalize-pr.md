# Finalize Pull Request

> Story ID: FE-999
> Spec: File Editor
> Created: 2026-02-16
> Last Updated: 2026-02-16

**Priority**: High
**Type**: System/Finalization
**Estimated Effort**: S
**Dependencies**: FE-998 (Integration Validation)

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
  And eine Zusammenfassung wurde hinzugefuegt
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
  And der Quick Summary wird aktualisiert
```

### Szenario 4: Worktree Cleanup

```gherkin
Scenario: Aufraeumen des Git Worktrees
  Given der Pull Request wurde erstellt
  And Git Strategy war "worktree"
  When ich den Worktree aufraeume
  Then wird der Worktree entfernt
  And die lokale Branch-Referenz bleibt erhalten
```

---

## Technische Verifikation (Automated Checks)

### Datei-Pruefungen

- [ ] FILE_EXISTS: specwright/specs/2026-02-16-file-editor/user-todos.md (wenn manuelle Tasks vorhanden)

### PR-Pruefungen

- [ ] PR_CREATED: Pull Request wurde erstellt und ist offen

---

## System Story Execution (Automatisch)

### Execution Steps

1. **User-Todos finalisieren:**
   - user-todos.md bereinigen
   - Duplikate entfernen
   - Zusammenfassung hinzufuegen

2. **Project Knowledge aktualisieren:**
   - Stories mit "Creates Reusable: yes" scannen
   - Artefakte aus "Reusable Artifacts" Tabelle extrahieren
   - knowledge-index.md aktualisieren (oder erstellen)
   - Detail-Dateien aktualisieren

3. **Pull Request erstellen:**
   - Alle Aenderungen committen
   - Branch pushen
   - PR mit gh cli erstellen

4. **Worktree Cleanup (wenn verwendet):**
   - Worktree entfernen
   - Aufraeumen

5. **Abschluss:**
   - Kanban-Board finalisieren

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
- Output: `specwright/specs/2026-02-16-file-editor/user-todos.md` (aktualisiert)
- Output: `specwright/knowledge/knowledge-index.md` (wenn Artefakte vorhanden)
- Output: Pull Request auf GitHub

**WER:** git-workflow Agent

**Abhaengigkeiten:** FE-998

**Geschaetzte Komplexitaet:** S

---

## Pull Request Creation

### PR-Format

```markdown
## Summary
- Backend File Service mit WebSocket-Kommunikation und Path-Traversal-Schutz
- File Tree Sidebar als Overlay von links mit Lazy-Loading
- Code Editor basierend auf CodeMirror 6 mit Multi-Language Syntax-Highlighting
- Multi-Tab-System mit Unsaved-Changes-Handling
- Context Menu mit CRUD-Operationen im Dateibaum
- Edge-Case-Handling und optionale Features (Auto-Save, Dateisuche)

## Stories Implemented
- FE-001: Backend File API
- FE-002: File Tree Component
- FE-003: File Tree Sidebar
- FE-004: Code Editor Component
- FE-005: Tab Management
- FE-006: Context Menu & File Operations
- FE-007: Integration, Edge Cases & Polish

## Test plan
- [ ] Integration tests passed
- [ ] Code review completed
- [ ] Frontend build succeeds
- [ ] Backend tests pass

Generated with [Claude Code](https://claude.com/claude-code)
```

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
