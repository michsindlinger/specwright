/**
 * Transcript reader (INT-2026-007, FA-01–FA-04): turns the JSONL transcript
 * Claude Code writes per session (`~/.claude[-<provider>]/projects/<slug>/<id>.jsonl`)
 * into the Beiträge of the Gespräch, and follows the file incrementally.
 *
 * Contract with the format (ADR-0003): only `type` ∈ {user, assistant},
 * `uuid`, `timestamp`, `isMeta`, `isSidechain`, `message.content` (string or
 * blocks text | tool_use | tool_result), `toolUseResult` (only `answers`,
 * `plan`), `version`, `cwd`, `sessionId` are read. Every other record type
 * (`attachment`, `system`, `last-prompt`, `mode`, `file-history-snapshot`, …)
 * is ignored, so a new record type in a new Claude Code version cannot break
 * the reader — it only makes the Verlauf incomplete, which the version check
 * reports. Fixtures per version: `ui/tests/fixtures/transcript/<version>/`
 * (recorded 2.1.273, 2026-09-16, scratch project).
 *
 * Pure functions first (`parseTranscriptLine`, `buildVerlauf`), IO only in
 * {@link TranscriptTailer}.
 */

import { EventEmitter } from 'events';
import * as fs from 'fs';
import type { Beitrag, DialogKarte, RueckfrageFrage } from '../../shared/types/gespraech.protocol.js';
import { parseRueckfrageQuestions } from './claude-hooks.js';

// ---- normalized entries ----

/** Fields every entry may carry: `version` and `cwd` of the record (allowlist check, version check). */
interface EntryMeta {
  version?: string;
  cwd?: string;
}

export type TranscriptEntry =
  | (EntryMeta & { kind: 'nutzer'; uuid: string; at: string; text: string })
  | (EntryMeta & { kind: 'claude'; uuid: string; at: string; messageId?: string; text: string })
  | (EntryMeta & { kind: 'tool_use'; uuid: string; at: string; toolUseId: string; name: string; input: unknown })
  | (EntryMeta & { kind: 'tool_result'; uuid: string; at: string; toolUseId: string; isError: boolean; content: string; toolUseResult: unknown })
  | (EntryMeta & { kind: 'ignoriert'; type: string });

/** Bounds a transcript text before it travels to the client. */
export const TRANSCRIPT_TEXT_MAX_CHARS = 200_000;

const str = (v: unknown): string | undefined => (typeof v === 'string' ? v : undefined);
const cut = (t: string): string => (t.length > TRANSCRIPT_TEXT_MAX_CHARS ? t.slice(0, TRANSCRIPT_TEXT_MAX_CHARS) : t);

/** `<command-name>/x</command-name> … <command-args>y</command-args>` → `/x y` (how Claude Code records a typed slash command). */
export function commandWrapperToText(content: string): string | undefined {
  const name = /<command-name>([^<]*)<\/command-name>/.exec(content)?.[1]?.trim();
  if (!name) return undefined;
  const args = /<command-args>([^<]*)<\/command-args>/.exec(content)?.[1]?.trim();
  const cmd = name.startsWith('/') ? name : `/${name}`;
  return args ? `${cmd} ${args}` : cmd;
}

/** Text content of a tool_result block (string or text blocks). */
function resultContentText(content: unknown): string {
  if (typeof content === 'string') return content;
  if (Array.isArray(content)) {
    return content
      .map((b) => (b && typeof b === 'object' && (b as { type?: unknown }).type === 'text' ? str((b as { text?: unknown }).text) ?? '' : ''))
      .join('');
  }
  return '';
}

/**
 * One JSONL line → zero or more normalized entries. `null` = not JSON (defect).
 * A `user`/`assistant` record can hold several blocks; each block becomes an
 * entry of its own so the Verlauf can pair tool_use and tool_result by id.
 */
