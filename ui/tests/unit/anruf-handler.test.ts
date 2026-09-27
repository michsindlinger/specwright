/**
 * INT-2026-025 (#16, D9, security.md §6): Validierung der `anruf:*`-Nachrichten.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AnrufHandler, pruefeAntwort, pruefeAudio, type AnrufServiceBefehle } from '../../src/server/services/anruf-handler.js';
import { ANRUF_AUDIO_MAX_BASE64, type AnrufServerMessage } from '../../src/shared/types/anruf.protocol.js';
import { int16ZuBase64 } from '../../src/shared/anruf-audio.js';

function fakeService(): { [K in keyof AnrufServiceBefehle]: ReturnType<typeof vi.fn> } {
  return {
    setModus: vi.fn(async () => undefined),
    faehig: vi.fn(),
    annehmen: vi.fn(() => undefined),
    ablehnen: vi.fn(() => undefined),
    spaeter: vi.fn(() => undefined),
    auflegen: vi.fn(() => undefined),
    anrufen: vi.fn(() => undefined),
    erkennen: vi.fn(async () => undefined),
    freigebenAnfragen: vi.fn(async () => undefined),
    senden: vi.fn(() => undefined),
  };
}

let service: ReturnType<typeof fakeService>;
let handler: AnrufHandler;
let replies: AnrufServerMessage[];
const LOKAL = { clientId: 'c1', lokal: true };
const reply = (m: AnrufServerMessage): void => {
  replies.push(m);
};
const flush = async (): Promise<void> => {
  for (let i = 0; i < 5; i++) await Promise.resolve();
};

beforeEach(() => {
  service = fakeService();
  handler = new AnrufHandler(service as unknown as AnrufServiceBefehle);
  replies = [];
});

function codes(): string[] {
  return replies.map((r) => (r.type === 'anruf:error' ? r.code : r.type));
}

describe('AnrufHandler', () => {
  it('ignoriert fremde Typen', () => {
    expect(handler.handle({ type: 'vorhaben:get' }, LOKAL, reply)).toBe(false);
    expect(replies).toEqual([]);
  });

  it('nicht lokale Clients → ANRUF_NICHT_LOKAL, Dienst unberührt', () => {
    for (const type of ['anruf:modus.set', 'anruf:annehmen', 'anruf:erkennen', 'anruf:senden']) {
      expect(handler.handle({ type, an: true, meldungId: 'm1' }, { clientId: 'c9', lokal: false }, reply)).toBe(true);
    }
    expect(codes()).toEqual(Array(4).fill('ANRUF_NICHT_LOKAL'));
    expect(service.setModus).not.toHaveBeenCalled();
    expect(service.annehmen).not.toHaveBeenCalled();
  });

  it('unbekannter anruf:-Typ → INVALID_MESSAGE', () => {
    handler.handle({ type: 'anruf:hack' }, LOKAL, reply);
    expect(codes()).toEqual(['INVALID_MESSAGE']);
  });

  it('modus.set braucht boolean', async () => {
    handler.handle({ type: 'anruf:modus.set', an: 'ja' }, LOKAL, reply);
    handler.handle({ type: 'anruf:modus.set', an: true }, LOKAL, reply);
    await flush();
    expect(codes()).toEqual(['INVALID_MESSAGE']);
    expect(service.setModus).toHaveBeenCalledWith('c1', true);
  });

  it('Fehler des Dienstes gehen an den Absender', async () => {
    service.setModus.mockResolvedValueOnce({ type: 'anruf:error', code: 'ANRUF_NICHT_VERFUEGBAR', message: 'x' });
    service.annehmen.mockReturnValueOnce({ type: 'anruf:error', code: 'ANRUF_BESETZT', message: 'y' });
    handler.handle({ type: 'anruf:modus.set', an: true }, LOKAL, reply);
    handler.handle({ type: 'anruf:annehmen', meldungId: 'm1' }, LOKAL, reply);
    await flush();
    expect(codes().sort()).toEqual(['ANRUF_BESETZT', 'ANRUF_NICHT_VERFUEGBAR']);
  });

  it('faehig prüft Mikrofon-Werte und stimme', () => {
    handler.handle({ type: 'anruf:faehig', mikrofon: 'kaputt', stimme: true }, LOKAL, reply);
    handler.handle({ type: 'anruf:faehig', mikrofon: 'verweigert', stimme: 1 }, LOKAL, reply);
    handler.handle({ type: 'anruf:faehig', mikrofon: 'ok', stimme: true }, LOKAL, reply);
    expect(codes()).toEqual(['INVALID_MESSAGE', 'INVALID_MESSAGE']);
    expect(service.faehig).toHaveBeenCalledWith('c1', 'ok', true);
  });

  it('meldungId: String nach Muster, sonst INVALID_MESSAGE', () => {
    for (const meldungId of [undefined, 42, '', '../x', 'a'.repeat(101), 'm 1']) {
      handler.handle({ type: 'anruf:annehmen', meldungId }, LOKAL, reply);
    }
    expect(codes()).toEqual(Array(6).fill('INVALID_MESSAGE'));
    handler.handle({ type: 'anruf:annehmen', meldungId: '0f9c-uuid_1' }, LOKAL, reply);
    handler.handle({ type: 'anruf:ablehnen', meldungId: 'm1' }, LOKAL, reply);
    handler.handle({ type: 'anruf:spaeter', meldungId: 'm1' }, LOKAL, reply);
    handler.handle({ type: 'anruf:auflegen', meldungId: 'm1' }, LOKAL, reply);
    handler.handle({ type: 'anruf:freigeben.anfragen', meldungId: 'm1' }, LOKAL, reply);
    expect(service.annehmen).toHaveBeenCalledWith('c1', '0f9c-uuid_1');
    expect(service.ablehnen).toHaveBeenCalledWith('c1', 'm1');
    expect(service.spaeter).toHaveBeenCalledWith('c1', 'm1');
    expect(service.auflegen).toHaveBeenCalledWith('c1', 'm1');
    expect(service.freigebenAnfragen).toHaveBeenCalledWith('c1', 'm1');
  });

  it('anrufen braucht eine gültige Sitzungs-ID', () => {
    handler.handle({ type: 'anruf:anrufen', sessionId: 'x' }, LOKAL, reply);
    handler.handle({ type: 'anruf:anrufen', sessionId: 'cloud-1-2' }, LOKAL, reply);
    expect(codes()).toEqual(['INVALID_MESSAGE']);
    expect(service.anrufen).toHaveBeenCalledWith('c1', 'cloud-1-2');
  });

  it('erkennen: gültiges Base64 → Int16Array; ungültig, leer oder zu groß → INVALID_MESSAGE', () => {
    const pcm = new Int16Array([1, -2, 300, -32768]);
    handler.handle({ type: 'anruf:erkennen', meldungId: 'm1', audio: int16ZuBase64(pcm) }, LOKAL, reply);
    expect(service.erkennen).toHaveBeenCalledTimes(1);
    const arg = service.erkennen.mock.calls[0][2] as Int16Array;
    expect(Array.from(arg)).toEqual([1, -2, 300, -32768]);

    for (const audio of [undefined, '', '@@@@', 'abc', 'A'.repeat(ANRUF_AUDIO_MAX_BASE64 + 4), 12]) {
      handler.handle({ type: 'anruf:erkennen', meldungId: 'm1', audio }, LOKAL, reply);
    }
    expect(codes()).toEqual(Array(6).fill('INVALID_MESSAGE'));
    expect(service.erkennen).toHaveBeenCalledTimes(1);
  });

  it('senden: Antwort-Union wird geprüft', () => {
    handler.handle({ type: 'anruf:senden', meldungId: 'm1', antwort: { art: 'freigeben' } }, LOKAL, reply);
    handler.handle({ type: 'anruf:senden', meldungId: 'm1', antwort: { art: 'loeschen' } }, LOKAL, reply);
    expect(codes()).toEqual(['INVALID_MESSAGE']);
    expect(service.senden).toHaveBeenCalledWith('c1', 'm1', { art: 'freigeben' });
  });
});

describe('pruefeAntwort', () => {
  it('nimmt gültige Antworten', () => {
    expect(pruefeAntwort({ art: 'text', text: 'weiter' })).toEqual({ art: 'text', text: 'weiter' });
    expect(pruefeAntwort({ art: 'ueberarbeiten', text: 'kürzer' })).toEqual({ art: 'ueberarbeiten', text: 'kürzer' });
    expect(pruefeAntwort({ art: 'freigeben', extra: 1 })).toEqual({ art: 'freigeben' });
    expect(pruefeAntwort({ art: 'rueckfrage', antworten: [{ nummern: [1, 3] }, { nummern: [], eigene: 'Türkis' }] })).toEqual({
      art: 'rueckfrage',
      antworten: [{ nummern: [1, 3] }, { nummern: [], eigene: 'Türkis' }],
    });
  });

  it('lehnt ungültige ab', () => {
    const falsch: unknown[] = [
      null,
      [],
      'text',
      { art: 'text' },
      { art: 'text', text: '   ' },
      { art: 'text', text: 'x'.repeat(10_001) },
      { art: 'ueberarbeiten', text: 5 },
      { art: 'rueckfrage', antworten: [] },
      { art: 'rueckfrage', antworten: Array(5).fill({ nummern: [1] }) },
      { art: 'rueckfrage', antworten: [{ nummern: [0] }] },
      { art: 'rueckfrage', antworten: [{ nummern: [1.5] }] },
      { art: 'rueckfrage', antworten: [{ nummern: [8] }] },
      { art: 'rueckfrage', antworten: [{ nummern: [1, 1] }] },
      { art: 'rueckfrage', antworten: [{ nummern: [] }] },
      { art: 'rueckfrage', antworten: [{ nummern: [1], eigene: '' }] },
      { art: 'rueckfrage', antworten: ['1'] },
    ];
    for (const f of falsch) expect(pruefeAntwort(f)).toBeUndefined();
  });
});

describe('pruefeAudio', () => {
  it('Grenze ANRUF_AUDIO_MAX_BASE64', () => {
    expect(pruefeAudio('AAAA')).toBeInstanceOf(Int16Array);
    expect(pruefeAudio('A'.repeat(ANRUF_AUDIO_MAX_BASE64 + 4))).toBeUndefined();
    expect(pruefeAudio('AA==')).toBeUndefined(); // ein Byte → kein Sample
  });
});
