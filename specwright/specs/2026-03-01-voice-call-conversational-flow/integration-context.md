# Integration Context - Voice Call Conversational Flow

## Completed Stories

| Story ID | Summary | Key Files |
|----------|---------|-----------|
| VCF-001 | Voice config service + API key management + Settings UI | voice-config.ts, voice.protocol.ts, websocket.ts, settings-view.ts |
| VCF-002 | Deepgram STT + ElevenLabs TTS adapters with EventEmitter pattern | deepgram.adapter.ts, elevenlabs.adapter.ts |
| VCF-003 | STT Pipeline: AudioCaptureService (Frontend) + VoiceCallService (Backend) + WS routing | audio-capture.service.ts, voice-call.service.ts, websocket.ts, gateway.ts |
| VCF-004 | TTS Pipeline: AudioPlaybackService (Frontend) + VoiceCallService TTS flow + ElevenLabs integration + Barge-in | audio-playback.service.ts, voice-call.service.ts, elevenlabs.adapter.ts, websocket.ts |
| VCF-005 | Agent Conversation Engine: Full STT->LLM->TTS loop, Claude CLI integration, tool call events, conversation history | voice-call.service.ts, websocket.ts |
| VCF-006 | Fullscreen Voice Call View, route 'call', Gateway voice:* listeners, agent info display | voice-call-view.ts, route.types.ts, app.ts |

## New Exports & APIs

### Services
- `ui/src/server/voice-config.ts` -> `loadVoiceConfigStatus()` - Returns safe config status (no API keys)
- `ui/src/server/voice-config.ts` -> `loadVoiceConfig()` - Returns full config (backend-only)
- `ui/src/server/voice-config.ts` -> `updateVoiceConfig(updates)` - Update config fields
- `ui/src/server/services/deepgram.adapter.ts` -> `new DeepgramAdapter({ apiKey })` - STT streaming adapter (EventEmitter: transcript, error, close, open)
- `ui/src/server/services/elevenlabs.adapter.ts` -> `new ElevenLabsAdapter({ apiKey })` - TTS streaming adapter (EventEmitter: audioChunk, complete, error)
- `ui/src/server/services/voice-call.service.ts` -> `new VoiceCallService()` - Core voice orchestrator (EventEmitter: transcript, error, call.started, call.ended)
- `ui/src/server/services/voice-call.service.ts` -> `voiceCallService.startCall(callId, clientId, options?)` - Start a voice call session (options: projectPath, systemPrompt, agentId, agentName)
- `ui/src/server/services/voice-call.service.ts` -> `voiceCallService.endCall(callId)` - End a voice call session
- `ui/src/server/services/voice-call.service.ts` -> `voiceCallService.handleAudioChunk(callId, audioBase64)` - Route audio to DeepgramAdapter
- `ui/frontend/src/services/audio-capture.service.ts` -> `new AudioCaptureService()` - Browser microphone capture (PCM 16kHz, WS streaming)
- `ui/frontend/src/services/audio-playback.service.ts` -> `new AudioPlaybackService()` - Browser audio playback (AudioContext, chunk queue, barge-in)
- `ui/src/server/services/voice-call.service.ts` -> `voiceCallService.handleAgentResponse(callId, text, voiceId?)` - Route agent text to TTS pipeline
- `ui/src/server/services/voice-call.service.ts` -> `voiceCallService.stopTts(callId)` - Stop TTS (barge-in)
- `ui/src/server/services/voice-call.service.ts` -> `voiceCallService.isTtsActive(callId)` - Check TTS state
- `ui/src/server/services/elevenlabs.adapter.ts` -> `elevenlabsAdapter.abort()` - Abort current TTS stream

### VCF-005: Conversation Engine (auto-triggered, no direct API calls needed)
- VoiceCallService auto-triggers LLM call on final transcript (no frontend action needed)
- `voice:call:start` message now accepts: `agentId`, `agentName`, `systemPrompt` (all optional)
- Conversation history maintained in-memory per session (Map<callId, messages[]>)

