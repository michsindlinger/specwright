# TTS Pipeline

> Story ID: VCF-004
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
Feature: Text-to-Speech Pipeline
  Als Specwright User
  moechte ich die Antworten meines Agents als natuerliche Sprache hoeren,
  damit das Gespraech sich wie ein echtes Telefonat anfuehlt.
```

---

## Akzeptanzkriterien (Gherkin-Szenarien)

### Szenario 1: Agent spricht seine Antwort

```gherkin
Scenario: Agent-Antwort wird als Sprache ausgegeben
  Given ein Voice Call ist aktiv
  When der Agent eine Antwort generiert
  Then hoere ich die Antwort als natuerliche Sprache ueber meine Lautsprecher
  And die Sprachausgabe beginnt bevor die vollstaendige Antwort generiert ist
```

### Szenario 2: Echtzeit-Streaming

```gherkin
Scenario: Streaming TTS fuer geringe Latenz
  Given der Agent generiert eine laengere Antwort
  When der erste Satz fertig ist
  Then beginnt die Sprachausgabe sofort mit dem ersten Satz
  And die restlichen Saetze folgen nahtlos
```

### Szenario 3: Barge-in (User unterbricht Agent)

```gherkin
Scenario: User unterbricht den sprechenden Agent
  Given der Agent spricht gerade seine Antwort
  When ich anfange zu sprechen
  Then stoppt der Agent seine Sprachausgabe sofort
  And meine neue Spracheingabe wird verarbeitet
```

### Edge Cases & Fehlerszenarien

```gherkin
Scenario: TTS-Service nicht erreichbar
  Given ein Voice Call ist aktiv
  When der ElevenLabs-Service nicht erreichbar ist
  Then wird die Agent-Antwort nur als Text im Transkript angezeigt
  And ich erhalte einen Hinweis "Sprachausgabe temporaer nicht verfuegbar"
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
- [x] AudioPlaybackService (Frontend) spielt empfangene Audio-Chunks via AudioContext ab
- [x] VoiceCallService (Backend) sendet Text-Chunks an ElevenLabsAdapter und streamt Audio zurueck
- [x] Echtzeit-Streaming: Sprachausgabe beginnt bevor vollstaendige Antwort generiert ist
- [x] Barge-in: Agent-Audio stoppt wenn User zu sprechen beginnt
- [x] Fallback bei TTS-Fehler: Nur Text-Anzeige im Transkript
- [x] voice:tts:chunk Messages werden korrekt ans Frontend gestreamt
- [x] Backend kompiliert fehlerfrei (`cd ui && npm run build:backend`)
- [x] Frontend kompiliert fehlerfrei (`cd ui/frontend && npm run build`)
- [x] Keine Linting-Fehler (`cd ui && npm run lint`)
- [x] **Integration hergestellt: VoiceCallService -> ElevenLabsAdapter -> WS -> AudioPlaybackService**
  - [x] Import/Aufruf existiert in Code
  - [x] Verbindung ist funktional (nicht nur Stub)

---

### Betroffene Layer & Komponenten

- **Integration Type:** Full-stack

| Layer | Komponenten | Aenderung |
|-------|-------------|----------|
| Frontend (Presentation) | AudioPlaybackService | NEU: AudioContext-basiertes Chunk-Playback, Barge-in Detection |
| Backend (Service) | VoiceCallService | MODIFY: TTS-Flow hinzufuegen, Text-Chunk an ElevenLabsAdapter |
| Backend (Integration) | websocket.ts / gateway.ts | MODIFY: voice:tts:chunk Message Streaming |

- **Kritische Integration Points:**
  - VoiceCallService -> ElevenLabsAdapter.streamTTS(textChunk) -> onAudioChunk(buffer)
  - VoiceCallService -> Gateway WS (voice:tts:chunk { data }) -> AudioPlaybackService
  - AudioPlaybackService: Barge-in Detection -> voice:tts:stop Event an Backend

---

### Technical Details

**WAS:**
- AudioPlaybackService (Frontend) erstellen: AudioContext mit AudioBufferSourceNode fuer Chunk-basiertes Playback, Queue-Management, Barge-in Detection
- VoiceCallService (Backend) erweitern: TTS-Flow hinzufuegen - Text-Chunks an ElevenLabsAdapter senden, Audio-Chunks ans Frontend streamen
- Barge-in-Logik: Wenn User spricht (voice:audio:chunk waehrend TTS aktiv), TTS sofort stoppen

**WIE (Architecture Guidance):**
- AudioPlaybackService: Browser AudioContext API, AudioBufferSourceNode fuer nahtloses Chunk-Playback
- Satzweises TTS-Streaming: Text in Saetze splitten, pro Satz einen ElevenLabs-Request (Latenz-Optimierung)
- Barge-in: VoiceCallService trackt TTS-State, stoppt ElevenLabsAdapter und sendet voice:tts:stop bei eingehendem User-Audio
- Fallback: Bei ElevenLabs-Fehler nur Text-Response ans Frontend (voice:response:text statt voice:tts:chunk)

**WO:**
- `ui/frontend/src/services/audio-playback.service.ts` (NEU)
- `ui/src/server/services/voice-call.service.ts` (MODIFY)
- `ui/src/server/websocket.ts` (MODIFY)

**Abhaengigkeiten:** VCF-002 (ElevenLabsAdapter)

**Geschaetzte Komplexitaet:** M

**Relevante Skills:**

| Skill | Pfad | Grund |
|-------|------|-------|
| backend-express | .claude/skills/backend-express/SKILL.md | Streaming Pattern, Service State Management |
| frontend-lit | .claude/skills/frontend-lit/SKILL.md | AudioContext Browser API Integration |

---

### Creates Reusable Artifacts

Creates Reusable: yes

| Artefakt | Typ | Pfad | Beschreibung |
|----------|-----|------|--------------|
| AudioPlaybackService | Service | ui/frontend/src/services/audio-playback.service.ts | Browser AudioContext Chunk-Playback mit Barge-in |

---

### Technische Verifikation (Automated Checks)

- FILE_EXISTS: ui/frontend/src/services/audio-playback.service.ts
- CONTAINS: ui/src/server/services/voice-call.service.ts -> "ElevenLabsAdapter"
- CONTAINS: ui/src/server/websocket.ts -> "voice:tts"
- LINT_PASS: cd ui && npm run lint
- BUILD_PASS: cd ui && npm run build:backend
- BUILD_PASS: cd ui/frontend && npm run build

### Completion Check

```bash
# Auto-Verify Commands - all must exit with 0
test -f ui/frontend/src/services/audio-playback.service.ts && echo "AudioPlaybackService OK"
grep -q "ElevenLabsAdapter" ui/src/server/services/voice-call.service.ts && echo "TTS integration OK"
grep -q "voice:tts" ui/src/server/websocket.ts && echo "WS TTS handler OK"
cd ui && npm run build:backend 2>&1 | tail -1
cd ui/frontend && npm run build 2>&1 | tail -1
```

**Story ist DONE wenn:**
1. Alle FILE_EXISTS/CONTAINS checks bestanden
2. Alle BUILD_PASS commands exit 0
3. Git diff zeigt nur erwartete Aenderungen
