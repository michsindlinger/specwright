---
description: Spec Phase 2 - Git Strategy Setup (JSON v4.1)
version: 4.1
---

# Spec Phase 2: Git Strategy Setup

## What's New in v4.1

**Current Branch Strategy:**
- New third git strategy option: "Im aktuellen Branch arbeiten"
- Works directly in the current branch without creating a new one
- No branch creation, no worktree - simplest option for quick tasks
- Stored as `gitStrategy: "current-branch"` in kanban.json

## What's New in v4.0

**JSON-Based Kanban:**
- Liest/schreibt kanban.json statt kanban-board.md
- resumeContext Felder werden direkt in JSON aktualisiert

## What's New in v3.4

**Auto-Commit Before Worktree:**
- Automatically commits uncommitted changes (spec files) before creating worktree
- Ensures the specification is available in the worktree
- Uses git-workflow agent for clean commit with proper message
- Prevents "missing spec" issues when switching to worktree

## What's New in v3.3

**External Worktree Location:**
- Worktrees are now created OUTSIDE the project directory
- Location: `../{project-name}-worktrees/{feature-name}`
- Full repo including `.claude/` and `agent-os/` is available in worktree
- Keeps main project directory clean

## What's New in v3.2

**Git Strategy Routing:**
- Phase-2 now routes based on Git Strategy (worktree vs branch)
- Worktree strategy: Creates worktree in external directory
- Branch strategy: Creates branch only, works in main directory
- User receives clear instructions for worktree mode with correct Claude command

## Purpose

Setup git environment based on chosen strategy:
- **Worktree:** Isolated directory for parallel execution
- **Branch:** Create new feature branch, work in main directory
- **Current Branch:** Work directly in the current branch without creating a new one

## Entry Condition

- kanban.json exists
- resumeContext.currentPhase = "1-complete"

## Actions

<step name="load_resume_context">
  ### Load Resume Context from JSON

  READ: agent-os/specs/{SELECTED_SPEC}/kanban.json

  EXTRACT:
  - resumeContext.currentPhase
  - resumeContext.gitStrategy (if already set)
  - spec.id
  - spec.name

  VALIDATE: currentPhase = "1-complete"
</step>

<step name="ask_git_strategy">
  ### Ask Git Strategy (if not already set)

  IF Git Strategy is already set in Resume Context:
    USE: That value (worktree or branch)
    SKIP: AskUserQuestion

  ELSE:
    ASK via AskUserQuestion:
    "Welche Git-Strategie möchtest du für diese Spec verwenden?"

    **Options:**
    1. "Worktree (Recommended)" - Isoliertes Verzeichnis für paralleles Arbeiten. Spec wird per Symlink verlinkt.
    2. "Branch" - Erstellt neuen Feature-Branch und arbeitet im Hauptverzeichnis.
    3. "Im aktuellen Branch arbeiten" - Arbeitet direkt im aktuellen Branch ohne neuen Branch zu erstellen.

    SET: GIT_STRATEGY based on user choice
</step>

<step name="extract_names">
  ### Extract Worktree and Branch Names

  FROM: SELECTED_SPEC (e.g., "2026-01-31-my-feature")
  EXTRACT: Worktree name by removing date prefix

  ```bash
  # Example: 2026-01-31-my-feature → my-feature
  WORKTREE_NAME=$(echo "$SELECTED_SPEC" | sed 's/^[0-9]\{4\}-[0-9]\{2\}-[0-9]\{2\}-//')

  # Get project directory name for worktree base path
  PROJECT_DIR=$(basename "$(pwd)")
  ```

  SET: BRANCH_NAME
  - IF "bugfix" in name: prefix with "bugfix/"
  - ELSE: prefix with "feature/"
  - Example: my-feature → feature/my-feature
  - Example: bugfix-login-error → bugfix/login-error
</step>

<git_strategy_routing>
  ## Git Strategy Routing

  ROUTE based on GIT_STRATEGY:

  IF GIT_STRATEGY = "worktree":
    GOTO: worktree_setup

  ELSE IF GIT_STRATEGY = "branch":
    GOTO: branch_setup

  ELSE IF GIT_STRATEGY = "current-branch":
    GOTO: current_branch_setup
</git_strategy_routing>

