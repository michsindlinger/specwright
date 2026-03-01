/**
 * VoiceCallService
 *
 * Core orchestrator for Voice Calls. Manages voice call sessions,
 * routes audio chunks to DeepgramAdapter for STT, sends agent responses
 * to ElevenLabsAdapter for TTS, and emits events to the WebSocket layer.
 *
 * Architecture:
 * - EventEmitter pattern (like CloudTerminalManager)
 * - Session-Map for concurrent call management
 * - Lifecycle: idle -> connecting -> active -> ended
 * - STT: Browser audio -> DeepgramAdapter -> transcript events
 * - TTS: Agent text -> sentence split -> ElevenLabsAdapter -> audio chunks -> Frontend
 * - Barge-in: Incoming user audio during TTS stops TTS immediately
 *
 * Emits:
 * - 'transcript' (callId, { text, isFinal, confidence }) - Transcript data
 * - 'error' (callId, Error) - Error in voice pipeline
 * - 'call.started' (callId) - Call session started and STT connected
 * - 'call.ended' (callId) - Call session ended
 * - 'tts.start' (callId) - TTS generation started
 * - 'tts.chunk' (callId, audioBase64) - Complete sentence audio chunk
 * - 'tts.end' (callId) - All TTS sentences completed
 * - 'tts.stopped' (callId) - TTS stopped due to barge-in
 * - 'tts.fallback' (callId, text) - TTS unavailable, text-only response
 */

import { EventEmitter } from 'events';
import { DeepgramAdapter } from './deepgram.adapter.js';
import type { DeepgramTranscriptEvent } from './deepgram.adapter.js';
import { ElevenLabsAdapter } from './elevenlabs.adapter.js';
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
  elevenlabsAdapter: ElevenLabsAdapter | null;
  ttsActive: boolean;
  ttsSentenceQueue: string[];
  ttsCurrentAudioChunks: Buffer[];
  ttsVoiceId: string;
}

