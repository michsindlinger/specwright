#!/bin/bash
#
# Automated Story Execution Script
# Runs Claude Code in a loop, executing one phase per iteration
# until all stories are complete.
#
# Version: 2.0 (updated for kanban.json)
#
# Usage:
#   ./auto-execute.sh [spec-name] [-v|--verbose] [-P|--provider NAME] [-a|--anthropic] [-g|--glm]
#
# Example:
#   ./auto-execute.sh 2026-01-13-multi-delete-projects
#   ./auto-execute.sh -v  # Verbose mode with debug output
#   ./auto-execute.sh --anthropic 2026-01-13-feature  # Use Anthropic API
#   ./auto-execute.sh -a -m opus 2026-01-13-feature   # Anthropic with Opus model
#   ./auto-execute.sh --glm 2026-01-13-feature        # Use GLM (default)
#

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
GRAY='\033[0;90m'
NC='\033[0m' # No Color

# Configuration
SPECS_DIR="specwright/specs"
MAX_ITERATIONS=50  # Safety limit
DELAY_BETWEEN_PHASES=2  # Seconds to wait between phases
MAX_RETRIES=3
VERBOSE=false
MODEL="opus"  # Default model (can override with --model)
PROVIDER="glm"  # Default provider: "glm" or "anthropic"

# Logging
log_info() { echo -e "${BLUE}[INFO]${NC} $1"; }
log_success() { echo -e "${GREEN}[SUCCESS]${NC} $1"; }
log_warning() { echo -e "${YELLOW}[WARNING]${NC} $1"; }
log_error() { echo -e "${RED}[ERROR]${NC} $1"; }
log_debug() {
    if [[ "$VERBOSE" == true ]]; then
        echo -e "${GRAY}[DEBUG]${NC} $1"
    fi
}

# Check prerequisites
check_prerequisites() {
    log_info "Checking prerequisites..."

    # Check if claude is installed
    if ! command -v claude &> /dev/null; then
        log_error "Claude CLI not found. Please install it first."
        exit 1
    fi
    log_debug "Claude CLI found: $(which claude)"

    # Check if jq is installed (needed for kanban.json parsing)
    if ! command -v jq &> /dev/null; then
        log_error "jq not found. Please install it: brew install jq"
        exit 1
    fi
    log_debug "jq found: $(which jq)"

    # Check current directory
    log_debug "Working directory: $(pwd)"

    # Check if .claude/commands/specwright exists
    if [[ -d ".claude/commands/specwright" ]]; then
        log_debug "Skills directory: .claude/commands/specwright/"
        log_debug "Available skills: $(ls .claude/commands/specwright/ | tr '\n' ' ')"

        if [[ -f ".claude/commands/specwright/execute-tasks.md" ]]; then
            log_success "execute-tasks.md skill found"
        else
            log_error "execute-tasks.md NOT found in .claude/commands/specwright/"
            exit 1
        fi
    else
        log_warning ".claude/commands/specwright/ directory not found"
        log_warning "Checking global skills..."

        if [[ -d "$HOME/.claude/commands/specwright" ]]; then
            log_debug "Global skills: $HOME/.claude/commands/specwright/"
        else
            log_error "No specwright skills found (local or global)"
            exit 1
        fi
    fi

    # Check specs directory
    if [[ ! -d "$SPECS_DIR" ]]; then
        log_error "Specs directory not found: $SPECS_DIR"
        exit 1
    fi
    log_debug "Specs directory: $SPECS_DIR"

    log_success "Prerequisites OK"
}

