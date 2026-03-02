/**
 * AudioPlaybackService
 *
 * Browser audio playback service for Voice Calls.
 * Receives audio chunks (mp3) from the backend TTS pipeline,
 * decodes them via AudioContext, and plays them sequentially.
 *
 * Architecture:
 * - AudioContext + AudioBufferSourceNode for chunk-based playback
 * - Queue management for sequential sentence playback
 * - Barge-in support: stops playback and notifies backend
 *
 * Events via callbacks (matching AudioCaptureService pattern):
 * - onStateChange(state) - Playback state changed
 * - onPlaybackStart() - Audio started playing
 * - onPlaybackEnd() - All queued audio finished
 * - onBargeIn() - Playback interrupted by user
 */

import { gateway } from '../gateway.js';

export type AudioPlaybackState = 'idle' | 'playing' | 'error';

export interface AudioPlaybackCallbacks {
  onStateChange?: (state: AudioPlaybackState) => void;
  onPlaybackStart?: () => void;
  onPlaybackEnd?: () => void;
  onBargeIn?: () => void;
}

export class AudioPlaybackService {
  private state: AudioPlaybackState = 'idle';
  private audioContext: AudioContext | null = null;
  private currentSource: AudioBufferSourceNode | null = null;
  private analyser: AnalyserNode | null = null;
  private queue: AudioBuffer[] = [];
  private isProcessing = false;
  private callbacks: AudioPlaybackCallbacks = {};
  private callId: string | null = null;

  /**
   * Initialize the playback service for a call
   * @param callId - Voice call session ID
   * @param callbacks - Optional callbacks for state changes
   */
  init(callId: string, callbacks?: AudioPlaybackCallbacks): void {
    this.callId = callId;
    this.callbacks = callbacks || {};
    this.audioContext = new AudioContext();
    this.analyser = this.audioContext.createAnalyser();
    this.analyser.fftSize = 128;
    this.analyser.smoothingTimeConstant = 0.8;
    this.analyser.connect(this.audioContext.destination);
    this.queue = [];
    this.isProcessing = false;
    this.setState('idle');
  }

  /**
   * Enqueue an audio chunk for playback.
   * Audio is decoded from base64 mp3 and queued for sequential playback.
   * @param audioBase64 - Base64-encoded audio data (mp3)
   */
  async enqueue(audioBase64: string): Promise<void> {
    if (!this.audioContext) return;

    try {
      const binaryString = atob(audioBase64);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }

      // decodeAudioData requires a fresh ArrayBuffer (not shared)
      const arrayBuffer = bytes.buffer.slice(0) as ArrayBuffer;
      const audioBuffer = await this.audioContext.decodeAudioData(arrayBuffer);
      this.queue.push(audioBuffer);

      if (!this.isProcessing) {
        this.playNext();
      }
    } catch (err) {
      console.error('[AudioPlaybackService] Decode error:', err);
      this.setState('error');
    }
  }

  /**
   * Stop playback immediately (barge-in).
   * Clears the queue and notifies the backend to stop TTS generation.
   */
  stop(): void {
    if (this.currentSource) {
      try {
        this.currentSource.stop();
      } catch {
        // Already stopped
      }
      this.currentSource.disconnect();
      this.currentSource = null;
    }

    this.queue = [];
    this.isProcessing = false;

    if (this.state === 'playing') {
      this.callbacks.onBargeIn?.();

      if (this.callId) {
        gateway.send({
          type: 'voice:tts:stop',
          callId: this.callId,
          timestamp: new Date().toISOString(),
        });
      }
    }

    this.setState('idle');
  }

  /**
   * Release all resources
   */
  destroy(): void {
    this.stop();
    if (this.analyser) {
      this.analyser.disconnect();
      this.analyser = null;
    }
    if (this.audioContext) {
      this.audioContext.close().catch(() => {});
      this.audioContext = null;
    }
    this.callId = null;
  }

  /**
   * Get current playback state
   */
  getState(): AudioPlaybackState {
    return this.state;
  }

  /**
   * Get the AnalyserNode for audio visualization
   */
  getAnalyser(): AnalyserNode | null {
    return this.analyser;
  }

  /**
   * Check if audio is currently playing
   */
  get isPlaying(): boolean {
    return this.state === 'playing';
  }

  private playNext(): void {
    if (!this.audioContext || this.queue.length === 0) {
      this.isProcessing = false;
      if (this.state === 'playing') {
        this.setState('idle');
        this.callbacks.onPlaybackEnd?.();
      }
      return;
    }

    this.isProcessing = true;
    const buffer = this.queue.shift()!;

    if (this.state !== 'playing') {
      this.setState('playing');
      this.callbacks.onPlaybackStart?.();
    }

    // Resume AudioContext if suspended (browser autoplay policy)
    if (this.audioContext.state === 'suspended') {
      this.audioContext.resume().catch(() => {});
    }

    const source = this.audioContext.createBufferSource();
    source.buffer = buffer;
    source.connect(this.analyser || this.audioContext.destination);

    source.onended = () => {
      this.currentSource = null;
      this.playNext();
    };

    this.currentSource = source;
    source.start();
  }

  private setState(state: AudioPlaybackState): void {
    this.state = state;
    this.callbacks.onStateChange?.(state);
  }
}
