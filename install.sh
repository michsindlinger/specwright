#!/bin/bash

# =============================================================================
# Specwright Unified Installer
# Installs everything needed for spec-driven development in one command.
#
# Usage:
#   curl -sSL https://raw.githubusercontent.com/michsindlinger/specwright/main/install.sh | bash
#   curl -sSL .../install.sh | bash -s -- --yes --all
#   bash install.sh --dry-run
#
# Version: 1.0
# =============================================================================

set -e

INSTALLER_VERSION="1.0"
FRAMEWORK_VERSION="3.1.0"
REPO_URL="https://raw.githubusercontent.com/michsindlinger/specwright/main"

# =============================================================================
# Color helpers (auto-disable if no tty)
# =============================================================================

if [[ -t 1 ]] || [[ -t 2 ]]; then
    BOLD="\033[1m"
    DIM="\033[2m"
    GREEN="\033[0;32m"
    YELLOW="\033[0;33m"
    RED="\033[0;31m"
    CYAN="\033[0;36m"
    RESET="\033[0m"
else
    BOLD="" DIM="" GREEN="" YELLOW="" RED="" CYAN="" RESET=""
fi

# =============================================================================
# Counters
# =============================================================================

FILES_INSTALLED=0
FILES_SKIPPED=0
FILES_FAILED=0

# =============================================================================
# Flags (defaults)
# =============================================================================

FLAG_GLOBAL=false
FLAG_PROJECT=false
FLAG_CLAUDE_CODE=false
FLAG_ALL=false
FLAG_UPDATE=false
FLAG_OVERWRITE=false
FLAG_OVERWRITE_WORKFLOWS=false
FLAG_OVERWRITE_STANDARDS=false
FLAG_NO_MCP=false
FLAG_YES=false
FLAG_DRY_RUN=false
FLAG_HELP=false
EXPLICIT_MODE=false

# =============================================================================
# 1. Parse flags
# =============================================================================

while [[ $# -gt 0 ]]; do
    case $1 in
        --global)              FLAG_GLOBAL=true; EXPLICIT_MODE=true; shift ;;
        --project)             FLAG_PROJECT=true; EXPLICIT_MODE=true; shift ;;
        --claude-code)         FLAG_CLAUDE_CODE=true; EXPLICIT_MODE=true; shift ;;
        --all)                 FLAG_ALL=true; shift ;;
        --update)              FLAG_UPDATE=true; shift ;;
        --overwrite)           FLAG_OVERWRITE=true; shift ;;
        --overwrite-workflows) FLAG_OVERWRITE_WORKFLOWS=true; shift ;;
        --overwrite-standards) FLAG_OVERWRITE_STANDARDS=true; shift ;;
        --no-mcp)              FLAG_NO_MCP=true; shift ;;
        --yes|-y)              FLAG_YES=true; shift ;;
        --dry-run)             FLAG_DRY_RUN=true; shift ;;
        -h|--help)             FLAG_HELP=true; shift ;;
        *)
            echo -e "${RED}Unknown option: $1${RESET}"
            echo "Use -h or --help for usage information"
            exit 1
            ;;
    esac
done

# =============================================================================
# Help
# =============================================================================

if [[ "$FLAG_HELP" == true ]]; then
    cat << 'HELP'
Specwright Unified Installer

Usage:
  curl -sSL .../install.sh | bash
  curl -sSL .../install.sh | bash -s -- [flags]
  bash install.sh [flags]

Modes (auto-detected if not specified):
  --global              Only global templates & standards
  --project             Only project-level setup (requires global)
  --claude-code         Only Claude Code commands & agents
  --all                 Install everything (default with auto-detect)
  --update              Update existing installation

Options:
  --overwrite           Overwrite all existing files
  --overwrite-workflows Overwrite only workflow files
  --overwrite-standards Overwrite only standards files
  --no-mcp              Skip MCP server installation
  --yes | -y            No confirmation prompt (non-interactive)
  --dry-run             Show what would be installed without doing it
  -h | --help           Show this help

Examples:
  # Fresh install (auto-detects everything):
  curl -sSL .../install.sh | bash

  # Non-interactive (for Web UI wizard):
  curl -sSL .../install.sh | bash -s -- --yes --all

  # Update workflows only:
  bash install.sh --update --overwrite-workflows

  # Dry run to see what would happen:
  bash install.sh --dry-run
HELP
    exit 0
fi

# =============================================================================
# 2. Prerequisites
# =============================================================================

check_prerequisites() {
    local has_curl=false
    local has_wget=false

    command -v curl &>/dev/null && has_curl=true
    command -v wget &>/dev/null && has_wget=true

    if [[ "$has_curl" == false && "$has_wget" == false ]]; then
        echo -e "${RED}Error: Neither curl nor wget is available.${RESET}"
        echo "Please install curl or wget first."
        exit 1
    fi

    # Check write permissions for home directory
    if [[ ! -w "$HOME" ]]; then
        echo -e "${RED}Error: Cannot write to $HOME${RESET}"
        exit 1
    fi
}

# =============================================================================
# 3. Auto-Detect context
# =============================================================================

DETECT_GLOBAL_INSTALLED=false
DETECT_MARKET_VALIDATION_GLOBAL=false
DETECT_PROJECT_INSTALLED=false
DETECT_CLAUDE_CODE_INSTALLED=false
DETECT_MCP_INSTALLED=false
DETECT_FRAMEWORK_REPO=false
DETECT_NODE_AVAILABLE=false
DETECT_NODE_VERSION=""

auto_detect() {
    # Global installed?
    [[ -d "$HOME/.specwright/templates" ]] && DETECT_GLOBAL_INSTALLED=true || true

    # Market validation global?
    [[ -d "$HOME/.specwright/workflows/validation" ]] && DETECT_MARKET_VALIDATION_GLOBAL=true || true

    # Project installed?
    [[ -d "specwright/workflows" ]] && DETECT_PROJECT_INSTALLED=true || true

    # Claude Code installed?
    [[ -d ".claude/commands/specwright" ]] && DETECT_CLAUDE_CODE_INSTALLED=true || true

    # MCP installed?
    if [[ -f ".mcp.json" ]]; then
        grep -q '"kanban"' .mcp.json 2>/dev/null && DETECT_MCP_INSTALLED=true || true
    fi

    # Framework repo? (used for local MCP file copy)
    if [[ -d "ui" && -f "specwright/scripts/mcp/kanban-mcp-server.ts" ]]; then
        DETECT_FRAMEWORK_REPO=true
    fi

    # Node.js?
    if command -v node &>/dev/null; then
        DETECT_NODE_AVAILABLE=true
        DETECT_NODE_VERSION=$(node -v 2>/dev/null || echo "unknown")
    fi
}

