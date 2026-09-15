// @vitest-environment happy-dom
import { describe, it, expect } from 'vitest';

const md = `# Spec

## 3. Entwurf

Erster Absatz ohne Kennung, der etwas länger ist als sechs Wörter.

| Verbindung | Von → nach |
|---|---|
| V-01 | Watcher → Übersicht |
| V-02 | Sende-Weg → Sitzung |

- Punkt eins
- Punkt mit AK-03 drin

\`\`\`ts
const x = 1;
\`\`\`

### Unnummerierte Überschrift

Absatz darunter.

## 5. Verbindungen

Text zu FA-07 hier.
`;

async function anchorsOf(text: string) {
  const { renderDocument } = await import('../../frontend/src/components/vorhaben/vorhaben-markdown.js');
  const { deriveAnchors } = await import('../../frontend/src/components/vorhaben/vorhaben-anchors.js');
  const root = document.createElement('div');
  root.innerHTML = renderDocument(text);
  return deriveAnchors(root);
}

describe('vorhaben-anchors (FA-23, FA-24)', () => {
  it('one anchor per heading, paragraph, row, list item and code block in document order', async () => {
    const anchors = await anchorsOf(md);
    expect(anchors.map((a) => a.element.tagName)).toEqual(['H1', 'H2', 'P', 'TR', 'TR', 'TR', 'LI', 'LI', 'PRE', 'H3', 'P', 'H2', 'P']);
    expect(anchors.map((a) => a.ordinal)).toEqual([...anchors.keys()]);
  });

  it('reference rank: id → §n → heading text → first words', async () => {
    const refs = Object.fromEntries((await anchorsOf(md)).map((a) => [a.ordinal, a.ref]));
    expect(refs[0]).toBe('„Spec"');
    expect(refs[1]).toBe('§3 „Entwurf"');
    expect(refs[2]).toBe('§3 · Absatz „Erster Absatz ohne Kennung, der etwas …"');
    expect(refs[3]).toBe('§3 · Zeile „Verbindung Von → nach"');
    expect(refs[4]).toBe('V-01 · §3');
    expect(refs[5]).toBe('V-02 · §3');
    expect(refs[6]).toBe('§3 · Punkt „Punkt eins"');
    expect(refs[7]).toBe('AK-03 · §3');
    expect(refs[8]).toBe('§3 · Code');
    expect(refs[9]).toBe('„Unnummerierte Überschrift"');
    expect(refs[10]).toBe('§3 · Absatz „Absatz darunter."');
    expect(refs[11]).toBe('§5 „Verbindungen"');
    expect(refs[12]).toBe('FA-07 · §5');
  });

  it('without any numbered heading the reference is the words alone; the frontmatter table is skipped', async () => {
    const anchors = await anchorsOf('---\nstatus: "x"  \n---\n\nNur ein Absatz mit AN-S02.\n\nZweiter Absatz.\n');
    expect(anchors.map((a) => a.ref)).toEqual(['AN-S02', 'Absatz „Zweiter Absatz."']);
  });

  it('locateAnmerkung: snippet first, then ordinal, null when gone', async () => {
    const { locateAnmerkung } = await import('../../frontend/src/components/vorhaben/vorhaben-anchors.js');
    const anchors = await anchorsOf(md);
    const p = anchors[2];
    expect(locateAnmerkung(anchors, { ordinal: 99, snippet: p.snippet })?.ordinal).toBe(2);
    expect(locateAnmerkung(anchors, { ordinal: 4, snippet: '' })?.ref).toBe('V-01 · §3');
    expect(locateAnmerkung(anchors, { ordinal: 4, snippet: 'Diesen Text gibt es im Dokument nicht mehr' })).toBeNull();
    expect(locateAnmerkung(anchors, { ordinal: -1, snippet: '' })).toBeNull();
    // moved paragraph: the prefix still finds it
    const moved = await anchorsOf('# Neu\n\n' + md);
    expect(locateAnmerkung(moved, { ordinal: 2, snippet: p.snippet })?.element.tagName).toBe('P');
  });
});
