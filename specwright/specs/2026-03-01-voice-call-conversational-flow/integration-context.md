# Integration Context - Voice Call Conversational Flow

## Completed Stories

| Story ID | Summary | Key Files |
|----------|---------|-----------|
| VCF-001 | Voice config service + API key management + Settings UI | voice-config.ts, voice.protocol.ts, websocket.ts, settings-view.ts |

## New Exports & APIs

### Services
- `ui/src/server/voice-config.ts` -> `loadVoiceConfigStatus()` - Returns safe config status (no API keys)
- `ui/src/server/voice-config.ts` -> `loadVoiceConfig()` - Returns full config (backend-only)
- `ui/src/server/voice-config.ts` -> `updateVoiceConfig(updates)` - Update config fields

### Types
- `ui/src/shared/types/voice.protocol.ts` -> `VoiceConfig` - Full config interface (backend)
- `ui/src/shared/types/voice.protocol.ts` -> `VoiceConfigStatus` - Safe config for frontend
- `ui/src/shared/types/voice.protocol.ts` -> `VoiceInputMode` - 'push-to-talk' | 'voice-activity'
- `ui/src/shared/types/voice.protocol.ts` -> `VoicePersona` - Persona config interface

## Integration Notes

- Config file: `ui/config/voice-config.json` (created on first save)
- WebSocket messages: `settings.voice.get` / `settings.voice.update` -> response `settings.voice`
- API keys are NEVER sent to frontend - only `isConfigured` booleans
- VoiceConfigService follows general-config.ts pattern (load/save with caching)
- Settings View has new 'voice' tab between 'general' and 'appearance'

## File Change Summary

| File | Action | Story |
|------|--------|-------|
| ui/src/shared/types/voice.protocol.ts | Created | VCF-001 |
| ui/src/server/voice-config.ts | Created | VCF-001 |
| ui/src/server/websocket.ts | Modified | VCF-001 |
| ui/frontend/src/views/settings-view.ts | Modified | VCF-001 |
