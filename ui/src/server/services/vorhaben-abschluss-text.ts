/**
 * INT-2026-024 — the pure text function of the Vorhaben-Abschluss (FA-03,
 * FA-04, FA-05, FA-09). No I/O, no git: it takes the `intent.md` of the remote
 * base branch and returns the finished text plus what the dialog shows.
 *
 * Works line by line WITH the line terminator (`\n` or `\r\n`), so a file with
 * mixed endings stays byte-identical outside the four changed places (three
 * head fields, one appended protocol row). The head is rewritten by replacing
 * only the VALUE of `status:`, `version:`, `geaendert:` — quotes, blanks and
 * the terminator stay as found (`parseIntentHead` reads, it must not write).
 * The protocol row is filled by column NAME, never by position: the inventory
 * of 2026-09-22 found four table shapes across five projects, one with
 * „Datum" before „Version".
 */

export type AbschlussTextGrund = 'kopf_fehlt' | 'status_fehlt' | 'schon_umgesetzt' | 'version_unlesbar' | 'geaendert_fehlt' | 'protokoll_fehlt';

/** Cause and next step (FA-18); the runner prefixes „Nicht abgeschlossen: ". */
export class AbschlussTextError extends Error {
  constructor(
    public readonly grund: AbschlussTextGrund,
    message: string
  ) {
    super(message);
    this.name = 'AbschlussTextError';
  }
}

export interface AbschlussText {
  /** The finished intent.md. */
  text: string;
  statusAlt: string;
  versionAlt: string;
  versionNeu: string;
  /** Cells of the appended protocol row, in header order. */
  zeile: string[];
  /** Header cells of the table as found (trimmed). */
  spalten: string[];
}

/** FA-04 (OF-05): the fixed protocol text; „; Bau-PR #n" is appended when known. */
export const PROTOKOLL_TEXT = 'Umgesetzt: abgeschlossen aus der UI durch Michael Sindlinger; Belege in `plan.md` §13';
const AUTOR_ZELLE = 'Michael Sindlinger (UI)';
const FREIGABE_ZELLE = 'Product Owner (Klick in der UI)';
const IDS_ZELLE = '—';

const SEMVER_RE = /^(\d+)\.(\d+)\.(\d+)$/;
const PROTOKOLL_HEADING_RE = /^#{2,3}\s+Änderungsprotokoll\s*$/;
const ANY_HEADING_RE = /^#{1,3}\s/;
const TABLE_SEPARATOR_RE = /^\|\s*:?-+/;

interface Zeile {
  inhalt: string;
  ende: string;
}

/** Splits into lines that keep their terminator; the last line may have none. */
function zeilen(text: string): Zeile[] {
  return text.split(/(?<=\n)/).map((raw) => {
    if (raw.endsWith('\r\n')) return { inhalt: raw.slice(0, -2), ende: '\r\n' };
    if (raw.endsWith('\n')) return { inhalt: raw.slice(0, -1), ende: '\n' };
    return { inhalt: raw, ende: '' };
  });
}

/** `^(key:\s*)(quote?)(value)(quote)(trailing blanks)$` — replaces only the value; null when the line is not that key. */
function ersetzeWert(inhalt: string, key: string, neu: (alt: string) => string): { inhalt: string; alt: string } | null {
  const m = new RegExp(`^(${key}:[ \\t]*)(["']?)(.*?)(\\2)([ \\t]*)$`).exec(inhalt);
  if (!m) return null;
  const alt = m[3];
  return { inhalt: `${m[1]}${m[2]}${neu(alt)}${m[4]}${m[5]}`, alt };
}

function protokollText(bauPrs: number[]): string {
  const prs = [...new Set(bauPrs)];
  if (prs.length === 0) return PROTOKOLL_TEXT;
  return `${PROTOKOLL_TEXT}; Bau-PR ${prs.map((n) => `#${n}`).join(', ')}`;
}

/** Cell for a header name (trimmed, lower-cased); unknown → ''. */
function zelleFuer(spalte: string, v: { versionNeu: string; datum: string; text: string }): string {
  switch (spalte.trim().toLowerCase()) {
    case 'version':
      return v.versionNeu;
    case 'datum':
      return v.datum;
    case 'änderung':
      return v.text;
    case 'autor':
      return AUTOR_ZELLE;
    case 'ids':
      return IDS_ZELLE;
    case 'freigabe':
      return FREIGABE_ZELLE;
    default:
      return '';
  }
}