# =============================================================================
# Determine what to install
# =============================================================================

INSTALL_GLOBAL=false
INSTALL_MARKET_VALIDATION_GLOBAL=false
INSTALL_PROJECT=false
INSTALL_MCP=false
INSTALL_CLAUDE_CODE=false
INSTALL_MARKET_VALIDATION_PROJECT=false
determine_install_plan() {
    if [[ "$FLAG_ALL" == true || "$EXPLICIT_MODE" == false ]]; then
        # Install everything that makes sense
        INSTALL_GLOBAL=true
        INSTALL_MARKET_VALIDATION_GLOBAL=true
        INSTALL_PROJECT=true
        INSTALL_CLAUDE_CODE=true
        INSTALL_MARKET_VALIDATION_PROJECT=true

        if [[ "$FLAG_NO_MCP" != true && "$DETECT_NODE_AVAILABLE" == true ]]; then
            INSTALL_MCP=true
        fi
    else
        # Explicit mode selection
        [[ "$FLAG_GLOBAL" == true ]] && INSTALL_GLOBAL=true && INSTALL_MARKET_VALIDATION_GLOBAL=true || true
        [[ "$FLAG_PROJECT" == true ]] && INSTALL_PROJECT=true && INSTALL_MARKET_VALIDATION_PROJECT=true || true
        [[ "$FLAG_CLAUDE_CODE" == true ]] && INSTALL_CLAUDE_CODE=true || true

        # MCP only if project is being installed and not disabled
        if [[ "$INSTALL_PROJECT" == true && "$FLAG_NO_MCP" != true && "$DETECT_NODE_AVAILABLE" == true ]]; then
            INSTALL_MCP=true
        fi
    fi

    # --update implies overwrite for workflows
    if [[ "$FLAG_UPDATE" == true ]]; then
        FLAG_OVERWRITE_WORKFLOWS=true
        FLAG_OVERWRITE_STANDARDS=true
    fi
}

# =============================================================================
# 4. Display plan
# =============================================================================

print_detection() {
    local label="$1"
    local value="$2"
    local detail="$3"

    if [[ "$value" == true ]]; then
        printf "  %-30s ${GREEN}Yes${RESET}" "$label"
    else
        printf "  %-30s ${DIM}Not found${RESET}" "$label"
    fi
    [[ -n "$detail" ]] && printf " ${DIM}(%s)${RESET}" "$detail" || true
    echo ""
}

print_plan_item() {
    local enabled="$1"
    local label="$2"
    local detail="$3"

    if [[ "$enabled" == true ]]; then
        printf "  ${GREEN}[x]${RESET} %-35s ${DIM}(%s)${RESET}\n" "$label" "$detail"
    else
        printf "  ${DIM}[ ] %-35s (%s)${RESET}\n" "$label" "$detail"
    fi
}

display_plan() {
    echo ""
    echo -e "${BOLD}Specwright Installer v${INSTALLER_VERSION}${RESET}"
    echo "========================="
    echo ""
    echo -e "${BOLD}Detected:${RESET}"
    print_detection "Global installation:" "$DETECT_GLOBAL_INSTALLED"
    print_detection "Market validation (global):" "$DETECT_MARKET_VALIDATION_GLOBAL"
    print_detection "Project directory:" "$DETECT_PROJECT_INSTALLED"
    print_detection "Claude Code:" "$DETECT_CLAUDE_CODE_INSTALLED"
    print_detection "MCP server:" "$DETECT_MCP_INSTALLED"

    if [[ "$DETECT_NODE_AVAILABLE" == true ]]; then
        printf "  %-30s ${GREEN}%s${RESET}\n" "Node.js:" "$DETECT_NODE_VERSION"
    else
        printf "  %-30s ${DIM}Not found${RESET}\n" "Node.js:"
    fi

    echo ""
    echo -e "${BOLD}Installation Plan:${RESET}"
    print_plan_item "$INSTALL_GLOBAL" "Global templates & standards" "~130 files -> ~/.specwright/"
    print_plan_item "$INSTALL_MARKET_VALIDATION_GLOBAL" "Market validation (global)" "templates, agents, commands"
    print_plan_item "$INSTALL_PROJECT" "Project setup" "workflows, standards, config"
    print_plan_item "$INSTALL_MCP" "MCP server" "kanban server"
    print_plan_item "$INSTALL_CLAUDE_CODE" "Claude Code commands & agents" "35 commands, 13 agents"
    print_plan_item "$INSTALL_MARKET_VALIDATION_PROJECT" "Market validation (project)" "project directories"

    if [[ "$FLAG_OVERWRITE" == true ]]; then
        echo ""
        echo -e "  ${YELLOW}Overwrite mode: ALL files${RESET}"
    elif [[ "$FLAG_OVERWRITE_WORKFLOWS" == true || "$FLAG_OVERWRITE_STANDARDS" == true ]]; then
        echo ""
        [[ "$FLAG_OVERWRITE_WORKFLOWS" == true ]] && echo -e "  ${YELLOW}Overwrite: workflows${RESET}" || true
        [[ "$FLAG_OVERWRITE_STANDARDS" == true ]] && echo -e "  ${YELLOW}Overwrite: standards${RESET}" || true
    fi

    echo ""
}

# =============================================================================
# Confirmation prompt
# =============================================================================

confirm_install() {
    if [[ "$FLAG_YES" == true || "$FLAG_DRY_RUN" == true ]]; then
        return 0
    fi

    # When piped (curl | bash), read from /dev/tty
    local response
    printf "Proceed? [Y/n] "
    if [[ -t 0 ]]; then
        read -r response
    else
        read -r response < /dev/tty 2>/dev/null || response="y"
    fi

    case "$response" in
        [nN]|[nN][oO])
            echo "Installation cancelled."
            exit 0
            ;;
    esac
}

# =============================================================================
# Download helper
# =============================================================================

