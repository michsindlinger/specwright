/**
 * D12 / v3.28.1 — Persist Cloud Terminal session buffers to disk on close so
 * the halted-state UI can retrieve archived logs after the live session is gone.
 *
 * Layout: `${specPath}/auto-mode-logs/${storyId}-${sessionId}.log`. Append-only
 * per session — sessions are short-lived (one per story) so no rotation needed.
 *
 * Why filesystem (not in-memory):
 * - Logs survive backend restart.
 * - Frontend "Logs (archived)" button must work after orchestrator halt, when
 *   the live cloud session is closed (`closeSession` removed it from the Map).
 * - Multi-process safety not required — single Express server owns writes.
 */

import { mkdir, readFile, readdir, writeFile } from 'fs/promises';
import { join } from 'path';
import { projectDir } from './project-dirs.js';

/** Tail size — enough to capture the last few minutes of Claude TUI output. */
export const ARCHIVE_TAIL_BYTES = 200_000;

export function archiveLogDir(projectPath: string, specId: string): string {
  return join(projectDir(projectPath, 'specs', specId), 'auto-mode-logs');
}

export function archiveLogPath(
  projectPath: string,
  specId: string,
  storyId: string,
  sessionId: string
): string {
  // Sanitize storyId / sessionId to avoid path traversal — both are
  // server-generated but defense-in-depth never hurts.
  const safeStory = storyId.replace(/[^a-zA-Z0-9._-]/g, '_');
  const safeSession = sessionId.replace(/[^a-zA-Z0-9._-]/g, '_');
  return join(archiveLogDir(projectPath, specId), `${safeStory}-${safeSession}.log`);
}

/**
 * Persist tail of a Cloud Terminal buffer to disk. Idempotent on repeat calls
 * for the same `(storyId, sessionId)` — overwrites existing tail. Best-effort:
 * failures log a warning but never throw (don't break orchestrator on disk
 * issues).
 */
export async function archiveSessionLog(
  projectPath: string,
  specId: string,
  storyId: string,
  sessionId: string,
  bufferChunks: string[]
): Promise<void> {
  if (!bufferChunks || bufferChunks.length === 0) {
    return;
  }
  try {
    const dir = archiveLogDir(projectPath, specId);
    await mkdir(dir, { recursive: true });
    let joined = bufferChunks.join('');
    if (joined.length > ARCHIVE_TAIL_BYTES) {
      joined = joined.slice(-ARCHIVE_TAIL_BYTES);
    }
    const target = archiveLogPath(projectPath, specId, storyId, sessionId);
    await writeFile(target, joined, 'utf-8');
  } catch (err) {
    console.warn(
      '[auto-mode-logs] archiveSessionLog failed (non-fatal):',
      err instanceof Error ? err.message : err
    );
  }
}

/**
 * Return the most recent archived log for a story, or `null` if none exists.
 * Picks the file with the lexicographically-largest sessionId — sessionIds
 * include `Date.now()` so this matches "newest" in practice.
 */
export async function readLatestArchivedLog(
  projectPath: string,
  specId: string,
  storyId: string
): Promise<{ path: string; content: string } | null> {
  const safeStory = storyId.replace(/[^a-zA-Z0-9._-]/g, '_');
  const dir = archiveLogDir(projectPath, specId);
  let entries: string[];
  try {
    entries = await readdir(dir);
  } catch {
    return null;
  }
  const matches = entries
    .filter((name) => name.startsWith(`${safeStory}-`) && name.endsWith('.log'))
    .sort();
  if (matches.length === 0) {
    return null;
  }
  const latest = matches[matches.length - 1];
  const fullPath = join(dir, latest);
  try {
    const content = await readFile(fullPath, 'utf-8');
    return { path: fullPath, content };
  } catch {
    return null;
  }
}