/** Header cells of `| a | b |` (leading and trailing pipe dropped). */
function tabellenZellen(inhalt: string): string[] {
  let s = inhalt.trim();
  if (s.startsWith('|')) s = s.slice(1);
  if (s.endsWith('|')) s = s.slice(0, -1);
  return s.split('|').map((c) => c.trim());
}

/**
 * Rewrites the head (status → umgesetzt, PATCH + 1, geaendert = datum) and
 * appends one protocol row. Throws `AbschlussTextError` before anything is
 * built when a field is missing or unreadable — the caller shows the message.
 */
export function bereiteAbschlussVor(intentText: string, opts: { datum: string; bauPrs: number[] }): AbschlussText {
  const lines = zeilen(intentText);

  // ---- head: first `---` within the first 5 lines, up to the next `---` ----
  let start = -1;
  for (let i = 0; i < Math.min(lines.length, 5); i++) {
    if (lines[i].inhalt.trim() === '---') {
      start = i;
      break;
    }
  }
  if (start < 0) throw new AbschlussTextError('kopf_fehlt', 'Kopf der Absicht (Frontmatter) fehlt — Datei von Hand prüfen');
  let end = -1;
  for (let i = start + 1; i < lines.length; i++) {
    if (lines[i].inhalt.trim() === '---') {
      end = i;
      break;
    }
  }
  if (end < 0) throw new AbschlussTextError('kopf_fehlt', 'Kopf der Absicht (Frontmatter) ist nicht geschlossen — Datei von Hand prüfen');

  let statusAlt: string | undefined;
  let versionAlt: string | undefined;
  let versionNeu: string | undefined;
  let geaendertGefunden = false;
  for (let i = start + 1; i < end; i++) {
    const line = lines[i];
    if (/^\s/.test(line.inhalt)) continue; // nested (bezuege: …)
    if (statusAlt === undefined) {
      const r = ersetzeWert(line.inhalt, 'status', () => 'umgesetzt');
      if (r) {
        statusAlt = r.alt;
        if (r.alt.trim().toLowerCase() === 'umgesetzt') {
          throw new AbschlussTextError('schon_umgesetzt', 'auf dem Hauptzweig ist die Absicht schon umgesetzt — den Hauptcheckout aktualisieren');
        }
        line.inhalt = r.inhalt;
        continue;
      }
    }
    if (versionAlt === undefined) {
      const r = ersetzeWert(line.inhalt, 'version', (alt) => {
        const m = SEMVER_RE.exec(alt);
        if (!m) return alt;
        return `${m[1]}.${m[2]}.${parseInt(m[3], 10) + 1}`;
      });
      if (r) {
        if (!SEMVER_RE.test(r.alt)) {
          throw new AbschlussTextError('version_unlesbar', `Version der Absicht nicht lesbar: „${r.alt}" — von Hand auf JJ.MM.PP setzen`);
        }
        versionAlt = r.alt;
        versionNeu = SEMVER_RE.exec(r.alt)!.slice(1).map((n, idx) => (idx === 2 ? String(parseInt(n, 10) + 1) : n)).join('.');
        line.inhalt = r.inhalt;
        continue;
      }
    }
    if (!geaendertGefunden) {
      const r = ersetzeWert(line.inhalt, 'geaendert', () => opts.datum);
      if (r) {
        geaendertGefunden = true;
        line.inhalt = r.inhalt;
      }
    }
  }
  if (statusAlt === undefined) throw new AbschlussTextError('status_fehlt', 'Kopffeld `status` fehlt — von Hand ergänzen');
  if (versionAlt === undefined || versionNeu === undefined) {
    throw new AbschlussTextError('version_unlesbar', 'Version der Absicht nicht lesbar: „" — von Hand auf JJ.MM.PP setzen');
  }
  if (!geaendertGefunden) throw new AbschlussTextError('geaendert_fehlt', 'Kopffeld `geaendert` fehlt — von Hand ergänzen');

  // ---- protocol table: heading, first `|` line = header, next line = separator, last consecutive `|` line = end ----
  const protokollFehlt = (): AbschlussTextError => new AbschlussTextError('protokoll_fehlt', 'Änderungsprotokoll fehlt — Tabelle nach Vorlage ergänzen');
  let heading = -1;
  for (let i = end + 1; i < lines.length; i++) {
    if (PROTOKOLL_HEADING_RE.test(lines[i].inhalt)) {
      heading = i;
      break;
    }
  }
  if (heading < 0) throw protokollFehlt();
  let header = -1;
  for (let i = heading + 1; i < lines.length; i++) {
    const inhalt = lines[i].inhalt;
    if (ANY_HEADING_RE.test(inhalt)) break;
    if (inhalt.startsWith('|')) {
      header = i;
      break;
    }
  }
  if (header < 0 || header + 1 >= lines.length || !TABLE_SEPARATOR_RE.test(lines[header + 1].inhalt)) throw protokollFehlt();
  let last = header + 1;
  while (last + 1 < lines.length && lines[last + 1].inhalt.startsWith('|')) last++;

  const spalten = tabellenZellen(lines[header].inhalt);
  const zeile = spalten.map((s) => zelleFuer(s, { versionNeu, datum: opts.datum, text: protokollText(opts.bauPrs) }));

  // The new row takes the terminator of the last table row. A file that ends
  // without a newline first gets one on that row (the only change outside the
  // four places) — the terminator of the line before, else `\n`.
  let ende = lines[last].ende;
  if (!ende) {
    ende = (last > 0 && lines[last - 1].ende) || '\n';
    lines[last].ende = ende;
  }
  lines.splice(last + 1, 0, { inhalt: `| ${zeile.join(' | ')} |`, ende });

  return {
    text: lines.map((l) => l.inhalt + l.ende).join(''),
    statusAlt,
    versionAlt,
    versionNeu,
    zeile,
    spalten,
  };
}

