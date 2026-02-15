# Multi-Project Support Specification

> Spec: multi-project-support
> Created: 2026-01-30
> Version: 1.0

## Overview

Ermöglicht das gleichzeitige Öffnen und Wechseln zwischen mehreren Projekten über eine Tab-Navigation im Header. Nutzer können zwischen Projekten wechseln, während Workflows unabhängig voneinander weiterlaufen.

## User Stories

| Story ID | Title | Type | Priority |
|----------|-------|------|----------|
| MPRO-001 | Tab-Navigation Component | Frontend | High |
| MPRO-002 | Project Add Modal | Frontend | High |
| MPRO-003 | Recently Opened Service | Frontend | Medium |
| MPRO-004 | Backend Multi-Project Context | Backend | High |
| MPRO-005 | WebSocket Multi-Connection | Backend | High |
| MPRO-006 | Project Context Switching | Frontend | High |
| MPRO-999 | Integration & E2E Validation | Test | High |

## Spec Scope

### Included
- Tab-Navigation im Header mit Projekt-Tabs
- Modal-Dialog zum Hinzufügen von Projekten
- Recently Opened Liste (localStorage)
- File-Picker Integration für Ordnerauswahl
- Project-Context-Switching im Frontend
- Backend Multi-Project Context Management
- Unabhängige WebSocket-Verbindungen pro Projekt
- Validierung von Projekt-Ordnern (muss agent-os/ enthalten)
- Automatische Bereinigung ungültiger Pfade

### Out of Scope
- Chat-Historie Persistenz zwischen Projekten
- Projekt-spezifische Icons/Avatare
- Drag & Drop Reordering von Tabs
- Projekt-Gruppen oder Kategorien
- Remote-Projekte (nur lokales Filesystem)
- Synchronisation zwischen Browser-Sessions

## Expected Deliverable

Nach Abschluss dieser Spezifikation:

1. **Tab-Navigation**: Neue Zeile im Header mit Projekt-Tabs, aktiver Tab hervorgehoben, Schließen-Buttons, Plus-Icon
2. **Add Project Modal**: Dialog mit Recently Opened Liste und File-Picker, Validierung, Duplikat-Prüfung
3. **Recently Opened**: localStorage-basierte Persistenz der Projekt-Historie
4. **Backend Context**: Server unterstützt mehrere Projekt-Kontexte gleichzeitig
5. **WebSocket**: Eine Verbindung pro aktivem Projekt mit laufendem Workflow
6. **Context Switching**: Nahtloser Wechsel zwischen Projekten mit korrektem State-Management

## Integration Requirements

**Integration Type:** Full-stack

### Integration Test Commands

```bash
# Backend Multi-Project Context Test
curl -X POST http://localhost:3000/api/project/switch \
  -H "Content-Type: application/json" \
  -d '{"projectPath": "/path/to/project"}' \
  && echo "Backend project switch: OK"

# Frontend Tab Navigation Test
npm run test -- --filter="aos-project-tabs"

# E2E Flow Test (requires Playwright MCP)
# npm run test:e2e -- --spec="multi-project"
```

### End-to-End Scenarios

1. **Projekt hinzufügen via Recently Opened**
   - User klickt Plus-Icon
   - User wählt Projekt aus Recently Opened Liste
   - Neuer Tab erscheint, Projekt wird aktiviert

2. **Projekt hinzufügen via File-Picker**
   - User klickt Plus-Icon
   - User wählt "Ordner auswählen"
   - User wählt gültigen Projekt-Ordner
   - Neuer Tab erscheint, Projekt wird aktiviert

3. **Projekt-Wechsel mit aktivem Workflow**
   - User startet Workflow in Projekt A
   - User wechselt zu Projekt B
   - Workflow in Projekt A läuft weiter
   - User wechselt zurück, sieht Workflow-Status

4. **Projekt schließen**
   - User klickt X auf Tab
   - Tab wird entfernt
   - Bei letztem Projekt: Leerer Zustand angezeigt

## Technical Context

- **Frontend**: Lit Web Components, TypeScript
- **Backend**: Node.js + Express + TypeScript
- **State Management**: Lit Context API
- **WebSocket**: Bestehende WebSocket-Infrastruktur erweitern
- **Storage**: Browser localStorage für Recently Opened

---

*Reference: agent-os/specs/2026-01-30-multi-project-support/requirements-clarification.md*
