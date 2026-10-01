/**
 * aos-editor-einstellung — „Remote-SSH-Host für VS Code" in the settings
 * section „Allgemein" (INT-2026-028, AK-04).
 *
 * Empty = the UI runs on the browser's machine → local `vscode://file` links;
 * on the cloud host: the SSH alias the user's machine knows it by. Stored by
 * the backend in `<runtime>/editor-<port>.json` (never in the repo). Validated
 * with the shared REMOTE_SSH_HOST_REGEX before sending. Shows a hint when the
 * stored file was unreadable (`lesefehler`), so the cloud UI never falls back
 * to local links unnoticed. Light DOM like aos-settings-view — reuses its
 * `provider-card` / `form-field` / `save-btn` classes from theme.css.
 */

import { LitElement, html, nothing } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { editorLinkService, type EditorLinkService } from '../../services/editor-link.service.js';
import { REMOTE_SSH_HOST_REGEX, type EditorConfig } from '../../../../src/shared/types/editor.protocol.js';

type EditorEinstellungQuelle = Pick<EditorLinkService, 'get' | 'getFehler' | 'subscribe' | 'ensureLoaded' | 'update'>;

export const EDITOR_HOST_UNGUELTIG =
  'Nur SSH-Kürzel oder user@host: Buchstaben, Ziffern, . _ @ -, ohne Leerzeichen und ohne Port.';
export const EDITOR_LESEFEHLER = 'Gespeicherter Wert unlesbar — bitte neu eintragen.';

@customElement('aos-editor-einstellung')
export class AosEditorEinstellung extends LitElement {
  @property({ attribute: false }) quelle: EditorEinstellungQuelle = editorLinkService;

  @state() private config: EditorConfig | null = null;
  @state() private eingabe = '';
  @state() private fehler: string | null = null;
  @state() private speichert = false;
  private abmelden: (() => void) | null = null;

  protected override createRenderRoot(): HTMLElement {
    return this;
  }

  override connectedCallback(): void {
    super.connectedCallback();
    this.uebernehmen(this.quelle.get());
    this.abmelden = this.quelle.subscribe((c) => this.uebernehmen(c));
    this.quelle.ensureLoaded();
  }

  override disconnectedCallback(): void {
    super.disconnectedCallback();
    this.abmelden?.();
    this.abmelden = null;
  }

  private uebernehmen(config: EditorConfig | null): void {
    const serverFehler = this.quelle.getFehler();
    if (serverFehler && this.speichert) {
      this.speichert = false;
      this.fehler = serverFehler;
      return;
    }
    if (!config) return;
    this.config = config;
    this.eingabe = config.remoteSshHost;
    this.speichert = false;
  }

  private speichern(wert: string): void {
    const host = wert.trim();
    if (host !== '' && !REMOTE_SSH_HOST_REGEX.test(host)) {
      this.fehler = EDITOR_HOST_UNGUELTIG;
      return;
    }
    this.fehler = null;
    this.speichert = true;
    this.quelle.update(host);
  }

  override render() {
    const geladen = this.config !== null;
    const gespeichert = this.config?.remoteSshHost ?? '';
    const unveraendert = this.eingabe.trim() === gespeichert && !this.config?.lesefehler;
    return html`
      <div class="provider-card editor-einstellung">
        <div class="form-field">
          <label for="editor-remote-host-input">Remote-SSH-Host für VS Code</label>
          <span class="form-hint">Leer lassen, wenn die UI auf diesem Rechner läuft. Auf dem Cloud-Host: das SSH-Kürzel, unter dem dein Rechner ihn kennt (Port in der ~/.ssh/config, nicht hier).</span>
          <div class="general-input-row">
            <input
              id="editor-remote-host-input"
              type="text"
              autocomplete="off"
              spellcheck="false"
              .value=${this.eingabe}
              @input=${(e: Event) => {
                this.eingabe = (e.target as HTMLInputElement).value;
                this.fehler = null;
              }}
              @keydown=${(e: KeyboardEvent) => {
                if (e.key === 'Enter') this.speichern(this.eingabe);
              }}
              ?disabled=${!geladen || this.speichert}
              placeholder=${geladen ? 'leer = lokal' : 'Lädt …'}
            />
            <button
              class="save-btn editor-speichern"
              @click=${() => this.speichern(this.eingabe)}
              ?disabled=${!geladen || this.speichert || unveraendert}
            >
              ${this.speichert ? 'Speichert …' : 'Speichern'}
            </button>
            <button
              class="save-btn editor-leeren"
              @click=${() => {
                this.eingabe = '';
                this.speichern('');
              }}
              ?disabled=${!geladen || this.speichert || (gespeichert === '' && !this.config?.lesefehler)}
            >
              Leeren
            </button>
          </div>
          ${this.fehler
            ? html`<div class="form-error editor-fehler" role="alert">${this.fehler}</div>`
            : this.config?.lesefehler
              ? html`<div class="form-error editor-lesefehler" role="status">${EDITOR_LESEFEHLER}</div>`
              : nothing}
        </div>
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'aos-editor-einstellung': AosEditorEinstellung;
  }
}
