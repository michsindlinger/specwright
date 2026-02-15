#!/bin/bash

# Agent OS DevTeam System - Global Installation
# Installs standards and templates to ~/.agent-os/ as fallback for all projects
# Version: 4.0 - JSON Kanban Migration + New skill structure for Direct Execution

set -e

REPO_URL="https://raw.githubusercontent.com/michsindlinger/agent-os-extended/main"

echo "========================================="
echo "Agent OS DevTeam - Global Installation"
echo "========================================="
echo ""
echo "This installs to ~/.agent-os/:"
echo "  • Global coding standards (fallback)"
echo "  • All DevTeam templates (~80 files)"
echo ""

# Download helper function
download_file() {
    local url="$1"
    local dest="$2"
    local category="${3:-file}"

    if command -v curl &> /dev/null; then
        curl -sSL "$url" -o "$dest" 2>/dev/null || {
            echo "⚠ Warning: Failed to download $category: $dest"
            return 1
        }
    elif command -v wget &> /dev/null; then
        wget -q "$url" -O "$dest" 2>/dev/null || {
            echo "⚠ Warning: Failed to download $category: $dest"
            return 1
        }
    else
        echo "Error: Neither curl nor wget is available"
        exit 1
    fi
    echo "✓ Downloaded: $(basename $dest)"
}

# Global installation directory
GLOBAL_DIR="$HOME/.agent-os"

echo "Installing to: $GLOBAL_DIR"
echo ""

# Create directory structure
echo "Creating global directory structure..."
mkdir -p "$GLOBAL_DIR/standards"
mkdir -p "$GLOBAL_DIR/templates/product"
mkdir -p "$GLOBAL_DIR/templates/platform"
mkdir -p "$GLOBAL_DIR/agents"
# v3.0: New skill structure - one skill per technology
mkdir -p "$GLOBAL_DIR/templates/skills/quality-gates"
mkdir -p "$GLOBAL_DIR/templates/skills/po-requirements"
mkdir -p "$GLOBAL_DIR/templates/skills/architect-refinement"
mkdir -p "$GLOBAL_DIR/templates/skills/frontend/angular"
mkdir -p "$GLOBAL_DIR/templates/skills/frontend/react"
mkdir -p "$GLOBAL_DIR/templates/skills/frontend/vue"
mkdir -p "$GLOBAL_DIR/templates/skills/backend/rails"
mkdir -p "$GLOBAL_DIR/templates/skills/backend/nestjs"
mkdir -p "$GLOBAL_DIR/templates/skills/backend/spring"
mkdir -p "$GLOBAL_DIR/templates/skills/devops/docker-github"
mkdir -p "$GLOBAL_DIR/templates/skills/domain"
# Platform and orchestration skills (unchanged)
mkdir -p "$GLOBAL_DIR/templates/skills/orchestration"
mkdir -p "$GLOBAL_DIR/templates/skills/platform"
mkdir -p "$GLOBAL_DIR/templates/skills/skill"
mkdir -p "$GLOBAL_DIR/templates/skills"
mkdir -p "$GLOBAL_DIR/templates/docs"
mkdir -p "$GLOBAL_DIR/templates/json"
mkdir -p "$GLOBAL_DIR/templates/schemas"
mkdir -p "$GLOBAL_DIR/templates/feasibility"

# ═══════════════════════════════════════════════════════════
# STANDARDS
# ═══════════════════════════════════════════════════════════

echo ""
echo "═══ Installing Global Standards ═══"

download_file "$REPO_URL/agent-os/standards/code-style.md" \
  "$GLOBAL_DIR/standards/code-style.md" "code-style"

download_file "$REPO_URL/agent-os/standards/best-practices.md" \
  "$GLOBAL_DIR/standards/best-practices.md" "best-practices"

download_file "$REPO_URL/agent-os/standards/tech-stack.md" \
  "$GLOBAL_DIR/standards/tech-stack.md" "tech-stack template"

download_file "$REPO_URL/agent-os/standards/plan-review-guidelines.md" \
  "$GLOBAL_DIR/standards/plan-review-guidelines.md" "plan-review-guidelines"

