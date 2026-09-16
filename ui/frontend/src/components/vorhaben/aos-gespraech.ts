/**
 * aos-gespraech — the Gespräch of the session assigned to a Vorhaben
 * (INT-2026-007, mock 08): head (session name, working copy, state, „Im
 * Terminal öffnen ↗" → the existing `open-terminal-session`), the Verlauf
 * with auto-scroll and a „neuer Beitrag" hint when scrolled up, the input.
 * Subscribes to the session's Gespräch via gespraechService (FA-01/FA-02);
 * follows the assigned session when it changes (AN-S04). Queued protocol
 * entries that have no Beitrag yet show at the end (AN-S09, E15). Light DOM
 * (styles in theme.css under `.gespraech`, R-10 alternative table).
 * Not rendered on the phone (NZ-01).
 */

import { LitElement, html, nothing, type PropertyValues } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import type { Beitrag, GespraechSnapshot } from '../../../../src/shared/types/gespraech.protocol.js';
import { GESPRAECH_GRUND_TEXT } from '../../../../src/shared/types/gespraech.protocol.js';
import type { ProtokollEintrag, VorhabenNextStep, VorhabenPendingIntent, VorhabenRow, VorhabenSessionRef, VorhabenZustand } from '../../../../src/shared/types/vorhaben.protocol.js';
import { gespraechService } from '../../services/gespraech.service.js';
import { DIALOG_KIND_LABELS, clockOf } from './aos-gespraech-beitrag.js';
import type { EingabeModus } from './aos-gespraech-eingabe.js';
import { formatClock } from './vorhaben-sort.js';
import './aos-gespraech-beitrag.js';
import './aos-gespraech-eingabe.js';

/** Width of the Gespräch column on the Mac (plan §3 A.9: 420–540 px). */
export const GESPRAECH_BREITE = 'clamp(420px, 34vw, 540px)';

/**
 * What the Gespräch needs from its owner — a Vorhaben row or (INT-2026-008)
 * a pending `/intent` session without a folder. A `VorhabenRow` satisfies it
 * structurally; `gespraechZiel` builds it from either source.
 */
export interface GespraechZiel {
  projectId: string;
  /** Absent for a pending `/intent` session — sends are addressed by session then. */
  intentId?: string;
  session?: VorhabenSessionRef;
  arbeitskopie: string;
  zustand: VorhabenZustand;
  nextStep?: VorhabenNextStep;
  /** INT-2026-010 (FA-21): a live session works or waits — the next step cannot start now. */
  sessionBusy?: boolean;
  lastChangedMs: number;
  /** True for a pending `/intent` session: the Vorhaben page opens once the folder exists. */
  entsteht?: boolean;
}

/** Zustand of a pending session from its live status (plan §3.6). */
function zustandOf(s: VorhabenSessionRef): VorhabenZustand {
  if (s.ended) return 'sitzung_beendet';
  switch (s.agentStatus) {
    case 'blocked':
      return s.blockKind === 'rueckfrage' ? 'wartet_rueckfrage' : s.blockKind === 'plan' ? 'wartet_plan' : 'wartet_berechtigung';
    case 'working':
      return 'arbeitet';
    default:
      return 'wartet';
  }
}

/** The row wins when both are given; null without either. */
export function gespraechZiel(row: VorhabenRow | undefined, pending: VorhabenPendingIntent | undefined): GespraechZiel | null {
  if (row) return row;
  if (!pending) return null;
  return {
    projectId: pending.projectId,
    session: pending.session,
    arbeitskopie: pending.arbeitskopie,
    zustand: zustandOf(pending.session),
    lastChangedMs: Date.parse(pending.since) || 0,
    entsteht: true,
  };
}

export interface EingabeZustand {
  modus: EingabeModus;
  /** Reason shown when locked; hint under „Einreihen". */
  grund: string;
  /** Offer the next step button (session ended / none). */
  nextStep: boolean;
  /** Offer „Im Terminal öffnen" next to the reason. */
  terminal: boolean;
}

/**
 * Client-side mirror of the backend send rules (FA-06, FA-15; plan §3 A.7):
 * waits → senden; works → einreihen; dialog open, ended, none, or no Gespräch → locked with reason.
 */
