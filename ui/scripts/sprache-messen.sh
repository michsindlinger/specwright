#!/usr/bin/env bash
# sprache-messen.sh — Wiederholungsmessung der lokalen Spracherkennung (INT-2026-025, D12, EK-01/EK-03).
#
# Spricht 10 feste deutsche Sätze mit der Mac-Stimme „Anna" in einen temporären
# Ordner, startet whisper-server auf einem freien Port (nur 127.0.0.1), schickt
# jeden Satz an /inference und meldet Median der Antwortzeit und Wortfehlerrate.
# Räumt Server und Ordner in jedem Fall weg. Nur macOS, nicht für CI.
# Bash 3.2-tauglich.
set -euo pipefail

MODELL_NAME="ggml-large-v3-turbo-q5_0.bin"
MODELL="${SPECWRIGHT_WHISPER_MODEL:-${SPECWRIGHT_SPRACHE_DIR:-$HOME/.specwright/sprache}/$MODELL_NAME}"
VOKABELN="Spec, Plan, Merge, Pull Request, Commit, Build, CI, Glocke, Absicht, Freigabe"
STIMME="Anna"

if [ "${1:-}" = "--help" ] || [ "${1:-}" = "-h" ]; then
  cat <<EOF
Aufruf: bash scripts/sprache-messen.sh [--help]

Misst die lokale Spracherkennung mit 10 synthetischen Sätzen (Stimme „$STIMME").
Ausgabe: je Satz Dauer und Fehler, am Ende Median und Wortfehlerrate (WER).
Modell:  $MODELL
         (anderer Pfad über SPECWRIGHT_WHISPER_MODEL oder SPECWRIGHT_SPRACHE_DIR)
Zielwerte laut Plan: Median ≤ 3 s, WER ≤ 15 %.
EOF
  exit 0
fi

fehler() { echo "✗ $1" >&2; exit 1; }

[ "$(uname -s)" = "Darwin" ] || fehler "nur macOS unterstützt"
command -v say >/dev/null 2>&1 || fehler "say nicht gefunden"
command -v python3 >/dev/null 2>&1 || fehler "python3 nicht gefunden (xcode-select --install)"

WHISPER=""
if [ -n "${SPECWRIGHT_WHISPER_SERVER:-}" ] && [ -x "${SPECWRIGHT_WHISPER_SERVER}" ]; then
  WHISPER="$SPECWRIGHT_WHISPER_SERVER"
elif command -v whisper-server >/dev/null 2>&1; then
  WHISPER="$(command -v whisper-server)"
else
  for d in /opt/homebrew/bin /usr/local/bin; do
    if [ -x "$d/whisper-server" ]; then WHISPER="$d/whisper-server"; break; fi
  done
fi
[ -n "$WHISPER" ] || fehler "whisper-server nicht gefunden — brew install whisper-cpp"
[ -f "$MODELL" ] || fehler "$MODELL  Modell fehlt — npm run sprache:einrichten"

ARBEIT="$(mktemp -d "${TMPDIR:-/tmp}/sprache-messen.XXXXXX")"
chmod 700 "$ARBEIT"
SERVER_PID=""
aufraeumen() {
  if [ -n "$SERVER_PID" ] && kill -0 "$SERVER_PID" 2>/dev/null; then
    kill "$SERVER_PID" 2>/dev/null || true
    wait "$SERVER_PID" 2>/dev/null || true
  fi
  rm -rf "$ARBEIT"
}
trap aufraeumen EXIT
trap 'exit 130' INT TERM

cat > "$ARBEIT/saetze.txt" <<'EOF'
Mach weiter mit dem Plan und schreib danach die Spec fertig.
Bitte erstelle einen Pull Request gegen main.
Nimm das kleinere Modell und prüfe den Merge noch einmal.
Zwei.
Freigeben.
Ja.
Die Tests sind rot, schau dir zuerst den Build an.
Leg eine neue Absicht für die Glocke an.
Warte mit dem Merge, bis die CI grün ist.
Verwerfen, ich sage es nochmal anders.
EOF

echo "sprache-messen: $MODELL"
n=0
while IFS= read -r satz; do
  n=$((n + 1))
  say -v "$STIMME" -o "$ARBEIT/$n.wav" --data-format=LEI16@16000 "$satz"
done < "$ARBEIT/saetze.txt"
echo "+ $n Sätze erzeugt (Stimme $STIMME, 16 kHz mono)"

PORT="$(python3 -c 'import socket; s=socket.socket(); s.bind(("127.0.0.1",0)); print(s.getsockname()[1]); s.close()')"

(cd "$ARBEIT" && exec "$WHISPER" -m "$MODELL" --host 127.0.0.1 --port "$PORT" -l de -nt --prompt "$VOKABELN") >/dev/null 2>&1 &
SERVER_PID=$!

warte=0
until curl -s -o /dev/null "http://127.0.0.1:$PORT/"; do
  kill -0 "$SERVER_PID" 2>/dev/null || fehler "whisper-server beendet sich beim Start"
  warte=$((warte + 1))
  [ "$warte" -le 150 ] || fehler "whisper-server nach 30 s nicht bereit"
  sleep 0.2
done
echo "+ whisper-server bereit auf 127.0.0.1:$PORT"

: > "$ARBEIT/ergebnis.tsv"
i=0
while [ "$i" -lt "$n" ]; do
  i=$((i + 1))
  dauer="$(curl -s -o "$ARBEIT/$i.json" -w '%{time_total}' \
    -F "file=@$ARBEIT/$i.wav" -F response_format=json -F temperature=0 \
    "http://127.0.0.1:$PORT/inference")" || fehler "Satz $i: Anfrage fehlgeschlagen"
  printf '%s\t%s\n' "$i" "$dauer" >> "$ARBEIT/ergebnis.tsv"
done

python3 - "$ARBEIT" <<'PY'
import json, re, statistics, sys, os
ordner = sys.argv[1]
ref = open(os.path.join(ordner, "saetze.txt"), encoding="utf-8").read().strip().split("\n")

def norm(s):
    return re.sub(r"[^\w ]", " ", s.lower()).split()

def fehler(r, h):
    r, h = norm(r), norm(h)
    d = list(range(len(h) + 1))
    for i in range(1, len(r) + 1):
        vorher, d[0] = d[0], i
        for j in range(1, len(h) + 1):
            alt = d[j]
            d[j] = min(d[j] + 1, d[j - 1] + 1, vorher + (r[i - 1] != h[j - 1]))
            vorher = alt
    return d[len(h)], len(r)

zeiten, fe, wo = [], 0, 0
for zeile in open(os.path.join(ordner, "ergebnis.tsv"), encoding="utf-8"):
    nr, dauer = zeile.strip().split("\t")
    nr = int(nr); dauer = float(dauer)
    roh = open(os.path.join(ordner, f"{nr}.json"), encoding="utf-8").read()
    try:
        text = json.loads(roh, strict=False).get("text", "").strip()
    except ValueError:
        text = ""
    e, w = fehler(ref[nr - 1], text)
    fe += e; wo += w; zeiten.append(dauer)
    zeichen = "+" if e == 0 else "~"
    print(f"{zeichen} Satz {nr:2d}  {dauer:5.2f} s  Fehler {e}/{w}  | {text}")

median = statistics.median(zeiten)
wer = 100.0 * fe / wo if wo else 0.0
print(f"sprache-messen: {len(zeiten)} Sätze, Median {median:.2f} s, WER {wer:.1f} % ({fe} von {wo} Wörtern)")
PY
