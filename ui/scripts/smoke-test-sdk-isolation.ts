/**
 * INT-2026-006 Smoke Test: SDK helper processes run without the user's MCP servers
 *
 * Starts two cheap, real SDK calls with exactly the options the plan-review
 * callers use (buildSdkCallOptions) and measures what the model actually saw:
 *
 *   [reviewer]   buildSdkCallOptions('anthropic', REVIEWER_TOOLS), prompt "Reply with OK."
 *                expected: init.tools = 3, init.mcp_servers = 0
 *   [aggregator] buildSdkCallOptions('anthropic', []), real aggregator prompt with two
 *                empty reviewer outputs, model AGGREGATOR_MODEL_ID
 *                expected: init.tools = 0, init.mcp_servers = 0,
 *                          prompt tokens (input + cache_creation + cache_read) < 20000
 *
 * Exit 0 = every expectation met. Exit 1 = at least one miss (table shows which).
 *
 * Needs the default ~/.claude OAuth login on this machine; costs two Haiku calls.
 * Not part of `verify` and not run in CI. Re-run after every SDK update (OF-02).
 *
 * Run: cd ui && npx tsx scripts/smoke-test-sdk-isolation.ts
 */

import { readFileSync } from 'fs';
import { createRequire } from 'module';
import { query, type Options, type SDKMessage } from '@anthropic-ai/claude-agent-sdk';
import { buildSdkCallOptions } from '../src/server/utils/sdk-call-options.js';
import { REVIEWER_TOOLS } from '../src/server/services/external-reviewer.js';
import {
  AGGREGATOR_MODEL_ID,
  buildAggregatorPrompt,
} from '../src/server/services/finding-aggregator.js';

const PROMPT_TOKEN_LIMIT = 20_000;
const CWD = process.cwd();

interface Measurement {
  label: string;
  tools: number;
  mcpServers: number;
  promptTokens: number;
  resultOk: boolean;
  resultHead: string;
  error: string;
}

interface Expectation {
  label: string;
  metric: string;
  actual: number | string;
  expected: string;
  pass: boolean;
}

async function runMeasured(label: string, prompt: string, options: Options): Promise<Measurement> {
  const m: Measurement = {
    label,
    tools: -1,
    mcpServers: -1,
    promptTokens: -1,
    resultOk: false,
    resultHead: '',
    error: '',
  };

  let session: ReturnType<typeof query> | undefined;
  try {
    session = query({ prompt, options });
    for await (const event of session as AsyncIterable<SDKMessage>) {
      if (event.type === 'system' && event.subtype === 'init') {
        m.tools = event.tools.length;
        m.mcpServers = event.mcp_servers.length;
      } else if (event.type === 'result') {
        const u = event.usage;
        m.promptTokens =
          (u.input_tokens ?? 0) +
          (u.cache_creation_input_tokens ?? 0) +
          (u.cache_read_input_tokens ?? 0);
        m.resultOk = event.subtype === 'success' && !event.is_error;
        if (event.subtype === 'success') {
          m.resultHead = event.result.slice(0, 80).replace(/\s+/g, ' ');
        } else {
          m.error = event.subtype;
        }
      }
    }
  } catch (err) {
    m.error = err instanceof Error ? err.message : String(err);
  } finally {
    try {
      await session?.return?.(undefined);
    } catch {
      // generator already closed
    }
  }
  return m;
}

function check(
  label: string,
  metric: string,
  actual: number | string,
  expected: string,
  pass: boolean
): Expectation {
  return { label, metric, actual, expected, pass };
}

function printTable(rows: Expectation[]): void {
  const w = { label: 12, metric: 14, actual: 8, expected: 10 };
  const line = (a: string, b: string, c: string, d: string, e: string): string =>
    `  ${a.padEnd(w.label)} ${b.padEnd(w.metric)} ${c.padStart(w.actual)} ${d.padStart(w.expected)}  ${e}`;
  console.log(line('Aufrufer', 'Messwert', 'Ist', 'Soll', ''));
  console.log(line('-'.repeat(w.label), '-'.repeat(w.metric), '-'.repeat(w.actual), '-'.repeat(w.expected), ''));
  for (const r of rows) {
    console.log(line(r.label, r.metric, String(r.actual), r.expected, r.pass ? 'OK' : 'MISS'));
  }
}

