# Finalize PR - Git Integration Erweitert

> Story ID: GITE-999
> Spec: Git Integration Erweitert
> Created: 2026-02-11
> Last Updated: 2026-02-11

**Priority**: Critical
**Type**: System/Finalization
**Estimated Effort**: 2 SP
**Dependencies**: GITE-998

---

## Purpose

Ersetzt Phase 5 - Test-Szenarien, User-Todos, PR, Worktree Cleanup.

---

## Tasks

### 1. Test-Szenarien Dokumentieren

Erstelle `implementation-reports/test-scenarios.md`:

- Manuelle Test-Szenarien fuer Datei-Revert (einzeln + batch)
- Manuelle Test-Szenarien fuer Delete Untracked
- Manuelle Test-Szenarien fuer PR-Badge
- Manuelle Test-Szenarien fuer Commit & Push
- Automatisierte Tests auflisten

### 2. User-Todos Erstellen

Erstelle `handover-docs/user-todos.md`:

- Konfigurationshinweise (gh CLI muss installiert sein fuer PR-Badge)
- Bekannte Limitationen (kein Partial Revert, kein PR-Create)
- Erste Nutzung der neuen Features

### 3. PR Erstellen

Erstelle PR mit:
- Titel: "feat: Extend Git Integration (Revert, Delete, PR Badge, Commit & Push)"
- Beschreibung: Zusammenfassung aller Aenderungen
- Referenz zu Spec

### 4. Worktree Cleanup

- [x] Alle Tests passen
- [x] Keine Debug-Logs im Code
- [x] Keine ungenutzten Imports
- [x] Linting fehlerfrei

---

## Deliverables

1. `implementation-reports/test-scenarios.md`
2. `handover-docs/user-todos.md`
3. PR erstellt
4. Worktree bereinigt

---

## Technisches Refinement

### DoR (Definition of Ready)
- [x] Integration Validation abgeschlossen
- [x] Alle Tests passen
- [x] Code Review approved

### DoD (Definition of Done)
- [x] Test-Szenarien dokumentiert
- [x] User-Todos erstellt
- [x] PR erstellt
- [x] Worktree bereinigt

**WER:** dev-team__tech-lead

**Abhaengigkeiten:** GITE-998

**Geschaetzte Komplexitaet:** S

**Relevante Skills:**

| Skill | Pfad | Grund |
|-------|------|-------|
| quality-gates | .claude/skills/quality-gates/SKILL.md | Quality standards and checklists |

### Completion Check

```bash
# Alle Deliverables existieren
test -f agent-os/specs/2026-02-11-git-integration-erweitert/implementation-reports/test-scenarios.md
test -f agent-os/specs/2026-02-11-git-integration-erweitert/handover-docs/user-todos.md
# PR wurde erstellt
git log --oneline --grep="Git Integration" | head -1
```
