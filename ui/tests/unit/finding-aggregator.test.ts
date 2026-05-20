import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@anthropic-ai/claude-agent-sdk', () => ({
  query: vi.fn(),
}));

import { query as claudeQuery } from '@anthropic-ai/claude-agent-sdk';
import {
  aggregateFindings,
  extractJson,
  truncateForPrompt,
  formatInject,
  type Cluster,
  type MappedReviewer,
} from '../../src/server/services/finding-aggregator.js';

const mockedQuery = vi.mocked(claudeQuery);

async function* makeSuccessSession(result: string) {
  yield { type: 'result', subtype: 'success', is_error: false, result };
}

async function* makeErrorSession(detail: string) {
  yield { type: 'result', subtype: 'error', is_error: true, result: detail };
}

function mockClaudeReturning(result: string): void {
  mockedQuery.mockReturnValueOnce(makeSuccessSession(result) as never);
}

function mockClaudeError(detail: string): void {
  mockedQuery.mockReturnValueOnce(makeErrorSession(detail) as never);
}

function mockClaudeThrows(err: Error): void {
  mockedQuery.mockImplementationOnce(() => {
    throw err;
  });
}

const REV_A: MappedReviewer = { providerId: 'anthropic', modelId: 'opus', output: 'A says X.' };
const REV_B: MappedReviewer = {
  providerId: 'deepseek',
  modelId: 'deepseek-v4-pro',
  output: 'B says X.',
};
const REV_C: MappedReviewer = { providerId: 'glm', modelId: 'glm-5.1', output: 'C says X.' };
const REV_D: MappedReviewer = {
  providerId: 'google',
  modelId: 'gemini-3-pro',
  output: 'D says X.',
};

beforeEach(() => {
  mockedQuery.mockReset();
});

describe('extractJson', () => {
  it('returns trimmed unchanged when input is bare JSON', () => {
    expect(extractJson('  {"a":1}  ')).toBe('{"a":1}');
  });

  it('strips ```json fences', () => {
    expect(extractJson('```json\n{"a":1}\n```')).toBe('{"a":1}');
  });

  it('strips plain ``` fences without language tag', () => {
    expect(extractJson('```\n{"a":1}\n```')).toBe('{"a":1}');
  });

  it('extracts first balanced brace block when preamble prose is present', () => {
    expect(extractJson('Here is the output:\n{"clusters":[]}\nThanks.')).toBe('{"clusters":[]}');
  });

  it('returns trimmed input unchanged when no braces found', () => {
    expect(extractJson('not json at all')).toBe('not json at all');
  });
});

describe('truncateForPrompt', () => {
  it('returns input unchanged when ≤ 4000 chars', () => {
    const small = 'x'.repeat(100);
    expect(truncateForPrompt(small)).toBe(small);
    const boundary = 'y'.repeat(4000);
    expect(truncateForPrompt(boundary)).toBe(boundary);
  });

  it('truncates with head + marker + tail when > 4000 chars', () => {
    const big = 'a'.repeat(3000) + 'b'.repeat(2000) + 'c'.repeat(1000);
    const out = truncateForPrompt(big);
    expect(out.startsWith('a'.repeat(3000))).toBe(true);
    expect(out.endsWith('c'.repeat(1000))).toBe(true);
    expect(out).toContain('[truncated]');
  });
});

