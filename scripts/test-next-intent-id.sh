#!/usr/bin/env bash
# Test für specwright/scripts/next-intent-id.sh (INT-2026-022, AK-12/FA-21). Läuft in scripts/verify.sh Stufe 3.
#
#   T1  Remote unerreichbar            → lokale Kennung (eigene Kopie + Worktree) und Hinweis auf stderr
#   T2  --no-fetch / SPECWRIGHT_INTENT_FETCH=off → kein Fetch-Versuch, kein Hinweis
#   T3  Remote erreichbar              → Zweig nur im entfernten Repo zählt mit (höchste + 1)
#   T4  --reserve <kurzname>           → Ordner + Platzhalter-intent.md; nächster Aufruf liefert die nächste Nummer
#   T5  Kollision anderer Kurzname, gleiche Nummer (deterministisch über die Testnaht SPECWRIGHT_INTENT_ID_BEFORE_MKDIR) → nächste Nummer, eigener Ordner zurückgegeben
#   T6  fünf Kollisionen               → Exit 1 mit Meldung
#   T7  Jahr ohne Kennung → 001; kein Git-Repo → lokal + Hinweis; ungültiger Kurzname → Exit 1
#
# Braucht: bash, git. Kein Netz. Temporäre Verzeichnisse, nichts im Repo wird angefasst.
set -uo pipefail
cd "$(dirname "$0")/.."
SCRIPT="$PWD/specwright/scripts/next-intent-id.sh"
Y=$(date +%Y)
fail=0; err() { echo "❌ $*" >&2; fail=1; }; ok() { echo "✅ $*"; }
tmp=$(mktemp -d); trap 'rm -rf "$tmp"' EXIT
export GIT_CONFIG_GLOBAL=/dev/null GIT_CONFIG_NOSYSTEM=1 GIT_AUTHOR_NAME=t GIT_AUTHOR_EMAIL=t@t GIT_COMMITTER_NAME=t GIT_COMMITTER_EMAIL=t@t

run() { # verzeichnis befehl… → stdout in $OUT, stderr in $ERR, exit in $RC (kein Subshell-Verlust)
  local d=$1; shift
  OUT=$(cd "$d" && "$@" 2>"$tmp/err"); RC=$?; ERR=$(cat "$tmp/err")
}

# --- Fixture: Repo mit INT-001 (main), Worktree mit INT-002 (uncommittet), Remote-Zweig mit INT-003 ------
proj="$tmp/proj"; bare="$tmp/remote.git"
mkdir -p "$proj"; git -C "$proj" init -q -b main
mkdir -p "$proj/intent/INT-$Y-001-eins"; echo x >"$proj/intent/INT-$Y-001-eins/intent.md"
git -C "$proj" add -A; git -C "$proj" commit -qm init
git init -q --bare "$bare"; git -C "$proj" remote add origin "$bare"; git -C "$proj" push -q origin main
git -C "$proj" checkout -qb feat/drei
mkdir -p "$proj/intent/INT-$Y-003-drei"; echo x >"$proj/intent/INT-$Y-003-drei/intent.md"
git -C "$proj" add -A; git -C "$proj" commit -qm drei; git -C "$proj" push -q origin feat/drei
git -C "$proj" checkout -q main; git -C "$proj" branch -qD feat/drei; git -C "$proj" branch -qdr origin/feat/drei
wt="$tmp/proj-worktrees/zwei"; git -C "$proj" worktree add -q "$wt" -b session/zwei main
mkdir -p "$wt/intent/INT-$Y-002-zwei"

# --- T1: Remote unerreichbar → lokal (001 eigene Kopie, 002 Worktree) + Hinweis -----------------------
git -C "$proj" remote set-url origin "$tmp/gibt-es-nicht.git"
run "$proj" bash "$SCRIPT"
[[ $RC -eq 0 && "$OUT" == "INT-$Y-003" ]] && ok "T1: lokal INT-$Y-003" || err "T1: rc=$RC out='$OUT'"
[[ "$ERR" == *"hinweis: ohne entfernten Stand vergeben ($(date +%Y-%m-%d))"* ]] && ok "T1: Hinweis auf stderr" || err "T1: Hinweis fehlt: '$ERR'"

# --- T2: --no-fetch und SPECWRIGHT_INTENT_FETCH=off → kein Hinweis --------------------------------------
run "$proj" bash "$SCRIPT" --no-fetch
[[ $RC -eq 0 && "$OUT" == "INT-$Y-003" && -z "$ERR" ]] && ok "T2: --no-fetch ohne Hinweis" || err "T2: rc=$RC out='$OUT' err='$ERR'"
run "$proj" env SPECWRIGHT_INTENT_FETCH=off bash "$SCRIPT"
[[ $RC -eq 0 && "$OUT" == "INT-$Y-003" && -z "$ERR" ]] && ok "T2: SPECWRIGHT_INTENT_FETCH=off ohne Hinweis" || err "T2b: rc=$RC out='$OUT' err='$ERR'"

