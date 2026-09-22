/**
 * INT-2026-024 (FA-03, FA-04, FA-05, FA-09): the pure text function of the
 * Vorhaben-Abschluss — three head fields replaced in place (quotes, trailing
 * blanks and line terminators kept), one row appended to the „Änderungsprotokoll"
 * table with cells filled by column NAME (four table shapes in the inventory of
 * 2026-09-22), build-PR numbers from the raw plan status line, deterministic.
 */
import { describe, it, expect } from 'vitest';
import {
  AbschlussTextError,
  bauPrNummern,
  bereiteAbschlussVor,
  commitTitel,
  datumLokal,
  prBody,
  PROTOKOLL_TEXT,
} from '../../src/server/services/vorhaben-abschluss-text.js';

const DATUM = '2026-09-22';

/** The specwright template shape (Version · Datum · Änderung · IDs · Freigabe), LF, two trailing blanks in the head. */
function intent5(opts: { status?: string; version?: string; eol?: string; trailingEol?: boolean } = {}): string {
  const eol = opts.eol ?? '\n';
  const lines = [
    '---',
    'intent_id: "INT-2026-001"  ',
    'titel: "Ein Vorhaben"  ',
    `status: "${opts.status ?? 'angenommen'}"  `,
    `version: "${opts.version ?? '1.0.0'}"  `,
    'autor: "Michael Sindlinger"  ',
    'erstellt: "2026-09-01"  ',
    'geaendert: "2026-09-10"  ',
    'bypass: "ja"  ',
    'bezuege:',
    '  - "INT-2026-000"',
    '---',
    '',
    '# Absicht: Ein Vorhaben',
    '',
    '## 1. Problem',
    '',
    'Text mit status: "angenommen" im Fließtext bleibt.',
    '',
    '## Änderungsprotokoll',
    '',
    '<!-- leser: agent -->',
    '',
    '| Version | Datum | Änderung | IDs | Freigabe |',
    '|---|---|---|---|---|',
    '| 0.1.0 | 2026-09-01 | Entwurf | — | — |',
    '| 1.0.0 | 2026-09-10 | Angenommen | AK-01 | Product Owner |',
    '',
    '<!-- Ende -->',
  ];
  const text = lines.join(eol);
  return opts.trailingEol === false ? text : text + eol;
}

