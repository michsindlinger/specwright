import { LitElement, html, nothing } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { styleMap } from 'lit/directives/style-map.js';
import type { AosToastNotification } from './toast-notification.js';
import { isNotepadShortcut } from '../utils/keyboard-shortcuts.js';
import {
  clampNotepadGeom,
  createDebouncedSaver,
  loadNotepadGeom,
  loadNotepadText,
  saveNotepadGeom,
  saveNotepadText,
  type NotepadGeom,
} from '../utils/notepad-storage.js';

/**
 * Floating, draggable notepad (Cmd/Ctrl+Shift+E).
 *
 * Deliberately NOT a modal: no overlay, no focus trap. The user reads an agent's plan in a
 * cloud-terminal pane and takes notes next to it, so the terminal behind must stay visible
 * and interactive. The panel can be dragged by its header and resized from its corner;
 * text and geometry persist in localStorage (see notepad-storage.ts).
 *
 * Keyboard ownership: the toggle shortcut is handled by a single CAPTURE-phase listener on
 * `document` so it is consumed before the focused xterm textarea sees it (otherwise Ctrl+Shift+E
 * would inject ^E into the PTY on Linux/Windows). Escape is only consumed while focus is inside
 * the panel — everywhere else it must keep reaching Claude Code (interrupt) and the sidebar.
 *
 * @fires notepad-toggle - Shortcut pressed; the host flips `open`.
 * @fires panel-close   - Closed from inside (✕ / Escape); the host sets `open` to false.
 */
@customElement('aos-notepad-panel')
export class AosNotepadPanel extends LitElement {
  @property({ type: Boolean, reflect: true }) open = false;

  @state() private _geom: NotepadGeom = clampNotepadGeom(null, 1024, 768);
  @state() private _confirmClear = false;
  @state() private _copied = false;

  // Plain fields: the note text must not trigger a re-render per keystroke.
  private _text = '';
  private _prevFocus: Element | null = null;
  private _restoreFocusOnClose = false;
  private _copiedTimer: ReturnType<typeof setTimeout> | null = null;
  private _confirmTimer: ReturnType<typeof setTimeout> | null = null;
  private _geomSaveTimer: ReturnType<typeof setTimeout> | null = null;
  private _resizeObserver: ResizeObserver | null = null;

  private readonly _saver = createDebouncedSaver((text) => {
    if (!saveNotepadText(text, localStorage)) {
      this._toast('Notiz konnte nicht gespeichert werden (Browser-Speicher voll?)', 'error');
    }
  });

  private readonly _onKeydownCapture = (e: KeyboardEvent) => this._handleKeydownCapture(e);
  private readonly _onPageHide = () => this._saver.flush();
  private readonly _onWindowResize = () => this._clampToViewport();

  override connectedCallback(): void {
    super.connectedCallback();
    document.addEventListener('keydown', this._onKeydownCapture, true);
    window.addEventListener('pagehide', this._onPageHide);
    window.addEventListener('resize', this._onWindowResize);
  }

  override disconnectedCallback(): void {
    super.disconnectedCallback();
    document.removeEventListener('keydown', this._onKeydownCapture, true);
    window.removeEventListener('pagehide', this._onPageHide);
    window.removeEventListener('resize', this._onWindowResize);
    this._saver.flush();
    this._teardownResizeObserver();
  }

  protected override createRenderRoot() {
    return this;
  }

  // ---- lifecycle -----------------------------------------------------------------------

  protected override willUpdate(changed: Map<string, unknown>): void {
    if (!changed.has('open')) return;
    if (this.open) {
      // Load fresh on every open: another tab may have edited the note (last write wins).
      this._text = loadNotepadText(localStorage);
      this._geom = clampNotepadGeom(loadNotepadGeom(localStorage), window.innerWidth, window.innerHeight);
      this._confirmClear = false;
      this._copied = false;
      this._prevFocus = document.activeElement;
    } else if (changed.get('open') === true) {
      // Decide BEFORE the textarea is removed: only hand focus back when we actually had it.
      this._restoreFocusOnClose = this.contains(document.activeElement);
    }
  }

