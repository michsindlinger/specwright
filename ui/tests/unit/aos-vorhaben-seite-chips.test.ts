// @vitest-environment happy-dom
/**
 * INT-2026-010 stage 2 (plan §4 #68): the Vorhaben page shows id, title and
 * the Phasen-Chips (reached and chosen phase, design/ only with sketches,
 * „Kein Dokument in dieser Phase"; FA-12), the next step always — greyed out
 * while a session works or waits (FA-21) — and „Freigeben" only for the
 * document awaiting approval (FA-22): with a waiting session it sends the
 * Freigabe, without one it starts the step's session with the Freigabe as
 * first input (AN-S06); an intent draft without a session cannot be resumed.
 * The send bar has no „Freigeben" any more (review F6).
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { VorhabenRow } from '../../src/shared/types/vorhaben.protocol.js';

vi.mock('../../frontend/src/gateway.js', () => ({
  gateway: { send: vi.fn(), on: vi.fn(), off: vi.fn(), getConnectionStatus: () => false, isConnecting: () => false, getProjectPath: vi.fn() },
}));
vi.mock('../../frontend/src/utils/mermaid-render.js', () => ({ renderMermaidDiagrams: vi.fn(async () => undefined) }));

const startStep = vi.fn(async () => ({ sessionId: 'cs-9', modus: 'neu' as const }));
const send = vi.fn(async () => ({ ok: true, entry: { anzahl: 0 } }));
const modelList = vi.fn(async () => ({
  providers: [{ id: 'anthropic', name: 'Anthropic', models: [{ id: 'opus', name: 'Opus', providerId: 'anthropic' }, { id: 'sonnet', name: 'Sonnet', providerId: 'anthropic' }] }],
  defaultSelection: { providerId: 'anthropic', modelId: 'opus' },
  stepDefaults: { intent: { providerId: 'anthropic', modelId: 'opus' }, spec: { providerId: 'anthropic', modelId: 'sonnet' }, plan: { providerId: 'anthropic', modelId: 'opus' }, build: { providerId: 'anthropic', modelId: 'opus' } },
}));
vi.mock('../../frontend/src/services/vorhaben.service.js', () => ({
  vorhabenService: {
    readDoc: vi.fn(async () => ({ content: '# Spec\n\nText.', mtimeMs: 1000 })),
    readDesign: vi.fn(async () => null),
    modelList: (...a: unknown[]) => modelList(...(a as [])),
    targets: vi.fn(async () => ({ isGitRepo: false, worktrees: [], worktreeCreationEnabled: false })),
    startStep: (...a: unknown[]) => startStep(...(a as [])),
    setDraft: vi.fn(),
    deleteDraft: vi.fn(),
    send: (...a: unknown[]) => send(...(a as [])),
  },
  VorhabenRequestError: class extends Error {},
}));

const settle = async (el: HTMLElement & { updateComplete: Promise<boolean> }): Promise<void> => {
  for (let i = 0; i < 5; i++) {
    await el.updateComplete;
    await new Promise((r) => setTimeout(r, 5));
  }
};

const row = (o: Partial<VorhabenRow> = {}): VorhabenRow => ({
  projectId: 'p', projectPath: '/p', projectName: 'P', intentId: 'INT-2026-004', dirName: 'INT-2026-004-x', cwd: '/p', arbeitskopie: 'main', titel: 'Vorhaben als Mitte',
  phase: 'spec', phaseNote: '', bypass: false, zustand: 'keine_sitzung', zustandDetail: '', step: 'spec', freigabeDoc: 'spec', sessionBusy: false,
  nextStep: { step: 'spec', command: '/specwright:spec INT-2026-004', label: 'Spec schreiben' },
  docs: [{ key: 'intent', file: 'intent.md', mtimeMs: 900, version: '1.2.0' }, { key: 'spec', file: 'spec.md', mtimeMs: 1000 }], designFiles: [], hasBuildStand: false, lastChangedAt: '', lastChangedMs: 0,
  ...o,
});

async function seite(r: VorhabenRow, doc: 'intent' | 'spec' | 'plan' | 'build-stand' | 'design' = 'spec', mobile = false) {
  await import('../../frontend/src/components/vorhaben/aos-vorhaben-seite.js');
  const el = document.createElement('aos-vorhaben-seite');
  el.row = r;
  el.doc = doc;
  el.mobile = mobile;
  document.body.appendChild(el);
  await settle(el);
  return el;
}

const chips = (el: HTMLElement) => [...el.shadowRoot!.querySelectorAll('.chip')].map((c) => `${c.getAttribute('data-chip')}${c.classList.contains('erreicht') ? '*' : ''}${c.classList.contains('gewaehlt') ? '!' : ''}${c.classList.contains('leer') ? '°' : ''}`);
const freigeben = (el: HTMLElement) => el.shadowRoot!.querySelector('.aktionen button.freigeben') as HTMLButtonElement | null;

describe('aos-vorhaben-seite — head and Phasen-Chips (FA-12)', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
    startStep.mockClear();
    send.mockClear();
  });

  it('id large, title, four chips: the reached phase is marked, the shown document chosen, missing documents dashed; design/ only with sketches', async () => {
    const el = await seite(row());
    const sr = el.shadowRoot!;
    expect(sr.querySelector('.kennung')?.textContent).toBe('INT-2026-004');
    expect(sr.querySelector('h1')?.textContent).toBe('Vorhaben als Mitte');
    expect(chips(el)).toEqual(['intent', 'spec*!', 'plan°', 'build°']);
    expect(sr.querySelector('aos-dokument-leser')).not.toBeNull();
    expect(sr.querySelector('.kein-dokument')).toBeNull();
    // no tabs of the old page, no project name in the head
    expect(sr.querySelector('.reiter')).toBeNull();
    el.remove();
    const d = await seite(row({ phase: 'bau', designFiles: ['skizze.png'], docs: [{ key: 'intent', file: 'intent.md', mtimeMs: 1 }, { key: 'spec', file: 'spec.md', mtimeMs: 2 }, { key: 'plan', file: 'plan.md', mtimeMs: 3 }] }), 'design');
    expect(chips(d)).toEqual(['intent', 'spec', 'plan', 'build*°', 'design!']);
    d.remove();
  });

  it('a chip click shows the document at once and emits doc-change for the shared view state; a phase without a document says so and keeps the action bar', async () => {
    const el = await seite(row());
    const changes: string[] = [];
    el.addEventListener('doc-change', (e) => changes.push((e as CustomEvent<{ doc: string }>).detail.doc));
    (el.shadowRoot!.querySelector('.chip[data-chip="plan"]') as HTMLButtonElement).click();
    await settle(el);
    expect(changes).toEqual(['plan']);
    expect(el.doc).toBe('plan');
    expect(chips(el)).toEqual(['intent', 'spec*', 'plan!°', 'build°']);
    expect(el.shadowRoot!.querySelector('aos-dokument-leser')).toBeNull();
    expect(el.shadowRoot!.querySelector('.kein-dokument')?.textContent).toContain('Kein Dokument in dieser Phase');
    expect(el.shadowRoot!.querySelector('.aktionen aos-naechster-schritt')).not.toBeNull();
    expect(el.shadowRoot!.querySelector('aos-sende-leiste')).toBeNull(); // nothing to annotate
    el.remove();
  });

  it('defaultDoc: review doc → document of the reached phase → newest', async () => {
    const { defaultDoc } = await import('../../frontend/src/components/vorhaben/aos-vorhaben-seite.js');
    expect(defaultDoc(row({ reviewDoc: 'intent' }))).toBe('intent');
    expect(defaultDoc(row())).toBe('spec'); // phase spec, spec.md exists
    expect(defaultDoc(row({ phase: 'plan' }))).toBe('spec'); // plan.md missing → newest
    expect(defaultDoc(row({ phase: 'bau', docs: [{ key: 'intent', file: 'intent.md', mtimeMs: 5 }] }))).toBe('intent');
    expect(defaultDoc(row({ phase: 'unbekannt', docs: [], designFiles: ['a.png'] }))).toBe('design');
  });
});

describe('aos-vorhaben-seite — action bar (FA-21, FA-22)', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
    startStep.mockClear();
    send.mockClear();
  });

  it('the next step is under the document and greyed out while sessionBusy; released without a session', async () => {
    const busy = await seite(row({ zustand: 'arbeitet', sessionBusy: true, session: { id: 's1', name: 'spec INT-2026-004', model: 'opus', agentStatus: 'working' } }));
    const ns = busy.shadowRoot!.querySelector('.aktionen aos-naechster-schritt')!;
    expect(ns).not.toBeNull();
    expect(ns.gesperrt).toBe(true);
    expect(ns.compact).toBe(true);
    await settle(ns);
    expect((ns.shadowRoot!.querySelector('button.start') as HTMLButtonElement).disabled).toBe(true);
    busy.remove();
    const frei = await seite(row());
    expect(frei.shadowRoot!.querySelector('.aktionen aos-naechster-schritt')!.gesperrt).toBe(false);
    frei.remove();
  });

  it('INT-2026-018 (AK-02, AK-07): the page passes sperre and sitzung of the next step through to the box', async () => {
    const locked = await seite(row({ zustand: 'wartet', sessionBusy: true, nextStep: { step: 'spec', command: '/specwright:spec INT-2026-004', label: 'Spec schreiben', sperre: 'gleiche_phase' }, session: { id: 's1', name: 'spec INT-2026-004', model: 'opus', agentStatus: 'done', step: 'spec' } }));
    const nsL = locked.shadowRoot!.querySelector('.aktionen aos-naechster-schritt')!;
    expect(nsL.gesperrt).toBe(true);
    expect(nsL.sperre).toBe('gleiche_phase');
    expect(nsL.sitzung).toBeUndefined();
    await settle(nsL);
    expect(nsL.shadowRoot!.querySelector('.sperre')?.textContent).toContain('gehört schon zu diesem Schritt');
    locked.remove();
    const sitzung = { id: 's1', name: 'intent INT-2026-004', model: { providerId: 'anthropic', modelId: 'sonnet' }, target: { kind: 'main' as const } };
    const frei = await seite(row({ zustand: 'wartet', sessionBusy: false, nextStep: { step: 'spec', command: '/specwright:spec INT-2026-004', label: 'Spec schreiben', sitzung }, session: { id: 's1', name: 'intent INT-2026-004', model: 'sonnet', agentStatus: 'done', step: 'intent', provider: 'anthropic', target: { kind: 'main' } } }));
    const nsF = frei.shadowRoot!.querySelector('.aktionen aos-naechster-schritt')!;
    expect(nsF.gesperrt).toBe(false);
    expect(nsF.sperre).toBeNull();
    expect(nsF.sitzung).toEqual(sitzung);
    await settle(nsF);
    expect(nsF.shadowRoot!.querySelector('.text')?.textContent?.replace(/\s+/g, ' ')).toContain("in der laufenden Sitzung ‚intent INT-2026-004'");
    frei.remove();
  });

  it('„Freigeben" only when the shown document is the one awaiting approval; the send bar has no Freigeben any more', async () => {
    const el = await seite(row());
    expect(freigeben(el)).not.toBeNull();
    const leiste = el.shadowRoot!.querySelector('aos-sende-leiste')!;
    await leiste.updateComplete;
    expect([...leiste.shadowRoot!.querySelectorAll('button')].map((b) => b.textContent?.trim())).not.toContain('Freigeben');
    el.remove();
    const other = await seite(row(), 'intent'); // intent.md is not the document awaiting approval
    expect(freigeben(other)).toBeNull();
    other.remove();
    const pr = await seite(row({ phase: 'pr', freigabeDoc: undefined, reviewDoc: 'plan', docs: [{ key: 'plan', file: 'plan.md', mtimeMs: 1 }] }), 'plan');
    expect(freigeben(pr)).toBeNull();
    pr.remove();
  });

  it('with a waiting session: confirm → send("freigabe") to that session (review channel as before)', async () => {
    const el = await seite(row({ zustand: 'wartet_auf_dich', reviewDoc: 'spec', sessionBusy: true, session: { id: 's1', name: 'spec INT-2026-004', model: 'opus', agentStatus: 'done' } }));
    const btn = freigeben(el)!;
    expect(btn.disabled).toBe(false);
    btn.click();
    await settle(el);
    const dialog = el.shadowRoot!.querySelector('.dialog')!;
    expect(dialog.querySelector('h2')?.textContent).toMatch(/^Freigabe: spec\.md \(Stand /);
    expect(dialog.querySelector('.ziel')?.textContent).toContain('an Sitzung spec INT-2026-004');
    (dialog.querySelector('button.primary') as HTMLButtonElement).click();
    await settle(el);
    expect(send).toHaveBeenCalledWith('p', 'INT-2026-004', 'spec', 'freigabe', 1000);
    expect(startStep).not.toHaveBeenCalled();
    el.remove();
  });

  it('with a working session, an open dialog or a pending first input the button is disabled with the reason', async () => {
    const a = await seite(row({ zustand: 'arbeitet', sessionBusy: true, session: { id: 's1', name: 'n', model: 'opus', agentStatus: 'working' } }));
    expect(freigeben(a)!.disabled).toBe(true);
    expect(freigeben(a)!.title).toContain('Sitzung arbeitet oder wartet im Dialog');
    a.remove();
    // just started via „Freigeben" without a session: status still unknown, the Freigabe is on its way (E2E S2 finding)
    const f = await seite(row({ zustand: 'wartet_auf_dich', reviewDoc: 'spec', sessionBusy: true, session: { id: 's1', name: 'n', model: 'opus', agentStatus: 'unknown', firstInputPending: true } }));
    expect(freigeben(f)!.disabled).toBe(true);
    expect(freigeben(f)!.title).toContain('erste Eingabe wird nach der ersten Frage übergeben');
    f.remove();
    const d = await seite(row({ zustand: 'wartet_rueckfrage', sessionBusy: true, session: { id: 's1', name: 'n', model: 'opus', agentStatus: 'blocked', blockKind: 'rueckfrage' } }));
    expect(freigeben(d)!.disabled).toBe(true);
    d.remove();
  });

  it('without a session: the dialog names command and model, confirm starts the step with the Freigabe as first input in the row\'s copy (AN-S06); the event carries firstInput', async () => {
    const el = await seite(row({ cwd: '/p-wt', arbeitskopie: 'feat/x' }));
    el.lastModel = { 'p::INT-2026-004::spec': { providerId: 'anthropic', modelId: 'opus' } };
    await settle(el);
    const btn = freigeben(el)!;
    expect(btn.disabled).toBe(false);
    btn.click();
    await settle(el);
    const dialog = el.shadowRoot!.querySelector('.dialog')!;
    expect(dialog.querySelector('.ziel')?.textContent).toContain('startet /specwright:spec INT-2026-004 mit Modell opus');
    expect(dialog.querySelector('.ziel')?.textContent).toContain('übergibt die Freigabe als erste Eingabe');
    expect(dialog.querySelector('button.primary')?.textContent?.trim()).toBe('Sitzung starten und freigeben');
    const started: unknown[] = [];
    el.addEventListener('vorhaben-session-started', (e) => started.push((e as CustomEvent).detail));
    (dialog.querySelector('button.primary') as HTMLButtonElement).click();
    await settle(el);
    expect(send).not.toHaveBeenCalled();
    expect(startStep).toHaveBeenCalledTimes(1);
    const [pid, intentId, step, model, target, opts] = startStep.mock.calls[0] as unknown as [string, string, string, unknown, unknown, { firstInput: string }];
    expect([pid, intentId, step, model, target]).toEqual(['p', 'INT-2026-004', 'spec', undefined, { kind: 'existing-worktree', path: '/p-wt' }]);
    expect(opts.firstInput).toMatch(/^Freigabe: spec\.md \(Stand /);
    expect(started).toEqual([{ sessionId: 'cs-9', step: 'spec', intentId: 'INT-2026-004', firstInput: true }]);
    el.remove();
    // step default when no last model is known; main project when the row lives there
    const std = await seite(row({ zustand: 'sitzung_beendet', session: { id: 's0', name: 'alt', model: 'opus', agentStatus: 'unknown', ended: true } }));
    freigeben(std)!.click();
    await settle(std);
    expect(std.shadowRoot!.querySelector('.dialog .ziel')?.textContent).toContain('mit Modell sonnet');
    (std.shadowRoot!.querySelector('.dialog button.primary') as HTMLButtonElement).click();
    await settle(std);
    expect((startStep.mock.calls[1] as unknown as unknown[])[4]).toEqual({ kind: 'main' });
    std.remove();
  });

  it('a failed start shows the backend message inline', async () => {
    startStep.mockRejectedValueOnce(new Error('Kein Modell für spec konfiguriert — Projekt › Einstellungen › Modelle'));
    const el = await seite(row());
    freigeben(el)!.click();
    await settle(el);
    (el.shadowRoot!.querySelector('.dialog button.primary') as HTMLButtonElement).click();
    await settle(el);
    expect(el.shadowRoot!.querySelector('.send-fehler')?.textContent).toContain('Kein Modell für spec konfiguriert');
    el.remove();
  });

  it('intent draft without a session: „Freigeben" is shown but disabled — /specwright:intent cannot resume a draft (NZ-05); the hint points to the terminal', async () => {
    const el = await seite(row({ phase: 'absicht', step: 'intent', freigabeDoc: 'intent', nextStep: undefined, docs: [{ key: 'intent', file: 'intent.md', mtimeMs: 1000, version: '0.3.0' }] }), 'intent');
    const btn = freigeben(el)!;
    expect(btn).not.toBeNull();
    expect(btn.disabled).toBe(true);
    expect(btn.title).toContain('Entwurf im Terminal fortsetzen');
    expect(el.shadowRoot!.querySelector('.hinweis')?.textContent).toContain('Entwurf im Terminal fortsetzen');
    btn.click();
    await settle(el);
    expect(el.shadowRoot!.querySelector('.dialog')).toBeNull();
    el.remove();
    // with a waiting intent session the Freigabe goes as before
    const w = await seite(row({ phase: 'absicht', step: 'intent', freigabeDoc: 'intent', reviewDoc: 'intent', zustand: 'wartet_auf_dich', sessionBusy: true, nextStep: undefined, docs: [{ key: 'intent', file: 'intent.md', mtimeMs: 1000, version: '0.3.0' }], session: { id: 's1', name: 'intent', model: 'opus', agentStatus: 'done' } }), 'intent');
    expect(freigeben(w)!.disabled).toBe(false);
    freigeben(w)!.click();
    await settle(w);
    expect(w.shadowRoot!.querySelector('.dialog h2')?.textContent).toBe('Freigabe: intent.md 0.3.0');
    w.remove();
  });

  it('phone: „Im Terminal öffnen" next to the actions only with a live session; it dispatches open-terminal-session', async () => {
    const seen: string[] = [];
    const onOpen = (e: Event): void => {
      seen.push((e as CustomEvent<{ sessionId: string }>).detail.sessionId);
    };
    document.addEventListener('open-terminal-session', onOpen);
    const el = await seite(row({ zustand: 'arbeitet', sessionBusy: true, session: { id: 's7', name: 'n', model: 'opus', agentStatus: 'working' } }), 'spec', true);
    (el.shadowRoot!.querySelector('.aktionen button.terminal') as HTMLButtonElement).click();
    expect(seen).toEqual(['s7']);
    el.remove();
    const none = await seite(row(), 'spec', true);
    expect(none.shadowRoot!.querySelector('.aktionen button.terminal')).toBeNull();
    none.remove();
    document.removeEventListener('open-terminal-session', onOpen);
  });
});
