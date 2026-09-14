#!/usr/bin/env bash
# production-gate.sh — PreToolUse hook for Bash.
# Blocks commands that look like a production deploy unless a release approval is present.
# Exit 2 = block (stderr is shown to Claude). Exit 0 = allow.
set -u

PROJECT="${CLAUDE_PROJECT_DIR:-$(pwd)}"
APPROVAL_FILE="$PROJECT/.claude/release-approval"

# Adjust to the project's deploy tooling.
DEPLOY_PATTERN='(^|[[:space:]/:-])(deploy|release|rollout|apply|publish)([[:space:]:-]|$)'
PROD_PATTERN='(^|[[:space:]/:=_-])(prod|production|live)([[:space:]/:=_-]|$)'

CMD=$(python3 -c 'import json,sys
d=json.load(sys.stdin); print(d.get("tool_input",{}).get("command",""))' 2>/dev/null)
[ -z "$CMD" ] && exit 0

printf '%s' "$CMD" | grep -Eiq "$DEPLOY_PATTERN" || exit 0
printf '%s' "$CMD" | grep -Eiq "$PROD_PATTERN"   || exit 0

if [ -n "${RELEASE_APPROVAL:-}" ]; then
  echo "production-gate: approved by RELEASE_APPROVAL='$RELEASE_APPROVAL'" >&2
  exit 0
fi

if [ -f "$APPROVAL_FILE" ]; then
  echo "production-gate: approved by $APPROVAL_FILE ($(head -1 "$APPROVAL_FILE"))" >&2
  exit 0
fi

cat >&2 <<EOF
Blocked: this looks like a production deploy and no release approval is present.
  Command: $CMD
A human release manager approves by either
  export RELEASE_APPROVAL="<name> <YYYY-MM-DD> <intent-id>"
or writing that line into $APPROVAL_FILE (delete it after the deploy).
Prepare the deploy, report readiness, and stop. (production-gate)
EOF
exit 2
