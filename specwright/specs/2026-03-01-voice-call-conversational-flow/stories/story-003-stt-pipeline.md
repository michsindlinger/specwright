# STT Pipeline

> Story ID: VCF-003
> Spec: Voice Call Conversational Flow
> Created: 2026-03-01
> Last Updated: 2026-03-01

**Priority**: Critical
**Type**: Full-stack
**Estimated Effort**: 5 SP
**Dependencies**: VCF-002

---

## Feature

```gherkin
Feature: Speech-to-Text Pipeline
  Als Specwright User
  moechte ich per Mikrofon mit meinem Agent sprechen,
  damit meine Sprache in Echtzeit erkannt und als Text verarbeitet wird.
```

---

## Akzeptanzkriterien (Gherkin-Szenarien)

### Szenario 1: Mikrofon-Zugriff und Audio-Capture

```gherkin
Scenario: Mikrofon wird aktiviert beim Call-Start
  Given ich starte einen Voice Call
  When der Browser nach Mikrofon-Berechtigung fragt
  And ich die Berechtigung erteile
  Then wird mein Mikrofon-Audio in PCM 16kHz Chunks aufgenommen
  And die Chunks werden an den Server gestreamt
```

### Szenario 2: Echtzeit-Transkription

```gherkin
Scenario: Gesprochener Text wird in Echtzeit transkribiert
  Given mein Mikrofon ist aktiv und streamt Audio
  When ich sage "Erstelle eine neue Datei namens user-service"
  Then sehe ich eine Zwischen-Transkription waehrend ich spreche
  And nach einer kurzen Pause sehe ich die finale Transkription "Erstelle eine neue Datei namens user-service"
```

### Szenario 3: Audio-Streaming ueber WebSocket

```gherkin
Scenario: Audio wird ueber bestehende WebSocket-Verbindung gestreamt
  Given ein Voice Call ist aktiv
  When Audio-Chunks vom Mikrofon aufgenommen werden
  Then werden sie als voice:audio:chunk Messages ueber die bestehende WebSocket-Verbindung gesendet
  And der Server leitet sie an Deepgram weiter
```

### Edge Cases & Fehlerszenarien

```gherkin
Scenario: Mikrofon-Berechtigung wird verweigert
  Given ich starte einen Voice Call
  When der Browser nach Mikrofon-Berechtigung fragt
  And ich die Berechtigung verweigere
  Then sehe ich einen Hinweis "Mikrofon nicht verfuegbar"
  And der Call wechselt in den Text-Modus
```

```gherkin
Scenario: Stille wird erkannt
  Given mein Mikrofon ist aktiv
  When ich laenger als 5 Sekunden nichts sage
  Then wird keine Transkription generiert
  And das System wartet weiter auf Spracheingabe
```

---

## Technische Verifikation (Automated Checks)

<!-- Wird vom Architect ausgefuellt -->

---

## Required MCP Tools

Keine MCP Tools erforderlich.

---

## Technisches Refinement (vom Architect)

### DoR (Definition of Ready) - Vom Architect

#### Fachliche Anforderungen
- [x] Fachliche requirements klar definiert
- [x] Akzeptanzkriterien sind spezifisch und pruefbar
- [x] Business Value verstanden

#### Technische Vorbereitung
- [x] Technischer Ansatz definiert (WAS/WIE/WO)
- [x] Abhaengigkeiten identifiziert
- [x] Betroffene Komponenten bekannt
- [x] Erforderliche MCP Tools dokumentiert (falls zutreffend)
- [x] Story ist angemessen geschaetzt (max 5 Dateien, 400 LOC)

#### Full-Stack Konsistenz
- [x] Alle betroffenen Layer identifiziert
- [x] Integration Type bestimmt
- [x] Kritische Integration Points dokumentiert (wenn Full-stack)
- [x] Handover-Dokumente definiert (bei Multi-Layer)

---

### DoD (Definition of Done) - Vom Architect

- [x] Code implementiert und folgt Style Guide
- [x] AudioCaptureService (Frontend) nimmt Mikrofon-Audio als PCM 16kHz auf
- [x] Audio-Chunks werden via Gateway als voice:audio:chunk gesendet
- [x] VoiceCallService (Backend) empfaengt Audio-Chunks und leitet an DeepgramAdapter
- [x] Interim- und Final-Transkripte werden als voice:transcript:interim/final ans Frontend gestreamt
- [x] Mikrofon-Berechtigung-Handling: Fallback auf Text-Modus bei Verweigerung
- [x] WebSocket Handler routet voice:audio:chunk an VoiceCallService
- [x] Backend kompiliert fehlerfrei (`cd ui && npm run build:backend`)
- [x] Frontend kompiliert fehlerfrei (`cd ui/frontend && npm run build`)
- [x] Keine Linting-Fehler (`cd ui && npm run lint`)
- [x] **Integration hergestellt: Browser Mikrofon -> Gateway -> WebSocket Handler -> VoiceCallService -> DeepgramAdapter**
  - [x] Import/Aufruf existiert in Code
  - [x] Verbindung ist funktional (nicht nur Stub)