# Find spec with kanban board or use provided spec
find_active_spec() {
    local provided_spec="$1"

    if [[ -n "$provided_spec" ]]; then
        if [[ -d "$SPECS_DIR/$provided_spec" ]]; then
            echo "$provided_spec"
            return 0
        else
            log_error "Spec not found: $SPECS_DIR/$provided_spec"
            return 1
        fi
    fi

    # Find spec with existing kanban.json (primary) or kanban-board.md (legacy fallback)
    local kanban_file=$(ls $SPECS_DIR/*/kanban.json 2>/dev/null | head -1)
    if [[ -z "$kanban_file" ]]; then
        kanban_file=$(ls $SPECS_DIR/*/kanban-board.md 2>/dev/null | head -1)
    fi
    if [[ -n "$kanban_file" ]]; then
        basename $(dirname "$kanban_file")
        return 0
    fi

    # Find most recent spec
    local latest_spec=$(ls -1 $SPECS_DIR/ 2>/dev/null | sort -r | head -1)
    if [[ -n "$latest_spec" ]]; then
        echo "$latest_spec"
        return 0
    fi

    log_error "No specs found in $SPECS_DIR/"
    return 1
}

# Get current phase from kanban.json
get_current_phase() {
    local spec="$1"
    local kanban_json="$SPECS_DIR/$spec/kanban.json"

    if [[ ! -f "$kanban_json" ]]; then
        echo "no-board"
        return 0
    fi

    local phase=""
    phase=$(jq -r '.metadata.currentPhase // .currentPhase // "unknown"' "$kanban_json" 2>/dev/null)

    if [[ -z "$phase" || "$phase" == "null" ]]; then
        echo "unknown"
    else
        echo "$phase"
    fi
}

# Get story count from kanban.json
get_story_counts() {
    local spec="$1"
    local kanban_json="$SPECS_DIR/$spec/kanban.json"

    if [[ ! -f "$kanban_json" ]]; then
        echo "0/0"
        return 0
    fi

    local total=""
    local completed=""

    # Try metadata summary first
    total=$(jq -r '.metadata.totalStories // empty' "$kanban_json" 2>/dev/null)
    completed=$(jq -r '.metadata.completedStories // empty' "$kanban_json" 2>/dev/null)

    # Fallback: count stories from columns
    if [[ -z "$total" || "$total" == "null" ]]; then
        total=$(jq '[.columns[].stories // [] | length] | add // 0' "$kanban_json" 2>/dev/null)
    fi
    if [[ -z "$completed" || "$completed" == "null" ]]; then
        completed=$(jq '[.columns[] | select(.name == "Done" or .name == "done" or .name == "Completed") | .stories // [] | length] | add // 0' "$kanban_json" 2>/dev/null)
    fi

    # Ensure we have numbers
    total=${total:-0}
    completed=${completed:-0}

    echo "$completed/$total"
}

