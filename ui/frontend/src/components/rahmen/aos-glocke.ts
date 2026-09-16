/**
 * aos-glocke — the agent bell in the app header (INT-2026-010, FA-04/FA-05/FA-06).
 *
 * Lists sessions blocked on the user and agents that finished, with a counter
 * on the button (no number at 0). Rendering, open/close (outside click, Escape,
 * 30-s ticker for the relative times) and the sound toggle moved here 1:1 from
 * the cloud-terminal sidebar head (AN-S05). The rows come from app.ts
 * (`buildBellRows`); a tap emits `glocke-open` and app.ts decides where to go
 * (`glocke-ziel.ts`). Light DOM, styles in theme.css under `.glocke*`.
 */

import { LitElement, html, svg, nothing } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { repeat } from 'lit/directives/repeat.js';
import { styleMap } from 'lit/directives/style-map.js';
import { formatRelativeTime, type BellRow } from '../terminal/agent-notifications.js';
import { isBellSoundEnabled, setBellSoundEnabled, playAgentDoneChime } from '../terminal/notification-sound.js';

/** The session fields the bell shows per row. */
export interface GlockeSession {
  id: string;
  name: string;
  projectPath: string;
}

export interface GlockeOpenDetail {
  sessionId: string;
  terminalSessionId?: string;
}

@customElement('aos-glocke')
export class AosGlocke extends LitElement {
  @property({ attribute: false }) rows: BellRow[] = [];
  @property({ attribute: false }) sessions: GlockeSession[] = [];
  /** projectPath → display name (project badge in a row). */
  @property({ attribute: false }) projectNames: Record<string, string> = {};
  /** Chime on/off; initialised from the stored preference, toggled here. */
  @property({ type: Boolean }) sound = isBellSoundEnabled();

  @state() private open = false;
  private ticker: ReturnType<typeof setInterval> | null = null;

  protected override createRenderRoot(): HTMLElement {
    return this;
  }

  override disconnectedCallback(): void {
    super.disconnectedCallback();
    this.close();
  }

  /** "2 warten auf Eingabe, 1 fertig" — blocked first, because that is what needs a human. */
  static title(blocked: number, done: number): string {
    const parts: string[] = [];
    if (blocked > 0) parts.push(`${blocked} ${blocked === 1 ? 'wartet' : 'warten'} auf Eingabe`);
    if (done > 0) parts.push(`${done} fertig`);
    return parts.length ? parts.join(', ') : 'Keine Agent-Meldungen';
  }

  override render() {
    const items = this.rows;
    const count = items.length;
    const blocked = items.filter((r) => r.kind === 'blocked').length;
    const title = AosGlocke.title(blocked, count - blocked);
    return html`
      <div class="glocke-wrap">
        <button
          type="button"
          class="glocke-btn ${count > 0 ? 'has-items' : ''} ${blocked > 0 ? 'has-waiting' : ''} ${this.open ? 'open' : ''}"
          @click=${this.toggle}
          title=${title}
          aria-label=${title}
          aria-haspopup="true"
          aria-expanded=${this.open ? 'true' : 'false'}
        >
          <svg viewBox="0 0 20 20" fill="none" aria-hidden="true">
            <path d="M10 2a1 1 0 0 1 1 1v.26A6 6 0 0 1 16 9v3l1.707 1.707A1 1 0 0 1 17 15.5H3a1 1 0 0 1-.707-1.793L4 12V9a6 6 0 0 1 5-5.74V3a1 1 0 0 1 1-1zm0 16a2 2 0 0 0 2-2H8a2 2 0 0 0 2 2z" fill="currentColor"></path>
          </svg>
          ${count > 0 ? html`<span class="glocke-badge" aria-hidden="true">${count > 9 ? '9+' : count}</span>` : nothing}
        </button>
        ${this.open
          ? html`
              <div class="glocke-dropdown" role="menu">
                <div class="glocke-dropdown-header">
                  <span>Agenten</span>
                  ${this.renderSoundToggle()}
                </div>
                ${count === 0
                  ? html`<div class="glocke-empty">Keine Meldungen</div>`
                  : repeat(items, (r) => r.sessionId, (r) => this.renderRow(r))}
              </div>
            `
          : nothing}
      </div>
    `;
  }

