/**
 * TmuxSessionBackend.captureScreen() against a real tmux server on a private
 * socket. Skipped where tmux is not installed (CI images without it).
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { execFileSync } from 'child_process';
import { mkdtempSync, rmSync, writeFileSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';

import { TmuxSessionBackend } from '../../src/server/services/tmux-session-backend.js';
import { parsePlanDialog } from '../../src/server/utils/plan-dialog-state.js';

const tmuxAvailable = (() => {
  try {
    execFileSync('tmux', ['-V'], { stdio: 'ignore' });
    return true;
  } catch {
    return false;
  }
})();

class SocketBackend extends TmuxSessionBackend {
  constructor(private readonly sock: string) {
    super();
  }
  protected override socketPath(): string {
    return this.sock;
  }
}

/** Option 1 is wider than the 60-column pane: the terminal soft-wraps it. */
const DIALOG = [
  ' Claude has written up a plan and is ready to execute.',
  ' Would you like to proceed?',
  ' ❯ 1. Yes, and switch to BYPASS PERMISSIONS (no further prompts) for this session',
  '   2. Yes, manually approve edits',
  '   3. Tell Claude what to change',
  '      shift+tab to approve with this feedback',
].join('\n');

describe.skipIf(!tmuxAvailable)('TmuxSessionBackend.captureScreen() with a real tmux server', () => {
  let dir: string;
  let sock: string;
  let backend: SocketBackend;

  beforeAll(() => {
    dir = mkdtempSync(join(tmpdir(), 'tmux-cap-'));
    sock = join(dir, 's');
    const file = join(dir, 'dialog.txt');
    writeFileSync(file, DIALOG + '\n');
    backend = new SocketBackend(sock);
    execFileSync('tmux', [
      '-S', sock, '-f', '/dev/null',
      'new-session', '-d', '-s', 'cap', '-x', '60', '-y', '20',
      `cat '${file}'; sleep 60`,
    ]);
  });

  afterAll(() => {
    try {
      execFileSync('tmux', ['-S', sock, 'kill-server'], { stdio: 'ignore' });
    } catch {
      // server already gone
    }
    rmSync(dir, { recursive: true, force: true });
  });

  async function screenWith(needle: string): Promise<string | null> {
    for (let i = 0; i < 40; i++) {
      const screen = await backend.captureScreen('cap');
      if (screen?.includes(needle)) return screen;
      await new Promise((r) => setTimeout(r, 50));
    }
    return backend.captureScreen('cap');
  }

  it('returns the visible pane as plain text that parsePlanDialog understands', async () => {
    const screen = await screenWith('Would you like to proceed?');
    expect(screen).not.toContain('\x1b');
    expect(parsePlanDialog(screen ?? '')).toMatchObject({ focused: 1, target: 3, options: [1, 2, 3] });
  });

  it('joins soft-wrapped lines (-J): the wide option stays one line', async () => {
    const state = parsePlanDialog((await screenWith('for this session')) ?? '');
    expect(state?.lines[1]).toBe('Yes, and switch to BYPASS PERMISSIONS (no further prompts) for this session');
  });

  it('prepends history on request and returns null for an unknown session', async () => {
    expect(await backend.captureScreen('cap', 100)).toContain('Would you like to proceed?');
    expect(await backend.captureScreen('no-such-session')).toBeNull();
  });
});
