/**
 * INT-2026-037 (FA-14, FA-18): default reviewers and the stand-in row. Separate
 * file — `model-config.test.ts` is red in the baseline. fs is mocked per path,
 * so neither config file on disk is touched.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { existsSync, readFileSync } from 'fs';

vi.mock('fs', () => ({ existsSync: vi.fn(), readFileSync: vi.fn(), writeFileSync: vi.fn(), mkdirSync: vi.fn() }));

const MODELS = {
  defaultProvider: 'anthropic',
  defaultModel: 'sonnet',
  providers: [
    { id: 'anthropic', name: 'Anthropic', cliCommand: 'claude', cliFlags: [], models: ['opus', 'sonnet', 'fable', 'haiku'].map((id) => ({ id, name: id })) },
    { id: 'glm', name: 'GLM', cliCommand: 'claude-glm', cliFlags: [], models: [{ id: 'glm-5.3', name: 'GLM 5.3' }] },
    { id: 'minimax', name: 'MiniMax', cliCommand: 'claude-minimax', cliFlags: [], models: ['MiniMax-M3', 'MiniMax-M2.5'].map((id) => ({ id, name: id })) },
    { id: 'deepseek', name: 'DeepSeek', cliCommand: 'claude-deepseek', cliFlags: [], models: [{ id: 'opus', name: 'DeepSeek' }] },
  ],
};

async function fresh(general: unknown) {
  vi.resetModules();
  vi.mocked(existsSync).mockReturnValue(true);
  vi.mocked(readFileSync).mockImplementation(((p: string) => JSON.stringify(String(p).includes('general-config') ? general : MODELS)) as never);
  return import('../../src/server/model-config.js');
}

describe('INT-2026-037: reviewers', () => {
  beforeEach(() => vi.clearAllMocks());

  it('FA-18/AK-09: defaults are exactly sonnet, opus, MiniMax-M3, glm-5.3 — no DeepSeek', async () => {
    const mc = await fresh({ defaults: {}, projects: {} });
    expect(mc.getDefaultReviewers()).toEqual([
      { providerId: 'anthropic', modelId: 'sonnet' },
      { providerId: 'anthropic', modelId: 'opus' },
      { providerId: 'minimax', modelId: 'MiniMax-M3' },
      { providerId: 'glm', modelId: 'glm-5.3' },
    ]);
  });

  it('FA-14: the stand-in row defaults to fable, MiniMax-M2.5, haiku; unknown models are dropped', async () => {
    expect((await fresh({ defaults: {}, projects: {} })).getReviewErsatz()).toEqual([
      { providerId: 'anthropic', modelId: 'fable' },
      { providerId: 'minimax', modelId: 'MiniMax-M2.5' },
      { providerId: 'anthropic', modelId: 'haiku' },
    ]);
    expect((await fresh({ defaults: { reviewErsatz: ['glm/glm-9', 'glm/glm-5.3'] }, projects: {} })).getReviewErsatz()).toEqual([
      { providerId: 'glm', modelId: 'glm-5.3' },
    ]);
  });
});

describe('INT-2026-037 (FA-14): settings validation', () => {
  beforeEach(() => vi.clearAllMocks());

  it('rejects a malformed stand-in, more than 10 entries, an empty intent prompt and a non-boolean switch', async () => {
    await fresh({ defaults: {}, projects: {} });
    const gc = await import('../../src/server/general-config.js');
    expect(() => gc.updateGeneralConfig({ reviewErsatz: ['ohne-schraegstrich'] })).toThrow(/provider\/model/);
    expect(() => gc.updateGeneralConfig({ reviewErsatz: Array.from({ length: 11 }, () => 'glm/glm-5.2') })).toThrow(/at most 10/);
    expect(() => gc.updateGeneralConfig({ intentReviewPrompt: '  ' })).toThrow(/cannot be empty/);
    expect(() => gc.updateGeneralConfig({ intentAutoReview: 'ja' as unknown as boolean })).toThrow(/boolean/);
    expect(gc.loadGeneralConfig().intentAutoReview).toBe(true);
    expect(gc.loadGeneralConfig().intentReviewPrompt).toBe(gc.DEFAULT_INTENT_REVIEW_PROMPT);
  });
});