download_file() {
    local url="$1"
    local dest="$2"
    local category="${3:-file}"
    local force="${4:-false}"

    # Skip if exists (unless overwrite flags are set)
    if [[ -f "$dest" && "$force" != true && "$FLAG_OVERWRITE" != true ]]; then
        # Check category-specific overwrite
        if [[ "$category" == "workflow" && "$FLAG_OVERWRITE_WORKFLOWS" == true ]]; then
            : # fall through to download
        elif [[ "$category" == "standard" && "$FLAG_OVERWRITE_STANDARDS" == true ]]; then
            : # fall through to download
        else
            FILES_SKIPPED=$((FILES_SKIPPED + 1))
            return 0
        fi
    fi

    if [[ "$FLAG_DRY_RUN" == true ]]; then
        FILES_INSTALLED=$((FILES_INSTALLED + 1))
        return 0
    fi

    # Ensure parent directory exists
    mkdir -p "$(dirname "$dest")"

    if command -v curl &>/dev/null; then
        curl -sSL "$url" -o "$dest" 2>/dev/null || {
            FILES_FAILED=$((FILES_FAILED + 1))
            return 1
        }
    elif command -v wget &>/dev/null; then
        wget -q "$url" -O "$dest" 2>/dev/null || {
            FILES_FAILED=$((FILES_FAILED + 1))
            return 1
        }
    fi

    FILES_INSTALLED=$((FILES_INSTALLED + 1))
}

# =============================================================================
# Copy helper (for framework repo local files)
# =============================================================================

copy_file() {
    local src="$1"
    local dest="$2"
    local force="${3:-false}"

    if [[ -f "$dest" && "$force" != true && "$FLAG_OVERWRITE" != true ]]; then
        FILES_SKIPPED=$((FILES_SKIPPED + 1))
        return 0
    fi

    if [[ "$FLAG_DRY_RUN" == true ]]; then
        FILES_INSTALLED=$((FILES_INSTALLED + 1))
        return 0
    fi

    mkdir -p "$(dirname "$dest")"
    cp "$src" "$dest" || {
        FILES_FAILED=$((FILES_FAILED + 1))
        return 1
    }
    FILES_INSTALLED=$((FILES_INSTALLED + 1))
}

# =============================================================================
# Step progress helper
# =============================================================================

current_step=0
total_steps=0

count_steps() {
    total_steps=0
    [[ "$INSTALL_GLOBAL" == true ]] && total_steps=$((total_steps + 1)) || true
    [[ "$INSTALL_MARKET_VALIDATION_GLOBAL" == true ]] && total_steps=$((total_steps + 1)) || true
    [[ "$INSTALL_PROJECT" == true ]] && total_steps=$((total_steps + 1)) || true
    [[ "$INSTALL_MCP" == true ]] && total_steps=$((total_steps + 1)) || true
    [[ "$INSTALL_CLAUDE_CODE" == true ]] && total_steps=$((total_steps + 1)) || true
    [[ "$INSTALL_MARKET_VALIDATION_PROJECT" == true ]] && total_steps=$((total_steps + 1)) || true
}

step() {
    current_step=$((current_step + 1))
    local label="$1"
    echo ""
    echo -e "${BOLD}[${current_step}/${total_steps}] ${label}${RESET}"
}

substep() {
    local label="$1"
    local count="$2"
    printf "      %-40s" "$label ($count files)"
}

substep_done() {
    echo -e " ${GREEN}[done]${RESET}"
}

# =============================================================================
# [1/N] Global Templates & Standards
# =============================================================================

