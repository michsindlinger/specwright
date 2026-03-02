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
import { query as claudeQuery } from '@anthropic-ai/claude-agent-sdk';
import { DeepgramAdapter } from './deepgram.adapter.js';
import type { DeepgramTranscriptEvent } from './deepgram.adapter.js';
import { ElevenLabsAdapter } from './elevenlabs.adapter.js';
import { loadVoiceConfig, getPersonaVoiceId } from '../voice-config.js';
import { getDefaultSelection } from '../model-config.js';
import { saveTranscript } from './transcript.service.js';
import type { TranscriptMessage, TranscriptAction } from './transcript.service.js';

export type VoiceCallState = 'idle' | 'connecting' | 'active' | 'ended';

export interface VoiceCallOptions {
  projectPath?: string;
  systemPrompt?: string;
  agentId?: string;
  agentName?: string;
}

interface VoiceConversationMessage {
  role: 'user' | 'assistant';
  content: string;
}

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
  // VCF-005: Conversation Engine
  conversationHistory: VoiceConversationMessage[];
  projectPath: string;
  systemPrompt: string;
  llmAbortController: AbortController | null;
  isProcessing: boolean;
  agentId?: string;
  agentName?: string;
  // Debounce: accumulate final transcripts before triggering LLM
  transcriptDebounceTimer: ReturnType<typeof setTimeout> | null;
  transcriptBuffer: string;
  // VCF-011: Transcript collection
  transcriptMessages: TranscriptMessage[];
  transcriptActions: TranscriptAction[];
}

const DEFAULT_VOICE_SYSTEM_PROMPT = `You are a voice conversation assistant. You are speaking with the user via a real-time voice call.

VOICE RESPONSE RULES:
- Keep responses concise and conversational - this is a voice call, not a text chat.
- Use short, natural sentences that sound good when spoken aloud.
- Do NOT use markdown formatting, code blocks, bullet points, or special characters.
- When performing actions (creating files, modifying code, etc.), briefly describe what you are doing.
- Acknowledge requests before executing them.
- If you encounter an error, explain it simply and suggest next steps.`;

// ElevenLabs default voice (Rachel - multilingual)
const DEFAULT_VOICE_ID = '21m00Tcm4TlvDq8ikWAM';

export class VoiceCallService extends EventEmitter {
  private sessions: Map<string, ManagedVoiceSession> = new Map();

