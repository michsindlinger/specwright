// @vitest-environment happy-dom
import { describe, it, expect, vi } from 'vitest';

vi.mock('../../frontend/src/gateway.js', () => ({
  gateway: { send: vi.fn(), on: vi.fn(), off: vi.fn(), getConnectionStatus: () => false, isConnecting: () => false, getProjectPath: vi.fn() },
}));
vi.mock('../../frontend/src/utils/mermaid-render.js', () => ({ renderMermaidDiagrams: vi.fn(async () => undefined) }));

const docs: Record<string, { content: string; mtimeMs: number }> = {
  intent: { content: '---\nstatus: "entwurf"  \n---\n\n## 1. Ziel\n\nText\n\n## 2. Kriterien\n\n| ID | Text |\n|---|---|\n| AK-01 | x |\n', mtimeMs: 1000 },
};
vi.mock('../../frontend/src/services/vorhaben.service.js', () => ({
  vorhabenService: {
    readDoc: vi.fn(async (_p: string, _i: string, doc: string) => docs[doc]),
    readDesign: vi.fn(async () => 'data:image/png;base64,AA=='),
  },
}));

const settle = async (el: HTMLElement & { updateComplete: Promise<boolean> }): Promise<void> => {
  for (let i = 0; i < 4; i++) {
    await el.updateComplete;
    await new Promise((r) => setTimeout(r, 5));
  }
};

describe('aos-dokument-leser (FA-17, FA-19)', () => {
  it('renders frontmatter table, headings with ids and tables', async () => {
    await import('../../frontend/src/components/vorhaben/aos-dokument-leser.js');
    const el = document.createElement('aos-dokument-leser');
    el.projectId = 'p';
    el.intentId = 'INT-2026-001';
    el.doc = 'intent';
    el.mtimeMs = 1000;
    document.body.appendChild(el);
    await settle(el);
    const sr = el.shadowRoot!;
    expect(sr.querySelector('table.kopffelder')?.textContent).toContain('entwurf');
    expect(sr.querySelector('h2[id="1-ziel"]')).not.toBeNull();
    expect(sr.querySelectorAll('table').length).toBe(2);
    expect(sr.querySelector('.leser-reload')).toBeNull();
    el.remove();
  });

  it('shows "Dokument geändert um HH:MM — neu laden" when the Stand changes; reload keeps the heading', async () => {
    await import('../../frontend/src/components/vorhaben/aos-dokument-leser.js');
    const el = document.createElement('aos-dokument-leser');
    el.projectId = 'p';
    el.intentId = 'INT-2026-001';
    el.doc = 'intent';
    el.mtimeMs = 1000;
    document.body.appendChild(el);
    await settle(el);
    // A newer Stand arrives via vorhaben:state
    docs.intent = { content: '## 1. Ziel\n\nNeu\n\n## 2. Kriterien\n\nAuch neu\n', mtimeMs: 2000 };
    el.mtimeMs = 2000;
    await settle(el);
    const sr = el.shadowRoot!;
    const hint = sr.querySelector('.leser-reload');
    expect(hint).not.toBeNull();
    expect(hint?.textContent).toContain('Dokument geändert um');
    expect(sr.textContent).toContain('Text'); // old content still shown until reload
    const scrolled: string[] = [];
    Element.prototype.scrollIntoView = function () {
      scrolled.push((this as Element).id);
    };
    (sr.querySelector('.leser-reload-btn') as HTMLButtonElement).click();
    await settle(el);
    expect(sr.querySelector('.leser-reload')).toBeNull();
    expect(sr.textContent).toContain('Neu');
    expect(scrolled).toEqual(['1-ziel']);
    el.remove();
  });

  it('design/: images as <img>, other files by name only', async () => {
    await import('../../frontend/src/components/vorhaben/aos-dokument-leser.js');
    const el = document.createElement('aos-dokument-leser');
    el.projectId = 'p';
    el.intentId = 'INT-2026-001';
    el.doc = 'design';
    el.designFiles = ['01-mock.png', 'mock.css'];
    document.body.appendChild(el);
    await settle(el);
    const sr = el.shadowRoot!;
    expect(sr.querySelectorAll('img').length).toBe(1);
    expect(sr.querySelector('.leser-file')?.textContent).toBe('mock.css');
    el.remove();
  });
});

