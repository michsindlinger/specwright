/**
 * Concurrency Protocol Types
 *
 * Defines the contract for global Claude concurrency state shared between
 * backend (ProjectConcurrencyGate) and frontend (header badge).
 */

export type GlobalGateState = {
  running: number;
  max: number;
  waiting: number;
};
