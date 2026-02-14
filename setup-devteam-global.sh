#!/bin/bash

# Specwright - Global Installation
# Installs standards and templates to ~/.specwright/ as fallback for all projects
# Version: 3.0 - Open Source Core

set -e

REPO_URL="https://raw.githubusercontent.com/michsindlinger/specwright/main"

echo "========================================="
echo "Specwright - Global Installation"
echo "========================================="
echo ""
echo "This installs to ~/.specwright/:"
echo "  - Global coding standards (fallback)"
echo "  - All templates (~80 files)"
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
    echo "Downloaded: $(basename $dest)"
}

# Global installation directory
GLOBAL_DIR="$HOME/.specwright"

echo "Installing to: $GLOBAL_DIR"
echo ""

# Create directory structure
echo "Creating global directory structure..."
mkdir -p "$GLOBAL_DIR/standards"
mkdir -p "$GLOBAL_DIR/templates/product"
mkdir -p "$GLOBAL_DIR/templates/platform"
mkdir -p "$GLOBAL_DIR/agents"
# Skill structure
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
mkdir -p "$GLOBAL_DIR/templates/skills/orchestration"
mkdir -p "$GLOBAL_DIR/templates/skills/platform"
mkdir -p "$GLOBAL_DIR/templates/skills/skill"
mkdir -p "$GLOBAL_DIR/templates/skills/product-strategy"
mkdir -p "$GLOBAL_DIR/templates/skills/tech-stack-recommendation"
mkdir -p "$GLOBAL_DIR/templates/skills/design-system-extraction"
mkdir -p "$GLOBAL_DIR/templates/skills/ux-patterns-definition"
mkdir -p "$GLOBAL_DIR/templates/skills/architecture-decision"
mkdir -p "$GLOBAL_DIR/templates/skills"
mkdir -p "$GLOBAL_DIR/templates/docs"
mkdir -p "$GLOBAL_DIR/templates/json"
mkdir -p "$GLOBAL_DIR/templates/schemas"
mkdir -p "$GLOBAL_DIR/templates/concept"

# ===============================================================
# STANDARDS
# ===============================================================

echo ""
echo "=== Installing Global Standards ==="

download_file "$REPO_URL/specwright/standards/code-style.md" \
  "$GLOBAL_DIR/standards/code-style.md" "code-style"

download_file "$REPO_URL/specwright/standards/best-practices.md" \
  "$GLOBAL_DIR/standards/best-practices.md" "best-practices"

download_file "$REPO_URL/specwright/standards/tech-stack.md" \
  "$GLOBAL_DIR/standards/tech-stack.md" "tech-stack template"

download_file "$REPO_URL/specwright/standards/plan-review-guidelines.md" \
  "$GLOBAL_DIR/standards/plan-review-guidelines.md" "plan-review-guidelines"

# ===============================================================
# TEMPLATES
# ===============================================================

echo ""
echo "=== Installing Templates ==="

# CLAUDE templates (2)
echo "-> CLAUDE templates (2)..."
download_file "$REPO_URL/specwright/templates/CLAUDE-LITE.md" "$GLOBAL_DIR/templates/CLAUDE-LITE.md"
download_file "$REPO_URL/specwright/templates/CLAUDE-PLATFORM.md" "$GLOBAL_DIR/templates/CLAUDE-PLATFORM.md"

# Product templates (11)
echo "-> Product templates (11)..."
download_file "$REPO_URL/specwright/templates/product/product-brief-template.md" "$GLOBAL_DIR/templates/product/product-brief-template.md"
download_file "$REPO_URL/specwright/templates/product/product-brief-lite-template.md" "$GLOBAL_DIR/templates/product/product-brief-lite-template.md"
download_file "$REPO_URL/specwright/templates/product/tech-stack-template.md" "$GLOBAL_DIR/templates/product/tech-stack-template.md"
download_file "$REPO_URL/specwright/templates/product/roadmap-template.md" "$GLOBAL_DIR/templates/product/roadmap-template.md"
download_file "$REPO_URL/specwright/templates/product/architecture-decision-template.md" "$GLOBAL_DIR/templates/product/architecture-decision-template.md"
download_file "$REPO_URL/specwright/templates/product/boilerplate-structure-template.md" "$GLOBAL_DIR/templates/product/boilerplate-structure-template.md"
download_file "$REPO_URL/specwright/templates/product/design-system-template.md" "$GLOBAL_DIR/templates/product/design-system-template.md"
download_file "$REPO_URL/specwright/templates/product/ux-patterns-template.md" "$GLOBAL_DIR/templates/product/ux-patterns-template.md"
download_file "$REPO_URL/specwright/templates/product/blocker-analysis-template.md" "$GLOBAL_DIR/templates/product/blocker-analysis-template.md"
download_file "$REPO_URL/specwright/templates/product/milestone-plan-template.md" "$GLOBAL_DIR/templates/product/milestone-plan-template.md"
download_file "$REPO_URL/specwright/templates/product/secrets-template.md" "$GLOBAL_DIR/templates/product/secrets-template.md"

