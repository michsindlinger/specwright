# Finalize Pull Request

> Story ID: ASGN-999
> Spec: Spec Assignment for External Bot
> Created: 2026-02-24
> Last Updated: 2026-02-24

**Priority**: High
**Type**: System/Finalization
**Estimated Effort**: S
**Dependencies**: ASGN-998 (Integration Validation)

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
  And der Quick Summary wird aktualisiert
```

### Szenario 4: Worktree Cleanup

```gherkin
Scenario: Aufräumen des Git Worktrees
  Given der Pull Request wurde erstellt
  And Git Strategy war "worktree"
  When ich den Worktree aufräume
  Then wird der Worktree entfernt
  And die lokale Branch-Referenz bleibt erhalten
```

---

## Technische Verifikation (Automated Checks)

### Datei-Prüfungen

- [ ] FILE_EXISTS: specwright/specs/2026-02-24-spec-assignment/user-todos.md (wenn manuelle Tasks vorhanden)

### PR-Prüfungen

- [ ] PR_CREATED: Pull Request wurde erstellt und ist offen

---

## System Story Execution (Automatisch)

### Execution Steps

1. **User-Todos finalisieren:**
   - user-todos.md bereinigen
   - Duplikate entfernen
   - Zusammenfassung hinzufügen

2. **Project Knowledge aktualisieren:**
   - Stories mit "Creates Reusable: yes" scannen
   - Artefakte aus "Reusable Artifacts" Tabelle extrahieren
   - knowledge-index.md aktualisieren
   - Detail-Dateien aktualisieren

3. **Pull Request erstellen:**
   - Alle Änderungen committen
   - Branch pushen
   - PR mit gh cli erstellen

4. **Worktree Cleanup (wenn verwendet):**
   - Worktree entfernen
   - Aufräumen

5. **Abschluss:**
   - Kanban-Board finalisieren

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

**WIE:**
- User-Todos bereinigen
- Project Knowledge aktualisieren (Stories mit "Creates Reusable: yes")
- PR erstellen mit gh cli
- Worktree aufräumen

**WO:**
- Output: `specwright/specs/2026-02-24-spec-assignment/user-todos.md` (aktualisiert)
- Output: `specwright/knowledge/knowledge-index.md` (wenn Artefakte vorhanden)
- Output: Pull Request auf GitHub

**Abhängigkeiten:** ASGN-998

**Geschätzte Komplexität:** S

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
4. Worktree wurde aufgeräumt (wenn verwendet)
5. Kanban-Board zeigt "complete"
