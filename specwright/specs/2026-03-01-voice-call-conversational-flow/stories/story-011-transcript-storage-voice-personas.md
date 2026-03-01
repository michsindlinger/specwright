# Transcript Storage & Voice Personas

> Story ID: VCF-011
> Spec: Voice Call Conversational Flow
> Created: 2026-03-01
> Last Updated: 2026-03-01

**Priority**: Medium
**Type**: Full-stack
**Estimated Effort**: 3 SP
**Dependencies**: VCF-005

---

## Feature

```gherkin
Feature: Transcript Storage & Voice Personas
  Als Specwright User
  moechte ich das Gespraechstranskript nach dem Call einsehen koennen und jeden Agent mit einer eigenen Stimme hoeren,
  damit ich das Gespraech nachvollziehen kann und die Agents akustisch unterscheidbar sind.
```

---

## Akzeptanzkriterien (Gherkin-Szenarien)

### Szenario 1: Transkript wird nach Call gespeichert

```gherkin
Scenario: Gespraechstranskript wird persistiert
  Given ich habe einen Voice Call mit dem "Architect" Agent beendet
  When der Call beendet wird
  Then wird das vollstaendige Gespraechstranskript gespeichert
  And das Transkript enthaelt alle User-Nachrichten und Agent-Antworten mit Zeitstempeln
  And durchgefuehrte Aktionen sind im Transkript markiert
```

### Szenario 2: Transkript ist spaeter einsehbar

```gherkin
Scenario: Gespeichertes Transkript einsehen
  Given ich habe einen frueheren Voice Call gefuehrt
  When ich das Transkript aufrufe
  Then sehe ich den vollstaendigen Gespraechsverlauf
  And die Aktionen des Agents sind hervorgehoben
```

### Szenario 3: Rollenbasierte Stimmen

```gherkin
Scenario: Jeder Agent-Typ hat eine eigene Stimme
  Given ich rufe den "Architect" Agent an
  When der Agent antwortet
  Then hoere ich eine tiefe, ruhige Stimme
  And wenn ich den "Frontend Dev" Agent anrufe hoere ich eine andere, energischere Stimme
```

### Szenario 4: Voice-Persona-Zuordnung

```gherkin
Scenario: Stimmen sind pro Agent-Kategorie zugeordnet
  Given die Voice-Konfiguration ist eingerichtet
  When ich die Voice-Personas betrachte
  Then hat jede Agent-Kategorie (Architect, Frontend, Backend, PO, etc.) eine eigene Stimme
  And die Zuordnung ist in den Settings konfigurierbar
```

### Edge Cases & Fehlerszenarien