# ═══════════════════════════════════════════════════════════
# TEMPLATES (~80 files including skill SKILL.md files)
# ═══════════════════════════════════════════════════════════

echo ""
echo "═══ Installing Templates (~80 files) ═══"

# CLAUDE templates (2)
echo "→ CLAUDE templates (2)..."
download_file "$REPO_URL/agent-os/templates/CLAUDE-LITE.md" "$GLOBAL_DIR/templates/CLAUDE-LITE.md"
download_file "$REPO_URL/agent-os/templates/CLAUDE-PLATFORM.md" "$GLOBAL_DIR/templates/CLAUDE-PLATFORM.md"

# Product templates (10)
echo "→ Product templates (10)..."
download_file "$REPO_URL/agent-os/templates/product/product-brief-template.md" "$GLOBAL_DIR/templates/product/product-brief-template.md"
download_file "$REPO_URL/agent-os/templates/product/product-brief-lite-template.md" "$GLOBAL_DIR/templates/product/product-brief-lite-template.md"
download_file "$REPO_URL/agent-os/templates/product/tech-stack-template.md" "$GLOBAL_DIR/templates/product/tech-stack-template.md"
download_file "$REPO_URL/agent-os/templates/product/roadmap-template.md" "$GLOBAL_DIR/templates/product/roadmap-template.md"
download_file "$REPO_URL/agent-os/templates/product/architecture-decision-template.md" "$GLOBAL_DIR/templates/product/architecture-decision-template.md"
download_file "$REPO_URL/agent-os/templates/product/boilerplate-structure-template.md" "$GLOBAL_DIR/templates/product/boilerplate-structure-template.md"
download_file "$REPO_URL/agent-os/templates/product/design-system-template.md" "$GLOBAL_DIR/templates/product/design-system-template.md"
download_file "$REPO_URL/agent-os/templates/product/ux-patterns-template.md" "$GLOBAL_DIR/templates/product/ux-patterns-template.md"
download_file "$REPO_URL/agent-os/templates/product/blocker-analysis-template.md" "$GLOBAL_DIR/templates/product/blocker-analysis-template.md"
download_file "$REPO_URL/agent-os/templates/product/milestone-plan-template.md" "$GLOBAL_DIR/templates/product/milestone-plan-template.md"

# Feasibility templates (1)
echo "→ Feasibility templates (1)..."
download_file "$REPO_URL/agent-os/templates/feasibility/feasibility-report.md" "$GLOBAL_DIR/templates/feasibility/feasibility-report.md"

# Platform templates (7)
echo "→ Platform templates (7)..."
download_file "$REPO_URL/agent-os/templates/platform/platform-brief-template.md" "$GLOBAL_DIR/templates/platform/platform-brief-template.md"
download_file "$REPO_URL/agent-os/templates/platform/module-brief-template.md" "$GLOBAL_DIR/templates/platform/module-brief-template.md"
download_file "$REPO_URL/agent-os/templates/platform/module-dependencies-template.md" "$GLOBAL_DIR/templates/platform/module-dependencies-template.md"
download_file "$REPO_URL/agent-os/templates/platform/platform-architecture-template.md" "$GLOBAL_DIR/templates/platform/platform-architecture-template.md"
download_file "$REPO_URL/agent-os/templates/platform/platform-roadmap-template.md" "$GLOBAL_DIR/templates/platform/platform-roadmap-template.md"
download_file "$REPO_URL/agent-os/templates/platform/module-roadmap-template.md" "$GLOBAL_DIR/templates/platform/module-roadmap-template.md"
download_file "$REPO_URL/agent-os/templates/platform/platform-blocker-analysis-template.md" "$GLOBAL_DIR/templates/platform/platform-blocker-analysis-template.md"

# Global agents (1)
echo "→ Global agents (1)..."
download_file "$REPO_URL/.agent-os/agents/platform-architect.md" "$GLOBAL_DIR/agents/platform-architect.md"

# DevTeam v3.0: Universal Skills (always created)
# Quality Gates (1 file)
echo "→ Quality Gates skill (1 file)..."
download_file "$REPO_URL/agent-os/templates/skills/quality-gates/SKILL.md" "$GLOBAL_DIR/templates/skills/quality-gates/SKILL.md"

