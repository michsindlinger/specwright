import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { mkdtempSync, rmSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';

import { WorkspaceStateStore } from '../../src/server/services/workspace-state.js';
import { WorkspaceHandler, type OutboundMessage } from '../../src/server/services/workspace-handler.js';

const key = (p: string): string => p.replace(/\/+$/, '') || '/';

describe('WorkspaceHandler', () => {
  let dir: string;
  let store: WorkspaceStateStore;
  let broadcast: ReturnType<typeof vi.fn<(m: OutboundMessage) => void>>;
  let reply: ReturnType<typeof vi.fn<(m: OutboundMessage) => void>>;
  let handler: WorkspaceHandler;

  const last = (fn: typeof broadcast): Record<string, unknown> =>
    fn.mock.calls[fn.mock.calls.length - 1][0] as Record<string, unknown>;

  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), 'workspace-handler-'));
    store = new WorkspaceStateStore(join(dir, 'ws.json'), {
      pathKey: key,
      pathExists: (p) => ['/a', '/b'].includes(key(p)),
      port: 3111,
    });
    broadcast = vi.fn();
    reply = vi.fn();
    handler = new WorkspaceHandler(store, broadcast);
  });

  afterEach(async () => {
    await store.flush();
    rmSync(dir, { recursive: true, force: true });
  });

  it('ignores non-workspace messages', () => {
    expect(handler.handle({ type: 'cloud-terminal:list' }, reply)).toBe(false);
    expect(reply).not.toHaveBeenCalled();
    expect(broadcast).not.toHaveBeenCalled();
  });

  it('get replies with the state to the requester only', () => {
    expect(handler.handle({ type: 'workspace:get' }, reply)).toBe(true);
    expect(reply).toHaveBeenCalledTimes(1);
    expect(last(reply)).toMatchObject({ type: 'workspace:state', state: { openProjects: [] } });
    expect(broadcast).not.toHaveBeenCalled();
  });

  it('open-project broadcasts the state, then acks the requester with the server id', () => {
    const order: string[] = [];
    broadcast.mockImplementation((m) => order.push(`b:${m.type}`));
    reply.mockImplementation((m) => order.push(`r:${m.type}`));
    handler.handle({ type: 'workspace:open-project', requestId: 'r1', path: '/a/', name: 'A' }, reply);
    expect(order).toEqual(['b:workspace:state', 'r:workspace:ack']);
    expect(last(reply)).toMatchObject({ type: 'workspace:ack', requestId: 'r1', projectId: '/a' });
    expect((last(broadcast).state as { openProjects: unknown[] }).openProjects).toHaveLength(1);
  });

  it('open-project with a bad path errors the requester only', () => {
    handler.handle({ type: 'workspace:open-project', requestId: 'r2', path: '/nope', name: 'x' }, reply);
    expect(broadcast).not.toHaveBeenCalled();
    expect(last(reply)).toMatchObject({ type: 'workspace:error', requestId: 'r2', code: 'INVALID_PATH' });
    handler.handle({ type: 'workspace:open-project', requestId: 'r3' }, reply);
    expect(last(reply)).toMatchObject({ type: 'workspace:error', requestId: 'r3', code: 'INVALID_MESSAGE' });
  });

  it('close-project / remove-recent / set-session-name broadcast only on change', () => {
    handler.handle({ type: 'workspace:open-project', requestId: 'r', path: '/a', name: 'A' }, reply);
    broadcast.mockClear();

    handler.handle({ type: 'workspace:close-project', id: '/a' }, reply);
    expect(broadcast).toHaveBeenCalledTimes(1);
    handler.handle({ type: 'workspace:close-project', id: '/a' }, reply);
    expect(broadcast).toHaveBeenCalledTimes(1);

    handler.handle({ type: 'workspace:set-session-name', sessionId: 's1', name: 'Deploy' }, reply);
    expect(broadcast).toHaveBeenCalledTimes(2);
    expect((last(broadcast).state as { sessionNames: Record<string, string> }).sessionNames).toEqual({ s1: 'Deploy' });
    handler.handle({ type: 'workspace:set-session-name', sessionId: 's1', name: 'Deploy' }, reply);
    expect(broadcast).toHaveBeenCalledTimes(2);
    handler.handle({ type: 'workspace:set-session-name', sessionId: 's1', name: null }, reply);
    expect(broadcast).toHaveBeenCalledTimes(3);

    handler.handle({ type: 'workspace:remove-recent', path: '/a' }, reply);
    expect(broadcast).toHaveBeenCalledTimes(4);
    handler.handle({ type: 'workspace:remove-recent', path: '/a' }, reply);
    expect(broadcast).toHaveBeenCalledTimes(4);
  });

  it('set-session-name without a name is an INVALID_MESSAGE to the requester', () => {
    handler.handle({ type: 'workspace:set-session-name', sessionId: 's1' }, reply);
    expect(last(reply)).toMatchObject({ type: 'workspace:error', code: 'INVALID_MESSAGE' });
    expect(broadcast).not.toHaveBeenCalled();
  });

  it('import broadcasts when it changed something, else replies the unchanged state', () => {
    handler.handle({ type: 'workspace:import', sessionNames: { s1: 'One' } }, reply);
    expect(broadcast).toHaveBeenCalledTimes(1);
    expect(reply).not.toHaveBeenCalled();
    handler.handle({ type: 'workspace:import', sessionNames: { s2: 'Two' } }, reply);
    expect(broadcast).toHaveBeenCalledTimes(1);
    expect(last(reply)).toMatchObject({ type: 'workspace:state' });
    expect((last(reply).state as { sessionNames: Record<string, string> }).sessionNames).toEqual({ s1: 'One' });
  });

  it('onSessionClosed drops the shared name and broadcasts once', () => {
    handler.handle({ type: 'workspace:set-session-name', sessionId: 's1', name: 'Deploy' }, reply);
    broadcast.mockClear();
    expect(handler.onSessionClosed('s1')).toBe(true);
    expect(broadcast).toHaveBeenCalledTimes(1);
    expect(handler.onSessionClosed('s1')).toBe(false);
    expect(broadcast).toHaveBeenCalledTimes(1);
  });
});
