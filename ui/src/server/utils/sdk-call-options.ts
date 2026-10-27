import type { Options } from '@anthropic-ai/claude-agent-sdk';
import { accessSync, constants } from 'fs';
import { delimiter, join } from 'path';
import { buildProviderEnv } from './provider-env.js';

export type SdkCallOptions = Pick<
  Options,
  | 'env'
  | 'tools'
  | 'allowedTools'
  | 'strictMcpConfig'
  | 'settingSources'
  | 'permissionMode'
  | 'allowDangerouslySkipPermissions'
  | 'pathToClaudeCodeExecutable'
>;

/**
 * Options for a backend-spawned helper process (plan reviewer, finding
 * aggregator): provider auth from buildProviderEnv, exactly the given tools,
 * no MCP servers, no permission prompts.
 *
 * Single source of truth for the tool/MCP policy shared by both SDK callers,
 * so the two call sites cannot drift apart again (regression class of commit
 * 28965af, now for MCP instead of auth — INT-2026-006).
 *
 * `strictMcpConfig: true` becomes `--strict-mcp-config`. In the CLI that means
 * "only use MCP servers from --mcp-config, ignoring all other MCP
 * configurations" — the SDK typing's "strict validation" wording is
 * misleading. With no `mcpServers` passed, the process loads neither
 * ~/.claude.json nor the project's .mcp.json. That is what keeps a broken
 * third-party tool schema (API 400) and ~140k tokens of tool descriptions out
 * of every call. Passing `mcpServers: {}` instead would do nothing: the SDK
 * only emits `--mcp-config` for a non-empty object.
 *
 * `permissionMode: 'bypassPermissions'` is only acceptable because the tool
 * set is read-only (RB-01); callers must not widen `tools` beyond that.
 *
 * `settingSources: ['user']` stays: third-party providers keep their env block
 * (ANTHROPIC_BASE_URL, token) in ~/.claude-<id>/settings.json. It does not
 * affect MCP loading — MCP servers come from ~/.claude.json, not settings.json.
 */
export function buildSdkCallOptions(providerId: string, tools: readonly string[]): SdkCallOptions {
  const claude = installedClaude();
  return {
    env: buildProviderEnv(providerId),
    tools: [...tools],
    allowedTools: [...tools],
    strictMcpConfig: true,
    settingSources: ['user'],
    permissionMode: 'bypassPermissions',
    allowDangerouslySkipPermissions: true,
    ...(claude ? { pathToClaudeCodeExecutable: claude } : {}),
  };
}

/**
 * The installed `claude` from PATH, else undefined (the SDK then uses its
 * bundled CLI). The bundled CLI lags behind the installed one and passes
 * newer model aliases such as `fable` through unresolved → API 404 (#116).
 */
export function installedClaude(pathVar = process.env.PATH ?? ''): string | undefined {
  for (const dir of pathVar.split(delimiter)) {
    if (!dir) continue;
    const candidate = join(dir, 'claude');
    try {
      accessSync(candidate, constants.X_OK);
      return candidate;
    } catch {
      // not here
    }
  }
  return undefined;
}