install_global() {
    step "Installing global templates & standards..."

    local G="$HOME/.specwright"

    if [[ "$FLAG_DRY_RUN" != true ]]; then
        mkdir -p "$G/standards"
        mkdir -p "$G/templates/product"
        mkdir -p "$G/templates/platform"
        mkdir -p "$G/templates/concept"
        mkdir -p "$G/templates/docs"
        mkdir -p "$G/templates/documents"
        mkdir -p "$G/templates/json"
        mkdir -p "$G/templates/schemas"
        mkdir -p "$G/templates/market-validation"
        mkdir -p "$G/templates/knowledge"
        mkdir -p "$G/templates/research"
        mkdir -p "$G/agents"
        # Skill directories
        mkdir -p "$G/templates/skills/quality-gates"
        mkdir -p "$G/templates/skills/po-requirements"
        mkdir -p "$G/templates/skills/architect-refinement"
        mkdir -p "$G/templates/skills/frontend/angular"
        mkdir -p "$G/templates/skills/frontend/react"
        mkdir -p "$G/templates/skills/frontend/vue"
        mkdir -p "$G/templates/skills/backend/rails"
        mkdir -p "$G/templates/skills/backend/nestjs"
        mkdir -p "$G/templates/skills/backend/spring"
        mkdir -p "$G/templates/skills/devops/docker-github"
        mkdir -p "$G/templates/skills/domain"
        mkdir -p "$G/templates/skills/orchestration/orchestration"
        mkdir -p "$G/templates/skills/platform/system-integration-patterns"
        mkdir -p "$G/templates/skills/platform/dependency-management"
        mkdir -p "$G/templates/skills/platform/modular-architecture"
        mkdir -p "$G/templates/skills/platform/platform-scalability"
        mkdir -p "$G/templates/skills/generic-skill"
        mkdir -p "$G/templates/skills/skill"
        mkdir -p "$G/templates/skills/product-strategy"
        mkdir -p "$G/templates/skills/tech-stack-recommendation"
        mkdir -p "$G/templates/skills/design-system-extraction"
        mkdir -p "$G/templates/skills/ux-patterns-definition"
        mkdir -p "$G/templates/skills/architecture-decision"
        mkdir -p "$G/templates/skills/api-implementation-patterns"
        mkdir -p "$G/templates/skills/component-architecture"
        mkdir -p "$G/templates/skills/deployment-automation"
        mkdir -p "$G/templates/skills/file-organization-patterns"
        mkdir -p "$G/templates/skills/testing-strategies"
    fi

    # --- Standards (4) ---
    substep "Standards" "4"
    download_file "$REPO_URL/specwright/standards/code-style.md" "$G/standards/code-style.md" "standard"
    download_file "$REPO_URL/specwright/standards/best-practices.md" "$G/standards/best-practices.md" "standard"
    download_file "$REPO_URL/specwright/standards/tech-stack.md" "$G/standards/tech-stack.md" "standard"
    download_file "$REPO_URL/specwright/standards/plan-review-guidelines.md" "$G/standards/plan-review-guidelines.md" "standard"
    substep_done

    # --- CLAUDE templates (2) ---
    substep "CLAUDE templates" "2"
    download_file "$REPO_URL/specwright/templates/CLAUDE-LITE.md" "$G/templates/CLAUDE-LITE.md"
    download_file "$REPO_URL/specwright/templates/CLAUDE-PLATFORM.md" "$G/templates/CLAUDE-PLATFORM.md"
    substep_done

    # --- Product templates (11) ---
    substep "Product templates" "11"
    local product_files=(
        product-brief-template.md product-brief-lite-template.md tech-stack-template.md
        roadmap-template.md architecture-decision-template.md boilerplate-structure-template.md
        design-system-template.md ux-patterns-template.md blocker-analysis-template.md
        milestone-plan-template.md secrets-template.md
    )
    for f in "${product_files[@]}"; do
        download_file "$REPO_URL/specwright/templates/product/$f" "$G/templates/product/$f"
    done
    substep_done

    # --- Concept templates (7) ---
    substep "Concept templates" "7"
    local concept_files=(
        concept-analysis-template.md domain-research-template.md competence-map-template.md
        proposal-concept-template.md pitch-script-template.md poc-plan-template.md
        overview-template.md
    )
    for f in "${concept_files[@]}"; do
        download_file "$REPO_URL/specwright/templates/concept/$f" "$G/templates/concept/$f"
    done
    substep_done

    # --- Platform templates (7) ---
    substep "Platform templates" "7"
    local platform_files=(
        platform-brief-template.md module-brief-template.md module-dependencies-template.md
        platform-architecture-template.md platform-roadmap-template.md module-roadmap-template.md
        platform-blocker-analysis-template.md
    )
    for f in "${platform_files[@]}"; do
        download_file "$REPO_URL/specwright/templates/platform/$f" "$G/templates/platform/$f"
    done
    substep_done

    # --- Skill templates (~60) ---
    substep "Skill templates" "60"
    # Quality gates, PO, Architect
    download_file "$REPO_URL/specwright/templates/skills/quality-gates/SKILL.md" "$G/templates/skills/quality-gates/SKILL.md"
    download_file "$REPO_URL/specwright/templates/skills/po-requirements/SKILL.md" "$G/templates/skills/po-requirements/SKILL.md"
    download_file "$REPO_URL/specwright/templates/skills/architect-refinement/SKILL.md" "$G/templates/skills/architect-refinement/SKILL.md"

    # Frontend: angular, react, vue (6 each)
    local frontend_frameworks=(angular react vue)
    local frontend_files=(SKILL.md components.md state-management.md api-integration.md forms-validation.md dos-and-donts.md)
    for fw in "${frontend_frameworks[@]}"; do
        for f in "${frontend_files[@]}"; do
            download_file "$REPO_URL/specwright/templates/skills/frontend/$fw/$f" "$G/templates/skills/frontend/$fw/$f"
        done
    done

    # Backend: rails, nestjs, spring (6 each)
    local backend_frameworks=(rails nestjs spring)
    local backend_files=(SKILL.md services.md models.md api-design.md testing.md dos-and-donts.md)
    for fw in "${backend_frameworks[@]}"; do
        for f in "${backend_files[@]}"; do
            download_file "$REPO_URL/specwright/templates/skills/backend/$fw/$f" "$G/templates/skills/backend/$fw/$f"
        done
    done

    # DevOps (4)
    local devops_files=(SKILL.md docker.md ci-cd.md dos-and-donts.md)
    for f in "${devops_files[@]}"; do
        download_file "$REPO_URL/specwright/templates/skills/devops/docker-github/$f" "$G/templates/skills/devops/docker-github/$f"
    done

    # Domain (2)
    download_file "$REPO_URL/specwright/templates/skills/domain/SKILL.md" "$G/templates/skills/domain/SKILL.md"
    download_file "$REPO_URL/specwright/templates/skills/domain/process.md" "$G/templates/skills/domain/process.md"

    # Custom skill templates (3)
    download_file "$REPO_URL/specwright/templates/skills/custom-skill-template.md" "$G/templates/skills/custom-skill-template.md"
    download_file "$REPO_URL/specwright/templates/skills/custom-skill-module-template.md" "$G/templates/skills/custom-skill-module-template.md"
    download_file "$REPO_URL/specwright/templates/skills/custom-skill-dos-and-donts-template.md" "$G/templates/skills/custom-skill-dos-and-donts-template.md"

    # Platform skills (4)
    local platform_skills=(system-integration-patterns dependency-management modular-architecture platform-scalability)
    for s in "${platform_skills[@]}"; do
        download_file "$REPO_URL/specwright/templates/skills/platform/$s/SKILL.md" "$G/templates/skills/platform/$s/SKILL.md"
    done

    # Orchestration (1)
    download_file "$REPO_URL/specwright/templates/skills/orchestration/orchestration/SKILL.md" "$G/templates/skills/orchestration/orchestration/SKILL.md"

    # Generic skill (1)
    download_file "$REPO_URL/specwright/templates/skills/generic-skill/SKILL.md" "$G/templates/skills/generic-skill/SKILL.md"

    # Base skill (1)
    download_file "$REPO_URL/specwright/templates/skills/skill/SKILL.md" "$G/templates/skills/skill/SKILL.md"

    # Product planning skills (5)
    local planning_skills=(product-strategy tech-stack-recommendation design-system-extraction ux-patterns-definition architecture-decision)
    for s in "${planning_skills[@]}"; do
        download_file "$REPO_URL/specwright/templates/skills/$s/SKILL.md" "$G/templates/skills/$s/SKILL.md"
    done

    # Additional skill templates (5)
    local additional_skills=(api-implementation-patterns component-architecture deployment-automation file-organization-patterns testing-strategies)
    for s in "${additional_skills[@]}"; do
        download_file "$REPO_URL/specwright/templates/skills/$s/SKILL.md" "$G/templates/skills/$s/SKILL.md"
    done
    substep_done

    # --- Documentation templates (22) ---
    substep "Documentation templates" "22"
    local doc_files=(
        spec-template.md spec-lite-template.md user-stories-template.md story-template.md
        story-index-template.md backlog-story-index-template.md cross-cutting-decisions-template.md
        bug-description-template.md kanban-board-template.md handover-doc-template.md
        changelog-entry-template.md dod-template.md dor-template.md effort-estimation-template.md
        implementation-plan-template.md test-scenarios-template.md user-todos-template.md
        bug-fix-implementation-plan-template.md skill-index-template.md
        system-story-997-code-review-template.md system-story-998-integration-validation-template.md
        system-story-999-finalize-pr-template.md
    )
    for f in "${doc_files[@]}"; do
        download_file "$REPO_URL/specwright/templates/docs/$f" "$G/templates/docs/$f"
    done
    substep_done

    # --- Document templates (16) ---
    substep "Document templates" "16"
    local document_files=(
        product-brief.md product-brief-lite.md tech-stack.md roadmap.md
        architecture-decision.md architecture-structure.md competitor-analysis.md
        market-position.md design-system.md definition-of-done.md definition-of-ready.md
        story.md stil-tone.md seo-keywords.md landing-page-module-structure.md
        landingpage-contents.md
    )
    for f in "${document_files[@]}"; do
        download_file "$REPO_URL/specwright/templates/documents/$f" "$G/templates/documents/$f"
    done
    substep_done

    # --- Market validation templates (7) ---
    substep "Market validation templates" "7"
    local mv_files=(
        product-brief.md competitor-analysis.md market-positioning.md
        validation-plan.md validation-results.md ad-campaigns.md analytics-setup.md
    )
    for f in "${mv_files[@]}"; do
        download_file "$REPO_URL/specwright/templates/market-validation/$f" "$G/templates/market-validation/$f"
    done
    substep_done

    # --- Knowledge templates (5) ---
    substep "Knowledge templates" "5"
    local knowledge_files=(
        knowledge-index-template.md api-contracts-template.md data-models-template.md
        shared-services-template.md ui-components-template.md
    )
    for f in "${knowledge_files[@]}"; do
        download_file "$REPO_URL/specwright/templates/knowledge/$f" "$G/templates/knowledge/$f"
    done
    substep_done

    # --- Research templates (2) ---
    substep "Research templates" "2"
    download_file "$REPO_URL/specwright/templates/research/research-notes.md" "$G/templates/research/research-notes.md"
    download_file "$REPO_URL/specwright/templates/research/research-questions.md" "$G/templates/research/research-questions.md"
    substep_done

    # --- JSON templates (3) ---
    substep "JSON templates" "3"
    download_file "$REPO_URL/specwright/templates/json/backlog-template.json" "$G/templates/json/backlog-template.json"
    download_file "$REPO_URL/specwright/templates/json/execution-kanban-template.json" "$G/templates/json/execution-kanban-template.json"
    download_file "$REPO_URL/specwright/templates/json/spec-kanban-template.json" "$G/templates/json/spec-kanban-template.json"
    substep_done

    # --- JSON schemas (4) ---
    substep "JSON schemas" "4"
    download_file "$REPO_URL/specwright/templates/schemas/backlog-schema.json" "$G/templates/schemas/backlog-schema.json"
    download_file "$REPO_URL/specwright/templates/schemas/execution-kanban-schema.json" "$G/templates/schemas/execution-kanban-schema.json"
    download_file "$REPO_URL/specwright/templates/schemas/spec-kanban-schema.json" "$G/templates/schemas/spec-kanban-schema.json"
    download_file "$REPO_URL/specwright/templates/schemas/feedback-analysis-schema.json" "$G/templates/schemas/feedback-analysis-schema.json"
    substep_done
}

