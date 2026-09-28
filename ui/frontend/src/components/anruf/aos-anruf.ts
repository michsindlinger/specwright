/**
 * aos-anruf — the call box of the call mode (INT-2026-025, D11; INT-2026-026,
 * Mock `intent/INT-2026-026-anruf-freihaendig/design/anruf-freihaendig-mock.html`).
 *
 * A view over {@link AnrufClientService}: ringing, reading, listening
 * hands-free (text so far, „Wird gesendet als", closing-phrase hint),
 * microphone closed, plan confirmation, result; another window owning the
 * call shows only a hint. Keyboard (FA-20): every control is a labelled
 * button, no space-bar recording any more (AN-S04). Ringing never takes the
 * focus; with the focus inside the box it moves to the first enabled primary
 * button of the next state.
 *
 * Light DOM (host `aos-app` is Light DOM, `app.ts` createRenderRoot) — styles
 * in theme.css under `aos-app .anruf*`.
 *
 * Events: `glocke-open` { sessionId, terminalSessionId } — „Im Terminal öffnen"
 * reuses the bell's jump (app.ts `_handleGlockeOpen`).
 */

import { LitElement, html, nothing, type PropertyValues } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { ANRUF_ART_LABEL, ANRUF_TEXT, anrufService, type AnrufAnsicht, type AnrufClientService } from '../../services/anruf.service.js';
import type { AnrufMeldung } from '../../../../src/shared/types/anruf.protocol.js';
import type { GlockeOpenDetail } from '../rahmen/aos-glocke.js';

const ART_KLASSE = { rueckfrage: 'r', plan: 'p', fertig: 'f' } as const;

@customElement('aos-anruf')
export class AosAnruf extends LitElement {
  /** The service (tests inject their own). */
  @property({ attribute: false }) dienst: AnrufClientService = anrufService;

  @state() private a: AnrufAnsicht | null = null;
  private abmelden: (() => void) | null = null;
  private letztePhase: AnrufAnsicht['phase'] | undefined;
  /** Focus is (or was, before a re-render removed its button) inside the box. */
  private fokusImKasten = false;

  protected override createRenderRoot(): HTMLElement {
    return this;
  }

  override connectedCallback(): void {
    super.connectedCallback();
    this.abonniere();
  }

  override disconnectedCallback(): void {
    super.disconnectedCallback();
    this.abmelden?.();
    this.abmelden = null;
  }

  protected override willUpdate(changed: PropertyValues<this>): void {
    if (changed.has('dienst') && this.isConnected && changed.get('dienst') !== undefined) this.abonniere();
  }

  private abonniere(): void {
    this.abmelden?.();
    this.abmelden = this.dienst.subscribe((a) => {
      this.a = a;
    });
  }

  protected override updated(): void {
    const phase = this.a?.phase;
    if (!this.a || phase === this.letztePhase) return;
    this.letztePhase = phase;
    // Focus follows the state only when it already was inside the box (no focus theft on ringing).
    if (phase === 'ruhe' || phase === 'ergebnis') {
      this.fokusImKasten = false;
      return;
    }
    const box = this.querySelector('.anruf');
    if (!box || !this.fokusImKasten || phase === 'klingelt') return;
    const ziel =
      box.querySelector<HTMLElement>('button.pri:not([disabled]), button.gef:not([disabled])') ??
      box.querySelector<HTMLElement>('button:not([disabled])') ??
      (box as HTMLElement);
    ziel.focus();
  }

  override render() {
    const a = this.a;
    if (!a || a.phase === 'ruhe') return nothing;
    if (a.phase === 'ergebnis') return this.renderErgebnis(a);
    if (a.zustand === 'offen') return this.renderLeitung(a);
    const m = a.meldung;
    if (!m) return nothing;
    return html`
      <div
        class="anruf anruf-phase-${a.phase}"
        role="region"
        aria-label="Anruf"
        aria-live="polite"
        tabindex="-1"
        @focusin=${this.onFocusin}
        @focusout=${this.onFocusout}
      >
        <div class="anruf-kopf">
          <span class="anruf-art ${ART_KLASSE[m.art]}">${ANRUF_ART_LABEL[m.art]}</span>
          ${a.phase === 'klingelt'
            ? html`<span class="anruf-sub">${m.projektName ?? ''}</span>`
            : html`<span class="anruf-sub">${m.projektName ? `${m.projektName} · ` : ''}„${m.sitzungName}“${m.nurBildschirm ? ' · nur am Bildschirm erkannt' : ''}</span>`}
        </div>
        ${this.renderInhalt(a)}
      </div>
    `;
  }

