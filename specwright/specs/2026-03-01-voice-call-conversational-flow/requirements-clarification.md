# Requirements Clarification - Voice Call Conversational Flow

**Created:** 2026-03-01
**Status:** Pending User Approval

## Feature Overview
1:1 Voice Calls mit Specwright Agents in der Web UI. User kann Teammitglieder (Agents) direkt "anrufen", per Sprache mit ihnen kommunizieren und der Agent kann waehrend des Gespraechs sowohl antworten als auch Aktionen ausfuehren (Code schreiben, Dateien aendern, Specs erstellen). Wie ein Telefonat mit einem Kollegen, der gleichzeitig am Rechner arbeitet.

## Target Users
- Senior Software Developers & Architects, die Specwright Web UI nutzen
- User, die natuerlichere Interaktion mit ihren Agents bevorzugen (statt nur Text-Chat)
- Teams, die schnellere Abstimmungen mit Agents wuenschen (Sprechen ist schneller als Tippen)

## Business Value
- **Natuerlichere Interaktion:** Sprechen ist 3-4x schneller als Tippen - beschleunigt die Agent-Kommunikation
- **Hands-free Development:** Developer kann gleichzeitig am Code arbeiten waehrend er mit dem Agent spricht
- **Niedrigere Einstiegshuerde:** Natuerliche Konversation senkt die Lernkurve fuer neue User
- **Differenzierung:** Kein anderes AI-Development-Framework bietet Voice-basierte Agent-Interaktion
- **Phase 2 Roadmap:** Kernfeature der Voice Agent Integration (P0)

## Functional Requirements

### Call starten
- Telefon-Icon auf jeder Team Card in der Team-Uebersicht (aos-team-view)
- Klick auf das Icon startet den Voice Call mit dem jeweiligen Agent
- Browser fragt nach Mikrofon-Berechtigung (falls noch nicht erteilt)
- Visuelles Feedback waehrend der Verbindungsaufbau (Klingeln/Connecting-Animation)

### Call UI
- **Vollbild-Call-View** als eigene Ansicht (nicht Overlay)
- Agent-Avatar/Icon mit Name und Rolle prominent angezeigt
- Audio-Wellenform-Animation waehrend der Agent spricht
- Roter "Auflegen"-Button zum Beenden des Calls
- Mute/Unmute-Button fuer das eigene Mikrofon
- Live-Aktions-Log: Zeigt in Echtzeit was der Agent tut (Dateien erstellt, Code aendert)
- Text-Fallback: Input-Feld zum Tippen wenn kein Mikrofon verfuegbar

### Sprachinteraktion
- **STT (Speech-to-Text):** Deepgram Nova-3 fuer Echtzeit-Transkription der User-Sprache
- **TTS (Text-to-Speech):** ElevenLabs fuer natuerliche Agent-Antworten
- **Rollenbasierte Stimmen:** Jeder Agent-Typ (Architect, Frontend-Dev, PO, etc.) hat eine eigene distinkte Stimme
- Echtzeit-Streaming: Agent beginnt zu sprechen bevor die vollstaendige Antwort generiert ist
- Push-to-Talk ODER Voice Activity Detection (VAD) - konfigurierbar

### Konversations-LLM
- Claude (Anthropic) als Default-Provider fuer die Konversation
- Konfigurierbar: User kann LLM-Provider waehlen (Multi-LLM-Support wie bestehend in Specwright)
- Agent nutzt seine Skills und Domain-Knowledge waehrend des Gespraechs
- Agent hat Zugriff auf Projekt-Kontext (Dateien, Specs, Code)

### Aktionen waehrend des Calls
- Agent kann waehrend des Gespraechs Code schreiben, Dateien aendern, Specs erstellen
- Agent kommuniziert Aktionen verbal ("Ich erstelle jetzt die Datei user-service.ts...")
- Aktionen werden live im Aktions-Log in der Call-UI angezeigt
- Gleiche Tool-Faehigkeiten wie im normalen Chat-Modus

### Call beenden
- Roter "Auflegen"-Button beendet den Call sofort
- Nach dem Auflegen: Rueckkehr zur vorherigen Ansicht

### Transkript & History
- Gesamtes Gespraech wird als Text-Transkript gespeichert
- Transkript ist spaeter einsehbar (in der Chat-History oder eigenem Bereich)
- Durchgefuehrte Aktionen sind im Transkript markiert

### Text-Fallback
- Wenn kein Mikrofon verfuegbar/erlaubt: User kann tippen
- Agent antwortet trotzdem per Stimme (TTS bleibt aktiv)
- Nahtloser Wechsel zwischen Voice und Text waehrend eines Calls moeglich

## Affected Areas & Dependencies

### Bestehende Komponenten (Aenderungen)
- **aos-team-view / aos-team-card** - Telefon-Icon hinzufuegen, Click-Handler
- **Router/Navigation** - Neue Route fuer Call-View
- **Backend WebSocket** - Erweitern fuer Audio-Streaming
- **Claude SDK Integration** - Konversations-Modus fuer Voice-Calls

