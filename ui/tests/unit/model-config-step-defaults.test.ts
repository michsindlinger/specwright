/**
 * INT-2026-004 (FA-41): default model per v4 step. Separate file on purpose —
 * `model-config.test.ts` is red in the baseline (`ui/tests/known-failures.txt`).
 * fs is mocked so no config file on disk is touched; `saveModelConfig` writes
 * through the mocked `writeFileSync` and refreshes the in-memory cache.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'fs';
import type { ModelConfig } from '../../src/server/model-config.js';

vi.mock('fs', () => ({
  existsSync: vi.fn(),
  readFileSync: vi.fn(),
  writeFileSync: vi.fn(),
  mkdirSync: vi.fn(),
}));

const baseConfig: ModelConfig = {
  defaultProvider: 'anthropic',
  defaultModel: 'sonnet',
  providers: [
    { id: 'anthropic', name: 'Anthropic', cliCommand: 'claude', cliFlags: ['--model', '{modelId}'], models: [{ id: 'opus', name: 'Opus' }, { id: 'sonnet', name: 'Sonnet' }] },
    { id: 'glm', name: 'GLM', cliCommand: 'claude-glm', cliFlags: ['--model', '{modelId}'], models: [{ id: 'glm-5.2', name: 'GLM 5.2' }] },
  ],
};

async function fresh(config: ModelConfig): Promise<typeof import('../../src/server/model-config.js')> {
  vi.resetModules();
  vi.mocked(existsSync).mockReturnValue(true);
  vi.mocked(readFileSync).mockReturnValue(JSON.stringify(config));
  vi.mocked(mkdirSync).mockReturnValue(undefined);
  return import('../../src/server/model-config.js');
}

describe('model-config step defaults (FA-41)', () => {
  beforeEach(() => vi.clearAllMocks());

  it('falls back to anthropic/opus when no step default is set — not to the general default', async () => {
    const mc = await fresh(baseConfig);
    expect(mc.getStepDefault('plan')).toEqual({ providerId: 'anthropic', modelId: 'opus' });
    expect(mc.getStepDefaults()).toEqual({
      intent: { providerId: 'anthropic', modelId: 'opus' },
      spec: { providerId: 'anthropic', modelId: 'opus' },
      plan: { providerId: 'anthropic', modelId: 'opus' },
      build: { providerId: 'anthropic', modelId: 'opus' },
    });
  });

  it('falls back to the general default when anthropic/opus is not configured', async () => {
    const mc = await fresh({ ...baseConfig, providers: [baseConfig.providers[1]], defaultProvider: 'glm', defaultModel: 'glm-5.2' });
    expect(mc.getStepDefault('build')).toEqual({ providerId: 'glm', modelId: 'glm-5.2' });
  });

  it('setStepDefault stores per step, validates the model, and null clears', async () => {
    const mc = await fresh(baseConfig);
    const updated = mc.setStepDefault('build', { providerId: 'glm', modelId: 'glm-5.2' });
    expect(updated.stepDefaults).toEqual({ build: { providerId: 'glm', modelId: 'glm-5.2' } });
    expect(writeFileSync).toHaveBeenCalledTimes(1);
    const written = JSON.parse(vi.mocked(writeFileSync).mock.calls[0][1] as string) as ModelConfig;
    expect(written.stepDefaults?.build).toEqual({ providerId: 'glm', modelId: 'glm-5.2' });
    expect(mc.getStepDefault('build')).toEqual({ providerId: 'glm', modelId: 'glm-5.2' });
    expect(mc.getStepDefault('plan')).toEqual({ providerId: 'anthropic', modelId: 'opus' });

    expect(() => mc.setStepDefault('spec', { providerId: 'anthropic', modelId: 'nope' })).toThrow(/Model not found/);
    expect(() => mc.setStepDefault('nope' as never, { providerId: 'anthropic', modelId: 'opus' })).toThrow(/Unknown step/);

    const cleared = mc.setStepDefault('build', null);
    expect(cleared.stepDefaults).toEqual({});
    expect(mc.getStepDefault('build')).toEqual({ providerId: 'anthropic', modelId: 'opus' });
  });

  it('a stored step default whose model was removed from the config is ignored', async () => {
    const mc = await fresh({ ...baseConfig, stepDefaults: { plan: { providerId: 'glm', modelId: 'glm-4' } } });
    expect(mc.getStepDefault('plan')).toEqual({ providerId: 'anthropic', modelId: 'opus' });
  });
});
