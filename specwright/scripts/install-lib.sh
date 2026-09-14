#!/usr/bin/env bash
# Specwright install-lib — eine Lade-, Lösch- und Zählroutine für alle Installer (INT-2026-002).
#
# Wird von install.sh, setup.sh, setup-claude-code.sh, setup-devteam-global.sh und
# update-specwright.sh geladen. Liest specwright/manifest.tsv (Lieferumfang) und
# specwright/removed.tsv (in einer Version entfernte Dateien mit Prüfsummen).
#
# Bash 3.2 (macOS): keine mapfile, keine assoziativen Arrays, kein ${var,,}.
#
# Konfiguration über Umgebungsvariablen (vom Installer gesetzt):
#   SW_REPO_URL        Basis-URL, https://… oder file:///pfad/zum/repo (Tests)
#   SW_GLOBAL_DIR      Ziel für geltung=global unter specwright/ (Standard ~/.specwright)
#   SW_CLAUDE_DIR      Ziel für geltung=global unter .claude/ (Standard ~/.claude)
#   SW_MODE            install (Standard: vorhandene Dateien überspringen) | update (abweichende ersetzen, mit Sicherung)
#   SW_OVERWRITE       true → auch vorhandene Dateien ersetzen (install), auch gleiche neu schreiben (update)
#   SW_OVERWRITE_<ART> true → wie SW_OVERWRITE, nur für eine Art (COMMAND, WORKFLOW, AGENT, SKILL, STANDARD, TEMPLATE, MCP_PROFILE, MCP_SCRIPT)
#   SW_DRY_RUN         true → nichts schreiben, nur zählen und melden
#   SW_QUIET           true → keine Zeile je Datei
#
# Zähler nach jedem Lauf: SW_INSTALLED SW_UPDATED SW_SKIPPED SW_FAILED SW_REMOVED SW_KEPT_MODIFIED SW_KEPT_BY_LIST
#
# Manifest-Zeile:  art<TAB>geltung<TAB>quelle<TAB>ziel     (ziel relativ zum Projekt)
# Entfernt-Zeile:  version<TAB>geltung<TAB>ziel<TAB>sha256[,sha256…]
# Globales Ziel wird aus dem Projektziel abgeleitet: specwright/X → $SW_GLOBAL_DIR/X, .claude/X → $SW_CLAUDE_DIR/X.

SW_REPO_URL="${SW_REPO_URL:-${SPECWRIGHT_REPO_URL:-https://raw.githubusercontent.com/michsindlinger/specwright/main}}"
SW_GLOBAL_DIR="${SW_GLOBAL_DIR:-$HOME/.specwright}"
SW_CLAUDE_DIR="${SW_CLAUDE_DIR:-$HOME/.claude}"
SW_MODE="${SW_MODE:-install}"
SW_OVERWRITE="${SW_OVERWRITE:-false}"
SW_DRY_RUN="${SW_DRY_RUN:-false}"
SW_QUIET="${SW_QUIET:-false}"
SW_BACKUP_ROOT="${SW_BACKUP_ROOT:-specwright/backups}"
SW_KEEP_FILE="${SW_KEEP_FILE:-specwright/keep.txt}"
SW_MANIFEST_NAME="specwright/manifest.tsv"
SW_REMOVED_NAME="specwright/removed.tsv"

SW_INSTALLED=0; SW_UPDATED=0; SW_SKIPPED=0; SW_FAILED=0
SW_REMOVED=0; SW_KEPT_MODIFIED=0; SW_KEPT_BY_LIST=0
SW_TMP="${TMPDIR:-/tmp}/specwright-install-$$"
SW_STAMP="$(date +%Y-%m-%dT%H-%M-%S)"
SW_REMOVED_LIST=""; SW_KEPT_LIST=""

sw_say() { [[ "$SW_QUIET" == true ]] || printf '%s\n' "$*"; }
sw_err() { printf '%s\n' "$*" >&2; }

# --- Quelle lesen: https über curl/wget, file:// über cp ---------------------------------------
sw_fetch() { # url ziel → 0/1
    local url=$1 dest=$2
    mkdir -p "$(dirname "$dest")"
    case "$url" in
        file://*)
            local src=${url#file://}
            [[ -f "$src" ]] || return 1
            cp "$src" "$dest" ;;
        *)
            if command -v curl >/dev/null 2>&1; then
                curl -sSLf "$url" -o "$dest" 2>/dev/null || return 1
            elif command -v wget >/dev/null 2>&1; then
                wget -q "$url" -O "$dest" 2>/dev/null || return 1
            else
                sw_err "Weder curl noch wget gefunden."; return 1
            fi ;;
    esac
}

