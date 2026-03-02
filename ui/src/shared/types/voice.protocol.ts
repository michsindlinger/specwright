/**
 * Voice Protocol Types
 *
 * Defines the contract for Voice WebSocket communication.
 * Central type file for all voice:* and settings.voice.* messages.
 * Used by VoiceConfigService (backend) and Settings View (frontend).
 */

// ============================================================================
// Configuration Types
// ============================================================================

/**
 * Input mode for voice calls
 */
export type VoiceInputMode = 'push-to-talk' | 'voice-activity';

/**
 * Voice persona configuration for TTS
 */
export interface VoicePersona {
  /** Unique persona identifier */
  id: string;
  /** Display name */
  name: string;
  /** ElevenLabs voice ID */
  voiceId: string;
}

/**
 * Voice configuration stored in voice-config.json
 */
export interface VoiceConfig {
  /** Deepgram API key for STT */
  deepgramApiKey: string;
  /** ElevenLabs API key for TTS */
  elevenLabsApiKey: string;
  /** Default input mode for new voice calls */
  defaultInputMode: VoiceInputMode;
  /** Configured voice personas */
  voicePersonas: VoicePersona[];
}

/**
 * Safe voice config sent to frontend (no API key values)
 */
export interface VoiceConfigStatus {
  /** Whether Deepgram API key is configured */
  deepgramConfigured: boolean;
  /** Whether ElevenLabs API key is configured */
  elevenLabsConfigured: boolean;
  /** Default input mode for new voice calls */
  defaultInputMode: VoiceInputMode;
  /** Configured voice personas (safe to expose) */
  voicePersonas: VoicePersona[];
}

// ============================================================================
// Settings Message Types
// ============================================================================

/**
 * Voice settings message types for WebSocket communication
 */
export type VoiceSettingsMessageType =
  // Client -> Server
  | 'settings.voice.get'
  | 'settings.voice.update'
  // Server -> Client
  | 'settings.voice'
  | 'settings.error';

// ============================================================================
// Client -> Server Messages
// ============================================================================

/**
 * Request current voice configuration status
 */
export interface VoiceSettingsGetMessage {
  type: 'settings.voice.get';
  timestamp: string;
}

/**
 * Update voice configuration
 */
export interface VoiceSettingsUpdateMessage {
  type: 'settings.voice.update';
  /** Deepgram API key (optional, only sent when changed) */
  deepgramApiKey?: string;
  /** ElevenLabs API key (optional, only sent when changed) */
  elevenLabsApiKey?: string;
  /** Default input mode (optional) */
  defaultInputMode?: VoiceInputMode;
  timestamp: string;
}

// ============================================================================
// Server -> Client Messages
// ============================================================================

/**
 * Voice configuration status response (no API key values exposed)
 */
export interface VoiceSettingsResponseMessage {
  type: 'settings.voice';
  config: VoiceConfigStatus;
  timestamp: string;
}
