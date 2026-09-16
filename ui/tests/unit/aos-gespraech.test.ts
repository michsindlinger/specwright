// @vitest-environment happy-dom
/**
 * INT-2026-007 stage 1 UI: the Gespräch next to the Vorhaben page — head,
 * Verlauf (nutzer/claude/arbeit/dialog, FA-01/FA-03/FA-04/FA-05), input
 * states (FA-06/FA-15, Ablauf L), hint card for open dialogs (FA-21),
 * „Im Terminal öffnen" → `open-terminal-session` (FA-22), not available
 * (FA-07), queued entries (AN-S09/E15), session switch (AN-S04).
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Beitrag, GespraechSnapshot } from '../../src/shared/types/gespraech.protocol.js';
import type { ProtokollEintrag, VorhabenRow } from '../../src/shared/types/vorhaben.protocol.js';

vi.mock('../../frontend/src/gateway.js', () => ({
  gateway: { send: vi.fn(), on: vi.fn(), off: vi.fn(), getConnectionStatus: () => false, isConnecting: () => false, getProjectPath: vi.fn() },
}));

type Listener = (snapshot: GespraechSnapshot | null, fehler: string | null) => void;
const listeners = new Map<string, Listener>();
const subscribe = vi.fn((sessionId: string, l: Listener) => {
  listeners.set(sessionId, l);
  l(null, null);
  return () => listeners.delete(sessionId);
});
const send = vi.fn(async () => ({ ok: true as const, entry: { id: 'pe1' } as ProtokollEintrag, status: 'gesendet' as const }));
const discard = vi.fn();
vi.mock('../../frontend/src/services/gespraech.service.js', () => ({
  gespraechService: { subscribe: (...a: unknown[]) => subscribe(...(a as [string, Listener])), send: (...a: unknown[]) => send(...(a as [])), discard: (...a: unknown[]) => discard(...(a as [])) },
}));

const settle = async (el: HTMLElement & { updateComplete: Promise<boolean> }): Promise<void> => {
  for (let i = 0; i < 4; i++) {
    await el.updateComplete;
    await new Promise((r) => setTimeout(r, 2));
  }
};

const row = (o: Partial<VorhabenRow> = {}): VorhabenRow => ({
  projectId: 'p', projectPath: '/p', projectName: 'P', intentId: 'INT-2026-003', dirName: 'INT-2026-003-x', cwd: '/p', arbeitskopie: 'main', titel: 'T',
  phase: 'spec', phaseNote: '', bypass: false, zustand: 'wartet', zustandDetail: '', reviewDoc: 'spec', step: 'spec',
  docs: [{ key: 'spec', file: 'spec.md', mtimeMs: 1000 }], designFiles: [], hasBuildStand: false, lastChangedAt: '', lastChangedMs: 0,
  session: { id: 'cloud-1-1', name: 'spec INT-2026-003', model: 'opus', agentStatus: 'done' },
  ...o,
});

const snap = (beitraege: Beitrag[], o: Partial<GespraechSnapshot> = {}): GespraechSnapshot => ({
  sessionId: 'cloud-1-1', sitzung: 'aktiv', verlauf: { status: 'ok', mitgelesenAb: '2026-09-16T07:40:00.000Z' }, beitraege, eingereiht: 0, ...o,
});

async function gespraech(r: VorhabenRow = row(), protocol: ProtokollEintrag[] = []) {
  await import('../../frontend/src/components/vorhaben/aos-gespraech.js');
  const el = document.createElement('aos-gespraech');
  el.row = r;
  el.protocol = protocol;
  document.body.appendChild(el);
  await settle(el);
  return el;
}

const push = async (el: HTMLElement & { updateComplete: Promise<boolean> }, s: GespraechSnapshot | null, fehler: string | null = null, sessionId = 'cloud-1-1'): Promise<void> => {
  listeners.get(sessionId)!(s, fehler);
  await settle(el);
};

const text = (el: Element | null): string => (el?.textContent ?? '').replace(/\s+/g, ' ').trim();

describe('aos-gespraech — head and Verlauf (FA-01, FA-03, FA-04, FA-05)', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
    listeners.clear();
    subscribe.mockClear();
    send.mockClear();
    discard.mockClear();
  });

  it('subscribes to the assigned session and shows name, working copy, state and the Beiträge in order', async () => {
    const el = await gespraech();
    expect(subscribe).toHaveBeenCalledWith('cloud-1-1', expect.any(Function));
    expect(text(el.querySelector('.gespraech-notiz'))).toBe('Gespräch wird geladen …');
    await push(el, snap([
      { id: 'u1', at: '2026-09-16T07:41:00.000Z', art: 'nutzer', text: '/specwright:spec INT-2026-003', quelle: 'terminal' },
      { id: 'w1', at: '2026-09-16T07:41:05.000Z', art: 'arbeit', werkzeuge: 12, dauerMs: 160000, laeuft: false },
      { id: 'c1', at: '2026-09-16T07:44:00.000Z', art: 'claude', text: 'Spec-Entwurf steht.\n\n- Punkt **eins**\n- Punkt zwei' },
      { id: 'w2', art: 'arbeit', werkzeuge: 3, dauerMs: 35000, laeuft: true },
    ]));
    const kopf = el.querySelector('.gespraech-kopf')!;
    expect(text(kopf)).toContain('Gespräch mit spec INT-2026-003');
    expect(text(kopf)).toContain('main');
    expect(text(kopf.querySelector('.gespraech-zustand'))).toBe('wartet');
    const beitraege = [...el.querySelectorAll('aos-gespraech-beitrag')];
    expect(beitraege.length).toBe(4);
    expect(beitraege[0].querySelector('.gespraech-msg.nutzer')).not.toBeNull();
    expect(text(beitraege[0].querySelector('.gespraech-who'))).toContain('Terminal');
    expect(text(beitraege[1].querySelector('.gespraech-arbeit'))).toBe('arbeitet · 12 Werkzeugaufrufe · 2:40 min');
    // FA-05: Markdown rendered, no tool content
    expect(beitraege[2].querySelector('.markdown-body strong')?.textContent).toBe('eins');
    expect(beitraege[2].querySelectorAll('.markdown-body li').length).toBe(2);
    expect(text(beitraege[3].querySelector('.gespraech-arbeit'))).toBe('arbeitet … · 3 Werkzeugaufrufe · seit 0:35 min');
    // input: session waits → Senden
    expect(text(el.querySelector('.gespraech-eingabe-zeile button'))).toBe('Senden');
    el.remove();
  });

  it('„Im Terminal öffnen ↗" dispatches open-terminal-session on document with the session id (FA-21/FA-22)', async () => {
    const el = await gespraech();
    const seen: string[] = [];
    const onOpen = (e: Event): void => {
      seen.push((e as CustomEvent<{ sessionId: string }>).detail.sessionId);
    };
    document.addEventListener('open-terminal-session', onOpen);
    ([...el.querySelectorAll('.gespraech-kopf button')].find((b) => b.textContent?.includes('Im Terminal öffnen')) as HTMLButtonElement).click();
    document.removeEventListener('open-terminal-session', onOpen);
    expect(seen).toEqual(['cloud-1-1']);
    el.remove();
  });

  it('follows a new assigned session: unsubscribes the old one and starts a fresh Verlauf (AN-S04)', async () => {
    const el = await gespraech();
    await push(el, snap([{ id: 'c1', at: '2026-09-16T07:44:00.000Z', art: 'claude', text: 'alt' }]));
    expect(el.querySelectorAll('aos-gespraech-beitrag').length).toBe(1);
    el.row = row({ session: { id: 'cloud-1-2', name: 'plan INT-2026-003', model: 'opus', agentStatus: 'working' } });
    await settle(el);
    expect(listeners.has('cloud-1-1')).toBe(false);
    expect(subscribe).toHaveBeenLastCalledWith('cloud-1-2', expect.any(Function));
    expect(el.querySelectorAll('aos-gespraech-beitrag').length).toBe(0);
    expect(text(el.querySelector('.gespraech-kopf b'))).toBe('plan INT-2026-003');
    el.remove();
  });
});

describe('aos-gespraech — input states (FA-06, FA-15, Ablauf L) and sending', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
    listeners.clear();
    subscribe.mockClear();
    send.mockClear();
    discard.mockClear();
  });

  const button = (el: Element): HTMLButtonElement | null => el.querySelector('.gespraech-eingabe-zeile button');

  it('waiting session: Enter sends, Shift+Enter does not, the field is cleared after a successful send', async () => {
    const el = await gespraech();
    await push(el, snap([]));
    const ta = el.querySelector('textarea')!;
    expect(ta.disabled).toBe(false);
    ta.value = 'Leg sie vor.';
    ta.dispatchEvent(new Event('input'));
    ta.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', shiftKey: true, bubbles: true }));
    expect(send).not.toHaveBeenCalled();
    ta.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
    await settle(el);
    expect(send).toHaveBeenCalledWith('p', 'INT-2026-003', 'Leg sie vor.');
    expect(el.querySelector('aos-gespraech-eingabe')!.value).toBe('');
    el.remove();
  });

  it('working session: button reads „Einreihen" (AN-S09); a refusal shows the reason and keeps the text', async () => {
    send.mockResolvedValueOnce({ ok: false, grund: 'warteschlange_voll', message: 'schon drei Eingaben eingereiht — warten' } as never);
    const el = await gespraech(row({ zustand: 'arbeitet', session: { id: 'cloud-1-1', name: 'n', model: 'opus', agentStatus: 'working' } }));
    await push(el, snap([]));
    expect(text(button(el))).toBe('Einreihen');
    expect(text(el.querySelector('.gespraech-kopf .gespraech-zustand'))).toBe('arbeitet');
    const ta = el.querySelector('textarea')!;
    ta.value = 'noch was';
    ta.dispatchEvent(new Event('input'));
    await settle(el);
    button(el)!.click();
    await settle(el);
    expect(text(el.querySelector('.gespraech-fehler'))).toBe('schon drei Eingaben eingereiht — warten');
    expect(el.querySelector('aos-gespraech-eingabe')!.value).toBe('noch was');
    el.remove();
  });

  it('open dialog (Rückfrage / Plan / Berechtigung): field locked, reason in place of the button, Terminal offered (FA-15)', async () => {
    const cases: Array<[VorhabenRow['zustand'], 'rueckfrage' | 'plan' | 'berechtigung' | 'unbekannt', string, string]> = [
      ['wartet_rueckfrage', 'rueckfrage', 'Sitzung wartet auf eine Antwort — die Rückfrage beantworten', 'wartet · Rückfrage'],
      ['wartet_plan', 'plan', 'Sitzung wartet auf die Plan-Entscheidung', 'wartet · Plan-Entscheidung'],
      ['wartet_berechtigung', 'berechtigung', 'Sitzung wartet auf eine Berechtigung — im Terminal antworten', 'wartet · Berechtigung'],
      ['wartet_berechtigung', 'unbekannt', 'Sitzung wartet auf eine Berechtigung — im Terminal antworten', 'wartet · Dialog'],
    ];
    for (const [zustand, blockKind, grund, kopf] of cases) {
      const el = await gespraech(row({ zustand, session: { id: 'cloud-1-1', name: 'n', model: 'opus', agentStatus: 'blocked', blockKind } }));
      await push(el, snap([]));
      expect(el.querySelector('textarea')!.disabled).toBe(true);
      expect(text(el.querySelector('.gespraech-grund'))).toBe(grund);
      expect(text(el.querySelector('.gespraech-kopf .gespraech-zustand'))).toBe(kopf);
      expect([...el.querySelectorAll('.gespraech-eingabe-zeile button')].map((b) => text(b))).toEqual(['Im Terminal öffnen ↗']);
      el.remove();
    }
  });

  it('ended session: „Sitzung beendet — nächsten Schritt starten" with the next-step button; the event reaches the page (Ablauf L)', async () => {
    const el = await gespraech(row({ zustand: 'sitzung_beendet', session: { id: 'cloud-1-1', name: 'spec INT-2026-003', model: 'opus', agentStatus: 'done', ended: true }, nextStep: { step: 'plan', command: '/specwright:plan INT-2026-003', label: 'Plan erstellen' }, lastChangedMs: new Date(2026, 8, 16, 10, 12).getTime() }));
    await push(el, snap([], { sitzung: 'beendet' }));
    expect(text(el.querySelector('.gespraech-kopf .gespraech-zustand'))).toBe('Sitzung beendet 10:12');
    expect(el.querySelector('textarea')!.disabled).toBe(true);
    expect(text(el.querySelector('.gespraech-grund'))).toBe('Sitzung beendet — nächsten Schritt starten');
    const events: string[] = [];
    el.addEventListener('gespraech-next-step', () => events.push('next'));
    ([...el.querySelectorAll('.gespraech-eingabe-zeile button')].find((b) => b.textContent?.includes('Plan erstellen')) as HTMLButtonElement).click();
    expect(events).toEqual(['next']);
    el.remove();
  });

  it('no Vorhaben session: locked with „keine Sitzung" and no subscription', async () => {
    const el = await gespraech(row({ zustand: 'keine_sitzung', session: undefined }));
    expect(subscribe).not.toHaveBeenCalled();
    expect(text(el.querySelector('.gespraech-grund'))).toBe('keine Sitzung zu diesem Vorhaben — nächsten Schritt starten');
    el.remove();
  });
});

describe('aos-gespraech — dialogs, availability, queued entries', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
    listeners.clear();
    discard.mockClear();
  });

  it('open dialog → hint card „Sitzung wartet · … — im Terminal antworten" with tool and „Im Terminal öffnen" (FA-21, stage 1 form)', async () => {
    const el = await gespraech(row({ zustand: 'wartet_berechtigung', session: { id: 'cloud-1-1', name: 'n', model: 'opus', agentStatus: 'blocked', blockKind: 'berechtigung' } }));
    await push(el, snap([
      { id: 'dialog:seq:1', at: '2026-09-16T07:50:00.000Z', art: 'dialog', dialog: { id: 'seq:1', kind: 'berechtigung', zustand: 'offen', quelle: 'hook', tool: 'Bash', detail: 'git push' } },
    ], { offenerDialog: 'seq:1' }));
    const card = el.querySelector('.gespraech-dialog.offen')!;
    expect(text(card.querySelector('.gespraech-dialog-titel'))).toBe('Sitzung wartet · Berechtigung — im Terminal antworten');
    expect(text(card.querySelector('.gespraech-dialog-text'))).toContain('Bash');
    const seen: string[] = [];
    const onOpen = (e: Event): void => {
      seen.push((e as CustomEvent<{ sessionId: string }>).detail.sessionId);
    };
    document.addEventListener('open-terminal-session', onOpen);
    (card.querySelector('button') as HTMLButtonElement).click();
    document.removeEventListener('open-terminal-session', onOpen);
    expect(seen).toEqual(['cloud-1-1']);
    el.remove();
  });

  it('unknown dialog reads „Sitzung zeigt einen Dialog — im Terminal antworten" (FA-10); Rückfrage lists the questions', async () => {
    const el = await gespraech(row({ zustand: 'wartet_berechtigung', session: { id: 'cloud-1-1', name: 'n', model: 'opus', agentStatus: 'blocked', blockKind: 'unbekannt' } }));
    await push(el, snap([
      { id: 'dialog:seq:2', art: 'dialog', dialog: { id: 'seq:2', kind: 'unbekannt', zustand: 'offen', quelle: 'hook' } },
      { id: 'dialog:tu1', art: 'dialog', dialog: { id: 'tu1', kind: 'rueckfrage', zustand: 'offen', quelle: 'hook', questions: [{ question: 'Welche Tiere?', multiSelect: true, options: [{ label: 'Katze' }] }] } },
    ]));
    const cards = [...el.querySelectorAll('.gespraech-dialog.offen')];
    expect(text(cards[0].querySelector('.gespraech-dialog-titel'))).toBe('Sitzung zeigt einen Dialog — im Terminal antworten');
    expect(text(cards[1].querySelector('.gespraech-dialog-titel'))).toBe('Sitzung wartet · Rückfrage — im Terminal antworten');
    expect(text(cards[1].querySelector('.gespraech-dialog-fragen'))).toBe('Welche Tiere?');
    el.remove();
  });

  it('closed dialogs stay as text: „Antwort: …", „Plan: …", expired ones as „nicht beantwortet — Sitzung beendet" (FA-14, Ablauf L)', async () => {
    const el = await gespraech();
    await push(el, snap([
      { id: 'dialog:a', at: '2026-09-16T07:50:00.000Z', art: 'dialog', dialog: { id: 'a', kind: 'rueckfrage', zustand: 'beantwortet', quelle: 'transkript', ergebnis: { durch: 'terminal', answers: { 'Welche Tiere?': 'Katze, Hund' } } } },
      { id: 'dialog:b', at: '2026-09-16T07:51:00.000Z', art: 'dialog', dialog: { id: 'b', kind: 'plan', zustand: 'geschlossen', quelle: 'transkript', ergebnis: { durch: 'ui', plan: { entscheidung: 'aenderungen', text: 'kürzer' } } } },
      { id: 'dialog:c', at: '2026-09-16T07:52:00.000Z', art: 'dialog', dialog: { id: 'c', kind: 'rueckfrage', zustand: 'verfallen', quelle: 'hook' } },
    ]));
    const texte = [...el.querySelectorAll('.gespraech-dialog.geschlossen .gespraech-dialog-text')].map((e) => text(e));
    expect(texte).toEqual(['Antwort: Katze, Hund (im Terminal)', 'Plan: Änderungen gewünscht — kürzer', 'Rückfrage · nicht beantwortet — Sitzung beendet']);
    expect(el.querySelector('.gespraech-dialog.offen')).toBeNull();
    el.remove();
  });

  it('Verlauf not readable → cause, next step, reader hint; input locked with „kein Gespräch — im Terminal öffnen" (FA-07)', async () => {
    const el = await gespraech(row({ nextStep: { step: 'plan', command: '/specwright:plan INT-2026-003', label: 'Plan erstellen' } }));
    await push(el, snap([], { verlauf: { status: 'nicht_verfuegbar', ursache: 'Sitzung vor der Auslieferung gestartet — kein Transkriptpfad bekannt' } }));
    const karte = el.querySelector('.gespraech-karte.fehler')!;
    expect(text(karte)).toContain('Gespräch nicht verfügbar: Sitzung vor der Auslieferung gestartet — kein Transkriptpfad bekannt.');
    expect(text(karte)).toContain('Nächster Schritt: Im Terminal öffnen oder die Sitzung beenden und „Plan erstellen" wählen');
    expect(text(el.querySelector('.gespraech-notiz.rahmen'))).toContain('Anmerkungen und Freigabe im Dokument-Leser funktionieren weiterhin');
    expect(el.querySelector('textarea')!.disabled).toBe(true);
    expect(text(el.querySelector('.gespraech-grund'))).toBe('kein Gespräch — im Terminal öffnen');
    el.remove();
  });

  it('nur_echtzeit shows the history note but keeps sending; unknown session (backend error) shows the cause', async () => {
    const el = await gespraech();
    await push(el, snap([], { verlauf: { status: 'nur_echtzeit', ursache: 'Transkriptformat unbekannt (Version 9.9)', mitgelesenAb: new Date(2026, 8, 16, 9, 40).toISOString() } }));
    expect(text(el.querySelector('.gespraech-notiz'))).toBe('Historie vor 09:40 nicht verfügbar — Transkriptformat unbekannt (Version 9.9)');
    expect(el.querySelector('textarea')!.disabled).toBe(false);
    await push(el, null, 'Sitzung unbekannt');
    expect(text(el.querySelector('.gespraech-karte.fehler'))).toContain('Gespräch nicht verfügbar: Sitzung unbekannt.');
    el.remove();
  });

  it('queued protocol entries show as „eingereiht" with „Verwerfen" → discard (AN-S09, E15); unconfirmed ones as „nicht bestätigt"', async () => {
    const entry = (id: string, status: ProtokollEintrag['status'], sentAt: string): ProtokollEintrag => ({
      id, projectId: 'p', intentId: 'INT-2026-003', art: 'freitext', anzahl: 0, stand: '', sessionId: 'cloud-1-1', sessionName: 'n', text: `text ${id}`, anmerkungen: [], status, sentAt,
    });
    const el = await gespraech(row({ zustand: 'arbeitet', session: { id: 'cloud-1-1', name: 'n', model: 'opus', agentStatus: 'working' } }), [
      entry('q2', 'eingereiht', '2026-09-16T07:56:00.000Z'),
      entry('q1', 'eingereiht', '2026-09-16T07:55:00.000Z'),
      entry('ok', 'angenommen', '2026-09-16T07:50:00.000Z'),
      entry('nb', 'nicht_bestaetigt', '2026-09-16T07:57:00.000Z'),
      { ...entry('fremd', 'eingereiht', '2026-09-16T07:58:00.000Z'), sessionId: 'cloud-9-9' },
    ]);
    await push(el, snap([{ id: 'c1', at: '2026-09-16T07:44:00.000Z', art: 'claude', text: 'x' }], { eingereiht: 2 }));
    const msgs = [...el.querySelectorAll('.gespraech-msg.nutzer')];
    expect(msgs.map((m) => text(m.querySelector('.gespraech-text')))).toEqual(['text q1', 'text q2', 'text nb']);
    expect(text(msgs[0].querySelector('.gespraech-tag'))).toBe('eingereiht — kommt nach dem aktuellen Zug dran');
    expect(text(msgs[2].querySelector('.gespraech-tag'))).toBe('nicht bestätigt — im Terminal prüfen');
    (msgs[1].querySelector('button') as HTMLButtonElement).click();
    expect(discard).toHaveBeenCalledWith('q2');
    expect(msgs[2].querySelector('button')).toBeNull();
    el.remove();
  });
});