  private renderInhalt(a: AnrufAnsicht) {
    const m = a.meldung!;
    switch (a.phase) {
      case 'klingelt':
        return html`
          <div class="anruf-titel">Sitzung „${m.sitzungName}“</div>
          ${this.renderWarten(a)}
          <div class="anruf-knoepfe">
            <button type="button" class="pri" @click=${() => this.dienst.annehmen()}>Annehmen</button>
            <button type="button" @click=${() => this.dienst.spaeter()}>Später</button>
            <button type="button" @click=${() => this.dienst.ablehnen()}>Ablehnen</button>
          </div>
        `;
      case 'fremd':
        return html`<div class="anruf-text anruf-andere">${ANRUF_TEXT.andereFenster}</div>`;
      case 'vorlesen':
        if (a.nurTerminal) {
          return html`
            <div class="anruf-text">${a.anzeige}</div>
            ${this.renderHinweis(a)}
            <div class="anruf-knoepfe">
              <button type="button" class="pri" @click=${this.imTerminal}>Im Terminal öffnen</button>
              <button type="button" @click=${() => this.dienst.auflegen()}>Auflegen</button>
            </div>
          `;
        }
        return html`
          ${this.renderText(a)}
          <div class="anruf-hoeren"><span class="anruf-punkt aus" aria-hidden="true"></span><span class="anruf-sub">liest vor … danach hört der Anruf zu</span></div>
          ${this.renderDiktat(a)} ${this.renderHinweis(a)}
          <div class="anruf-knoepfe">
            <button type="button" @click=${() => this.dienst.nochmal()}>Nochmal</button>
            ${m.art === 'plan' ? html`<button type="button" @click=${() => this.dienst.freigebenAnfragen()}>Freigeben …</button>` : nothing}
            <button type="button" @click=${this.imTerminal}>Im Terminal öffnen</button>
            <button type="button" @click=${() => this.dienst.auflegen()}>Auflegen</button>
          </div>
        `;
      case 'zuhoeren':
        if (a.hoertInNachfrage) {
          return html`
            ${this.renderNachfrage(a)}
            <div class="anruf-hoeren"><span class="anruf-punkt puls" aria-hidden="true"></span><b>Ich höre zu</b><span class="anruf-sub">— „ja“ oder „nein“</span></div>
            ${this.renderHinweis(a)} ${this.renderNachfrageKnoepfe()}
          `;
        }
        return html`
          ${m.art === 'rueckfrage' ? this.renderText(a) : a.text || a.erkenntNoch ? nothing : html`<div class="anruf-vorlesen">${a.anzeige ?? ''}</div>`}
          <div class="anruf-hoeren"><span class="anruf-punkt puls" aria-hidden="true"></span><b>Ich höre zu</b></div>
          ${this.renderDiktat(a)} ${this.renderHinweis(a)}
          ${a.hinweis === ANRUF_TEXT.schlussHinweis || a.gehalten ? nothing : html`<div class="anruf-schluss">${this.schlussText(a, m)}</div>`}
          ${this.renderAntwortKnoepfe(a, m, false)}
        `;
      case 'mikrofon_zu': {
        const geraet = a.hinweis === ANRUF_TEXT.mikrofonWeg || a.hinweis === ANRUF_TEXT.mikrofonVerweigert;
        return html`
          ${a.hoertInNachfrage ? this.renderNachfrage(a) : nothing}
          <div class="anruf-hoeren"><span class="anruf-punkt aus" aria-hidden="true"></span><b>${geraet ? a.hinweis : 'Mikrofon aus'}</b></div>
          ${geraet
            ? html`<div class="anruf-sub">Mikrofon anschließen oder freigeben, dann „Zuhören“. Senden, Freigeben und Auflegen gehen per Knopf.</div>`
            : nothing}
          ${this.renderDiktat(a)} ${geraet ? nothing : this.renderHinweis(a)}
          ${a.hoertInNachfrage ? this.renderNachfrageKnoepfe(true) : this.renderAntwortKnoepfe(a, m, true)}
        `;
      }
      case 'nachfrage':
        return html`${this.renderNachfrage(a)} ${this.renderHinweis(a)} ${this.renderNachfrageKnoepfe()}`;
      case 'sendet':
        return html`<div class="anruf-hoeren"><b>Wird gesendet …</b></div>`;
      default:
        return nothing;
    }
  }

