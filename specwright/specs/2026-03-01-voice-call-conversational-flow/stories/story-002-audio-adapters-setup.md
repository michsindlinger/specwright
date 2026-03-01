# Audio Adapters Setup

> Story ID: VCF-002
> Spec: Voice Call Conversational Flow
> Created: 2026-03-01
> Last Updated: 2026-03-01

**Priority**: High
**Type**: Backend
**Estimated Effort**: 3 SP
**Dependencies**: VCF-001

---

## Feature

```gherkin
Feature: Audio Adapters Setup
  Als Specwright System
  moechte ich Deepgram- und ElevenLabs-Adapter bereitstellen,
  damit Speech-to-Text und Text-to-Speech fuer Voice Calls verfuegbar sind.
```

---

## Akzeptanzkriterien (Gherkin-Szenarien)

### Szenario 1: Deepgram Adapter verbindet sich

```gherkin
Scenario: Deepgram Streaming-Verbindung wird hergestellt
  Given ein gueltiger Deepgram API Key ist konfiguriert
  When ein Voice Call gestartet wird
  Then wird eine WebSocket-Verbindung zu Deepgram Nova-3 hergestellt
  And die Verbindung ist bereit fuer Audio-Chunk-Streaming
```

### Szenario 2: ElevenLabs Adapter streamt Audio

```gherkin
Scenario: ElevenLabs Text-zu-Sprache Streaming
  Given ein gueltiger ElevenLabs API Key ist konfiguriert
  When ein Text-Chunk zum Vorlesen gesendet wird
  Then wird ein Audio-Stream von ElevenLabs zurueckgeliefert
  And die Audio-Chunks koennen sofort abgespielt werden
```

### Szenario 3: Shared Voice Protocol Types

```gherkin
Scenario: Voice WebSocket Messages sind typisiert
  Given das Voice-Modul ist geladen
  When ein Voice-Event gesendet wird
  Then nutzt es den voice:* Namespace (z.B. voice:audio:chunk, voice:transcript:final)
  And alle Message-Types sind in voice.protocol.ts definiert
```

### Edge Cases & Fehlerszenarien

```gherkin
Scenario: Adapter-Fehlerbehandlung bei ungueltigem API Key
  Given ein ungueltiger Deepgram API Key ist konfiguriert
  When ein Voice Call gestartet wird
  Then erhaelt der User eine Fehlermeldung "Deepgram API Key ungueltig"
  And der Call wird nicht gestartet
```

```gherkin
Scenario: Adapter-Verbindung bricht ab
  Given eine aktive Deepgram-Verbindung besteht
  When die Verbindung unerwartet getrennt wird
  Then wird ein Reconnect versucht
  And der User erhaelt einen Hinweis bei dauerhaftem Verbindungsverlust
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
- [x] DeepgramAdapter erstellt WebSocket-Verbindung zu Deepgram Streaming API
- [x] DeepgramAdapter streamt Audio-Chunks und emittiert Transcript-Events
- [x] ElevenLabsAdapter streamt Text zu Audio via ElevenLabs API
- [x] Fehlerbehandlung bei ungueltigem API Key (Fehlermeldung an Client)
- [x] Reconnect-Logik bei Verbindungsabbruch im DeepgramAdapter
- [x] npm Dependencies installiert (@deepgram/sdk, @elevenlabs/elevenlabs-js)
- [x] Backend kompiliert fehlerfrei (`cd ui && npm run build:backend`)
- [x] Keine Linting-Fehler (`cd ui && npm run lint`)

---

### Betroffene Layer & Komponenten

- **Integration Type:** Backend-only

| Layer | Komponenten | Aenderung |
|-------|-------------|----------|
| Backend (Integration) | DeepgramAdapter | NEU: WebSocket-Verbindung zu Deepgram Streaming API |
| Backend (Integration) | ElevenLabsAdapter | NEU: HTTP-Streaming zu ElevenLabs TTS API |
| Backend (Config) | package.json | MODIFY: @deepgram/sdk und elevenlabs Dependencies |

---

### Technical Details

**WAS:**
- DeepgramAdapter erstellen: WebSocket-Verbindung zu Deepgram Nova-3 Streaming API, Audio-Chunk-Forwarding, Transcript-Event-Callbacks
- ElevenLabsAdapter erstellen: HTTP-Streaming zu ElevenLabs API, Text-zu-Audio-Chunk-Konversion mit Callback-Pattern
- npm Dependencies installieren: @deepgram/sdk, elevenlabs

**WIE (Architecture Guidance):**
- Follow Adapter-Pattern (analog terminal-manager.ts wrapping pty): Adapter kapselt SDK-Interaktion, exponiert einfache Methoden + EventEmitter Callbacks
- DeepgramAdapter: EventEmitter mit events `onTranscript(text, isFinal)`, `onError(error)`, `onClose()`
- ElevenLabsAdapter: EventEmitter mit events `onAudioChunk(buffer)`, `onComplete()`, `onError(error)`
- Beide Adapter erhalten API-Key via VoiceConfigService (VCF-001)
- Fehlerbehandlung: Auth-Fehler (401) als klare Fehlermeldung, Netzwerk-Fehler mit Retry-Logik

**WO:**
- `ui/src/server/services/deepgram.adapter.ts` (NEU)
- `ui/src/server/services/elevenlabs.adapter.ts` (NEU)
- `ui/package.json` (MODIFY - Dependencies)

**Abhaengigkeiten:** VCF-001 (VoiceConfigService fuer API-Keys)

**Geschaetzte Komplexitaet:** S

**Relevante Skills:**

| Skill | Pfad | Grund |
|-------|------|-------|
| backend-express | .claude/skills/backend-express/SKILL.md | Service/Adapter Pattern, EventEmitter Usage |

---

### Creates Reusable Artifacts

Creates Reusable: yes

| Artefakt | Typ | Pfad | Beschreibung |
|----------|-----|------|--------------|
| DeepgramAdapter | Service | ui/src/server/services/deepgram.adapter.ts | STT Adapter fuer Deepgram Nova-3 Streaming API |
| ElevenLabsAdapter | Service | ui/src/server/services/elevenlabs.adapter.ts | TTS Adapter fuer ElevenLabs Streaming API |

---

### Technische Verifikation (Automated Checks)

- FILE_EXISTS: ui/src/server/services/deepgram.adapter.ts
- FILE_EXISTS: ui/src/server/services/elevenlabs.adapter.ts
- CONTAINS: ui/package.json -> "@deepgram/sdk"
- CONTAINS: ui/package.json -> "elevenlabs"
- LINT_PASS: cd ui && npm run lint
- BUILD_PASS: cd ui && npm run build:backend

### Completion Check

```bash
# Auto-Verify Commands - all must exit with 0
test -f ui/src/server/services/deepgram.adapter.ts && echo "DeepgramAdapter OK"
test -f ui/src/server/services/elevenlabs.adapter.ts && echo "ElevenLabsAdapter OK"
grep -q "@deepgram/sdk" ui/package.json && echo "Deepgram dep OK"
grep -q "elevenlabs" ui/package.json && echo "ElevenLabs dep OK"
cd ui && npm run build:backend 2>&1 | tail -1
```

**Story ist DONE wenn:**
1. Alle FILE_EXISTS/CONTAINS checks bestanden
2. Alle BUILD_PASS commands exit 0
3. Git diff zeigt nur erwartete Aenderungen
