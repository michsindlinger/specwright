// @vitest-environment happy-dom

/**
 * Unit tests for CLOG-003: <aos-claude-log-panel>
 *
 * Verifies:
 *  - Subscribes to cloud-terminal:* with sessionId filter
 *  - Sends cloud-terminal:buffer-request on connect
 *  - Re-requests buffer on gateway.connected (reconnect)
 *  - Strips ANSI from streamed data and from buffer hydration
 *  - RAF-batches multiple chunks into a single render
 *  - Resubscribes when sessionId changes
 *  - Cleans up listeners on disconnect
 *  - Respects user-scrolled-up state (no auto-scroll)
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { WebSocketMessage } from '../../frontend/src/gateway';

const { mockGateway, handlers, emit } = vi.hoisted(() => {
  type Handler = (msg: WebSocketMessage) => void;
  const handlers = new Map<string, Set<Handler>>();
  const mockGateway = {
    on: vi.fn((type: string, h: Handler) => {
      if (!handlers.has(type)) handlers.set(type, new Set());
      handlers.get(type)!.add(h);
    }),
    off: vi.fn((type: string, h: Handler) => {
      handlers.get(type)?.delete(h);
    }),
    send: vi.fn(),
  };
  function emit(type: string, msg: Record<string, unknown>): void {
    handlers.get(type)?.forEach((h) => h({ type, ...msg } as WebSocketMessage));
  }
  return { mockGateway, handlers, emit };
});

vi.mock('../../frontend/src/gateway', () => ({
  gateway: mockGateway,
}));

// Importing the component registers it as a custom element.
await import('../../frontend/src/components/aos-claude-log-panel');

import type { AosClaudeLogPanel } from '../../frontend/src/components/aos-claude-log-panel';

function createPanel(sessionId?: string): AosClaudeLogPanel {
  const el = document.createElement('aos-claude-log-panel') as AosClaudeLogPanel;
  if (sessionId !== undefined) el.sessionId = sessionId;
  document.body.appendChild(el);
  return el;
}

async function flushRaf(): Promise<void> {
  await new Promise<void>((resolve) =>
    requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
  );
}

function panelText(el: AosClaudeLogPanel): string {
  const node = el.shadowRoot?.querySelector('.log-panel');
  return node?.textContent ?? '';
}

describe('AosClaudeLogPanel', () => {
  beforeEach(() => {
    handlers.clear();
    mockGateway.on.mockClear();
    mockGateway.off.mockClear();
    mockGateway.send.mockClear();
  });

  afterEach(() => {
    document.body.innerHTML = '';
  });

  it('exports the AosClaudeLogPanel class', async () => {
    const mod = await import('../../frontend/src/components/aos-claude-log-panel');
    expect(mod.AosClaudeLogPanel).toBeDefined();
  });

  it('does not subscribe when sessionId is empty', async () => {
    const el = createPanel();
    await el.updateComplete;
    expect(mockGateway.on).not.toHaveBeenCalled();
    expect(mockGateway.send).not.toHaveBeenCalled();
  });

  it('subscribes and requests buffer when sessionId is set on connect', async () => {
    const el = createPanel('sess-1');
    await el.updateComplete;

    const subscribed = mockGateway.on.mock.calls.map((c) => c[0]);
    expect(subscribed).toContain('cloud-terminal:data');
    expect(subscribed).toContain('cloud-terminal:buffer-response');
    expect(subscribed).toContain('gateway.connected');

    expect(mockGateway.send).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'cloud-terminal:buffer-request', sessionId: 'sess-1' }),
    );
  });

  it('cleans up listeners on disconnect', async () => {
    const el = createPanel('sess-1');
    await el.updateComplete;
    mockGateway.off.mockClear();

    el.remove();

    const removed = mockGateway.off.mock.calls.map((c) => c[0]);
    expect(removed).toContain('cloud-terminal:data');
    expect(removed).toContain('cloud-terminal:buffer-response');
    expect(removed).toContain('gateway.connected');
  });

  it('ignores chunks for other sessionIds', async () => {
    const el = createPanel('sess-1');
    await el.updateComplete;

    emit('cloud-terminal:data', { sessionId: 'sess-1', data: 'hello' });
    emit('cloud-terminal:data', { sessionId: 'other', data: 'IGNORED' });

    await flushRaf();
    await el.updateComplete;

    const text = panelText(el);
    expect(text).toContain('hello');
    expect(text).not.toContain('IGNORED');
  });

  it('strips ANSI codes from streamed data', async () => {
    const el = createPanel('sess-1');
    await el.updateComplete;

    emit('cloud-terminal:data', {
      sessionId: 'sess-1',
      data: '\x1B[31mred\x1B[0m \x1B[1;33mbold\x1B[0m',
    });

    await flushRaf();
    await el.updateComplete;

    expect(panelText(el)).toBe('red bold');
  });

  it('hydrates from buffer-response and strips ANSI', async () => {
    const el = createPanel('sess-1');
    await el.updateComplete;

    emit('cloud-terminal:buffer-response', {
      sessionId: 'sess-1',
      buffer: '\x1B[32minit\x1B[0m\nline 2',
    });

    await el.updateComplete;

    const text = panelText(el);
    expect(text).toContain('init');
    expect(text).toContain('line 2');
    expect(text).not.toMatch(/\x1B\[/);
  });

  it('ignores buffer-response for other sessionIds', async () => {
    const el = createPanel('sess-1');
    await el.updateComplete;

    emit('cloud-terminal:buffer-response', { sessionId: 'other', buffer: 'NOT MINE' });
    await el.updateComplete;

    expect(panelText(el)).not.toContain('NOT MINE');
  });

  it('batches multiple chunks via RAF (single requestAnimationFrame call)', async () => {
    const el = createPanel('sess-1');
    await el.updateComplete;

    const rafSpy = vi.spyOn(window, 'requestAnimationFrame');

    for (let i = 0; i < 100; i++) {
      emit('cloud-terminal:data', { sessionId: 'sess-1', data: `line${i}\n` });
    }

    expect(rafSpy).toHaveBeenCalledTimes(1);

    await flushRaf();
    await el.updateComplete;

    const text = panelText(el);
    expect(text).toContain('line0');
    expect(text).toContain('line99');

    rafSpy.mockRestore();
  });

  it('switches subscription when sessionId changes', async () => {
    const el = createPanel('sess-1');
    await el.updateComplete;

    mockGateway.off.mockClear();
    mockGateway.on.mockClear();
    mockGateway.send.mockClear();

    el.sessionId = 'sess-2';
    await el.updateComplete;

    const removed = mockGateway.off.mock.calls.map((c) => c[0]);
    expect(removed).toContain('cloud-terminal:data');

    const added = mockGateway.on.mock.calls.map((c) => c[0]);
    expect(added).toContain('cloud-terminal:data');

    expect(mockGateway.send).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'cloud-terminal:buffer-request', sessionId: 'sess-2' }),
    );
  });

  it('clears existing log when sessionId changes', async () => {
    const el = createPanel('sess-1');
    await el.updateComplete;

    emit('cloud-terminal:data', { sessionId: 'sess-1', data: 'old session output' });
    await flushRaf();
    await el.updateComplete;
    expect(panelText(el)).toContain('old session output');

    el.sessionId = 'sess-2';
    await el.updateComplete;

    expect(panelText(el)).not.toContain('old session output');
  });

  it('re-requests buffer on gateway.connected (reconnect)', async () => {
    const el = createPanel('sess-1');
    await el.updateComplete;

    mockGateway.send.mockClear();

    emit('gateway.connected', {});

    expect(mockGateway.send).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'cloud-terminal:buffer-request', sessionId: 'sess-1' }),
    );
  });

  it('drops empty data chunks without scheduling RAF', async () => {
    const el = createPanel('sess-1');
    await el.updateComplete;

    const rafSpy = vi.spyOn(window, 'requestAnimationFrame');

    emit('cloud-terminal:data', { sessionId: 'sess-1', data: '' });

    expect(rafSpy).not.toHaveBeenCalled();
    rafSpy.mockRestore();
  });

  it('ignores non-string data payloads', async () => {
    const el = createPanel('sess-1');
    await el.updateComplete;

    const rafSpy = vi.spyOn(window, 'requestAnimationFrame');

    emit('cloud-terminal:data', { sessionId: 'sess-1', data: { not: 'string' } });
    emit('cloud-terminal:data', { sessionId: 'sess-1', data: 42 });

    expect(rafSpy).not.toHaveBeenCalled();
    rafSpy.mockRestore();
  });
});

function copyButton(el: AosClaudeLogPanel): HTMLButtonElement {
  return el.shadowRoot!.querySelectorAll('.icon-btn')[0] as HTMLButtonElement;
}

function terminalButton(el: AosClaudeLogPanel): HTMLButtonElement {
  return el.shadowRoot!.querySelectorAll('.icon-btn')[1] as HTMLButtonElement;
}

function fullscreenButton(el: AosClaudeLogPanel): HTMLButtonElement {
  return el.shadowRoot!.querySelectorAll('.icon-btn')[2] as HTMLButtonElement;
}

function feedbackEl(el: AosClaudeLogPanel): HTMLSpanElement | null {
  return el.shadowRoot!.querySelector('.copy-feedback') as HTMLSpanElement | null;
}

async function emitData(el: AosClaudeLogPanel, sessionId: string, data: string): Promise<void> {
  emit('cloud-terminal:data', { sessionId, data });
  await flushRaf();
  await el.updateComplete;
}

describe('AosClaudeLogPanel — copy button', () => {
  let writeText: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    handlers.clear();
    mockGateway.on.mockClear();
    mockGateway.off.mockClear();
    mockGateway.send.mockClear();

    writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'clipboard', {
      value: { writeText },
      configurable: true,
      writable: true,
    });
  });

  afterEach(() => {
    document.body.innerHTML = '';
    vi.useRealTimers();
  });

  it('disables copy button when log is empty', async () => {
    const el = createPanel('sess-1');
    await el.updateComplete;
    expect(copyButton(el).disabled).toBe(true);
  });

  it('enables copy button when log has content', async () => {
    const el = createPanel('sess-1');
    await el.updateComplete;
    await emitData(el, 'sess-1', 'hello');
    expect(copyButton(el).disabled).toBe(false);
  });

  it('writes ANSI-stripped log text to clipboard on click', async () => {
    const el = createPanel('sess-1');
    await el.updateComplete;
    emit('cloud-terminal:data', { sessionId: 'sess-1', data: '\x1B[31mred\x1B[0m text' });
    await flushRaf();
    await el.updateComplete;

    copyButton(el).click();
    await Promise.resolve();

    expect(writeText).toHaveBeenCalledWith('red text');
  });

  it('shows "Kopiert" feedback on success', async () => {
    const el = createPanel('sess-1');
    await el.updateComplete;
    await emitData(el, 'sess-1', 'hello');

    copyButton(el).click();
    await Promise.resolve();
    await Promise.resolve();
    await el.updateComplete;

    const fb = feedbackEl(el);
    expect(fb?.textContent).toBe('Kopiert');
    expect(fb?.classList.contains('visible')).toBe(true);
    expect(fb?.classList.contains('err')).toBe(false);
  });

  it('shows "Fehler" feedback when clipboard write rejects', async () => {
    writeText.mockRejectedValueOnce(new Error('denied'));
    const el = createPanel('sess-1');
    await el.updateComplete;
    await emitData(el, 'sess-1', 'hello');

    copyButton(el).click();
    await Promise.resolve();
    await Promise.resolve();
    await el.updateComplete;

    const fb = feedbackEl(el);
    expect(fb?.textContent).toBe('Fehler');
    expect(fb?.classList.contains('err')).toBe(true);
  });

  it('clears feedback after 1500ms', async () => {
    vi.useFakeTimers();
    const el = createPanel('sess-1');
    await el.updateComplete;
    await emitData(el, 'sess-1', 'hello');

    copyButton(el).click();
    await Promise.resolve();
    await Promise.resolve();
    await el.updateComplete;
    expect(feedbackEl(el)?.classList.contains('visible')).toBe(true);

    vi.advanceTimersByTime(1499);
    await el.updateComplete;
    expect(feedbackEl(el)?.classList.contains('visible')).toBe(true);

    vi.advanceTimersByTime(1);
    await el.updateComplete;
    expect(feedbackEl(el)?.classList.contains('visible')).toBe(false);
  });

  it('rapid-click cancels previous reset timer', async () => {
    vi.useFakeTimers();
    const el = createPanel('sess-1');
    await el.updateComplete;
    await emitData(el, 'sess-1', 'hello');

    copyButton(el).click();
    await Promise.resolve();
    await Promise.resolve();
    await el.updateComplete;

    vi.advanceTimersByTime(800);

    copyButton(el).click();
    await Promise.resolve();
    await Promise.resolve();
    await el.updateComplete;

    vi.advanceTimersByTime(1499);
    await el.updateComplete;
    expect(feedbackEl(el)?.classList.contains('visible')).toBe(true);

    vi.advanceTimersByTime(1);
    await el.updateComplete;
    expect(feedbackEl(el)?.classList.contains('visible')).toBe(false);
  });

  it('clears pending reset timer on disconnect', async () => {
    vi.useFakeTimers();
    const clearSpy = vi.spyOn(window, 'clearTimeout');
    const el = createPanel('sess-1');
    await el.updateComplete;
    await emitData(el, 'sess-1', 'hello');

    copyButton(el).click();
    await Promise.resolve();
    await Promise.resolve();
    await el.updateComplete;

    clearSpy.mockClear();
    el.remove();

    expect(clearSpy).toHaveBeenCalled();
    clearSpy.mockRestore();
  });
});

describe('AosClaudeLogPanel — fullscreen toggle', () => {
  beforeEach(() => {
    handlers.clear();
    mockGateway.on.mockClear();
    mockGateway.off.mockClear();
    mockGateway.send.mockClear();
    Object.defineProperty(navigator, 'clipboard', {
      value: { writeText: vi.fn().mockResolvedValue(undefined) },
      configurable: true,
      writable: true,
    });
  });

  afterEach(() => {
    document.body.innerHTML = '';
  });

  it('toggles fullscreen state and reflects host attribute on click', async () => {
    const el = createPanel('sess-1');
    await el.updateComplete;
    expect(el.fullscreen).toBe(false);
    expect(el.hasAttribute('fullscreen')).toBe(false);

    fullscreenButton(el).click();
    await el.updateComplete;

    expect(el.fullscreen).toBe(true);
    expect(el.hasAttribute('fullscreen')).toBe(true);
  });

  it('exits fullscreen on Escape keydown when active', async () => {
    const el = createPanel('sess-1');
    await el.updateComplete;
    el.fullscreen = true;
    await el.updateComplete;

    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    await el.updateComplete;

    expect(el.fullscreen).toBe(false);
  });

  it('does not change state on Escape when not fullscreen', async () => {
    const el = createPanel('sess-1');
    await el.updateComplete;

    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    await el.updateComplete;

    expect(el.fullscreen).toBe(false);
  });

  it('removes keydown listener on disconnect (no leak)', async () => {
    const removeSpy = vi.spyOn(document, 'removeEventListener');
    const el = createPanel('sess-1');
    await el.updateComplete;

    el.remove();

    const removed = removeSpy.mock.calls.map((c) => c[0]);
    expect(removed).toContain('keydown');
    removeSpy.mockRestore();
  });

  it('resets fullscreen state on disconnect', async () => {
    const el = createPanel('sess-1');
    await el.updateComplete;
    el.fullscreen = true;
    await el.updateComplete;

    el.remove();

    expect(el.fullscreen).toBe(false);
  });

  it('fullscreen toggle resets userScrolledUp', async () => {
    const el = createPanel('sess-1');
    await el.updateComplete;
    await emitData(el, 'sess-1', 'a'.repeat(5000));
    const panel = el.shadowRoot!.querySelector('.log-panel') as HTMLDivElement;

    Object.defineProperty(panel, 'scrollHeight', { value: 5000, configurable: true });
    Object.defineProperty(panel, 'clientHeight', { value: 300, configurable: true });
    panel.scrollTop = 0;
    panel.dispatchEvent(new Event('scroll'));
    await el.updateComplete;

    expect(el.shadowRoot!.querySelector('.scroll-hint')).not.toBeNull();

    el.fullscreen = true;
    await el.updateComplete;

    expect(el.shadowRoot!.querySelector('.scroll-hint')).toBeNull();
  });

  it('preserves userScrolledUp across data chunks (regression: updated() guard)', async () => {
    const el = createPanel('sess-1');
    await el.updateComplete;
    await emitData(el, 'sess-1', 'a'.repeat(5000));
    const panel = el.shadowRoot!.querySelector('.log-panel') as HTMLDivElement;

    Object.defineProperty(panel, 'scrollHeight', { value: 5000, configurable: true });
    Object.defineProperty(panel, 'clientHeight', { value: 300, configurable: true });
    panel.scrollTop = 0;
    panel.dispatchEvent(new Event('scroll'));
    await el.updateComplete;

    expect(el.shadowRoot!.querySelector('.scroll-hint')).not.toBeNull();

    await emitData(el, 'sess-1', 'more data');

    expect(el.shadowRoot!.querySelector('.scroll-hint')).not.toBeNull();
  });
});

describe('AosClaudeLogPanel — stopPropagation (spy-based)', () => {
  beforeEach(() => {
    handlers.clear();
    mockGateway.on.mockClear();
    mockGateway.off.mockClear();
    mockGateway.send.mockClear();
    Object.defineProperty(navigator, 'clipboard', {
      value: { writeText: vi.fn().mockResolvedValue(undefined) },
      configurable: true,
      writable: true,
    });
  });

  afterEach(() => {
    document.body.innerHTML = '';
  });

  it('copy click stops propagation', async () => {
    const el = createPanel('sess-1');
    await el.updateComplete;
    emit('cloud-terminal:data', { sessionId: 'sess-1', data: 'x' });
    await flushRaf();
    await el.updateComplete;

    const stop = vi.fn();
    const evt = new MouseEvent('click', { bubbles: true, cancelable: true });
    Object.defineProperty(evt, 'stopPropagation', { value: stop });
    copyButton(el).dispatchEvent(evt);
    await Promise.resolve();

    expect(stop).toHaveBeenCalled();
  });

  it('fullscreen button click stops propagation', async () => {
    const el = createPanel('sess-1');
    await el.updateComplete;

    const stop = vi.fn();
    const evt = new MouseEvent('click', { bubbles: true, cancelable: true });
    Object.defineProperty(evt, 'stopPropagation', { value: stop });
    fullscreenButton(el).dispatchEvent(evt);

    expect(stop).toHaveBeenCalled();
  });

  it('toolbar background click stops propagation', async () => {
    const el = createPanel('sess-1');
    await el.updateComplete;

    const toolbar = el.shadowRoot!.querySelector('.toolbar') as HTMLDivElement;
    const stop = vi.fn();
    const evt = new MouseEvent('click', { bubbles: true, cancelable: true });
    Object.defineProperty(evt, 'stopPropagation', { value: stop });
    toolbar.dispatchEvent(evt);

    expect(stop).toHaveBeenCalled();
  });

  it('Escape on fullscreen calls stopPropagation', async () => {
    const el = createPanel('sess-1');
    await el.updateComplete;
    el.fullscreen = true;
    await el.updateComplete;

    const stop = vi.fn();
    const evt = new KeyboardEvent('keydown', { key: 'Escape' });
    Object.defineProperty(evt, 'stopPropagation', { value: stop });
    document.dispatchEvent(evt);

    expect(stop).toHaveBeenCalled();
  });

  it('Escape without fullscreen does NOT call stopPropagation', async () => {
    const el = createPanel('sess-1');
    await el.updateComplete;

    const stop = vi.fn();
    const evt = new KeyboardEvent('keydown', { key: 'Escape' });
    Object.defineProperty(evt, 'stopPropagation', { value: stop });
    document.dispatchEvent(evt);

    expect(stop).not.toHaveBeenCalled();
  });
});

describe('AosClaudeLogPanel — terminal button', () => {
  beforeEach(() => {
    handlers.clear();
    mockGateway.on.mockClear();
    mockGateway.off.mockClear();
    mockGateway.send.mockClear();
  });

  afterEach(() => {
    document.body.innerHTML = '';
  });

  it('renders terminal button between copy and fullscreen', async () => {
    const el = createPanel('sess-1');
    await el.updateComplete;
    const buttons = el.shadowRoot!.querySelectorAll('.icon-btn');
    expect(buttons.length).toBe(3);
    expect(terminalButton(el).textContent).toContain('Terminal');
  });

  it('disables terminal button when sessionId is empty', async () => {
    const el = createPanel();
    await el.updateComplete;
    expect(terminalButton(el).disabled).toBe(true);
  });

  it('enables terminal button when sessionId is set', async () => {
    const el = createPanel('sess-1');
    await el.updateComplete;
    expect(terminalButton(el).disabled).toBe(false);
  });

  it('dispatches open-terminal-session event with sessionId on click', async () => {
    const el = createPanel('sess-abc');
    await el.updateComplete;

    const handler = vi.fn();
    document.addEventListener('open-terminal-session', handler as EventListener);

    terminalButton(el).click();
    await el.updateComplete;

    expect(handler).toHaveBeenCalledTimes(1);
    const event = handler.mock.calls[0][0] as CustomEvent<{ sessionId: string }>;
    expect(event.detail.sessionId).toBe('sess-abc');
    expect(event.bubbles).toBe(true);
    expect(event.composed).toBe(true);

    document.removeEventListener('open-terminal-session', handler as EventListener);
  });

  it('does not dispatch when sessionId is empty (defensive)', async () => {
    const el = createPanel();
    await el.updateComplete;

    const handler = vi.fn();
    document.addEventListener('open-terminal-session', handler as EventListener);

    // Force-call handleOpenTerminal directly via dispatching click on disabled button
    // (browsers normally prevent click on disabled, but happy-dom may not — assert defensive guard)
    terminalButton(el).dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
    await el.updateComplete;

    expect(handler).not.toHaveBeenCalled();
    document.removeEventListener('open-terminal-session', handler as EventListener);
  });

  it('terminal button click stops propagation', async () => {
    const el = createPanel('sess-1');
    await el.updateComplete;

    const stop = vi.fn();
    const evt = new MouseEvent('click', { bubbles: true, cancelable: true });
    Object.defineProperty(evt, 'stopPropagation', { value: stop });
    terminalButton(el).dispatchEvent(evt);

    expect(stop).toHaveBeenCalled();
  });
});