# =============================================================================
# [2/N] Market Validation Global
# =============================================================================

install_market_validation_global() {
    step "Installing market validation (global)..."

    local G="$HOME/.specwright"
    local C="$HOME/.claude"

    if [[ "$FLAG_DRY_RUN" != true ]]; then
        mkdir -p "$G/templates/market-validation"
        mkdir -p "$G/workflows/validation"
        mkdir -p "$C/agents"
        mkdir -p "$C/commands/specwright"
    fi

    # Workflows (3)
    substep "Validation workflows" "3"
    download_file "$REPO_URL/specwright/workflows/validation/validate-market.md" "$G/workflows/validation/validate-market.md" "workflow"
    download_file "$REPO_URL/specwright/workflows/validation/validate-market-for-existing.md" "$G/workflows/validation/validate-market-for-existing.md" "workflow"
    download_file "$REPO_URL/specwright/workflows/validation/README.md" "$G/workflows/validation/README.md" "workflow"
    substep_done

    # Agents (10)
    substep "Validation agents" "10"
    local agents=(
        product-strategist.md validation-specialist.md business-analyst.md
        marketing-system__product-idea-refiner.md marketing-system__market-researcher.md
        marketing-system__product-strategist.md marketing-system__content-creator.md
        marketing-system__seo-expert.md marketing-system__landing-page-builder.md
        marketing-system__quality-assurance.md
    )
    for a in "${agents[@]}"; do
        download_file "$REPO_URL/.claude/agents/$a" "$C/agents/$a"
    done
    substep_done

    # Commands (2)
    substep "Validation commands" "2"
    download_file "$REPO_URL/.claude/commands/specwright/validate-market.md" "$C/commands/specwright/validate-market.md"
    download_file "$REPO_URL/.claude/commands/specwright/validate-market-for-existing.md" "$C/commands/specwright/validate-market-for-existing.md"
    substep_done
}

# =============================================================================
# [3/N] Project Setup
# =============================================================================

