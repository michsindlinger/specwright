/**
 * VorhabenReader — reads `intent/INT-JJJJ-NNN-…` folders and derives phase,
 * state, review document and next step from the documents' head fields
 * (spec §3.2 "Phasenregeln" and "Review-Punkte"). Pure where possible: the
 * parsers and derivations take strings/records; `scanCopies` takes an
 * injectable fs so the tests run on a temp dir.
 */

import * as fsDefault from 'fs';
import { join } from 'path';
import {
  VORHABEN_DOC_FILES,
  VORHABEN_DOC_ORDER,
  type VorhabenDocInfo,
  type VorhabenDocKey,
  type VorhabenNextStep,
  type VorhabenPhase,
  type VorhabenRow,
  type VorhabenSessionRef,
  type VorhabenStep,
  type VorhabenZustand,
} from '../../shared/types/vorhaben.protocol.js';

export const INTENT_ID_RE = /^INT-\d{4}-\d{3}$/;
const INTENT_DIR_RE = /^(INT-\d{4}-\d{3})(?:-[A-Za-z0-9._-]+)?$/;

export interface IntentHead {
  intent_id?: string;
  titel?: string;
  status?: string;
  version?: string;
  bypass: boolean;
  herkunft?: 'michael' | 'automatisch';
}

export interface StatusLine {
  status: string;
  note: string;
}

/**
 * Parses the YAML-ish frontmatter of intent.md (`key: "value"  ` lines between
 * the first two `---`). Nested keys (indented) are ignored. Returns null when
 * there is no frontmatter or no `status` — the caller shows "(Kopf nicht lesbar)".
 */
export function parseIntentHead(text: string): IntentHead | null {
  const lines = text.split(/\r?\n/);
  let start = -1;
  for (let i = 0; i < Math.min(lines.length, 5); i++) {
    if (lines[i].trim() === '---') {
      start = i;
      break;
    }
  }
  if (start < 0) return null;
  const fields: Record<string, string> = {};
  for (let i = start + 1; i < lines.length; i++) {
    const line = lines[i];
    if (line.trim() === '---') break;
    if (/^\s/.test(line)) continue; // nested (bezuege: …)
    const m = /^([A-Za-z_][A-Za-z0-9_]*):\s*(.*?)\s*$/.exec(line);
    if (!m) continue;
    let value = m[2];
    if (value.length >= 2 && ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'")))) {
      value = value.slice(1, -1);
    }
    fields[m[1]] = value;
  }
  if (!fields.status) return null;
  const herkunft = fields.herkunft === 'michael' || fields.herkunft === 'automatisch' ? fields.herkunft : undefined;
  return {
    intent_id: fields.intent_id || undefined,
    titel: fields.titel || undefined,
    status: fields.status.trim().toLowerCase(),
    version: fields.version || undefined,
    bypass: /^(ja|yes|true)$/i.test(fields.bypass ?? ''),
    ...(herkunft ? { herkunft } : {}),
  };
}

/**
 * Reads the `> **Status:** wort rest` line of spec.md / plan.md (FA-11). The
 * first word is the status, the rest (minus a leading separator) the note.
 */
export function parseStatusLine(text: string): StatusLine | null {
  const lines = text.split(/\r?\n/, 60);
  for (const line of lines) {
    const m = /^>\s*\*\*Status:\*\*\s*(\S+)\s*(.*)$/.exec(line);
    if (m) {
      const note = m[2].replace(/^[·—–\-:|\s]+/, '').trim();
      return { status: m[1].replace(/[.,;]+$/, '').toLowerCase(), note };
    }
  }
  return null;
}

export interface DocHeads {
  /** null = file exists but head unreadable; undefined = file missing. */
  intent?: IntentHead | null;
  spec?: StatusLine | null;
  plan?: StatusLine | null;
}

