/**
 * Hook-event types shared by backend and frontend (INT-2026-011, split out of
 * the former `gespraech.protocol.ts`): what a Claude Code hook payload
 * contributes to a session beyond its agent status — the kind of dialog that
 * blocks it (FA-09, INT-2026-007) and the context every payload carries.
 *
 * The full dialog contents and turn texts are no longer extracted: the UI
 * shows the session itself (ADR-0004) instead of rebuilding its Gespräch.
 */

/**
 * Why a session is `blocked`, structured (FA-09). `unbekannt` = a blocking
 * notification without a known dialog (treated like a permission, FA-10).
 */
export type BlockKind = 'rueckfrage' | 'plan' | 'berechtigung' | 'unbekannt';

/**
 * Transcript path and Claude session id a hook payload carries (FA-01).
 * Stored with the session (registry, `toPersistedEntry`); currently without a
 * reader (ADR-0004).
 */
export interface HookContext {
  transcriptPath?: string;
  claudeSessionId?: string;
  cwd?: string;
}
