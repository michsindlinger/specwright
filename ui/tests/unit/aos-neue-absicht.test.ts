// @vitest-environment happy-dom
/**
 * INT-2026-010 stage 2 (plan §4 #67): the page „Neue Absicht" has exactly
 * three elements (FA-10), „Starten" calls start-step intent with the text as
 * firstInput and emits vorhaben-session-started (FA-11); while a `/intent`
 * session of the project is pending the card replaces the form — Mac points
 * to the Gespräch, phone to the terminal (AK-06) — and names the pending
 * first input until it is delivered. Also: the `gesperrt` state of
 * aos-naechster-schritt (FA-21) and the shared model preselection helper.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { VorhabenPendingIntent } from '../../src/shared/types/vorhaben.protocol.js';

vi.mock('../../frontend/src/gateway.js', () => ({
  gateway: { send: vi.fn(), on: vi.fn(), off: vi.fn(), getConnectionStatus: () => false, isConnecting: () => false, getProjectPath: vi.fn() },
}));

const startStep = vi.fn(async () => ({ sessionId: 'cs-9' }));
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
    targets: vi.fn(async () => ({ isGitRepo: false, worktrees: [], worktreeCreationEnabled: false })),
    startStep: (...a: unknown[]) => startStep(...(a as [])),
  },
}));

const settle = async (el: HTMLElement & { updateComplete: Promise<boolean> }): Promise<void> => {
  for (let i = 0; i < 5; i++) {
    await el.updateComplete;
    await new Promise((r) => setTimeout(r, 5));
  }
};

const pendingOf = (o: Partial<VorhabenPendingIntent> = {}, session: Partial<VorhabenPendingIntent['session']> = {}): VorhabenPendingIntent => ({
  sessionId: 'cloud-1-7', projectId: 'p', cwd: '/p', arbeitskopie: 'main', since: '2026-09-16T09:00:00.000Z',
  session: { id: 'cloud-1-7', name: 'intent', model: 'haiku', agentStatus: 'working', ...session },
  ...o,
});

async function neu(mobile = false, pending: VorhabenPendingIntent | null = null) {
  await import('../../frontend/src/components/vorhaben/aos-neue-absicht.js');
  const el = document.createElement('aos-neue-absicht');
  el.projectId = 'p';
  el.projectPath = '/p';
  el.projectName = 'P';
  el.mobile = mobile;
  el.pending = pending;
  document.body.appendChild(el);
  await settle(el);
  return el;
}

describe('aos-neue-absicht (FA-10, FA-11)', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
    startStep.mockClear();
  });

  it('exactly three elements: text field with the placeholder, model choice preselected to the intent step default, „Starten" disabled while the text is empty', async () => {
    const el = await neu();
    const sr = el.shadowRoot!;
    const controls = [...sr.querySelectorAll('textarea, aos-model-selector, button, select, input')];
    expect(controls.map((c) => c.tagName.toLowerCase())).toEqual(['textarea', 'aos-model-selector', 'button']);
    expect(sr.querySelector('textarea')!.placeholder).toBe('Was stört, wen, seit wann?');
    const sel = sr.querySelector('aos-model-selector')!;
    expect(sel.externalSelectedModelId).toBe('haiku');
    expect(sel.externalSelectedProviderId).toBe('anthropic');
    const start = sr.querySelector('button.start') as HTMLButtonElement;
    expect(start.textContent?.trim()).toBe('Starten');
    expect(start.disabled).toBe(true);
    el.remove();
  });

  it('„Starten" calls start-step intent in the main project with the trimmed text as firstInput and emits vorhaben-session-started; the field is cleared', async () => {
    const el = await neu();
    const sr = el.shadowRoot!;
    const ta = sr.querySelector('textarea')!;
    ta.value = '  Die Liste sortiert falsch, seit gestern.  ';
    ta.dispatchEvent(new Event('input'));
    await settle(el);
    const start = sr.querySelector('button.start') as HTMLButtonElement;
    expect(start.disabled).toBe(false);
    // a different model picked in the selector travels with the start
    sr.querySelector('aos-model-selector')!.dispatchEvent(new CustomEvent('model-changed', { detail: { providerId: 'glm', modelId: 'glm-5.2' }, bubbles: true, composed: true }));
    await settle(el);
    const started: unknown[] = [];
    el.addEventListener('vorhaben-session-started', (e) => started.push((e as CustomEvent).detail));
    start.click();
    await settle(el);
    expect(startStep).toHaveBeenCalledWith('p', undefined, 'intent', { providerId: 'glm', modelId: 'glm-5.2' }, { kind: 'main' }, { firstInput: 'Die Liste sortiert falsch, seit gestern.' });
    expect(started).toEqual([{ sessionId: 'cs-9', step: 'intent' }]);
    expect(sr.querySelector('textarea')!.value).toBe('');
    el.remove();
  });

  it('Cmd/Ctrl+Enter starts like the button; a failed start shows the error and keeps the text', async () => {
    startStep.mockRejectedValueOnce(new Error('Kein Modell für intent konfiguriert — Projekt › Einstellungen › Modelle'));
    const el = await neu();
    const sr = el.shadowRoot!;
    const ta = sr.querySelector('textarea')!;
    ta.value = 'Text';
    ta.dispatchEvent(new Event('input'));
    await settle(el);
    ta.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', metaKey: true, bubbles: true }));
    await settle(el);
    expect(startStep).toHaveBeenCalledTimes(1);
    expect(sr.querySelector('.fehler')?.textContent).toContain('Kein Modell für intent konfiguriert');
    expect(sr.querySelector('textarea')!.value).toBe('Text');
    // plain Enter is a line break, not a start
    ta.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
    await settle(el);
    expect(startStep).toHaveBeenCalledTimes(1);
    el.remove();
  });

  it('pending session: the card replaces the form — Mac „Gespräch rechts", phone „im Terminal antworten" with a terminal button; the pending first input is named until delivered (AK-06, plan §3)', async () => {
    const seen: string[] = [];
    const onOpen = (e: Event): void => {
      seen.push((e as CustomEvent<{ sessionId: string }>).detail.sessionId);
    };
    document.addEventListener('open-terminal-session', onOpen);
    const el = await neu(false, pendingOf({}, { firstInputPending: true }));
    const sr = el.shadowRoot!;
    expect(sr.querySelector('textarea')).toBeNull();
    expect(sr.textContent).toContain('Absicht-Sitzung „intent" läuft — Vorhaben entsteht');
    expect(sr.textContent).toContain('Gespräch rechts');
    expect(sr.textContent).toContain('Dein Text wird nach der ersten Frage übergeben.');
    (sr.querySelector('button.terminal') as HTMLButtonElement).click();
    expect(seen).toEqual(['cloud-1-7']);
    // delivered → the hint is gone
    el.pending = pendingOf();
    await settle(el);
    expect(sr.textContent).not.toContain('Dein Text wird nach der ersten Frage übergeben.');
    // the session is gone → the form is back
    el.pending = null;
    await settle(el);
    expect(sr.querySelector('textarea')).not.toBeNull();
    el.remove();
    const m = await neu(true, pendingOf());
    expect(m.shadowRoot!.textContent).toContain('im Terminal antworten');
    (m.shadowRoot!.querySelector('button.terminal') as HTMLButtonElement).click();
    expect(seen).toEqual(['cloud-1-7', 'cloud-1-7']);
    document.removeEventListener('open-terminal-session', onOpen);
    m.remove();
  });
});

describe('aos-naechster-schritt gesperrt (FA-21) and model-wahl', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
    startStep.mockClear();
  });

  it('gesperrt: the start button is disabled with a hint and a click starts nothing; released → starts', async () => {
    await import('../../frontend/src/components/vorhaben/aos-naechster-schritt.js');
    const el = document.createElement('aos-naechster-schritt');
    el.projectId = 'p';
    el.projectPath = '/p';
    el.intentId = 'INT-2026-004';
    el.step = 'spec';
    el.gesperrt = true;
    document.body.appendChild(el);
    await settle(el);
    const sr = el.shadowRoot!;
    const start = sr.querySelector('button.start') as HTMLButtonElement;
    expect(start.disabled).toBe(true);
    expect(el.hasAttribute('gesperrt')).toBe(true);
    expect(sr.querySelector('.sperre')?.textContent).toContain('Sitzung arbeitet oder wartet');
    start.click();
    await settle(el);
    expect(startStep).not.toHaveBeenCalled();
    el.gesperrt = false;
    await settle(el);
    expect((sr.querySelector('button.start') as HTMLButtonElement).disabled).toBe(false);
    expect(sr.querySelector('.sperre')).toBeNull();
    (sr.querySelector('button.start') as HTMLButtonElement).click();
    await settle(el);
    expect(startStep).toHaveBeenCalledWith('p', 'INT-2026-004', 'spec', { providerId: 'anthropic', modelId: 'opus' }, { kind: 'main' });
    el.remove();
  });

  it('vorauswahl: last model → step default → general default; unknown selections are skipped', async () => {
    const { vorauswahl, modellVorhanden, istSchrittStandard } = await import('../../frontend/src/components/vorhaben/model-wahl.js');
    expect(vorauswahl(models, 'intent', undefined)).toEqual({ providerId: 'anthropic', modelId: 'haiku' });
    expect(vorauswahl(models, 'build', undefined)).toEqual({ providerId: 'glm', modelId: 'glm-5.2' });
    expect(vorauswahl(models, 'build', { providerId: 'anthropic', modelId: 'opus' })).toEqual({ providerId: 'anthropic', modelId: 'opus' });
    expect(vorauswahl(models, 'build', { providerId: 'nope', modelId: 'x' })).toEqual({ providerId: 'glm', modelId: 'glm-5.2' });
    expect(vorauswahl({ ...models, stepDefaults: {} as typeof models.stepDefaults }, 'spec', undefined)).toEqual({ providerId: 'anthropic', modelId: 'opus' });
    expect(modellVorhanden(models, { providerId: 'glm', modelId: 'opus' })).toBe(false);
    expect(istSchrittStandard(models, 'intent', { providerId: 'anthropic', modelId: 'haiku' }, undefined)).toBe(true);
    expect(istSchrittStandard(models, 'intent', { providerId: 'anthropic', modelId: 'haiku' }, { providerId: 'anthropic', modelId: 'haiku' })).toBe(false);
  });
});
