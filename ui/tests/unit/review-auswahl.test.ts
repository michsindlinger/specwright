import { describe, it, expect } from 'vitest';
import { pruefKennung, waehlePruefer, type ProbeErgebnis } from '../../src/server/services/review-auswahl.js';

const r = (providerId: string, modelId: string) => ({ providerId, modelId });
const SONNET = r('anthropic', 'sonnet');
const OPUS = r('anthropic', 'opus');
const M3 = r('minimax', 'MiniMax-M3');
const GLM = r('glm', 'glm-5.2');
const FABLE = r('anthropic', 'fable');
const M25 = r('minimax', 'MiniMax-M2.5');
const HAIKU = r('anthropic', 'haiku');
const ERSATZ = [FABLE, M25, HAIKU];

function probe(aus: { providerId: string; modelId: string }[] = []): Map<string, ProbeErgebnis> {
  const m = new Map<string, ProbeErgebnis>();
  for (const x of [SONNET, OPUS, M3, GLM, ...ERSATZ]) {
    m.set(pruefKennung(x), aus.includes(x) ? { bereit: false, grund: 'ueberlastet', meldung: '529' } : { bereit: true });
  }
  return m;
}
const alle = () => true;

describe('INT-2026-037 (FA-13): waehlePruefer', () => {
  it('AK-07/AN-S06: GLM and MiniMax-M3 out → MiniMax-M2.5 steps in (provider missing beats the earlier Fable)', () => {
    const { laufen, zeilen } = waehlePruefer([SONNET, OPUS, M3, GLM], ERSATZ, probe([M3, GLM]), alle);
    expect(laufen).toEqual([SONNET, OPUS, M25]);
    expect(zeilen.at(-1)).toEqual({ reviewerId: 'minimax:MiniMax-M2.5', zustand: 'bereit', ersatzFuer: 'minimax:MiniMax-M3' });
  });

  it('one chosen → filled up to three', () => {
    const { laufen, zeilen } = waehlePruefer([GLM], ERSATZ, probe(), alle);
    expect(laufen).toEqual([GLM, FABLE, M25]);
    expect(zeilen.filter((z) => z.ersatzFuer === '')).toHaveLength(2);
  });

  it('none chosen → three stand-ins', () => {
    expect(waehlePruefer([], ERSATZ, probe(), alle).laufen).toEqual([FABLE, M25, HAIKU]);
  });

  it('a stand-in that is chosen already is never added twice', () => {
    expect(waehlePruefer([FABLE], [FABLE, HAIKU], probe(), alle).laufen).toEqual([FABLE, HAIKU]);
  });

  it('everything down → nothing runs', () => {
    expect(waehlePruefer([GLM], ERSATZ, probe([GLM, ...ERSATZ]), alle).laufen).toEqual([]);
  });

  it('FA-18: a chosen reviewer missing from the config is "fehlt" and replaced', () => {
    const { laufen, zeilen } = waehlePruefer([SONNET, r('deepseek', 'opus')], [FABLE], probe(), (x) => x.providerId !== 'deepseek');
    expect(zeilen[1]).toEqual({ reviewerId: 'deepseek:opus', zustand: 'fehlt' });
    expect(laufen).toEqual([SONNET, FABLE]);
    expect(zeilen[2].ersatzFuer).toBe('deepseek:opus');
  });
});
