// @vitest-environment happy-dom
import { describe, it, expect } from 'vitest';

describe('vorhaben-markdown (FA-17)', () => {
  it('frontmatter → table, body via own Marked instance with breaks:false', async () => {
    const { renderDocument, splitFrontmatter } = await import('../../frontend/src/components/vorhaben/vorhaben-markdown.js');
    const text = '---\nintent_id: "INT-2026-004"  \nstatus: "angenommen"  \nbezuege:  \n  spec: "spec.md"  \n---\n\n# Titel\n\nZeile eins\nZeile zwei\n\n| a | b |\n|---|---|\n| 1 | 2 |\n\n```ts\nconst x = 1;\n```\n\n```mermaid\nflowchart LR\n  A --> B\n```\n';
    const fm = splitFrontmatter(text);
    expect(fm.frontmatter).toEqual([['intent_id', 'INT-2026-004'], ['status', 'angenommen'], ['bezuege.spec', 'spec.md']]);
    const html = renderDocument(text);
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