/** 'hidden' = abgeloest/verworfen (FA-01: not shown). */
export function derivePhase(heads: DocHeads): VorhabenPhase | 'hidden' {
  const intent = heads.intent;
  if (!intent) return 'unbekannt';
  const is = intent.status;
  if (is === 'abgeloest' || is === 'verworfen') return 'hidden';
  if (is === 'umgesetzt') return 'umgesetzt';
  const plan = heads.plan?.status;
  if (plan === 'umgesetzt') return 'pr';
  if (plan === 'freigegeben' || plan === 'in_umsetzung') return 'bau';
  const spec = heads.spec?.status;
  const planOpen = heads.plan === undefined || heads.plan === null || plan === 'entwurf';
  if ((spec === 'freigegeben' || (is === 'angenommen' && intent.bypass)) && planOpen) return 'plan';
  const specOpen = heads.spec === undefined || heads.spec === null || spec === 'entwurf' || spec === 'in_review';
  if (is === 'angenommen' && !intent.bypass && specOpen) return 'spec';
  if (is === 'entwurf' || is === 'in_klaerung') return 'absicht';
  return 'unbekannt';
}

/** Step of the phase (FA-15, table "Review-Punkte"). */
export function stepOfPhase(phase: VorhabenPhase): VorhabenStep | undefined {
  switch (phase) {
    case 'absicht':
      return 'intent';
    case 'spec':
      return 'spec';
    case 'plan':
      return 'plan';
    case 'bau':
    case 'pr':
      return 'build';
    default:
      return undefined;
  }
}

/** Next step per phase (FA-12); the caller hides it while a session works or waits. */
export function deriveNextStep(phase: VorhabenPhase, intentId: string, hasBuildStand: boolean): VorhabenNextStep | undefined {
  switch (phase) {
    case 'bau':
      return { step: 'build', command: `/build ${intentId}`, label: hasBuildStand ? 'Bau fortsetzen' : 'Bau starten' };
    case 'plan':
      return { step: 'plan', command: `/plan ${intentId}`, label: 'Plan erstellen' };
    case 'spec':
      return { step: 'spec', command: `/spec ${intentId}`, label: 'Spec schreiben' };
    default:
      return undefined;
  }
}

/** Review document per phase (FA-20) — meaningful only while the session waits. */
export function deriveReviewDoc(phase: VorhabenPhase, heads: DocHeads): VorhabenDocKey | undefined {
  switch (phase) {
    case 'absicht':
      return 'intent';
    case 'spec':
      return heads.spec !== undefined ? 'spec' : undefined;
    case 'plan':
      return heads.plan && heads.plan.status === 'entwurf' ? 'plan' : undefined;
    case 'pr':
      return 'plan';
    default:
      return undefined;
  }
}

export interface ZustandResult {
  zustand: VorhabenZustand;
  detail: string;
  /** Review doc, set only when the state is "wartet auf dich". */
  reviewDoc?: VorhabenDocKey;
}

/**
 * FA-13/FA-14: state from phase, build-stand presence and the assigned
 * session. `done`/`idle` both mean "waits" (decay does not change meaning);
 * `blocked` = dialog in the terminal; `error` counts as ended.
 */
export function deriveZustand(
  phase: VorhabenPhase,
  hasBuildStand: boolean,
  session: VorhabenSessionRef | undefined,
  reviewDoc: VorhabenDocKey | undefined
): ZustandResult {
  const interrupted = phase === 'bau' && hasBuildStand;
  if (!session) {
    return interrupted ? { zustand: 'bau_unterbrochen', detail: 'build-stand.md' } : { zustand: 'keine_sitzung', detail: '' };
  }
  if (session.ended) {
    return interrupted ? { zustand: 'bau_unterbrochen', detail: 'build-stand.md' } : { zustand: 'sitzung_beendet', detail: '' };
  }
  switch (session.agentStatus) {
    case 'working':
      return { zustand: 'arbeitet', detail: session.model };
    case 'blocked':
      return { zustand: 'wartet_im_terminal', detail: 'Dialog' };
    case 'error':
      return { zustand: 'sitzung_beendet', detail: 'Fehler' };
    case 'done':
    case 'idle':
    case 'unknown':
    default:
      if (reviewDoc) {
        return { zustand: 'wartet_auf_dich', detail: VORHABEN_DOC_FILES[reviewDoc], reviewDoc };
      }
      return interrupted
        ? { zustand: 'bau_unterbrochen', detail: 'build-stand.md' }
        : { zustand: 'wartet', detail: phase === 'bau' ? 'Rückfrage im Bau' : '' };
  }
}

// ---- Scan ----

