/**
 * Editor Configuration Storage (INT-2026-028)
 *
 * Persists the Remote-SSH host the „In VS Code öffnen" link uses. Empty host =
 * the UI runs on the browser's machine → local `vscode://file` link; set on the
 * cloud host → `vscode://vscode-remote/ssh-remote+<host>` link.
 *
 * Storage: `<runtime>/editor-<port>.json` (gitignored runtime dir, ADR-0002
 * pattern), NOT ui/config/ — that folder is versioned and the repo is public.
 * Host-wide setting, no project reference. Layout mirrors github-config.ts
 * (file-backed, in-memory cached).
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { dirname } from 'path';
import type { EditorConfig } from '../shared/types/editor.protocol.js';
import { REMOTE_SSH_HOST_REGEX } from '../shared/types/editor.protocol.js';
import { getEditorConfigPath } from './utils/runtime-paths.js';

let cachedConfig: EditorConfig | null = null;

function isStoredConfig(value: unknown): value is { remoteSshHost: string } {
  if (typeof value !== 'object' || value === null) return false;
  const host = (value as { remoteSshHost?: unknown }).remoteSshHost;
  return typeof host === 'string' && (host === '' || REMOTE_SSH_HOST_REGEX.test(host));
}

/**
 * Load the editor config. An unreadable or invalid file yields an empty host
 * plus `lesefehler: true` — otherwise the cloud UI would silently fall back to
 * local links; the settings field shows the flag.
 */
export function loadEditorConfig(): EditorConfig {
  if (cachedConfig) return cachedConfig;

  const path = getEditorConfigPath();
  if (!existsSync(path)) {
    cachedConfig = { remoteSshHost: '' };
    return cachedConfig;
  }
  try {
    const parsed: unknown = JSON.parse(readFileSync(path, 'utf-8'));
    if (!isStoredConfig(parsed)) throw new Error('unexpected content');
    cachedConfig = { remoteSshHost: parsed.remoteSshHost };
  } catch (err) {
    console.warn('[EditorConfig] Failed to read config file, using empty host:', err instanceof Error ? err.message : err);
    cachedConfig = { remoteSshHost: '', lesefehler: true };
  }
  return cachedConfig;
}

/**
 * Persist a new host (trimmed). Empty clears it; anything else must match
 * REMOTE_SSH_HOST_REGEX, otherwise throws without touching the file.
 */
export function updateEditorConfig(host: string): EditorConfig {
  const trimmed = host.trim();
  if (trimmed !== '' && !REMOTE_SSH_HOST_REGEX.test(trimmed)) {
    throw new Error(
      'Ungültiger Remote-SSH-Host. Erlaubt: SSH-Kürzel oder user@host (Buchstaben, Ziffern, . _ @ -), ohne Port.',
    );
  }
  const next: EditorConfig = { remoteSshHost: trimmed };
  const path = getEditorConfigPath();
  const dir = dirname(path);
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
  writeFileSync(path, JSON.stringify(next, null, 2), 'utf-8');
  cachedConfig = next;
  return next;
}

/**
 * WebSocket handler for `settings.editor.get` and `settings.editor.update`.
 * Answers only the sender (`send`); errors become `settings.error`.
 */
export function handleEditorSettingsMessage(
  message: { type: string; [key: string]: unknown },
  send: (response: Record<string, unknown>) => void,
): void {
  const timestamp = new Date().toISOString();
  try {
    if (message.type === 'settings.editor.update') {
      const host = message.remoteSshHost;
      if (typeof host !== 'string') throw new Error('remoteSshHost muss ein Text sein.');
      send({ type: 'settings.editor', config: updateEditorConfig(host), timestamp });
      return;
    }
    send({ type: 'settings.editor', config: loadEditorConfig(), timestamp });
  } catch (error) {
    send({
      type: 'settings.error',
      error: error instanceof Error ? error.message : 'Failed to update editor settings',
      timestamp,
    });
  }
}

/** Test-only: reset the in-memory cache so tests re-read the file. */
export function _resetEditorConfigCacheForTests(): void {
  cachedConfig = null;
}
