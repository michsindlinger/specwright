#!/bin/bash

# =============================================================================
# Specwright Web UI - Standalone Installer
#
# Installs the Specwright Web UI independently of any project.
# The UI is project-independent: install it once, then open and manage
# multiple projects from within the UI.
#
# Usage:
#   curl -sSL https://raw.githubusercontent.com/michsindlinger/specwright/main/setup-ui.sh | bash
#   bash setup-ui.sh [--dir /path/to/install]
#
# =============================================================================

set -e

REPO_URL="https://github.com/michsindlinger/specwright.git"
DEFAULT_DIR="$HOME/specwright-ui"

# Color helpers
if [[ -t 1 ]] || [[ -t 2 ]]; then
    BOLD="\033[1m"
    GREEN="\033[0;32m"
    YELLOW="\033[0;33m"
    RED="\033[0;31m"
    CYAN="\033[0;36m"
    DIM="\033[2m"
    RESET="\033[0m"
else
    BOLD="" GREEN="" YELLOW="" RED="" CYAN="" DIM="" RESET=""
fi

# =============================================================================
# Parse arguments
# =============================================================================

INSTALL_DIR=""
FLAG_YES=false

while [[ $# -gt 0 ]]; do
    case $1 in
        --dir)
            INSTALL_DIR="$2"
            shift 2
            ;;
        --yes|-y)
            FLAG_YES=true
            shift
            ;;
        -h|--help)
            cat << 'HELP'
Specwright Web UI - Standalone Installer

Usage:
  curl -sSL .../setup-ui.sh | bash
  bash setup-ui.sh [options]

Options:
  --dir PATH    Install location (default: ~/specwright-ui)
  --yes | -y    Skip confirmation prompt
  -h | --help   Show this help

The Web UI is project-independent. Install it once, then open
and manage your projects from within the UI.
HELP
            exit 0
            ;;
        *)
            echo -e "${RED}Unknown option: $1${RESET}"
            exit 1
            ;;
    esac
done

# =============================================================================
# Header
# =============================================================================

echo ""
echo -e "${BOLD}Specwright Web UI - Installer${RESET}"
echo "=============================="
echo ""
echo "The Web UI is installed once and works with all your projects."
echo "You can open and switch between projects from within the UI."
echo ""

# =============================================================================
# Prerequisites
# =============================================================================

# Check git
if ! command -v git &>/dev/null; then
    echo -e "${RED}Error: git is not installed.${RESET}"
    echo "Please install git first."
    exit 1
fi

# Check Node.js
if ! command -v node &>/dev/null; then
    echo -e "${RED}Error: Node.js is not installed.${RESET}"
    echo "Please install Node.js 20+ from https://nodejs.org"
    exit 1
fi

NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 20 ]; then
    echo -e "${RED}Error: Node.js 20+ required (found $(node -v))${RESET}"
    echo "Please upgrade Node.js from https://nodejs.org"
    exit 1
fi

echo -e "  Node.js: ${GREEN}$(node -v)${RESET}"
echo -e "  npm:     ${GREEN}$(npm -v)${RESET}"
echo -e "  git:     ${GREEN}$(git --version | cut -d' ' -f3)${RESET}"
echo ""

# =============================================================================
# Choose installation directory
# =============================================================================

if [[ -z "$INSTALL_DIR" ]]; then
    echo -e "${BOLD}Where should the UI be installed?${RESET}"
    echo ""
    echo "  1) $DEFAULT_DIR (default)"
    echo "  2) Custom location"
    echo ""

    if [[ "$FLAG_YES" == true ]]; then
        INSTALL_DIR="$DEFAULT_DIR"
        echo -e "  Using default: ${CYAN}$INSTALL_DIR${RESET}"
    else
        local_response=""
        printf "  Your choice [1]: "
        if [[ -t 0 ]]; then
            read -r local_response
        else
            read -r local_response < /dev/tty 2>/dev/null || local_response=""
        fi

        case "$local_response" in
            2)
                printf "  Enter path: "
                if [[ -t 0 ]]; then
                    read -r INSTALL_DIR
                else
                    read -r INSTALL_DIR < /dev/tty 2>/dev/null || INSTALL_DIR="$DEFAULT_DIR"
                fi
                # Expand ~ if present
                INSTALL_DIR="${INSTALL_DIR/#\~/$HOME}"
                ;;
            *)
                INSTALL_DIR="$DEFAULT_DIR"
                ;;
        esac
    fi
