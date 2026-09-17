#!/usr/bin/env bash
# no-secrets.sh — PreToolUse hook for Bash.
# When the command is a `git commit`, scans the staged changes for secret patterns and secret files.
# Exit 2 = block (stderr is shown to Claude). Exit 0 = allow.
set -u

PROJECT="${CLAUDE_PROJECT_DIR:-$(pwd)}"

# File names that must never be committed (extended regex on the staged path).
SECRET_FILES='(^|/)\.env(\..*)?$|service-?account.*\.json$|(^|/)configs?/.*\.json$|\.pem$|\.p12$|\.key$|id_(rsa|ed25519)(\.pub)?$|lippegitlab\.token$'
# Content patterns in added lines.
SECRET_CONTENT='AKIA[0-9A-Z]{16}|glpat-[A-Za-z0-9_-]{20,}|ghp_[A-Za-z0-9]{36}|github_pat_[A-Za-z0-9_]{22,}|sk-[A-Za-z0-9]{20,}|sk-ant-[A-Za-z0-9_-]{20,}|AIza[0-9A-Za-z_-]{35}|xox[baprs]-[A-Za-z0-9-]{10,}|-----BEGIN (RSA |EC |OPENSSH )?PRIVATE KEY-----|"private_key"[[:space:]]*:|eyJ[A-Za-z0-9_-]{30,}\.eyJ'

CMD=$(python3 -c 'import json,sys
d=json.load(sys.stdin); print(d.get("tool_input",{}).get("command",""))' 2>/dev/null)
[ -z "$CMD" ] && exit 0

printf '%s' "$CMD" | grep -Eq '(^|[;&|[:space:]])git[[:space:]]+(-C[[:space:]]+[^[:space:]]+[[:space:]]+)?commit([[:space:]]|$)' || exit 0

cd "$PROJECT" 2>/dev/null || exit 0
git rev-parse --is-inside-work-tree >/dev/null 2>&1 || exit 0

STAGED=$(git diff --cached --name-only --diff-filter=ACMR 2>/dev/null)
[ -z "$STAGED" ] && exit 0

BAD_FILES=$(printf '%s\n' "$STAGED" | grep -E "$SECRET_FILES" || true)
# Ausnahmeliste je Projekt (optional): `.claude/no-secrets-allow.txt`, eine erweiterte Regex je Zeile,
# `#`-Kommentare erlaubt. Nimmt passende Pfade nur aus der Dateinamen-Regel; die Inhaltsregel unten
# prüft weiter jede hinzugefügte Zeile jeder Datei. Ohne Datei bleibt der Hook unverändert streng.
ALLOW_FILE="$PROJECT/.claude/no-secrets-allow.txt"
if [ -n "$BAD_FILES" ] && [ -f "$ALLOW_FILE" ]; then
  ALLOW_TMP=$(mktemp 2>/dev/null || true)
  if [ -n "$ALLOW_TMP" ]; then
    grep -Ev '^[[:space:]]*(#|$)' "$ALLOW_FILE" > "$ALLOW_TMP" || true
    if [ -s "$ALLOW_TMP" ]; then
      BAD_FILES=$(printf '%s\n' "$BAD_FILES" | grep -Ev -f "$ALLOW_TMP" || true)
    fi
    rm -f "$ALLOW_TMP"
  fi
fi
if [ -n "$BAD_FILES" ]; then
  echo "Blocked: staged files look like secrets — unstage them (git restore --staged <file>) and add them to .gitignore:" >&2
  printf '  %s\n' $BAD_FILES >&2
  echo "(no-secrets)" >&2
  exit 2
fi

HITS=$(git diff --cached -U0 2>/dev/null | grep -E '^\+[^+]' | grep -En "$SECRET_CONTENT" | head -5 || true)
if [ -n "$HITS" ]; then
  echo "Blocked: staged diff contains what looks like a credential. Remove it, rotate it if it is real, then commit again:" >&2
  printf '%s\n' "$HITS" | sed -E 's/([A-Za-z0-9_-]{8})[A-Za-z0-9_\/+=-]{8,}/\1…/g' >&2
  echo "(no-secrets)" >&2
  exit 2
fi

exit 0
