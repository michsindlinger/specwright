/**
 * INT-2026-020: an image pasted on „Neue Absicht" before any session exists.
 * Handler `vorhaben:absicht-bild` (AK-01, AK-04, RB-01): the project must be
 * open, `base64`/`mimeType` must be strings, validation and write are the
 * Cloud Terminal's (`utils/paste-image.ts`), the reply carries the absolute
 * path. The file lives under `<runtime>/intent-paste/`, never under the
 * per-session `paste/` tree a session close removes (AK-07). `pruneOldImages`
 * removes only regular files older than the cut-off, never subdirectories
 * (AK-08, R6).
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, statSync, utimesSync, writeFileSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';

import { VorhabenHandler, type OutboundMessage } from '../../src/server/services/vorhaben-handler.js';
import { INTENT_PASTE_MAX_AGE_MS, pruneOldImages } from '../../src/server/utils/paste-image.js';
import { getIntentPasteImageRoot, getPasteImageRoot, getRuntimeDir } from '../../src/server/utils/runtime-paths.js';
import { CLOUD_TERMINAL_CONFIG } from '../../src/shared/types/cloud-terminal.protocol.js';
import type { VorhabenService } from '../../src/server/services/vorhaben-service.js';
import type { ProjectDocsService } from '../../src/server/services/project-docs.service.js';
import type { VorhabenStateStore } from '../../src/server/services/vorhaben-state.js';

const PNG_BYTES = Buffer.from([
  0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, // PNG signature
  0x00, 0x00, 0x00, 0x0d, 0x49, 0x48, 0x44, 0x52, // IHDR chunk header
]);
const PNG_BASE64 = PNG_BYTES.toString('base64');
const tick = (ms = 5): Promise<void> => new Promise((r) => setTimeout(r, ms));

describe('INT-2026-020 vorhaben:absicht-bild', () => {
  let root: string;
  let bildRoot: string;
  let reply: ReturnType<typeof vi.fn<(m: OutboundMessage) => void>>;
  let handler: VorhabenHandler;

  beforeEach(() => {
    root = mkdtempSync(join(tmpdir(), 'absicht-bild-'));
    bildRoot = join(root, 'intent-paste');
    reply = vi.fn();
    // Only `findProject` is touched by this message — a stub service suffices.
    const service = {
      findProject: (id: string) => (id === 'pa' ? { id: 'pa', path: join(root, 'a'), name: 'A' } : undefined),
    } as unknown as VorhabenService;
    handler = new VorhabenHandler(service, {} as ProjectDocsService, {} as VorhabenStateStore, vi.fn(), { bildRoot });
  });

  afterEach(() => {
    rmSync(root, { recursive: true, force: true });
  });

  const last = (): Record<string, unknown> => reply.mock.calls[reply.mock.calls.length - 1][0] as Record<string, unknown>;
  const filesIn = (dir: string): string[] => (existsSync(dir) ? readdirSync(dir) : []);

  it('AK-01: writes the PNG under bildRoot (0600, .png, bytes unchanged) and replies absicht-bild-saved with the absolute path', async () => {
    handler.handle({ type: 'vorhaben:absicht-bild', requestId: 'r1', projectId: 'pa', base64: PNG_BASE64, mimeType: 'image/png' }, reply);
    await tick(20);
    const saved = last() as { type: string; requestId: string; absolutePath: string };
    expect(saved).toMatchObject({ type: 'vorhaben:absicht-bild-saved', requestId: 'r1' });
    expect(saved.absolutePath.startsWith(bildRoot + '/')).toBe(true);
    expect(saved.absolutePath).toMatch(/\/img-[0-9a-f-]{36}\.png$/);
    expect(readFileSync(saved.absolutePath)).toEqual(PNG_BYTES);
    expect(statSync(saved.absolutePath).mode & 0o777).toBe(0o600);
    expect(statSync(bildRoot).mode & 0o777).toBe(0o700);
  });

  it('AK-04: unsupported MIME → PASTE_IMAGE_UNSUPPORTED_TYPE, oversized → PASTE_IMAGE_TOO_LARGE, empty → PASTE_IMAGE_FAILED; no file is written', async () => {
    handler.handle({ type: 'vorhaben:absicht-bild', requestId: 'r1', projectId: 'pa', base64: PNG_BASE64, mimeType: 'application/octet-stream' }, reply);
    await tick(10);
    expect(last()).toMatchObject({ type: 'vorhaben:error', code: 'PASTE_IMAGE_UNSUPPORTED_TYPE', requestId: 'r1', message: 'Unsupported MIME type: application/octet-stream' });

    const big = Buffer.alloc(CLOUD_TERMINAL_CONFIG.MAX_PASTE_IMAGE_BYTES + 1, 0xff).toString('base64');
    handler.handle({ type: 'vorhaben:absicht-bild', requestId: 'r2', projectId: 'pa', base64: big, mimeType: 'image/png' }, reply);
    await tick(10);
    expect(last()).toMatchObject({ type: 'vorhaben:error', code: 'PASTE_IMAGE_TOO_LARGE', requestId: 'r2' });

    handler.handle({ type: 'vorhaben:absicht-bild', requestId: 'r3', projectId: 'pa', base64: '', mimeType: 'image/png' }, reply);
    await tick(10);
    expect(last()).toMatchObject({ type: 'vorhaben:error', code: 'PASTE_IMAGE_FAILED', requestId: 'r3', message: 'Decoded image is empty' });

    expect(filesIn(bildRoot)).toEqual([]);
  });

  it('RB-01: unknown project → UNKNOWN_PROJECT; missing base64 or mimeType → INVALID_MESSAGE; nothing written', async () => {
    handler.handle({ type: 'vorhaben:absicht-bild', requestId: 'r1', projectId: 'nope', base64: PNG_BASE64, mimeType: 'image/png' }, reply);
    expect(last()).toMatchObject({ type: 'vorhaben:error', code: 'UNKNOWN_PROJECT', requestId: 'r1' });

    handler.handle({ type: 'vorhaben:absicht-bild', requestId: 'r2', projectId: 'pa', mimeType: 'image/png' }, reply);
    expect(last()).toMatchObject({ type: 'vorhaben:error', code: 'INVALID_MESSAGE', requestId: 'r2' });

    handler.handle({ type: 'vorhaben:absicht-bild', requestId: 'r3', projectId: 'pa', base64: PNG_BASE64, mimeType: 42 }, reply);
    expect(last()).toMatchObject({ type: 'vorhaben:error', code: 'INVALID_MESSAGE', requestId: 'r3' });

    await tick(10);
    expect(reply).toHaveBeenCalledTimes(3);
    expect(filesIn(bildRoot)).toEqual([]);
  });

  it('AK-07: the default root is <runtime>/intent-paste, beside — not below — the per-session paste tree; a session-dir removal leaves the file alone', async () => {
    const intentRoot = getIntentPasteImageRoot();
    const sessionRoot = getPasteImageRoot();
    expect(intentRoot).toBe(join(getRuntimeDir(), 'intent-paste'));
    expect(intentRoot.startsWith(sessionRoot)).toBe(false);
    expect(sessionRoot.startsWith(intentRoot)).toBe(false);

    // Same layout inside the temp root: <root>/intent-paste vs <root>/cloud-terminal/paste/<sessionId>
    handler.handle({ type: 'vorhaben:absicht-bild', requestId: 'r1', projectId: 'pa', base64: PNG_BASE64, mimeType: 'image/png' }, reply);
    await tick(20);
    const { absolutePath } = last() as { absolutePath: string };
    const fakeSessionDir = join(root, 'cloud-terminal', 'paste', 'irgendeine-session');
    mkdirSync(fakeSessionDir, { recursive: true });
    rmSync(fakeSessionDir, { recursive: true, force: true }); // what closeSession does
    rmSync(join(root, 'cloud-terminal', 'paste'), { recursive: true, force: true }); // what shutdown does
    expect(existsSync(absolutePath)).toBe(true);
  });

  describe('pruneOldImages (AK-08)', () => {
    const DAY = 24 * 60 * 60 * 1000;
    const ageFile = (path: string, ageMs: number, now: number): void => {
      const t = (now - ageMs) / 1000;
      utimesSync(path, t, t);
    };

    it('removes regular files older than 7 days, keeps younger files and subdirectories, reports the count', async () => {
      const now = Date.now();
      mkdirSync(bildRoot, { recursive: true });
      const old1 = join(bildRoot, 'img-old-1.png');
      const old2 = join(bildRoot, 'img-old-2.jpg');
      const young = join(bildRoot, 'img-young.png');
      const sub = join(bildRoot, 'unterordner');
      const inSub = join(sub, 'img-ancient.png');
      writeFileSync(old1, PNG_BYTES);
      writeFileSync(old2, PNG_BYTES);
      writeFileSync(young, PNG_BYTES);
      mkdirSync(sub);
      writeFileSync(inSub, PNG_BYTES);
      ageFile(old1, 8 * DAY, now);
      ageFile(old2, 7 * DAY + 1000, now);
      ageFile(young, 6 * DAY, now);
      ageFile(inSub, 30 * DAY, now);
      ageFile(sub, 30 * DAY, now);

      const removed = await pruneOldImages(bildRoot, INTENT_PASTE_MAX_AGE_MS, now);

      expect(removed).toBe(2);
      expect(existsSync(old1)).toBe(false);
      expect(existsSync(old2)).toBe(false);
      expect(existsSync(young)).toBe(true);
      expect(existsSync(sub)).toBe(true);
      expect(existsSync(inSub)).toBe(true); // never recursive (R6)
    });

    it('a missing directory counts as nothing to prune (0), no error', async () => {
      await expect(pruneOldImages(join(root, 'gibt-es-nicht'), INTENT_PASTE_MAX_AGE_MS)).resolves.toBe(0);
    });

    it('INTENT_PASTE_MAX_AGE_MS is seven days', () => {
      expect(INTENT_PASTE_MAX_AGE_MS).toBe(7 * DAY);
    });
  });
});
