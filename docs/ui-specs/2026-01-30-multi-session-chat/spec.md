# Multi-Session Chat Specification

> Spec ID: MSC
> Created: 2026-01-30
> Last Updated: 2026-01-30

## Overview

Ermöglicht das parallele Arbeiten mit mehreren unabhängigen Chat-Sessions im Agent OS Web UI. Jede Session behält ihren eigenen Kontext (Chat-Historie + Agent-State), sodass User zwischen verschiedenen Aufgaben wechseln können ohne Kontextverlust.

## User Stories

| Story ID | Title | Type | Priority |
|----------|-------|------|----------|
| MSC-001 | Session Tab Bar Component | Frontend | High |
| MSC-002 | Session Types & Contracts | Shared | High |
| MSC-003 | Session Persistence Service | Backend | High |
| MSC-004 | Session State Management | Frontend | High |
| MSC-005 | WebSocket Multi-Session Routing | Full-Stack | High |
| MSC-006 | Session Archive Feature | Full-Stack | Medium |
| MSC-999 | Integration & End-to-End Validation | Test | High |

## Spec Scope

### IN SCOPE

- Tab-basierte Session-Navigation (horizontale Tab-Leiste)
- Session-Persistenz im Projekt-Ordner (`agent-os/sessions/`)
- Chat-Historie + Agent-State pro Session
- Session-Archiv für geschlossene Sessions
- Aktivitäts-Indikator in Tabs
- Session umbenennen (Doppelklick oder Kontextmenü)
- "+" Button für neue Session
- "X" Button zum Schließen (mit Bestätigung bei aktiven Prozessen)
- Automatisches Speichern bei Änderungen
- Wiederherstellung beim App-Start

### OUT OF SCOPE

- Projekt-übergreifende Sessions (globaler Ordner)
- Session-Export/Import
- Session-Sharing zwischen Usern
- Session-Templates
- Keyboard-Shortcuts für Session-Wechsel
- Session-Suche/Filter
- Tab-Gruppen
- Drag & Drop Tab-Reordering (nice-to-have, nicht in MVP)

## Expected Deliverables

1. **Tab-Leiste Komponente** (`aos-session-tabs`)
   - Horizontale Tabs mit Session-Namen
   - "+" Button für neue Session
   - "X" Button pro Tab
   - Aktivitäts-Indikator (Spinner)

2. **Session Service** (Backend)
   - CRUD-Operationen für Sessions
   - Persistenz in `agent-os/sessions/`
   - Archiv-Management

3. **Session Store** (Frontend)
   - Multi-Session State Management
   - Aktive Session tracking
   - Session-Wechsel ohne State-Verlust

4. **WebSocket Integration**
   - Session-ID basiertes Message-Routing
   - Parallele Streams für multiple Sessions

5. **Archiv-Feature**
   - Geschlossene Sessions archivieren
   - Archiv-Liste anzeigen
   - Sessions wiederherstellen

## Integration Requirements

**Integration Type:** Full-stack

### Integration Test Commands

```bash
# Backend: Session Service Tests
npm run test -- --grep "SessionService"

# Frontend: Session Components Tests
npm run test -- --grep "aos-session"

# WebSocket: Multi-Session Routing Tests
npm run test -- --grep "WebSocket.*session"

# E2E: Full Integration (Optional - requires Playwright MCP)
# npm run test:e2e -- --grep "multi-session"
```

### End-to-End Scenarios

1. **Neue Session erstellen und wechseln**
   - User erstellt neue Session via "+" Button
   - Session erscheint als neuer Tab
   - User kann zwischen Sessions wechseln
   - Jede Session zeigt eigene Historie

2. **Session mit aktivem Agent schließen**
   - User hat laufenden Agent-Prozess
   - User versucht Tab zu schließen
   - Bestätigungs-Dialog erscheint
   - Nach Bestätigung: Session wird archiviert

3. **App-Neustart mit Sessions**
   - User hat mehrere Sessions offen
   - User schließt Browser/App
   - User startet App neu
   - Alle Sessions werden wiederhergestellt

4. **Archivierte Session wiederherstellen**
   - User öffnet Archiv-Ansicht
   - User wählt archivierte Session
   - Session wird als neuer Tab geöffnet
   - Komplette Historie ist verfügbar

| Test | Requires MCP | Blocking |
|------|--------------|----------|
| Session Service Tests | No | Yes |
| Session Components Tests | No | Yes |
| WebSocket Routing Tests | No | Yes |
| E2E Browser Tests | Playwright | No |
