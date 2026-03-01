# Integration Context - Voice Call Conversational Flow

## Completed Stories

| Story ID | Summary | Key Files |
|----------|---------|-----------|
| VCF-001 | Voice config service + API key management + Settings UI | voice-config.ts, voice.protocol.ts, websocket.ts, settings-view.ts |
| VCF-002 | Deepgram STT + ElevenLabs TTS adapters with EventEmitter pattern | deepgram.adapter.ts, elevenlabs.adapter.ts |

## New Exports & APIs

### Services
- `ui/src/server/voice-config.ts` -> `loadVoiceConfigStatus()` - Returns safe config status (no API keys)
- `ui/src/server/voice-config.ts` -> `loadVoiceConfig()` - Returns full config (backend-only)
- `ui/src/server/voice-config.ts` -> `updateVoiceConfig(updates)` - Update config fields
- `ui/src/server/services/deepgram.adapter.ts` -> `new DeepgramAdapter({ apiKey })` - STT streaming adapter (EventEmitter: transcript, error, close, open)
- `ui/src/server/services/elevenlabs.adapter.ts` -> `new ElevenLabsAdapter({ apiKey })` - TTS streaming adapter (EventEmitter: audioChunk, complete, error)

### Types
- `ui/src/shared/types/voice.protocol.ts` -> `VoiceConfig` - Full config interface (backend)
- `ui/src/shared/types/voice.protocol.ts` -> `VoiceConfigStatus` - Safe config for frontend
- `ui/src/shared/types/voice.protocol.ts` -> `VoiceInputMode` - 'push-to-talk' | 'voice-activity'
- `ui/src/shared/types/voice.protocol.ts` -> `VoicePersona` - Persona config interface
- `ui/src/server/services/deepgram.adapter.ts` -> `DeepgramTranscriptEvent` - Transcript event type (text, isFinal, confidence)
- `ui/src/server/services/deepgram.adapter.ts` -> `DeepgramAdapterOptions` - Constructor options
- `ui/src/server/services/elevenlabs.adapter.ts` -> `ElevenLabsAdapterOptions` - Constructor options

## Integration Notes

- Config file: `ui/config/voice-config.json` (created on first save)
- WebSocket messages: `settings.voice.get` / `settings.voice.update` -> response `settings.voice`
- API keys are NEVER sent to frontend - only `isConfigured` booleans
- VoiceConfigService follows general-config.ts pattern (load/save with caching)
- Settings View has new 'voice' tab between 'general' and 'appearance'
- DeepgramAdapter uses EventEmitter pattern (like TerminalManager): `connect()`, `send(chunk)`, `close()`
- ElevenLabsAdapter uses EventEmitter pattern: `stream(voiceId, text)` -> emits audioChunk/complete
- Both adapters receive API keys via `loadVoiceConfig()` from VCF-001
- DeepgramAdapter has auto-reconnect (3 attempts, exponential backoff)
- Dependencies: `@deepgram/sdk`, `@elevenlabs/elevenlabs-js` (NOTE: `elevenlabs` is deprecated)

## File Change Summary

| File | Action | Story |
|------|--------|-------|
| ui/src/shared/types/voice.protocol.ts | Created | VCF-001 |
| ui/src/server/voice-config.ts | Created | VCF-001 |
| ui/src/server/websocket.ts | Modified | VCF-001 |
| ui/frontend/src/views/settings-view.ts | Modified | VCF-001 |
| ui/src/server/services/deepgram.adapter.ts | Created | VCF-002 |
| ui/src/server/services/elevenlabs.adapter.ts | Created | VCF-002 |
| ui/package.json | Modified | VCF-002 |
