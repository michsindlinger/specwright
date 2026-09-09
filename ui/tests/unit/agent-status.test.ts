import { describe, it, expect } from 'vitest';
import { bumpsActivity, isUnblockingInput, reduceAgentStatus } from '../../src/server/services/agent-status.js';
import type { CloudTerminalAgentEvent, CloudTerminalAgentStatus } from '../../src/shared/types/cloud-terminal.protocol.js';

const ALL: CloudTerminalAgentStatus[] = ['unknown', 'idle', 'working', 'blocked', 'error', 'done'];

describe('reduceAgentStatus()', () => {
  it('unconditional transitions ignore the previous status', () => {
    const table: Array<[CloudTerminalAgentEvent, CloudTerminalAgentStatus]> = [
      ['session-start', 'idle'],
      ['prompt-submitted', 'working'],
      ['blocked', 'blocked'],
      ['unblocked', 'working'],
      ['stop', 'done'],
      ['stop-failure', 'error'],
    ];
    for (const [event, expected] of table) {
      for (const prev of ALL) expect(reduceAgentStatus(prev, event)).toBe(expected);
    }
  });

  it('user-input only unblocks', () => {
    for (const prev of ALL) {
      expect(reduceAgentStatus(prev, 'user-input')).toBe(prev === 'blocked' ? 'working' : prev);
    }
  });

  it('idle-prompt only unsticks working (never shortens done)', () => {
    for (const prev of ALL) {
      expect(reduceAgentStatus(prev, 'idle-prompt')).toBe(prev === 'working' ? 'idle' : prev);
    }
  });

  it('idle-timeout only ages done', () => {
    for (const prev of ALL) {
      expect(reduceAgentStatus(prev, 'idle-timeout')).toBe(prev === 'done' ? 'idle' : prev);
    }
  });
});

describe('bumpsActivity()', () => {
  it('decay events are not activity', () => {
    expect(bumpsActivity('idle-prompt')).toBe(false);
    expect(bumpsActivity('idle-timeout')).toBe(false);
    for (const e of ['session-start', 'prompt-submitted', 'blocked', 'unblocked', 'stop', 'stop-failure', 'user-input'] as const) {
      expect(bumpsActivity(e)).toBe(true);
    }
  });
});

describe('isUnblockingInput()', () => {
  it('accepts Enter anywhere (typed or pasted), single answer keys and ESC', () => {
    for (const data of ['\r', '\n', 'yes\r', 'y', 'n', 'Y', '2', '0', '\x1b']) {
      expect(isUnblockingInput(data)).toBe(true);
    }
  });

  it('rejects navigation keys, Tab, plain text and empty input', () => {
    for (const data of ['\x1b[A', '\x1b[B', '\t', 'yes', 'ab', '', ' ']) {
      expect(isUnblockingInput(data)).toBe(false);
    }
  });
});
