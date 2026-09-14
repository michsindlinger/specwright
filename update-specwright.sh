#!/bin/bash
# Specwright - Update Script
# Brings an existing project installation to the latest framework version:
#   - replaces changed files (backup under specwright/backups/<timestamp>/, never next to the file)
#   - adds new files
#   - deletes files Specwright removed (specwright/removed.tsv) — only when the local copy is byte-identical
#     to a shipped version; a locally modified file stays and is reported
#   - respects specwright/keep.txt (one target path per line) for files you keep on purpose
#
#   curl -sSL https://raw.githubusercontent.com/michsindlinger/specwright/main/update-specwright.sh | bash
#   bash update-specwright.sh --dry-run
#   SPECWRIGHT_REPO_URL=file:///path/to/specwright bash update-specwright.sh   # local source (tests)

set -e

REPO_URL="${SPECWRIGHT_REPO_URL:-https://raw.githubusercontent.com/michsindlinger/specwright/main}"
export SW_MODE=update

while [[ $# -gt 0 ]]; do
    case $1 in
        --force)     export SW_OVERWRITE=true; shift ;;
        --dry-run)   export SW_DRY_RUN=true; shift ;;
        --no-backup) shift ;;  # kept for compatibility; backups are always written to specwright/backups/
        -h|--help)
            echo "Specwright Update Script"; echo ""
            echo "Usage: $0 [options]"; echo ""
            echo "Options:"
            echo "  --force      Rewrite every shipped file even if identical (removed files are still never deleted when locally modified)"
            echo "  --dry-run    Show what would change, write nothing"
            echo "  -h, --help   Show this help message"
            exit 0 ;;
        *) echo "Unknown option: $1"; echo "Use -h or --help for usage information"; exit 1 ;;
    esac
done

echo "Specwright - Update Script"
echo ""

if [[ ! -d "specwright" && ! -d "agent-os" ]]; then
    echo "Error: No Specwright installation found!"
    echo ""
    echo "Please run the setup script first:"
    echo "  curl -sSL $REPO_URL/setup.sh | bash"
    exit 1
fi

# --- load shared installer library --------------------------------------------------------------
export SW_REPO_URL="$REPO_URL"
case "$REPO_URL" in
    file://*) . "${REPO_URL#file://}/specwright/scripts/install-lib.sh" ;;
    *) _lib=$(mktemp); curl -sSLf "$REPO_URL/specwright/scripts/install-lib.sh" -o "$_lib" || { echo "Error: cannot load $REPO_URL/specwright/scripts/install-lib.sh"; exit 1; }; . "$_lib"; rm -f "$_lib" ;;
esac
sw_fetch_manifest || exit 1

echo "Backups: $SW_BACKUP_ROOT/$SW_STAMP/ (only for replaced files)"
echo ""
echo "Updating standards..."; sw_install standard project
echo "Updating documentation..."; sw_install doc project
echo "Updating workflows..."; sw_install workflow project
echo "Updating templates..."; sw_install template project
echo "Updating MCP profiles..."; sw_install mcp-profile project
echo "Updating scripts..."; sw_install script project
if [[ -d ".claude/commands/specwright" ]]; then
    echo "Updating Claude Code commands..."; sw_install command project
    echo "Updating Claude Code skills..."; sw_install skill project
    echo "Updating Claude Code agents..."; sw_install agent project
else
    echo "No .claude/commands/specwright — Claude Code files skipped (run setup-claude-code.sh to add them)."
fi

echo ""
echo "Removing files Specwright no longer ships..."
sw_remove_obsolete project

# CLAUDE.md is never touched; the current v4 template is offered next to it.
if [[ "${SW_DRY_RUN:-false}" != true ]]; then
    if [[ -f CLAUDE.md ]]; then
        sw_fetch "$REPO_URL/specwright/templates/sdlc/projekt/CLAUDE-template.md" CLAUDE.md.template && echo "  CLAUDE.md untouched — current template in CLAUDE.md.template"
    fi
    LATEST=$(sw_fetch "$REPO_URL/VERSION" "$SW_TMP/VERSION" && tr -d '[:space:]' < "$SW_TMP/VERSION")
    [[ -n "$LATEST" ]] && echo "$LATEST" > specwright/.installed-version
fi

sw_report
sw_cleanup
echo ""
echo "Specwright update complete${LATEST:+ (version $LATEST)}."
