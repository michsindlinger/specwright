import { query as claudeQuery } from '@anthropic-ai/claude-agent-sdk';
import { buildSdkCallOptions } from '../utils/sdk-call-options.js';
import type { ProbeGrund } from '../../shared/types/plan-review.protocol.js';
import type { ProbeErgebnis } from './review-auswahl.js';

export const REVIEWER_TOOLS: readonly string[] = ['Read', 'Grep', 'Glob'];
const MIN_REVIEW_PROSE_LENGTH = 40;

export function isSubstanceLessReview(text: string): boolean {
  const stripped = text
    .replace(/<tool_call\b[\s\S]*?<\/tool_call>/gi, '')
    .replace(/<tool_use\b[\s\S]*?<\/tool_use>/gi, '')
    .replace(/```[\s\S]*?```/g, '')
    .trim();
  return stripped.length < MIN_REVIEW_PROSE_LENGTH;
}

export async function withTimeout<T>(
  fn: (ac: AbortController) => Promise<T>,
  ms: number
): Promise<T> {
  const ac = new AbortController();
  const timer = setTimeout(() => ac.abort(), ms);
  try {
    return await fn(ac);
  } catch (err) {
    if (ac.signal.aborted) throw new Error('Reviewer timeout');
    throw err;
  } finally {
    clearTimeout(timer);
  }
}

/** INT-2026-037 (FA-11): a probe answers within this time or counts as failed. */
export const PROBE_TIMEOUT_MS = 15_000;

/** INT-2026-037 (FA-11): category of a failed probe from its error text. Pure. */
export function ordneProbeFehler(meldung: string): ProbeGrund {
  if (/timeout/i.test(meldung)) return 'zeitueberschreitung';
  if (/529|overload/i.test(meldung)) return 'ueberlastet';
  if (/401|403|auth|login|api key|unauthori/i.test(meldung)) return 'anmeldung';
  if (/model.*(not found|unknown|does not exist|invalid)|404/i.test(meldung)) return 'unbekanntes_modell';
  return 'fehler';
}

export class ExternalReviewer {
  /**
   * INT-2026-037 (FA-11): one tiny question without tools before a review —
   * ready when the provider answers anything within {@link PROBE_TIMEOUT_MS}.
   */
  async probe(providerId: string, modelId: string | undefined): Promise<ProbeErgebnis> {
    try {
      const antwort = await withTimeout(async (ac) => {
        const session = claudeQuery({
          prompt: 'Reply with: ok',
          options: {
            ...buildSdkCallOptions(providerId, []),
            maxTurns: 1,
            abortController: ac,
            ...(modelId ? { model: modelId } : {}),
          },
        });
        let text = '';
        try {
          for await (const event of session) {
            if (event.type !== 'result') continue;
            const ev = event as Record<string, unknown>;
            if (ev.subtype === 'success' && !ev.is_error && typeof ev.result === 'string') text = ev.result;
            else throw new Error(`${String(ev.subtype ?? 'unknown')}: ${typeof ev.result === 'string' ? ev.result : ''}`);
          }
        } finally {
          try {
            await session.return?.(undefined);
          } catch {
            // ignore — generator already closed
          }
        }
        return text;
      }, PROBE_TIMEOUT_MS);
      if (antwort.trim()) return { bereit: true };
      return { bereit: false, grund: 'fehler', meldung: 'empty answer' };
    } catch (err) {
      const meldung = err instanceof Error ? err.message : String(err);
      return { bereit: false, grund: ordneProbeFehler(meldung), meldung };
    }
  }

  async reviewPlan(
    prompt: string,
    providerId: string,
    modelId: string | undefined,
    projectPath: string
  ): Promise<string> {
    return withTimeout(async (ac) => {
      const stderrBuf: string[] = [];

      console.log(
        `[ExternalReviewer] ${providerId}${modelId ? ':' + modelId : ''} prompt-head=${JSON.stringify(prompt.slice(0, 240))} totalLen=${prompt.length}`
      );

      // Provider auth, read-only tool set and "no MCP servers" come from
      // buildSdkCallOptions (single source of truth, shared with the finding
      // aggregator). Anthropic reuses the default ~/.claude OAuth login; other
      // providers use their scoped ~/.claude-<id>.
      const session = claudeQuery({
        prompt,
        options: {
          ...buildSdkCallOptions(providerId, REVIEWER_TOOLS),
          maxTurns: 40,
          cwd: projectPath,
          abortController: ac,
          stderr: (data: string) => {
            stderrBuf.push(data);
          },
          ...(modelId ? { model: modelId } : {}),
        },
      });

      let result = '';
      let errorDetail = '';
      let streamError: unknown = null;

      try {
        for await (const event of session) {
          if (event.type === 'result') {
            const ev = event as Record<string, unknown>;
            const subtype = typeof ev.subtype === 'string' ? ev.subtype : '';
            const isError = Boolean(ev.is_error);
            const resultText = typeof ev.result === 'string' ? ev.result : '';

            if (subtype === 'success' && !isError) {
              result = resultText;
            } else {
              errorDetail = `${subtype || 'unknown'}${isError ? ' (is_error)' : ''}${resultText ? ': ' + resultText : ''}`;
            }
          }
        }
      } catch (err) {
        streamError = err;
      } finally {
        try {
          await session.return?.(undefined);
        } catch {
          // ignore — generator already closed
        }
      }

      const substanceLess = result && !streamError && isSubstanceLessReview(result);

      if (!result || streamError || substanceLess) {
        const stderr = stderrBuf.join('').trim();
        const ref = `${providerId}${modelId ? ':' + modelId : ''}`;
        const parts: string[] = [`Reviewer ${ref} failed`];
        if (streamError) {
          parts.push(streamError instanceof Error ? streamError.message : String(streamError));
        }
        if (errorDetail) parts.push(errorDetail);
        if (substanceLess) {
          parts.push(
            `output contained no review prose (only tool-call XML / code blocks; ${result.length} chars raw)`
          );
        }
        if (stderr) parts.push(`stderr: ${stderr.slice(0, 800)}`);
        throw new Error(parts.join(' — '));
      }

      return result;
    }, 300_000);
  }
}
