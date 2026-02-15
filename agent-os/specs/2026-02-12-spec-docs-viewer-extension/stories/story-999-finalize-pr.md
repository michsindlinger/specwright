# Finalize PR

> Story ID: SDVE-999
> Spec: Spec Docs Viewer Extension
> Created: 2026-02-12
> Last Updated: 2026-02-12

**Priority**: High
**Type**: System/Finalization
**Estimated Effort**: -
**Dependencies**: SDVE-998

---

## Purpose

Ersetzt Phase 5 - Test-Szenarien erstellen, User-Todos generieren, PR erstellen, Worktree Cleanup.

## Finalization Checklist

- [ ] Test Scenarios generiert (test-scenarios.md)
- [ ] User Todos generiert (user-todos.md)
- [ ] PR erstellt mit vollständiger Beschreibung
- [ ] Worktree Cleanup (falls Worktree-Strategie)
- [ ] Kanban Status aktualisiert
- [ ] Project Knowledge aktualisiert (falls Reusable Artifacts)

## Process

1. Test Scenarios aus allen Story Acceptance Criteria generieren
2. User Todos aus allen offenen Punkten generieren
3. PR erstellen mit Summary aller Changes
4. Worktree aufräumen (falls verwendet)
5. Kanban auf "done" setzen

---

## Technisches Refinement (vom Architect)

### DoR (Definition of Ready) - Vom Architect

- [x] Integration Validation (SDVE-998) abgeschlossen
- [x] Alle Stories implementiert und reviewed
- [x] Feature-Branch ready for PR

### DoD (Definition of Done) - Vom Architect

- [ ] test-scenarios.md erstellt
- [ ] user-todos.md erstellt
- [ ] PR erstellt und URL dokumentiert
- [ ] Kanban JSON auf completed gesetzt
- [ ] Worktree cleanup durchgeführt (falls applicable)

### Technical Details

**WAS:** PR Finalisierung und Cleanup

**WIE:** Test Scenarios und User Todos generieren, PR via `gh pr create` erstellen, Worktree cleanup

**WO:** Spec Ordner + Git Repository

**WER:** Orchestrator

**Abhängigkeiten:** SDVE-998

**Geschätzte Komplexität:** XS
