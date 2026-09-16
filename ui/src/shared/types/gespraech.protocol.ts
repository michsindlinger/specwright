/**
 * Gespräch protocol (INT-2026-007): the conversation of a claude-code cloud
 * session as the Vorhaben page shows it — contributions (Beiträge), dialog
 * cards and the subscribe/delta messages between backend and frontend.
 *
 * Sources (plan §3 „Zwei Quellen, klare Rollen"): real-time Beiträge come from
 * the Claude Code hooks the backend already receives; history, timestamps,
 * work blocks and structured results come from the transcript file Claude
 * Code writes per session. The snapshot on (re)subscribe is the truth, deltas
 * are best-effort upserts keyed by Beitrag id (H6).
 */

import type { ProtokollEintrag, SendeGrund } from './vorhaben.protocol.js';

// ---- Block kind (FA-09) ----

/**
 * Why a session is `blocked`, structured (FA-09). `unbekannt` = a blocking
 * notification without a known dialog (treated like a permission, FA-10).
 */
export type BlockKind = 'rueckfrage' | 'plan' | 'berechtigung' | 'unbekannt';

// ---- Dialogs (hooks + transcript) ----

export interface RueckfrageOption {
  label: string;
  description?: string;
}

export interface RueckfrageFrage {
  question: string;
  header?: string;
  multiSelect: boolean;
  options: RueckfrageOption[];
}

/** Dialog as reported by a hook (`PreToolUse` / `PermissionRequest`). */
export type HookDialog =
  | { kind: 'rueckfrage'; toolUseId?: string; questions: RueckfrageFrage[] }
  | { kind: 'plan'; toolUseId?: string; plan: string }
  | { kind: 'berechtigung'; toolUseId?: string; tool: string; detail?: string };

/** Dialog end as reported by `PostToolUse` (AskUserQuestion | ExitPlanMode). */
export interface HookDialogClosed {
  toolUseId?: string;
  tool: 'AskUserQuestion' | 'ExitPlanMode';
  /** AskUserQuestion: question → answer (as `tool_response.answers`). */
  answers?: Record<string, string>;
  /** ExitPlanMode: what the tool reported back, bounded. */
  planResult?: { accepted: boolean; text?: string };
}

/** Transcript path and Claude session id a hook payload carries (FA-01). */
export interface HookContext {
  transcriptPath?: string;
  claudeSessionId?: string;
  cwd?: string;
}

/** Full text of a turn as a hook carries it (Stop / UserPromptSubmit). */
export interface HookBeitrag {
  kind: 'claude' | 'nutzer';
  text: string;
}

// ---- Verlauf model ----

/** Where a user Beitrag came from (label only, never content — G8). */
export type BeitragQuelle = 'terminal' | 'ui' | 'leser' | 'gesprochen';

export type DialogZustand =
  | 'offen'
  | 'gesperrt'
  | 'wird_beantwortet'
  | 'gestoert'
  | 'beantwortet'
  | 'verfallen'
  | 'geschlossen';

export interface DialogErgebnis {
  /** `ui` = answered from the card, `terminal` = answered in the terminal, `unbekannt` = closed without a transcript record. */
  durch: 'ui' | 'terminal' | 'unbekannt';
  answers?: Record<string, string>;
  plan?: { entscheidung: 'angenommen' | 'aenderungen' | 'abgebrochen' | 'unbekannt'; text?: string };
}

export interface DialogKarte {
  /** `tool_use_id` (PreToolUse / transcript) or `seq:<n>` (permission without a tool call). */
  id: string;
  kind: BlockKind;
  zustand: DialogZustand;
  quelle: 'hook' | 'transkript';
  questions?: RueckfrageFrage[];
  plan?: string;
  tool?: string;
  detail?: string;
  ergebnis?: DialogErgebnis;
  /** Set when the driver failed mid-way: „im Terminal prüfen und abschließen". */
  hinweis?: string;
}