# Run one phase of execute-tasks
run_phase() {
    local spec="$1"
    local iteration="$2"
    local retry=0
    local log_file="/tmp/claude-phase-${spec}-$iteration.log"

    log_info "Starting Phase (Iteration $iteration)..."
    log_debug "Spec: $spec"
    log_debug "Log file: $log_file"

    while [[ $retry -lt $MAX_RETRIES ]]; do
        local cmd=""
        if [[ "$PROVIDER" == "anthropic" ]]; then
            cmd="claude-anthropic-simple -p \"/specwright:execute-tasks $spec\" --model $MODEL"
        else
            cmd="claude --dangerously-skip-permissions -p \"/specwright:execute-tasks $spec\" --model $MODEL"
        fi
        log_debug "Provider: $PROVIDER"
        log_debug "Command: $cmd"
        log_debug "Attempt: $((retry + 1))/$MAX_RETRIES"

        echo -e "${CYAN}--- Claude Output Start ---${NC}"

        # Run Claude Code with execute-tasks
        if [[ "$PROVIDER" == "anthropic" ]]; then
            claude-anthropic-simple -p "/specwright:execute-tasks $spec" \
                --model "$MODEL" \
                2>&1 | tee "$log_file"
        else
            claude --dangerously-skip-permissions -p "/specwright:execute-tasks $spec" \
                --model "$MODEL" \
                2>&1 | tee "$log_file"
        fi

        local exit_code=${PIPESTATUS[0]}

        echo -e "${CYAN}--- Claude Output End ---${NC}"

        log_debug "Exit code: $exit_code"
        log_debug "Log file size: $(wc -c < "$log_file" | xargs) bytes"

        # Check for "Unknown skill" error
        if grep -q "Unknown skill" "$log_file" 2>/dev/null; then
            retry=$((retry + 1))
            log_warning "Unknown skill error detected!"
            log_warning "Retry $retry/$MAX_RETRIES in 5 seconds..."

            # Show more debug info
            log_debug "Full error from log:"
            grep -i "unknown\|error\|skill" "$log_file" 2>/dev/null | head -5

            sleep 5
            continue
        fi

        # Check for other common errors
        if grep -qi "error\|failed\|exception" "$log_file" 2>/dev/null; then
            log_warning "Potential error detected in output"
            log_debug "Error lines:"
            grep -i "error\|failed\|exception" "$log_file" 2>/dev/null | head -5
        fi

        if [[ $exit_code -ne 0 ]]; then
            log_warning "Claude exited with code $exit_code"
        else
            log_success "Phase completed successfully"
        fi

        return $exit_code
    done

    log_error "Failed after $MAX_RETRIES retries due to Unknown skill error"
    log_error "Please check:"
    log_error "  1. .claude/commands/specwright/execute-tasks.md exists"
    log_error "  2. File has correct format"
    log_error "  3. Try running manually: claude -p '/specwright:execute-tasks'"
    return 1
}

# Parse arguments (sets global variables directly)
parse_args() {
    SPEC_ARG=""

    while [[ $# -gt 0 ]]; do
        case $1 in
            -v|--verbose)
                VERBOSE=true
                shift
                ;;
            -m|--model)
                MODEL="$2"
                shift 2
                ;;
            -P|--provider)
                PROVIDER="$2"
                if [[ "$PROVIDER" != "anthropic" && "$PROVIDER" != "glm" ]]; then
                    echo "Error: Provider must be 'anthropic' or 'glm'"
                    exit 1
                fi
                shift 2
                ;;
            -a|--anthropic)
                PROVIDER="anthropic"
                shift
                ;;
            -g|--glm)
                PROVIDER="glm"
                shift
                ;;
            -h|--help)
                echo "Usage: $0 [spec-name] [-v|--verbose] [-m|--model MODEL] [-P|--provider PROVIDER]"
                echo ""
                echo "Options:"
                echo "  -v, --verbose         Enable debug output"
                echo "  -m, --model MODEL     Set Claude model (default: opus)"
                echo "                        Options: opus, sonnet, haiku"
                echo "  -P, --provider NAME   Set provider (default: glm)"
                echo "                        Options: anthropic, glm"
                echo "  -a, --anthropic       Shortcut for --provider anthropic"
                echo "  -g, --glm             Shortcut for --provider glm"
                echo "  -h, --help            Show this help"
                echo ""
                echo "Providers:"
                echo "  anthropic  Uses 'claude-anthropic-simple' command"
                echo "  glm        Uses 'claude --dangerously-skip-permissions' command"
                echo ""
                echo "Examples:"
                echo "  $0 2026-01-13-feature-name"
                echo "  $0 -v"
                echo "  $0 2026-01-13-feature-name --verbose"
                echo "  $0 2026-01-13-feature-name --model sonnet"
                echo "  $0 -m haiku -v"
                echo "  $0 --anthropic 2026-01-13-feature-name"
                echo "  $0 -a -m opus 2026-01-13-feature-name"
                echo "  $0 --provider glm 2026-01-13-feature-name"
                exit 0
                ;;
            *)
                SPEC_ARG="$1"
                shift
                ;;
        esac
    done
}

