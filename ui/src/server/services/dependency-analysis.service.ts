import { promises as fs } from 'fs';
import { join } from 'path';
import { query as claudeQuery } from '@anthropic-ai/claude-agent-sdk';
import { projectDir } from '../utils/project-dirs.js';
import { withTimeout } from './external-reviewer.js';
import type { ProposedEdge } from '../../shared/types/spec-dependencies.protocol.js';
import type { SpecInfo } from '../specs-reader.js';

const ANALYSIS_TIMEOUT_MS = 120_000;
const VALID_CONFIDENCES = new Set(['high', 'medium', 'low']);

interface SpecContent {
  id: string;
  name: string;
  specLite: string;
}

export class DependencyAnalysisService {
  async analyze(
    projectPath: string,
    activeSpecs: SpecInfo[],
    targetSpecId?: string
  ): Promise<ProposedEdge[]> {
    const candidates = activeSpecs.filter(
      s => !(s.storyCount > 0 && s.completedCount >= s.storyCount)
    );
    if (candidates.length < 2) return [];

    const specContents = await this.loadSpecLites(projectPath, candidates);

    let proposals = await this.runInitialAnalysis(projectPath, specContents, targetSpecId);

    // Escalate medium + low confidence pairs with richer context
    const toEscalate = proposals.filter(p => p.confidence === 'medium' || p.confidence === 'low');
    if (toEscalate.length > 0) {
      const affectedIds = new Set(toEscalate.flatMap(p => [p.from, p.to]));
      const enhanced = await this.loadEnhancedContexts(projectPath, specContents, affectedIds);
      proposals = await this.reAnalyzePairs(projectPath, proposals, toEscalate, enhanced);
    }

    // Still-low proposals are flagged for manual review
    for (const p of proposals) {
      if (p.confidence === 'low') p.needsReview = true;
    }

    return proposals;
  }

  private async loadSpecLites(projectPath: string, specs: SpecInfo[]): Promise<SpecContent[]> {
    const results: SpecContent[] = [];
    for (const spec of specs) {
      const specPath = projectDir(projectPath, 'specs', spec.id);
      let specLite = '';
      try {
        specLite = await fs.readFile(join(specPath, 'spec-lite.md'), 'utf-8');
      } catch {
        try {
          const full = await fs.readFile(join(specPath, 'spec.md'), 'utf-8');
          specLite = full.slice(0, 1500);
        } catch {
          specLite = spec.name;
        }
      }
      results.push({ id: spec.id, name: spec.name, specLite: specLite.trim() });
    }
    return results;
  }

  private async loadEnhancedContexts(
    projectPath: string,
    specContents: SpecContent[],
    specIds: Set<string>
  ): Promise<Map<string, string>> {
    const enhanced = new Map<string, string>();
    for (const s of specContents) {
      if (!specIds.has(s.id)) continue;
      const specPath = projectDir(projectPath, 'specs', s.id);
      let extra = '';
      for (const file of ['implementation-plan.md', 'spec.md']) {
        try {
          const content = await fs.readFile(join(specPath, file), 'utf-8');
          extra = content.slice(0, 3000);
          break;
        } catch { /* try next file */ }
      }
      enhanced.set(s.id, extra || s.specLite);
    }
    return enhanced;
  }

  private async runInitialAnalysis(
    projectPath: string,
    specContents: SpecContent[],
    targetSpecId?: string
  ): Promise<ProposedEdge[]> {
    const specsBlock = specContents
      .map(c => `### ${c.id}\n${c.name}\n\n${c.specLite}`)
      .join('\n\n---\n\n');

    const focusHint = targetSpecId
      ? `\nPrioritize dependencies involving "${targetSpecId}".\n`
      : '';

    const prompt = `Analyze software spec dependencies. Identify which specs must be completed before others can start.${focusHint}

Active Specs:
${specsBlock}

Return ONLY a JSON array (no markdown, no explanation):
[{"from":"spec-id-that-depends","to":"spec-id-prerequisite","confidence":"high|medium|low","reason":"one sentence"}]

Rules:
- "from" depends on "to": from.blockedBy += to (from cannot start until to is done)
- Only include clear technical or logical dependencies
- Confidence: high=obvious, medium=likely, low=uncertain
- Return [] if no dependencies found`;

    return this.queryAndParse(projectPath, prompt);
  }

