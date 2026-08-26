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

/**
 * The single `--append-system-prompt` payload. Three blocks:
 *
 *   1. AUTO-MODE — blocks interactive prompts, defines the BLOCKER protocol.
 *   2. OUTPUT DISCIPLINE — no human reads an Auto-Mode slot live, so narration,
 *      recaps and praise are pure output-token cost. Placed in the system
 *      prompt (not the task prompt) because it must survive context compaction
 *      in long-running slots.
 *   3. SCOPE DISCIPLINE — unrequested refactoring in an unattended slot lands
 *      in the story's commit unreviewed. "Do what the workflow asks" is
 *      deliberate: it must not override doc/test steps that /execute-tasks
 *      itself mandates.
 *
 * Kept as ONE flag occurrence — repeating `--append-system-prompt` is not a
 * documented collect-style option, so a second occurrence may silently win
 * over the first. Newlines are safe: the array is passed to node-pty `spawn`
 * as argv (cloud-terminal-manager.ts), never interpolated into a shell string.
 */
const AUTO_MODE_SYSTEM_PROMPT = [
  'AUTO-MODE ACTIVE. NEVER ask the user a question. NEVER call AskUserQuestion. ' +
  'NEVER offer numbered choices. If a blocker prevents progress, write a single ' +
  'line "<<BLOCKER:short-reason>>" to stdout, then exit cleanly.',

  'OUTPUT DISCIPLINE. Nobody reads this session live — prose is cost, not ' +
  'communication. No preamble, no restating the task back, no praise, no ' +
  'decorative headings or emoji. State each fact exactly once and never repeat ' +
  'a step you already reported. Scale detail to the size of the change. When ' +
  'the story is finished, close with at most five lines: what changed ' +
  '(file:line), how it was verified, what is left open. No full recap.',

  'SCOPE DISCIPLINE. Implement exactly what the story and its workflow require ' +
  '— nothing beyond it. No unrequested refactoring, renaming, cleanup, ' +
  'reformatting, or speculative abstractions; note them for the backlog ' +
  'instead. Never claim done without evidence (test output, build output, or a ' +
  'diff you actually produced). This rule narrows scope only — it never ' +
  'overrides a documentation, test, or commit step the workflow itself asks for.',
].join('\n\n');

export const AUTO_MODE_CLI_FLAGS: readonly string[] = [
  '--dangerously-skip-permissions',
  '--disallowed-tools', 'AskUserQuestion',
  '--append-system-prompt',
  AUTO_MODE_SYSTEM_PROMPT,
];