### Types
- `ui/src/shared/types/voice.protocol.ts` -> `VoiceConfig` - Full config interface (backend)
- `ui/src/shared/types/voice.protocol.ts` -> `VoiceConfigStatus` - Safe config for frontend
- `ui/src/shared/types/voice.protocol.ts` -> `VoiceInputMode` - 'push-to-talk' | 'voice-activity'
- `ui/src/shared/types/voice.protocol.ts` -> `VoicePersona` - Persona config interface
- `ui/src/server/services/deepgram.adapter.ts` -> `DeepgramTranscriptEvent` - Transcript event type (text, isFinal, confidence)
- `ui/src/server/services/deepgram.adapter.ts` -> `DeepgramAdapterOptions` - Constructor options
- `ui/src/server/services/elevenlabs.adapter.ts` -> `ElevenLabsAdapterOptions` - Constructor options
- `ui/src/server/services/voice-call.service.ts` -> `VoiceCallSession` - Session info interface
- `ui/src/server/services/voice-call.service.ts` -> `VoiceCallState` - 'idle' | 'connecting' | 'active' | 'ended'
- `ui/src/server/services/voice-call.service.ts` -> `VoiceCallOptions` - startCall options (projectPath, systemPrompt, agentId, agentName)
- `ui/frontend/src/services/audio-capture.service.ts` -> `AudioCaptureState` - 'idle' | 'requesting' | 'capturing' | 'error'
- `ui/frontend/src/services/audio-playback.service.ts` -> `AudioPlaybackState` - 'idle' | 'playing' | 'error'
- `ui/frontend/src/services/audio-playback.service.ts` -> `AudioPlaybackCallbacks` - Callback interface (onStateChange, onPlaybackStart, onPlaybackEnd, onBargeIn)

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
- VoiceCallService follows CloudTerminalManager pattern (EventEmitter, Session-Map, Lifecycle)
- Audio pipeline: Browser getUserMedia → PCM 16kHz → base64 → WS `voice:audio:chunk` → VoiceCallService → DeepgramAdapter
- Transcript pipeline: DeepgramAdapter `transcript` event → VoiceCallService → WS `voice:transcript:interim/final` → Frontend
- WS message types: `voice:call:start`, `voice:call:end`, `voice:audio:chunk`, `voice:call:started`, `voice:call:ended`, `voice:transcript:interim`, `voice:transcript:final`, `voice:error`
- Gateway methods: `sendVoiceCallStart(callId)`, `sendVoiceCallEnd(callId)`, `sendVoiceAudioChunk(callId, audio)`
- AudioCaptureService sends audio directly via `gateway.send()` (not Gateway methods) for performance
- Client disconnect automatically cleans up voice call sessions via `endCallsForClient()`
- TTS pipeline: `handleAgentResponse(callId, text)` → split into sentences → ElevenLabsAdapter.stream() per sentence → accumulate audio chunks → emit `tts.chunk` with full sentence audio (base64 mp3)
- TTS barge-in: VoiceCallService detects incoming user audio during TTS → calls `stopTts()` → aborts ElevenLabsAdapter → emits `tts.stopped`
- TTS fallback: If ElevenLabs not configured/fails → emits `tts.fallback` → WS sends `voice:response:text` (text-only)
- AudioPlaybackService receives `voice:tts:chunk` messages, decodes mp3 via AudioContext.decodeAudioData(), queues AudioBuffers, plays sequentially
- AudioPlaybackService barge-in: `stop()` halts playback and sends `voice:tts:stop` via Gateway to backend
- Default voice ID from config.voicePersonas[0].voiceId, falls back to ElevenLabs "Rachel" (21m00Tcm4TlvDq8ikWAM)
- VoiceCallService new events: `tts.start`, `tts.chunk`, `tts.end`, `tts.stopped`, `tts.fallback`
- New WS message types: `voice:tts:start`, `voice:tts:chunk`, `voice:tts:end`, `voice:tts:stop`, `voice:tts:stopped`, `voice:response:text`, `voice:agent:response`
- VCF-005: Full conversation loop: Final transcript → auto-trigger processTranscript → Claude CLI spawn → text chunks flushed sentence-by-sentence to TTS → tool calls emitted as action events
- VCF-005: Claude CLI spawned via spawnWithLoginShell (same pattern as ClaudeHandler) with `--print --verbose --output-format stream-json`
- VCF-005: Conversation history maintained in-memory per session, included in each LLM prompt
- VCF-005: LLM provider uses getDefaultSelection()/getProviderCommand() from model-config.ts
- VCF-005: voice:call:start message now optionally passes agentId, agentName, systemPrompt for agent-specific prompts
- VCF-005: endCall() kills running Claude process on call end
- VCF-005: isProcessing flag prevents concurrent LLM calls per session
- VCF-005 new events: `action.start` (callId, {toolId, toolName, input}), `action.complete` (callId, {toolId, output})
- VCF-005 new WS message types: `voice:action:start`, `voice:action:complete`
- VCF-006: aos-voice-call-view is a fullscreen Lit component at `ui/frontend/src/views/voice-call-view.ts`
- VCF-006: Route `#/call/:skillId` - skillId extracted from `routerService.getCurrentRoute()?.segments[0]`
- VCF-006: ViewType union includes 'call', VALID_VIEWS includes 'call'
- VCF-006: Agent info fetched from `/api/team/:projectPath/skills/:skillId` (name, role, avatar)
- VCF-006: viewState: connecting -> active (on voice:call:started) -> ended (on voice:call:ended/hangup)
- VCF-006: Gateway listeners: voice:call:started, voice:call:ended, voice:error
- VCF-006: Sends voice:call:start on connectedCallback with callId, agentId, agentName
- VCF-006: Cleanup in disconnectedCallback: sends voice:call:end, removes gateway listeners
- VCF-006: Layout slots for future stories: #visualizer-area (VCF-007), #transcript-area (VCF-008), #action-log-area (VCF-008)
- VCF-006: Mute button toggles `isMuted` state (audio capture integration in VCF-007)
- VCF-006: After call end, auto-navigates back to team view after 500ms/1500ms delay

### Components
- `ui/frontend/src/views/voice-call-view.ts` -> `<aos-voice-call-view>` - Fullscreen voice call view with agent info, connecting animation, call controls

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
| ui/frontend/src/services/audio-capture.service.ts | Created | VCF-003 |
| ui/src/server/services/voice-call.service.ts | Created | VCF-003 |
| ui/src/server/websocket.ts | Modified | VCF-003 |
| ui/frontend/src/gateway.ts | Modified | VCF-003 |
| ui/frontend/src/services/audio-playback.service.ts | Created | VCF-004 |
| ui/src/server/services/voice-call.service.ts | Modified | VCF-004 |
| ui/src/server/services/elevenlabs.adapter.ts | Modified | VCF-004 |
| ui/src/server/websocket.ts | Modified | VCF-004 |
| ui/src/server/services/voice-call.service.ts | Modified | VCF-005 |
| ui/src/server/websocket.ts | Modified | VCF-005 |
| ui/frontend/src/views/voice-call-view.ts | Created | VCF-006 |
| ui/frontend/src/types/route.types.ts | Modified | VCF-006 |
| ui/frontend/src/app.ts | Modified | VCF-006 |
