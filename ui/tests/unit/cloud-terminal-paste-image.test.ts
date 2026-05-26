import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { EventEmitter } from 'events';
import { existsSync, readFileSync, rmSync } from 'fs';
import { join } from 'path';

import { CloudTerminalManager } from '../../src/server/services/cloud-terminal-manager.js';
import {
  CLOUD_TERMINAL_CONFIG,
  CLOUD_TERMINAL_ERROR_CODES,
} from '../../src/shared/types/cloud-terminal.protocol.js';

/**
 * Minimal stand-in for TerminalManager — we only need `on('terminal.*', …)` for
 * the constructor's listener wiring and `write()` for the assertion below.
 */
class FakeTerminalManager extends EventEmitter {
  public writes: Array<{ executionId: string; data: string }> = [];

  write(executionId: string, data: string): boolean {
    this.writes.push({ executionId, data });
    return true;
  }

  // Methods referenced via the manager but not exercised by these tests
  kill(): boolean { return true; }
  resize(): void {}
}

const TEST_SESSION_ID = 'paste-test-session';
const PNG_BYTES = Buffer.from([
  0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, // PNG signature
  0x00, 0x00, 0x00, 0x0d, 0x49, 0x48, 0x44, 0x52, // IHDR chunk header
]);
const PNG_BASE64 = PNG_BYTES.toString('base64');

function withActiveSession(
  manager: CloudTerminalManager,
  status: 'active' | 'paused' | 'closed' = 'active',
): { executionId: string } {
  const executionId = 'exec-test-1';
  // The session map is private — cast through unknown for a direct injection
  // that avoids spawning a real PTY.
  const sessions = (manager as unknown as { sessions: Map<string, unknown> }).sessions;
  sessions.set(TEST_SESSION_ID, {
    sessionId: TEST_SESSION_ID,
    executionId,
    status,
    projectPath: '/tmp/project',
    terminalType: 'claude-code',
    createdAt: new Date(),
    lastActivity: new Date(),
    pausedBuffer: [],
  });
  return { executionId };
}

describe('CloudTerminalManager.savePastedImage', () => {
  let manager: CloudTerminalManager;
  let fakeTerminal: FakeTerminalManager;
  const sessionDir = join(CLOUD_TERMINAL_CONFIG.PASTE_IMAGE_ROOT, TEST_SESSION_ID);

  beforeEach(() => {
    fakeTerminal = new FakeTerminalManager();
    manager = new CloudTerminalManager(fakeTerminal as never);
  });

  afterEach(() => {
    rmSync(sessionDir, { recursive: true, force: true });
    vi.restoreAllMocks();
  });

  it('writes the decoded image and injects its absolute path into the PTY', async () => {
    const { executionId } = withActiveSession(manager);

    const { absolutePath } = await manager.savePastedImage(
      TEST_SESSION_ID, PNG_BASE64, 'image/png',
    );

    expect(absolutePath.startsWith(sessionDir + '/')).toBe(true);
    expect(absolutePath.endsWith('.png')).toBe(true);
    expect(existsSync(absolutePath)).toBe(true);
    expect(readFileSync(absolutePath)).toEqual(PNG_BYTES);

    // PTY receives the path with surrounding spaces so it sits as a distinct token.
    expect(fakeTerminal.writes).toEqual([
      { executionId, data: ` ${absolutePath} ` },
    ]);
  });

  it('rejects unknown MIME types with PASTE_IMAGE_UNSUPPORTED_TYPE', async () => {
    withActiveSession(manager);

    await expect(
      manager.savePastedImage(TEST_SESSION_ID, PNG_BASE64, 'application/octet-stream'),
    ).rejects.toMatchObject({ code: CLOUD_TERMINAL_ERROR_CODES.PASTE_IMAGE_UNSUPPORTED_TYPE });

    expect(fakeTerminal.writes).toHaveLength(0);
  });

  it('rejects oversized images with PASTE_IMAGE_TOO_LARGE', async () => {
    withActiveSession(manager);
    const big = Buffer.alloc(CLOUD_TERMINAL_CONFIG.MAX_PASTE_IMAGE_BYTES + 1, 0xff);

    await expect(
      manager.savePastedImage(TEST_SESSION_ID, big.toString('base64'), 'image/png'),
    ).rejects.toMatchObject({ code: CLOUD_TERMINAL_ERROR_CODES.PASTE_IMAGE_TOO_LARGE });

    expect(fakeTerminal.writes).toHaveLength(0);
  });

  it('rejects empty base64 with PASTE_IMAGE_FAILED', async () => {
    withActiveSession(manager);

    await expect(
      manager.savePastedImage(TEST_SESSION_ID, '', 'image/png'),
    ).rejects.toMatchObject({ code: CLOUD_TERMINAL_ERROR_CODES.PASTE_IMAGE_FAILED });
  });

  it('rejects missing sessions with SESSION_NOT_FOUND', async () => {
    await expect(
      manager.savePastedImage('nonexistent', PNG_BASE64, 'image/png'),
    ).rejects.toMatchObject({ code: CLOUD_TERMINAL_ERROR_CODES.SESSION_NOT_FOUND });
  });

  it('rejects paused sessions with SESSION_NOT_ACTIVE', async () => {
    withActiveSession(manager, 'paused');

    await expect(
      manager.savePastedImage(TEST_SESSION_ID, PNG_BASE64, 'image/png'),
    ).rejects.toMatchObject({ code: CLOUD_TERMINAL_ERROR_CODES.SESSION_NOT_ACTIVE });

    expect(fakeTerminal.writes).toHaveLength(0);
  });
});
