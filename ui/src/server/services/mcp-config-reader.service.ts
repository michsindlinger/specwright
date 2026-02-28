import { promises as fs } from 'fs';
import { resolve } from 'path';
import { McpServerSummary } from '../../shared/types/team.protocol.js';

// ============================================================================
// McpConfigReaderService
// ============================================================================

/**
 * Reads MCP server configuration from a project's .mcp.json file.
 * Checks the project root and parent directory (monorepo layout).
 * SECURITY: The env field is stripped from all server entries before returning.
 */
export class McpConfigReaderService {

  /**
   * Read and parse the MCP configuration for a project.
   * Returns the list of MCP servers with env fields stripped.
   */
  async readConfig(projectPath: string): Promise<{ servers: McpServerSummary[]; message?: string }> {
    const candidates = [
      resolve(projectPath, '.mcp.json'),
      resolve(projectPath, '..', '.mcp.json'),
    ];

    for (const mcpPath of candidates) {
      let content: string;
      try {
        content = await fs.readFile(mcpPath, 'utf-8');
      } catch {
        continue;
      }

      let config: Record<string, unknown>;
      try {
        config = JSON.parse(content);
      } catch {
        return { servers: [], message: 'Invalid MCP configuration' };
      }

      const mcpServers = config?.mcpServers;
      if (!mcpServers || typeof mcpServers !== 'object') {
        return { servers: [] };
      }

      const servers: McpServerSummary[] = [];
      for (const [name, serverConfig] of Object.entries(mcpServers as Record<string, Record<string, unknown>>)) {
        servers.push({
          name,
          type: typeof serverConfig.type === 'string' ? serverConfig.type : 'stdio',
          command: typeof serverConfig.command === 'string' ? serverConfig.command : '',
          args: Array.isArray(serverConfig.args) ? serverConfig.args.map(String) : [],
        });
      }

      return { servers };
    }

    return { servers: [], message: 'Keine MCP-Konfiguration gefunden' };
  }
}

// ============================================================================
// Singleton Export
// ============================================================================

export const mcpConfigReaderService = new McpConfigReaderService();