# PO Requirements (1 file) - for story creation
echo "→ PO Requirements skill (1 file)..."
download_file "$REPO_URL/agent-os/templates/skills/po-requirements/SKILL.md" "$GLOBAL_DIR/templates/skills/po-requirements/SKILL.md"

# Architect Refinement (1 file) - for technical refinement
echo "→ Architect Refinement skill (1 file)..."
download_file "$REPO_URL/agent-os/templates/skills/architect-refinement/SKILL.md" "$GLOBAL_DIR/templates/skills/architect-refinement/SKILL.md"

# DevTeam v3.0: Technology Skills

# Frontend Angular (6 files)
echo "→ Frontend Angular skill (6 files)..."
download_file "$REPO_URL/agent-os/templates/skills/frontend/angular/SKILL.md" "$GLOBAL_DIR/templates/skills/frontend/angular/SKILL.md"
download_file "$REPO_URL/agent-os/templates/skills/frontend/angular/components.md" "$GLOBAL_DIR/templates/skills/frontend/angular/components.md"
download_file "$REPO_URL/agent-os/templates/skills/frontend/angular/state-management.md" "$GLOBAL_DIR/templates/skills/frontend/angular/state-management.md"
download_file "$REPO_URL/agent-os/templates/skills/frontend/angular/api-integration.md" "$GLOBAL_DIR/templates/skills/frontend/angular/api-integration.md"
download_file "$REPO_URL/agent-os/templates/skills/frontend/angular/forms-validation.md" "$GLOBAL_DIR/templates/skills/frontend/angular/forms-validation.md"
download_file "$REPO_URL/agent-os/templates/skills/frontend/angular/dos-and-donts.md" "$GLOBAL_DIR/templates/skills/frontend/angular/dos-and-donts.md"

# Frontend React (6 files)
echo "→ Frontend React skill (6 files)..."
download_file "$REPO_URL/agent-os/templates/skills/frontend/react/SKILL.md" "$GLOBAL_DIR/templates/skills/frontend/react/SKILL.md"
download_file "$REPO_URL/agent-os/templates/skills/frontend/react/components.md" "$GLOBAL_DIR/templates/skills/frontend/react/components.md"
download_file "$REPO_URL/agent-os/templates/skills/frontend/react/state-management.md" "$GLOBAL_DIR/templates/skills/frontend/react/state-management.md"
download_file "$REPO_URL/agent-os/templates/skills/frontend/react/api-integration.md" "$GLOBAL_DIR/templates/skills/frontend/react/api-integration.md"
download_file "$REPO_URL/agent-os/templates/skills/frontend/react/forms-validation.md" "$GLOBAL_DIR/templates/skills/frontend/react/forms-validation.md"
download_file "$REPO_URL/agent-os/templates/skills/frontend/react/dos-and-donts.md" "$GLOBAL_DIR/templates/skills/frontend/react/dos-and-donts.md"

# Frontend Vue (6 files)
echo "→ Frontend Vue skill (6 files)..."
download_file "$REPO_URL/agent-os/templates/skills/frontend/vue/SKILL.md" "$GLOBAL_DIR/templates/skills/frontend/vue/SKILL.md"
download_file "$REPO_URL/agent-os/templates/skills/frontend/vue/components.md" "$GLOBAL_DIR/templates/skills/frontend/vue/components.md"
download_file "$REPO_URL/agent-os/templates/skills/frontend/vue/state-management.md" "$GLOBAL_DIR/templates/skills/frontend/vue/state-management.md"
download_file "$REPO_URL/agent-os/templates/skills/frontend/vue/api-integration.md" "$GLOBAL_DIR/templates/skills/frontend/vue/api-integration.md"
download_file "$REPO_URL/agent-os/templates/skills/frontend/vue/forms-validation.md" "$GLOBAL_DIR/templates/skills/frontend/vue/forms-validation.md"
download_file "$REPO_URL/agent-os/templates/skills/frontend/vue/dos-and-donts.md" "$GLOBAL_DIR/templates/skills/frontend/vue/dos-and-donts.md"

