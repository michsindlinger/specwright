import { query as claudeQuery } from '@anthropic-ai/claude-agent-sdk';
import { buildProviderEnv } from '../utils/provider-env.js';
import type { FallbackReason } from '../../shared/types/plan-review.protocol.js';

const AGGREGATOR_PROVIDER_ID = 'anthropic';
const AGGREGATOR_MODEL_ID = 'haiku';
const AGGREGATOR_TIMEOUT_MS = 180_000;
/** Shorter cap for the single corrective retry — a re-prompt should resolve fast
 *  and this bounds the worst-case added latency on the auto-review path. */
const AGGREGATOR_RETRY_TIMEOUT_MS = 60_000;
const AGGREGATOR_MAX_TURNS = 1;

const TRUNCATE_HEAD = 3000;
const TRUNCATE_TAIL = 1000;
const TRUNCATE_MAX = 4000;
const TRUNCATE_MARKER = '\n...[truncated]...\n';

export interface MappedReviewer {
  providerId: string;
  modelId: string;
  output: string;
}

export interface Cluster {
  summary: string;
  supporting_keys: string[];
  supporting_quotes: Array<{ key: string; quote: string }>;
}

export interface AggregatorResult {
  clusters: Cluster[];
  fallbackUsed: boolean;
  fallbackReason?: FallbackReason;
}

export function truncateForPrompt(output: string): string {
  if (output.length <= TRUNCATE_MAX) return output;
  return output.slice(0, TRUNCATE_HEAD) + TRUNCATE_MARKER + output.slice(-TRUNCATE_TAIL);
}

export function extractJson(raw: string): string {
  const trimmed = raw.trim();
  const fenced = trimmed.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/);
  if (fenced) return fenced[1].trim();
  const firstBrace = trimmed.indexOf('{');
  const lastBrace = trimmed.lastIndexOf('}');
  if (firstBrace >= 0 && lastBrace > firstBrace) {
    return trimmed.slice(firstBrace, lastBrace + 1);
  }
  return trimmed;
}

async function withAggregatorTimeout<T>(
  fn: (ac: AbortController) => Promise<T>,
  ms: number
): Promise<T> {
  const ac = new AbortController();
  const timer = setTimeout(() => ac.abort(), ms);
  try {
    return await fn(ac);
  } catch (err) {
    if (ac.signal.aborted) throw new Error('Aggregator timeout');
    throw err;
  } finally {
    clearTimeout(timer);
  }
}

function reviewerKey(r: { providerId: string; modelId: string }): string {
  return `${r.providerId}:${r.modelId}`;
}

function buildAggregatorPrompt(mapped: MappedReviewer[]): string {
  const sections = mapped
    .map((r) => `[Reviewer key=${reviewerKey(r)}]\n${truncateForPrompt(r.output)}`)
    .join('\n\n');

  return (
    'You are a finding-cluster service. Below are review outputs from N independent reviewers ' +
    'on the same implementation plan. Cluster semantically equivalent findings (same root issue ' +
    'expressed in different words) into groups.\n\n' +
    'Output STRICT JSON only — no prose, no markdown fences. If you must emit JSON in fences, ' +
    'they will be stripped, but raw JSON is preferred.\n\n' +
    'Schema:\n' +
    '{\n' +
    '  "clusters": [\n' +
    '    {\n' +
    '      "summary": "short canonical phrasing of the finding (1 sentence)",\n' +
    '      "supporting_keys": ["anthropic:opus", "deepseek:deepseek-v4-pro"],\n' +
    '      "supporting_quotes": [\n' +
    '        { "key": "anthropic:opus", "quote": "verbatim sentence from reviewer" }\n' +
    '      ]\n' +
    '    }\n' +
    '  ]\n' +
    '}\n\n' +
    'Rules:\n' +
    '- Different reviewers may express the same finding using different terminology — cluster them.\n' +
    '- Use composite key "providerId:modelId" exactly as labeled below.\n' +
    '- Every cluster MUST have at least one entry in supporting_keys.\n' +
    '- Drop pleasantries and meta-commentary, keep substantive findings only.\n' +
    '- Each cluster\'s confidence is len(supporting_keys).\n' +
    '- If a reviewer mentions multiple distinct findings, each goes into its own cluster.\n' +
    '- supporting_quotes are optional: include a VERBATIM sentence from the reviewer where one ' +
    'fits, or omit/leave empty if none does — NEVER paraphrase a quote.\n' +
    '- If reviewers raised no substantive issues, return {"clusters": []}.\n\n' +
    'Reviewers:\n' +
    sections +
    '\n\nOutput JSON only.'
  );
}

/** Result of parsing+validating one aggregator response. */
type ParseOutcome =
  | { ok: true; clusters: Cluster[] }
  | { ok: false; reason: 'parse-error' | 'schema-invalid' };

