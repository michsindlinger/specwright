# Requirements Clarification - Agent OS Web UI

**Created:** 2026-01-30
**Status:** Pending User Approval

## Feature Overview

Eine lokale Web-UI zur Steuerung von Claude Code, die Workflow-Execution, Spec/Story-Übersicht (Kanban) und ein Chat Interface kombiniert - basierend auf dem TypeScript Agent SDK mit WebSocket-Streaming.

## Target Users

- **Primär:** Ich selbst (Personal Tool)
- **Modus:** Lokale Entwicklung, keine Authentication nötig
- **Fokus:** Maximale Einfachheit und schneller Zugriff

## Business Value

- **Visualisierung:** Specs, Stories und Kanban-Status auf einen Blick statt Terminal-Output
- **Effizienz:** Quick-Actions für häufige Workflows statt Tippen
- **Monitoring:** Live-Streaming von Claude Code Output im Browser
- **Übersicht:** Besseres Verständnis des Projekt-Status durch Dashboard

## Functional Requirements

### 1. Workflow Execution
- Slash-Commands über UI triggern (/create-spec, /execute-tasks, etc.)
- Live-Output Streaming via WebSocket
- Progress-Anzeige für lange Tasks (>5min)
- Abbruch-Möglichkeit für laufende Tasks
- Background-Execution Support

### 2. Spec/Story Übersicht (Dashboard)
- Kanban-Board Ansicht für Stories
- Spalten: Backlog, In Progress, Done (basierend auf kanban-board.md)
- Spec-Liste mit allen verfügbaren Specs
- Click-through zu Story-Details

### 3. Chat Interface
- Freie Konversation mit Claude Code (wie Terminal)
- Beliebige Prompts eingeben
- Streaming-Responses anzeigen
- Tool-Calls visualisieren (welche Tools werden aufgerufen)

### 4. Projekt-Auswahl
- Liste von konfigurierten Projekten
- Projekt wechseln ohne Restart
- Aktuelles Projekt prominent anzeigen

## Technical Architecture

### Frontend
- **Framework:** Lit 3.x (Web Components, wie Moltbot)
- **Build:** Vite
- **Styling:** Moltbot-Style (Dark Theme, Space Grotesk, JetBrains Mono)
- **Sprache:** TypeScript

### Backend
- **Runtime:** Node.js
- **SDK:** @anthropic-ai/claude-agent-sdk (TypeScript)
- **Kommunikation:** WebSocket für Streaming
- **API:** REST für CRUD-Operationen (Specs lesen, Projekte auflisten)

### Deployment
- **Modus:** Lokal (localhost)
- **Start:** Einfacher npm start
- **Persistenz:** Keine (stateless) - liest direkt aus Dateisystem

## Affected Areas & Dependencies

| Komponente | Beschreibung |
|------------|--------------|
| TypeScript Agent SDK | Kern-Abhängigkeit für Claude Code Steuerung |
| agent-os/specs/ | Lesen von Spec-Daten für Dashboard |
| kanban-board.md | Lesen von Story-Status für Kanban |
| WebSocket | Real-time Kommunikation UI ↔ Backend |
| Moltbot Styles | Design-Inspiration (CSS kopieren/adaptieren) |

## Edge Cases & Error Scenarios

| Edge Case | Expected Behavior |
|-----------|-------------------|
| Lange Tasks (>5min) | Progress-Indicator, Task läuft im Background weiter |
| Task-Abbruch | Cancel-Button stoppt Claude Code gracefully |
| Backend nicht erreichbar | Klare Fehlermeldung, Retry-Button |
| Große Logs/Output | Virtualized Scrolling, Log-Truncation |
| Invalid Project Path | Fehlermeldung, Projekt-Auswahl bleibt offen |

## Security & Permissions

- **Keine Auth nötig:** Lokal-only, localhost binding
- **File Access:** Nur Lesezugriff auf agent-os/ Struktur
- **Claude Code:** Nutzt bestehende Anthropic API Keys (aus Umgebung)

## Performance Considerations

- WebSocket für Streaming (kein Polling)
- Lazy-Loading von Spec-Details
- Virtualized Lists für große Story-Mengen
- Debounced Search/Filter

## Scope Boundaries

**IN SCOPE:**
- Web UI mit 3 Haupt-Views (Dashboard, Chat, Workflow Execution)
- TypeScript Backend mit Agent SDK
- WebSocket Streaming
- Projekt-Auswahl aus Config-Liste
- Moltbot-ähnliches Design
- Lokale Ausführung

**OUT OF SCOPE:**
- Multi-User / Authentication
- Cloud Deployment
- Persistente Session-Historie
- Mobile App
- Plugin-System
- Custom Branding/Theming

## Open Questions

Keine - Requirements sind vollständig geklärt.

## Proposed User Stories (High Level)

1. **Backend Setup** - Node.js Server mit TypeScript Agent SDK und WebSocket
2. **Frontend Scaffold** - Lit-basierte UI mit Routing und Moltbot-Styling
3. **Projekt-Verwaltung** - Config-Datei für Projekte, Auswahl in UI
4. **Chat Interface** - Freie Konversation mit Claude Code, Streaming-Output
5. **Workflow Execution** - Slash-Commands triggern, Progress-Anzeige, Abbruch
6. **Dashboard View** - Spec-Liste und Kanban-Board für Stories
7. **Integration & Polish** - Alle Views verbinden, Error Handling, UX-Feinschliff

---

*Review this document carefully. Once approved, detailed user stories will be generated.*
