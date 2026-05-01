import { readFileSync, readdirSync, statSync } from 'fs';
import { homedir } from 'os';
import { join, isAbsolute } from 'path';

// eslint-disable-next-line no-control-regex
const ANSI_CSI = /\x1b\[[0-9;]*[a-zA-Z]/g;
// OSC sequences: ESC ] ... BEL or ESC ] ... ESC backslash
// eslint-disable-next-line no-control-regex
const ANSI_OSC = /\x1b\][^\x07\x1b]*(?:\x07|\x1b\\)/g;

const FALLBACK_SIZE = 8 * 1024;

// TUI box corners used by Claude Code plan mode
const BOX_TOP = '╭';
const BOX_BOTTOM = '╰';

// Plan-mode footer line: "ctrl-g to edit in Vim · ~/.claude/plans/<slug>.md"
// Match absolute or tilde paths to .md files under .claude/plans/
const PLAN_PATH_PATTERN = /(~\/|\/)[^\s│─]*\.claude\/plans\/[\w.@%+-]+\.md/g;

// Recency window for plan-file mtime fallback: only files modified within
// this many ms count as the "active" plan. 10 min is generous but bounded.
const PLAN_RECENCY_MS = 10 * 60 * 1000;

/**
 * Extracts clean plan text from a PTY buffer tail.
 *
 * Strategy:
 *   1. Strip ANSI/OSC escape sequences and carriage returns
 *   2. If buffer contains a plan-file path (`~/.claude/plans/<slug>.md`),
 *      read that file directly — most reliable source, immune to TUI overlay
 *      from approval-dialog search picker etc.
 *   3. Else: find the last complete TUI box (╭…╰) — heuristic
 *   4. Fallback: last 8 KB of stripped text
 *   5. Throw if the result is empty
 */
export class PlanBufferExtractor {
  extract(rawBuffer: string): string {
    const stripped = this.stripEscapes(rawBuffer);

    const fromFile = this.extractFromPlanFile(stripped);
    if (fromFile !== null && fromFile.trim().length > 0) {
      return fromFile;
    }

    const fromMtime = this.extractFromMostRecentPlanFile();
    if (fromMtime !== null && fromMtime.trim().length > 0) {
      return fromMtime;
    }

    const boxContent = this.extractLastTuiBox(stripped);
    if (boxContent !== null && boxContent.trim().length > 0) {
      console.log(`[PlanBufferExtractor] Falling back to TUI-box heuristic (${boxContent.length} bytes)`);
      return boxContent;
    }

    const fallback = stripped.slice(-FALLBACK_SIZE);
    if (fallback.trim().length === 0) {
      throw new Error('PlanBufferExtractor: no plan content found in buffer');
    }
    console.log(`[PlanBufferExtractor] Falling back to last ${FALLBACK_SIZE} bytes of buffer`);
    return fallback;
  }

  private stripEscapes(raw: string): string {
    return raw
      .replace(ANSI_OSC, '')
      .replace(ANSI_CSI, '')
      .replace(/\r/g, '');
  }

  private extractFromPlanFile(text: string): string | null {
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
      return content;
    } catch (e) {
      console.log(`[PlanBufferExtractor] Failed to read plan file ${resolved}: ${e instanceof Error ? e.message : String(e)}`);
      return null;
    }
  }

  private extractFromMostRecentPlanFile(): string | null {
    const plansDir = join(homedir(), '.claude', 'plans');
    let entries: string[];
    try {
      entries = readdirSync(plansDir);
    } catch (e) {
      console.log(`[PlanBufferExtractor] Plans dir not readable: ${plansDir} (${e instanceof Error ? e.message : String(e)})`);
      return null;
    }

    const mdFiles = entries.filter((f) => f.endsWith('.md'));
    if (mdFiles.length === 0) {
      console.log(`[PlanBufferExtractor] No .md files in ${plansDir}`);
      return null;
    }

    const cutoff = Date.now() - PLAN_RECENCY_MS;
    let best: { path: string; mtime: number } | null = null;
    for (const f of mdFiles) {
      const full = join(plansDir, f);
      try {
        const m = statSync(full).mtimeMs;
        if (m < cutoff) continue;
        if (!best || m > best.mtime) best = { path: full, mtime: m };
      } catch {
        // skip
      }
    }

    if (!best) {
      console.log(`[PlanBufferExtractor] No plan files modified within last ${PLAN_RECENCY_MS}ms`);
      return null;
    }

    try {
      const content = readFileSync(best.path, 'utf8');
      if (content.trim().length === 0) return null;
      console.log(`[PlanBufferExtractor] Loaded most-recent plan by mtime: ${best.path} (${content.length} bytes, age=${Date.now() - best.mtime}ms)`);
      return content;
    } catch (e) {
      console.log(`[PlanBufferExtractor] Failed to read mtime-best plan ${best.path}: ${e instanceof Error ? e.message : String(e)}`);
      return null;
    }
  }

  private extractLastTuiBox(text: string): string | null {
    const bottomIdx = text.lastIndexOf(BOX_BOTTOM);
    if (bottomIdx === -1) return null;

    const topIdx = text.lastIndexOf(BOX_TOP, bottomIdx);
    if (topIdx === -1) return null;

    // Include the full bottom border line
    const afterBottom = text.indexOf('\n', bottomIdx);
    const end = afterBottom === -1 ? text.length : afterBottom + 1;

    return text.slice(topIdx, end);
  }
}
