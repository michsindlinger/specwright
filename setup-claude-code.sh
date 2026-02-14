#!/bin/bash

# Specwright - Claude Code Setup
# Installs Claude Code specific commands and agents
# Version: 3.0 - Open Source Core

set -e

REPO_URL="https://raw.githubusercontent.com/michsindlinger/specwright/main"

echo "Specwright - Claude Code Setup"
echo "Installing Claude Code configuration in current project..."
echo ""

# Check if base Specwright is installed in project
if [[ ! -d "specwright/workflows" ]]; then
    echo "Error: Specwright base installation not found in current project."
    echo ""
    echo "Please run the base setup first:"
    echo "  curl -sSL $REPO_URL/setup.sh | bash"
    echo ""
    exit 1
fi

# Create Claude Code specific directories
echo "Creating Claude Code directories..."
mkdir -p .claude/commands/specwright
mkdir -p .claude/agents

# Function to download file
download_file() {
    local url=$1
    local path=$2

    echo "Downloading $path..."
    curl -sSL "$url" -o "$path"
}

# ===============================================================
# COMMANDS - Core Commands (21)
# ===============================================================

echo ""
echo "=== Installing Core Commands ==="

command_files=(
    # Product planning
    "plan-product.md"
    "plan-platform.md"

    # Spec development
    "create-spec.md"
    "change-spec.md"

    # Stories & Bugs
    "add-story.md"
    "add-bug.md"
    "add-todo.md"

    # Task execution
    "execute-tasks.md"

    # Documentation
    "retroactive-doc.md"
    "retroactive-spec.md"
    "document-feature.md"

    # Team setup
    "build-development-team.md"
    "create-project-agents.md"
    "assign-skills-to-agent.md"
    "add-skill.md"

    # Self-Learning
    "add-learning.md"
    "add-domain.md"

    # Brainstorming
    "start-brainstorming.md"
    "brainstorm-upselling-ideas.md"

    # Validation
    "validate-market.md"
    "validate-market-for-existing.md"

    # Transfer
    "transfer-and-create-spec.md"
    "transfer-and-create-bug.md"
    "transfer-and-plan-product.md"

    # Analysis & Estimation
    "analyze-product.md"
    "analyze-feasibility.md"
    "analyze-blockers.md"
    "estimate-spec.md"
    "validate-estimation.md"

    # Feedback & Changelog
    "process-feedback.md"
    "update-changelog.md"

    # Design extraction
    "extract-design.md"

    # Marketing
    "create-instagram-account.md"
    "create-content-plan.md"
)

for file in "${command_files[@]}"; do
    download_file "$REPO_URL/.claude/commands/specwright/$file" ".claude/commands/specwright/$file"
done

# ===============================================================
# SKILLS - User-Invocable Skills
# ===============================================================

echo ""
echo "=== Installing Skills ==="

mkdir -p .claude/skills/review-implementation-plan

download_file "$REPO_URL/.claude/skills/review-implementation-plan/SKILL.md" ".claude/skills/review-implementation-plan/SKILL.md"

# ===============================================================
# AGENTS - Utility Agents
# ===============================================================

echo ""
echo "=== Installing Utility Agents ==="

# Core utility agents
download_file "$REPO_URL/.claude/agents/context-fetcher.md" ".claude/agents/context-fetcher.md"
download_file "$REPO_URL/.claude/agents/file-creator.md" ".claude/agents/file-creator.md"
download_file "$REPO_URL/.claude/agents/git-workflow.md" ".claude/agents/git-workflow.md"
download_file "$REPO_URL/.claude/agents/date-checker.md" ".claude/agents/date-checker.md"
download_file "$REPO_URL/.claude/agents/test-runner.md" ".claude/agents/test-runner.md"
download_file "$REPO_URL/.claude/agents/codebase-analyzer.md" ".claude/agents/codebase-analyzer.md"

