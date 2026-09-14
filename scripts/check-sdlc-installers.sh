#!/usr/bin/env bash
# Regression guard: every SDLC-v4 file (templates/sdlc/**, the four workflows
# intent/spec/plan/build and their commands) must be listed in every installer
# that ships that kind of file. Installer drift was a recurring bug (see
# memory: add-team-member missing in all installers, 2026-02-27).
#
# Run manually or from CI:  bash scripts/check-sdlc-installers.sh
set -euo pipefail
cd "$(dirname "$0")/.."

fail=0
need() { # file  installer...
    local f=$1; shift
    for inst in "$@"; do
        grep -qF -- "$f" "$inst" || { echo "❌ $inst: fehlt $f" >&2; fail=1; }
    done
}

while IFS= read -r f; do
    rel=${f#specwright/templates/sdlc/}
    need "templates/sdlc/$rel" install.sh setup.sh setup-devteam-global.sh
done < <(find specwright/templates/sdlc -type f | sort)

for w in intent spec plan build; do
    need "workflows/core/$w.md" install.sh setup.sh
    need "\"$w.md\"" setup-claude-code.sh update-specwright.sh
    grep -qE "(^|[[:space:]])$w\.md([[:space:]]|$)" install.sh update-specwright.sh || { echo "❌ command $w.md fehlt in install.sh/update-specwright.sh" >&2; fail=1; }
    [[ -f ".claude/commands/specwright/$w.md" ]] || { echo "❌ .claude/commands/specwright/$w.md fehlt" >&2; fail=1; }
done

v=$(cat VERSION); grep -qF "FRAMEWORK_VERSION=\"$v\"" install.sh || { echo "❌ VERSION ($v) != install.sh FRAMEWORK_VERSION" >&2; fail=1; }

[[ $fail -eq 0 ]] && echo "✅ SDLC-v4-Dateien in allen Installern, VERSION synchron ($v)."
exit $fail
