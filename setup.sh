#!/bin/bash

# Specwright - Project Installation
# Installs core Specwright structure for spec-driven development
# Version: 3.0 - Open Source Core

set -e

REPO_URL="https://raw.githubusercontent.com/michsindlinger/specwright/main"
OVERWRITE_WORKFLOWS=false
OVERWRITE_STANDARDS=false

# Parse command line arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        --overwrite-workflows)
            OVERWRITE_WORKFLOWS=true
            shift
            ;;
        --overwrite-standards)
            OVERWRITE_STANDARDS=true
            shift
            ;;
        -h|--help)
            echo "Specwright - Project Installation"
            echo ""
            echo "Usage: $0 [options]"
            echo ""
            echo "Options:"
            echo "  --overwrite-workflows      Overwrite existing workflow files"
            echo "  --overwrite-standards      Overwrite existing standards files"
            echo "  -h, --help                 Show this help message"
            echo ""
            echo "Installs Specwright in current project."
            exit 0
            ;;
        *)
            echo "Unknown option: $1"
            echo "Use -h or --help for usage information"
            exit 1
            ;;
    esac
done

echo "Specwright v3.0 - Project Installation"
echo "Installing core structure in current project..."
echo ""

# Create project directories
echo "Creating directory structure..."
mkdir -p specwright/standards
mkdir -p specwright/workflows/core
mkdir -p specwright/workflows/meta
mkdir -p specwright/workflows/marketing
mkdir -p specwright/workflows/team
mkdir -p specwright/workflows/validation
mkdir -p specwright/scripts
mkdir -p specwright/templates
mkdir -p specwright/templates/product
mkdir -p specwright/docs

# Function to download file if it doesn't exist or if overwrite is enabled
download_file() {
    local url=$1
    local path=$2
    local category=$3

    if [[ -f "$path" ]]; then
        if [[ "$category" == "standards" && "$OVERWRITE_STANDARDS" == true ]] ||
           [[ "$category" == "workflows" && "$OVERWRITE_WORKFLOWS" == true ]]; then
            echo "Overwriting $path..."
            curl -sSL "$url" -o "$path"
        else
            echo "Skipping $path (already exists)"
        fi
    else
        echo "Downloading $path..."
        curl -sSL "$url" -o "$path"
    fi
}

# ===============================================================
# STANDARDS
# ===============================================================

echo ""
echo "=== Installing Standards ==="

download_file "$REPO_URL/specwright/standards/code-style.md" "specwright/standards/code-style.md" "standards"
download_file "$REPO_URL/specwright/standards/best-practices.md" "specwright/standards/best-practices.md" "standards"
download_file "$REPO_URL/specwright/standards/plan-review-guidelines.md" "specwright/standards/plan-review-guidelines.md" "standards"

# ===============================================================
# DOCS - Documentation and Guides
# ===============================================================

echo ""
echo "=== Installing Documentation ==="

download_file "$REPO_URL/specwright/docs/story-sizing-guidelines.md" "specwright/docs/story-sizing-guidelines.md" "docs"
download_file "$REPO_URL/specwright/docs/mcp-setup-guide.md" "specwright/docs/mcp-setup-guide.md" "docs"
download_file "$REPO_URL/specwright/docs/agent-learning-guide.md" "specwright/docs/agent-learning-guide.md" "docs"

# ===============================================================
# WORKFLOWS - Core Workflows
# ===============================================================

echo ""
echo "=== Installing Core Workflows ==="

# Meta workflow
download_file "$REPO_URL/specwright/workflows/meta/pre-flight.md" "specwright/workflows/meta/pre-flight.md" "workflows"

# Security
download_file "$REPO_URL/specwright/templates/product/secrets-template.md" "specwright/templates/product/secrets-template.md" "templates"

# Product planning
download_file "$REPO_URL/specwright/workflows/core/plan-product.md" "specwright/workflows/core/plan-product.md" "workflows"

# Platform planning
download_file "$REPO_URL/specwright/workflows/core/plan-platform.md" "specwright/workflows/core/plan-platform.md" "workflows"