# Concept templates (7)
echo "-> Concept templates (7)..."
download_file "$REPO_URL/specwright/templates/concept/concept-analysis-template.md" "$GLOBAL_DIR/templates/concept/concept-analysis-template.md"
download_file "$REPO_URL/specwright/templates/concept/domain-research-template.md" "$GLOBAL_DIR/templates/concept/domain-research-template.md"
download_file "$REPO_URL/specwright/templates/concept/competence-map-template.md" "$GLOBAL_DIR/templates/concept/competence-map-template.md"
download_file "$REPO_URL/specwright/templates/concept/proposal-concept-template.md" "$GLOBAL_DIR/templates/concept/proposal-concept-template.md"
download_file "$REPO_URL/specwright/templates/concept/pitch-script-template.md" "$GLOBAL_DIR/templates/concept/pitch-script-template.md"
download_file "$REPO_URL/specwright/templates/concept/poc-plan-template.md" "$GLOBAL_DIR/templates/concept/poc-plan-template.md"
download_file "$REPO_URL/specwright/templates/concept/overview-template.md" "$GLOBAL_DIR/templates/concept/overview-template.md"

# Platform templates (7)
echo "-> Platform templates (7)..."
download_file "$REPO_URL/specwright/templates/platform/platform-brief-template.md" "$GLOBAL_DIR/templates/platform/platform-brief-template.md"
download_file "$REPO_URL/specwright/templates/platform/module-brief-template.md" "$GLOBAL_DIR/templates/platform/module-brief-template.md"
download_file "$REPO_URL/specwright/templates/platform/module-dependencies-template.md" "$GLOBAL_DIR/templates/platform/module-dependencies-template.md"
download_file "$REPO_URL/specwright/templates/platform/platform-architecture-template.md" "$GLOBAL_DIR/templates/platform/platform-architecture-template.md"
download_file "$REPO_URL/specwright/templates/platform/platform-roadmap-template.md" "$GLOBAL_DIR/templates/platform/platform-roadmap-template.md"
download_file "$REPO_URL/specwright/templates/platform/module-roadmap-template.md" "$GLOBAL_DIR/templates/platform/module-roadmap-template.md"
download_file "$REPO_URL/specwright/templates/platform/platform-blocker-analysis-template.md" "$GLOBAL_DIR/templates/platform/platform-blocker-analysis-template.md"

# Skills templates
echo "-> Quality Gates skill (1 file)..."
download_file "$REPO_URL/specwright/templates/skills/quality-gates/SKILL.md" "$GLOBAL_DIR/templates/skills/quality-gates/SKILL.md"

echo "-> PO Requirements skill (1 file)..."
download_file "$REPO_URL/specwright/templates/skills/po-requirements/SKILL.md" "$GLOBAL_DIR/templates/skills/po-requirements/SKILL.md"

echo "-> Architect Refinement skill (1 file)..."
download_file "$REPO_URL/specwright/templates/skills/architect-refinement/SKILL.md" "$GLOBAL_DIR/templates/skills/architect-refinement/SKILL.md"

echo "-> Frontend Angular skill (6 files)..."
download_file "$REPO_URL/specwright/templates/skills/frontend/angular/SKILL.md" "$GLOBAL_DIR/templates/skills/frontend/angular/SKILL.md"
download_file "$REPO_URL/specwright/templates/skills/frontend/angular/components.md" "$GLOBAL_DIR/templates/skills/frontend/angular/components.md"
download_file "$REPO_URL/specwright/templates/skills/frontend/angular/state-management.md" "$GLOBAL_DIR/templates/skills/frontend/angular/state-management.md"
download_file "$REPO_URL/specwright/templates/skills/frontend/angular/api-integration.md" "$GLOBAL_DIR/templates/skills/frontend/angular/api-integration.md"
download_file "$REPO_URL/specwright/templates/skills/frontend/angular/forms-validation.md" "$GLOBAL_DIR/templates/skills/frontend/angular/forms-validation.md"
download_file "$REPO_URL/specwright/templates/skills/frontend/angular/dos-and-donts.md" "$GLOBAL_DIR/templates/skills/frontend/angular/dos-and-donts.md"