install_project() {
    step "Installing project setup..."

    if [[ "$FLAG_DRY_RUN" != true ]]; then
        mkdir -p specwright/standards
        mkdir -p specwright/workflows/core/execute-tasks/shared
        mkdir -p specwright/workflows/core/guidelines
        mkdir -p specwright/workflows/meta
        mkdir -p specwright/workflows/marketing
        mkdir -p specwright/workflows/team
        mkdir -p specwright/workflows/validation
        mkdir -p specwright/scripts
        mkdir -p specwright/templates/product
        mkdir -p specwright/docs
    fi

    # Standards (3)
    substep "Standards" "3"
    download_file "$REPO_URL/specwright/standards/code-style.md" "specwright/standards/code-style.md" "standard"
    download_file "$REPO_URL/specwright/standards/best-practices.md" "specwright/standards/best-practices.md" "standard"
    download_file "$REPO_URL/specwright/standards/plan-review-guidelines.md" "specwright/standards/plan-review-guidelines.md" "standard"
    substep_done

    # Documentation (3)
    substep "Documentation" "3"
    download_file "$REPO_URL/specwright/docs/story-sizing-guidelines.md" "specwright/docs/story-sizing-guidelines.md"
    download_file "$REPO_URL/specwright/docs/mcp-setup-guide.md" "specwright/docs/mcp-setup-guide.md"
    download_file "$REPO_URL/specwright/docs/agent-learning-guide.md" "specwright/docs/agent-learning-guide.md"
    substep_done

    # Core workflows
    substep "Core workflows" "30"
    # Meta
    download_file "$REPO_URL/specwright/workflows/meta/pre-flight.md" "specwright/workflows/meta/pre-flight.md" "workflow"
    # Security template
    download_file "$REPO_URL/specwright/templates/product/secrets-template.md" "specwright/templates/product/secrets-template.md"
    # Product/Platform planning
    download_file "$REPO_URL/specwright/workflows/core/plan-product.md" "specwright/workflows/core/plan-product.md" "workflow"
    download_file "$REPO_URL/specwright/workflows/core/plan-platform.md" "specwright/workflows/core/plan-platform.md" "workflow"
    # Team setup
    download_file "$REPO_URL/specwright/workflows/core/build-development-team.md" "specwright/workflows/core/build-development-team.md" "workflow"
    # Spec development
    download_file "$REPO_URL/specwright/workflows/core/create-spec.md" "specwright/workflows/core/create-spec.md" "workflow"
    download_file "$REPO_URL/specwright/workflows/core/add-story.md" "specwright/workflows/core/add-story.md" "workflow"
    download_file "$REPO_URL/specwright/workflows/core/retroactive-doc.md" "specwright/workflows/core/retroactive-doc.md" "workflow"
    download_file "$REPO_URL/specwright/workflows/core/retroactive-spec.md" "specwright/workflows/core/retroactive-spec.md" "workflow"
    # Bug management
    download_file "$REPO_URL/specwright/workflows/core/add-bug.md" "specwright/workflows/core/add-bug.md" "workflow"
    # Execute tasks (10)
    download_file "$REPO_URL/specwright/workflows/core/execute-tasks/entry-point.md" "specwright/workflows/core/execute-tasks/entry-point.md" "workflow"
    download_file "$REPO_URL/specwright/workflows/core/execute-tasks/spec-phase-1.md" "specwright/workflows/core/execute-tasks/spec-phase-1.md" "workflow"
    download_file "$REPO_URL/specwright/workflows/core/execute-tasks/spec-phase-2.md" "specwright/workflows/core/execute-tasks/spec-phase-2.md" "workflow"
    download_file "$REPO_URL/specwright/workflows/core/execute-tasks/spec-phase-3.md" "specwright/workflows/core/execute-tasks/spec-phase-3.md" "workflow"
    download_file "$REPO_URL/specwright/workflows/core/execute-tasks/backlog-phase-1.md" "specwright/workflows/core/execute-tasks/backlog-phase-1.md" "workflow"
    download_file "$REPO_URL/specwright/workflows/core/execute-tasks/backlog-phase-2.md" "specwright/workflows/core/execute-tasks/backlog-phase-2.md" "workflow"
    download_file "$REPO_URL/specwright/workflows/core/execute-tasks/backlog-phase-3.md" "specwright/workflows/core/execute-tasks/backlog-phase-3.md" "workflow"
    download_file "$REPO_URL/specwright/workflows/core/execute-tasks/shared/resume-context.md" "specwright/workflows/core/execute-tasks/shared/resume-context.md" "workflow"
    download_file "$REPO_URL/specwright/workflows/core/execute-tasks/shared/error-handling.md" "specwright/workflows/core/execute-tasks/shared/error-handling.md" "workflow"
    download_file "$REPO_URL/specwright/workflows/core/execute-tasks/shared/skill-extraction.md" "specwright/workflows/core/execute-tasks/shared/skill-extraction.md" "workflow"
    # Guidelines
    download_file "$REPO_URL/specwright/workflows/core/guidelines/model-selection.md" "specwright/workflows/core/guidelines/model-selection.md" "workflow"
    # Backlog / Quick tasks
    download_file "$REPO_URL/specwright/workflows/core/add-todo.md" "specwright/workflows/core/add-todo.md" "workflow"
    # Brainstorming
    download_file "$REPO_URL/specwright/workflows/core/start-brainstorming.md" "specwright/workflows/core/start-brainstorming.md" "workflow"
    download_file "$REPO_URL/specwright/workflows/core/transfer-and-create-spec.md" "specwright/workflows/core/transfer-and-create-spec.md" "workflow"
    download_file "$REPO_URL/specwright/workflows/core/transfer-and-create-bug.md" "specwright/workflows/core/transfer-and-create-bug.md" "workflow"
    download_file "$REPO_URL/specwright/workflows/core/transfer-and-plan-product.md" "specwright/workflows/core/transfer-and-plan-product.md" "workflow"
    # Skill management
    download_file "$REPO_URL/specwright/workflows/core/add-skill.md" "specwright/workflows/core/add-skill.md" "workflow"
    # Self-learning
    download_file "$REPO_URL/specwright/workflows/core/add-learning.md" "specwright/workflows/core/add-learning.md" "workflow"
    download_file "$REPO_URL/specwright/workflows/core/add-domain.md" "specwright/workflows/core/add-domain.md" "workflow"
    # Spec management
    download_file "$REPO_URL/specwright/workflows/core/change-spec.md" "specwright/workflows/core/change-spec.md" "workflow"
    download_file "$REPO_URL/specwright/workflows/core/document-feature.md" "specwright/workflows/core/document-feature.md" "workflow"
    # Analysis & Estimation
    download_file "$REPO_URL/specwright/workflows/core/analyze-product.md" "specwright/workflows/core/analyze-product.md" "workflow"
    download_file "$REPO_URL/specwright/workflows/core/analyze-feasibility.md" "specwright/workflows/core/analyze-feasibility.md" "workflow"
    download_file "$REPO_URL/specwright/workflows/core/analyze-blockers.md" "specwright/workflows/core/analyze-blockers.md" "workflow"
    download_file "$REPO_URL/specwright/workflows/core/estimate-spec.md" "specwright/workflows/core/estimate-spec.md" "workflow"
    download_file "$REPO_URL/specwright/workflows/core/validate-estimation.md" "specwright/workflows/core/validate-estimation.md" "workflow"
    # Feedback & Changelog
    download_file "$REPO_URL/specwright/workflows/core/process-feedback.md" "specwright/workflows/core/process-feedback.md" "workflow"
    download_file "$REPO_URL/specwright/workflows/core/update-changelog.md" "specwright/workflows/core/update-changelog.md" "workflow"
    # Design extraction
    download_file "$REPO_URL/specwright/workflows/core/extract-design.md" "specwright/workflows/core/extract-design.md" "workflow"
    # Upselling
    download_file "$REPO_URL/specwright/workflows/core/brainstorm-upselling-ideas.md" "specwright/workflows/core/brainstorm-upselling-ideas.md" "workflow"
    substep_done

    # Marketing workflows (2)
    substep "Marketing workflows" "2"
    download_file "$REPO_URL/specwright/workflows/marketing/create-instagram-account.md" "specwright/workflows/marketing/create-instagram-account.md" "workflow"
    download_file "$REPO_URL/specwright/workflows/marketing/create-content-plan.md" "specwright/workflows/marketing/create-content-plan.md" "workflow"
    substep_done

    # Team workflows (2)
    substep "Team workflows" "2"
    download_file "$REPO_URL/specwright/workflows/team/create-project-agents.md" "specwright/workflows/team/create-project-agents.md" "workflow"
    download_file "$REPO_URL/specwright/workflows/team/assign-skills-to-agent.md" "specwright/workflows/team/assign-skills-to-agent.md" "workflow"
    substep_done

    # Validation workflows (3)
    substep "Validation workflows" "3"
    download_file "$REPO_URL/specwright/workflows/validation/validate-market.md" "specwright/workflows/validation/validate-market.md" "workflow"
    download_file "$REPO_URL/specwright/workflows/validation/validate-market-for-existing.md" "specwright/workflows/validation/validate-market-for-existing.md" "workflow"
    download_file "$REPO_URL/specwright/workflows/validation/README.md" "specwright/workflows/validation/README.md" "workflow"
    substep_done

    # Automation script (1)
    substep "Automation script" "1"
    download_file "$REPO_URL/specwright/scripts/auto-execute.sh" "specwright/scripts/auto-execute.sh"
    if [[ "$FLAG_DRY_RUN" != true && -f "specwright/scripts/auto-execute.sh" ]]; then
        chmod +x specwright/scripts/auto-execute.sh
    fi
    substep_done

    # Config.yml
    substep "Configuration" "1"
    if [[ ! -f "specwright/config.yml" && "$FLAG_DRY_RUN" != true ]]; then
        cat > specwright/config.yml << 'CONFIGEOF'
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
CONFIGEOF
        FILES_INSTALLED=$((FILES_INSTALLED + 1))
    elif [[ -f "specwright/config.yml" ]]; then
        FILES_SKIPPED=$((FILES_SKIPPED + 1))
    elif [[ "$FLAG_DRY_RUN" == true ]]; then
        FILES_INSTALLED=$((FILES_INSTALLED + 1))
    fi
    substep_done

    # CLAUDE.md
    substep "CLAUDE.md" "1"
    if [[ ! -f "CLAUDE.md" ]]; then
        download_file "$REPO_URL/CLAUDE.md" "CLAUDE.md"
    elif [[ "$FLAG_DRY_RUN" != true ]]; then
        # Don't overwrite existing CLAUDE.md, but provide template
        if [[ ! -f "CLAUDE.md.template" ]]; then
            download_file "$REPO_URL/CLAUDE.md" "CLAUDE.md.template"
        else
            FILES_SKIPPED=$((FILES_SKIPPED + 1))
        fi
    else
        FILES_SKIPPED=$((FILES_SKIPPED + 1))
    fi
    substep_done

    # Per-project installed version
    if [[ "$FLAG_DRY_RUN" != true ]]; then
        echo "$FRAMEWORK_VERSION" > "specwright/.installed-version"
    fi
}

