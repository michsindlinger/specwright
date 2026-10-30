// @vitest-environment happy-dom
/**
 * INT-2026-038 (AK-09, FA-01, FA-12): aos-handoff-knopf — only in active
 * Claude sessions with a known agent status; locked („Wechsel läuft …")
 * while the backend broadcast lists the session; a click asks the backend
 * and does not bubble (the tab must not switch).
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../../frontend/src/gateway.js', () => ({
  gateway: { send: vi.fn(), on: vi.fn(), off: vi.fn(), getConnectionStatus: () => false },
}));

import type { AosHandoffKnopf } from '../../frontend/src/components/terminal/aos-handoff-knopf.js';
import type { VorhabenState } from '../../src/shared/types/vorhaben.protocol.js';

type Sitzung = NonNullable<AosHandoffKnopf['session']>;

function fakeQuelle() {
  let listener: ((s: VorhabenState | null) => void) | null = null;
  return {
    handoffStarten: vi.fn(async (_id: string): Promise<void> => {}),
    subscribe(l: (s: VorhabenState | null) => void) {
      listener = l;
      l(null);
      return () => {
        listener = null;
      };
    },
    melde(handoffWechsel: string[]) {
      listener?.({ handoffWechsel } as unknown as VorhabenState);
    },
  };
}

async function knopf(session: Sitzung) {
  await import('../../frontend/src/components/terminal/aos-handoff-knopf.js');
  const quelle = fakeQuelle();
  const el = document.createElement('aos-handoff-knopf');
  el.quelle = quelle;
  el.session = session;
  document.body.appendChild(el);
  await el.updateComplete;
  return { el, quelle };
}

const button = (el: AosHandoffKnopf) => el.shadowRoot!.querySelector('button');

describe('aos-handoff-knopf', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });

  it('hidden in a shell, with unknown or missing agent status, and in an inactive session', async () => {
    for (const s of [
      { id: 'a', status: 'active', terminalType: 'shell', agentStatus: 'done' },
      { id: 'b', status: 'active', terminalType: 'claude-code', agentStatus: 'unknown' },
      { id: 'c', status: 'active', terminalType: 'claude-code' },
      { id: 'd', status: 'disconnected', terminalType: 'claude-code', agentStatus: 'done' },
    ] as Sitzung[]) {
      const { el } = await knopf(s);
      expect(el.hidden, s.id).toBe(true);
      expect(button(el)).toBeNull();
    }
  });

  it('active Claude session → „Handoff"; a click asks the backend once and does not bubble', async () => {
    const { el, quelle } = await knopf({ id: 's1', status: 'active', terminalType: 'claude-code', agentStatus: 'done' });
    expect(el.hidden).toBe(false);
    const b = button(el)!;
    expect(b.textContent).toBe('Handoff');
    expect(b.getAttribute('title')).toBe('Handoff schreiben, Sitzung leeren, Handoff einlesen');
    const parent = vi.fn();
    document.body.addEventListener('click', parent);
    b.click();
    expect(quelle.handoffStarten).toHaveBeenCalledWith('s1');
    expect(parent).not.toHaveBeenCalled();
  });

  it('listed in `handoffWechsel` → disabled „Wechsel läuft …"; unlisted again → ready', async () => {
    const { el, quelle } = await knopf({ id: 's1', status: 'active', terminalType: 'claude-code', agentStatus: 'working' });
    quelle.melde(['s1']);
    await el.updateComplete;
    expect(button(el)!.disabled).toBe(true);
    expect(button(el)!.textContent).toBe('Wechsel läuft …');
    quelle.melde(['andere']);
    await el.updateComplete;
    expect(button(el)!.disabled).toBe(false);
  });
});
