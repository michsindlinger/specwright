// @vitest-environment happy-dom
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

/** Real Vorhaben documents as fixtures (vitest runs from `ui/`). */
const fixture = (rel: string): string => readFileSync(resolve(process.cwd(), '..', 'intent', rel), 'utf-8');

describe('vorhaben-markdown (FA-17)', () => {
  it('frontmatter → table, body via own Marked instance with breaks:false', async () => {
    const { renderDocument, splitFrontmatter } = await import('../../frontend/src/components/vorhaben/vorhaben-markdown.js');
    const text = '---\nintent_id: "INT-2026-004"  \nstatus: "angenommen"  \nbezuege:  \n  spec: "spec.md"  \n---\n\n# Titel\n\nZeile eins\nZeile zwei\n\n| a | b |\n|---|---|\n| 1 | 2 |\n\n```ts\nconst x = 1;\n```\n\n```mermaid\nflowchart LR\n  A --> B\n```\n';
    const fm = splitFrontmatter(text);
    expect(fm.frontmatter).toEqual([['intent_id', 'INT-2026-004'], ['status', 'angenommen'], ['bezuege.spec', 'spec.md']]);
    const { html, gekennzeichnet } = renderDocument(text);
    expect(gekennzeichnet).toBe(false);
    expect(html).toContain('<table class="kopffelder">');
    expect(html).toContain('<th scope="row">bezuege.spec</th><td>spec.md</td>');
    expect(html).toContain('<h1 id="titel">Titel</h1>');
    expect(html).not.toContain('Zeile eins<br>'); // breaks:false (MacDown)
    expect(html).toContain('<table>');
    expect(html).toContain('class="code-block"');
    expect(html).toContain('class="mermaid-container"');
  });

  it('duplicate headings get unique ids; heading ids keep the reading position (FA-19)', async () => {
    const { addHeadingIds } = await import('../../frontend/src/components/vorhaben/vorhaben-markdown.js');
    expect(addHeadingIds('<h2>5. Verbindungen</h2><h2>5. Verbindungen</h2>')).toBe('<h2 id="5-verbindungen">5. Verbindungen</h2><h2 id="5-verbindungen-2">5. Verbindungen</h2>');
  });

  it('the chat renderer keeps breaks:true (own instance does not leak)', async () => {
    const { renderMarkdown } = await import('../../frontend/src/utils/markdown-renderer.js');
    await import('../../frontend/src/components/vorhaben/vorhaben-markdown.js');
    expect(renderMarkdown('a\nb')).toContain('a<br>b');
  });
});

describe('vorhaben-markdown reader markers (FA-13, FA-14, AN-S03)', () => {
  const MD = '../../frontend/src/components/vorhaben/vorhaben-markdown.js';

  it('fully marked document (INT-2026-010 spec.md): agent sections become closed <details class="technik">, mensch sections stay open', async () => {
    const { renderDocument } = await import(MD);
    const { html, gekennzeichnet } = renderDocument(fixture('INT-2026-010-ui-vorhaben-als-mitte/spec.md'));
    expect(gekennzeichnet).toBe(true);
    expect(html).not.toContain('<!-- leser:'); // markers are dropped
    expect(html).toContain('<details class="technik"><summary><h2 id="5-daten-fachlich">5. Daten, fachlich</h2></summary>');
    expect(html).toMatch(/<h2 id="1-zusammenfassung">1\. Zusammenfassung<\/h2>/);
    expect(html).not.toMatch(/<summary><h2 id="1-zusammenfassung">/); // mensch: no details
    expect(html).not.toContain('<details open');
  });

  it('unmarked document (INT-2026-008 plan.md): no details, gekennzeichnet false, heading ids as before', async () => {
    const { renderDocument } = await import(MD);
    const { html, gekennzeichnet } = renderDocument(fixture('INT-2026-008-gespraech-ab-sitzungsstart/plan.md'));
    expect(gekennzeichnet).toBe(false);
    expect(html).not.toContain('<details');
    expect(html).toContain('<h2 id="details">Details</h2>');
  });

  it('partially marked document counts as unmarked (AN-S03): everything open, no details', async () => {
    const { renderDocument, kennzeichnungVon } = await import(MD);
    const text = '# T\n\n## A\n\n<!-- leser: mensch -->\n\nText A\n\n## B\n\nText B ohne Marker\n\n### B.1\n\n<!-- leser: agent -->\n\nTechnik\n';
    const { html, gekennzeichnet } = renderDocument(text);
    expect(gekennzeichnet).toBe(false);
    expect(html).not.toContain('<details');
    expect(kennzeichnungVon(text)).toBe('teilweise');
  });

  it('nesting: an agent ### inside a mensch ## is wrapped alone; #### without marker inherits; text before the first ## stays open', async () => {
    const { renderDocument } = await import(MD);
    const text = '# Titel\n\nEinleitung\n\n## A\n\n<!-- leser: mensch -->\n\nText A\n\n### A.1\n\n<!-- leser: agent -->\n\nTechnik A.1\n\n#### A.1.1\n\nTiefer\n\n### A.2\n\n<!-- leser: mensch -->\n\nText A.2\n\n## B\n\n<!-- leser: agent -->\n\nText B\n\n### B.1\n\n<!-- leser: mensch -->\n\nText B.1\n';
    const { html, gekennzeichnet } = renderDocument(text);
    expect(gekennzeichnet).toBe(true);
    expect(html.startsWith('<h1 id="titel">Titel</h1>\n<p>Einleitung</p>\n<h2 id="a">A</h2>')).toBe(true);
    // A.1 (agent) with its #### child inside one details; A.2 (mensch) outside again
    expect(html).toContain('<details class="technik"><summary><h3 id="a1">A.1</h3></summary><p>Technik A.1</p>\n<h4 id="a11">A.1.1</h4>\n<p>Tiefer</p>\n</details><h3 id="a2">A.2</h3>');
    // B (agent) wraps its mensch child B.1 — the tree decides
    expect(html).toContain('<details class="technik"><summary><h2 id="b">B</h2></summary><p>Text B</p>\n<h3 id="b1">B.1</h3>\n<p>Text B.1</p>\n</details>');
    expect((html.match(/<details/g) ?? []).length).toBe(2);
  });

  it('a marker inside a code fence is code, not a marker; the fence stays in the section body', async () => {
    const { renderDocument, kennzeichnungVon } = await import(MD);
    const text = '## A\n\n<!-- leser: mensch -->\n\n```md\n<!-- leser: agent -->\n```\n\n## B\n\n```\n<!-- leser: agent -->\n```\n';
    expect(kennzeichnungVon(text)).toBe('teilweise'); // B has no marker
    const { html } = renderDocument(text);
    expect(html).not.toContain('<details');
    expect(html).toContain('&lt;!-- leser: agent --&gt;');
  });

  it('marker rules: only the first non-empty line counts; ## with a foreign comment first is unmarked; H1 never counts', async () => {
    const { kennzeichnungVon: lex } = await import(MD);
    expect(lex('# T\n\n<!-- leser: mensch -->\n\nText\n')).toBe('keine');
    expect(lex('## A\n\n<!-- Hinweis -->\n<!-- leser: mensch -->\n\nText\n')).toBe('keine');
    expect(lex('## A\n<!-- leser: agent -->\nDirekt\n\n### A.1\n\n<!--   leser:agent   -->\n\nx\n')).toBe('vollstaendig');
    expect(lex('## A\n\n<!-- leser: mensch -->\n\n### A.1\n\nohne\n')).toBe('teilweise');
  });
});
