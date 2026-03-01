# Voice Configuration & API Key Management

> Story ID: VCF-001
> Spec: Voice Call Conversational Flow
> Created: 2026-03-01
> Last Updated: 2026-03-01

**Priority**: High
**Type**: Full-stack
**Estimated Effort**: 3 SP
**Dependencies**: None

---

## Feature

```gherkin
Feature: Voice Configuration & API Key Management
  Als Specwright User
  moechte ich meine Deepgram- und ElevenLabs-API-Keys in den Settings konfigurieren,
  damit ich Voice Calls mit meinen Agents nutzen kann.
```

---

## Akzeptanzkriterien (Gherkin-Szenarien)

### Szenario 1: Voice-Settings oeffnen

```gherkin
Scenario: Voice-Section in Settings sichtbar
  Given ich bin in der Settings-View
  When ich den Bereich "Voice" oeffne
  Then sehe ich Eingabefelder fuer "Deepgram API Key" und "ElevenLabs API Key"
  And ich sehe den aktuellen Konfigurationsstatus (konfiguriert/nicht konfiguriert)
```

### Szenario 2: API-Keys speichern

```gherkin
Scenario: Erfolgreiche API-Key-Konfiguration
  Given ich bin in den Voice-Settings
  When ich einen gueltigen Deepgram API Key eingebe
  And ich einen gueltigen ElevenLabs API Key eingebe
  And ich die Konfiguration speichere
  Then sehe ich eine Bestaetigung "Voice-Konfiguration gespeichert"
  And der Status zeigt "Konfiguriert" fuer beide Services
```

### Szenario 3: Input-Modus konfigurieren

```gherkin
Scenario: Standard-Input-Modus waehlen
  Given ich bin in den Voice-Settings
  When ich den Standard-Input-Modus auf "Push-to-Talk" stelle
  And ich speichere
  Then wird "Push-to-Talk" als Standard fuer neue Voice Calls verwendet
```

### Edge Cases & Fehlerszenarien

