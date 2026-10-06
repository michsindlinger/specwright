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
#       Steht <kurzname> in `intent/RESERVIERT` der eigenen Kopie, wird dessen Kennung übernommen und die
#       Zeile gestrichen (INT-2026-033)
#   bash specwright/scripts/next-intent-id.sh --hold <kurzname>    → merkt die nächste Kennung in
#       `intent/RESERVIERT` vor, ohne Ordner (für Nummern, die vorab in Roadmap oder Issue stehen); steht der
#       Kurzname dort schon, wird nur dessen Kennung ausgegeben
#   --no-fetch                        → kein `git fetch` (auch: Umgebung SPECWRIGHT_INTENT_FETCH=off)
#
# `intent/RESERVIERT` (INT-2026-033): eine Zeile je Vormerkung `INT-JJJJ-NNN <kurzname>`, `#` leitet einen
# Kommentar ein. Gezählt wird nur das erste Feld, gelesen in denselben Quellen wie die Ordner.
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
# nennt einen Befehl, der vor jedem `mkdir` (bei --hold: vor jedem Eintrag) läuft — nur für die
# deterministischen Kollisionstests gedacht.
set -u

usage() { echo "Aufruf: next-intent-id.sh [--no-fetch] [--reserve <kurzname> | --hold <kurzname>]" >&2; exit 1; }

FETCH=true; RESERVE=""; HOLD=""
while [ $# -gt 0 ]; do
  case "$1" in
    --no-fetch) FETCH=false ;;
    --reserve) shift; [ $# -gt 0 ] || usage; RESERVE=$1 ;;
    --hold) shift; [ $# -gt 0 ] || usage; HOLD=$1 ;;
    -h|--help) usage ;;
    *) usage ;;
  esac
  shift
done
[ "${SPECWRIGHT_INTENT_FETCH:-on}" = "off" ] && FETCH=false
[ -n "$RESERVE" ] && [ -n "$HOLD" ] && usage
NAME="$RESERVE$HOLD"
if [ -n "$NAME" ] && ! printf '%s' "$NAME" | grep -Eq '^[a-z0-9][a-z0-9-]{0,60}$'; then
  echo "fehler: kurzname nur kleinbuchstaben, ziffern, bindestrich (max 61 zeichen): '$NAME'" >&2; exit 1
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
# Jede Quelle liefert Zeilen mit Ordner-/Dateinamen oder vorgemerkten Kennungen; gezählt wird nur `INT-<Jahr>-NNN`.
RES=intent/RESERVIERT

# stdin: Inhalt einer RESERVIERT-Datei → je Vormerkung „kennung kurzname" (Kommentare entfernt, nur gültige Kennungen)
held_lines() {
  sed 's/#.*//' | awk 'NF >= 1 { print $1, $2 }' | grep -E '^INT-[0-9]{4}-[0-9]{3} ' || true
}
reserved_ids() { held_lines | awk '{ print $1 }'; }

candidates() {
  [ -d intent ] && ls intent 2>/dev/null
  [ -f "$RES" ] && reserved_ids <"$RES"
  if [ "$IS_GIT" = true ]; then
    git worktree list --porcelain 2>/dev/null | sed -n 's/^worktree //p' | while IFS= read -r w; do
      [ -d "$w/intent" ] && ls "$w/intent" 2>/dev/null
      [ -f "$w/$RES" ] && reserved_ids <"$w/$RES"
    done
    git for-each-ref --format='%(refname:short)' refs/heads refs/remotes 2>/dev/null | while IFS= read -r ref; do
      case "$ref" in */HEAD) continue ;; esac
      git ls-tree --name-only "$ref" intent/ 2>/dev/null
      git show "$ref:$RES" 2>/dev/null | reserved_ids
    done
  fi
  return 0
}

# Kennung, unter der <kurzname> in der eigenen RESERVIERT vorgemerkt ist (leer, wenn nicht)
held_id() {
  [ -f "$RES" ] || return 0
  held_lines <"$RES" | awk -v k="$1" '$2 == k { print $1; exit }'
}

# Zeile(n) mit <kurzname> [und optional <kennung>] aus der eigenen RESERVIERT streichen; Kommentare bleiben
drop_held() {
  [ -f "$RES" ] || return 0
  awk -v k="$1" -v id="${2:-}" '{
    line = $0; sub(/#.*/, "", line); n = split(line, f, " ")
    if (n >= 2 && f[2] == k && (id == "" || f[1] == id)) next
    print
  }' "$RES" >"$RES.tmp.$$" && mv "$RES.tmp.$$" "$RES"
}

