/**
 * ElevenLabsAdapter
 *
 * Adapter for ElevenLabs Streaming Text-to-Speech API.
 * Wraps @elevenlabs/elevenlabs-js for simplified TTS management.
 *
 * Architecture:
 * - Adapter Pattern: Wraps ElevenLabs SDK, exposes EventEmitter callbacks
 * - Events: onAudioChunk(buffer), onComplete(), onError(error)
 * - Receives API key via VoiceConfigService (VCF-001)
 * - Streaming: Returns audio chunks as they become available
 */

import { EventEmitter } from 'events';
import { ElevenLabsClient } from '@elevenlabs/elevenlabs-js';

export interface ElevenLabsAdapterOptions {
  apiKey: string;
  modelId?: string;
  voiceSettings?: {
    stability?: number;
    similarityBoost?: number;
    style?: number;
    useSpeakerBoost?: boolean;
  };
  optimizeStreamingLatency?: number;
}

const DEFAULT_OPTIONS: Omit<ElevenLabsAdapterOptions, 'apiKey'> = {
  modelId: 'eleven_multilingual_v2',
  voiceSettings: {
    stability: 0.5,
    similarityBoost: 0.75,
    style: 0.0,
    useSpeakerBoost: false,
  },
  optimizeStreamingLatency: 3,
};

/**
 * ElevenLabsAdapter - Text-to-Speech streaming adapter
 *
 * Emits:
 * - 'audioChunk' (Buffer) - Audio chunk received from stream
 * - 'complete' () - Stream finished, all audio delivered
 * - 'error' (Error) - Error occurred
 */
export class ElevenLabsAdapter extends EventEmitter {
  private client: ElevenLabsClient;
  private options: Required<Omit<ElevenLabsAdapterOptions, 'apiKey'>> & { apiKey: string };
  private isStreaming = false;

  constructor(options: ElevenLabsAdapterOptions) {
    super();

    if (!options.apiKey || options.apiKey.trim().length === 0) {
      throw new Error('ElevenLabs API Key ungueltig');
    }

    this.options = {
      ...DEFAULT_OPTIONS,
      ...options,
      voiceSettings: {
        ...DEFAULT_OPTIONS.voiceSettings,
        ...options.voiceSettings,
      },
    } as Required<Omit<ElevenLabsAdapterOptions, 'apiKey'>> & { apiKey: string };

    this.client = new ElevenLabsClient({
      apiKey: this.options.apiKey,
    });
  }

  /**
   * Stream text-to-speech audio for the given text and voice.
   *
   * @param voiceId - ElevenLabs voice ID to use
   * @param text - Text to convert to speech
   */
  async stream(voiceId: string, text: string): Promise<void> {
    if (this.isStreaming) {
      this.emit('error', new Error('Already streaming - wait for current stream to complete'));
      return;
    }

    if (!text || text.trim().length === 0) {
      this.emit('error', new Error('Text darf nicht leer sein'));
      return;
    }

    this.isStreaming = true;

    try {
      const audioStream = await this.client.textToSpeech.stream(voiceId, {
        text,
        modelId: this.options.modelId,
        voiceSettings: {
          stability: this.options.voiceSettings.stability,
          similarityBoost: this.options.voiceSettings.similarityBoost,
          style: this.options.voiceSettings.style,
          useSpeakerBoost: this.options.voiceSettings.useSpeakerBoost,
        },
        optimizeStreamingLatency: this.options.optimizeStreamingLatency,
      });

      await this.processStream(audioStream);
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      console.error('[ElevenLabsAdapter] Error:', error.message);

      if (error.message.includes('401') || error.message.includes('Unauthorized')) {
        this.emit('error', new Error('ElevenLabs API Key ungueltig'));
      } else {
        this.emit('error', error);
      }
    } finally {
      this.isStreaming = false;
    }
  }

  private async processStream(audioStream: ReadableStream<Uint8Array>): Promise<void> {
    const reader = audioStream.getReader();

    try {
      while (true) {
        const { done, value } = await reader.read();

        if (done) {
          this.emit('complete');
          break;
        }

        if (value) {
          const buffer = Buffer.from(value);
          this.emit('audioChunk', buffer);
        }
      }
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      console.error('[ElevenLabsAdapter] Stream error:', error.message);
      this.emit('error', error);
    } finally {
      reader.releaseLock();
    }
  }

  /**
   * Check if the adapter is currently streaming
   */
  get streaming(): boolean {
    return this.isStreaming;
  }
}
