#!/usr/bin/env bash
# Installer-Test (INT-2026-002): lässt jeden Installer gegen den lokalen Repo-Stand (file://) in leere
# Verzeichnisse laufen und vergleicht das Ergebnis mit specwright/manifest.tsv. Kein Netz, kein GitHub.
#
#   T1  install.sh --project --claude-code --no-mcp --yes  → Befehle/Workflows/Agenten/Skills = Manifest (23 Befehle)
#   T2  setup.sh + setup-claude-code.sh                    → dasselbe Ergebnis
#   T3  setup-devteam-global.sh mit HOME=tmp               → ~/.specwright/{standards,templates} = Manifest (global)
#   T4  update-specwright.sh auf einem 3.x-Fixture         → entfernte Dateien gelöscht und genannt, geänderte behalten
#                                                            und gemeldet, keep.txt still übersprungen, Backups im Ordner,
#                                                            nichts außerhalb der Listen angefasst
#   T5  check-manifest.sh                                  → rot, wenn eine Manifest-Zeile fehlt; danach wieder grün
#   T6  removed-hashes.sh (INT-2026-003)                   → Guard rot, wenn eine Prüfsumme aus der Historie fehlt; Skript idempotent
#   T7  check-leser-marker.sh (INT-2026-009)               → Guard rot bei fehlendem Marker (nennt Datei:Zeile), bei falschem Wert
#                                                            einer Pflicht-Mensch-Überschrift und bei teilweise markiertem Dokument; grün auf Kopie
#
# Braucht: bash, curl (nicht nötig bei file://), git (T4 stellt alte Dateien aus eecb1cd6 und der ältesten Fassung her).
set -uo pipefail
cd "$(dirname "$0")/.."
REPO=$PWD
export SPECWRIGHT_REPO_URL="file://$REPO"
fail=0; err() { echo "❌ $*" >&2; fail=1; }; ok() { echo "✅ $*"; }
mf() { grep -v '^#' specwright/manifest.tsv | grep -v '^$'; }
expected() { # art geltung → erwartete Zielpfade (projektrelativ)
    mf | awk -F'\t' -v a="$1" -v g="$2" '$1==a && ($2==g || $2=="both") {print $4}' | sort -u
}
tmp_root=$(mktemp -d); trap 'rm -rf "$tmp_root"' EXIT

compare_dir() { # verzeichnis art geltung wurzel
    local d=$1 art=$2 gelt=$3 root=$4 exp got
    exp=$(expected "$art" "$gelt")
    got=$( (cd "$root" && [[ -d "$d" ]] && find "$d" -type f | sort) || true )
    if [[ "$exp" != "$got" ]]; then
        err "$art/$gelt in $root/$d weicht vom Manifest ab:"; diff <(echo "$exp") <(echo "$got") | head -20 | sed 's/^/     /' >&2
    fi
}

# --- T1 --------------------------------------------------------------------------------------
t1="$tmp_root/t1"; mkdir -p "$t1" "$tmp_root/home1"
( cd "$t1" && HOME="$tmp_root/home1" bash "$REPO/install.sh" --project --claude-code --no-mcp --yes >"$tmp_root/t1.log" 2>&1 ) || err "T1 install.sh Exit $? (siehe $tmp_root/t1.log)"
compare_dir .claude/commands/specwright command project "$t1"
compare_dir specwright/workflows workflow project "$t1"
n=$(find "$t1/.claude/commands/specwright" -type f 2>/dev/null | wc -l | tr -d ' ')
[[ "$n" -eq 23 ]] && ok "T1 install.sh: 23 Befehle" || err "T1: $n Befehle statt 23"
exp_ag=$(expected agent project); got_ag=$( (cd "$t1" && find .claude/agents -type f | sort) || true )
[[ "$exp_ag" == "$got_ag" ]] && ok "T1: Agenten = Manifest" || err "T1: Agenten weichen ab"
[[ -f "$t1/.claude/skills/atomicity-validator/SKILL.md" && -f "$t1/.claude/skills/review-implementation-plan/SKILL.md" ]] && ok "T1: Skills" || err "T1: Skills fehlen"
grep -qE 'validate-market|add-story' <(find "$t1" -type f | grep -v mcp-profiles) && err "T1: entfernte Dateien installiert" || true

