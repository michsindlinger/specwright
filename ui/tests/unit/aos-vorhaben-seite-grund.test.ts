// @vitest-environment happy-dom
/**
 * INT-2026-016 (AK-07): the footer of a Vorhaben page without a live session
 * names the second way on the Mac — a click on a Claude tab in the docked
 * terminal (or „Neue Session") binds it to this Vorhaben. The phone has no
 * docked terminal and keeps the plain text; live sessions keep theirs too.
 */
import { describe, it, expect } from 'vitest';
import { grundText, ZUORDNUNG_HINWEIS } from '../../frontend/src/components/vorhaben/aos-vorhaben-seite.js';

describe('aos-vorhaben-seite grundText (INT-2026-016, AK-07)', () => {
  it('adds the Zuordnung hint on the Mac for rows without a live session', () => {
    expect(grundText('keine_sitzung', false)).toBe(`keine Sitzung zu diesem Vorhaben — nächsten Schritt starten ${ZUORDNUNG_HINWEIS}`);
    expect(grundText('beendet', false)).toContain(ZUORDNUNG_HINWEIS);
    expect(ZUORDNUNG_HINWEIS).toMatch(/Tab anklicken|Neue Session/);
  });

  it('keeps the plain text on the phone and for live sessions', () => {
    expect(grundText('keine_sitzung', true)).toBe('keine Sitzung zu diesem Vorhaben — nächsten Schritt starten');
    expect(grundText('arbeitet', false)).toBe('Sitzung arbeitet — warten');
    expect(grundText('bereit', false)).toBe('');
    expect(grundText('unbekannt', false)).toBe('');
  });
});
