/**
 * INT-2026-038 (FA-06, FA-10, AN-S05): the handoff a `/handoff-weiter` round
 * wrote. The server searches the session's handoff folder itself — the name
 * never comes from the session's output (spec §7) — and only names that pass
 * a fixed pattern, so the name is safe inside the pasted command.
 */
import { lstat, readdir, realpath } from 'fs/promises';
import { join, sep } from 'path';

/** `/handoff-weiter` typed or pasted (the `UserPromptSubmit` text). */
export const HANDOFF_COMMAND_RE = /^\s*\/handoff-weiter\b/;

export const HANDOFF_DIR = join('.claude', 'handoffs');

const HANDOFF_NAME_RE = /^handoff-[0-9A-Za-z_-]+\.md$/;

/** The command that reads exactly this handoff in the cleared session (FA-10, FA-11). */
export function einleseBefehl(name: string): string {
  return `/start-from-handoff .claude/handoffs/${name} nur lesen`;
}

/**
 * Name of the youngest regular handoff file under `<cwd>/.claude/handoffs`
 * changed at or after `seitMs`; undefined when there is none or the folder
 * is missing. Symlinks are skipped, and the resolved path must stay inside
 * the folder.
 */
export async function findeNeuesHandoff(cwd: string, seitMs: number): Promise<string | undefined> {
  const dir = join(cwd, HANDOFF_DIR);
  let names: string[];
  let realDir: string;
  try {
    names = await readdir(dir);
    realDir = await realpath(dir);
  } catch {
    return undefined;
  }
  let best: { name: string; mtime: number } | undefined;
  for (const name of names) {
    if (!HANDOFF_NAME_RE.test(name)) continue;
    try {
      const path = join(dir, name);
      const st = await lstat(path);
      if (!st.isFile() || st.mtimeMs < seitMs) continue;
      if (!(await realpath(path)).startsWith(realDir + sep)) continue;
      if (!best || st.mtimeMs > best.mtime) best = { name, mtime: st.mtimeMs };
    } catch {
      // vanished between readdir and lstat
    }
  }
  return best?.name;
}
