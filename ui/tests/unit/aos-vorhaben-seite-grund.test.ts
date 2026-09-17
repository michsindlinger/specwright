// @vitest-environment happy-dom
/**
 * INT-2026-016 (AK-07): the footer of a Vorhaben page without a live session
 * names the second way on the Mac — a click on a Claude tab in the docked
 * terminal (or „Neue Session") binds it to this Vorhaben. The phone has no
 * docked terminal and keeps the plain text; live sessions keep theirs too.
 */
import { describe, it, expect } from 'vitest';
import { grundText } from '../../frontend/src/components/vorhaben/aos-vorhaben-seite.js';
import { ZUORDNUNG_HINWEIS } from '../../frontend/src/components/vorhaben/aos-sende-leiste.js';

describe('aos-vorhaben-seite grundText (INT-2026-016, AK-07)', () => {
  it('adds the Zuordnung hint on the Mac for rows without a live session', () => {
    expect(grundText('keine_sitzung', false)).toBe(`keine Sitzung zu diesem Vorhaben — nächsten Schritt starten oder ${ZUORDNUNG_HINWEIS}`);
    expect(grundText('beendet', false)).toContain(ZUORDNUNG_HINWEIS);
    expect(ZUORDNUNG_HINWEIS).toMatch(/Tab anklicken|Neue Session/);
  });

  it('the bottom bar names the way for rows without a live session on the Mac only', async () => {
    await import('../../frontend/src/components/vorhaben/aos-sende-leiste.js');
    const row = { intentId: 'INT-2026-012', zustand: 'keine_sitzung', session: undefined } as never;
    const el = document.createElement('aos-sende-leiste') as HTMLElement & { row: unknown; mobile: boolean; count: number; updateComplete: Promise<boolean> };
    el.row = row;
    el.count = 0;
    document.body.appendChild(el);
    await el.updateComplete;
    expect(el.shadowRoot!.textContent).toContain(ZUORDNUNG_HINWEIS);
    el.mobile = true;
    await el.updateComplete;
    expect(el.shadowRoot!.textContent).not.toContain(ZUORDNUNG_HINWEIS);
    el.mobile = false;
    el.row = { intentId: 'INT-2026-012', zustand: 'arbeitet', session: { id: 's', name: 'x', model: 'opus', agentStatus: 'working' } } as never;
    await el.updateComplete;
    expect(el.shadowRoot!.textContent).not.toContain(ZUORDNUNG_HINWEIS);
    el.remove();
  });

  it('keeps the plain text on the phone and for live sessions', () => {
    expect(grundText('keine_sitzung', true)).toBe('keine Sitzung zu diesem Vorhaben — nächsten Schritt starten');
    expect(grundText('arbeitet', false)).toBe('Sitzung arbeitet — warten');
    expect(grundText('bereit', false)).toBe('');
    expect(grundText('unbekannt', false)).toBe('');
  });
});
