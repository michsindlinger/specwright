#!/usr/bin/env bash
# Guard: Formatversion der Vorhaben-Vorlagen (INT-2026-031).
#
# Jede der drei Vorlagen trägt im Kopf genau eine Formatangabe, alle drei dieselbe Nummer:
#   intent-template.md   zwischen erstem und zweitem `---` die Zeile  format: "X.Y"
#   spec-/plan-template  vor der ersten `## `-Überschrift die Zeile    > **Format:** X.Y
# Regel (wann Haupt-/Nebennummer steigt): specwright/templates/sdlc/README.md, Abschnitt „Formatversion".
# Der Guard prüft Vorhandensein, Form und Gleichheit, nicht die Einstufung einer Änderung.
#
#   bash scripts/check-vorlagen-format.sh    Vorlagen unter ${FORMAT_TEMPLATE_DIR:-specwright/templates/sdlc/vorhaben}
#
# Bash 3.2, Kern in awk (POSIX). Exit 0 = grün, 1 = Abweichung (mit Datei:Zeile).
set -uo pipefail
cd "$(dirname "$0")/.."

fail=0
err() { echo "❌ $*" >&2; fail=1; }

# Gibt Zeilen „ok<TAB>zeile<TAB>wert" bzw. „bad<TAB>zeile<TAB>inhalt" für jede Formatzeile im Kopf aus.
# $2 = intent | doc
format_lines() {
  awk -v art="$2" '
    art == "intent" {
      if ($0 == "---") { n++; if (n == 2) exit; next }
      if (n != 1) next
      if ($0 ~ /^format:/) {
        line = $0; sub(/[ \t]+$/, "", line)
        if (line ~ /^format: "[0-9]+\.[0-9]+"$/) { v = line; sub(/^format: "/, "", v); sub(/"$/, "", v); print "ok\t" NR "\t" v }
        else print "bad\t" NR "\t" line
      }
      next
    }
    art == "doc" {
      if ($0 ~ /^## /) exit
      if ($0 ~ /^>[ \t]*\*\*Format:\*\*/) {
        line = $0; sub(/[ \t]+$/, "", line)
        if (line ~ /^> \*\*Format:\*\* [0-9]+\.[0-9]+$/) { v = line; sub(/^> \*\*Format:\*\* /, "", v); print "ok\t" NR "\t" v }
        else print "bad\t" NR "\t" line
      }
    }
  ' "$1"
}

# Prüft eine Vorlage, gibt den Wert auf stdout aus (leer bei Fehler).
check_template() {
  local file=$1 art=$2 name lines count status nr value
  name=$(basename "$file")
  if [[ ! -f $file ]]; then err "$name: Vorlage fehlt ($file)"; return; fi
  lines=$(format_lines "$file" "$art")
  if [[ -z $lines ]]; then err "$name: keine Formatangabe im Kopf"; return; fi
  count=$(printf '%s\n' "$lines" | wc -l | tr -d ' ')
  if [[ $count -gt 1 ]]; then
    err "$name:$(printf '%s\n' "$lines" | cut -f2 | paste -sd, -): Formatangabe mehrfach im Kopf"; return
  fi
  IFS=$'\t' read -r status nr value <<<"$lines"
  if [[ $status != ok ]]; then
    if [[ $art == intent ]]; then err "$name:$nr: Form muss format: \"X.Y\" sein, ist: $value"
    else err "$name:$nr: Form muss > **Format:** X.Y sein, ist: $value"; fi
    return
  fi
  echo "$value"
}

dir=${FORMAT_TEMPLATE_DIR:-specwright/templates/sdlc/vorhaben}
v_intent=$(check_template "$dir/intent-template.md" intent) || true
v_spec=$(check_template "$dir/spec-template.md" doc) || true
v_plan=$(check_template "$dir/plan-template.md" doc) || true
# err in der Subshell setzt fail nicht im Hauptprozess: leerer Wert heißt Fehler (Meldung steht schon auf stderr).
[[ -z $v_intent || -z $v_spec || -z $v_plan ]] && fail=1

if [[ $fail -eq 0 && ( $v_intent != "$v_spec" || $v_intent != "$v_plan" ) ]]; then
  err "Formatangaben ungleich: intent-template.md $v_intent, spec-template.md $v_spec, plan-template.md $v_plan (eine gemeinsame Nummer)"
fi
[[ $fail -eq 0 ]] && echo "✅ Vorlagen-Format: 3 Vorlagen auf $v_intent."
exit $fail
