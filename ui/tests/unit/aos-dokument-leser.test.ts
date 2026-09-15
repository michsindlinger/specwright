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