# Backend Rails (6 files)
echo "→ Backend Rails skill (6 files)..."
download_file "$REPO_URL/agent-os/templates/skills/backend/rails/SKILL.md" "$GLOBAL_DIR/templates/skills/backend/rails/SKILL.md"
download_file "$REPO_URL/agent-os/templates/skills/backend/rails/services.md" "$GLOBAL_DIR/templates/skills/backend/rails/services.md"
download_file "$REPO_URL/agent-os/templates/skills/backend/rails/models.md" "$GLOBAL_DIR/templates/skills/backend/rails/models.md"
download_file "$REPO_URL/agent-os/templates/skills/backend/rails/api-design.md" "$GLOBAL_DIR/templates/skills/backend/rails/api-design.md"
download_file "$REPO_URL/agent-os/templates/skills/backend/rails/testing.md" "$GLOBAL_DIR/templates/skills/backend/rails/testing.md"
download_file "$REPO_URL/agent-os/templates/skills/backend/rails/dos-and-donts.md" "$GLOBAL_DIR/templates/skills/backend/rails/dos-and-donts.md"

# Backend NestJS (6 files)
echo "→ Backend NestJS skill (6 files)..."
download_file "$REPO_URL/agent-os/templates/skills/backend/nestjs/SKILL.md" "$GLOBAL_DIR/templates/skills/backend/nestjs/SKILL.md"
download_file "$REPO_URL/agent-os/templates/skills/backend/nestjs/services.md" "$GLOBAL_DIR/templates/skills/backend/nestjs/services.md"
download_file "$REPO_URL/agent-os/templates/skills/backend/nestjs/models.md" "$GLOBAL_DIR/templates/skills/backend/nestjs/models.md"
download_file "$REPO_URL/agent-os/templates/skills/backend/nestjs/api-design.md" "$GLOBAL_DIR/templates/skills/backend/nestjs/api-design.md"
download_file "$REPO_URL/agent-os/templates/skills/backend/nestjs/testing.md" "$GLOBAL_DIR/templates/skills/backend/nestjs/testing.md"
download_file "$REPO_URL/agent-os/templates/skills/backend/nestjs/dos-and-donts.md" "$GLOBAL_DIR/templates/skills/backend/nestjs/dos-and-donts.md"

# Backend Spring (6 files)
echo "→ Backend Spring skill (6 files)..."
download_file "$REPO_URL/agent-os/templates/skills/backend/spring/SKILL.md" "$GLOBAL_DIR/templates/skills/backend/spring/SKILL.md"
download_file "$REPO_URL/agent-os/templates/skills/backend/spring/services.md" "$GLOBAL_DIR/templates/skills/backend/spring/services.md"
download_file "$REPO_URL/agent-os/templates/skills/backend/spring/models.md" "$GLOBAL_DIR/templates/skills/backend/spring/models.md"
download_file "$REPO_URL/agent-os/templates/skills/backend/spring/api-design.md" "$GLOBAL_DIR/templates/skills/backend/spring/api-design.md"
download_file "$REPO_URL/agent-os/templates/skills/backend/spring/testing.md" "$GLOBAL_DIR/templates/skills/backend/spring/testing.md"
download_file "$REPO_URL/agent-os/templates/skills/backend/spring/dos-and-donts.md" "$GLOBAL_DIR/templates/skills/backend/spring/dos-and-donts.md"

# DevOps Docker/GitHub (4 files)
echo "→ DevOps Docker/GitHub skill (4 files)..."
download_file "$REPO_URL/agent-os/templates/skills/devops/docker-github/SKILL.md" "$GLOBAL_DIR/templates/skills/devops/docker-github/SKILL.md"
download_file "$REPO_URL/agent-os/templates/skills/devops/docker-github/docker.md" "$GLOBAL_DIR/templates/skills/devops/docker-github/docker.md"
download_file "$REPO_URL/agent-os/templates/skills/devops/docker-github/ci-cd.md" "$GLOBAL_DIR/templates/skills/devops/docker-github/ci-cd.md"
download_file "$REPO_URL/agent-os/templates/skills/devops/docker-github/dos-and-donts.md" "$GLOBAL_DIR/templates/skills/devops/docker-github/dos-and-donts.md"