write_placeholder() { # <dir> <kennung>
  {
    printf -- '---\n'
    printf 'intent_id: "%s"  \n' "$2"
    printf 'titel: "[TITEL]"  \n'
    printf 'status: "entwurf"  \n'
    printf 'version: "0.0.0"  \n'
    printf -- '---\n\n# Absicht: [TITEL]\n\n'
    printf 'Platzhalter — reserviert am %s durch `specwright/scripts/next-intent-id.sh --reserve %s`. Der Workflow `/intent` schreibt diese Datei im selben Schritt vollständig.\n' "$TODAY" "$RESERVE"
  } >"$1/intent.md"
}

next_id() {
  local last n
  last=$(candidates | grep -o "INT-$YEAR-[0-9][0-9][0-9]" | sort -u | tail -1)
  if [ -z "$last" ]; then n=1; else n=$((10#${last##*-} + 1)); fi
  printf 'INT-%s-%03d\n' "$YEAR" "$n"
}

if [ -z "$NAME" ]; then
  next_id
  exit 0
fi

mkdir -p intent || { echo "fehler: intent/ nicht anlegbar" >&2; exit 1; }

# --- Vormerken: Kennung in intent/RESERVIERT eintragen, kein Ordner (INT-2026-033) -----------------------
# Kollision wie beim Ordner: tragen zwei Zeilen dieselbe Kennung, behält sie der alphabetisch erste Kurzname,
# der andere nimmt seine Zeile zurück und bestimmt neu.
if [ -n "$HOLD" ]; then
  have=$(held_id "$HOLD")
  if [ -n "$have" ]; then echo "$have"; exit 0; fi
  if [ ! -f "$RES" ]; then
    {
      echo "# Vorgemerkte Vorhaben-Kennungen ohne Ordner: eine Zeile je Kennung \`INT-JJJJ-NNN <kurzname>\`, # leitet einen Kommentar ein."
      echo "# Eintragen: specwright/scripts/next-intent-id.sh --hold <kurzname> · Übernahme beim Start: --reserve <kurzname> streicht die Zeile."
    } >"$RES"
  fi
  tries=0
  while [ $tries -lt 5 ]; do
    tries=$((tries + 1))
    id=$(next_id)
    if [ -n "${SPECWRIGHT_INTENT_ID_BEFORE_MKDIR:-}" ]; then eval "$SPECWRIGHT_INTENT_ID_BEFORE_MKDIR" || true; fi
    printf '%s %s  # vorgemerkt %s\n' "$id" "$HOLD" "$TODAY" >>"$RES"
    first=$(held_lines <"$RES" | awk -v id="$id" '$1 == id { print $2 }' | sort | head -1)
    if [ "$first" = "$HOLD" ]; then echo "$id"; exit 0; fi
    drop_held "$HOLD" "$id"
    echo "hinweis: $id ist schon vergeben — Kennung wird neu bestimmt ($tries/5)" >&2
  done
  echo "fehler: keine freie Kennung vormerkbar nach 5 Versuchen ($RES prüfen)" >&2
  exit 1
fi

# --- Übernahme einer Vormerkung der eigenen Kopie (INT-2026-033) ----------------------------------------
held=$(held_id "$RESERVE")
if [ -n "$held" ]; then
  dir="intent/$held-$RESERVE"
  if ! mkdir "$dir" 2>/dev/null; then
    echo "fehler: $dir existiert schon (Vormerkung in $RES prüfen)" >&2; exit 1
  fi
  write_placeholder "$dir" "$held"
  drop_held "$RESERVE"
  echo "hinweis: vorgemerkte Kennung $held übernommen ($RES)" >&2
  echo "$held"
  exit 0
fi

# --- Reservierung: Kennung bestimmen und Ordner im selben Lauf anlegen ----------------------------
# `mkdir` ohne -p schützt nur vor demselben Ordnernamen; zwei Sitzungen mit verschiedenen Kurznamen
# könnten dieselbe Nummer bekommen. Deshalb nach dem mkdir: gibt es im eigenen `intent/` einen zweiten
# Ordner mit dieser Nummer, behält ihn der alphabetisch erste, der andere gibt seinen Ordner zurück und
# bestimmt neu (deterministisch, kein Livelock). Fremde Arbeitskopien sieht das nur beim Bestimmen.
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
      write_placeholder "$dir" "$id"
      echo "$id"
      exit 0
    fi
  fi
  echo "hinweis: $id ist schon vergeben — Kennung wird neu bestimmt ($tries/5)" >&2
done
echo "fehler: keine freie Kennung reservierbar nach 5 Versuchen (intent/ prüfen)" >&2
exit 1
