import { describe, it, expect } from 'vitest';
import {
  AGENT_STATUS_LABEL,
  agentStatusClass,
  agentStatusColor,
  agentStatusTitle,
  hasAgentStatus,
  needsAttention,
} from '../../frontend/src/components/terminal/agent-status.js';

describe('agent-status (frontend helpers)', () => {
  it('labels every status, unknown is blank', () => {
    expect(AGENT_STATUS_LABEL.unknown).toBe('');
    expect(AGENT_STATUS_LABEL.blocked).toBe('Wartet auf Eingabe');
    expect(AGENT_STATUS_LABEL.error).toBe('Fehler');
  });

  it('hasAgentStatus: undefined and unknown do not count', () => {
    expect(hasAgentStatus({})).toBe(false);
    expect(hasAgentStatus({ agentStatus: 'unknown' })).toBe(false);
    expect(hasAgentStatus({ agentStatus: 'idle' })).toBe(true);
  });

  it('agentStatusClass: empty for unknown/missing and whenever the PTY is not active', () => {
    expect(agentStatusClass({ status: 'active' })).toBe('');
    expect(agentStatusClass({ status: 'active', agentStatus: 'unknown' })).toBe('');
    expect(agentStatusClass({ status: 'active', agentStatus: 'working' })).toBe('agent-working');
    for (const status of ['paused', 'disconnected', 'error'] as const) {
      expect(agentStatusClass({ status, agentStatus: 'done' })).toBe('');
    }
  });

  it('agentStatusColor mirrors the class rule and returns null to keep the PTY colour', () => {
    expect(agentStatusColor({ status: 'active' })).toBeNull();
    expect(agentStatusColor({ status: 'paused', agentStatus: 'working' })).toBeNull();
    expect(agentStatusColor({ status: 'active', agentStatus: 'blocked' })).toBe('#ff9800');
  });

  it('needsAttention: server status wins once known, regex flag only as fallback', () => {
    expect(needsAttention({ agentStatus: 'blocked' })).toBe(true);
    expect(needsAttention({ agentStatus: 'blocked', needsInput: false })).toBe(true);
    expect(needsAttention({ agentStatus: 'working', needsInput: true })).toBe(false);
    expect(needsAttention({ agentStatus: 'done', needsInput: true })).toBe(false);
    expect(needsAttention({ agentStatus: 'unknown', needsInput: true })).toBe(true);
    expect(needsAttention({ needsInput: true })).toBe(true);
    expect(needsAttention({})).toBe(false);
  });

  it('agentStatusTitle combines label, reason and relative time from epoch ms', () => {
    const now = 1_000_000_000;
    expect(agentStatusTitle({ agentStatus: 'blocked', agentStatusReason: 'Berechtigung: Bash', agentStatusAt: now - 120_000 }, now))
      .toBe('Wartet auf Eingabe: Berechtigung: Bash (vor 2 Min)');
    expect(agentStatusTitle({ agentStatus: 'done', agentStatusAt: now - 5_000 }, now)).toBe('Fertig (gerade eben)');
    expect(agentStatusTitle({ agentStatus: 'working' }, now)).toBe('Arbeitet');
    expect(agentStatusTitle({ agentStatus: 'unknown' }, now)).toBe('');
    expect(agentStatusTitle({}, now)).toBe('');
  });
});