# Domain skill templates (2 files)
echo "→ Domain skill templates (2 files)..."
download_file "$REPO_URL/agent-os/templates/skills/domain/SKILL.md" "$GLOBAL_DIR/templates/skills/domain/SKILL.md"
download_file "$REPO_URL/agent-os/templates/skills/domain/process.md" "$GLOBAL_DIR/templates/skills/domain/process.md"

# Custom skill templates (3 files) - for specialized technologies
echo "→ Custom skill templates (3 files)..."
download_file "$REPO_URL/agent-os/templates/skills/custom-skill-template.md" "$GLOBAL_DIR/templates/skills/custom-skill-template.md"
download_file "$REPO_URL/agent-os/templates/skills/custom-skill-module-template.md" "$GLOBAL_DIR/templates/skills/custom-skill-module-template.md"
download_file "$REPO_URL/agent-os/templates/skills/custom-skill-dos-and-donts-template.md" "$GLOBAL_DIR/templates/skills/custom-skill-dos-and-donts-template.md"

# Platform skills (4) - NEW STRUCTURE: each skill in own directory with SKILL.md
echo "→ Platform skill templates (4)..."
mkdir -p "$GLOBAL_DIR/templates/skills/platform/system-integration-patterns"
mkdir -p "$GLOBAL_DIR/templates/skills/platform/dependency-management"
mkdir -p "$GLOBAL_DIR/templates/skills/platform/modular-architecture"
mkdir -p "$GLOBAL_DIR/templates/skills/platform/platform-scalability"
download_file "$REPO_URL/agent-os/templates/skills/platform/system-integration-patterns/SKILL.md" "$GLOBAL_DIR/templates/skills/platform/system-integration-patterns/SKILL.md"
download_file "$REPO_URL/agent-os/templates/skills/platform/dependency-management/SKILL.md" "$GLOBAL_DIR/templates/skills/platform/dependency-management/SKILL.md"
download_file "$REPO_URL/agent-os/templates/skills/platform/modular-architecture/SKILL.md" "$GLOBAL_DIR/templates/skills/platform/modular-architecture/SKILL.md"
download_file "$REPO_URL/agent-os/templates/skills/platform/platform-scalability/SKILL.md" "$GLOBAL_DIR/templates/skills/platform/platform-scalability/SKILL.md"

# Orchestration skill (1)
echo "→ Orchestration skill template (1)..."
mkdir -p "$GLOBAL_DIR/templates/skills/orchestration/orchestration"
download_file "$REPO_URL/agent-os/templates/skills/orchestration/orchestration/SKILL.md" "$GLOBAL_DIR/templates/skills/orchestration/orchestration/SKILL.md"

# Generic skill template (1)
echo "→ Generic skill template (1)..."
mkdir -p "$GLOBAL_DIR/templates/skills/generic-skill"
download_file "$REPO_URL/agent-os/templates/skills/generic-skill/SKILL.md" "$GLOBAL_DIR/templates/skills/generic-skill/SKILL.md"

# Base skill template (1) - YAML frontmatter template
echo "→ Base skill template (1)..."
download_file "$REPO_URL/agent-os/templates/skills/skill/SKILL.md" "$GLOBAL_DIR/templates/skills/skill/SKILL.md"

# Additional root-level skills (4)
echo "→ Additional skill templates (4)..."
mkdir -p "$GLOBAL_DIR/templates/skills/api-implementation-patterns"
mkdir -p "$GLOBAL_DIR/templates/skills/component-architecture"
mkdir -p "$GLOBAL_DIR/templates/skills/deployment-automation"
mkdir -p "$GLOBAL_DIR/templates/skills/file-organization-patterns"
mkdir -p "$GLOBAL_DIR/templates/skills/testing-strategies"
download_file "$REPO_URL/agent-os/templates/skills/api-implementation-patterns/SKILL.md" "$GLOBAL_DIR/templates/skills/api-implementation-patterns/SKILL.md"
download_file "$REPO_URL/agent-os/templates/skills/component-architecture/SKILL.md" "$GLOBAL_DIR/templates/skills/component-architecture/SKILL.md"
download_file "$REPO_URL/agent-os/templates/skills/deployment-automation/SKILL.md" "$GLOBAL_DIR/templates/skills/deployment-automation/SKILL.md"
download_file "$REPO_URL/agent-os/templates/skills/file-organization-patterns/SKILL.md" "$GLOBAL_DIR/templates/skills/file-organization-patterns/SKILL.md"
download_file "$REPO_URL/agent-os/templates/skills/testing-strategies/SKILL.md" "$GLOBAL_DIR/templates/skills/testing-strategies/SKILL.md"

