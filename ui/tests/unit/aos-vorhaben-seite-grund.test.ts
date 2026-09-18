// @vitest-environment happy-dom
/**
 * INT-2026-016 (AK-07): the footer of a Vorhaben page without a live session
 * names the second way on the Mac — a click on a Claude tab in the docked
 * terminal (or „Neue Session") binds it to this Vorhaben. The phone has no
 * docked terminal and keeps the plain text; live sessions keep theirs too.
 */
import { describe, it, expect, vi } from 'vitest';
import type { VorhabenRow } from '../../src/shared/types/vorhaben.protocol.js';

// INT-2026-019: the page itself is rendered below — its data calls are stubbed.
vi.mock('../../frontend/src/gateway.js', () => ({
  gateway: { send: vi.fn(), on: vi.fn(), off: vi.fn(), getConnectionStatus: () => false, isConnecting: () => false, getProjectPath: vi.fn() },
}));
vi.mock('../../frontend/src/utils/mermaid-render.js', () => ({ renderMermaidDiagrams: vi.fn(async () => undefined) }));
vi.mock('../../frontend/src/services/vorhaben.service.js', () => ({
  vorhabenService: {
    readDoc: vi.fn(async () => ({ content: '# T\n\nText.', mtimeMs: 1000 })),
    readDesign: vi.fn(async () => null),
    modelList: vi.fn(async () => ({ providers: [], defaultSelection: { providerId: 'anthropic', modelId: 'opus' }, stepDefaults: {} })),
    targets: vi.fn(async () => ({ isGitRepo: false, worktrees: [], worktreeCreationEnabled: false })),
    startStep: vi.fn(),
    setDraft: vi.fn(),
    deleteDraft: vi.fn(),
    send: vi.fn(),
  },
  VorhabenRequestError: class extends Error {},
  gatewayRequest: vi.fn(),
}));

import { grundText } from '../../frontend/src/components/vorhaben/aos-vorhaben-seite.js';
import { ZUORDNUNG_HINWEIS } from '../../frontend/src/components/vorhaben/aos-sende-leiste.js';
import { formatClock } from '../../frontend/src/components/vorhaben/vorhaben-sort.js';

const rowOf = (o: Partial<VorhabenRow> = {}): VorhabenRow => ({
  projectId: 'p', projectPath: '/p', projectName: 'P', intentId: 'INT-2026-019', dirName: 'INT-2026-019-x', cwd: '/p', arbeitskopie: 'main', titel: 'T',
  phase: 'bau', phaseNote: '', bypass: true, zustand: 'wartet', zustandDetail: '', reviewDoc: 'plan', step: 'build', sessionBusy: false,
  nextStep: { step: 'build', label: 'Bauen', command: '/specwright:build INT-2026-019' },
  docs: [{ key: 'plan', file: 'plan.md', mtimeMs: 1000 }], designFiles: [], hasBuildStand: false, lastChangedAt: '', lastChangedMs: 0,
  ...o,
});

type SeiteEl = HTMLElement & { row: VorhabenRow; resumeHinweis: string | null; mobile: boolean; shadowRoot: ShadowRoot; updateComplete: Promise<boolean> };
async function seite(row: VorhabenRow, resumeHinweis: string | null = null): Promise<SeiteEl> {
  const el = document.createElement('aos-vorhaben-seite') as SeiteEl;
  el.row = row;
  el.resumeHinweis = resumeHinweis;
  document.body.appendChild(el);
  for (let i = 0; i < 3; i++) {
    await el.updateComplete;
    await new Promise((r) => setTimeout(r, 2));
  }
  return el;
}

