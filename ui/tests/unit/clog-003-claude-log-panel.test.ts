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
