/**
 * AudioCaptureService
 *
 * Browser Microphone capture service for Voice Calls.
 * Captures audio from getUserMedia, processes it into PCM 16kHz 16-bit chunks,
 * and streams them via WebSocket Gateway.
 *
 * Architecture:
 * - getUserMedia() for microphone access
 * - AudioContext + ScriptProcessorNode for PCM conversion
 * - Resamples to 16kHz mono, 16-bit PCM
 * - Sends ~100ms chunks via gateway as voice:audio:chunk messages
 *
 * Events emitted via callbacks (no EventEmitter in browser):
 * - onChunk(chunk: ArrayBuffer) - PCM audio chunk ready
 * - onError(error: Error) - Error occurred
 * - onPermissionDenied() - Microphone permission denied
 */

import { gateway } from '../gateway.js';

export type AudioCaptureState = 'idle' | 'requesting' | 'capturing' | 'error';

export interface AudioCaptureCallbacks {
  onStateChange?: (state: AudioCaptureState) => void;
  onError?: (error: Error) => void;
  onPermissionDenied?: () => void;
}

const TARGET_SAMPLE_RATE = 16000;
// ScriptProcessorNode buffer size: 4096 samples at 16kHz ≈ 256ms
const BUFFER_SIZE = 4096;

export class AudioCaptureService {
  private state: AudioCaptureState = 'idle';
  private mediaStream: MediaStream | null = null;
  private audioContext: AudioContext | null = null;
  private sourceNode: MediaStreamAudioSourceNode | null = null;
  private processorNode: ScriptProcessorNode | null = null;
  private callbacks: AudioCaptureCallbacks = {};
  private callId: string | null = null;

  /**
   * Start capturing audio from the microphone
   * @param callId - Voice call session ID for message routing
   * @param callbacks - Optional callbacks for state changes and errors
   */
  async start(callId: string, callbacks?: AudioCaptureCallbacks): Promise<boolean> {
    if (this.state === 'capturing') {
      return true;
    }

    this.callId = callId;
    this.callbacks = callbacks || {};
    this.setState('requesting');

    try {
      this.mediaStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          sampleRate: TARGET_SAMPLE_RATE,
        },
        video: false,
      });

      this.setupAudioPipeline();
      this.setState('capturing');
      return true;
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));

      if (error.name === 'NotAllowedError' || error.name === 'PermissionDeniedError') {
        this.setState('error');
        this.callbacks.onPermissionDenied?.();
        return false;
      }

      this.setState('error');
      this.callbacks.onError?.(error);
      return false;
    }
  }

  /**
   * Stop capturing audio and release resources
   */
  stop(): void {
    if (this.processorNode) {
      this.processorNode.disconnect();
      this.processorNode = null;
    }

    if (this.sourceNode) {
      this.sourceNode.disconnect();
      this.sourceNode = null;
    }

    if (this.audioContext) {
      this.audioContext.close().catch(() => {});
      this.audioContext = null;
    }

    if (this.mediaStream) {
      this.mediaStream.getTracks().forEach((track) => track.stop());
      this.mediaStream = null;
    }

    this.callId = null;
    this.setState('idle');
  }

  /**
   * Get current capture state
   */
  getState(): AudioCaptureState {
    return this.state;
  }

  /**
   * Get the active MediaStream (for creating AnalyserNodes externally)
   */
  getMediaStream(): MediaStream | null {
    return this.mediaStream;
  }

  /**
   * Mute microphone without stopping capture (disables audio track)
   */
  mute(): void {
    if (this.mediaStream) {
      this.mediaStream.getAudioTracks().forEach((t) => { t.enabled = false; });
    }
  }

  /**
   * Unmute microphone (re-enables audio track)
   */
  unmute(): void {
    if (this.mediaStream) {
      this.mediaStream.getAudioTracks().forEach((t) => { t.enabled = true; });
    }
  }

  private setState(state: AudioCaptureState): void {
    this.state = state;
    this.callbacks.onStateChange?.(state);
  }

  private setupAudioPipeline(): void {
    if (!this.mediaStream) return;

    // Create AudioContext - browser may provide different sample rate
    this.audioContext = new AudioContext({ sampleRate: TARGET_SAMPLE_RATE });

    this.sourceNode = this.audioContext.createMediaStreamSource(this.mediaStream);

    // ScriptProcessorNode for raw PCM access
    // Note: ScriptProcessorNode is deprecated but AudioWorklet requires
    // a separate file served over HTTPS. ScriptProcessorNode works everywhere.
    this.processorNode = this.audioContext.createScriptProcessor(BUFFER_SIZE, 1, 1);

    this.processorNode.onaudioprocess = (event: AudioProcessingEvent) => {
      if (this.state !== 'capturing' || !this.callId) return;

      const inputData = event.inputBuffer.getChannelData(0);

      // Resample if AudioContext sample rate differs from target
      const pcmData = this.audioContext && this.audioContext.sampleRate !== TARGET_SAMPLE_RATE
        ? this.resample(inputData, this.audioContext.sampleRate, TARGET_SAMPLE_RATE)
        : inputData;

      // Convert Float32 to Int16 PCM
      const pcmInt16 = this.float32ToInt16(pcmData);

      // Send via gateway
      this.sendAudioChunk(pcmInt16);
    };

    this.sourceNode.connect(this.processorNode);
    // Connect to destination to keep the pipeline running
    this.processorNode.connect(this.audioContext.destination);
  }

  private resample(input: Float32Array, fromRate: number, toRate: number): Float32Array {
    const ratio = fromRate / toRate;
    const outputLength = Math.round(input.length / ratio);
    const output = new Float32Array(outputLength);

    for (let i = 0; i < outputLength; i++) {
      const srcIndex = i * ratio;
      const srcIndexFloor = Math.floor(srcIndex);
      const srcIndexCeil = Math.min(srcIndexFloor + 1, input.length - 1);
      const fraction = srcIndex - srcIndexFloor;

      // Linear interpolation
      output[i] = input[srcIndexFloor] * (1 - fraction) + input[srcIndexCeil] * fraction;
    }

    return output;
  }

  private float32ToInt16(float32Array: Float32Array): ArrayBuffer {
    const int16Array = new Int16Array(float32Array.length);

    for (let i = 0; i < float32Array.length; i++) {
      // Clamp to [-1, 1] and convert to Int16 range
      const s = Math.max(-1, Math.min(1, float32Array[i]));
      int16Array[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
    }

    return int16Array.buffer;
  }

  private sendAudioChunk(pcmBuffer: ArrayBuffer): void {
    if (!this.callId) return;

    // Convert ArrayBuffer to base64 for JSON transport over WebSocket
    const bytes = new Uint8Array(pcmBuffer);
    let binary = '';
    for (let i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    const base64 = btoa(binary);

    gateway.send({
      type: 'voice:audio:chunk',
      callId: this.callId,
      audio: base64,
      sampleRate: TARGET_SAMPLE_RATE,
      encoding: 'pcm16',
      timestamp: new Date().toISOString(),
    });
  }
}
