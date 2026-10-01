/**
 * INT-2026-028 (AK-04, RB-01): editor-config — the Remote-SSH host for the
 * „In VS Code öffnen" link. Stored per backend in the gitignored runtime dir
 * (`<runtime>/editor-<port>.json`), never under ui/config/ (versioned, public
 * repo). Plus the WebSocket handler for `settings.editor.get|update`.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtempSync, rmSync, writeFileSync, existsSync, readFileSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import {
  loadEditorConfig,
  updateEditorConfig,
  handleEditorSettingsMessage,
  _resetEditorConfigCacheForTests,
} from '../../src/server/editor-config';
import { getEditorConfigPath } from '../../src/server/utils/runtime-paths';
import { REMOTE_SSH_HOST_REGEX } from '../../src/shared/types/editor.protocol';

let dir: string;
const oldRuntime = process.env.SPECWRIGHT_RUNTIME_DIR;
const oldPort = process.env.PORT;

beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), 'editor-config-'));
  process.env.SPECWRIGHT_RUNTIME_DIR = dir;
  process.env.PORT = '3999';
  _resetEditorConfigCacheForTests();
});

afterEach(() => {
  if (oldRuntime === undefined) delete process.env.SPECWRIGHT_RUNTIME_DIR;
  else process.env.SPECWRIGHT_RUNTIME_DIR = oldRuntime;
  if (oldPort === undefined) delete process.env.PORT;
  else process.env.PORT = oldPort;
  rmSync(dir, { recursive: true, force: true });
});

describe('editor-config store', () => {
  it('file lives in the runtime dir as editor-<port>.json, not under ui/config', () => {
    expect(getEditorConfigPath()).toBe(join(dir, 'editor-3999.json'));
    expect(getEditorConfigPath()).not.toContain(join('ui', 'config'));
  });

  it('empty host by default (= local link)', () => {
    expect(loadEditorConfig()).toEqual({ remoteSshHost: '' });
  });

  it('saves (trimmed), persists across a cache reset, and clears', () => {
    expect(updateEditorConfig('  devbox  ')).toEqual({ remoteSshHost: 'devbox' });
    expect(JSON.parse(readFileSync(join(dir, 'editor-3999.json'), 'utf-8'))).toEqual({ remoteSshHost: 'devbox' });
    _resetEditorConfigCacheForTests();
    expect(loadEditorConfig()).toEqual({ remoteSshHost: 'devbox' });
    expect(updateEditorConfig('')).toEqual({ remoteSshHost: '' });
    _resetEditorConfigCacheForTests();
    expect(loadEditorConfig()).toEqual({ remoteSshHost: '' });
  });

  it.each(['devbox', 'me@devbox.example', 'a-b_c.d', 'x'])('accepts %s', (host) => {
    expect(REMOTE_SSH_HOST_REGEX.test(host)).toBe(true);
    expect(updateEditorConfig(host).remoteSshHost).toBe(host);
  });

  it.each([
    ['slash', 'dev/box'],
    ['backslash', 'dev\\box'],
    ['plus', 'dev+box'],
    ['question mark', 'dev?box'],
    ['hash', 'dev#box'],
    ['percent', 'dev%box'],
    ['colon', 'devbox:22'],
    ['double quote', 'dev"box'],
    ['less than', 'dev<box'],
    ['greater than', 'dev>box'],
    ['space', 'dev box'],
    ['newline', 'dev\nbox'],
    ['leading dot', '.devbox'],
    ['trailing dot', 'devbox.'],
    ['leading dash', '-devbox'],
    ['trailing dash', 'devbox-'],
    ['254 chars', 'a'.repeat(254)],
  ])('rejects %s', (_name, host) => {
    expect(REMOTE_SSH_HOST_REGEX.test(host)).toBe(false);
    expect(() => updateEditorConfig(host)).toThrow();
    expect(existsSync(join(dir, 'editor-3999.json'))).toBe(false);
  });

  it('accepts 253 chars', () => {
    expect(REMOTE_SSH_HOST_REGEX.test('a'.repeat(253))).toBe(true);
  });

  it('unreadable file → empty host plus lesefehler, so the settings field can say so', () => {
    writeFileSync(join(dir, 'editor-3999.json'), '{kaputt', 'utf-8');
    expect(loadEditorConfig()).toEqual({ remoteSshHost: '', lesefehler: true });
  });

  it('a stored invalid host counts as unreadable', () => {
    writeFileSync(join(dir, 'editor-3999.json'), JSON.stringify({ remoteSshHost: 'a/b' }), 'utf-8');
    expect(loadEditorConfig()).toEqual({ remoteSshHost: '', lesefehler: true });
  });

  it('saving after a read error clears lesefehler', () => {
    writeFileSync(join(dir, 'editor-3999.json'), '{kaputt', 'utf-8');
    expect(loadEditorConfig().lesefehler).toBe(true);
    expect(updateEditorConfig('devbox')).toEqual({ remoteSshHost: 'devbox' });
  });
});

describe('handleEditorSettingsMessage (WebSocket settings.editor.*)', () => {
  function run(message: Record<string, unknown>): Array<Record<string, unknown>> {
    const sent: Array<Record<string, unknown>> = [];
    handleEditorSettingsMessage(message, (m) => sent.push(m));
    return sent;
  }

  it('settings.editor.get answers settings.editor with the config', () => {
    const sent = run({ type: 'settings.editor.get' });
    expect(sent).toHaveLength(1);
    expect(sent[0].type).toBe('settings.editor');
    expect(sent[0].config).toEqual({ remoteSshHost: '' });
  });

  it('settings.editor.update stores and answers settings.editor', () => {
    const sent = run({ type: 'settings.editor.update', remoteSshHost: 'devbox' });
    expect(sent[0].type).toBe('settings.editor');
    expect(sent[0].config).toEqual({ remoteSshHost: 'devbox' });
    expect(loadEditorConfig().remoteSshHost).toBe('devbox');
  });

  it('invalid host answers settings.error and stores nothing', () => {
    const sent = run({ type: 'settings.editor.update', remoteSshHost: 'dev box' });
    expect(sent[0].type).toBe('settings.error');
    expect(typeof sent[0].error).toBe('string');
    expect(existsSync(join(dir, 'editor-3999.json'))).toBe(false);
  });

  it('non-string host answers settings.error', () => {
    const sent = run({ type: 'settings.editor.update', remoteSshHost: 42 });
    expect(sent[0].type).toBe('settings.error');
  });
});