export function parseTranscriptLine(line: string): TranscriptEntry[] | null {
  let raw: unknown;
  try {
    raw = JSON.parse(line);
  } catch {
    return null;
  }
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null;
  const e = raw as Record<string, unknown>;
  const type = str(e.type) ?? '(ohne type)';
  const version = str(e.version);
  const cwd = str(e.cwd);
  const meta: EntryMeta = { ...(version ? { version } : {}), ...(cwd ? { cwd } : {}) };
  const ignored: TranscriptEntry[] = [{ kind: 'ignoriert', type, ...meta }];
  if (type !== 'user' && type !== 'assistant') return ignored;
  if (e.isSidechain === true) return ignored;
  const uuid = str(e.uuid);
  const at = str(e.timestamp);
  if (!uuid || !at) return ignored;
  const message = e.message as { content?: unknown; id?: unknown } | undefined;
  const content = message?.content;

  if (type === 'user') {
    if (typeof content === 'string') {
      if (e.isMeta === true) return ignored;
      if (/<local-command-stdout>|<local-command-caveat>/.test(content) && !/<command-name>/.test(content)) return ignored;
      const text = commandWrapperToText(content) ?? content;
      if (!text.trim()) return ignored;
      return [{ kind: 'nutzer', uuid, at, text: cut(text), ...meta }];
    }
    if (!Array.isArray(content)) return ignored;
    const out: TranscriptEntry[] = [];
    const texts: string[] = [];
    for (const b of content) {
      if (!b || typeof b !== 'object') continue;
      const block = b as Record<string, unknown>;
      if (block.type === 'tool_result') {
        const toolUseId = str(block.tool_use_id);
        if (!toolUseId) continue;
        out.push({ kind: 'tool_result', uuid, at, toolUseId, isError: block.is_error === true, content: cut(resultContentText(block.content)), toolUseResult: e.toolUseResult, ...meta });
      } else if (block.type === 'text' && e.isMeta !== true) {
        const t = str(block.text);
        if (t) texts.push(t);
      }
    }
    if (texts.length) out.push({ kind: 'nutzer', uuid, at, text: cut(texts.join('\n')), ...meta });
    return out.length ? out : ignored;
  }

  // assistant
  if (!Array.isArray(content)) return ignored;
  const messageId = str(message?.id);
  const out: TranscriptEntry[] = [];
  for (const b of content) {
    if (!b || typeof b !== 'object') continue;
    const block = b as Record<string, unknown>;
    if (block.type === 'text') {
      const t = str(block.text);
      if (t) out.push({ kind: 'claude', uuid, at, ...(messageId ? { messageId } : {}), text: cut(t), ...meta });
    } else if (block.type === 'tool_use') {
      const toolUseId = str(block.id);
      const name = str(block.name);
      if (toolUseId && name) out.push({ kind: 'tool_use', uuid, at, toolUseId, name, input: block.input, ...meta });
    }
    // thinking and unknown blocks: ignored
  }
  return out.length ? out : ignored;
}

// ---- Verlauf ----

export interface Verlauf {
  beitraege: Beitrag[];
  /** Dialog cards still without a result, in order. */
  offeneDialoge: DialogKarte[];
  /** How many of the parsed records the reader understood (version check, ADR-0003). */
  bekannt: number;
  gesamt: number;
  version?: string;
}

const DIALOG_TOOLS = new Set(['AskUserQuestion', 'ExitPlanMode']);

/** `tool_result` of an ExitPlanMode → decision, by structure where possible (G9). */
export function planErgebnis(entry: { isError: boolean; content: string; toolUseResult: unknown }): NonNullable<DialogKarte['ergebnis']>['plan'] {
  const r = entry.toolUseResult;
  if (r && typeof r === 'object' && typeof (r as { plan?: unknown }).plan === 'string') return { entscheidung: 'angenommen' };
  if (!entry.isError && typeof r !== 'string') return { entscheidung: 'unbekannt' };
  // Rejected. With feedback the tool result quotes the user after "said:\n";
  // a plain Escape leaves no quote (toolUseResult "User rejected tool use").
  const text = typeof r === 'string' ? r : entry.content;
  const m = /said:\n([\s\S]*)$/.exec(text) ?? /said:\n([\s\S]*)$/.exec(entry.content);
  const said = stripTrailingNote(m?.[1] ?? '');
  if (said) return { entscheidung: 'aenderungen', text: said.slice(0, TRANSCRIPT_TEXT_MAX_CHARS) };
  return { entscheidung: 'abgebrochen' };
}

/** Claude Code appends a `Note: …` paragraph to the quoted feedback; that is not the user's text. */
export function stripTrailingNote(text: string): string {
  return text.replace(/\n\s*Note: [\s\S]*$/, '').trim();
}

function answersOf(result: unknown): Record<string, string> | undefined {
  const raw = (result as { answers?: unknown } | undefined)?.answers;
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return undefined;
  const out: Record<string, string> = {};
  for (const [q, a] of Object.entries(raw as Record<string, unknown>)) if (typeof a === 'string') out[q] = a;
  return out;
}

