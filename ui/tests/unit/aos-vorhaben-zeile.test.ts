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
import type { VorhabenRow } from '../../src/shared/types/vorhaben.protocol.js';
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
