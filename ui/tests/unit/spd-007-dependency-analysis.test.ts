/**
 * SPD-007: Unit tests for DependencyAnalysisService.
 *
 * Tests the core analysis logic:
 * - Skips analysis when fewer than 2 active specs
 * - Parses AI JSON response into ProposedEdge[]
 * - Handles escalation for medium/low confidence pairs
 * - Marks still-low confidence as needsReview
 * - Handles malformed AI responses gracefully
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { promises as fs } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import { DependencyAnalysisService } from '../../src/server/services/dependency-analysis.service.js';

// Mock claude-agent-sdk
vi.mock('@anthropic-ai/claude-agent-sdk', () => ({
  query: vi.fn()
}));

// Mock withTimeout to call fn directly (skip actual timeout)
vi.mock('../../src/server/services/external-reviewer.js', () => ({
  withTimeout: (fn: (ac: AbortController) => Promise<unknown>) => fn(new AbortController())
}));

import { query } from '@anthropic-ai/claude-agent-sdk';

const SPEC_A = '2026-01-01-spec-a';
const SPEC_B = '2026-01-02-spec-b';
const SPEC_C = '2026-01-03-spec-c';

async function writeSpecLite(projectPath: string, specId: string, content: string): Promise<void> {
  const specDir = join(projectPath, 'specwright', 'specs', specId);
  await fs.mkdir(specDir, { recursive: true });
  await fs.writeFile(join(specDir, 'spec-lite.md'), content);
}

function mockQuery(resultText: string): void {
  const mockSession = (async function* () {
    yield { type: 'result', subtype: 'success', is_error: false, result: resultText };
  })();
  Object.assign(mockSession, { return: async () => {} });
  (query as ReturnType<typeof vi.fn>).mockReturnValue(mockSession);
}

function mockQuerySequence(results: string[]): void {
  let idx = 0;
  (query as ReturnType<typeof vi.fn>).mockImplementation(() => {
    const text = results[idx++] ?? '[]';
    const session = (async function* () {
      yield { type: 'result', subtype: 'success', is_error: false, result: text };
    })();
    Object.assign(session, { return: async () => {} });
    return session;
  });
}

type PartialSpec = {
  id: string;
  storyCount?: number;
  completedCount?: number;
};

function makeSpec(opts: PartialSpec) {
  return {
    id: opts.id,
    name: `Test ${opts.id}`,
    createdDate: '2026-01-01',
    storyCount: opts.storyCount ?? 3,
    completedCount: opts.completedCount ?? 0,
    inProgressCount: 0,
    hasKanban: true,
    gitStrategy: null as null,
  };
}

describe('SPD-007: DependencyAnalysisService', () => {
  let service: DependencyAnalysisService;
  let tmpDir: string;
  let projectPath: string;

  beforeEach(async () => {
    service = new DependencyAnalysisService();
    tmpDir = await fs.mkdtemp(join(tmpdir(), 'spd-007-'));
    projectPath = join(tmpDir, 'project');
    vi.clearAllMocks();
  });

  afterEach(async () => {
    await fs.rm(tmpDir, { recursive: true, force: true });
  });

  describe('analyze()', () => {
    it('returns [] and skips query when only one active spec', async () => {
      const result = await service.analyze(projectPath, [makeSpec({ id: SPEC_A })]);
      expect(result).toEqual([]);
      expect(query).not.toHaveBeenCalled();
    });

    it('returns [] and skips query when all specs are done', async () => {
      const result = await service.analyze(projectPath, [
        makeSpec({ id: SPEC_A, storyCount: 2, completedCount: 2 }),
        makeSpec({ id: SPEC_B, storyCount: 1, completedCount: 1 }),
      ]);
      expect(result).toEqual([]);
      expect(query).not.toHaveBeenCalled();
    });

    it('returns proposals from AI response (high confidence — no escalation)', async () => {
      await writeSpecLite(projectPath, SPEC_A, 'Auth module');
      await writeSpecLite(projectPath, SPEC_B, 'Dashboard requires auth');

      mockQuery(`[{"from":"${SPEC_B}","to":"${SPEC_A}","confidence":"high","reason":"Dashboard needs auth"}]`);

      const result = await service.analyze(projectPath, [makeSpec({ id: SPEC_A }), makeSpec({ id: SPEC_B })]);

      expect(result).toHaveLength(1);
      expect(result[0]).toMatchObject({ from: SPEC_B, to: SPEC_A, confidence: 'high' });
      expect(result[0].needsReview).toBeUndefined();
      expect(query).toHaveBeenCalledTimes(1);
    });

    it('escalates medium/low confidence pairs and calls query() twice', async () => {
      await writeSpecLite(projectPath, SPEC_A, 'A');
      await writeSpecLite(projectPath, SPEC_B, 'B');

      mockQuerySequence([
        `[{"from":"${SPEC_B}","to":"${SPEC_A}","confidence":"medium","reason":"maybe"}]`,
        `[{"from":"${SPEC_B}","to":"${SPEC_A}","confidence":"high","reason":"confirmed after escalation"}]`,
      ]);

      const result = await service.analyze(projectPath, [makeSpec({ id: SPEC_A }), makeSpec({ id: SPEC_B })]);

      expect(query).toHaveBeenCalledTimes(2);
      expect(result).toHaveLength(1);
      expect(result[0].confidence).toBe('high');
      expect(result[0].needsReview).toBeUndefined();
    });

    it('marks still-low proposals as needsReview after escalation', async () => {
      await writeSpecLite(projectPath, SPEC_A, 'A');
      await writeSpecLite(projectPath, SPEC_B, 'B');

      mockQuerySequence([
        `[{"from":"${SPEC_B}","to":"${SPEC_A}","confidence":"low","reason":"uncertain"}]`,
        `[{"from":"${SPEC_B}","to":"${SPEC_A}","confidence":"low","reason":"still uncertain"}]`,
      ]);

      const result = await service.analyze(projectPath, [makeSpec({ id: SPEC_A }), makeSpec({ id: SPEC_B })]);

      expect(result).toHaveLength(1);
      expect(result[0].confidence).toBe('low');
      expect(result[0].needsReview).toBe(true);
    });

    it('focuses on targetSpecId hint (just passes through to prompt)', async () => {
      await writeSpecLite(projectPath, SPEC_A, 'A');
      await writeSpecLite(projectPath, SPEC_B, 'B');

      mockQuery('[]');

      await service.analyze(projectPath, [makeSpec({ id: SPEC_A }), makeSpec({ id: SPEC_B })], SPEC_A);

      expect(query).toHaveBeenCalledTimes(1);
      const callArg = (query as ReturnType<typeof vi.fn>).mock.calls[0][0];
      expect(callArg.prompt).toContain(SPEC_A);
    });
  });

  describe('parseProposals()', () => {
    it('parses clean JSON array', () => {
      const proposals = service.parseProposals(
        `[{"from":"a","to":"b","confidence":"high","reason":"test"}]`
      );
      expect(proposals).toHaveLength(1);
      expect(proposals[0]).toMatchObject({ from: 'a', to: 'b', confidence: 'high', reason: 'test' });
    });

    it('strips markdown fences', () => {
      const proposals = service.parseProposals(
        '```json\n[{"from":"a","to":"b","confidence":"medium","reason":"x"}]\n```'
      );
      expect(proposals).toHaveLength(1);
    });

    it('filters out self-loops (from === to)', () => {
      const proposals = service.parseProposals(
        `[{"from":"a","to":"a","confidence":"high","reason":"self"}]`
      );
      expect(proposals).toHaveLength(0);
    });

    it('filters out entries with invalid confidence', () => {
      const proposals = service.parseProposals(
        `[{"from":"a","to":"b","confidence":"very-high","reason":"bad"}]`
      );
      expect(proposals).toHaveLength(0);
    });

    it('returns [] on non-JSON text', () => {
      const proposals = service.parseProposals('No dependencies found.');
      expect(proposals).toHaveLength(0);
    });

    it('returns [] on malformed JSON', () => {
      const proposals = service.parseProposals('[{bad json}]');
      expect(proposals).toHaveLength(0);
    });

    it('ignores items with missing required fields', () => {
      const proposals = service.parseProposals(
        `[{"from":"a","confidence":"high","reason":"missing to"}]`
      );
      expect(proposals).toHaveLength(0);
    });
  });
});
