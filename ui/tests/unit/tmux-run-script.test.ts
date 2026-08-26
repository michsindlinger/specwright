import { describe, it, expect } from 'vitest';
import { execFileSync } from 'child_process';
import { mkdtempSync, writeFileSync, rmSync, readFileSync, existsSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';

import { sq, renderRunScript } from '../../src/server/services/tmux-session-backend.js';

describe('sq() shell escaping', () => {
  it('wraps plain strings in single quotes', () => {
    expect(sq('hello')).toBe(`'hello'`);
  });

  it('escapes embedded single quotes', () => {
    expect(sq(`it's`)).toBe(`'it'\\''s'`);
  });

  it('neutralizes command substitution, backticks, semicolons and newlines', () => {
    // Round-trip through a real shell: the value must come back byte-identical.
    const adversarial = [
      `$(rm -rf /tmp/nope)`,
      '`whoami`',
      `a; echo pwned`,
      `multi\nline`,
      `dollar $HOME and "double quotes"`,
      `unicode äöü 🎉`,
      `trailing-quote'`,
      `'leading-quote`,
    ];
    for (const value of adversarial) {
      const out = execFileSync('sh', ['-c', `printf '%s' ${sq(value)}`], { encoding: 'utf-8' });
      expect(out).toBe(value);
    }
  });
});

describe('renderRunScript()', () => {
  const spec = {
    cwd: '/tmp/my project',
    command: 'claude',
    args: ['--model', 'opus', `prompt with 'quotes' and $(subst)`],
    env: {
      PATH: '/usr/bin:/bin',
      GITHUB_TOKEN: `tok'en`,
      'BAD-KEY': 'must-not-appear',
      '1LEADING_DIGIT': 'must-not-appear',
    },
  };

  it('filters env keys to valid POSIX identifiers', () => {
    const script = renderRunScript(spec, '/tmp/exit.code');
    expect(script).toContain(`export PATH='/usr/bin:/bin'`);
    expect(script).toContain(`export GITHUB_TOKEN='tok'\\''en'`);
    expect(script).not.toContain('BAD-KEY');
    expect(script).not.toContain('1LEADING_DIGIT');
  });

  it('guards the cd and writes the exit-code file', () => {
    const script = renderRunScript(spec, '/tmp/exit.code');
    expect(script).toContain(`cd '/tmp/my project' || exit 97`);
    expect(script).toContain(`printf '%s' "$code" > '/tmp/exit.code'`);
    expect(script.trimEnd().endsWith('exit "$code"')).toBe(true);
  });

  it('executes the inner command with args intact and records its exit code', () => {
    const dir = mkdtempSync(join(tmpdir(), 'runscript-test-'));
    try {
      const exitPath = join(dir, 'exit.code');
      const outPath = join(dir, 'out.txt');
      const script = renderRunScript(
        {
          cwd: dir,
          command: 'sh',
          args: ['-c', `printf '%s' "$MARKER" > ${sq(outPath)}; exit 7`],
          env: { PATH: process.env.PATH ?? '/usr/bin:/bin', MARKER: `it's $(a) marker` },
        },
        exitPath
      );
      const scriptPath = join(dir, 'run.sh');
      writeFileSync(scriptPath, script, { mode: 0o700 });

      let exitCode = 0;
      try {
        execFileSync('sh', [scriptPath], { encoding: 'utf-8' });
      } catch (err) {
        exitCode = (err as { status: number }).status;
      }

      expect(exitCode).toBe(7);
      expect(readFileSync(outPath, 'utf-8')).toBe(`it's $(a) marker`);
      expect(existsSync(exitPath)).toBe(true);
      expect(readFileSync(exitPath, 'utf-8')).toBe('7');
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});
