/**
 * aos-anruf-schalter — the „Anrufmodus" switch at the top of the settings
 * section „Allgemein" (INT-2026-025, FA-01, FA-28; Mock §1).
 *
 * One sentence, the switch, and — when it cannot be turned on — the reason
 * with the next step (backend reason, other device, microphone, voice).
 * Turning off is always possible. Light DOM (inside aos-settings-view →
 * aos-projekt-seite → aos-app, all Light DOM) — styles in theme.css under
 * `aos-app .anruf-schalter*`.
 */

import { LitElement, html, nothing } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { anrufService, schalterSperrgrund, type AnrufAnsicht, type AnrufClientService } from '../../services/anruf.service.js';

@customElement('aos-anruf-schalter')
export class AosAnrufSchalter extends LitElement {
  @property({ attribute: false }) dienst: AnrufClientService = anrufService;

  @state() private a: AnrufAnsicht | null = null;
  @state() private busy = false;
  private abmelden: (() => void) | null = null;

  protected override createRenderRoot(): HTMLElement {
    return this;
  }

  override connectedCallback(): void {
    super.connectedCallback();
    this.abmelden = this.dienst.subscribe((a) => {
      this.a = a;
    });
  }

  override disconnectedCallback(): void {
    super.disconnectedCallback();
    this.abmelden?.();
    this.abmelden = null;
  }

  override render() {
    const m = this.a?.modus;
    const an = m?.an ?? false;
    const grund = m ? schalterSperrgrund(m) : null;
    const bekannt = m?.bekannt ?? false;
    const gesperrt = this.busy || !bekannt || (!an && grund !== null);
    return html`
      <div class="anruf-schalter">
        <div class="anruf-schalter-zeile">
          <div class="anruf-schalter-text">
            <b id="anruf-schalter-label">Anrufmodus</b>
            <div class="anruf-schalter-satz">Sitzungen rufen an, wenn sie dich brauchen oder fertig sind. Gilt für alle Projekte, nur an diesem Mac.</div>
          </div>
          <button
            type="button"
            role="switch"
            class="anruf-schalter-knopf ${an ? 'an' : ''}"
            aria-checked=${an ? 'true' : 'false'}
            aria-labelledby="anruf-schalter-label"
            title=${gesperrt && grund ? grund : an ? 'Anrufmodus ausschalten' : 'Anrufmodus einschalten'}
            ?disabled=${gesperrt}
            @click=${this.umschalten}
          ></button>
        </div>
        ${!bekannt
          ? html`<div class="anruf-schalter-grund">Verfügbarkeit wird geprüft …</div>`
          : grund
            ? html`<div class="anruf-schalter-grund" role="status">${grund}</div>`
            : nothing}
      </div>
    `;
  }

  private umschalten = async (): Promise<void> => {
    const an = this.a?.modus.an ?? false;
    this.busy = true;
    try {
      await this.dienst.setModus(!an);
    } finally {
      this.busy = false;
    }
  };
}

declare global {
  interface HTMLElementTagNameMap {
    'aos-anruf-schalter': AosAnrufSchalter;
  }
}
