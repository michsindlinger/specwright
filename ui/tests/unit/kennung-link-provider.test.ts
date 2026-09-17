// @vitest-environment happy-dom
/**
 * INT-2026-011 (FA-13, FA-15, FA-16): `findKennungRanges` marks only the
 * codes of the document, on word boundaries, several per line, none for an
 * empty set; `KennungLinkProvider` turns them into xterm links whose click
 * dispatches `kennung-open` on `document` and never writes into the
 * terminal (fake terminal without an `input` call), whose hover shows the
 * block as a tooltip, and whose mousedown stopper keeps the click from the
 * PTY while a Kennung is hovered.
 */
import { describe, it, expect, vi } from 'vitest';
import type { ILink, Terminal } from '@xterm/xterm';
import { findKennungRanges, KennungLinkProvider, KENNUNG_OPEN_EVENT } from '../../frontend/src/components/terminal/kennung-link-provider.js';
import type { KennungEintrag } from '../../frontend/src/services/kennungen.service.js';

const codes = (...c: string[]): ReadonlySet<string> => new Set(c);

describe('findKennungRanges', () => {
  it('finds only known codes, on word boundaries, several per line', () => {
    const line = 'AK-02 verlangt einen Schalter; FA-03 leitet ab (AK-02!). FA-030 und XFA-03 nicht.';
    const r = findKennungRanges(line, codes('AK-02', 'FA-03'));
    expect(r.map((x) => [x.text, x.start, x.end])).toEqual([['AK-02', 0, 5], ['FA-03', 31, 36], ['AK-02', 48, 53]]);
  });

  it('empty set or empty line → no ranges (FA-16); unknown codes stay plain text', () => {
    expect(findKennungRanges('siehe FA-01', new Set())).toEqual([]);
    expect(findKennungRanges('', codes('FA-01'))).toEqual([]);
    expect(findKennungRanges('siehe FA-02 und R1', codes('FA-01'))).toEqual([]);
  });

  it('longest code first: FA-1 does not eat FA-12; reference points and stage codes work; a hyphen glues', () => {
    expect(findKennungRanges('FA-12 FA-1 F1 AN-S03', codes('FA-1', 'FA-12', 'F1', 'AN-S03')).map((x) => x.text)).toEqual(['FA-12', 'FA-1', 'F1', 'AN-S03']);
    expect(findKennungRanges('INT-2026-011-FA-01', codes('FA-01'))).toEqual([]);
    expect(findKennungRanges('PDF1', codes('F1'))).toEqual([]);
  });
});

interface FakeTerminal {
  lines: string[];
  element: HTMLElement;
  buffer: { active: { getLine(y: number): { translateToString(trim: boolean): string } | undefined } };
  focus: ReturnType<typeof vi.fn>;
  input: ReturnType<typeof vi.fn>;
  write: ReturnType<typeof vi.fn>;
  paste: ReturnType<typeof vi.fn>;
}

function fakeTerminal(lines: string[]): FakeTerminal {
  const element = document.createElement('div');
  element.className = 'xterm';
  const screen = document.createElement('div');
  screen.className = 'xterm-screen';
  element.appendChild(screen);
  document.body.appendChild(element);
  return {
    lines,
    element,
    buffer: { active: { getLine: (y: number) => (y < lines.length ? { translateToString: () => lines[y] } : undefined) } },
    focus: vi.fn(),
    input: vi.fn(),
    write: vi.fn(),
    paste: vi.fn(),
  };
}

const entries = (): ReadonlyMap<string, KennungEintrag> => new Map([
  ['FA-03', { ref: 'FA-03 · §3', snippet: 'FA-03 Der Schalter MUSS auf allen Geräten denselben Stand haben.' }],
  ['AK-02', { ref: 'AK-02', snippet: 'AK-02 Schalter „Erledigte zeigen"' }],
]);

function linksOf(provider: KennungLinkProvider, y: number): ILink[] | undefined {
  let out: ILink[] | undefined;
  provider.provideLinks(y, (l) => (out = l));
  return out;
}