# Documentation templates (15)
echo "→ Documentation templates (15)..."
download_file "$REPO_URL/agent-os/templates/docs/spec-template.md" "$GLOBAL_DIR/templates/docs/spec-template.md"
download_file "$REPO_URL/agent-os/templates/docs/spec-lite-template.md" "$GLOBAL_DIR/templates/docs/spec-lite-template.md"
download_file "$REPO_URL/agent-os/templates/docs/user-stories-template.md" "$GLOBAL_DIR/templates/docs/user-stories-template.md"
download_file "$REPO_URL/agent-os/templates/docs/story-template.md" "$GLOBAL_DIR/templates/docs/story-template.md"
download_file "$REPO_URL/agent-os/templates/docs/story-index-template.md" "$GLOBAL_DIR/templates/docs/story-index-template.md"
download_file "$REPO_URL/agent-os/templates/docs/backlog-story-index-template.md" "$GLOBAL_DIR/templates/docs/backlog-story-index-template.md"
download_file "$REPO_URL/agent-os/templates/docs/cross-cutting-decisions-template.md" "$GLOBAL_DIR/templates/docs/cross-cutting-decisions-template.md"
download_file "$REPO_URL/agent-os/templates/docs/bug-description-template.md" "$GLOBAL_DIR/templates/docs/bug-description-template.md"
download_file "$REPO_URL/agent-os/templates/docs/kanban-board-template.md" "$GLOBAL_DIR/templates/docs/kanban-board-template.md"
download_file "$REPO_URL/agent-os/templates/docs/handover-doc-template.md" "$GLOBAL_DIR/templates/docs/handover-doc-template.md"
download_file "$REPO_URL/agent-os/templates/docs/changelog-entry-template.md" "$GLOBAL_DIR/templates/docs/changelog-entry-template.md"
download_file "$REPO_URL/agent-os/templates/docs/dod-template.md" "$GLOBAL_DIR/templates/docs/dod-template.md"
download_file "$REPO_URL/agent-os/templates/docs/dor-template.md" "$GLOBAL_DIR/templates/docs/dor-template.md"
download_file "$REPO_URL/agent-os/templates/docs/effort-estimation-template.md" "$GLOBAL_DIR/templates/docs/effort-estimation-template.md"
download_file "$REPO_URL/agent-os/templates/docs/implementation-plan-template.md" "$GLOBAL_DIR/templates/docs/implementation-plan-template.md"
download_file "$REPO_URL/agent-os/templates/docs/test-scenarios-template.md" "$GLOBAL_DIR/templates/docs/test-scenarios-template.md"
download_file "$REPO_URL/agent-os/templates/docs/user-todos-template.md" "$GLOBAL_DIR/templates/docs/user-todos-template.md"

# JSON templates (3) - v4.0 Kanban Migration
echo "→ JSON templates (3)..."
download_file "$REPO_URL/agent-os/templates/json/backlog-template.json" "$GLOBAL_DIR/templates/json/backlog-template.json"
download_file "$REPO_URL/agent-os/templates/json/execution-kanban-template.json" "$GLOBAL_DIR/templates/json/execution-kanban-template.json"
download_file "$REPO_URL/agent-os/templates/json/spec-kanban-template.json" "$GLOBAL_DIR/templates/json/spec-kanban-template.json"