  protected override updated(changed: Map<string, unknown>): void {
    if (!changed.has('open')) return;
    if (this.open) {
      const ta = this._textarea;
      if (ta) {
        ta.focus();
        const len = ta.value.length;
        ta.setSelectionRange(len, len);
      }
      this._setupResizeObserver();
    } else if (changed.get('open') === true) {
      this._saver.flush();
      this._flushGeom();
      this._teardownResizeObserver();
      if (this._restoreFocusOnClose) {
        (this._prevFocus as HTMLElement | null)?.focus?.();
      }
      this._restoreFocusOnClose = false;
      this._prevFocus = null;
    }
  }

  private get _textarea(): HTMLTextAreaElement | null {
    return this.querySelector('.notepad-panel__textarea');
  }

  private get _panel(): HTMLElement | null {
    return this.querySelector('.notepad-panel');
  }

  // ---- keyboard ------------------------------------------------------------------------

  private _handleKeydownCapture(e: KeyboardEvent): void {
    if (isNotepadShortcut(e)) {
      e.preventDefault();
      e.stopPropagation();
      this.dispatchEvent(new CustomEvent('notepad-toggle', { bubbles: true, composed: true }));
      return;
    }
    if (!this.open || !this.contains(document.activeElement)) return;
    if (e.key === 'Escape') {
      e.preventDefault();
      e.stopPropagation();
      this._close();
    }
  }

  private _close(): void {
    this.open = false;
    this.dispatchEvent(new CustomEvent('panel-close', { bubbles: true, composed: true }));
  }

  // ---- text ----------------------------------------------------------------------------

  private _onInput(e: Event): void {
    this._text = (e.target as HTMLTextAreaElement).value;
    this._saver.schedule(this._text);
    if (this._confirmClear) this._resetConfirmClear();
  }