  private renderText(a: AnrufAnsicht) {
    const m = a.meldung!;
    const frage = m.art === 'rueckfrage' ? m.fragen?.[a.frageIndex] : undefined;
    if (frage) {
      const anzahl = m.fragen?.length ?? 1;
      return html`<div class="anruf-text anruf-frage">
        ${anzahl > 1 ? html`<div class="anruf-sub">Frage ${a.frageIndex + 1} von ${anzahl}</div>` : nothing}
        <div>Frage: ${frage.frage}</div>
        ${frage.optionen.map((o, i) => html`<div class="anruf-opt"><b>${i + 1}</b>${o}</div>`)}
        <div class="anruf-opt anruf-eigene">oder eine eigene Antwort</div>
      </div>`;
    }
    return html`<div class="anruf-text">${a.anzeige ?? ''}${a.gekuerzt ? html` <span class="anruf-gekuerzt">(gekürzt)</span>` : nothing}</div>`;
  }

  private renderHinweis(a: AnrufAnsicht) {
    return a.hinweis ? html`<div class="anruf-hinweis" role="status">${a.hinweis}</div>` : nothing;
  }

  private renderDiktat(a: AnrufAnsicht) {
    if (!a.text && !a.erkenntNoch) return nothing;
    return html`<div class="anruf-diktat">${a.text ?? ''}${a.erkenntNoch ? html` <span class="anruf-noch">… wird erkannt</span>` : nothing}</div>
      ${a.als ? html`<div class="anruf-als">Wird gesendet als: <b>${a.als}</b></div>` : nothing}`;
  }

  private schlussText(a: AnrufAnsicht, m: AnrufMeldung) {
    if (m.art === 'plan') {
      return html`<b>„freigeben“</b> gibt frei (mit Nachfrage) · ein Wunsch mit <b>„Antwort senden“</b> geht als Überarbeitung`;
    }
    if (a.weiter) return html`<b>„Antwort senden“</b> führt zur nächsten Frage — gesendet wird nach der letzten`;
    return html`Zum Senden: <b>„Antwort senden“</b>${a.text ? nothing : ' · 20 s Stille legen auf'}`;
  }

  /** Buttons while listening or with the microphone closed (FA-20, FA-21). */
  private renderAntwortKnoepfe(a: AnrufAnsicht, m: AnrufMeldung, zu: boolean) {
    const hatText = !!a.text;
    return html`
      <div class="anruf-knoepfe">
        ${zu ? html`<button type="button" class="pri" @click=${() => this.dienst.zuhoeren()}>Zuhören</button>` : nothing}
        <button type="button" class=${hatText && !zu ? 'pri' : ''} ?disabled=${!hatText} @click=${() => this.dienst.senden()}>
          ${a.weiter ? 'Weiter' : 'Senden'}
        </button>
        ${hatText ? html`<button type="button" @click=${() => this.dienst.verwerfen()}>Verwerfen</button>` : nothing}
        ${zu ? nothing : html`<button type="button" @click=${() => this.dienst.nochmal()}>Nochmal</button>`}
        ${m.art === 'plan' ? html`<button type="button" @click=${() => this.dienst.freigebenAnfragen()}>Freigeben …</button>` : nothing}
        <button type="button" @click=${this.imTerminal}>Im Terminal öffnen</button>
        <button type="button" @click=${() => this.dienst.auflegen()}>Auflegen</button>
      </div>
    `;
  }

