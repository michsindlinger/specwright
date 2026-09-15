/**
 * Vorhaben protocol (INT-2026-004).
 *
 * The UI shows the Vorhaben (intent/INT-JJJJ-NNN-…/) of every open project
 * instead of specs/stories. Truth lives in the documents' head fields; the
 * backend derives phase and state from them (spec §3.2) and broadcasts one
 * `vorhaben:state` snapshot to every client after each change — clients never
 * apply partial updates (same contract as workspace:state).
 */

import type { CloudTerminalAgentStatus } from './cloud-terminal.protocol.js';

// ---- Model ----

/** Phase after the "Phasenregeln" table (spec §3.2); `hidden` rows are filtered out before broadcast. */
export type VorhabenPhase = 'absicht' | 'spec' | 'plan' | 'bau' | 'pr' | 'umgesetzt' | 'unbekannt';

/** Seven values of FA-13. */
export type VorhabenZustand =
  | 'wartet_auf_dich'
  | 'wartet'
  | 'wartet_im_terminal'
  | 'arbeitet'
  | 'bau_unterbrochen'
  | 'keine_sitzung'
  | 'sitzung_beendet';

/** The four v4 steps; `build` is spelled like the command (`/build`). */
export type VorhabenStep = 'intent' | 'spec' | 'plan' | 'build';

/** Documents of a Vorhaben folder in fixed reader order (FA-17). */
export type VorhabenDocKey = 'intent' | 'spec' | 'plan' | 'build-stand';

export const VORHABEN_DOC_FILES: Record<VorhabenDocKey, string> = {
  intent: 'intent.md',
  spec: 'spec.md',
  plan: 'plan.md',
  'build-stand': 'build-stand.md',
};

export const VORHABEN_DOC_ORDER: readonly VorhabenDocKey[] = ['intent', 'spec', 'plan', 'build-stand'];

export interface VorhabenDocInfo {
  key: VorhabenDocKey;
  file: string;
  /** Last modification (ms since epoch) — the "Stand" shown to the user. */
  mtimeMs: number;
  /** First word of the status head field/line, when readable. */
  status?: string;
  /** Rest of the status line (spec/plan) — e.g. the PR reference. */
  note?: string;
  /** Intent only: `version` head field. */
  version?: string;
}

export interface VorhabenSessionRef {
  id: string;
  name: string;
  /** Model id as configured for the session (FA-42). */
  model: string;
  agentStatus: CloudTerminalAgentStatus;
  /** Set once the session ended while still assigned (FA-22). */
  ended?: boolean;
}

export interface VorhabenNextStep {
  step: VorhabenStep;
  /** Command as Michael types it, e.g. `/plan INT-2026-004`. */
  command: string;
  /** Button label, e.g. "Plan erstellen". */
  label: string;
}

export interface VorhabenRow {
  /** Workspace project id (server-side identity). */
  projectId: string;
  /** Registered project path. */
  projectPath: string;
  projectName: string;
  intentId: string;
  /** Folder name under intent/ (intentId plus short name). */
  dirName: string;
  /** Directory the row was read from: the project or one of its worktrees (FA-06). */
  cwd: string;
  /** Branch (or basename) of the copy the row was read from; '' when not a git repo. */
  arbeitskopie: string;
  titel: string;
  phase: VorhabenPhase;
  /** Text next to the phase: PR reference, "Spec entfällt". */
  phaseNote: string;
  bypass: boolean;
  zustand: VorhabenZustand;
  /** Free text next to the state (e.g. "Berechtigung", "build-stand.md"). */
  zustandDetail: string;
  /** Review document while the session waits (FA-20); undefined when none. */
  reviewDoc?: VorhabenDocKey;
  /** Step the row is in (FA-15). */
  step?: VorhabenStep;
  /** Offered only when no session works or waits (FA-12). */
  nextStep?: VorhabenNextStep;
  docs: VorhabenDocInfo[];
  /** File names under design/ (images are rendered on demand). */
  designFiles: string[];
  hasBuildStand: boolean;
  session?: VorhabenSessionRef;
  /** ISO timestamp of the newest document. */
  lastChangedAt: string;
  lastChangedMs: number;
  /** Reserved (FA-48): who created the Vorhaben; not shown yet. */
  herkunft?: 'michael' | 'automatisch';
}

export interface VorhabenProjectInfo {
  id: string;
  path: string;
  name: string;
  /** Branch of the registered copy, '' when not a git repo. */
  arbeitskopie: string;
  /** Other worktrees of the project (branch or basename). */
  worktrees: string[];
  hasIntentDir: boolean;
  /** Set when the project could not be scanned (cause for the error state). */
  error?: string;
}

