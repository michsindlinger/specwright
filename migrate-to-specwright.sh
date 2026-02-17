#!/bin/bash

# Specwright Migration Script
# Migrates existing Agent OS projects to Specwright
# Version: 1.0

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Defaults
AUTO_YES=false
NO_SYMLINKS=false
GLOBAL_ONLY=false
DRY_RUN=false
BACKUP_DIR=""

# Parse arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        --yes|-y)
            AUTO_YES=true
            shift
            ;;
        --no-symlinks)
            NO_SYMLINKS=true
            shift
            ;;
        --global-only)
            GLOBAL_ONLY=true
            shift
            ;;
        --dry-run)
            DRY_RUN=true
            shift
            ;;
        -h|--help)
            echo "Specwright Migration Script"
            echo ""
            echo "Migrates existing Agent OS projects to Specwright."
            echo ""
            echo "Usage: $0 [options]"
            echo ""
            echo "Options:"
            echo "  --yes, -y        Automatic confirmation (no prompts)"
            echo "  --no-symlinks    Skip creating backward-compatibility symlinks"
            echo "  --global-only    Only migrate ~/.agent-os/ to ~/.specwright/"
            echo "  --dry-run        Show what would change without making changes"
            echo "  -h, --help       Show this help message"
            echo ""
            echo "What this script does:"
            echo "  1. Renames agent-os/ -> specwright/"
            echo "  2. Renames .agent-os/ -> .specwright/"
            echo "  3. Renames .claude/commands/agent-os/ -> .claude/commands/specwright/"
            echo "  4. Updates file contents (path references)"
            echo "  5. Migrates ~/.agent-os/ -> ~/.specwright/ (global)"
            echo "  6. Updates .mcp.json (MCP server paths)"
            echo "  7. Creates backward-compatibility symlinks (optional)"
            echo ""
            exit 0
            ;;
        *)
            echo -e "${RED}Unknown option: $1${NC}"
            echo "Use -h or --help for usage information"
            exit 1
            ;;
    esac
done

# Helper functions
log_info() { echo -e "${BLUE}[INFO]${NC} $1"; }
log_success() { echo -e "${GREEN}[OK]${NC} $1"; }
log_warn() { echo -e "${YELLOW}[WARN]${NC} $1"; }
log_error() { echo -e "${RED}[ERROR]${NC} $1"; }
log_dry() { echo -e "${YELLOW}[DRY-RUN]${NC} $1"; }

confirm() {
    if [ "$AUTO_YES" = true ]; then
        return 0
    fi
    read -p "$1 (y/N) " -n 1 -r
    echo
    [[ $REPLY =~ ^[Yy]$ ]]
}

run_cmd() {
    if [ "$DRY_RUN" = true ]; then
        log_dry "$1"
    else
        eval "$2"
    fi
}

# ============================================================
# PRE-FLIGHT CHECKS
# ============================================================

