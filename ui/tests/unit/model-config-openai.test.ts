/**
 * INT-2026-012 (AK-01, AK-05, E3): contract against the real
 * `ui/config/model-config.json` — the two OpenAI providers and the naming
 * convention every provider must follow (`claude…` or listed as known-foreign).
 * No fs mock on purpose: `model-config.ts` resolves the shipped file by its own
 * path, so a fresh import loads exactly this file. Nothing here writes.
 */
import { describe, it, expect, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import type { ModelConfig } from '../../src/server/model-config.js';
import { isClaudeCli } from '../../src/shared/provider-cli.js';

const CONFIG_PATH = join(dirname(fileURLToPath(import.meta.url)), '../../config/model-config.json');
const config = JSON.parse(readFileSync(CONFIG_PATH, 'utf-8')) as ModelConfig;

/**
 * Providers that intentionally run a foreign agent CLI. Adding a provider whose
 * command does not start with `claude` without listing it here fails the test —
 * that provider would silently lose status, reviewer use and step start.
 */
const KNOWN_FOREIGN_PROVIDERS = ['codex-cli'];
const GPT_IDS = ['gpt-6-astra', 'gpt-5.6-sol', 'gpt-5.6-luna'];

async function fresh(): Promise<typeof import('../../src/server/model-config.js')> {
  vi.resetModules();
  vi.spyOn(console, 'log').mockImplementation(() => {});
  vi.spyOn(console, 'warn').mockImplementation(() => {});
  return import('../../src/server/model-config.js');
}

describe('model-config.json OpenAI providers (INT-2026-012)', () => {
  it('AK-01: provider codex runs Claude Code via the claude-codex wrapper with the three proxy model ids', () => {
    const codex = config.providers.find((p) => p.id === 'codex');
    expect(codex).toBeDefined();
    expect(codex!.name).toBe('OpenAI');
    expect(codex!.cliCommand).toBe('claude-codex');
    expect(codex!.cliFlags).toEqual(['--model', '{modelId}']);
    expect(codex!.models.map((m) => m.id)).toEqual(GPT_IDS);
    expect(isClaudeCli(codex!.cliCommand)).toBe(true);
  });

  it('AK-05: provider codex-cli runs the native codex CLI without approvals/sandbox (D3), same three ids', () => {
    const cli = config.providers.find((p) => p.id === 'codex-cli');
    expect(cli).toBeDefined();
    expect(cli!.name).toBe('Codex (nativ)');
    expect(cli!.cliCommand).toBe('codex');
    expect(cli!.cliFlags).toContain('--dangerously-bypass-approvals-and-sandbox');
    expect(cli!.cliFlags).toContain('--model');
    expect(cli!.cliFlags.indexOf('{modelId}')).toBe(cli!.cliFlags.indexOf('--model') + 1);
    expect(cli!.models.map((m) => m.id)).toEqual(GPT_IDS);
    expect(isClaudeCli(cli!.cliCommand)).toBe(false);
  });

  it('AK-05: getProviderCommand builds `codex --dangerously-bypass-approvals-and-sandbox --model gpt-6-astra`', async () => {
    const mc = await fresh();
    expect(mc.getProviderCommand('codex-cli', 'gpt-6-astra')).toEqual({
      command: 'codex',
      args: ['--dangerously-bypass-approvals-and-sandbox', '--model', 'gpt-6-astra'],
    });
    expect(mc.getProviderCommand('codex', 'gpt-6-astra')).toEqual({ command: 'claude-codex', args: ['--model', 'gpt-6-astra'] });
  });

  it('AK-04/AK-07 on the real file: reviewers include codex, never codex-cli; the terminal list keeps both', async () => {
    const mc = await fresh();
    const reviewerIds = mc.getReviewerProviders().map((p) => p.id);
    expect(reviewerIds).toContain('codex');
    expect(reviewerIds).not.toContain('codex-cli');
    const listed = mc.providersForModelList();
    expect(listed.find((p) => p.id === 'codex')?.cliKind).toBe('claude');
    expect(listed.find((p) => p.id === 'codex-cli')?.cliKind).toBe('foreign');
  });

  it('E3 contract: every provider is a claude… command or listed in KNOWN_FOREIGN_PROVIDERS', () => {
    const offenders = config.providers.filter((p) => !isClaudeCli(p.cliCommand) && !KNOWN_FOREIGN_PROVIDERS.includes(p.id));
    expect(offenders.map((p) => `${p.id} (${p.cliCommand})`)).toEqual([]);
    const listedButClaude = KNOWN_FOREIGN_PROVIDERS.filter((id) => {
      const p = config.providers.find((x) => x.id === id);
      return p && isClaudeCli(p.cliCommand);
    });
    expect(listedButClaude).toEqual([]);
  });

  it('step defaults in the shipped file never point at a foreign provider', () => {
    const foreign = new Set(config.providers.filter((p) => !isClaudeCli(p.cliCommand)).map((p) => p.id));
    for (const [step, sel] of Object.entries(config.stepDefaults ?? {})) {
      expect(foreign.has(sel.providerId), `stepDefaults.${step} → ${sel.providerId}`).toBe(false);
    }
  });
});
