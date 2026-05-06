import { describe, it, expect } from 'vitest';
import { isSubstanceLessReview } from '../../src/server/services/external-reviewer.js';

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
