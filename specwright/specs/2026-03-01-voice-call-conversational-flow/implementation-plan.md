# Implementierungsplan: Voice Call Conversational Flow

> **Status:** APPROVED
> **Spec:** specwright/specs/2026-03-01-voice-call-conversational-flow/
> **Erstellt:** 2026-03-01
> **Basiert auf:** requirements-clarification.md

---

## Executive Summary

1:1 Voice Calls mit Specwright Agents in der Web UI. User kann Teammitglieder (Agents) direkt "anrufen", per Sprache mit ihnen kommunizieren und der Agent kann waehrend des Gespraechs sowohl antworten als auch Aktionen ausfuehren (Code schreiben, Dateien aendern, Specs erstellen). Das System nutzt Deepgram Nova-3 fuer Echtzeit Speech-to-Text, ElevenLabs fuer natuerliche Text-to-Speech mit rollenbasierten Stimm-Personas, und die bestehende Claude CLI Integration fuer LLM-Konversation mit Tool-Faehigkeiten.

Das Feature integriert sich in die bestehende Specwright Web UI Architektur (Express + WebSocket Backend, Lit Web Components Frontend) und nutzt etablierte Patterns fuer WebSocket-Kommunikation, Projekt-Kontext und Claude Code CLI Integration.

---

## Architektur-Entscheidungen

### AD-1: Audio-Streaming via bestehender WebSocket-Verbindung

**Entscheidung:** Audio-Chunks werden ueber die bestehende WebSocket-Verbindung (`gateway.ts` / `websocket.ts`) gestreamt, mit einem neuen Message-Type-Namespace `voice:*`.

**Begruendung:** Die Codebase hat bereits eine robuste WebSocket-Infrastruktur mit Reconnect-Logik, Heartbeat, Project-Context-Routing (`WebSocketManagerService`), und Multi-Client-Support. Ein separater WebSocket wuerde Duplikation erzeugen und die Project-Context-Zuordnung erschweren. Die bestehende Gateway-Klasse unterstuetzt beliebige Message-Types ueber den `send()` / `on()` Pattern.

**Trade-off:** Hohe Audio-Datenrate koennte andere WS-Messages verzoegern. Mitigation: Audio-Chunks sind klein (ca. 4KB/100ms bei 16kHz PCM), und die bestehende WS-Verbindung traegt bereits Terminal-Output-Streaming ohne Performance-Probleme.

### AD-2: Deepgram & ElevenLabs serverseitig (nicht Browser-direkt)

**Entscheidung:** Audio wird vom Browser an den Express-Server gestreamt, der die Deepgram (STT) und ElevenLabs (TTS) APIs anspricht. Der Browser kommuniziert nie direkt mit Deepgram/ElevenLabs.

**Begruendung:**
- API-Keys bleiben auf dem Server (Security - gleiche Logik wie bei MCP-Config, wo env-Felder nie ans Frontend gesendet werden)
- Server kann Transkription mit Claude-Conversation koordinieren (Orchestrierung)
- Konsistent mit bestehender Architektur (alle externen API-Calls laufen ueber den Express-Server)

### AD-3: Claude CLI im `--print --output-format stream-json` Modus (bestehender Pattern)

**Entscheidung:** Voice-Konversationen nutzen den gleichen Claude Code CLI Aufruf wie der bestehende Chat (`claude-handler.ts`), erweitert um konversationsspezifischen Kontext (Skill-Info, Projekt-Kontext, Gespraechsverlauf).

**Begruendung:** Der bestehende `ClaudeHandler.streamClaudeCodeResponse()` Pattern funktioniert zuverlaessig. Er spawnt `claude` mit `--print --verbose --output-format stream-json`, parsed JSON-Events (text, tool_use, tool_result), und streamt Ergebnisse per WebSocket. Fuer Voice-Calls wird dieser gleiche Mechanismus genutzt, nur mit einem Voice-spezifischen System-Prompt und dem Skill-Kontext des angerufenen Agents.

### AD-4: Fullscreen View als eigene Route (nicht Overlay)

