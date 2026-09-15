// @vitest-environment happy-dom
import { describe, it, expect, vi } from 'vitest';
import type { VorhabenRow, VorhabenState } from '../../src/shared/types/vorhaben.protocol.js';

vi.mock('../../frontend/src/gateway.js', () => ({
  gateway: { send: vi.fn(), on: vi.fn(), off: vi.fn(), getConnectionStatus: () => false, isConnecting: () => false, getProjectPath: vi.fn() },
}));

const row = (o: Partial<VorhabenRow> & { intentId: string; projectId: string }): VorhabenRow => ({
  projectPath: '/' + o.projectId, projectName: o.projectId.toUpperCase(), dirName: o.intentId, cwd: '/' + o.projectId, arbeitskopie: 'main', titel: 'T ' + o.intentId,
  phase: 'spec', phaseNote: '', bypass: false, zustand: 'keine_sitzung', zustandDetail: '', docs: [], designFiles: [], hasBuildStand: false,
  lastChangedAt: '', lastChangedMs: 0, ...o,
});

const state = (rows: VorhabenRow[]): VorhabenState => ({
  rows,
  projects: [
    { id: 'a', path: '/a', name: 'A', arbeitskopie: 'main', worktrees: [], hasIntentDir: true },
    { id: 'b', path: '/b', name: 'B', arbeitskopie: '', worktrees: [], hasIntentDir: false },
  ],
  docDrafts: {},
  loading: false,
  updatedAt: '',
});

const tick = (): Promise<void> => new Promise((r) => setTimeout(r, 0));

describe('aos-vorhaben-uebersicht (FA-03, FA-05, FA-08, FA-37)', () => {
  it('marks the active project chip without pre-filtering; empty project gets the sentence + action', async () => {
    await import('../../frontend/src/components/vorhaben/aos-vorhaben-uebersicht.js');
    const el = document.createElement('aos-vorhaben-uebersicht');
    el.vorhabenState = state([row({ intentId: 'INT-2026-001', projectId: 'a', zustand: 'wartet_auf_dich', reviewDoc: 'spec' }), row({ intentId: 'INT-2026-002', projectId: 'a' })]);
    el.activeProjectId = 'b';
    document.body.appendChild(el);
    await el.updateComplete;
    await tick();
    const sr = el.shadowRoot!;
    const chips = [...sr.querySelectorAll('.chip')].map((c) => [c.textContent?.trim(), c.classList.contains('aktiv'), c.classList.contains('gewaehlt')]);
    expect(chips).toEqual([['Alle', false, true], ['A', false, false], ['B', true, false]]);
    expect(sr.querySelectorAll('aos-vorhaben-zeile').length).toBe(2); // not pre-filtered to B
    expect(sr.querySelector('.leer')?.textContent).toContain('Noch kein Vorhaben in');
    expect(sr.querySelector('.leer .btn')?.textContent?.trim()).toBe('Erstes Vorhaben anlegen');
    expect(sr.querySelector('.sub')?.textContent).toContain('1 wartet auf dich');
    // FA-08: a view, not a board
    expect(sr.querySelector('[draggable]')).toBeNull();
    el.remove();
  });

  it('filter chip narrows the list; umgesetzt is collapsed', async () => {
    await import('../../frontend/src/components/vorhaben/aos-vorhaben-uebersicht.js');
    const el = document.createElement('aos-vorhaben-uebersicht');
    el.vorhabenState = state([row({ intentId: 'INT-2026-001', projectId: 'a' }), row({ intentId: 'INT-2026-003', projectId: 'b', phase: 'umgesetzt' })]);
    document.body.appendChild(el);
    await el.updateComplete;
    const sr = el.shadowRoot!;
    expect(sr.querySelectorAll('aos-vorhaben-zeile').length).toBe(1); // umgesetzt collapsed
    expect(sr.querySelector('.aufklappen')?.textContent).toContain('Umgesetzt · 1');
    ([...sr.querySelectorAll('.chip')].find((c) => c.textContent?.trim() === 'B') as HTMLButtonElement).click();
    await el.updateComplete;
    expect(sr.querySelectorAll('aos-vorhaben-zeile').length).toBe(0);
    expect(sr.querySelector('.aufklappen')?.textContent).toContain('Umgesetzt · 1');
    el.remove();
  });

  it('bottom nav shows the waiting badge on the Vorhaben item (FA-37)', async () => {
    await import('../../frontend/src/components/mobile/aos-mobile-bottom-nav.js');
    const nav = document.createElement('aos-mobile-bottom-nav');
    nav.waitingCount = 2;
    document.body.appendChild(nav);
    await nav.updateComplete;
    const item = nav.shadowRoot!.querySelector('button[aria-label^="Vorhaben"]')!;
    expect(item.querySelector('.live-badge')?.textContent).toBe('2');
    expect(item.textContent).toContain('Vorhaben');
    nav.remove();
  });
});
