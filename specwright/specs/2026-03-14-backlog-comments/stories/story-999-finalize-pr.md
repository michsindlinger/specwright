# Finalize Pull Request

> Story ID: BLC-999
> Spec: Backlog Item Comments
> Created: 2026-03-14
> Last Updated: 2026-03-14

**Status**: Done
**Priority**: High
**Type**: System/Finalization
**Estimated Effort**: S
**Dependencies**: BLC-998 (Integration Validation)

---

## Feature

```gherkin
Feature: Finalize Pull Request
  Als Entwickler
  möchte ich einen vollständigen Pull Request erstellen,
  damit das Feature zur Review und Merge bereit ist.
```

---

## DoR (Definition of Ready) - System Story

- [x] story-998 (Integration Validation) ist abgeschlossen
- [x] Alle Tests bestanden
- [x] Keine ungelösten Probleme

## DoD (Definition of Done) - System Story

- [x] user-todos.md finalisiert (wenn vorhanden) — nicht vorhanden, kein Handlungsbedarf
- [x] Project Knowledge aktualisiert — 3 neue Artefakte: aos-comment-thread, CommentHandler, comment.protocol.ts
- [x] Alle Änderungen committed
- [x] Pull Request erstellt
- [x] PR URL dokumentiert — https://github.com/michsindlinger/specwright/pull/22
- [x] Worktree aufgeräumt (wenn verwendet) — Branch-Strategie, kein Worktree
- [x] Kanban-Board auf "complete" gesetzt

## Technisches Refinement

**WAS:** PR-Finalisierung mit Knowledge Update und Cleanup

**WO:**
- Output: Pull Request auf GitHub
- Output: specwright/knowledge/ (wenn Artefakte vorhanden)

**Abhängigkeiten:** BLC-998
**Geschätzte Komplexität:** S

## Completion Check

```bash
gh pr view --json url 2>/dev/null && echo "PR exists"
```