describe('bereiteAbschlussVor — head fields (FA-03)', () => {
  it('replaces status, version (PATCH + 1) and geaendert, keeps quotes and trailing blanks; everything else byte-identical', () => {
    const src = intent5();
    const out = bereiteAbschlussVor(src, { datum: DATUM, bauPrs: [] });
    expect(out.statusAlt).toBe('angenommen');
    expect(out.versionAlt).toBe('1.0.0');
    expect(out.versionNeu).toBe('1.0.1');
    const a = src.split('\n');
    const b = out.text.split('\n');
    expect(b.length).toBe(a.length + 1);
    expect(b[3]).toBe('status: "umgesetzt"  ');
    expect(b[4]).toBe('version: "1.0.1"  ');
    expect(b[7]).toBe('geaendert: "2026-09-22"  ');
    // the appended row sits right after the last table row
    expect(b[27]).toBe(`| 1.0.1 | 2026-09-22 | ${PROTOKOLL_TEXT} | — | Product Owner (Klick in der UI) |`);
    // diff = exactly 3 replaced + 1 appended line
    const changed = a.filter((line, i) => line !== b[i]).length;
    expect(changed).toBe(3 + (a.length - 27)); // lines from 27 on are shifted by the insert
    expect(b.slice(0, 27).filter((l, i) => l !== a[i])).toHaveLength(3);
    expect(b.slice(28)).toEqual(a.slice(27));
    // the body mention of status stays
    expect(out.text).toContain('Text mit status: "angenommen" im Fließtext bleibt.');
  });

  it('keeps an unquoted version and status (no quotes added)', () => {
    const src = intent5().replace('status: "angenommen"  ', 'status: angenommen').replace('version: "1.0.0"  ', 'version: 1.0.0');
    const out = bereiteAbschlussVor(src, { datum: DATUM, bauPrs: [] });
    expect(out.text).toContain('\nstatus: umgesetzt\n');
    expect(out.text).toContain('\nversion: 1.0.1\n');
    expect(out.statusAlt).toBe('angenommen');
  });

  it('single quotes and a different indentation of the value are kept', () => {
    const src = intent5().replace('status: "angenommen"  ', "status:   'angenommen'").replace('version: "1.0.0"  ', "version:\t'2.3.9' ");
    const out = bereiteAbschlussVor(src, { datum: DATUM, bauPrs: [] });
    expect(out.text).toContain("\nstatus:   'umgesetzt'\n");
    expect(out.text).toContain("\nversion:\t'2.3.10' \n");
    expect(out.versionNeu).toBe('2.3.10');
  });

  it('an unknown status word („in Arbeit") is replaced too and reported as statusAlt (Ablauf F)', () => {
    const out = bereiteAbschlussVor(intent5({ status: 'in Arbeit' }), { datum: DATUM, bauPrs: [] });
    expect(out.statusAlt).toBe('in Arbeit');
    expect(out.text).toContain('status: "umgesetzt"  ');
  });

  it('CRLF file stays CRLF byte for byte (only the four places change)', () => {
    const src = intent5({ eol: '\r\n' });
    const out = bereiteAbschlussVor(src, { datum: DATUM, bauPrs: [] });
    expect(out.text).not.toMatch(/[^\r]\n/);
    expect(out.text.split('\r\n').length).toBe(src.split('\r\n').length + 1);
    expect(out.text).toContain('status: "umgesetzt"  \r\n');
    expect(out.text).toContain(`| 1.0.1 | ${DATUM} | ${PROTOKOLL_TEXT} | — | Product Owner (Klick in der UI) |\r\n\r\n<!-- Ende -->\r\n`);
  });

  it('mixed line endings are kept per line; the new row takes the terminator of the last table row', () => {
    const lf = intent5();
    // head LF, table CRLF
    const idx = lf.indexOf('| Version');
    const src = lf.slice(0, idx) + lf.slice(idx).replace(/\n/g, '\r\n');
    const out = bereiteAbschlussVor(src, { datum: DATUM, bauPrs: [] });
    const idxOut = out.text.indexOf('| Version');
    expect(out.text.slice(0, idxOut)).toBe(lf.slice(0, idx).replace('status: "angenommen"', 'status: "umgesetzt"').replace('version: "1.0.0"', 'version: "1.0.1"').replace('geaendert: "2026-09-10"', `geaendert: "${DATUM}"`));
    expect(out.text).toContain('| 1.0.0 | 2026-09-10 | Angenommen | AK-01 | Product Owner |\r\n| 1.0.1 |');
    expect(out.text).toContain('Product Owner (Klick in der UI) |\r\n\r\n<!-- Ende -->\r\n');
  });

  it('file without a trailing newline whose last line is the table: a terminator is added before the new row', () => {
    const src = intent5({ trailingEol: false }).replace('\n\n<!-- Ende -->', '');
    expect(src.endsWith('| Product Owner |')).toBe(true);
    const out = bereiteAbschlussVor(src, { datum: DATUM, bauPrs: [] });
    expect(out.text).toContain('| Product Owner |\n| 1.0.1 |');
    expect(out.text.endsWith('Product Owner (Klick in der UI) |\n')).toBe(true);
  });

  it('errors: no frontmatter, no status, version not SemVer, geaendert missing, already umgesetzt', () => {
    expect(() => bereiteAbschlussVor('# Kein Kopf\n', { datum: DATUM, bauPrs: [] })).toThrow(AbschlussTextError);
    try {
      bereiteAbschlussVor('# Kein Kopf\n', { datum: DATUM, bauPrs: [] });
    } catch (e) {
      expect((e as AbschlussTextError).grund).toBe('kopf_fehlt');
    }
    const noStatus = intent5().replace('status: "angenommen"  \n', '');
    expect(() => bereiteAbschlussVor(noStatus, { datum: DATUM, bauPrs: [] })).toThrow(/status/);
    for (const v of ['1.0', 'v1', '1.0.0-rc1', '']) {
      const src = intent5().replace('version: "1.0.0"  ', `version: "${v}"  `);
      try {
        bereiteAbschlussVor(src, { datum: DATUM, bauPrs: [] });
        throw new Error('expected throw');
      } catch (e) {
        expect((e as AbschlussTextError).grund).toBe('version_unlesbar');
        expect((e as Error).message).toContain('JJ.MM.PP');
        expect((e as Error).message).toContain(`„${v}"`);
      }
    }
    const noGeaendert = intent5().replace('geaendert: "2026-09-10"  \n', '');
    try {
      bereiteAbschlussVor(noGeaendert, { datum: DATUM, bauPrs: [] });
      throw new Error('expected throw');
    } catch (e) {
      expect((e as AbschlussTextError).grund).toBe('geaendert_fehlt');
      expect((e as Error).message).toContain('geaendert');
    }
    try {
      bereiteAbschlussVor(intent5({ status: 'Umgesetzt' }), { datum: DATUM, bauPrs: [] });
      throw new Error('expected throw');
    } catch (e) {
      expect((e as AbschlussTextError).grund).toBe('schon_umgesetzt');
      expect((e as Error).message).toContain('Hauptcheckout aktualisieren');
    }
  });

  it('only top-level head lines count: an indented `status:` under bezuege is ignored', () => {
    const src = intent5().replace('  - "INT-2026-000"', '  status: "nested"');
    const out = bereiteAbschlussVor(src, { datum: DATUM, bauPrs: [] });
    expect(out.text).toContain('  status: "nested"');
    expect(out.text).toContain('status: "umgesetzt"  ');
  });
});

