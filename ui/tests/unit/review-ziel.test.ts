import { describe, it, expect } from 'vitest';
import { reviewZielArt } from '../../src/shared/review-ziel.js';

describe('INT-2026-037 (FA-10): reviewZielArt', () => {
  it.each([
    ['no Vorhaben', undefined, 'plan'],
    ['intent only', { docs: [{ key: 'intent' as const }] }, 'intent'],
    ['intent + spec, step spec', { step: 'spec' as const, docs: [{ key: 'intent' as const }, { key: 'spec' as const }] }, 'intent'],
    ['plan document', { docs: [{ key: 'intent' as const }, { key: 'plan' as const }] }, 'plan'],
    ['step plan without plan document', { step: 'plan' as const, docs: [{ key: 'intent' as const }] }, 'plan'],
    ['step build', { step: 'build' as const, docs: [{ key: 'intent' as const }] }, 'plan'],
    ['no documents', { docs: [] }, 'plan'],
    ['session in step plan', { step: 'intent' as const, session: { step: 'plan' as const }, docs: [{ key: 'intent' as const }] }, 'plan'],
  ])('%s → %s', (_name, row, art) => {
    expect(reviewZielArt(row)).toBe(art);
  });
});
