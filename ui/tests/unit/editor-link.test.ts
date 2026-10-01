/**
 * INT-2026-028 (AK-02…AK-05): editor-link — the vscode:// link of a session
 * and the rule when the „In VS Code öffnen" button shows at all.
 */

import { describe, it, expect } from 'vitest';
import { buildVscodeUri, vscodeZiel } from '../../frontend/src/components/terminal/editor-link';

describe('buildVscodeUri', () => {
  it('local (empty host): vscode://file + absolute path', () => {
    expect(buildVscodeUri('/Users/me/repo-worktrees/session-1', '')).toBe(
      'vscode://file/Users/me/repo-worktrees/session-1',
    );
  });

  it('encodes each path segment, keeps the slashes', () => {
    expect(buildVscodeUri('/Users/me/Mein Ordner/#1/Größe', '')).toBe(
      'vscode://file/Users/me/Mein%20Ordner/%231/Gr%C3%B6%C3%9Fe',
    );
  });

  it('remote host: vscode://vscode-remote/ssh-remote+<host><path>', () => {
    expect(buildVscodeUri('/srv/projects/app', 'devbox')).toBe(
      'vscode://vscode-remote/ssh-remote+devbox/srv/projects/app',
    );
    expect(buildVscodeUri('/srv/a b', 'me@devbox.example')).toBe(
      'vscode://vscode-remote/ssh-remote+me@devbox.example/srv/a%20b',
    );
  });
});

describe('vscodeZiel', () => {
  const cwd = '/Users/me/repo';

  it('active and paused sessions with a folder get the link', () => {
    expect(vscodeZiel({ status: 'active', effectiveCwd: cwd }, '')).toBe('vscode://file/Users/me/repo');
    expect(vscodeZiel({ status: 'paused', effectiveCwd: cwd }, 'devbox')).toBe(
      'vscode://vscode-remote/ssh-remote+devbox/Users/me/repo',
    );
  });

  it('shell sessions are sessions like any other (no terminal type in the rule)', () => {
    const shell = { status: 'active' as const, effectiveCwd: cwd, terminalType: 'shell' as const };
    expect(vscodeZiel(shell, '')).toBe('vscode://file/Users/me/repo');
  });

  it('no link while the folder is unknown, empty or relative (AK-05)', () => {
    expect(vscodeZiel({ status: 'active' }, '')).toBeNull();
    expect(vscodeZiel({ status: 'active', effectiveCwd: '' }, '')).toBeNull();
    expect(vscodeZiel({ status: 'active', effectiveCwd: 'repo/sub' }, '')).toBeNull();
  });

  it('no link for disconnected or failed sessions', () => {
    expect(vscodeZiel({ status: 'disconnected', effectiveCwd: cwd }, '')).toBeNull();
    expect(vscodeZiel({ status: 'error', effectiveCwd: cwd }, '')).toBeNull();
  });
});