# Team setup
download_file "$REPO_URL/specwright/workflows/core/build-development-team.md" "specwright/workflows/core/build-development-team.md" "workflows"

# Spec development
download_file "$REPO_URL/specwright/workflows/core/create-spec.md" "specwright/workflows/core/create-spec.md" "workflows"
download_file "$REPO_URL/specwright/workflows/core/add-story.md" "specwright/workflows/core/add-story.md" "workflows"
download_file "$REPO_URL/specwright/workflows/core/retroactive-doc.md" "specwright/workflows/core/retroactive-doc.md" "workflows"
download_file "$REPO_URL/specwright/workflows/core/retroactive-spec.md" "specwright/workflows/core/retroactive-spec.md" "workflows"

# Bug management
download_file "$REPO_URL/specwright/workflows/core/add-bug.md" "specwright/workflows/core/add-bug.md" "workflows"

# Task execution (Phase-based architecture v3.0)
mkdir -p specwright/workflows/core/execute-tasks
mkdir -p specwright/workflows/core/execute-tasks/shared
download_file "$REPO_URL/specwright/workflows/core/execute-tasks/entry-point.md" "specwright/workflows/core/execute-tasks/entry-point.md" "workflows"
download_file "$REPO_URL/specwright/workflows/core/execute-tasks/spec-phase-1.md" "specwright/workflows/core/execute-tasks/spec-phase-1.md" "workflows"
download_file "$REPO_URL/specwright/workflows/core/execute-tasks/spec-phase-2.md" "specwright/workflows/core/execute-tasks/spec-phase-2.md" "workflows"
download_file "$REPO_URL/specwright/workflows/core/execute-tasks/spec-phase-3.md" "specwright/workflows/core/execute-tasks/spec-phase-3.md" "workflows"
download_file "$REPO_URL/specwright/workflows/core/execute-tasks/spec-phase-4-5.md" "specwright/workflows/core/execute-tasks/spec-phase-4-5.md" "workflows"
download_file "$REPO_URL/specwright/workflows/core/execute-tasks/spec-phase-5.md" "specwright/workflows/core/execute-tasks/spec-phase-5.md" "workflows"
download_file "$REPO_URL/specwright/workflows/core/execute-tasks/backlog-phase-1.md" "specwright/workflows/core/execute-tasks/backlog-phase-1.md" "workflows"
download_file "$REPO_URL/specwright/workflows/core/execute-tasks/backlog-phase-2.md" "specwright/workflows/core/execute-tasks/backlog-phase-2.md" "workflows"
download_file "$REPO_URL/specwright/workflows/core/execute-tasks/backlog-phase-3.md" "specwright/workflows/core/execute-tasks/backlog-phase-3.md" "workflows"
download_file "$REPO_URL/specwright/workflows/core/execute-tasks/shared/resume-context.md" "specwright/workflows/core/execute-tasks/shared/resume-context.md" "workflows"
download_file "$REPO_URL/specwright/workflows/core/execute-tasks/shared/error-handling.md" "specwright/workflows/core/execute-tasks/shared/error-handling.md" "workflows"
download_file "$REPO_URL/specwright/workflows/core/execute-tasks/shared/skill-extraction.md" "specwright/workflows/core/execute-tasks/shared/skill-extraction.md" "workflows"

# Guidelines
mkdir -p specwright/workflows/core/guidelines
download_file "$REPO_URL/specwright/workflows/core/guidelines/model-selection.md" "specwright/workflows/core/guidelines/model-selection.md" "workflows"

# Backlog / Quick tasks
download_file "$REPO_URL/specwright/workflows/core/add-todo.md" "specwright/workflows/core/add-todo.md" "workflows"

