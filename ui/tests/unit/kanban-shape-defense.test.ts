/**
 * Unit tests for ensureV2TaskShape + ensureV1StoryShape.
 *
 * Defensive lazy-init helpers used by kanban_start_story and
 * kanban_complete_story to prevent `Cannot set properties of undefined`
 * when kanban.json was touched outside the MCP write paths.
 */

import { describe, it, expect } from 'vitest';
import {
  ensureV2TaskShape,
  ensureV1StoryShape,
} from '../../../specwright/scripts/mcp/kanban-validation.js';

describe('ensureV2TaskShape', () => {
  it('initializes missing timing and implementation on a bare task', () => {
    const task: Record<string, unknown> = {
      id: 'X-1',
      status: 'in_progress',
    };
    ensureV2TaskShape(task as Parameters<typeof ensureV2TaskShape>[0]);
    expect(task.timing).toEqual({ startedAt: null, completedAt: null });
    expect(task.implementation).toEqual({ filesModified: [], commits: [] });
  });

  it('preserves existing timing values (idempotent)', () => {
    const task = {
      timing: { startedAt: '2026-01-01T00:00:00Z', completedAt: null },
      implementation: { filesModified: ['a.ts'], commits: [] },
    };
    ensureV2TaskShape(task);
    expect(task.timing.startedAt).toBe('2026-01-01T00:00:00Z');
    expect(task.implementation.filesModified).toEqual(['a.ts']);
  });

  it('adds only missing fields (mixed state)', () => {
    const task: Record<string, unknown> = {
      timing: { startedAt: '2026-01-01T00:00:00Z', completedAt: null },
      // implementation missing
    };
    ensureV2TaskShape(task as Parameters<typeof ensureV2TaskShape>[0]);
    expect((task.timing as { startedAt: string }).startedAt).toBe('2026-01-01T00:00:00Z');
    expect(task.implementation).toEqual({ filesModified: [], commits: [] });
  });

  it('repeated calls do not overwrite (truly idempotent)', () => {
    const task = {
      timing: { startedAt: '2026-01-01T00:00:00Z', completedAt: '2026-01-02T00:00:00Z' },
      implementation: { filesModified: ['x.ts'], commits: [{ hash: 'abc' }] },
    };
    ensureV2TaskShape(task);
    ensureV2TaskShape(task);
    expect(task.timing.completedAt).toBe('2026-01-02T00:00:00Z');
    expect(task.implementation.commits).toEqual([{ hash: 'abc' }]);
  });

  it('mirrors real-world stuck task (missing implementation only)', () => {
    // Reproduces CSP-003 / CSP-011 shape that crashed kanban_complete_story.
    const task = {
      id: 'CSP-003',
      status: 'in_progress',
      phase: 'in_progress',
      timing: { startedAt: '2026-05-12T09:32:21.277Z', completedAt: null as string | null },
      // implementation missing
    } as Record<string, unknown>;
    expect(() =>
      ensureV2TaskShape(task as Parameters<typeof ensureV2TaskShape>[0])
    ).not.toThrow();
    expect(task.implementation).toEqual({ filesModified: [], commits: [] });
    // Now the original crash site is safe:
    expect(() => {
      (task as { implementation: { filesModified: string[] } }).implementation.filesModified = ['file.ts'];
    }).not.toThrow();
  });
});

describe('ensureV1StoryShape', () => {
  const NOW = '2026-05-12T12:00:00.000Z';

  it('initializes all three sub-objects on a bare story', () => {
    const story: Record<string, unknown> = {
      id: 'STORY-1',
      status: 'in_progress',
    };
    ensureV1StoryShape(story as Parameters<typeof ensureV1StoryShape>[0], NOW);
    expect(story.timing).toEqual({ createdAt: NOW, startedAt: null, completedAt: null });
    expect(story.implementation).toEqual({ filesModified: [], commits: [], notes: null });
    expect(story.verification).toEqual({ dodChecked: false, integrationVerified: false });
  });

  it('preserves existing values across all three fields', () => {
    const story = {
      timing: { createdAt: '2025-12-01T00:00:00Z', startedAt: '2025-12-02T00:00:00Z', completedAt: null },
      implementation: { filesModified: ['a.ts'], commits: [{ hash: 'abc' }], notes: 'existing note' },
      verification: { dodChecked: true, integrationVerified: false },
    };
    ensureV1StoryShape(story, NOW);
    expect(story.timing.createdAt).toBe('2025-12-01T00:00:00Z');
    expect(story.implementation.notes).toBe('existing note');
    expect(story.verification.dodChecked).toBe(true);
  });

  it('mixed state — only adds missing fields', () => {
    const story: Record<string, unknown> = {
      timing: { startedAt: '2025-12-02T00:00:00Z', completedAt: null },
      // implementation + verification missing
    };
    ensureV1StoryShape(story as Parameters<typeof ensureV1StoryShape>[0], NOW);
    expect((story.timing as { startedAt: string }).startedAt).toBe('2025-12-02T00:00:00Z');
    expect(story.implementation).toEqual({ filesModified: [], commits: [], notes: null });
    expect(story.verification).toEqual({ dodChecked: false, integrationVerified: false });
  });
});
