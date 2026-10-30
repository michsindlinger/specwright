/**
 * INT-2026-038 (2x-Regel): every message type the Vorhaben handler accepts
 * must have its `case` in the switch of websocket.ts — otherwise the handler
 * tests pass and the live message is dropped silently (INT-2026-016
 * `vorhaben:session.assign`, INT-2026-038 `vorhaben:handoff.start`).
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { VORHABEN_MESSAGE_TYPES } from '../../src/server/services/vorhaben-handler.js';

describe('websocket.ts routes every Vorhaben message type', () => {
  it('a `case` per entry of VORHABEN_MESSAGE_TYPES', () => {
    const src = readFileSync(resolve(process.cwd(), 'src', 'server', 'websocket.ts'), 'utf8');
    const fehlend = [...VORHABEN_MESSAGE_TYPES].filter((t) => !src.includes(`case '${t}':`));
    expect(fehlend).toEqual([]);
  });
});
