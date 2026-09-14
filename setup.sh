#!/bin/bash
# Specwright - Project Installation
# Installs the framework (workflows, standards, templates, docs, config) into the current project.
# File lists live in specwright/manifest.tsv; loading logic in specwright/scripts/install-lib.sh.
#
#   curl -sSL https://raw.githubusercontent.com/michsindlinger/specwright/main/setup.sh | bash
#   bash setup.sh --overwrite-workflows
#   SPECWRIGHT_REPO_URL=file:///path/to/specwright bash setup.sh   # local source (tests)

set -e

REPO_URL="${SPECWRIGHT_REPO_URL:-https://raw.githubusercontent.com/michsindlinger/specwright/main}"

while [[ $# -gt 0 ]]; do
    case $1 in
        --overwrite-workflows) export SW_OVERWRITE_WORKFLOW=true; shift ;;
        --overwrite-standards) export SW_OVERWRITE_STANDARD=true; shift ;;
        --overwrite)           export SW_OVERWRITE=true; shift ;;
        --dry-run)             export SW_DRY_RUN=true; shift ;;
        -h|--help)
            echo "Specwright - Project Installation"
            echo ""
            echo "Usage: $0 [options]"
            echo ""
            echo "Options:"
            echo "  --overwrite-workflows      Overwrite existing workflow files"
            echo "  --overwrite-standards      Overwrite existing standards files"
            echo "  --overwrite                Overwrite every existing file"
            echo "  --dry-run                  Show what would happen, write nothing"
            echo "  -h, --help                 Show this help message"
            echo ""
            echo "Installs Specwright in the current project."
            exit 0 ;;
        *) echo "Unknown option: $1"; echo "Use -h or --help for usage information"; exit 1 ;;
    esac
done

# --- load shared installer library --------------------------------------------------------------
export SW_REPO_URL="$REPO_URL"
case "$REPO_URL" in
    file://*) . "${REPO_URL#file://}/specwright/scripts/install-lib.sh" ;;
    *) _lib=$(mktemp); curl -sSLf "$REPO_URL/specwright/scripts/install-lib.sh" -o "$_lib" || { echo "Error: cannot load $REPO_URL/specwright/scripts/install-lib.sh"; exit 1; }; . "$_lib"; rm -f "$_lib" ;;
esac
sw_fetch_manifest || exit 1

echo "Specwright - Project Installation"
echo "Installing core structure in current project..."
echo ""

echo "=== Standards ($(sw_count standard project)) ==="
sw_install standard project
echo "=== Documentation ($(sw_count doc project)) ==="
sw_install doc project
echo "=== Workflows ($(sw_count workflow project)) ==="
sw_install workflow project
echo "=== Templates ($(sw_count template project)) ==="
sw_install template project
echo "=== MCP profiles ($(sw_count mcp-profile project)) ==="
sw_install mcp-profile project
echo "=== Scripts ($(sw_count script project)) ==="
sw_install script project
[[ -f specwright/scripts/auto-execute.sh ]] && chmod +x specwright/scripts/auto-execute.sh

echo ""
echo "=== Configuration ==="
if [[ "${SW_DRY_RUN:-false}" == true ]]; then
    echo "(dry run) specwright/config.yml, CLAUDE.md"
elif [[ ! -f "specwright/config.yml" ]]; then
    mkdir -p specwright
    cat > specwright/config.yml << 'EOF'
# Specwright Configuration
project:
  name: "[PROJECT_NAME]"  # Customize this
devteam:
  enabled: false  # Set to true after /build-development-team
workflows:
  auto_commit_per_story: true  # Git commit after each story completion
standards:
  use_global_fallback: true
EOF
    echo "Created specwright/config.yml — customize project.name"
else
    echo "Skipping specwright/config.yml (already exists)"
fi

if [[ "${SW_DRY_RUN:-false}" != true ]]; then
    if [[ -f "CLAUDE.md" ]]; then
        [[ -f CLAUDE.md.template ]] || sw_fetch "$REPO_URL/specwright/templates/sdlc/projekt/CLAUDE-template.md" CLAUDE.md.template
        echo "CLAUDE.md exists — v4 template saved as CLAUDE.md.template for reference"
    else
        sw_fetch "$REPO_URL/specwright/templates/sdlc/projekt/CLAUDE-template.md" CLAUDE.md
        echo "Created CLAUDE.md from the v4 template — fill in the placeholders"
    fi
fi

echo ""
echo "=== Kanban MCP Server (optional) ==="
if [[ "${SW_DRY_RUN:-false}" == true ]]; then
    echo "(dry run) skipped"
elif command -v npx >/dev/null 2>&1 && [[ -f setup-mcp.sh ]]; then
    bash setup-mcp.sh
else
    echo "Skipped — run setup-mcp.sh later (needs Node.js)."
fi

sw_report
sw_cleanup

echo ""
echo "========================================="
echo "Specwright $(sw_fetch "$REPO_URL/VERSION" "$SW_TMP.version" 2>/dev/null && cat "$SW_TMP.version"; rm -f "$SW_TMP.version") installed"
echo "========================================="
echo ""
echo "Next steps:"
echo "  1. Customize CLAUDE.md"
echo "  2. Claude Code commands:  curl -sSL $REPO_URL/setup-claude-code.sh | bash"
echo "  3. Global templates:      curl -sSL $REPO_URL/setup-devteam-global.sh | bash"
echo "  4. Start:  /intent → /spec → /plan → /build   (or /plan-product for a new product)"
echo ""
echo "For more info: https://github.com/michsindlinger/specwright"
