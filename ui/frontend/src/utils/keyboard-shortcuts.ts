/**
 * Keyboard shortcut predicates shared across components.
 *
 * Kept as pure functions so the sidebar (document keydown), the xterm custom key handler
 * (which must block the same combos from reaching the PTY) and the notepad panel all agree
 * on one definition — and so they are unit-testable in the node vitest environment.
 */

/** Structural subset of KeyboardEvent so tests can pass plain objects. */
export interface KeyComboLike {
  key: string;
  code?: string;
  metaKey: boolean;
  ctrlKey: boolean;
  shiftKey: boolean;
  altKey: boolean;
}

function primaryMod(e: KeyComboLike): boolean {
  return (e.metaKey || e.ctrlKey) && e.shiftKey && !e.altKey;
}

/** Cmd/Ctrl+Shift+Enter — zoom the focused cloud-terminal pane (iTerm2 "Maximize Active Pane"). */
export function isPaneZoomShortcut(e: KeyComboLike): boolean {
  return primaryMod(e) && e.key === 'Enter';
}

/**
 * Cmd/Ctrl+Shift+E — toggle the floating notepad. Matches `code` too so non-Latin layouts
 * (where `key` is the layout character) still work.
 */
export function isNotepadShortcut(e: KeyComboLike): boolean {
  return primaryMod(e) && (e.key.toLowerCase() === 'e' || e.code === 'KeyE');
}

/** True for INPUT / TEXTAREA / SELECT / contenteditable targets (duck-typed, no DOM dependency). */
export function isEditableTarget(el: unknown): boolean {
  if (!el || typeof el !== 'object') return false;
  const node = el as { tagName?: unknown; isContentEditable?: unknown };
  const tag = typeof node.tagName === 'string' ? node.tagName.toUpperCase() : '';
  if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return true;
  return node.isContentEditable === true;
}

/**
 * Cmd+← — back to the Vorhaben overview from the Vorhaben page and „Neue Absicht" (INT-2026-015,
 * AK-05). Cmd only (RB-02): Ctrl+← is the word jump in the terminal (NZ-03); Shift/Alt variants and
 * every other page stay with the browser (AK-09).
 */
export function isBackToOverviewShortcut(e: KeyComboLike): boolean {
  return e.metaKey && !e.ctrlKey && !e.altKey && !e.shiftKey && e.key === 'ArrowLeft';
}

/**
 * Marker `aos-terminal` puts on xterm's input textarea (`terminal.textarea`, public API) right
 * after `open()`, so a document-level shortcut can tell the terminal from other text fields
 * without knowing any xterm class name or DOM position (INT-2026-015, reviews E1/G2).
 */
export const TERMINAL_INPUT_ATTR = 'data-terminal-input';

/**
 * A key stays with the element the person types in: the event path starts in a form control or
 * contenteditable (AK-06) — unless that field is the terminal's input (`TERMINAL_INPUT_ATTR`),
 * where the terminal ignores Cmd+Arrow (AK-07/AK-08). Takes the whole `e.composedPath()`: a
 * listener on `document` sees only the shadow host of the Anmerkung/Absicht fields as `e.target`,
 * never the field. Empty path (event already dispatched, or a synthetic event on `document`) →
 * not typing.
 */
export function isTypingTarget(path: ReadonlyArray<unknown>): boolean {
  const target = path[0];
  if (!isEditableTarget(target)) return false;
  const el = target as { hasAttribute?(name: string): boolean };
  return el.hasAttribute?.(TERMINAL_INPUT_ATTR) !== true;
}
