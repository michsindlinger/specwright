# Spec Lite: Bulletproof Parallel Auto-Mode (v3.28.0)

> Created: 2026-05-06 · Tier: L · Mode: V2 Lean · Specwright

## What

Production-grade hardening for `gitStrategy=worktree` + `maxConcurrent>1`. Closes the architectural race-condition surface that survived v3.27.x patches: concurrent git index ops on the main project from multiple completion handlers.

## Why

Spec `2026-05-05-ifdb-wcag-2-2-aa-remediation` recurringly stalled at every parallel attempt. Each individual fix (v3.27.0..v3.27.7) exposed the next race. v3.28.0 closes the surface comprehensively via a per-main-project async mutex + dual-locked git ops + tuned cross-process file lock + automatic gitignore install.

## Tech Stack

- TypeScript (strict) on Express.js + WebSocket
- Vitest for unit + integration
- ESLint flat config
- Node.js `child_process.execSync` for git ops (kept synchronous; mutex serializes)
- File-based mkdir lock for cross-process MCP coordination

## Tasks

10 tasks split across 5 phases (Lock primitives → Critical races → Failure-path → Installer → Docs+release). See `kanban.json` (mode=lean) for full task list with planSection refs.

## Risks

- **Lock hierarchy** (`withMainProjectLock` → `withKanbanLock`, never reverse) — static-review only, no runtime check. Mitigated by JSDoc + writer-invariant comment.
- **`execSync` blocks event loop during mutex hold** — accepted, scoped per main project path so other projects unaffected. Sub-second per call.
- **Two `kanban-lock.ts` copies drift** — CI test `kanban-lock-sync.test.ts` enforces byte-equality.