sw_sha256() { # datei → hex
    if command -v sha256sum >/dev/null 2>&1; then sha256sum "$1" | cut -d' ' -f1
    elif command -v shasum >/dev/null 2>&1; then shasum -a 256 "$1" | cut -d' ' -f1
    else openssl dgst -sha256 "$1" | sed 's/.*= //'; fi
}

sw_fetch_manifest() { # lädt manifest.tsv und removed.tsv nach $SW_TMP
    mkdir -p "$SW_TMP"
    sw_fetch "$SW_REPO_URL/$SW_MANIFEST_NAME" "$SW_TMP/manifest.tsv" || { sw_err "Manifest nicht ladbar: $SW_REPO_URL/$SW_MANIFEST_NAME"; return 1; }
    sw_fetch "$SW_REPO_URL/$SW_REMOVED_NAME" "$SW_TMP/removed.tsv" || : > "$SW_TMP/removed.tsv"
    grep -v '^#' "$SW_TMP/manifest.tsv" | grep -c . >/dev/null || { sw_err "Manifest leer."; return 1; }
}

sw_manifest_lines() { # art geltung → Zeilen quelle<TAB>ziel  (geltung both passt zu project und global)
    local art=$1 gelt=$2
    awk -F'\t' -v a="$art" -v g="$gelt" '$0 !~ /^#/ && $1==a && ($2==g || $2=="both") {print $3 "\t" $4}' "$SW_TMP/manifest.tsv"
}