# JSON schemas (3) - v4.0 Kanban Migration
echo "→ JSON schemas (3)..."
download_file "$REPO_URL/agent-os/templates/schemas/backlog-schema.json" "$GLOBAL_DIR/templates/schemas/backlog-schema.json"
download_file "$REPO_URL/agent-os/templates/schemas/execution-kanban-schema.json" "$GLOBAL_DIR/templates/schemas/execution-kanban-schema.json"
download_file "$REPO_URL/agent-os/templates/schemas/spec-kanban-schema.json" "$GLOBAL_DIR/templates/schemas/spec-kanban-schema.json"

echo ""
echo "✅ Global installation complete!"
echo ""
echo "Installed to $GLOBAL_DIR:"
echo ""
echo "  standards/ (4 files)"
echo "    ├── code-style.md"
echo "    ├── best-practices.md"
echo "    ├── tech-stack.md"
echo "    └── plan-review-guidelines.md"
echo ""
echo "  agents/ (1 file)"
echo "    └── platform-architect.md"
echo ""
echo "  templates/ (~70 files)"
echo "    ├── CLAUDE-LITE.md (for single products)"
echo "    ├── CLAUDE-PLATFORM.md (for platforms)"
echo "    ├── product/ (10)"
echo "    ├── platform/ (7)"
echo "    ├── skills/ (v3.0 - NEW STRUCTURE)"
echo "    │   ├── Universal (3): quality-gates, po-requirements, architect-refinement"
echo "    │   ├── frontend/"
echo "    │   │   ├── angular/ (6): SKILL.md, components.md, state-management.md, ..."
echo "    │   │   ├── react/ (6): SKILL.md, components.md, state-management.md, ..."
echo "    │   │   └── vue/ (6): SKILL.md, components.md, state-management.md, ..."
echo "    │   ├── backend/"
echo "    │   │   ├── rails/ (6): SKILL.md, services.md, models.md, ..."
echo "    │   │   ├── nestjs/ (6): SKILL.md, services.md, models.md, ..."
echo "    │   │   └── spring/ (6): SKILL.md, services.md, models.md, ..."
echo "    │   ├── devops/"
echo "    │   │   └── docker-github/ (4): SKILL.md, docker.md, ci-cd.md, ..."
echo "    │   ├── domain/ (2): SKILL.md, process.md"
echo "    │   ├── custom-skill-templates/ (3): For specialized technologies"
echo "    │   ├── platform/ (4): system-integration-patterns, ..."
echo "    │   ├── orchestration/ (1)"
echo "    │   ├── skill/ (1) - base template"
echo "    │   ├── generic-skill/ (1)"
echo "    │   └── root-level/ (5): api-implementation-patterns, ..."
echo "    └── docs/ (15) ← story-template, implementation-plan-template"
echo ""
echo "📚 Hybrid Lookup System:"
echo ""
echo "  Templates lookup order:"
echo "    1. Project: agent-os/templates/ (local override)"
echo "    2. Global: ~/.agent-os/templates/ (fallback)"
echo ""
echo "  Standards lookup order:"
echo "    1. Project: agent-os/standards/ (generated in /plan-product)"
echo "    2. Global: ~/.agent-os/standards/ (fallback)"
echo ""
echo "Benefits:"
echo "  ✅ Templates available globally for all projects"
echo "  ✅ No local installation needed unless customizing"
echo "  ✅ Consistent templates across projects"
echo "  ✅ Project overrides when needed"
echo ""
echo "Next steps:"
echo ""
echo "1. Install Agent OS in your project:"
echo "   cd your-project/"
echo "   curl -sSL https://raw.githubusercontent.com/michsindlinger/agent-os-extended/main/setup.sh | bash"
echo ""
echo "2. Install Claude Code:"
echo "   curl -sSL https://raw.githubusercontent.com/michsindlinger/agent-os-extended/main/setup-claude-code.sh | bash"
echo ""
echo "3. Start workflow:"
echo "   /plan-product         → Single-product projects"
echo "   /plan-platform        → Multi-module platforms"
echo "   /build-development-team → DevTeam setup"
echo ""
echo "Templates will be loaded from ~/.agent-os/templates/ automatically."
echo "To customize templates, copy to project's agent-os/templates/ and modify."
echo ""
echo "For more info: https://github.com/michsindlinger/agent-os-extended"
echo ""