# Brainstorming
download_file "$REPO_URL/specwright/workflows/core/start-brainstorming.md" "specwright/workflows/core/start-brainstorming.md" "workflows"
download_file "$REPO_URL/specwright/workflows/core/transfer-and-create-spec.md" "specwright/workflows/core/transfer-and-create-spec.md" "workflows"
download_file "$REPO_URL/specwright/workflows/core/transfer-and-create-bug.md" "specwright/workflows/core/transfer-and-create-bug.md" "workflows"
download_file "$REPO_URL/specwright/workflows/core/transfer-and-plan-product.md" "specwright/workflows/core/transfer-and-plan-product.md" "workflows"

# Skill management
download_file "$REPO_URL/specwright/workflows/core/add-skill.md" "specwright/workflows/core/add-skill.md" "workflows"

# Self-learning
download_file "$REPO_URL/specwright/workflows/core/add-learning.md" "specwright/workflows/core/add-learning.md" "workflows"
download_file "$REPO_URL/specwright/workflows/core/add-domain.md" "specwright/workflows/core/add-domain.md" "workflows"

# Spec management
download_file "$REPO_URL/specwright/workflows/core/change-spec.md" "specwright/workflows/core/change-spec.md" "workflows"
download_file "$REPO_URL/specwright/workflows/core/document-feature.md" "specwright/workflows/core/document-feature.md" "workflows"

# Analysis & Estimation
download_file "$REPO_URL/specwright/workflows/core/analyze-product.md" "specwright/workflows/core/analyze-product.md" "workflows"
download_file "$REPO_URL/specwright/workflows/core/analyze-feasibility.md" "specwright/workflows/core/analyze-feasibility.md" "workflows"
download_file "$REPO_URL/specwright/workflows/core/analyze-blockers.md" "specwright/workflows/core/analyze-blockers.md" "workflows"
download_file "$REPO_URL/specwright/workflows/core/estimate-spec.md" "specwright/workflows/core/estimate-spec.md" "workflows"
download_file "$REPO_URL/specwright/workflows/core/validate-estimation.md" "specwright/workflows/core/validate-estimation.md" "workflows"

# Feedback & Changelog
download_file "$REPO_URL/specwright/workflows/core/process-feedback.md" "specwright/workflows/core/process-feedback.md" "workflows"
download_file "$REPO_URL/specwright/workflows/core/update-changelog.md" "specwright/workflows/core/update-changelog.md" "workflows"

# Design extraction
download_file "$REPO_URL/specwright/workflows/core/extract-design.md" "specwright/workflows/core/extract-design.md" "workflows"

# Upselling brainstorming
download_file "$REPO_URL/specwright/workflows/core/brainstorm-upselling-ideas.md" "specwright/workflows/core/brainstorm-upselling-ideas.md" "workflows"

# Marketing workflows
download_file "$REPO_URL/specwright/workflows/marketing/create-instagram-account.md" "specwright/workflows/marketing/create-instagram-account.md" "workflows"
download_file "$REPO_URL/specwright/workflows/marketing/create-content-plan.md" "specwright/workflows/marketing/create-content-plan.md" "workflows"

# Team workflows
download_file "$REPO_URL/specwright/workflows/team/create-project-agents.md" "specwright/workflows/team/create-project-agents.md" "workflows"
download_file "$REPO_URL/specwright/workflows/team/assign-skills-to-agent.md" "specwright/workflows/team/assign-skills-to-agent.md" "workflows"

# Validation workflows
download_file "$REPO_URL/specwright/workflows/validation/validate-market.md" "specwright/workflows/validation/validate-market.md" "workflows"
download_file "$REPO_URL/specwright/workflows/validation/validate-market-for-existing.md" "specwright/workflows/validation/validate-market-for-existing.md" "workflows"
download_file "$REPO_URL/specwright/workflows/validation/README.md" "specwright/workflows/validation/README.md" "workflows"

# Automation script
download_file "$REPO_URL/specwright/scripts/auto-execute.sh" "specwright/scripts/auto-execute.sh" "workflows"
chmod +x specwright/scripts/auto-execute.sh

# ===============================================================
# CONFIGURATION
# ===============================================================

echo ""
echo "=== Setting up Configuration ==="

