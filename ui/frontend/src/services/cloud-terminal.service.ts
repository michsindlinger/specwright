/**
 * CloudTerminalService - Manages cloud terminal session persistence
 *
 * Features:
 * - IndexedDB persistence for session metadata
 * - Project-based session filtering
 * - Session state management: 'active' | 'paused' | 'reconnecting' | 'closed'
 * - Graceful handling when IndexedDB is unavailable (Private Browsing)
 * - Provider/model configuration fetching
 */

import { gateway } from '../gateway.js';

const DB_NAME = 'agent-os-cloud-terminal';
const DB_VERSION = 1;
const STORE_NAME = 'sessions';

/** Maximum number of concurrent sessions */
export const MAX_SESSIONS = 5;

/** Inactivity timeout in milliseconds (30 minutes) */
export const INACTIVITY_TIMEOUT = 30 * 60 * 1000;

/** Background tab timeout in milliseconds (10 minutes) */
export const BACKGROUND_TAB_TIMEOUT = 10 * 60 * 1000;

/**
 * Represents a persisted terminal session
 */
export interface PersistedTerminalSession {
  id: string;
  name: string;
  /** Model ID (optional for shell terminals) */
  modelId?: string;
  /** Provider ID (optional for shell terminals) */
  providerId?: string;
  projectPath: string;
  status: 'active' | 'paused' | 'reconnecting' | 'closed';
  /** Terminal type: 'shell' for plain terminal, 'claude-code' for AI session (defaults to 'claude-code') */
  terminalType?: 'shell' | 'claude-code';
  createdAt: number;
  updatedAt: number;
}

/**
 * Session creation result
 */
export interface CreateSessionResult {
  success: boolean;
  session?: PersistedTerminalSession;
  error?: string;
  errorCode?: 'MAX_SESSIONS_REACHED' | 'SESSION_CREATION_FAILED' | 'TIMEOUT';
}

/**
 * CloudTerminalService manages terminal session persistence
 * with IndexedDB storage for metadata (not terminal buffer).
 */
export class CloudTerminalService {
  private db: IDBDatabase | null = null;
  private initPromise: Promise<void> | null = null;
  private inactivityTimers: Map<string, number> = new Map();
  private lastActivityTimestamps: Map<string, number> = new Map();
  private visibilityHandler: (() => void) | null = null;
  private backgroundTabTimers: Map<string, number> = new Map();

