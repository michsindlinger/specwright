/**
 * Auto-Mode protocol types shared between server and frontend.
 *
 * Snapshot is sent on `specs.kanban` (and backlog kanban) responses so the
 * frontend can hydrate the auto-mode toggle and slot list after navigation
 * or hard reload — without depending on push-events.
 */

export interface SlotSnapshot {
  id: string;
  title: string;
  /**
   * Cloud-Terminal session id of the running auto-mode slot. Set on `active`
   * slots so the frontend can subscribe to `cloud-terminal:data` per story.
   * Omitted on `queued` slots (no PTY started yet).
   */
  sessionId?: string;
}

export interface AutoModeSnapshot {
  enabled: boolean;
  activeSlots: SlotSnapshot[];
  queuedSlots: SlotSnapshot[];
}
