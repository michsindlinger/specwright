#!/usr/bin/env bash
# removed-hashes — Prüfsummen aller Fassungen entfernter Dateien aus der Git-Historie (INT-2026-003).
#
#   bash scripts/removed-hashes.sh            # ergänzt specwright/removed.tsv (Spalte 4) um fehlende Prüfsummen
#   bash scripts/removed-hashes.sh --check    # schreibt nichts; Exit 1, wenn Prüfsummen aus der Historie fehlen
#
# Je Eintrag: Vereinigung aus den gelisteten Prüfsummen (Reihenfolge bleibt) und den Prüfsummen jeder
# Fassung von <ziel> in der Historie von HEAD (git log -- <ziel>; Commits ohne die Datei — die Löschung
# selbst — werden übersprungen). Neue Prüfsummen hängen in Log-Reihenfolge (neueste zuerst) an.
# Kommentar- und Leerzeilen gehen unverändert durch. Läuft in scripts/check-manifest.sh (d) und damit in
# verify/CI (fetch-depth 0). Bash 3.2 (macOS): kein mapfile, keine assoziativen Arrays.
set -uo pipefail
cd "$(dirname "$0")/.."
FILE=specwright/removed.tsv
MODE=write; [[ "${1:-}" == "--check" ]] && MODE=check

sha256_stdin() {
    if command -v sha256sum >/dev/null 2>&1; then sha256sum | cut -d' ' -f1
    elif command -v shasum >/dev/null 2>&1; then shasum -a 256 | cut -d' ' -f1
    else openssl dgst -sha256 | sed 's/.*= //'; fi
}

[[ -f $FILE ]] || { echo "removed-hashes: $FILE fehlt" >&2; exit 1; }
if ! git rev-parse --git-dir >/dev/null 2>&1; then
    [[ $MODE == check ]] && { echo "removed-hashes: kein Git-Repo — Prüfung übersprungen"; exit 0; }
    echo "removed-hashes: kein Git-Repo, Historie nicht lesbar" >&2; exit 1
fi
if [[ "$(git rev-parse --is-shallow-repository 2>/dev/null)" == true ]]; then
    [[ $MODE == check ]] && { echo "removed-hashes: flacher Klon — Prüfung übersprungen (git fetch --unshallow)"; exit 0; }
    echo "removed-hashes: flacher Klon, Historie unvollständig (git fetch --unshallow)" >&2; exit 1
fi

tmp=$(mktemp); trap 'rm -f "$tmp"' EXIT
added=0; stale=""
while IFS= read -r line || [[ -n "$line" ]]; do
    case "$line" in ''|\#*) printf '%s\n' "$line" >> "$tmp"; continue ;; esac
    IFS=$'\t' read -r ver gelt dst hashes <<< "$line"
    have=",$hashes,"; new=""; seen=0
    for c in $(git log --format=%H -- "$dst" </dev/null); do
        h=$(git show "$c:$dst" 2>/dev/null </dev/null | sha256_stdin) || continue
        seen=$((seen + 1))
        case "$have$new" in *",$h,"*) ;; *) new="$new$h,";; esac
    done
    [[ $seen -gt 0 ]] || echo "removed-hashes: keine Fassung von $dst in der Historie — Prüfsummen bleiben wie gelistet" >&2
    if [[ -n "$new" ]]; then
        n=$(printf '%s' "$new" | tr -cd ',' | wc -c | tr -d ' ')
        added=$((added + n)); stale="$stale  $dst (+$n)"$'\n'
        if [[ -n "$hashes" ]]; then hashes="$hashes,${new%,}"; else hashes=${new%,}; fi
    fi
    printf '%s\t%s\t%s\t%s\n' "$ver" "$gelt" "$dst" "$hashes" >> "$tmp"
done < "$FILE"

if [[ $MODE == check ]]; then
    [[ $added -eq 0 ]] && { echo "removed.tsv: Prüfsummen vollständig gegen die Historie"; exit 0; }
    { echo "removed.tsv veraltet — $added Prüfsumme(n) aus der Historie fehlen. Ausführen: bash scripts/removed-hashes.sh"; printf '%s' "$stale"; } >&2
    exit 1
fi
[[ $added -eq 0 ]] && { echo "removed.tsv unverändert (Prüfsummen vollständig)"; exit 0; }
cat "$tmp" > "$FILE"
echo "removed.tsv: $added Prüfsumme(n) ergänzt"; printf '%s' "$stale"