  /**
   * Initialize the IndexedDB database
   */
  private async initDB(): Promise<void> {
    if (this.db) return;
    if (this.initPromise) return this.initPromise;

    this.initPromise = new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onerror = () => {
        console.warn('CloudTerminalService: Failed to open IndexedDB');
        this.initPromise = null;
        reject(new Error('Failed to open IndexedDB'));
      };

      request.onsuccess = () => {
        this.db = request.result;
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;

        // Create object store for sessions
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          const store = db.createObjectStore(STORE_NAME, { keyPath: 'id' });
          // Create index for project-based queries
          store.createIndex('projectPath', 'projectPath', { unique: false });
          // Create index for status-based queries
          store.createIndex('status', 'status', { unique: false });
        }
      };
    });

    return this.initPromise;
  }

  /**
   * Check if IndexedDB is available
   */
  private isIndexedDBAvailable(): boolean {
    return typeof indexedDB !== 'undefined';
  }

  /**
   * Get all sessions for a specific project
   */
  async getSessionsForProject(projectPath: string): Promise<PersistedTerminalSession[]> {
    if (!this.isIndexedDBAvailable()) {
      return [];
    }

    try {
      await this.initDB();
      if (!this.db) return [];

      return new Promise((resolve, reject) => {
        const transaction = this.db!.transaction([STORE_NAME], 'readonly');
        const store = transaction.objectStore(STORE_NAME);
        const index = store.index('projectPath');
        const request = index.getAll(projectPath);

        request.onsuccess = () => {
          const sessions = request.result as PersistedTerminalSession[];
          // Sort by updatedAt descending (newest first)
          sessions.sort((a, b) => b.updatedAt - a.updatedAt);
          resolve(sessions);
        };

        request.onerror = () => {
          reject(new Error('Failed to get sessions for project'));
        };
      });
    } catch (error) {
      console.warn('CloudTerminalService: Error getting sessions:', error);
      return [];
    }
  }

  /**
   * Get all sessions across all projects
   */
  async getAllSessions(): Promise<PersistedTerminalSession[]> {
    if (!this.isIndexedDBAvailable()) {
      return [];
    }

    try {
      await this.initDB();
      if (!this.db) return [];

      return new Promise((resolve, reject) => {
        const transaction = this.db!.transaction([STORE_NAME], 'readonly');
        const store = transaction.objectStore(STORE_NAME);
        const request = store.getAll();

        request.onsuccess = () => {
          const sessions = request.result as PersistedTerminalSession[];
          // Sort by updatedAt descending (newest first)
          sessions.sort((a, b) => b.updatedAt - a.updatedAt);
          resolve(sessions);
        };

        request.onerror = () => {
          reject(new Error('Failed to get all sessions'));
        };
      });
    } catch (error) {
      console.warn('CloudTerminalService: Error getting all sessions:', error);
      return [];
    }
  }

  /**
   * Get a single session by ID
   */
  async getSession(sessionId: string): Promise<PersistedTerminalSession | null> {
    if (!this.isIndexedDBAvailable()) {
      return null;
    }

    try {
      await this.initDB();
      if (!this.db) return null;

      return new Promise((resolve, reject) => {
        const transaction = this.db!.transaction([STORE_NAME], 'readonly');
        const store = transaction.objectStore(STORE_NAME);
        const request = store.get(sessionId);

        request.onsuccess = () => {
          resolve(request.result as PersistedTerminalSession | null);
        };

        request.onerror = () => {
          reject(new Error('Failed to get session'));
        };
      });
    } catch (error) {
      console.warn('CloudTerminalService: Error getting session:', error);
      return null;
    }
  }

  /**
   * Save or update a session
   */
  async saveSession(session: PersistedTerminalSession): Promise<void> {
    if (!this.isIndexedDBAvailable()) {
      return;
    }

    try {
      await this.initDB();
      if (!this.db) return;

      const sessionWithTimestamp = {
        ...session,
        updatedAt: Date.now()
      };

      return new Promise((resolve, reject) => {
        const transaction = this.db!.transaction([STORE_NAME], 'readwrite');
        const store = transaction.objectStore(STORE_NAME);
        const request = store.put(sessionWithTimestamp);

        request.onsuccess = () => {
          resolve();
        };

        request.onerror = () => {
          reject(new Error('Failed to save session'));
        };
      });
    } catch (error) {
      console.warn('CloudTerminalService: Error saving session:', error);
    }
  }

  /**
   * Check if max sessions limit is reached for a project
   */
  async isMaxSessionsReached(projectPath: string): Promise<boolean> {
    const sessions = await this.getSessionsForProject(projectPath);
    const activeOrPausedSessions = sessions.filter(
      s => s.status === 'active' || s.status === 'paused'
    );
    return activeOrPausedSessions.length >= MAX_SESSIONS;
  }

  /**
   * Get the number of sessions for a project
   */
  async getActiveSessionCount(projectPath: string): Promise<number> {
    const sessions = await this.getSessionsForProject(projectPath);
    return sessions.filter(s => s.status === 'active' || s.status === 'paused').length;
  }

  /**
   * Create a new session with max sessions check
   */
  async createSession(
    id: string,
    name: string,
    modelId: string | undefined,
    providerId: string | undefined,
    projectPath: string,
    terminalType: 'shell' | 'claude-code' = 'claude-code'
  ): Promise<CreateSessionResult> {
    // Check max sessions limit
    const isMaxReached = await this.isMaxSessionsReached(projectPath);
    if (isMaxReached) {
      return {
        success: false,
        error: `Maximale Anzahl Sessions (${MAX_SESSIONS}) erreicht. Bitte schließen Sie eine bestehende Session.`,
        errorCode: 'MAX_SESSIONS_REACHED'
      };
    }

    try {
      const now = Date.now();
      const session: PersistedTerminalSession = {
        id,
        name,
        modelId,
        providerId,
        projectPath,
        status: 'active',
        terminalType,
        createdAt: now,
        updatedAt: now
      };

      await this.saveSession(session);

      // Start inactivity tracking
      this.startInactivityTracking(id);

      return {
        success: true,
        session
      };
    } catch {
      return {
        success: false,
        error: 'Session konnte nicht gestartet werden. Bitte versuchen Sie es erneut.',
        errorCode: 'SESSION_CREATION_FAILED'
      };
    }
  }

  /**
   * Start inactivity tracking for a session
   */
  private startInactivityTracking(sessionId: string): void {
    this.lastActivityTimestamps.set(sessionId, Date.now());
    this.resetInactivityTimer(sessionId);
  }

  /**
   * Record activity for a session (resets inactivity timer)
   */
  recordActivity(sessionId: string): void {
    this.lastActivityTimestamps.set(sessionId, Date.now());
    this.resetInactivityTimer(sessionId);
  }

  /**
   * Reset the inactivity timer for a session
   */
  private resetInactivityTimer(sessionId: string): void {
    // Clear existing timer
    const existingTimer = this.inactivityTimers.get(sessionId);
    if (existingTimer) {
      window.clearTimeout(existingTimer);
    }

    // Set new timer
    const timer = window.setTimeout(() => {
      this.handleInactivityTimeout(sessionId);
    }, INACTIVITY_TIMEOUT);

    this.inactivityTimers.set(sessionId, timer);
  }

  /**
   * Handle inactivity timeout - pause the session
   */
  private async handleInactivityTimeout(sessionId: string): Promise<void> {
    const session = await this.getSession(sessionId);
    if (session && session.status === 'active') {
      await this.updateSessionStatus(sessionId, 'paused');
      console.log(`[CloudTerminalService] Session ${sessionId} paused due to inactivity`);

      // Notify server to pause the session (buffer output instead of killing PTY)
      if (gateway.getConnectionStatus()) {
        gateway.send({
          type: 'cloud-terminal:pause',
          sessionId,
          timestamp: new Date().toISOString(),
        });
      }

      // Dispatch event for UI notification
      window.dispatchEvent(new CustomEvent('cloud-terminal-session-paused', {
        detail: { sessionId, reason: 'inactivity' }
      }));
    }

    // Clear timer reference
    this.inactivityTimers.delete(sessionId);
  }

  /**
   * Clear inactivity tracking for a session
   */
  private clearInactivityTracking(sessionId: string): void {
    const timer = this.inactivityTimers.get(sessionId);
    if (timer) {
      window.clearTimeout(timer);
      this.inactivityTimers.delete(sessionId);
    }
    this.lastActivityTimestamps.delete(sessionId);
  }

  /**
   * Setup page visibility tracking for background tab detection
   */
  setupVisibilityTracking(): void {
    if (this.visibilityHandler) {
      return; // Already set up
    }

    this.visibilityHandler = () => {
      if (document.hidden) {
        // Tab went to background - start background timers
        this.startBackgroundTabTimers();
      } else {
        // Tab came to foreground - clear background timers and resume sessions
        this.clearBackgroundTabTimers();
        this.resumeSessionsAfterBackground();
      }
    };

    document.addEventListener('visibilitychange', this.visibilityHandler);
  }

  /**
   * Cleanup visibility tracking
   */
  cleanupVisibilityTracking(): void {
    if (this.visibilityHandler) {
      document.removeEventListener('visibilitychange', this.visibilityHandler);
      this.visibilityHandler = null;
    }
    this.clearBackgroundTabTimers();
  }

  /**
   * Start background tab timers for all active sessions
   */
  private startBackgroundTabTimers(): void {
    // Get all active sessions and start background timers
    this.getAllSessions().then(sessions => {
      for (const session of sessions) {
        if (session.status === 'active') {
          const timer = window.setTimeout(() => {
            this.pauseSessionForBackground(session.id);
          }, BACKGROUND_TAB_TIMEOUT);
          this.backgroundTabTimers.set(session.id, timer);
        }
      }
    });
  }

  /**
   * Clear all background tab timers
   */
  private clearBackgroundTabTimers(): void {
    for (const timer of this.backgroundTabTimers.values()) {
      window.clearTimeout(timer);
    }
    this.backgroundTabTimers.clear();
  }

  /**
   * Pause a session when background tab timeout is reached
   */
  private async pauseSessionForBackground(sessionId: string): Promise<void> {
    const session = await this.getSession(sessionId);
    if (session && session.status === 'active') {
      await this.updateSessionStatus(sessionId, 'paused');
      console.log(`[CloudTerminalService] Session ${sessionId} paused due to background tab`);

      // Notify server to pause the session (buffer output instead of killing PTY)
      if (gateway.getConnectionStatus()) {
        gateway.send({
          type: 'cloud-terminal:pause',
          sessionId,
          timestamp: new Date().toISOString(),
        });
      }

      window.dispatchEvent(new CustomEvent('cloud-terminal-session-paused', {
        detail: { sessionId, reason: 'background' }
      }));
    }
    this.backgroundTabTimers.delete(sessionId);
  }

  /**
   * Resume sessions after returning from background
   */
  private async resumeSessionsAfterBackground(): Promise<void> {
    const sessions = await this.getAllSessions();
    for (const session of sessions) {
      if (session.status === 'paused') {
        // Reset inactivity tracking when resuming
        this.startInactivityTracking(session.id);
      }
    }
  }

  /**
   * Update session status
   */
  async updateSessionStatus(
    sessionId: string,
    status: PersistedTerminalSession['status']
  ): Promise<void> {
    const session = await this.getSession(sessionId);
    if (session) {
      session.status = status;
      await this.saveSession(session);

      // Handle inactivity tracking based on status
      if (status === 'active') {
        this.startInactivityTracking(sessionId);
      } else if (status === 'paused' || status === 'closed') {
        this.clearInactivityTracking(sessionId);
      }
    }
  }

  /**
   * Resume a paused session
   */
  async resumeSession(sessionId: string): Promise<boolean> {
    const session = await this.getSession(sessionId);
    if (!session || session.status !== 'paused') {
      return false;
    }

    await this.updateSessionStatus(sessionId, 'active');
    this.startInactivityTracking(sessionId);

    // Notify server to resume the session (send buffered output)
    if (gateway.getConnectionStatus()) {
      gateway.send({
        type: 'cloud-terminal:resume',
        sessionId,
        timestamp: new Date().toISOString(),
      });
    }

    window.dispatchEvent(new CustomEvent('cloud-terminal-session-resumed', {
      detail: { sessionId }
    }));

    return true;
  }

  /**
   * Update session name
   */
  async updateSessionName(sessionId: string, name: string): Promise<void> {
    const session = await this.getSession(sessionId);
    if (session) {
      session.name = name;
      await this.saveSession(session);
    }
  }

  /**
   * Pause all active sessions for a project
   * Called when switching to a different project
   */
  async pauseSessionsForProject(projectPath: string): Promise<void> {
    const sessions = await this.getSessionsForProject(projectPath);
    const activeSessions = sessions.filter(s => s.status === 'active');

    for (const session of activeSessions) {
      await this.updateSessionStatus(session.id, 'paused');
    }
  }

  /**
   * Mark sessions as reconnecting (e.g., after page reload)
   */
  async markSessionsAsReconnecting(projectPath: string): Promise<void> {
    const sessions = await this.getSessionsForProject(projectPath);
    const sessionsToReconnect = sessions.filter(s =>
      s.status === 'active' || s.status === 'paused'
    );

    for (const session of sessionsToReconnect) {
      await this.updateSessionStatus(session.id, 'reconnecting');
    }
  }

  /**
   * Remove a session
   */
  async removeSession(sessionId: string): Promise<void> {
    if (!this.isIndexedDBAvailable()) {
      return;
    }

    // Clear inactivity tracking
    this.clearInactivityTracking(sessionId);

    try {
      await this.initDB();
      if (!this.db) return;

      return new Promise((resolve, reject) => {
        const transaction = this.db!.transaction([STORE_NAME], 'readwrite');
        const store = transaction.objectStore(STORE_NAME);
        const request = store.delete(sessionId);

        request.onsuccess = () => {
          resolve();
        };

        request.onerror = () => {
          reject(new Error('Failed to remove session'));
        };
      });
    } catch (error) {
      console.warn('CloudTerminalService: Error removing session:', error);
    }
  }

  /**
   * Remove all sessions for a project
   */
  async removeSessionsForProject(projectPath: string): Promise<void> {
    const sessions = await this.getSessionsForProject(projectPath);

    for (const session of sessions) {
      await this.removeSession(session.id);
    }
  }

  /**
   * Clear all sessions (use with caution)
   */
  async clearAllSessions(): Promise<void> {
    if (!this.isIndexedDBAvailable()) {
      return;
    }

    try {
      await this.initDB();
      if (!this.db) return;

      return new Promise((resolve, reject) => {
        const transaction = this.db!.transaction([STORE_NAME], 'readwrite');
        const store = transaction.objectStore(STORE_NAME);
        const request = store.clear();

        request.onsuccess = () => {
          resolve();
        };

        request.onerror = () => {
          reject(new Error('Failed to clear sessions'));
        };
      });
    } catch (error) {
      console.warn('CloudTerminalService: Error clearing sessions:', error);
    }
  }

  /**
   * Check if a session exists
   */
  async hasSession(sessionId: string): Promise<boolean> {
    const session = await this.getSession(sessionId);
    return session !== null;
  }

  /**
   * Get count of sessions for a project
   */
  async getSessionCountForProject(projectPath: string): Promise<number> {
    const sessions = await this.getSessionsForProject(projectPath);
    return sessions.length;
  }

  /**
   * Fetch configured providers and their models from the backend.
   * Returns providers with their available models for model selection.
   */
  async getConfiguredProviders(): Promise<ProviderInfo[]> {
    if (!gateway.getConnectionStatus()) {
      console.warn('CloudTerminalService: Cannot fetch providers - gateway not connected');
      return [];
    }

    try {
      // Request model list and wait for response
      gateway.send({ type: 'model.list' });
      const response = await gateway.waitFor('model.list', 5000);

      const providers = response.providers as ProviderInfo[];
      if (providers && Array.isArray(providers)) {
        return providers;
      }
      return [];
    } catch (error) {
      console.warn('CloudTerminalService: Error fetching providers:', error);
      return [];
    }
  }

  /**
   * Get the last used model from the most recent session.
   * Returns null if no sessions exist.
   */
  async getLastUsedModel(projectPath: string): Promise<{ modelId: string; providerId: string } | null> {
    // Sessions are sorted by updatedAt DESC from getSessionsForProject(), so find() returns the most recent match
    const sessions = await this.getSessionsForProject(projectPath);
    // Find the most recent claude-code session (shell terminals have no model)
    const claudeSession = sessions.find(s => s.terminalType !== 'shell' && s.modelId && s.providerId);
    if (!claudeSession) {
      return null;
    }
    return {
      modelId: claudeSession.modelId!,
      providerId: claudeSession.providerId!
    };
  }
}

/**
 * Represents a model available from a provider
 */
export interface ModelInfo {
  id: string;
  name: string;
  providerId: string;
}

/**
 * Represents a provider with its available models
 */
export interface ProviderInfo {
  id: string;
  name: string;
  models: ModelInfo[];
}

/** Singleton instance */
export const cloudTerminalService = new CloudTerminalService();