/**
 * Validate the parsed aggregator JSON into a `Cluster[]`.
 *
 * Lenient by design: a single malformed cluster no longer rejects the whole
 * response — defective clusters are skipped and valid ones kept. Returns:
 * - `null` ⇒ genuine failure (non-object, missing `clusters` array, OR the input
 *   had ≥1 cluster but every one was defective) → caller falls back.
 * - `[]`   ⇒ the model explicitly returned zero clusters ("no findings") → NOT a
 *   failure; the caller renders a no-findings consensus.
 * - non-empty ⇒ the surviving valid clusters.
 */
function validateClusters(parsed: unknown): Cluster[] | null {
  if (!parsed || typeof parsed !== 'object') return null;
  const obj = parsed as Record<string, unknown>;
  if (!Array.isArray(obj.clusters)) return null;

  const inputCount = obj.clusters.length;
  const result: Cluster[] = [];

  for (const c of obj.clusters) {
    if (!c || typeof c !== 'object') continue;
    const cluster = c as Record<string, unknown>;
    if (typeof cluster.summary !== 'string') continue;
    if (!Array.isArray(cluster.supporting_keys)) continue;
    if (!cluster.supporting_keys.every((k) => typeof k === 'string')) continue;
    // An empty supporting_keys would always classify as MINORITY with no source —
    // drop it rather than render an unattributed finding.
    if (cluster.supporting_keys.length === 0) continue;

    // supporting_quotes is optional: default to [] when missing/not-an-array, and
    // skip individual malformed quote entries instead of rejecting the cluster.
    const quotes: Array<{ key: string; quote: string }> = [];
    if (Array.isArray(cluster.supporting_quotes)) {
      for (const q of cluster.supporting_quotes) {
        if (!q || typeof q !== 'object') continue;
        const qo = q as Record<string, unknown>;
        if (typeof qo.key !== 'string' || typeof qo.quote !== 'string') continue;
        quotes.push({ key: qo.key, quote: qo.quote });
      }
    }

    result.push({
      summary: cluster.summary,
      supporting_keys: cluster.supporting_keys as string[],
      supporting_quotes: quotes,
    });
  }

  // Distinguish "model said no findings" (valid empty) from "model emitted
  // clusters but every one was garbage" (fail → fallback).
  if (inputCount > 0 && result.length === 0) return null;
  return result;
}

function parseAggregatorOutput(raw: string): ParseOutcome {
  const jsonText = extractJson(raw);
  let parsed: unknown;
  try {
    parsed = JSON.parse(jsonText);
  } catch {
    return { ok: false, reason: 'parse-error' };
  }
  const clusters = validateClusters(parsed);
  if (!clusters) return { ok: false, reason: 'schema-invalid' };
  return { ok: true, clusters };
}

async function callAggregatorLLM(
  prompt: string,
  projectPath: string,
  timeoutMs: number = AGGREGATOR_TIMEOUT_MS
): Promise<string> {
  return withAggregatorTimeout(async (ac) => {
    const session = claudeQuery({
      prompt,
      options: {
        maxTurns: AGGREGATOR_MAX_TURNS,
        tools: [],
        allowedTools: [],
        permissionMode: 'bypassPermissions',
        allowDangerouslySkipPermissions: true,
        cwd: projectPath,
        abortController: ac,
        env: buildProviderEnv(AGGREGATOR_PROVIDER_ID),
        settingSources: ['user'],
        model: AGGREGATOR_MODEL_ID,
      },
    });

    let result = '';
    try {
      for await (const event of session) {
        if (event.type === 'result') {
          const ev = event as Record<string, unknown>;
          const subtype = typeof ev.subtype === 'string' ? ev.subtype : '';
          const isError = Boolean(ev.is_error);
          const resultText = typeof ev.result === 'string' ? ev.result : '';
          if (subtype === 'success' && !isError) {
            result = resultText;
          }
        }
      }
    } finally {
      try {
        await session.return?.(undefined);
      } catch {
        // ignore — generator already closed
      }
    }

    return result;
  }, timeoutMs);
}

const RETRY_CORRECTION =
  '\n\nYour previous response was not valid JSON matching the schema. ' +
  'Respond with raw JSON only — no prose, no fences — matching the schema above.';