**Entscheidung:** Der Call-View wird als eigene Route `#/call/:skillId` registriert, die `aos-voice-call-view` rendert - analog zu `#/chat`, `#/team`, `#/settings`.

**Begruendung:** Konsistent mit dem bestehenden Router-Pattern (`route.types.ts`). Ein Overlay wuerde z-index-Konflikte mit bestehenden Sidebars (File-Tree, Cloud-Terminal) verursachen und Browser-History/Navigation brechen.

### AD-5: API-Key-Verwaltung via erweiterter Settings-Config

**Entscheidung:** Deepgram- und ElevenLabs-API-Keys werden in einer neuen Config-Datei `config/voice-config.json` gespeichert, analog zu `config/model-config.json` und `config/general-config.json`. Die Keys werden ueber die Settings-View konfiguriert.

**Begruendung:** Konsistenter Pattern mit bestehender Config-Verwaltung. Die Keys werden nie ans Frontend gesendet (nur ein Boolean `isConfigured: true/false`), analog zum MCP-Config-Pattern wo env-Felder serverseitig bleiben.

### AD-6: Audio-Format PCM 16-bit 16kHz fuer STT, chunked MP3/PCM fuer TTS

**Entscheidung:** Browser sendet Audio als PCM 16-bit 16kHz (via AudioWorklet/ScriptProcessor), Deepgram empfaengt Linear16. ElevenLabs liefert chunked Audio (MP3 oder PCM) zurueck, das direkt im Browser via AudioContext abgespielt wird.

**Begruendung:** Deepgram Nova-3 performt am besten mit Linear16/16kHz. ElevenLabs Streaming API liefert Chunks die sofort abgespielt werden koennen ohne die vollstaendige Antwort abzuwarten, was die Latenz minimiert.

---

## Komponenten-Uebersicht

### Neue Frontend-Komponenten

| Komponente | Typ | Verantwortlichkeit |
|------------|-----|-------------------|
| `aos-voice-call-view` | View (Lit) | Vollbild Call-UI mit Agent-Info, Controls, Action-Log, Transcript |
| `aos-audio-visualizer` | Component (Lit) | Canvas-basierte Wellenform-Animation (AnalyserNode FFT) |
| `aos-call-controls` | Component (Lit) | Mute, Hang-up, PTT, Text-Input Toggle |
| `aos-action-log` | Component (Lit) | Live-Streaming-Liste der Agent-Aktionen (Tool-Calls) |
| `aos-call-transcript` | Component (Lit) | Live-Transkript des Gespraechs |

### Neue Backend-Services

| Komponente | Typ | Verantwortlichkeit |
|------------|-----|-------------------|
| `VoiceCallService` | Service | Orchestriert den gesamten Voice-Call-Lifecycle: Audio-Empfang, STT, LLM, TTS, Action-Dispatch |
| `DeepgramAdapter` | Adapter | WebSocket-Verbindung zu Deepgram Streaming API, Audio-Chunk-Forwarding, Transcript-Events |
| `ElevenLabsAdapter` | Adapter | HTTP-Streaming zu ElevenLabs API, Text-Chunk zu Audio-Chunk Konversion |
| `TranscriptService` | Service | Persistiert Gespraechstranskripte als JSON im Projekt |
| `VoiceConfigService` | Service | Liest/Schreibt Voice-Konfiguration (API-Keys, Stimm-Zuordnungen) |

### Neue Shared Types

| Komponente | Typ | Verantwortlichkeit |
|------------|-----|-------------------|
| `voice.protocol.ts` | Types | WebSocket Message Types fuer Voice-Kommunikation (`voice:*` Namespace) |

### Zu aendernde Komponenten

| Komponente | Aenderungsart | Grund |
|------------|--------------|-------|
| `aos-team-card` | Erweitern | Telefon-Icon Button hinzufuegen, `call-click` Event emittieren |
| `aos-team-view` | Erweitern | `call-click` Event Handler, Navigation zu `#/call/:skillId` |
| Route Types (`route.types.ts`) | Erweitern | `'call'` zu `ViewType` hinzufuegen |
| App Shell (`app.ts`) | Erweitern | Import `voice-call-view`, `case 'call'` in `renderView()` |
| WebSocket Handler (`websocket.ts`) | Erweitern | `voice:*` Message-Cases delegieren an `VoiceCallService` |
| Gateway (`gateway.ts`) | Erweitern | Voice-spezifische Send-Methods |
| Settings View (`settings-view.ts`) | Erweitern | Neuer Settings-Bereich "Voice" fuer API-Key-Konfiguration |
| `package.json` (Backend) | Erweitern | `@deepgram/sdk`, `elevenlabs` Dependencies |