```gherkin
Scenario: API-Keys werden nicht ans Frontend exponiert
  Given ich habe API-Keys konfiguriert
  When die Settings-View geladen wird
  Then sehe ich nur den Status "Konfiguriert" oder "Nicht konfiguriert"
  And die tatsaechlichen API-Key-Werte werden nicht angezeigt
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

- [ ] Code implementiert und folgt Style Guide
- [ ] VoiceConfigService liest/schreibt voice-config.json korrekt
- [ ] API-Keys werden nie ans Frontend gesendet (nur isConfigured Boolean)
- [ ] Settings Voice Section zeigt Konfigurationsstatus korrekt an
- [ ] voice.protocol.ts definiert alle voice:* Message Types
- [ ] WebSocket Settings-Handler verarbeitet settings.voice.* Messages
- [ ] Backend kompiliert fehlerfrei (`cd ui && npm run build:backend`)
- [ ] Frontend kompiliert fehlerfrei (`cd ui/frontend && npm run build`)
- [ ] Keine Linting-Fehler (`cd ui && npm run lint`)

---

### Betroffene Layer & Komponenten

- **Integration Type:** Full-stack

| Layer | Komponenten | Aenderung |
|-------|-------------|----------|
| Backend (Service) | VoiceConfigService | NEU: Config-Service fuer voice-config.json (load/update/save) |
| Backend (Integration) | websocket.ts | MODIFY: settings.voice.* Message-Cases hinzufuegen |
| Frontend (Presentation) | settings-view.ts | MODIFY: Neuer Tab/Section "Voice" mit API-Key-Eingabe |
| Shared Types | voice.protocol.ts | NEU: Alle voice:* WebSocket Message Type Definitionen |

- **Kritische Integration Points:**
  - Settings View (Frontend) -> WebSocket -> VoiceConfigService (Backend): settings.voice.get/update Messages
  - VoiceConfigService -> config/voice-config.json: File I/O

- **Handover-Dokumente:**
  - voice.protocol.ts definiert alle WS Message Types fuer nachfolgende Stories
  - voice-config.json Struktur ist Basis fuer VCF-002 (Adapter) und VCF-011 (Personas)

---

### Technical Details

**WAS:**
- VoiceConfigService (Backend) erstellen: Load/Update/Save fuer voice-config.json
- voice.protocol.ts (Shared) erstellen: Alle voice:* WS Message Type Interfaces
- Settings View um "Voice" Section erweitern: API-Key-Eingabe mit Status-Anzeige
- WebSocket Handler erweitern: settings.voice.get / settings.voice.update Cases

**WIE (Architecture Guidance):**
- Follow general-config.ts Pattern: loadConfig() mit In-Memory-Cache, updateConfig() mit Validierung, saveConfig() mit atomarem File-Write
- API-Keys: Nur isConfigured Boolean ans Frontend senden (analog MCP-Config env-Pattern)
- Settings View: Bestehendes Tab-Pattern erweitern (activeSection), neue SettingsSection 'voice'
- voice.protocol.ts: Zentrales Type-File fuer alle voice:* Messages, analog zu cloud-terminal.protocol.ts
- Config-Datei: config/voice-config.json mit Struktur { deepgramApiKey, elevenLabsApiKey, defaultInputMode, voicePersonas }

**WO:**
- `ui/src/server/voice-config.ts` (NEU)
- `ui/src/shared/types/voice.protocol.ts` (NEU)
- `ui/frontend/src/views/settings-view.ts` (MODIFY)
- `ui/src/server/websocket.ts` (MODIFY)

**Abhaengigkeiten:** None

**Geschaetzte Komplexitaet:** S

**Relevante Skills:**

| Skill | Pfad | Grund |
|-------|------|-------|
| backend-express | .claude/skills/backend-express/SKILL.md | Express Service Pattern, WebSocket Message Handling |
| frontend-lit | .claude/skills/frontend-lit/SKILL.md | Lit Settings Section Pattern, Property Binding |

---

### Creates Reusable Artifacts

Creates Reusable: yes

| Artefakt | Typ | Pfad | Beschreibung |
|----------|-----|------|--------------|
| VoiceConfigService | Service | ui/src/server/voice-config.ts | Config-Service fuer Voice-Konfiguration (API-Keys, Input-Modus, Personas) |
| voice.protocol.ts | Types | ui/src/shared/types/voice.protocol.ts | Alle voice:* WebSocket Message Type Definitionen |

---

### Technische Verifikation (Automated Checks)

- FILE_EXISTS: ui/src/server/voice-config.ts
- FILE_EXISTS: ui/src/shared/types/voice.protocol.ts
- CONTAINS: ui/src/server/websocket.ts -> "settings.voice"
- CONTAINS: ui/frontend/src/views/settings-view.ts -> "voice"
- LINT_PASS: cd ui && npm run lint
- BUILD_PASS: cd ui && npm run build:backend
- BUILD_PASS: cd ui/frontend && npm run build

### Completion Check

```bash
# Auto-Verify Commands - all must exit with 0
test -f ui/src/server/voice-config.ts && echo "VoiceConfigService OK"
test -f ui/src/shared/types/voice.protocol.ts && echo "voice.protocol.ts OK"
grep -q "settings.voice" ui/src/server/websocket.ts && echo "WS handler OK"
grep -qi "voice" ui/frontend/src/views/settings-view.ts && echo "Settings Voice section OK"
cd ui && npm run build:backend 2>&1 | tail -1
cd ui/frontend && npm run build 2>&1 | tail -1
```

**Story ist DONE wenn:**
1. Alle FILE_EXISTS/CONTAINS checks bestanden
2. Alle BUILD_PASS commands exit 0
3. Git diff zeigt nur erwartete Aenderungen
