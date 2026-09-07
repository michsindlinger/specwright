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
