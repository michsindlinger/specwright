import { homedir } from 'os';
import { join } from 'path';
import { query as claudeQuery } from '@anthropic-ai/claude-agent-sdk';

const AGGREGATOR_PROVIDER_ID = 'deepseek';
const AGGREGATOR_MODEL_ID = 'haiku';
const AGGREGATOR_TIMEOUT_MS = 180_000;
const AGGREGATOR_MAX_TURNS = 4;

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
}

function expandTilde(p: string): string {
  return p.startsWith('~') ? join(homedir(), p.slice(1)) : p;
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
    '- Drop pleasantries and meta-commentary, keep substantive findings only.\n' +
    '- Each cluster\'s confidence is len(supporting_keys).\n' +
    '- If a reviewer mentions multiple distinct findings, each goes into its own cluster.\n' +
    '- Each "quote" must be VERBATIM from the reviewer text — do not paraphrase.\n\n' +
    'Reviewers:\n' +
    sections +
    '\n\nOutput JSON only.'
  );
}

function validateClusters(parsed: unknown): Cluster[] | null {
  if (!parsed || typeof parsed !== 'object') return null;
  const obj = parsed as Record<string, unknown>;
  if (!Array.isArray(obj.clusters)) return null;
  const result: Cluster[] = [];
  for (const c of obj.clusters) {
    if (!c || typeof c !== 'object') return null;
    const cluster = c as Record<string, unknown>;
    if (typeof cluster.summary !== 'string') return null;
    if (!Array.isArray(cluster.supporting_keys)) return null;
    if (!cluster.supporting_keys.every((k) => typeof k === 'string')) return null;
    if (!Array.isArray(cluster.supporting_quotes)) return null;
    const quotes: Array<{ key: string; quote: string }> = [];
    for (const q of cluster.supporting_quotes) {
      if (!q || typeof q !== 'object') return null;
      const qo = q as Record<string, unknown>;
      if (typeof qo.key !== 'string' || typeof qo.quote !== 'string') return null;
      quotes.push({ key: qo.key, quote: qo.quote });
    }
    result.push({
      summary: cluster.summary,
      supporting_keys: cluster.supporting_keys as string[],
      supporting_quotes: quotes,
    });
  }
  return result;
}

async function callAggregatorLLM(prompt: string, projectPath: string): Promise<string> {
  return withAggregatorTimeout(async (ac) => {
    const configDir = expandTilde(`~/.claude-${AGGREGATOR_PROVIDER_ID}`);
    const baseEnv: Record<string, string | undefined> = { ...process.env };
    delete baseEnv.ANTHROPIC_API_KEY;
    delete baseEnv.ANTHROPIC_AUTH_TOKEN;
    delete baseEnv.ANTHROPIC_BASE_URL;

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
        env: { ...baseEnv, CLAUDE_CONFIG_DIR: configDir },
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
  }, AGGREGATOR_TIMEOUT_MS);
}

export async function aggregateFindings(
  mapped: MappedReviewer[],
  projectPath: string
): Promise<AggregatorResult> {
  if (mapped.length < 2) {
    return { clusters: [], fallbackUsed: true };
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
    return { clusters: [], fallbackUsed: true };
  }

  if (!raw.trim()) {
    const elapsed = Date.now() - startedAt;
    console.warn(`[FindingAggregator] fallback triggered after ${elapsed}ms: empty LLM output`);
    return { clusters: [], fallbackUsed: true };
  }

  const jsonText = extractJson(raw);

  let parsed: unknown;
  try {
    parsed = JSON.parse(jsonText);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    const elapsed = Date.now() - startedAt;
    console.warn(
      `[FindingAggregator] fallback triggered after ${elapsed}ms: JSON.parse failed — ${msg}`
    );
    return { clusters: [], fallbackUsed: true };
  }

  const clusters = validateClusters(parsed);
  if (!clusters) {
    const elapsed = Date.now() - startedAt;
    console.warn(
      `[FindingAggregator] fallback triggered after ${elapsed}ms: schema validation failed`
    );
    return { clusters: [], fallbackUsed: true };
  }

  const elapsed = Date.now() - startedAt;
  console.log(
    `[FindingAggregator] cluster call success in ${elapsed}ms — clusters=${clusters.length}`
  );

  return { clusters, fallbackUsed: false };
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
