// @vitest-environment happy-dom
/**
 * INT-2026-004 stage 2 UI: annotation marks and editor in the reader
 * (FA-23/FA-24), collection view (FA-25), send bar reasons (FA-29/FA-30),
 * next step with model pre-selection (FA-35/FA-40).
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Anmerkung, VorhabenRow } from '../../src/shared/types/vorhaben.protocol.js';

vi.mock('../../frontend/src/gateway.js', () => ({
  gateway: { send: vi.fn(), on: vi.fn(), off: vi.fn(), getConnectionStatus: () => false, isConnecting: () => false, getProjectPath: vi.fn() },
}));
vi.mock('../../frontend/src/utils/mermaid-render.js', () => ({ renderMermaidDiagrams: vi.fn(async () => undefined) }));

const docText = '## 3. Entwurf\n\nErster Absatz mit genug Wörtern für den Bezug.\n\n| ID | Text |\n|---|---|\n| V-02 | Sende-Weg |\n\n- Punkt eins\n';
const startStep = vi.fn(async () => ({ sessionId: 'cs-9' }));
const modelList = vi.fn(async () => ({
  providers: [
    { id: 'anthropic', name: 'Anthropic', models: [{ id: 'opus', name: 'Opus', providerId: 'anthropic' }, { id: 'sonnet', name: 'Sonnet', providerId: 'anthropic' }] },
    { id: 'glm', name: 'GLM', models: [{ id: 'glm-5.2', name: 'GLM 5.2', providerId: 'glm' }] },
  ],
  defaultSelection: { providerId: 'anthropic', modelId: 'sonnet' },
  stepDefaults: { intent: { providerId: 'anthropic', modelId: 'opus' }, spec: { providerId: 'anthropic', modelId: 'opus' }, plan: { providerId: 'anthropic', modelId: 'opus' }, build: { providerId: 'glm', modelId: 'glm-5.2' } },
}));
vi.mock('../../frontend/src/services/vorhaben.service.js', () => ({
  vorhabenService: {
    readDoc: vi.fn(async () => ({ content: docText, mtimeMs: 1000 })),
    readDesign: vi.fn(async () => null),
    modelList: (...a: unknown[]) => modelList(...(a as [])),
    targets: vi.fn(async () => ({ isGitRepo: true, worktrees: [{ path: '/p', name: 'p', branch: 'main', head: null, isMain: true, isProjectRoot: true, clean: true, missing: false, locked: false, occupied: false }, { path: '/p-wt', name: 'p-wt', branch: 'feat/x', head: null, isMain: false, isProjectRoot: false, clean: true, missing: false, locked: false, occupied: false }], worktreeCreationEnabled: true })),
    startStep: (...a: unknown[]) => startStep(...(a as [])),
    setDraft: vi.fn(),
    deleteDraft: vi.fn(),
    send: vi.fn(),
  },
}));

const settle = async (el: HTMLElement & { updateComplete: Promise<boolean> }): Promise<void> => {
  for (let i = 0; i < 5; i++) {
    await el.updateComplete;
    await new Promise((r) => setTimeout(r, 5));
  }
};

const row = (o: Partial<VorhabenRow> = {}): VorhabenRow => ({
  projectId: 'p', projectPath: '/p', projectName: 'P', intentId: 'INT-2026-004', dirName: 'INT-2026-004-x', cwd: '/p', arbeitskopie: 'main', titel: 'T',
  phase: 'spec', phaseNote: '', bypass: false, zustand: 'wartet_auf_dich', zustandDetail: 'spec.md', reviewDoc: 'spec', step: 'spec',
  docs: [{ key: 'spec', file: 'spec.md', mtimeMs: 1000 }], designFiles: [], hasBuildStand: false, lastChangedAt: '', lastChangedMs: 0,
  session: { id: 's1', name: 'spec INT-2026-004', model: 'opus', agentStatus: 'done' },
  ...o,
});

async function leser(anmerkungen: Anmerkung[] = [], mobile = false) {
  await import('../../frontend/src/components/vorhaben/aos-dokument-leser.js');
  const el = document.createElement('aos-dokument-leser');
  el.projectId = 'p';
  el.intentId = 'INT-2026-004';
  el.doc = 'spec';
  el.annotierbar = true;
  el.mobile = mobile;
  el.anmerkungen = anmerkungen;
  document.body.appendChild(el);
  await settle(el);
  return el;
}

describe('aos-dokument-leser annotations (FA-23, FA-24, FA-26)', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });

  it('every block carries an ordinal; Enter on a focused block opens the editor with the derived reference (Mac)', async () => {
    const el = await leser();
    const sr = el.shadowRoot!;
    const blocks = sr.querySelectorAll('[data-ordinal]');
    expect(blocks.length).toBe(5); // h2, p, tr, tr, li
    expect(sr.querySelector('.markdown-body')?.classList.contains('annotierbar')).toBe(true);
    const p = sr.querySelector<HTMLElement>('p[data-ordinal]')!;
    expect(p.getAttribute('tabindex')).toBe('0');
    p.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, composed: true }));
    await settle(el);
    const editor = sr.querySelector('aos-anmerkung-editor')!;
    expect(editor).not.toBeNull();
    expect(editor.bezug).toBe('§3 · Absatz „Erster Absatz mit genug Wörtern für …"');
    // no input for the reference (FA-24: not editable)
    expect(editor.shadowRoot!.querySelectorAll('input').length).toBe(0);
    // Fertig → anmerkung-save with ordinal, ref, snippet, text
    const saved: Anmerkung[] = [];
    el.addEventListener('anmerkung-save', (e) => saved.push((e as CustomEvent<{ anmerkung: Anmerkung }>).detail.anmerkung));
    const ta = editor.shadowRoot!.querySelector('textarea')!;
    ta.value = 'Bitte kürzer';
    (editor.shadowRoot!.querySelector('button.fertig') as HTMLButtonElement).click();
    await settle(el);
    expect(saved).toHaveLength(1);
    expect(saved[0]).toMatchObject({ ordinal: 1, ref: '§3 · Absatz „Erster Absatz mit genug Wörtern für …"', text: 'Bitte kürzer' });
    expect(saved[0].snippet).toContain('Erster Absatz');
    expect(sr.querySelector('aos-anmerkung-editor')).toBeNull();
    el.remove();
  });

  it('existing Anmerkungen show as numbered marks, relocated by text; lost ones are reported (spec §4)', async () => {
    await import('../../frontend/src/components/vorhaben/aos-dokument-leser.js');
    const el = document.createElement('aos-dokument-leser');
    el.projectId = 'p';
    el.intentId = 'INT-2026-004';
    el.doc = 'spec';
    el.annotierbar = true;
    el.anmerkungen = [
      { id: 'a', ordinal: 99, ref: 'V-02 · §3', snippet: 'V-02 Sende-Weg', text: 'x', updatedAt: '' },
      { id: 'b', ordinal: 1, ref: 'weg', snippet: 'Dieser Absatz existiert nicht mehr im Dokument', text: 'y', updatedAt: '' },
    ];
    const lost: string[][] = [];
    el.addEventListener('anmerkungen-located', (e) => lost.push((e as CustomEvent<{ lost: string[] }>).detail.lost));
    document.body.appendChild(el);
    await settle(el);
    const sr = el.shadowRoot!;
    const marked = sr.querySelector('[data-anmerkung]')!;
    expect(marked.tagName).toBe('TR');
    expect(marked.getAttribute('data-anmerkung')).toBe('1');
    expect(lost[lost.length - 1]).toEqual(['b']);
    el.remove();
  });

  it('phone: a tap shows "Anmerkung | Kopieren" first, never the field straight away', async () => {
    const el = await leser([], true);
    const sr = el.shadowRoot!;
    const p = sr.querySelector<HTMLElement>('p[data-ordinal]')!;
    expect(p.hasAttribute('tabindex')).toBe(false);
    p.dispatchEvent(new MouseEvent('click', { bubbles: true, composed: true }));
    await settle(el);
    expect(sr.querySelector('aos-anmerkung-editor')).toBeNull();
    const bar = sr.querySelector('.leser-tapbar')!;
    expect(bar).not.toBeNull();
    expect([...bar.querySelectorAll('button')].map((b) => b.textContent)).toEqual(['✎ Anmerkung', 'Kopieren']);
    (bar.querySelector('.leser-tapbar-btn.primary') as HTMLButtonElement).click();
    await settle(el);
    expect(sr.querySelector('.leser-tapbar')).toBeNull();
    expect(sr.querySelector('aos-anmerkung-editor')).not.toBeNull();
    el.remove();
  });

  it('"Allgemeine Anmerkung" has the reference "Dokument gesamt" and ordinal -1', async () => {
    const el = await leser();
    const sr = el.shadowRoot!;
    (sr.querySelector('.leser-gesamt-btn') as HTMLButtonElement).click();
    await settle(el);
    const editor = sr.querySelector('aos-anmerkung-editor')!;
    expect(editor.bezug).toBe('Dokument gesamt');
    const saved: Anmerkung[] = [];
    el.addEventListener('anmerkung-save', (e) => saved.push((e as CustomEvent<{ anmerkung: Anmerkung }>).detail.anmerkung));
    editor.shadowRoot!.querySelector('textarea')!.value = 'insgesamt';
    (editor.shadowRoot!.querySelector('button.fertig') as HTMLButtonElement).click();
    await settle(el);
    expect(saved[0]).toMatchObject({ ordinal: -1, ref: 'Dokument gesamt', text: 'insgesamt' });
    el.remove();
  });
});

describe('aos-anmerkungen-sammel (FA-25)', () => {
  it('lists in document order with reference and text, edit and delete emit events, preview shown', async () => {
    await import('../../frontend/src/components/vorhaben/aos-anmerkungen-sammel.js');
    const el = document.createElement('aos-anmerkungen-sammel');
    el.open = true;
    el.anmerkungen = [
      { id: 'a', ordinal: 1, ref: '§3 „Entwurf"', snippet: '', text: 'erste', updatedAt: '' },
      { id: 'b', ordinal: 4, ref: 'V-02 · §5', snippet: '', text: 'zweite', updatedAt: '' },
    ];
    el.lost = ['b'];
    el.preview = 'Änderungen zu plan.md (Stand …):\n1. [§3 „Entwurf"] erste\n2. [V-02 · §5] zweite';
    el.sessionName = 'plan INT-2026-004';
    el.bereit = true;
    document.body.appendChild(el);
    await el.updateComplete;
    const sr = el.shadowRoot!;
    expect(sr.querySelector('h2')?.textContent).toContain('2 Anmerkungen');
    const karten = [...sr.querySelectorAll('.karte')];
    expect(karten.map((k) => k.querySelector('.bezug')?.textContent)).toEqual(['1 · Bezug: §3 „Entwurf"', '2 · Bezug: V-02 · §5 · Stelle nicht mehr gefunden']);
    expect(karten[1].classList.contains('verloren')).toBe(true);
    expect(sr.querySelector('.vorschau')?.textContent).toContain('2. [V-02 · §5] zweite');
    const events: string[] = [];
    el.addEventListener('anmerkung-delete', (e) => events.push('delete:' + (e as CustomEvent<{ id: string }>).detail.id));
    el.addEventListener('anmerkung-save', (e) => events.push('save:' + (e as CustomEvent<{ anmerkung: Anmerkung }>).detail.anmerkung.text));
    el.addEventListener('sammel-send', () => events.push('send'));
    ([...karten[0].querySelectorAll('button')].find((b) => b.textContent === 'Löschen') as HTMLButtonElement).click();
    ([...karten[1].querySelectorAll('button')].find((b) => b.textContent === 'Bearbeiten') as HTMLButtonElement).click();
    await el.updateComplete;
    const ta = sr.querySelector('textarea')!;
    ta.value = 'zweite neu';
    (sr.querySelector('.karte .primary') as HTMLButtonElement).click();
    await el.updateComplete;
    (sr.querySelector('.fuss .primary') as HTMLButtonElement).click();
    expect(events).toEqual(['delete:a', 'save:zweite neu', 'send']);
    el.remove();
  });
});

describe('aos-sende-leiste (FA-29, FA-30)', () => {
  async function leiste(r: VorhabenRow, count = 2, freigabe = true) {
    await import('../../frontend/src/components/vorhaben/aos-sende-leiste.js');
    const el = document.createElement('aos-sende-leiste');
    el.row = r;
    el.count = count;
    el.freigabeMoeglich = freigabe;
    document.body.appendChild(el);
    await el.updateComplete;
    return el;
  }
  const buttons = (el: HTMLElement) => [...el.shadowRoot!.querySelectorAll('button')].map((b) => `${b.textContent?.trim()}${b.disabled ? ' (aus)' : ''}`);

  it('ready: session named, Änderungen schicken and Freigeben active; Freigeben absent without review document / in phase PR', async () => {
    const el = await leiste(row());
    expect(el.shadowRoot!.querySelector('.ziel')?.textContent).toContain('an Sitzung spec INT-2026-004 · bereit');
    expect(buttons(el)).toEqual(['Alle ansehen', 'Änderungen schicken', 'Freigeben']);
    el.remove();
    const pr = await leiste(row({ phase: 'pr', reviewDoc: 'plan' }), 2, false);
    expect(buttons(pr)).toEqual(['Alle ansehen', 'Änderungen schicken']);
    pr.remove();
  });

  it('names the four reasons with the next step and never enables sending (FA-30)', async () => {
    const a = await leiste(row({ zustand: 'arbeitet', session: { id: 's1', name: 'n', model: 'opus', agentStatus: 'working' } }));
    expect(a.shadowRoot!.textContent).toContain('Sitzung arbeitet — warten');
    expect(buttons(a)).toEqual(['Alle ansehen', 'Änderungen schicken (aus)', 'Freigeben (aus)']);
    a.remove();
    const d = await leiste(row({ zustand: 'wartet_im_terminal', zustandDetail: 'Berechtigung', session: { id: 's1', name: 'n', model: 'opus', agentStatus: 'blocked' } }));
    expect(d.shadowRoot!.textContent).toContain('Sitzung fragt im Terminal (Berechtigung)');
    expect(buttons(d)).toEqual(['Alle ansehen', 'Zum Terminal ›']);
    d.remove();
    const k = await leiste(row({ zustand: 'keine_sitzung', session: undefined, reviewDoc: undefined, nextStep: { step: 'plan', command: '/plan INT-2026-004', label: 'Plan erstellen' } }));
    expect(k.shadowRoot!.textContent).toContain('keine Sitzung zu diesem Vorhaben');
    expect(buttons(k)).toEqual(['Alle ansehen', 'Plan erstellen ›']);
    k.remove();
    const b = await leiste(row({ zustand: 'sitzung_beendet', session: { id: 's1', name: 'spec INT-2026-003', model: 'opus', agentStatus: 'unknown', ended: true }, nextStep: { step: 'spec', command: '/spec INT-2026-004', label: 'Spec schreiben' } }));
    expect(b.shadowRoot!.textContent).toContain("Sitzung ‚spec INT-2026-003' beendet");
    expect(buttons(b)).toEqual(['Alle ansehen', 'Spec schreiben ›']);
    b.remove();
  });
});

describe('aos-naechster-schritt (FA-35, FA-40)', () => {
  it('pre-selects last model → step default → general default and starts with command, model and target', async () => {
    await import('../../frontend/src/components/vorhaben/aos-naechster-schritt.js');
    const el = document.createElement('aos-naechster-schritt');
    el.projectId = 'p';
    el.projectPath = '/p';
    el.intentId = 'INT-2026-004';
    el.step = 'build';
    el.label = 'Bau fortsetzen';
    el.command = '/build INT-2026-004';
    document.body.appendChild(el);
    await settle(el);
    const sr = el.shadowRoot!;
    expect(sr.textContent).toContain('/build INT-2026-004');
    // step default (glm-5.2) wins over the general default (sonnet)
    const sel = sr.querySelector('aos-model-selector')!;
    expect(sel.externalSelectedModelId).toBe('glm-5.2');
    expect(sel.externalSelectedProviderId).toBe('glm');
    expect([...sr.querySelectorAll('option')].map((o) => o.value)).toEqual(['main', '/p-wt', 'new']);
    // last model of this Vorhaben+step wins over the step default
    el.lastModel = { providerId: 'anthropic', modelId: 'sonnet' };
    await settle(el);
    expect(sr.querySelector('aos-model-selector')!.externalSelectedModelId).toBe('sonnet');
    // pick the worktree, start
    const select = sr.querySelector('select')!;
    select.value = '/p-wt';
    select.dispatchEvent(new Event('change'));
    const started: unknown[] = [];
    el.addEventListener('vorhaben-session-started', (e) => started.push((e as CustomEvent).detail));
    (sr.querySelector('button.start') as HTMLButtonElement).click();
    await settle(el);
    expect(startStep).toHaveBeenCalledWith('p', 'INT-2026-004', 'build', { providerId: 'anthropic', modelId: 'sonnet' }, { kind: 'existing-worktree', path: '/p-wt' });
    expect(started[0]).toEqual({ sessionId: 'cs-9', step: 'build', intentId: 'INT-2026-004' });
    el.remove();
  });
});