function planTextOf(input: unknown): string {
  const plan = str((input as { plan?: unknown } | undefined)?.plan);
  return plan ? cut(plan) : '';
}

/**
 * Entries → Beiträge. Rules (plan §3 A.4, Arbeitsblock-Regel E16):
 * - `nutzer` → Beitrag `nutzer` (quelle `terminal`; the service relabels);
 * - `claude` text blocks of the same `messageId` in a row → one Beitrag;
 * - `tool_use` AskUserQuestion / ExitPlanMode → dialog card, open until its
 *   `tool_result` (answers / plan decision);
 * - every other tool_use/tool_result between two text Beiträge → one work
 *   block (count, duration; `laeuft` while a tool_use has no result yet);
 * - `ignoriert` counts for the version check only.
 */
export function buildVerlauf(entries: TranscriptEntry[]): Verlauf {
  const beitraege: Beitrag[] = [];
  const dialogs = new Map<string, DialogKarte>();
  const dialogOrder: string[] = [];
  let work: { id: string; at: string; werkzeuge: number; open: Set<string>; lastAt: string } | null = null;
  let lastClaude: { messageId?: string; index: number } | null = null;
  let bekannt = 0;
  let version: string | undefined;

  const flushWork = (): void => {
    if (!work) return;
    const dauerMs = Math.max(0, new Date(work.lastAt).getTime() - new Date(work.at).getTime());
    beitraege.push({ id: work.id, at: work.at, art: 'arbeit', werkzeuge: work.werkzeuge, dauerMs, laeuft: work.open.size > 0 });
    work = null;
  };

  for (const e of entries) {
    if (e.version && !version) version = e.version;
    if (e.kind === 'ignoriert') continue;
    bekannt++;
    switch (e.kind) {
      case 'nutzer':
        flushWork();
        lastClaude = null;
        beitraege.push({ id: e.uuid, at: e.at, art: 'nutzer', text: e.text, quelle: 'terminal' });
        break;
      case 'claude': {
        flushWork();
        if (lastClaude && e.messageId && lastClaude.messageId === e.messageId) {
          const prev = beitraege[lastClaude.index];
          if (prev.art === 'claude') prev.text = cut(prev.text + e.text);
          break;
        }
        beitraege.push({ id: e.uuid, at: e.at, art: 'claude', text: e.text });
        lastClaude = { messageId: e.messageId, index: beitraege.length - 1 };
        break;
      }
      case 'tool_use': {
        lastClaude = null;
        if (DIALOG_TOOLS.has(e.name)) {
          flushWork();
          const karte: DialogKarte =
            e.name === 'AskUserQuestion'
              ? { id: e.toolUseId, kind: 'rueckfrage', zustand: 'offen', quelle: 'transkript', questions: parseRueckfrageQuestions(e.input) as RueckfrageFrage[] }
              : { id: e.toolUseId, kind: 'plan', zustand: 'offen', quelle: 'transkript', plan: planTextOf(e.input) };
          dialogs.set(e.toolUseId, karte);
          dialogOrder.push(e.toolUseId);
          beitraege.push({ id: `dialog:${e.toolUseId}`, at: e.at, art: 'dialog', dialog: karte });
          break;
        }
        if (!work) work = { id: e.uuid, at: e.at, werkzeuge: 0, open: new Set(), lastAt: e.at };
        work.werkzeuge++;
        work.open.add(e.toolUseId);
        work.lastAt = e.at;
        break;
      }
      case 'tool_result': {
        const karte = dialogs.get(e.toolUseId);
        if (karte) {
          karte.zustand = 'beantwortet';
          karte.ergebnis =
            karte.kind === 'rueckfrage'
              ? { durch: 'terminal', ...(answersOf(e.toolUseResult) ? { answers: answersOf(e.toolUseResult) } : {}) }
              : { durch: 'terminal', plan: planErgebnis(e) };
          break;
        }
        if (work) {
          work.open.delete(e.toolUseId);
          work.lastAt = e.at;
        }
        break;
      }
    }
  }
  flushWork();
  const offeneDialoge = dialogOrder.map((id) => dialogs.get(id)!).filter((d) => d.zustand === 'offen');
  return { beitraege, offeneDialoge, bekannt, gesamt: entries.length, ...(version ? { version } : {}) };
}