  private async _copy(): Promise<void> {
    const text = this._text;
    let ok = false;
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(text);
        ok = true;
      }
    } catch {
      ok = false;
    }
    if (!ok) ok = this._copyViaSelection();
    if (ok) {
      this._copied = true;
      if (this._copiedTimer) clearTimeout(this._copiedTimer);
      this._copiedTimer = setTimeout(() => {
        this._copied = false;
        this._copiedTimer = null;
      }, 2000);
    } else {
      this._toast('Kopieren fehlgeschlagen', 'error');
    }
  }

  /** Fallback for insecure origins (no Clipboard API): select-all + execCommand, restore selection. */
  private _copyViaSelection(): boolean {
    const ta = this._textarea;
    if (!ta) return false;
    const { selectionStart, selectionEnd } = ta;
    ta.focus();
    ta.select();
    let ok = false;
    try {
      ok = document.execCommand('copy');
    } catch {
      ok = false;
    }
    ta.setSelectionRange(selectionStart, selectionEnd);
    return ok;
  }

  private _clear(): void {
    if (!this._confirmClear) {
      this._confirmClear = true;
      this._confirmTimer = setTimeout(() => this._resetConfirmClear(), 3000);
      return;
    }
    this._resetConfirmClear();
    this._text = '';
    const ta = this._textarea;
    if (ta) {
      ta.value = '';
      ta.focus();
    }
    this._saver.schedule('');
    this._saver.flush();
  }

  private _resetConfirmClear(): void {
    if (this._confirmTimer) {
      clearTimeout(this._confirmTimer);
      this._confirmTimer = null;
    }
    this._confirmClear = false;
  }

  // ---- drag / resize / geometry --------------------------------------------------------

  /** Drag by header (pointer capture, direct style writes — no Lit render per frame). */
  private _onHeaderPointerDown(e: PointerEvent): void {
    if (e.button !== 0) return;
    if ((e.target as HTMLElement).closest('button')) return;
    const header = e.currentTarget as HTMLElement;
    const panel = this._panel;
    if (!panel) return;
    e.preventDefault();
    const startX = e.clientX;
    const startY = e.clientY;
    const origin = { ...this._geom };
    let last = origin;
    header.setPointerCapture(e.pointerId);
    header.classList.add('dragging');

    const move = (ev: PointerEvent) => {
      last = clampNotepadGeom(
        { ...origin, x: origin.x + (ev.clientX - startX), y: origin.y + (ev.clientY - startY) },
        window.innerWidth,
        window.innerHeight
      );
      panel.style.left = `${last.x}px`;
      panel.style.top = `${last.y}px`;
    };
    const up = (ev: PointerEvent) => {
      header.releasePointerCapture(ev.pointerId);
      header.classList.remove('dragging');
      header.removeEventListener('pointermove', move);
      header.removeEventListener('pointerup', up);
      header.removeEventListener('pointercancel', up);
      this._geom = last;
      this._scheduleGeomSave();
    };
    header.addEventListener('pointermove', move);
    header.addEventListener('pointerup', up);
    header.addEventListener('pointercancel', up);
  }

  /** CSS `resize: both` writes the panel's inline width/height — mirror it into state + storage. */
  private _setupResizeObserver(): void {
    const panel = this._panel;
    if (!panel || this._resizeObserver) return;
    this._resizeObserver = new ResizeObserver(() => {
      const w = panel.offsetWidth;
      const h = panel.offsetHeight;
      if (w === this._geom.w && h === this._geom.h) return;
      this._geom = clampNotepadGeom({ ...this._geom, w, h }, window.innerWidth, window.innerHeight);
      this._scheduleGeomSave();
    });
    this._resizeObserver.observe(panel);
  }

  private _teardownResizeObserver(): void {
    this._resizeObserver?.disconnect();
    this._resizeObserver = null;
  }

  private _clampToViewport(): void {
    if (!this.open) return;
    const next = clampNotepadGeom(this._geom, window.innerWidth, window.innerHeight);
    if (next.x !== this._geom.x || next.y !== this._geom.y || next.w !== this._geom.w || next.h !== this._geom.h) {
      this._geom = next;
      this._scheduleGeomSave();
    }
  }

  private _scheduleGeomSave(): void {
    if (this._geomSaveTimer) clearTimeout(this._geomSaveTimer);
    this._geomSaveTimer = setTimeout(() => this._flushGeom(), 300);
  }

  private _flushGeom(): void {
    if (this._geomSaveTimer) {
      clearTimeout(this._geomSaveTimer);
      this._geomSaveTimer = null;
    }
    saveNotepadGeom(this._geom, localStorage);
  }

  // ---- misc ----------------------------------------------------------------------------

  private _toast(message: string, type: 'error' | 'warning' | 'info' | 'success'): void {
    const toast = document.querySelector('aos-toast-notification') as AosToastNotification | null;
    toast?.show(message, type);
  }

  private _shortcutLabel(): string {
    const isMac = /Mac|iPhone|iPad/.test(navigator.userAgent);
    return isMac ? '⌘⇧E' : 'Strg+Umschalt+E';
  }

  override render() {
    if (!this.open) return nothing;
    const { x, y, w, h } = this._geom;
    return html`
      <div
        class="notepad-panel"
        role="dialog"
        aria-label="Notizen"
        style=${styleMap({ left: `${x}px`, top: `${y}px`, width: `${w}px`, height: `${h}px` })}
      >
        <div class="notepad-panel__header" @pointerdown=${this._onHeaderPointerDown}>
          <span class="notepad-panel__title">Notizen</span>
          <span class="notepad-panel__hint" title="Zum Verschieben ziehen">${this._shortcutLabel()} · Esc</span>
          <button
            class="notepad-panel__close-btn"
            type="button"
            aria-label="Schließen"
            @click=${() => this._close()}
          >✕</button>
        </div>
        <textarea
          class="notepad-panel__textarea"
          placeholder="Notizen zum Plan, offene Fragen, nächste Schritte …"
          spellcheck="false"
          .value=${this._text}
          @input=${this._onInput}
        ></textarea>
        <div class="notepad-panel__footer">
          <button
            class="notepad-panel__clear-btn ${this._confirmClear ? 'notepad-panel__clear-btn--confirm' : ''}"
            type="button"
            @click=${this._clear}
          >${this._confirmClear ? 'Wirklich leeren?' : 'Leeren'}</button>
          <button
            class="notepad-panel__copy-btn ${this._copied ? 'notepad-panel__copy-btn--copied' : ''}"
            type="button"
            @click=${this._copy}
          >${this._copied ? '✓ Kopiert' : 'In Zwischenablage kopieren'}</button>
        </div>
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'aos-notepad-panel': AosNotepadPanel;
  }
}