export interface ReaderFs {
  readdir: (dir: string) => string[];
  stat: (p: string) => { mtimeMs: number; isDirectory(): boolean; isFile(): boolean } | null;
  readFile: (p: string) => string;
}

export const nodeReaderFs: ReaderFs = {
  readdir: (dir) => fsDefault.readdirSync(dir),
  stat: (p) => {
    try {
      return fsDefault.statSync(p);
    } catch {
      return null;
    }
  },
  readFile: (p) => fsDefault.readFileSync(p, 'utf-8'),
};

/** A copy of the project to scan: the registered path or one of its worktrees. */
export interface ScanCopy {
  cwd: string;
  arbeitskopie: string;
}

export interface ScanProject {
  id: string;
  path: string;
  name: string;
}

/** Everything read from one Vorhaben folder in one copy, before merge. */
export interface VorhabenCandidate {
  intentId: string;
  dirName: string;
  cwd: string;
  arbeitskopie: string;
  heads: DocHeads;
  docs: VorhabenDocInfo[];
  designFiles: string[];
  hasBuildStand: boolean;
  lastChangedMs: number;
}

interface CacheEntry {
  mtimeMs: number;
  parsed: IntentHead | StatusLine | null;
}

/** Parse cache keyed by absolute path; re-parses only when mtime changed (FA-07). */
export class VorhabenParseCache {
  private readonly entries = new Map<string, CacheEntry>();

  public get<T extends IntentHead | StatusLine>(path: string, mtimeMs: number, parse: () => T | null): T | null {
    const hit = this.entries.get(path);
    if (hit && hit.mtimeMs === mtimeMs) return hit.parsed as T | null;
    const parsed = parse();
    this.entries.set(path, { mtimeMs, parsed });
    return parsed;
  }

  public prune(livePaths: Set<string>): void {
    for (const key of this.entries.keys()) {
      if (!livePaths.has(key)) this.entries.delete(key);
    }
  }
}

/** Reads every Vorhaben folder of one copy. Missing intent/ → []. Throws on unreadable dir. */
export function scanCopy(copy: ScanCopy, fs: ReaderFs, cache: VorhabenParseCache): VorhabenCandidate[] {
  const dir = join(copy.cwd, 'intent');
  const dirStat = fs.stat(dir);
  if (!dirStat || !dirStat.isDirectory()) return [];
  const out: VorhabenCandidate[] = [];
  for (const name of fs.readdir(dir)) {
    const m = INTENT_DIR_RE.exec(name);
    if (!m) continue;
    const folder = join(dir, name);
    const st = fs.stat(folder);
    if (!st || !st.isDirectory()) continue;
    out.push(readCandidate(m[1], name, folder, copy, fs, cache, st.mtimeMs));
  }
  return out;
}

function readCandidate(
  intentId: string,
  dirName: string,
  folder: string,
  copy: ScanCopy,
  fs: ReaderFs,
  cache: VorhabenParseCache,
  folderMtime: number
): VorhabenCandidate {
  const heads: DocHeads = {};
  const docs: VorhabenDocInfo[] = [];
  let lastChangedMs = folderMtime;
  for (const key of VORHABEN_DOC_ORDER) {
    const file = VORHABEN_DOC_FILES[key];
    const p = join(folder, file);
    const st = fs.stat(p);
    if (!st || !st.isFile()) continue;
    lastChangedMs = Math.max(lastChangedMs, st.mtimeMs);
    const info: VorhabenDocInfo = { key, file, mtimeMs: st.mtimeMs };
    if (key === 'intent') {
      const head = cache.get<IntentHead>(p, st.mtimeMs, () => safeParse(() => parseIntentHead(fs.readFile(p))));
      heads.intent = head;
      if (head) {
        info.status = head.status;
        if (head.version) info.version = head.version;
      }
    } else if (key === 'spec' || key === 'plan') {
      const line = cache.get<StatusLine>(p, st.mtimeMs, () => safeParse(() => parseStatusLine(fs.readFile(p))));
      heads[key] = line;
      if (line) {
        info.status = line.status;
        if (line.note) info.note = line.note;
      }
    }
    docs.push(info);
  }
  let designFiles: string[] = [];
  const designDir = join(folder, 'design');
  const ds = fs.stat(designDir);
  if (ds?.isDirectory()) {
    try {
      designFiles = fs
        .readdir(designDir)
        .filter((f) => !f.startsWith('.') && fs.stat(join(designDir, f))?.isFile())
        .sort();
    } catch {
      designFiles = [];
    }
  }
  return {
    intentId,
    dirName,
    cwd: copy.cwd,
    arbeitskopie: copy.arbeitskopie,
    heads,
    docs,
    designFiles,
    hasBuildStand: docs.some((d) => d.key === 'build-stand'),
    lastChangedMs,
  };
}

