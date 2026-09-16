/**
 * INT-2026-010 (FA-06): where a tap on a bell entry goes — the session's
 * Vorhaben, the „Neue Absicht" page of a pending `/intent` session, or the
 * terminal for a session without a Vorhaben (plan §3 „Zuordnungsregel").
 */
import { describe, it, expect } from 'vitest';
import { glockeZiel } from '../../frontend/src/components/rahmen/glocke-ziel.js';
import type { VorhabenRow, VorhabenSessionRef, VorhabenState } from '../../src/shared/types/vorhaben.protocol.js';

const session = (id: string, ended?: boolean): VorhabenSessionRef => ({ id, name: 'x', model: 'opus', agentStatus: 'done', ...(ended ? { ended } : {}) });

const row = (o: Partial<VorhabenRow> & { intentId: string }): VorhabenRow => ({
  projectId: 'p', projectPath: '/p', projectName: 'P', dirName: o.intentId, cwd: '/p', arbeitskopie: 'main', titel: o.intentId,
  phase: 'spec', phaseNote: '', bypass: false, zustand: 'keine_sitzung', zustandDetail: '', docs: [], designFiles: [], hasBuildStand: false,
  lastChangedAt: '', lastChangedMs: 0, ...o,
});

const state = (rows: VorhabenRow[], pendingIntents: VorhabenState['pendingIntents'] = []): VorhabenState => ({
  rows, projects: [], pendingIntents, docDrafts: {}, drafts: {}, protocol: [], lastModel: {}, loading: false, updatedAt: '',
});

describe('glockeZiel()', () => {
  it('one assignment → that Vorhaben', () => {
    expect(glockeZiel('cloud-1', state([row({ intentId: 'INT-2026-001', session: session('cloud-1') })]))).toEqual({ route: 'vorhaben', segments: ['p', 'INT-2026-001'] });
  });

  it('two rows of the same session, the older one ended → the younger (live) one wins', () => {
    const s = state([
      row({ intentId: 'INT-2026-001', session: session('cloud-1', true), lastChangedMs: 900 }),
      row({ intentId: 'INT-2026-002', session: session('cloud-1'), lastChangedMs: 100 }),
    ]);
    expect(glockeZiel('cloud-1', s)).toEqual({ route: 'vorhaben', segments: ['p', 'INT-2026-002'] });
  });

  it('two live rows → the one changed last', () => {
    const s = state([
      row({ intentId: 'INT-2026-001', session: session('cloud-1'), lastChangedMs: 100 }),
      row({ intentId: 'INT-2026-002', session: session('cloud-1'), lastChangedMs: 500, projectId: 'q' }),
    ]);
    expect(glockeZiel('cloud-1', s)).toEqual({ route: 'vorhaben', segments: ['q', 'INT-2026-002'] });
  });

  it('only ended rows → still the Vorhaben (newest), never the terminal', () => {
    const s = state([row({ intentId: 'INT-2026-001', session: session('cloud-1', true), lastChangedMs: 5 })]);
    expect(glockeZiel('cloud-1', s)).toEqual({ route: 'vorhaben', segments: ['p', 'INT-2026-001'] });
  });

  it('pending `/intent` session without a folder → „Neue Absicht" of its project', () => {
    const s = state([], [{ sessionId: 'cloud-7', projectId: 'q', cwd: '/q', arbeitskopie: 'main', since: '', session: session('cloud-7') }]);
    expect(glockeZiel('cloud-7', s)).toEqual({ route: 'neu', segments: ['q'] });
  });

  it('unknown session, empty id or no state → terminal', () => {
    expect(glockeZiel('cloud-9', state([row({ intentId: 'INT-2026-001', session: session('cloud-1') })]))).toEqual({ route: 'terminal' });
    expect(glockeZiel('', state([]))).toEqual({ route: 'terminal' });
    expect(glockeZiel('cloud-1', null)).toEqual({ route: 'terminal' });
  });
});
