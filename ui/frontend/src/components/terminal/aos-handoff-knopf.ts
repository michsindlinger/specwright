/**
 * aos-handoff-knopf — „Handoff" for one Claude session (INT-2026-038, FA-01).
 *
 * A click asks the backend to type `/handoff-weiter` (`vorhaben:handoff.start`);
 * the backend runs the whole switch and reports a refusal above the terminal
 * (`session.notice`). Sits next to aos-vscode-knopf in the session header
 * (Shadow DOM) and the split-pane header — hence its own Shadow DOM with
 * `static styles` (theme.css does not reach shadow roots).
 *
 * Hidden unless the session is active, not a shell and has a known agent
 * status (hooks run only in Claude sessions, NZ-06). Locked („Wechsel läuft …")
 * while the backend broadcast lists the session in `handoffWechsel` (AR-05).
 */

import { LitElement, html, css, nothing, type PropertyValues } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import type { TerminalSession } from './aos-cloud-terminal-sidebar.js';
import { vorhabenService, type VorhabenClientService } from '../../services/vorhaben.service.js';
import type { VorhabenState } from '../../../../src/shared/types/vorhaben.protocol.js';

type HandoffQuelle = Pick<VorhabenClientService, 'subscribe' | 'handoffStarten'>;

@customElement('aos-handoff-knopf')
export class AosHandoffKnopf extends LitElement {
  static override styles = css`
    :host {
      display: inline-flex;
      align-items: center;
      flex-shrink: 0;
    }
    :host([hidden]) {
      display: none;
    }
    button {
      padding: 1px 6px;
      border: 1px solid var(--border-color, #3c3c3c);
      border-radius: 3px;
      background: transparent;
      color: var(--text-color-primary, #e0e0e0);
      font: inherit;
      font-size: 11px;
      cursor: pointer;
      transition: background 0.2s;
    }
    button:hover:not(:disabled),
    button:focus-visible {
      background: var(--bg-color-hover, #3c3c3c);
    }
    button:disabled {
      color: var(--text-color-muted, #6a6a6a);
      cursor: default;
    }
  `;

  @property({ attribute: false }) session: Pick<TerminalSession, 'id' | 'status' | 'terminalType' | 'agentStatus'> | null = null;
  @property({ attribute: false }) quelle: HandoffQuelle = vorhabenService;

  @state() private laufend: readonly string[] = [];
  private abmelden: (() => void) | null = null;

  override connectedCallback(): void {
    super.connectedCallback();
    this.abmelden = this.quelle.subscribe((s: VorhabenState | null) => {
      this.laufend = s?.handoffWechsel ?? [];
    });
  }

  override disconnectedCallback(): void {
    super.disconnectedCallback();
    this.abmelden?.();
    this.abmelden = null;
  }

  private sichtbar(): boolean {
    const s = this.session;
    return !!s && s.status === 'active' && s.terminalType !== 'shell' && !!s.agentStatus && s.agentStatus !== 'unknown';
  }

  protected override willUpdate(_changed: PropertyValues): void {
    this.hidden = !this.sichtbar();
  }

  private klick(e: Event): void {
    e.stopPropagation();
    if (!this.session) return;
    // The reason of a refusal comes as a notice above the terminal (FA-03).
    this.quelle.handoffStarten(this.session.id).catch((err: unknown) => console.warn('[handoff]', err));
  }

  override render() {
    if (!this.sichtbar() || !this.session) return nothing;
    const gesperrt = this.laufend.includes(this.session.id);
    return html`
      <button
        type="button"
        ?disabled=${gesperrt}
        title=${gesperrt ? 'Wechsel läuft …' : 'Handoff schreiben, Sitzung leeren, Handoff einlesen'}
        @click=${this.klick}
      >${gesperrt ? 'Wechsel läuft …' : 'Handoff'}</button>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'aos-handoff-knopf': AosHandoffKnopf;
  }
}
