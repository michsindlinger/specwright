import { WebSocket } from 'ws';

/**
 * MPRO-005: WebSocket Manager Service
 * Manages WebSocket connections per project for multi-project support.
 * Each project can have multiple connections (e.g., multiple browser tabs).
 * Messages are routed to all connections associated with a specific projectId.
 */

export interface WebSocketMessage {
  type: string;
  projectId?: string;
  clientId?: string;
  timestamp?: string;
  [key: string]: unknown;
}

export interface ProjectConnectionInfo {
  projectId: string;
  connectionCount: number;
  hasActiveWorkflow: boolean;
}

export class WebSocketManagerService {
  /**
   * Map of projectId -> Set of WebSocket connections
   * A project can have multiple connections (multiple browser tabs/windows)
   */
  private projectConnections: Map<string, Set<WebSocket>> = new Map();

  /**
   * Reverse map: WebSocket -> projectId for quick lookup on disconnect
   */
  private connectionToProject: Map<WebSocket, string> = new Map();

  /**
   * Track which projects have active workflows (lazy connection pattern)
   * Only projects with active workflows maintain permanent connections
   */
  private activeWorkflows: Set<string> = new Set();

  /**
   * Register a WebSocket connection for a specific project.
   * @param projectId - The project identifier (typically the project path)
   * @param ws - The WebSocket connection to register
   */
  public registerConnection(projectId: string, ws: WebSocket): void {
    // Get or create the set of connections for this project
    let connections = this.projectConnections.get(projectId);
    if (!connections) {
      connections = new Set();
      this.projectConnections.set(projectId, connections);
    }

    // Add the connection
    connections.add(ws);
    this.connectionToProject.set(ws, projectId);

    console.log(`[WebSocketManager] Registered connection for project: ${projectId} (${connections.size} total)`);

    // Set up automatic cleanup on connection close
    ws.on('close', () => {
      this.unregisterConnection(ws);
    });
  }

  /**
   * Unregister a WebSocket connection.
   * Called automatically when connection closes.
   * @param ws - The WebSocket connection to unregister
   */
  public unregisterConnection(ws: WebSocket): void {
    const projectId = this.connectionToProject.get(ws);
    if (!projectId) {
      return;
    }

    const connections = this.projectConnections.get(projectId);
    if (connections) {
      connections.delete(ws);
      console.log(`[WebSocketManager] Unregistered connection for project: ${projectId} (${connections.size} remaining)`);

      // Clean up empty connection sets
      if (connections.size === 0) {
        this.projectConnections.delete(projectId);
        console.log(`[WebSocketManager] Removed empty connection set for project: ${projectId}`);
      }
    }

    this.connectionToProject.delete(ws);
  }

  /**
   * Send a message to all connections associated with a specific project.
   * @param projectId - The project identifier
   * @param message - The message to send
   * @returns Number of connections the message was sent to
   */
  public sendToProject(projectId: string, message: WebSocketMessage): number {
    const connections = this.projectConnections.get(projectId);
    if (!connections || connections.size === 0) {
      console.log(`[WebSocketManager] No connections for project: ${projectId}`);
      return 0;
    }

    // Add projectId to message if not present
    const messageWithProject: WebSocketMessage = {
      ...message,
      projectId,
      timestamp: message.timestamp || new Date().toISOString()
    };

    const messageStr = JSON.stringify(messageWithProject);
    let sentCount = 0;

    for (const ws of connections) {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(messageStr);
        sentCount++;
      }
    }