### Nicht betroffen (explizit)

- Chat-View, Dashboard, File Editor, Cloud Terminal, Git Integration, Queue/Execution
- Bestehende WebSocket Message-Types (additiv, nicht modifizierend)
- Bestehende Settings-Sections (Models, General, Appearance, Setup)

---

## Umsetzungsphasen

### Phase 1: Infrastructure & Configuration

**Ziel:** Backend-Infrastruktur aufbauen, API-Key-Management, Voice-Config, Audio-Adapter
**Komponenten:** VoiceConfigService, DeepgramAdapter, ElevenLabsAdapter, voice.protocol.ts, Settings Voice Section
**Abhaengig von:** Nichts (Startphase)

**Beschreibung:**
- `voice-config.service.ts` erstellen (analog zu `general-config.ts` / `model-config.ts`)
- Config-Datei `config/voice-config.json` mit Struktur: `{ deepgramApiKey, elevenLabsApiKey, defaultInputMode, voicePersonas }`
- Settings-View um "Voice" Section erweitern (API-Key-Eingabe, Validierung)
- `deepgram.adapter.ts` erstellen - Deepgram SDK WebSocket Streaming API
- `elevenlabs.adapter.ts` erstellen - ElevenLabs Streaming TTS API
- npm Dependencies: `@deepgram/sdk`, `elevenlabs` (Backend)
- Shared Types: `voice.protocol.ts` mit allen `voice:*` Message-Definitionen

### Phase 2: Core Voice Pipeline

**Ziel:** End-to-End Audio-Streaming funktioniert (STT -> LLM -> TTS)
**Komponenten:** VoiceCallService, WebSocket Handler, Gateway (Voice-Methods), Audio-Capture (Frontend)
**Abhaengig von:** Phase 1

**Beschreibung:**
- **STT Pipeline:** Browser Mikrofon (AudioWorklet/MediaRecorder PCM 16kHz) -> Gateway WS (`voice:audio:chunk`) -> WebSocket Handler -> VoiceCallService -> DeepgramAdapter -> Transcript Events zurueck ans Frontend
- **TTS Pipeline:** LLM-Response-Text Chunks -> ElevenLabsAdapter -> Audio-Chunks via WS ans Frontend (`voice:tts:chunk`) -> AudioContext Playback. Echtzeit-Streaming und Barge-in Support
- **Conversation Engine:** VoiceCallService orchestriert den Loop STT -> LLM -> TTS. Nutzung des bestehenden `ClaudeHandler.streamClaudeCodeResponse()` Patterns. Voice-spezifischer System-Prompt mit Agent-Rolle und Skill-Kontext. Tool-Calls werden ausgefuehrt und als Action-Log-Events gestreamt

### Phase 3: Call UI Components

**Ziel:** Vollstaendige Call-UI im Frontend
**Komponenten:** aos-voice-call-view, aos-audio-visualizer, aos-call-controls, aos-action-log, aos-call-transcript, Route Integration
**Abhaengig von:** Phase 2

**Beschreibung:**
- Route `'call'` in `route.types.ts` hinzufuegen
- `aos-voice-call-view` als Fullscreen-View (Agent-Avatar/Name/Rolle, Layout mit Controls/Action-Log/Transcript, Connecting-Animation)
- `aos-audio-visualizer`: Canvas mit AnalyserNode FFT-Daten, Modi fuer User-Mikrofon und Agent-Audio
- `aos-call-controls`: Mute-Toggle, Hang-up-Button, PTT-Button, VAD-Toggle, Text-Input-Toggle
- `aos-action-log`: Live-Streaming-Liste der Tool-Calls mit Auto-Scroll und Status-Icons
- `aos-call-transcript`: Live-Transkript mit User/Agent-Labels und Farbcodierung