async function main(): Promise<void> {
  const sdkPkg = createRequire(import.meta.url).resolve('@anthropic-ai/claude-agent-sdk/package.json');
  const sdkVersion = (JSON.parse(readFileSync(sdkPkg, 'utf8')) as { version: string }).version;

  console.log('\n=== INT-2026-006 SDK isolation smoke test ===');
  console.log(`SDK:  @anthropic-ai/claude-agent-sdk ${sdkVersion}`);
  console.log(`CWD:  ${CWD}`);
  console.log(`Limit prompt tokens (aggregator): ${PROMPT_TOKEN_LIMIT}`);
  console.log('---------------------------------------------');

  console.log('\n[reviewer] buildSdkCallOptions(\'anthropic\', REVIEWER_TOOLS), model haiku, "Reply with OK."');
  const reviewer = await runMeasured('reviewer', 'Reply with OK.', {
    ...buildSdkCallOptions('anthropic', REVIEWER_TOOLS),
    maxTurns: 1,
    cwd: CWD,
    model: 'haiku',
  });
  console.log(
    `  result=${reviewer.resultOk ? 'success' : 'FAILED'} tools=${reviewer.tools} mcp_servers=${reviewer.mcpServers} prompt_tokens=${reviewer.promptTokens}` +
      (reviewer.resultHead ? ` head="${reviewer.resultHead}"` : '') +
      (reviewer.error ? ` error="${reviewer.error}"` : '')
  );

  const aggregatorPrompt = buildAggregatorPrompt([
    { providerId: 'anthropic', modelId: 'opus', output: '' },
    { providerId: 'glm', modelId: 'glm-5.1', output: '' },
  ]);
  console.log(
    `\n[aggregator] buildSdkCallOptions('anthropic', []), model ${AGGREGATOR_MODEL_ID}, real aggregator prompt (${aggregatorPrompt.length} chars, two empty reviewer outputs)`
  );
  const aggregator = await runMeasured('aggregator', aggregatorPrompt, {
    ...buildSdkCallOptions('anthropic', []),
    maxTurns: 1,
    cwd: CWD,
    model: AGGREGATOR_MODEL_ID,
  });
  console.log(
    `  result=${aggregator.resultOk ? 'success' : 'FAILED'} tools=${aggregator.tools} mcp_servers=${aggregator.mcpServers} prompt_tokens=${aggregator.promptTokens}` +
      (aggregator.resultHead ? ` head="${aggregator.resultHead}"` : '') +
      (aggregator.error ? ` error="${aggregator.error}"` : '')
  );

  const rows: Expectation[] = [
    check('reviewer', 'result', reviewer.resultOk ? 'success' : 'FAILED', 'success', reviewer.resultOk),
    check('reviewer', 'tools', reviewer.tools, String(REVIEWER_TOOLS.length), reviewer.tools === REVIEWER_TOOLS.length),
    check('reviewer', 'mcp_servers', reviewer.mcpServers, '0', reviewer.mcpServers === 0),
    check('aggregator', 'result', aggregator.resultOk ? 'success' : 'FAILED', 'success', aggregator.resultOk),
    check('aggregator', 'tools', aggregator.tools, '0', aggregator.tools === 0),
    check('aggregator', 'mcp_servers', aggregator.mcpServers, '0', aggregator.mcpServers === 0),
    check(
      'aggregator',
      'prompt_tokens',
      aggregator.promptTokens,
      `< ${PROMPT_TOKEN_LIMIT}`,
      aggregator.promptTokens >= 0 && aggregator.promptTokens < PROMPT_TOKEN_LIMIT
    ),
  ];

  console.log('\n---------------------------------------------');
  printTable(rows);
  console.log('---------------------------------------------');

  const misses = rows.filter((r) => !r.pass);
  if (misses.length > 0) {
    console.error(`\nMISS: ${misses.length} expectation(s) not met.`);
    process.exit(1);
  }
  console.log('\nOK: reviewer and aggregator run without MCP servers, with the expected tool sets.');
  process.exit(0);
}

main().catch((err: unknown) => {
  console.error('\nMISS: smoke test threw:');
  console.error(err instanceof Error ? err.message : String(err));
  process.exit(1);
});
