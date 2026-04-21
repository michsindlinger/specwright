# MCP Profiles

Per-workflow MCP-server allowlists. Reduces context overhead of each Claude
spawn by loading only the MCP tools a given workflow actually needs, instead
of all globally installed MCP servers (~100 tools / ~25k tokens baseline).

## Why

Claude Code normally loads every configured MCP server at session start —
`~/.claude.json` + project `.mcp.json` combined. In large setups (100+
tools) this consumes 25–30k tokens permanently, even when the current
workflow needs nothing of it. With smaller context windows (GLM 5.1, 200k)
this triggers mid-story compaction and loses in-flight workflow state,
including post-story commit instructions.

## How it works

1. The framework ships allowlist profiles in this directory. Each profile
   lists **server names only**, not credentials or URLs.
2. You create a project-scoped `specwright/mcp-always-on.json` (copy
   `mcp-always-on-template.json` and adapt). This file contains the full
   server configs — URLs, auth, commands — for your project.
3. When Specwright spawns Claude for a mapped workflow, it reads both,
   filters `mcp-always-on.json` by the profile's allowlist, writes a
   temporary `.mcp.json` to `/tmp/specwright/` with `chmod 0600`, and
   passes it to the CLI via `--mcp-config <file> --strict-mcp-config`.
4. On spawn exit, the temp file is deleted.

Workflows without a profile mapping (e.g. `/specwright:add-todo`) run
with the full MCP complement — zero behavior change.

## Setup

```bash
# From your project root
cp specwright/mcp-profiles/mcp-always-on-template.json \
   specwright/mcp-always-on.json

# Add the servers you want available to profiled workflows
# Format is identical to the official .mcp.json spec; copy entries
# directly from ~/.claude.json or your existing .mcp.json

# Optional: gitignore it if you embed credentials
echo "specwright/mcp-always-on.json" >> .gitignore
```

## Profile format

```json
{
  "$schema": "specwright-mcp-profile-v1",
  "description": "Human-readable purpose",
  "allowlist": ["kanban"],
  "allowOptional": ["context7", "github", "compass"]
}
```

- **`allowlist`** — Required servers. If any is missing from
  `mcp-always-on.json`, Specwright logs a warning and falls back to
  status-quo (no profile applied, full MCP set loaded).
- **`allowOptional`** — Included if present in `mcp-always-on.json`,
  silently skipped otherwise.

## Per-spec override

Set `mcpProfile` in `specwright/specs/<spec>/kanban.json`:

```json
{ "mcpProfile": "create-spec" }
```

This overrides the command-based default for that spec only.

## Kill switch

To disable profile-based MCP loading entirely:

```bash
SPECWRIGHT_MCP_PROFILES=off
```

Set in the UI backend env or your shell. Restores pre-v3.22.0 behavior
for every workflow.

## Shipped profiles

| Profile | Workflow(s) | Required | Optional |
|---|---|---|---|
| `execute-tasks.json` | `/specwright:execute-tasks` | kanban | context7, serena, github, playwright, compass |
| `create-spec.json` | `/specwright:create-spec` | kanban | context7, compass |
| `validate-market.json` | `/specwright:validate-market`, `...-for-existing` | — | perplexity, context7, compass |

## Troubleshooting

- **Warning "mcp-always-on.json not found"** — Create the file from
  `mcp-always-on-template.json`. Until then, profiled workflows fall
  back to full MCP set.
- **Warning "allowlist server `xyz` missing from mcp-always-on.json"** —
  Add the server config to `mcp-always-on.json` or remove it from the
  profile's `allowlist`.
- **Workflow runs with all MCPs despite profile** — Check backend log
  for `[McpProfile]` entries. Either the command isn't mapped (see
  `ui/src/server/utils/mcp-profile.ts`), the kill switch is set, or a
  required server is missing.
