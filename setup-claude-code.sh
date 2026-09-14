#!/bin/bash
# Specwright - Claude Code Setup
# Installs the Claude Code commands, skills and utility agents into the current project.
# File lists live in specwright/manifest.tsv; loading logic in specwright/scripts/install-lib.sh.
#
#   curl -sSL https://raw.githubusercontent.com/michsindlinger/specwright/main/setup-claude-code.sh | bash
#   bash setup-claude-code.sh --overwrite
#   SPECWRIGHT_REPO_URL=file:///path/to/specwright bash setup-claude-code.sh   # local source (tests)

set -e

REPO_URL="${SPECWRIGHT_REPO_URL:-https://raw.githubusercontent.com/michsindlinger/specwright/main}"

for arg in "$@"; do
    case "$arg" in
        --overwrite) export SW_OVERWRITE=true ;;
        --dry-run)   export SW_DRY_RUN=true ;;
        --with-ui)   : ;;  # kept for compatibility; UI skills are repo-internal since 4.0.0
        -h|--help)
            echo "Specwright - Claude Code Setup"; echo ""
            echo "Usage: $0 [--overwrite] [--dry-run]"
            echo "  --overwrite   Replace existing command/agent/skill files (a backup goes to specwright/backups/<timestamp>/)"
            echo "  --dry-run     Show what would happen, write nothing"
            exit 0 ;;
        *) echo "Unknown option: $arg"; exit 1 ;;
    esac
done

echo "Specwright - Claude Code Setup"
echo "Installing Claude Code configuration in current project..."
echo ""

if [[ ! -d "specwright/workflows" ]]; then
    echo "Error: Specwright base installation not found in current project."
    echo ""
    echo "Please run the base setup first:"
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

echo "=== Commands ($(sw_count command project)) ==="
sw_install command project
echo "=== Skills ($(sw_count skill project)) ==="
sw_install skill project
echo "=== Utility agents ($(sw_count agent project)) ==="
sw_install agent project

sw_report
sw_cleanup

echo ""
echo "=================================="
echo "Claude Code Setup Complete!"
echo "=================================="
echo ""
echo "  .claude/commands/specwright/   ($(sw_count command project) commands)"
echo "  .claude/skills/                ($(sw_count skill project) skills)"
echo "  .claude/agents/                ($(sw_count agent project) utility agents)"
echo ""
echo "Vorhaben-Flow (Specwright v4):"
echo "  /intent                   -> Vorhaben festhalten (intent.md)"
echo "  /spec [INT-id]            -> Fachliche Spec (spec.md)"
echo "  /plan [INT-id]            -> Umsetzungsplan (plan.md)"
echo "  /build [INT-id]           -> Plan umsetzen bis PR"
echo ""
echo "Product & team:"
echo "  /plan-product /analyze-product /build-development-team"
echo "Specs & execution (Web-UI path):"
echo "  /create-spec /change-spec /add-bug /add-todo /execute-tasks /retroactive-spec /estimate-spec"
echo "Documentation & feedback:"
echo "  /document-feature /update-changelog /process-feedback /start-brainstorming"
echo "Skills & design:"
echo "  /add-skill /add-learning /add-domain /extract-design /check-update"
echo ""
echo "For more info: https://github.com/michsindlinger/specwright"
