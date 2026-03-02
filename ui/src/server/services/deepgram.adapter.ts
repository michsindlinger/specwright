/**
 * DeepgramAdapter
 *
 * Adapter for Deepgram Nova-3 Streaming Speech-to-Text API.
 * Wraps @deepgram/sdk for simplified STT management.
 *
 * Architecture:
 * - Adapter Pattern: Wraps Deepgram SDK, exposes EventEmitter callbacks
 * - Events: onTranscript(text, isFinal), onError(error), onClose()
 * - Receives API key via VoiceConfigService (VCF-001)
 * - Reconnect logic on unexpected disconnection
 */

import { EventEmitter } from 'events';
import { createClient, LiveTranscriptionEvents } from '@deepgram/sdk';
import type { ListenLiveClient } from '@deepgram/sdk';

export interface DeepgramTranscriptEvent {
  text: string;
  isFinal: boolean;
  confidence: number;
}

export interface DeepgramAdapterOptions {
  apiKey: string;
  model?: string;
  language?: string;
  interimResults?: boolean;
  utteranceEndMs?: number;
  endpointing?: number;
}

const DEFAULT_OPTIONS: Omit<DeepgramAdapterOptions, 'apiKey'> = {
  model: 'nova-3',
  language: 'multi',
  interimResults: true,
  utteranceEndMs: 1000,
  endpointing: 300,
};

const MAX_RECONNECT_ATTEMPTS = 3;
const RECONNECT_DELAY_MS = 2000;
const KEEPALIVE_INTERVAL_MS = 8000;

/**
 * DeepgramAdapter - Speech-to-Text streaming adapter
 *
 * Emits:
 * - 'transcript' (DeepgramTranscriptEvent) - Transcript data received
 * - 'error' (Error) - Error occurred
 * - 'close' () - Connection closed
 * - 'open' () - Connection established and ready
 * - 'speechStarted' () - Speech activity detected
 * - 'utteranceEnd' () - Utterance completed
 */
export class DeepgramAdapter extends EventEmitter {
  private connection: ListenLiveClient | null = null;
  private keepAliveTimer: NodeJS.Timeout | null = null;
  private reconnectAttempts = 0;
  private intentionallyClosed = false;
  private options: Required<Omit<DeepgramAdapterOptions, 'apiKey'>> & { apiKey: string };

  constructor(options: DeepgramAdapterOptions) {
    super();

    if (!options.apiKey || options.apiKey.trim().length === 0) {
      throw new Error('Deepgram API Key ungueltig');
    }

    this.options = {
      ...DEFAULT_OPTIONS,
      ...options,
    } as Required<Omit<DeepgramAdapterOptions, 'apiKey'>> & { apiKey: string };
  }

  /**
   * Connect to Deepgram Live Transcription API
   */
  connect(): void {
    this.intentionallyClosed = false;
    this.reconnectAttempts = 0;
    this.establishConnection();
  }

  private establishConnection(): void {
    try {
      const deepgram = createClient(this.options.apiKey);

      this.connection = deepgram.listen.live({
        model: this.options.model,
        language: this.options.language,
        smart_format: true,
        interim_results: this.options.interimResults,
        utterance_end_ms: this.options.utteranceEndMs,
        endpointing: this.options.endpointing,
        vad_events: true,
        encoding: 'linear16',
        sample_rate: 16000,
        channels: 1,
      });

      this.attachListeners();
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      this.emit('error', error);
    }
  }

  private attachListeners(): void {
    if (!this.connection) return;

    this.connection.on(LiveTranscriptionEvents.Open, () => {
      console.log('[DeepgramAdapter] Connection opened');
      this.reconnectAttempts = 0;
      this.startKeepAlive();
      this.emit('open');
    });

    this.connection.on(LiveTranscriptionEvents.Transcript, (data: {
      is_final: boolean;
      channel: {
        alternatives: Array<{
          transcript: string;
          confidence: number;
        }>;
      };
    }) => {
      const alternative = data.channel?.alternatives?.[0];
      if (!alternative || !alternative.transcript) return;

      const event: DeepgramTranscriptEvent = {
        text: alternative.transcript,
        isFinal: data.is_final,
        confidence: alternative.confidence,
      };

      this.emit('transcript', event);
    });

    this.connection.on(LiveTranscriptionEvents.SpeechStarted, () => {
      this.emit('speechStarted');
    });

    this.connection.on(LiveTranscriptionEvents.UtteranceEnd, () => {
      this.emit('utteranceEnd');
    });

    this.connection.on(LiveTranscriptionEvents.Error, (err: unknown) => {
      const error = err instanceof Error ? err : new Error(String(err));
      console.error('[DeepgramAdapter] Error:', error.message);
      this.emit('error', error);
    });

    this.connection.on(LiveTranscriptionEvents.Close, () => {
      console.log('[DeepgramAdapter] Connection closed');
      this.stopKeepAlive();

      if (!this.intentionallyClosed) {
        this.attemptReconnect();
      } else {
        this.emit('close');
      }
    });
  }

  private attemptReconnect(): void {
    if (this.reconnectAttempts >= MAX_RECONNECT_ATTEMPTS) {
      console.warn('[DeepgramAdapter] Max reconnect attempts reached');
      this.emit('error', new Error('Deepgram Verbindung dauerhaft verloren nach ' + MAX_RECONNECT_ATTEMPTS + ' Versuchen'));
      this.emit('close');
      return;
    }

    this.reconnectAttempts++;
    const delay = RECONNECT_DELAY_MS * this.reconnectAttempts;
    console.log(`[DeepgramAdapter] Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts}/${MAX_RECONNECT_ATTEMPTS})`);

    setTimeout(() => {
      if (!this.intentionallyClosed) {
        this.establishConnection();
      }
    }, delay);
  }

  private startKeepAlive(): void {
    this.stopKeepAlive();
    this.keepAliveTimer = setInterval(() => {
      if (this.connection) {
        this.connection.keepAlive();
      }
    }, KEEPALIVE_INTERVAL_MS);
  }

  private stopKeepAlive(): void {
    if (this.keepAliveTimer) {
      clearInterval(this.keepAliveTimer);
      this.keepAliveTimer = null;
    }
  }

  /**
   * Send an audio chunk to Deepgram for transcription
   */
  send(audioChunk: Buffer): void {
    if (!this.connection) {
      this.emit('error', new Error('No active Deepgram connection'));
      return;
    }
    this.connection.send(audioChunk.buffer.slice(audioChunk.byteOffset, audioChunk.byteOffset + audioChunk.byteLength));
  }

  /**
   * Gracefully close the connection
   */
  close(): void {
    this.intentionallyClosed = true;
    this.stopKeepAlive();

    if (this.connection) {
      this.connection.requestClose();
      this.connection = null;
    }

    this.emit('close');
  }

  /**
   * Check if the adapter has an active connection
   */
  get isConnected(): boolean {
    return this.connection !== null;
  }
}
