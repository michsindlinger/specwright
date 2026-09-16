import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@anthropic-ai/claude-agent-sdk', () => ({
  query: vi.fn(),
}));

import { query as claudeQuery } from '@anthropic-ai/claude-agent-sdk';
import {
  ExternalReviewer,
  REVIEWER_TOOLS,
  isSubstanceLessReview,
} from '../../src/server/services/external-reviewer.js';

const mockedQuery = vi.mocked(claudeQuery);

async function* makeSuccessSession(result: string) {
  yield { type: 'result', subtype: 'success', is_error: false, result };
}

async function* makeErrorSession(detail: string) {
  yield { type: 'result', subtype: 'error', is_error: true, result: detail };
}

const REVIEW_TEXT =
  'The plan addresses the lock ordering correctly, but the retry path in the aggregator still lacks a bound on total latency.';

function lastCallOptions(): Record<string, unknown> {
  const call = mockedQuery.mock.calls[0]?.[0] as { options?: Record<string, unknown> } | undefined;
  if (!call?.options) throw new Error('claudeQuery was not called with options');
  return call.options;
}

beforeEach(() => {
  mockedQuery.mockReset();
});

describe('isSubstanceLessReview', () => {
  it('returns true for output that is only tool_call XML', () => {
    const text = `<tool_call name="Read">
{"file_path": "ui/src/server/services/auto-mode-spec-orchestrator.ts", "offset": 50, "limit": 60}
</tool_call>
<tool_call name="Read">
{"file_path": "ui/src/server/utils/worktree-story.ts", "offset": 80, "limit": 90}
</tool_call>`;
    expect(isSubstanceLessReview(text)).toBe(true);
  });

  it('returns true for empty / whitespace output', () => {
    expect(isSubstanceLessReview('')).toBe(true);
    expect(isSubstanceLessReview('   \n\t  ')).toBe(true);
  });

  it('returns true when only fenced code blocks remain', () => {
    expect(isSubstanceLessReview('```ts\nconst x = 1;\n```')).toBe(true);
  });

  it('returns false for genuine prose review', () => {
    const text =
      'The plan addresses three real issues. However, the watcher-path fix may break non-worktree mode because mainProjectPath is also set in branch-based mode.';
    expect(isSubstanceLessReview(text)).toBe(false);
  });

  it('returns false when prose accompanies tool_call XML', () => {
    const text = `Looking at the plan I see the following issue with auto-mode-spec-orchestrator.ts: the path resolution drops the main project reference.

<tool_call name="Read">{"file_path": "x.ts"}</tool_call>

Conclusion: this needs an explicit mainProjectPath fallback.`;
    expect(isSubstanceLessReview(text)).toBe(false);
  });

  it('strips tool_use blocks too', () => {
    const text = `<tool_use>{"name": "Read"}</tool_use>`;
    expect(isSubstanceLessReview(text)).toBe(true);
  });
});

describe('reviewPlan', () => {
  it('returns the review text of a successful session', async () => {
    mockedQuery.mockReturnValueOnce(makeSuccessSession(REVIEW_TEXT) as never);
    const out = await new ExternalReviewer().reviewPlan('review this', 'anthropic', 'opus', '/tmp/p');
    expect(out).toBe(REVIEW_TEXT);
    expect(mockedQuery).toHaveBeenCalledTimes(1);
  });

  it('runs the reviewer without MCP servers and with read-only tools only (AK-01, AK-03)', async () => {
    mockedQuery.mockReturnValueOnce(makeSuccessSession(REVIEW_TEXT) as never);
    await new ExternalReviewer().reviewPlan('review this', 'anthropic', 'opus', '/tmp/p');

    const opts = lastCallOptions();
    expect(opts.strictMcpConfig).toBe(true);
    expect('mcpServers' in opts).toBe(false);
    expect(opts.tools).toEqual(['Read', 'Grep', 'Glob']);
    expect(opts.allowedTools).toEqual(['Read', 'Grep', 'Glob']);
    expect(REVIEWER_TOOLS).toEqual(['Read', 'Grep', 'Glob']);
    expect(opts.settingSources).toEqual(['user']);
    expect(opts.permissionMode).toBe('bypassPermissions');
    expect(opts.cwd).toBe('/tmp/p');
    expect(opts.model).toBe('opus');
    expect(opts.maxTurns).toBe(40);
  });

  it('omits model when no modelId is given', async () => {
    mockedQuery.mockReturnValueOnce(makeSuccessSession(REVIEW_TEXT) as never);
    await new ExternalReviewer().reviewPlan('review this', 'glm', undefined, '/tmp/p');
    const opts = lastCallOptions();
    expect('model' in opts).toBe(false);
    expect(opts.strictMcpConfig).toBe(true);
    expect((opts.env as Record<string, string | undefined>).CLAUDE_CONFIG_DIR).toMatch(/\.claude-glm$/);
  });

  it('throws "Reviewer <ref> failed" on an error session', async () => {
    mockedQuery.mockReturnValueOnce(makeErrorSession('API Error: 400') as never);
    await expect(
      new ExternalReviewer().reviewPlan('review this', 'anthropic', 'opus', '/tmp/p')
    ).rejects.toThrow(/^Reviewer anthropic:opus failed — error \(is_error\): API Error: 400/);
  });
});