describe('aggregateFindings', () => {
  it('skips clustering and returns fallback when only 1 reviewer', async () => {
    const res = await aggregateFindings([REV_A], '/tmp/x');
    expect(res.fallbackUsed).toBe(true);
    expect(res.clusters).toEqual([]);
    expect(mockedQuery).not.toHaveBeenCalled();
  });

  it('returns clustered findings for 3/3 agreement', async () => {
    mockClaudeReturning(
      JSON.stringify({
        clusters: [
          {
            summary: 'Lock-order violation',
            supporting_keys: ['anthropic:opus', 'deepseek:deepseek-v4-pro', 'glm:glm-5.1'],
            supporting_quotes: [
              { key: 'anthropic:opus', quote: 'A says X.' },
              { key: 'deepseek:deepseek-v4-pro', quote: 'B says X.' },
              { key: 'glm:glm-5.1', quote: 'C says X.' },
            ],
          },
        ],
      })
    );

    const res = await aggregateFindings([REV_A, REV_B, REV_C], '/tmp/x');
    expect(res.fallbackUsed).toBe(false);
    expect(res.clusters).toHaveLength(1);
    expect(res.clusters[0].supporting_keys).toHaveLength(3);
  });

  it('returns clustered findings for 2/3 agreement', async () => {
    mockClaudeReturning(
      JSON.stringify({
        clusters: [
          {
            summary: 'Missing test',
            supporting_keys: ['deepseek:deepseek-v4-pro', 'glm:glm-5.1'],
            supporting_quotes: [],
          },
        ],
      })
    );

    const res = await aggregateFindings([REV_A, REV_B, REV_C], '/tmp/x');
    expect(res.fallbackUsed).toBe(false);
    expect(res.clusters[0].supporting_keys).toHaveLength(2);
  });

  it('returns 3 separate clusters when reviewers disagree', async () => {
    mockClaudeReturning(
      JSON.stringify({
        clusters: [
          { summary: 'Issue X', supporting_keys: ['anthropic:opus'], supporting_quotes: [] },
          {
            summary: 'Issue Y',
            supporting_keys: ['deepseek:deepseek-v4-pro'],
            supporting_quotes: [],
          },
          { summary: 'Issue Z', supporting_keys: ['glm:glm-5.1'], supporting_quotes: [] },
        ],
      })
    );

    const res = await aggregateFindings([REV_A, REV_B, REV_C], '/tmp/x');
    expect(res.fallbackUsed).toBe(false);
    expect(res.clusters).toHaveLength(3);
  });

  it('handles fenced JSON from LLM', async () => {
    mockClaudeReturning(
      '```json\n' + JSON.stringify({ clusters: [] }) + '\n```'
    );

    const res = await aggregateFindings([REV_A, REV_B], '/tmp/x');
    expect(res.fallbackUsed).toBe(false);
    expect(res.clusters).toEqual([]);
  });

  it('falls back when JSON is malformed after fence-strip', async () => {
    mockClaudeReturning('```json\n{not valid json\n```');

    const res = await aggregateFindings([REV_A, REV_B], '/tmp/x');
    expect(res.fallbackUsed).toBe(true);
  });

  it('falls back when claudeQuery throws', async () => {
    mockClaudeThrows(new Error('boom'));

    const res = await aggregateFindings([REV_A, REV_B], '/tmp/x');
    expect(res.fallbackUsed).toBe(true);
  });

  it('falls back on empty LLM output', async () => {
    mockClaudeError('');

    const res = await aggregateFindings([REV_A, REV_B], '/tmp/x');
    expect(res.fallbackUsed).toBe(true);
  });

  it('falls back on schema validation failure (clusters missing)', async () => {
    mockClaudeReturning(JSON.stringify({ nothing: true }));

    const res = await aggregateFindings([REV_A, REV_B], '/tmp/x');
    expect(res.fallbackUsed).toBe(true);
  });

  it('falls back on schema validation failure (cluster shape wrong)', async () => {
    mockClaudeReturning(JSON.stringify({ clusters: [{ summary: 'x' }] }));

    const res = await aggregateFindings([REV_A, REV_B], '/tmp/x');
    expect(res.fallbackUsed).toBe(true);
  });

  it('preserves separate keys for two models from same provider', async () => {
    const deepseekPro: MappedReviewer = {
      providerId: 'deepseek',
      modelId: 'deepseek-v4-pro',
      output: 'pro says X.',
    };
    const deepseekFlash: MappedReviewer = {
      providerId: 'deepseek',
      modelId: 'haiku',
      output: 'flash says X.',
    };

    mockClaudeReturning(
      JSON.stringify({
        clusters: [
          {
            summary: 'Issue X',
            supporting_keys: ['deepseek:deepseek-v4-pro', 'deepseek:haiku'],
            supporting_quotes: [],
          },
        ],
      })
    );

    const res = await aggregateFindings([deepseekPro, deepseekFlash], '/tmp/x');
    expect(res.fallbackUsed).toBe(false);
    expect(res.clusters[0].supporting_keys).toEqual([
      'deepseek:deepseek-v4-pro',
      'deepseek:haiku',
    ]);
  });
});

