#!/bin/bash

# Specwright - Update Script
# Updates existing Specwright installations with latest features

set -e

REPO_URL="https://raw.githubusercontent.com/michsindlinger/specwright/main"
FORCE_UPDATE=false
BACKUP_EXISTING=true

# Parse command line arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        --force)
            FORCE_UPDATE=true
            shift
            ;;
        --no-backup)
            BACKUP_EXISTING=false
            shift
            ;;
        -h|--help)
            echo "Specwright Update Script"
            echo ""
            echo "Updates existing Specwright installations with latest features."
            echo ""
            echo "Usage: $0 [options]"
            echo ""
            echo "Options:"
            echo "  --force                    Force update even if files are newer"
            echo "  --no-backup               Skip creating backups of existing files"
            echo "  -h, --help                 Show this help message"
            exit 0
            ;;
        *)
            echo "Unknown option: $1"
            echo "Use -h or --help for usage information"
            exit 1
            ;;
    esac
done

echo "Specwright - Update Script"
echo "Updating Specwright installation..."
echo ""

# Function to backup file
backup_file() {
    local file_path=$1
    local backup_suffix=".backup-$(date +%Y%m%d-%H%M%S)"

    if [[ -f "$file_path" && "$BACKUP_EXISTING" == true ]]; then
        echo "  Backing up existing $file_path"
        cp "$file_path" "${file_path}${backup_suffix}"
    fi
}

# Function to download file with update logic
update_file() {
    local url=$1
    local path=$2
    local description=$3

    if [[ -f "$path" ]]; then
        if [[ "$FORCE_UPDATE" == true ]]; then
            backup_file "$path"
            echo "  Force updating $description..."
            curl -sSL "$url" -o "$path"
        else
            local temp_file=$(mktemp)
            curl -sSL "$url" -o "$temp_file"

            if ! cmp -s "$path" "$temp_file"; then
                backup_file "$path"
                echo "  Updating $description..."
                mv "$temp_file" "$path"
            else
                echo "  $description is up to date"
                rm "$temp_file"
            fi
        fi
    else
        echo "  Adding new $description..."
        curl -sSL "$url" -o "$path"
    fi
}

# Check for Specwright installation
if [[ ! -d "specwright" ]]; then
    echo "Error: No Specwright installation found!"
    echo ""
    echo "Please run the setup script first:"
    echo "  curl -sSL $REPO_URL/setup.sh | bash"
    exit 1
fi

echo "Detected Specwright installation"
echo ""

# Create backup directory if backing up
if [[ "$BACKUP_EXISTING" == true ]]; then
    BACKUP_DIR="specwright/backups/$(date +%Y%m%d-%H%M%S)"
    mkdir -p "$BACKUP_DIR"
    echo "Backups will be stored in: $BACKUP_DIR"
    echo ""
fi

# Update standards
echo "Updating standards..."
update_file "$REPO_URL/specwright/standards/code-style.md" \
            "specwright/standards/code-style.md" \
            "standard: code-style.md"
update_file "$REPO_URL/specwright/standards/best-practices.md" \
            "specwright/standards/best-practices.md" \
            "standard: best-practices.md"
update_file "$REPO_URL/specwright/standards/plan-review-guidelines.md" \
            "specwright/standards/plan-review-guidelines.md" \
            "standard: plan-review-guidelines.md"

# Update workflows
echo ""
echo "Updating core workflows..."

workflow_files=(
    "plan-product.md"
    "plan-platform.md"
    "create-spec.md"
    "add-story.md"
    "add-bug.md"
    "add-todo.md"
    "retroactive-doc.md"
    "retroactive-spec.md"
    "build-development-team.md"
    "add-skill.md"
    "add-learning.md"
    "add-domain.md"
    "start-brainstorming.md"
    "transfer-and-create-spec.md"
    "transfer-and-create-bug.md"
    "transfer-and-plan-product.md"
)

for file in "${workflow_files[@]}"; do
    update_file "$REPO_URL/specwright/workflows/core/$file" \
                "specwright/workflows/core/$file" \
                "workflow: $file"
done

# Update execute-tasks phase files
echo ""
echo "Updating execute-tasks workflows..."
mkdir -p specwright/workflows/core/execute-tasks/shared

et_files=(
    "entry-point.md"
    "spec-phase-1.md"
    "spec-phase-2.md"
    "spec-phase-3.md"
    "spec-phase-4-5.md"
    "spec-phase-5.md"
    "backlog-phase-1.md"
    "backlog-phase-2.md"
    "backlog-phase-3.md"
    "shared/resume-context.md"
    "shared/error-handling.md"
    "shared/skill-extraction.md"
)

for file in "${et_files[@]}"; do
    update_file "$REPO_URL/specwright/workflows/core/execute-tasks/$file" \
                "specwright/workflows/core/execute-tasks/$file" \
                "execute-tasks: $file"
done

# Update Claude Code commands if installed
if [[ -d ".claude/commands/specwright" ]]; then
    echo ""
    echo "Updating Claude Code commands..."

    command_files=(
        "plan-product.md" "plan-platform.md"
        "create-spec.md"
        "add-story.md" "add-bug.md" "add-todo.md"
        "execute-tasks.md"
        "retroactive-doc.md" "retroactive-spec.md"
        "build-development-team.md" "create-project-agents.md"
        "assign-skills-to-agent.md" "add-skill.md"
        "add-learning.md" "add-domain.md"
        "start-brainstorming.md"
        "validate-market.md" "validate-market-for-existing.md"
        "transfer-and-create-spec.md" "transfer-and-create-bug.md"
        "transfer-and-plan-product.md"
    )

    for file in "${command_files[@]}"; do
        update_file "$REPO_URL/.claude/commands/specwright/$file" \
                    ".claude/commands/specwright/$file" \
                    "command: $file"
    done

    # Update agents
    echo ""
    echo "Updating Claude Code agents..."
    agent_files=(
        "context-fetcher.md" "file-creator.md" "git-workflow.md"
        "date-checker.md" "test-runner.md" "codebase-analyzer.md"
        "product-strategist.md" "tech-architect.md"
        "design-extractor.md" "ux-designer.md"
        "business-analyst.md" "validation-specialist.md"
    )

    for file in "${agent_files[@]}"; do
        update_file "$REPO_URL/.claude/agents/$file" \
                    ".claude/agents/$file" \
                    "agent: $file"
    done
fi

# Handle CLAUDE.md template update
echo ""
echo "Checking CLAUDE.md template..."
if [[ -f "CLAUDE.md" ]]; then
    update_file "$REPO_URL/CLAUDE.md" \
                "CLAUDE.md.template" \
                "CLAUDE.md template"
    echo "  Check CLAUDE.md.template for latest configuration options"
else
    update_file "$REPO_URL/CLAUDE.md" \
                "CLAUDE.md" \
                "CLAUDE.md"
    echo "  Please customize CLAUDE.md with your project-specific information"
fi

echo ""
echo "Specwright update complete!"
echo ""
echo "Your Specwright installation is now up to date!"
echo ""
echo "For more information: https://github.com/michsindlinger/specwright"
