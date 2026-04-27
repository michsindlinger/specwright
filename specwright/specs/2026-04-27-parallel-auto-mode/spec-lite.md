# Parallel Auto-Mode für Spec- und Backlog-Kanban - Lite Summary

> Created: 2026-04-27
> Full Spec: @specwright/specs/2026-04-27-parallel-auto-mode/spec.md

Auto-Mode parallelisiert max 2 unabhängige Stories/Items gleichzeitig — global pro Projekt über Spec-Kanban + Backlog-Kanban hinweg. Worktree-per-Story für Branch-Isolation, Backlog-Execution auf PTY-Sessions migriert. Wallclock-Halbierung ohne Race-Conditions.

## Key Points

- Globaler Concurrency-Cap = 2 (Hard-Cap = 4) pro Projekt
- Worktree-per-Story für Spec (Merge-Back in Spec-Branch) und Backlog (PR-Flow bleibt)
- Backlog-Execution von `--print`-Spawn auf PTY (`CloudTerminalManager`) migriert — gleicher Slot-Typ wie Spec
- Failure-Tolerance: Geschwister laufen weiter, Multi-Incident-UI
- Spec-Parallelität verlangt `gitStrategy=worktree` (sonst Fallback auf sequenziell + UI-Banner)

## Quick Reference

- **Status**: Planning
- **Timeline**: ~1-2 Wochen (8 Business Tasks + 3 System Tasks, 1 PR mit Commit-Disziplin)
- **Dependencies**: Branch-per-Story-Spec (BPS-001..006) bereits abgeschlossen
- **Team Members**: TBD (Backend + Frontend Specialists)

## Context Links

- Full Specification: @specwright/specs/2026-04-27-parallel-auto-mode/spec.md
- Implementation Plan: @specwright/specs/2026-04-27-parallel-auto-mode/implementation-plan.md
- Requirements Clarification: @specwright/specs/2026-04-27-parallel-auto-mode/requirements-clarification.md
- Kanban: @specwright/specs/2026-04-27-parallel-auto-mode/kanban.json
