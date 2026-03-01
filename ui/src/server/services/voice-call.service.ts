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
import { spawn, ChildProcess } from 'child_process';
import { DeepgramAdapter } from './deepgram.adapter.js';
import type { DeepgramTranscriptEvent } from './deepgram.adapter.js';
import { ElevenLabsAdapter } from './elevenlabs.adapter.js';
import { loadVoiceConfig } from '../voice-config.js';
import { getProviderCommand, getDefaultSelection } from '../model-config.js';

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
  claudeProcess: ChildProcess | null;
  isProcessing: boolean;
  agentId?: string;
  agentName?: string;
}

const DEFAULT_VOICE_SYSTEM_PROMPT = `You are a voice conversation assistant. You are speaking with the user via a real-time voice call.

VOICE RESPONSE RULES:
- Keep responses concise and conversational - this is a voice call, not a text chat.
- Use short, natural sentences that sound good when spoken aloud.
- Do NOT use markdown formatting, code blocks, bullet points, or special characters.
- When performing actions (creating files, modifying code, etc.), briefly describe what you are doing.
- Acknowledge requests before executing them.
- If you encounter an error, explain it simply and suggest next steps.`;

/**
 * Spawns a process using the user's login shell to ensure OAuth credentials
 * and shell profile configurations are available (needed for Claude Max).
 */
function spawnWithLoginShell(
  command: string,
  args: string[],
  options: Parameters<typeof spawn>[2]
): ChildProcess {
  const userShell = process.env.SHELL || '/bin/zsh';
  const fullCommand = [command, ...args]
    .map(arg => {
      if (arg.includes("'") || arg.includes(' ') || arg.includes('"') || arg.includes('$') || arg.includes('\\')) {
        return `'${arg.replace(/'/g, "'\\''")}'`;
      }
      return arg;
    })
    .join(' ');
  return spawn(userShell, ['-l', '-c', fullCommand], options);
}

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
      claudeProcess: null,
      isProcessing: false,
      agentId: options?.agentId,
      agentName: options?.agentName,
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

    // VCF-005: Kill Claude process if running
    if (session.claudeProcess) {
      session.claudeProcess.kill();
      session.claudeProcess = null;
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

      // VCF-005: Auto-trigger LLM conversation on final transcript
      if (event.isFinal && event.text.trim()) {
        this.processTranscript(session, event.text).catch(err => {
          console.error(`[VoiceCallService] LLM error for call ${session.callId}:`, err);
          this.emit('error', session.callId, err instanceof Error ? err : new Error(String(err)));
        });
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
        // Emit fallback: send remaining text as text-only
        this.emit('error', session.callId, err);
      }
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

    const { providerId, modelId } = getDefaultSelection();
    const providerCommand = getProviderCommand(providerId, modelId);

    if (!providerCommand) {
      session.isProcessing = false;
      this.emit('error', session.callId, new Error('No LLM provider configured'));
      return;
    }

    const { command, args: modelArgs } = providerCommand;
    const cliArgs = [
      ...modelArgs,
      '--print',
      '--verbose',
      '--output-format', 'stream-json',
      prompt,
    ];

    console.log(`[VoiceCallService] Starting LLM call for ${session.callId} (${providerId}/${modelId})`);

    // Remove ANTHROPIC_API_KEY to use Claude Max OAuth instead of API key auth
    const { ANTHROPIC_API_KEY: _removed, ...envWithoutApiKey } = process.env;

    try {
      const claudeProcess = spawnWithLoginShell(command, cliArgs, {
        cwd: session.projectPath,
        env: { ...envWithoutApiKey },
        stdio: ['pipe', 'pipe', 'pipe'],
      });

      session.claudeProcess = claudeProcess;
      claudeProcess.stdin?.end();

      let textBuffer = '';
      let fullContent = '';
      let lineBuffer = '';

      await new Promise<void>((resolve, reject) => {
        claudeProcess.stdout?.on('data', (data: Buffer) => {
          lineBuffer += data.toString();
          const lines = lineBuffer.split('\n');
          lineBuffer = lines.pop() || '';

          for (const line of lines) {
            if (!line.trim()) continue;
            try {
              const event = JSON.parse(line);
              this.handleVoiceClaudeEvent(session, event, (text) => {
                textBuffer += text;
                fullContent += text;
                // Flush complete sentences to TTS in real-time
                const { sentences, remaining } = this.extractCompleteSentences(textBuffer);
                for (const sentence of sentences) {
                  this.handleAgentResponse(session.callId, sentence);
                }
                textBuffer = remaining;
              });
            } catch {
              // Non-JSON output, treat as text
              if (line.trim()) {
                textBuffer += line + ' ';
                fullContent += line + ' ';
              }
            }
          }
        });

        claudeProcess.stderr?.on('data', (data: Buffer) => {
          console.error(`[VoiceCallService] Claude stderr: ${data.toString().substring(0, 200)}`);
        });

        claudeProcess.on('close', (code) => {
          // Process remaining line buffer
          if (lineBuffer.trim()) {
            try {
              const event = JSON.parse(lineBuffer);
              this.handleVoiceClaudeEvent(session, event, (text) => {
                textBuffer += text;
                fullContent += text;
              });
            } catch {
              if (lineBuffer.trim()) {
                fullContent += lineBuffer;
                textBuffer += lineBuffer;
              }
            }
          }

          // Flush remaining text to TTS
          if (textBuffer.trim()) {
            this.handleAgentResponse(session.callId, textBuffer.trim());
          }

          // Save assistant response to conversation history
          if (fullContent) {
            session.conversationHistory.push({ role: 'assistant', content: fullContent });
          }

          session.claudeProcess = null;
          session.isProcessing = false;

          console.log(`[VoiceCallService] LLM call complete for ${session.callId} (code: ${code})`);

          if (code === 0) resolve();
          else reject(new Error(`Claude CLI exited with code ${code}`));
        });

        claudeProcess.on('error', (err) => {
          session.claudeProcess = null;
          session.isProcessing = false;
          reject(err);
        });
      });
    } catch (err) {
      session.isProcessing = false;
      session.claudeProcess = null;
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