sw_global_dest() { # projektziel → globaler Pfad
    local z=$1
    case "$z" in
        specwright/*) printf '%s/%s' "$SW_GLOBAL_DIR" "${z#specwright/}" ;;
        .claude/*)    printf '%s/%s' "$SW_CLAUDE_DIR" "${z#.claude/}" ;;
        *)            printf '%s/%s' "$SW_GLOBAL_DIR" "$z" ;;
    esac
}

sw_overwrite_for() { # art → true/false
    local art=$1 up
    up=$(printf '%s' "$art" | tr 'a-z-' 'A-Z_')
    local var="SW_OVERWRITE_$up"
    [[ "$SW_OVERWRITE" == true || "${!var:-false}" == true ]]
}

sw_backup() { # ziel → Sicherung unter $SW_BACKUP_ROOT/<stamp>/<ziel>
    local dest=$1 bdir
    case "$dest" in
        /*) bdir="$SW_GLOBAL_DIR/backups/$SW_STAMP" ;;
        *)  bdir="$SW_BACKUP_ROOT/$SW_STAMP" ;;
    esac
    mkdir -p "$bdir/$(dirname "$dest")"
    cp "$dest" "$bdir/$dest"
}

# --- eine Datei holen ---------------------------------------------------------------------------
sw_get() { # quelle ziel art
    local src=$1 dest=$2 art=$3 tmp
    if [[ -f "$dest" ]]; then
        if [[ "$SW_MODE" == install ]] && ! sw_overwrite_for "$art"; then
            SW_SKIPPED=$((SW_SKIPPED + 1)); return 0
        fi
        tmp="$SW_TMP/dl.$$.$RANDOM"
        if ! sw_fetch "$SW_REPO_URL/$src" "$tmp"; then SW_FAILED=$((SW_FAILED + 1)); sw_say "  ✗ $dest (Download fehlgeschlagen)"; return 1; fi
        if cmp -s "$dest" "$tmp" && ! sw_overwrite_for "$art"; then
            rm -f "$tmp"; SW_SKIPPED=$((SW_SKIPPED + 1)); return 0
        fi
        if [[ "$SW_DRY_RUN" == true ]]; then rm -f "$tmp"; SW_UPDATED=$((SW_UPDATED + 1)); sw_say "  ~ $dest (würde ersetzt)"; return 0; fi
        cmp -s "$dest" "$tmp" || sw_backup "$dest"
        mv "$tmp" "$dest"; SW_UPDATED=$((SW_UPDATED + 1)); sw_say "  ~ $dest (ersetzt, Sicherung unter $SW_BACKUP_ROOT/$SW_STAMP/)"
        return 0
    fi
    if [[ "$SW_DRY_RUN" == true ]]; then SW_INSTALLED=$((SW_INSTALLED + 1)); return 0; fi
    if sw_fetch "$SW_REPO_URL/$src" "$dest"; then SW_INSTALLED=$((SW_INSTALLED + 1)); sw_say "  + $dest"
    else SW_FAILED=$((SW_FAILED + 1)); sw_say "  ✗ $dest (Download fehlgeschlagen)"; return 1; fi
}

# --- alle Dateien einer Art und Geltung ---------------------------------------------------------
sw_install() { # art geltung(project|global)
    local art=$1 gelt=$2 src dest n=0
    [[ -f "$SW_TMP/manifest.tsv" ]] || sw_fetch_manifest || return 1
    while IFS=$'\t' read -r src dest; do
        [[ -n "$src" ]] || continue
        [[ "$gelt" == global ]] && dest=$(sw_global_dest "$dest")
        sw_get "$src" "$dest" "$art" || true
        n=$((n + 1))
    done < <(sw_manifest_lines "$art" "$gelt")
    return 0
}

sw_count() { # art geltung → Anzahl Manifestzeilen
    sw_manifest_lines "$1" "$2" | grep -c .
}

# --- entfernte Dateien räumen -------------------------------------------------------------------
sw_remove_obsolete() { # geltung(project|global)
    local gelt=$1 ver g dest hashes h have keep=0 matched
    [[ -f "$SW_TMP/removed.tsv" ]] || sw_fetch_manifest || return 1
    while IFS=$'\t' read -r ver g dest hashes; do
        [[ -n "$dest" && "$ver" != \#* ]] || continue
        [[ "$g" == "$gelt" || "$g" == both ]] || continue
        local path=$dest
        [[ "$gelt" == global ]] && path=$(sw_global_dest "$dest")
        [[ -f "$path" ]] || continue
        if [[ "$gelt" == project && -f "$SW_KEEP_FILE" ]] && grep -qxF -- "$dest" "$SW_KEEP_FILE"; then
            SW_KEPT_BY_LIST=$((SW_KEPT_BY_LIST + 1)); continue
        fi
        have=$(sw_sha256 "$path"); matched=false
        for h in $(printf '%s' "$hashes" | tr ',' ' '); do [[ "$h" == "$have" ]] && matched=true; done
        if [[ "$matched" == true ]]; then
            if [[ "$SW_DRY_RUN" == true ]]; then sw_say "  - $path (würde gelöscht, entfernt seit $ver)"
            else rm -f "$path"; sw_say "  - $path (gelöscht, entfernt seit $ver)"; fi
            SW_REMOVED=$((SW_REMOVED + 1)); SW_REMOVED_LIST="$SW_REMOVED_LIST$path"$'\n'
        else
            SW_KEPT_MODIFIED=$((SW_KEPT_MODIFIED + 1)); SW_KEPT_LIST="$SW_KEPT_LIST$path"$'\n'
            sw_say "  ! $path (nicht gelöscht: lokal geändert — behalten per $SW_KEEP_FILE oder von Hand löschen)"
        fi
    done < "$SW_TMP/removed.tsv"
    # leere Verzeichnisse, die nur entfernte Dateien enthielten, verschwinden
    [[ "$SW_DRY_RUN" == true ]] || find specwright/workflows .claude/commands .claude/skills .claude/agents -type d -empty -delete 2>/dev/null || true
    return 0
}

sw_report() {
    printf '\nErgebnis: %d neu, %d ersetzt, %d unverändert/übersprungen, %d fehlgeschlagen' "$SW_INSTALLED" "$SW_UPDATED" "$SW_SKIPPED" "$SW_FAILED"
    if [[ $((SW_REMOVED + SW_KEPT_MODIFIED + SW_KEPT_BY_LIST)) -gt 0 ]]; then
        printf ', %d gelöscht, %d behalten (lokal geändert), %d behalten (Liste)' "$SW_REMOVED" "$SW_KEPT_MODIFIED" "$SW_KEPT_BY_LIST"
    fi
    printf '\n'
    [[ "$SW_DRY_RUN" == true ]] && printf '(Probelauf — nichts geschrieben)\n'
    [[ $SW_KEPT_MODIFIED -gt 0 ]] && printf 'Hinweis: gelöschte Befehle können noch in der Projekt-CLAUDE.md genannt sein.\n'
    return 0
}

sw_cleanup() { rm -rf "$SW_TMP"; }
