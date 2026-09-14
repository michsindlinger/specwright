#!/usr/bin/env bash
# protect-tests.sh — PreToolUse hook for Edit/Write/MultiEdit.
# Blocks edits to test files while .claude/fix-mode exists, and to test baselines always.
# Exit 2 = block (stderr is shown to Claude). Exit 0 = allow.
set -u

PROJECT="${CLAUDE_PROJECT_DIR:-$(pwd)}"
MARKER="$PROJECT/.claude/fix-mode"

# Regex (extended) matched against the path relative to the project.
TEST_PATTERNS='(^|/)(__tests__|tests?|spec|e2e)/|\.(test|spec)\.[cm]?[jt]sx?$|_test\.(py|go)$'
# Files an agent must never edit to make a run green.
BASELINES='(^|/)(jest-known-failures\.txt|known-failures\.txt|\.snap|snapshots?/|baseline\.json|jest-results\.json)$'

[ "${ALLOW_TEST_EDITS:-0}" = "1" ] && exit 0

FILE=$(python3 -c 'import json,sys
d=json.load(sys.stdin); t=d.get("tool_input",{})
print(t.get("file_path") or t.get("path") or "")' 2>/dev/null)
[ -z "$FILE" ] && exit 0

REL="${FILE#"$PROJECT"/}"

if printf '%s' "$REL" | grep -Eq "$BASELINES"; then
  echo "Blocked: '$REL' is a test baseline. Fix the code, not the baseline. (protect-tests)" >&2
  exit 2
fi

if [ -f "$MARKER" ] && printf '%s' "$REL" | grep -Eq "$TEST_PATTERNS"; then
  echo "Blocked: fix mode is active ($MARKER) — test files are frozen. Fix the code, not the test. Remove the marker in the finalize phase or set ALLOW_TEST_EDITS=1 with a reason in plan.md §14. (protect-tests)" >&2
  exit 2
fi

exit 0
