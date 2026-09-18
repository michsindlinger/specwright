/**
 * Vorhaben protocol (INT-2026-004).
 *
 * The UI shows the Vorhaben (intent/INT-JJJJ-NNN-…/) of every open project
 * instead of specs/stories. Truth lives in the documents' head fields; the
 * backend derives phase and state from them (spec §3.2) and broadcasts one
 * `vorhaben:state` snapshot to every client after each change — clients never
 * apply partial updates (same contract as workspace:state).
 */

import type { CloudTerminalAgentStatus, CloudTerminalSessionTarget } from './cloud-terminal.protocol.js';
import type { BlockKind } from './hook-events.protocol.js';

// ---- Model ----

/** Phase after the "Phasenregeln" table (spec §3.2); `hidden` rows are filtered out before broadcast. */
export type VorhabenPhase = 'absicht' | 'spec' | 'plan' | 'bau' | 'pr' | 'umgesetzt' | 'unbekannt';

/**
 * Values of FA-13 (INT-2026-004); INT-2026-007 (FA-09) splits „wartet im
 * Terminal" by the kind of dialog: Rückfrage, Plan-Entscheidung, Berechtigung
 * (an unknown dialog counts as Berechtigung, FA-10).
 */
export type VorhabenZustand =
  | 'wartet_auf_dich'
  | 'wartet'
  | 'wartet_rueckfrage'
  | 'wartet_plan'
  | 'wartet_berechtigung'
  | 'arbeitet'
  | 'bau_unterbrochen'
  | 'keine_sitzung'
  | 'sitzung_beendet';

/** The four v4 steps; `build` is spelled like the command (`/specwright:build`). */
export type VorhabenStep = 'intent' | 'spec' | 'plan' | 'build';

/**
 * Claude Code name of a step command. The commands live in `.claude/commands/specwright/`,
 * so the namespace is part of the name — `/intent` alone is not a command (INT-2026-005).
 * Shared by the backend (typed into the session) and the frontend (shown next to the button).
 */
export function stepCommand(step: VorhabenStep, intentId?: string): string {
  const name = `/specwright:${step}`;
  return step === 'intent' || !intentId ? name : `${name} ${intentId}`;
}

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
  /** Kind of the dialog while `blocked` (INT-2026-007, FA-09). */
  blockKind?: BlockKind;
  /** Set once the session ended while still assigned (FA-22). */
  ended?: boolean;
  /**
   * INT-2026-010 (AK-09/FA-22): a first input (text of „Neue Absicht" or a
   * Freigabe) is stored for this session and handed over at its first Stop.
   * Only the flag is broadcast, never the text.
   */
  firstInputPending?: boolean;
  /**
   * INT-2026-019 (OF-02): this session resumed a lost one — `von` is the lost
   * session's id, `stand` the last write to the resumed conversation (ISO).
   * The page shows „fortgesetzt nach Neustart · Stand HH:MM".
   */
  resumed?: { at: string; von: string; stand?: string };
  /**
   * INT-2026-018: step the assignment was made for (a pending `/intent`
   * session: `intent`). Absent (old client, fixture) counts as „same phase"
   * for `deriveNextStepSperre` — locked.
   */
  step?: VorhabenStep;
  /** INT-2026-018: provider of `model` (assignments before INT-2026-019 have none → `anthropic`). */
  provider?: string;
  /**
   * INT-2026-018 (AK-04/AK-05): where the session runs, as the picker names
   * it — `main` or `existing-worktree` (`safeKey` against the project path,
   * like `doResume`). Only on a live session.
   */
  target?: CloudTerminalSessionTarget;
}

/**
 * INT-2026-018 (AK-01–AK-03): why „Nächster Schritt" is locked; absent =
 * usable. `deriveNextStepSperre` checks in this order.
 */
export type VorhabenNextStepSperre = 'arbeitet' | 'dialog' | 'unbekannt' | 'erste_eingabe' | 'freigabe_offen' | 'gleiche_phase';