// ElevenLabs default voice (Rachel - multilingual)
const DEFAULT_VOICE_ID = '21m00Tcm4TlvDq8ikWAM';

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
      elevenlabsAdapter: null,
      ttsActive: false,
      ttsSentenceQueue: [],
      ttsCurrentAudioChunks: [],
      ttsVoiceId: DEFAULT_VOICE_ID,
    };

    this.sessions.set(callId, session);

    const config = loadVoiceConfig();

    if (!config.deepgramApiKey) {
      session.state = 'ended';
      session.endedAt = new Date();
      this.sessions.delete(callId);
      this.emit('error', callId, new Error('Deepgram API key not configured'));
      return;
    }

    // Resolve default voice ID from config personas
    if (config.voicePersonas && config.voicePersonas.length > 0) {
      session.ttsVoiceId = config.voicePersonas[0].voiceId;
    }

    // Create and connect DeepgramAdapter (STT)
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
      return;
    }

    // Create ElevenLabsAdapter (TTS) - optional, graceful if not configured
    if (config.elevenLabsApiKey) {
      try {
        session.elevenlabsAdapter = new ElevenLabsAdapter({
          apiKey: config.elevenLabsApiKey,
        });
        this.attachElevenLabsListeners(session);
      } catch (err) {
        console.warn(`[VoiceCallService] ElevenLabs setup failed, TTS disabled:`, err);
        session.elevenlabsAdapter = null;
      }
    }
  }

  /**
   * End a voice call session
   * @param callId - Call identifier to end
   */
  endCall(callId: string): void {
    const session = this.sessions.get(callId);
    if (!session) return;

    // Stop TTS if active
    if (session.ttsActive) {
      session.ttsActive = false;
      session.ttsSentenceQueue = [];
      if (session.elevenlabsAdapter) {
        session.elevenlabsAdapter.abort();
      }
    }

    if (session.deepgramAdapter) {
      session.deepgramAdapter.close();
      session.deepgramAdapter = null;
    }

    if (session.elevenlabsAdapter) {
      session.elevenlabsAdapter.removeAllListeners();
      session.elevenlabsAdapter = null;
    }

    session.state = 'ended';
    session.endedAt = new Date();
    this.sessions.delete(callId);

    console.log(`[VoiceCallService] Call ended: ${callId}`);
    this.emit('call.ended', callId);
  }

  /**
   * Handle an incoming audio chunk from the client.
   * Routes to DeepgramAdapter for STT. If TTS is active, triggers barge-in.
   * @param callId - Call identifier
   * @param audioBase64 - Base64-encoded PCM audio data
   */
  handleAudioChunk(callId: string, audioBase64: string): void {
    const session = this.sessions.get(callId);
    if (!session || session.state !== 'active') return;

    // Barge-in: if TTS is playing and user starts speaking, stop TTS
    if (session.ttsActive) {
      this.stopTts(callId);
    }

    if (!session.deepgramAdapter || !session.deepgramAdapter.isConnected) return;

    const audioBuffer = Buffer.from(audioBase64, 'base64');
    session.deepgramAdapter.send(audioBuffer);
  }

  /**
   * Handle an agent text response by converting it to speech.
   * Splits text into sentences and streams each via ElevenLabs TTS.
   * @param callId - Call identifier
   * @param text - Agent response text to speak
   * @param voiceId - Optional ElevenLabs voice ID override
   */
  handleAgentResponse(callId: string, text: string, voiceId?: string): void {
    const session = this.sessions.get(callId);
    if (!session || session.state !== 'active') return;

    if (!session.elevenlabsAdapter) {
      this.emit('tts.fallback', callId, text);
      return;
    }

    const sentences = this.splitIntoSentences(text);
    if (sentences.length === 0) return;

    const resolvedVoiceId = voiceId || session.ttsVoiceId;
    session.ttsSentenceQueue.push(...sentences);

    if (!session.ttsActive) {
      session.ttsActive = true;
      session.ttsVoiceId = resolvedVoiceId;
      this.emit('tts.start', callId);

      this.processTtsQueue(session).catch((err) => {
        console.error(`[VoiceCallService] TTS queue error for call ${session.callId}:`, err);
        session.ttsActive = false;
        this.emit('error', callId, err instanceof Error ? err : new Error(String(err)));
      });
    }
  }

  /**
   * Stop TTS playback (barge-in).
   * Aborts the current ElevenLabs stream and clears the sentence queue.
   * @param callId - Call identifier
   */
  stopTts(callId: string): void {
    const session = this.sessions.get(callId);
    if (!session || !session.ttsActive) return;

    session.ttsActive = false;
    session.ttsSentenceQueue = [];
    session.ttsCurrentAudioChunks = [];

    if (session.elevenlabsAdapter) {
      session.elevenlabsAdapter.abort();
    }

    console.log(`[VoiceCallService] TTS stopped (barge-in): ${callId}`);
    this.emit('tts.stopped', callId);
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

  /**
   * Check if TTS is active for a call
   */
  isTtsActive(callId: string): boolean {
    const session = this.sessions.get(callId);
    return session !== null && session !== undefined && session.ttsActive;
  }

  /**
   * Process the TTS sentence queue sequentially.
   * For each sentence: stream via ElevenLabs, accumulate audio chunks,
   * emit complete sentence audio as a single tts.chunk event.
   */
  private async processTtsQueue(session: ManagedVoiceSession): Promise<void> {
    while (session.ttsSentenceQueue.length > 0 && session.ttsActive) {
      const sentence = session.ttsSentenceQueue.shift()!;
      session.ttsCurrentAudioChunks = [];

      if (!session.elevenlabsAdapter) break;

      // Stream the sentence - audioChunk events are collected by the listener
      await session.elevenlabsAdapter.stream(session.ttsVoiceId, sentence);

      // After stream completes, emit accumulated audio as one chunk
      if (session.ttsActive && session.ttsCurrentAudioChunks.length > 0) {
        const fullAudio = Buffer.concat(session.ttsCurrentAudioChunks);
        this.emit('tts.chunk', session.callId, fullAudio.toString('base64'));
      }
    }

    // All sentences processed
    if (session.ttsActive) {
      session.ttsActive = false;
      this.emit('tts.end', session.callId);
    }
  }

  /**
   * Split text into sentences for streaming TTS.
   * Splits on sentence-ending punctuation followed by whitespace.
   */
  private splitIntoSentences(text: string): string[] {
    return text
      .split(/(?<=[.!?])\s+/)
      .map((s) => s.trim())
      .filter((s) => s.length > 0);
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
      if (session.state === 'active') {
        console.warn(`[VoiceCallService] Deepgram connection lost for call ${session.callId}`);
      }
    });
  }

  private attachElevenLabsListeners(session: ManagedVoiceSession): void {
    const adapter = session.elevenlabsAdapter;
    if (!adapter) return;

    adapter.on('audioChunk', (buffer: Buffer) => {
      if (session.ttsActive) {
        session.ttsCurrentAudioChunks.push(buffer);
      }
    });

    adapter.on('error', (err: Error) => {
      console.error(`[VoiceCallService] ElevenLabs error for call ${session.callId}:`, err.message);
      if (session.ttsActive) {
        session.ttsActive = false;
        session.ttsSentenceQueue = [];
        // Emit fallback: send remaining text as text-only
        this.emit('error', session.callId, err);
      }
    });
  }
}
