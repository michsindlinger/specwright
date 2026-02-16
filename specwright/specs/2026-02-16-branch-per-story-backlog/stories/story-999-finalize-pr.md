# Finalize Pull Request

> Story ID: BPS-999
> Spec: 2026-02-16-branch-per-story-backlog
> Created: 2026-02-16
> Last Updated: 2026-02-16

**Priority**: High
**Type**: System/Finalization
**Estimated Effort**: S
**Dependencies**: BPS-998 (Integration Validation)

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
  And alle Todos sind nach Priorität sortiert
  And eine Zusammenfassung wurde hinzugefügt
```

### Szenario 2: Pull Request erstellen

```gherkin
Scenario: Erstellung des Pull Requests
  Given alle Validierungen sind abgeschlossen
  And die Dokumentation ist vollständig
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
  And entsprechende Detail-Dateien werden erstellt/aktualisiert
```

---

## Technische Verifikation (Automated Checks)

### PR-Prüfungen

- [ ] PR_CREATED: Pull Request wurde erstellt und ist offen

---

## System Story Execution (Automatisch)

### Execution Steps

1. **User-Todos finalisieren:**
   - user-todos.md bereinigen
   - Zusammenfassung hinzufügen

2. **Project Knowledge aktualisieren:**
   - Stories mit "Creates Reusable: yes" scannen
   - knowledge-index.md aktualisieren (BPS-001 hat reusable artifacts)

3. **Pull Request erstellen:**
   ```bash
   gh pr create \
     --title "Branch-per-Story Backlog: Auto-Mode Branch-Lifecycle" \
     --body "$(cat <<'EOF'
   ## Summary
   - Git-Service um Branch/PR-Methoden erweitert
   - Backlog Auto-Mode erstellt pro Story einen Branch von main
   - Automatische PR-Erstellung pro Story
   - Skip & Continue bei Fehlern

   ## Stories Implemented
   - BPS-001: Git-Service-Erweiterungen
   - BPS-002: Backlog-Story-Lifecycle im Workflow-Executor
   - BPS-003: WebSocket + Frontend Integration und Error-Handling

   ## Test plan
   - [ ] Integration tests passed
   - [ ] Code review completed

   Generated with [Claude Code](https://claude.com/claude-code)
   EOF
   )"
   ```

4. **Kanban-Board finalisieren**

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
- [ ] Kanban-Board auf "complete" gesetzt

---

## Technisches Refinement

**WAS:** PR-Finalisierung mit Knowledge Update und Cleanup

**WIE:**
- User-Todos bereinigen
- Project Knowledge aktualisieren (BPS-001 hat reusable GitService-Methoden)
- PR erstellen mit gh cli

**WO:**
- Output: `specwright/specs/2026-02-16-branch-per-story-backlog/user-todos.md`
- Output: `specwright/knowledge/knowledge-index.md`
- Output: Pull Request auf GitHub

**Abhängigkeiten:** BPS-998

**Geschätzte Komplexität:** S

---

## Completion Check

```bash
gh pr view --json url 2>/dev/null && echo "PR exists"
```

**Story ist DONE wenn:**
1. Pull Request wurde erstellt
2. Project Knowledge wurde aktualisiert
3. Kanban-Board zeigt "complete"
