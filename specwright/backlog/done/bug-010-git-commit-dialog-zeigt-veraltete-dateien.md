# Bug: Git Commit Dialog zeigt veraltete Dateien

> Bug ID: 2026-02-27-002
> Created: 2026-02-27
> Severity: Medium
> Status: Ready

**Priority**: Medium
**Type**: Bug - Frontend
**Affected Component**: aos-git-status-bar / aos-git-commit-dialog

---

## Bug Description

### Symptom
Beim Klick auf "Commit" in der Git-Leiste werden die geaenderten Dateien nicht aktuell angezeigt. Der Commit-Dialog zeigt veraltete Daten (letzter gecachter Git-Status).

### Reproduktion
1. Projekt in Specwright UI oeffnen
2. Dateien im Editor oder extern aendern
3. Auf "Commit" in der Git-Leiste klicken
4. Commit-Dialog zeigt keine oder veraltete geaenderte Dateien

### Expected vs. Actual
- **Expected:** Beim Oeffnen des Commit-Dialogs werden die geaenderten Dateien automatisch aktualisiert
- **Actual:** Dialog zeigt zuletzt gecachten Git-Status, Reload der Seite ist noetig

---

## Root-Cause-Analyse

### Root Cause

**Ursache:** `_handleOpenCommitDialog()` in `app.ts:1462` ruft keinen Git-Status-Refresh auf.

**Betroffene Dateien:**
- `ui/frontend/src/app.ts`: `_handleOpenCommitDialog()` fehlt der Refresh-Call

---

## Akzeptanzkriterien (Gherkin-Szenarien)

```gherkin
Scenario: Commit-Dialog zeigt aktuelle Dateien nach externen Aenderungen
  Given ich habe Dateien im Projekt extern geaendert
  When ich auf "Commit" in der Git-Leiste klicke
  Then wird ein Git-Status-Refresh automatisch ausgeloest
  And der Commit-Dialog zeigt die aktuell geaenderten Dateien
```

---

## Technical Details

**WAS:** `gateway.requestGitStatus()` in `_handleOpenCommitDialog()` aufrufen

**WO:** `ui/frontend/src/app.ts`: `_handleOpenCommitDialog()` (Zeile 1462)

**Geschaetzte Komplexitaet:** XS (1 Zeile Code)