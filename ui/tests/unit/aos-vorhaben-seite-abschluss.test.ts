// @vitest-environment happy-dom
/**
 * INT-2026-024 (FA-01, FA-02, FA-11, FA-15, FA-18, FA-19): the Vorhaben page —
 * „Abschließen" per phase, never with a mark; the dialog built from the
 * backend's preview and its content; no start without the confirmation, the
 * shown `baseSha` travels; locked while „läuft" (also „zurücknehmen"); the
 * failure line; the TIMEOUT text; the hint with the PR link; the
 * „zurücknehmen" dialog; the phone stacks the buttons.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { VorhabenAbschlussVorschau, VorhabenRow } from '../../src/shared/types/vorhaben.protocol.js';

const { svc, FakeRequestError } = vi.hoisted(() => {
  class FakeRequestError extends Error {
    constructor(
      public readonly code: string,
      message: string
    ) {
      super(message);
    }
  }
  const svc = {
    readDoc: vi.fn(async () => ({ content: '# T\n\nText.', mtimeMs: 1000 })),
    readDesign: vi.fn(async () => null),
    modelList: vi.fn(async () => ({ providers: [], defaultSelection: { providerId: 'anthropic', modelId: 'opus' }, stepDefaults: {} })),
    targets: vi.fn(async () => ({ isGitRepo: false, worktrees: [], worktreeCreationEnabled: false })),
    startStep: vi.fn(),
    setDraft: vi.fn(),
    deleteDraft: vi.fn(),
    send: vi.fn(),
    abschlussVorschau: vi.fn<(p: string, i: string) => Promise<VorhabenAbschlussVorschau>>(),
    abschliessen: vi.fn<(p: string, i: string, sha: string) => Promise<{ prNumber: number; prUrl: string; zweig: string }>>(),
    abschlussZuruecknehmen: vi.fn<(p: string, i: string) => Promise<void>>(),
  };
  return { svc, FakeRequestError };
});
vi.mock('../../frontend/src/gateway.js', () => ({
  gateway: { send: vi.fn(), on: vi.fn(), off: vi.fn(), getConnectionStatus: () => false, isConnecting: () => false, getProjectPath: vi.fn() },
}));
vi.mock('../../frontend/src/utils/mermaid-render.js', () => ({ renderMermaidDiagrams: vi.fn(async () => undefined) }));
vi.mock('../../frontend/src/services/vorhaben.service.js', () => ({
  vorhabenService: svc,
  VorhabenRequestError: FakeRequestError,
  gatewayRequest: vi.fn(),
}));

import { ABSCHLUSS_TIMEOUT_TEXT, abschlussMoeglich } from '../../frontend/src/components/vorhaben/aos-vorhaben-seite.js';

const BASE_SHA = 'a'.repeat(40);
const VORSCHAU: VorhabenAbschlussVorschau = {
  intentId: 'INT-2026-012',
  titel: 'Titel des Vorhabens',
  datei: 'intent.md',
  base: 'main',
  baseSha: BASE_SHA,
  zweig: 'chore/INT-2026-012-abschluss',
  statusAlt: 'angenommen',
  versionAlt: '1.0.0',
  versionNeu: '1.0.1',
  datum: '2026-09-21',
  zeile: ['1.0.1', '2026-09-21', 'Umgesetzt: abgeschlossen aus der UI durch Michael Sindlinger; Belege in `plan.md` §13; Bau-PR #14', '—', 'Product Owner (Klick in der UI)'],
  spalten: ['Version', 'Datum', 'Änderung', 'IDs', 'Freigabe'],
  bauPrs: [14],
  commitTitel: 'chore(INT-2026-012): intent.md auf umgesetzt nach Merge von PR #14',
};
const MARKE = { prNumber: 15, prUrl: 'https://github.com/o/r/pull/15', zweig: 'chore/INT-2026-012-abschluss', at: '2026-09-21T10:00:00Z' };

const rowOf = (o: Partial<VorhabenRow> = {}): VorhabenRow => ({
  projectId: 'p', projectPath: '/p', projectName: 'P', intentId: 'INT-2026-012', dirName: 'INT-2026-012-x', cwd: '/p', arbeitskopie: 'main', titel: 'Titel des Vorhabens',
  phase: 'pr', phaseNote: 'PR #14 offen', bypass: false, zustand: 'sitzung_beendet', zustandDetail: '', step: 'build', sessionBusy: false,
  docs: [{ key: 'intent', file: 'intent.md', mtimeMs: 1000 }], designFiles: [], hasBuildStand: false, lastChangedAt: '', lastChangedMs: 0,
  ...o,
});

type SeiteEl = HTMLElement & { row: VorhabenRow; mobile: boolean; shadowRoot: ShadowRoot; updateComplete: Promise<boolean> };
async function settle(el: SeiteEl): Promise<void> {
  for (let i = 0; i < 3; i++) {
    await el.updateComplete;
    await new Promise((r) => setTimeout(r, 2));
  }
}
async function seite(row: VorhabenRow, mobile = false): Promise<SeiteEl> {
  const el = document.createElement('aos-vorhaben-seite') as SeiteEl;
  el.row = row;
  el.mobile = mobile;
  document.body.appendChild(el);
  await settle(el);
  return el;
}
const q = (el: SeiteEl, sel: string): HTMLElement | null => el.shadowRoot.querySelector(sel);
const text = (el: SeiteEl, sel: string): string => q(el, sel)?.textContent?.replace(/\s+/g, ' ').trim() ?? '';
const toasts: string[] = [];
document.body.addEventListener('show-toast', (e) => toasts.push((e as CustomEvent<{ message: string }>).detail.message));

describe('abschlussMoeglich (FA-01)', () => {
  it('spec, plan, bau, pr, unbekannt → yes; absicht, umgesetzt → no; a mark → no', () => {
    for (const phase of ['spec', 'plan', 'bau', 'pr', 'unbekannt'] as const) expect(abschlussMoeglich({ phase })).toBe(true);
    for (const phase of ['absicht', 'umgesetzt'] as const) expect(abschlussMoeglich({ phase })).toBe(false);
    expect(abschlussMoeglich({ phase: 'umgesetzt', abschluss: { marke: MARKE } })).toBe(false);
    expect(abschlussMoeglich({ phase: 'pr', abschluss: { laeuft: true } })).toBe(true);
  });
});

describe('aos-vorhaben-seite Abschluss (INT-2026-024)', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
    toasts.length = 0;
    svc.abschlussVorschau.mockReset();
    svc.abschliessen.mockReset();
    svc.abschlussZuruecknehmen.mockReset();
    svc.abschlussVorschau.mockResolvedValue(VORSCHAU);
    svc.abschliessen.mockResolvedValue({ prNumber: 15, prUrl: MARKE.prUrl, zweig: MARKE.zweig });
    svc.abschlussZuruecknehmen.mockResolvedValue(undefined);
  });

  it('FA-01: the button per phase; not in absicht/umgesetzt; with a mark „Abschluss zurücknehmen" instead', async () => {
    for (const phase of ['spec', 'plan', 'bau', 'pr', 'unbekannt'] as const) {
      const el = await seite(rowOf({ phase, nextStep: undefined }));
      expect(text(el, '.aktionen .abschliessen')).toBe('Abschließen');
      expect(q(el, '.aktionen .zuruecknehmen')).toBeNull();
      el.remove();
    }
    for (const phase of ['absicht', 'umgesetzt'] as const) {
      const el = await seite(rowOf({ phase, nextStep: undefined }));
      expect(q(el, '.aktionen .abschliessen')).toBeNull();
      el.remove();
    }
    const el = await seite(rowOf({ phase: 'umgesetzt', phaseNote: 'Abschluss-PR #15', abschluss: { marke: MARKE }, nextStep: undefined }));
    expect(q(el, '.aktionen .abschliessen')).toBeNull();
    expect(text(el, '.aktionen .zuruecknehmen')).toBe('Abschluss zurücknehmen');
    expect(q(el, 'aos-naechster-schritt')).toBeNull();
    expect(q(el, '.freigeben')).toBeNull();
  });

  it('FA-02: click → preview → dialog with id, title, file, base status/version, protocol row, branch, base, build PR, the „Nicht" sentence; cancel starts nothing', async () => {
    const el = await seite(rowOf());
    q(el, '.aktionen .abschliessen')!.click();
    await settle(el);
    expect(svc.abschlussVorschau).toHaveBeenCalledWith('p', 'INT-2026-012');
    const dialog = q(el, '.dialog.abschluss');
    expect(dialog).not.toBeNull();
    const t = text(el, '.dialog.abschluss');
    expect(text(el, '.dialog.abschluss h2')).toBe('Vorhaben abschließen');
    expect(t).toContain('INT-2026-012 · Titel des Vorhabens');
    expect(t).toContain('Absichtsdatei: intent.md im Ordner des Vorhabens');
    expect(t).toContain('Auf dem Hauptzweig (main): Status angenommen, Version 1.0.0 → 1.0.1');
    expect(t).toContain('Protokollzeile: 1.0.1 · 2026-09-21 · Umgesetzt: abgeschlossen aus der UI durch Michael Sindlinger; Belege in `plan.md` §13; Bau-PR #14 · — · Product Owner (Klick in der UI)');
    expect(t).toContain('Zweig chore/INT-2026-012-abschluss · Pull Request gegen main · Bau-PR #14');
    expect(t).toContain('Nicht: mergen · spec.md/plan.md ändern · Sitzung oder Arbeitskopie beenden · Board-Karte anlegen');
    expect(text(el, '.dialog.abschluss .bestaetigen')).toBe('Abschließen und PR eröffnen');
    q(el, '.dialog.abschluss .abbrechen')!.click();
    await settle(el);
    expect(q(el, '.dialog.abschluss')).toBeNull();
    expect(svc.abschliessen).not.toHaveBeenCalled();
  });

  it('FA-02/FA-06: confirming passes the shown baseSha; success → toast „Abschluss-PR #15 eröffnet"', async () => {
    const el = await seite(rowOf());
    q(el, '.aktionen .abschliessen')!.click();
    await settle(el);
    q(el, '.dialog.abschluss .bestaetigen')!.click();
    await settle(el);
    expect(svc.abschliessen).toHaveBeenCalledWith('p', 'INT-2026-012', BASE_SHA);
    expect(q(el, '.dialog.abschluss')).toBeNull();
    expect(toasts).toEqual(['Abschluss-PR #15 eröffnet']);
    expect(q(el, '.abschluss-fehler')).toBeNull();
  });

  it('FA-18: a refused preview stands under the button; a refused start too; the row\'s stored failure wins and is shown without a click', async () => {
    svc.abschlussVorschau.mockRejectedValueOnce(new FakeRequestError('ABSCHLUSS_PRECHECK', 'Nicht abgeschlossen: das Vorhaben liegt noch nicht auf dem Hauptzweig — erst den Bau-PR mergen'));
    const el = await seite(rowOf());
    q(el, '.aktionen .abschliessen')!.click();
    await settle(el);
    expect(q(el, '.dialog.abschluss')).toBeNull();
    expect(text(el, '.abschluss-fehler')).toBe('Nicht abgeschlossen: das Vorhaben liegt noch nicht auf dem Hauptzweig — erst den Bau-PR mergen');
    expect(q(el, '.abschluss-fehler')!.getAttribute('role')).toBe('alert');
    // the next click clears it and a refused start fills it again
    svc.abschliessen.mockRejectedValueOnce(new FakeRequestError('ABSCHLUSS_RUNNING', 'Abschluss läuft schon'));
    q(el, '.aktionen .abschliessen')!.click();
    await settle(el);
    expect(q(el, '.abschluss-fehler')).toBeNull();
    q(el, '.dialog.abschluss .bestaetigen')!.click();
    await settle(el);
    expect(text(el, '.abschluss-fehler')).toBe('Abschluss läuft schon');
    // the backend's stored reason on the row is shown as is (survives reload — it comes with the row)
    const el2 = await seite(rowOf({ abschluss: { fehler: { message: 'Nicht abgeschlossen: Push fehlgeschlagen: kein Netz — Zugang und Netz prüfen, dann erneut', at: 't' } } }));
    expect(text(el2, '.abschluss-fehler')).toContain('Push fehlgeschlagen');
    expect(text(el2, '.aktionen .abschliessen')).toBe('Abschließen');
  });

  it('FA-19: TIMEOUT → the neutral text; afterwards the row\'s state is taken over (mark → hint and „zurücknehmen")', async () => {
    svc.abschliessen.mockRejectedValueOnce(new FakeRequestError('TIMEOUT', 'Keine Antwort vom Backend'));
    const el = await seite(rowOf());
    q(el, '.aktionen .abschliessen')!.click();
    await settle(el);
    q(el, '.dialog.abschluss .bestaetigen')!.click();
    await settle(el);
    expect(text(el, '.abschluss-fehler')).toBe(ABSCHLUSS_TIMEOUT_TEXT);
    expect(ABSCHLUSS_TIMEOUT_TEXT).toContain('75 s');
    el.row = rowOf({ phase: 'umgesetzt', phaseNote: 'Abschluss-PR #15', abschluss: { marke: MARKE } });
    await settle(el);
    expect(q(el, '.abschluss-fehler')).toBeNull();
    expect(text(el, '.aktionen .zuruecknehmen')).toBe('Abschluss zurücknehmen');
    expect(text(el, '.hinweis.abschluss')).toBe('Abschluss angestoßen · PR #15 ↗ — nach dem Merge den Hauptcheckout aktualisieren');
    const a = q(el, '.hinweis.abschluss a') as HTMLAnchorElement;
    expect(a.getAttribute('href')).toBe(MARKE.prUrl);
    expect(a.getAttribute('target')).toBe('_blank');
    expect(a.getAttribute('rel')).toBe('noopener');
  });

  it('FA-19: while „läuft" the button is locked with „Abschluss läuft …" (also „zurücknehmen"), no click reaches the service', async () => {
    const el = await seite(rowOf({ abschluss: { laeuft: true } }));
    const btn = q(el, '.aktionen .abschliessen') as HTMLButtonElement;
    expect(btn.disabled).toBe(true);
    expect(btn.textContent!.trim()).toBe('Abschluss läuft …');
    btn.click();
    await settle(el);
    expect(svc.abschlussVorschau).not.toHaveBeenCalled();
    const el2 = await seite(rowOf({ phase: 'umgesetzt', abschluss: { marke: MARKE, laeuft: true } }));
    expect((q(el2, '.aktionen .zuruecknehmen') as HTMLButtonElement).disabled).toBe(true);
  });

  it('FA-15: „Abschluss zurücknehmen" → dialog names the branch and PR staying; confirm → service, toast; cancel → nothing', async () => {
    const el = await seite(rowOf({ phase: 'umgesetzt', phaseNote: 'Abschluss-PR #15', abschluss: { marke: MARKE } }));
    q(el, '.aktionen .zuruecknehmen')!.click();
    await settle(el);
    const t = text(el, '.dialog.zuruecknehmen');
    expect(t).toContain('Die Zeile steht wieder in ihrer Phase.');
    expect(t).toContain('Zweig chore/INT-2026-012-abschluss und Pull Request #15 bleiben bestehen — den PR auf GitHub schließen, wenn er nicht gelten soll.');
    q(el, '.dialog.zuruecknehmen .abbrechen')!.click();
    await settle(el);
    expect(svc.abschlussZuruecknehmen).not.toHaveBeenCalled();
    q(el, '.aktionen .zuruecknehmen')!.click();
    await settle(el);
    q(el, '.dialog.zuruecknehmen .bestaetigen')!.click();
    await settle(el);
    expect(svc.abschlussZuruecknehmen).toHaveBeenCalledWith('p', 'INT-2026-012');
    expect(toasts).toEqual(['Abschluss zurückgenommen']);
    expect(q(el, '.dialog.zuruecknehmen')).toBeNull();
  });

  it('Ablauf H: on the phone the buttons stack (flex rule of the host) and the terminal button keeps its place', async () => {
    const el = await seite(rowOf({ session: { id: 's1', name: 'S', model: 'opus', agentStatus: 'idle', ended: false } as VorhabenRow['session'], zustand: 'wartet' }), true);
    expect(el.hasAttribute('mobile')).toBe(true);
    expect(q(el, '.aktionen .abschliessen')).not.toBeNull();
    expect(q(el, '.aktionen .terminal')).not.toBeNull();
    const css = (el.constructor as unknown as { styles: { cssText: string } }).styles.cssText;
    expect(css).toMatch(/:host\(\[mobile\]\) \.aktionen \.seite-knopf \{\s*flex: 1 1 auto/);
  });
});
