/**
 * INT-2026-012 (AK-04, AK-07, D1, E3, E11, E14): provider session kind in
 * model-config — reviewer list, `model.list` shape with `cliKind`, step-default
 * guards, one-time warning per foreign provider. Separate file on purpose —
 * `model-config.test.ts` is red in the baseline (`ui/tests/known-failures.txt`).
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

const gpt = [
  { id: 'gpt-5.6-terra', name: 'GPT-5.6 Terra' },
  { id: 'gpt-5.6-luna', name: 'GPT-5.6 Luna' },
  { id: 'gpt-5.5', name: 'GPT-5.5' },
];

const baseConfig: ModelConfig = {
  defaultProvider: 'anthropic',
  defaultModel: 'sonnet',
  providers: [
    { id: 'anthropic', name: 'Anthropic', cliCommand: 'claude', cliFlags: ['--model', '{modelId}'], models: [{ id: 'opus', name: 'Opus', description: 'big' }, { id: 'sonnet', name: 'Sonnet' }] },
    { id: 'codex', name: 'OpenAI', cliCommand: 'claude-codex', cliFlags: ['--model', '{modelId}'], models: gpt },
    { id: 'codex-cli', name: 'Codex (nativ)', cliCommand: 'codex', cliFlags: ['--dangerously-bypass-approvals-and-sandbox', '--model', '{modelId}'], models: gpt },
  ],
};

async function fresh(config: ModelConfig): Promise<typeof import('../../src/server/model-config.js')> {
  vi.resetModules();
  vi.mocked(existsSync).mockReturnValue(true);
  vi.mocked(readFileSync).mockReturnValue(JSON.stringify(config));
  vi.mocked(mkdirSync).mockReturnValue(undefined);
  vi.mocked(writeFileSync).mockReset();
  return import('../../src/server/model-config.js');
}

describe('model-config provider kind (INT-2026-012)', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('AK-04/AK-07: getReviewerProviders lists Claude CLIs only — codex with its 3 models, never codex-cli', async () => {
    const mc = await fresh(baseConfig);
    const reviewers = mc.getReviewerProviders();
    expect(reviewers.map((p) => p.id)).toEqual(['anthropic', 'codex']);
    expect(reviewers[1].models.map((m) => m.id)).toEqual(['gpt-5.6-terra', 'gpt-5.6-luna', 'gpt-5.5']);
    expect(mc.getAllProviders().map((p) => p.id)).toEqual(['anthropic', 'codex', 'codex-cli']);
  });

  it('E14/D1: providersForModelList carries cliKind per provider and providerId per model, same shape as before', async () => {
    const mc = await fresh(baseConfig);
    const rows = mc.providersForModelList();
    expect(rows.map((r) => [r.id, r.cliKind])).toEqual([
      ['anthropic', 'claude'],
      ['codex', 'claude'],
      ['codex-cli', 'foreign'],
    ]);
    expect(rows[0]).toEqual({
      id: 'anthropic',
      name: 'Anthropic',
      cliKind: 'claude',
      models: [
        { id: 'opus', name: 'Opus', description: 'big', providerId: 'anthropic' },
        { id: 'sonnet', name: 'Sonnet', description: undefined, providerId: 'anthropic' },
      ],
    });
    expect(rows[2].models.every((m) => m.providerId === 'codex-cli')).toBe(true);
  });

  it('D1: isClaudeSessionModel — true for codex, false for codex-cli, unknown provider or model', async () => {
    const mc = await fresh(baseConfig);
    expect(mc.isClaudeSessionModel('codex', 'gpt-5.6-terra')).toBe(true);
    expect(mc.isClaudeSessionModel('anthropic', 'opus')).toBe(true);
    expect(mc.isClaudeSessionModel('codex-cli', 'gpt-5.6-terra')).toBe(false);
    expect(mc.isClaudeSessionModel('codex', 'nope')).toBe(false);
    expect(mc.isClaudeSessionModel('nope', 'gpt-5.6-terra')).toBe(false);
  });

  it('D1: setStepDefault refuses a foreign provider with a naming error; a Claude provider is accepted', async () => {
    const mc = await fresh(baseConfig);
    expect(() => mc.setStepDefault('plan', { providerId: 'codex-cli', modelId: 'gpt-5.6-terra' })).toThrow('Provider startet keine Claude-Sitzung: codex-cli');
    expect(() => mc.setStepDefault('plan', { providerId: 'codex-cli', modelId: 'nope' })).toThrow('Model not found: codex-cli/nope');
    expect(writeFileSync).not.toHaveBeenCalled();
    mc.setStepDefault('plan', { providerId: 'codex', modelId: 'gpt-5.6-terra' });
    expect(mc.getStepDefault('plan')).toEqual({ providerId: 'codex', modelId: 'gpt-5.6-terra' });
  });

  it('E11: a hand-edited step default on a foreign provider loads without throwing and falls back to anthropic/opus', async () => {
    const mc = await fresh({ ...baseConfig, stepDefaults: { plan: { providerId: 'codex-cli', modelId: 'gpt-5.6-terra' } } });
    expect(mc.getStepDefault('plan')).toEqual({ providerId: 'anthropic', modelId: 'opus' });
    expect(mc.getStepDefaults().plan).toEqual({ providerId: 'anthropic', modelId: 'opus' });
  });

  it('E3: loadModelConfig warns exactly once per foreign provider, not for claude-* wrappers', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    vi.spyOn(console, 'log').mockImplementation(() => {});
    const mc = await fresh(baseConfig);
    mc.loadModelConfig();
    mc.loadModelConfig();
    mc.getAllProviders();
    const foreign = warn.mock.calls.filter((c) => String(c[0]).includes('runs a foreign CLI'));
    expect(foreign).toHaveLength(1);
    expect(String(foreign[0][0])).toContain('provider codex-cli runs a foreign CLI (codex)');
  });
});
