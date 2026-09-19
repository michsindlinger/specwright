#!/usr/bin/env bash
# next-intent-id.sh — nächste freie Vorhaben-Kennung `INT-JJJJ-NNN` (INT-2026-022, AK-12/FA-21).
#
# Sieht mehr als den eigenen Ordner: den Stand des entfernten Repositories (Fetch, nur lesen), `intent/`
# aller Arbeitskopien des Projekts und `intent/` aller lokalen und entfernten Zweige. Zwei Sitzungen, die
# am selben Tag in verschiedenen Worktrees eine Absicht beginnen, bekommen so verschiedene Nummern
# (18.09.2026: INT-2026-017 doppelt).
#
#   bash specwright/scripts/next-intent-id.sh                      → gibt `INT-JJJJ-NNN` aus (stdout)
#   bash specwright/scripts/next-intent-id.sh --reserve <kurzname> → bestimmt die Kennung UND legt
#       `intent/INT-JJJJ-NNN-<kurzname>/intent.md` als Platzhalter an (Reservierung im selben Lauf;
#       `mkdir` ohne -p ist atomar, bei Kollision wird neu bestimmt, höchstens fünf Versuche)
#   --no-fetch                        → kein `git fetch` (auch: Umgebung SPECWRIGHT_INTENT_FETCH=off)
#
# Fetch: `GIT_TERMINAL_PROMPT=0 git fetch --all --prune --quiet`, Zeitdeckel 10 s (kein `timeout` auf macOS:
# Hintergrundprozess, Warteschleife, kill). Scheitert er oder läuft er in den Deckel, gilt der lokale Stand
# und auf stderr steht `hinweis: ohne entfernten Stand vergeben (JJJJ-MM-TT)` — der Workflow trägt das als
# `kennung_hinweis` in den Kopf der Absicht. Exit 0 in diesem Fall; Exit 1 nur bei Bedienfehler oder wenn
# die Reservierung fünfmal scheitert.
#
# Grenze (Plan §3 Punkt 11): auf demselben Rechner sieht das Skript alle Arbeitskopien direkt; zwischen zwei
# Rechnern nur, was die andere Seite schon gepusht hat. Bash 3.2 (macOS): kein mapfile, keine assoziativen Arrays.
#
# Test: scripts/test-next-intent-id.sh (in scripts/verify.sh Stufe 3). Testnaht: SPECWRIGHT_INTENT_ID_BEFORE_MKDIR
# nennt einen Befehl, der vor jedem `mkdir` läuft — nur für den deterministischen Kollisionstest gedacht.
set -u

usage() { echo "Aufruf: next-intent-id.sh [--no-fetch] [--reserve <kurzname>]" >&2; exit 1; }

FETCH=true; RESERVE=""
while [ $# -gt 0 ]; do
  case "$1" in
    --no-fetch) FETCH=false ;;
    --reserve) shift; [ $# -gt 0 ] || usage; RESERVE=$1 ;;
    -h|--help) usage ;;
    *) usage ;;
  esac
  shift
done
[ "${SPECWRIGHT_INTENT_FETCH:-on}" = "off" ] && FETCH=false
if [ -n "$RESERVE" ] && ! printf '%s' "$RESERVE" | grep -Eq '^[a-z0-9][a-z0-9-]{0,60}$'; then
  echo "fehler: kurzname nur kleinbuchstaben, ziffern, bindestrich (max 61 zeichen): '$RESERVE'" >&2; exit 1
fi

YEAR=$(date +%Y)
TODAY=$(date +%Y-%m-%d)
ROOT=$(git rev-parse --show-toplevel 2>/dev/null || pwd)
cd "$ROOT" || exit 1
IS_GIT=false; git rev-parse --git-dir >/dev/null 2>&1 && IS_GIT=true

