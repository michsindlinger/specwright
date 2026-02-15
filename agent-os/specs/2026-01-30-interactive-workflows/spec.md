# Interactive Workflows Specification

> Spec ID: WKFL
> Created: 2026-01-30
> Last Updated: 2026-01-30
> Version: 1.0.0

## Overview

Interaktive Ausführung von Agent OS Workflows in der WebUI mit Dialog-basierter Nutzerinteraktion, Live-Dokumenten-Preview und visueller Fortschrittsanzeige.

## User Stories

1. **WKFL-001**: Workflow-Start über Karten
2. **WKFL-002**: AskUserQuestion UI
3. **WKFL-003**: Workflow-Progress-Indikator
4. **WKFL-004**: Embedded Docs-Viewer
5. **WKFL-005**: Collapsible Long Text
6. **WKFL-006**: Error-Handling & Cancel
7. **WKFL-007**: Minimal Tool-Activity
8. **WKFL-008**: Backend Workflow-Interaction
9. **WKFL-999**: Integration & E2E Validation

## Spec Scope

### Included
- Interaktive Ausführung aller Agent OS Workflows
- AskUserQuestion UI mit klickbaren Optionen und "Other" Textfeld
- Schritt-Indikator für Workflow-Progress
- Eingebetteter Docs-Viewer für Live-Preview
- Eingeklappte lange Texte im Chat
- Inline Error-Handling mit Retry
- Cancel-Funktion

### Out of Scope
- Background-Execution-Modus (wird durch interaktiven Modus ersetzt)
- Multi-Workflow parallel (nur einer gleichzeitig)
- Workflow-Resume nach Browser-Schließung
- Custom Workflow-Erstellung in der UI
- Workflow-Editing/Modifikation
- Chat-basierter Workflow-Start (nur über Karten)

## Expected Deliverables

### Frontend Components
- `aos-workflow-chat.ts` - Workflow-spezifischer Chat-Bereich
- `aos-workflow-question.ts` - AskUserQuestion UI mit Optionen
- `aos-workflow-step-indicator.ts` - Schritt-Fortschrittsanzeige
- `aos-collapsible-text.ts` - Einklappbare lange Texte
- Erweiterung von `aos-workflow-view.ts` für inline Chat-Integration

### Backend Services
- Erweiterung von `workflow-executor.ts` für interaktive Workflows
- Neue WebSocket-Message-Types für Workflow-Fragen und Antworten
- Session-Management für aktive Workflow-Dialoge

### Integration
- Docs-Viewer Panel-Integration in Workflow-View
- WebSocket-Protokoll-Erweiterungen für bidirektionale Kommunikation

## Integration Requirements

**Integration Type:** Full-stack

### Integration Test Commands

```bash
# Backend WebSocket Tests
npm run test -- --grep "workflow-executor"

# Frontend Component Tests
npm run test:ui -- --grep "workflow-chat"

# E2E Workflow Test (requires MCP)
# MCP_PLAYWRIGHT: http://localhost:5173/workflows - Start und complete einen Workflow
```

### End-to-End Scenarios

1. **Create-Spec Workflow durchlaufen**
   - User startet /create-spec über Workflow-Karte
   - Beantwortet alle Fragen via UI
   - Sieht generierte Dokumente im Docs-Viewer
   - Workflow schließt erfolgreich ab

2. **Workflow abbrechen**
   - User startet Workflow
   - Klickt Cancel während einer Frage
   - Workflow wird sauber beendet
   - UI kehrt zur Workflow-Liste zurück

3. **Error Recovery**
   - Claude CLI connection fehlt
   - User sieht Fehlermeldung mit Retry-Button
   - Nach Retry funktioniert der Workflow

---

*See story-index.md for individual stories and execution plan.*
