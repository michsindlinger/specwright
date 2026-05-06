/**
 * D12 / v3.28.1: archive Cloud Terminal session buffers + retrieve them.
 * Covers happy-path write, tail-trim past ARCHIVE_TAIL_BYTES, path sanitization,
 * latest-log selection, missing-dir handling.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { promises as fs } from 'fs';
import { dirname, join } from 'path';
import { tmpdir } from 'os';
import {
  archiveLogPath,
  archiveLogDir,
  archiveSessionLog,
  readLatestArchivedLog,
  ARCHIVE_TAIL_BYTES,
} from '../../src/server/utils/auto-mode-logs.js';

let projectPath: string;
const specId = '2026-05-05-x';
const storyId = 'STORY-007';

beforeEach(async () => {
  projectPath = await fs.mkdtemp(join(tmpdir(), 'aml-'));
  // Specs dir is implicit in projectDir(); we let archiveSessionLog mkdir it.
});

afterEach(async () => {
  await fs.rm(projectPath, { recursive: true, force: true });
});

describe('archiveLogPath / archiveLogDir', () => {
  it('builds spec-scoped path under auto-mode-logs/', () => {
    const dir = archiveLogDir(projectPath, specId);
    const path = archiveLogPath(projectPath, specId, storyId, 'cloud-12345-1');
    expect(dir.endsWith(`/specs/${specId}/auto-mode-logs`)).toBe(true);
    expect(path).toBe(join(dir, `${storyId}-cloud-12345-1.log`));
  });

  it('sanitizes path-traversal attempts so result stays under auto-mode-logs/', () => {
    const dir = archiveLogDir(projectPath, specId);
    const path = archiveLogPath(projectPath, specId, '../etc/passwd', 'cloud/x');
    // Result MUST be a direct child of archiveLogDir — no `/` survived in
    // basename, so traversal is impossible regardless of literal `..` text.
    expect(dirname(path)).toBe(dir);
    expect(path).toContain('cloud_x');
  });
});

describe('archiveSessionLog', () => {
  it('writes joined buffer to disk and creates dir on demand', async () => {
    await archiveSessionLog(projectPath, specId, storyId, 'cloud-1', ['hello ', 'world']);
    const path = archiveLogPath(projectPath, specId, storyId, 'cloud-1');
    expect(await fs.readFile(path, 'utf-8')).toBe('hello world');
  });

  it('truncates to last ARCHIVE_TAIL_BYTES bytes when buffer exceeds limit', async () => {
    const big = 'a'.repeat(ARCHIVE_TAIL_BYTES + 1000);
    const tailMarker = 'TAIL_END';
    await archiveSessionLog(projectPath, specId, storyId, 'cloud-2', [big, tailMarker]);
    const path = archiveLogPath(projectPath, specId, storyId, 'cloud-2');
    const content = await fs.readFile(path, 'utf-8');
    expect(content.length).toBe(ARCHIVE_TAIL_BYTES);
    expect(content.endsWith(tailMarker)).toBe(true);
  });

  it('no-op on empty buffer (no file created)', async () => {
    await archiveSessionLog(projectPath, specId, storyId, 'cloud-3', []);
    const path = archiveLogPath(projectPath, specId, storyId, 'cloud-3');
    await expect(fs.access(path)).rejects.toThrow();
  });

  it('overwrites prior log for the same (storyId, sessionId)', async () => {
    await archiveSessionLog(projectPath, specId, storyId, 'cloud-4', ['first']);
    await archiveSessionLog(projectPath, specId, storyId, 'cloud-4', ['second']);
    const path = archiveLogPath(projectPath, specId, storyId, 'cloud-4');
    expect(await fs.readFile(path, 'utf-8')).toBe('second');
  });

  it('does not throw on disk write failure (best-effort)', async () => {
    // Make the spec dir read-only so writeFile fails — assert no throw.
    const dir = archiveLogDir(projectPath, specId);
    await fs.mkdir(dir, { recursive: true });
    await fs.chmod(dir, 0o500);
    try {
      await expect(
        archiveSessionLog(projectPath, specId, storyId, 'cloud-5', ['x'])
      ).resolves.toBeUndefined();
    } finally {
      await fs.chmod(dir, 0o700);
    }
  });
});

describe('readLatestArchivedLog', () => {
  it('returns null when no log dir exists', async () => {
    const result = await readLatestArchivedLog(projectPath, specId, storyId);
    expect(result).toBeNull();
  });

  it('returns null when storyId has no logs', async () => {
    await archiveSessionLog(projectPath, specId, 'OTHER', 'cloud-1', ['x']);
    const result = await readLatestArchivedLog(projectPath, specId, storyId);
    expect(result).toBeNull();
  });

  it('returns the lex-largest sessionId log when multiple exist', async () => {
    await archiveSessionLog(projectPath, specId, storyId, 'cloud-1000-1', ['oldest']);
    await archiveSessionLog(projectPath, specId, storyId, 'cloud-2000-2', ['middle']);
    await archiveSessionLog(projectPath, specId, storyId, 'cloud-3000-3', ['latest']);
    const result = await readLatestArchivedLog(projectPath, specId, storyId);
    expect(result).not.toBeNull();
    expect(result!.content).toBe('latest');
    expect(result!.path).toContain('cloud-3000-3');
  });

  it('honors sanitized storyId on read (matches what was written)', async () => {
    await archiveSessionLog(projectPath, specId, '../weird/id', 'cloud-1', ['data']);
    const result = await readLatestArchivedLog(projectPath, specId, '../weird/id');
    expect(result?.content).toBe('data');
  });
});