fi

# Expand ~ if present
INSTALL_DIR="${INSTALL_DIR/#\~/$HOME}"

echo ""
echo -e "${BOLD}Installation plan:${RESET}"
echo -e "  Location: ${CYAN}$INSTALL_DIR${RESET}"
echo ""

# Check if directory already exists
if [[ -d "$INSTALL_DIR/ui" ]]; then
    echo -e "  ${YELLOW}Existing installation found. Dependencies will be updated.${RESET}"
    echo ""
fi

# Confirm
if [[ "$FLAG_YES" != true ]]; then
    printf "Proceed? [Y/n] "
    local_confirm=""
    if [[ -t 0 ]]; then
        read -r local_confirm
    else
        read -r local_confirm < /dev/tty 2>/dev/null || local_confirm="y"
    fi

    case "$local_confirm" in
        [nN]|[nN][oO])
            echo "Installation cancelled."
            exit 0
            ;;
    esac
fi

# =============================================================================
# Clone or update repository
# =============================================================================

echo ""
if [[ -d "$INSTALL_DIR/.git" ]]; then
    echo -e "${BOLD}[1/4] Updating repository...${RESET}"
    (cd "$INSTALL_DIR" && git pull --quiet)
else
    echo -e "${BOLD}[1/4] Cloning repository...${RESET}"
    git clone --quiet "$REPO_URL" "$INSTALL_DIR"
fi
echo -e "       ${GREEN}done${RESET}"

# =============================================================================
# Install backend dependencies
# =============================================================================

echo -e "${BOLD}[2/4] Installing backend dependencies...${RESET}"
(cd "$INSTALL_DIR/ui" && npm install --silent 2>/dev/null)

# Fix node-pty spawn-helper permissions (required on macOS)
SPAWN_HELPER="$INSTALL_DIR/ui/node_modules/node-pty/prebuilds/darwin-arm64/spawn-helper"
if [ -f "$SPAWN_HELPER" ]; then
    chmod +x "$SPAWN_HELPER"
fi
echo -e "       ${GREEN}done${RESET}"

# =============================================================================
# Install frontend dependencies
# =============================================================================

echo -e "${BOLD}[3/4] Installing frontend dependencies...${RESET}"
(cd "$INSTALL_DIR/ui/frontend" && npm install --silent 2>/dev/null)
echo -e "       ${GREEN}done${RESET}"

# =============================================================================
# Build frontend for production
# =============================================================================

echo -e "${BOLD}[4/4] Building frontend...${RESET}"
(cd "$INSTALL_DIR/ui/frontend" && npm run build --silent 2>/dev/null)
echo -e "       ${GREEN}done${RESET}"

# =============================================================================
# Summary
# =============================================================================

echo ""
echo "=============================="
echo -e "${BOLD}  Installation complete!${RESET}"
echo "=============================="
echo ""
echo -e "${BOLD}Start the UI:${RESET}"
echo ""
echo "  cd $INSTALL_DIR/ui && npm start"
echo ""
echo "  Then open ${CYAN}http://localhost:3001${RESET} in your browser."
echo ""
echo -e "${BOLD}What's next:${RESET}"
echo ""
echo "  1. Open the UI in your browser"
echo "  2. Add your project directories in the UI"
echo "  3. Install Specwright in each project (if not done yet):"
echo ""
echo "     cd your-project/"
echo "     curl -sSL https://raw.githubusercontent.com/michsindlinger/specwright/main/install.sh | bash"
echo ""
echo -e "${DIM}Tip: Use PORT=8080 to run on a different port:${RESET}"
echo -e "${DIM}  cd $INSTALL_DIR/ui && PORT=8080 npm start${RESET}"
echo ""