# --- (a) entfernten Stand nachholen, mit Zeitdeckel ---------------------------------------------
hinweis() { echo "hinweis: ohne entfernten Stand vergeben ($TODAY)" >&2; }
if [ "$FETCH" = true ]; then
  if [ "$IS_GIT" = true ] && [ -n "$(git remote 2>/dev/null)" ]; then
    GIT_TERMINAL_PROMPT=0 git fetch --all --prune --quiet >/dev/null 2>&1 &
    fpid=$!
    i=0
    while kill -0 "$fpid" 2>/dev/null && [ $i -lt 100 ]; do sleep 0.1; i=$((i + 1)); done
    if kill -0 "$fpid" 2>/dev/null; then
      kill "$fpid" 2>/dev/null; wait "$fpid" 2>/dev/null
      hinweis
    else
      wait "$fpid" || hinweis
    fi
  else
    hinweis
  fi
fi

# --- (b) Kandidaten sammeln, (c) höchste + 1 ------------------------------------------------------
# Jede Quelle liefert Zeilen mit Ordner-/Dateinamen; gezählt wird nur `INT-<Jahr>-NNN`.
candidates() {
  [ -d intent ] && ls intent 2>/dev/null
  if [ "$IS_GIT" = true ]; then
    git worktree list --porcelain 2>/dev/null | sed -n 's/^worktree //p' | while IFS= read -r w; do
      [ -d "$w/intent" ] && ls "$w/intent" 2>/dev/null
    done
    git for-each-ref --format='%(refname:short)' refs/heads refs/remotes 2>/dev/null | while IFS= read -r ref; do
      case "$ref" in */HEAD) continue ;; esac
      git ls-tree --name-only "$ref" intent/ 2>/dev/null
    done
  fi
  return 0
}

next_id() {
  local last n
  last=$(candidates | grep -o "INT-$YEAR-[0-9][0-9][0-9]" | sort -u | tail -1)
  if [ -z "$last" ]; then n=1; else n=$((10#${last##*-} + 1)); fi
  printf 'INT-%s-%03d\n' "$YEAR" "$n"
}

if [ -z "$RESERVE" ]; then
  next_id
  exit 0
fi

# --- Reservierung: Kennung bestimmen und Ordner im selben Lauf anlegen ----------------------------
# `mkdir` ohne -p schützt nur vor demselben Ordnernamen; zwei Sitzungen mit verschiedenen Kurznamen
# könnten dieselbe Nummer bekommen. Deshalb nach dem mkdir: gibt es im eigenen `intent/` einen zweiten
# Ordner mit dieser Nummer, behält ihn der alphabetisch erste, der andere gibt seinen Ordner zurück und
# bestimmt neu (deterministisch, kein Livelock). Fremde Arbeitskopien sieht das nur beim Bestimmen.
mkdir -p intent || { echo "fehler: intent/ nicht anlegbar" >&2; exit 1; }
tries=0
while [ $tries -lt 5 ]; do
  tries=$((tries + 1))
  id=$(next_id)
  dir="intent/$id-$RESERVE"
  if [ -n "${SPECWRIGHT_INTENT_ID_BEFORE_MKDIR:-}" ]; then eval "$SPECWRIGHT_INTENT_ID_BEFORE_MKDIR" || true; fi
  if mkdir "$dir" 2>/dev/null; then
    first=$(ls intent | grep "^$id" | sort | head -1)
    if [ "intent/$first" != "$dir" ]; then
      rmdir "$dir" 2>/dev/null
    else
      {
        printf -- '---\n'
        printf 'intent_id: "%s"  \n' "$id"
        printf 'titel: "[TITEL]"  \n'
        printf 'status: "entwurf"  \n'
        printf 'version: "0.0.0"  \n'
        printf -- '---\n\n# Absicht: [TITEL]\n\n'
        printf 'Platzhalter — reserviert am %s durch `specwright/scripts/next-intent-id.sh --reserve %s`. Der Workflow `/intent` schreibt diese Datei im selben Schritt vollständig.\n' "$TODAY" "$RESERVE"
      } >"$dir/intent.md"
      echo "$id"
      exit 0
    fi
  fi
  echo "hinweis: $id ist schon vergeben — Kennung wird neu bestimmt ($tries/5)" >&2
done
echo "fehler: keine freie Kennung reservierbar nach 5 Versuchen (intent/ prüfen)" >&2
exit 1