# --- T3: Remote erreichbar → entfernter Zweig mit 003 zählt → 004 ---------------------------------------
git -C "$proj" remote set-url origin "$bare"
run "$proj" bash "$SCRIPT"
[[ $RC -eq 0 && "$OUT" == "INT-$Y-004" && -z "$ERR" ]] && ok "T3: mit Fetch INT-$Y-004 (Remote-Zweig zählt)" || err "T3: rc=$RC out='$OUT' err='$ERR'"
git -C "$proj" rev-parse --verify -q refs/remotes/origin/feat/drei >/dev/null && ok "T3: Fetch hat origin/feat/drei geholt" || err "T3: origin/feat/drei fehlt nach Fetch"
# aus dem Worktree heraus dieselbe Antwort (eigene Kopie ist dann der Worktree)
run "$wt" bash "$SCRIPT" --no-fetch
[[ "$OUT" == "INT-$Y-004" ]] && ok "T3: aus dem Worktree ebenfalls INT-$Y-004" || err "T3b: out='$OUT'"

# --- T4: --reserve → Ordner + Platzhalter, nächster Aufruf 005 -------------------------------------------
run "$proj" bash "$SCRIPT" --reserve x
[[ $RC -eq 0 && "$OUT" == "INT-$Y-004" ]] && ok "T4: reserviert INT-$Y-004" || err "T4: rc=$RC out='$OUT' err='$ERR'"
f="$proj/intent/INT-$Y-004-x/intent.md"
[[ -f "$f" ]] && ok "T4: Platzhalter liegt" || err "T4: $f fehlt"
grep -q "^intent_id: \"INT-$Y-004\"  $" "$f" && grep -q '^titel: "\[TITEL\]"  $' "$f" && grep -q '^status: "entwurf"  $' "$f" && grep -q '^version: "0.0.0"  $' "$f" \
  && ok "T4: Kopf intent_id, titel [TITEL], status entwurf, version 0.0.0" || err "T4: Kopf unvollständig: $(head -6 "$f")"
run "$proj" bash "$SCRIPT" --no-fetch
[[ "$OUT" == "INT-$Y-005" ]] && ok "T4: nächster Aufruf INT-$Y-005" || err "T4b: out='$OUT'"
git -C "$proj" status --porcelain | grep -q "intent/INT-$Y-004-x/" && ok "T4: Reservierung ist uncommittet (Kopie dirty)" || err "T4: Reservierung nicht im Status"

# --- T5: Kollision — ein fremder Ordner entsteht zwischen Bestimmung und mkdir -----------------------------
run "$proj" env SPECWRIGHT_INTENT_ID_BEFORE_MKDIR="mkdir -p intent/INT-$Y-005-fremd" bash "$SCRIPT" --no-fetch --reserve y
[[ $RC -eq 0 && "$OUT" == "INT-$Y-006" && -d "$proj/intent/INT-$Y-006-y" ]] && ok "T5: Kollision → INT-$Y-006 reserviert" || err "T5: rc=$RC out='$OUT' err='$ERR'"
[[ "$ERR" == *"schon vergeben"* ]] && ok "T5: Kollision auf stderr genannt" || err "T5: Meldung fehlt: '$ERR'"
[[ ! -e "$proj/intent/INT-$Y-005-y" ]] && ok "T5: kein Ordner für die kollidierte Nummer" || err "T5: INT-$Y-005-y existiert"

# --- T6: fünf Kollisionen → Exit 1 ----------------------------------------------------------------------
run "$proj" env SPECWRIGHT_INTENT_ID_BEFORE_MKDIR='mkdir -p "$dir"' bash "$SCRIPT" --no-fetch --reserve z
[[ $RC -eq 1 && -z "$OUT" && "$ERR" == *"nach 5 Versuchen"* ]] && ok "T6: fünf Kollisionen → Exit 1" || err "T6: rc=$RC out='$OUT' err='$ERR'"
n=$(grep -c "schon vergeben" <<<"$ERR"); [[ $n -eq 5 ]] && ok "T6: genau 5 Versuche" || err "T6: $n Versuche"

# --- T7: Jahr ohne Kennung, kein Git-Repo, ungültiger Kurzname ----------------------------------------------
leer="$tmp/leer"; mkdir -p "$leer"; git -C "$leer" init -q -b main
run "$leer" bash "$SCRIPT" --no-fetch
[[ $RC -eq 0 && "$OUT" == "INT-$Y-001" ]] && ok "T7: ohne Kennung → INT-$Y-001" || err "T7: rc=$RC out='$OUT'"
kein="$tmp/kein-git"; mkdir -p "$kein/intent/INT-$Y-007-a"
run "$kein" bash "$SCRIPT"
[[ $RC -eq 0 && "$OUT" == "INT-$Y-008" && "$ERR" == *"hinweis: ohne entfernten Stand"* ]] && ok "T7: kein Git-Repo → lokal INT-$Y-008 + Hinweis" || err "T7b: rc=$RC out='$OUT' err='$ERR'"
run "$leer" bash "$SCRIPT" --no-fetch --reserve 'Groß Name'
[[ $RC -eq 1 && "$ERR" == *"kurzname"* ]] && ok "T7: ungültiger Kurzname → Exit 1" || err "T7c: rc=$RC err='$ERR'"
run "$leer" bash "$SCRIPT" --unbekannt
[[ $RC -eq 1 ]] && ok "T7: unbekannte Option → Exit 1" || err "T7d: rc=$RC"

[[ $fail -eq 0 ]] && echo "✅ next-intent-id: T1–T7 grün" || { echo "❌ next-intent-id: rot"; exit 1; }
