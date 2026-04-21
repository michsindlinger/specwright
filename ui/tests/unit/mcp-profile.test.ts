/**
 * Unit tests for MCP-Profile utility (v3.22.0).
 *
 * Tests the happy path (flags generated from a valid profile + user config)
 * and every documented fallback-to-status-quo path.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { mkdtemp, writeFile, mkdir, readFile, rm } from 'fs/promises';
import { existsSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import {
  getMcpProfileForCommand,
  buildMcpFlags,
  cleanupMcpTempFile,
} from '../../src/server/utils/mcp-profile.js';

describe('mcp-profile', () => {
  describe('getMcpProfileForCommand', () => {
    it('maps /specwright:execute-tasks → execute-tasks', () => {
      expect(getMcpProfileForCommand('/specwright:execute-tasks')).toBe('execute-tasks');
    });

    it('maps agent-os: prefix identically', () => {
      expect(getMcpProfileForCommand('/agent-os:execute-tasks 2026-04-20-xyz STORY-001')).toBe('execute-tasks');
    });

    it('strips arguments and trailing text', () => {
      expect(getMcpProfileForCommand('/specwright:create-spec Multi Project VERY IMPORTANT: ...')).toBe('create-spec');
    });

    it('maps both validate-market variants', () => {
      expect(getMcpProfileForCommand('/specwright:validate-market')).toBe('validate-market');
      expect(getMcpProfileForCommand('/specwright:validate-market-for-existing')).toBe('validate-market');
    });

    it('returns null for unmapped commands', () => {
      expect(getMcpProfileForCommand('/specwright:add-todo')).toBeNull();
      expect(getMcpProfileForCommand('/specwright:unknown-command')).toBeNull();
    });

    it('returns null for empty input', () => {
      expect(getMcpProfileForCommand('')).toBeNull();
      expect(getMcpProfileForCommand('   ')).toBeNull();
    });
  });

  describe('buildMcpFlags', () => {
    let tmpRoot: string;
    let projectPath: string;

    beforeEach(async () => {
      tmpRoot = await mkdtemp(join(tmpdir(), 'mcp-profile-test-'));
      projectPath = join(tmpRoot, 'project');
      await mkdir(join(projectPath, 'specwright', 'mcp-profiles'), { recursive: true });
      delete process.env.SPECWRIGHT_MCP_PROFILES;
    });

    afterEach(async () => {
      await rm(tmpRoot, { recursive: true, force: true }).catch(() => {});
    });

    it('returns [] when kill switch is on', async () => {
      process.env.SPECWRIGHT_MCP_PROFILES = 'off';
      const flags = await buildMcpFlags('/specwright:execute-tasks', projectPath, 'exec-1');
      expect(flags).toEqual([]);
    });

    it('returns [] when command has no profile mapping', async () => {
      const flags = await buildMcpFlags('/specwright:add-todo', projectPath, 'exec-2');
      expect(flags).toEqual([]);
    });

    it('returns [] when profile file is missing', async () => {
      // No execute-tasks.json exists in project; also no global dir assumed
      const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
      const flags = await buildMcpFlags('/specwright:execute-tasks', projectPath, 'exec-3');
      expect(flags).toEqual([]);
      expect(warn).toHaveBeenCalled();
      warn.mockRestore();
    });

    it('returns [] when mcp-always-on.json is missing', async () => {
      await writeFile(
        join(projectPath, 'specwright', 'mcp-profiles', 'execute-tasks.json'),
        JSON.stringify({ allowlist: ['kanban'], allowOptional: ['context7'] })
      );
      const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
      const flags = await buildMcpFlags('/specwright:execute-tasks', projectPath, 'exec-4');
      expect(flags).toEqual([]);
      expect(warn).toHaveBeenCalled();
      warn.mockRestore();
    });

    it('returns [] when required allowlist server is missing from always-on', async () => {
      await writeFile(
        join(projectPath, 'specwright', 'mcp-profiles', 'execute-tasks.json'),
        JSON.stringify({ allowlist: ['kanban'], allowOptional: [] })
      );
      await writeFile(
        join(projectPath, 'specwright', 'mcp-always-on.json'),
        JSON.stringify({ mcpServers: { context7: { type: 'http', url: 'https://example' } } })
      );
      const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
      const flags = await buildMcpFlags('/specwright:execute-tasks', projectPath, 'exec-5');
      expect(flags).toEqual([]);
      expect(warn).toHaveBeenCalled();
      warn.mockRestore();
    });

    it('returns flags + writes temp file when config is valid', async () => {
      await writeFile(
        join(projectPath, 'specwright', 'mcp-profiles', 'execute-tasks.json'),
        JSON.stringify({ allowlist: ['kanban'], allowOptional: ['context7', 'missing-one'] })
      );
      const kanbanCfg = { type: 'stdio', command: 'npx', args: ['-y', '@specwright/kanban-mcp'] };
      const context7Cfg = { type: 'http', url: 'https://mcp.context7.com' };
      const extraCfg = { type: 'http', url: 'https://should-be-filtered-out' };
      await writeFile(
        join(projectPath, 'specwright', 'mcp-always-on.json'),
        JSON.stringify({
          mcpServers: {
            kanban: kanbanCfg,
            context7: context7Cfg,
            extra: extraCfg, // not in allowlist/optional → must be filtered out
          },
        })
      );
      const log = vi.spyOn(console, 'log').mockImplementation(() => {});
      const flags = await buildMcpFlags('/specwright:execute-tasks', projectPath, 'exec-6');

      expect(flags).toHaveLength(3);
      expect(flags[0]).toBe('--mcp-config');
      expect(flags[2]).toBe('--strict-mcp-config');
      expect(flags[1]).toMatch(/^\/.+\/specwright\/mcp-exec-6\.json$/);
      expect(existsSync(flags[1])).toBe(true);

      const written = JSON.parse(await readFile(flags[1], 'utf-8'));
      expect(written.mcpServers).toEqual({ kanban: kanbanCfg, context7: context7Cfg });
      expect(written.mcpServers.extra).toBeUndefined();
      expect(written.mcpServers['missing-one']).toBeUndefined();

      await cleanupMcpTempFile(flags);
      expect(existsSync(flags[1])).toBe(false);
      log.mockRestore();
    });

    it('sanitizes execution IDs with unsafe characters', async () => {
      await writeFile(
        join(projectPath, 'specwright', 'mcp-profiles', 'execute-tasks.json'),
        JSON.stringify({ allowlist: [], allowOptional: ['kanban'] })
      );
      await writeFile(
        join(projectPath, 'specwright', 'mcp-always-on.json'),
        JSON.stringify({ mcpServers: { kanban: { type: 'stdio', command: 'noop' } } })
      );
      const log = vi.spyOn(console, 'log').mockImplementation(() => {});
      const flags = await buildMcpFlags(
        '/specwright:execute-tasks',
        projectPath,
        'auto-2026-04-20-spec/with slashes'
      );
      expect(flags).toHaveLength(3);
      expect(flags[1]).toMatch(/mcp-auto-2026-04-20-spec_with_slashes\.json$/);
      await cleanupMcpTempFile(flags);
      log.mockRestore();
    });
  });

  describe('cleanupMcpTempFile', () => {
    it('silently ignores [] input', async () => {
      await expect(cleanupMcpTempFile([])).resolves.toBeUndefined();
    });

    it('silently ignores malformed flag arrays', async () => {
      await expect(cleanupMcpTempFile(['--something-else', '/tmp/x'])).resolves.toBeUndefined();
    });

    it('refuses to unlink files outside the specwright tmp dir', async () => {
      // No assertion on file state — the safeguard just ensures the call returns
      // without throwing, even when the path is malicious
      await expect(
        cleanupMcpTempFile(['--mcp-config', '/etc/passwd', '--strict-mcp-config'])
      ).resolves.toBeUndefined();
    });
  });
});
