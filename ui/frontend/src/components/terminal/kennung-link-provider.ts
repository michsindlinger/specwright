/**
 * kennung-link-provider — Kennungen in the terminal are links to the document
 * (INT-2026-011, FA-13/FA-15/FA-16). An xterm `ILinkProvider` that marks
 * exactly the codes the document reader reported (`kennungenService`) —
 * nothing else, so a code the document does not carry is plain text. Hover
 * shows the block (reference · snippet), a click dispatches `kennung-open`
 * on `document`; the Vorhaben view jumps and opens the section. Nothing is
 * ever written into the session (FA-15): tmux runs with `mouse on`, which
 * puts xterm into mouse tracking and would report the click to the PTY —
 * a `mousedown` stopper on `.xterm-screen` (after xterm's Linkifier, before
 * the terminal's own handler) swallows it while a Kennung is hovered
 * (spike Schritt 0 (c), plan §14).
 */

import type { IBufferLine, IDisposable, ILink, ILinkProvider, Terminal } from '@xterm/xterm';
import type { KennungEintrag } from '../../services/kennungen.service.js';

export interface KennungRange {
  /** 0-based column of the first character. */
  start: number;
  /** 0-based column after the last character. */
  end: number;
  text: string;
}

/** Event a click on a Kennung link raises on `document`. */
export const KENNUNG_OPEN_EVENT = 'kennung-open';

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Columns of every known code in one terminal line. Word boundaries on both
 * sides, longest code first so `FA-1` never eats the head of `FA-12`. An
 * empty set of codes yields no ranges (FA-16).
 */
export function findKennungRanges(line: string, codes: ReadonlySet<string>): KennungRange[] {
  if (codes.size === 0 || !line) return [];
  const alternatives = [...codes].sort((a, b) => b.length - a.length).map(escapeRegExp);
  const re = new RegExp(`(?<![\\w-])(?:${alternatives.join('|')})(?![\\w-])`, 'g');
  const out: KennungRange[] = [];
  for (const m of line.matchAll(re)) {
    if (m.index === undefined) continue;
    out.push({ start: m.index, end: m.index + m[0].length, text: m[0] });
  }
  return out;
}

export class KennungLinkProvider implements ILinkProvider, IDisposable {
  private tip: HTMLElement | null = null;
  /** The link under the pointer, if any — the mousedown stopper keys on it. */
  private hovered: ILink | null = null;
  private readonly screen: HTMLElement | null;

  constructor(
    private readonly terminal: Terminal,
    private readonly kennungen: () => ReadonlyMap<string, KennungEintrag>,
  ) {
    this.screen = terminal.element?.querySelector<HTMLElement>('.xterm-screen') ?? null;
    this.screen?.addEventListener('mousedown', this.onMouseDown);
  }

  /**
   * xterm reports mouse buttons to the PTY when the app (tmux) asked for it.
   * A click on a Kennung is ours: stop it before the terminal's handler sees
   * it, keep the focus where xterm would have put it. Registered after the
   * Linkifier's listener on the same element, so the link still activates on
   * mouseup.
   */
  private readonly onMouseDown = (e: MouseEvent): void => {
    if (!this.hovered || e.button !== 0) return;
    e.stopPropagation();
    e.preventDefault();
    this.terminal.focus();
  };

  provideLinks(y: number, callback: (links: ILink[] | undefined) => void): void {
    const codes = this.kennungen();
    if (codes.size === 0) return callback(undefined);
    const line: IBufferLine | undefined = this.terminal.buffer.active.getLine(y - 1);
    if (!line) return callback(undefined);
    const text = line.translateToString(true);
    const ranges = findKennungRanges(text, new Set(codes.keys()));
    if (ranges.length === 0) return callback(undefined);
    callback(ranges.map((r) => this.link(r, y)));
  }

  private link(r: KennungRange, y: number): ILink {
    const link: ILink = {
      range: { start: { x: r.start + 1, y }, end: { x: r.end, y } },
      text: r.text,
      decorations: { underline: true, pointerCursor: true },
      activate: (event: MouseEvent, text: string) => {
        event.preventDefault();
        document.dispatchEvent(new CustomEvent<{ code: string }>(KENNUNG_OPEN_EVENT, { detail: { code: text } }));
      },
      hover: (event: MouseEvent, text: string) => {
        this.hovered = link;
        this.showTip(event, text);
      },
      leave: () => {
        this.hovered = null;
        this.hideTip();
      },
    };
    return link;
  }

  private showTip(event: MouseEvent, code: string): void {
    const entry = this.kennungen().get(code);
    const host = this.terminal.element;
    if (!entry || !host) return;
    this.hideTip();
    const tip = document.createElement('div');
    tip.className = 'kennung-tip xterm-hover';
    tip.setAttribute('role', 'tooltip');
    const head = document.createElement('div');
    head.className = 'kennung-tip-kopf';
    const ref = document.createElement('span');
    ref.className = 'kennung-tip-ref';
    ref.textContent = entry.ref;
    const hint = document.createElement('span');
    hint.className = 'kennung-tip-hinweis';
    hint.textContent = 'Klick springt hin';
    head.append(ref, hint);
    const body = document.createElement('div');
    body.className = 'kennung-tip-text';
    body.textContent = entry.snippet;
    tip.append(head, body);
    host.appendChild(tip);
    // Fixed to the viewport, clamped so it never leaves the window (mock 11a: below-left of the pointer).
    const w = tip.offsetWidth || 360;
    const h = tip.offsetHeight || 80;
    const left = Math.max(8, Math.min(event.clientX - w + 24, window.innerWidth - w - 8));
    const top = event.clientY + 16 + h > window.innerHeight ? Math.max(8, event.clientY - h - 12) : event.clientY + 16;
    tip.style.left = `${left}px`;
    tip.style.top = `${top}px`;
    this.tip = tip;
  }

  private hideTip(): void {
    this.tip?.remove();
    this.tip = null;
  }

  dispose(): void {
    this.hideTip();
    this.hovered = null;
    this.screen?.removeEventListener('mousedown', this.onMouseDown);
  }
}