/**
 * Build-PR numbers from the RAW `> **Status:**` line of plan.md (FA-04,
 * AN-S05) — `parseStatusLine` cuts the note at 80 chars and the first ` · `,
 * which hides „PR 2 #74" of INT-2026-016. Order of appearance, no duplicates;
 * `[]` without a line or text.
 */
export function bauPrNummern(planText: string | undefined): number[] {
  if (!planText) return [];
  const lines = planText.split(/\r?\n/, 60);
  for (const line of lines) {
    if (!/^>\s*\*\*Status:\*\*/.test(line)) continue;
    const out: number[] = [];
    for (const m of line.matchAll(/#(\d+)\b/g)) {
      const n = parseInt(m[1], 10);
      if (!out.includes(n)) out.push(n);
    }
    return out;
  }
  return [];
}

/** AN-S03: Conventional Commits, plus the build PR(s) when known. */
export function commitTitel(intentId: string, bauPrs: number[]): string {
  const prs = [...new Set(bauPrs)];
  const base = `chore(${intentId}): intent.md auf umgesetzt`;
  return prs.length ? `${base} nach Merge von PR ${prs.map((n) => `#${n}`).join(', ')}` : base;
}

/** Fixed wording, no host paths (the PR is public). */
export function prBody(dirName: string, versionAlt: string, versionNeu: string, bauPrs: number[]): string {
  const prs = [...new Set(bauPrs)];
  const bau = prs.length ? ` Bau-PR ${prs.map((n) => `#${n}`).join(', ')}.` : '';
  return (
    `Abschluss des Vorhabens \`${dirName}\`: \`intent/${dirName}/intent.md\` trägt \`status: umgesetzt\`, Version ${versionAlt} → ${versionNeu}, das Änderungsdatum von heute und eine Zeile im Änderungsprotokoll.${bau} ` +
    'Erzeugt aus der Web-UI (INT-2026-024) ohne Sprachmodell; `spec.md`, `plan.md` und `design/` bleiben unverändert.'
  );
}

/** `YYYY-MM-DD` by the backend's clock in `timeZone` (AN-S15). */
export function datumLokal(now: Date, timeZone: string): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone, year: 'numeric', month: '2-digit', day: '2-digit' }).format(now);
}