### Phase 4: Integration & Polish

**Ziel:** Team-Card-Integration, Text-Fallback, Transkript-Persistenz, Voice-Personas
**Komponenten:** aos-team-card (Erweiterung), aos-team-view (Erweiterung), TranscriptService, Text-Fallback
**Abhaengig von:** Phase 3

**Beschreibung:**
- Telefon-Icon auf `aos-team-card` mit `call-click` Event, Navigation zu `#/call/${skillId}`
- Text-Fallback: Input-Feld in Call-Controls, automatischer Fallback wenn kein Mikrofon, nahtloser Wechsel Voice/Text
- `TranscriptService`: Speichert Gespraechstranskript als JSON (`specwright/transcripts/YYYY-MM-DD-HH-mm-skillId.json`)
- Voice-Personas: Zuordnung Agent-Kategorie -> ElevenLabs Voice-ID in `voice-config.json`

---

## Komponenten-Verbindungen (KRITISCH)

### Datenfluss-Uebersicht

```
Browser Mikrofon (MediaStream)
  |
  v
AudioWorklet/ScriptProcessor (PCM 16kHz Chunks)
  |
  v [voice:audio:chunk via Gateway WS]
WebSocket Handler (websocket.ts)
  |
  v [delegiert]
VoiceCallService
  |
  +---> DeepgramAdapter (STT)
  |       |
  |       v [transcript events]
  |     VoiceCallService
  |       |
  |       v [user text to LLM]
  |     ClaudeHandler (streamClaudeCodeResponse)
  |       |
  |       +---> Text Response Chunks
  |       |       |
  |       |       v
  |       |     ElevenLabsAdapter (TTS)
  |       |       |
  |       |       v [audio chunks]
  |       |     WebSocket -> Frontend AudioContext
  |       |
  |       +---> Tool Call Events
  |               |
  |               v [voice:action:*]
  |             WebSocket -> aos-action-log
  |
  +---> TranscriptService (persist)
```

### Verbindungs-Matrix

| Source | Target | Verbindungsart | Zustaendige Story | Validierung |
|--------|--------|----------------|------------------|-------------|
| aos-team-card | aos-voice-call-view | Navigation (`routerService.navigate`) | VCF-009 | Route aenderung in Browser |
| aos-voice-call-view | Gateway | `voice:call:start { skillId }` | VCF-006 | WS Message Handling |
| Browser Mikrofon | Gateway | `voice:audio:chunk { data }` | VCF-003 | Audio-Chunk Empfang |
| Gateway (WS) | WebSocket Handler | Message routing (switch case) | VCF-003 | grep voice Handler |
| WebSocket Handler | VoiceCallService | Method call `handleAudioChunk()` | VCF-003 | Service-Import |
| VoiceCallService | DeepgramAdapter | `sendAudio(chunk)` | VCF-003 | Adapter-Aufruf |
| DeepgramAdapter | VoiceCallService | Callback `onTranscript(text, isFinal)` | VCF-003 | Event-Handling |
| VoiceCallService | WebSocket | `voice:transcript:interim/final` | VCF-003 | WS Message |
| VoiceCallService | ClaudeHandler | `streamClaudeCodeResponse()` | VCF-005 | Method-Aufruf |
| ClaudeHandler | VoiceCallService | Callbacks `onContent()`, `onToolCall()` | VCF-005 | Event-Handling |
| VoiceCallService | ElevenLabsAdapter | `streamTTS(textChunk)` | VCF-004 | Adapter-Aufruf |
| ElevenLabsAdapter | VoiceCallService | Callback `onAudioChunk(buffer)` | VCF-004 | Event-Handling |
| VoiceCallService | WebSocket | `voice:tts:chunk { data }` | VCF-004 | WS Message |
| VoiceCallService | WebSocket | `voice:action:start/complete` | VCF-005 | WS Message |
| WebSocket | aos-voice-call-view | All `voice:*` via Gateway `on()` | VCF-006 | Gateway Listener |
| aos-voice-call-view | aos-audio-visualizer | Property binding (analyserNode) | VCF-007 | Component Rendering |
| aos-voice-call-view | aos-call-controls | Property binding + Events | VCF-007 | Component Rendering |
| aos-voice-call-view | aos-action-log | Property binding (actions) | VCF-008 | Component Rendering |
| aos-voice-call-view | aos-call-transcript | Property binding (messages) | VCF-008 | Component Rendering |
| VoiceCallService | TranscriptService | `saveTranscript()` on call end | VCF-011 | Service-Aufruf |
| Settings View | VoiceConfigService | `settings.voice.*` WS messages | VCF-001 | Settings-Integration |

