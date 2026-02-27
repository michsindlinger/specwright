import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { promises as fs } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import { McpConfigReaderService } from '../../src/server/services/mcp-config-reader.service.js';

describe('McpConfigReaderService', () => {
  let service: McpConfigReaderService;
  let tmpDir: string;
  let projectPath: string;

  beforeEach(async () => {
    service = new McpConfigReaderService();
    tmpDir = await fs.mkdtemp(join(tmpdir(), 'mcp-config-test-'));
    projectPath = tmpDir;
  });

  afterEach(async () => {
    await fs.rm(tmpDir, { recursive: true, force: true });
  });

  async function createMcpConfig(
    dir: string,
    config: Record<string, unknown>
  ): Promise<void> {
    await fs.writeFile(join(dir, '.mcp.json'), JSON.stringify(config), 'utf-8');
  }

  // ==========================================================================
  // readConfig - successful parsing
  // ==========================================================================

  describe('successful parsing', () => {
    it('should parse .mcp.json with multiple servers', async () => {
      await createMcpConfig(projectPath, {
        mcpServers: {
          playwright: {
            type: 'stdio',
            command: 'npx',
            args: ['@anthropic/mcp-playwright'],
          },
          perplexity: {
            type: 'sse',
            command: 'node',
            args: ['server.js', '--port', '3000'],
          },
        },
      });

      const result = await service.readConfig(projectPath);

      expect(result.servers).toHaveLength(2);
      expect(result.servers).toEqual(
        expect.arrayContaining([
          {
            name: 'playwright',
            type: 'stdio',
            command: 'npx',
            args: ['@anthropic/mcp-playwright'],
          },
          {
            name: 'perplexity',
            type: 'sse',
            command: 'node',
            args: ['server.js', '--port', '3000'],
          },
        ])
      );
      expect(result.message).toBeUndefined();
    });

    it('should strip env field from server entries', async () => {
      await createMcpConfig(projectPath, {
        mcpServers: {
          secret: {
            type: 'stdio',
            command: 'npx',
            args: ['server'],
            env: {
              API_KEY: 'super-secret-key',
              DATABASE_URL: 'postgres://secret',
            },
          },
        },
      });

      const result = await service.readConfig(projectPath);

      expect(result.servers).toHaveLength(1);
      expect(result.servers[0]).toEqual({
        name: 'secret',
        type: 'stdio',
        command: 'npx',
        args: ['server'],
      });
      // Verify env is NOT in the response
      expect((result.servers[0] as Record<string, unknown>)['env']).toBeUndefined();
    });

    it('should default type to stdio when not specified', async () => {
      await createMcpConfig(projectPath, {
        mcpServers: {
          minimal: {
            command: 'node',
            args: ['index.js'],
          },
        },
      });

      const result = await service.readConfig(projectPath);

      expect(result.servers).toHaveLength(1);
      expect(result.servers[0].type).toBe('stdio');
    });

    it('should default command to empty string when not specified', async () => {
      await createMcpConfig(projectPath, {
        mcpServers: {
          nocommand: {
            type: 'sse',
          },
        },
      });

      const result = await service.readConfig(projectPath);

      expect(result.servers).toHaveLength(1);
      expect(result.servers[0].command).toBe('');
    });

    it('should default args to empty array when not specified', async () => {
      await createMcpConfig(projectPath, {
        mcpServers: {
          noargs: {
            command: 'node',
          },
        },
      });

      const result = await service.readConfig(projectPath);

      expect(result.servers).toHaveLength(1);
      expect(result.servers[0].args).toEqual([]);
    });
  });

  // ==========================================================================
  // readConfig - missing / invalid config
  // ==========================================================================

  describe('missing / invalid config', () => {
    it('should return empty servers with message when .mcp.json does not exist', async () => {
      const result = await service.readConfig(projectPath);

      expect(result.servers).toEqual([]);
      expect(result.message).toBe('Keine MCP-Konfiguration gefunden');
    });

    it('should return empty servers with message for invalid JSON', async () => {
      await fs.writeFile(join(projectPath, '.mcp.json'), '{ invalid json !!!', 'utf-8');

      const result = await service.readConfig(projectPath);

      expect(result.servers).toEqual([]);
      expect(result.message).toBe('Invalid MCP configuration');
    });

    it('should return empty servers when mcpServers property is missing', async () => {
      await createMcpConfig(projectPath, { someOtherField: true });

      const result = await service.readConfig(projectPath);

      expect(result.servers).toEqual([]);
      expect(result.message).toBeUndefined();
    });

    it('should return empty servers when mcpServers is null', async () => {
      await createMcpConfig(projectPath, { mcpServers: null });

      const result = await service.readConfig(projectPath);

      expect(result.servers).toEqual([]);
    });
  });

  // ==========================================================================
  // readConfig - monorepo fallback
  // ==========================================================================

  describe('monorepo fallback', () => {
    it('should read .mcp.json from parent directory when not in project root', async () => {
      // Create a subdirectory simulating a monorepo package
      const subProject = join(tmpDir, 'packages', 'my-app');
      await fs.mkdir(subProject, { recursive: true });

      // Place .mcp.json in the packages/ directory (parent of my-app)
      await createMcpConfig(join(tmpDir, 'packages'), {
        mcpServers: {
          'from-parent': {
            type: 'stdio',
            command: 'npx',
            args: ['parent-server'],
          },
        },
      });

      const result = await service.readConfig(subProject);

      expect(result.servers).toHaveLength(1);
      expect(result.servers[0].name).toBe('from-parent');
    });

    it('should prefer project root .mcp.json over parent', async () => {
      // Create both project root and parent .mcp.json
      const subProject = join(tmpDir, 'packages', 'my-app');
      await fs.mkdir(subProject, { recursive: true });

      await createMcpConfig(subProject, {
        mcpServers: {
          local: { command: 'local-cmd', args: [] },
        },
      });

      await createMcpConfig(join(tmpDir, 'packages'), {
        mcpServers: {
          parent: { command: 'parent-cmd', args: [] },
        },
      });

      const result = await service.readConfig(subProject);

      expect(result.servers).toHaveLength(1);
      expect(result.servers[0].name).toBe('local');
    });
  });
});
