// @vitest-environment happy-dom
/**
 * INT-2026-018 (AK-02, AK-07, O1): the box „Nächster Schritt" with a live
 * session of an earlier phase — preselection of the session's model and
 * target, the two announcements (continue in the session / new session and
 * close it), the reason of a lock, no re-preselection on a broadcast with
 * the same session, a session worktree the target list does not know (E3),
 * and the event detail after the click (`modus`, `geschlossen`).
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { VorhabenNextStep } from '../../src/shared/types/vorhaben.protocol.js';

vi.mock('../../frontend/src/gateway.js', () => ({
  gateway: { send: vi.fn(), on: vi.fn(), off: vi.fn(), getConnectionStatus: () => false, isConnecting: () => false, getProjectPath: vi.fn() },
}));

const startStep = vi.fn(async () => ({ sessionId: 's1', modus: 'in_sitzung' as const }));
const targets = vi.fn(async () => ({ isGitRepo: true, worktrees: [] as Array<{ path: string; name: string; branch: string | null; isProjectRoot: boolean; missing: boolean }>, worktreeCreationEnabled: true }));
const models = {
  providers: [
    { id: 'anthropic', name: 'Anthropic', models: [{ id: 'opus', name: 'Opus', providerId: 'anthropic' }, { id: 'haiku', name: 'Haiku', providerId: 'anthropic' }] },
    { id: 'glm', name: 'GLM', models: [{ id: 'glm-5.2', name: 'GLM 5.2', providerId: 'glm' }] },
  ],
  defaultSelection: { providerId: 'anthropic', modelId: 'opus' },
  stepDefaults: { intent: { providerId: 'anthropic', modelId: 'haiku' }, spec: { providerId: 'anthropic', modelId: 'opus' }, plan: { providerId: 'anthropic', modelId: 'opus' }, build: { providerId: 'glm', modelId: 'glm-5.2' } },
};
vi.mock('../../frontend/src/services/vorhaben.service.js', () => ({
  vorhabenService: {
    modelList: vi.fn(async () => models),
    targets: (...a: unknown[]) => targets(...(a as [])),
    startStep: (...a: unknown[]) => startStep(...(a as [])),
  },
  VorhabenRequestError: class extends Error {},
}));

const settle = async (el: HTMLElement & { updateComplete: Promise<boolean> }): Promise<void> => {
  for (let i = 0; i < 6; i++) {
    await el.updateComplete;
    await new Promise((r) => setTimeout(r, 5));
  }
};

const HAIKU = { providerId: 'anthropic', modelId: 'haiku' };
const sitzung = (o: Partial<NonNullable<VorhabenNextStep['sitzung']>> = {}): NonNullable<VorhabenNextStep['sitzung']> => ({ id: 's1', name: 'intent INT-2026-004', model: HAIKU, target: { kind: 'main' }, ...o });

async function kasten(o: { sitzung?: VorhabenNextStep['sitzung']; sperre?: 'arbeitet' | 'dialog' | 'unbekannt' | 'erste_eingabe' | 'freigabe_offen' | 'gleiche_phase' | null; gesperrt?: boolean; lastModel?: { providerId: string; modelId: string } } = {}) {
  await import('../../frontend/src/components/vorhaben/aos-naechster-schritt.js');
  const el = document.createElement('aos-naechster-schritt');
  el.projectId = 'p';
  el.projectPath = '/p';
  el.intentId = 'INT-2026-004';
  el.step = 'plan';
  el.command = '/specwright:plan INT-2026-004';
  el.label = 'Plan erstellen';
  el.compact = true;
  el.sitzung = o.sitzung;
  el.sperre = o.sperre ?? null;
  el.gesperrt = o.gesperrt ?? false;
  el.lastModel = o.lastModel;
  document.body.appendChild(el);
  await settle(el);
  return el;
}
const text = (el: HTMLElement): string => el.shadowRoot!.querySelector('.text')!.textContent!.replace(/\s+/g, ' ').trim();
const select = (el: HTMLElement): HTMLSelectElement => el.shadowRoot!.querySelector('select[aria-label="Arbeitskopie"]') as HTMLSelectElement;
const selector = (el: HTMLElement) => el.shadowRoot!.querySelector('aos-model-selector') as HTMLElement & { externalSelectedModelId: string; externalSelectedProviderId: string };
const chooseModel = async (el: HTMLElement & { updateComplete: Promise<boolean> }, providerId: string, modelId: string): Promise<void> => {
  selector(el).dispatchEvent(new CustomEvent('model-changed', { detail: { providerId, modelId }, bubbles: true, composed: true }));
  await settle(el);
};
const chooseTarget = async (el: HTMLElement & { updateComplete: Promise<boolean> }, value: string): Promise<void> => {
  const s = select(el);
  s.value = value;
  s.dispatchEvent(new Event('change'));
  await settle(el);
};

describe('aos-naechster-schritt with a live session (INT-2026-018)', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
    startStep.mockClear();
    targets.mockClear();
    targets.mockImplementation(async () => ({ isGitRepo: true, worktrees: [], worktreeCreationEnabled: true }));
  });

  it('O1/AK-07: preselects the session\'s model and target (not lastModel, not the step default) and announces „/clear, dann Befehl"; the click sends exactly that', async () => {
    const el = await kasten({ sitzung: sitzung(), lastModel: { providerId: 'anthropic', modelId: 'opus' } });
    expect(selector(el).externalSelectedModelId).toBe('haiku');
    expect(select(el).value).toBe('main');
    expect(text(el)).toBe("startet in der laufenden Sitzung ‚intent INT-2026-004': /clear, dann /specwright:plan INT-2026-004");
    expect(el.shadowRoot!.querySelector('.sperre')).toBeNull();
    const started: unknown[] = [];
    el.addEventListener('vorhaben-session-started', (e) => started.push((e as CustomEvent).detail));
    (el.shadowRoot!.querySelector('button.start') as HTMLButtonElement).click();
    await settle(el);
    expect(startStep).toHaveBeenCalledWith('p', 'INT-2026-004', 'plan', HAIKU, { kind: 'main' });
    expect(started).toEqual([{ sessionId: 's1', step: 'plan', intentId: 'INT-2026-004', modus: 'in_sitzung' }]);
    el.remove();
  });

  it('AK-07: another model or another target → „neue Sitzung … wird geschlossen"; back to the session\'s values → „in der laufenden Sitzung"; the event carries geschlossen', async () => {
    startStep.mockImplementationOnce(async () => ({ sessionId: 'cs-2', modus: 'neu' as const, geschlossen: 's1' }) as never);
    const el = await kasten({ sitzung: sitzung() });
    await chooseModel(el, 'anthropic', 'opus');
    expect(text(el)).toBe("startet eine neue Sitzung mit /specwright:plan INT-2026-004 (Standard Plan) — die laufende ‚intent INT-2026-004' wird geschlossen");
    await chooseModel(el, 'anthropic', 'haiku');
    expect(text(el)).toContain('startet in der laufenden Sitzung');
    await chooseTarget(el, 'new');
    expect(text(el)).toContain("die laufende ‚intent INT-2026-004' wird geschlossen");
    const started: unknown[] = [];
    el.addEventListener('vorhaben-session-started', (e) => started.push((e as CustomEvent).detail));
    (el.shadowRoot!.querySelector('button.start') as HTMLButtonElement).click();
    await settle(el);
    expect(startStep).toHaveBeenCalledWith('p', 'INT-2026-004', 'plan', HAIKU, { kind: 'new-worktree' });
    expect(started).toEqual([{ sessionId: 'cs-2', step: 'plan', intentId: 'INT-2026-004', modus: 'neu', geschlossen: 's1' }]);
    el.remove();
  });

  it('without a session: today\'s sentence and lastModel → step default; the click sends modus from the answer', async () => {
    startStep.mockImplementationOnce(async () => ({ sessionId: 'cs-3', modus: 'neu' as const }) as never);
    const el = await kasten({ lastModel: { providerId: 'glm', modelId: 'glm-5.2' } });
    expect(text(el)).toBe('startet eine Sitzung mit /specwright:plan INT-2026-004');
    expect(selector(el).externalSelectedModelId).toBe('glm-5.2');
    const started: unknown[] = [];
    el.addEventListener('vorhaben-session-started', (e) => started.push((e as CustomEvent).detail));
    (el.shadowRoot!.querySelector('button.start') as HTMLButtonElement).click();
    await settle(el);
    expect(started).toEqual([{ sessionId: 'cs-3', step: 'plan', intentId: 'INT-2026-004', modus: 'neu' }]);
    el.remove();
  });

  it('AK-02: a lock shows the backend\'s reason (NEXT_STEP_SPERRE_TEXT) in the hint and the button title; without a reason today\'s sentence', async () => {
    const el = await kasten({ gesperrt: true, sperre: 'gleiche_phase', sitzung: undefined });
    expect(el.shadowRoot!.querySelector('.sperre')?.textContent).toBe('die Sitzung gehört schon zu diesem Schritt — im Terminal fortsetzen oder freigeben.');
    expect((el.shadowRoot!.querySelector('button.start') as HTMLButtonElement).title).toBe('die Sitzung gehört schon zu diesem Schritt — im Terminal fortsetzen oder freigeben');
    expect((el.shadowRoot!.querySelector('button.start') as HTMLButtonElement).disabled).toBe(true);
    el.sperre = 'unbekannt';
    await settle(el);
    expect(el.shadowRoot!.querySelector('.sperre')?.textContent).toContain('Zustand der Sitzung unbekannt');
    el.sperre = null;
    await settle(el);
    expect(el.shadowRoot!.querySelector('.sperre')?.textContent).toBe('Sitzung arbeitet oder wartet — erst danach kann der nächste Schritt starten.');
    el.remove();
  });

  it('F11: a second broadcast with the same session id does not overwrite a changed choice; a new session id preselects again and reloads the targets', async () => {
    const el = await kasten({ sitzung: sitzung() });
    expect(targets).toHaveBeenCalledTimes(1);
    await chooseModel(el, 'anthropic', 'opus');
    expect(selector(el).externalSelectedModelId).toBe('opus');
    el.sitzung = sitzung(); // new object, same id — like every vorhaben:state
    el.lastModel = { providerId: 'anthropic', modelId: 'haiku' };
    await settle(el);
    expect(selector(el).externalSelectedModelId).toBe('opus');
    expect(text(el)).toContain('wird geschlossen');
    // another session of the row (the old one ended, a new one started) in a worktree
    targets.mockImplementation(async () => ({ isGitRepo: true, worktrees: [{ path: '/p-worktrees/session-9', name: 'session-9', branch: 'session/9', isProjectRoot: false, missing: false }], worktreeCreationEnabled: true }));
    el.sitzung = sitzung({ id: 's9', name: 'spec INT-2026-004', model: { providerId: 'glm', modelId: 'glm-5.2' }, target: { kind: 'existing-worktree', path: '/p-worktrees/session-9' } });
    await settle(el);
    expect(targets).toHaveBeenCalledTimes(2);
    expect(selector(el).externalSelectedModelId).toBe('glm-5.2');
    expect(select(el).value).toBe('/p-worktrees/session-9');
    expect(text(el)).toBe("startet in der laufenden Sitzung ‚spec INT-2026-004': /clear, dann /specwright:plan INT-2026-004");
    el.remove();
  });

  it('E3: the session\'s worktree is missing from the target list even after a reload → an option „Worktree <basename>" is added and selected; the click sends that path', async () => {
    const el = await kasten({ sitzung: sitzung({ target: { kind: 'existing-worktree', path: '/tmp/wt/session-42' } }) });
    expect(targets).toHaveBeenCalledTimes(2); // mount + E3 reload
    const opt = [...select(el).options].find((o) => o.value === '/tmp/wt/session-42');
    expect(opt?.textContent).toBe('Worktree session-42');
    expect(select(el).value).toBe('/tmp/wt/session-42');
    expect(text(el)).toContain('startet in der laufenden Sitzung');
    (el.shadowRoot!.querySelector('button.start') as HTMLButtonElement).click();
    await settle(el);
    expect(startStep).toHaveBeenCalledWith('p', 'INT-2026-004', 'plan', HAIKU, { kind: 'existing-worktree', path: '/tmp/wt/session-42' });
    // switching to „Im Projekt" announces the new session
    await chooseTarget(el, 'main');
    expect(text(el)).toContain('wird geschlossen');
    el.remove();
  });

  it('AK-08: a refused start shows the backend\'s message in the box and keeps the button usable', async () => {
    startStep.mockImplementationOnce(async () => {
      throw new Error('Leeren der Sitzung nicht bestätigt — erneut versuchen oder /clear im Terminal tippen');
    });
    const el = await kasten({ sitzung: sitzung() });
    (el.shadowRoot!.querySelector('button.start') as HTMLButtonElement).click();
    await settle(el);
    expect(el.shadowRoot!.querySelector('.fehler')?.textContent).toContain('Leeren der Sitzung nicht bestätigt');
    expect((el.shadowRoot!.querySelector('button.start') as HTMLButtonElement).disabled).toBe(false);
    el.remove();
  });
});