function safeParse<T>(fn: () => T | null): T | null {
  try {
    return fn();
  } catch {
    return null;
  }
}

/**
 * FA-06: one row per intentId across copies — the copy of the assigned
 * session wins, otherwise the newest `lastChangedMs`.
 */
export function mergeCandidates(candidates: VorhabenCandidate[], preferredCwd: Map<string, string>): VorhabenCandidate[] {
  const byId = new Map<string, VorhabenCandidate>();
  for (const c of candidates) {
    const prev = byId.get(c.intentId);
    if (!prev) {
      byId.set(c.intentId, c);
      continue;
    }
    const wanted = preferredCwd.get(c.intentId);
    if (wanted) {
      if (c.cwd === wanted) byId.set(c.intentId, c);
      else if (prev.cwd === wanted) continue;
      else if (c.lastChangedMs > prev.lastChangedMs) byId.set(c.intentId, c);
      continue;
    }
    if (c.lastChangedMs > prev.lastChangedMs) byId.set(c.intentId, c);
  }
  return [...byId.values()];
}

/** Turns a merged candidate into the broadcast row; null when hidden (abgeloest/verworfen). */
export function toRow(project: ScanProject, c: VorhabenCandidate, session: VorhabenSessionRef | undefined): VorhabenRow | null {
  const phaseOrHidden = derivePhase(c.heads);
  if (phaseOrHidden === 'hidden') return null;
  const phase = phaseOrHidden;
  const intent = c.heads.intent;
  const reviewDocCandidate = deriveReviewDoc(phase, c.heads);
  const z = deriveZustand(phase, c.hasBuildStand, session, reviewDocCandidate);
  const sessionBusy = !!session && !session.ended && (z.zustand === 'arbeitet' || z.zustand === 'wartet' || z.zustand === 'wartet_auf_dich' || z.zustand === 'wartet_im_terminal');
  const nextStep = sessionBusy ? undefined : deriveNextStep(phase, c.intentId, c.hasBuildStand);
  const planNote = c.heads.plan?.note ?? '';
  const phaseNote = phase === 'pr' ? planNote : intent?.bypass ? 'Spec entfällt' : '';
  return {
    projectId: project.id,
    projectPath: project.path,
    projectName: project.name,
    intentId: c.intentId,
    dirName: c.dirName,
    cwd: c.cwd,
    arbeitskopie: c.arbeitskopie,
    titel: intent?.titel ?? '(Kopf nicht lesbar)',
    phase,
    phaseNote,
    bypass: intent?.bypass ?? false,
    zustand: z.zustand,
    zustandDetail: z.detail,
    ...(z.reviewDoc ? { reviewDoc: z.reviewDoc } : {}),
    ...(stepOfPhase(phase) ? { step: stepOfPhase(phase) } : {}),
    ...(nextStep ? { nextStep } : {}),
    docs: c.docs,
    designFiles: c.designFiles,
    hasBuildStand: c.hasBuildStand,
    ...(session ? { session } : {}),
    lastChangedAt: new Date(c.lastChangedMs).toISOString(),
    lastChangedMs: c.lastChangedMs,
    ...(intent?.herkunft ? { herkunft: intent.herkunft } : {}),
  };
}

/** Lookup of a document file within a row's folder (used by doc.read). */
export function docPathOf(row: Pick<VorhabenRow, 'cwd' | 'dirName'>, key: VorhabenDocKey): string {
  return join(row.cwd, 'intent', row.dirName, VORHABEN_DOC_FILES[key]);
}

export function designDirOf(row: Pick<VorhabenRow, 'cwd' | 'dirName'>): string {
  return join(row.cwd, 'intent', row.dirName, 'design');
}
