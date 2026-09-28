/**
 * Lokal-Erkennung für den Anrufmodus (INT-2026-025, Plan D9, FA-28, AN-S13).
 *
 * Anrufe (Mikrofon, Vorlesen, Projektinhalt) gehen nur an einen Browser, der
 * auf demselben Mac läuft wie das Backend. Die Loopback-Adresse allein reicht
 * dafür nicht: Cloudflare-Tunnel und `tailscale serve` leiten fremde Geräte
 * über einen lokalen Prozess weiter, die Verbindung kommt also als 127.0.0.1
 * an (`cloud-terminal.routes.ts:6-9`). Deshalb zusätzlich:
 *
 * - `Host` muss `localhost`/`127.0.0.1`/`[::1]` mit dem Backend-Port sein
 *   (Proxys reichen meist den äußeren Hostnamen durch);
 * - keine Weiterleitungs-Header (`x-forwarded-*`, `tailscale-user-login`,
 *   `cf-connecting-ip`);
 * - `Origin` muss die UI selbst sein (Backend-Port, im Dev zusätzlich der
 *   Vite-Port). Das verhindert, dass eine fremde Webseite im selben Browser
 *   per `ws://localhost:3001` Inhalte abgreift (Review F10). Fehlt `Origin`,
 *   gilt die Verbindung als nicht lokal (kein Browser oder unklar).
 * - nur macOS (`darwin`), weil Sprache und Stimme nur dort geprüft sind.
 *
 * Grenze: Browser-Erweiterungen im selben Browser können die Seite selbst
 * lesen; dagegen hilft keine Header-Prüfung.
 */

import type { IncomingHttpHeaders } from 'node:http';

export interface LokalAnfrage {
  socket: { remoteAddress?: string };
  headers: IncomingHttpHeaders;
}

export interface LokalOptionen {
  /** Port des Backends (Host-Header und Origin). */
  port: number;
  /** Weitere erlaubte Origin-Ports (Dev: 5173). */
  devPorts?: number[];
  /** Standard: `process.platform`. */
  plattform?: NodeJS.Platform;
}

const LOOPBACK_ADRESSEN = new Set(['127.0.0.1', '::1', '::ffff:127.0.0.1']);
const LOOPBACK_HOSTS = ['localhost', '127.0.0.1', '[::1]'];
const WEITERLEITUNGS_HEADER = ['x-forwarded-for', 'x-forwarded-host', 'tailscale-user-login', 'cf-connecting-ip'];

function einzelwert(wert: string | string[] | undefined): string | undefined {
  if (Array.isArray(wert)) return wert.length === 1 ? wert[0] : undefined;
  return wert;
}

export function istLokalerBrowser(req: LokalAnfrage, opts: LokalOptionen): boolean {
  const plattform = opts.plattform ?? process.platform;
  if (plattform !== 'darwin') return false;

  const adresse = req.socket.remoteAddress;
  if (!adresse || !LOOPBACK_ADRESSEN.has(adresse)) return false;

  for (const name of WEITERLEITUNGS_HEADER) {
    if (req.headers[name] !== undefined) return false;
  }

  const host = einzelwert(req.headers.host)?.toLowerCase();
  const erlaubteHosts = LOOPBACK_HOSTS.map((h) => `${h}:${opts.port}`);
  if (!host || !erlaubteHosts.includes(host)) return false;

  const origin = einzelwert(req.headers.origin)?.toLowerCase();
  if (!origin) return false;
  const ports = [opts.port, ...(opts.devPorts ?? [])];
  const erlaubteOrigins = ports.flatMap((p) => LOOPBACK_HOSTS.map((h) => `http://${h}:${p}`));
  return erlaubteOrigins.includes(origin);
}
