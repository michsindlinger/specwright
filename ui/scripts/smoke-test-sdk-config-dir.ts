/**
 * APR-003 Smoke Test: SDK CLAUDE_CONFIG_DIR GO/NO-GO
 *
 * Tests two provider-routing approaches for the ExternalReviewer architecture:
 *
 * APPROACH A (preferred): options.env.CLAUDE_CONFIG_DIR
 *   Lets the Claude Code subprocess read provider settings from ~/.claude-{provider}/settings.json
 *   Advantage: reuses existing multi-provider CLI setup, no credential duplication
 *
 * APPROACH B (fallback): options.env.ANTHROPIC_BASE_URL + ANTHROPIC_AUTH_TOKEN
 *   Directly injects provider credentials into the subprocess env
 *   Advantage: works even if CLAUDE_CONFIG_DIR is not respected by IPC transport
 *
 * Exit 0 = GO (at least one approach works, ExternalReviewer architecture is valid)
 * Exit 1 = NO-GO (both approaches broken, needs architecture pivot to direct HTTP)
 *
 * Run: cd ui && npx tsx scripts/smoke-test-sdk-config-dir.ts
 */

import { query } from '@anthropic-ai/claude-agent-sdk';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

const PROVIDER = 'deepseek';
const CONFIG_DIR = path.join(os.homedir(), `.claude-${PROVIDER}`);
const SETTINGS_PATH = path.join(CONFIG_DIR, 'settings.json');
const PROMPT = 'Say hello in 3 words. Reply with only those 3 words.';
const CWD = process.cwd();

function readProviderSettings(): Record<string, string> {
  const raw = fs.readFileSync(SETTINGS_PATH, 'utf8');
  const parsed = JSON.parse(raw) as { env?: Record<string, string> };
  return parsed.env ?? {};
}

async function runQuery(label: string, env: Record<string, string | undefined>): Promise<{ text: string; isError: boolean; success: boolean }> {
  let collectedText = '';
  let resultReceived = false;
  let isError = false;

  try {
    const session = await query({
      prompt: PROMPT,
      options: { maxTurns: 1, cwd: CWD, env },
    });

    for await (const event of session) {
      const ev = event as Record<string, unknown>;
      if (ev.type === 'assistant') {
        const msg = ev.message as Record<string, unknown> | undefined;
        if (Array.isArray(msg?.content)) {
          for (const block of msg!.content as Array<Record<string, unknown>>) {
            if (block.type === 'text' && typeof block.text === 'string') {
              collectedText += block.text;
            }
          }
        }
      } else if (ev.type === 'result') {
        resultReceived = true;
        isError = Boolean(ev.is_error);
        if (!collectedText && typeof ev.result === 'string') collectedText = ev.result;
      }
    }
  } catch (err) {
    console.error(`  [${label}] exception: ${err instanceof Error ? err.message : String(err)}`);
    return { text: '', isError: true, success: false };
  }

  return { text: collectedText, isError, success: resultReceived && !isError && collectedText.trim().length > 0 };
}

async function runSmokeTest(): Promise<void> {
  console.log(`\n=== APR-003 SDK CLAUDE_CONFIG_DIR Smoke Test ===`);
  console.log(`Provider:    ${PROVIDER}`);
  console.log(`Config dir:  ${CONFIG_DIR}`);
  console.log(`CWD:         ${CWD}`);
  console.log(`Prompt:      "${PROMPT}"`);
  console.log(`------------------------------------------------`);

  const providerEnv = readProviderSettings();
  console.log(`Provider env keys: ${Object.keys(providerEnv).join(', ')}`);
  console.log(`ANTHROPIC_BASE_URL: ${providerEnv['ANTHROPIC_BASE_URL'] ?? 'NOT SET'}`);

  // Approach A: CLAUDE_CONFIG_DIR
  console.log(`\n[A] Testing CLAUDE_CONFIG_DIR approach...`);
  const savedApiKey = process.env.ANTHROPIC_API_KEY;
  delete process.env.ANTHROPIC_API_KEY;
  const resultA = await runQuery('A:CLAUDE_CONFIG_DIR', {
    ...process.env,
    CLAUDE_CONFIG_DIR: CONFIG_DIR,
  });
  if (savedApiKey !== undefined) process.env.ANTHROPIC_API_KEY = savedApiKey;
  console.log(`  Result: ${resultA.success ? 'SUCCESS' : 'FAILED'} | text="${resultA.text.trim()}" | isError=${resultA.isError}`);

  // Approach B: Direct env injection
  console.log(`\n[B] Testing direct ANTHROPIC_BASE_URL + ANTHROPIC_AUTH_TOKEN approach...`);
  const savedApiKey2 = process.env.ANTHROPIC_API_KEY;
  delete process.env.ANTHROPIC_API_KEY;
  const resultB = await runQuery('B:DirectEnv', {
    ...process.env,
    ...providerEnv,
  });
  if (savedApiKey2 !== undefined) process.env.ANTHROPIC_API_KEY = savedApiKey2;
  console.log(`  Result: ${resultB.success ? 'SUCCESS' : 'FAILED'} | text="${resultB.text.trim()}" | isError=${resultB.isError}`);

  console.log(`\n------------------------------------------------`);
  console.log(`Approach A (CLAUDE_CONFIG_DIR): ${resultA.success ? 'GO' : 'NO-GO'}`);
  console.log(`Approach B (Direct env):        ${resultB.success ? 'GO' : 'NO-GO'}`);
  console.log(`------------------------------------------------\n`);

  const goApproach = resultA.success ? 'A' : resultB.success ? 'B' : null;

  if (!goApproach) {
    console.error(`NO-GO: Both approaches failed.`);
    console.error(`Architecture pivot needed: Direct HTTP against ANTHROPIC_BASE_URL from settings.json.`);
    process.exit(1);
  }

  const winningResult = goApproach === 'A' ? resultA : resultB;
  console.log(`GO: Approach ${goApproach} works.`);
  console.log(`    Provider ${PROVIDER} returned: "${winningResult.text.trim()}"`);
  if (goApproach === 'A') {
    console.log(`    Use options.env.CLAUDE_CONFIG_DIR in ExternalReviewer.`);
  } else {
    console.log(`    Use options.env spread of settings.json env block in ExternalReviewer.`);
    console.log(`    NOTE: Read ANTHROPIC_BASE_URL + ANTHROPIC_AUTH_TOKEN from ~/.claude-{provider}/settings.json`);
  }
  process.exit(0);
}

runSmokeTest().catch((err: unknown) => {
  console.error(`\nNO-GO: Smoke test threw exception:`);
  console.error(err instanceof Error ? err.message : String(err));
  console.error(`\nArchitecture pivot needed: Direct HTTP against ANTHROPIC_BASE_URL.\n`);
  process.exit(1);
});
