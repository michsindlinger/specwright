# Flag User-Actions

Scan an existing spec's `kanban.json` and retroactively flag stories/tasks that require manual user action (`requiresUserAction: true`).

Refer to the instructions located in specwright/workflows/core/flag-user-actions.md

**Use Case (v3.14+):**
- Spec was created before v3.14 — `requiresUserAction` flag did not exist.
- A spec contains stories that need manual user steps (Stripe API key, DNS, account creation, etc.) but auto-mode keeps trying to run them and stalls.
- A new external dependency was discovered after spec creation.

**Workflow:**
- Pass `[spec-id]` as argument, or call without argument to pick from a list of specs that have at least one `status: ready` item.
- Workflow loads the shared detection rules (`user-action-detection-rules.md`).
- For each ready, not-yet-flagged story/task, classifies as user-action or not.
- Presents the candidate list; user can deselect / add / cancel.
- For each confirmed item, calls MCP tool `kanban_set_user_action` with `mode: 'flag'`.
- Idempotent: re-running on an already-flagged spec only re-prompts items still missing the flag.
