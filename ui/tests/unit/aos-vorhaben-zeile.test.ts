// @vitest-environment happy-dom
/**
 * INT-2026-013 (AK-01, B1): one row of the overview keeps the title and the
 * phase note in separate spans and shows the note exactly as the reader
 * bounded it (≤ 80 plain characters — the reader is the only place that
 * shortens text). happy-dom has no layout, so the width guarantee (title
 * > 200 px, no overflow) is proven in the browser (plan §8 E2E); here the
 * stylesheet is checked for the rules that make it hold: a bounded
 * `max-content` phase column, `.phase` that may shrink, `.note` with an
 * ellipsis.
 */
import { describe, it, expect, beforeEach } from 'vitest';
import type { VorhabenPendingIntent, VorhabenRow } from '../../src/shared/types/vorhaben.protocol.js';
import { AosVorhabenZeile } from '../../frontend/src/components/vorhaben/aos-vorhaben-zeile.js';

const row = (o: Partial<VorhabenRow> = {}): VorhabenRow => ({
  projectId: 'p', projectPath: '/p', projectName: 'P', intentId: 'INT-2026-005', dirName: 'INT-2026-005-x', cwd: '/p', arbeitskopie: 'main',
  titel: 'Schritt starten aus der Web-UI', phase: 'pr', phaseNote: 'PR #49 offen (Merge = Michael), CI verify grün (Run 35023234917 auf 7bd02fb); B…', bypass: false,
  zustand: 'keine_sitzung', zustandDetail: '', sessionBusy: false, docs: [], designFiles: [], hasBuildStand: false, lastChangedAt: '', lastChangedMs: Date.now(),
  ...o,
});

async function zeile(r: VorhabenRow): Promise<AosVorhabenZeile> {
  const el = document.createElement('aos-vorhaben-zeile') as AosVorhabenZeile;
  el.row = r;
  document.body.appendChild(el);
  await el.updateComplete;
  return el;
}

const cssText = (): string => (Array.isArray(AosVorhabenZeile.styles) ? AosVorhabenZeile.styles : [AosVorhabenZeile.styles]).map((s) => String((s as { cssText?: string }).cssText ?? s)).join('\n');
const rule = (selector: string): string => {
  const m = new RegExp(`(?:^|[}\\s])${selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*\\{([^}]*)\\}`).exec(cssText());
  return m ? m[1].replace(/\s+/g, ' ') : '';
};

describe('aos-vorhaben-zeile — title and note (INT-2026-013, AK-01)', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });

  it('renders the title and the bounded note as separate spans, the note verbatim', async () => {
    const r = row();
    const el = await zeile(r);
    const titel = el.shadowRoot!.querySelector('.titel')!;
    const note = el.shadowRoot!.querySelector('.phase .note')!;
    expect(titel.textContent?.trim()).toBe(r.titel);
    expect(note.textContent?.trim()).toBe(r.phaseNote);
    expect(note.textContent!.trim().length).toBeLessThanOrEqual(80);
    expect(el.shadowRoot!.querySelector('.phase .badge')?.textContent?.trim()).toBe('PR');
    // no note → no span (unchanged)
    const ohne = await zeile(row({ phaseNote: '' }));
    expect(ohne.shadowRoot!.querySelector('.note')).toBeNull();
  });

  it('the stylesheet bounds the phase column so the title keeps its width (plan §3 B1)', () => {
    const zeileRule = rule('.zeile');
    expect(zeileRule).toMatch(/grid-template-columns:[^;]*minmax\(0,\s*max-content\)/);
    expect(zeileRule).not.toMatch(/grid-template-columns:[^;]*\bauto minmax\(150px/);
    const phase = rule('.phase');
    expect(phase).toMatch(/min-width:\s*0/);
    expect(phase).toMatch(/overflow:\s*hidden/);
    expect(phase).toMatch(/max-width:\s*\d+ch/);
    const note = rule('.note');
    expect(note).toMatch(/overflow:\s*hidden/);
    expect(note).toMatch(/text-overflow:\s*ellipsis/);
  });
});

describe('INT-2026-022 (FA-12, AK-07): mode „ohne Ordner" — a begun intent as a row', () => {
  const pend = (o: Partial<VorhabenPendingIntent> = {}): VorhabenPendingIntent => ({
    sessionId: 'cs-9', projectId: 'p', projectName: 'P', cwd: '/p-worktrees/session-cs-9', arbeitskopie: 'session/cs-9', since: new Date(Date.now() - 4 * 60000).toISOString(),
    session: { id: 'cs-9', name: 'intent', model: 'haiku', agentStatus: 'working', step: 'intent' }, zustand: 'arbeitet', zustandDetail: 'haiku', ...o,
  });

  beforeEach(() => {
    document.body.innerHTML = '';
  });

  it('badge „Absicht · entsteht" instead of the Kennung, working title, session name · copy label, state, time; a click emits absicht-open with the entry', async () => {
    const el = document.createElement('aos-vorhaben-zeile') as AosVorhabenZeile;
    el.pending = pend({ arbeitstitel: 'Übersicht zeigt begonnene Absichten sofort' });
    document.body.appendChild(el);
    await el.updateComplete;
    const sr = el.shadowRoot!;
    expect(sr.querySelector('.id .badge.entsteht')?.textContent?.trim()).toBe('Absicht · entsteht');
    expect(sr.querySelector('.titel')?.textContent?.trim()).toBe('Übersicht zeigt begonnene Absichten sofort');
    expect(sr.querySelector('.phase .sitzung')?.textContent?.replace(/\s+/g, ' ').trim()).toBe('intent · session/cs-9');
    expect(sr.querySelector('.zustand strong')?.textContent).toBe('arbeitet');
    expect(sr.querySelector('.zustand .dot')?.classList.contains('arbeitet')).toBe(true);
    expect(sr.querySelector('.zeit')?.textContent).toBe('vor 4 min');
    expect(sr.querySelector('.zeile')?.getAttribute('aria-label')).toBe('P Absicht entsteht Übersicht zeigt begonnene Absichten sofort');
    expect(sr.textContent).not.toContain('/p-worktrees'); // never a host path (FA-08)
    const seen: VorhabenPendingIntent[] = [];
    el.addEventListener('absicht-open', (e) => seen.push((e as CustomEvent<{ pending: VorhabenPendingIntent }>).detail.pending));
    (sr.querySelector('.zeile') as HTMLButtonElement).click();
    expect(seen.map((p) => p.sessionId)).toEqual(['cs-9']);
  });

  it('without a working title the session name is the title (hand-typed /intent); firstInputPending adds „Text wird übergeben"; waiting states colour the row like a Vorhaben row', async () => {
    const el = document.createElement('aos-vorhaben-zeile') as AosVorhabenZeile;
    el.pending = pend({ session: { id: 'cs-9', name: 'intent', model: 'haiku', agentStatus: 'blocked', blockKind: 'rueckfrage', firstInputPending: true }, zustand: 'wartet_rueckfrage', zustandDetail: 'Rückfrage' });
    document.body.appendChild(el);
    await el.updateComplete;
    const sr = el.shadowRoot!;
    expect(sr.querySelector('.titel')?.textContent?.trim()).toBe('intent');
    expect(sr.querySelector('.zustand')?.textContent?.replace(/\s+/g, ' ')).toContain('wartet · Rückfrage · Rückfrage · Text wird übergeben');
    expect(sr.querySelector('.zeile')?.classList.contains('g-wartet_auf_dich')).toBe(true);
  });
});
