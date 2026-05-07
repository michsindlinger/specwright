---
description: Retroactively flag user-action stories/tasks in an existing spec
globs:
alwaysApply: false
version: 1.0.0
encoding: UTF-8
---

# Flag User-Actions Workflow

## Overview

Scan an existing spec's `kanban.json`, identify stories/tasks that require manual user action, confirm with the user, and flag them via the `kanban_set_user_action` MCP tool.

This is the migration tool for specs created before v3.14 — the `requiresUserAction` field did not exist when they were created. After flagging, those items behave like newly created flagged items: auto-mode skips them; the kanban UI shows a `⚠ Aktion nötig` badge plus a `✓ Aktion erledigt` button.

**Idempotent:** re-running only re-prompts items that are still in `status: ready` AND not yet flagged.

---

## Steps

<step number="1" name="resolve_scope">

### Step 1: Resolve Scope

<mandatory_actions>
  IF argument provided:
    - Treat argument as `[spec-id]` (folder name under `specwright/specs/`).
    - VERIFY: `specwright/specs/[spec-id]/kanban.json` exists. If not, abort with clear error.

  ELSE (no argument):
    - LIST all `specwright/specs/*/kanban.json` that have at least one `status: ready` item.
    - For each candidate, show: spec-id, name, ready-count, already-flagged-count.
    - ASK user to pick one spec, or "all" to iterate over every candidate.
</mandatory_actions>

</step>

<step number="2" name="load_detection_rules">

### Step 2: Load Detection Rules

<mandatory_actions>
  LOAD shared detection rules via hybrid lookup:
  - Try project copy: `specwright/templates/docs/user-action-detection-rules.md`
  - Fallback to global: `~/.specwright/templates/docs/user-action-detection-rules.md`

  Read the file content into context. The rules below in Step 3 reference it.
</mandatory_actions>

</step>

<step number="3" name="detection_pass">

### Step 3: Detection Pass

<mandatory_actions>
  FOR EACH selected spec:

  1. CALL MCP TOOL `kanban_read` with `specId` to get the full kanban.

  2. ITERATE candidate items:
     - V2 Lean (`mode: "lean"`): iterate `tasks[]`.
     - V1 Classic: iterate `stories[]`.
     - SKIP items where `status !== 'ready'` (flag is only meaningful on ready items).
     - SKIP items already flagged (`requiresUserAction === true` at top-level for V2 or under `classification` for V1).

  3. FOR EACH candidate, build the input the detection rules need:
     - V2 Lean: `task.title + task.description + task.planSection`.
     - V1 Classic: resolve story file via `story.storyFile` or `story.file`. Read the markdown.
       - IF the story file is missing or unreadable: fall back to `story.title` only and add note `"story-file fehlt"` to the reason.

  4. APPLY the rules from Step 2's loaded template. For each item that matches at least one rule, capture:
     - `id`, `title`, `reason` (which rule matched, in 1 short phrase).

  RESULT: candidate list per spec.
</mandatory_actions>

</step>

<step number="4" name="confirm_with_user">

### Step 4: User Confirmation

<mandatory_actions>
  IF candidate list is empty for a spec: report "✓ keine User-Action-Items gefunden" and skip to Step 5 for that spec.

  ELSE present the candidates using the **same UX as create-spec.md** (defined in `user-action-detection-rules.md`):

  ```
  Spec: [spec-id]
  Folgende Stories scheinen User-Action zu benötigen:
    [1] STORY-003 "Stripe API Key beschaffen" — external credentials
    [2] STORY-007 "DNS A-Record setzen" — 3rd-party UI config

  Antwort:
    - "ok" / "alle bestätigen"
    - Nummern deselektieren, z.B. "ohne 2"
    - weitere Stories flaggen, z.B. "+ STORY-012"
    - "abbrechen"
  ```

  Wait for explicit response. Build the final to-flag set per spec.

  IF user types "abbrechen" for a spec: skip writes for that spec, continue to next.
</mandatory_actions>

</step>

<step number="5" name="persist_flags">

### Step 5: Persist Flags

<mandatory_actions>
  FOR EACH user-confirmed item:

  CALL MCP TOOL `kanban_set_user_action`:
  ```
  {
    "specId": "[spec-id]",
    "storyId": "[item-id]",
    "mode": "flag"
  }
  ```

  The MCP tool acquires `withKanbanLock`, sets the flag at the right location (V1 nested vs V2 top-level), appends a `user_action_flagged` changeLog entry, and returns `{ success, changed, ... }`.

  IF the response says `changed: false` with reason `"already flagged"`: that's expected (someone else flagged it concurrently) — log and continue.

  After all writes for a spec: log a one-line summary, e.g. `"✓ flagged 3 items in [spec-id]"`.
</mandatory_actions>

</step>

<step number="6" name="summary">

### Step 6: Summary

<mandatory_actions>
  Print a final summary table:

  | Spec | Candidates | Flagged | Skipped (user) | Already-flagged |
  |------|-----------|---------|----------------|-----------------|

  Inform the user:
  - Flagged items now appear in the kanban UI with a `⚠ Aktion nötig` badge.
  - Auto-mode will skip them.
  - The user must click `✓ Aktion erledigt` on each card after performing the manual step; the item then moves directly to `done`.
</mandatory_actions>

</step>

---

## Notes

- **Read-only when nothing to do:** the workflow only writes when the user explicitly confirms; aborting at any prompt leaves the kanban untouched.
- **Concurrency-safe:** `kanban_set_user_action` uses the same `withKanbanLock` protocol as all other write tools; safe to run while auto-mode is active in another window.
- **Reverse:** to remove a flag (rare), call `kanban_set_user_action` with `mode: 'unflag'` directly. There is no "unflag-many" workflow.