# =============================================================================
# [4/N] MCP Server
# =============================================================================

install_mcp() {
    step "Installing MCP server..."

    local MCP_DIR="$HOME/.specwright/scripts/mcp"

    if [[ "$FLAG_DRY_RUN" == true ]]; then
        substep "MCP server files" "4"
        FILES_INSTALLED=$((FILES_INSTALLED + 4))
        substep_done
        substep "MCP dependencies" "npm"
        substep_done
        substep "MCP configuration" "1"
        FILES_INSTALLED=$((FILES_INSTALLED + 1))
        substep_done
        return
    fi

    mkdir -p "$MCP_DIR"

    # Copy or download MCP server files
    substep "MCP server files" "4"
    local mcp_files=(kanban-mcp-server.ts kanban-lock.ts story-parser.ts item-templates.ts)
    if [[ "$DETECT_FRAMEWORK_REPO" == true ]]; then
        # Local copy in framework repo
        for f in "${mcp_files[@]}"; do
            copy_file "specwright/scripts/mcp/$f" "$MCP_DIR/$f"
        done
    else
        # Download from GitHub
        for f in "${mcp_files[@]}"; do
            download_file "$REPO_URL/specwright/scripts/mcp/$f" "$MCP_DIR/$f"
        done
    fi
    substep_done

    # Package.json + npm install
    substep "MCP dependencies" "npm"
    cat > "$MCP_DIR/package.json" << 'PKGEOF'
{
  "name": "kanban-mcp-server",
  "version": "1.0.0",
  "type": "module",
  "dependencies": {
    "@modelcontextprotocol/sdk": "^1.0.4",
    "@anthropic-ai/sdk": "^0.32.0"
  }
}
PKGEOF
    (cd "$MCP_DIR" && npm install --silent 2>/dev/null) || {
        echo -e " ${YELLOW}[warning: npm install failed]${RESET}"
        return 0
    }
    substep_done

    # Configure .mcp.json
    substep "MCP configuration" "1"
    local MCP_CONFIG=".mcp.json"
    if [[ -f "$MCP_CONFIG" ]]; then
        if grep -q '"kanban"' "$MCP_CONFIG" 2>/dev/null; then
            FILES_SKIPPED=$((FILES_SKIPPED + 1))
        else
            # Backup and merge
            cp "$MCP_CONFIG" "${MCP_CONFIG}.backup.$(date +%s)"
            python3 << PYEOF 2>/dev/null || {
import json
with open('$MCP_CONFIG', 'r') as f:
    config = json.load(f)
if 'mcpServers' not in config:
    config['mcpServers'] = {}
config['mcpServers']['kanban'] = {
    'command': 'npx',
    'args': ['tsx', '$MCP_DIR/kanban-mcp-server.ts']
}
with open('$MCP_CONFIG', 'w') as f:
    json.dump(config, f, indent=2)
PYEOF
                echo -e " ${YELLOW}[warning: auto-merge failed, add kanban entry manually]${RESET}"
            }
            FILES_INSTALLED=$((FILES_INSTALLED + 1))
        fi
    else
        cat > "$MCP_CONFIG" << MCPEOF
{
  "mcpServers": {
    "kanban": {
      "command": "npx",
      "args": ["tsx", "$MCP_DIR/kanban-mcp-server.ts"]
    }
  }
}
MCPEOF
        FILES_INSTALLED=$((FILES_INSTALLED + 1))
    fi
    substep_done
}

# =============================================================================
# [5/N] Claude Code Commands & Agents
# =============================================================================

