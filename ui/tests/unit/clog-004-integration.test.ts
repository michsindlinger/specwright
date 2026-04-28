// @vitest-environment happy-dom

/**
 * Unit tests for CLOG-004: story-card + dashboard integration.
 *
 * Verifies:
 *  - Story-card renders the Claude-Logs toggle ONLY when `sessionId` is set
 *  - Toggle expands/collapses the inline <aos-claude-log-panel>
 *  - Panel receives the sessionId property
 *  - AutoModeProgress carries an optional sessionId field
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { WebSocketMessage } from '../../frontend/src/gateway';

const { mockGateway } = vi.hoisted(() => {
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
  return { mockGateway };
});

vi.mock('../../frontend/src/gateway', () => ({
  gateway: mockGateway,
}));

await import('../../frontend/src/components/story-card');

import type { AosStoryCard, StoryInfo } from '../../frontend/src/components/story-card';
import type { AutoModeProgress } from '../../frontend/src/components/kanban-board';

function makeStory(overrides: Partial<StoryInfo> = {}): StoryInfo {
  return {
    id: 'CLOG-004',
    title: 'Integration story',
    type: 'frontend',
    priority: 'medium',
    effort: 'M',
    status: 'in_progress',
    dependencies: [],
    dorComplete: true,
    ...overrides,
  };
}

function createCard(props: { sessionId?: string; story?: Partial<StoryInfo> } = {}): AosStoryCard {
  const el = document.createElement('aos-story-card') as AosStoryCard;
  el.story = makeStory(props.story);
  el.specId = 'spec-x';
  if (props.sessionId !== undefined) el.sessionId = props.sessionId;
  document.body.appendChild(el);
  return el;
}

function toggleBtn(el: AosStoryCard): HTMLButtonElement | null {
  return el.shadowRoot?.querySelector('.log-toggle-btn') as HTMLButtonElement | null;
}

function logPanel(el: AosStoryCard): Element | null {
  return el.shadowRoot?.querySelector('aos-claude-log-panel') ?? null;
}

describe('story-card sessionId integration', () => {
  beforeEach(() => {
    mockGateway.on.mockClear();
    mockGateway.off.mockClear();
    mockGateway.send.mockClear();
  });

  afterEach(() => {
    document.body.innerHTML = '';
  });

  it('does not render the log-toggle when sessionId is undefined', async () => {
    const el = createCard();
    await el.updateComplete;
    expect(toggleBtn(el)).toBeNull();
    expect(logPanel(el)).toBeNull();
  });

  it('renders the log-toggle when sessionId is set', async () => {
    const el = createCard({ sessionId: 'sess-1' });
    await el.updateComplete;
    const btn = toggleBtn(el);
    expect(btn).not.toBeNull();
    expect(btn!.getAttribute('aria-expanded')).toBe('false');
    expect(logPanel(el)).toBeNull();
  });

  it('expands the inline log panel on toggle click and propagates sessionId', async () => {
    const el = createCard({ sessionId: 'sess-1' });
    await el.updateComplete;
    toggleBtn(el)!.click();
    await el.updateComplete;

    const panel = logPanel(el);
    expect(panel).not.toBeNull();
    expect((panel as HTMLElement & { sessionId: string }).sessionId).toBe('sess-1');
    expect(toggleBtn(el)!.getAttribute('aria-expanded')).toBe('true');
  });

  it('collapses the panel on second toggle click', async () => {
    const el = createCard({ sessionId: 'sess-1' });
    await el.updateComplete;
    toggleBtn(el)!.click();
    await el.updateComplete;
    toggleBtn(el)!.click();
    await el.updateComplete;
    expect(logPanel(el)).toBeNull();
    expect(toggleBtn(el)!.getAttribute('aria-expanded')).toBe('false');
  });

  it('removes the toggle when sessionId becomes undefined (session ended)', async () => {
    const el = createCard({ sessionId: 'sess-1' });
    await el.updateComplete;
    expect(toggleBtn(el)).not.toBeNull();

    el.sessionId = undefined;
    await el.updateComplete;
    expect(toggleBtn(el)).toBeNull();
    expect(logPanel(el)).toBeNull();
  });

  it('does not bubble click on toggle to parent story-select', async () => {
    const el = createCard({ sessionId: 'sess-1' });
    await el.updateComplete;
    const onSelect = vi.fn();
    el.addEventListener('story-select', onSelect);
    toggleBtn(el)!.click();
    await el.updateComplete;
    expect(onSelect).not.toHaveBeenCalled();
  });
});

describe('AutoModeProgress.sessionId carrier', () => {
  it('accepts an optional sessionId on AutoModeProgress', () => {
    const progress: AutoModeProgress = {
      storyId: 'CLOG-004',
      storyTitle: 'Integration',
      currentPhase: 1,
      totalPhases: 5,
      slotState: 'running',
      sessionId: 'sess-7',
    };
    expect(progress.sessionId).toBe('sess-7');
  });

  it('omits sessionId for queued slots', () => {
    const progress: AutoModeProgress = {
      storyId: 'CLOG-005',
      storyTitle: 'Queued',
      currentPhase: 1,
      totalPhases: 5,
      slotState: 'waiting',
    };
    expect(progress.sessionId).toBeUndefined();
  });
});