# Product planning agents
download_file "$REPO_URL/.claude/agents/product-strategist.md" ".claude/agents/product-strategist.md"
download_file "$REPO_URL/.claude/agents/tech-architect.md" ".claude/agents/tech-architect.md"
download_file "$REPO_URL/.claude/agents/design-extractor.md" ".claude/agents/design-extractor.md"
download_file "$REPO_URL/.claude/agents/ux-designer.md" ".claude/agents/ux-designer.md"
download_file "$REPO_URL/.claude/agents/business-analyst.md" ".claude/agents/business-analyst.md"
download_file "$REPO_URL/.claude/agents/validation-specialist.md" ".claude/agents/validation-specialist.md"
download_file "$REPO_URL/.claude/agents/estimation-specialist.md" ".claude/agents/estimation-specialist.md"

# ===============================================================
# SUMMARY
# ===============================================================

echo ""
echo "=================================="
echo "Claude Code Setup Complete!"
echo "=================================="
echo ""
echo "Installed Structure:"
echo ""
echo "  .claude/"
echo "    ├── commands/specwright/   (34 commands)"
echo "    ├── skills/              (1 user-invocable skill)"
echo "    └── agents/              (13 utility agents)"
echo ""
echo "Available Commands:"
echo ""
echo "  Product Planning:"
echo "    /plan-product             -> Single-product planning"
echo "    /plan-platform            -> Multi-module platform planning"
echo ""
echo "  Team Setup:"
echo "    /build-development-team   -> Create skills for main agent"
echo "    /create-project-agents    -> Create project-specific agents"
echo "    /assign-skills-to-agent   -> Assign skills to agents"
echo ""
echo "  Feature Development:"
echo "    /create-spec              -> Create spec with user stories"
echo "    /add-story [spec]         -> Add story to existing spec"
echo "    /retroactive-doc          -> Document existing features"
echo "    /retroactive-spec         -> Create spec from existing code"
echo ""
echo "  Bug Management:"
echo "    /add-bug                  -> Add bug with root-cause analysis"
echo ""
echo "  Quick Tasks:"
echo "    /add-todo                 -> Add lightweight task to backlog"
echo ""
echo "  Execution:"
echo "    /execute-tasks            -> Execute stories directly"
echo "    /execute-tasks backlog    -> Execute quick tasks from backlog"
echo ""
echo "  Self-Learning:"
echo "    /add-learning             -> Add insight to skill dos-and-donts.md"
echo "    /add-domain               -> Add business domain documentation"
echo ""
echo "  Spec Management:"
echo "    /change-spec              -> Change existing spec (add/modify/remove)"
echo "    /document-feature         -> Document completed features"
echo ""
echo "  Analysis & Estimation:"
echo "    /analyze-product          -> Analyze existing codebase for Specwright"
echo "    /analyze-feasibility      -> Feasibility analysis on product brief"
echo "    /analyze-blockers         -> External blocker analysis"
echo "    /estimate-spec            -> Effort estimation for spec"
echo "    /validate-estimation      -> Validate existing estimation"
echo ""
echo "  Feedback & Changelog:"
echo "    /process-feedback         -> Categorize customer feedback"
echo "    /update-changelog         -> Generate bilingual changelog"
echo ""
echo "  Brainstorming:"
echo "    /start-brainstorming      -> Interactive idea exploration"
echo "    /brainstorm-upselling-ideas -> Brainstorm upselling opportunities"
echo "    /transfer-and-create-spec -> Convert brainstorming to spec"
echo "    /transfer-and-create-bug  -> Convert brainstorming to bug report"
echo "    /transfer-and-plan-product -> Convert brainstorming to product plan"
echo ""
echo "  Market Validation:"
echo "    /validate-market          -> Validate new product ideas"
echo "    /validate-market-for-existing -> Validate existing products"
echo ""
echo "  Design & Marketing:"
echo "    /extract-design           -> Extract design system from URL"
echo "    /create-instagram-account -> Instagram marketing strategy"
echo "    /create-content-plan      -> 7-day Instagram content plan"
echo ""
echo "  Skill Management:"
echo "    /add-skill                -> Create custom skills"
echo ""
echo "  Plan Review:"
echo "    /review-implementation-plan -> Review implementation plans"
echo ""
echo "Recommended Workflow:"
echo ""
echo "1. /plan-product -> Product vision, tech stack, roadmap"
echo "2. /build-development-team -> Skills and quality gates"
echo "3. /create-spec -> User stories with DoR/DoD"
echo "4. /execute-tasks -> Direct execution with self-review"
echo ""
echo "For more info: https://github.com/michsindlinger/specwright"
echo ""
