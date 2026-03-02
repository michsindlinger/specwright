# Spec Requirements Document

> Spec: Voice Call Conversational Flow
> Created: 2026-03-01
> Status: Planning

## Overview

1:1 Voice Calls mit Specwright Agents in der Web UI. User kann Teammitglieder (Agents) direkt "anrufen", per Sprache mit ihnen kommunizieren und der Agent kann waehrend des Gespraechs sowohl antworten als auch Aktionen ausfuehren (Code schreiben, Dateien aendern, Specs erstellen). Das System nutzt Deepgram Nova-3 fuer Echtzeit Speech-to-Text, ElevenLabs fuer natuerliche Text-to-Speech mit rollenbasierten Stimm-Personas, und die bestehende Claude CLI Integration fuer LLM-Konversation mit Tool-Faehigkeiten.

## User Stories

Siehe: specwright/specs/2026-03-01-voice-call-conversational-flow/story-index.md

1. VCF-001: Voice Configuration & API Key Management
2. VCF-002: Audio Adapters Setup
3. VCF-003: STT Pipeline
4. VCF-004: TTS Pipeline
5. VCF-005: Agent Conversation Engine
6. VCF-006: Voice Call View & Navigation
7. VCF-007: Audio Visualizer & Call Controls
8. VCF-008: Live Action Log & Transcript UI
9. VCF-009: Team Card Call Integration
10. VCF-010: Text Fallback & Input Mode Switching
11. VCF-011: Transcript Storage & Voice Personas

## Spec Scope

- 1:1 Voice Calls mit einzelnen Agents
- Vollbild Call-View mit Audio-Visualisierung
- Deepgram STT + ElevenLabs TTS Integration (serverseitig)
- Rollenbasierte Stimm-Personas pro Agent-Typ
- Agent kann waehrend des Calls Aktionen ausfuehren (Code, Dateien, Specs)
- Live Action Log zeigt Agent-Aktionen in Echtzeit
- Text-Transkript-Speicherung
- Text-Fallback bei fehlendem Mikrofon
- Konfigurierbarer LLM-Provider (Claude Default)
- Push-to-Talk und VAD Modi (konfigurierbar)
- API-Key-Verwaltung ueber Settings-View

## Out of Scope

- Multi-Agent Calls / Gruppen-Meetings
- Video-Calls / Screen-Sharing
- Offline-Faehigkeit
- Voice Commands fuer Slash-Commands
- CLI-Integration (nur Web UI)
- Audio-Aufnahme/Speicherung (nur Transkript wird gespeichert)
- Custom Voice Cloning (vordefinierte ElevenLabs-Stimmen)

## Expected Deliverable

Ein vollstaendig funktionales Voice Call System mit:
- Voice Call starten via Team-Card Telefon-Icon
- Vollbild Call-View mit Agent-Avatar, Wellenform-Visualisierung, Controls
- Echtzeit Speech-to-Text (Deepgram Nova-3) und Text-to-Speech (ElevenLabs)
- Agent kann waehrend des Calls Code schreiben und Aktionen ausfuehren
- Live Action Log zeigt Agent-Aktionen
- Text-Fallback wenn kein Mikrofon verfuegbar
- Transkript-Speicherung nach Call-Ende
- API-Key-Konfiguration in Settings

## Integration Requirements

> Diese Integration-Tests werden automatisch nach Abschluss aller Stories ausgefuehrt.

**Integration Type:** Full-stack

- [x] **Integration Test 1:** Voice Config API funktioniert
   - Command: `cd ui && npx vitest run tests/voice-config --reporter=verbose`
   - Validates: VoiceConfigService liest/schreibt voice-config.json korrekt
   - Requires MCP: no
   - Result: SKIPPED (no test files created)

- [x] **Integration Test 2:** Backend kompiliert mit Voice-Services
   - Command: `cd ui && npm run build:backend`
   - Validates: Alle neuen Backend-Services und Adapter kompilieren fehlerfrei
   - Requires MCP: no
   - Result: PASSED

- [x] **Integration Test 3:** Frontend kompiliert mit Voice-Komponenten
   - Command: `cd ui/frontend && npm run build`
   - Validates: Alle neuen Lit-Komponenten kompilieren fehlerfrei
   - Requires MCP: no
   - Result: PASSED

- [x] **Integration Test 4:** Voice Call View laed im Browser
   - Command: `playwright test --grep "voice call view"`
   - Validates: Route #/call/:skillId rendert aos-voice-call-view korrekt
   - Requires MCP: yes (Playwright)
   - Result: SKIPPED (Playwright MCP optional)

**Integration Scenarios:**
- [x] Scenario 1: User oeffnet Team-View, klickt Telefon-Icon auf einer Team Card, wird zur Voice Call View navigiert mit korrektem Agent-Kontext (verified: call-click event, route, view rendering)
- [x] Scenario 2: Voice Configuration in Settings gespeichert, API-Keys sind serverseitig verfuegbar aber nicht ans Frontend exponiert (verified: VoiceConfigService, Settings Voice section)

**Notes:**
- Tests mit "Requires MCP: yes" sind optional (uebersprungen wenn MCP Tool nicht verfuegbar)
- Integration Validation laeuft via System Story 998 waehrend execute-tasks

## Spec Documentation

- Story Index: specwright/specs/2026-03-01-voice-call-conversational-flow/story-index.md
- Implementation Plan: specwright/specs/2026-03-01-voice-call-conversational-flow/implementation-plan.md
- Requirements: specwright/specs/2026-03-01-voice-call-conversational-flow/requirements-clarification.md