  private async reAnalyzePairs(
    projectPath: string,
    originalProposals: ProposedEdge[],
    pairsToEscalate: ProposedEdge[],
    enhanced: Map<string, string>
  ): Promise<ProposedEdge[]> {
    const pairsBlock = pairsToEscalate
      .map(p => {
        const fromCtx = enhanced.get(p.from) ?? '';
        const toCtx = enhanced.get(p.to) ?? '';
        return `Pair: ${p.from} → ${p.to}\n**${p.from}:**\n${fromCtx}\n\n**${p.to}:**\n${toCtx}`;
      })
      .join('\n\n---\n\n');

    const prompt = `Re-analyze these specific spec dependency pairs with fuller context.

${pairsBlock}

Return ONLY a JSON array for pairs where a dependency EXISTS:
[{"from":"spec-id-that-depends","to":"spec-id-prerequisite","confidence":"high|medium|low","reason":"one sentence"}]

Return [] if no dependencies confirmed.`;

    try {
      const revised = await this.queryAndParse(projectPath, prompt);
      const escalatedKey = new Set(pairsToEscalate.map(p => `${p.from}|${p.to}`));
      const kept = originalProposals.filter(p => !escalatedKey.has(`${p.from}|${p.to}`));
      const seen = new Set(kept.map(p => `${p.from}|${p.to}`));
      for (const r of revised) {
        const k = `${r.from}|${r.to}`;
        if (!seen.has(k)) { kept.push(r); seen.add(k); }
      }
      return kept;
    } catch {
      return originalProposals;
    }
  }

  private async queryAndParse(projectPath: string, prompt: string): Promise<ProposedEdge[]> {
    return withTimeout(async (ac) => {
      const session = claudeQuery({
        prompt,
        options: {
          maxTurns: 3,
          tools: [],
          allowedTools: [],
          permissionMode: 'bypassPermissions',
          allowDangerouslySkipPermissions: true,
          cwd: projectPath,
          abortController: ac,
          settingSources: ['user'],
        },
      });

      let result = '';
      let streamError: unknown = null;

      try {
        for await (const event of session) {
          if (event.type === 'result') {
            const ev = event as Record<string, unknown>;
            if (typeof ev.subtype === 'string' && ev.subtype === 'success' && !ev.is_error) {
              result = typeof ev.result === 'string' ? ev.result : '';
            }
          }
        }
      } catch (err) {
        streamError = err;
      } finally {
        try { await session.return?.(undefined); } catch { /* ignore */ }
      }

      if (streamError || !result) {
        throw new Error(
          `Dependency analysis failed: ${streamError instanceof Error ? streamError.message : String(streamError ?? 'no result')}`
        );
      }

      return this.parseProposals(result);
    }, ANALYSIS_TIMEOUT_MS);
  }

  parseProposals(text: string): ProposedEdge[] {
    const stripped = text.replace(/```[a-z]*\n?/gi, '').replace(/```/g, '');
    const jsonMatch = stripped.match(/\[[\s\S]*\]/);
    if (!jsonMatch) return [];

    try {
      const parsed = JSON.parse(jsonMatch[0]);
      if (!Array.isArray(parsed)) return [];
      return parsed.filter(
        (item): item is ProposedEdge =>
          typeof item === 'object' &&
          item !== null &&
          typeof item.from === 'string' &&
          typeof item.to === 'string' &&
          VALID_CONFIDENCES.has(item.confidence) &&
          typeof item.reason === 'string' &&
          item.from !== item.to
      );
    } catch {
      return [];
    }
  }
}

export const dependencyAnalysisService = new DependencyAnalysisService();
