/**
 * Session kind of a model provider, derived from its CLI command
 * (INT-2026-012, AK-06/AK-07).
 *
 * One rule, five consumers: the hook attachment in `cloud-terminal-manager.ts`
 * (`--settings`, `extraCliArgs`), the reviewer list (`getReviewerProviders`),
 * the step defaults (`setStepDefault`/`getStepDefault`), the step start
 * (`vorhaben-service.resolveModel`) and the settings view. A provider whose
 * command's basename starts with `claude` runs Claude Code — directly or via a
 * `claude-<id>` wrapper under `~/bin` — and therefore understands Claude flags,
 * fires hooks (status dot, bell), works as a plan reviewer (Agent SDK
 * with `~/.claude-<id>`) and can start a Specwright step (`/specwright:plan …`).
 * Every other command is a foreign agent CLI (e.g. `codex`): no Claude flags,
 * no status, no reviewer use, no step start.
 *
 * This is a naming convention, not a guarantee. It is kept visible by the
 * contract test `ui/tests/unit/model-config-openai.test.ts` (every provider of
 * the real `model-config.json` is `claude…` or listed as known-foreign) and by
 * a one-time warning per foreign provider in `loadModelConfig()`.
 *
 * Shared between server and frontend: no Node imports (no `path`).
 */

export type ProviderCliKind = 'claude' | 'foreign';

/** Basename of a command — last segment after `/` or `\` (Windows paths, E1). */
function commandBasename(cliCommand: string): string {
  return cliCommand.trim().split(/[\\/]/).pop() ?? '';
}

export function providerCliKind(cliCommand: string): ProviderCliKind {
  return commandBasename(cliCommand).startsWith('claude') ? 'claude' : 'foreign';
}

/** True when the provider starts Claude Code (directly or via a `claude-*` wrapper). */
export function isClaudeCli(cliCommand: string): boolean {
  return providerCliKind(cliCommand) === 'claude';
}
