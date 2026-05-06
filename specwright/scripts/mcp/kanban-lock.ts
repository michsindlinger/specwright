import { mkdir, rmdir, stat } from 'fs/promises';
import { join } from 'path';

const LOCK_TIMEOUT_MS = 15000;
const LOCK_RETRY_MS = 100;
const LOCK_RETRY_JITTER_MS = 50;
const STALE_LOCK_MS = 20000; // 20 seconds

// Module-init invariant: caller timeout must expire before stale threshold.
if (LOCK_TIMEOUT_MS >= STALE_LOCK_MS) {
  throw new Error(
    `[KanbanLock] invariant violation: LOCK_TIMEOUT_MS (${LOCK_TIMEOUT_MS}) must be < STALE_LOCK_MS (${STALE_LOCK_MS})`
  );
}

/**
 * File-based lock using mkdir as atomic operation.
 *
 * Uses a directory (kanban.json.lock) as the lock file because mkdir is
 * atomic on Unix/macOS filesystems. This works across processes without
 * requiring external dependencies.
 *
 * This utility uses the SAME locking protocol as the Kanban MCP Server
 * in agent-os-extended, ensuring the Express server and Claude CLI
 * subprocesses coordinate properly when accessing kanban.json.
 *
 * @param specPath - Path to the spec directory containing kanban.json
 * @param fn - Function to execute while holding the lock
 * @param timeout - Maximum time to wait for lock acquisition (default: 15000ms)
 * @returns Result of the executed function
 * @throws Error if lock cannot be acquired within timeout
 */
export async function withKanbanLock<T>(
  specPath: string,
  fn: () => Promise<T>,
  timeout = LOCK_TIMEOUT_MS
): Promise<T> {
  const lockPath = join(specPath, 'kanban.json.lock');
  const start = Date.now();

  // Acquire lock
  while (true) {
    try {
      await mkdir(lockPath);
      // Lock acquired successfully
      break;
    } catch (err) {
      const error = err as NodeJS.ErrnoException;

      if (error.code === 'EEXIST') {
        // Lock already exists - check if stale
        try {
          const lockStat = await stat(lockPath);
          const lockAge = Date.now() - lockStat.mtimeMs;

          if (lockAge > STALE_LOCK_MS) {
            console.warn(`[KanbanLock] Removing stale lock (age: ${Math.round(lockAge/1000)}s): ${lockPath}`);
            await rmdir(lockPath);
            continue; // Retry after removing stale lock
          }
        } catch {
          // Lock disappeared between check and stat - retry
          continue;
        }

        // Check timeout
        if (Date.now() - start > timeout) {
          throw new Error(`Kanban lock timeout after ${timeout}ms: ${lockPath}`);
        }

        // Wait and retry with jitter to reduce thundering herd
        const delay = LOCK_RETRY_MS + Math.floor(Math.random() * LOCK_RETRY_JITTER_MS);
        await new Promise(resolve => setTimeout(resolve, delay));
      } else {
        // Other error (permission, etc.)
        throw error;
      }
    }
  }

  // Execute function with lock held
  try {
    return await fn();
  } finally {
    // Always release lock
    try {
      await rmdir(lockPath);
    } catch (err) {
      // Ignore cleanup errors - lock might have been removed already
      console.warn('[KanbanLock] Failed to remove lock (may have been removed):', err);
    }
  }
}
