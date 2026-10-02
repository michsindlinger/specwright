import { describe, it, expect } from 'vitest';
import type { IncomingHttpHeaders } from 'node:http';
import {
  istBerechtigt,
  bereinigeSatz,
  bildeTitel,
  satzHash,
  GRUND,
  EINGANG_TOKEN_HEADER,
} from '../../src/server/services/eingang-regeln.js';

const TOKEN = 'a'.repeat(64);
const PORT = 3001;
const opts = { port: PORT, token: TOKEN, schalter: 'on', plattform: 'darwin' as const };

function req(headers: IncomingHttpHeaders, remoteAddress = '127.0.0.1') {
  return { socket: { remoteAddress }, headers };
}
const OK: IncomingHttpHeaders = { host: 'localhost:3001', [EINGANG_TOKEN_HEADER]: TOKEN };

describe('istBerechtigt() — D2, FA-12, FA-19', () => {
  it('lokal, ohne Origin, mit Geheimnis → berechtigt', () => {
    expect(istBerechtigt(req(OK), opts)).toBe(true);
  });

  it('Abschalter: fehlt, off, ON → nicht berechtigt (AN-S11)', () => {
    for (const schalter of [undefined, 'off', 'ON', '1', 'true']) {
      expect(istBerechtigt(req(OK), { ...opts, schalter })).toBe(false);
    }
  });

  it('Linux (Cloud-Host) → nicht berechtigt (NZ-04)', () => {
    expect(istBerechtigt(req(OK), { ...opts, plattform: 'linux' })).toBe(false);
  });

  it('fremde Adresse, Weiterleitung, fremder Host → nicht berechtigt (EK-03)', () => {
    expect(istBerechtigt(req(OK, '192.168.1.5'), opts)).toBe(false);
    for (const name of ['x-forwarded-for', 'x-forwarded-host', 'cf-connecting-ip', 'tailscale-user-login']) {
      expect(istBerechtigt(req({ ...OK, [name]: '100.64.0.2' }), opts)).toBe(false);
    }
    expect(istBerechtigt(req({ ...OK, host: 'mac.tailnet.ts.net' }), opts)).toBe(false);
  });

  it('mit Origin (Browser) → nicht berechtigt, auch mit der UI-Origin', () => {
    expect(istBerechtigt(req({ ...OK, origin: 'http://localhost:3001' }), opts)).toBe(false);
    expect(istBerechtigt(req({ ...OK, origin: 'https://evil.example' }), opts)).toBe(false);
  });

  it('Geheimnis falsch, fehlt, doppelt oder nicht im Speicher → nicht berechtigt', () => {
    expect(istBerechtigt(req({ ...OK, [EINGANG_TOKEN_HEADER]: 'b'.repeat(64) }), opts)).toBe(false);
    expect(istBerechtigt(req({ host: 'localhost:3001' }), opts)).toBe(false);
    expect(istBerechtigt(req({ ...OK, [EINGANG_TOKEN_HEADER]: [TOKEN, TOKEN] }), opts)).toBe(false);
    expect(istBerechtigt(req(OK), { ...opts, token: undefined })).toBe(false);
    expect(istBerechtigt(req(OK), { ...opts, token: '' })).toBe(false);
  });
});

describe('bereinigeSatz() — B-03, AN-S05, AN-S06, FA-14', () => {
  it('Zeilenumbrüche und Tabs → ein Leerzeichen, mehrere Leerzeichen bleiben', () => {
    expect(bereinigeSatz('eins\nzwei\r\ndrei\rvier\tfünf').satz).toBe('eins zwei drei vier fünf');
    expect(bereinigeSatz('a  b').satz).toBe('a  b');
  });

  it('Escape-Sequenzen und Steuerzeichen werden entfernt', () => {
    expect(bereinigeSatz('\u001b[31mrot\u001b[0m').satz).toBe('rot');
    expect(bereinigeSatz('\u001b]0;titel\u0007text').satz).toBe('text');
    expect(bereinigeSatz('a\u0000b\u0007c\u007fd\u0085e').satz).toBe('abcde');
    expect(bereinigeSatz('\u001b[200~paste\u001b[201~').satz).toBe('paste');
  });

  it('trimmt; leer oder kein Text → Satz fehlt', () => {
    expect(bereinigeSatz('  hallo  ').satz).toBe('hallo');
    expect(bereinigeSatz('   ').grund).toBe(GRUND.satzLeer);
    expect(bereinigeSatz('\n\t\u001b[0m').grund).toBe(GRUND.satzLeer);
    expect(bereinigeSatz(undefined).grund).toBe(GRUND.satzLeer);
    expect(bereinigeSatz(42).grund).toBe(GRUND.satzLeer);
  });

  it('500 Zeichen ok, 501 → zu lang, nichts gekürzt; gezählt in Codepoints', () => {
    expect(bereinigeSatz('x'.repeat(500)).grund).toBeUndefined();
    const lang = bereinigeSatz('x'.repeat(501));
    expect(lang.grund).toBe(GRUND.satzZuLang);
    expect(lang.satz).toHaveLength(501);
    expect(bereinigeSatz('👋'.repeat(500)).grund).toBeUndefined();
  });

  it('beginnt mit / → abgewiesen; - vorn ist erlaubt (FA-20)', () => {
    expect(bereinigeSatz('/clear').grund).toBe(GRUND.satzSlash);
    expect(bereinigeSatz('  /logout').grund).toBe(GRUND.satzSlash);
    expect(bereinigeSatz('-p foo').grund).toBeUndefined();
    expect(bereinigeSatz('Sag "Hallo" und \'Tschüss\'').grund).toBeUndefined();
  });
});

describe('bildeTitel() — B-09, AN-S12, FA-11', () => {
  it('kurzer Satz ist der Titel', () => {
    expect(bildeTitel('Tests ansehen').titel).toBe('Tests ansehen');
    expect(bildeTitel('x'.repeat(40)).titel).toBe('x'.repeat(40));
  });

  it('langer Satz → Wortgrenze + …, gesamt ≤ 40', () => {
    const satz = 'Kreis Lippe, schau dir die fehlschlagenden Tests im Modul an';
    const { titel } = bildeTitel(satz);
    expect(titel).toBe('Kreis Lippe, schau dir die…');
    expect(Array.from(titel!).length).toBeLessThanOrEqual(40);
  });

  it('einzelnes langes Wort → hart auf 39 + …', () => {
    const { titel } = bildeTitel('y'.repeat(60));
    expect(titel).toBe('y'.repeat(39) + '…');
  });

  it('mitgeschickter Titel: bereinigt, 1–40, sonst Absage (nicht gekürzt)', () => {
    expect(bildeTitel('satz', 'Mein\nTitel').titel).toBe('Mein Titel');
    expect(bildeTitel('satz', 'z'.repeat(40)).titel).toBe('z'.repeat(40));
    expect(bildeTitel('satz', 'z'.repeat(41)).grund).toBe(GRUND.titelUngueltig);
    expect(bildeTitel('satz', '  ').grund).toBe(GRUND.titelUngueltig);
    expect(bildeTitel('satz', 7).grund).toBe(GRUND.titelUngueltig);
    expect(bildeTitel('satz', null).titel).toBe('satz');
  });
});

describe('satzHash()', () => {
  it('SHA-256 hex, stabil und satzgenau', () => {
    expect(satzHash('a')).toMatch(/^[0-9a-f]{64}$/);
    expect(satzHash('a')).toBe(satzHash('a'));
    expect(satzHash('a')).not.toBe(satzHash('a '));
  });
});
