import { homedir } from 'os';
import { join } from 'path';
import { query as claudeQuery } from '@anthropic-ai/claude-agent-sdk';

function expandTilde(p: string): string {
  return p.startsWith('~') ? join(homedir(), p.slice(1)) : p;
}

const REVIEWER_TOOLS: string[] = ['Read', 'Grep', 'Glob'];
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

export class ExternalReviewer {
  async reviewPlan(
    prompt: string,
    providerId: string,
    modelId: string | undefined,
    projectPath: string
  ): Promise<string> {
    return withTimeout(async (ac) => {
      const configDir = expandTilde(`~/.claude-${providerId}`);
      const stderrBuf: string[] = [];

      console.log(
        `[ExternalReviewer] ${providerId}${modelId ? ':' + modelId : ''} prompt-head=${JSON.stringify(prompt.slice(0, 240))} totalLen=${prompt.length}`
      );

      const baseEnv: Record<string, string | undefined> = { ...process.env };
      delete baseEnv.ANTHROPIC_API_KEY;
      delete baseEnv.ANTHROPIC_AUTH_TOKEN;
      delete baseEnv.ANTHROPIC_BASE_URL;

      const session = claudeQuery({
        prompt,
        options: {
          maxTurns: 40,
          tools: REVIEWER_TOOLS,
          allowedTools: REVIEWER_TOOLS,
          permissionMode: 'bypassPermissions',
          allowDangerouslySkipPermissions: true,
          cwd: projectPath,
          abortController: ac,
          env: { ...baseEnv, CLAUDE_CONFIG_DIR: configDir },
          settingSources: ['user'],
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
