#!/usr/bin/env bash
# Guard: Leser-Marker in den Vorhaben-Vorlagen und -Dokumenten (INT-2026-009).
#
# Ein Marker ist genau eine Zeile `<!-- leser: mensch -->` oder `<!-- leser: agent -->` als erste
# nicht-leere Zeile nach einer Überschrift der Ebenen ##, ###, #### (höchstens eine Leerzeile dazwischen).
# Ein Marker an anderer Stelle ist ein Fehler. Regel R1 in specwright/workflows/meta/leser-und-rueckfragen.md.
#
#   bash scripts/check-leser-marker.sh                 Standardmodus: die drei Vorlagen unter
#                                                      ${LESER_TEMPLATE_DIR:-specwright/templates/sdlc/vorhaben}
#                                                      gegen die Soll-Tabellen unten (einzige Wahrheit der Zuordnung)
#   bash scripts/check-leser-marker.sh --doc <datei>…  Dokument-Modus: entweder kein Marker im Dokument
#                                                      (alles gilt als mensch) oder jede ##/###-Überschrift trägt
#                                                      einen; #### darf erben. Teilweise markiert = rot.
#
# Bash 3.2, Kern in awk (POSIX). Exit 0 = grün, 1 = Abweichung (mit Datei:Zeile).
set -uo pipefail
cd "$(dirname "$0")/.."

fail=0
err() { echo "❌ $*" >&2; fail=1; }

# --- Soll-Zuordnung je Vorlage: Überschriften-Präfix<TAB>Wert, in dieser Reihenfolge -----------------
# README und Pläne zitieren diese Tabellen, definieren sie nicht.
SOLL_INTENT='## Felder im Kopf	agent
## Absicht in drei Sätzen	mensch
## 1.	mensch
## 2.	mensch
## 3.	mensch
## 4.	mensch
## 5.	mensch
## 6.	mensch
## 7.	mensch
## 8.	mensch
## 9.	mensch
## 10.	mensch
## 11.	agent
## 12.	mensch
## Änderungsprotokoll	agent'

SOLL_SPEC='## 1.	mensch
## 2.	mensch
### Ablauf A	mensch
## 3.	mensch
## 4.	mensch
## 5.	agent
## 6.	mensch
## 7.	agent
## 8.	mensch
## 9.	mensch
## 10.	agent'

SOLL_PLAN='## In einfachen Worten	mensch
## Details	mensch
### 1.	mensch
### 2.	agent
### 3.	agent
#### Ansatz	agent
#### Verworfene Alternativen	agent
#### Architektur-Auswirkung	agent
### 4.	agent
### 5.	agent
### 6.	agent
### 7.	agent
#### Variante A	agent
#### Variante B	agent
### 8.	agent
### 9.	mensch
### 10.	mensch
### 11.	mensch
### 12.	mensch
### 13.	agent
### 14.	mensch'