# Main execution loop
main() {
    local spec_name="$1"

    log_info "=== Automated Story Execution ==="
    log_info "Provider: $PROVIDER"
    log_info "Model: $MODEL"
    log_info "Verbose mode: $VERBOSE"
    log_info "Starting automated execution..."

    # Check prerequisites first
    check_prerequisites

    # Find active spec
    local spec=$(find_active_spec "$spec_name")
    if [[ -z "$spec" ]]; then
        log_error "No spec found. Exiting."
        exit 1
    fi

    log_success "Using spec: $spec"
    log_debug "Spec path: $SPECS_DIR/$spec"

    # Show kanban status
    local kanban_json="$SPECS_DIR/$spec/kanban.json"
    if [[ -f "$kanban_json" ]]; then
        log_debug "Kanban board exists: $kanban_json"
        log_debug "Kanban size: $(wc -c < "$kanban_json" | xargs) bytes"
    else
        log_debug "No kanban board yet (will be created in Phase 1)"
    fi

    local iteration=0
    local phase=""
    local last_phase=""
    local last_counts=""

    while [[ $iteration -lt $MAX_ITERATIONS ]]; do
        iteration=$((iteration + 1))

        # Get current phase
        phase=$(get_current_phase "$spec")
        local counts=$(get_story_counts "$spec")

        log_info "=========================================="
        log_info "=== Iteration $iteration ==="
        log_info "=========================================="
        log_info "Current Phase: $phase"
        log_info "Progress: $counts stories done"

        # Detect stuck state (only warn if BOTH phase AND progress unchanged)
        if [[ "$phase" == "$last_phase" && "$counts" == "$last_counts" && $iteration -gt 1 ]]; then
            log_warning "No progress detected (phase and story count unchanged)"
            log_warning "This might indicate a problem."
        fi
        last_phase="$phase"
        last_counts="$counts"

        # Check if complete (case-insensitive, multiple completion indicators)
        local phase_lower=$(echo "$phase" | tr '[:upper:]' '[:lower:]')
        if [[ "$phase_lower" == "complete" || "$phase_lower" == "completed" || "$phase_lower" == "none" || "$phase_lower" == "4-complete" || "$phase_lower" == "done" ]]; then
            log_success "=========================================="
            log_success "=== All phases complete! ==="
            log_success "=========================================="
            log_success "Spec execution finished successfully."

            # Play completion sound
            afplay /System/Library/Sounds/Glass.aiff 2>/dev/null || true

            exit 0
        fi

        # Fallback: Check if all stories are done (completed == total and total > 0)
        local completed_count=$(echo "$counts" | cut -d'/' -f1)
        local total_count=$(echo "$counts" | cut -d'/' -f2)
        if [[ "$total_count" -gt 0 && "$completed_count" == "$total_count" ]]; then
            log_success "=========================================="
            log_success "=== All stories complete ($counts)! ==="
            log_success "=========================================="
            log_success "Spec execution finished successfully."

            # Play completion sound
            afplay /System/Library/Sounds/Glass.aiff 2>/dev/null || true

            exit 0
        fi

        # Run the next phase
        if ! run_phase "$spec" "$iteration"; then
            log_error "Phase failed. Check logs at /tmp/claude-phase-${spec}-$iteration.log"
            # Continue anyway to allow manual intervention
        fi

        # Brief pause between phases
        log_info "Waiting ${DELAY_BETWEEN_PHASES}s before next phase..."
        sleep $DELAY_BETWEEN_PHASES

    done

    log_error "Reached maximum iterations ($MAX_ITERATIONS). Something may be wrong."
    exit 1
}

# Handle interrupts
cleanup() {
    echo ""
    log_warning "Interrupted. Exiting..."
    log_info "Logs available at: /tmp/claude-phase-<spec>-*.log"
    exit 130
}

trap cleanup SIGINT SIGTERM

# Parse arguments and run
parse_args "$@"
main "$SPEC_ARG"
