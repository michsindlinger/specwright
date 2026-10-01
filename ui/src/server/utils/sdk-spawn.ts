import { spawn } from 'child_process';
import type { Options } from '@anthropic-ai/claude-agent-sdk';

export type SdkSpawner = NonNullable<Options['spawnClaudeCodeProcess']>;

/**
 * Spawner for the Agent SDK's `spawnClaudeCodeProcess` option (INT-2026-029).
 *
 * Mirrors the SDK's own `spawnLocalProcess` (sdk.mjs, 0.1.77) and adds the one
 * thing it lacks: an `error` listener on the child's stdin. When the `claude`
 * child exits while the SDK is still writing the prompt, Node emits EPIPE on
 * that pipe; without a listener that is an unhandled 'error' event and kills
 * the whole backend (all terminals and sessions). With the listener, the SDK's
 * exit handler reports "Claude Code process exited with code N" and the caller
 * falls into its normal error path.
 *
 * With a custom spawner the SDK no longer wires its `stderr` option, so stderr
 * is forwarded through `onStderr` here.
 */
export function createSdkSpawner(onStderr?: (chunk: string) => void): SdkSpawner {
  return ({ command, args, cwd, env, signal }) => {
    const child = spawn(command, args, {
      cwd,
      env,
      signal,
      stdio: ['pipe', 'pipe', 'pipe'],
      windowsHide: true,
    });

    child.stdin.on('error', (err: NodeJS.ErrnoException) => {
      console.warn(
        `[sdk-spawn] stdin of claude child failed (${err.code ?? err.message}) — child exited early`
      );
    });

    // stderr is always a pipe (keeps the stdio tuple typed non-null); without
    // a sink it is drained so a chatty child cannot block on a full buffer.
    if (onStderr) {
      child.stderr.on('data', (data: Buffer) => onStderr(data.toString()));
    } else {
      child.stderr.resume();
    }

    return child;
  };
}