### Neue Komponenten
- **aos-voice-call-view** - Vollbild Call UI
- **aos-audio-visualizer** - Wellenform-Animation
- **aos-call-controls** - Mute, Auflegen, Text-Input
- **aos-action-log** - Live-Anzeige der Agent-Aktionen
- **VoiceCallService** - Backend-Service fuer Audio-Processing
- **DeepgramAdapter** - STT Integration
- **ElevenLabsAdapter** - TTS Integration
- **TranscriptService** - Transkript-Speicherung

### Externe Abhaengigkeiten
- **Deepgram API** - Speech-to-Text (API Key erforderlich)
- **ElevenLabs API** - Text-to-Speech (API Key + Subscription erforderlich)
- **Browser MediaRecorder API** - Mikrofon-Zugriff
- **WebSocket** - Bidirektionaler Audio-Stream

## Edge Cases & Error Scenarios
- **Kein Mikrofon:** Automatischer Fallback auf Text-Input, TTS bleibt aktiv
- **Mikrofon-Berechtigung verweigert:** Hinweis anzeigen, Fallback auf Text
- **API-Key fehlt (Deepgram/ElevenLabs):** Fehlermeldung mit Setup-Anleitung
- **Netzwerk-Unterbrechung:** Reconnect-Versuch, bei Misserfolg Call beenden mit Hinweis
- **STT erkennt nichts:** Timeout nach X Sekunden Stille, "Ich habe dich nicht verstanden" Feedback
- **Hohe Latenz:** Visuelles Feedback ("Agent denkt nach..."), ggf. Streaming-Antwort
- **Gleichzeitiges Sprechen (User + Agent):** Agent stoppt wenn User spricht (Barge-in)
- **Browser-Kompatibilitaet:** Chrome/Edge (voll unterstuetzt), Firefox (MediaRecorder), Safari (eingeschraenkt)

## Security & Permissions
- Mikrofon-Zugriff nur nach expliziter Browser-Berechtigung
- Audio wird NICHT permanent gespeichert - nur das Text-Transkript
- API-Keys (Deepgram, ElevenLabs) werden serverseitig gespeichert (config.json)
- Audio-Stream laeuft ueber den lokalen Specwright-Server (kein externer Relay)

## Performance Considerations
- Latenz-Budget: Max 500ms von User-Sprache bis Agent beginnt zu antworten
- Audio-Streaming (chunked) statt komplette Antwort abwarten
- WebSocket fuer Echtzeit-Kommunikation (kein Polling)
- Deepgram Streaming API fuer Echtzeit-STT
- ElevenLabs Streaming API fuer Echtzeit-TTS

## Scope Boundaries

**IN SCOPE:**
- 1:1 Voice Calls mit einzelnen Agents
- Vollbild Call-View mit Audio-Visualisierung
- Deepgram STT + ElevenLabs TTS Integration
- Rollenbasierte Stimm-Personas pro Agent-Typ
- Agent kann waehrend des Calls Aktionen ausfuehren
- Text-Transkript-Speicherung
- Text-Fallback bei fehlendem Mikrofon
- Konfigurierbarer LLM-Provider
- Push-to-Talk und VAD Modi

**OUT OF SCOPE:**
- Multi-Agent Calls / Gruppen-Meetings (Phase 2, P1 - spaetere Spec)
- Video-Calls / Screen-Sharing
- Offline-Faehigkeit
- Voice Commands fuer Slash-Commands (Phase 2, P1 - spaetere Spec)
- CLI-Integration (nur Web UI)
- Audio-Aufnahme/Speicherung (nur Transkript wird gespeichert)
- Custom Voice Cloning (vordefinierte ElevenLabs-Stimmen)

## Open Questions
- Welche konkreten ElevenLabs-Stimmen sollen den Agent-Rollen zugeordnet werden?
- Soll Push-to-Talk oder VAD der Default-Modus sein?
- Maximale Call-Dauer / Timeout fuer inaktive Calls?

## Proposed User Stories (High Level)
1. **Audio Infrastructure Setup** - Deepgram + ElevenLabs Backend-Integration, API-Key Management
2. **Voice Call View** - Vollbild Call-UI Komponente mit Avatar, Controls, Visualisierung
3. **STT Pipeline** - Browser Mikrofon -> WebSocket -> Deepgram -> Text
4. **TTS Pipeline** - LLM Response -> ElevenLabs -> Audio-Stream -> Browser
5. **Agent Conversation Engine** - LLM-Integration fuer natuerliche Konversation mit Aktions-Faehigkeit
6. **Agent Stimm-Personas** - Rollenbasierte Stimm-Zuordnung und Konfiguration
7. **Call Lifecycle Management** - Call starten, Verbindungsaufbau, Auflegen, Reconnect
8. **Live Action Log** - Echtzeit-Anzeige der Agent-Aktionen waehrend des Calls
9. **Transkript-Speicherung** - Gespraechsverlauf als Text speichern und anzeigen
10. **Team Card Integration** - Telefon-Icon auf Team Cards, Navigation zum Call-View
11. **Text-Fallback** - Input-Feld fuer Text wenn kein Mikrofon verfuegbar

---
*Review this document carefully. Once approved, detailed user stories will be generated.*
