import { describe, it, expect, afterEach } from 'vitest';
import { mkdtempSync, rmSync, writeFileSync } from 'fs';
import { join, resolve } from 'path';
import { tmpdir } from 'os';
import { ladeEnvDatei, ENV_DATEI } from '../../src/server/utils/env-datei.js';

describe('ladeEnvDatei() — ui/.env (INT-2026-030, Nachtrag)', () => {
  const dir = mkdtempSync(join(tmpdir(), 'env-datei-'));
  const namen = ['SW_TEST_NEU', 'SW_TEST_SHELL'];

  afterEach(() => {
    for (const n of namen) delete process.env[n];
  });

  it('zeigt auf ui/.env', () => {
    expect(ENV_DATEI).toBe(resolve(process.cwd(), '.env'));
  });

  it('fehlende Datei → nichts geladen, kein Fehler', () => {
    expect(ladeEnvDatei(join(dir, 'gibt-es-nicht.env'))).toBe(false);
  });

  it('setzt neue Variablen; Werte aus der Umgebung gewinnen', () => {
    const pfad = join(dir, 'a.env');
    writeFileSync(pfad, 'SW_TEST_NEU=on\nSW_TEST_SHELL=datei\n');
    process.env.SW_TEST_SHELL = 'shell';
    expect(ladeEnvDatei(pfad)).toBe(true);
    expect(process.env.SW_TEST_NEU).toBe('on');
    expect(process.env.SW_TEST_SHELL).toBe('shell');
    rmSync(dir, { recursive: true, force: true });
  });
});
