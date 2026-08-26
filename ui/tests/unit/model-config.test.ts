/**
 * Unit tests for ModelConfig service
 *
 * Tests configuration loading and provider command generation including:
 * - Loading config from file
 * - Fallback to hardcoded defaults
 * - Provider command building with model ID substitution
 * - Provider and model retrieval
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { existsSync, readFileSync } from 'fs';
import type { ModelConfig } from '../../src/server/model-config.js';

// Mock fs module
vi.mock('fs', () => ({
  existsSync: vi.fn(),
  readFileSync: vi.fn(),
}));

describe('ModelConfig', () => {
  beforeEach(() => {
    // Reset all mocks before each test
    vi.clearAllMocks();
    // Reset the cached config by reimporting - we simulate this by reloading
    vi.resetModules();
  });

  describe('loadModelConfig()', () => {
    it('should load config from file when it exists', async () => {
      const mockConfig: ModelConfig = {
        defaultProvider: 'test-provider',
        defaultModel: 'test-model',
        providers: [
          {
            id: 'test-provider',
            name: 'Test Provider',
            cliCommand: 'test-cli',
            cliFlags: ['--model', '{modelId}'],
            models: [{ id: 'test-model', name: 'Test Model' }],
          },
        ],
      };

      vi.mocked(existsSync).mockReturnValue(true);
      vi.mocked(readFileSync).mockReturnValue(JSON.stringify(mockConfig));

      // Need to reimport to get fresh instance
      const { loadModelConfig: freshLoad } = await import(
        '../../src/server/model-config.js'
      );
      const config = freshLoad();

      expect(config.defaultProvider).toBe('test-provider');
      expect(config.providers[0].cliCommand).toBe('test-cli');
    });

    it('should return cached config on subsequent calls', async () => {
      const mockConfig: ModelConfig = {
        defaultProvider: 'cached-provider',
        defaultModel: 'cached-model',
        providers: [],
      };

      vi.mocked(existsSync).mockReturnValue(true);
      vi.mocked(readFileSync).mockReturnValue(JSON.stringify(mockConfig));

      const { loadModelConfig: freshLoad } = await import(
        '../../src/server/model-config.js'
      );

      // First call
      freshLoad();
      // Second call - should use cache
      const config = freshLoad();

      // readFileSync should only be called once due to caching
      expect(vi.mocked(readFileSync)).toHaveBeenCalledTimes(1);
      expect(config.defaultProvider).toBe('cached-provider');
    });

    it('should use defaults when config file does not exist', async () => {
      vi.mocked(existsSync).mockReturnValue(false);

      const { loadModelConfig: freshLoad } = await import(
        '../../src/server/model-config.js'
      );
      const config = freshLoad();

      // Check default providers exist
      expect(config.defaultProvider).toBe('anthropic');
      expect(config.providers.length).toBeGreaterThan(0);
      expect(config.providers.some((p) => p.id === 'anthropic')).toBe(true);
      expect(config.providers.some((p) => p.id === 'glm')).toBe(true);
    });

    it('should use defaults when config file has invalid JSON', async () => {
      vi.mocked(existsSync).mockReturnValue(true);
      vi.mocked(readFileSync).mockReturnValue('not valid json');

      const { loadModelConfig: freshLoad } = await import(
        '../../src/server/model-config.js'
      );
      const config = freshLoad();

      // Should fall back to defaults
      expect(config.defaultProvider).toBe('anthropic');
    });
  });

  describe('getProvider()', () => {
    it('should return provider by ID', async () => {
      vi.mocked(existsSync).mockReturnValue(false); // Use defaults

      const { getProvider: freshGetProvider } = await import(
        '../../src/server/model-config.js'
      );
      const provider = freshGetProvider('anthropic');

      expect(provider).toBeDefined();
      expect(provider?.id).toBe('anthropic');
      expect(provider?.name).toBe('Anthropic');
      expect(provider?.cliCommand).toBe('claude-anthropic-simple');
    });

    it('should return undefined for unknown provider', async () => {
      vi.mocked(existsSync).mockReturnValue(false);

      const { getProvider: freshGetProvider } = await import(
        '../../src/server/model-config.js'
      );
      const provider = freshGetProvider('unknown-provider');

      expect(provider).toBeUndefined();
    });
  });

  describe('getModel()', () => {
    it('should return model by provider and model ID', async () => {
      vi.mocked(existsSync).mockReturnValue(false);

      const { getModel: freshGetModel } = await import(
        '../../src/server/model-config.js'
      );
      const model = freshGetModel('anthropic', 'opus');

      expect(model).toBeDefined();
      expect(model?.id).toBe('opus');
      expect(model?.name).toBe('Opus 4.5');
    });

    it('should return undefined for unknown model', async () => {
      vi.mocked(existsSync).mockReturnValue(false);

      const { getModel: freshGetModel } = await import(
        '../../src/server/model-config.js'
      );
      const model = freshGetModel('anthropic', 'unknown-model');

      expect(model).toBeUndefined();
    });

    it('should return undefined for unknown provider', async () => {
      vi.mocked(existsSync).mockReturnValue(false);

      const { getModel: freshGetModel } = await import(
        '../../src/server/model-config.js'
      );
      const model = freshGetModel('unknown-provider', 'opus');

      expect(model).toBeUndefined();
    });
  });

  describe('getProviderCommand()', () => {
    it('should return command with model ID substituted', async () => {
      vi.mocked(existsSync).mockReturnValue(false);

      const { getProviderCommand: freshGetCommand } = await import(
        '../../src/server/model-config.js'
      );
      const result = freshGetCommand('anthropic', 'opus');

      expect(result).toBeDefined();
      expect(result?.command).toBe('claude-anthropic-simple');
      expect(result?.args).toContain('--model');
      expect(result?.args).toContain('opus');
    });

    it('should handle GLM provider correctly', async () => {
      vi.mocked(existsSync).mockReturnValue(false);

      const { getProviderCommand: freshGetCommand } = await import(
        '../../src/server/model-config.js'
      );
      const result = freshGetCommand('glm', 'glm-5');

      expect(result).toBeDefined();
      expect(result?.command).toBe('claude');
      expect(result?.args).toContain('glm-5');
    });

    it('should return undefined for unknown provider', async () => {
      vi.mocked(existsSync).mockReturnValue(false);

      const { getProviderCommand: freshGetCommand } = await import(
        '../../src/server/model-config.js'
      );
      const result = freshGetCommand('unknown', 'model');

      expect(result).toBeUndefined();
    });
  });

  describe('getAllProviders()', () => {
    it('should return all configured providers', async () => {
      vi.mocked(existsSync).mockReturnValue(false);

      const { getAllProviders: freshGetAll } = await import(
        '../../src/server/model-config.js'
      );
      const providers = freshGetAll();

      expect(providers.length).toBe(2);
      expect(providers.map((p) => p.id)).toContain('anthropic');
      expect(providers.map((p) => p.id)).toContain('glm');
    });
  });

  describe('getDefaultSelection()', () => {
    it('should return default provider and model', async () => {
      vi.mocked(existsSync).mockReturnValue(false);

      const { getDefaultSelection: freshGetDefault } = await import(
        '../../src/server/model-config.js'
      );
      const defaults = freshGetDefault();

      expect(defaults.providerId).toBe('anthropic');
      expect(defaults.modelId).toBe('opus');
    });
  });

  describe('getDefaultReviewers()', () => {
    it('returns all 4 default reviewers when every model exists in config', async () => {
      const fullConfig: ModelConfig = {
        defaultProvider: 'anthropic',
        defaultModel: 'opus',
        providers: [
          { id: 'anthropic', name: 'Anthropic', cliCommand: 'claude', cliFlags: ['--model', '{modelId}'], models: [{ id: 'opus', name: 'Opus 4.8' }] },
          { id: 'glm', name: 'GLM', cliCommand: 'claude-glm', cliFlags: ['--model', '{modelId}'], models: [{ id: 'glm-5.2', name: 'GLM 5.2' }] },
          { id: 'minimax', name: 'MiniMax', cliCommand: 'claude-minimax', cliFlags: ['--model', '{modelId}'], models: [{ id: 'MiniMax-M3', name: 'MiniMax M3' }] },
          { id: 'deepseek', name: 'DeepSeek V4', cliCommand: 'claude-deepseek', cliFlags: ['--model', '{modelId}'], models: [{ id: 'opus', name: 'DeepSeek V4 Pro' }] },
        ],
      };

      vi.mocked(existsSync).mockReturnValue(true);
      vi.mocked(readFileSync).mockReturnValue(JSON.stringify(fullConfig));

      const { getDefaultReviewers: freshGetDefaultReviewers } = await import(
        '../../src/server/model-config.js'
      );

      expect(freshGetDefaultReviewers()).toEqual([
        { providerId: 'anthropic', modelId: 'opus' },
        { providerId: 'glm', modelId: 'glm-5.2' },
        { providerId: 'minimax', modelId: 'MiniMax-M3' },
        { providerId: 'deepseek', modelId: 'opus' },
      ]);
    });

    it('drops default reviewers missing from config and warns for each', async () => {
      // Fallback DEFAULT_CONFIG has anthropic/opus + deepseek/opus, but no
      // glm-5.2 and no minimax provider — those two must be dropped with a warning.
      vi.mocked(existsSync).mockReturnValue(false);
      const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});

      const { getDefaultReviewers: freshGetDefaultReviewers } = await import(
        '../../src/server/model-config.js'
      );

      expect(freshGetDefaultReviewers()).toEqual([
        { providerId: 'anthropic', modelId: 'opus' },
        { providerId: 'deepseek', modelId: 'opus' },
      ]);
      expect(warn).toHaveBeenCalledWith(
        expect.stringContaining('glm/glm-5.2')
      );
      expect(warn).toHaveBeenCalledWith(
        expect.stringContaining('minimax/MiniMax-M3')
      );

      warn.mockRestore();
    });
  });
  describe('resolveModelId()', () => {
    // Mirrors the real openrouter provider after the `<providerId>,<slug>`
    // migration: the config only carries prefixed IDs, while kanban.json may
    // still hold the bare slug written before the rename.
    const migratedConfig: ModelConfig = {
      defaultProvider: 'anthropic',
      defaultModel: 'sonnet',
      providers: [
        {
          id: 'anthropic',
          name: 'Anthropic',
          cliCommand: 'claude',
          cliFlags: ['--dangerously-skip-permissions', '--model', '{modelId}'],
          models: [{ id: 'sonnet', name: 'Sonnet' }],
        },
        {
          id: 'openrouter',
          name: 'OpenRouter',
          cliCommand: 'claude-openrouter',
          cliFlags: ['--model', '{modelId}'],
          models: [
            { id: 'openrouter,moonshotai/kimi-k3', name: 'Kimi K3' },
            { id: 'openrouter,arcee-ai/trinity-large-thinking', name: 'Trinity' },
          ],
        },
      ],
    };

    const loadMigrated = async () => {
      vi.mocked(existsSync).mockReturnValue(true);
      vi.mocked(readFileSync).mockReturnValue(JSON.stringify(migratedConfig));
      return import('../../src/server/model-config.js');
    };

    it('prefers an exact match over the legacy form', async () => {
      const { resolveModelId } = await loadMigrated();

      const hit = resolveModelId('openrouter,moonshotai/kimi-k3');

      expect(hit?.provider.id).toBe('openrouter');
      expect(hit?.model.id).toBe('openrouter,moonshotai/kimi-k3');
    });

    it('resolves a pre-migration bare slug and warns once', async () => {
      const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
      const { resolveModelId } = await loadMigrated();

      const hit = resolveModelId('arcee-ai/trinity-large-thinking');
      resolveModelId('arcee-ai/trinity-large-thinking');

      expect(hit?.provider.id).toBe('openrouter');
      expect(hit?.model.id).toBe('openrouter,arcee-ai/trinity-large-thinking');
      expect(warn).toHaveBeenCalledTimes(1);
      expect(warn).toHaveBeenCalledWith(
        expect.stringContaining('openrouter,arcee-ai/trinity-large-thinking')
      );

      warn.mockRestore();
    });

    it('honours the providerId scope instead of scanning every provider', async () => {
      const { resolveModelId } = await loadMigrated();

      expect(resolveModelId('arcee-ai/trinity-large-thinking', 'anthropic')).toBeUndefined();
      expect(resolveModelId('arcee-ai/trinity-large-thinking', 'openrouter')?.model.id).toBe(
        'openrouter,arcee-ai/trinity-large-thinking'
      );
    });

    it('returns undefined for an unknown model', async () => {
      const { resolveModelId } = await loadMigrated();

      expect(resolveModelId('does/not-exist')).toBeUndefined();
    });
  });

  describe('legacy model IDs in the CLI command builders', () => {
    const migratedConfig: ModelConfig = {
      defaultProvider: 'anthropic',
      defaultModel: 'sonnet',
      providers: [
        {
          id: 'openrouter',
          name: 'OpenRouter',
          cliCommand: 'claude-openrouter',
          cliFlags: ['--model', '{modelId}'],
          models: [{ id: 'openrouter,arcee-ai/trinity-large-thinking', name: 'Trinity' }],
        },
      ],
    };

    const loadMigrated = async () => {
      vi.mocked(existsSync).mockReturnValue(true);
      vi.mocked(readFileSync).mockReturnValue(JSON.stringify(migratedConfig));
      return import('../../src/server/model-config.js');
    };

    it('getCliCommandForModel maps a legacy slug onto the openrouter CLI', async () => {
      vi.spyOn(console, 'warn').mockImplementation(() => {});
      const { getCliCommandForModel } = await loadMigrated();

      // Without the fallback this lands in the anthropic default branch and the
      // story silently runs on the real Anthropic account.
      expect(getCliCommandForModel('arcee-ai/trinity-large-thinking')).toEqual({
        command: 'claude-openrouter',
        args: ['--model', 'openrouter,arcee-ai/trinity-large-thinking'],
      });
    });

    it('getCliCommandForModel still falls back to anthropic for a truly unknown model', async () => {
      const { getCliCommandForModel } = await loadMigrated();

      expect(getCliCommandForModel('does/not-exist')).toEqual({
        command: 'claude',
        args: ['--model', 'does/not-exist'],
      });
    });

    it('getProviderCommand substitutes the resolved ID, not the legacy one', async () => {
      vi.spyOn(console, 'warn').mockImplementation(() => {});
      const { getProviderCommand } = await loadMigrated();

      expect(
        getProviderCommand('openrouter', 'arcee-ai/trinity-large-thinking')
      ).toEqual({
        command: 'claude-openrouter',
        args: ['--model', 'openrouter,arcee-ai/trinity-large-thinking'],
      });
    });

    it('getProviderCommand passes an unresolvable ID through unchanged', async () => {
      const { getProviderCommand } = await loadMigrated();

      expect(getProviderCommand('openrouter', 'some/free-form-id')).toEqual({
        command: 'claude-openrouter',
        args: ['--model', 'some/free-form-id'],
      });
    });
  });
});
