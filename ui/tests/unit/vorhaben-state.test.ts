import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtempSync, rmSync, readdirSync, writeFileSync, readFileSync, statSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';

import { VorhabenStateStore } from '../../src/server/services/vorhaben-state.js';

describe('VorhabenStateStore (FA-47, FA-26 durability)', () => {
  let dir: string;
  let file: string;

  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), 'vorhaben-state-'));
    file = join(dir, 'vorhaben-3111.json');
  });
  afterEach(() => rmSync(dir, { recursive: true, force: true }));

  it('starts empty without a file', async () => {
    const store = new VorhabenStateStore(file, { port: 3111 });
    expect(await store.load()).toEqual({ existed: false, healthy: true });
    expect(store.getDocDrafts()).toEqual({});
  });

  it('doc drafts survive load(); write is atomic and 0600', async () => {
    const store = new VorhabenStateStore(file, { port: 3111 });
    expect(store.setDocDraft('p1', 'architecture', '# neu', 123)).toBe(true);
    expect(store.setDocDraft('p1', 'architecture', '# neu', 123)).toBe(false);
    await store.flush();
    expect(readdirSync(dir)).toEqual(['vorhaben-3111.json']);
    expect(statSync(file).mode & 0o777).toBe(0o600);
    const parsed = JSON.parse(readFileSync(file, 'utf-8')) as { version: number; port: number; state: { docDrafts: Record<string, unknown> } };
    expect(parsed.version).toBe(1);
    expect(parsed.port).toBe(3111);

    const again = new VorhabenStateStore(file, { port: 3111 });
    expect(await again.load()).toEqual({ existed: true, healthy: true });
    expect(again.getDocDraft('p1', 'architecture')).toMatchObject({ text: '# neu', openedMtime: 123 });
    expect(again.clearDocDraft('p1', 'architecture')).toBe(true);
    expect(again.clearDocDraft('p1', 'architecture')).toBe(false);
    await again.flush();
  });

  it('unreadable file is backed up, store starts empty and reports unhealthy', async () => {
    writeFileSync(file, '{not json');
    const store = new VorhabenStateStore(file, { port: 3111 });
    expect(await store.load()).toEqual({ existed: true, healthy: false });
    const names = readdirSync(dir);
    expect(names.some((n) => n.startsWith('vorhaben-3111.json.unrecognized-'))).toBe(true);
    expect(store.getDocDrafts()).toEqual({});
  });

  it('unknown version is treated as unreadable', async () => {
    writeFileSync(file, JSON.stringify({ version: 9, state: {} }));
    const store = new VorhabenStateStore(file, { port: 3111 });
    expect((await store.load()).healthy).toBe(false);
  });
});
