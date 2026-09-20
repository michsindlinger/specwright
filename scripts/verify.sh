#!/usr/bin/env bash
# Specwright verify — eine Kette, ein Ergebnis. Endet mit `verify: OK` oder nennt, was rot ist.
# Läuft lokal (Mac, Bash 3.2) und in CI (.github/workflows/verify.yml). CI ist die Wahrheit.
#
#   bash scripts/verify.sh            # alles
#   bash scripts/verify.sh --fast     # ohne UI-Tests (Guards, Syntax, Lint, Builds)
set -uo pipefail
cd "$(dirname "$0")/.."

FAST=false; [[ "${1:-}" == "--fast" ]] && FAST=true
FAIL=0; START=$(date +%s)
ok()   { printf '  ✅ %s\n' "$1"; }
rot()  { printf '  ❌ %s\n' "$1"; FAIL=1; }
run()  { local name=$1; shift; if "$@" >/tmp/verify-step.log 2>&1; then ok "$name"; else rot "$name"; tail -25 /tmp/verify-step.log | sed 's/^/     /'; fi; }

echo "verify: Specwright $(cat VERSION)"

echo "[1/6] Installer-Syntax"
for f in install.sh setup.sh setup-claude-code.sh setup-devteam-global.sh update-specwright.sh check-update.sh; do
  [[ -f $f ]] && run "bash -n $f" bash -n "$f"
done
[[ -f specwright/scripts/install-lib.sh ]] && run "bash -n install-lib.sh" bash -n specwright/scripts/install-lib.sh

echo "[2/6] Guards"
run "check-mcp-launcher" bash scripts/check-mcp-launcher.sh
run "check-no-voice-config" bash -c '[[ -z "$(git ls-files ui/config/voice-config.json)" ]]' # Sprachdienst-Zugänge nie im Index (security.md §3)
[[ -f scripts/check-manifest.sh ]] && run "check-manifest" bash scripts/check-manifest.sh
[[ -f scripts/check-sdlc-installers.sh ]] && run "check-sdlc-installers" bash scripts/check-sdlc-installers.sh
[[ -f scripts/check-leser-marker.sh ]] && run "check-leser-marker" bash scripts/check-leser-marker.sh
[[ -f scripts/check-leser-marker.sh ]] && run "check-leser-marker --doc" bash scripts/check-leser-marker.sh --doc intent/*/intent.md intent/*/spec.md intent/*/plan.md
LINES=$(wc -l < CLAUDE.md | tr -d ' '); if [[ $LINES -le 90 ]]; then ok "CLAUDE.md $LINES Zeilen (≤ 90)"; else rot "CLAUDE.md $LINES Zeilen (> 90)"; fi

echo "[3/6] Installer-Test"
[[ -f scripts/test-installers.sh ]] && run "test-installers" bash scripts/test-installers.sh || echo "  (noch kein scripts/test-installers.sh)"
[[ -f scripts/test-next-intent-id.sh ]] && run "test-next-intent-id" bash scripts/test-next-intent-id.sh

echo "[4/6] UI Lint + Builds"
run "ui lint" npm --prefix ui run lint
run "ui build:backend" npm --prefix ui run build:backend
run "ui build:ui" npm --prefix ui run build:ui

if [[ $FAST == true ]]; then echo "[5/6] UI-Tests übersprungen (--fast)"; else
  echo "[5/6] UI-Tests gegen Bezugsliste"
  rm -f vitest-results.json
  (cd ui && npx vitest run --reporter=json --outputFile=../vitest-results.json >/tmp/verify-vitest.log 2>&1) || true
  run "vitest-baseline" node scripts/check-vitest-baseline.mjs vitest-results.json
  rm -f vitest-results.json
fi

echo "[6/6] Ergebnis ($(( $(date +%s) - START )) s)"
if [[ $FAIL -eq 0 ]]; then echo "verify: OK"; exit 0; else echo "verify: ROT"; exit 1; fi
