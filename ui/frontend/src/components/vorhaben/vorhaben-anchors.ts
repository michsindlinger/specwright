/**
 * Anchors of a rendered document (FA-23/FA-24): every heading, paragraph,
 * list item, table row and code block is a block Michael can annotate. The
 * reference of a block is derived, never typed (FA-24), in this order:
 *
 *   1. an id in the block's text — `AK-03`, `FA-07`, `V-02`, …
 *   2. the section number of the nearest preceding numbered heading — `§6`
 *   3. the heading text (when the block is a heading)
 *   4. the first six words of the block
 *
 * The parts are joined the way the mocks show them (`V-02 · §5`,
 * `§3 „Entwurf"`, `§4 · Absatz „Ein Kandidat, der sich …"`), so the session
 * sees both the id and where it sits. Pure DOM in, plain objects out.
 */

import type { Anmerkung } from '../../../../src/shared/types/vorhaben.protocol.js';

export interface BlockAnchor {
  /** Position in document order; the Anmerkung stores it. */
  ordinal: number;
  /** Derived reference text, e.g. `V-02 · §5`. */
  ref: string;
  /** Normalized block text (≤ 200 chars) for relocation after the document changed. */
  snippet: string;
  element: HTMLElement;
}

export const DOKUMENT_GESAMT = 'Dokument gesamt';

/** Ids of the Specwright documents (spec FA-24 list plus the plan's tables). */
export const KENNUNG_RE = /\b(?:AK|FA|RB|B|NZ|Z|EK|ER|AN|OF|D|T|AR|AP|V)-S?\d+\b/;

const NUMBERED_HEADING_RE = /^\s*(\d+(?:\.\d+)*)\.?\s+/;
const BLOCK_SELECTOR = 'h1, h2, h3, h4, h5, h6, p, li, tr, pre';
const SNIPPET_MAX = 200;
const WORDS = 6;

export function normalizeText(text: string): string {
  return text.replace(/\s+/g, ' ').trim();
}

function firstWords(text: string, n = WORDS): string {
  const words = text.split(' ').filter(Boolean);
  const head = words.slice(0, n).join(' ');
  return words.length > n ? `${head} …` : head;
}

/** True for a `p` that only wraps a list item's text (loose lists) or sits in a cell. */
function isWrappedParagraph(el: HTMLElement): boolean {
  const parent = el.parentElement;
  if (!parent) return false;
  return parent.tagName === 'LI' || parent.tagName === 'TD' || parent.tagName === 'TH';
}

function kindLabel(el: HTMLElement): string {
  switch (el.tagName) {
    case 'LI':
      return 'Punkt';
    case 'TR':
      return 'Zeile';
    case 'PRE':
      return 'Code';
    default:
      return 'Absatz';
  }
}

/**
 * Walks the rendered document and returns one anchor per block. `root` is the
 * `.markdown-body` element (or any container of the rendered HTML).
 */
export function deriveAnchors(root: ParentNode): BlockAnchor[] {
  const out: BlockAnchor[] = [];
  let section: string | null = null;
  let ordinal = 0;
  for (const el of root.querySelectorAll<HTMLElement>(BLOCK_SELECTOR)) {
    if (el.tagName === 'P' && isWrappedParagraph(el)) continue;
    if (el.closest('.kopffelder')) continue; // frontmatter table is not a review target
    if (el.tagName === 'PRE' && el.closest('.mermaid-container')) continue;
    const text = normalizeText(el.textContent ?? '');
    const isHeading = /^H[1-6]$/.test(el.tagName);
    if (isHeading) {
      const m = NUMBERED_HEADING_RE.exec(text);
      section = m ? m[1] : section;
    }
    if (!text && el.tagName !== 'PRE') continue;
    const id = KENNUNG_RE.exec(text)?.[0];
    const sec = section ? `§${section}` : '';
    let ref: string;
    if (id) {
      ref = sec && !isHeading ? `${id} · ${sec}` : id;
    } else if (isHeading) {
      const m = NUMBERED_HEADING_RE.exec(text);
      const title = m ? text.slice(m[0].length) : text;
      ref = m ? `§${m[1]} „${firstWords(title)}"` : `„${firstWords(title)}"`;
    } else {
      const label = el.tagName === 'PRE' ? 'Code' : `${kindLabel(el)} „${firstWords(text)}"`;
      ref = sec ? `${sec} · ${label}` : label;
    }
    out.push({ ordinal: ordinal++, ref, snippet: text.slice(0, SNIPPET_MAX), element: el });
  }
  return out;
}

/**
 * Finds the block an Anmerkung belongs to after the document may have
 * changed: by snippet first (text is the stable part), then by ordinal.
 * `null` = "Stelle nicht mehr gefunden" (spec §4).
 */
export function locateAnmerkung(anchors: BlockAnchor[], a: Pick<Anmerkung, 'ordinal' | 'snippet'>): BlockAnchor | null {
  if (a.ordinal < 0) return null;
  if (a.snippet) {
    const exact = anchors.find((x) => x.snippet === a.snippet);
    if (exact) return exact;
    const prefix = a.snippet.slice(0, 40);
    if (prefix.length >= 12) {
      const near = anchors.find((x) => x.snippet.startsWith(prefix));
      if (near) return near;
    }
    return null;
  }
  return anchors[a.ordinal] ?? null;
}
