/**
 * VoiceCallService
 *
 * Core orchestrator for Voice Calls. Manages voice call sessions,
 * routes audio chunks to DeepgramAdapter for STT, and emits
 * transcript events back to the WebSocket layer.
 *
 * Architecture:
 * - EventEmitter pattern (like CloudTerminalManager)
 * - Session-Map for concurrent call management
 * - Lifecycle: idle → connecting → active → ended
 * - Routes: Browser audio → DeepgramAdapter → transcript events
 *
 * Emits:
 * - 'transcript' (callId, { text, isFinal, confidence }) - Transcript data
 * - 'error' (callId, Error) - Error in voice pipeline
 * - 'call.started' (callId) - Call session started and STT connected
 * - 'call.ended' (callId) - Call session ended
 */

import { EventEmitter } from 'events';
import { DeepgramAdapter } from './deepgram.adapter.js';
import type { DeepgramTranscriptEvent } from './deepgram.adapter.js';
import { loadVoiceConfig } from '../voice-config.js';

export type VoiceCallState = 'idle' | 'connecting' | 'active' | 'ended';

export interface VoiceCallSession {
  callId: string;
  clientId: string;
  state: VoiceCallState;
  startedAt: Date;
  endedAt: Date | null;
}

interface ManagedVoiceSession extends VoiceCallSession {
  deepgramAdapter: DeepgramAdapter | null;
}

export class VoiceCallService extends EventEmitter {
  private sessions: Map<string, ManagedVoiceSession> = new Map();

  /**
   * Start a new voice call session
   * @param callId - Unique call identifier
   * @param clientId - WebSocket client ID
   */
  startCall(callId: string, clientId: string): void {
    if (this.sessions.has(callId)) {
      this.emit('error', callId, new Error(`Call already exists: ${callId}`));
      return;
    }

    const session: ManagedVoiceSession = {
      callId,
      clientId,
      state: 'connecting',
      startedAt: new Date(),
      endedAt: null,
      deepgramAdapter: null,
    };

    this.sessions.set(callId, session);

    // Load voice config to get API key
    const config = loadVoiceConfig();

    if (!config.deepgramApiKey) {
      session.state = 'ended';
      session.endedAt = new Date();
      this.sessions.delete(callId);
      this.emit('error', callId, new Error('Deepgram API key not configured'));
      return;
    }

    // Create and connect DeepgramAdapter
    try {
      session.deepgramAdapter = new DeepgramAdapter({
        apiKey: config.deepgramApiKey,
      });

      this.attachDeepgramListeners(session);
      session.deepgramAdapter.connect();
    } catch (err) {
      session.state = 'ended';
      session.endedAt = new Date();
      this.sessions.delete(callId);
      const error = err instanceof Error ? err : new Error(String(err));
      this.emit('error', callId, error);
    }
  }

  /**
   * End a voice call session
   * @param callId - Call identifier to end
   */
  endCall(callId: string): void {
    const session = this.sessions.get(callId);
    if (!session) return;

    if (session.deepgramAdapter) {
      session.deepgramAdapter.close();
      session.deepgramAdapter = null;
    }

    session.state = 'ended';
    session.endedAt = new Date();
    this.sessions.delete(callId);

    console.log(`[VoiceCallService] Call ended: ${callId}`);
    this.emit('call.ended', callId);
  }

  /**
   * Handle an incoming audio chunk from the client
   * @param callId - Call identifier
   * @param audioBase64 - Base64-encoded PCM audio data
   */
  handleAudioChunk(callId: string, audioBase64: string): void {
    const session = this.sessions.get(callId);
    if (!session || session.state !== 'active') return;

    if (!session.deepgramAdapter || !session.deepgramAdapter.isConnected) return;

    // Decode base64 to Buffer
    const audioBuffer = Buffer.from(audioBase64, 'base64');
    session.deepgramAdapter.send(audioBuffer);
  }

  /**
   * End all active calls for a specific client (e.g., on disconnect)
   * @param clientId - WebSocket client ID
   */
  endCallsForClient(clientId: string): void {
    for (const [callId, session] of this.sessions) {
      if (session.clientId === clientId) {
        this.endCall(callId);
      }
    }
  }

  /**
   * Get session info for a call
   */
  getSession(callId: string): VoiceCallSession | null {
    const session = this.sessions.get(callId);
    if (!session) return null;

    return {
      callId: session.callId,
      clientId: session.clientId,
      state: session.state,
      startedAt: session.startedAt,
      endedAt: session.endedAt,
    };
  }

  /**
   * Check if a call is active
   */
  hasActiveCall(callId: string): boolean {
    const session = this.sessions.get(callId);
    return session !== null && session !== undefined && session.state === 'active';
  }

  private attachDeepgramListeners(session: ManagedVoiceSession): void {
    const adapter = session.deepgramAdapter;
    if (!adapter) return;

    adapter.on('open', () => {
      session.state = 'active';
      console.log(`[VoiceCallService] Call active: ${session.callId} (Deepgram connected)`);
      this.emit('call.started', session.callId);
    });

    adapter.on('transcript', (event: DeepgramTranscriptEvent) => {
      this.emit('transcript', session.callId, {
        text: event.text,
        isFinal: event.isFinal,
        confidence: event.confidence,
      });
    });

    adapter.on('error', (err: Error) => {
      console.error(`[VoiceCallService] Deepgram error for call ${session.callId}:`, err.message);
      this.emit('error', session.callId, err);
    });

    adapter.on('close', () => {
      // Only handle if not intentionally ended
      if (session.state === 'active') {
        console.warn(`[VoiceCallService] Deepgram connection lost for call ${session.callId}`);
        // DeepgramAdapter handles reconnection internally
      }
    });
  }
}