---

## Worktree Strategy

<step name="worktree_setup">
  ### Worktree Strategy Setup

  **Goal:** Create isolated worktree OUTSIDE project directory.

  <substep name="check_dev_server">
    RUN: lsof -i :3000 2>/dev/null | head -5

    IF server running:
      ASK: "Dev server running on port 3000. Shut down? (yes/no)"
      IF yes: Kill server
  </substep>

  <substep name="commit_pending_changes">
    ### Commit Pending Changes Before Worktree (v3.4)

    **Purpose:** Ensure spec and kanban files are committed before creating worktree.
    Without this, the worktree would not contain the specification.

    ```bash
    # Check for uncommitted changes
    git status --porcelain
    ```

    IF uncommitted changes exist:
      USE: git-workflow subagent

      PROMPT: "Commit all uncommitted changes in agent-os/specs/ directory.

      **Commit Message Format:**
      ```
      feat(spec): Add specification for {SELECTED_SPEC}

      - Kanban board initialized
      - Stories ready for execution
      ```

      **Steps:**
      1. Stage all files in agent-os/specs/{SELECTED_SPEC}/
      2. Also stage agent-os/backlog/ if there are changes
      3. Create commit with the message above
      4. Do NOT push to remote

      **Important:** Only commit agent-os/ changes, not other project files."

      WAIT: For git-workflow completion

    ELSE:
      INFORM: "No uncommitted changes - spec already committed"
  </substep>

  <substep name="create_worktree">
    ### Create Git Worktree (External Location)

    ```bash
    # Variables
    PROJECT_DIR=$(basename "$(pwd)")
    WORKTREE_BASE="../${PROJECT_DIR}-worktrees"
    WORKTREE_PATH="${WORKTREE_BASE}/${WORKTREE_NAME}"
    BRANCH_NAME="feature/${WORKTREE_NAME}"  # or bugfix/ prefix

    # Create base directory (outside project)
    mkdir -p "${WORKTREE_BASE}"

    # Create worktree with new branch
    git worktree add "${WORKTREE_PATH}" -b "${BRANCH_NAME}"

    # Verify creation
    git worktree list
    ```

    **Location Example:**
    - Project: `/path/to/projekt-x/`
    - Worktree: `/path/to/projekt-x-worktrees/my-feature/`

    Handle Edge Cases:
    - Worktree exists: Verify and use existing
    - Branch exists: Create worktree with existing branch using `git worktree add ${WORKTREE_PATH} ${BRANCH_NAME}` (without -b)
    - Uncommitted changes: Commit or stash first
  </substep>

  <substep name="verify_worktree_contents">
    ### Verify Worktree Contents

    **The worktree automatically includes ALL project files:**
    - `.claude/` folder with agents and commands
    - `agent-os/` folder with specs and workflows
    - All source code and configuration

    ```bash
    # Verify key directories exist
    ls -la "${WORKTREE_PATH}/.claude/"
    ls -la "${WORKTREE_PATH}/agent-os/"
    ```

    The worktree is a full working copy with all project files
  </substep>

  <substep name="detect_claude_mode">
    ### Detect Claude Startup Mode

    **Purpose:** Determine correct command for user instructions.

    Check environment:
    - If `ANTHROPIC_API_KEY` is set → API mode
    - If started with `--dangerously-skip-permissions` → API mode
    - Otherwise → Claude Max mode

    SET: CLAUDE_CMD based on detected mode
    - Claude Max: `claude`
    - API Mode: `claude --dangerously-skip-permissions`
  </substep>

  GOTO: phase_complete_worktree
</step>

---

## Branch Strategy

<step name="branch_setup">
  ### Branch Strategy Setup

  **Goal:** Create feature branch, work in main directory.

  <substep name="create_branch">
    ### Create Feature Branch

    ```bash
    # Create and switch to feature branch
    git checkout -b "${BRANCH_NAME}"

    # Verify
    git branch --show-current
    ```

    Handle Edge Cases:
    - Branch exists: Check out existing branch with `git checkout ${BRANCH_NAME}`
    - Uncommitted changes: Commit or stash first
  </substep>

  SET: WORKTREE_PATH = "(none)"
  SET: USE_WORKTREE = false

  GOTO: phase_complete_branch