export function eingabeZustand(row: GespraechZiel, snapshot: GespraechSnapshot | null): EingabeZustand {
  const s = row.session;
  if (!s || row.zustand === 'keine_sitzung') return { modus: 'gesperrt', grund: GESPRAECH_GRUND_TEXT.keine_sitzung, nextStep: !!row.nextStep, terminal: false };
  if (s.ended || row.zustand === 'sitzung_beendet' || snapshot?.sitzung === 'beendet' || s.agentStatus === 'error') {
    return { modus: 'gesperrt', grund: GESPRAECH_GRUND_TEXT.beendet, nextStep: !!row.nextStep, terminal: false };
  }
  if (snapshot?.verlauf.status === 'nicht_verfuegbar') return { modus: 'gesperrt', grund: 'kein Gespräch — im Terminal öffnen', nextStep: false, terminal: true };
  if (s.agentStatus === 'blocked' || snapshot?.offenerDialog) {
    const kind = s.blockKind ?? 'unbekannt';
    const grund = kind === 'rueckfrage' ? GESPRAECH_GRUND_TEXT.rueckfrage_offen : kind === 'plan' ? GESPRAECH_GRUND_TEXT.plan_offen : GESPRAECH_GRUND_TEXT.berechtigung;
    return { modus: 'gesperrt', grund, nextStep: false, terminal: true };
  }
  if (s.agentStatus === 'working') return { modus: 'einreihen', grund: 'Sitzung arbeitet — Eingabe reiht sich ein', nextStep: false, terminal: false };
  return { modus: 'senden', grund: '', nextStep: false, terminal: false };
}

export interface KopfZustand {
  label: string;
  /** dot class: acc (waits) · ok (works) · warn (dialog) · mute (ended / unknown) */
  ton: 'acc' | 'ok' | 'warn' | 'mute';
}

/** State line of the head (FA-01/FA-09): what the session does right now. */
export function kopfZustand(row: GespraechZiel, snapshot: GespraechSnapshot | null): KopfZustand {
  const s = row.session;
  if (!s) return { label: 'keine Sitzung', ton: 'mute' };
  if (s.ended || snapshot?.sitzung === 'beendet' || row.zustand === 'sitzung_beendet') {
    return { label: `Sitzung beendet${row.lastChangedMs ? ` ${formatClock(row.lastChangedMs)}` : ''}`, ton: 'mute' };
  }
  switch (s.agentStatus) {
    case 'working':
      return { label: 'arbeitet', ton: 'ok' };
    case 'blocked':
      return { label: `wartet · ${DIALOG_KIND_LABELS[s.blockKind ?? 'unbekannt']}`, ton: 'warn' };
    case 'idle':
    case 'done':
      return { label: 'wartet', ton: 'acc' };
    case 'error':
      return { label: 'Fehler', ton: 'mute' };
    default:
      return { label: 'Zustand unbekannt', ton: 'mute' };
  }
}

/** Queued / unconfirmed free texts of this Vorhaben's session that have no Beitrag yet (AN-S09). */
export function pendingAsBeitraege(protocol: ProtokollEintrag[], sessionId: string): Array<{ beitrag: Beitrag; entryId: string }> {
  return protocol
    .filter((e) => e.sessionId === sessionId && e.art === 'freitext' && (e.status === 'eingereiht' || e.status === 'nicht_bestaetigt'))
    .sort((a, b) => (a.sentAt < b.sentAt ? -1 : a.sentAt > b.sentAt ? 1 : 0))
    .map((e) => ({ entryId: e.id, beitrag: { id: `protokoll:${e.id}`, at: e.sentAt, art: 'nutzer', text: e.text, quelle: 'ui', status: e.status === 'eingereiht' ? 'eingereiht' : 'nicht_bestaetigt' } }));
}

@customElement('aos-gespraech')
export class AosGespraech extends LitElement {
  @property({ attribute: false }) row: VorhabenRow | undefined = undefined;
  /** INT-2026-008: a pending `/intent` session shown on the project page before its folder exists. */
  @property({ attribute: false }) pending: VorhabenPendingIntent | undefined = undefined;
  /** Protocol entries of this Vorhaben / session (queued texts are shown at the end). */
  @property({ attribute: false }) protocol: ProtokollEintrag[] = [];

  @state() private snapshot: GespraechSnapshot | null = null;
  @state() private aboFehler: string | null = null;
  @state() private sending = false;
  @state() private sendFehler = '';
  @state() private neuerBeitrag = false;

  private sessionId: string | null = null;
  private unsubscribe: (() => void) | null = null;
  private atBottom = true;
  private lastCount = 0;