describe('aos-dokument-leser Stufe 3: technik sections (FA-13, FA-14, AN-S03)', () => {
  const MARKIERT = '---\nstatus: "entwurf"  \n---\n\n## 1. Ziel\n\n<!-- leser: mensch -->\n\nText\n\n## 2. Daten\n\n<!-- leser: agent -->\n\n| ID | Text |\n|---|---|\n| AK-01 | technisch |\n\n### 2.1 Tiefer\n\n<!-- leser: agent -->\n\nNoch tiefer\n';
  const mount = async (doc: string) => {
    await import('../../frontend/src/components/vorhaben/aos-dokument-leser.js');
    docs[doc] = docs[doc] ?? { content: '', mtimeMs: 1 };
    const el = document.createElement('aos-dokument-leser');
    el.projectId = 'p';
    el.intentId = 'INT-2026-001';
    el.doc = doc as 'intent' | 'spec' | 'plan';
    el.mtimeMs = 1;
    document.body.appendChild(el);
    await settle(el);
    return el;
  };

  it('fully marked document: agent sections closed, switch "Technik zeigen" toggles all of them and its label', async () => {
    docs.spec = { content: MARKIERT, mtimeMs: 1 };
    const el = await mount('spec');
    const sr = el.shadowRoot!;
    const details = sr.querySelectorAll('details.technik');
    expect(details.length).toBe(2);
    details.forEach((d) => expect(d.hasAttribute('open')).toBe(false));
    expect(sr.querySelector('details.technik > summary > h2[id="2-daten"]')).not.toBeNull();
    expect(sr.querySelector('h2[id="1-ziel"]')?.closest('details')).toBeNull(); // mensch stays open
    const btn = sr.querySelector<HTMLButtonElement>('.leser-technik-btn')!;
    expect(btn.textContent?.trim()).toBe('Technik zeigen');
    expect(btn.getAttribute('aria-pressed')).toBe('false');
    btn.click();
    await settle(el);
    sr.querySelectorAll('details.technik').forEach((d) => expect(d.hasAttribute('open')).toBe(true));
    expect(btn.textContent?.trim()).toBe('Technik ausblenden');
    expect(btn.getAttribute('aria-pressed')).toBe('true');
    btn.click();
    await settle(el);
    sr.querySelectorAll('details.technik').forEach((d) => expect(d.hasAttribute('open')).toBe(false));
    el.remove();
  });

  it('unmarked and partly marked documents: everything open, no switch', async () => {
    docs.intent = { content: '## 1. Ziel\n\nText\n\n## 2. Daten\n\nOffen\n', mtimeMs: 1 };
    const a = await mount('intent');
    expect(a.shadowRoot!.querySelector('.leser-technik-btn')).toBeNull();
    expect(a.shadowRoot!.querySelector('details')).toBeNull();
    expect(a.shadowRoot!.textContent).toContain('Offen');
    a.remove();
    docs.plan = { content: '## 1. Ziel\n\n<!-- leser: mensch -->\n\nText\n\n## 2. Daten\n\nOhne Marker\n', mtimeMs: 1 };
    const b = await mount('plan');
    expect(b.shadowRoot!.querySelector('.leser-technik-btn')).toBeNull();
    expect(b.shadowRoot!.querySelector('details')).toBeNull();
    b.remove();
  });

  it('switch state is transient: switching to another document resets it; a reload keeps it', async () => {
    docs.spec = { content: MARKIERT, mtimeMs: 1 };
    docs.plan = { content: MARKIERT.replace('## 1. Ziel', '## 1. Plan-Ziel'), mtimeMs: 1 };
    const el = await mount('spec');
    const sr = el.shadowRoot!;
    sr.querySelector<HTMLButtonElement>('.leser-technik-btn')!.click();
    await settle(el);
    expect(sr.querySelector('details.technik')?.hasAttribute('open')).toBe(true);
    el.reload();
    await settle(el);
    expect(sr.querySelector('details.technik')?.hasAttribute('open')).toBe(true); // reload = same view
    el.doc = 'plan';
    await settle(el);
    expect(sr.querySelector('h2[id="1-plan-ziel"]')).not.toBeNull();
    expect(sr.querySelector('details.technik')?.hasAttribute('open')).toBe(false); // other document = fresh
    expect(sr.querySelector('.leser-technik-btn')?.textContent?.trim()).toBe('Technik zeigen');
    el.remove();
  });

  it('openAnmerkung on a block inside a closed technik section opens the section first (ensureSichtbar)', async () => {
    docs.spec = { content: MARKIERT, mtimeMs: 1 };
    const el = await mount('spec');
    el.annotierbar = true;
    el.anmerkungen = [{ id: 'an-1', ordinal: 99, ref: 'AK-01', snippet: 'AK-01 technisch', text: 'Frage', updatedAt: '2026-09-17T00:00:00Z' }];
    await settle(el);
    const sr = el.shadowRoot!;
    const scrolled: string[] = [];
    Element.prototype.scrollIntoView = function () {
      scrolled.push((this as Element).textContent ?? '');
    };
    expect(sr.querySelector('details.technik')?.hasAttribute('open')).toBe(false);
    el.openAnmerkung('an-1');
    await settle(el);
    const row = sr.querySelector('tr.leser-aktiv');
    expect(row?.textContent).toContain('AK-01');
    expect(row?.closest('details')?.hasAttribute('open')).toBe(true);
    expect(scrolled.length).toBe(1);
    // The other technik section stays closed — only the ancestors open
    expect(sr.querySelector('details.technik h3[id="21-tiefer"]')?.closest('details')?.hasAttribute('open')).toBe(false);
    el.remove();
  });

  it('reload keeps the reading position on a visible heading, never on one hidden in a closed section', async () => {
    docs.spec = { content: MARKIERT, mtimeMs: 1 };
    const el = await mount('spec');
    const sr = el.shadowRoot!;
    // happy-dom: every rect is 0 → the first heading not hidden wins; "1. Ziel" (open) must win over nothing else
    const scrolled: string[] = [];
    Element.prototype.scrollIntoView = function () {
      scrolled.push((this as Element).id);
    };
    el.reload();
    await settle(el);
    expect(scrolled).toEqual(['1-ziel']);
    el.remove();
  });
});
