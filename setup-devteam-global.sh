#!/bin/bash
# Specwright - Global Installation
# Installs global standards and templates into ~/.specwright/ (hybrid lookup fallback for every project).
# File lists live in specwright/manifest.tsv; loading logic in specwright/scripts/install-lib.sh.
#
#   curl -sSL https://raw.githubusercontent.com/michsindlinger/specwright/main/setup-devteam-global.sh | bash
#   bash setup-devteam-global.sh --overwrite
#   SPECWRIGHT_REPO_URL=file:///path/to/specwright bash setup-devteam-global.sh   # local source (tests)

set -e

REPO_URL="${SPECWRIGHT_REPO_URL:-https://raw.githubusercontent.com/michsindlinger/specwright/main}"

for arg in "$@"; do
    case "$arg" in
        --overwrite) export SW_OVERWRITE=true ;;
        --dry-run)   export SW_DRY_RUN=true ;;
        -h|--help)   echo "Usage: $0 [--overwrite] [--dry-run]"; exit 0 ;;
        *) echo "Unknown option: $arg"; exit 1 ;;
    esac
done

echo "========================================="
echo "Specwright - Global Installation"
echo "========================================="
echo ""

# --- load shared installer library --------------------------------------------------------------
export SW_REPO_URL="$REPO_URL"
case "$REPO_URL" in
    file://*) . "${REPO_URL#file://}/specwright/scripts/install-lib.sh" ;;
    *) _lib=$(mktemp); curl -sSLf "$REPO_URL/specwright/scripts/install-lib.sh" -o "$_lib" || { echo "Error: cannot load $REPO_URL/specwright/scripts/install-lib.sh"; exit 1; }; . "$_lib"; rm -f "$_lib" ;;
esac
sw_fetch_manifest || exit 1

echo "Installing to: $SW_GLOBAL_DIR"
echo ""
echo "=== Global standards ($(sw_count standard global)) ==="
sw_install standard global
echo "=== Global templates ($(sw_count template global)) ==="
sw_install template global

sw_report
sw_cleanup

echo ""
echo "Global installation complete: $SW_GLOBAL_DIR/{standards,templates}"
echo ""
echo "Hybrid lookup: project specwright/templates/ first, then ~/.specwright/templates/."
echo ""
echo "Next steps:"
echo "  1. In your project:  curl -sSL $REPO_URL/setup.sh | bash"
echo "  2. Claude Code:      curl -sSL $REPO_URL/setup-claude-code.sh | bash"
echo "  3. Start:  /intent → /spec → /plan → /build"
echo ""
echo "For more info: https://github.com/michsindlinger/specwright"
