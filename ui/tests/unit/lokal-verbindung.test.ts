import { describe, it, expect } from 'vitest';
import type { IncomingHttpHeaders } from 'node:http';
import { istLokalerBrowser } from '../../src/server/utils/lokal-verbindung.js';

const PORT = 3001;
const opts = { port: PORT, plattform: 'darwin' as const };

function req(headers: IncomingHttpHeaders, remoteAddress: string | null = '127.0.0.1') {
  return { socket: { remoteAddress: remoteAddress ?? undefined }, headers };
}

const LOKAL: IncomingHttpHeaders = { host: 'localhost:3001', origin: 'http://localhost:3001' };

describe('istLokalerBrowser()', () => {
  it('Loopback + Host + Origin der UI → lokal', () => {
    expect(istLokalerBrowser(req(LOKAL), opts)).toBe(true);
    expect(istLokalerBrowser(req({ host: '127.0.0.1:3001', origin: 'http://127.0.0.1:3001' }, '::ffff:127.0.0.1'), opts)).toBe(true);
    expect(istLokalerBrowser(req({ host: '[::1]:3001', origin: 'http://[::1]:3001' }, '::1'), opts)).toBe(true);
  });

  it('fremde oder fehlende Origin → nicht lokal (Review F10)', () => {
    expect(istLokalerBrowser(req({ ...LOKAL, origin: 'https://evil.example' }), opts)).toBe(false);
    expect(istLokalerBrowser(req({ ...LOKAL, origin: 'http://localhost:8080' }), opts)).toBe(false);
    expect(istLokalerBrowser(req({ ...LOKAL, origin: 'https://localhost:3001' }), opts)).toBe(false);
    expect(istLokalerBrowser(req({ host: 'localhost:3001' }), opts)).toBe(false);
  });

  it('Weiterleitungs-Header → nicht lokal (Tunnel)', () => {
    for (const name of ['x-forwarded-for', 'x-forwarded-host', 'cf-connecting-ip']) {
      expect(istLokalerBrowser(req({ ...LOKAL, [name]: '100.64.0.2' }), opts)).toBe(false);
    }
  });

  it('Tailscale serve (Header, fremder Host) → nicht lokal', () => {
    expect(istLokalerBrowser(req({ ...LOKAL, 'tailscale-user-login': 'michael@example.com' }), opts)).toBe(false);
    expect(istLokalerBrowser(req({ host: 'mac.tailnet.ts.net', origin: 'https://mac.tailnet.ts.net' }), opts)).toBe(false);
  });

  it('LAN-Adresse → nicht lokal', () => {
    expect(istLokalerBrowser(req(LOKAL, '192.168.1.20'), opts)).toBe(false);
    expect(istLokalerBrowser(req(LOKAL, null), opts)).toBe(false);
  });

  it('Host mit anderer IP, anderem Port oder ohne Port → nicht lokal', () => {
    expect(istLokalerBrowser(req({ ...LOKAL, host: '192.168.1.5:3001' }), opts)).toBe(false);
    expect(istLokalerBrowser(req({ ...LOKAL, host: 'localhost:4000' }), opts)).toBe(false);
    expect(istLokalerBrowser(req({ ...LOKAL, host: 'localhost' }), opts)).toBe(false);
  });

  it('andere Plattform → nicht lokal', () => {
    expect(istLokalerBrowser(req(LOKAL), { port: PORT, plattform: 'linux' })).toBe(false);
  });

  it('Dev-Origin 5173 nur mit devPorts', () => {
    const dev = { ...LOKAL, origin: 'http://localhost:5173' };
    expect(istLokalerBrowser(req(dev), opts)).toBe(false);
    expect(istLokalerBrowser(req(dev), { ...opts, devPorts: [5173] })).toBe(true);
  });
});