install_claude_code() {
    step "Installing Claude Code commands & agents..."

    if [[ "$FLAG_DRY_RUN" != true ]]; then
        mkdir -p .claude/commands/specwright
        mkdir -p .claude/agents
        mkdir -p .claude/skills/review-implementation-plan
    fi

    # Commands (35)
    substep "Commands" "35"
    local command_files=(
        plan-product.md plan-platform.md
        create-spec.md change-spec.md
        add-story.md add-bug.md add-todo.md
        execute-tasks.md
        retroactive-doc.md retroactive-spec.md document-feature.md
        build-development-team.md create-project-agents.md assign-skills-to-agent.md add-skill.md
        add-learning.md add-domain.md
        start-brainstorming.md brainstorm-upselling-ideas.md
        validate-market.md validate-market-for-existing.md
        transfer-and-create-spec.md transfer-and-create-bug.md transfer-and-plan-product.md
        analyze-product.md analyze-feasibility.md analyze-blockers.md
        estimate-spec.md validate-estimation.md
        process-feedback.md update-changelog.md
        extract-design.md
        create-instagram-account.md create-content-plan.md
        check-update.md
    )
    for f in "${command_files[@]}"; do
        download_file "$REPO_URL/.claude/commands/specwright/$f" ".claude/commands/specwright/$f"
    done
    substep_done

    # Agents (13)
    substep "Agents" "13"
    local agent_files=(
        context-fetcher.md file-creator.md git-workflow.md date-checker.md
        test-runner.md codebase-analyzer.md
        product-strategist.md tech-architect.md design-extractor.md
        ux-designer.md business-analyst.md validation-specialist.md
        estimation-specialist.md
    )
    for f in "${agent_files[@]}"; do
        download_file "$REPO_URL/.claude/agents/$f" ".claude/agents/$f"
    done
    substep_done

    # Skills (1)
    substep "Skills" "1"
    download_file "$REPO_URL/.claude/skills/review-implementation-plan/SKILL.md" ".claude/skills/review-implementation-plan/SKILL.md"
    substep_done

}

# =============================================================================
# [6/N] Market Validation Project
# =============================================================================

install_market_validation_project() {
    step "Installing market validation (project)..."

    substep "Project directories" "1"
    if [[ "$FLAG_DRY_RUN" != true ]]; then
        mkdir -p specwright/market-validation
    fi
    FILES_INSTALLED=$((FILES_INSTALLED + 1))
    substep_done

    # Update config.yml if it exists
    substep "Config update" "1"
    if [[ "$FLAG_DRY_RUN" != true && -f specwright/config.yml ]]; then
        if ! grep -q "market_validation:" specwright/config.yml 2>/dev/null; then
            cat >> specwright/config.yml << 'MVEOF'

# Market Validation Configuration (uses global installation)
market_validation:
  enabled: true
  lookup_order:
    - project
    - global
MVEOF
            FILES_INSTALLED=$((FILES_INSTALLED + 1))
        else
            FILES_SKIPPED=$((FILES_SKIPPED + 1))
        fi
    elif [[ "$FLAG_DRY_RUN" == true ]]; then
        FILES_INSTALLED=$((FILES_INSTALLED + 1))
    fi
    substep_done
}

# =============================================================================
# 6. Version Marker
# =============================================================================

write_version_marker() {
    if [[ "$FLAG_DRY_RUN" == true ]]; then
        return
    fi

    mkdir -p "$HOME/.specwright"

    # Legacy marker (backward compat)
    local marker="$HOME/.specwright/.installer-version"
    echo "version=$INSTALLER_VERSION" > "$marker"
    echo "installed=$(date -u +%Y-%m-%dT%H:%M:%SZ)" >> "$marker"

    # Framework version
    echo "$FRAMEWORK_VERSION" > "$HOME/.specwright/.version"
}

# =============================================================================
# 7. Summary
# =============================================================================

print_summary() {
    echo ""
    echo "========================="

    if [[ "$FLAG_DRY_RUN" == true ]]; then
        echo -e "${BOLD}Dry run complete.${RESET}"
        echo ""
        echo "  Would install: $FILES_INSTALLED files"
        echo "  Would skip:    $FILES_SKIPPED files (already exist)"
    else
        echo -e "${BOLD}Installation complete!${RESET}"
        echo ""
        echo "  Installed: $FILES_INSTALLED files"
        echo "  Skipped:   $FILES_SKIPPED files (already exist)"
        [[ $FILES_FAILED -gt 0 ]] && echo -e "  ${RED}Failed:    $FILES_FAILED files${RESET}" || true
    fi

    echo ""
    echo -e "${BOLD}Next steps:${RESET}"
    echo "  1. Open your project in Claude Code"
    echo "  2. Run /plan-product to start planning"
    echo ""
    echo "  Quick reference:"
    echo "    /plan-product           Product planning"
    echo "    /build-development-team Create development skills"
    echo "    /create-spec            Create user stories"
    echo "    /execute-tasks          Execute stories"
    echo "    /add-todo               Quick task to backlog"
    echo "    /add-bug                Bug with root-cause analysis"
    echo ""
    echo "  For more info: https://github.com/michsindlinger/specwright"
    echo ""
}

# =============================================================================
# Main
# =============================================================================

main() {
    check_prerequisites
    auto_detect
    determine_install_plan
    display_plan

    # Check if there's anything to do
    local anything=false
    if [[ "$INSTALL_GLOBAL" == true || "$INSTALL_MARKET_VALIDATION_GLOBAL" == true ||
          "$INSTALL_PROJECT" == true || "$INSTALL_MCP" == true ||
          "$INSTALL_CLAUDE_CODE" == true || "$INSTALL_MARKET_VALIDATION_PROJECT" == true ]]; then
        anything=true
    fi

    if [[ "$anything" == false ]]; then
        echo "Nothing to install. Use --all or specify components."
        exit 0
    fi

    confirm_install

    count_steps

    # Execute installation steps in order
    [[ "$INSTALL_GLOBAL" == true ]] && install_global || true
    [[ "$INSTALL_MARKET_VALIDATION_GLOBAL" == true ]] && install_market_validation_global || true
    [[ "$INSTALL_PROJECT" == true ]] && install_project || true
    [[ "$INSTALL_MCP" == true ]] && install_mcp || true
    [[ "$INSTALL_CLAUDE_CODE" == true ]] && install_claude_code || true
    [[ "$INSTALL_MARKET_VALIDATION_PROJECT" == true ]] && install_market_validation_project || true

    write_version_marker
    print_summary
}

main
