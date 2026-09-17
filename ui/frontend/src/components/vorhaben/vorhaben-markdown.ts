/**
 * Markdown pipeline of the document reader (FA-17): its own `Marked`
 * instance (marked 17) so the reader's settings never collide with the two
 * global `marked.use` calls (chat: breaks:true, docs viewer: breaks:false).
 * MacDown-near: gfm on, breaks off. Code blocks and Mermaid containers come
 * from the shared code renderer of markdown-renderer.ts.
 */

import { Marked, type Token, type Tokens } from 'marked';
import { codeRenderer, escapeHtml } from '../../utils/markdown-renderer.js';

const reader = new Marked({ gfm: true, breaks: false });
reader.use({ renderer: codeRenderer });

export interface SplitDocument {
  /** Frontmatter key/value pairs (top-level only), empty when none. */
  frontmatter: Array<[string, string]>;
  body: string;
}

/** Splits leading `---` frontmatter from the body; nested keys are shown as `parent.key`. */
export function splitFrontmatter(text: string): SplitDocument {
  const lines = text.split(/\r?\n/);
  if (lines[0]?.trim() !== '---') return { frontmatter: [], body: text };
  const end = lines.findIndex((l, i) => i > 0 && l.trim() === '---');
  if (end < 0) return { frontmatter: [], body: text };
  const frontmatter: Array<[string, string]> = [];
  let parent = '';
  for (const raw of lines.slice(1, end)) {
    const m = /^(\s*)([A-Za-z_][A-Za-z0-9_-]*):\s*(.*?)\s*$/.exec(raw);
    if (!m) continue;
    const nested = m[1].length > 0;
    let value = m[3];
    if (value.length >= 2 && ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'")))) value = value.slice(1, -1);
    if (!nested) {
      parent = m[2];
      if (value === '') continue; // parent of nested keys
      frontmatter.push([m[2], value]);
    } else {
      frontmatter.push([`${parent}.${m[2]}`, value]);
    }
  }
  return { frontmatter, body: lines.slice(end + 1).join('\n') };
}

/** Frontmatter as a two-column table (FA-17 "Kopffelder als Tabelle"). */
export function renderFrontmatterTable(pairs: Array<[string, string]>): string {
  if (pairs.length === 0) return '';
  const rows = pairs.map(([k, v]) => `<tr><th scope="row">${escapeHtml(k)}</th><td>${escapeHtml(v)}</td></tr>`).join('');
  return `<table class="kopffelder"><tbody>${rows}</tbody></table>`;
}

/** Heading ids as GitHub does (lowercase, dashes) — used to keep the reading position (FA-19). */
export function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/<[^>]+>/g, '')
    .replace(/[^\p{L}\p{N}\s-]/gu, '')
    .trim()
    .replace(/\s+/g, '-');
}

export interface RenderedDocument {
  html: string;
  /** True when every `##`/`###` heading carries a reader marker — then agent sections are collapsed (FA-13). */
  gekennzeichnet: boolean;
}

/**
 * Reader markers of INT-2026-009 (`<!-- leser: mensch -->` / `<!-- leser: agent -->`,
 * first non-empty line under a `##`–`####` heading). Three outcomes (FA-13, FA-14,
 * AN-S03): `vollstaendig` = every `##` and `###` heading carries one (`####` may
 * inherit); `keine` = no heading carries one; `teilweise` = anything else and is
 * treated like `keine` by the reader (all open, no switch).
 */
export type Kennzeichnung = 'keine' | 'vollstaendig' | 'teilweise';
export type Leser = 'mensch' | 'agent';

const LESER_MARKER_RE = /^<!--\s*leser:\s*(mensch|agent)\s*-->$/;
/** Heading depths that carry a marker in the templates. */
const MARKED_DEPTHS = new Set([2, 3, 4]);

interface MarkerHit {
  /** Index of the heading token. */
  heading: number;
  /** Index of the marker token (dropped from the output), -1 when none. */
  marker: number;
  depth: number;
  leser: Leser | null;
}

