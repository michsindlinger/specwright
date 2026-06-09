import { readFileSync, readdirSync } from 'fs';
import { homedir } from 'os';
import { join, isAbsolute, dirname, basename } from 'path';

// eslint-disable-next-line no-control-regex
const ANSI_CSI = /\x1b\[[0-9;]*[a-zA-Z]/g;
// OSC sequences: ESC ] ... BEL or ESC ] ... ESC backslash
// eslint-disable-next-line no-control-regex
const ANSI_OSC = /\x1b\][^\x07\x1b]*(?:\x07|\x1b\\)/g;

// Plan-mode footer line: "ctrl-g to edit in Vim · ~/.claude/plans/<slug>.md"
// Match absolute or tilde paths to .md files under .claude/plans/
const PLAN_PATH_PATTERN = /(~\/|\/)[^\s│─]*\.claude\/plans\/[\w.@%+-]+\.md/g;

export interface ExtractedPlan {
  planText: string;
  planPath: string;
}

/**
 * Extracts clean plan text from a PTY buffer tail.
 *
 * Strict file-path mode:
 *   1. Strip ANSI/OSC escape sequences and carriage returns
 *   2. Find the last `~/.claude/plans/<slug>.md` reference in the buffer
 *   3. Read that file and return its content + resolved path
 *   4. Return `null` if no plan path is present or the file can't be read
 *
 * No heuristic fallbacks (TUI-box, buffer tail, mtime-newest) — those caused
 * cross-session leaks where a box rendered during plan execution would be
 * mis-classified as a fresh plan, and the mtime fallback would even pull a
 * different session's plan file.
 */
export class PlanBufferExtractor {
  extract(rawBuffer: string): ExtractedPlan | null {
    const stripped = this.stripEscapes(rawBuffer);
    return this.extractFromPlanFile(stripped);
  }

  private stripEscapes(raw: string): string {
    return raw
      .replace(ANSI_OSC, '')
      .replace(ANSI_CSI, '')
      .replace(/\r/g, '');
  }

  private extractFromPlanFile(text: string): ExtractedPlan | null {
    PLAN_PATH_PATTERN.lastIndex = 0;
    const matches = text.match(PLAN_PATH_PATTERN);
    if (!matches || matches.length === 0) {
      const tail = text.slice(-2048).replace(/[\x00-\x1f\x7f]/g, '·'); // eslint-disable-line no-control-regex
      console.log(`[PlanBufferExtractor] No plan-file path in buffer; tail2k=${JSON.stringify(tail)}`);
      return null;
    }

    const raw = matches[matches.length - 1];
    let resolved = raw;
    if (raw.startsWith('~/')) {
      resolved = join(homedir(), raw.slice(2));
    } else if (!isAbsolute(raw)) {
      console.log(`[PlanBufferExtractor] Path not absolute, skipping: ${raw}`);
      return null;
    }

    try {
      const content = readFileSync(resolved, 'utf8');
      if (content.trim().length === 0) {
        console.log(`[PlanBufferExtractor] Plan file empty: ${resolved}`);
        return null;
      }
      console.log(`[PlanBufferExtractor] Loaded plan from file: ${resolved} (${content.length} bytes)`);
      return { planText: content, planPath: resolved };
    } catch (e) {
      // Ink's differential TUI redraws can drop characters from the footer path
      // as it is scraped from the raw PTY buffer, producing an ENOENT for an
      // almost-correct slug. Recover ONLY when the dropped-char slug is a
      // subsequence of exactly one real plan file — fail closed otherwise, so we
      // never inject another session's plan (see class doc re: cross-session).
      if ((e as NodeJS.ErrnoException).code === 'ENOENT') {
        const recovered = this.recoverUniqueSubsequenceMatch(resolved);
        if (recovered) {
          try {
            const content = readFileSync(recovered, 'utf8');
            if (content.trim().length > 0) {
              console.log(
                `[PlanBufferExtractor] Recovered plan via unique subsequence match: ${basename(resolved)} -> ${recovered} (${content.length} bytes)`
              );
              return { planText: content, planPath: recovered };
            }
          } catch (re) {
            // Candidate removed between readdir and read (race) — log distinctly.
            console.log(
              `[PlanBufferExtractor] Recovered candidate ${recovered} vanished before read: ${re instanceof Error ? re.message : String(re)}`
            );
          }
        }
      }
      console.log(`[PlanBufferExtractor] Failed to read plan file ${resolved}: ${e instanceof Error ? e.message : String(e)}`);
      return null;
    }
  }

  /**
   * Recover a plan file whose parsed name lost characters to TUI redraw
   * scraping. Returns a path only when the parsed basename is a subsequence of
   * exactly one `.md` file in the same directory; returns null on 0 or ≥2
   * matches (fail closed — no mtime/closest-length tie-break, which would risk
   * loading a different session's plan).
   */
  private recoverUniqueSubsequenceMatch(resolved: string): string | null {
    const dir = dirname(resolved);
    const target = basename(resolved);
    // Too-short fragments could coincidentally subsequence-match an unrelated
    // long slug; real plan slugs are well above this.
    if (target.length < 8) {
      return null;
    }

    let entries: string[];
    try {
      entries = readdirSync(dir);
    } catch {
      return null;
    }

    const targetLower = target.toLowerCase();
    const matches = entries.filter((name) => {
      if (!name.endsWith('.md')) {
        return false;
      }
      // Bound the corruption: a real file may be at most ~25% longer than the
      // dropped-char slug. Combined with uniqueness this keeps recovery precise.
      if (target.length < name.length * 0.8) {
        return false;
      }
      return isSubsequence(targetLower, name.toLowerCase());
    });

    return matches.length === 1 ? join(dir, matches[0]) : null;
  }
}

/**
 * True when `needle` can be obtained from `haystack` by deleting characters
 * (i.e. needle is a subsequence of haystack). Two-pointer scan, O(n).
 */
function isSubsequence(needle: string, haystack: string): boolean {
  let i = 0;
  for (let j = 0; j < haystack.length && i < needle.length; j++) {
    if (needle[i] === haystack[j]) {
      i++;
    }
  }
  return i === needle.length;
}