if [[ ! -f "specwright/config.yml" ]]; then
    cat > specwright/config.yml << 'EOF'
# Specwright Configuration
# Version: 3.0

# Project Information
project:
  name: "[PROJECT_NAME]"  # Customize this

# DevTeam System
devteam:
  enabled: false  # Set to true after /build-development-team

# Workflow Settings
workflows:
  auto_commit_per_story: true  # Git commit after each story completion

# Standards Lookup
standards:
  # Order: project first, then global fallback
  # Project: specwright/standards/code-style.md
  # Global: ~/.specwright/standards/code-style.md
  use_global_fallback: true
EOF
    echo "Created specwright/config.yml"
    echo "Customize project.name in specwright/config.yml"
else
    echo "Skipping specwright/config.yml (already exists)"
fi

# ===============================================================
# CLAUDE.md
# ===============================================================

echo ""
echo "=== Setting up CLAUDE.md ==="

if [[ -f "CLAUDE.md" ]]; then
    echo "CLAUDE.md already exists - creating CLAUDE.md.template for reference"
    download_file "$REPO_URL/CLAUDE.md" "CLAUDE.md.template" "claude"
    echo "Consider merging CLAUDE.md.template into your existing CLAUDE.md"
else
    echo "Creating CLAUDE.md from template..."
    download_file "$REPO_URL/CLAUDE.md" "CLAUDE.md" "claude"
    echo "Customize CLAUDE.md with your project-specific information"
fi

# ===============================================================
# MCP SERVER (OPTIONAL)
# ===============================================================

echo ""
echo "=== Installing Kanban MCP Server (optional) ==="

if command -v npx >/dev/null 2>&1; then
  echo "Installing Kanban MCP Server..."
  bash setup-mcp.sh
else
  echo "npx not found - MCP server installation skipped"
  echo "Install Node.js to enable MCP tools for kanban management"
  echo "You can run setup-mcp.sh manually later after installing Node.js"
fi

# ===============================================================
# SUMMARY
# ===============================================================

echo ""
echo "========================================="
echo "Specwright v3.0 Installed!"
echo "========================================="
echo ""
echo "Installed Structure:"
echo ""
echo "  specwright/"
echo "    ├── standards/              (3 core files)"
echo "    ├── workflows/core/         (29 core workflows)"
echo "    │   ├── execute-tasks/      (12 phase files)"
echo "    │   └── guidelines/         (1 file)"
echo "    ├── workflows/team/         (2 team workflows)"
echo "    ├── workflows/validation/   (3 validation workflows)"
echo "    ├── workflows/marketing/    (2 marketing workflows)"
echo "    ├── workflows/meta/         (1 meta workflow)"
echo "    ├── scripts/                (1 automation script)"
echo "    └── config.yml              (minimal configuration)"
echo ""
echo "  CLAUDE.md                     (project instructions template)"
echo ""
echo "Next Steps:"
echo ""
echo "1. Customize CLAUDE.md:"
echo "   nano CLAUDE.md"
echo ""
echo "2. Install Claude Code support:"
echo "   curl -sSL $REPO_URL/setup-claude-code.sh | bash"
echo ""
echo "3. Install global templates (recommended):"
echo "   curl -sSL $REPO_URL/setup-devteam-global.sh | bash"
echo ""
echo "4. Start your workflow:"
echo "   /plan-product        -> Product planning"
echo "   /plan-platform       -> Multi-module platform planning"
echo "   /build-development-team -> DevTeam setup"
echo ""
echo "5. Feature development:"
echo "   /create-spec         -> Create user stories"
echo "   /execute-tasks       -> Execute stories"
echo ""
echo "6. Quick tasks & bugs:"
echo "   /add-todo            -> Add quick task to backlog"
echo "   /add-bug             -> Add bug with root-cause analysis"
echo ""
echo "7. Brainstorming:"
echo "   /start-brainstorming -> Interactive idea exploration"
echo ""
echo "For more info: https://github.com/michsindlinger/specwright"
echo ""