echo "-> Frontend React skill (6 files)..."
download_file "$REPO_URL/specwright/templates/skills/frontend/react/SKILL.md" "$GLOBAL_DIR/templates/skills/frontend/react/SKILL.md"
download_file "$REPO_URL/specwright/templates/skills/frontend/react/components.md" "$GLOBAL_DIR/templates/skills/frontend/react/components.md"
download_file "$REPO_URL/specwright/templates/skills/frontend/react/state-management.md" "$GLOBAL_DIR/templates/skills/frontend/react/state-management.md"
download_file "$REPO_URL/specwright/templates/skills/frontend/react/api-integration.md" "$GLOBAL_DIR/templates/skills/frontend/react/api-integration.md"
download_file "$REPO_URL/specwright/templates/skills/frontend/react/forms-validation.md" "$GLOBAL_DIR/templates/skills/frontend/react/forms-validation.md"
download_file "$REPO_URL/specwright/templates/skills/frontend/react/dos-and-donts.md" "$GLOBAL_DIR/templates/skills/frontend/react/dos-and-donts.md"

echo "-> Frontend Vue skill (6 files)..."
download_file "$REPO_URL/specwright/templates/skills/frontend/vue/SKILL.md" "$GLOBAL_DIR/templates/skills/frontend/vue/SKILL.md"
download_file "$REPO_URL/specwright/templates/skills/frontend/vue/components.md" "$GLOBAL_DIR/templates/skills/frontend/vue/components.md"
download_file "$REPO_URL/specwright/templates/skills/frontend/vue/state-management.md" "$GLOBAL_DIR/templates/skills/frontend/vue/state-management.md"
download_file "$REPO_URL/specwright/templates/skills/frontend/vue/api-integration.md" "$GLOBAL_DIR/templates/skills/frontend/vue/api-integration.md"
download_file "$REPO_URL/specwright/templates/skills/frontend/vue/forms-validation.md" "$GLOBAL_DIR/templates/skills/frontend/vue/forms-validation.md"
download_file "$REPO_URL/specwright/templates/skills/frontend/vue/dos-and-donts.md" "$GLOBAL_DIR/templates/skills/frontend/vue/dos-and-donts.md"

echo "-> Backend Rails skill (6 files)..."
download_file "$REPO_URL/specwright/templates/skills/backend/rails/SKILL.md" "$GLOBAL_DIR/templates/skills/backend/rails/SKILL.md"
download_file "$REPO_URL/specwright/templates/skills/backend/rails/services.md" "$GLOBAL_DIR/templates/skills/backend/rails/services.md"
download_file "$REPO_URL/specwright/templates/skills/backend/rails/models.md" "$GLOBAL_DIR/templates/skills/backend/rails/models.md"
download_file "$REPO_URL/specwright/templates/skills/backend/rails/api-design.md" "$GLOBAL_DIR/templates/skills/backend/rails/api-design.md"
download_file "$REPO_URL/specwright/templates/skills/backend/rails/testing.md" "$GLOBAL_DIR/templates/skills/backend/rails/testing.md"
download_file "$REPO_URL/specwright/templates/skills/backend/rails/dos-and-donts.md" "$GLOBAL_DIR/templates/skills/backend/rails/dos-and-donts.md"

echo "-> Backend NestJS skill (6 files)..."
download_file "$REPO_URL/specwright/templates/skills/backend/nestjs/SKILL.md" "$GLOBAL_DIR/templates/skills/backend/nestjs/SKILL.md"
download_file "$REPO_URL/specwright/templates/skills/backend/nestjs/services.md" "$GLOBAL_DIR/templates/skills/backend/nestjs/services.md"
download_file "$REPO_URL/specwright/templates/skills/backend/nestjs/models.md" "$GLOBAL_DIR/templates/skills/backend/nestjs/models.md"
download_file "$REPO_URL/specwright/templates/skills/backend/nestjs/api-design.md" "$GLOBAL_DIR/templates/skills/backend/nestjs/api-design.md"
download_file "$REPO_URL/specwright/templates/skills/backend/nestjs/testing.md" "$GLOBAL_DIR/templates/skills/backend/nestjs/testing.md"
download_file "$REPO_URL/specwright/templates/skills/backend/nestjs/dos-and-donts.md" "$GLOBAL_DIR/templates/skills/backend/nestjs/dos-and-donts.md"