### Verbindungs-Checkliste
- [x] Jede neue Komponente hat mindestens eine Verbindung definiert
- [x] Jede Verbindung ist einer Story zugeordnet
- [x] Validierungsbefehle sind ausführbar

---

## Abhaengigkeiten

### Interne Abhaengigkeiten

```
VCF-001 (Config) ──> VCF-002 (Adapters) ──> VCF-003 (STT Pipeline)
                                          ──> VCF-004 (TTS Pipeline)
                         VCF-003 + VCF-004 ──> VCF-005 (Conversation Engine)
                                    VCF-005 ──> VCF-006 (Call View)
                                    VCF-006 ──> VCF-007 (Visualizer & Controls)
                                    VCF-006 ──> VCF-008 (Action Log & Transcript UI)
                                    VCF-006 ──> VCF-009 (Team Card Integration)
                                    VCF-007 ──> VCF-010 (Text Fallback)
                                    VCF-005 ──> VCF-011 (Transcript Storage & Personas)
```

### Externe Abhaengigkeiten

| Package | Version | Zweck |
|---------|---------|-------|
| `@deepgram/sdk` | latest | Deepgram Streaming STT API |
| `elevenlabs` | latest | ElevenLabs Streaming TTS API |

### Keine neuen Frontend-Dependencies

Die Frontend-Implementierung nutzt ausschliesslich Browser-native APIs:
- `MediaStream` / `getUserMedia()` - Mikrofon-Zugriff
- `AudioContext` / `AudioWorklet` - Audio-Processing und Playback
- `AnalyserNode` - FFT-Daten fuer Visualisierung
- `AudioBufferSourceNode` - Chunk-basiertes Audio-Playback

---

## Risiken & Mitigationen

| Risiko | Wahrscheinlichkeit | Impact | Mitigation |
|--------|-------------------|--------|------------|
| Latenz-Budget 500ms schwer einzuhalten (Pipeline: Browser->Server->Deepgram->LLM->ElevenLabs->Server->Browser) | Med | High | Deepgram Streaming <300ms, ElevenLabs Streaming <200ms, satzweises TTS-Streaming, Claude Sonnet fuer Voice (schneller) |
| Browser-Kompatibilitaet (Safari AudioWorklet) | Med | Med | Fallback auf ScriptProcessorNode (deprecated aber universell), Feature-Detection |
| WebSocket-Durchsatz bei gleichzeitigem Audio + Actions | Low | Med | Binary-Frames fuer Audio (effizienter als Base64-in-JSON), ggf. separater WS als Fallback |
| API-Kosten (Deepgram + ElevenLabs bei Echtzeit-Streaming) | Med | Med | Kosten-Anzeige in UI, optionaler Budget-Modus mit guenstigeren Stimmen |
| Concurrent Calls / Resource Management | Low | Med | Max 1 aktiver Call pro Client, VoiceCallService trackt aktive Sessions |

---

## Self-Review Ergebnisse

### Validiert

- [x] Call starten via Telefon-Icon (VCF-009)
- [x] Vollbild Call-View (VCF-006)
- [x] STT Deepgram Nova-3 (VCF-003)
- [x] TTS ElevenLabs Streaming (VCF-004)
- [x] Rollenbasierte Stimmen (VCF-011)
- [x] Agent kann Aktionen ausfuehren (VCF-005)
- [x] Live Action Log (VCF-008)
- [x] Text-Fallback (VCF-010)
- [x] Transkript-Speicherung (VCF-011)
- [x] Push-to-Talk / VAD konfigurierbar (VCF-007, VCF-001)
- [x] Claude Default, Multi-LLM konfigurierbar (VCF-005)
- [x] Latenz-Budget 500ms (AD-6, R1)

