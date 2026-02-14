#!/bin/bash

# Market Validation System - Global Installation
# Installs to ~/.specwright/ and ~/.claude/ for use across all projects
# Version: 3.0

set -e

REPO_URL="https://raw.githubusercontent.com/michsindlinger/specwright/main"

echo "========================================="
echo "Market Validation System - Global Setup"
echo "========================================="
echo ""
echo "This installs market validation components to:"
echo "  ~/.specwright/          (templates, workflows)"
echo "  ~/.claude/              (agents, commands)"
echo ""

# Download helper function
download_file() {
    local url="$1"
    local dest="$2"
    local category="${3:-file}"

    if command -v curl &> /dev/null; then
        curl -sSL "$url" -o "$dest" 2>/dev/null || {
            echo "Warning: Failed to download $category: $dest"
            return 1
        }
    elif command -v wget &> /dev/null; then
        wget -q "$url" -O "$dest" 2>/dev/null || {
            echo "Warning: Failed to download $category: $dest"
            return 1
        }
    else
        echo "Error: Neither curl nor wget is available"
        exit 1
    fi
    echo "Downloaded $category: $(basename $dest)"
}

# Create global directory structure
echo "Creating global directory structure..."
mkdir -p ~/.specwright/templates/market-validation
mkdir -p ~/.specwright/workflows/validation
mkdir -p ~/.claude/agents
mkdir -p ~/.claude/commands/specwright

# Download Templates (7)
echo ""
echo "Downloading market validation templates..."

download_file "$REPO_URL/specwright/templates/market-validation/product-brief.md" \
  ~/.specwright/templates/market-validation/product-brief.md "template"

download_file "$REPO_URL/specwright/templates/market-validation/competitor-analysis.md" \
  ~/.specwright/templates/market-validation/competitor-analysis.md "template"

download_file "$REPO_URL/specwright/templates/market-validation/market-positioning.md" \
  ~/.specwright/templates/market-validation/market-positioning.md "template"

download_file "$REPO_URL/specwright/templates/market-validation/validation-plan.md" \
  ~/.specwright/templates/market-validation/validation-plan.md "template"

download_file "$REPO_URL/specwright/templates/market-validation/ad-campaigns.md" \
  ~/.specwright/templates/market-validation/ad-campaigns.md "template"

download_file "$REPO_URL/specwright/templates/market-validation/analytics-setup.md" \
  ~/.specwright/templates/market-validation/analytics-setup.md "template"

download_file "$REPO_URL/specwright/templates/market-validation/validation-results.md" \
  ~/.specwright/templates/market-validation/validation-results.md "template"

# Download Workflows (2)
echo ""
echo "Downloading market validation workflows..."

download_file "$REPO_URL/specwright/workflows/validation/validate-market.md" \
  ~/.specwright/workflows/validation/validate-market.md "workflow"

download_file "$REPO_URL/specwright/workflows/validation/validate-market-for-existing.md" \
  ~/.specwright/workflows/validation/validate-market-for-existing.md "workflow"

download_file "$REPO_URL/specwright/workflows/validation/README.md" \
  ~/.specwright/workflows/validation/README.md "documentation"

# Download Agents (core + marketing-system specialists)
echo ""
echo "Downloading market validation agents..."

download_file "$REPO_URL/.claude/agents/product-strategist.md" \
  ~/.claude/agents/product-strategist.md "agent"

download_file "$REPO_URL/.claude/agents/validation-specialist.md" \
  ~/.claude/agents/validation-specialist.md "agent"

download_file "$REPO_URL/.claude/agents/business-analyst.md" \
  ~/.claude/agents/business-analyst.md "agent"

# Marketing-system specialist agents (required for validate-market workflow)
download_file "$REPO_URL/.claude/agents/marketing-system__product-idea-refiner.md" \
  ~/.claude/agents/marketing-system__product-idea-refiner.md "agent"

download_file "$REPO_URL/.claude/agents/marketing-system__market-researcher.md" \
  ~/.claude/agents/marketing-system__market-researcher.md "agent"

download_file "$REPO_URL/.claude/agents/marketing-system__product-strategist.md" \
  ~/.claude/agents/marketing-system__product-strategist.md "agent"

download_file "$REPO_URL/.claude/agents/marketing-system__content-creator.md" \
  ~/.claude/agents/marketing-system__content-creator.md "agent"

download_file "$REPO_URL/.claude/agents/marketing-system__seo-expert.md" \
  ~/.claude/agents/marketing-system__seo-expert.md "agent"

download_file "$REPO_URL/.claude/agents/marketing-system__landing-page-builder.md" \
  ~/.claude/agents/marketing-system__landing-page-builder.md "agent"

download_file "$REPO_URL/.claude/agents/marketing-system__quality-assurance.md" \
  ~/.claude/agents/marketing-system__quality-assurance.md "agent"

# Download Commands
echo ""
echo "Downloading /validate-market commands..."

download_file "$REPO_URL/.claude/commands/specwright/validate-market.md" \
  ~/.claude/commands/specwright/validate-market.md "command"

download_file "$REPO_URL/.claude/commands/specwright/validate-market-for-existing.md" \
  ~/.claude/commands/specwright/validate-market-for-existing.md "command"

echo ""
echo "Market Validation System (Global) installed!"
echo ""
echo "Installed to:"
echo "  ~/.specwright/templates/market-validation/  - 7 templates"
echo "  ~/.specwright/workflows/validation/         - validation workflows"
echo "  ~/.claude/agents/                           - specialist agents"
echo "  ~/.claude/commands/specwright/              - /validate-market commands"
echo ""
echo "Usage in ANY project:"
echo "  /validate-market \"Your product idea\""
echo "  /validate-market-for-existing \"Your existing product\""
echo ""
echo "For more info: https://github.com/michsindlinger/specwright"
echo ""