echo "-> Backend Spring skill (6 files)..."
download_file "$REPO_URL/specwright/templates/skills/backend/spring/SKILL.md" "$GLOBAL_DIR/templates/skills/backend/spring/SKILL.md"
download_file "$REPO_URL/specwright/templates/skills/backend/spring/services.md" "$GLOBAL_DIR/templates/skills/backend/spring/services.md"
download_file "$REPO_URL/specwright/templates/skills/backend/spring/models.md" "$GLOBAL_DIR/templates/skills/backend/spring/models.md"
download_file "$REPO_URL/specwright/templates/skills/backend/spring/api-design.md" "$GLOBAL_DIR/templates/skills/backend/spring/api-design.md"
download_file "$REPO_URL/specwright/templates/skills/backend/spring/testing.md" "$GLOBAL_DIR/templates/skills/backend/spring/testing.md"
download_file "$REPO_URL/specwright/templates/skills/backend/spring/dos-and-donts.md" "$GLOBAL_DIR/templates/skills/backend/spring/dos-and-donts.md"

echo "-> DevOps Docker/GitHub skill (4 files)..."
download_file "$REPO_URL/specwright/templates/skills/devops/docker-github/SKILL.md" "$GLOBAL_DIR/templates/skills/devops/docker-github/SKILL.md"
download_file "$REPO_URL/specwright/templates/skills/devops/docker-github/docker.md" "$GLOBAL_DIR/templates/skills/devops/docker-github/docker.md"
download_file "$REPO_URL/specwright/templates/skills/devops/docker-github/ci-cd.md" "$GLOBAL_DIR/templates/skills/devops/docker-github/ci-cd.md"
download_file "$REPO_URL/specwright/templates/skills/devops/docker-github/dos-and-donts.md" "$GLOBAL_DIR/templates/skills/devops/docker-github/dos-and-donts.md"

echo "-> Domain skill templates (2 files)..."
download_file "$REPO_URL/specwright/templates/skills/domain/SKILL.md" "$GLOBAL_DIR/templates/skills/domain/SKILL.md"
download_file "$REPO_URL/specwright/templates/skills/domain/process.md" "$GLOBAL_DIR/templates/skills/domain/process.md"

echo "-> Custom skill templates (3 files)..."
download_file "$REPO_URL/specwright/templates/skills/custom-skill-template.md" "$GLOBAL_DIR/templates/skills/custom-skill-template.md"
download_file "$REPO_URL/specwright/templates/skills/custom-skill-module-template.md" "$GLOBAL_DIR/templates/skills/custom-skill-module-template.md"
download_file "$REPO_URL/specwright/templates/skills/custom-skill-dos-and-donts-template.md" "$GLOBAL_DIR/templates/skills/custom-skill-dos-and-donts-template.md"

echo "-> Platform skill templates (4)..."
mkdir -p "$GLOBAL_DIR/templates/skills/platform/system-integration-patterns"
mkdir -p "$GLOBAL_DIR/templates/skills/platform/dependency-management"
mkdir -p "$GLOBAL_DIR/templates/skills/platform/modular-architecture"
mkdir -p "$GLOBAL_DIR/templates/skills/platform/platform-scalability"
download_file "$REPO_URL/specwright/templates/skills/platform/system-integration-patterns/SKILL.md" "$GLOBAL_DIR/templates/skills/platform/system-integration-patterns/SKILL.md"
download_file "$REPO_URL/specwright/templates/skills/platform/dependency-management/SKILL.md" "$GLOBAL_DIR/templates/skills/platform/dependency-management/SKILL.md"
download_file "$REPO_URL/specwright/templates/skills/platform/modular-architecture/SKILL.md" "$GLOBAL_DIR/templates/skills/platform/modular-architecture/SKILL.md"
download_file "$REPO_URL/specwright/templates/skills/platform/platform-scalability/SKILL.md" "$GLOBAL_DIR/templates/skills/platform/platform-scalability/SKILL.md"

echo "-> Orchestration skill template (1)..."
mkdir -p "$GLOBAL_DIR/templates/skills/orchestration/orchestration"
download_file "$REPO_URL/specwright/templates/skills/orchestration/orchestration/SKILL.md" "$GLOBAL_DIR/templates/skills/orchestration/orchestration/SKILL.md"