# --- Kern: Überschriften und Marker einer Datei ------------------------------------------------------
# Ausgabe je Überschrift: zeile<TAB>ebene<TAB>überschrift<TAB>wert|none<TAB>gefundene Zeile
# Ausgabe je verirrtem Marker: zeile<TAB>STRAY<TAB><TAB><TAB>zeile
# Zeilen in ```-Zäunen werden übersprungen.
scan() {
    awk '
    function flush(where) { if (pend) print pl "\t" lv "\t" ph "\tnone\t" where; pend = 0 }
    BEGIN { pend = 0; fence = 0 }
    /^```/ { fence = !fence; next }
    fence { next }
    /^## / || /^### / || /^#### / {
        flush("(nächste Überschrift)")
        pend = 1; pl = NR; ph = $0
        lv = index($0, " ") - 1
        next
    }
    pend && /^[[:space:]]*$/ { next }
    pend {
        if ($0 ~ /^<!-- leser: (mensch|agent) -->$/) { v = $0; sub(/^<!-- leser: /, "", v); sub(/ -->$/, "", v); print pl "\t" lv "\t" ph "\t" v "\t" $0 }
        else print pl "\t" lv "\t" ph "\tnone\t" $0
        pend = 0; next
    }
    /^<!-- leser: (mensch|agent) -->$/ { print NR "\tSTRAY\t\t\t" $0 }
    END { flush("(Dateiende)") }
    ' "$1"
}

# --- Standardmodus: Vorlage gegen Soll-Tabelle -------------------------------------------------------
check_template() { # datei soll
    local f=$1 soll=$2 n_soll n_ist i=0 line lv h v found sp sv
    [[ -f $f ]] || { err "$f fehlt"; return; }
    n_soll=$(printf '%s\n' "$soll" | wc -l | tr -d ' ')
    local ist; ist=$(scan "$f")
    n_ist=$(printf '%s\n' "$ist" | grep -vc $'\tSTRAY\t' || true)
    while IFS=$'\t' read -r line lv h v found; do
        if [[ $lv == STRAY ]]; then err "$f:$line Marker außerhalb der Position (erste Zeile unter einer Überschrift): $found"; continue; fi
        i=$((i + 1))
        IFS=$'\t' read -r sp sv <<< "$(printf '%s\n' "$soll" | sed -n "${i}p")"
        if [[ -z "$sp" ]]; then err "$f:$line Überschrift nicht in der Soll-Tabelle: $h"; continue; fi
        if [[ "$h" != "$sp"* ]]; then err "$f:$line erwartet Überschrift '$sp…', gefunden: $h"; continue; fi
        if [[ $v == none ]]; then err "$f:$line $h: erwartet <!-- leser: $sv --> als erste Zeile, gefunden: $found"
        elif [[ $v != "$sv" ]]; then err "$f:$line $h: erwartet $sv, gefunden $v"; fi
    done <<< "$ist"
    if [[ $n_ist -lt $n_soll ]]; then
        err "$f: $n_ist Überschriften, Soll-Tabelle hat $n_soll — fehlt ab: $(printf '%s\n' "$soll" | sed -n "$((n_ist + 1))p" | cut -f1)"
    fi
    checked=$((checked + n_ist))
}

# --- Dokument-Modus ----------------------------------------------------------------------------------
check_doc() { # datei
    local f=$1 line lv h v found n_marker=0 n_head=0 ist
    [[ -f $f ]] || { err "$f fehlt"; return; }
    ist=$(scan "$f")
    n_marker=$(printf '%s\n' "$ist" | grep -cE $'\t(mensch|agent)\t|\tSTRAY\t' || true)
    if [[ $n_marker -eq 0 ]]; then n_ohne=$((n_ohne + 1)); return; fi
    local before=$fail
    while IFS=$'\t' read -r line lv h v found; do
        [[ -n "$line" ]] || continue
        if [[ $lv == STRAY ]]; then err "$f:$line Marker außerhalb der Position (erste Zeile unter einer Überschrift): $found"; continue; fi
        if [[ $v == none && $lv -le 3 ]]; then err "$f:$line $h: Dokument ist teilweise markiert — Marker fehlt (erste Zeile unter der Überschrift: $found)"; fi
    done <<< "$ist"
    [[ $fail -eq $before ]] && n_voll=$((n_voll + 1))
}

if [[ "${1:-}" == "--doc" ]]; then
    shift
    [[ $# -gt 0 ]] || { err "--doc braucht mindestens eine Datei"; exit 1; }
    n_ohne=0; n_voll=0
    for f in "$@"; do check_doc "$f"; done
    [[ $fail -eq 0 ]] && echo "✅ Leser-Marker: $# Dokumente, $n_ohne ohne Marker, $n_voll vollständig markiert."
    exit $fail
fi

dir=${LESER_TEMPLATE_DIR:-specwright/templates/sdlc/vorhaben}
checked=0
check_template "$dir/intent-template.md" "$SOLL_INTENT"
check_template "$dir/spec-template.md" "$SOLL_SPEC"
# Schalter bis Commit B (INT-2026-009 §6 Schritt 4): plan-Tabelle greift erst mit der neuen Struktur.
if grep -q '^## Details$' "$dir/plan-template.md" 2>/dev/null; then
    check_template "$dir/plan-template.md" "$SOLL_PLAN"
else
    echo "   plan-template.md: alte Struktur, nicht geprüft"
fi
[[ $fail -eq 0 ]] && echo "✅ Leser-Marker: 3 Vorlagen, $checked Überschriften geprüft."
exit $fail