describe('bereiteAbschlussVor — Änderungsprotokoll (FA-04, FA-05)', () => {
  const tableOf = (header: string, sep: string, rows: string[]): string =>
    ['---', 'status: "angenommen"', 'version: "0.4.2"', 'geaendert: "2026-09-01"', '---', '', '# A', '', '### Änderungsprotokoll', '', header, sep, ...rows, '', '## Danach', 'x', ''].join('\n');

  it('protocol text with 0, 1 and 3 build PRs; duplicates removed', () => {
    expect(bereiteAbschlussVor(intent5(), { datum: DATUM, bauPrs: [] }).zeile[2]).toBe(PROTOKOLL_TEXT);
    expect(bereiteAbschlussVor(intent5(), { datum: DATUM, bauPrs: [7] }).zeile[2]).toBe(`${PROTOKOLL_TEXT}; Bau-PR #7`);
    expect(bereiteAbschlussVor(intent5(), { datum: DATUM, bauPrs: [57, 58, 63] }).zeile[2]).toBe(`${PROTOKOLL_TEXT}; Bau-PR #57, #58, #63`);
    expect(bereiteAbschlussVor(intent5(), { datum: DATUM, bauPrs: [57, 57, 58] }).zeile[2]).toBe(`${PROTOKOLL_TEXT}; Bau-PR #57, #58`);
    expect(PROTOKOLL_TEXT).toBe('Umgesetzt: abgeschlossen aus der UI durch Michael Sindlinger; Belege in `plan.md` §13');
  });

  it('4 columns (Version · Datum · Autor · Änderung)', () => {
    const src = tableOf('| Version | Datum | Autor | Änderung |', '|---|---|---|---|', ['| 0.4.2 | 2026-09-01 | MS | x |']);
    const out = bereiteAbschlussVor(src, { datum: DATUM, bauPrs: [3] });
    expect(out.spalten).toEqual(['Version', 'Datum', 'Autor', 'Änderung']);
    expect(out.zeile).toEqual(['0.4.3', DATUM, 'Michael Sindlinger (UI)', `${PROTOKOLL_TEXT}; Bau-PR #3`]);
    expect(out.text).toContain(`| 0.4.2 | 2026-09-01 | MS | x |\n| 0.4.3 | ${DATUM} | Michael Sindlinger (UI) | ${PROTOKOLL_TEXT}; Bau-PR #3 |\n\n## Danach`);
  });

  it('3 columns (Version · Datum · Änderung)', () => {
    const src = tableOf('| Version | Datum | Änderung |', '| --- | --- | --- |', ['| 0.4.2 | 2026-09-01 | x |']);
    const out = bereiteAbschlussVor(src, { datum: DATUM, bauPrs: [] });
    expect(out.zeile).toEqual(['0.4.3', DATUM, PROTOKOLL_TEXT]);
  });

  it('3 columns with „Datum" first (Datum · Version · Änderung — kreis-lippe INT-009/010/011)', () => {
    const src = tableOf('| Datum | Version | Änderung |', '|:---|:---|:---|', ['| 2026-09-01 | 0.4.2 | x |']);
    const out = bereiteAbschlussVor(src, { datum: DATUM, bauPrs: [14] });
    expect(out.zeile).toEqual([DATUM, '0.4.3', `${PROTOKOLL_TEXT}; Bau-PR #14`]);
    expect(out.text).toContain(`| 2026-09-01 | 0.4.2 | x |\n| ${DATUM} | 0.4.3 | ${PROTOKOLL_TEXT}; Bau-PR #14 |\n`);
  });

  it('unknown columns stay empty; cell count = header count; names are matched case-insensitively', () => {
    const src = tableOf('| version | Datum | Wer | Änderung | Ticket |', '|---|---|---|---|---|', ['| 0.4.2 | 2026-09-01 | MS | x | T-1 |']);
    const out = bereiteAbschlussVor(src, { datum: DATUM, bauPrs: [] });
    expect(out.zeile).toEqual(['0.4.3', DATUM, '', PROTOKOLL_TEXT, '']);
    expect(out.zeile).toHaveLength(out.spalten.length);
    expect(out.text).toContain(`| 0.4.3 | ${DATUM} |  | ${PROTOKOLL_TEXT} |  |\n`);
  });

  it('a heading with the table only (no rows yet) gets the first row after the separator', () => {
    const src = tableOf('| Version | Datum | Änderung | IDs | Freigabe |', '|---|---|---|---|---|', []);
    const out = bereiteAbschlussVor(src, { datum: DATUM, bauPrs: [] });
    expect(out.text).toContain(`|---|---|---|---|---|\n| 0.4.3 | ${DATUM} | ${PROTOKOLL_TEXT} | — | Product Owner (Klick in der UI) |\n\n## Danach`);
  });

  it('missing heading, missing header or missing separator → protokoll_fehlt with the template hint', () => {
    const cases = [
      intent5().replace('## Änderungsprotokoll', '## Historie'),
      tableOf('Kein Kopf', '', []),
      tableOf('| Version | Datum | Änderung |', '| 0.4.2 | 2026-09-01 | x |', []),
      // heading, then the next heading before any table
      ['---', 'status: "angenommen"', 'version: "0.4.2"', 'geaendert: "2026-09-01"', '---', '## Änderungsprotokoll', '', '## Weiter', '| a |', '|---|', ''].join('\n'),
    ];
    for (const src of cases) {
      try {
        bereiteAbschlussVor(src, { datum: DATUM, bauPrs: [] });
        throw new Error('expected throw');
      } catch (e) {
        expect((e as AbschlussTextError).grund).toBe('protokoll_fehlt');
        expect((e as Error).message).toContain('Tabelle nach Vorlage ergänzen');
      }
    }
  });
});