---

### Betroffene Layer & Komponenten

- **Integration Type:** Full-stack

| Layer | Komponenten | Aenderung |
|-------|-------------|----------|
| Frontend (Presentation) | AudioCaptureService | NEU: Browser Mikrofon-Zugriff, PCM 16kHz Chunking, WS Streaming |
| Backend (Service) | VoiceCallService | NEU: Core Orchestrator (initial STT-Flow), Session-Management |
| Backend (Integration) | websocket.ts | MODIFY: voice:audio:chunk und voice:call:* Message Routing |
| Backend (Integration) | gateway.ts | MODIFY: Voice-spezifische Send-Methods (voice:transcript:*) |

- **Kritische Integration Points:**
  - Browser Mikrofon -> AudioCaptureService -> Gateway WS (voice:audio:chunk)
  - Gateway WS -> WebSocket Handler -> VoiceCallService.handleAudioChunk()
  - VoiceCallService -> DeepgramAdapter.sendAudio(chunk)
  - DeepgramAdapter -> VoiceCallService (onTranscript callback) -> WS -> Frontend (voice:transcript:interim/final)

- **Handover-Dokumente:**
  - voice.protocol.ts (aus VCF-001) definiert Message-Format fuer voice:audio:chunk und voice:transcript:*

---

### Technical Details

**WAS:**
- AudioCaptureService (Frontend) erstellen: getUserMedia(), AudioWorklet/ScriptProcessor fuer PCM 16kHz, Chunk-Streaming via Gateway
- VoiceCallService (Backend) erstellen: Core Orchestrator fuer Voice Calls, Session-Management, Audio-Chunk-Routing an DeepgramAdapter
- WebSocket Handler erweitern: voice:audio:chunk, voice:call:start, voice:call:end Message-Cases
- Gateway erweitern: voice:transcript:interim, voice:transcript:final Send-Methods

**WIE (Architecture Guidance):**
- AudioCaptureService: Browser-native APIs (getUserMedia, AudioContext, AudioWorklet), PCM 16-bit 16kHz Format
- VoiceCallService: Follow CloudTerminalManager Pattern (EventEmitter, Session-Map, Lifecycle-Management)
- WebSocket: Neuer switch-case Block fuer voice:* Messages (analog zu cloud-terminal:* Block)
- Mikrofon-Fehler: permission denied -> Event an Frontend fuer Text-Fallback-Hinweis
- Audio-Chunks: ~100ms Intervall, ca. 3.2KB pro Chunk (16kHz * 16bit * 0.1s)

**WO:**
- `ui/frontend/src/services/audio-capture.service.ts` (NEU)
- `ui/src/server/services/voice-call.service.ts` (NEU)
- `ui/src/server/websocket.ts` (MODIFY)
- `ui/src/server/gateway.ts` (MODIFY)

**Abhaengigkeiten:** VCF-002 (DeepgramAdapter)

**Geschaetzte Komplexitaet:** M

**Relevante Skills:**

| Skill | Pfad | Grund |
|-------|------|-------|
| backend-express | .claude/skills/backend-express/SKILL.md | WebSocket Handler Pattern, Service Architecture |
| frontend-lit | .claude/skills/frontend-lit/SKILL.md | Service-Pattern im Frontend, Gateway Integration |

---

### Creates Reusable Artifacts

Creates Reusable: yes

| Artefakt | Typ | Pfad | Beschreibung |
|----------|-----|------|--------------|
| AudioCaptureService | Service | ui/frontend/src/services/audio-capture.service.ts | Browser Mikrofon-Capture als PCM 16kHz Stream |
| VoiceCallService | Service | ui/src/server/services/voice-call.service.ts | Core Voice Call Orchestrator (STT/LLM/TTS Loop) |

---

### Technische Verifikation (Automated Checks)

- FILE_EXISTS: ui/frontend/src/services/audio-capture.service.ts
- FILE_EXISTS: ui/src/server/services/voice-call.service.ts
- CONTAINS: ui/src/server/websocket.ts -> "voice:audio:chunk"
- CONTAINS: ui/src/server/websocket.ts -> "voice:call:start"
- LINT_PASS: cd ui && npm run lint
- BUILD_PASS: cd ui && npm run build:backend
- BUILD_PASS: cd ui/frontend && npm run build

### Completion Check

```bash
# Auto-Verify Commands - all must exit with 0
test -f ui/frontend/src/services/audio-capture.service.ts && echo "AudioCaptureService OK"
test -f ui/src/server/services/voice-call.service.ts && echo "VoiceCallService OK"
grep -q "voice:audio:chunk" ui/src/server/websocket.ts && echo "WS audio handler OK"
grep -q "voice:call:start" ui/src/server/websocket.ts && echo "WS call handler OK"
cd ui && npm run build:backend 2>&1 | tail -1
cd ui/frontend && npm run build 2>&1 | tail -1
```

**Story ist DONE wenn:**
1. Alle FILE_EXISTS/CONTAINS checks bestanden
2. Alle BUILD_PASS commands exit 0
3. Git diff zeigt nur erwartete Aenderungen
