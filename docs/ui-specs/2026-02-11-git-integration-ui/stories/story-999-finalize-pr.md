# Finalize PR - Git Integration UI

> Story ID: GIT-999
> Spec: Git Integration UI
> Created: 2026-02-11
> Last Updated: 2026-02-11

**Priority**: Critical
**Type**: System/Finalization
**Estimated Effort**: 2 SP
**Dependencies**: GIT-998

---

## Purpose

Ersetzt Phase 5 - Test-Szenarien, User-Todos, PR, Worktree Cleanup.

---

## Tasks

### 1. Test-Szenarien Dokumentieren

Erstelle `implementation-reports/test-scenarios.md`:

- Manuelle Test-Szenarien fuer Git-Status-Leiste
- Manuelle Test-Szenarien fuer Branch-Wechsel
- Manuelle Test-Szenarien fuer Commit-Dialog
- Manuelle Test-Szenarien fuer Pull/Push
- Automatisierte Tests auflisten

### 2. User-Todos Erstellen

Erstelle `handover-docs/user-todos.md`:

- Konfigurationshinweise
- Git muss auf dem System installiert sein
- Erste Nutzung der Git-Integration
- Bekannte Limitationen

### 3. PR Erstellen

Erstelle PR mit:
- Titel: "feat: Add Git Integration UI"
- Beschreibung: Zusammenfassung aller Aenderungen
- Referenz zu Spec

### 4. Worktree Cleanup

- [ ] Alle Tests passen
- [ ] Keine Debug-Logs im Code
- [ ] Keine ungenutzten Imports
- [ ] Linting fehlerfrei

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
- [ ] Test-Szenarien dokumentiert
- [ ] User-Todos erstellt
- [ ] PR erstellt
- [ ] Worktree bereinigt

**WER:** dev-team__tech-lead

**Abhaengigkeiten:** GIT-998

**Geschaetzte Komplexitaet:** S

**Relevante Skills:**

| Skill | Pfad | Grund |
|-------|------|-------|
| git-workflow | agent-os/skills/git-workflow.md | PR creation and worktree cleanup |

### Completion Check

```bash
# Alle Deliverables existieren
test -f agent-os/specs/2026-02-11-git-integration-ui/implementation-reports/test-scenarios.md
test -f agent-os/specs/2026-02-11-git-integration-ui/handover-docs/user-todos.md
# PR wurde erstellt
git log --oneline --grep="Git Integration UI" | head -1
```