export async function aggregateFindings(
  mapped: MappedReviewer[],
  projectPath: string
): Promise<AggregatorResult> {
  if (mapped.length < 2) {
    return { clusters: [], fallbackUsed: true, fallbackReason: 'single-reviewer' };
  }

  const prompt = buildAggregatorPrompt(mapped);
  const startedAt = Date.now();
  const promptChars = prompt.length;
  console.log(
    `[FindingAggregator] cluster call started — reviewers=${mapped.length} promptChars=${promptChars} timeout=${AGGREGATOR_TIMEOUT_MS}ms`
  );

  let raw = '';
  try {
    raw = await callAggregatorLLM(prompt, projectPath);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    const elapsed = Date.now() - startedAt;
    console.warn(
      `[FindingAggregator] fallback triggered after ${elapsed}ms: claudeQuery failed — ${msg}`
    );
    return { clusters: [], fallbackUsed: true, fallbackReason: 'llm-error' };
  }

  if (!raw.trim()) {
    const elapsed = Date.now() - startedAt;
    console.warn(`[FindingAggregator] fallback triggered after ${elapsed}ms: empty LLM output`);
    return { clusters: [], fallbackUsed: true, fallbackReason: 'empty-output' };
  }

  let outcome = parseAggregatorOutput(raw);

  // Single corrective retry on parse/schema failure only — a thrown or empty
  // first call won't be fixed by re-prompting, so those fall back immediately.
  if (!outcome.ok) {
    console.warn(`[FindingAggregator] retry after ${outcome.reason} failure`);
    try {
      const retryRaw = await callAggregatorLLM(
        prompt + RETRY_CORRECTION,
        projectPath,
        AGGREGATOR_RETRY_TIMEOUT_MS
      );
      if (retryRaw.trim()) {
        outcome = parseAggregatorOutput(retryRaw);
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.warn(`[FindingAggregator] retry call failed — ${msg}`);
    }
  }

  if (!outcome.ok) {
    const elapsed = Date.now() - startedAt;
    console.warn(
      `[FindingAggregator] fallback triggered after ${elapsed}ms: ${outcome.reason} (after retry)`
    );
    return { clusters: [], fallbackUsed: true, fallbackReason: outcome.reason };
  }

  const elapsed = Date.now() - startedAt;
  console.log(
    `[FindingAggregator] cluster call success in ${elapsed}ms — clusters=${outcome.clusters.length}`
  );

  return { clusters: outcome.clusters, fallbackUsed: false };
}

function classifyClusters(
  clusters: Cluster[],
  n: number
): { blockers: Cluster[]; likely: Cluster[]; minority: Cluster[] } {
  const half = Math.ceil(n / 2);
  const blockers: Cluster[] = [];
  const likely: Cluster[] = [];
  const minority: Cluster[] = [];
  for (const c of clusters) {
    const count = c.supporting_keys.length;
    if (count >= n) blockers.push(c);
    else if (count >= half) likely.push(c);
    else minority.push(c);
  }
  return { blockers, likely, minority };
}

function renderClusterBlock(c: Cluster, index: number, n: number): string {
  const lines: string[] = [];
  lines.push(`${index}. ${c.summary}`);
  if (c.supporting_quotes.length > 0) {
    lines.push('   Sources:');
    for (const q of c.supporting_quotes) {
      lines.push(`   - ${q.key}: "${q.quote}"`);
    }
  } else if (c.supporting_keys.length > 0) {
    const keysOnly =
      c.supporting_keys.length === 1
        ? `${c.supporting_keys[0]} only`
        : c.supporting_keys.join(', ');
    lines.push(`   Sources: ${keysOnly}`);
  }
  void n;
  return lines.join('\n');
}

export function formatInject(
  clusters: Cluster[],
  mapped: MappedReviewer[],
  totalSelected: number
): string {
  const n = mapped.length;
  const headerSuffix = n < totalSelected ? ` (of ${totalSelected} selected)` : '';
  const header = `External review consensus (${n} successful reviewer${n === 1 ? '' : 's'}${headerSuffix}).`;

  if (clusters.length === 0) {
    return (
      `${header}\n\n` +
      'Aggregator clustered no findings. Reviewers may have approved the plan without ' +
      'substantive issues, or output was too short to cluster. No further action required ' +
      'unless individual reviewer concerns surface during implementation.'
    );
  }

  const { blockers, likely, minority } = classifyClusters(clusters, n);
  const sections: string[] = [];
  let counter = 1;

  if (blockers.length > 0) {
    const blocks = blockers.map((c) => renderClusterBlock(c, counter++, n));
    sections.push(`🔴 BLOCKER (${n}/${n} agreement, must address):\n\n${blocks.join('\n\n')}`);
  }

  if (likely.length > 0) {
    const blocks = likely.map((c) => renderClusterBlock(c, counter++, n));
    const half = Math.ceil(n / 2);
    sections.push(`🟡 LIKELY (≥${half}/${n} agreement):\n\n${blocks.join('\n\n')}`);
  }

  if (minority.length > 0) {
    const blocks = minority.map((c) => renderClusterBlock(c, counter++, n));
    sections.push(`⚪ MINORITY (<⌈${n}/2⌉, evaluate critically):\n\n${blocks.join('\n\n')}`);
  }

  const footer =
    'Address blockers. For minority findings, briefly justify acceptance or rejection.';

  return `${header}\n\n${sections.join('\n\n')}\n\n${footer}`;
}