  private renderRow(row: BellRow) {
    const session = this.sessions.find((s) => s.id === row.sessionId);
    const name = session?.name ?? row.sessionId;
    const projectPath = session?.projectPath ?? '';
    const hue = projectHue(projectPath);
    const badgeStyle = { background: `hsl(${hue} 55% 22%)`, color: `hsl(${hue} 70% 80%)` };
    const blocked = row.kind === 'blocked';
    return html`
      <div class="glocke-row ${blocked ? 'waiting' : ''}" role="menuitem" @click=${() => this.jump(row)}>
        <div class="glocke-row-top">
          <span class="glocke-kind ${blocked ? 'waiting' : 'done'}">${blocked ? 'wartet' : 'fertig'}</span>
          ${projectPath
            ? html`<span class="glocke-project" style=${styleMap(badgeStyle)} title=${projectPath}>${this.projectLabel(projectPath)}</span>`
            : nothing}
          <span class="glocke-name" title=${name}>${name}</span>
          <span class="glocke-time">${row.at > 0 ? formatRelativeTime(row.at) : ''}</span>
        </div>
        ${row.preview ? html`<div class="glocke-preview" title=${row.preview}>${row.preview}</div>` : nothing}
      </div>
    `;
  }

  private renderSoundToggle() {
    const on = this.sound;
    return html`
      <button
        type="button"
        class="glocke-sound-btn ${on ? '' : 'muted'}"
        @click=${this.toggleSound}
        title=${on ? 'Ton aus' : 'Ton an'}
        aria-label=${on ? 'Ton ausschalten' : 'Ton einschalten'}
        aria-pressed=${on ? 'true' : 'false'}
      >
        <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true">
          <path d="M4 7.5h3L11 4v12L7 12.5H4z" fill="currentColor" stroke-linejoin="round"></path>
          ${on
            ? svg`<path d="M13.5 7a4 4 0 0 1 0 6M15.8 5a7 7 0 0 1 0 10" stroke-linecap="round"></path>`
            : svg`<path d="M14 8l4 4M18 8l-4 4" stroke-linecap="round"></path>`}
        </svg>
      </button>
    `;
  }

  private projectLabel(path: string): string {
    return this.projectNames[path] ?? (path.split('/').filter(Boolean).pop() ?? path);
  }

  private jump(row: BellRow): void {
    this.close();
    this.dispatchEvent(
      new CustomEvent<GlockeOpenDetail>('glocke-open', {
        bubbles: true,
        composed: true,
        detail: { sessionId: row.sessionId, ...(row.terminalSessionId ? { terminalSessionId: row.terminalSessionId } : {}) },
      })
    );
  }

  private toggleSound = (e: Event): void => {
    e.stopPropagation();
    this.sound = !this.sound;
    setBellSoundEnabled(this.sound);
    // Preview on unmute so the user hears what they just enabled.
    if (this.sound) playAgentDoneChime(true);
    this.dispatchEvent(new CustomEvent<{ enabled: boolean }>('glocke-sound', { bubbles: true, composed: true, detail: { enabled: this.sound } }));
  };

  private toggle = (e: Event): void => {
    e.stopPropagation();
    if (this.open) this.close();
    else this.openList();
  };

  private openList(): void {
    this.open = true;
    document.addEventListener('click', this.onOutsideClick);
    document.addEventListener('keydown', this.onKeydown);
    this.ticker = setInterval(() => this.requestUpdate(), 30_000);
  }

  private close(): void {
    if (!this.open) return;
    this.open = false;
    document.removeEventListener('click', this.onOutsideClick);
    document.removeEventListener('keydown', this.onKeydown);
    if (this.ticker) {
      clearInterval(this.ticker);
      this.ticker = null;
    }
  }

  private onOutsideClick = (e: MouseEvent): void => {
    const wrap = this.querySelector('.glocke-wrap');
    if (wrap && e.composedPath().includes(wrap)) return;
    this.close();
  };

  private onKeydown = (e: KeyboardEvent): void => {
    if (e.key === 'Escape') this.close();
  };
}

/** Deterministic hue (0-359) per project path — same project, same badge colour everywhere. */
export function projectHue(path: string): number {
  let h = 0;
  for (let i = 0; i < path.length; i++) h = (h * 31 + path.charCodeAt(i)) % 360;
  return h;
}

declare global {
  interface HTMLElementTagNameMap {
    'aos-glocke': AosGlocke;
  }
}
