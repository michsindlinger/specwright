// @vitest-environment happy-dom
/**
 * INT-2026-010 (FA-04, FA-06): the bell in the app header — counter equals
 * the rows (no number at 0), blocked counted in, a tap emits `glocke-open`
 * with both ids, the sound toggle flips the stored preference.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { BellRow } from '../../frontend/src/components/terminal/agent-notifications.js';

const chime = vi.fn();
vi.mock('../../frontend/src/components/terminal/notification-sound.js', () => {
  let enabled = true;
  return {
    isBellSoundEnabled: () => enabled,
    setBellSoundEnabled: (v: boolean) => {
      enabled = v;
    },
    playAgentDoneChime: (...a: unknown[]) => chime(...a),
  };
});

const rows: BellRow[] = [
  { sessionId: 's-blocked', terminalSessionId: 'cloud-2', kind: 'blocked', at: 2000, preview: 'Berechtigung: Bash' },
  { sessionId: 's-done', terminalSessionId: 'cloud-1', kind: 'done', at: 1000, preview: 'Fertig.' },
];
const sessions = [
  { id: 's-blocked', name: 'plan INT-2026-010', projectPath: '/p' },
  { id: 's-done', name: 'spec INT-2026-009', projectPath: '/q' },
];

async function glocke(r: BellRow[]) {
  await import('../../frontend/src/components/rahmen/aos-glocke.js');
  const el = document.createElement('aos-glocke');
  el.rows = r;
  el.sessions = sessions;
  el.projectNames = { '/p': 'Specwright' };
  document.body.appendChild(el);
  await el.updateComplete;
  return el;
}

describe('aos-glocke', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
    chime.mockClear();
  });

  it('shows the row count on the button, blocked included; nothing at 0 (FA-04)', async () => {
    const el = await glocke(rows);
    expect(el.querySelector('.glocke-badge')?.textContent).toBe('2');
    expect(el.querySelector('.glocke-btn')!.classList.contains('has-waiting')).toBe(true);
    expect(el.querySelector('.glocke-btn')!.getAttribute('title')).toBe('1 wartet auf Eingabe, 1 fertig');
    el.rows = [];
    await el.updateComplete;
    expect(el.querySelector('.glocke-badge')).toBeNull();
    expect(el.querySelector('.glocke-btn')!.getAttribute('title')).toBe('Keine Agent-Meldungen');
    el.remove();
  });

  it('opens the list on click: rows with kind, project badge and name; a tap emits glocke-open with both ids and closes (FA-06)', async () => {
    const el = await glocke(rows);
    const seen: unknown[] = [];
    el.addEventListener('glocke-open', (e) => seen.push((e as CustomEvent).detail));
    (el.querySelector('.glocke-btn') as HTMLButtonElement).click();
    await el.updateComplete;
    const list = [...el.querySelectorAll('.glocke-row')];
    expect(list.length).toBe(2);
    expect(list[0].querySelector('.glocke-kind')?.textContent).toBe('wartet');
    expect(list[0].querySelector('.glocke-project')?.textContent?.trim()).toBe('Specwright');
    expect(list[0].querySelector('.glocke-name')?.textContent).toBe('plan INT-2026-010');
    expect(list[1].querySelector('.glocke-project')?.textContent?.trim()).toBe('q'); // basename fallback
    expect(list[1].querySelector('.glocke-preview')?.textContent).toBe('Fertig.');
    (list[1] as HTMLElement).click();
    await el.updateComplete;
    expect(seen).toEqual([{ sessionId: 's-done', terminalSessionId: 'cloud-1' }]);
    expect(el.querySelector('.glocke-dropdown')).toBeNull();
    el.remove();
  });

  it('Escape and an outside click close the list; the empty list says so', async () => {
    const el = await glocke([]);
    (el.querySelector('.glocke-btn') as HTMLButtonElement).click();
    await el.updateComplete;
    expect(el.querySelector('.glocke-empty')?.textContent).toBe('Keine Meldungen');
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    await el.updateComplete;
    expect(el.querySelector('.glocke-dropdown')).toBeNull();
    (el.querySelector('.glocke-btn') as HTMLButtonElement).click();
    await el.updateComplete;
    expect(el.querySelector('.glocke-dropdown')).not.toBeNull();
    document.body.click();
    await el.updateComplete;
    expect(el.querySelector('.glocke-dropdown')).toBeNull();
    el.remove();
  });

  it('sound toggle: off → no chime, on → preview chime and glocke-sound event', async () => {
    const el = await glocke(rows);
    const events: boolean[] = [];
    el.addEventListener('glocke-sound', (e) => events.push((e as CustomEvent<{ enabled: boolean }>).detail.enabled));
    (el.querySelector('.glocke-btn') as HTMLButtonElement).click();
    await el.updateComplete;
    const btn = el.querySelector('.glocke-sound-btn') as HTMLButtonElement;
    expect(btn.getAttribute('aria-pressed')).toBe('true');
    btn.click();
    await el.updateComplete;
    expect(el.querySelector('.glocke-sound-btn')!.classList.contains('muted')).toBe(true);
    expect(chime).not.toHaveBeenCalled();
    (el.querySelector('.glocke-sound-btn') as HTMLButtonElement).click();
    await el.updateComplete;
    expect(chime).toHaveBeenCalledWith(true);
    expect(events).toEqual([false, true]);
    // the list stayed open (the toggle stops propagation)
    expect(el.querySelector('.glocke-dropdown')).not.toBeNull();
    el.remove();
  });
});
