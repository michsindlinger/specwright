# Integration Context

## Completed Stories

| Story | Summary | Key Files |
|-------|---------|-----------|
| CLOUD-002 | Env-var prefix `SPECWRIGHT_PROJECTS_ROOT` for project paths in config.json | `ui/src/server/utils/projects-root.ts`, `ui/src/server/projects.ts` |
| CLOUD-004 | Cloud-deploy skeleton: setup-ui-cloud.sh + systemd unit + relative WS URL + HOST bind | `setup-ui-cloud.sh`, `cloud-deploy/specwright-ui.service`, `ui/src/server/index.ts`, `ui/frontend/src/gateway.ts` |

## New Exports & APIs

### Components
_None yet_

### Services
_None yet_

### Hooks / Utilities
- `ui/src/server/utils/projects-root.ts` → `getProjectsRoot(): string | null` — reads/trims `SPECWRIGHT_PROJECTS_ROOT`, null if unset
- `ui/src/server/utils/projects-root.ts` → `resolveStoredPath(stored: string): string` — joins relative paths with root when env set; absolute paths and unset-env behavior unchanged
- `ui/src/server/utils/projects-root.ts` → `toStorablePath(absolute: string): string` — converts absolute path to relative when under root; falls back to absolute otherwise

### Runtime / Env Vars
- `HOST` (CLOUD-004) — Express+WS bind address, default `0.0.0.0`. Cloud unit sets `127.0.0.1` so Cloudflare Tunnel is the only entry path.
- `PORT` (existing) — service port, default `3001`. Cloud unit sets via systemd Environment.
- `SPECWRIGHT_PROJECTS_ROOT` (CLOUD-002) — see Hooks above.

### Deployment Artifacts
- `cloud-deploy/specwright-ui.service` — systemd unit template with `__PLACEHOLDERS__` rewritten by `setup-ui-cloud.sh` (sed) at install time.
- `setup-ui-cloud.sh` — root-only droplet installer; idempotent. Flags: `--home`, `--user`, `--port`, `--projects-root`, `--service-name`, `--branch`, `--no-start`. Installs unit at `/etc/systemd/system/${SERVICE_NAME}.service`.

### Types / Interfaces
_None yet_

## Integration Notes

- **Cloud mode:** Set `SPECWRIGHT_PROJECTS_ROOT=/mnt/shared-projects` in systemd unit (CLOUD-004). `addProject(name, /mnt/shared-projects/foo)` then stores `{name, path: "foo"}` in `config.json`; `listProjects()` resolves back to the absolute path for downstream consumers.
- **Local mode:** Env var unset → `projects.ts` behavior is byte-identical to pre-CLOUD-002. Absolute paths flow through unchanged.
- **Backward compat:** Absolute paths in `config.json` remain valid even when env var is set (e.g., projects outside the shared root).
- **No `project-dirs.ts` refactor** — resolution happens at config-load boundary; `projectDir()` / `projectDotDir()` continue receiving fully-resolved absolute paths.
- **Frontend WS URL (CLOUD-004):** `gateway.ts` no longer hardcodes `:3001`. In dev (`import.meta.env.DEV`) it forces `${hostname}:3001` so Vite dev server (5173) can reach the backend; in prod it uses `window.location.host` so the WebSocket follows the browser-visible host (Cloudflare Tunnel hostname / `localhost:3001` for self-served local prod).
- **Cloud bind (CLOUD-004):** systemd unit sets `HOST=127.0.0.1`, so the listener is unreachable from the public internet — Cloudflare Tunnel (CLOUD-005) is the only ingress path. Local installs leave `HOST` unset → `0.0.0.0` (current behavior).

## File Change Summary

| File | Change | Story |
|------|--------|-------|
| `ui/src/server/utils/projects-root.ts` | Created | CLOUD-002 |
| `ui/src/server/projects.ts` | Modified — `listProjects` + `addProject` use resolver | CLOUD-002 |
| `ui/tests/unit/projects-root.test.ts` | Created — 14 tests | CLOUD-002 |
| `setup-ui-cloud.sh` | Created — droplet installer (idempotent) | CLOUD-004 |
| `cloud-deploy/specwright-ui.service` | Created — systemd unit template | CLOUD-004 |
| `ui/src/server/index.ts` | Modified — `HOST` env binds listen address (default `0.0.0.0`) | CLOUD-004 |
| `ui/frontend/src/gateway.ts` | Modified — relative WS URL (dev forces `:3001`, prod uses `window.location.host`) | CLOUD-004 |
