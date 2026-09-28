/**
 * INT-2026-025 (D11, Review F12, FA-02, FA-05): the bell chime yields to the
 * ring tone only with the mode on in a capable local window and only for
 * events that ring as a call. `ringsForAgentEvent` stays as it is; app.ts
 * asks `glockentonUnterdrueckt` after it.
 */
import { describe, it, expect } from 'vitest';
import { glockentonUnterdrueckt, istAnrufEreignis } from '../../frontend/src/components/anruf/anruf-ton.js';
import { ringsForAgentEvent } from '../../frontend/src/components/terminal/agent-notifications.js';

describe('glockentonUnterdrueckt()', () => {
  const an = { anrufAktiv: true };

  it('call events: stop, transition into blocked with rueckfrage/plan', () => {
    expect(glockentonUnterdrueckt({ ...an, event: 'stop', status: 'done', prevStatus: 'working', blockKind: undefined })).toBe(true);
    expect(glockentonUnterdrueckt({ ...an, event: 'blocked', status: 'blocked', prevStatus: 'working', blockKind: 'rueckfrage' })).toBe(true);
    expect(glockentonUnterdrueckt({ ...an, event: 'blocked', status: 'blocked', prevStatus: 'working', blockKind: 'plan' })).toBe(true);
  });

  it('permissions, unknown dialogs, plan-review events and repeated blocked keep the chime (FA-05)', () => {
    expect(glockentonUnterdrueckt({ ...an, event: 'blocked', status: 'blocked', prevStatus: 'working', blockKind: 'berechtigung' })).toBe(false);
    expect(glockentonUnterdrueckt({ ...an, event: 'blocked', status: 'blocked', prevStatus: 'working', blockKind: 'unbekannt' })).toBe(false);
    expect(glockentonUnterdrueckt({ ...an, event: 'blocked', status: 'blocked', prevStatus: 'working', blockKind: undefined })).toBe(false);
    expect(glockentonUnterdrueckt({ ...an, event: 'review-injected', status: 'blocked', prevStatus: 'blocked', blockKind: 'plan' })).toBe(false);
    expect(glockentonUnterdrueckt({ ...an, event: 'review-failed', status: 'blocked', prevStatus: 'blocked', blockKind: 'plan' })).toBe(false);
    expect(istAnrufEreignis({ event: 'blocked', status: 'blocked', prevStatus: 'blocked', blockKind: 'rueckfrage' })).toBe(false);
  });

  it('mode off or window not capable: nothing suppressed (FA-02)', () => {
    expect(glockentonUnterdrueckt({ anrufAktiv: false, event: 'stop', status: 'done', prevStatus: 'working', blockKind: undefined })).toBe(false);
    expect(glockentonUnterdrueckt({ anrufAktiv: false, event: 'blocked', status: 'blocked', prevStatus: 'working', blockKind: 'plan' })).toBe(false);
  });

  it('ringsForAgentEvent unchanged: still rings for the same events', () => {
    expect(ringsForAgentEvent({ event: 'stop', status: 'done', prevStatus: 'working', isActive: false })).toBe(true);
    expect(ringsForAgentEvent({ event: 'blocked', status: 'blocked', prevStatus: 'working', isActive: false })).toBe(true);
  });

  it('app.ts plays the chime only when not suppressed', async () => {
    const fs = await import('node:fs');
    const path = await import('node:path');
    const src = fs.readFileSync(path.resolve(__dirname, '../../frontend/src/app.ts'), 'utf8');
    expect(src).toContain('if (ring && !tonUnterdrueckt) playAgentDoneChime();');
    expect(src).toMatch(/glockentonUnterdrueckt\(\{\s*anrufAktiv: this\.anruf \? anrufAktiv\(this\.anruf\.modus\) : false/);
  });
});
