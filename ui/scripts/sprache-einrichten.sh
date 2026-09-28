#!/usr/bin/env bash
# sprache-einrichten.sh — lokale Spracherkennung für den Anrufmodus einrichten (INT-2026-025, D12).
#
# Prüft whisper-server (Homebrew-Paket whisper-cpp) und legt das Sprachmodell
# ggml-large-v3-turbo-q5_0.bin mit geprüfter SHA-256-Prüfsumme ab.
# Installiert nichts selbst außer dem Modell. Bash 3.2-tauglich.
set -euo pipefail

MODELL_NAME="ggml-large-v3-turbo-q5_0.bin"
MODELL_URL="https://huggingface.co/ggerganov/whisper.cpp/resolve/main/${MODELL_NAME}"
MODELL_QUELLE="huggingface.co/ggerganov/whisper.cpp"
MODELL_GROESSE=574041195
MODELL_SHA256="394221709cd5ad1f40c46e6031ca61bce88931e6e088c188294c6d5a55ffa7e2"
LIZENZ="MIT (whisper.cpp und Modell)"
VERSUCHE=5

ZIEL_DIR="${SPECWRIGHT_SPRACHE_DIR:-$HOME/.specwright/sprache}"
ZIEL="${ZIEL_DIR}/${MODELL_NAME}"
TEIL="${ZIEL}.part"

hilfe() {
  cat <<EOF
Aufruf: bash scripts/sprache-einrichten.sh [--von <pfad>] [--help]

Richtet die lokale Spracherkennung für den Anrufmodus ein (nur macOS).

  --von <pfad>   vorhandene Modelldatei prüfen und kopieren statt herunterladen
  --help         diese Hilfe

Voraussetzung: whisper-server (brew install whisper-cpp).
Ziel:          ${ZIEL_DIR}/${MODELL_NAME}
               (anderer Ordner über SPECWRIGHT_SPRACHE_DIR)
Modell:        ${MODELL_NAME}, ${MODELL_GROESSE} Bytes, Lizenz ${LIZENZ}
Quelle:        ${MODELL_URL}
EOF
}

VON=""
while [ $# -gt 0 ]; do
  case "$1" in
    --help|-h) hilfe; exit 0 ;;
    --von)
      if [ $# -lt 2 ] || [ -z "$2" ]; then
        echo "✗ --von braucht einen Pfad" >&2; exit 2
      fi
      VON="$2"; shift 2 ;;
    *) echo "✗ unbekanntes Argument: $1 (siehe --help)" >&2; exit 2 ;;
  esac
done

fehler() {
  echo "✗ $1" >&2
  echo "sprache: 0 neu, 0 behalten, 1 fehlgeschlagen"
  exit 1
}

if [ "$(uname -s)" != "Darwin" ]; then
  fehler "nur macOS unterstützt (gefunden: $(uname -s)) — Anrufmodus bleibt nicht verfügbar"
fi

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
if [ -z "$WHISPER" ]; then
  fehler "whisper-server nicht gefunden — installieren mit: brew install whisper-cpp, dann erneut ausführen"
fi

groesse() { stat -f %z "$1" 2>/dev/null || echo 0; }
pruefsumme() { shasum -a 256 "$1" | awk '{print $1}'; }
passt() {
  [ -f "$1" ] || return 1
  [ "$(groesse "$1")" = "$MODELL_GROESSE" ] || return 1
  [ "$(pruefsumme "$1")" = "$MODELL_SHA256" ]
}

echo "sprache: Einrichtung Spracherkennung"
echo "  whisper-server  $WHISPER"
echo "  Modell          $MODELL_NAME"
echo "  Größe           $MODELL_GROESSE Bytes"
echo "  Lizenz          $LIZENZ"
echo "  Ziel            $ZIEL_DIR"

mkdir -p "$ZIEL_DIR"
chmod 700 "$ZIEL_DIR"

AKTION="+"
if [ -f "$ZIEL" ]; then
  if passt "$ZIEL"; then
    echo "  Quelle          vorhanden"
    echo "! $ZIEL  Prüfsumme passt — ok"
    echo "sprache: 0 neu, 1 behalten, 0 fehlgeschlagen"
    exit 0
  fi
  AKTION="~"
  echo "  Hinweis         vorhandene Datei hat falsche Größe oder Prüfsumme — wird ersetzt"
fi

if [ -n "$VON" ]; then
  echo "  Quelle          $VON"
  if [ ! -f "$VON" ]; then
    fehler "$VON  Datei nicht gefunden"
  fi
  if ! passt "$VON"; then
    fehler "$VON  Größe oder Prüfsumme passt nicht (erwartet $MODELL_GROESSE Bytes, SHA-256 $MODELL_SHA256)"
  fi
  rm -f "$TEIL"
  cp "$VON" "$TEIL"
else
  echo "  Quelle          $MODELL_URL"
  if [ -f "$TEIL" ] && [ "$(groesse "$TEIL")" -gt "$MODELL_GROESSE" ]; then
    rm -f "$TEIL"
  fi
  versuch=1
  while :; do
    if [ -f "$TEIL" ] && [ "$(groesse "$TEIL")" = "$MODELL_GROESSE" ]; then
      break
    fi
    echo "  Download        Versuch $versuch von $VERSUCHE (setzt bei $(groesse "$TEIL") Bytes fort)"
    if curl -fL -C - --speed-limit 10000 --speed-time 120 -o "$TEIL" "$MODELL_URL"; then
      break
    fi
    if [ "$versuch" -ge "$VERSUCHE" ]; then
      fehler "$TEIL  Download nach $VERSUCHE Versuchen abgebrochen ($(groesse "$TEIL") von $MODELL_GROESSE Bytes) — Teildatei bleibt, erneut ausführen setzt fort"
    fi
    versuch=$((versuch + 1))
  done
fi

if ! passt "$TEIL"; then
  rm -f "$TEIL"
  fehler "$ZIEL  Prüfsumme passt nicht nach dem Übertragen — Teildatei gelöscht, erneut ausführen"
fi

mv -f "$TEIL" "$ZIEL"
chmod 600 "$ZIEL"
echo "$AKTION $ZIEL  Prüfsumme passt — ok"
if [ "$AKTION" = "~" ]; then
  echo "sprache: 0 neu, 1 ersetzt, 0 fehlgeschlagen"
else
  echo "sprache: 1 neu, 0 behalten, 0 fehlgeschlagen"
fi
