import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

describe('kanban-lock.ts copies', () => {
  it('are byte-identical between UI and MCP', () => {
    const uiLock = readFileSync(
      resolve(__dirname, '../../src/server/utils/kanban-lock.ts'),
      'utf8'
    );
    const mcpLock = readFileSync(
      resolve(__dirname, '../../../specwright/scripts/mcp/kanban-lock.ts'),
      'utf8'
    );
    expect(uiLock).toBe(mcpLock);
  });
});