</step>

---

## Current Branch Strategy

<step name="current_branch_setup">
  ### Current Branch Strategy Setup

  **Goal:** Work directly in the current branch without creating a new one.

  <substep name="detect_current_branch">
    ### Detect Current Branch

    ```bash
    # Get current branch name
    CURRENT_BRANCH=$(git branch --show-current)
    echo "Current branch: ${CURRENT_BRANCH}"
    ```

    SET: BRANCH_NAME = ${CURRENT_BRANCH}
  </substep>

  SET: WORKTREE_PATH = "(none)"
  SET: USE_WORKTREE = false

  GOTO: phase_complete_current_branch
</step>

---

## Phase Completion

<phase_complete_worktree>
  ### Phase Complete: Worktree Strategy

  CALL MCP TOOL: kanban_set_git_strategy
  Input:
  {
    "specId": "{SELECTED_SPEC}",
    "gitStrategy": "worktree",
    "gitBranch": "{BRANCH_NAME}",
    "worktreePath": "../{PROJECT_DIR}-worktrees/{WORKTREE_NAME}"
  }

  VERIFY: Tool returns {"success": true}
  LOG: "Git worktree strategy set via MCP tool"

  NOTE: The MCP tool automatically:
  - Updates resumeContext.gitStrategy, gitBranch, worktreePath
  - Advances currentPhase from 1-complete to 2-complete
  - Sets nextPhase to 3-execute-story
  - Updates lastAction and nextAction
  - Adds changeLog entry

  DETECT: Claude mode for command suggestion (see detect_claude_mode)

  OUTPUT to user:
  ---
  ## Phase 2 Complete: Worktree Strategy

  **Worktree:** ../{PROJECT_DIR}-worktrees/{WORKTREE_NAME}
  **Branch:** {BRANCH_NAME}
  **Git Strategy:** worktree

  ### Next Steps

  **Switch to the worktree directory to continue:**

  ```bash
  cd ../{PROJECT_DIR}-worktrees/{WORKTREE_NAME} && {CLAUDE_CMD}
  ```

  Then run:
  ```
  /execute-tasks
  ```

  ---
  **Note:** The worktree contains the full project including `.claude/` and `agent-os/`.
  Story execution MUST happen from within the worktree directory.
  ---

  STOP: Do not proceed to Phase 3 - user must switch directories
</phase_complete_worktree>

<phase_complete_branch>
  ### Phase Complete: Branch Strategy

  CALL MCP TOOL: kanban_set_git_strategy
  Input:
  {
    "specId": "{SELECTED_SPEC}",
    "gitStrategy": "branch",
    "gitBranch": "{BRANCH_NAME}"
  }

  VERIFY: Tool returns {"success": true}
  LOG: "Git branch strategy set via MCP tool"

  NOTE: The MCP tool automatically handles all kanban.json updates

  OUTPUT to user:
  ---
  ## Phase 2 Complete: Branch Strategy

  **Working Directory:** Current project directory
  **Branch:** {BRANCH_NAME}
  **Git Strategy:** branch

  **Next Phase:** Execute First Story

  ---
  **To continue, run:**
  ```
  /clear
  /execute-tasks
  ```
  ---

  STOP: Do not proceed to Phase 3
</phase_complete_branch>

<phase_complete_current_branch>
  ### Phase Complete: Current Branch Strategy

  CALL MCP TOOL: kanban_set_git_strategy
  Input:
  {
    "specId": "{SELECTED_SPEC}",
    "gitStrategy": "current-branch",
    "gitBranch": "{BRANCH_NAME}"
  }

  VERIFY: Tool returns {"success": true}
  LOG: "Git current-branch strategy set via MCP tool"

  NOTE: The MCP tool automatically handles all kanban.json updates

  OUTPUT to user:
  ---
  ## Phase 2 Complete: Current Branch Strategy

  **Working Directory:** Current project directory
  **Branch:** {BRANCH_NAME} (existing)
  **Git Strategy:** current-branch

  **Next Phase:** Execute First Story

  ---
  **To continue, run:**
  ```
  /clear
  /execute-tasks
  ```
  ---

  STOP: Do not proceed to Phase 3
</phase_complete_current_branch>
