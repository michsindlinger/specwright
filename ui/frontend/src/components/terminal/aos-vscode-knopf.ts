/**
 * aos-vscode-knopf — „In VS Code öffnen" for one session (INT-2026-028, AK-01).
 *
 * A plain `vscode://` link to the session's folder; the browser hands it to
 * VS Code. Sits in the tab (aos-terminal-tabs, Light DOM), the session header
 * (aos-terminal-session, Shadow DOM) and the split-pane header
 * (aos-cloud-terminal-sidebar, Light DOM) — hence its own Shadow DOM with
 * `static styles` (theme.css does not reach shadow roots). The rule and the
 * link live in editor-link.ts; this element only renders them.
 *
 * Hidden (host `hidden`) while the host setting is not loaded yet — no wrong
 * local link on the cloud host — or while `vscodeZiel` is null (AK-05). The
 * parent passes a new `session` object on every change, so the link appears
 * as soon as `effectiveCwd` arrives. Size hook: `--vscode-knopf-icon`.
 */

import { LitElement, html, css, nothing, type PropertyValues } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import type { TerminalSession } from './aos-cloud-terminal-sidebar.js';
import { vscodeZiel } from './editor-link.js';
import { editorLinkService, type EditorLinkService } from '../../services/editor-link.service.js';
import type { EditorConfig } from '../../../../src/shared/types/editor.protocol.js';

type EditorLinkQuelle = Pick<EditorLinkService, 'get' | 'subscribe' | 'ensureLoaded'>;

@customElement('aos-vscode-knopf')
export class AosVscodeKnopf extends LitElement {
  static override styles = css`
    :host {
      display: inline-flex;
      align-items: center;
      flex-shrink: 0;
    }
    :host([hidden]) {
      display: none;
    }
    a {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      padding: 2px;
      border-radius: 3px;
      color: var(--text-color-muted, #808080);
      text-decoration: none;
      transition: background 0.2s, color 0.2s;
    }
    a:hover,
    a:focus-visible {
      background: var(--bg-color-hover, #3c3c3c);
      color: var(--text-color-primary, #e0e0e0);
    }
    svg {
      width: var(--vscode-knopf-icon, 14px);
      height: var(--vscode-knopf-icon, 14px);
    }
  `;

  @property({ attribute: false }) session: Pick<TerminalSession, 'status' | 'effectiveCwd'> | null = null;
  @property({ attribute: false }) quelle: EditorLinkQuelle = editorLinkService;

  @state() private config: EditorConfig | null = null;
  private abmelden: (() => void) | null = null;

  override connectedCallback(): void {
    super.connectedCallback();
    this.config = this.quelle.get();
    this.abmelden = this.quelle.subscribe((c) => {
      this.config = c;
    });
    this.quelle.ensureLoaded();
  }

  override disconnectedCallback(): void {
    super.disconnectedCallback();
    this.abmelden?.();
    this.abmelden = null;
  }

  private ziel(): string | null {
    if (!this.config || !this.session) return null;
    return vscodeZiel(this.session, this.config.remoteSshHost);
  }

  protected override willUpdate(_changed: PropertyValues): void {
    this.hidden = this.ziel() === null;
  }

  override render() {
    const href = this.ziel();
    if (!href) return nothing;
    return html`
      <a
        href=${href}
        title="In VS Code öffnen"
        aria-label="In VS Code öffnen"
        @click=${(e: Event) => e.stopPropagation()}
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
          <polyline points="16 18 22 12 16 6"></polyline>
          <polyline points="8 6 2 12 8 18"></polyline>
        </svg>
      </a>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'aos-vscode-knopf': AosVscodeKnopf;
  }
}
