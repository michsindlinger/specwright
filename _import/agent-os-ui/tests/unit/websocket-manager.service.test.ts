import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { WebSocket } from 'ws';
import { WebSocketManagerService } from '../../src/server/websocket-manager.service.js';

// Create mock WebSocket
function createMockWebSocket(readyState: number = WebSocket.OPEN): WebSocket {
  const ws = {
    readyState,
    send: vi.fn(),
    close: vi.fn(),
    on: vi.fn(),
    removeListener: vi.fn(),
    // Add other WebSocket properties/methods as needed
  } as unknown as WebSocket;
  return ws;
}

describe('WebSocketManagerService', () => {
  let service: WebSocketManagerService;

  beforeEach(() => {
    service = new WebSocketManagerService();
  });

  afterEach(() => {
    service.shutdown();
  });

  describe('registerConnection', () => {
    it('should register a connection for a project', () => {
      const ws = createMockWebSocket();
      const projectId = '/Users/dev/project-a';

      service.registerConnection(projectId, ws);

      expect(service.hasConnections(projectId)).toBe(true);
      expect(service.getConnectionCount(projectId)).toBe(1);
    });

    it('should allow multiple connections for the same project', () => {
      const ws1 = createMockWebSocket();
      const ws2 = createMockWebSocket();
      const projectId = '/Users/dev/project-a';

      service.registerConnection(projectId, ws1);
      service.registerConnection(projectId, ws2);

      expect(service.getConnectionCount(projectId)).toBe(2);
    });

    it('should track connections for different projects separately', () => {
      const ws1 = createMockWebSocket();
      const ws2 = createMockWebSocket();
      const projectA = '/Users/dev/project-a';
      const projectB = '/Users/dev/project-b';

      service.registerConnection(projectA, ws1);
      service.registerConnection(projectB, ws2);

      expect(service.getConnectionCount(projectA)).toBe(1);
      expect(service.getConnectionCount(projectB)).toBe(1);
      expect(service.getTotalConnectionCount()).toBe(2);
    });
  });

  describe('unregisterConnection', () => {
    it('should unregister a connection from a project', () => {
      const ws = createMockWebSocket();
      const projectId = '/Users/dev/project-a';

      service.registerConnection(projectId, ws);
      expect(service.getConnectionCount(projectId)).toBe(1);

      service.unregisterConnection(ws);
      expect(service.getConnectionCount(projectId)).toBe(0);
    });

    it('should clean up empty connection sets', () => {
      const ws = createMockWebSocket();
      const projectId = '/Users/dev/project-a';

      service.registerConnection(projectId, ws);
      service.unregisterConnection(ws);

      expect(service.hasConnections(projectId)).toBe(false);
    });

    it('should handle unregistering unknown connection gracefully', () => {
      const ws = createMockWebSocket();

      // Should not throw
      expect(() => service.unregisterConnection(ws)).not.toThrow();
    });

    it('should not affect other connections in the same project', () => {
      const ws1 = createMockWebSocket();
      const ws2 = createMockWebSocket();
      const projectId = '/Users/dev/project-a';

      service.registerConnection(projectId, ws1);
      service.registerConnection(projectId, ws2);

      service.unregisterConnection(ws1);

      expect(service.getConnectionCount(projectId)).toBe(1);
    });
  });

  describe('sendToProject', () => {
    it('should send message to all connections for a project', () => {
      const ws1 = createMockWebSocket();
      const ws2 = createMockWebSocket();
      const projectId = '/Users/dev/project-a';
      const message = { type: 'test', data: 'hello' };

      service.registerConnection(projectId, ws1);
      service.registerConnection(projectId, ws2);

      const sentCount = service.sendToProject(projectId, message);

      expect(sentCount).toBe(2);
      expect(ws1.send).toHaveBeenCalled();
      expect(ws2.send).toHaveBeenCalled();
    });

    it('should add projectId to the message', () => {
      const ws = createMockWebSocket();
      const projectId = '/Users/dev/project-a';
      const message = { type: 'test', data: 'hello' };

      service.registerConnection(projectId, ws);
      service.sendToProject(projectId, message);

      const sentMessage = JSON.parse((ws.send as ReturnType<typeof vi.fn>).mock.calls[0][0]);
      expect(sentMessage.projectId).toBe(projectId);
    });

    it('should add timestamp to the message', () => {
      const ws = createMockWebSocket();
      const projectId = '/Users/dev/project-a';
      const message = { type: 'test', data: 'hello' };

      service.registerConnection(projectId, ws);
      service.sendToProject(projectId, message);

      const sentMessage = JSON.parse((ws.send as ReturnType<typeof vi.fn>).mock.calls[0][0]);
      expect(sentMessage.timestamp).toBeDefined();
    });

    it('should not send to closed connections', () => {
      const wsOpen = createMockWebSocket(WebSocket.OPEN);
      const wsClosed = createMockWebSocket(WebSocket.CLOSED);
      const projectId = '/Users/dev/project-a';

      service.registerConnection(projectId, wsOpen);
      service.registerConnection(projectId, wsClosed);

      const sentCount = service.sendToProject(projectId, { type: 'test' });

      expect(sentCount).toBe(1);
      expect(wsOpen.send).toHaveBeenCalled();
      expect(wsClosed.send).not.toHaveBeenCalled();
    });

    it('should return 0 when no connections exist for project', () => {
      const sentCount = service.sendToProject('/unknown/project', { type: 'test' });

      expect(sentCount).toBe(0);
    });

    it('should not send to connections of other projects', () => {
      const wsA = createMockWebSocket();
      const wsB = createMockWebSocket();
      const projectA = '/Users/dev/project-a';
      const projectB = '/Users/dev/project-b';

      service.registerConnection(projectA, wsA);
      service.registerConnection(projectB, wsB);

      service.sendToProject(projectA, { type: 'test' });

      expect(wsA.send).toHaveBeenCalled();
      expect(wsB.send).not.toHaveBeenCalled();
    });
  });

  describe('broadcast', () => {
    it('should send message to all connected projects', () => {
      const ws1 = createMockWebSocket();
      const ws2 = createMockWebSocket();
      const projectA = '/Users/dev/project-a';
      const projectB = '/Users/dev/project-b';

      service.registerConnection(projectA, ws1);
      service.registerConnection(projectB, ws2);

      const sentCount = service.broadcast({ type: 'broadcast-test' });

      expect(sentCount).toBe(2);
      expect(ws1.send).toHaveBeenCalled();
      expect(ws2.send).toHaveBeenCalled();
    });
  });

  describe('getProjectForConnection', () => {
    it('should return the project ID for a registered connection', () => {
      const ws = createMockWebSocket();
      const projectId = '/Users/dev/project-a';

      service.registerConnection(projectId, ws);

      expect(service.getProjectForConnection(ws)).toBe(projectId);
    });

    it('should return undefined for unregistered connection', () => {
      const ws = createMockWebSocket();

      expect(service.getProjectForConnection(ws)).toBeUndefined();
    });
  });

  describe('switchProjectForConnection', () => {
    it('should move a connection from one project to another', () => {
      const ws = createMockWebSocket();
      const projectA = '/Users/dev/project-a';
      const projectB = '/Users/dev/project-b';

      service.registerConnection(projectA, ws);
      expect(service.getConnectionCount(projectA)).toBe(1);
      expect(service.getConnectionCount(projectB)).toBe(0);

      service.switchProjectForConnection(ws, projectB);

      expect(service.getConnectionCount(projectA)).toBe(0);
      expect(service.getConnectionCount(projectB)).toBe(1);
      expect(service.getProjectForConnection(ws)).toBe(projectB);
    });

    it('should handle switching when connection is not registered', () => {
      const ws = createMockWebSocket();
      const projectB = '/Users/dev/project-b';

      // Should not throw and should register to new project
      service.switchProjectForConnection(ws, projectB);

      expect(service.getConnectionCount(projectB)).toBe(1);
      expect(service.getProjectForConnection(ws)).toBe(projectB);
    });

    it('should not change anything if switching to the same project', () => {
      const ws = createMockWebSocket();
      const projectA = '/Users/dev/project-a';

      service.registerConnection(projectA, ws);
      service.switchProjectForConnection(ws, projectA);

      expect(service.getConnectionCount(projectA)).toBe(1);
    });
  });

  describe('workflow tracking', () => {
    it('should track active workflows for projects', () => {
      const projectId = '/Users/dev/project-a';

      expect(service.hasActiveWorkflow(projectId)).toBe(false);

      service.markWorkflowActive(projectId);
      expect(service.hasActiveWorkflow(projectId)).toBe(true);

      service.markWorkflowInactive(projectId);
      expect(service.hasActiveWorkflow(projectId)).toBe(false);
    });

    it('should track workflow count', () => {
      expect(service.getActiveWorkflowCount()).toBe(0);

      service.markWorkflowActive('/project-a');
      service.markWorkflowActive('/project-b');
      expect(service.getActiveWorkflowCount()).toBe(2);

      service.markWorkflowInactive('/project-a');
      expect(service.getActiveWorkflowCount()).toBe(1);
    });
  });

  describe('getConnectedProjects', () => {
    it('should return all connected projects with their info', () => {
      const ws1 = createMockWebSocket();
      const ws2 = createMockWebSocket();
      const projectA = '/Users/dev/project-a';
      const projectB = '/Users/dev/project-b';

      service.registerConnection(projectA, ws1);
      service.registerConnection(projectB, ws2);
      service.markWorkflowActive(projectA);

      const projects = service.getConnectedProjects();

      expect(projects).toHaveLength(2);

      const projectAInfo = projects.find(p => p.projectId === projectA);
      const projectBInfo = projects.find(p => p.projectId === projectB);

      expect(projectAInfo?.connectionCount).toBe(1);
      expect(projectAInfo?.hasActiveWorkflow).toBe(true);
      expect(projectBInfo?.connectionCount).toBe(1);
      expect(projectBInfo?.hasActiveWorkflow).toBe(false);
    });
  });

  describe('shutdown', () => {
    it('should close all connections and clear state', () => {
      const ws1 = createMockWebSocket();
      const ws2 = createMockWebSocket();
      const projectA = '/Users/dev/project-a';
      const projectB = '/Users/dev/project-b';

      service.registerConnection(projectA, ws1);
      service.registerConnection(projectB, ws2);
      service.markWorkflowActive(projectA);

      service.shutdown();

      expect(ws1.close).toHaveBeenCalled();
      expect(ws2.close).toHaveBeenCalled();
      expect(service.getTotalConnectionCount()).toBe(0);
      expect(service.getActiveWorkflowCount()).toBe(0);
    });
  });

  describe('Gherkin scenarios', () => {
    describe('Szenario 1: Separate WebSocket-Verbindung pro Projekt', () => {
      it('should maintain separate connections for different projects', () => {
        const wsA = createMockWebSocket();
        const wsB = createMockWebSocket();
        const projectA = '/Users/dev/project-a';
        const projectB = '/Users/dev/project-b';

        // Given ich habe das Projekt "project-a" geöffnet
        service.registerConnection(projectA, wsA);

        // When ich das Projekt "project-b" zusätzlich öffne
        service.registerConnection(projectB, wsB);

        // Then existieren zwei WebSocket-Verbindungen
        expect(service.getTotalConnectionCount()).toBe(2);

        // And Verbindung 1 ist "project-a" zugeordnet
        expect(service.getProjectForConnection(wsA)).toBe(projectA);

        // And Verbindung 2 ist "project-b" zugeordnet
        expect(service.getProjectForConnection(wsB)).toBe(projectB);
      });
    });

    describe('Szenario 2: Nachrichten werden korrekt zugestellt', () => {
      it('should route messages only to the correct project', () => {
        const wsA = createMockWebSocket();
        const wsB = createMockWebSocket();
        const projectA = '/Users/dev/project-a';
        const projectB = '/Users/dev/project-b';

        // Given ich habe Projekt "project-a" und "project-b" geöffnet
        service.registerConnection(projectA, wsA);
        service.registerConnection(projectB, wsB);

        // When der Workflow in "project-a" eine Nachricht sendet
        service.sendToProject(projectA, {
          type: 'workflow.progress',
          output: 'Processing...'
        });

        // Then erhält nur die WebSocket-Verbindung von "project-a" die Nachricht
        expect(wsA.send).toHaveBeenCalled();

        // And "project-b" erhält keine Nachricht
        expect(wsB.send).not.toHaveBeenCalled();
      });
    });

    describe('Szenario 3: Verbindung wird bei Projekt-Schließen getrennt', () => {
      it('should clean up connection when unregistered', () => {
        const wsA = createMockWebSocket();
        const projectA = '/Users/dev/project-a';

        // Given ich habe das Projekt "project-a" mit aktiver WebSocket-Verbindung geöffnet
        service.registerConnection(projectA, wsA);
        expect(service.hasConnections(projectA)).toBe(true);

        // When ich den Tab für "project-a" schließe (simulated by unregisterConnection)
        service.unregisterConnection(wsA);

        // Then wird die WebSocket-Verbindung für "project-a" geschlossen
        expect(service.hasConnections(projectA)).toBe(false);
        expect(service.getProjectForConnection(wsA)).toBeUndefined();
      });
    });

    describe('Szenario 4: Workflow läuft bei Projekt-Wechsel weiter', () => {
      it('should track workflow state independently of connection state', () => {
        const wsA = createMockWebSocket();
        const wsB = createMockWebSocket();
        const projectA = '/Users/dev/project-a';
        const projectB = '/Users/dev/project-b';

        // Given ich habe Projekt "project-a" aktiv
        service.registerConnection(projectA, wsA);

        // And ein Workflow läuft in "project-a"
        service.markWorkflowActive(projectA);
        expect(service.hasActiveWorkflow(projectA)).toBe(true);

        // When ich zu Projekt "project-b" wechsle
        service.registerConnection(projectB, wsB);

        // Then läuft der Workflow in "project-a" im Hintergrund weiter
        expect(service.hasActiveWorkflow(projectA)).toBe(true);

        // And ich kann den Workflow-Status sehen wenn ich zurückwechsle
        // (by sending message to project-a)
        service.sendToProject(projectA, {
          type: 'workflow.status',
          running: true
        });
        expect(wsA.send).toHaveBeenCalled();
      });
    });

    describe('Szenario 6: Maximale Verbindungen pro Session', () => {
      it('should track workflows separately from connections', () => {
        const connections = Array.from({ length: 10 }, () => createMockWebSocket());
        const projects = Array.from({ length: 10 }, (_, i) => `/project-${i}`);

        // Given ich habe 10 Projekte geöffnet
        connections.forEach((ws, i) => {
          service.registerConnection(projects[i], ws);
        });

        // When nur 3 Projekte aktive Workflows haben
        service.markWorkflowActive(projects[0]);
        service.markWorkflowActive(projects[3]);
        service.markWorkflowActive(projects[7]);

        // Then existieren 10 Verbindungen
        expect(service.getTotalConnectionCount()).toBe(10);

        // And 3 Projekte haben aktive Workflows
        expect(service.getActiveWorkflowCount()).toBe(3);

        // Verify workflow state
        expect(service.hasActiveWorkflow(projects[0])).toBe(true);
        expect(service.hasActiveWorkflow(projects[1])).toBe(false);
        expect(service.hasActiveWorkflow(projects[3])).toBe(true);
      });
    });
  });
});