  private renderNachfrage(a: AnrufAnsicht) {
    const m = a.meldung!;
    return html`
      <div class="anruf-text"><b>Plan für Sitzung „${m.sitzungName}“ wirklich freigeben?</b><br />Sag ja oder nein.</div>
      ${a.freigabeWortlaut
        ? html`<div class="anruf-als">Freigabe wählt im Plan-Dialog „${a.freigabeWortlaut}“${/BYPASS PERMISSIONS/i.test(a.freigabeWortlaut)
            ? ' — danach keine weiteren Rückfragen zu Berechtigungen in dieser Sitzung'
            : ''}.</div>`
        : nothing}
    `;
  }

  private renderNachfrageKnoepfe(zu = false) {
    return html`
      <div class="anruf-knoepfe">
        ${zu ? html`<button type="button" class="pri" @click=${() => this.dienst.zuhoeren()}>Zuhören</button>` : nothing}
        <button type="button" class="gef" @click=${() => this.dienst.freigeben()}>Freigeben</button>
        <button type="button" @click=${() => this.dienst.nein()}>Nein</button>
        <button type="button" @click=${() => this.dienst.auflegen()}>Auflegen</button>
      </div>
    `;
  }

  /** INT-2026-027: open line after „Gesendet" — microphone off, only „Auflegen" (AK-01). */
  private renderLeitung(a: AnrufAnsicht) {
    const l = a.leitung;
    return html`
      <div class="anruf anruf-phase-${a.phase}" role="region" aria-label="Anruf" aria-live="polite" tabindex="-1" @focusin=${this.onFocusin} @focusout=${this.onFocusout}>
        ${a.phase !== 'leitung' || !l
          ? html`<div class="anruf-text anruf-andere">${ANRUF_TEXT.leitungAndereFenster}</div>`
          : html`
              <div class="anruf-titel">Leitung offen — wartet auf „${l.sitzungName}“ …</div>
              ${l.projektName ? html`<div class="anruf-sub">${l.projektName}</div>` : nothing}
              ${a.ergebnis?.ok ? html`<div class="anruf-ergebnis ok anruf-leitung-ergebnis">✓ ${a.ergebnis.text}</div>` : nothing}
              <div class="anruf-hoeren"><span class="anruf-punkt aus" aria-hidden="true"></span><span class="anruf-sub">Mikrofon aus</span></div>
              ${this.renderWarten(a)}
              <div class="anruf-knoepfe">
                <button type="button" @click=${() => this.dienst.auflegen()}>Auflegen</button>
              </div>
            `}
      </div>
    `;
  }

  private renderWarten(a: AnrufAnsicht) {
    if (a.wartend <= 0) return nothing;
    return html`<div class="anruf-warten">noch ${a.wartend} ${a.wartend === 1 ? 'wartet' : 'warten'}</div>`;
  }

  private renderErgebnis(a: AnrufAnsicht) {
    const e = a.ergebnis;
    if (!e) return nothing;
    return html`
      <div class="anruf anruf-ergebnis-box" role="status" aria-live="polite">
        <div class="anruf-ergebnis ${e.ok ? 'ok' : 'no'}">${e.ok ? html`✓ ${e.text}` : e.glocke || e.leitung ? e.text : html`Nicht gesendet: ${e.text}`}</div>
        ${e.glocke ? html`<div class="anruf-sub">Meldung bleibt in der Glocke</div>` : nothing}
        ${e.ok && a.wartend > 0 ? html`<div class="anruf-sub">nächster Anruf in Kürze · ${this.renderWartenText(a.wartend)}</div>` : nothing}
      </div>
    `;
  }

  private renderWartenText(n: number): string {
    return `noch ${n} ${n === 1 ? 'wartet' : 'warten'}`;
  }

  private imTerminal = (): void => {
    const id = this.a?.meldung?.sessionId;
    if (!id) return;
    this.dispatchEvent(
      new CustomEvent<GlockeOpenDetail>('glocke-open', { bubbles: true, composed: true, detail: { sessionId: id, terminalSessionId: id } })
    );
  };

  private onFocusin = (): void => {
    this.fokusImKasten = true;
  };

  /** A button removed by the re-render leaves without a target — that keeps the flag. */
  private onFocusout = (e: FocusEvent): void => {
    const nach = e.relatedTarget;
    if (nach instanceof Node && !this.contains(nach)) this.fokusImKasten = false;
  };
}

declare global {
  interface HTMLElementTagNameMap {
    'aos-anruf': AosAnruf;
  }
}
