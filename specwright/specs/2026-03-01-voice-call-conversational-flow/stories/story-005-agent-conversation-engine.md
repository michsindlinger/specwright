# Agent Conversation Engine

> Story ID: VCF-005
> Spec: Voice Call Conversational Flow
> Created: 2026-03-01
> Last Updated: 2026-03-01

**Priority**: Critical
**Type**: Backend
**Estimated Effort**: 5 SP
**Dependencies**: VCF-003, VCF-004

---

## Feature

```gherkin
Feature: Agent Conversation Engine
  Als Specwright User
  moechte ich mit meinem Agent ein natuerliches Gespraech fuehren,
  damit der Agent meine Anfragen versteht und sowohl verbal als auch mit Aktionen antwortet.
```

---

## Akzeptanzkriterien (Gherkin-Szenarien)

### Szenario 1: Natuerliche Konversation

```gherkin
Scenario: Agent antwortet kontextbezogen auf Spracheingabe
  Given ich fuehre einen Voice Call mit dem "Frontend Dev" Agent
  When ich sage "Erstelle mir bitte eine neue Login-Komponente"
  Then antwortet der Agent verbal mit einer Bestaetigung
  And der Agent nutzt sein Frontend-Skill-Wissen fuer die Antwort
```

### Szenario 2: Agent fuehrt Aktionen aus

```gherkin
Scenario: Agent fuehrt Code-Aktionen waehrend des Gespraechs aus
  Given ich fuehre einen Voice Call mit einem Agent
  When ich sage "Erstelle eine Datei namens auth-service.ts"
  Then sagt der Agent "Ich erstelle jetzt die Datei auth-service.ts"
  And die Datei wird im Projekt erstellt
  And ich sehe die Aktion im Action-Log
```

### Szenario 3: Conversation-Kontext bleibt erhalten

```gherkin
Scenario: Agent erinnert sich an den Gespraechskontext
  Given ich habe dem Agent bereits gesagt "Erstelle eine User-Komponente"
  When ich sage "Fuege dort noch ein Passwort-Feld hinzu"
  Then versteht der Agent dass "dort" sich auf die User-Komponente bezieht
  And er modifiziert die zuvor erstellte Komponente
```

### Szenario 4: Konfigurierbarer LLM-Provider

```gherkin
Scenario: LLM-Provider ist konfigurierbar
  Given Claude ist als Default-LLM konfiguriert
  When ich einen Voice Call starte
  Then nutzt der Agent Claude fuer die Konversation
  And ich kann den Provider in den Settings aendern
```

### Edge Cases & Fehlerszenarien

