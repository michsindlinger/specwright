/**
 * INT-2026-024 (FA-10, FA-11, FA-12, FA-15, FA-19, AN-S16): service + handler +
 * store with a fake runner — the mark lifts the row to `umgesetzt` with the note
 * within one scan, decays once the main checkout reads `umgesetzt`, „zurücknehmen",
 * single flight (second start and zurücknehmen while running → ABSCHLUSS_RUNNING),
 * the failure survives a store reload, a deleted folder takes the mark with the
 * next scan (prune), and the three WebSocket messages with their validation.
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';

import { VorhabenError, VorhabenService } from '../../src/server/services/vorhaben-service.js';
import { VorhabenStateStore } from '../../src/server/services/vorhaben-state.js';
import { VorhabenWatcher } from '../../src/server/services/vorhaben-watcher.js';
import { VorhabenHandler, type OutboundMessage } from '../../src/server/services/vorhaben-handler.js';
import { ProjectDocsService } from '../../src/server/services/project-docs.service.js';
import { AbschlussError, type AbschliessenInput, type AbschlussErgebnis, type AbschlussInput } from '../../src/server/services/vorhaben-abschluss.js';
import type { VorhabenAbschlussVorschau, VorhabenStateMessage } from '../../src/shared/types/vorhaben.protocol.js';

const intentText = (id: string, status: string, version = '1.0.0'): string =>
  `---\nintent_id: "${id}"  \ntitel: "Titel ${id}"  \nstatus: "${status}"  \nversion: "${version}"  \ngeaendert: "2026-09-01"  \nbypass: "ja"  \n---\n\n## Änderungsprotokoll\n\n| Version | Datum | Änderung | IDs | Freigabe |\n|---|---|---|---|---|\n| 1.0.0 | 2026-09-01 | x | — | — |\n`;
const BASE_SHA = 'a'.repeat(40);

class FakeRunner {
  public vorschauCalls: AbschlussInput[] = [];
  public abschlussCalls: AbschliessenInput[] = [];
  public vorschauError: AbschlussError | null = null;
  public abschlussError: Error | null = null;
  public gate: Promise<void> | null = null;
  public lockSeen = 0;
  public prNumber = 42;
  async vorschau(input: AbschlussInput): Promise<VorhabenAbschlussVorschau> {
    this.vorschauCalls.push(input);
    if (this.vorschauError) throw this.vorschauError;
    return {
      intentId: input.intentId,
      titel: `Titel ${input.intentId}`,
      datei: 'intent.md',
      base: 'main',
      baseSha: BASE_SHA,
      zweig: `chore/${input.intentId}-abschluss`,
      statusAlt: 'angenommen',
      versionAlt: '1.0.0',
      versionNeu: '1.0.1',
      datum: '2026-09-22',
      zeile: ['1.0.1', '2026-09-22', 'Umgesetzt: …', '—', 'Product Owner (Klick in der UI)'],
      spalten: ['Version', 'Datum', 'Änderung', 'IDs', 'Freigabe'],
      bauPrs: [7],
      commitTitel: `chore(${input.intentId}): intent.md auf umgesetzt nach Merge von PR #7`,
    };
  }
  async abschliessen(input: AbschliessenInput): Promise<AbschlussErgebnis> {
    this.abschlussCalls.push(input);
    if (this.gate) await this.gate;
    await input.lock(async () => {
      this.lockSeen++;
    });
    if (this.abschlussError) throw this.abschlussError;
    return { prNumber: this.prNumber, prUrl: `https://github.com/o/r/pull/${this.prNumber}`, zweig: input.baseSha === BASE_SHA ? `chore/${input.intentId}-abschluss` : 'x', at: '2026-09-22T10:00:00.000Z' };
  }
}

describe('VorhabenService Abschluss (INT-2026-024)', () => {
  let root: string;
  let projA: string;
  let store: VorhabenStateStore;
  let broadcast: ReturnType<typeof vi.fn<(m: OutboundMessage) => void>>;
  let service: VorhabenService;
  let watcher: VorhabenWatcher;
  let runner: FakeRunner;
  const openProjects: Array<{ id: string; path: string; name: string }> = [];

  const lastState = (): VorhabenStateMessage['state'] => {
    const states = broadcast.mock.calls.map((c) => c[0]).filter((m) => m.type === 'vorhaben:state') as VorhabenStateMessage[];
    return states[states.length - 1].state;
  };
  const row = (id = 'INT-2026-024') => lastState().rows.find((r) => r.intentId === id)!;
  const intentFile = (dir: string): string => join(projA, 'intent', dir, 'intent.md');

  function makeService(): VorhabenService {
    return new VorhabenService({
      workspace: { getState: () => ({ openProjects, sessionNames: {} }) },
      store,
      broadcast,
      watcher,
      abschluss: runner,
      resolveMainPath: (p) => p,
      timeZone: 'UTC',
      now: () => new Date('2026-09-22T10:00:00Z'),
      listWorktrees: async () => ({ isGitRepo: true, mainWorktreePath: projA, entries: [{ path: projA, branch: 'main', bare: false, prunable: false, head: 'x' }] as never }),
    });
  }

  beforeEach(async () => {
    root = mkdtempSync(join(tmpdir(), 'vorhaben-abschluss-'));
    projA = join(root, 'a');
    const dir = join(projA, 'intent', 'INT-2026-024-abschluss');
    mkdirSync(dir, { recursive: true });
    writeFileSync(join(dir, 'intent.md'), intentText('INT-2026-024', 'angenommen'));
    writeFileSync(join(dir, 'plan.md'), '# Plan\n\n> **Status:** umgesetzt — PR #7 offen\n');
    const other = join(projA, 'intent', 'INT-2026-025-anderes');
    mkdirSync(other, { recursive: true });
    writeFileSync(join(other, 'intent.md'), intentText('INT-2026-025', 'angenommen'));
    openProjects.splice(0, openProjects.length, { id: 'pa', path: projA, name: 'A' });
    store = new VorhabenStateStore(join(root, 'state.json'), { port: 3111 });
    await store.load();
    broadcast = vi.fn();
    watcher = new VorhabenWatcher({ debounceMs: 30 });
    runner = new FakeRunner();
    service = makeService();
    await service.start();
  });

  afterEach(async () => {
    service.stop();
    await store.flush();
    rmSync(root, { recursive: true, force: true });
  });

  it('vorschau: runner called with the row\'s folder; nothing stored; runner error → ABSCHLUSS_PRECHECK with its message', async () => {
    const v = await service.abschlussVorschau('pa', 'INT-2026-024');
    expect(v.baseSha).toBe(BASE_SHA);
    expect(runner.vorschauCalls).toEqual([{ projectPath: projA, dirName: 'INT-2026-024-abschluss', intentId: 'INT-2026-024' }]);
    expect(store.getAbschluss('pa', 'INT-2026-024')).toBeUndefined();
    runner.vorschauError = new AbschlussError('vorpruefung', 'nicht_auf_hauptzweig', 'das Vorhaben liegt noch nicht auf dem Hauptzweig — erst den Bau-PR mergen');
    await expect(service.abschlussVorschau('pa', 'INT-2026-024')).rejects.toMatchObject({ code: 'ABSCHLUSS_PRECHECK', message: expect.stringContaining('erst den Bau-PR mergen') });
    expect(store.getAbschluss('pa', 'INT-2026-024')).toBeUndefined();
    await expect(service.abschlussVorschau('pa', 'INT-2026-099')).rejects.toMatchObject({ code: 'UNKNOWN_VORHABEN' });
    await expect(service.abschlussVorschau('zz', 'INT-2026-024')).rejects.toMatchObject({ code: 'UNKNOWN_PROJECT' });
  });

  it('FA-10/FA-11: abschliessen → mark stored; next scan shows phase umgesetzt, note „Abschluss-PR #42", no nextStep, group data; the lock ran; mark survives a reload', async () => {
    expect(row().phase).toBe('pr');
    const r = await service.abschliessen('pa', 'INT-2026-024', BASE_SHA);
    expect(r).toEqual({ prNumber: 42, prUrl: 'https://github.com/o/r/pull/42', zweig: 'chore/INT-2026-024-abschluss' });
    expect(runner.abschlussCalls[0]).toMatchObject({ projectPath: projA, mainPath: projA, dirName: 'INT-2026-024-abschluss', intentId: 'INT-2026-024', baseSha: BASE_SHA });
    expect(runner.lockSeen).toBe(1);
    expect(store.getAbschluss('pa', 'INT-2026-024')).toEqual({ marke: { prNumber: 42, prUrl: 'https://github.com/o/r/pull/42', zweig: 'chore/INT-2026-024-abschluss', at: '2026-09-22T10:00:00.000Z' } });
    const after = row();
    expect(after.phase).toBe('umgesetzt');
    expect(after.phaseNote).toBe('Abschluss-PR #42');
    expect(after.nextStep).toBeUndefined();
    expect(after.freigabeDoc).toBeUndefined();
    expect(after.abschluss).toEqual({ marke: store.getAbschluss('pa', 'INT-2026-024')!.marke });
    expect(after.abschluss?.laeuft).toBeUndefined();
    // the other row is untouched
    expect(row('INT-2026-025').phase).toBe('plan');
    expect(row('INT-2026-025').abschluss).toBeUndefined();
    // a second start with a mark → ABSCHLUSS_MARKE
    await expect(service.abschliessen('pa', 'INT-2026-024', BASE_SHA)).rejects.toMatchObject({ code: 'ABSCHLUSS_MARKE' });
    // reload: the mark is still there and the new service shows it
    await store.flush();
    service.stop();
    const store2 = new VorhabenStateStore(join(root, 'state.json'), { port: 3111 });
    await store2.load();
    expect(store2.getAbschluss('pa', 'INT-2026-024')?.marke.prNumber).toBe(42);
    store = store2;
    watcher = new VorhabenWatcher({ debounceMs: 30 });
    service = makeService();
    await service.start();
    expect(row().phase).toBe('umgesetzt');
    expect(row().phaseNote).toBe('Abschluss-PR #42');
  });

  it('FA-12: the file in the main checkout reads umgesetzt → the scan drops the mark, the note is gone, the row stays umgesetzt from the file', async () => {
    await service.abschliessen('pa', 'INT-2026-024', BASE_SHA);
    expect(row().phaseNote).toBe('Abschluss-PR #42');
    writeFileSync(intentFile('INT-2026-024-abschluss'), intentText('INT-2026-024', 'umgesetzt', '1.0.1'));
    await service.rescan();
    expect(store.getAbschluss('pa', 'INT-2026-024')).toBeUndefined();
    expect(row().phase).toBe('umgesetzt');
    expect(row().phaseNote).toBe('Spec entfällt');
    expect(row().phaseNote).not.toContain('Abschluss-PR');
    expect(row().abschluss).toBeUndefined();
  });

  it('FA-15: zurücknehmen drops the mark (and a failure); the row is back in phase pr; without a mark → ABSCHLUSS_MARKE', async () => {
    await service.abschliessen('pa', 'INT-2026-024', BASE_SHA);
    expect(row().phase).toBe('umgesetzt');
    await service.abschlussZuruecknehmen('pa', 'INT-2026-024');
    expect(store.getAbschluss('pa', 'INT-2026-024')).toBeUndefined();
    expect(row().phase).toBe('pr');
    expect(row().phaseNote).toBe('PR #7 offen');
    expect(row().abschluss).toBeUndefined();
    await expect(service.abschlussZuruecknehmen('pa', 'INT-2026-024')).rejects.toMatchObject({ code: 'ABSCHLUSS_MARKE' });
    await expect(service.abschlussZuruecknehmen('pa', 'INT-2026-099')).rejects.toMatchObject({ code: 'UNKNOWN_VORHABEN' });
  });

  it('FA-19: while running the row carries laeuft; a second start and zurücknehmen → ABSCHLUSS_RUNNING; afterwards laeuft is gone', async () => {
    let open!: () => void;
    runner.gate = new Promise<void>((res) => {
      open = res;
    });
    const p = service.abschliessen('pa', 'INT-2026-024', BASE_SHA);
    await new Promise((r) => setTimeout(r, 20));
    expect(row().abschluss).toEqual({ laeuft: true });
    expect(row().phase).toBe('pr');
    await expect(service.abschliessen('pa', 'INT-2026-024', BASE_SHA)).rejects.toMatchObject({ code: 'ABSCHLUSS_RUNNING', message: 'Abschluss läuft schon' });
    await expect(service.abschlussZuruecknehmen('pa', 'INT-2026-024')).rejects.toMatchObject({ code: 'ABSCHLUSS_RUNNING' });
    // another Vorhaben is not blocked
    expect(row('INT-2026-025').abschluss).toBeUndefined();
    open();
    await p;
    expect(row().abschluss).toEqual({ marke: expect.objectContaining({ prNumber: 42 }) });
    expect(runner.abschlussCalls).toHaveLength(1);
  });

  it('AN-S16: a failure is stored with the runner\'s message, travels with the row, survives a reload, and is cleared by the next attempt; codes per phase', async () => {
    runner.abschlussError = new AbschlussError('veroeffentlichen', 'push_fehlgeschlagen', 'Push fehlgeschlagen: kein Netz — Zugang und Netz prüfen, dann erneut');
    await expect(service.abschliessen('pa', 'INT-2026-024', BASE_SHA)).rejects.toMatchObject({ code: 'ABSCHLUSS_FAILED', message: 'Nicht abgeschlossen: Push fehlgeschlagen: kein Netz — Zugang und Netz prüfen, dann erneut' });
    expect(row().phase).toBe('pr');
    expect(row().abschluss).toEqual({ fehler: { message: 'Nicht abgeschlossen: Push fehlgeschlagen: kein Netz — Zugang und Netz prüfen, dann erneut', at: '2026-09-22T10:00:00.000Z' } });
    await store.flush();
    const again = new VorhabenStateStore(join(root, 'state.json'), { port: 3111 });
    await again.load();
    expect(again.getAbschluss('pa', 'INT-2026-024')?.fehler?.message).toContain('Push fehlgeschlagen');
    runner.abschlussError = new AbschlussError('vorpruefung', 'stand_veraltet', 'der Hauptzweig hat sich seit der Vorschau geändert — Dialog erneut öffnen');
    await expect(service.abschliessen('pa', 'INT-2026-024', BASE_SHA)).rejects.toMatchObject({ code: 'ABSCHLUSS_STALE' });
    expect(row().abschluss?.fehler?.message).toContain('Dialog erneut öffnen');
    runner.abschlussError = new AbschlussError('vorpruefung', 'gh_fehlt', 'gh ist nicht installiert — GitHub CLI auf dem Host installieren');
    await expect(service.abschliessen('pa', 'INT-2026-024', BASE_SHA)).rejects.toMatchObject({ code: 'ABSCHLUSS_PRECHECK' });
    runner.abschlussError = new Error('kaputt');
    await expect(service.abschliessen('pa', 'INT-2026-024', BASE_SHA)).rejects.toMatchObject({ code: 'ABSCHLUSS_FAILED', message: 'Nicht abgeschlossen: kaputt — erneut versuchen' });
    // the next successful attempt clears the failure
    runner.abschlussError = null;
    await service.abschliessen('pa', 'INT-2026-024', BASE_SHA);
    expect(row().abschluss).toEqual({ marke: expect.objectContaining({ prNumber: 42 }) });
    expect(row().abschluss?.fehler).toBeUndefined();
  });

  it('review E13: the folder is deleted before the merge → the next scan prunes the mark', async () => {
    await service.abschliessen('pa', 'INT-2026-024', BASE_SHA);
    expect(store.getAbschluss('pa', 'INT-2026-024')?.marke).toBeDefined();
    rmSync(join(projA, 'intent', 'INT-2026-024-abschluss'), { recursive: true, force: true });
    await service.rescan();
    expect(row()).toBeUndefined();
    expect(store.getAbschluss('pa', 'INT-2026-024')).toBeUndefined();
  });

  it('handler: the three messages with validation; errors travel as vorhaben:error with the code', async () => {
    const reply = vi.fn<(m: OutboundMessage) => void>();
    const handler = new VorhabenHandler(service, new ProjectDocsService({ gitDirty: async () => null }), store, broadcast);
    const tick = (): Promise<void> => new Promise((r) => setTimeout(r, 30));
    expect(handler.handle({ type: 'vorhaben:abschluss.vorschau', requestId: 'v1', projectId: 'pa', intentId: 'INT-2026-024' }, reply)).toBe(true);
    await tick();
    expect(reply).toHaveBeenLastCalledWith(expect.objectContaining({ type: 'vorhaben:abschluss-vorschau', requestId: 'v1', projectId: 'pa', intentId: 'INT-2026-024', vorschau: expect.objectContaining({ baseSha: BASE_SHA, versionNeu: '1.0.1' }) }));
    handler.handle({ type: 'vorhaben:abschluss.vorschau', requestId: 'v2', projectId: 'pa', intentId: 'nope' }, reply);
    expect(reply).toHaveBeenLastCalledWith(expect.objectContaining({ type: 'vorhaben:error', requestId: 'v2', code: 'INVALID_MESSAGE' }));
    handler.handle({ type: 'vorhaben:abschluss.starten', requestId: 's1', projectId: 'pa', intentId: 'INT-2026-024', baseSha: 'abc' }, reply);
    expect(reply).toHaveBeenLastCalledWith(expect.objectContaining({ type: 'vorhaben:error', requestId: 's1', code: 'INVALID_MESSAGE' }));
    handler.handle({ type: 'vorhaben:abschluss.starten', requestId: 's2', projectId: 'pa', intentId: 'INT-2026-024', baseSha: BASE_SHA }, reply);
    await tick();
    expect(reply).toHaveBeenLastCalledWith({ type: 'vorhaben:abschluss-ergebnis', requestId: 's2', projectId: 'pa', intentId: 'INT-2026-024', prNumber: 42, prUrl: 'https://github.com/o/r/pull/42', zweig: 'chore/INT-2026-024-abschluss' });
    expect(row().phase).toBe('umgesetzt');
    handler.handle({ type: 'vorhaben:abschluss.starten', requestId: 's3', projectId: 'pa', intentId: 'INT-2026-024', baseSha: BASE_SHA }, reply);
    await tick();
    expect(reply).toHaveBeenLastCalledWith(expect.objectContaining({ type: 'vorhaben:error', requestId: 's3', code: 'ABSCHLUSS_MARKE' }));
    handler.handle({ type: 'vorhaben:abschluss.zuruecknehmen', requestId: 'z1', projectId: 'pa', intentId: 'INT-2026-024' }, reply);
    await tick();
    expect(reply).toHaveBeenLastCalledWith({ type: 'vorhaben:abschluss-zurueckgenommen', requestId: 'z1', projectId: 'pa', intentId: 'INT-2026-024' });
    expect(row().phase).toBe('pr');
    handler.handle({ type: 'vorhaben:abschluss.zuruecknehmen', requestId: 'z2', projectId: 'zz', intentId: 'INT-2026-024' }, reply);
    expect(reply).toHaveBeenLastCalledWith(expect.objectContaining({ type: 'vorhaben:error', requestId: 'z2', code: 'UNKNOWN_PROJECT' }));
    runner.abschlussError = new AbschlussError('veroeffentlichen', 'pr_unklar', 'PR-Status unklar (x) — auf GitHub prüfen');
    handler.handle({ type: 'vorhaben:abschluss.starten', requestId: 's4', projectId: 'pa', intentId: 'INT-2026-024', baseSha: BASE_SHA }, reply);
    await tick();
    expect(reply).toHaveBeenLastCalledWith(expect.objectContaining({ type: 'vorhaben:error', requestId: 's4', code: 'ABSCHLUSS_FAILED', message: expect.stringContaining('PR-Status unklar') }));
    expect(VorhabenError).toBeDefined();
  });
});
