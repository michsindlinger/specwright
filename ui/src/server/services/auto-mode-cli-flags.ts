/**
 * CLI flags injected into every Auto-Mode Claude Code session.
 *
 * Hard-blocks interactive user prompts and instructs the LLM to emit a
 * <<BLOCKER:reason>> marker on unrecoverable blockers instead of asking.
 */
export const AUTO_MODE_CLI_FLAGS: readonly string[] = [
  '--disallowed-tools', 'AskUserQuestion',
  '--append-system-prompt',
  'AUTO-MODE ACTIVE. NEVER ask the user a question. NEVER call AskUserQuestion. ' +
  'NEVER offer numbered choices. If a blocker prevents progress, write a single ' +
  'line "<<BLOCKER:short-reason>>" to stdout, then exit cleanly.',
];
