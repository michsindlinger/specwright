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
}

export interface AutoModeSnapshot {
  enabled: boolean;
  activeSlots: SlotSnapshot[];
  queuedSlots: SlotSnapshot[];
}
