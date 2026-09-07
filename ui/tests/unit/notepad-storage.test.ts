import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  NOTEPAD_STORAGE_KEY,
  NOTEPAD_UI_STORAGE_KEY,
  NOTEPAD_MIN_W,
  NOTEPAD_MIN_H,
  NOTEPAD_DEFAULT_W,
  NOTEPAD_DEFAULT_H,
  NOTEPAD_GRAB_PX,
  loadNotepadText,
  saveNotepadText,
  createDebouncedSaver,
  loadNotepadGeom,
  saveNotepadGeom,
  clampNotepadGeom,
  type StorageLike,
} from '../../frontend/src/utils/notepad-storage.js';

function memoryStorage(): StorageLike & { data: Record<string, string> } {
  const data: Record<string, string> = {};
  return {
    data,
    getItem: (k) => data[k] ?? null,
    setItem: (k, v) => {
      data[k] = v;
    },
    removeItem: (k) => {
      delete data[k];
    },
  };
}

const throwingStorage: StorageLike = {
  getItem: () => {
    throw new Error('unavailable');
  },
  setItem: () => {
    throw new Error('QuotaExceededError');
  },
  removeItem: () => {
    throw new Error('unavailable');
  },
};

describe('notepad text persistence', () => {
  it('loads empty string when nothing stored or storage throws', () => {
    expect(loadNotepadText(memoryStorage())).toBe('');
    expect(loadNotepadText(throwingStorage)).toBe('');
  });

  it('round-trips text', () => {
    const s = memoryStorage();
    expect(saveNotepadText('hello\nworld', s)).toBe(true);
    expect(s.data[NOTEPAD_STORAGE_KEY]).toBe('hello\nworld');
    expect(loadNotepadText(s)).toBe('hello\nworld');
  });

  it('removes the key when saving an empty string', () => {
    const s = memoryStorage();
    saveNotepadText('x', s);
    expect(saveNotepadText('', s)).toBe(true);
    expect(NOTEPAD_STORAGE_KEY in s.data).toBe(false);
  });

  it('reports failure when the write throws (quota)', () => {
    expect(saveNotepadText('x', throwingStorage)).toBe(false);
    expect(saveNotepadText('', throwingStorage)).toBe(false);
  });
});

describe('createDebouncedSaver', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('coalesces rapid schedules into one save of the last value', () => {
    const save = vi.fn();
    const saver = createDebouncedSaver(save, 300);
    saver.schedule('a');
    vi.advanceTimersByTime(100);
    saver.schedule('ab');
    vi.advanceTimersByTime(100);
    saver.schedule('abc');
    expect(save).not.toHaveBeenCalled();
    vi.advanceTimersByTime(300);
    expect(save).toHaveBeenCalledTimes(1);
    expect(save).toHaveBeenCalledWith('abc');
  });

  it('flush writes the pending value immediately and is idempotent', () => {
    const save = vi.fn();
    const saver = createDebouncedSaver(save, 300);
    saver.schedule('pending');
    saver.flush();
    expect(save).toHaveBeenCalledWith('pending');
    saver.flush();
    vi.advanceTimersByTime(1000);
    expect(save).toHaveBeenCalledTimes(1);
  });

  it('cancel drops the pending value', () => {
    const save = vi.fn();
    const saver = createDebouncedSaver(save, 300);
    saver.schedule('dropped');
    saver.cancel();
    vi.advanceTimersByTime(1000);
    saver.flush();
    expect(save).not.toHaveBeenCalled();
  });
});

describe('notepad geometry persistence', () => {
  it('round-trips geometry', () => {
    const s = memoryStorage();
    saveNotepadGeom({ x: 10, y: 20, w: 400, h: 300 }, s);
    expect(JSON.parse(s.data[NOTEPAD_UI_STORAGE_KEY])).toEqual({ x: 10, y: 20, w: 400, h: 300 });
    expect(loadNotepadGeom(s)).toEqual({ x: 10, y: 20, w: 400, h: 300 });
  });

  it('returns null for missing, malformed or partial data and for throwing storage', () => {
    const s = memoryStorage();
    expect(loadNotepadGeom(s)).toBeNull();
    s.data[NOTEPAD_UI_STORAGE_KEY] = '{not json';
    expect(loadNotepadGeom(s)).toBeNull();
    s.data[NOTEPAD_UI_STORAGE_KEY] = JSON.stringify({ x: 1, y: 2, w: 'wide' });
    expect(loadNotepadGeom(s)).toBeNull();
    s.data[NOTEPAD_UI_STORAGE_KEY] = JSON.stringify({ x: 1, y: 2, w: 300, h: Infinity });
    expect(loadNotepadGeom(s)).toBeNull();
    expect(loadNotepadGeom(throwingStorage)).toBeNull();
  });

  it('saveNotepadGeom swallows storage errors', () => {
    expect(() => saveNotepadGeom({ x: 0, y: 0, w: 320, h: 200 }, throwingStorage)).not.toThrow();
  });
});

describe('clampNotepadGeom', () => {
  it('places the default panel bottom-right with a margin', () => {
    const g = clampNotepadGeom(null, 1440, 900);
    expect(g.w).toBe(NOTEPAD_DEFAULT_W);
    expect(g.h).toBe(NOTEPAD_DEFAULT_H);
    expect(g.x).toBe(1440 - NOTEPAD_DEFAULT_W - 24);
    expect(g.y).toBe(900 - NOTEPAD_DEFAULT_H - 24);
  });

  it('keeps an in-viewport geometry unchanged', () => {
    const g = { x: 100, y: 80, w: 500, h: 400 };
    expect(clampNotepadGeom(g, 1440, 900)).toEqual(g);
  });

  it('enforces min size and shrinks to the viewport', () => {
    expect(clampNotepadGeom({ x: 0, y: 0, w: 10, h: 10 }, 1440, 900)).toMatchObject({
      w: NOTEPAD_MIN_W,
      h: NOTEPAD_MIN_H,
    });
    expect(clampNotepadGeom({ x: 0, y: 0, w: 5000, h: 5000 }, 800, 600)).toMatchObject({ w: 800, h: 600 });
  });

  it('pulls an off-screen panel back so a grab strip stays visible', () => {
    // Far right / bottom (e.g. saved on a larger monitor).
    const g = clampNotepadGeom({ x: 3000, y: 2000, w: 480, h: 360 }, 1440, 900);
    expect(g.x).toBe(1440 - NOTEPAD_GRAB_PX);
    expect(g.y).toBe(900 - NOTEPAD_GRAB_PX);
    // Negative coordinates: left may hang off by (w - grab), top never above 0.
    const n = clampNotepadGeom({ x: -1000, y: -50, w: 480, h: 360 }, 1440, 900);
    expect(n.x).toBe(NOTEPAD_GRAB_PX - 480);
    expect(n.y).toBe(0);
  });

  it('never produces negative positions on a tiny viewport', () => {
    const g = clampNotepadGeom(null, 200, 100);
    expect(g.x).toBeGreaterThanOrEqual(0);
    expect(g.y).toBeGreaterThanOrEqual(0);
    expect(g.w).toBe(NOTEPAD_MIN_W);
    expect(g.h).toBe(NOTEPAD_MIN_H);
  });
});
