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
  root.innerHTML = renderDocument(text).html;
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

describe('vorhaben-anchors with technik sections (INT-2026-010 Stufe 3)', () => {
  it('blocks inside <details class="technik"> are anchored in document order, summary headings included; details/summary are no blocks', async () => {
    const anchors = await anchorsOf('## 1. Ziel\n\n<!-- leser: mensch -->\n\nOffen\n\n## 2. Daten\n\n<!-- leser: agent -->\n\n| ID | Text |\n|---|---|\n| AK-01 | technisch |\n\n### 2.1 Tiefer\n\n<!-- leser: agent -->\n\nNoch tiefer\n');
    expect(anchors.map((a) => a.element.tagName)).toEqual(['H2', 'P', 'H2', 'TR', 'TR', 'H3', 'P']);
    expect(anchors.map((a) => a.ordinal)).toEqual([0, 1, 2, 3, 4, 5, 6]);
    expect(anchors[2].element.closest('summary')).not.toBeNull();
    expect(anchors[4].ref).toBe('AK-01 · §2');
    expect(anchors[6].ref).toBe('§2.1 · Absatz „Noch tiefer"');
  });
});

describe('indexKennungen (INT-2026-011, FA-13/FA-16)', () => {
  const doc = `# Spec

## 1. Zusammenfassung

Die Liste blendet erledigte Vorhaben aus (AK-01, AK-02); siehe auch F1 und R2.

## 3. Fachliche Anforderungen

| ID | Anforderung | Herkunft |
|---|---|---|
| FA-01 | Die Liste DARF ein Vorhaben mit Status umgesetzt nicht zeigen. | AK-01 |
| FA-02 | Wenn der Schalter an ist, MUSS die Liste erledigte zeigen. | AK-02 |

- AN-S03 Auslegung: nichts geschieht ohne Sitzung
- Punkt mit FA-02 im Text

Review: F1 entkräftet, D3 offen.
`;

  it('every code of every block; the first block wins, a block starting with the code beats an earlier mention in running text', async () => {
    const { indexKennungen } = await import('../../frontend/src/components/vorhaben/vorhaben-anchors.js');
    const anchors = await anchorsOf(doc);
    const idx = indexKennungen(anchors);
    // FA-01 starts its table row → that row, with the row's derived reference
    expect(idx.get('FA-01')?.ref).toBe('FA-01 · §3');
    expect(idx.get('FA-01')?.snippet).toContain('Die Liste DARF');
    expect(anchors[idx.get('FA-01')!.ordinal].element.tagName).toBe('TR');
    // AK-01 is only mentioned in running text: first mention = the summary paragraph, not the FA-01 row that cites it later
    expect(anchors[idx.get('AK-01')!.ordinal].element.tagName).toBe('P');
    expect(idx.get('AK-01')?.ref).toBe('AK-01 · §1');
    // FA-02: its row starts with it; the later list item mentioning it does not replace that
    expect(anchors[idx.get('FA-02')!.ordinal].element.tagName).toBe('TR');
    // stage codes and reference points
    expect(anchors[idx.get('AN-S03')!.ordinal].element.tagName).toBe('LI');
    expect(anchors[idx.get('F1')!.ordinal].element.tagName).toBe('P');
    expect(idx.get('F1')?.ref).toBe('AK-01 · §1'); // first mention in the summary
    expect(idx.get('R2')).toBeDefined();
    expect(idx.get('D3')?.ref).toBe('§3 · Absatz „Review: F1 entkräftet, D3 offen."');
    expect(idx.has('FA-03')).toBe(false);
    expect([...idx.keys()].sort()).toEqual(['AK-01', 'AK-02', 'AN-S03', 'D3', 'F1', 'FA-01', 'FA-02', 'R2']);
  });

  it('a block that starts with a code replaces an earlier running-text mention (the row comes after the paragraph)', async () => {
    const { indexKennungen } = await import('../../frontend/src/components/vorhaben/vorhaben-anchors.js');
    const anchors = await anchorsOf('## 1. Text\n\nAbsatz nennt FA-07 vorab.\n\n## 3. Tabelle\n\n| ID | Text |\n|---|---|\n| FA-07 | Die Zeile. |\n');
    const idx = indexKennungen(anchors);
    expect(anchors[idx.get('FA-07')!.ordinal].element.tagName).toBe('TR');
    expect(idx.get('FA-07')?.ref).toBe('FA-07 · §3');
  });

  it('no codes → empty index', async () => {
    const { indexKennungen } = await import('../../frontend/src/components/vorhaben/vorhaben-anchors.js');
    const idx = indexKennungen(await anchorsOf('## 1. Nur Text\n\nOhne Kennungen.\n'));
    expect(idx.size).toBe(0);
  });
});