describe('formatInject', () => {
  function makeCluster(summary: string, keys: string[]): Cluster {
    return {
      summary,
      supporting_keys: keys,
      supporting_quotes: keys.map((k) => ({ key: k, quote: `${k} quote` })),
    };
  }

  it('renders BLOCKER + LIKELY + MINORITY with continuous numbering', () => {
    const clusters: Cluster[] = [
      makeCluster('Blocker thing', [
        'anthropic:opus',
        'deepseek:deepseek-v4-pro',
        'glm:glm-5.1',
        'google:gemini-3-pro',
      ]),
      makeCluster('Likely thing', ['deepseek:deepseek-v4-pro', 'glm:glm-5.1', 'google:gemini-3-pro']),
      makeCluster('Minor thing', ['anthropic:opus']),
    ];

    const out = formatInject(clusters, [REV_A, REV_B, REV_C, REV_D], 4);
    expect(out).toContain('🔴 BLOCKER');
    expect(out).toContain('🟡 LIKELY');
    expect(out).toContain('⚪ MINORITY');
    expect(out).toContain('1. Blocker thing');
    expect(out).toContain('2. Likely thing');
    expect(out).toContain('3. Minor thing');
    expect(out).toContain('4 successful reviewer');
  });

  it('renders only MINORITY when all clusters are minority (n=3, 3 disagreement)', () => {
    const clusters: Cluster[] = [
      makeCluster('A', ['anthropic:opus']),
      makeCluster('B', ['deepseek:deepseek-v4-pro']),
      makeCluster('C', ['glm:glm-5.1']),
    ];

    const out = formatInject(clusters, [REV_A, REV_B, REV_C], 3);
    expect(out).toContain('⚪ MINORITY');
    expect(out).not.toContain('🔴 BLOCKER');
    expect(out).not.toContain('🟡 LIKELY');
    expect(out).toContain('1. A');
    expect(out).toContain('2. B');
    expect(out).toContain('3. C');
  });

  it('renders only BLOCKER when all clusters are unanimous (n=3)', () => {
    const clusters: Cluster[] = [
      makeCluster('X', ['anthropic:opus', 'deepseek:deepseek-v4-pro', 'glm:glm-5.1']),
    ];

    const out = formatInject(clusters, [REV_A, REV_B, REV_C], 3);
    expect(out).toContain('🔴 BLOCKER');
    expect(out).not.toContain('🟡 LIKELY');
    expect(out).not.toContain('⚪ MINORITY');
  });

  it('renders no-findings message when clusters is empty', () => {
    const out = formatInject([], [REV_A, REV_B, REV_C], 3);
    expect(out).toContain('Aggregator clustered no findings');
    expect(out).not.toContain('🔴');
    expect(out).not.toContain('🟡');
    expect(out).not.toContain('⚪');
  });

  it('treats count=2 as LIKELY at edge ⌈3/2⌉', () => {
    const clusters: Cluster[] = [
      makeCluster('Edge', ['anthropic:opus', 'deepseek:deepseek-v4-pro']),
    ];

    const out = formatInject(clusters, [REV_A, REV_B, REV_C], 3);
    expect(out).toContain('🟡 LIKELY');
    expect(out).not.toContain('🔴 BLOCKER');
  });

  it('treats count=2 as LIKELY at edge ⌈4/2⌉', () => {
    const clusters: Cluster[] = [
      makeCluster('Edge', ['anthropic:opus', 'deepseek:deepseek-v4-pro']),
    ];

    const out = formatInject(clusters, [REV_A, REV_B, REV_C, REV_D], 4);
    expect(out).toContain('🟡 LIKELY');
    expect(out).not.toContain('🔴 BLOCKER');
  });

  it('shows successful-vs-selected count in header when reviewers failed', () => {
    const clusters: Cluster[] = [
      makeCluster('X', ['anthropic:opus', 'deepseek:deepseek-v4-pro', 'glm:glm-5.1']),
    ];

    const out = formatInject(clusters, [REV_A, REV_B, REV_C], 5);
    expect(out).toContain('3 successful reviewers (of 5 selected)');
  });

  it('omits the of-N-selected suffix when all selected reviewers succeeded', () => {
    const out = formatInject([], [REV_A, REV_B, REV_C], 3);
    expect(out).toContain('3 successful reviewers');
    expect(out).not.toContain('selected');
  });
});
