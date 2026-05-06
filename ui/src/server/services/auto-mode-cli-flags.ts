/**
 * CLI flags injected into every Auto-Mode Claude Code session.
 *
 * Hard-blocks interactive user prompts and instructs the LLM to emit a
 * <<BLOCKER:reason>> marker on unrecoverable blockers instead of asking.
 *
 * Security note: `--dangerously-skip-permissions` bypasses all Bash-tool
 * approval prompts. Required because Claude Code's per-command permission
 * dialog ("Do you want to proceed? 1. Yes / 2. Yes, and don't ask again /
 * 3. No / Esc to cancel · Tab to amend") cannot be answered by an Auto-Mode
 * orchestrator — the slot stalls indefinitely. Auto-Mode is an explicit
 * user opt-in (UI toggle) so the trade-off is acceptable; without this flag
 * the slot will hang on the very first non-allowlisted Bash command.
 */
export const AUTO_MODE_CLI_FLAGS: readonly string[] = [
  '--dangerously-skip-permissions',
  '--disallowed-tools', 'AskUserQuestion',
  '--append-system-prompt',
  'AUTO-MODE ACTIVE. NEVER ask the user a question. NEVER call AskUserQuestion. ' +
  'NEVER offer numbered choices. If a blocker prevents progress, write a single ' +
  'line "<<BLOCKER:short-reason>>" to stdout, then exit cleanly.',
];