  protected override createRenderRoot(): HTMLElement {
    return this;
  }

  private ziel(): GespraechZiel | null {
    return gespraechZiel(this.row, this.pending);
  }

  override connectedCallback(): void {
    super.connectedCallback();
    this.follow(this.ziel()?.session?.id ?? null);
  }

  override disconnectedCallback(): void {
    super.disconnectedCallback();
    this.follow(null);
  }

  protected override willUpdate(changed: PropertyValues<this>): void {
    if (changed.has('row') || changed.has('pending')) this.follow(this.ziel()?.session?.id ?? null);
  }

  /** Subscribes to the assigned session; switching sessions starts a fresh Verlauf (AN-S04). */
  private follow(sessionId: string | null): void {
    if (sessionId === this.sessionId) return;
    this.unsubscribe?.();
    this.unsubscribe = null;
    this.sessionId = sessionId;
    this.snapshot = null;
    this.aboFehler = null;
    this.sendFehler = '';
    this.neuerBeitrag = false;
    this.atBottom = true;
    this.lastCount = 0;
    if (!sessionId || !this.isConnected) return;
    this.unsubscribe = gespraechService.subscribe(sessionId, (snapshot, fehler) => {
      this.snapshot = snapshot;
      this.aboFehler = fehler;
    });
  }

  protected override updated(changed: Map<PropertyKey, unknown>): void {
    if (!changed.has('snapshot') && !changed.has('protocol')) return;
    const list = this.querySelector<HTMLElement>('.gespraech-verlauf');
    if (!list) return;
    const count = list.querySelectorAll('aos-gespraech-beitrag').length;
    const grew = count > this.lastCount;
    this.lastCount = count;
    if (this.atBottom || this.lastCount <= 1) {
      list.scrollTop = list.scrollHeight;
      this.neuerBeitrag = false;
    } else if (grew) {
      this.neuerBeitrag = true;
    }
  }

  private onScroll(e: Event): void {
    const el = e.currentTarget as HTMLElement;
    this.atBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 24;
    if (this.atBottom) this.neuerBeitrag = false;
  }

  private scrollDown(): void {
    const list = this.querySelector<HTMLElement>('.gespraech-verlauf');
    if (list) list.scrollTop = list.scrollHeight;
    this.atBottom = true;
    this.neuerBeitrag = false;
  }

  private toTerminal(): void {
    const id = this.ziel()?.session?.id;
    if (id) document.dispatchEvent(new CustomEvent('open-terminal-session', { bubbles: true, composed: true, detail: { sessionId: id } }));
  }

  private async onSend(e: CustomEvent<{ text: string }>): Promise<void> {
    if (this.sending) return;
    const z = this.ziel();
    const sessionId = z?.session?.id;
    if (!z || !sessionId) return;
    this.sending = true;
    this.sendFehler = '';
    // Vorhaben page: by intentId; project page (pending `/intent`): by session (INT-2026-008).
    const result = await gespraechService.send(z.projectId, z.intentId ? { intentId: z.intentId } : { sessionId }, e.detail.text);
    this.sending = false;
    if (result.ok) {
      const eingabe = this.querySelector('aos-gespraech-eingabe');
      if (eingabe) eingabe.value = '';
      this.atBottom = true;
      // no toast: the Beitrag (or its „eingereiht" tag) is the confirmation (E2E 16.09.: toasts piled up over the head)
      return;
    }
    this.sendFehler = result.message || result.grund;
  }

  private onDiscard(e: CustomEvent<{ entryId: string }>): void {
    gespraechService.discard(e.detail.entryId);
  }

  // ---- render ----

  override render() {
    const r = this.ziel();
    if (!r) return nothing;
    const s = r.session;
    const snap = this.snapshot;
    const kopf = kopfZustand(r, snap);
    const eingabe = eingabeZustand(r, snap);
    return html`<div class="gespraech">
      <div class="gespraech-kopf" data-session-id=${s?.id ?? ''}>
        <span>Gespräch mit <b>${s?.name ?? '—'}</b></span>
        <span class="gespraech-ort">· ${r.arbeitskopie ? html`<code>${r.arbeitskopie}</code>` : 'Im Projekt'}</span>
        <span class="gespraech-zustand"><span class="gespraech-dot ${kopf.ton}"></span>${kopf.label}</span>
        <span class="gespraech-grow"></span>
        ${s ? html`<button type="button" class="gespraech-btn leise" @click=${this.toTerminal}>Im Terminal öffnen ↗</button>` : nothing}
      </div>
      ${this.renderVerlauf()}
      <aos-gespraech-eingabe
        .modus=${eingabe.modus}
        .grund=${eingabe.grund}
        .sending=${this.sending}
        .nextStepLabel=${eingabe.nextStep && r.nextStep ? r.nextStep.label : ''}
        .terminalKnopf=${eingabe.terminal}
        .fehler=${this.sendFehler}
        @gespraech-send=${this.onSend}
        @gespraech-terminal=${this.toTerminal}
      ></aos-gespraech-eingabe>
    </div>`;
  }

