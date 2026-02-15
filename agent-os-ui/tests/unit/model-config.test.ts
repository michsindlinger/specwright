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
});