interface BeitragBase {
  /** transcript `uuid` when known, else `hook:<n>` / `dialog:<id>`. */
  id: string;
  /** ISO timestamp; missing while only the hook has reported it. */
  at?: string;
  /** Hook-only Beitrag still waiting for its transcript record („ergänzt sich"). */
  ergaenztSich?: boolean;
}

export type Beitrag =
  | (BeitragBase & { art: 'nutzer'; text: string; quelle: BeitragQuelle; status?: 'gesendet' | 'eingereiht' | 'nicht_bestaetigt' })
  | (BeitragBase & { art: 'claude'; text: string })
  | (BeitragBase & { art: 'arbeit'; werkzeuge: number; dauerMs?: number; laeuft: boolean })
  | (BeitragBase & { art: 'dialog'; dialog: DialogKarte });

export type VerlaufStatus = 'ok' | 'nur_echtzeit' | 'nicht_verfuegbar';

export interface VerlaufInfo {
  status: VerlaufStatus;
  /** Human-readable cause for `nur_echtzeit` / `nicht_verfuegbar`. */
  ursache?: string;
  /** ISO timestamp from which on the backend read along (history before it may be missing). */
  mitgelesenAb?: string;
  /** `version` field of the transcript's first record, when known. */
  transkriptVersion?: string;
}

export interface GespraechSnapshot {
  sessionId: string;
  sitzung: 'aktiv' | 'beendet';
  verlauf: VerlaufInfo;
  claudeSessionId?: string;
  beitraege: Beitrag[];
  /** id of the open dialog card, if any. */
  offenerDialog?: string;
  /** Currently queued UI inputs (max 3, H10). */
  eingereiht: number;
}

export interface GespraechDelta {
  upsert: Beitrag[];
  remove: string[];
  sitzung?: 'aktiv' | 'beendet';
  verlauf?: VerlaufInfo;
  offenerDialog?: string | null;
  eingereiht?: number;
}

// ---- Messages ----

export interface GespraechSubscribeMessage {
  type: 'gespraech:subscribe';
  sessionId: string;
}

export interface GespraechUnsubscribeMessage {
  type: 'gespraech:unsubscribe';
  sessionId: string;
}

export interface GespraechSendTextMessage {
  type: 'gespraech:send-text';
  requestId?: string;
  projectId: string;
  intentId: string;
  text: string;
}

/** Removes a queued (`eingereiht`) protocol entry — the queue inside Claude cannot be changed (E15). */
export interface GespraechDiscardMessage {
  type: 'gespraech:discard';
  requestId?: string;
  entryId: string;
}

export interface GespraechSnapshotMessage {
  type: 'gespraech:snapshot';
  sessionId: string;
  snapshot: GespraechSnapshot;
  timestamp: string;
}

export interface GespraechDeltaMessage {
  type: 'gespraech:delta';
  sessionId: string;
  delta: GespraechDelta;
  timestamp: string;
}

export interface GespraechSentMessage {
  type: 'gespraech:sent';
  requestId?: string;
  entry: ProtokollEintrag;
  status: 'gesendet' | 'eingereiht';
}

export type GespraechGrund = SendeGrund | 'rueckfrage_offen' | 'plan_offen' | 'berechtigung' | 'warteschlange_voll' | 'beschaeftigt' | 'dialog_offen' | 'kein_bildschirm' | 'text_leer';

export interface GespraechRejectedMessage {
  type: 'gespraech:rejected';
  requestId?: string;
  grund: GespraechGrund;
  message: string;
}

export interface GespraechErrorMessage {
  type: 'gespraech:error';
  requestId?: string;
  code: 'INVALID_MESSAGE' | 'UNKNOWN_SESSION' | 'UNKNOWN_PROJECT' | 'UNKNOWN_VORHABEN' | 'IO_ERROR';
  message: string;
  timestamp: string;
}

export const GESPRAECH_TEXT_MAX_CHARS = 8000;
export const GESPRAECH_QUEUE_MAX = 3;

export const GESPRAECH_GRUND_TEXT: Record<GespraechGrund, string> = {
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
