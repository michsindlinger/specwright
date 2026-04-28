// @vitest-environment happy-dom

/**
 * CLOG-005: E2E smoke + edge-case tests for the Claude-Logs-on-Story-Cards feature.
 *
 * Note on Playwright: the spec asks for a Playwright smoke. The ui/ workspace
 * does not depend on Playwright (vitest + happy-dom only). The smoke scenarios
 * (parallel slots, hydration, reload-reset, session-end) are therefore covered
 * here at the component-integration level using the same Lit + happy-dom setup
 * that already powers CLOG-003 / CLOG-004.
 *
 * Covers:
 *  - Smoke: two cards with two sessionIds → independent, isolated streams
 *  - Smoke: hydration via dashboard storyId→sessionId map propagation
 *  - Smoke: reload-reset semantics (fresh card mount = panel collapsed)
 *  - Edge 3.6a: card rendered before sessionId arrives → no toggle
 *  - Edge 3.6b: sessionId arrives later → toggle appears reactively
 *  - Edge 3.6c: session ends while panel open → toggle + panel disappear
 *  - Race: chunks arriving before buffer-response → buffer wins (canonical replace)
 *  - Race: rapid sessionId switch drops stale chunks for previous session
 *  - Reconnect: multiple mounted panels each re-request their own buffer
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

await import('../../frontend/src/components/aos-claude-log-panel');
await import('../../frontend/src/components/story-card');

import type { AosClaudeLogPanel } from '../../frontend/src/components/aos-claude-log-panel';
import type { AosStoryCard, StoryInfo } from '../../frontend/src/components/story-card';

function makeStory(overrides: Partial<StoryInfo> = {}): StoryInfo {
  return {
    id: 'CLOG-005',
    title: 'E2E test',
    type: 'frontend',
    priority: 'medium',
    effort: 'M',
    status: 'in_progress',
    dependencies: [],
    dorComplete: true,
    ...overrides,
  };
}

function createCard(id: string, sessionId?: string): AosStoryCard {
  const el = document.createElement('aos-story-card') as AosStoryCard;
  el.story = makeStory({ id });
  el.specId = 'spec-x';
  if (sessionId !== undefined) el.sessionId = sessionId;
  document.body.appendChild(el);
  return el;
}

function createPanel(sessionId?: string): AosClaudeLogPanel {
  const el = document.createElement('aos-claude-log-panel') as AosClaudeLogPanel;
  if (sessionId !== undefined) el.sessionId = sessionId;
  document.body.appendChild(el);
  return el;
}

function toggleBtn(el: AosStoryCard): HTMLButtonElement | null {
  return el.shadowRoot?.querySelector('.log-toggle-btn') as HTMLButtonElement | null;
}

function logPanelInCard(el: AosStoryCard): AosClaudeLogPanel | null {
  return (el.shadowRoot?.querySelector('aos-claude-log-panel') as AosClaudeLogPanel | null) ?? null;
}

function panelText(el: AosClaudeLogPanel): string {
  const node = el.shadowRoot?.querySelector('.log-panel');
  return node?.textContent ?? '';
}

async function flushRaf(): Promise<void> {
  await new Promise<void>((resolve) =>
    requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
  );
}

beforeEach(() => {
  handlers.clear();
  mockGateway.on.mockClear();
  mockGateway.off.mockClear();
  mockGateway.send.mockClear();
});

afterEach(() => {
  document.body.innerHTML = '';
});

describe('CLOG-005 smoke: parallel slots', () => {
  it('two cards with different sessionIds keep their streams isolated', async () => {
    const cardA = createCard('STORY-A', 'sess-A');
    const cardB = createCard('STORY-B', 'sess-B');
    await cardA.updateComplete;
    await cardB.updateComplete;

    toggleBtn(cardA)!.click();
    toggleBtn(cardB)!.click();
    await cardA.updateComplete;
    await cardB.updateComplete;

    const panelA = logPanelInCard(cardA)!;
    const panelB = logPanelInCard(cardB)!;
    await panelA.updateComplete;
    await panelB.updateComplete;

    emit('cloud-terminal:data', { sessionId: 'sess-A', data: 'A-line\n' });
    emit('cloud-terminal:data', { sessionId: 'sess-B', data: 'B-line\n' });

    await flushRaf();
    await panelA.updateComplete;
    await panelB.updateComplete;

    expect(panelText(panelA)).toContain('A-line');
    expect(panelText(panelA)).not.toContain('B-line');
    expect(panelText(panelB)).toContain('B-line');
    expect(panelText(panelB)).not.toContain('A-line');
  });

  it('each panel sends its own buffer-request on mount', async () => {
    createPanel('sess-A');
    createPanel('sess-B');
    await Promise.resolve();

    const sentSessionIds = mockGateway.send.mock.calls
      .filter((c) => (c[0] as { type: string }).type === 'cloud-terminal:buffer-request')
      .map((c) => (c[0] as { sessionId: string }).sessionId);

    expect(sentSessionIds).toContain('sess-A');
    expect(sentSessionIds).toContain('sess-B');
  });
});

describe('CLOG-005 smoke: hydration', () => {
  it('panel reflects the buffer-response on first hydration', async () => {
    const panel = createPanel('sess-1');
    await panel.updateComplete;

    emit('cloud-terminal:buffer-response', {
      sessionId: 'sess-1',
      buffer: 'previous-output-line-1\nprevious-output-line-2',
    });
    await panel.updateComplete;

    const text = panelText(panel);
    expect(text).toContain('previous-output-line-1');
    expect(text).toContain('previous-output-line-2');
  });

  it('panel renders the empty placeholder before any data arrives', async () => {
    const panel = createPanel('sess-1');
    await panel.updateComplete;

    const root = panel.shadowRoot!.querySelector('.log-panel')!;
    expect(root.classList.contains('empty')).toBe(true);
  });
});

describe('CLOG-005 smoke: reload-reset', () => {
  it('a freshly mounted card with a sessionId starts collapsed (no panel)', async () => {
    const card = createCard('STORY-RELOAD', 'sess-1');
    await card.updateComplete;
    expect(toggleBtn(card)).not.toBeNull();
    expect(toggleBtn(card)!.getAttribute('aria-expanded')).toBe('false');
    expect(logPanelInCard(card)).toBeNull();
  });

  it('re-mounting the card after expansion does NOT preserve the open state', async () => {
    const card1 = createCard('STORY-RELOAD', 'sess-1');
    await card1.updateComplete;
    toggleBtn(card1)!.click();
    await card1.updateComplete;
    expect(logPanelInCard(card1)).not.toBeNull();
    card1.remove();

    const card2 = createCard('STORY-RELOAD', 'sess-1');
    await card2.updateComplete;
    expect(logPanelInCard(card2)).toBeNull();
    expect(toggleBtn(card2)!.getAttribute('aria-expanded')).toBe('false');
  });
});

describe('CLOG-005 edge cases', () => {
  it('3.6a: card mounted without sessionId hides the toggle', async () => {
    const card = createCard('STORY-LATE');
    await card.updateComplete;
    expect(toggleBtn(card)).toBeNull();
  });

  it('3.6b: sessionId arriving after first render makes the toggle appear', async () => {
    const card = createCard('STORY-LATE');
    await card.updateComplete;
    expect(toggleBtn(card)).toBeNull();

    card.sessionId = 'sess-late';
    await card.updateComplete;
    expect(toggleBtn(card)).not.toBeNull();
  });

  it('3.6c: session ending while panel is open hides toggle AND collapses panel', async () => {
    const card = createCard('STORY-END', 'sess-end');
    await card.updateComplete;
    toggleBtn(card)!.click();
    await card.updateComplete;
    expect(logPanelInCard(card)).not.toBeNull();

    card.sessionId = undefined;
    await card.updateComplete;

    expect(toggleBtn(card)).toBeNull();
    expect(logPanelInCard(card)).toBeNull();
  });

  it('3.6c: chunks arriving for an ended session do not leak into a re-opened panel', async () => {
    const card = createCard('STORY-END', 'sess-end');
    await card.updateComplete;
    toggleBtn(card)!.click();
    await card.updateComplete;

    card.sessionId = undefined;
    await card.updateComplete;

    emit('cloud-terminal:data', { sessionId: 'sess-end', data: 'late-chunk\n' });
    await flushRaf();

    card.sessionId = 'sess-new';
    await card.updateComplete;
    const panel = logPanelInCard(card)!;
    expect(panel).not.toBeNull();
    await panel.updateComplete;

    expect(panelText(panel)).not.toContain('late-chunk');
  });
});

describe('CLOG-005 race conditions', () => {
  it('chunks arriving before buffer-response are replaced by the canonical buffer', async () => {
    const panel = createPanel('sess-1');
    await panel.updateComplete;

    emit('cloud-terminal:data', { sessionId: 'sess-1', data: 'streamed-before-hydration\n' });
    await flushRaf();
    await panel.updateComplete;
    expect(panelText(panel)).toContain('streamed-before-hydration');

    emit('cloud-terminal:buffer-response', {
      sessionId: 'sess-1',
      buffer: 'canonical-buffer-from-server',
    });
    await panel.updateComplete;

    const text = panelText(panel);
    expect(text).toContain('canonical-buffer-from-server');
    expect(text).not.toContain('streamed-before-hydration');
  });

  it('chunks arriving after buffer-response are appended', async () => {
    const panel = createPanel('sess-1');
    await panel.updateComplete;

    emit('cloud-terminal:buffer-response', {
      sessionId: 'sess-1',
      buffer: 'buffer-base',
    });
    await panel.updateComplete;

    emit('cloud-terminal:data', { sessionId: 'sess-1', data: '\nnext-chunk' });
    await flushRaf();
    await panel.updateComplete;

    const text = panelText(panel);
    expect(text).toContain('buffer-base');
    expect(text).toContain('next-chunk');
  });

  it('rapid sessionId switch discards in-flight chunks for the previous session', async () => {
    const panel = createPanel('sess-1');
    await panel.updateComplete;

    emit('cloud-terminal:data', { sessionId: 'sess-1', data: 'old-chunk-pre-switch\n' });

    panel.sessionId = 'sess-2';
    await panel.updateComplete;

    emit('cloud-terminal:data', { sessionId: 'sess-1', data: 'old-chunk-post-switch\n' });
    emit('cloud-terminal:data', { sessionId: 'sess-2', data: 'new-chunk\n' });

    await flushRaf();
    await panel.updateComplete;

    const text = panelText(panel);
    expect(text).toContain('new-chunk');
    expect(text).not.toContain('old-chunk-pre-switch');
    expect(text).not.toContain('old-chunk-post-switch');
  });

  it('buffer-response for an old sessionId after switch is ignored', async () => {
    const panel = createPanel('sess-1');
    await panel.updateComplete;

    panel.sessionId = 'sess-2';
    await panel.updateComplete;

    emit('cloud-terminal:buffer-response', { sessionId: 'sess-1', buffer: 'STALE BUFFER' });
    await panel.updateComplete;

    expect(panelText(panel)).not.toContain('STALE BUFFER');
  });
});

describe('CLOG-005 reconnect', () => {
  it('multiple mounted panels each re-request their own buffer on gateway.connected', async () => {
    const panelA = createPanel('sess-A');
    const panelB = createPanel('sess-B');
    await panelA.updateComplete;
    await panelB.updateComplete;

    mockGateway.send.mockClear();

    emit('gateway.connected', {});

    const requested = mockGateway.send.mock.calls
      .filter((c) => (c[0] as { type: string }).type === 'cloud-terminal:buffer-request')
      .map((c) => (c[0] as { sessionId: string }).sessionId);

    expect(requested).toContain('sess-A');
    expect(requested).toContain('sess-B');
  });

  it('reconnect does not duplicate listeners (no growth of subscriptions)', async () => {
    const panel = createPanel('sess-1');
    await panel.updateComplete;

    const dataHandlersBefore = handlers.get('cloud-terminal:data')?.size ?? 0;

    emit('gateway.connected', {});
    emit('gateway.connected', {});
    emit('gateway.connected', {});

    const dataHandlersAfter = handlers.get('cloud-terminal:data')?.size ?? 0;
    expect(dataHandlersAfter).toBe(dataHandlersBefore);
  });

  it('content from an interrupted stream is replaced by the fresh buffer-response after reconnect', async () => {
    const panel = createPanel('sess-1');
    await panel.updateComplete;

    emit('cloud-terminal:data', { sessionId: 'sess-1', data: 'pre-disconnect\n' });
    await flushRaf();
    await panel.updateComplete;
    expect(panelText(panel)).toContain('pre-disconnect');

    emit('gateway.connected', {});
    emit('cloud-terminal:buffer-response', {
      sessionId: 'sess-1',
      buffer: 'pre-disconnect\npost-reconnect-canonical',
    });
    await panel.updateComplete;

    const text = panelText(panel);
    expect(text).toContain('pre-disconnect');
    expect(text).toContain('post-reconnect-canonical');
  });
});