echo "-> Generic skill template (1)..."
mkdir -p "$GLOBAL_DIR/templates/skills/generic-skill"
download_file "$REPO_URL/specwright/templates/skills/generic-skill/SKILL.md" "$GLOBAL_DIR/templates/skills/generic-skill/SKILL.md"

echo "-> Base skill template (1)..."
download_file "$REPO_URL/specwright/templates/skills/skill/SKILL.md" "$GLOBAL_DIR/templates/skills/skill/SKILL.md"

echo "-> Product planning skills (5 files)..."
download_file "$REPO_URL/specwright/templates/skills/product-strategy/SKILL.md" "$GLOBAL_DIR/templates/skills/product-strategy/SKILL.md"
download_file "$REPO_URL/specwright/templates/skills/tech-stack-recommendation/SKILL.md" "$GLOBAL_DIR/templates/skills/tech-stack-recommendation/SKILL.md"
download_file "$REPO_URL/specwright/templates/skills/design-system-extraction/SKILL.md" "$GLOBAL_DIR/templates/skills/design-system-extraction/SKILL.md"
download_file "$REPO_URL/specwright/templates/skills/ux-patterns-definition/SKILL.md" "$GLOBAL_DIR/templates/skills/ux-patterns-definition/SKILL.md"
download_file "$REPO_URL/specwright/templates/skills/architecture-decision/SKILL.md" "$GLOBAL_DIR/templates/skills/architecture-decision/SKILL.md"

echo "-> Additional skill templates (5)..."
mkdir -p "$GLOBAL_DIR/templates/skills/api-implementation-patterns"
mkdir -p "$GLOBAL_DIR/templates/skills/component-architecture"
mkdir -p "$GLOBAL_DIR/templates/skills/deployment-automation"
mkdir -p "$GLOBAL_DIR/templates/skills/file-organization-patterns"
mkdir -p "$GLOBAL_DIR/templates/skills/testing-strategies"
download_file "$REPO_URL/specwright/templates/skills/api-implementation-patterns/SKILL.md" "$GLOBAL_DIR/templates/skills/api-implementation-patterns/SKILL.md"
download_file "$REPO_URL/specwright/templates/skills/component-architecture/SKILL.md" "$GLOBAL_DIR/templates/skills/component-architecture/SKILL.md"
download_file "$REPO_URL/specwright/templates/skills/deployment-automation/SKILL.md" "$GLOBAL_DIR/templates/skills/deployment-automation/SKILL.md"
download_file "$REPO_URL/specwright/templates/skills/file-organization-patterns/SKILL.md" "$GLOBAL_DIR/templates/skills/file-organization-patterns/SKILL.md"
download_file "$REPO_URL/specwright/templates/skills/testing-strategies/SKILL.md" "$GLOBAL_DIR/templates/skills/testing-strategies/SKILL.md"

