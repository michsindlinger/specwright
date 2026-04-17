#!/bin/bash
# =============================================================================
# Specwright Update Checker
# Checks if a newer version of Specwright is available and optionally updates.
#
# Usage:
#   bash check-update.sh              # Check for updates
#   bash check-update.sh --update     # Check and install update
# =============================================================================

REPO_URL="https://raw.githubusercontent.com/michsindlinger/specwright/main"

# Color helpers
if [[ -t 1 ]] || [[ -t 2 ]]; then
    BOLD="\033[1m"
    GREEN="\033[0;32m"
    YELLOW="\033[0;33m"
    DIM="\033[2m"
    RESET="\033[0m"
else
    BOLD="" GREEN="" YELLOW="" DIM="" RESET=""
fi

# Find installed version (per-project only, no global fallback).
# The global ~/.specwright/.version reflects global templates, not per-project state.
INSTALLED=""
[[ -f "specwright/.installed-version" ]] && INSTALLED=$(cat "specwright/.installed-version" | tr -d '[:space:]')

# Check if specwright is installed but without version tracking (old installation)
HAS_SPECWRIGHT_DIR=false
[[ -d "specwright" || -d "agent-os" ]] && HAS_SPECWRIGHT_DIR=true

if [[ -z "$INSTALLED" && "$HAS_SPECWRIGHT_DIR" == "false" ]]; then
    echo -e "${YELLOW}Keine Specwright-Installation gefunden.${RESET}"
    echo "Installieren: curl -sSL $REPO_URL/install.sh | bash"
    exit 0
fi

# Fetch latest version from GitHub (with -f so rate-limit pages don't leak through)
LATEST=$(curl -sSLf --max-time 3 "$REPO_URL/VERSION" 2>/dev/null | tr -d '[:space:]')
if [[ -z "$LATEST" ]]; then
    echo -e "${YELLOW}GitHub nicht erreichbar oder rate-limited. Versionspruefung uebersprungen.${RESET}"
    exit 0
fi

echo -e "${BOLD}Specwright Version Check${RESET}"
echo "========================"
if [[ -n "$INSTALLED" ]]; then
    echo -e "  Installiert: ${DIM}$INSTALLED${RESET}"
else
    echo -e "  Installiert: ${DIM}unbekannt (vor Versions-Tracking)${RESET}"
fi
echo -e "  Aktuell:     ${DIM}$LATEST${RESET}"

if [[ -n "$INSTALLED" && "$INSTALLED" == "$LATEST" ]]; then
    echo ""
    echo -e "${GREEN}Du bist auf dem neuesten Stand.${RESET}"
    exit 0
fi

echo ""
if [[ -n "$INSTALLED" ]]; then
    echo -e "${YELLOW}Update verfuegbar: $INSTALLED -> $LATEST${RESET}"
else
    echo -e "${YELLOW}Update verfuegbar: -> $LATEST${RESET}"
fi

# Show changelog for the latest version (best-effort, silent on failure)
CHANGELOG=$(curl -sSLf --max-time 3 "$REPO_URL/CHANGELOG.md" 2>/dev/null)
if [[ -n "$CHANGELOG" ]]; then
    echo ""
    echo "$CHANGELOG" | awk "/^## $LATEST/,/^## [0-9]/{if(/^## [0-9]/ && !/^## $LATEST/)exit; print}"
fi

echo ""
if [[ "$1" == "--update" ]]; then
    echo -e "${BOLD}Update wird installiert...${RESET}"

    # Download install.sh to a temp file so we can verify it before executing.
    # `-f` makes curl exit non-zero on HTTP 4xx/5xx (rate-limit, 404, etc.) instead
    # of piping an error page into bash, which would produce confusing stack traces.
    TMP_INSTALL=$(mktemp -t specwright-install.XXXXXX)
    trap 'rm -f "$TMP_INSTALL"' EXIT

    if ! curl -sSLf --max-time 30 "$REPO_URL/install.sh" -o "$TMP_INSTALL"; then
        echo ""
        echo -e "${YELLOW}Download von install.sh fehlgeschlagen.${RESET}"
        echo -e "${DIM}Haeufigste Ursache: GitHub hat dich rate-limited (HTTP 429).${RESET}"
        echo ""
        echo "Workarounds:"
        echo -e "  ${DIM}1) Ein paar Minuten warten und erneut versuchen${RESET}"
        echo -e "  ${DIM}2) install.sh manuell herunterladen und lokal ausfuehren:${RESET}"
        echo -e "     ${DIM}curl -sSLf -o /tmp/install.sh $REPO_URL/install.sh${RESET}"
        echo -e "     ${DIM}bash /tmp/install.sh --yes --update${RESET}"
        exit 1
    fi

    # Sanity check: install.sh should start with a shebang
    if ! head -1 "$TMP_INSTALL" | grep -q '^#!'; then
        echo ""
        echo -e "${YELLOW}install.sh hat unerwartetes Format (kein Shebang am Anfang).${RESET}"
        echo -e "${DIM}GitHub hat moeglicherweise eine Fehler-Seite zurueckgegeben. Erste Zeilen:${RESET}"
        head -3 "$TMP_INSTALL" | sed 's/^/  /'
        exit 1
    fi

    bash "$TMP_INSTALL" --yes --update
else
    echo "Update installieren:"
    echo -e "  ${DIM}bash <(curl -sSL $REPO_URL/check-update.sh) --update${RESET}"
fi