# --- T2 --------------------------------------------------------------------------------------
t2="$tmp_root/t2"; mkdir -p "$t2"
( cd "$t2" && bash "$REPO/setup.sh" >"$tmp_root/t2a.log" 2>&1 ) || err "T2 setup.sh Exit $?"
( cd "$t2" && bash "$REPO/setup-claude-code.sh" >"$tmp_root/t2b.log" 2>&1 ) || err "T2 setup-claude-code.sh Exit $?"
compare_dir .claude/commands/specwright command project "$t2"
compare_dir specwright/workflows workflow project "$t2"
[[ -f "$t2/specwright/config.yml" && -f "$t2/CLAUDE.md" ]] && ok "T2 setup.sh + setup-claude-code.sh" || err "T2: config.yml/CLAUDE.md fehlen"

# --- T3 --------------------------------------------------------------------------------------
h3="$tmp_root/home3"; mkdir -p "$h3"
( HOME="$h3" bash "$REPO/setup-devteam-global.sh" >"$tmp_root/t3.log" 2>&1 ) || err "T3 setup-devteam-global.sh Exit $?"
exp_t=$(expected template global | sed 's|^specwright/||'); got_t=$( (cd "$h3/.specwright" && find templates -type f | sort) || true )
[[ "$exp_t" == "$got_t" ]] && ok "T3 global: Templates = Manifest ($(echo "$got_t" | wc -l | tr -d ' '))" || { err "T3: globale Templates weichen ab"; diff <(echo "$exp_t") <(echo "$got_t") | head -10 >&2; }

