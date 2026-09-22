// @vitest-environment happy-dom
import { describe, it, expect, vi } from 'vitest';
import type { VorhabenPendingIntent, VorhabenRow, VorhabenState } from '../../src/shared/types/vorhaben.protocol.js';

vi.mock('../../frontend/src/gateway.js', () => ({
  gateway: { send: vi.fn(), on: vi.fn(), off: vi.fn(), getConnectionStatus: () => false, isConnecting: () => false, getProjectPath: vi.fn() },
}));

const row = (o: Partial<VorhabenRow> & { intentId: string; projectId: string }): VorhabenRow => ({
  projectPath: '/' + o.projectId, projectName: o.projectId.toUpperCase(), dirName: o.intentId, cwd: '/' + o.projectId, arbeitskopie: 'main', titel: 'T ' + o.intentId,
  phase: 'spec', phaseNote: '', bypass: false, zustand: 'keine_sitzung', zustandDetail: '', docs: [], designFiles: [], hasBuildStand: false,
  lastChangedAt: '', lastChangedMs: 0, ...o,
});

const state = (rows: VorhabenRow[], pendingIntents: VorhabenPendingIntent[] = []): VorhabenState => ({
  rows,
  pendingIntents,
  projects: [
    { id: 'a', path: '/a', name: 'A', arbeitskopie: 'main', worktrees: [], hasIntentDir: true },
    { id: 'b', path: '/b', name: 'B', arbeitskopie: '', worktrees: [], hasIntentDir: false },
  ],
  docDrafts: {},
  loading: false,
  updatedAt: '',
});

const tick = (): Promise<void> => new Promise((r) => setTimeout(r, 0));