describe('aos-vorhaben-seite grundText (INT-2026-016, AK-07)', () => {
  it('adds the Zuordnung hint on the Mac for rows without a live session', () => {
    expect(grundText('keine_sitzung', false)).toBe(`keine Sitzung zu diesem Vorhaben — nächsten Schritt starten oder ${ZUORDNUNG_HINWEIS}`);
    expect(grundText('beendet', false)).toContain(ZUORDNUNG_HINWEIS);
    expect(ZUORDNUNG_HINWEIS).toMatch(/Tab anklicken|Neue Session/);
  });

  it('the bottom bar names the way for rows without a live session on the Mac only', async () => {
    await import('../../frontend/src/components/vorhaben/aos-sende-leiste.js');
    const row = { intentId: 'INT-2026-012', zustand: 'keine_sitzung', session: undefined } as never;
    const el = document.createElement('aos-sende-leiste') as HTMLElement & { row: unknown; mobile: boolean; count: number; updateComplete: Promise<boolean> };
    el.row = row;
    el.count = 0;
    document.body.appendChild(el);
    await el.updateComplete;
    expect(el.shadowRoot!.textContent).toContain(ZUORDNUNG_HINWEIS);
    el.mobile = true;
    await el.updateComplete;
    expect(el.shadowRoot!.textContent).not.toContain(ZUORDNUNG_HINWEIS);
    el.mobile = false;
    el.row = { intentId: 'INT-2026-012', zustand: 'arbeitet', session: { id: 's', name: 'x', model: 'opus', agentStatus: 'working' } } as never;
    await el.updateComplete;
    expect(el.shadowRoot!.textContent).not.toContain(ZUORDNUNG_HINWEIS);
    el.remove();
  });

  it('INT-2026-019 (AK-02, OF-02): the meta line says „fortgesetzt nach Neustart, Stand HH:MM" for a resumed session — one line in the box, nothing in the protocol', async () => {
    const stand = '2026-09-18T05:42:00Z';
    const el = await seite(rowOf({ session: { id: 'cs-2', name: 'build INT-2026-019', model: 'opus', agentStatus: 'idle', resumed: { at: '2026-09-18T06:00:00Z', von: 'cs-1', stand } } }));
    const meta = el.shadowRoot.querySelector('.meta')!.textContent!;
    expect(meta).toContain(`Sitzung build INT-2026-019 · opus · fortgesetzt nach Neustart, Stand ${formatClock(Date.parse(stand))}`);
    expect(el.shadowRoot.querySelector('aos-vorhaben-protokoll')!.textContent).not.toContain('fortgesetzt');
    // Without a Stand only the words; without the mark nothing.
    el.row = rowOf({ session: { id: 'cs-2', name: 'build INT-2026-019', model: 'opus', agentStatus: 'idle', resumed: { at: '2026-09-18T06:00:00Z', von: 'cs-1' } } });
    await el.updateComplete;
    expect(el.shadowRoot.querySelector('.meta')!.textContent).toContain('opus · fortgesetzt nach Neustart');
    expect(el.shadowRoot.querySelector('.meta')!.textContent).not.toContain('Stand');
    el.row = rowOf({ session: { id: 'cs-2', name: 'build INT-2026-019', model: 'opus', agentStatus: 'idle' } });
    await el.updateComplete;
    expect(el.shadowRoot.querySelector('.meta')!.textContent).not.toContain('fortgesetzt');
    el.remove();
  });

  it('INT-2026-019 (AK-08, AK-09): the hint line names the reason above the state hint; „Nächster Schritt" stays; null shows nothing', async () => {
    const text = 'Arbeitskopie fehlt: /p-worktrees/session-x — von Hand anlegen (git worktree add) oder nächsten Schritt starten';
    const el = await seite(rowOf({ zustand: 'sitzung_beendet', session: { id: 'cs-1', name: 'build INT-2026-019', model: 'opus', agentStatus: 'unknown', ended: true } }), text);
    const hinweis = el.shadowRoot.querySelector('.hinweis.resume')!;
    expect(hinweis.textContent).toBe(`Wiederaufnahme nicht möglich: ${text}`);
    expect(el.shadowRoot.querySelector('aos-naechster-schritt')).not.toBeNull();
    el.resumeHinweis = null;
    await el.updateComplete;
    expect(el.shadowRoot.querySelector('.hinweis.resume')).toBeNull();
    el.remove();
  });

  it('keeps the plain text on the phone and for live sessions', () => {
    expect(grundText('keine_sitzung', true)).toBe('keine Sitzung zu diesem Vorhaben — nächsten Schritt starten');
    expect(grundText('arbeitet', false)).toBe('Sitzung arbeitet — warten');
    expect(grundText('bereit', false)).toBe('');
    expect(grundText('unbekannt', false)).toBe('');
  });
});