```gherkin
Scenario: Agent-Aktion schlaegt fehl
  Given ich fuehre einen Voice Call
  When ich eine Aktion anfordere die fehlschlaegt
  Then informiert mich der Agent verbal ueber den Fehler
  And ich sehe die Fehlermeldung im Action-Log
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
- [ ] VoiceCallService orchestriert den vollstaendigen STT -> LLM -> TTS Loop
- [ ] Claude CLI wird mit Voice-spezifischem System-Prompt und Agent-Skill-Kontext aufgerufen
- [ ] Tool-Calls werden ausgefuehrt und als voice:action:start/complete Events gestreamt
- [ ] Konversationskontext bleibt ueber mehrere Turns erhalten
- [ ] LLM-Response-Text wird satzweise an TTS-Pipeline gestreamt
- [ ] Konfigurierbarer LLM-Provider (nutzt bestehende model-config.ts)
- [ ] Backend kompiliert fehlerfrei (`cd ui && npm run build:backend`)
- [ ] Keine Linting-Fehler (`cd ui && npm run lint`)
- [ ] **Integration hergestellt: VoiceCallService -> ClaudeHandler -> Tool Calls -> WS Events**
  - [ ] Import/Aufruf existiert in Code
  - [ ] Verbindung ist funktional (nicht nur Stub)

---

### Betroffene Layer & Komponenten

- **Integration Type:** Backend-only

| Layer | Komponenten | Aenderung |
|-------|-------------|----------|
| Backend (Service) | VoiceCallService | MODIFY: LLM Conversation Loop, System-Prompt-Builder, Action-Event-Dispatch |
| Backend (Service) | claude-handler.ts | MODIFY/REFERENCE: Nutzt streamClaudeCodeResponse Pattern fuer Voice |
| Backend (Integration) | websocket.ts | MODIFY: voice:action:start, voice:action:complete Message-Cases |

- **Kritische Integration Points:**
  - VoiceCallService -> ClaudeHandler.streamClaudeCodeResponse() (oder analoger Aufruf)
  - ClaudeHandler -> VoiceCallService Callbacks: onContent(text), onToolCall(toolName, input)
  - VoiceCallService -> ElevenLabsAdapter: LLM-Text satzweise an TTS
  - VoiceCallService -> Gateway: voice:action:start/complete Events ans Frontend

---

### Technical Details

**WAS:**
- VoiceCallService (Backend) erweitern: Vollstaendiger Conversation Loop (STT-Event -> LLM-Aufruf -> TTS-Streaming + Action-Events)
- Voice-spezifischen System-Prompt-Builder: Agent-Rolle, Skills, Projekt-Kontext, Konversationshistorie
- Tool-Call-Event-Streaming: voice:action:start (Tool gestartet) und voice:action:complete (Tool fertig mit Ergebnis)

**WIE (Architecture Guidance):**
- Bestehenden ClaudeHandler.streamClaudeCodeResponse() Pattern nutzen (gleicher CLI Spawn-Mechanismus)
- Voice System-Prompt: Inkludiert Agent-Skill-Kontext (SKILL.md Inhalt), Konversationshistorie, Anweisung fuer natuerliche Konversation
- Text-Chunks satzweise an TTS-Pipeline weiterleiten (nicht warten bis LLM fertig)
- Tool-Calls: Gleiche Faehigkeiten wie Chat-Modus, nur zusaetzlich voice:action:* Events ans Frontend
- Konversationshistorie: In-Memory pro Session (Map<sessionId, messages[]>), analog ClaudeSession Pattern
- LLM-Provider: Nutzt getCliCommandForModel() aus model-config.ts (bestehend)

**WO:**
- `ui/src/server/services/voice-call.service.ts` (MODIFY)
- `ui/src/server/websocket.ts` (MODIFY)
- `ui/src/server/claude-handler.ts` (REFERENCE - Pattern kopieren, nicht modifizieren)

**Abhaengigkeiten:** VCF-003 (STT Pipeline), VCF-004 (TTS Pipeline)

**Geschaetzte Komplexitaet:** M

**Relevante Skills:**

| Skill | Pfad | Grund |
|-------|------|-------|
| backend-express | .claude/skills/backend-express/SKILL.md | Claude CLI Integration, Streaming Pattern, Session Management |
| domain-specwright-ui | .claude/skills/domain-specwright-ui/SKILL.md | Skills API, Projekt-Kontext, Agent-Rollen |

---

### Creates Reusable Artifacts

Creates Reusable: no (Erweitert bestehenden VoiceCallService, keine neuen standalone Artefakte)

---

### Technische Verifikation (Automated Checks)

- CONTAINS: ui/src/server/services/voice-call.service.ts -> "streamClaude" oder "claude"
- CONTAINS: ui/src/server/websocket.ts -> "voice:action"
- LINT_PASS: cd ui && npm run lint
- BUILD_PASS: cd ui && npm run build:backend

### Completion Check

```bash
# Auto-Verify Commands - all must exit with 0
grep -q "claude" ui/src/server/services/voice-call.service.ts && echo "Claude integration OK"
grep -q "voice:action" ui/src/server/websocket.ts && echo "Action events OK"
cd ui && npm run build:backend 2>&1 | tail -1
```

**Story ist DONE wenn:**
1. Alle CONTAINS checks bestanden
2. Alle BUILD_PASS commands exit 0
3. Git diff zeigt nur erwartete Aenderungen