/** Reads the marker under each `##`–`####` heading. Markers inside code fences are `code` tokens and never match. */
export function leserMarkerAnalyse(tokens: Token[]): { kennzeichnung: Kennzeichnung; hits: MarkerHit[] } {
  const hits: MarkerHit[] = [];
  tokens.forEach((tok, i) => {
    if (tok.type !== 'heading' || !MARKED_DEPTHS.has((tok as Tokens.Heading).depth)) return;
    let j = i + 1;
    while (j < tokens.length && tokens[j].type === 'space') j++;
    const next = tokens[j];
    const m = next && next.type === 'html' ? LESER_MARKER_RE.exec((next as Tokens.HTML).raw.trim()) : null;
    hits.push({ heading: i, marker: m ? j : -1, depth: (tok as Tokens.Heading).depth, leser: m ? (m[1] as Leser) : null });
  });
  const pflicht = hits.filter((h) => h.depth <= 3);
  const marked = hits.filter((h) => h.leser !== null).length;
  let kennzeichnung: Kennzeichnung;
  if (marked === 0) kennzeichnung = 'keine';
  else if (pflicht.every((h) => h.leser !== null)) kennzeichnung = 'vollstaendig';
  else kennzeichnung = 'teilweise';
  return { kennzeichnung, hits };
}

/** Marker outcome of a body markdown (tests, tooling). */
export function kennzeichnungVon(markdown: string): Kennzeichnung {
  return leserMarkerAnalyse(reader.lexer(markdown)).kennzeichnung;
}

/**
 * Renders a fully marked document as nested sections: an `agent` section (heading
 * plus everything up to the next heading of the same or a higher level) becomes
 * `<details class="technik"><summary>[heading]</summary>[body]</details>`; `mensch`
 * sections stay open. `####` without a marker inherits by staying inside its
 * parent's body; deeper headings belong to the enclosing section body.
 */
function renderSectioned(tokens: Token[], hits: MarkerHit[]): string {
  const byHeading = new Map<number, MarkerHit>(hits.map((h) => [h.heading, h]));
  const dropped = new Set(hits.filter((h) => h.marker >= 0).map((h) => h.marker));
  // Open sections as a stack: each collects rendered HTML; closing wraps it.
  // A heading with its own `agent` marker wraps; one without a marker (`####`)
  // inherits its visibility by simply staying inside the parent's body.
  interface Open { depth: number; wrap: boolean; heading: string; parts: string[] }
  const stack: Open[] = [];
  const out: string[] = [];
  const emit = (html: string): void => {
    (stack.length ? stack[stack.length - 1].parts : out).push(html);
  };
  const close = (): void => {
    const sec = stack.pop();
    if (!sec) return;
    const body = sec.parts.join('');
    emit(sec.wrap ? `<details class="technik"><summary>${sec.heading.trim()}</summary>${body}</details>` : sec.heading + body);
  };
  tokens.forEach((tok, i) => {
    if (dropped.has(i)) return;
    const hit = byHeading.get(i);
    if (!hit) {
      emit(reader.parser([tok]));
      return;
    }
    while (stack.length && stack[stack.length - 1].depth >= hit.depth) close();
    stack.push({ depth: hit.depth, wrap: hit.leser === 'agent', heading: reader.parser([tok]), parts: [] });
  });
  while (stack.length) close();
  return out.join('');
}

/** Body markdown → HTML. Errors fall back to escaped text. */
export function renderDocumentBody(markdown: string): RenderedDocument {
  try {
    const tokens = reader.lexer(markdown);
    const { kennzeichnung, hits } = leserMarkerAnalyse(tokens);
    const gekennzeichnet = kennzeichnung === 'vollstaendig';
    const html = gekennzeichnet ? renderSectioned(tokens, hits) : reader.parser(tokens);
    return { html: addHeadingIds(html), gekennzeichnet };
  } catch (err) {
    console.error('[vorhaben-markdown] parse failed:', err);
    return { html: `<pre>${escapeHtml(markdown)}</pre>`, gekennzeichnet: false };
  }
}

/** Adds `id` to h1–h6 (marked 17 emits none by default). Duplicates get `-2`, `-3`, … */
export function addHeadingIds(html: string): string {
  const seen = new Map<string, number>();
  return html.replace(/<h([1-6])>([\s\S]*?)<\/h\1>/g, (_m, level: string, inner: string) => {
    const base = slugify(inner.replace(/<[^>]+>/g, '')) || 'abschnitt';
    const n = (seen.get(base) ?? 0) + 1;
    seen.set(base, n);
    const id = n === 1 ? base : `${base}-${n}`;
    return `<h${level} id="${id}">${inner}</h${level}>`;
  });
}

/** Full document: frontmatter table + body. */
export function renderDocument(text: string): RenderedDocument {
  const { frontmatter, body } = splitFrontmatter(text);
  const { html, gekennzeichnet } = renderDocumentBody(body);
  return { html: renderFrontmatterTable(frontmatter) + html, gekennzeichnet };
}
