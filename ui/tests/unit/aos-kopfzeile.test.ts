// @vitest-environment happy-dom
/**
 * INT-2026-010 (FA-07, FA-09, EK-02): the frame is one header line with
 * exactly the bell and the project symbol on the Mac, plus the terminal symbol
 * on the phone. The project symbol navigates, the terminal symbol emits
 * `terminal-toggle`, the connection hint is text only.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

const navigate = vi.fn();
let view = 'vorhaben';
vi.mock('../../frontend/src/services/router.service.js', () => ({
  routerService: { navigate: (...a: unknown[]) => navigate(...(a as [])), getCurrentRoute: () => ({ view, params: {}, segments: [] }), on: vi.fn(), off: vi.fn() },
}));

async function kopfzeile(mobile: boolean) {
  await import('../../frontend/src/components/rahmen/aos-kopfzeile.js');
  const el = document.createElement('aos-kopfzeile');
  el.titel = 'Vorhaben';
  el.mobile = mobile;
  document.body.appendChild(el);
  await el.updateComplete;
  return el;
}

describe('aos-kopfzeile', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
    navigate.mockClear();
    view = 'vorhaben';
  });

  it('Mac: title, bell and project symbol — three things, no other control (EK-02)', async () => {
    const el = await kopfzeile(false);
    expect(el.querySelector('.kopfzeile-titel')?.textContent).toBe('Vorhaben');
    expect(el.querySelector('aos-glocke')).not.toBeNull();
    expect(el.querySelector('.kopfzeile-projekt')).not.toBeNull();
    expect(el.querySelector('.kopfzeile-terminal')).toBeNull();
    // controls in the header: the bell button and the project button
    expect(el.querySelectorAll('.kopfzeile button').length).toBe(2);
    expect(el.querySelector('aos-model-selector, .sidebar, aos-project-tabs, aos-git-status-bar, .version-label, .claude-concurrency-badge')).toBeNull();
    el.remove();
  });

  it('phone: the terminal symbol comes in as the third control and emits terminal-toggle (FA-09)', async () => {
    const el = await kopfzeile(true);
    expect(el.querySelectorAll('.kopfzeile button').length).toBe(3);
    const toggles: number[] = [];
    el.addEventListener('terminal-toggle', () => toggles.push(1));
    (el.querySelector('.kopfzeile-terminal') as HTMLButtonElement).click();
    expect(toggles).toEqual([1]);
    el.terminalOffen = true;
    await el.updateComplete;
    expect(el.querySelector('.kopfzeile-terminal')!.classList.contains('aktiv')).toBe(true);
    el.remove();
  });

  it('project symbol navigates to the project page and is marked there', async () => {
    const el = await kopfzeile(false);
    (el.querySelector('.kopfzeile-projekt') as HTMLButtonElement).click();
    expect(navigate).toHaveBeenCalledWith('projekt');
    expect(el.querySelector('.kopfzeile-projekt')!.classList.contains('aktiv')).toBe(false);
    view = 'projekt';
    el.titel = 'Projekt';
    await el.updateComplete;
    expect(el.querySelector('.kopfzeile-projekt')!.classList.contains('aktiv')).toBe(true);
    el.remove();
  });

  it('connection hint is text, not a control', async () => {
    const el = await kopfzeile(false);
    expect(el.querySelector('.kopfzeile-verbindung')).toBeNull();
    el.reconnecting = true;
    await el.updateComplete;
    const hint = el.querySelector('.kopfzeile-verbindung')!;
    expect(hint.tagName).toBe('SPAN');
    expect(hint.textContent).toContain('Verbindung');
    expect(el.querySelectorAll('.kopfzeile button').length).toBe(2);
    el.remove();
  });
});
