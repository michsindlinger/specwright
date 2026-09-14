#!/usr/bin/env bash
# Guard: specwright/manifest.tsv ist die einzige Liste des Lieferumfangs (INT-2026-002).
#
#   (a) jede Quelle im Manifest existiert im Repo
#   (b) jede Datei in einem Lieferverzeichnis steht im Manifest (auch als repo-only)
#   (c) kein Installer führt noch eine eigene Dateiliste (download_file "$REPO_URL/… außer erlaubter Ausnahmen)
#   (d) removed.tsv und manifest.tsv überschneiden sich nicht; removed-Zeilen haben Prüfsummen — und zwar alle
#       Fassungen aus der Git-Historie (scripts/removed-hashes.sh --check, INT-2026-003; in flachen Klonen übersprungen)
#   (e) VERSION == install.sh FRAMEWORK_VERSION
#   (f) kein in 4.0.0 entfernter Befehlsname in ausgelieferten Dateien, README.md, CLAUDE.md, check-update.sh
#
# Läuft in scripts/verify.sh und in CI. Exit 0 = grün, 1 = Abweichung (mit Dateiname und Ort).
set -uo pipefail
cd "$(dirname "$0")/.."

MANIFEST=specwright/manifest.tsv
REMOVED=specwright/removed.tsv
SHIPPED_DIRS=".claude/commands/specwright .claude/agents .claude/skills specwright/workflows specwright/standards specwright/templates specwright/mcp-profiles specwright/scripts specwright/docs"
INSTALLERS="install.sh setup.sh setup-claude-code.sh setup-devteam-global.sh update-specwright.sh"
fail=0
err() { echo "❌ $*" >&2; fail=1; }

[[ -f $MANIFEST ]] || { err "$MANIFEST fehlt"; exit 1; }
[[ -f $REMOVED ]]  || { err "$REMOVED fehlt"; exit 1; }

# Manifest ohne Kommentare
mf() { grep -v '^#' "$MANIFEST" | grep -v '^$'; }

# (a) Quellen existieren, Zeilen haben vier Spalten
while IFS=$'\t' read -r art gelt src dst; do
    [[ -n "$art" && -n "$gelt" && -n "$src" && -n "$dst" ]] || err "Manifest-Zeile unvollständig: $art $gelt $src $dst"
    case "$art" in command|workflow|agent|skill|standard|template|doc|script|mcp-profile|mcp-script|repo-only) ;; *) err "Unbekannte Art '$art' für $src" ;; esac
    case "$gelt" in project|global|both) ;; *) err "Unbekannte Geltung '$gelt' für $src" ;; esac
    [[ -f "$src" ]] || err "Manifest nennt fehlende Datei: $src"
done < <(mf)

# (b) alle Dateien der Lieferverzeichnisse stehen im Manifest
mf | cut -f3 | sort -u > /tmp/manifest-src.$$
for d in $SHIPPED_DIRS; do
    [[ -d $d ]] || continue
    find "$d" -type f -not -name .DS_Store -not -path '*/node_modules/*' | sort
done | sort -u > /tmp/shipped-files.$$
missing=$(comm -23 /tmp/shipped-files.$$ /tmp/manifest-src.$$)
[[ -z "$missing" ]] || { err "Dateien in Lieferverzeichnissen ohne Manifest-Zeile (Zeile ergänzen oder repo-only):"; echo "$missing" | sed 's/^/     /' >&2; }
rm -f /tmp/manifest-src.$$ /tmp/shipped-files.$$

# (c) Installer ohne eigene Listen: erlaubt sind nur install-lib.sh, VERSION, CLAUDE-template als Literal
for f in $INSTALLERS; do
    [[ -f $f ]] || { err "Installer fehlt: $f"; continue; }
    grep -q 'install-lib.sh' "$f" || err "$f lädt specwright/scripts/install-lib.sh nicht"
    bad=$(grep -nE '(download_file|update_file|curl [^|]*-o) [^\n]*"\$REPO_URL/' "$f" | grep -vE 'install-lib\.sh|/VERSION|CLAUDE-template\.md|/CLAUDE\.md' || true)
    [[ -z "$bad" ]] || { err "$f enthält noch eigene Dateiliterale statt Manifest:"; echo "$bad" | cut -c1-120 | sed 's/^/     /' >&2; }
    n=$(grep -cE '^\s*(local )?[a-z_]+_files=\(' "$f" || true)
    [[ "$n" -eq 0 ]] || err "$f enthält noch $n *_files-Array(s)"
done

# (d) removed.tsv: kein Ziel, das im Manifest ausgeliefert wird; jede Zeile mit Prüfsumme
while IFS=$'\t' read -r ver gelt dst hashes; do
    [[ -n "$dst" && "$ver" != \#* ]] || continue
    [[ -n "$hashes" ]] || err "$REMOVED: $dst ohne Prüfsumme"
    grep -qE $'\t'"$dst"$'\t'"$dst"'$' "$MANIFEST" && err "$dst steht in removed.tsv UND im Manifest"
done < "$REMOVED"
# Prüfsummen vollständig gegen die Git-Historie (INT-2026-003)
rh=$(bash scripts/removed-hashes.sh --check 2>&1 >/dev/null) || err "$rh"

# (e) Version synchron
v=$(tr -d '[:space:]' < VERSION)
grep -qF "FRAMEWORK_VERSION=\"$v\"" install.sh || err "VERSION ($v) != install.sh FRAMEWORK_VERSION"

# (f) entfernte Befehlsnamen tauchen in ausgelieferten Dateien nicht mehr auf
RM_NAMES='plan-platform|add-story|flag-user-actions|assign-spec|create-project-agents|assign-skills-to-agent|add-team-member|validate-estimation|analyze-feasibility|analyze-blockers|transfer-and-create-spec|transfer-and-create-bug|transfer-and-plan-product|brainstorm-growth-ideas|validate-market-for-existing|validate-market|create-instagram-account|create-content-plan|retroactive-doc|save-memory|recall-memory|manage-memory'
hits=$( { mf | awk -F'\t' '$1!="repo-only"{print $3}'; echo README.md; echo CLAUDE.md; echo check-update.sh; } | sort -u \
      | xargs grep -lE "(^|[^a-z-])($RM_NAMES)([^a-z-]|$)" 2>/dev/null | grep -vE '^specwright/(mcp-profiles|scripts/mcp)/' || true)
[[ -z "$hits" ]] || { err "Entfernte Befehlsnamen werden noch genannt in:"; echo "$hits" | sed 's/^/     /' >&2; }

if [[ $fail -eq 0 ]]; then
    echo "✅ Manifest: $(mf | wc -l | tr -d ' ') Zeilen ($(mf | awk -F'\t' '$1=="command"' | wc -l | tr -d ' ') Befehle), Installer listenfrei, VERSION $v synchron."
fi
exit $fail
