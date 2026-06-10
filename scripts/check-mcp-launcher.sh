#!/usr/bin/env bash
# Regression guard: ensure the MCP installers never re-introduce the `npx`
# wrapper chain for the kanban launcher. The kanban MCP server must be launched
# directly via the pinned local tsx binary ($MCP_DIR/node_modules/.bin/tsx),
# not `npx tsx` — the npx form spawns a 4-process chain that bloated RAM/swap
# on the cloud droplet (see install.sh install_mcp()).
#
# Run manually or from CI:  bash scripts/check-mcp-launcher.sh
set -euo pipefail

cd "$(dirname "$0")/.."

GENERATORS=(install.sh setup-mcp.sh)
fail=0

for f in "${GENERATORS[@]}"; do
    # Match an emitted MCP command set to "npx" (single- or double-quoted),
    # e.g.  'command': 'npx'  or  "command": "npx". Comments mentioning npx
    # in prose do not match this pattern.
    if grep -nE "(['\"])command\1[[:space:]]*:[[:space:]]*(['\"])npx\2" "$f"; then
        echo "❌ $f emits a kanban launcher via 'npx' — use \$MCP_DIR/node_modules/.bin/tsx instead." >&2
        fail=1
    fi
done

if [[ "$fail" -eq 0 ]]; then
    echo "✅ MCP launcher guard passed: no npx-based kanban command emitted by installers."
fi
exit "$fail"