  /**
   * Start a new voice call session
   * @param callId - Unique call identifier
   * @param clientId - WebSocket client ID
   * @param options - Optional call configuration (projectPath, systemPrompt, agent context)
   */
  startCall(callId: string, clientId: string, options?: VoiceCallOptions): void {
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
      // VCF-005: Conversation Engine
      conversationHistory: [],
      projectPath: options?.projectPath || process.cwd(),
      systemPrompt: options?.systemPrompt || DEFAULT_VOICE_SYSTEM_PROMPT,
      llmAbortController: null,
      isProcessing: false,
      agentId: options?.agentId,
      agentName: options?.agentName,
      transcriptDebounceTimer: null,
      transcriptBuffer: '',
      // VCF-011: Transcript collection
      transcriptMessages: [],
      transcriptActions: [],
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

    // VCF-011: Resolve persona voice for this agent category
    if (options?.agentId) {
      const personaVoiceId = getPersonaVoiceId(options.agentId);
      if (personaVoiceId) {
        session.ttsVoiceId = personaVoiceId;
      }
    }

    // Fallback: default voice from first configured persona
    if (session.ttsVoiceId === DEFAULT_VOICE_ID && config.voicePersonas && config.voicePersonas.length > 0) {
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
        console.log(`[VoiceCallService] ElevenLabs adapter created for ${callId} (voiceId: ${session.ttsVoiceId})`);
      } catch (err) {
        console.warn(`[VoiceCallService] ElevenLabs setup failed, TTS disabled:`, err);
        session.elevenlabsAdapter = null;
      }
    } else {
      console.warn(`[VoiceCallService] No ElevenLabs API key configured, TTS disabled`);
    }
  }

  /**
   * End a voice call session
   * @param callId - Call identifier to end
   */
  endCall(callId: string): void {
    const session = this.sessions.get(callId);
    if (!session) return;

    // Clear transcript debounce timer
    if (session.transcriptDebounceTimer) {
      clearTimeout(session.transcriptDebounceTimer);
      session.transcriptDebounceTimer = null;
    }

    // VCF-005: Abort LLM call if running
    if (session.llmAbortController) {
      session.llmAbortController.abort();
      session.llmAbortController = null;
      session.isProcessing = false;
    }

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

    // VCF-011: Save transcript before deleting session
    if (session.transcriptMessages.length > 0) {
      try {
        saveTranscript(session.projectPath, {
          sessionId: session.callId,
          skillId: session.agentId || 'unknown',
          agentName: session.agentName,
          startTime: session.startedAt.toISOString(),
          endTime: session.endedAt.toISOString(),
          messages: session.transcriptMessages,
          actions: session.transcriptActions,
        });
      } catch (err) {
        console.error(`[VoiceCallService] Failed to save transcript for ${callId}:`, err);
      }
    }

    this.sessions.delete(callId);

    console.log(`[VoiceCallService] Call ended: ${callId}`);
    this.emit('call.ended', callId);
  }

  /**
   * Handle an incoming audio chunk from the client.
   * Routes to DeepgramAdapter for STT processing.
   * Note: Barge-in is NOT triggered here on raw audio chunks because
   * the mic sends data continuously (including silence). Barge-in is
   * handled in the Deepgram transcript handler when actual speech is detected.
   * @param callId - Call identifier
   * @param audioBase64 - Base64-encoded PCM audio data
   */
  handleAudioChunk(callId: string, audioBase64: string): void {
    const session = this.sessions.get(callId);
    if (!session || session.state !== 'active') return;

    if (!session.deepgramAdapter || !session.deepgramAdapter.isConnected) return;

    const audioBuffer = Buffer.from(audioBase64, 'base64');
    session.deepgramAdapter.send(audioBuffer);
  }

  /**
   * Handle text input from frontend (VCF-010).
   * Routes user-typed text through the same conversation engine as STT transcripts.
   * @param callId - Call identifier
   * @param text - User-typed text message
   */
  handleTextInput(callId: string, text: string): void {
    const session = this.sessions.get(callId);
    if (!session || session.state !== 'active') return;

    const trimmed = text.trim();
    if (!trimmed) return;

    // Emit as final transcript so frontend receives it in transcript UI
    this.emit('transcript', session.callId, {
      text: trimmed,
      isFinal: true,
      confidence: 1.0,
    });

    // VCF-011: Collect text input as transcript message
    session.transcriptMessages.push({
      role: 'user',
      text: trimmed,
      timestamp: new Date().toISOString(),
    });

    // Process through LLM conversation engine (same path as STT)
    this.processTranscript(session, trimmed).catch(err => {
      console.error(`[VoiceCallService] LLM error for text input on call ${session.callId}:`, err);
      this.emit('error', session.callId, err instanceof Error ? err : new Error(String(err)));
    });
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

    // Always emit text response so frontend can show it in transcript
    this.emit('agent.response', callId, text);

    if (!session.elevenlabsAdapter) {
      console.warn(`[VoiceCallService] TTS skipped: elevenlabsAdapter is null for ${callId}`);
      return;
    }
    console.log(`[VoiceCallService] TTS: processing "${text.substring(0, 50)}..." for ${callId}`);

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
    console.log(`[VoiceCallService] TTS queue started: ${session.ttsSentenceQueue.length} sentences for ${session.callId}`);
    while (session.ttsSentenceQueue.length > 0 && session.ttsActive) {
      const sentence = session.ttsSentenceQueue.shift()!;
      session.ttsCurrentAudioChunks = [];

      if (!session.elevenlabsAdapter) break;

      console.log(`[VoiceCallService] TTS streaming sentence: "${sentence.substring(0, 50)}..." (voiceId: ${session.ttsVoiceId})`);
      // Stream the sentence - audioChunk events are collected by the listener
      await session.elevenlabsAdapter.stream(session.ttsVoiceId, sentence);

      // After stream completes, emit accumulated audio as one chunk
      console.log(`[VoiceCallService] TTS stream complete: ${session.ttsCurrentAudioChunks.length} chunks collected`);
      if (session.ttsActive && session.ttsCurrentAudioChunks.length > 0) {
        const fullAudio = Buffer.concat(session.ttsCurrentAudioChunks);
        console.log(`[VoiceCallService] TTS emitting audio: ${fullAudio.length} bytes for ${session.callId}`);
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

      // Barge-in: if TTS is active and Deepgram detects actual speech, stop TTS
      if (session.ttsActive && event.text.trim()) {
        console.log(`[VoiceCallService] Barge-in triggered by speech: "${event.text.trim().substring(0, 30)}..."`);
        this.stopTts(session.callId);
      }

      // VCF-005: Debounced LLM trigger - accumulate final transcripts
      // before sending to avoid splitting mid-sentence pauses
      if (event.isFinal && event.text.trim()) {
        // Accumulate text in buffer
        if (session.transcriptBuffer) {
          session.transcriptBuffer += ' ' + event.text.trim();
        } else {
          session.transcriptBuffer = event.text.trim();
        }

        // Clear existing timer
        if (session.transcriptDebounceTimer) {
          clearTimeout(session.transcriptDebounceTimer);
        }

        // Wait 1.5s for more speech before triggering LLM
        session.transcriptDebounceTimer = setTimeout(() => {
          session.transcriptDebounceTimer = null;
          const fullText = session.transcriptBuffer;
          session.transcriptBuffer = '';

          if (!fullText || session.state !== 'active') return;

          // VCF-011: Collect user transcript as single message
          session.transcriptMessages.push({
            role: 'user',
            text: fullText,
            timestamp: new Date().toISOString(),
          });

          console.log(`[VoiceCallService] Debounced transcript: "${fullText}"`);
          this.processTranscript(session, fullText).catch(err => {
            console.error(`[VoiceCallService] LLM error for call ${session.callId}:`, err);
            this.emit('error', session.callId, err instanceof Error ? err : new Error(String(err)));
          });
        }, 1500);
      }
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
      }
      // TTS failure is non-fatal: disable TTS and continue in text-only mode
      console.warn(`[VoiceCallService] TTS disabled for ${session.callId}, falling back to text-only`);
      session.elevenlabsAdapter?.removeAllListeners();
      session.elevenlabsAdapter = null;
    });
  }

  // ============================================================================
  // VCF-005: Agent Conversation Engine
  // ============================================================================

  /**
   * Process a final transcript by sending it to the LLM and streaming
   * the response to the TTS pipeline. Tool calls emit action events.
   *
   * Flow: Final Transcript -> Build Prompt -> Claude CLI -> Text to TTS + Actions to WS
   */
  private async processTranscript(session: ManagedVoiceSession, userText: string): Promise<void> {
    if (session.isProcessing) {
      console.log(`[VoiceCallService] Already processing for ${session.callId}, skipping transcript`);
      return;
    }
    if (session.state !== 'active') return;

    session.isProcessing = true;
    session.conversationHistory.push({ role: 'user', content: userText });

    const prompt = this.buildConversationPrompt(session, userText);

    const { modelId } = getDefaultSelection();

    console.log(`[VoiceCallService] Starting LLM call for ${session.callId} (model: ${modelId})`);

    // Clean env: remove ANTHROPIC_API_KEY (invalid OAuth token) and CLAUDECODE
    // so the Agent SDK uses stored OAuth credentials from `claude auth login`
    delete process.env.ANTHROPIC_API_KEY;
    delete process.env.CLAUDECODE;
    delete process.env.CLAUDE_CODE;

    try {
      const sdkSession = await claudeQuery({
        prompt,
        options: {
          model: modelId,
          maxTurns: 1,
          cwd: session.projectPath,
        },
      });

      let textBuffer = '';
      let fullContent = '';

      for await (const event of sdkSession) {
        if (session.state !== 'active') break;

        this.handleVoiceClaudeEvent(
          session,
          event as Record<string, unknown>,
          (text) => {
            textBuffer += text;
            fullContent += text;
            // Flush complete sentences to TTS in real-time
            const { sentences, remaining } = this.extractCompleteSentences(textBuffer);
            for (const sentence of sentences) {
              this.handleAgentResponse(session.callId, sentence);
            }
            textBuffer = remaining;
          }
        );
      }

      // Flush remaining text
      if (textBuffer.trim()) {
        this.handleAgentResponse(session.callId, textBuffer.trim());
      }

      // Save assistant response to conversation history
      if (fullContent) {
        session.conversationHistory.push({ role: 'assistant', content: fullContent });

        // VCF-011: Collect agent response for transcript
        session.transcriptMessages.push({
          role: 'agent',
          text: fullContent,
          timestamp: new Date().toISOString(),
        });
      }

      session.isProcessing = false;
      console.log(`[VoiceCallService] LLM call complete for ${session.callId} (${fullContent.length} chars)`);
    } catch (err) {
      session.isProcessing = false;
      const error = err instanceof Error ? err : new Error(String(err));
      console.error(`[VoiceCallService] LLM error for call ${session.callId}:`, error.message);
      this.emit('error', session.callId, error);
    }
  }

  /**
   * Build a conversation prompt including system instructions,
   * conversation history, and the current user message.
   */
  private buildConversationPrompt(session: ManagedVoiceSession, currentMessage: string): string {
    const parts: string[] = [];

    // System context
    parts.push(session.systemPrompt);

    // Agent context
    if (session.agentName) {
      parts.push(`\nYou are "${session.agentName}". Stay in character and use your expertise.`);
    }

    // Conversation history (exclude last entry - it's the current message)
    const history = session.conversationHistory.slice(0, -1);
    if (history.length > 0) {
      parts.push('\nPrevious conversation:');
      for (const msg of history) {
        const role = msg.role === 'user' ? 'User' : 'Assistant';
        parts.push(`${role}: ${msg.content}`);
      }
    }

    parts.push(`\nUser: ${currentMessage}`);

    return parts.join('\n');
  }

  /**
   * Handle Claude CLI streaming events for voice conversation.
   * Routes text to TTS and tool calls to action events.
   */
  private handleVoiceClaudeEvent(
    session: ManagedVoiceSession,
    event: Record<string, unknown>,
    onText: (text: string) => void
  ): void {
    const eventType = event.type as string;

    switch (eventType) {
      case 'assistant': {
        const message = event.message as Record<string, unknown> | undefined;
        if (message?.content && Array.isArray(message.content)) {
          for (const block of message.content as Array<Record<string, unknown>>) {
            if (block.type === 'text' && typeof block.text === 'string') {
              onText(block.text);
            } else if (block.type === 'tool_use') {
              const toolId = (block.id as string) || crypto.randomUUID();
              const toolName = (block.name as string) || 'unknown';
              const input = (block.input as Record<string, unknown>) || {};
              console.log(`[VoiceCallService] Tool call: ${toolName} for ${session.callId}`);
              this.emit('action.start', session.callId, { toolId, toolName, input });

              // VCF-011: Collect action for transcript
              session.transcriptActions.push({
                toolId,
                toolName,
                timestamp: new Date().toISOString(),
              });
            }
          }
        }
        break;
      }
      case 'user': {
        const message = event.message as Record<string, unknown> | undefined;
        if (message?.content && Array.isArray(message.content)) {
          for (const block of message.content as Array<Record<string, unknown>>) {
            if (block.type === 'tool_result') {
              const toolId = (block.tool_use_id as string) || '';
              const output = typeof block.content === 'string'
                ? block.content
                : JSON.stringify(block.content);
              console.log(`[VoiceCallService] Tool complete: ${toolId} for ${session.callId}`);
              this.emit('action.complete', session.callId, { toolId, output });

              // VCF-011: Update action output in transcript
              const transcriptAction = session.transcriptActions.find(a => a.toolId === toolId);
              if (transcriptAction) {
                transcriptAction.output = output;
              }
            }
          }
        }
        break;
      }
      // system, result events - no action needed for voice
    }
  }

  /**
   * Extract complete sentences from a text buffer.
   * Returns sentences that end with sentence-ending punctuation,
   * and the remaining incomplete text.
   */
  private extractCompleteSentences(buffer: string): { sentences: string[]; remaining: string } {
    // Split on sentence boundaries (. ! ?) followed by whitespace
    const parts = buffer.split(/(?<=[.!?])\s+/);

    if (parts.length <= 1) {
      // Check if the single part ends with punctuation
      if (/[.!?]$/.test(buffer.trim())) {
        return { sentences: [buffer.trim()], remaining: '' };
      }
      return { sentences: [], remaining: buffer };
    }

    const last = parts[parts.length - 1];
    // If last part doesn't end with punctuation, it's incomplete
    if (!/[.!?]$/.test(last.trim())) {
      return {
        sentences: parts.slice(0, -1).filter(s => s.trim().length > 0),
        remaining: last,
      };
    }

    return {
      sentences: parts.filter(s => s.trim().length > 0),
      remaining: '',
    };
  }
}
