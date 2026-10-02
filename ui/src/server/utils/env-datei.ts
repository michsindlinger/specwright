/**
 * Lokale Einstellungen aus `ui/.env` (INT-2026-030, Nachtrag): z. B.
 * `SPECWRIGHT_EINGANG=on` für den Eingang von außen, ohne die Variable bei
 * jedem Start mitzugeben.
 *
 * - Fehlt die Datei, passiert nichts (Cloud-Host, frischer Checkout).
 * - Variablen aus der Umgebung des Prozesses gewinnen gegen die Datei.
 * - `ui/.env` ist gitignored; das Repo ist öffentlich (`security.md` §3).
 * - Braucht `process.loadEnvFile` (Node ≥ 20.12); ältere Node-Versionen
 *   überspringen die Datei mit einer Warnung.
 */

import { existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

/** `<ui>/.env` — drei Ebenen über `src/server/utils/`. */
export const ENV_DATEI = join(dirname(fileURLToPath(import.meta.url)), '../../../.env');

/** Lädt die Datei, falls vorhanden. Gibt zurück, ob geladen wurde. Nie ein Wert im Log. */
export function ladeEnvDatei(pfad: string = ENV_DATEI): boolean {
  if (!existsSync(pfad)) return false;
  if (typeof process.loadEnvFile !== 'function') {
    console.warn(`[env] ${pfad} nicht geladen: Node ${process.version} kennt process.loadEnvFile nicht (ab 20.12)`);
    return false;
  }
  try {
    process.loadEnvFile(pfad);
    console.log(`[env] Einstellungen aus ${pfad} geladen`);
    return true;
  } catch (err) {
    console.warn(`[env] ${pfad} nicht lesbar:`, (err as NodeJS.ErrnoException).code ?? 'Fehler');
    return false;
  }
}

ladeEnvDatei();