    console.log(`[WebSocketManager] Sent message to ${sentCount}/${connections.size} connections for project: ${projectId}`);
    return sentCount;
  }

  /**
   * Broadcast a message to all connected projects.
   * Use sparingly - prefer sendToProject for targeted messaging.
   * @param message - The message to broadcast
   * @returns Total number of connections the message was sent to
   */
  public broadcast(message: WebSocketMessage): number {
    let totalSent = 0;
    const messageStr = JSON.stringify({
      ...message,
      timestamp: message.timestamp || new Date().toISOString()
    });

    for (const [projectId, connections] of this.projectConnections) {
      for (const ws of connections) {
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(messageStr);
          totalSent++;
        }
      }
      console.log(`[WebSocketManager] Broadcast to project ${projectId}: ${connections.size} connections`);
    }

    return totalSent;
  }

  /**
   * Get all connections for a specific project.
   * @param projectId - The project identifier
   * @returns Set of WebSocket connections, or empty set if none
   */
  public getProjectConnections(projectId: string): Set<WebSocket> {
    return this.projectConnections.get(projectId) || new Set();
  }

  /**
   * Get the project ID associated with a WebSocket connection.
   * @param ws - The WebSocket connection
   * @returns The project ID, or undefined if not registered
   */
  public getProjectForConnection(ws: WebSocket): string | undefined {
    return this.connectionToProject.get(ws);
  }

  /**
   * Check if a project has any active connections.
   * @param projectId - The project identifier
   * @returns true if the project has at least one connection
   */
  public hasConnections(projectId: string): boolean {
    const connections = this.projectConnections.get(projectId);
    return connections !== undefined && connections.size > 0;
  }

  /**
   * Get the connection count for a specific project.
   * @param projectId - The project identifier
   * @returns Number of connections for the project
   */
  public getConnectionCount(projectId: string): number {
    return this.projectConnections.get(projectId)?.size || 0;
  }

  /**
   * Get total connection count across all projects.
   * @returns Total number of connections
   */
  public getTotalConnectionCount(): number {
    let total = 0;
    for (const connections of this.projectConnections.values()) {
      total += connections.size;
    }
    return total;
  }

  /**
   * Get list of all connected projects with their connection counts.
   * @returns Array of ProjectConnectionInfo
   */
  public getConnectedProjects(): ProjectConnectionInfo[] {
    const projects: ProjectConnectionInfo[] = [];
    for (const [projectId, connections] of this.projectConnections) {
      projects.push({
        projectId,
        connectionCount: connections.size,
        hasActiveWorkflow: this.activeWorkflows.has(projectId)
      });
    }
    return projects;
  }

  /**
   * Mark a project as having an active workflow.
   * Used for lazy connection management.
   * @param projectId - The project identifier
   */
  public markWorkflowActive(projectId: string): void {
    this.activeWorkflows.add(projectId);
    console.log(`[WebSocketManager] Workflow marked active for project: ${projectId}`);
  }

  /**
   * Mark a project as no longer having an active workflow.
   * @param projectId - The project identifier
   */
  public markWorkflowInactive(projectId: string): void {
    this.activeWorkflows.delete(projectId);
    console.log(`[WebSocketManager] Workflow marked inactive for project: ${projectId}`);
  }

  /**
   * Check if a project has an active workflow.
   * @param projectId - The project identifier
   * @returns true if the project has an active workflow
   */
  public hasActiveWorkflow(projectId: string): boolean {
    return this.activeWorkflows.has(projectId);
  }

  /**
   * Get count of projects with active workflows.
   * @returns Number of projects with active workflows
   */
  public getActiveWorkflowCount(): number {
    return this.activeWorkflows.size;
  }

  /**
   * Move a connection from one project to another.
   * Used when switching project context.
   * @param ws - The WebSocket connection
   * @param newProjectId - The new project identifier
   */
  public switchProjectForConnection(ws: WebSocket, newProjectId: string): void {
    const currentProjectId = this.connectionToProject.get(ws);

    if (currentProjectId === newProjectId) {
      return; // Already on the correct project
    }

    // Unregister from current project
    if (currentProjectId) {
      const connections = this.projectConnections.get(currentProjectId);
      if (connections) {
        connections.delete(ws);
        if (connections.size === 0) {
          this.projectConnections.delete(currentProjectId);
        }
      }
    }

    // Register to new project
    let newConnections = this.projectConnections.get(newProjectId);
    if (!newConnections) {
      newConnections = new Set();
      this.projectConnections.set(newProjectId, newConnections);
    }
    newConnections.add(ws);
    this.connectionToProject.set(ws, newProjectId);

    console.log(`[WebSocketManager] Switched connection from ${currentProjectId || 'none'} to ${newProjectId}`);
  }

  /**
   * Clean up all connections and reset state.
   * Use for shutdown or testing.
   */
  public shutdown(): void {
    for (const connections of this.projectConnections.values()) {
      for (const ws of connections) {
        try {
          ws.close();
        } catch {
          // Ignore close errors during shutdown
        }
      }
    }

    this.projectConnections.clear();
    this.connectionToProject.clear();
    this.activeWorkflows.clear();

    console.log('[WebSocketManager] Shutdown complete');
  }
}

// Singleton instance for use across the application
export const webSocketManager = new WebSocketManagerService();