```gherkin
Scenario: Transkript-Speicherung schlaegt fehl
  Given ein Voice Call wurde beendet
  When die Transkript-Speicherung fehlschlaegt
  Then erhalte ich einen Hinweis "Transkript konnte nicht gespeichert werden"
  And das Transkript bleibt temporaer in der UI sichtbar
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
- [x] TranscriptService speichert Gespraechstranskripte als JSON-Dateien
- [x] Transkript-Datei enthaelt alle User/Agent-Nachrichten mit Zeitstempeln und Aktions-Markierungen
- [x] Transkripte werden unter specwright/transcripts/ gespeichert (Namensformat: YYYY-MM-DD-HH-mm-skillId.json)
- [x] Voice-Persona-Zuordnung in voice-config.json: Agent-Kategorie -> ElevenLabs Voice-ID
- [x] VoiceCallService nutzt Persona-Mapping fuer Voice-ID bei TTS-Aufrufen
- [x] Backend kompiliert fehlerfrei (`cd ui && npm run build:backend`)
- [x] Keine Linting-Fehler (`cd ui && npm run lint`)
- [x] **Integration hergestellt: VoiceCallService -> TranscriptService (saveTranscript)**
  - [x] Import/Aufruf existiert in Code
  - [x] Verbindung ist funktional (nicht nur Stub)

---

### Betroffene Layer & Komponenten

- **Integration Type:** Backend-only (Full-stack fuer Persona-Config in Settings, aber minimal)

| Layer | Komponenten | Aenderung |
|-------|-------------|----------|
| Backend (Service) | TranscriptService | NEU: Persistiert Transkripte als JSON im Projekt |
| Backend (Service) | VoiceCallService | MODIFY: saveTranscript() bei Call-Ende, Persona Voice-ID Lookup |
| Backend (Service) | voice-config.ts | MODIFY: Persona-Mapping Lesen/Schreiben |

- **Kritische Integration Points:**
  - VoiceCallService -> TranscriptService.saveTranscript(sessionData) bei Call-Ende
  - VoiceCallService -> VoiceConfigService.getPersonaVoiceId(agentCategory) bei TTS-Aufruf

---

### Technical Details

**WAS:**
- TranscriptService (Backend) erstellen: Persistiert Gespraechstranskripte als JSON-Dateien in specwright/transcripts/
- VoiceCallService erweitern: Bei Call-Ende saveTranscript() aufrufen, Voice-Persona-Lookup fuer TTS
- VoiceConfigService erweitern: voicePersonas Mapping { agentCategory: elevenLabsVoiceId }

**WIE (Architecture Guidance):**
- TranscriptService: Simple File-I/O Service, JSON-Format mit { sessionId, skillId, startTime, endTime, messages[], actions[] }
- Speicherort: specwright/transcripts/ (projektrelativ, analog zu specwright/specs/)
- Voice Personas: In voice-config.json als Map { "architect": "voice-id-1", "frontend-dev": "voice-id-2", ... }
- VoiceCallService: Beim TTS-Aufruf Voice-ID aus Persona-Mapping lesen, Fallback auf Default-Voice
- Transkript: Waehrend des Calls in-memory sammeln, bei Call-Ende einmalig schreiben

**WO:**
- `ui/src/server/services/transcript.service.ts` (NEU)
- `ui/src/server/services/voice-call.service.ts` (MODIFY)
- `ui/src/server/voice-config.ts` (MODIFY)

**Abhaengigkeiten:** VCF-005 (Conversation Engine muss Konversationsdaten liefern)

**Geschaetzte Komplexitaet:** S

**Relevante Skills:**

| Skill | Pfad | Grund |
|-------|------|-------|
| backend-express | .claude/skills/backend-express/SKILL.md | Service Pattern, File I/O |

---

### Creates Reusable Artifacts

Creates Reusable: yes

| Artefakt | Typ | Pfad | Beschreibung |
|----------|-----|------|--------------|
| TranscriptService | Service | ui/src/server/services/transcript.service.ts | Persistiert Voice Call Transkripte als JSON |

---

### Technische Verifikation (Automated Checks)

- FILE_EXISTS: ui/src/server/services/transcript.service.ts
- CONTAINS: ui/src/server/services/voice-call.service.ts -> "TranscriptService" oder "saveTranscript"
- CONTAINS: ui/src/server/voice-config.ts -> "voicePersonas" oder "persona"
- LINT_PASS: cd ui && npm run lint
- BUILD_PASS: cd ui && npm run build:backend

### Completion Check

```bash
# Auto-Verify Commands - all must exit with 0
test -f ui/src/server/services/transcript.service.ts && echo "TranscriptService OK"
grep -q "TranscriptService\|saveTranscript" ui/src/server/services/voice-call.service.ts && echo "Transcript integration OK"
grep -qi "persona" ui/src/server/voice-config.ts && echo "Voice personas OK"
cd ui && npm run build:backend 2>&1 | tail -1
```

**Story ist DONE wenn:**
1. Alle FILE_EXISTS/CONTAINS checks bestanden
2. Alle BUILD_PASS commands exit 0
3. Git diff zeigt nur erwartete Aenderungen