# --- T4 --------------------------------------------------------------------------------------
t4="$tmp_root/t4"; mkdir -p "$t4"
( cd "$t4" && bash "$REPO/setup.sh" >/dev/null 2>&1 && bash "$REPO/setup-claude-code.sh" >/dev/null 2>&1 ) || err "T4 Fixture-Basis"
# Alt-Dateien (Stand 3.33.0) aus Git herstellen — nur project/both-Ziele
fixture_count=0
while IFS=$'\t' read -r ver gelt dst hashes; do
    [[ -n "$dst" && "$ver" != \#* ]] || continue
    [[ "$gelt" == project || "$gelt" == both ]] || continue
    mkdir -p "$t4/$(dirname "$dst")"
    git show "eecb1cd6:$dst" > "$t4/$dst" 2>/dev/null && fixture_count=$((fixture_count + 1))
done < specwright/removed.tsv
# INT-2026-003: eine Datei in ihrer ältesten Fassung — Projekte, die Versionen übersprungen haben, müssen genauso aufräumen
oldest=$(git log --format=%H -- specwright/workflows/core/add-story.md | tail -1)
git show "$oldest:specwright/workflows/core/add-story.md" > "$t4/specwright/workflows/core/add-story.md" || err "T4: älteste Fassung nicht herstellbar"
echo "eigene Änderung" >> "$t4/.claude/commands/specwright/add-story.md"          # lokal geändert → bleibt
printf '%s\n' ".claude/commands/specwright/plan-platform.md" > "$t4/specwright/keep.txt"  # bewusst behalten → still
echo "# eigene Notiz" > "$t4/intent-notiz.md"; mkdir -p "$t4/intent/INT-x"; echo x > "$t4/intent/INT-x/intent.md"  # außerhalb der Listen
( cd "$t4" && find . -type f | sort > "$tmp_root/t4-before.txt" )
( cd "$t4" && bash "$REPO/update-specwright.sh" >"$tmp_root/t4.log" 2>&1 ) || err "T4 update-specwright.sh Exit $?"
( cd "$t4" && find . -type f -not -path './specwright/backups/*' | sort > "$tmp_root/t4-after.txt" )
[[ -f "$t4/.claude/commands/specwright/add-story.md" ]] && ok "T4: lokal geänderte Datei bleibt" || err "T4: lokal geänderte Datei wurde gelöscht"
grep -q 'add-story.md (nicht gelöscht: lokal geändert' "$tmp_root/t4.log" && ok "T4: geänderte Datei gemeldet" || err "T4: Meldung für geänderte Datei fehlt"
[[ -f "$t4/.claude/commands/specwright/plan-platform.md" ]] && ok "T4: keep.txt respektiert" || err "T4: keep.txt-Datei gelöscht"
grep -q 'commands/specwright/plan-platform.md' "$tmp_root/t4.log" && err "T4: keep.txt-Datei wurde gemeldet (soll still sein)" || ok "T4: keep.txt still"
[[ -f "$t4/.claude/commands/specwright/validate-market.md" ]] && err "T4: validate-market.md nicht gelöscht" || ok "T4: entfernte Dateien gelöscht"
[[ -f "$t4/specwright/workflows/core/add-story.md" ]] && err "T4: älteste Fassung von workflows/core/add-story.md nicht gelöscht (INT-2026-003)" || ok "T4: älteste Fassung erkannt und gelöscht"
grep -q 'workflows/core/add-story.md (gelöscht' "$tmp_root/t4.log" && ok "T4: älteste Fassung im Log genannt" || err "T4: Löschung der ältesten Fassung nicht genannt"
deleted=$(grep -c '(gelöscht, entfernt seit' "$tmp_root/t4.log" || true)
[[ "$deleted" -eq $((fixture_count - 2)) ]] && ok "T4: $deleted Löschungen einzeln genannt (Fixture $fixture_count, 2 behalten)" || err "T4: $deleted Löschungen genannt, erwartet $((fixture_count - 2))"
[[ -f "$t4/intent-notiz.md" && -f "$t4/intent/INT-x/intent.md" && -f "$t4/specwright/config.yml" ]] && ok "T4: Dateien außerhalb der Listen unberührt" || err "T4: fremde Dateien angefasst"
find "$t4" -name '*.backup-*' | grep -q . && err "T4: Backup neben Datei gefunden" || ok "T4: keine Backups neben Dateien"
grep -q 'Ergebnis:' "$tmp_root/t4.log" && ok "T4: Zusammenfassung vorhanden" || err "T4: Zusammenfassung fehlt"

# --- T5 --------------------------------------------------------------------------------------
cp specwright/manifest.tsv "$tmp_root/manifest.bak"
grep -v $'\t.claude/commands/specwright/intent.md\t' specwright/manifest.tsv > "$tmp_root/manifest.cut" && cp "$tmp_root/manifest.cut" specwright/manifest.tsv
if bash scripts/check-manifest.sh >/dev/null 2>&1; then err "T5: Guard bleibt grün ohne intent.md im Manifest"; else ok "T5: Guard rot bei fehlender Manifest-Zeile"; fi
cp "$tmp_root/manifest.bak" specwright/manifest.tsv
bash scripts/check-manifest.sh >/dev/null 2>&1 && ok "T5: Guard grün nach Wiederherstellung" || err "T5: Guard rot auf echtem Manifest"

# --- T6 (INT-2026-003) -----------------------------------------------------------------------
cp specwright/removed.tsv "$tmp_root/removed.bak"
# erste Zeile mit mehreren Prüfsummen auf die erste kürzen → Guard muss rot werden und das Skript nennen
awk -F'\t' 'BEGIN{OFS="\t"} !done && $0 !~ /^#/ && $4 ~ /,/ {sub(/,.*/, "", $4); done=1} {print}' "$tmp_root/removed.bak" > specwright/removed.tsv
cmp -s "$tmp_root/removed.bak" specwright/removed.tsv && err "T6: keine Zeile mit mehreren Prüfsummen in removed.tsv"
t6=$(bash scripts/check-manifest.sh 2>&1); t6rc=$?
[[ $t6rc -ne 0 ]] && echo "$t6" | grep -q 'removed-hashes.sh' && ok "T6: Guard rot bei fehlender Prüfsumme, nennt removed-hashes.sh" || err "T6: Guard bleibt grün oder nennt removed-hashes.sh nicht (Exit $t6rc)"
cp "$tmp_root/removed.bak" specwright/removed.tsv
bash scripts/removed-hashes.sh >/dev/null 2>&1 && bash scripts/removed-hashes.sh >/dev/null 2>&1 || err "T6: removed-hashes.sh Exit ≠ 0"
cmp -s "$tmp_root/removed.bak" specwright/removed.tsv && ok "T6: removed-hashes.sh idempotent (kein Diff nach zwei Läufen)" || { err "T6: removed-hashes.sh ändert removed.tsv — Liste im Repo veraltet?"; cp "$tmp_root/removed.bak" specwright/removed.tsv; }

# --- T7 (INT-2026-009) -----------------------------------------------------------------------
t7="$tmp_root/t7"; mkdir -p "$t7"; cp specwright/templates/sdlc/vorhaben/*-template.md "$t7/"
# (a) einen Marker entfernen → rot, nennt Datei:Zeile
awk '!done && /^<!-- leser: mensch -->$/ {done=1; next} {print}' "$t7/intent-template.md" > "$t7/cut.md" && mv "$t7/cut.md" "$t7/intent-template.md"
t7a=$(LESER_TEMPLATE_DIR="$t7" bash scripts/check-leser-marker.sh 2>&1); t7rc=$?
[[ $t7rc -ne 0 ]] && echo "$t7a" | grep -qE 'intent-template\.md:[0-9]+ ' && ok "T7: Guard rot bei fehlendem Marker, nennt Datei:Zeile" || err "T7: Guard bleibt grün oder nennt Datei:Zeile nicht (Exit $t7rc)"
cp specwright/templates/sdlc/vorhaben/intent-template.md "$t7/"
# (b) Pflicht-Mensch-Überschrift auf agent → rot
awk '/^## 7\. Offene Fragen/ {sw=1} sw && /^<!-- leser: mensch -->$/ {print "<!-- leser: agent -->"; sw=0; next} {print}' specwright/templates/sdlc/vorhaben/intent-template.md > "$t7/intent-template.md"
LESER_TEMPLATE_DIR="$t7" bash scripts/check-leser-marker.sh >/dev/null 2>&1 && err "T7: Guard bleibt grün, obwohl §7 Offene Fragen auf agent steht" || ok "T7: Guard rot bei Pflicht-Mensch-Abschnitt als agent"
cp specwright/templates/sdlc/vorhaben/intent-template.md "$t7/"
# (c) teilweise markiertes Dokument → --doc rot
awk '!done && /^<!-- leser: agent -->$/ {done=1; next} {print}' "$t7/intent-template.md" > "$t7/teilweise.md"
bash scripts/check-leser-marker.sh --doc "$t7/teilweise.md" >/dev/null 2>&1 && err "T7: --doc bleibt grün bei teilweise markiertem Dokument" || ok "T7: --doc rot bei teilweise markiertem Dokument"
# (d) unveränderte Kopien → grün (Standard und --doc)
LESER_TEMPLATE_DIR="$t7" bash scripts/check-leser-marker.sh >/dev/null 2>&1 && bash scripts/check-leser-marker.sh --doc "$t7/intent-template.md" "$t7/spec-template.md" >/dev/null 2>&1 && ok "T7: Guard grün auf unveränderten Kopien" || err "T7: Guard rot auf unveränderten Kopien"

[[ $fail -eq 0 ]] && echo "✅ Installer-Test: T1–T7 grün" || echo "❌ Installer-Test: Fehler (Logs unter $tmp_root — wird gelöscht; erneut mit KEEP_TMP=1)"
[[ "${KEEP_TMP:-}" == 1 ]] && trap - EXIT && echo "Logs: $tmp_root"
exit $fail
