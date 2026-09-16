/**
 * aos-kopfzeile — the whole app frame after INT-2026-010 (FA-07, FA-09): one
 * header line with the page title in grey on the left and, on the right, the
 * connection hint (text only, no control — spec §4 „Verbindung weg"), the
 * bell, the project symbol and — on the phone — the terminal symbol. Nothing
 * else: EK-02 counts the controls. Light DOM, styles in theme.css `.kopfzeile*`.
 *
 * Events: `glocke-open`, `glocke-sound` (bubbling from `aos-glocke`),
 * `terminal-toggle` (phone). The project symbol navigates itself.
 */

import { LitElement, html, nothing } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import { routerService } from '../../services/router.service.js';
import type { BellRow } from '../terminal/agent-notifications.js';
import type { GlockeSession } from './aos-glocke.js';
import './aos-glocke.js';

@customElement('aos-kopfzeile')
export class AosKopfzeile extends LitElement {
  @property({ type: String }) titel = '';
  @property({ type: Boolean }) mobile = false;
  @property({ type: Boolean }) reconnecting = false;
  /** Terminal sidebar is open — the terminal symbol shows it as active (phone). */
  @property({ type: Boolean }) terminalOffen = false;
  @property({ attribute: false }) glockeRows: BellRow[] = [];
  @property({ attribute: false }) glockeSessions: GlockeSession[] = [];
  @property({ attribute: false }) projectNames: Record<string, string> = {};

  protected override createRenderRoot(): HTMLElement {
    return this;
  }

  private toProjekt(): void {
    routerService.navigate('projekt');
  }

  private terminalToggle(): void {
    this.dispatchEvent(new CustomEvent('terminal-toggle', { bubbles: true, composed: true }));
  }

  override render() {
    const projektAktiv = routerService.getCurrentRoute()?.view === 'projekt';
    return html`
      <header class="kopfzeile">
        <span class="kopfzeile-titel">${this.titel}</span>
        <div class="kopfzeile-rechts">
          ${this.reconnecting ? html`<span class="kopfzeile-verbindung" role="status">Verbindung …</span>` : nothing}
          <aos-glocke .rows=${this.glockeRows} .sessions=${this.glockeSessions} .projectNames=${this.projectNames}></aos-glocke>
          <button
            type="button"
            class="kopfzeile-btn kopfzeile-projekt ${projektAktiv ? 'aktiv' : ''}"
            title="Projekt"
            aria-label="Projekt"
            @click=${this.toProjekt}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
              <path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
            </svg>
          </button>
          ${this.mobile
            ? html`<button
                type="button"
                class="kopfzeile-btn kopfzeile-terminal ${this.terminalOffen ? 'aktiv' : ''}"
                title="Terminal"
                aria-label="Terminal"
                @click=${this.terminalToggle}
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                  <rect x="2" y="3" width="20" height="14" rx="2" ry="2"></rect>
                  <line x1="8" y1="21" x2="16" y2="21"></line>
                  <line x1="12" y1="17" x2="12" y2="21"></line>
                </svg>
              </button>`
            : nothing}
        </div>
      </header>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'aos-kopfzeile': AosKopfzeile;
  }
}