describe('aos-vorhaben-uebersicht (FA-03, FA-05, FA-08; INT-2026-010 FA-02, FA-03, AN-S01, AN-S02)', () => {
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
    expect(sr.querySelector('.leer .btn')?.textContent?.trim()).toBe('Neue Absicht');
    // INT-2026-010: the head line „n Projekte · m warten" is gone, the bell counts
    expect(sr.querySelector('.sub')).toBeNull();
    expect(sr.querySelector('h1')?.textContent).toBe('Vorhaben');
    // FA-08: a view, not a board
    expect(sr.querySelector('[draggable]')).toBeNull();
    el.remove();
  });

  it('INT-2026-010: two groups „Wartet auf dich" and „Läuft", every wartet* state in the first, „ruht" for rows without a session', async () => {
    await import('../../frontend/src/components/vorhaben/aos-vorhaben-uebersicht.js');
    const el = document.createElement('aos-vorhaben-uebersicht');
    el.vorhabenState = state([
      row({ intentId: 'INT-2026-001', projectId: 'a', zustand: 'wartet_rueckfrage' }),
      row({ intentId: 'INT-2026-002', projectId: 'a', zustand: 'wartet_auf_dich', reviewDoc: 'spec' }),
      row({ intentId: 'INT-2026-003', projectId: 'a', zustand: 'keine_sitzung' }),
      row({ intentId: 'INT-2026-004', projectId: 'a', zustand: 'arbeitet' }),
    ]);
    document.body.appendChild(el);
    await el.updateComplete;
    const sr = el.shadowRoot!;
    const titles = [...sr.querySelectorAll('.gruppe-titel')].map((t) => t.textContent?.trim());
    expect(titles).toEqual(['Wartet auf dich · 2', 'Läuft · 2']);
    expect(sr.querySelector('.aufklappen')).toBeNull();
    const ruht = [...sr.querySelectorAll('aos-vorhaben-zeile')].find((z) => z.row.intentId === 'INT-2026-003')!;
    await ruht.updateComplete;
    expect(ruht.shadowRoot!.textContent).toContain('ruht');
    el.remove();
  });

  it('INT-2026-010 (AN-S02): fixed bar with „Neue Absicht" — filtered project wins, else the active one; the event carries the project', async () => {
    await import('../../frontend/src/components/vorhaben/aos-vorhaben-uebersicht.js');
    const el = document.createElement('aos-vorhaben-uebersicht');
    el.vorhabenState = state([row({ intentId: 'INT-2026-001', projectId: 'a' })]);
    el.activeProjectId = 'b';
    document.body.appendChild(el);
    await el.updateComplete;
    const seen: string[] = [];
    el.addEventListener('vorhaben-new', (e) => seen.push((e as CustomEvent<{ projectId: string }>).detail.projectId));
    const sr = el.shadowRoot!;
    const leiste = sr.querySelector('.leiste')!;
    expect(leiste).not.toBeNull();
    expect(getComputedStyle(leiste).position || 'sticky').toBeTruthy();
    (leiste.querySelector('.btn') as HTMLButtonElement).click();
    expect(seen).toEqual(['b']);
    ([...sr.querySelectorAll('.chip')].find((c) => c.textContent?.trim() === 'A') as HTMLButtonElement).click();
    await el.updateComplete;
    (sr.querySelector('.leiste .btn') as HTMLButtonElement).click();
    expect(seen).toEqual(['b', 'a']);
    el.remove();
  });

  it('INT-2026-010 (FA-03): empty state without a project — no bar, hint towards the project page', async () => {
    await import('../../frontend/src/components/vorhaben/aos-vorhaben-uebersicht.js');
    const el = document.createElement('aos-vorhaben-uebersicht');
    el.vorhabenState = { ...state([]), projects: [] };
    document.body.appendChild(el);
    await el.updateComplete;
    const sr = el.shadowRoot!;
    expect(sr.querySelector('.status')?.textContent).toContain('Kein Projekt geöffnet');
    expect(sr.querySelector('.leiste')).toBeNull();
    el.remove();
  });

  it('INT-2026-016 (AK-01), narrowed by INT-2026-024 (FA-14): an umgesetzt row whose session shows a DIALOG stands visible under „Wartet auf dich" with the chip „Umgesetzt"; one whose session merely waits collapses like the idle one', async () => {
    await import('../../frontend/src/components/vorhaben/aos-vorhaben-uebersicht.js');
    const el = document.createElement('aos-vorhaben-uebersicht');
    el.vorhabenState = state([
      row({ intentId: 'INT-2026-004', projectId: 'a', phase: 'umgesetzt', zustand: 'wartet_rueckfrage', session: { id: 's4', name: 'build', model: 'opus', agentStatus: 'blocked' } }),
      row({ intentId: 'INT-2026-005', projectId: 'a', phase: 'umgesetzt', zustand: 'wartet', session: { id: 's5', name: 'build', model: 'opus', agentStatus: 'done' } }),
      row({ intentId: 'INT-2026-003', projectId: 'a', phase: 'umgesetzt' }),
    ]);
    document.body.appendChild(el);
    await el.updateComplete;
    await tick();
    const sr = el.shadowRoot!;
    expect([...sr.querySelectorAll('.gruppe-titel')].map((h) => h.textContent?.replace(/\s+/g, ' ').trim())).toEqual(['Wartet auf dich · 1']);
    const zeilen = [...sr.querySelectorAll('aos-vorhaben-zeile')] as Array<HTMLElement & { row: VorhabenRow }>;
    expect(zeilen.map((z) => z.row.intentId)).toEqual(['INT-2026-004']);
    expect(zeilen[0].row.phase).toBe('umgesetzt');
    expect(sr.querySelector('.aufklappen')?.textContent).toContain('Umgesetzt · 2');
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
  it('INT-2026-022 (FA-12, FA-13, FA-16): begun intents stand as entries in „Wartet auf dich"/„Läuft" before the rows; a project with only entries is not empty; the filter applies; an entry whose session carries a row is not rendered', async () => {
    await import('../../frontend/src/components/vorhaben/aos-vorhaben-uebersicht.js');
    const pend = (o: Partial<VorhabenPendingIntent> & { sessionId: string; projectId: string }): VorhabenPendingIntent => ({
      projectName: o.projectId.toUpperCase(), cwd: '/' + o.projectId + '-worktrees/session-' + o.sessionId, arbeitskopie: 'session/' + o.sessionId, since: '2026-09-19T08:00:00Z',
      session: { id: o.sessionId, name: 'intent', model: 'opus', agentStatus: 'working', step: 'intent' }, zustand: 'arbeitet', zustandDetail: 'opus', arbeitstitel: 'Titel ' + o.sessionId, ...o,
    });
    const el = document.createElement('aos-vorhaben-uebersicht');
    el.vorhabenState = state(
      [row({ intentId: 'INT-2026-001', projectId: 'a', zustand: 'arbeitet', session: { id: 'claimed', name: 'intent', model: 'opus', agentStatus: 'working' } })],
      [
        pend({ sessionId: 'x', projectId: 'a' }),
        pend({ sessionId: 'y', projectId: 'b', zustand: 'wartet_rueckfrage', zustandDetail: 'Rückfrage', since: '2026-09-19T09:00:00Z' }),
        pend({ sessionId: 'claimed', projectId: 'a' }), // stale client: the same session already carries INT-2026-001 → never both (FA-16)
      ]
    );
    document.body.appendChild(el);
    await el.updateComplete;
    await tick();
    const sr = el.shadowRoot!;
    expect([...sr.querySelectorAll('.gruppe-titel')].map((t) => t.textContent?.replace(/\s+/g, ' ').trim())).toEqual(['Wartet auf dich · 1', 'Läuft · 2']);
    const zeilen = [...sr.querySelectorAll('aos-vorhaben-zeile')] as Array<HTMLElement & { row?: VorhabenRow; pending: VorhabenPendingIntent | null }>;
    expect(zeilen.map((z) => z.pending?.sessionId ?? z.row?.intentId)).toEqual(['y', 'x', 'INT-2026-001']);
    expect(zeilen.filter((z) => z.pending?.sessionId === 'claimed')).toHaveLength(0);
    // B has no row but an entry → not „leer"
    expect(sr.querySelector('.leer')).toBeNull();
    // filter B → only the entry of B
    ([...sr.querySelectorAll('.chip')].find((c) => c.textContent?.trim() === 'B') as HTMLButtonElement).click();
    await el.updateComplete;
    const nurB = [...sr.querySelectorAll('aos-vorhaben-zeile')] as Array<HTMLElement & { pending: VorhabenPendingIntent | null }>;
    expect(nurB.map((z) => z.pending?.sessionId)).toEqual(['y']);
    // a click on the entry bubbles absicht-open out of the overview
    const seen: string[] = [];
    el.addEventListener('absicht-open', (e) => seen.push((e as CustomEvent<{ pending: VorhabenPendingIntent }>).detail.pending.sessionId));
    await nurB[0].updateComplete;
    (nurB[0].shadowRoot!.querySelector('.zeile') as HTMLButtonElement).click();
    expect(seen).toEqual(['y']);
    el.remove();
  });
});
