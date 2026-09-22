import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtempSync, mkdirSync, rmSync, writeFileSync, utimesSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import { stepCommand } from '../../src/shared/types/vorhaben.protocol.js';

import {
  parseIntentHead,
  parseStatusLine,
  boundNote,
  NOTE_MAX_CHARS,
  derivePhase,
  deriveReviewDoc,
  deriveZustand,
  derivePendingZustand,
  deriveNextStep,
  deriveNextStepSperre,
  mergeCandidates,
  scanCopy,
  toRow,
  nodeReaderFs,
  VorhabenParseCache,
  type DocHeads,
} from '../../src/server/services/vorhaben-reader.js';
import type { VorhabenSessionRef } from '../../src/shared/types/vorhaben.protocol.js';

const intentText = (status: string, extra = ''): string =>
  `---\nintent_id: "INT-2026-004"  \ntitel: "Web-UI zeigt Vorhaben"  \nstatus: "${status}"  \nversion: "1.2.0"  \nbypass: "nein"  \nbezuege:  \n  spec: "spec.md"  \n${extra}---\n\n# Absicht\n`;

const statusDoc = (status: string, note = ''): string =>
  `# Spec: X\n\n> **Intent:** intent.md\n> **Status:** ${status}${note ? ' ' + note : ''}\n> **Erstellt:** 2026-09-15\n`;

describe('parseIntentHead (FA-11)', () => {
  it('reads quoted fields with trailing spaces, bypass as boolean', () => {
    const head = parseIntentHead(intentText('angenommen', 'herkunft: "michael"  \n'));
    expect(head).toEqual({
      intent_id: 'INT-2026-004',
      titel: 'Web-UI zeigt Vorhaben',
      status: 'angenommen',
      version: '1.2.0',
      bypass: false,
      herkunft: 'michael',
    });
  });
  it('bypass: ja → true', () => {
    expect(parseIntentHead('---\nstatus: entwurf\nbypass: ja\n---\n')?.bypass).toBe(true);
  });
  it('returns null without frontmatter or without status (FA-09)', () => {
    expect(parseIntentHead('# Nur Text')).toBeNull();
    expect(parseIntentHead('---\ntitel: "x"\n---\n')).toBeNull();
  });
});

