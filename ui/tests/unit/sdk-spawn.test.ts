import { describe, it, expect, vi, afterEach } from 'vitest';
import { once } from 'events';
import { createSdkSpawner } from '../../src/server/utils/sdk-spawn.js';

// INT-2026-029: real child processes — the bug is an unhandled 'error' event
// on the child's stdin socket, which only a real pipe produces.

function spawnOptions(script: string) {
  return {
    command: process.execPath,
    args: ['-e', script],
    env: { ...process.env },
    signal: new AbortController().signal,
  };
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe('createSdkSpawner', () => {
  it('survives writes to the stdin of a child that closed it (AK-01)', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    // The child closes its end of the stdin pipe and stays alive briefly —
    // the window in which the SDK still writes the prompt.
    const child = createSdkSpawner()(
      spawnOptions('require("fs").closeSync(0); setTimeout(() => process.exit(1), 500)')
    );
    await new Promise((r) => setTimeout(r, 200));

    // Without a listener this write ends in "Unhandled 'error' event" (EPIPE)
    // and takes the whole process down.
    const stdinError = once(child.stdin, 'error');
    child.stdin.write('x'.repeat(1024 * 1024));
    const [err] = (await stdinError) as [NodeJS.ErrnoException];

    expect(err.code).toBe('EPIPE');
    expect(warn).toHaveBeenCalledWith(expect.stringContaining('[sdk-spawn]'));
    await once(child as unknown as NodeJS.EventEmitter, 'exit');
  });

  it('forwards stderr to onStderr', async () => {
    const chunks: string[] = [];
    const child = createSdkSpawner((c) => chunks.push(c))(
      spawnOptions('process.stderr.write("auth failed"); process.exit(2)')
    );
    await once(child as unknown as NodeJS.EventEmitter, 'exit');
    // stderr may flush after 'exit'; wait for the stream to close.
    await new Promise((r) => setImmediate(r));
    expect(chunks.join('')).toContain('auth failed');
  });

  it('pipes stdout and stdin like the SDK expects', async () => {
    const child = createSdkSpawner()(
      spawnOptions('process.stdin.on("data", (d) => { process.stdout.write(String(d)); process.exit(0); })')
    );
    const data = once(child.stdout, 'data');
    child.stdin.write('ping');
    const [chunk] = (await data) as [Buffer];
    expect(chunk.toString()).toBe('ping');
  });
});