# Documentation templates
echo "-> Documentation templates (22)..."
download_file "$REPO_URL/specwright/templates/docs/spec-template.md" "$GLOBAL_DIR/templates/docs/spec-template.md"
download_file "$REPO_URL/specwright/templates/docs/spec-lite-template.md" "$GLOBAL_DIR/templates/docs/spec-lite-template.md"
download_file "$REPO_URL/specwright/templates/docs/user-stories-template.md" "$GLOBAL_DIR/templates/docs/user-stories-template.md"
download_file "$REPO_URL/specwright/templates/docs/story-template.md" "$GLOBAL_DIR/templates/docs/story-template.md"
download_file "$REPO_URL/specwright/templates/docs/story-index-template.md" "$GLOBAL_DIR/templates/docs/story-index-template.md"
download_file "$REPO_URL/specwright/templates/docs/backlog-story-index-template.md" "$GLOBAL_DIR/templates/docs/backlog-story-index-template.md"
download_file "$REPO_URL/specwright/templates/docs/cross-cutting-decisions-template.md" "$GLOBAL_DIR/templates/docs/cross-cutting-decisions-template.md"
download_file "$REPO_URL/specwright/templates/docs/bug-description-template.md" "$GLOBAL_DIR/templates/docs/bug-description-template.md"
download_file "$REPO_URL/specwright/templates/docs/kanban-board-template.md" "$GLOBAL_DIR/templates/docs/kanban-board-template.md"
download_file "$REPO_URL/specwright/templates/docs/handover-doc-template.md" "$GLOBAL_DIR/templates/docs/handover-doc-template.md"
download_file "$REPO_URL/specwright/templates/docs/changelog-entry-template.md" "$GLOBAL_DIR/templates/docs/changelog-entry-template.md"
download_file "$REPO_URL/specwright/templates/docs/dod-template.md" "$GLOBAL_DIR/templates/docs/dod-template.md"
download_file "$REPO_URL/specwright/templates/docs/dor-template.md" "$GLOBAL_DIR/templates/docs/dor-template.md"
download_file "$REPO_URL/specwright/templates/docs/effort-estimation-template.md" "$GLOBAL_DIR/templates/docs/effort-estimation-template.md"
download_file "$REPO_URL/specwright/templates/docs/implementation-plan-template.md" "$GLOBAL_DIR/templates/docs/implementation-plan-template.md"
download_file "$REPO_URL/specwright/templates/docs/test-scenarios-template.md" "$GLOBAL_DIR/templates/docs/test-scenarios-template.md"
download_file "$REPO_URL/specwright/templates/docs/user-todos-template.md" "$GLOBAL_DIR/templates/docs/user-todos-template.md"
download_file "$REPO_URL/specwright/templates/docs/bug-fix-implementation-plan-template.md" "$GLOBAL_DIR/templates/docs/bug-fix-implementation-plan-template.md"
download_file "$REPO_URL/specwright/templates/docs/skill-index-template.md" "$GLOBAL_DIR/templates/docs/skill-index-template.md"
download_file "$REPO_URL/specwright/templates/docs/system-story-997-code-review-template.md" "$GLOBAL_DIR/templates/docs/system-story-997-code-review-template.md"
download_file "$REPO_URL/specwright/templates/docs/system-story-998-integration-validation-template.md" "$GLOBAL_DIR/templates/docs/system-story-998-integration-validation-template.md"
download_file "$REPO_URL/specwright/templates/docs/system-story-999-finalize-pr-template.md" "$GLOBAL_DIR/templates/docs/system-story-999-finalize-pr-template.md"

# JSON templates (3)
echo "-> JSON templates (3)..."
download_file "$REPO_URL/specwright/templates/json/backlog-template.json" "$GLOBAL_DIR/templates/json/backlog-template.json"
download_file "$REPO_URL/specwright/templates/json/execution-kanban-template.json" "$GLOBAL_DIR/templates/json/execution-kanban-template.json"
download_file "$REPO_URL/specwright/templates/json/spec-kanban-template.json" "$GLOBAL_DIR/templates/json/spec-kanban-template.json"

# JSON schemas (4)
echo "-> JSON schemas (4)..."
download_file "$REPO_URL/specwright/templates/schemas/backlog-schema.json" "$GLOBAL_DIR/templates/schemas/backlog-schema.json"
download_file "$REPO_URL/specwright/templates/schemas/execution-kanban-schema.json" "$GLOBAL_DIR/templates/schemas/execution-kanban-schema.json"
download_file "$REPO_URL/specwright/templates/schemas/spec-kanban-schema.json" "$GLOBAL_DIR/templates/schemas/spec-kanban-schema.json"
download_file "$REPO_URL/specwright/templates/schemas/feedback-analysis-schema.json" "$GLOBAL_DIR/templates/schemas/feedback-analysis-schema.json"

echo ""
echo "Global installation complete!"
echo ""
echo "Installed to $GLOBAL_DIR:"
echo ""
echo "  standards/ (4 files)"
echo "  templates/ (~90 files)"
echo "    ├── product/ (11)"
echo "    ├── platform/ (7)"
echo "    ├── concept/ (7)"
echo "    ├── skills/ (50+ skill templates)"
echo "    ├── docs/ (22)"
echo "    ├── json/ (3)"
echo "    └── schemas/ (4)"
echo ""
echo "Hybrid Lookup System:"
echo "  1. Project: specwright/templates/ (local override)"
echo "  2. Global: ~/.specwright/templates/ (fallback)"
echo ""
echo "Next steps:"
echo ""
echo "1. Install Specwright in your project:"
echo "   cd your-project/"
echo "   curl -sSL $REPO_URL/setup.sh | bash"
echo ""
echo "2. Install Claude Code:"
echo "   curl -sSL $REPO_URL/setup-claude-code.sh | bash"
echo ""
echo "3. Start workflow:"
echo "   /plan-product         -> Single-product projects"
echo "   /plan-platform        -> Multi-module platforms"
echo ""
echo "For more info: https://github.com/michsindlinger/specwright"
echo ""
