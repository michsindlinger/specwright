/**
 * editor-link.service — the Remote-SSH host for „In VS Code öffnen"
 * (INT-2026-028, AK-03/AK-04). One instance per page like kennungenService:
 * get/subscribe. The value lives in the backend (`<runtime>/editor-<port>.json`,
 * AR-05) and is fetched via `settings.editor.get` on first use and again after
 * every reconnect; `settings.editor` answers (also to an update) set it.
 * No localStorage. Other open browsers see a change after reload/reconnect.
 */

import { gateway, type WebSocketMessage } from '../gateway.js';
import type { EditorConfig } from '../../../src/shared/types/editor.protocol.js';

type EditorConfigListener = (config: EditorConfig | null) => void;

export type EditorGateway = Pick<typeof gateway, 'send' | 'on' | 'off'>;

export class EditorLinkService {
  /** `null` = not loaded yet (the button stays hidden instead of guessing „local"). */
  private config: EditorConfig | null = null;
  private loaded = false;
  /** An update is on its way; a `settings.error` meanwhile belongs to it. */
  private pending = false;
  private fehler: string | null = null;
  private readonly listeners = new Set<EditorConfigListener>();

  constructor(private readonly gw: EditorGateway) {}

  get(): EditorConfig | null {
    return this.config;
  }

  /** Backend rejection of the last update, until the next `settings.editor`. */
  getFehler(): string | null {
    return this.fehler;
  }

  subscribe(cb: EditorConfigListener): () => void {
    this.listeners.add(cb);
    return () => {
      this.listeners.delete(cb);
    };
  }

  /** Idempotent: asks the backend once, then again on every `gateway.connected`. */
  ensureLoaded(): void {
    if (this.loaded) return;
    this.loaded = true;
    this.gw.on('settings.editor', this.onConfig);
    this.gw.on('settings.error', this.onError);
    this.gw.on('gateway.connected', this.request);
    this.request();
  }

  /** Sends `settings.editor.update`; the answer arrives as `settings.editor` (or `settings.error`). */
  update(remoteSshHost: string): void {
    this.ensureLoaded();
    this.pending = true;
    this.gw.send({ type: 'settings.editor.update', remoteSshHost });
  }

  private request = (): void => {
    this.gw.send({ type: 'settings.editor.get' });
  };

  private onConfig = (message: WebSocketMessage): void => {
    const config = message.config as EditorConfig | undefined;
    if (!config || typeof config.remoteSshHost !== 'string') return;
    this.config = config;
    this.pending = false;
    this.fehler = null;
    this.notify();
  };

  private onError = (message: WebSocketMessage): void => {
    if (!this.pending) return;
    this.pending = false;
    this.fehler = typeof message.error === 'string' ? message.error : 'Speichern fehlgeschlagen';
    this.notify();
  };

  private notify(): void {
    for (const cb of this.listeners) cb(this.config);
  }
}

export const editorLinkService = new EditorLinkService(gateway);
