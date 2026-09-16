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

INSTALLER_VERSION="2.0"
FRAMEWORK_VERSION="4.1.1"
REPO_URL="${SPECWRIGHT_REPO_URL:-https://raw.githubusercontent.com/michsindlinger/specwright/main}"

# --- shared installer library (file lists live in specwright/manifest.tsv) --------------------
sw_load_lib() {
    export SW_REPO_URL="$REPO_URL"
    case "$REPO_URL" in
        file://*) . "${REPO_URL#file://}/specwright/scripts/install-lib.sh" ;;
        *) local t; t=$(mktemp); curl -sSLf "$REPO_URL/specwright/scripts/install-lib.sh" -o "$t" || { echo "Error: cannot load $REPO_URL/specwright/scripts/install-lib.sh"; exit 1; }; . "$t"; rm -f "$t" ;;
    esac
    SW_QUIET=true
}
sw_configure() {
    SW_DRY_RUN=$FLAG_DRY_RUN; SW_OVERWRITE=$FLAG_OVERWRITE
    SW_OVERWRITE_WORKFLOW=$FLAG_OVERWRITE_WORKFLOWS; SW_OVERWRITE_STANDARD=$FLAG_OVERWRITE_STANDARDS
    SW_OVERWRITE_COMMAND=$FLAG_OVERWRITE_COMMANDS; SW_OVERWRITE_AGENT=$FLAG_OVERWRITE_COMMANDS; SW_OVERWRITE_SKILL=$FLAG_OVERWRITE_COMMANDS
    SW_OVERWRITE_MCP_SCRIPT=true
    [[ "$FLAG_UPDATE" == true ]] && SW_MODE=update || SW_MODE=install
    sw_fetch_manifest || { echo "Error: manifest not loadable from $REPO_URL"; exit 1; }
}

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
FLAG_OVERWRITE_COMMANDS=false
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
        --overwrite-commands)  FLAG_OVERWRITE_COMMANDS=true; shift ;;
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
  --overwrite-commands  Overwrite only command & agent files
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
INSTALL_PROJECT=false
INSTALL_MCP=false
INSTALL_CLAUDE_CODE=false
determine_install_plan() {
    if [[ "$FLAG_ALL" == true || "$EXPLICIT_MODE" == false ]]; then
        # Install everything that makes sense
        INSTALL_GLOBAL=true
        INSTALL_PROJECT=true
        INSTALL_CLAUDE_CODE=true

        if [[ "$FLAG_NO_MCP" != true && "$DETECT_NODE_AVAILABLE" == true ]]; then
            INSTALL_MCP=true
        fi
    else
        # Explicit mode selection
        [[ "$FLAG_GLOBAL" == true ]] && INSTALL_GLOBAL=true || true
        [[ "$FLAG_PROJECT" == true ]] && INSTALL_PROJECT=true || true
        [[ "$FLAG_CLAUDE_CODE" == true ]] && INSTALL_CLAUDE_CODE=true || true

        # MCP only if project is being installed and not disabled
        if [[ "$INSTALL_PROJECT" == true && "$FLAG_NO_MCP" != true && "$DETECT_NODE_AVAILABLE" == true ]]; then
            INSTALL_MCP=true
        fi
    fi

    # --update implies overwrite for workflows, standards, commands & agents
    if [[ "$FLAG_UPDATE" == true ]]; then
        FLAG_OVERWRITE_WORKFLOWS=true
        FLAG_OVERWRITE_STANDARDS=true
        FLAG_OVERWRITE_COMMANDS=true
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
    print_plan_item "$INSTALL_GLOBAL" "Global templates & standards" "$(( $(sw_count template global) + $(sw_count standard global) )) files -> ~/.specwright/"
    print_plan_item "$INSTALL_PROJECT" "Project setup" "workflows, standards, config"
    print_plan_item "$INSTALL_MCP" "MCP server" "kanban server"
    print_plan_item "$INSTALL_CLAUDE_CODE" "Claude Code commands & agents" "$(sw_count command project) commands, $(sw_count agent project) agents, $(sw_count skill project) skills"

    if [[ "$FLAG_OVERWRITE" == true ]]; then
        echo ""
        echo -e "  ${YELLOW}Overwrite mode: ALL files${RESET}"
    elif [[ "$FLAG_OVERWRITE_WORKFLOWS" == true || "$FLAG_OVERWRITE_STANDARDS" == true || "$FLAG_OVERWRITE_COMMANDS" == true ]]; then
        echo ""
        [[ "$FLAG_OVERWRITE_WORKFLOWS" == true ]] && echo -e "  ${YELLOW}Overwrite: workflows${RESET}" || true
        [[ "$FLAG_OVERWRITE_STANDARDS" == true ]] && echo -e "  ${YELLOW}Overwrite: standards${RESET}" || true
        [[ "$FLAG_OVERWRITE_COMMANDS" == true ]] && echo -e "  ${YELLOW}Overwrite: commands & agents${RESET}" || true
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
        elif [[ ( "$category" == "command" || "$category" == "agent" ) && "$FLAG_OVERWRITE_COMMANDS" == true ]]; then
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

    # `-f` so curl exits non-zero on HTTP 4xx/5xx (e.g. GitHub rate-limit 429)
    # instead of silently writing an error page into $dest.
    if command -v curl &>/dev/null; then
        curl -sSLf "$url" -o "$dest" 2>/dev/null || {
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
    [[ "$INSTALL_PROJECT" == true ]] && total_steps=$((total_steps + 1)) || true
    [[ "$INSTALL_MCP" == true ]] && total_steps=$((total_steps + 1)) || true
    [[ "$INSTALL_CLAUDE_CODE" == true ]] && total_steps=$((total_steps + 1)) || true
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
    substep "Standards" "$(sw_count standard global)"; sw_install standard global; substep_done
    substep "Templates" "$(sw_count template global)"; sw_install template global; substep_done
    if [[ "$FLAG_UPDATE" == true ]]; then
        substep "Removing obsolete global files" "-"; sw_remove_obsolete global; substep_done
    fi
}


# =============================================================================
# [3/N] Project Setup
# =============================================================================

install_project() {
    step "Installing project setup..."

    substep "Standards" "$(sw_count standard project)"; sw_install standard project; substep_done
    substep "Documentation" "$(sw_count doc project)"; sw_install doc project; substep_done
    substep "Workflows" "$(sw_count workflow project)"; sw_install workflow project; substep_done
    substep "Templates" "$(sw_count template project)"; sw_install template project; substep_done
    substep "MCP profiles" "$(sw_count mcp-profile project)"; sw_install mcp-profile project; substep_done
    substep "Scripts" "$(sw_count script project)"; sw_install script project
    if [[ "$FLAG_DRY_RUN" != true && -f "specwright/scripts/auto-execute.sh" ]]; then
        chmod +x specwright/scripts/auto-execute.sh
    fi
    substep_done
    if [[ "$FLAG_UPDATE" == true ]]; then
        substep "Removing obsolete files" "-"; sw_remove_obsolete project; substep_done
    fi

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
        download_file "$REPO_URL/specwright/templates/sdlc/projekt/CLAUDE-template.md" "CLAUDE.md"
    elif [[ "$FLAG_DRY_RUN" != true ]]; then
        # Don't overwrite existing CLAUDE.md, but provide template
        if [[ ! -f "CLAUDE.md.template" ]]; then
            download_file "$REPO_URL/specwright/templates/sdlc/projekt/CLAUDE-template.md" "CLAUDE.md.template"
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

# Fallback: Create memory DB using sqlite3 CLI when tsx is unavailable
setup_memory_db_fallback() {
    local db_path="$1"

    if ! command -v sqlite3 &>/dev/null; then
        echo -e "  ${YELLOW}[warning: sqlite3 not found, memory DB will be created on first use]${RESET}"
        return 0
    fi

    sqlite3 "$db_path" << 'SQLEOF'
PRAGMA journal_mode=WAL;
PRAGMA foreign_keys=ON;

CREATE TABLE IF NOT EXISTS memory_tags (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL UNIQUE COLLATE NOCASE,
  description TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS memory_entries (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  project_id TEXT,
  topic TEXT NOT NULL,
  summary TEXT NOT NULL,
  details TEXT,
  source TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS memory_entry_tags (
  entry_id INTEGER NOT NULL REFERENCES memory_entries(id) ON DELETE CASCADE,
  tag_id INTEGER NOT NULL REFERENCES memory_tags(id) ON DELETE CASCADE,
  PRIMARY KEY (entry_id, tag_id)
);

CREATE INDEX IF NOT EXISTS idx_memory_entries_project ON memory_entries(project_id);
CREATE INDEX IF NOT EXISTS idx_memory_entries_topic ON memory_entries(topic);
CREATE INDEX IF NOT EXISTS idx_memory_entries_created ON memory_entries(created_at);

CREATE VIRTUAL TABLE IF NOT EXISTS memory_fts USING fts5(
  topic, summary, details,
  content='memory_entries', content_rowid='id'
);

CREATE TRIGGER IF NOT EXISTS memory_fts_ai AFTER INSERT ON memory_entries BEGIN
  INSERT INTO memory_fts(rowid, topic, summary, details)
    VALUES (new.id, new.topic, new.summary, new.details);
END;

CREATE TRIGGER IF NOT EXISTS memory_fts_ad AFTER DELETE ON memory_entries BEGIN
  INSERT INTO memory_fts(memory_fts, rowid, topic, summary, details)
    VALUES ('delete', old.id, old.topic, old.summary, old.details);
END;

CREATE TRIGGER IF NOT EXISTS memory_fts_au AFTER UPDATE ON memory_entries BEGIN
  INSERT INTO memory_fts(memory_fts, rowid, topic, summary, details)
    VALUES ('delete', old.id, old.topic, old.summary, old.details);
  INSERT INTO memory_fts(rowid, topic, summary, details)
    VALUES (new.id, new.topic, new.summary, new.details);
END;

INSERT OR IGNORE INTO memory_tags (name, description) VALUES ('architecture', 'Architectural decisions and patterns');
INSERT OR IGNORE INTO memory_tags (name, description) VALUES ('decision', 'Key decisions made during development');
INSERT OR IGNORE INTO memory_tags (name, description) VALUES ('feature', 'Feature descriptions and behavior');
INSERT OR IGNORE INTO memory_tags (name, description) VALUES ('backend', 'Backend-specific knowledge');
INSERT OR IGNORE INTO memory_tags (name, description) VALUES ('frontend', 'Frontend-specific knowledge');
INSERT OR IGNORE INTO memory_tags (name, description) VALUES ('database', 'Database schema, queries, and patterns');
INSERT OR IGNORE INTO memory_tags (name, description) VALUES ('api', 'API design and contracts');
INSERT OR IGNORE INTO memory_tags (name, description) VALUES ('testing', 'Testing strategies and patterns');
INSERT OR IGNORE INTO memory_tags (name, description) VALUES ('deployment', 'Deployment and infrastructure');
INSERT OR IGNORE INTO memory_tags (name, description) VALUES ('security', 'Security considerations and practices');
INSERT OR IGNORE INTO memory_tags (name, description) VALUES ('performance', 'Performance optimizations and benchmarks');
INSERT OR IGNORE INTO memory_tags (name, description) VALUES ('convention', 'Coding conventions and style guidelines');
INSERT OR IGNORE INTO memory_tags (name, description) VALUES ('dependency', 'External dependencies and libraries');
INSERT OR IGNORE INTO memory_tags (name, description) VALUES ('workflow', 'Development workflows and processes');
INSERT OR IGNORE INTO memory_tags (name, description) VALUES ('domain', 'Domain-specific business logic');
SQLEOF

    # v2 schema migration (each ALTER TABLE in its own call to suppress duplicate column errors)
    sqlite3 "$db_path" "ALTER TABLE memory_entries ADD COLUMN importance TEXT DEFAULT 'operational';" 2>/dev/null || true
    sqlite3 "$db_path" "ALTER TABLE memory_entries ADD COLUMN archived_at TEXT DEFAULT NULL;" 2>/dev/null || true
    sqlite3 "$db_path" "ALTER TABLE memory_entries ADD COLUMN access_count INTEGER DEFAULT 0;" 2>/dev/null || true
    sqlite3 "$db_path" "ALTER TABLE memory_entries ADD COLUMN last_accessed_at TEXT DEFAULT NULL;" 2>/dev/null || true

    sqlite3 "$db_path" << 'SQLV2'
CREATE TABLE IF NOT EXISTS memory_relations (
  source_id INTEGER NOT NULL REFERENCES memory_entries(id) ON DELETE CASCADE,
  target_id INTEGER NOT NULL REFERENCES memory_entries(id) ON DELETE CASCADE,
  relation_type TEXT NOT NULL DEFAULT 'related',
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  PRIMARY KEY (source_id, target_id)
);

CREATE INDEX IF NOT EXISTS idx_memory_entries_archived ON memory_entries(archived_at);
CREATE INDEX IF NOT EXISTS idx_memory_entries_importance ON memory_entries(importance);
CREATE INDEX IF NOT EXISTS idx_memory_relations_target ON memory_relations(target_id);
SQLV2
}

install_mcp() {
    step "Installing MCP server..."

    local MCP_DIR="$HOME/.specwright/scripts/mcp"

    if [[ "$FLAG_DRY_RUN" == true ]]; then
        substep "MCP server files" "5"
        FILES_INSTALLED=$((FILES_INSTALLED + 5))
        substep_done
        substep "MCP dependencies" "npm"
        substep_done
        substep "Memory database" "setup"
        substep_done
        substep "MCP configuration" "1"
        FILES_INSTALLED=$((FILES_INSTALLED + 1))
        substep_done
        return
    fi

    mkdir -p "$MCP_DIR"

    # Copy or download MCP server files
    # ALWAYS overwrite: MCP files are pure framework code, not user-customizable
    substep "MCP server files" "7"
    if [[ "$DETECT_FRAMEWORK_REPO" == true ]]; then
        sw_install mcp-script global
    else
        sw_install mcp-script global
    fi
    substep_done

    # Package.json + npm install
    substep "MCP dependencies" "npm"

    # Check for native build tools (required by better-sqlite3)
    if [[ "$(uname)" == "Darwin" ]]; then
        if ! xcode-select -p &>/dev/null; then
            echo -e "\n${RED}Error: Xcode Command Line Tools are required for better-sqlite3.${RESET}"
            echo -e "${YELLOW}Install them with: xcode-select --install${RESET}"
            echo -e "${YELLOW}Then re-run this installer.${RESET}"
            return 1
        fi
    fi

    cat > "$MCP_DIR/package.json" << 'PKGEOF'
{
  "name": "kanban-mcp-server",
  "version": "1.0.0",
  "type": "module",
  "dependencies": {
    "@modelcontextprotocol/sdk": "^1.0.4",
    "@anthropic-ai/sdk": "^0.32.0",
    "better-sqlite3": "^12.6.2",
    "tsx": "4.21.0"
  },
  "devDependencies": {
    "@types/better-sqlite3": "^7.6.12"
  }
}
PKGEOF
    (cd "$MCP_DIR" && npm install --silent 2>/dev/null) || {
        echo -e " ${YELLOW}[warning: npm install failed - better-sqlite3 requires C++ build tools]${RESET}"
        return 0
    }
    substep_done

    # Memory database setup
    # Creates ~/.specwright/memory.db with tables: memory_entries, memory_tags,
    # memory_entry_tags, and FTS5 virtual table memory_fts.
    # Seeds 15 initial tags via seedInitialTags (INSERT OR IGNORE into memory_tags).
    substep "Memory database" "setup"
    local MEMORY_DB="$HOME/.specwright/memory.db"
    local SETUP_SCRIPT="$MCP_DIR/_setup-memory.ts"

    if [[ -f "$MEMORY_DB" ]]; then
        # Update-safe: existing DB preserved, only seed missing tags
        cat > "$SETUP_SCRIPT" << 'SETUPEOF'
import { seedInitialTags } from './memory-store.js';
const result = seedInitialTags();
if (result.seeded > 0) {
  console.log('  Seeded ' + result.seeded + ' new tags (total: ' + result.total + ')');
}
SETUPEOF
    else
        # Fresh install: create DB, schema, WAL mode, seed tags
        cat > "$SETUP_SCRIPT" << 'SETUPEOF'
import { initMemoryDb, seedInitialTags } from './memory-store.js';
const init = initMemoryDb();
const seed = seedInitialTags();
console.log('  Created ' + init.path);
console.log('  Seeded ' + seed.seeded + ' tags');
SETUPEOF
    fi

    (cd "$MCP_DIR" && "$MCP_DIR/node_modules/.bin/tsx" _setup-memory.ts 2>/dev/null) || {
        echo -e " ${YELLOW}[warning: memory DB setup via tsx failed, trying sqlite3 fallback...]${RESET}"
        # Fallback: use sqlite3 CLI for schema creation
        setup_memory_db_fallback "$MEMORY_DB"
    }
    rm -f "$SETUP_SCRIPT"
    substep_done

    # Configure .mcp.json
    substep "MCP configuration" "1"
    local MCP_CONFIG=".mcp.json"
    if [[ -f "$MCP_CONFIG" ]]; then
        # Always (re)write the kanban entry so reinstalls upgrade legacy
        # "npx tsx" entries to the direct ".bin/tsx" launcher (no npx wrapper chain).
        # Backup first, then merge/overwrite.
        cp "$MCP_CONFIG" "${MCP_CONFIG}.backup.$(date +%s)"
        python3 << PYEOF 2>/dev/null || {
import json
with open('$MCP_CONFIG', 'r') as f:
    config = json.load(f)
if 'mcpServers' not in config:
    config['mcpServers'] = {}
config['mcpServers']['kanban'] = {
    'command': '$MCP_DIR/node_modules/.bin/tsx',
    'args': ['$MCP_DIR/kanban-mcp-server.ts']
}
with open('$MCP_CONFIG', 'w') as f:
    json.dump(config, f, indent=2)
PYEOF
            echo -e " ${YELLOW}[warning: auto-merge failed, add kanban entry manually]${RESET}"
        }
        FILES_INSTALLED=$((FILES_INSTALLED + 1))
    else
        cat > "$MCP_CONFIG" << MCPEOF
{
  "mcpServers": {
    "kanban": {
      "command": "$MCP_DIR/node_modules/.bin/tsx",
      "args": ["$MCP_DIR/kanban-mcp-server.ts"]
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
    substep "Commands" "$(sw_count command project)"; sw_install command project; substep_done
    substep "Agents" "$(sw_count agent project)"; sw_install agent project; substep_done
    substep "Skills" "$(sw_count skill project)"; sw_install skill project; substep_done
    if [[ "$FLAG_UPDATE" == true ]]; then
        substep "Removing obsolete Claude Code files" "-"; sw_remove_obsolete project; substep_done
    fi
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
    FILES_INSTALLED=$((FILES_INSTALLED + SW_INSTALLED + SW_UPDATED))
    FILES_SKIPPED=$((FILES_SKIPPED + SW_SKIPPED))
    FILES_FAILED=$((FILES_FAILED + SW_FAILED))
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
        [[ $SW_REMOVED -gt 0 ]] && echo "  Removed:   $SW_REMOVED files (no longer shipped)" || true
        [[ $SW_KEPT_MODIFIED -gt 0 ]] && echo -e "  ${YELLOW}Kept:      $SW_KEPT_MODIFIED obsolete files (locally modified — see specwright/keep.txt)${RESET}" || true
    fi

    echo ""
    echo -e "${BOLD}Next steps:${RESET}"
    echo "  1. Open your project in Claude Code"
    echo "  2. Run /intent to capture your first Vorhaben (or /plan-product for a new product)"
    echo ""
    echo "  Quick reference:"
    echo "    /intent                 Vorhaben festhalten (intent.md)"
    echo "    /spec                   Fachliche Spec (spec.md)"
    echo "    /plan                   Umsetzungsplan (plan.md)"
    echo "    /build                  Plan umsetzen bis PR"
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
    sw_load_lib
    sw_configure
    auto_detect
    determine_install_plan
    display_plan

    # Check if there's anything to do
    local anything=false
    if [[ "$INSTALL_GLOBAL" == true || "$INSTALL_PROJECT" == true || "$INSTALL_MCP" == true ||
          "$INSTALL_CLAUDE_CODE" == true ]]; then
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
    [[ "$INSTALL_PROJECT" == true ]] && install_project || true
    [[ "$INSTALL_MCP" == true ]] && install_mcp || true
    [[ "$INSTALL_CLAUDE_CODE" == true ]] && install_claude_code || true

    write_version_marker
    print_summary
}

main