// ---- Tailer ----

export interface TranscriptTailerOptions {
  /** Poll interval as fs.watch fallback (ms). */
  pollMs?: number;
  /** Window for the defect-line ratio (H8). */
  defectWindow?: number;
}

export interface TailerStats {
  /** Complete lines that were not JSON, within the window. */
  defekt: number;
  /** Complete lines seen, within the window. */
  zeilen: number;
  bytes: number;
}

/**
 * Follows one transcript file from a byte offset: `fs.watch` plus a poll as
 * fallback, `readNow()` for hook-driven reads. One reader (G7): every trigger
 * funnels into `drain()`, serialized through a promise chain. An incomplete
 * trailing line is held back until its newline arrives; a shrunken file
 * (Kürzung, G14) restarts at offset 0 and emits `reset`.
 *
 * Events: `entries` (TranscriptEntry[]) · `reset` · `error` (Error) ·
 * `defekt` (TailerStats) when a complete line was not JSON.
 */
export class TranscriptTailer extends EventEmitter {
  private offset = 0;
  private rest = '';
  private watcher: fs.FSWatcher | null = null;
  private poll: NodeJS.Timeout | null = null;
  private chain: Promise<void> = Promise.resolve();
  private stopped = false;
  private readonly pollMs: number;
  private readonly defectWindow: number;
  private recent: boolean[] = [];
  public readonly stats: TailerStats = { defekt: 0, zeilen: 0, bytes: 0 };

  constructor(public readonly path: string, opts: TranscriptTailerOptions = {}) {
    super();
    this.pollMs = opts.pollMs ?? 1000;
    this.defectWindow = opts.defectWindow ?? 200;
  }

  /** Starts watching; reads what is there already. Safe to call once. */
  public start(): Promise<void> {
    if (this.stopped) return Promise.resolve();
    this.armWatch();
    this.poll = setInterval(() => void this.readNow(), this.pollMs);
    this.poll.unref?.();
    return this.readNow();
  }

  public stop(): void {
    this.stopped = true;
    this.watcher?.close();
    this.watcher = null;
    if (this.poll) clearInterval(this.poll);
    this.poll = null;
  }

  /** Reads everything appended since the last read. Serialized. */
  public readNow(): Promise<void> {
    this.chain = this.chain.then(() => this.drain()).catch((err: unknown) => {
      this.emit('error', err instanceof Error ? err : new Error(String(err)));
    });
    return this.chain;
  }

  private armWatch(): void {
    if (this.watcher) return;
    try {
      this.watcher = fs.watch(this.path, () => void this.readNow());
      this.watcher.on('error', () => {
        this.watcher?.close();
        this.watcher = null;
      });
    } catch {
      // file not there yet — the poll will find it; watch is re-armed on the next drain
      this.watcher = null;
    }
  }

  private async drain(): Promise<void> {
    if (this.stopped) return;
    let st: fs.Stats;
    try {
      st = await fs.promises.stat(this.path);
    } catch {
      return; // not there (yet) — a transcript is created with the first prompt
    }
    if (!this.watcher) this.armWatch();
    if (st.size < this.offset) {
      this.offset = 0;
      this.rest = '';
      this.emit('reset');
    }
    if (st.size === this.offset) return;
    const fd = await fs.promises.open(this.path, 'r');
    let chunk: string;
    try {
      const buf = Buffer.alloc(st.size - this.offset);
      const { bytesRead } = await fd.read(buf, 0, buf.length, this.offset);
      chunk = buf.subarray(0, bytesRead).toString('utf8');
      this.offset += bytesRead;
    } finally {
      await fd.close();
    }
    this.stats.bytes = this.offset;
    const lines = (this.rest + chunk).split('\n');
    this.rest = lines.pop() ?? '';
    const entries: TranscriptEntry[] = [];
    let defect = false;
    for (const line of lines) {
      if (!line.trim()) continue;
      const parsed = parseTranscriptLine(line);
      this.recent.push(parsed === null);
      if (this.recent.length > this.defectWindow) this.recent.shift();
      if (parsed === null) {
        defect = true;
        continue;
      }
      entries.push(...parsed);
    }
    this.stats.zeilen = this.recent.length;
    this.stats.defekt = this.recent.filter(Boolean).length;
    if (defect) this.emit('defekt', { ...this.stats });
    if (entries.length) this.emit('entries', entries);
  }
}