echo ""
echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}  Specwright Migration Tool v1.0${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

if [ "$DRY_RUN" = true ]; then
    echo -e "${YELLOW}>>> DRY RUN MODE - No changes will be made <<<${NC}"
    echo ""
fi

# Check if we're in a project directory
if [ "$GLOBAL_ONLY" = false ]; then
    if [ ! -d "agent-os" ] && [ ! -d ".agent-os" ]; then
        log_error "No agent-os/ or .agent-os/ directory found in current directory."
        echo "  Run this script from your project root, or use --global-only for global migration."
        exit 1
    fi

    # Check if already migrated
    if [ -d "specwright" ] && [ ! -d "agent-os" ]; then
        log_warn "Project appears to already be migrated (specwright/ exists, agent-os/ does not)."
        echo "  Nothing to do for project migration."
        GLOBAL_ONLY=true
    fi

    # Check git status
    if git rev-parse --is-inside-work-tree > /dev/null 2>&1; then
        UNCOMMITTED=$(git status --porcelain 2>/dev/null | wc -l | tr -d ' ')
        if [ "$UNCOMMITTED" -gt 0 ]; then
            log_warn "You have $UNCOMMITTED uncommitted changes."
            if ! confirm "Continue anyway?"; then
                echo "Aborted. Commit or stash your changes first."
                exit 1
            fi
        fi
    fi
fi

# Summary
echo "Migration plan:"
if [ "$GLOBAL_ONLY" = false ]; then
    [ -d "agent-os" ] && echo "  - agent-os/ -> specwright/"
    [ -d ".agent-os" ] && echo "  - .agent-os/ -> .specwright/"
    [ -d ".claude/commands/agent-os" ] && echo "  - .claude/commands/agent-os/ -> .claude/commands/specwright/"
    echo "  - Update file contents (path references)"
    [ -f ".mcp.json" ] && echo "  - Update .mcp.json"
    [ "$NO_SYMLINKS" = false ] && echo "  - Create backward-compatibility symlinks"
fi
[ -d "$HOME/.agent-os" ] && echo "  - ~/.agent-os/ -> ~/.specwright/ (global)"
echo ""

if ! confirm "Proceed with migration?"; then
    echo "Aborted."
    exit 0
fi

# ============================================================
# BACKUP
# ============================================================

if [ "$DRY_RUN" = false ]; then
    BACKUP_DIR=".specwright-migration-backup-$(date +%Y%m%d-%H%M%S)"
    mkdir -p "$BACKUP_DIR"
    log_info "Creating backup in $BACKUP_DIR/"

    if [ "$GLOBAL_ONLY" = false ]; then
        [ -d "agent-os" ] && cp -a agent-os "$BACKUP_DIR/"
        [ -d ".agent-os" ] && cp -a .agent-os "$BACKUP_DIR/"
        [ -d ".claude/commands/agent-os" ] && mkdir -p "$BACKUP_DIR/.claude/commands" && cp -a .claude/commands/agent-os "$BACKUP_DIR/.claude/commands/"
        [ -f ".mcp.json" ] && cp .mcp.json "$BACKUP_DIR/"
    fi

    if [ -d "$HOME/.agent-os" ]; then
        cp -a "$HOME/.agent-os" "$BACKUP_DIR/global-agent-os"
    fi

    log_success "Backup created"
fi

# ============================================================
# DIRECTORY RENAMES (Project)
# ============================================================

if [ "$GLOBAL_ONLY" = false ]; then
    echo ""
    log_info "Renaming project directories..."

    # agent-os/ -> specwright/
    if [ -d "agent-os" ]; then
        if git rev-parse --is-inside-work-tree > /dev/null 2>&1 && git ls-files agent-os/ | head -1 | grep -q .; then
            run_cmd "git mv agent-os/ specwright/" "git mv agent-os/ specwright/"
        else
            run_cmd "mv agent-os/ specwright/" "mv agent-os/ specwright/"
        fi
        log_success "agent-os/ -> specwright/"
    fi

    # .agent-os/ -> .specwright/
    if [ -d ".agent-os" ]; then
        if git rev-parse --is-inside-work-tree > /dev/null 2>&1 && git ls-files .agent-os/ | head -1 | grep -q .; then
            run_cmd "git mv .agent-os/ .specwright/" "git mv .agent-os/ .specwright/"
        else
            run_cmd "mv .agent-os/ .specwright/" "mv .agent-os/ .specwright/"
        fi
        log_success ".agent-os/ -> .specwright/"
    fi

    # .claude/commands/agent-os/ -> .claude/commands/specwright/
    if [ -d ".claude/commands/agent-os" ]; then
        if git rev-parse --is-inside-work-tree > /dev/null 2>&1 && git ls-files .claude/commands/agent-os/ | head -1 | grep -q .; then
            run_cmd "git mv .claude/commands/agent-os/ .claude/commands/specwright/" "git mv .claude/commands/agent-os/ .claude/commands/specwright/"
        else
            run_cmd "mv .claude/commands/agent-os/ .claude/commands/specwright/" "mv .claude/commands/agent-os/ .claude/commands/specwright/"
        fi
        log_success ".claude/commands/agent-os/ -> .claude/commands/specwright/"
    fi

    # ============================================================
    # FILE CONTENT UPDATES
    # ============================================================

    echo ""
    log_info "Updating file contents..."

    if [ "$DRY_RUN" = true ]; then
        # Count references
        COUNT=$(grep -r "agent-os" --include="*.md" --include="*.sh" --include="*.ts" --include="*.yml" --include="*.json" --include="*.yaml" --include="*.js" . 2>/dev/null | grep -v ".git/" | grep -v "node_modules/" | grep -v "$BACKUP_DIR" | grep -v "migrate-to-specwright" | wc -l | tr -d ' ')
        log_dry "Would update ~$COUNT references across project files"
    else
        # Find all relevant files (exclude .git, node_modules, backups, this script)
        find . -type f \( -name "*.md" -o -name "*.sh" -o -name "*.ts" -o -name "*.tsx" -o -name "*.js" -o -name "*.jsx" -o -name "*.json" -o -name "*.yml" -o -name "*.yaml" -o -name "*.css" -o -name "*.html" \) \
            ! -path "./.git/*" \
            ! -path "*/node_modules/*" \
            ! -path "./$BACKUP_DIR/*" \
            ! -path "*/migrate-to-specwright.sh" \
            ! -path "*/.specwright-migration-backup-*/*" \
            -print0 | while IFS= read -r -d '' f; do

            if grep -q "agent-os" "$f" 2>/dev/null; then
                perl -i -pe '
                    s/agent-os-extended/specwright/g;
                    s/Agent OS Extended/Specwright/g;
                    s/Agent OS DevTeam/Specwright DevTeam/g;
                    s/Agent OS/Specwright/g;
                    s|~/\.agent-os/|~/.specwright/|g;
                    s|~/\.agent-os\b|~/.specwright|g;
                    s|\$HOME/\.agent-os|\$HOME/.specwright|g;
                    s|\.agent-os/|.specwright/|g;
                    s|\.agent-os\b|.specwright|g;
                    s|commands/agent-os/|commands/specwright/|g;
                    s|commands/agent-os\b|commands/specwright|g;
                    s|agent-os/|specwright/|g;
                    s|'\''agent-os'\''|'\''specwright'\''|g;
                    s|"agent-os"|"specwright"|g;
                    s|\bagent-os\b|specwright|g;
                ' "$f"
            fi
        done
        log_success "File contents updated"
    fi

    # ============================================================
    # UPDATE .mcp.json
    # ============================================================

    if [ -f ".mcp.json" ]; then
        echo ""
        log_info "Updating .mcp.json..."

        if [ "$DRY_RUN" = true ]; then
            REFS=$(grep -c "agent-os" .mcp.json 2>/dev/null || echo "0")
            log_dry "Would update $REFS references in .mcp.json"
        else
            perl -i -pe '
                s|agent-os/|specwright/|g;
                s|\.agent-os/|.specwright/|g;
                s|agent-os-extended|specwright|g;
                s|\bagent-os\b|specwright|g;
            ' .mcp.json
            log_success ".mcp.json updated"
        fi
    fi

    # ============================================================
    # SYMLINKS (Backward Compatibility)
    # ============================================================

    if [ "$NO_SYMLINKS" = false ]; then
        echo ""
        log_info "Creating backward-compatibility symlinks..."

        if [ -d "specwright" ] && [ ! -e "agent-os" ]; then
            run_cmd "ln -s specwright agent-os" "ln -s specwright agent-os"
            log_success "agent-os -> specwright (symlink)"
        fi

        if [ -d ".specwright" ] && [ ! -e ".agent-os" ]; then
            run_cmd "ln -s .specwright .agent-os" "ln -s .specwright .agent-os"
            log_success ".agent-os -> .specwright (symlink)"
        fi

        if [ -d ".claude/commands/specwright" ] && [ ! -e ".claude/commands/agent-os" ]; then
            run_cmd "ln -s specwright .claude/commands/agent-os" "ln -s specwright .claude/commands/agent-os"
            log_success ".claude/commands/agent-os -> .claude/commands/specwright (symlink)"
        fi

        echo ""
        log_info "Symlinks created for backward compatibility (remove after 3 months)."
        log_info "Add to .gitignore if not already present:"
        echo "    agent-os"
        echo "    .agent-os"
        echo "    .claude/commands/agent-os"
    fi
fi

# ============================================================
# GLOBAL INSTALLATION MIGRATION
# ============================================================

if [ -d "$HOME/.agent-os" ]; then
    echo ""
    log_info "Migrating global installation (~/.agent-os/ -> ~/.specwright/)..."

    if [ -d "$HOME/.specwright" ]; then
        log_warn "~/.specwright/ already exists. Skipping global migration."
    else
        run_cmd "cp -a ~/.agent-os ~/.specwright" "cp -a $HOME/.agent-os $HOME/.specwright"
        log_success "~/.agent-os/ copied to ~/.specwright/"

        # Update contents in global dir
        if [ "$DRY_RUN" = false ]; then
            find "$HOME/.specwright" -type f \( -name "*.md" -o -name "*.sh" -o -name "*.ts" -o -name "*.json" -o -name "*.yml" -o -name "*.yaml" \) -print0 | while IFS= read -r -d '' f; do
                if grep -q "agent-os" "$f" 2>/dev/null; then
                    perl -i -pe '
                        s/agent-os-extended/specwright/g;
                        s/Agent OS Extended/Specwright/g;
                        s/Agent OS DevTeam/Specwright DevTeam/g;
                        s/Agent OS/Specwright/g;
                        s|~/\.agent-os/|~/.specwright/|g;
                        s|~/\.agent-os\b|~/.specwright|g;
                        s|\$HOME/\.agent-os|\$HOME/.specwright|g;
                        s|\.agent-os/|.specwright/|g;
                        s|\.agent-os\b|.specwright|g;
                        s|commands/agent-os/|commands/specwright/|g;
                        s|commands/agent-os\b|commands/specwright|g;
                        s|agent-os/|specwright/|g;
                        s|'\''agent-os'\''|'\''specwright'\''|g;
                        s|"agent-os"|"specwright"|g;
                        s|\bagent-os\b|specwright|g;
                    ' "$f"
                fi
            done
            log_success "Global file contents updated"
        fi

        # Create symlink for backward compatibility
        if [ "$NO_SYMLINKS" = false ] && [ ! -L "$HOME/.agent-os" ]; then
            log_info "Creating global symlink ~/.agent-os -> ~/.specwright"
            if [ "$DRY_RUN" = false ]; then
                # Keep original as backup, create symlink
                mv "$HOME/.agent-os" "$HOME/.agent-os.pre-specwright-backup"
                ln -s "$HOME/.specwright" "$HOME/.agent-os"
                log_success "~/.agent-os -> ~/.specwright (symlink, original backed up)"
            else
                log_dry "Would create symlink ~/.agent-os -> ~/.specwright"
            fi
        fi
    fi
elif [ "$GLOBAL_ONLY" = true ]; then
    log_info "No ~/.agent-os/ directory found. Nothing to migrate globally."
fi

# ============================================================
# VERIFICATION
# ============================================================

echo ""
log_info "Running verification..."

ERRORS=0

if [ "$GLOBAL_ONLY" = false ] && [ "$DRY_RUN" = false ]; then
    # Check directories exist
    if [ -d "specwright" ] || [ -L "specwright" ]; then
        log_success "specwright/ directory exists"
    else
        log_error "specwright/ directory NOT found"
        ERRORS=$((ERRORS + 1))
    fi

    if [ -d ".specwright" ] || [ -L ".specwright" ]; then
        log_success ".specwright/ directory exists"
    else
        log_warn ".specwright/ directory not found (may not have existed before)"
    fi

    # Check for remaining references
    REMAINING=$(grep -r "agent-os" --include="*.md" --include="*.sh" --include="*.ts" --include="*.yml" --include="*.json" . 2>/dev/null | grep -v ".git/" | grep -v "node_modules/" | grep -v "migrate-to-specwright" | grep -v ".specwright-migration-backup" | grep -v "MIGRATION" | wc -l | tr -d ' ')
    if [ "$REMAINING" -gt 0 ]; then
        log_warn "$REMAINING remaining 'agent-os' references found (may be in comments/docs)"
    else
        log_success "No remaining 'agent-os' references in project files"
    fi
fi

# ============================================================
# SUMMARY
# ============================================================

echo ""
echo -e "${GREEN}========================================${NC}"
if [ "$DRY_RUN" = true ]; then
    echo -e "${YELLOW}  DRY RUN COMPLETE${NC}"
    echo -e "${YELLOW}  No changes were made${NC}"
else
    if [ "$ERRORS" -eq 0 ]; then
        echo -e "${GREEN}  Migration Complete!${NC}"
    else
        echo -e "${YELLOW}  Migration completed with $ERRORS issue(s)${NC}"
    fi
fi
echo -e "${GREEN}========================================${NC}"
echo ""

if [ "$DRY_RUN" = false ]; then
    echo "Next steps:"
    if [ "$GLOBAL_ONLY" = false ]; then
        echo "  1. Review changes: git diff"
        echo "  2. Test your project works correctly"
        echo "  3. Commit: git add -A && git commit -m 'Migrate from Agent OS to Specwright'"
    fi
    echo "  4. Update .mcp.json if MCP server paths changed"
    echo "  5. Restart Claude Code to pick up new command paths"
    echo ""
    echo "Backup location: $BACKUP_DIR/"
    echo "To rollback: rm -rf specwright .specwright && mv $BACKUP_DIR/agent-os . && mv $BACKUP_DIR/.agent-os ."
fi
