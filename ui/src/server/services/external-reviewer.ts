import { homedir } from 'os';
import { join } from 'path';
import { query as claudeQuery } from '@anthropic-ai/claude-agent-sdk';

function expandTilde(p: string): string {
  return p.startsWith('~') ? join(homedir(), p.slice(1)) : p;
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

      const session = claudeQuery({
        prompt,
        options: {
          maxTurns: 1,
          cwd: projectPath,
          abortController: ac,
          env: { ...process.env, CLAUDE_CONFIG_DIR: configDir },
          ...(modelId ? { model: modelId } : {}),
        },
      });

      let result = '';
      for await (const event of session) {
        if (event.type === 'result' && event.subtype === 'success') {
          result = event.result;
        }
      }

      if (!result) throw new Error('No result from reviewer');
      return result;
    }, 60_000);
  }
}
