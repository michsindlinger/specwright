/**
 * Pasted-image persistence shared by the Cloud Terminal (`savePastedImage`)
 * and „Neue Absicht" (`vorhaben:absicht-bild`, INT-2026-020).
 *
 * One MIME allowlist, one size limit, one write path — both callers validate
 * and persist through `persistPastedImage()`; only the *destination* directory
 * and what happens with the path afterwards differ (PTY injection vs. reply
 * to the browser). The allowlist and the byte limit come from
 * `cloud-terminal.protocol.ts` so there is exactly one source of truth (RB-04).
 */

import * as fs from 'fs';
import * as path from 'path';
import { randomUUID } from 'crypto';
import {
  CLOUD_TERMINAL_CONFIG,
  CLOUD_TERMINAL_ERROR_CODES,
} from '../../shared/types/cloud-terminal.protocol.js';

/** MIME type → filename extension for pasted-image persistence */
export const PASTE_MIME_TO_EXT: ReadonlyMap<string, string> = new Map([
  ['image/png', 'png'],
  ['image/jpeg', 'jpg'],
  ['image/gif', 'gif'],
  ['image/webp', 'webp'],
  ['image/heic', 'heic'],
  ['image/heif', 'heif'],
]);

/** Error thrown by persistPastedImage / savePastedImage; carries a CLOUD_TERMINAL_ERROR_CODES value */
export class PasteImageError extends Error {
  constructor(public code: string, message: string) {
    super(message);
    this.name = 'PasteImageError';
  }
}

/**
 * Images pasted on „Neue Absicht" belong to no session yet, so no session end
 * removes them. They are pruned on backend start once older than this (AK-08,
 * ADR-0005).
 */
export const INTENT_PASTE_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;

/**
 * Validate a base64-encoded image and write it to `dir` as `img-<uuid>.<ext>`.
 *
 * Order of checks and error codes are the Cloud Terminal's (unchanged):
 * MIME not in the allowlist → PASTE_IMAGE_UNSUPPORTED_TYPE; decoded buffer
 * empty → PASTE_IMAGE_FAILED; larger than MAX_PASTE_IMAGE_BYTES →
 * PASTE_IMAGE_TOO_LARGE. The extension always comes from the allowlist map,
 * never from the client. Directory is created 0700, file written 0600.
 *
 * @returns the absolute path of the written file
 * @throws PasteImageError on any validation failure
 */
export async function persistPastedImage(
  dir: string,
  base64: string,
  mimeType: string,
): Promise<string> {
  const ext = PASTE_MIME_TO_EXT.get(mimeType);
  if (!ext) {
    throw new PasteImageError(
      CLOUD_TERMINAL_ERROR_CODES.PASTE_IMAGE_UNSUPPORTED_TYPE,
      `Unsupported MIME type: ${mimeType}`,
    );
  }

  const buf = Buffer.from(base64, 'base64');
  if (buf.length === 0) {
    throw new PasteImageError(
      CLOUD_TERMINAL_ERROR_CODES.PASTE_IMAGE_FAILED,
      'Decoded image is empty',
    );
  }
  if (buf.length > CLOUD_TERMINAL_CONFIG.MAX_PASTE_IMAGE_BYTES) {
    throw new PasteImageError(
      CLOUD_TERMINAL_ERROR_CODES.PASTE_IMAGE_TOO_LARGE,
      `Image too large: ${buf.length} bytes`,
    );
  }

  await fs.promises.mkdir(dir, { recursive: true, mode: 0o700 });
  const absolutePath = path.join(dir, `img-${randomUUID()}.${ext}`);
  await fs.promises.writeFile(absolutePath, buf, { mode: 0o600 });
  return absolutePath;
}

/**
 * Delete regular files directly inside `dir` whose mtime is older than
 * `maxAgeMs`. Never recursive: subdirectories and anything below them are
 * left alone (R6). A missing directory counts as "nothing to prune".
 *
 * Per-file errors are logged and skipped so one stuck file cannot abort the
 * sweep — and the caller (backend boot) never fails because of it.
 *
 * @returns number of files removed
 */
export async function pruneOldImages(
  dir: string,
  maxAgeMs: number,
  now: number = Date.now(),
): Promise<number> {
  let entries: fs.Dirent[];
  try {
    entries = await fs.promises.readdir(dir, { withFileTypes: true });
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === 'ENOENT') return 0;
    throw err;
  }

  const cutoff = now - maxAgeMs;
  let removed = 0;
  for (const entry of entries) {
    if (!entry.isFile()) continue;
    const filePath = path.join(dir, entry.name);
    try {
      const stat = await fs.promises.stat(filePath);
      if (stat.mtimeMs < cutoff) {
        await fs.promises.rm(filePath, { force: true });
        removed++;
      }
    } catch (err) {
      console.warn(`[paste-image] Failed to prune ${filePath}:`, err);
    }
  }
  return removed;
}