### Identifizierte Probleme & Loesungen

| Problem | Urspruenglicher Plan | Verbesserung |
|---------|---------------------|-------------|
| Separater WebSocket fuer Audio wuerde Duplikation erzeugen | Neuer WS-Endpoint | Bestehende WS-Verbindung mit `voice:*` Namespace (AD-1) |
| Browser-direkte API-Calls wuerden API-Keys exponieren | - | Server-seitige API-Aufrufe (AD-2) |
| Vollstaendige LLM-Antwort abwarten wuerde Latenz erhoehen | - | Satzweises Streaming an TTS (R1 Mitigation) |

### Geprueft: Alternativen

| Alternative | Entscheidung | Begruendung |
|-------------|-------------|-------------|
| WebRTC statt WebSocket fuer Audio | Verworfen | WebRTC ist P2P, hier Server-in-the-middle noetig fuer STT/TTS |
| Browser-direkte Deepgram/ElevenLabs | Verworfen | API-Keys muessen auf Server bleiben, Server-Orchestrierung noetig |
| OpenAI Realtime API statt Deepgram+ElevenLabs | Beobachten | Kein Claude, keine rollenbasierten Stimmen, Vendor-Lock-in. Ggf. als Alternative-Adapter in Phase 2 |

---

## Minimalinvasiv-Optimierungen

### Wiederverwendbare Elemente gefunden

| Element | Gefunden in | Nutzbar fuer |
|---------|-------------|-------------|
| WebSocket Gateway send/on Pattern | `ui/frontend/src/gateway.ts` | Voice-WS-Kommunikation (kein neuer WS noetig) |
| Claude CLI Streaming Pattern | `ui/src/server/claude-handler.ts` | Voice-Conversation-Engine (gleicher Spawn-Mechanismus) |
| Project Context Provider | `ui/frontend/src/app.ts` (@consume) | Projekt-Zuordnung in Call-View |
| Hash-basierter Router | `ui/frontend/src/types/route.types.ts` | Nur `ViewType` erweitern um `'call'` |
| Skills API | `GET /api/team/:projectPath/skills/:skillId` | Agent-Kontext (SKILL.md) fuer Voice-Calls laden |
| Config Service Pattern | `ui/src/server/services/general-config.ts` | voice-config.service.ts (loadConfig, updateConfig, saveConfig) |
| Session Manager Pattern | `ui/src/server/services/cloud-terminal-manager.ts` | VoiceCallService (EventEmitter, Session-Management, Lifecycle) |
| Theme CSS Variables | `ui/frontend/src/styles/theme.css` | Alle neuen Komponenten nutzen bestehende CSS-Variablen |

### Optimierungen

| Urspruenglich | Optimiert zu | Ersparnis |
|--------------|-------------|-----------|
| Neuer WebSocket fuer Audio | Bestehende WS-Verbindung mit `voice:*` Namespace | ~200 LOC + Reconnect-Logik |
| Eigene LLM-Integration | Bestehender ClaudeHandler + Voice-System-Prompt | ~500 LOC |
| Eigene Config-Verwaltung | Config-Service-Pattern mit voice-config.json | ~100 LOC |
| Eigene Session-Logik | CloudTerminalManager-Pattern fuer VoiceCallService | ~150 LOC |

### Feature-Preservation bestaetigt
- [x] Alle Requirements aus Clarification sind abgedeckt
- [x] Kein Feature wurde geopfert
- [x] Alle Akzeptanzkriterien bleiben erfuellbar

---

## Naechste Schritte

Nach Genehmigung dieses Plans:
1. Step 2.6: User Stories aus diesem Plan ableiten (11 Stories + 3 System Stories)
2. Step 3: Architect fuegt technische Details hinzu (WAS/WIE/WO/DoR/DoD)
3. Step 4: Spec ready for execution
