# Finalize Pull Request

> Story ID: [SPEC_PREFIX]-999
> Spec: [SPEC_NAME]
> Created: [CREATED_DATE]
> Last Updated: [LAST_UPDATED_DATE]

**Priority**: High
**Type**: System/Finalization
**Estimated Effort**: S
**Dependencies**: [SPEC_PREFIX]-998 (Integration Validation)

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

### Szenario 3: Project Knowledge aktualisieren (v4.1)

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

- [ ] FILE_EXISTS: specwright/specs/[SPEC_NAME]/user-todos.md (wenn manuelle Tasks vorhanden)

### PR-Prüfungen

- [ ] PR_CREATED: Pull Request wurde erstellt und ist offen

---

## System Story Execution (Automatisch)

> **Hinweis:** Der Agent führt folgende Schritte automatisch durch:

### Execution Steps

1. **User-Todos finalisieren:**
   - user-todos.md bereinigen
   - Duplikate entfernen
   - Zusammenfassung hinzufügen

2. **Project Knowledge aktualisieren (v4.1):**
   - Stories mit "Creates Reusable: yes" scannen
   - Artefakte aus "Reusable Artifacts" Tabelle extrahieren
   - knowledge-index.md aktualisieren (oder erstellen)
   - Detail-Dateien aktualisieren (ui-components.md, etc.)
   - Knowledge-Änderungen committen

3. **Pull Request erstellen:**
   - Alle Änderungen committen
   - Branch pushen
   - PR mit gh cli erstellen

4. **Worktree Cleanup (wenn verwendet):**
   - Worktree entfernen
   - Aufräumen

5. **Abschluss:**
   - Kanban-Board finalisieren
   - Completion Sound abspielen

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
- Output: `specwright/specs/[SPEC_NAME]/user-todos.md` (aktualisiert)
- Output: `specwright/knowledge/knowledge-index.md` (wenn Artefakte vorhanden)
- Output: `specwright/knowledge/*.md` (Detail-Dateien)
- Output: Pull Request auf GitHub

**WER:** git-workflow Agent

**Abhängigkeiten:** story-998

**Geschätzte Komplexität:** S

---

## User-Todos Finalization

### Bereinigung

1. Duplikate entfernen
2. Erledigte Todos markieren
3. Prioritäten validieren
4. Ungenutzte Sektionen entfernen

### Zusammenfassung hinzufügen

```markdown
## Zusammenfassung

**Gesamt:** [N] offene Aufgaben
- Kritisch: [X]
- Wichtig: [Y]
- Optional: [Z]

**Geschätzte Zeit:** [ROUGH_ESTIMATE]
```

---

## Project Knowledge Update (v4.1)

### Wann wird aktualisiert?

Das Project Knowledge wird nur aktualisiert wenn:
- Mindestens eine Story "Creates Reusable: yes" hat
- Die "Reusable Artifacts" Tabelle Einträge enthält

### Ablauf

1. **Stories scannen:**
   ```
   FOR EACH story in stories/:
     SKIP system stories (997, 998, 999)
     CHECK "Creates Reusable" field
     IF yes: EXTRACT artifacts from table
   ```

2. **Knowledge-Index aktualisieren:**
   - Erstelle `specwright/knowledge/` Verzeichnis wenn nicht vorhanden
   - Erstelle/aktualisiere `knowledge-index.md`
   - Aktualisiere Kategorien-Tabelle
   - Aktualisiere Quick Summary

3. **Detail-Dateien aktualisieren:**
   - Mappe Artefakt-Typ zu Detail-Datei:
     | Typ | Datei |
     |-----|-------|
     | UI Component | ui-components.md |
     | API Endpoint | api-contracts.md |
     | Service/Hook | shared-services.md |
     | Model/Schema | data-models.md |
   - Füge neue Einträge in Übersichts-Tabelle
   - Füge Detail-Sektionen hinzu

### Template Lookup (Hybrid)

1. Local: `specwright/templates/knowledge/[template].md`
2. Global: `~/.specwright/templates/knowledge/[template].md`

### Dynamische Kategorien

Wenn ein Artefakt-Typ nicht zu bestehenden Kategorien passt:
- Inferiere Kategorie-Namen aus Artefakt
- Erstelle neue Kategorie-Datei
- Füge neue Zeile zur knowledge-index.md hinzu

---

## Pull Request Creation

### PR-Format

```markdown
## Summary
- [Bullet points der Änderungen]

## Stories Implemented
- [SPEC_PREFIX]-001: [Title]
- [SPEC_PREFIX]-002: [Title]
- ...

## Manual Tasks Required
[Verweis auf user-todos.md oder "None"]

---
Generated with [Claude Code](https://claude.com/claude-code)
```

### gh cli Command

```bash
gh pr create \
  --title "[SPEC_NAME]: [Brief Description]" \
  --body "$(cat <<'EOF'
## Summary
[Generated Summary]

## Test plan
- [ ] Integration tests passed
- [ ] Code review completed

Generated with [Claude Code](https://claude.com/claude-code)
EOF
)"
```

---

## Worktree Cleanup

### Bedingung

Nur wenn Git Strategy = "worktree" in Resume Context.

### Cleanup Steps

```bash
# 1. Verify PR was created
gh pr view --json url

# 2. Return to main project
cd [PROJECT_ROOT]

# 3. Remove worktree
git worktree remove [WORKTREE_PATH]

# 4. Verify
git worktree list
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
4. Worktree wurde aufgeräumt (wenn verwendet)
5. Kanban-Board zeigt "complete"