describe('determinism (FA-09)', () => {
  it('same input twice → identical output; another date → only date and version cells differ', () => {
    const a = bereiteAbschlussVor(intent5(), { datum: DATUM, bauPrs: [85] });
    const b = bereiteAbschlussVor(intent5(), { datum: DATUM, bauPrs: [85] });
    expect(a.text).toBe(b.text);
    expect(a).toEqual(b);
    const c = bereiteAbschlussVor(intent5(), { datum: '2026-10-01', bauPrs: [85] });
    const la = a.text.split('\n');
    const lc = c.text.split('\n');
    const diff = la.map((l, i) => [l, lc[i]]).filter(([x, y]) => x !== y);
    expect(diff).toEqual([
      ['geaendert: "2026-09-22"  ', 'geaendert: "2026-10-01"  '],
      [`| 1.0.1 | 2026-09-22 | ${PROTOKOLL_TEXT}; Bau-PR #85 | — | Product Owner (Klick in der UI) |`, `| 1.0.1 | 2026-10-01 | ${PROTOKOLL_TEXT}; Bau-PR #85 | — | Product Owner (Klick in der UI) |`],
    ]);
  });
});

describe('bauPrNummern (FA-04, AN-S05)', () => {
  it('reads every #n of the RAW status line — behind the 80-char cut and the first ` · `', () => {
    expect(bauPrNummern('# Plan\n\n> **Status:** umgesetzt — PR 1 #73 (`da806cd`), PR 2 #74 (`250c6c5`), PR 3 #75 (`ad70b5c`), alle 2026-09-17 · **Erstellt:** x\n')).toEqual([73, 74, 75]);
    expect(bauPrNummern('> **Status:** umgesetzt, PR #85 offen — `verify: OK` lokal (zweiter Lauf), CI-Check `verify` grün')).toEqual([85]);
    expect(bauPrNummern('>  **Status:**   freigegeben · PR #7, nochmal #7 und #8')).toEqual([7, 8]);
  });
  it('no status line, no numbers, no text → []', () => {
    expect(bauPrNummern('# Plan\n\n> **Status:** freigegeben\n')).toEqual([]);
    expect(bauPrNummern('# Plan ohne Statuszeile\n')).toEqual([]);
    expect(bauPrNummern('')).toEqual([]);
    expect(bauPrNummern(undefined)).toEqual([]);
  });
  it('only the first status line counts; `§13` and `#hash` without digits are ignored', () => {
    expect(bauPrNummern('> **Status:** umgesetzt §13 #abc\n> **Status:** anders #99\n')).toEqual([]);
  });
});

