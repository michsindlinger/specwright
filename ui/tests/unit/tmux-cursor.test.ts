/**
 * INT-2026-023: the cursor probe — `parseCursorProbe` against the two real
 * recordings and against malformed output, and `captureCursorProbe` against a
 * real tmux server on a private socket (skipped where tmux is missing, like
 * `tmux-capture-screen.test.ts`).
 *
 * The recordings under `tests/fixtures/tui/2.1.278/` are the combined output
 * of one tmux call — the unfolded pane followed by a line `"<cursor_x> <cursor_y>"`.
 * `cursor-vorschlag.txt` holds a session whose box only shows Claude Code's
 * suggestion (cursor at 2), `cursor-getippt.txt` one with typed text.
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { execFileSync } from 'child_process';
import { mkdtempSync, readFileSync, rmSync } from 'fs';
import { join, resolve } from 'path';
import { tmpdir } from 'os';

import { TmuxSessionBackend, parseCursorProbe } from '../../src/server/services/tmux-session-backend.js';
import { eingabeLeerLautCursor } from '../../src/server/services/dialog-driver.js';

const FIXTURES = resolve(process.cwd(), 'tests', 'fixtures', 'tui', '2.1.278');
const read = (f: string): string => readFileSync(join(FIXTURES, f), 'utf8');

const tmuxAvailable = ((): boolean => {
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

describe('parseCursorProbe on the recorded probes', () => {
  it('AK-01: the session that only shows a suggestion reads as an empty input line', () => {
    const probe = parseCursorProbe(read('cursor-vorschlag.txt'));
    expect(probe).not.toBeNull();
    expect(probe!.x).toBe(2);
    expect(probe!.zeilen[probe!.y]).toBe('❯ sag nur: ok');
    expect(eingabeLeerLautCursor(probe!)).toBe(true);
  });

  it('AK-02: the session with typed text reads as not empty', () => {
    const probe = parseCursorProbe(read('cursor-getippt.txt'));
    expect(probe).not.toBeNull();
    expect(probe!.x).toBe(12);
    expect(probe!.zeilen[probe!.y]).toBe('❯ hallo welt');
    expect(eingabeLeerLautCursor(probe!)).toBe(false);
  });

  it('the cursor line is removed and the pane keeps one entry per terminal row', () => {
    const probe = parseCursorProbe(read('cursor-vorschlag.txt'))!;
    expect(probe.zeilen).toHaveLength(24); // the pane was 24 rows high
    expect(probe.zeilen.at(-1)).not.toMatch(/^\d+ \d+$/);
    expect(probe.y).toBe(20);
  });

  it('AK-03: output without a trailing position line, empty output and a malformed line → null (fail closed)', () => {
    expect(parseCursorProbe('')).toBeNull();
    expect(parseCursorProbe('❯ \n')).toBeNull();
    expect(parseCursorProbe('❯ \nx y\n')).toBeNull();
    expect(parseCursorProbe('❯ \n2 20 extra\n')).toBeNull();
    expect(parseCursorProbe('2 20\n')).toEqual({ zeilen: [], x: 2, y: 20 });
  });
});

describe.skipIf(!tmuxAvailable)('TmuxSessionBackend.captureCursorProbe() with a real tmux server', () => {
  let dir: string;
  let sock: string;
  let backend: SocketBackend;

  beforeAll(() => {
    dir = mkdtempSync(join(tmpdir(), 'tmux-cur-'));
    sock = join(dir, 's');
    backend = new SocketBackend(sock);
    // `cat` keeps the pane alive; the shell prompt is irrelevant — only the
    // combined output shape and the cursor position are under test here.
    execFileSync('tmux', [
      '-S', sock, '-f', '/dev/null',
      'new-session', '-d', '-s', 'cur', '-x', '40', '-y', '6',
      "printf '\u276f '; sleep 60",
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

  it('returns pane and cursor from one call — the row index matches cursor_y', async () => {
    let probe = await backend.captureCursorProbe('cur');
    for (let i = 0; i < 40 && !probe?.zeilen[0]?.includes('❯'); i++) {
      await new Promise((r) => setTimeout(r, 50));
      probe = await backend.captureCursorProbe('cur');
    }
    expect(probe).not.toBeNull();
    expect(probe!.y).toBe(0);
    expect(probe!.zeilen[probe!.y]).toMatch(/^❯/);
    expect(probe!.x).toBeGreaterThanOrEqual(2);
  });

  it('AK-03: an unknown session yields null', async () => {
    expect(await backend.captureCursorProbe('no-such-session')).toBeNull();
  });
});
