# Execute Bug - Shortcut Command

## Overview

**This command is a shortcut to execute-tasks for bug specifications.**

Bug specs created via `/create-bug` are stored in `agent-os/specs/` with the naming convention `YYYY-MM-DD-bugfix-[bug-name]`. This command simplifies finding and executing bug specs.

## How It Works

`/execute-bug` filters and lists only bug specs, then runs `/execute-tasks` on the selected spec.

<process_flow>

<step number="1" name="find_bug_specs">

### Step 1: Find Bug Specifications

List only bug specifications (specs with "bugfix" in the name).

<spec_discovery>
  USE Bash to list bug specs:
    ```bash
    ls -1 agent-os/specs/ | grep -i "bugfix" | sort -r
    ```

  IF user provided bug name as parameter (e.g., "/execute-bug login-error"):
    SEARCH: For spec containing "[param]" in name
    IF found:
      SELECTED_SPEC = matched spec folder
      PROCEED to Step 2
    ELSE:
      LIST: All available bug specs
      ASK: User to select

  ELSE (no parameter):
    IF no bug specs found:
      ERROR: "No bug specifications found."
      SUGGEST: "Run /create-bug first to create a bug specification."
      EXIT

    IF 1 bug spec found:
      CONFIRM: "Execute bug fix for [spec-name]? (yes/no)"
      IF yes: SELECTED_SPEC = [spec]
      IF no: EXIT

    IF multiple bug specs found:
      ASK user via AskUserQuestion:
      "Which bug would you like to fix?

      Options:
      - [Most recent bugfix spec] (Recommended)
      - [Second bugfix spec]
      - [Third bugfix spec]"

      SELECTED_SPEC = user's choice
</spec_discovery>

<instructions>
  ACTION: Find bug specs in agent-os/specs/
  FILTER: Only specs containing "bugfix" in name
  PRESENT: Options to user
  SELECT: Bug spec to execute
</instructions>

</step>

<step number="2" name="delegate_to_execute_tasks">

### Step 2: Execute via execute-tasks

Delegate to the execute-tasks workflow with the selected bug spec.

<delegation>
  EXECUTE: /execute-tasks [SELECTED_SPEC]

  The execute-tasks workflow handles:
  - Git branch creation (bugfix/[name])
  - Kanban board management
  - Agent assignment based on bug type
  - Quality gates (Architect + QA)
  - Git commits and push
  - Completion summary
</delegation>

<branch_naming_note>
  NOTE: execute-tasks should detect "bugfix" in spec name and:
  - Create branch: bugfix/[bug-name] (not feature/[name])
  - Use commit prefix: fix: (not feat:)
</branch_naming_note>

<instructions>
  ACTION: Invoke execute-tasks with selected bug spec
  PASS: Spec folder name as parameter
  DELEGATE: Full execution to execute-tasks workflow
</instructions>

</step>

</process_flow>

## Examples

```bash
# List and select from available bug specs
/execute-bug

# Execute specific bug spec by partial name match
/execute-bug login-error

# Execute specific bug spec by full folder name
/execute-bug 2026-01-12-bugfix-login-session-expires
```

## Integration Notes

**Why this shortcut exists:**
- Convenience: Quickly filter to only bug specs
- Clarity: User intent is clear (fixing a bug, not implementing a feature)
- Discoverability: Users can run `/execute-bug` to see all pending bugs

**What execute-tasks does differently for bug specs:**
- Branch naming: `bugfix/[name]` instead of `[name]`
- Commit prefix: `fix:` instead of `feat:`
- Focus: Bug specs typically have 2 stories (Fix + Regression Test)

## See Also

- `/create-bug` - Create a bug specification
- `/execute-tasks` - Execute any specification (features or bugs)
- `/add-bug` - Add a bug to an existing feature spec