describe('KennungLinkProvider', () => {
  it('provides one link per known code with 1-based inclusive columns; nothing without codes or for an unknown line', () => {
    const t = fakeTerminal(['● AK-02 verlangt … FA-03 leitet', 'nichts hier']);
    const p = new KennungLinkProvider(t as unknown as Terminal, entries);
    const links = linksOf(p, 1)!;
    expect(links.map((l) => [l.text, l.range.start.x, l.range.end.x, l.range.start.y])).toEqual([['AK-02', 3, 7, 1], ['FA-03', 20, 24, 1]]);
    expect(links[0].decorations).toEqual({ underline: true, pointerCursor: true });
    expect(linksOf(p, 2)).toBeUndefined();
    expect(linksOf(p, 9)).toBeUndefined();
    const empty = new KennungLinkProvider(t as unknown as Terminal, () => new Map());
    expect(linksOf(empty, 1)).toBeUndefined();
    p.dispose();
    empty.dispose();
    t.element.remove();
  });

  it('activate dispatches kennung-open with the code and writes nothing into the terminal (FA-15)', () => {
    const t = fakeTerminal(['siehe FA-03']);
    const p = new KennungLinkProvider(t as unknown as Terminal, entries);
    const seen: string[] = [];
    const onOpen = (e: Event): void => {
      seen.push((e as CustomEvent<{ code: string }>).detail.code);
    };
    document.addEventListener(KENNUNG_OPEN_EVENT, onOpen);
    const link = linksOf(p, 1)![0];
    const ev = new MouseEvent('mouseup', { bubbles: true, cancelable: true });
    link.activate(ev, link.text);
    expect(seen).toEqual(['FA-03']);
    expect(ev.defaultPrevented).toBe(true);
    expect(t.input).not.toHaveBeenCalled();
    expect(t.write).not.toHaveBeenCalled();
    expect(t.paste).not.toHaveBeenCalled();
    document.removeEventListener(KENNUNG_OPEN_EVENT, onOpen);
    p.dispose();
    t.element.remove();
  });

  it('hover shows the block as .kennung-tip.xterm-hover inside the terminal element, leave removes it', () => {
    const t = fakeTerminal(['siehe FA-03']);
    const p = new KennungLinkProvider(t as unknown as Terminal, entries);
    const link = linksOf(p, 1)![0];
    link.hover!(new MouseEvent('mousemove', { clientX: 400, clientY: 300 }), link.text);
    const tip = t.element.querySelector('.kennung-tip.xterm-hover')!;
    expect(tip).not.toBeNull();
    expect(tip.getAttribute('role')).toBe('tooltip');
    expect(tip.querySelector('.kennung-tip-ref')?.textContent).toBe('FA-03 · §3');
    expect(tip.querySelector('.kennung-tip-text')?.textContent).toContain('Der Schalter MUSS');
    expect(tip.querySelector('.kennung-tip-hinweis')?.textContent).toBe('Klick springt hin');
    link.leave!(new MouseEvent('mousemove'), link.text);
    expect(t.element.querySelector('.kennung-tip')).toBeNull();
    p.dispose();
    t.element.remove();
  });

  it('mousedown on the screen is stopped while a Kennung is hovered (no PTY mouse report), otherwise it passes; dispose removes the stopper', () => {
    const t = fakeTerminal(['siehe FA-03']);
    const p = new KennungLinkProvider(t as unknown as Terminal, entries);
    const screen = t.element.querySelector('.xterm-screen')!;
    const reachedTerminal: string[] = [];
    t.element.addEventListener('mousedown', () => reachedTerminal.push('terminal'));
    const down = (): MouseEvent => {
      const ev = new MouseEvent('mousedown', { bubbles: true, cancelable: true, button: 0 });
      screen.dispatchEvent(ev);
      return ev;
    };
    // not hovering → xterm's own handler sees the click
    down();
    expect(reachedTerminal).toEqual(['terminal']);
    // hovering a Kennung → stopped, default prevented, focus kept on the terminal
    const link = linksOf(p, 1)![0];
    link.hover!(new MouseEvent('mousemove'), link.text);
    const ev = down();
    expect(reachedTerminal).toEqual(['terminal']);
    expect(ev.defaultPrevented).toBe(true);
    expect(t.focus).toHaveBeenCalledTimes(1);
    // right button is not ours
    screen.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, cancelable: true, button: 2 }));
    expect(reachedTerminal).toEqual(['terminal', 'terminal']);
    link.leave!(new MouseEvent('mousemove'), link.text);
    down();
    expect(reachedTerminal).toEqual(['terminal', 'terminal', 'terminal']);
    link.hover!(new MouseEvent('mousemove'), link.text);
    p.dispose();
    down();
    expect(reachedTerminal.length).toBe(4);
    t.element.remove();
  });
});