describe('commitTitel, prBody, datumLokal', () => {
  it('commit title with 0, 1, 2 PRs (Conventional Commits)', () => {
    expect(commitTitel('INT-2026-001', [])).toBe('chore(INT-2026-001): intent.md auf umgesetzt');
    expect(commitTitel('INT-2026-001', [7])).toBe('chore(INT-2026-001): intent.md auf umgesetzt nach Merge von PR #7');
    expect(commitTitel('INT-2026-001', [7, 9])).toBe('chore(INT-2026-001): intent.md auf umgesetzt nach Merge von PR #7, #9');
  });
  it('PR body: fixed wording, three sentences, no host paths', () => {
    const body = prBody('INT-2026-001-test', '1.0.0', '1.0.1', [7]);
    expect(body).toContain('intent/INT-2026-001-test/intent.md');
    expect(body).toContain('1.0.0 → 1.0.1');
    expect(body).toContain('Bau-PR #7');
    expect(body).not.toMatch(/\/Users\/|\/home\/|\/mnt\//);
    expect(body.split(/\.\s/).length).toBeGreaterThanOrEqual(3);
    expect(prBody('INT-2026-001-test', '1.0.0', '1.0.1', [])).not.toContain('Bau-PR');
  });
  it('datumLokal: YYYY-MM-DD in the given time zone (AN-S15)', () => {
    const late = new Date('2026-09-22T23:30:00Z');
    expect(datumLokal(late, 'Europe/Berlin')).toBe('2026-09-23');
    expect(datumLokal(late, 'UTC')).toBe('2026-09-22');
    expect(datumLokal(new Date('2026-01-05T08:00:00Z'), 'Europe/Berlin')).toBe('2026-01-05');
  });
});
