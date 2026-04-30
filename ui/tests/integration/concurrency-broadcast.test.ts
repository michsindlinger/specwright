/**
 * Integration: Claude concurrency state broadcast.
 *
 * Verifies the wiring between ProjectConcurrencyGate.onStateChange and the
 * WebSocket broadcast layer:
 *   - Gate mutation → all connected clients receive `claude.concurrency.state`
 *   - New client connection → receives initial state immediately
 *   - Shutdown → unsubscribe stops further broadcasts
 *
 * Uses a minimal real WebSocketServer (no full WebSocketHandler stack) to
 * exercise the same subscription pattern WebSocketHandler uses. Heavyweight
 * services (ProjectManager, PreviewWatcher, etc.) are out of scope here —
 * those are covered by their own tests.
 */
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { createServer, type Server } from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import { AddressInfo } from 'net';
import { ProjectConcurrencyGate } from '../../src/server/services/project-concurrency-gate.js';

interface BroadcastMessage {
  type: string;
  state?: { running: number; max: number; waiting: number };
  timestamp?: string;
}

/** Mirrors the wiring in WebSocketHandler.setupConcurrencyBroadcast + setupConnectionHandler. */
function setupConcurrencyServer(server: Server): { wss: WebSocketServer; unsubscribe: () => void } {
  const wss = new WebSocketServer({ server });

  wss.on('connection', (ws) => {
    // Mirrors initial sync send in setupConnectionHandler
    ws.send(JSON.stringify({
      type: 'claude.concurrency.state',
      state: ProjectConcurrencyGate.getCurrentState(),
      timestamp: new Date().toISOString(),
    }));
  });

  const unsubscribe = ProjectConcurrencyGate.onStateChange((state) => {
    const msg = JSON.stringify({
      type: 'claude.concurrency.state',
      state,
      timestamp: new Date().toISOString(),
    });
    wss.clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(msg);
      }
    });
  });

  return { wss, unsubscribe };
}

async function connectClient(port: number): Promise<{ ws: WebSocket; messages: BroadcastMessage[] }> {
  const ws = new WebSocket(`ws://127.0.0.1:${port}`);
  const messages: BroadcastMessage[] = [];
  ws.on('message', (data) => {
    messages.push(JSON.parse(data.toString()) as BroadcastMessage);
  });
  await new Promise<void>((resolve, reject) => {
    ws.once('open', () => resolve());
    ws.once('error', reject);
  });
  return { ws, messages };
}

async function flushNetwork(): Promise<void> {
  // Allow a single event-loop turn so server-side sends propagate to client buffers
  await new Promise<void>((res) => setTimeout(res, 20));
}

describe('Claude concurrency broadcast — integration', () => {
  let server: Server;
  let wss: WebSocketServer;
  let unsubscribe: () => void;
  let port: number;

  beforeEach(async () => {
    ProjectConcurrencyGate.resetForTests();
    server = createServer();
    const wired = setupConcurrencyServer(server);
    wss = wired.wss;
    unsubscribe = wired.unsubscribe;
    await new Promise<void>((res) => server.listen(0, '127.0.0.1', () => res()));
    port = (server.address() as AddressInfo).port;
  });

  afterEach(async () => {
    unsubscribe();
    wss.clients.forEach((c) => c.terminate());
    await new Promise<void>((res) => wss.close(() => res()));
    await new Promise<void>((res) => server.close(() => res()));
  });

  it('broadcasts state change to all connected clients', async () => {
    const a = await connectClient(port);
    const b = await connectClient(port);
    await flushNetwork();

    // Drop initial-sync messages from inspection
    a.messages.length = 0;
    b.messages.length = 0;

    await ProjectConcurrencyGate.acquireGlobalOnly();
    await flushNetwork();

    expect(a.messages).toHaveLength(1);
    expect(b.messages).toHaveLength(1);
    expect(a.messages[0]).toMatchObject({
      type: 'claude.concurrency.state',
      state: { running: 1, max: ProjectConcurrencyGate.globalMax, waiting: 0 },
    });
    expect(b.messages[0]).toMatchObject({
      type: 'claude.concurrency.state',
      state: { running: 1 },
    });

    a.ws.close();
    b.ws.close();
  });

  it('new client receives initial state on connect', async () => {
    // Pre-fill state before client connects
    await ProjectConcurrencyGate.acquireGlobalOnly();
    await ProjectConcurrencyGate.acquireGlobalOnly();

    const c = await connectClient(port);
    await flushNetwork();

    const initial = c.messages.find(m => m.type === 'claude.concurrency.state');
    expect(initial).toBeDefined();
    expect(initial!.state).toMatchObject({ running: 2, max: ProjectConcurrencyGate.globalMax, waiting: 0 });

    c.ws.close();
  });

  it('release broadcasts updated running count', async () => {
    await ProjectConcurrencyGate.acquireGlobalOnly();

    const c = await connectClient(port);
    await flushNetwork();
    c.messages.length = 0;

    ProjectConcurrencyGate.releaseGlobalOnly();
    await flushNetwork();

    expect(c.messages).toHaveLength(1);
    expect(c.messages[0].state).toMatchObject({ running: 0 });

    c.ws.close();
  });

  it('unsubscribe stops further broadcasts (shutdown contract)', async () => {
    const c = await connectClient(port);
    await flushNetwork();
    c.messages.length = 0;

    unsubscribe();

    await ProjectConcurrencyGate.acquireGlobalOnly();
    await flushNetwork();

    expect(c.messages).toHaveLength(0);

    c.ws.close();
  });
});