  private renderVerlauf() {
    const r = this.ziel();
    if (!r) return nothing;
    const snap = this.snapshot;
    const sessionId = r.session?.id ?? '';
    const pending = sessionId ? pendingAsBeitraege(this.protocol, sessionId) : [];
    return html`<div class="gespraech-verlauf" @scroll=${this.onScroll} @gespraech-terminal=${this.toTerminal} @gespraech-discard=${this.onDiscard}>
      ${this.renderHinweis(r)}
      ${r.entsteht ? html`<div class="gespraech-notiz entsteht">Vorhaben entsteht — die Vorhaben-Seite öffnet sich, sobald der Ordner da ist.</div>` : nothing}
      ${snap?.verlauf.status === 'nur_echtzeit'
        ? html`<div class="gespraech-notiz">Historie${snap.verlauf.mitgelesenAb ? ` vor ${clockOf(snap.verlauf.mitgelesenAb)}` : ''} nicht verfügbar${snap.verlauf.ursache ? ` — ${snap.verlauf.ursache}` : ''}</div>`
        : nothing}
      ${snap && snap.verlauf.status !== 'nicht_verfuegbar' && snap.beitraege.length === 0 && pending.length === 0
        ? html`<div class="gespraech-notiz">Noch keine Beiträge — die Sitzung startet.</div>`
        : nothing}
      ${snap?.beitraege.map((b) => html`<aos-gespraech-beitrag .beitrag=${b}></aos-gespraech-beitrag>`)}
      ${pending.map((p) => html`<aos-gespraech-beitrag .beitrag=${p.beitrag} .entryId=${p.entryId}></aos-gespraech-beitrag>`)}
      ${this.neuerBeitrag ? html`<button type="button" class="gespraech-neu" @click=${this.scrollDown}>neuer Beitrag ↓</button>` : nothing}
    </div>`;
  }

  /** FA-07: cause and next step when the Verlauf cannot be read; the reader keeps working. */
  private renderHinweis(r: GespraechZiel) {
    const snap = this.snapshot;
    if (!r.session) return html`<div class="gespraech-notiz">Keine Sitzung zu diesem Vorhaben — nächsten Schritt starten.</div>`;
    if (this.aboFehler) {
      return html`<div class="gespraech-karte fehler" role="alert">
        <p><strong>Gespräch nicht verfügbar:</strong> ${this.aboFehler}.</p>
        <p>Nächster Schritt: <button type="button" class="gespraech-link" @click=${this.toTerminal}>Im Terminal öffnen</button>${r.nextStep && !r.sessionBusy ? html` oder „${r.nextStep.label}" wählen — die neue Sitzung erscheint hier.` : '.'}</p>
      </div>
      <div class="gespraech-notiz rahmen">Anmerkungen und Freigabe im Dokument-Leser funktionieren weiterhin, sobald die Sitzung wartet.</div>`;
    }
    if (!snap) return html`<div class="gespraech-notiz">Gespräch wird geladen …</div>`;
    if (snap.verlauf.status === 'nicht_verfuegbar') {
      return html`<div class="gespraech-karte fehler" role="alert">
        <p><strong>Gespräch nicht verfügbar:</strong> ${snap.verlauf.ursache ?? 'Verlauf nicht lesbar'}.</p>
        <p>Nächster Schritt: <button type="button" class="gespraech-link" @click=${this.toTerminal}>Im Terminal öffnen</button>${r.nextStep && !r.sessionBusy ? html` oder „${r.nextStep.label}" wählen — die neue Sitzung erscheint hier.` : '.'}</p>
      </div>
      <div class="gespraech-notiz rahmen">Anmerkungen und Freigabe im Dokument-Leser funktionieren weiterhin, sobald die Sitzung wartet.</div>`;
    }
    return nothing;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'aos-gespraech': AosGespraech;
  }
}
