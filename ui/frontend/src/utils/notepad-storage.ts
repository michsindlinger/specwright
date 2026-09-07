/**
 * Persistence helpers for the floating notepad panel (text + window geometry).
 *
 * Storage is injected (StorageLike) so the helpers run in node tests with a plain mock and never
 * touch `localStorage` at import time. Every read/write is wrapped: localStorage can be
 * unavailable (private mode, blocked site data) or throw QuotaExceededError on write.
 */

export const NOTEPAD_STORAGE_KEY = 'specwright-notepad';
export const NOTEPAD_UI_STORAGE_KEY = 'specwright-notepad-ui';

export interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

// ---- text -------------------------------------------------------------------------------

export function loadNotepadText(storage: StorageLike): string {
  try {
    return storage.getItem(NOTEPAD_STORAGE_KEY) ?? '';
  } catch {
    return '';
  }
}

/** Returns false when the write failed (quota / unavailable) so the caller can warn the user. */
export function saveNotepadText(text: string, storage: StorageLike): boolean {
  try {
    if (text === '') storage.removeItem(NOTEPAD_STORAGE_KEY);
    else storage.setItem(NOTEPAD_STORAGE_KEY, text);
    return true;
  } catch {
    return false;
  }
}

export interface DebouncedSaver {
  /** Remember `text` and (re)start the delay; only the last value is written. */
  schedule(text: string): void;
  /** Write the pending value now (no-op when nothing is pending). */
  flush(): void;
  /** Drop the pending value without writing. */
  cancel(): void;
}

export function createDebouncedSaver(save: (text: string) => void, delayMs = 300): DebouncedSaver {
  let pending: string | null = null;
  let timer: ReturnType<typeof setTimeout> | null = null;
  const clear = () => {
    if (timer !== null) {
      clearTimeout(timer);
      timer = null;
    }
  };
  const flush = () => {
    clear();
    if (pending === null) return;
    const value = pending;
    pending = null;
    save(value);
  };
  return {
    schedule(text) {
      pending = text;
      clear();
      timer = setTimeout(flush, delayMs);
    },
    flush,
    cancel() {
      clear();
      pending = null;
    },
  };
}

// ---- geometry ---------------------------------------------------------------------------

export interface NotepadGeom {
  x: number;
  y: number;
  w: number;
  h: number;
}

export const NOTEPAD_MIN_W = 320;
export const NOTEPAD_MIN_H = 200;
export const NOTEPAD_DEFAULT_W = 480;
export const NOTEPAD_DEFAULT_H = 360;
/** Portion of the header that must stay on-screen so the panel can always be grabbed. */
export const NOTEPAD_GRAB_PX = 48;
const DEFAULT_MARGIN = 24;

function isFiniteNumber(v: unknown): v is number {
  return typeof v === 'number' && Number.isFinite(v);
}

export function loadNotepadGeom(storage: StorageLike): NotepadGeom | null {
  try {
    const raw = storage.getItem(NOTEPAD_UI_STORAGE_KEY);
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') return null;
    const g = parsed as Record<string, unknown>;
    if (!isFiniteNumber(g.x) || !isFiniteNumber(g.y) || !isFiniteNumber(g.w) || !isFiniteNumber(g.h)) {
      return null;
    }
    return { x: g.x, y: g.y, w: g.w, h: g.h };
  } catch {
    return null;
  }
}

export function saveNotepadGeom(geom: NotepadGeom, storage: StorageLike): void {
  try {
    storage.setItem(NOTEPAD_UI_STORAGE_KEY, JSON.stringify(geom));
  } catch {
    // Geometry is a convenience; losing it is acceptable.
  }
}

/**
 * Clamp a (possibly stale) geometry to the current viewport: size within [min, viewport],
 * position such that at least {@link NOTEPAD_GRAB_PX} of the header stays visible on every
 * edge. `null` yields the default placement: bottom-right corner with a margin.
 */
export function clampNotepadGeom(
  geom: NotepadGeom | null,
  viewportW: number,
  viewportH: number
): NotepadGeom {
  const vw = Math.max(0, viewportW);
  const vh = Math.max(0, viewportH);
  const w = Math.min(Math.max(geom?.w ?? NOTEPAD_DEFAULT_W, NOTEPAD_MIN_W), Math.max(vw, NOTEPAD_MIN_W));
  const h = Math.min(Math.max(geom?.h ?? NOTEPAD_DEFAULT_H, NOTEPAD_MIN_H), Math.max(vh, NOTEPAD_MIN_H));
  const defaultX = Math.max(0, vw - w - DEFAULT_MARGIN);
  const defaultY = Math.max(0, vh - h - DEFAULT_MARGIN);
  const rawX = geom?.x ?? defaultX;
  const rawY = geom?.y ?? defaultY;
  // Keep a grab-able strip of the header inside the viewport on all four sides.
  const maxX = Math.max(0, vw - NOTEPAD_GRAB_PX);
  const minX = Math.min(0, NOTEPAD_GRAB_PX - w);
  const maxY = Math.max(0, vh - NOTEPAD_GRAB_PX);
  const x = Math.min(Math.max(rawX, minX), maxX);
  const y = Math.min(Math.max(rawY, 0), maxY);
  return { x, y, w, h };
}
