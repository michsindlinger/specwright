# Integration Context

## Completed Stories

| Story | Summary | Key Files |
|-------|---------|-----------|
| CLOUD-002 | Env-var prefix `SPECWRIGHT_PROJECTS_ROOT` for project paths in config.json | `ui/src/server/utils/projects-root.ts`, `ui/src/server/projects.ts` |

## New Exports & APIs

### Components
_None yet_

### Services
_None yet_

### Hooks / Utilities
- `ui/src/server/utils/projects-root.ts` → `getProjectsRoot(): string | null` — reads/trims `SPECWRIGHT_PROJECTS_ROOT`, null if unset
- `ui/src/server/utils/projects-root.ts` → `resolveStoredPath(stored: string): string` — joins relative paths with root when env set; absolute paths and unset-env behavior unchanged
- `ui/src/server/utils/projects-root.ts` → `toStorablePath(absolute: string): string` — converts absolute path to relative when under root; falls back to absolute otherwise

### Types / Interfaces
_None yet_

## Integration Notes

- **Cloud mode:** Set `SPECWRIGHT_PROJECTS_ROOT=/mnt/shared-projects` in systemd unit (CLOUD-004). `addProject(name, /mnt/shared-projects/foo)` then stores `{name, path: "foo"}` in `config.json`; `listProjects()` resolves back to the absolute path for downstream consumers.
- **Local mode:** Env var unset → `projects.ts` behavior is byte-identical to pre-CLOUD-002. Absolute paths flow through unchanged.
- **Backward compat:** Absolute paths in `config.json` remain valid even when env var is set (e.g., projects outside the shared root).
- **No `project-dirs.ts` refactor** — resolution happens at config-load boundary; `projectDir()` / `projectDotDir()` continue receiving fully-resolved absolute paths.

## File Change Summary

| File | Change | Story |
|------|--------|-------|
| `ui/src/server/utils/projects-root.ts` | Created | CLOUD-002 |
| `ui/src/server/projects.ts` | Modified — `listProjects` + `addProject` use resolver | CLOUD-002 |
| `ui/tests/unit/projects-root.test.ts` | Created — 14 tests | CLOUD-002 |
