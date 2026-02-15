# Finalize PR

> Story ID: OSR-999
> Spec: Open Source Ready
> Created: 2026-02-11
> Last Updated: 2026-02-11
> Type: System/Finalization

**Priority**: High
**Type**: System
**Estimated Effort**: -
**Dependencies**: OSR-998

---

## Purpose

Erstellt Test-Szenarien, User-Todos, PR und führt Worktree Cleanup durch.

## Tasks

1. **Test-Szenarien erstellen**: Manuelle Test-Szenarien für User-Validation
2. **User-Todos erstellen**: Liste von manuellen Schritten die der User nach Merge durchführen muss
3. **PR erstellen**: Pull Request mit vollständiger Beschreibung erstellen
4. **Worktree Cleanup**: Feature-Branch Worktree aufräumen (wenn verwendet)

## User-Todos (Voraussichtlich)

- [ ] Perplexity API Key rotieren (alter Key war in Git-History)
- [ ] Neues GitHub Repository erstellen und `prepare-fresh-repo.sh` ausführen
- [ ] README.md Screenshots/Demo-GIF hinzufügen (optional)
- [ ] GitHub Repository Settings konfigurieren (Description, Topics, etc.)

## Acceptance Criteria

- [ ] PR erstellt mit vollständiger Beschreibung
- [ ] Test-Szenarien dokumentiert
- [ ] User-Todos dokumentiert
- [ ] Worktree aufgeräumt (wenn applicable)

## Execution Notes

- Letzte System Story - wird nach Integration Validation ausgeführt
- PR wird gegen main branch erstellt
- User-Todos werden als Markdown-Checklist im PR oder separater Datei dokumentiert
