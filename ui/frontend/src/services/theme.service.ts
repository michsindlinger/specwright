export type ThemeMode = 'light' | 'dark' | 'black' | 'system';
export type ResolvedTheme = 'light' | 'dark' | 'black';
type ThemeChangeCallback = (theme: ResolvedTheme) => void;

const STORAGE_KEY = 'specwright-theme';
const VALID_MODES: ThemeMode[] = ['light', 'dark', 'black', 'system'];

class ThemeService {
  private mode: ThemeMode = 'dark';
  private listeners: Set<ThemeChangeCallback> = new Set();
  private mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');

  constructor() {
    // Read from localStorage (FOUC script already set data-theme)
    try {
      const stored = localStorage.getItem(STORAGE_KEY) as ThemeMode | null;
      if (stored && VALID_MODES.includes(stored)) {
        this.mode = stored;
      }
    } catch {
      // localStorage not available
    }

    // Listen for OS theme changes
    this.mediaQuery.addEventListener('change', () => {
      if (this.mode === 'system') {
        this.applyTheme();
      }
    });

    // Ensure data-theme is set on startup
    this.applyTheme();
  }

  getMode(): ThemeMode {
    return this.mode;
  }

  getResolvedTheme(): ResolvedTheme {
    if (this.mode === 'system') {
      return this.mediaQuery.matches ? 'dark' : 'light';
    }
    return this.mode;
  }

  setMode(mode: ThemeMode): void {
    this.mode = mode;
    try {
      localStorage.setItem(STORAGE_KEY, mode);
    } catch {
      // localStorage not available
    }
    this.applyTheme();
  }

  onChange(callback: ThemeChangeCallback): void {
    this.listeners.add(callback);
  }

  offChange(callback: ThemeChangeCallback): void {
    this.listeners.delete(callback);
  }

  private applyTheme(): void {
    const resolved = this.getResolvedTheme();
    document.documentElement.setAttribute('data-theme', resolved);
    for (const cb of this.listeners) {
      cb(resolved);
    }
  }
}

export const themeService = new ThemeService();