/** One project-doc draft (FA-47), keyed `${projectId}::${docKey}` in the state. */
export interface ProjectDocDraft {
  text: string;
  /** mtime of the file when the editor was opened — conflict check base. */
  openedMtime: number;
  updatedAt: string;
}

export interface VorhabenState {
  rows: VorhabenRow[];
  projects: VorhabenProjectInfo[];
  docDrafts: Record<string, ProjectDocDraft>;
  /** True until the first full scan finished after boot. */
  loading: boolean;
  updatedAt: string;
}

// ---- Project docs (FA-43ff) ----

export type ProjectDocKey = 'product-brief' | 'architecture' | 'security' | 'design' | 'claude';

export const PROJECT_DOC_KEYS: readonly ProjectDocKey[] = ['product-brief', 'architecture', 'security', 'design', 'claude'];

export interface ProjectDocEntry {
  key: ProjectDocKey;
  label: string;
  relPath: string;
  exists: boolean;
  mtimeMs: number | null;
  /** true = uncommitted changes, false = clean, null = not a git repo. */
  dirty: boolean | null;
}

// ---- Client → Server ----

export interface VorhabenGetMessage {
  type: 'vorhaben:get';
}

export interface VorhabenDocReadMessage {
  type: 'vorhaben:doc.read';
  requestId?: string;
  projectId: string;
  intentId: string;
  doc: VorhabenDocKey;
}

export interface VorhabenDesignReadMessage {
  type: 'vorhaben:design.read';
  requestId?: string;
  projectId: string;
  intentId: string;
  file: string;
}

export interface ProjectDocsListMessage {
  type: 'project-docs:list';
  requestId?: string;
  projectId: string;
}

export interface ProjectDocsReadMessage {
  type: 'project-docs:read';
  requestId?: string;
  projectId: string;
  key: ProjectDocKey;
}

export interface ProjectDocsWriteMessage {
  type: 'project-docs:write';
  requestId?: string;
  projectId: string;
  key: ProjectDocKey;
  content: string;
  /** mtime the client last saw; mismatch → conflict unless `force`. */
  expectedMtime: number | null;
  force?: boolean;
}

export interface ProjectDocsDraftSetMessage {
  type: 'project-docs:draft.set';
  projectId: string;
  key: ProjectDocKey;
  text: string;
  openedMtime: number;
}

export interface ProjectDocsDraftClearMessage {
  type: 'project-docs:draft.clear';
  projectId: string;
  key: ProjectDocKey;
}

// ---- Server → Client ----

export interface VorhabenStateMessage {
  type: 'vorhaben:state';
  state: VorhabenState;
  timestamp: string;
}

export interface VorhabenDocMessage {
  type: 'vorhaben:doc';
  requestId?: string;
  projectId: string;
  intentId: string;
  doc: VorhabenDocKey;
  content: string;
  mtimeMs: number;
}

export interface VorhabenDesignMessage {
  type: 'vorhaben:design';
  requestId?: string;
  projectId: string;
  intentId: string;
  file: string;
  /** data: URL (image) — or null for non-image files. */
  dataUrl: string | null;
}

export interface ProjectDocsListResultMessage {
  type: 'project-docs:list-result';
  requestId?: string;
  projectId: string;
  docs: ProjectDocEntry[];
}

export interface ProjectDocsDocMessage {
  type: 'project-docs:doc';
  requestId?: string;
  projectId: string;
  key: ProjectDocKey;
  content: string;
  mtimeMs: number;
}

export interface ProjectDocsWrittenMessage {
  type: 'project-docs:written';
  requestId?: string;
  projectId: string;
  key: ProjectDocKey;
  mtimeMs: number;
  /** ISO timestamp of the write. */
  savedAt: string;
}

export interface ProjectDocsConflictMessage {
  type: 'project-docs:conflict';
  requestId?: string;
  projectId: string;
  key: ProjectDocKey;
  expectedMtime: number | null;
  currentMtime: number;
}

export type VorhabenErrorCode =
  | 'INVALID_MESSAGE'
  | 'UNKNOWN_PROJECT'
  | 'UNKNOWN_VORHABEN'
  | 'NOT_FOUND'
  | 'TOO_LARGE'
  | 'IO_ERROR';

export interface VorhabenErrorMessage {
  type: 'vorhaben:error';
  requestId?: string;
  code: VorhabenErrorCode;
  message: string;
  timestamp: string;
}

export const VORHABEN_MAX_DOC_BYTES = 1024 * 1024;