export const NEXT_STEP_SPERRE_TEXT: Record<VorhabenNextStepSperre, string> = {
  arbeitet: 'Sitzung arbeitet — erst danach kann der nächste Schritt starten',
  dialog: 'Sitzung zeigt einen Dialog — im Terminal antworten, dann kann der nächste Schritt starten',
  unbekannt: 'Zustand der Sitzung unbekannt — im Terminal nachsehen; sobald sie ruhig wartet, ist der Knopf frei',
  erste_eingabe: 'Sitzung startet — die erste Eingabe wird noch übergeben',
  freigabe_offen: 'ein Dokument wartet auf deine Freigabe — erst freigeben, dann kann der nächste Schritt starten',
  gleiche_phase: 'die Sitzung gehört schon zu diesem Schritt — im Terminal fortsetzen oder freigeben',
};

export interface VorhabenNextStep {
  step: VorhabenStep;
  /** Command as Michael types it, e.g. `/plan INT-2026-004`. */
  command: string;
  /** Button label, e.g. "Plan erstellen". */
  label: string;
  /** INT-2026-018: why the button is locked; absent = usable. `VorhabenRow.sessionBusy` is `!!sperre`. */
  sperre?: VorhabenNextStepSperre;
  /**
   * INT-2026-018 (AK-04, AK-05, AK-07): the live session the click continues
   * in when model and target match (`/clear`, then the command) — else a new
   * session starts and this one is closed. Absent: a new session starts and a
   * live one stays (none, or „Bau fortsetzen", NZ-04).
   */
  sitzung?: { id: string; name: string; model: ModelSelection; target: CloudTerminalSessionTarget };
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
  /** Text next to the phase: PR reference, "Spec entfällt". Plain text, at most 80 characters (reader `boundNote`, INT-2026-013). */
  phaseNote: string;
  bypass: boolean;
  zustand: VorhabenZustand;
  /** Free text next to the state (e.g. "Berechtigung", "build-stand.md"). */
  zustandDetail: string;
  /** Review document while the session waits (FA-20); undefined when none. */
  reviewDoc?: VorhabenDocKey;
  /**
   * INT-2026-010 (FA-22): the document whose head status awaits approval
   * (intent entwurf/in_klaerung, spec or plan entwurf) — independent of a
   * session, so „Freigeben" is offered even when no session waits (AN-S06).
   * Undefined in phase `pr`, `bau`, `umgesetzt`.
   */
  freigabeDoc?: VorhabenDocKey;
  /** Step the row is in (FA-15). */
  step?: VorhabenStep;
  /**
   * Next step of the phase (FA-12). INT-2026-010 (FA-21): always present when
   * the phase has one — the page greys the button out while `sessionBusy`.
   */
  nextStep?: VorhabenNextStep;
  /**
   * INT-2026-010 (FA-21): the next step must not start now. INT-2026-018:
   * `= !!nextStep?.sperre` — the reason travels in `nextStep.sperre`; a live
   * session that finished an earlier phase and waits quietly is not busy.
   */
  sessionBusy: boolean;
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

// ---- Review channel (stage 2: FA-21ff) ----

/** Model selection as the settings know it. */
export interface ModelSelection {
  providerId: string;
  modelId: string;
}

/**
 * One review draft (FA-23–FA-26). The reference is derived from the block the
 * user picked (FA-24) and cannot be edited; `ordinal` keeps document order,
 * `snippet` relocates the mark after the document changed.
 */
export interface Anmerkung {
  id: string;
  /** Block index in the rendered document; -1 = "Dokument gesamt". */
  ordinal: number;
  /** 'AK-03' · '§6' · heading text · first words · 'Dokument gesamt'. */
  ref: string;
  /** Normalized text of the block (≤ 200 chars) for relocation. */
  snippet: string;
  text: string;
  updatedAt: string;
}

/**
 * `aenderungen` / `freigabe` come from the reader (INT-2026-004); `freitext` is
 * a message typed into the Gespräch (INT-2026-007, FA-06). Stage 2 adds
 * `rueckfrage` and `plan` (card answers).
 */
export type ProtokollArt = 'aenderungen' | 'freigabe' | 'freitext' | 'rueckfrage' | 'plan';
/** `eingereiht` = handed to a working session, confirmed when Claude picks it up (AN-S09). */
export type ProtokollStatus = 'gesendet' | 'eingereiht' | 'angenommen' | 'nicht_bestaetigt';

/** One sent answer (FA-31/FA-32). */
export interface ProtokollEintrag {
  id: string;
  projectId: string;
  /**
   * Absent while the entry belongs to a pending `/intent` session that has
   * no folder yet (INT-2026-008); set by the claim of the first new folder.
   */
  intentId?: string;
  /** Review document — absent for `freitext` / card answers. */
  doc?: VorhabenDocKey;
  art: ProtokollArt;
  /** Number of Anmerkungen (aenderungen) — 0 for freigabe. */
  anzahl: number;
  /** "Stand" as shown in the sent text: `1.2.0` (intent) or `2026-09-15 16:42`. */
  stand: string;
  sessionId: string;
  sessionName: string;
  /** The exact text handed to the session. */
  text: string;
  /** Sent Anmerkungen (moved out of the drafts, AN-S13). */
  anmerkungen: Anmerkung[];
  status: ProtokollStatus;
  sentAt: string;
  acceptedAt?: string;
}

/** Why a send was refused (FA-30 plus the two stand checks). */
export type SendeGrund =
  | 'keine_sitzung'
  | 'arbeitet'
  | 'dialog'
  | 'beendet'
  | 'stand_veraltet'
  | 'kein_review_dokument'
  | 'keine_anmerkungen'
  | 'senden_fehlgeschlagen';

// ---- Free text into a session (INT-2026-007, kept after INT-2026-011) ----

/**
 * Why a free text (Freigabe, Anmerkungen, first input) was not handed to the
 * session: the send reasons plus what the screen check and the queue report
 * (`vorhaben-service.ts` `sendToSession`). Values unchanged since INT-2026-007.
 */
export type FreitextGrund = SendeGrund | 'rueckfrage_offen' | 'plan_offen' | 'berechtigung' | 'warteschlange_voll' | 'beschaeftigt' | 'dialog_offen' | 'kein_bildschirm' | 'text_leer';

/** Upper bound of one free text handed to a session (`firstInput`, pasted text). */
export const FREITEXT_MAX_CHARS = 8000;
/** How many free texts may wait as `eingereiht` while the session works (H10). */
export const FREITEXT_QUEUE_MAX = 3;

export const FREITEXT_GRUND_TEXT: Record<FreitextGrund, string> = {
  keine_sitzung: 'keine Sitzung zu diesem Vorhaben — nächsten Schritt starten',
  arbeitet: 'Sitzung arbeitet — warten',
  dialog: 'Sitzung wartet im Terminal (Dialog) — im Terminal antworten',
  beendet: 'Sitzung beendet — nächsten Schritt starten',
  stand_veraltet: 'Dokument geändert — neu laden',
  kein_review_dokument: 'kein Review-Dokument — Freigabe nicht möglich',
  keine_anmerkungen: 'keine Anmerkungen zu diesem Dokument',
  senden_fehlgeschlagen: 'Eingabe konnte nicht in die Sitzung geschrieben werden',
  rueckfrage_offen: 'Sitzung wartet auf eine Antwort — die Rückfrage beantworten',
  plan_offen: 'Sitzung wartet auf die Plan-Entscheidung',
  berechtigung: 'Sitzung wartet auf eine Berechtigung — im Terminal antworten',
  warteschlange_voll: 'schon drei Eingaben eingereiht — warten, bis die Sitzung sie abgearbeitet hat',
  beschaeftigt: 'die UI schreibt gerade in die Sitzung — gleich noch einmal',
  dialog_offen: 'die Sitzung zeigt einen Dialog — im Terminal antworten',
  kein_bildschirm: 'Bildschirm der Sitzung nicht lesbar — nur bei wartender Sitzung senden',
  text_leer: 'kein Text',
};

export const draftKey = (projectId: string, intentId: string, doc: VorhabenDocKey): string => `${projectId}::${intentId}::${doc}`;
export const lastModelKey = (projectId: string, intentId: string, step: VorhabenStep): string => `${projectId}::${intentId}::${step}`;
export const assignmentKey = (projectId: string, intentId: string): string => `${projectId}::${intentId}`;

/**
 * A `/intent` session whose Vorhaben folder does not exist yet (INT-2026-008,
 * AK-01/AK-05): the project page shows its Gespräch until the first new
 * `intent/INT-…/` folder claims the session and a row carries it.
 */
export interface VorhabenPendingIntent {
  sessionId: string;
  projectId: string;
  /** Directory the session runs in (project or worktree). */
  cwd: string;
  /** Branch/label of that copy; '' when unknown or not a git repo. */
  arbeitskopie: string;
  /** ISO timestamp of the start; the oldest pending session claims the next folder. */
  since: string;
  session: VorhabenSessionRef;
}

/** Document (or the design folder) a Phasen-Chip of the Vorhaben page shows (INT-2026-010, FA-12). */
export type VorhabenPhaseDoc = VorhabenDocKey | 'design';

export const VORHABEN_PHASE_DOCS: readonly VorhabenPhaseDoc[] = [...VORHABEN_DOC_ORDER, 'design'];

/**
 * INT-2026-010 (FA-03, FA-12; AR-05, spec §7): the view state every device
 * shares — the project chip of the overview and the chosen phase document per
 * Vorhaben. Lives in the backend's user-state file, set via
 * `vorhaben:ansicht.set`, broadcast in `vorhaben:state`.
 */
export interface VorhabenAnsicht {
  /** Project chip of the overview; null = „Alle". */
  filterProjectId: string | null;
  /** `assignmentKey(projectId, intentId)` → chosen document. Absent = default of the row. */
  phase: Record<string, VorhabenPhaseDoc>;
}

export interface VorhabenState {
  rows: VorhabenRow[];
  projects: VorhabenProjectInfo[];
  /** Pending `/intent` sessions without a folder (INT-2026-008), oldest first. */
  pendingIntents: VorhabenPendingIntent[];
  /** Shared view state (INT-2026-010). */
  ansicht: VorhabenAnsicht;
  docDrafts: Record<string, ProjectDocDraft>;
  /** `draftKey(...)` → Anmerkungen in document order (FA-26). */
  drafts: Record<string, Anmerkung[]>;
  /** Newest first. */
  protocol: ProtokollEintrag[];
  /** `lastModelKey(...)` → last model chosen for that step (FA-40). */
  lastModel: Record<string, ModelSelection>;
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

export interface VorhabenDraftSetMessage {
  type: 'vorhaben:draft.set';
  projectId: string;
  intentId: string;
  doc: VorhabenDocKey;
  anmerkung: Anmerkung;
}

export interface VorhabenDraftDeleteMessage {
  type: 'vorhaben:draft.delete';
  projectId: string;
  intentId: string;
  doc: VorhabenDocKey;
  id: string;
}

export interface VorhabenSendMessage {
  type: 'vorhaben:send';
  requestId?: string;
  projectId: string;
  intentId: string;
  doc: VorhabenDocKey;
  art: ProtokollArt;
  /** mtimeMs of the document as the client read it (FA-27/FA-28 "Stand"). */
  stand: number;
}

export interface VorhabenStartStepMessage {
  type: 'vorhaben:start-step';
  requestId?: string;
  projectId: string;
  /** Absent for `intent` (new Vorhaben). */
  intentId?: string;
  step: VorhabenStep;
  /**
   * INT-2026-010 (FA-22): optional — without it the backend resolves the last
   * model of (Vorhaben, step), then the step default of the settings.
   */
  model?: ModelSelection;
  /** Where the session runs; absent = main project. */
  sessionTarget?: CloudTerminalSessionTarget;
  /**
   * INT-2026-010 (AK-09, FA-11, FA-22): text handed to the session as its
   * first input at the first Stop (trimmed, 1…FREITEXT_MAX_CHARS).
   */
  firstInput?: string;
}

/**
 * INT-2026-020 (AK-01): an image pasted into the „Neue Absicht" text field
 * before any session exists. The backend validates it with the Cloud
 * Terminal's allowlist and size limit (`CLOUD_TERMINAL_CONFIG`, RB-04),
 * writes it under `<runtime>/intent-paste/` and answers with the absolute
 * path, which the browser inserts into the text (` <path> `) — the path then
 * travels with `firstInput` into the session (AK-05). Request/reply via
 * `requestId`; errors arrive as `vorhaben:error`.
 */
export interface VorhabenAbsichtBildMessage {
  type: 'vorhaben:absicht-bild';
  requestId?: string;
  /** Must be an open project (RB-01). */
  projectId: string;
  /** Raw image bytes, base64 (no data-URL prefix). */
  base64: string;
  /** One of `CLOUD_TERMINAL_CONFIG.ALLOWED_PASTE_IMAGE_MIME`. */
  mimeType: string;
}

/** Reply to `vorhaben:absicht-bild` (INT-2026-020). */
export interface VorhabenAbsichtBildSavedMessage {
  type: 'vorhaben:absicht-bild-saved';
  requestId?: string;
  /** Absolute host path of the stored image (`<runtime>/intent-paste/img-<uuid>.<ext>`). */
  absolutePath: string;
}

/**
 * INT-2026-010 (FA-03, FA-12): sets the shared view state. `filterProjectId`
 * must be an open project or null; `phase.doc` one of VORHABEN_PHASE_DOCS.
 * Answer is the next `vorhaben:state` broadcast.
 */
export interface VorhabenAnsichtSetMessage {
  type: 'vorhaben:ansicht.set';
  filterProjectId?: string | null;
  phase?: { projectId: string; intentId: string; doc: VorhabenPhaseDoc };
}

/**
 * INT-2026-016 (AK-06, AK-07): bind a live claude-code session of the
 * project to a row that has no live session — „Neue Session" on a docked
 * Vorhaben page or a user click on a tab there. Answer is
 * `vorhaben:session-assigned` or `vorhaben:error` with the same `requestId`;
 * the row follows in the next `vorhaben:state` broadcast. Never moves a
 * session that belongs to another row (typed commands do that, AK-08).
 */
export interface VorhabenSessionAssignMessage {
  type: 'vorhaben:session.assign';
  requestId?: string;
  projectId: string;
  intentId: string;
  sessionId: string;
}

/**
 * INT-2026-019 (AK-01): „Vorhaben-Seite geöffnet" — sent when the page of a
 * Vorhaben is entered and after a reconnect (once the state has loaded). The
 * backend alone decides whether the row's session is lost (assignment not
 * ended, session unknown to the manager) and resumes it with
 * `claude --resume` in the old worktree; the client computes nothing (RB-01).
 * Answer: `vorhaben:session-resumed` or `vorhaben:error` (RESUME_FAILED,
 * WORKTREE_MISSING, RESUME_RUNNING, …) with the same `requestId`.
 */
export interface VorhabenSessionResumeMessage {
  type: 'vorhaben:session.resume';
  requestId?: string;
  projectId: string;
  intentId: string;
}

// ---- Server → Client ----

export interface VorhabenSessionAssignedMessage {
  type: 'vorhaben:session-assigned';
  requestId?: string;
  projectId: string;
  intentId: string;
  sessionId: string;
}

/** Why no session was started although the page was opened (INT-2026-019, AK-05/AK-06). */
export type VorhabenResumeGrund = 'lebt' | 'beendet' | 'keine_zuordnung' | 'fremde_cli' | 'umgesetzt';

export interface VorhabenSessionResumedMessage {
  type: 'vorhaben:session-resumed';
  requestId?: string;
  projectId: string;
  intentId: string;
  ergebnis: 'gestartet' | 'nicht_noetig';
  /** Set for `gestartet`: the new session; the row follows in the next `vorhaben:state`. */
  sessionId?: string;
  /** Set for `nicht_noetig`. */
  grund?: VorhabenResumeGrund;
}

export interface VorhabenSentMessage {
  type: 'vorhaben:sent';
  requestId?: string;
  entry: ProtokollEintrag;
}

export interface VorhabenSendRejectedMessage {
  type: 'vorhaben:send-rejected';
  requestId?: string;
  grund: SendeGrund;
  message: string;
  /** For `stand_veraltet`: the current mtimeMs on disk. */
  currentStand?: number;
}

export interface VorhabenStepStartedMessage {
  type: 'vorhaben:step-started';
  requestId?: string;
  sessionId: string;
  projectId: string;
  intentId?: string;
  step: VorhabenStep;
  /** INT-2026-018: `in_sitzung` = `/clear` + command in the row's live session (AK-04); `neu` = a new session started. */
  modus: 'neu' | 'in_sitzung';
  /** INT-2026-018 (AK-05): id of the live session that was closed for the new one. */
  geschlossen?: string;
}

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
  /** INT-2026-008: session id is neither assigned nor a pending `/intent` of this project. */
  | 'UNKNOWN_SESSION'
  | 'NOT_FOUND'
  | 'TOO_LARGE'
  | 'IO_ERROR'
  | 'START_FAILED'
  // INT-2026-016 (AK-06/AK-07): refusals of `vorhaben:session.assign`, in the order the service checks.
  /** The session is unknown to the terminal manager or closed. */
  | 'SESSION_NOT_ACTIVE'
  /** A shell tab (no hooks, no status) cannot be the session of a Vorhaben. */
  | 'SESSION_NOT_CLAUDE'
  /** The session runs in another project than the row. */
  | 'SESSION_NOT_IN_PROJECT'
  /** The row already has a live session. */
  | 'ROW_HAS_SESSION'
  /** The session is the live session of another row (`message` names it) — a click never moves. */
  | 'SESSION_ASSIGNED_ELSEWHERE'
  // INT-2026-019: refusals of `vorhaben:session.resume` (the page shows `message`, AK-08/AK-09).
  /** The lost session's worktree is gone — `message` names the path; „Nächster Schritt" stays usable. */
  | 'WORKTREE_MISSING'
  /** Resume did not start (`message` = reason: cap reached, transcript not found, spawn failed, backend still booting). */
  | 'RESUME_FAILED'
  /** A resume for this row is in flight — `start-step`/`session.assign` refused for the moment (AK-04). */
  | 'RESUME_RUNNING'
  // INT-2026-020 (AK-04): refusals of `vorhaben:absicht-bild` — same strings as
  // CLOUD_TERMINAL_ERROR_CODES so the browser shows the Terminal's messages.
  /** Decoded image is empty, or the write failed. */
  | 'PASTE_IMAGE_FAILED'
  /** Larger than `CLOUD_TERMINAL_CONFIG.MAX_PASTE_IMAGE_BYTES`. */
  | 'PASTE_IMAGE_TOO_LARGE'
  /** MIME type not in `CLOUD_TERMINAL_CONFIG.ALLOWED_PASTE_IMAGE_MIME`. */
  | 'PASTE_IMAGE_UNSUPPORTED_TYPE'
  // INT-2026-018: refusals of `vorhaben:start-step` with a live session of the row.
  /** The rule refused (`message` = `NEXT_STEP_SPERRE_TEXT[sperre]`) — the page was stale or a second device was faster. */
  | 'SESSION_BUSY'
  /** AK-08: `/clear` or the command was not written into the session (`message` = reason); nothing else happened. */
  | 'SESSION_WRITE_FAILED';

export const ANMERKUNG_MAX_CHARS = 4000;

export interface VorhabenErrorMessage {
  type: 'vorhaben:error';
  requestId?: string;
  code: VorhabenErrorCode;
  message: string;
  timestamp: string;
}

export const VORHABEN_MAX_DOC_BYTES = 1024 * 1024;
