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

# Find installed version
INSTALLED=""
[[ -f "specwright/.installed-version" ]] && INSTALLED=$(cat "specwright/.installed-version" | tr -d '[:space:]')
[[ -z "$INSTALLED" && -f "$HOME/.specwright/.version" ]] && INSTALLED=$(cat "$HOME/.specwright/.version" | tr -d '[:space:]')

if [[ -z "$INSTALLED" ]]; then
    echo -e "${YELLOW}Keine Specwright-Installation gefunden.${RESET}"
    echo "Installieren: curl -sSL $REPO_URL/install.sh | bash"
    exit 0
fi

# Fetch latest version from GitHub
LATEST=$(curl -sSL --max-time 3 "$REPO_URL/VERSION" 2>/dev/null | tr -d '[:space:]')
if [[ -z "$LATEST" ]]; then
    echo -e "${YELLOW}GitHub nicht erreichbar. Versionspruefung uebersprungen.${RESET}"
    exit 0
fi

echo -e "${BOLD}Specwright Version Check${RESET}"
echo "========================"
echo -e "  Installiert: ${DIM}$INSTALLED${RESET}"
echo -e "  Aktuell:     ${DIM}$LATEST${RESET}"

if [[ "$INSTALLED" == "$LATEST" ]]; then
    echo ""
    echo -e "${GREEN}Du bist auf dem neuesten Stand.${RESET}"
    exit 0
fi

echo ""
echo -e "${YELLOW}Update verfuegbar: $INSTALLED -> $LATEST${RESET}"

# Show changelog for the latest version
CHANGELOG=$(curl -sSL --max-time 3 "$REPO_URL/CHANGELOG.md" 2>/dev/null)
if [[ -n "$CHANGELOG" ]]; then
    echo ""
    echo "$CHANGELOG" | awk "/^## $LATEST/,/^## [0-9]/{if(/^## [0-9]/ && !/^## $LATEST/)exit; print}"
fi

echo ""
if [[ "$1" == "--update" ]]; then
    echo -e "${BOLD}Update wird installiert...${RESET}"
    bash <(curl -sSL "$REPO_URL/install.sh") --yes --update
else
    echo "Update installieren:"
    echo -e "  ${DIM}bash <(curl -sSL $REPO_URL/check-update.sh) --update${RESET}"
fi
