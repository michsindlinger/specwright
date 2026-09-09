import { describe, it, expect } from 'vitest';
import { parseSoundPreference } from '../../frontend/src/components/terminal/notification-sound.js';

describe('parseSoundPreference()', () => {
  it('defaults to enabled when nothing was ever stored', () => {
    expect(parseSoundPreference(null)).toBe(true);
  });

  it('is disabled only for the explicit off value', () => {
    expect(parseSoundPreference('off')).toBe(false);
    expect(parseSoundPreference('on')).toBe(true);
  });

  it('treats a corrupt value as enabled rather than silently muting', () => {
    expect(parseSoundPreference('')).toBe(true);
    expect(parseSoundPreference('true')).toBe(true);
    expect(parseSoundPreference('OFF')).toBe(true);
  });
});
