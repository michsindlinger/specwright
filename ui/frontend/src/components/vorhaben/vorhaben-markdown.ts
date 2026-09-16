/**
 * Markdown pipeline of the document reader (FA-17): its own `Marked`
 * instance (marked 17) so the reader's settings never collide with the two
 * global `marked.use` calls (chat: breaks:true, docs viewer: breaks:false).
 * MacDown-near: gfm on, breaks off. Code blocks and Mermaid containers come
 * from the shared code renderer of markdown-renderer.ts.
 */

import { Marked } from 'marked';
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

/** Body markdown → HTML. Errors fall back to escaped text. */
export function renderDocumentBody(markdown: string): string {
  try {
    const html = reader.parse(markdown, { async: false }) as string;
    return addHeadingIds(html);
  } catch (err) {
    console.error('[vorhaben-markdown] parse failed:', err);
    return `<pre>${escapeHtml(markdown)}</pre>`;
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
export function renderDocument(text: string): string {
  const { frontmatter, body } = splitFrontmatter(text);
  return renderFrontmatterTable(frontmatter) + renderDocumentBody(body);
}

/**
 * Gesprächsbeiträge (INT-2026-007, FA-05): Claude's text rendered like the
 * documents in the reader — own instance so heading ids and the reader's
 * settings stay untouched; errors fall back to escaped text.
 */
const beitrag = new Marked({ gfm: true, breaks: false });
beitrag.use({ renderer: codeRenderer });

export function renderBeitrag(markdown: string): string {
  try {
    return beitrag.parse(markdown, { async: false }) as string;
  } catch (err) {
    console.error('[vorhaben-markdown] beitrag parse failed:', err);
    return `<pre>${escapeHtml(markdown)}</pre>`;
  }
}