describe('parseStatusLine (FA-11)', () => {
  it('first word is status, rest is note', () => {
    expect(parseStatusLine(statusDoc('umgesetzt', '· PR #57'))).toEqual({ status: 'umgesetzt', note: 'PR #57' });
    expect(parseStatusLine(statusDoc('freigegeben'))).toEqual({ status: 'freigegeben', note: '' });
  });
  it('null when the line is missing', () => {
    expect(parseStatusLine('# Plan\n\nText')).toBeNull();
  });
  // INT-2026-013 (AK-01, B1): the note is bounded — cut at the first ` · ` head field, no `**`/backticks, at most NOTE_MAX_CHARS plain characters.
  it('bounds the note: cut at the first head-field separator (INT-2026-009 line)', () => {
    const line = 'umgesetzt (Merge steht aus; Fassung 2 nach externem Review, 3 Reviewer, 24 Findings, §12) · **Erstellt:** 2026-09-16 im Plan Mode · **Freigabe:** Product Owner (Michael Sindlinger), 2026-09-16 („freigabe", Chat)';
    expect(parseStatusLine(statusDoc(line))).toEqual({ status: 'umgesetzt', note: '(Merge steht aus; Fassung 2 nach externem Review, 3 Reviewer, 24 Findings, §12)' });
  });
  it('bounds the note: strips ** and backticks, caps at 80 characters with … (INT-2026-005 line)', () => {
    const line = 'umgesetzt — **PR #49** offen (Merge = Michael), CI `verify` grün (Run 35023234917 auf `7bd02fb`); Bau beauftragt (Michael, „Mach A1", Board-Sitzung 15.09.)';
    const parsed = parseStatusLine(statusDoc(line))!;
    expect(parsed.status).toBe('umgesetzt');
    expect(parsed.note).toBe('PR #49 offen (Merge = Michael), CI verify grün (Run 35023234917 auf 7bd02fb); B…');
    expect(parsed.note.length).toBeLessThanOrEqual(NOTE_MAX_CHARS);
    expect(parsed.note).not.toMatch(/\*\*|`/);
  });
  it('boundNote: short notes stay as they are, exactly 80 characters are not cut', () => {
    expect(boundNote('· PR #57')).toBe('PR #57');
    expect(boundNote('')).toBe('');
    const exact = 'x'.repeat(NOTE_MAX_CHARS);
    expect(boundNote(exact)).toBe(exact);
    expect(boundNote(`${exact}y`)).toBe(`${'x'.repeat(NOTE_MAX_CHARS - 1)}…`);
    expect(boundNote('**PR #57** · **Erstellt:** heute')).toBe('PR #57');
  });
});

describe('derivePhase (FA-10, one case per table row)', () => {
  const intent = (status: string, bypass = false): DocHeads['intent'] => ({ status, bypass, titel: 't' });
  it('abgeloest / verworfen → hidden', () => {
    expect(derivePhase({ intent: intent('abgeloest') })).toBe('hidden');
    expect(derivePhase({ intent: intent('verworfen') })).toBe('hidden');
  });
  it('umgesetzt', () => {
    expect(derivePhase({ intent: intent('umgesetzt'), plan: { status: 'umgesetzt', note: '' } })).toBe('umgesetzt');
  });
  it('PR: plan umgesetzt, intent still angenommen', () => {
    expect(derivePhase({ intent: intent('angenommen'), spec: { status: 'freigegeben', note: '' }, plan: { status: 'umgesetzt', note: 'PR #1' } })).toBe('pr');
  });
  it('Bau: plan freigegeben or in_umsetzung', () => {
    expect(derivePhase({ intent: intent('angenommen'), plan: { status: 'freigegeben', note: '' } })).toBe('bau');
    expect(derivePhase({ intent: intent('angenommen'), plan: { status: 'in_umsetzung', note: '' } })).toBe('bau');
  });
  it('Plan: spec freigegeben and plan missing/entwurf; or bypass', () => {
    expect(derivePhase({ intent: intent('angenommen'), spec: { status: 'freigegeben', note: '' } })).toBe('plan');
    expect(derivePhase({ intent: intent('angenommen'), spec: { status: 'freigegeben', note: '' }, plan: { status: 'entwurf', note: '' } })).toBe('plan');
    expect(derivePhase({ intent: intent('angenommen', true) })).toBe('plan');
  });
  it('Spec: angenommen without bypass, spec missing/entwurf/in_review', () => {
    expect(derivePhase({ intent: intent('angenommen') })).toBe('spec');
    expect(derivePhase({ intent: intent('angenommen'), spec: { status: 'entwurf', note: '' } })).toBe('spec');
    expect(derivePhase({ intent: intent('angenommen'), spec: { status: 'in_review', note: '' } })).toBe('spec');
  });
  it('Absicht: entwurf / in_klaerung', () => {
    expect(derivePhase({ intent: intent('entwurf') })).toBe('absicht');
    expect(derivePhase({ intent: intent('in_klaerung') })).toBe('absicht');
  });
  it('unbekannt: no readable head or no rule', () => {
    expect(derivePhase({ intent: null })).toBe('unbekannt');
    expect(derivePhase({})).toBe('unbekannt');
    expect(derivePhase({ intent: intent('irgendwas') })).toBe('unbekannt');
  });
});

describe('deriveReviewDoc (FA-20, per row)', () => {
  it('Absicht → intent; PR → plan; Bau → none', () => {
    expect(deriveReviewDoc('absicht', {})).toBe('intent');
    expect(deriveReviewDoc('pr', {})).toBe('plan');
    expect(deriveReviewDoc('bau', {})).toBeUndefined();
  });
  it('Spec → spec only when the file exists', () => {
    expect(deriveReviewDoc('spec', {})).toBeUndefined();
    expect(deriveReviewDoc('spec', { spec: { status: 'entwurf', note: '' } })).toBe('spec');
    expect(deriveReviewDoc('spec', { spec: null })).toBe('spec');
  });
  it('Plan → plan only with status entwurf', () => {
    expect(deriveReviewDoc('plan', {})).toBeUndefined();
    expect(deriveReviewDoc('plan', { plan: { status: 'entwurf', note: '' } })).toBe('plan');
    expect(deriveReviewDoc('plan', { plan: { status: 'freigegeben', note: '' } })).toBeUndefined();
  });
});

describe('deriveZustand (FA-13, one case per value; FA-14 decay)', () => {
  const s = (agentStatus: VorhabenSessionRef['agentStatus'], ended = false): VorhabenSessionRef => ({
    id: 's1', name: 'plan INT-2026-004', model: 'opus', agentStatus, ...(ended ? { ended } : {}),
  });
  it('wartet auf dich: session done/idle and review doc', () => {
    expect(deriveZustand('plan', false, s('done'), 'plan')).toMatchObject({ zustand: 'wartet_auf_dich', reviewDoc: 'plan', detail: 'plan.md' });
    expect(deriveZustand('plan', false, s('idle'), 'plan').zustand).toBe('wartet_auf_dich');
  });
  it('wartet: session waits without review doc', () => {
    expect(deriveZustand('bau', false, s('done'), undefined)).toMatchObject({ zustand: 'wartet', detail: 'Rückfrage im Bau' });
  });
  it('wartet im Terminal: blocked, split by block kind (INT-2026-007 FA-09/FA-10)', () => {
    const blocked = (blockKind?: 'rueckfrage' | 'plan' | 'berechtigung' | 'unbekannt'): VorhabenSessionRef => ({ ...s('blocked'), ...(blockKind ? { blockKind } : {}) });
    expect(deriveZustand('spec', false, blocked('rueckfrage'), 'spec')).toMatchObject({ zustand: 'wartet_rueckfrage', detail: 'Rückfrage' });
    expect(deriveZustand('spec', false, blocked('plan'), 'spec')).toMatchObject({ zustand: 'wartet_plan', detail: 'Plan-Entscheidung' });
    expect(deriveZustand('spec', false, blocked('berechtigung'), 'spec')).toMatchObject({ zustand: 'wartet_berechtigung', detail: 'Berechtigung' });
    expect(deriveZustand('spec', false, blocked('unbekannt'), 'spec')).toMatchObject({ zustand: 'wartet_berechtigung', detail: 'Dialog' });
    expect(deriveZustand('spec', false, blocked(), 'spec').zustand).toBe('wartet_berechtigung');
  });
  it('arbeitet: working, detail = model', () => {
    expect(deriveZustand('spec', false, s('working'), 'spec')).toMatchObject({ zustand: 'arbeitet', detail: 'opus' });
  });
  it('Bau unterbrochen: phase bau + build-stand, no working session', () => {
    expect(deriveZustand('bau', true, undefined, undefined).zustand).toBe('bau_unterbrochen');
    expect(deriveZustand('bau', true, s('done', true), undefined).zustand).toBe('bau_unterbrochen');
    expect(deriveZustand('bau', true, s('working'), undefined).zustand).toBe('arbeitet');
  });
  it('keine Sitzung / Sitzung beendet / error', () => {
    expect(deriveZustand('spec', false, undefined, 'spec').zustand).toBe('keine_sitzung');
    expect(deriveZustand('spec', false, s('done', true), 'spec').zustand).toBe('sitzung_beendet');
    expect(deriveZustand('spec', false, s('error'), 'spec')).toMatchObject({ zustand: 'sitzung_beendet', detail: 'Fehler' });
  });
});

describe('INT-2026-022 (FA-13, review E16): derivePendingZustand — a pending `/intent` session with the row\'s rule', () => {
  const s = (agentStatus: VorhabenSessionRef['agentStatus'], ended?: boolean): VorhabenSessionRef => ({ id: 's1', name: 'intent', model: 'opus', agentStatus, ...(ended ? { ended } : {}) });
  const blocked = (blockKind: VorhabenSessionRef['blockKind']): VorhabenSessionRef => ({ ...s('blocked'), blockKind });

  it('working → arbeitet; blocked → the dialog kind; idle/done → wartet (no review doc, no build-stand); ended → sitzung_beendet', () => {
    expect(derivePendingZustand(s('working'))).toEqual({ zustand: 'arbeitet', detail: 'opus' });
    expect(derivePendingZustand(blocked('rueckfrage'))).toEqual({ zustand: 'wartet_rueckfrage', detail: 'Rückfrage' });
    expect(derivePendingZustand(blocked('plan'))).toEqual({ zustand: 'wartet_plan', detail: 'Plan-Entscheidung' });
    expect(derivePendingZustand(blocked('berechtigung'))).toEqual({ zustand: 'wartet_berechtigung', detail: 'Berechtigung' });
    expect(derivePendingZustand(s('done'))).toEqual({ zustand: 'wartet', detail: '' });
    expect(derivePendingZustand(s('idle'))).toEqual({ zustand: 'wartet', detail: '' });
    expect(derivePendingZustand(s('unknown', true))).toEqual({ zustand: 'sitzung_beendet', detail: '' });
    expect(derivePendingZustand(s('error'))).toEqual({ zustand: 'sitzung_beendet', detail: 'Fehler' });
    // never a review doc: the same as the row rule with phase absicht and no document
    expect(derivePendingZustand(s('done'))).toEqual(deriveZustand('absicht', false, s('done'), undefined));
  });
});

describe('stepCommand (INT-2026-005)', () => {
  it('names the command with its namespace — the commands live in .claude/commands/specwright/', () => {
    expect(stepCommand('intent')).toBe('/specwright:intent');
    expect(stepCommand('intent', 'INT-2026-004')).toBe('/specwright:intent');
    expect(stepCommand('spec', 'INT-2026-004')).toBe('/specwright:spec INT-2026-004');
    expect(stepCommand('plan', 'INT-2026-004')).toBe('/specwright:plan INT-2026-004');
    expect(stepCommand('build', 'INT-2026-004')).toBe('/specwright:build INT-2026-004');
  });
});

describe('deriveNextStep (FA-12)', () => {
  it('per phase', () => {
    expect(deriveNextStep('bau', 'INT-2026-001', false)).toEqual({ step: 'build', command: '/specwright:build INT-2026-001', label: 'Bau starten' });
    expect(deriveNextStep('bau', 'INT-2026-001', true)?.label).toBe('Bau fortsetzen');
    expect(deriveNextStep('plan', 'INT-2026-001', false)?.command).toBe('/specwright:plan INT-2026-001');
    expect(deriveNextStep('spec', 'INT-2026-001', false)?.command).toBe('/specwright:spec INT-2026-001');
    expect(deriveNextStep('absicht', 'INT-2026-001', false)).toBeUndefined();
    expect(deriveNextStep('pr', 'INT-2026-001', false)).toBeUndefined();
    expect(deriveNextStep('umgesetzt', 'INT-2026-001', false)).toBeUndefined();
  });
});

describe('INT-2026-018: deriveNextStepSperre (AK-01–AK-03, AK-10, NZ-04) — the one rule reader and service share', () => {
  const live = (over: Partial<VorhabenSessionRef> = {}): VorhabenSessionRef => ({ id: 's1', name: 'intent INT-2026-004', model: 'opus', agentStatus: 'done', step: 'intent', target: { kind: 'main' }, ...over });
  const base = { nextStep: 'plan' as const, freigabeDoc: undefined, interrupted: false };

  it('AK-01: a quiet session of an earlier phase frees the button — done or idle, intent → plan, spec → plan, spec → build', () => {
    expect(deriveNextStepSperre({ ...base, session: live() })).toBeUndefined();
    expect(deriveNextStepSperre({ ...base, session: live({ agentStatus: 'idle' }) })).toBeUndefined();
    expect(deriveNextStepSperre({ ...base, session: live({ step: 'spec' }) })).toBeUndefined();
    expect(deriveNextStepSperre({ ...base, nextStep: 'build', session: live({ step: 'spec' }) })).toBeUndefined();
  });

  it('AK-10: no session, an ended one, or an errored one → usable (a new session starts as today)', () => {
    expect(deriveNextStepSperre({ ...base, session: undefined })).toBeUndefined();
    expect(deriveNextStepSperre({ ...base, session: live({ ended: true, agentStatus: 'unknown' }) })).toBeUndefined();
    expect(deriveNextStepSperre({ ...base, session: live({ agentStatus: 'error' }) })).toBeUndefined();
  });

  it('AK-02: working → arbeitet; blocked (every blockKind) → dialog; unknown → unbekannt (E14); first input pending → erste_eingabe', () => {
    expect(deriveNextStepSperre({ ...base, session: live({ agentStatus: 'working' }) })).toBe('arbeitet');
    for (const blockKind of ['rueckfrage', 'plan', 'berechtigung', 'unbekannt', undefined] as const) {
      expect(deriveNextStepSperre({ ...base, session: live({ agentStatus: 'blocked', blockKind }) })).toBe('dialog');
    }
    expect(deriveNextStepSperre({ ...base, session: live({ agentStatus: 'unknown' }) })).toBe('unbekannt');
    expect(deriveNextStepSperre({ ...base, session: live({ firstInputPending: true }) })).toBe('erste_eingabe');
  });

  it('AK-03: same or later step → gleiche_phase; a ref without step counts as the same phase; an open approval of an earlier step → freigabe_offen', () => {
    expect(deriveNextStepSperre({ ...base, session: live({ step: 'plan' }) })).toBe('gleiche_phase');
    expect(deriveNextStepSperre({ ...base, session: live({ step: 'build' }) })).toBe('gleiche_phase');
    expect(deriveNextStepSperre({ ...base, session: live({ step: undefined }) })).toBe('gleiche_phase');
    expect(deriveNextStepSperre({ ...base, freigabeDoc: 'spec', session: live({ step: 'spec' }) })).toBe('freigabe_offen');
    // order: the status reasons win over the phase reasons
    expect(deriveNextStepSperre({ ...base, freigabeDoc: 'spec', session: live({ step: 'plan', agentStatus: 'working' }) })).toBe('arbeitet');
  });

  it('NZ-04: „Bau fortsetzen" (interrupted) skips the phase check but not the status checks', () => {
    expect(deriveNextStepSperre({ ...base, nextStep: 'build', interrupted: true, session: live({ step: 'build' }) })).toBeUndefined();
    expect(deriveNextStepSperre({ ...base, nextStep: 'build', interrupted: true, session: live({ step: 'build', agentStatus: 'working' }) })).toBe('arbeitet');
  });
});

describe('scanCopy / toRow on a temp dir', () => {
  let root: string;
  const cache = new VorhabenParseCache();
  const project = { id: 'p1', path: '', name: 'Proj' };

  beforeEach(() => {
    root = mkdtempSync(join(tmpdir(), 'vorhaben-reader-'));
    project.path = root;
  });
  afterEach(() => rmSync(root, { recursive: true, force: true }));

  const mk = (base: string, dir: string, files: Record<string, string>): void => {
    mkdirSync(join(base, 'intent', dir), { recursive: true });
    for (const [f, c] of Object.entries(files)) {
      const p = join(base, 'intent', dir, f);
      mkdirSync(join(p, '..'), { recursive: true });
      writeFileSync(p, c);
    }
  };

  it('no intent dir → empty', () => {
    expect(scanCopy({ cwd: root, arbeitskopie: 'main' }, nodeReaderFs, cache)).toEqual([]);
  });

  it('reads docs, design files, statuses; row shows step, review doc, next step (FA-01, FA-17)', () => {
    mk(root, 'INT-2026-004-ui', {
      'intent.md': intentText('angenommen'),
      'spec.md': statusDoc('freigegeben'),
      'plan.md': statusDoc('entwurf'),
      'design/01-mock.png': 'png',
      'design/mock.css': 'css',
    });
    const cands = scanCopy({ cwd: root, arbeitskopie: 'main' }, nodeReaderFs, cache);
    expect(cands).toHaveLength(1);
    const c = cands[0];
    expect(c.intentId).toBe('INT-2026-004');
    expect(c.dirName).toBe('INT-2026-004-ui');
    expect(c.docs.map((d) => d.key)).toEqual(['intent', 'spec', 'plan']);
    expect(c.designFiles).toEqual(['01-mock.png', 'mock.css']);
    const row = toRow(project, c, undefined);
    expect(row).toMatchObject({
      phase: 'plan',
      step: 'plan',
      zustand: 'keine_sitzung',
      titel: 'Web-UI zeigt Vorhaben',
      nextStep: { command: '/specwright:plan INT-2026-004' },
      arbeitskopie: 'main',
    });
    expect(row?.reviewDoc).toBeUndefined();
    expect(row?.docs.find((d) => d.key === 'intent')?.version).toBe('1.2.0');
  });

  it('INT-2026-010 (FA-21, FA-22): next step stays on the row while a session works or waits — sessionBusy says so; freigabeDoc names the document awaiting approval without a session', () => {
    mk(root, 'INT-2026-004-ui', { 'intent.md': intentText('angenommen'), 'spec.md': statusDoc('freigegeben'), 'plan.md': statusDoc('entwurf') });
    const [c] = scanCopy({ cwd: root, arbeitskopie: 'main' }, nodeReaderFs, cache);
    const none = toRow(project, c, undefined)!;
    expect(none.sessionBusy).toBe(false);
    expect(none.nextStep?.step).toBe('plan');
    expect(none.freigabeDoc).toBe('plan'); // plan.md entwurf awaits approval although nobody waits
    expect(none.reviewDoc).toBeUndefined();
    const working = toRow(project, c, { id: 's1', name: 'plan INT-2026-004', model: 'opus', agentStatus: 'working' })!;
    expect(working.zustand).toBe('arbeitet');
    expect(working.sessionBusy).toBe(true);
    expect(working.nextStep?.step).toBe('plan');
    expect(working.freigabeDoc).toBe('plan');
    const waiting = toRow(project, c, { id: 's1', name: 'plan INT-2026-004', model: 'opus', agentStatus: 'done' })!;
    expect(waiting.zustand).toBe('wartet_auf_dich');
    expect(waiting.sessionBusy).toBe(true);
    expect(waiting.reviewDoc).toBe('plan');
    expect(waiting.freigabeDoc).toBe('plan');
    const blocked = toRow(project, c, { id: 's1', name: 'plan INT-2026-004', model: 'opus', agentStatus: 'blocked', blockKind: 'rueckfrage' })!;
    expect(blocked.sessionBusy).toBe(true);
    const ended = toRow(project, c, { id: 's1', name: 'plan INT-2026-004', model: 'opus', agentStatus: 'unknown', ended: true })!;
    expect(ended.zustand).toBe('sitzung_beendet');
    expect(ended.sessionBusy).toBe(false);
    expect(ended.nextStep?.step).toBe('plan');
    // phase pr: plan umgesetzt → no approval pending
    mk(root, 'INT-2026-005-pr', { 'intent.md': intentText('angenommen'), 'spec.md': statusDoc('freigegeben'), 'plan.md': statusDoc('umgesetzt PR #12') });
    const pr = toRow(project, scanCopy({ cwd: root, arbeitskopie: 'main' }, nodeReaderFs, cache).find((x) => x.intentId === 'INT-2026-005')!, undefined)!;
    expect(pr.phase).toBe('pr');
    expect(pr.freigabeDoc).toBeUndefined();
    // absicht: intent entwurf awaits approval
    mk(root, 'INT-2026-006-neu', { 'intent.md': intentText('entwurf') });
    const absicht = toRow(project, scanCopy({ cwd: root, arbeitskopie: 'main' }, nodeReaderFs, cache).find((x) => x.intentId === 'INT-2026-006')!, undefined)!;
    expect(absicht.freigabeDoc).toBe('intent');
  });

  it('INT-2026-018 (AK-01, AK-07): a quiet session of an earlier phase → no sperre, sessionBusy false, nextStep.sitzung names it with model, provider and target', () => {
    mk(root, 'INT-2026-004-ui', { 'intent.md': intentText('angenommen'), 'spec.md': statusDoc('freigegeben') });
    const [c] = scanCopy({ cwd: root, arbeitskopie: 'main' }, nodeReaderFs, cache);
    const ref: VorhabenSessionRef = { id: 's7', name: 'spec INT-2026-004', model: 'haiku', agentStatus: 'done', step: 'spec', provider: 'anthropic', target: { kind: 'existing-worktree', path: '/wt/x' } };
    const row = toRow(project, c, ref)!;
    expect(row.phase).toBe('plan');
    expect(row.nextStep?.step).toBe('plan');
    expect(row.nextStep?.sperre).toBeUndefined();
    expect(row.sessionBusy).toBe(false);
    expect(row.nextStep?.sitzung).toEqual({ id: 's7', name: 'spec INT-2026-004', model: { providerId: 'anthropic', modelId: 'haiku' }, target: { kind: 'existing-worktree', path: '/wt/x' } });
    // provider absent → anthropic (assignments before INT-2026-019)
    expect(toRow(project, c, { ...ref, provider: undefined })!.nextStep?.sitzung?.model).toEqual({ providerId: 'anthropic', modelId: 'haiku' });
    // no target (fixture, old ref) → no sitzung, still usable
    const noTarget = toRow(project, c, { ...ref, target: undefined })!;
    expect(noTarget.sessionBusy).toBe(false);
    expect(noTarget.nextStep?.sitzung).toBeUndefined();
  });

  it('INT-2026-018 (AK-02, AK-03): sperre travels on nextStep, sessionBusy === !!sperre, no sitzung while locked', () => {
    mk(root, 'INT-2026-004-ui', { 'intent.md': intentText('angenommen'), 'spec.md': statusDoc('freigegeben') });
    const [c] = scanCopy({ cwd: root, arbeitskopie: 'main' }, nodeReaderFs, cache);
    const ref: VorhabenSessionRef = { id: 's7', name: 'spec INT-2026-004', model: 'haiku', agentStatus: 'done', step: 'spec', target: { kind: 'main' } };
    const cases: Array<[Partial<VorhabenSessionRef>, string]> = [
      [{ agentStatus: 'working' }, 'arbeitet'],
      [{ agentStatus: 'blocked', blockKind: 'berechtigung' }, 'dialog'],
      [{ agentStatus: 'unknown' }, 'unbekannt'],
      [{ firstInputPending: true }, 'erste_eingabe'],
      [{ step: 'plan' }, 'gleiche_phase'],
      [{ step: undefined }, 'gleiche_phase'],
    ];
    for (const [over, sperre] of cases) {
      const row = toRow(project, c, { ...ref, ...over })!;
      expect(row.nextStep?.sperre, sperre).toBe(sperre);
      expect(row.sessionBusy, sperre).toBe(true);
      expect(row.nextStep?.sitzung, sperre).toBeUndefined();
    }
  });

  it('INT-2026-018 (NZ-04): „Bau fortsetzen" with a quiet session → usable but without sitzung (new session, the old one stays)', () => {
    mk(root, 'INT-2026-004-ui', { 'intent.md': intentText('angenommen'), 'plan.md': statusDoc('in_umsetzung'), 'build-stand.md': '# Stand\n' });
    const [c] = scanCopy({ cwd: root, arbeitskopie: 'main' }, nodeReaderFs, cache);
    const row = toRow(project, c, { id: 's7', name: 'plan INT-2026-004', model: 'haiku', agentStatus: 'done', step: 'plan', target: { kind: 'main' } })!;
    expect(row.zustand).toBe('bau_unterbrochen');
    expect(row.nextStep?.label).toBe('Bau fortsetzen');
    expect(row.nextStep?.sperre).toBeUndefined();
    expect(row.sessionBusy).toBe(false);
    expect(row.nextStep?.sitzung).toBeUndefined();
  });

  it('unreadable head → row with folder id, "(Kopf nicht lesbar)", phase unbekannt, no next step (FA-09)', () => {
    mk(root, 'INT-2026-007-kaputt', { 'intent.md': '# ohne Kopf' });
    const [c] = scanCopy({ cwd: root, arbeitskopie: '' }, nodeReaderFs, cache);
    const row = toRow(project, c, undefined);
    expect(row).toMatchObject({ intentId: 'INT-2026-007', titel: '(Kopf nicht lesbar)', phase: 'unbekannt' });
    expect(row?.nextStep).toBeUndefined();
  });

  it('missing intent.md still yields a row (FA-09)', () => {
    mk(root, 'INT-2026-008-leer', { 'plan.md': statusDoc('freigegeben') });
    const [c] = scanCopy({ cwd: root, arbeitskopie: '' }, nodeReaderFs, cache);
    expect(toRow(project, c, undefined)?.phase).toBe('unbekannt');
  });

  it('abgeloest is hidden (FA-01)', () => {
    mk(root, 'INT-2026-009-alt', { 'intent.md': intentText('abgeloest') });
    const [c] = scanCopy({ cwd: root, arbeitskopie: '' }, nodeReaderFs, cache);
    expect(toRow(project, c, undefined)).toBeNull();
  });

  it('ignores folders that are not INT-JJJJ-NNN', () => {
    mkdirSync(join(root, 'intent', 'README-Ordner'), { recursive: true });
    mkdirSync(join(root, 'intent', 'INT-2026-001-x'), { recursive: true });
    expect(scanCopy({ cwd: root, arbeitskopie: '' }, nodeReaderFs, cache).map((c) => c.intentId)).toEqual(['INT-2026-001']);
  });

  it('herkunft from head lands on the row (FA-48)', () => {
    mk(root, 'INT-2026-010-h', { 'intent.md': intentText('entwurf', 'herkunft: "automatisch"  \n') });
    const [c] = scanCopy({ cwd: root, arbeitskopie: '' }, nodeReaderFs, cache);
    expect(toRow(project, c, undefined)?.herkunft).toBe('automatisch');
  });

  it('FA-06: same id in project and worktree → assigned copy wins, else newest mtime', () => {
    const wt = join(root, 'wt');
    mk(root, 'INT-2026-004-ui', { 'intent.md': intentText('angenommen') });
    mk(wt, 'INT-2026-004-ui', { 'intent.md': intentText('angenommen'), 'spec.md': statusDoc('entwurf') });
    const old = new Date(Date.now() - 60_000);
    utimesSync(join(root, 'intent', 'INT-2026-004-ui', 'intent.md'), old, old);
    utimesSync(join(root, 'intent', 'INT-2026-004-ui'), old, old);
    const cands = [
      ...scanCopy({ cwd: root, arbeitskopie: 'main' }, nodeReaderFs, cache),
      ...scanCopy({ cwd: wt, arbeitskopie: 'feat/x' }, nodeReaderFs, cache),
    ];
    expect(cands).toHaveLength(2);
    const newest = mergeCandidates(cands, new Map());
    expect(newest).toHaveLength(1);
    expect(newest[0].arbeitskopie).toBe('feat/x');
    const assigned = mergeCandidates(cands, new Map([['INT-2026-004', root]]));
    expect(assigned[0].arbeitskopie).toBe('main');
  });

  it('INT-2026-016 (AK-09): byte-identical copies → the main checkout wins although the worktree is newer (git worktree add restamps files); the assignment still wins over both', () => {
    const wt = join(root, 'wt');
    const docs = { 'intent.md': intentText('angenommen'), 'plan.md': statusDoc('umgesetzt (Merge steht aus)'), 'build-stand.md': '# Stand\n' };
    mk(root, 'INT-2026-012-openai', docs);
    mk(wt, 'INT-2026-012-openai', docs);
    const old = new Date(Date.now() - 60_000);
    for (const f of ['intent.md', 'plan.md', 'build-stand.md']) utimesSync(join(root, 'intent', 'INT-2026-012-openai', f), old, old);
    utimesSync(join(root, 'intent', 'INT-2026-012-openai'), old, old);
    const cands = [
      ...scanCopy({ cwd: root, arbeitskopie: 'main', main: true }, nodeReaderFs, cache),
      ...scanCopy({ cwd: wt, arbeitskopie: 'chore/INT-2026-015-abschluss' }, nodeReaderFs, cache),
    ];
    expect(cands[0].fingerprint).toBe(cands[1].fingerprint);
    expect(mergeCandidates(cands, new Map())[0].arbeitskopie).toBe('main');
    expect(mergeCandidates([cands[1], cands[0]], new Map())[0].arbeitskopie).toBe('main');
    expect(mergeCandidates(cands, new Map([['INT-2026-012', wt]]))[0].arbeitskopie).toBe('chore/INT-2026-015-abschluss');
  });

  it('INT-2026-016 (AK-09): a real change in the worktree (plan.md §14, build-stand.md) diverges the fingerprint → the newer copy wins as before (FA-06)', () => {
    const wt = join(root, 'wt');
    mk(root, 'INT-2026-013-bau', { 'intent.md': intentText('angenommen'), 'plan.md': statusDoc('in_umsetzung') });
    mk(wt, 'INT-2026-013-bau', { 'intent.md': intentText('angenommen'), 'plan.md': statusDoc('in_umsetzung'), 'build-stand.md': '# Stand\n' });
    const old = new Date(Date.now() - 60_000);
    for (const f of ['intent.md', 'plan.md']) utimesSync(join(root, 'intent', 'INT-2026-013-bau', f), old, old);
    utimesSync(join(root, 'intent', 'INT-2026-013-bau'), old, old);
    const cands = [
      ...scanCopy({ cwd: root, arbeitskopie: 'main', main: true }, nodeReaderFs, cache),
      ...scanCopy({ cwd: wt, arbeitskopie: 'session/x' }, nodeReaderFs, cache),
    ];
    expect(cands[0].fingerprint).not.toBe(cands[1].fingerprint);
    expect(mergeCandidates(cands, new Map())[0].arbeitskopie).toBe('session/x');
    // a broken head still fingerprints (raw text, not the parse result)
    mk(root, 'INT-2026-014-kaputt', { 'intent.md': '---\nintent_id: "INT-2026-014"\n' });
    const broken = scanCopy({ cwd: root, arbeitskopie: 'main', main: true }, nodeReaderFs, cache).find((c) => c.intentId === 'INT-2026-014')!;
    expect(broken.fingerprint).toMatch(/intent:[0-9a-f]{64}/);
  });
  it('INT-2026-022 (FA-21, review E29): the placeholder intent.md of next-intent-id.sh --reserve reads as phase absicht with title [TITEL] and version 0.0.0', () => {
    mk(root, 'INT-2026-024-neu', {
      'intent.md': '---\nintent_id: "INT-2026-024"  \ntitel: "[TITEL]"  \nstatus: "entwurf"  \nversion: "0.0.0"  \n---\n\n# Absicht: [TITEL]\n\nPlatzhalter — reserviert am 2026-09-19 durch `specwright/scripts/next-intent-id.sh --reserve neu`.\n',
    });
    const [c] = scanCopy({ cwd: root, arbeitskopie: 'session/cs-1' }, nodeReaderFs, cache);
    expect(c.intentId).toBe('INT-2026-024');
    const row = toRow(project, c, undefined)!;
    expect(row).toMatchObject({ phase: 'absicht', titel: '[TITEL]', arbeitskopie: 'session/cs-1', freigabeDoc: 'intent' });
    expect(row.docs.find((d) => d.key === 'intent')?.version).toBe('0.0.0');
  });

  // ---- INT-2026-024 ----

  it('INT-2026-024 (AK-07, FA-13): the main checkout wins as soon as it reads umgesetzt — over the assigned session copy, over a newer copy with a foreign word', () => {
    const wt = join(root, 'wt');
    const wt2 = join(root, 'wt2');
    mk(root, 'INT-2026-030-fertig', { 'intent.md': intentText('umgesetzt') });
    mk(wt, 'INT-2026-030-fertig', { 'intent.md': intentText('angenommen'), 'plan.md': statusDoc('umgesetzt') });
    mk(wt2, 'INT-2026-030-fertig', { 'intent.md': intentText('abgeschlossen') });
    const old = new Date(Date.now() - 60_000);
    utimesSync(join(root, 'intent', 'INT-2026-030-fertig', 'intent.md'), old, old);
    utimesSync(join(root, 'intent', 'INT-2026-030-fertig'), old, old);
    const cands = [
      ...scanCopy({ cwd: root, arbeitskopie: 'main', main: true }, nodeReaderFs, cache),
      ...scanCopy({ cwd: wt, arbeitskopie: 'session/x' }, nodeReaderFs, cache),
      ...scanCopy({ cwd: wt2, arbeitskopie: 'session/y' }, nodeReaderFs, cache),
    ];
    // assigned copy is newer and „angenommen" → main still wins
    expect(mergeCandidates(cands, new Map([['INT-2026-030', wt]]))[0].arbeitskopie).toBe('main');
    // newer copy with a foreign word → main wins
    expect(mergeCandidates(cands, new Map())[0].arbeitskopie).toBe('main');
    // order of candidates does not matter
    expect(mergeCandidates([cands[1], cands[2], cands[0]], new Map([['INT-2026-030', wt2]]))[0].arbeitskopie).toBe('main');
    expect(toRow(project, mergeCandidates(cands, new Map([['INT-2026-030', wt]]))[0], undefined)?.phase).toBe('umgesetzt');
  });

  it('INT-2026-024 (FA-13, spec §4): main checkout NOT umgesetzt → the rules of today (assigned copy, else newest); two umgesetzt copies do not outrank an angenommen main', () => {
    const wt = join(root, 'wt');
    const wt2 = join(root, 'wt2');
    mk(root, 'INT-2026-031-offen', { 'intent.md': intentText('angenommen') });
    mk(wt, 'INT-2026-031-offen', { 'intent.md': intentText('umgesetzt') });
    mk(wt2, 'INT-2026-031-offen', { 'intent.md': intentText('umgesetzt') + '\nmehr\n' });
    const old = new Date(Date.now() - 60_000);
    utimesSync(join(root, 'intent', 'INT-2026-031-offen', 'intent.md'), old, old);
    utimesSync(join(root, 'intent', 'INT-2026-031-offen'), old, old);
    const cands = [
      ...scanCopy({ cwd: root, arbeitskopie: 'main', main: true }, nodeReaderFs, cache),
      ...scanCopy({ cwd: wt, arbeitskopie: 'session/x' }, nodeReaderFs, cache),
      ...scanCopy({ cwd: wt2, arbeitskopie: 'session/y' }, nodeReaderFs, cache),
    ];
    // assigned copy wins as today (even though another copy says umgesetzt)
    expect(mergeCandidates(cands, new Map([['INT-2026-031', wt]]))[0].arbeitskopie).toBe('session/x');
    expect(mergeCandidates(cands, new Map([['INT-2026-031', root]]))[0].arbeitskopie).toBe('main');
    // no assignment → newest (a worktree copy), never „main because umgesetzt somewhere"
    expect(mergeCandidates(cands, new Map())[0].arbeitskopie).not.toBe('main');
    // folder only in copies (no main candidate) → today's rule
    const copiesOnly = cands.filter((c) => !c.main);
    expect(mergeCandidates(copiesOnly, new Map([['INT-2026-031', wt]]))[0].arbeitskopie).toBe('session/x');
  });

  it('INT-2026-024 (AK-06, FA-11): toRow with a mark — phase umgesetzt, phaseNote „Abschluss-PR #n", no nextStep, no freigabeDoc, field abschluss on the row', () => {
    mk(root, 'INT-2026-032-pr', { 'intent.md': intentText('angenommen'), 'plan.md': statusDoc('umgesetzt', '— PR #12 offen') });
    const [c] = scanCopy({ cwd: root, arbeitskopie: 'main', main: true }, nodeReaderFs, cache);
    const ohne = toRow(project, c, undefined)!;
    expect(ohne.phase).toBe('pr');
    expect(ohne.phaseNote).toBe('— PR #12 offen'.replace(/^[·—–\-:|\s]+/, ''));
    expect(ohne.nextStep).toBeUndefined();
    expect(ohne.abschluss).toBeUndefined();
    const marke = { prNumber: 90, prUrl: 'https://github.com/x/y/pull/90', zweig: 'chore/INT-2026-032-abschluss', at: '2026-09-22T10:00:00Z' };
    const mit = toRow(project, c, { id: 's', name: 'S', model: 'opus', agentStatus: 'idle', ended: false } as VorhabenSessionRef, { marke })!;
    expect(mit.phase).toBe('umgesetzt');
    expect(mit.phaseNote).toBe('Abschluss-PR #90');
    expect(mit.nextStep).toBeUndefined();
    expect(mit.freigabeDoc).toBeUndefined();
    expect(mit.reviewDoc).toBeUndefined();
    expect(mit.zustand).toBe('wartet');
    expect(mit.abschluss).toEqual({ marke });
    // a mark on a row whose file already reads umgesetzt changes nothing but the note
    mk(root, 'INT-2026-033-fertig', { 'intent.md': intentText('umgesetzt') });
    const [d] = scanCopy({ cwd: root, arbeitskopie: 'main', main: true }, nodeReaderFs, cache).filter((x) => x.intentId === 'INT-2026-033');
    expect(toRow(project, d, undefined, { marke })?.phaseNote).toBe('Abschluss-PR #90');
    // „läuft" and a failure travel too, without touching the phase
    const spec = toRow(project, c, undefined, { laeuft: true, fehler: { message: 'Nicht abgeschlossen: x — y', at: 't' } })!;
    expect(spec.phase).toBe('pr');
    expect(spec.abschluss).toEqual({ laeuft: true, fehler: { message: 'Nicht abgeschlossen: x — y', at: 't' } });
  });
});
