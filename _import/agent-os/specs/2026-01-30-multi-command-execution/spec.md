# Multi-Command Execution Specification

> Spec ID: MCE
> Created: 2026-01-30
> Last Updated: 2026-01-30

## Overview

Ermöglicht das parallele Ausführen mehrerer Workflow-Commands im Agent OS Web UI. Jeder Command (z.B. `/create-spec`, `/execute-tasks`, `/plan-product`) startet eine eigene Claude Code Instanz in einem separaten Tab, sodass User mehrere Workflows gleichzeitig ausführen können.

## User Stories

| Story ID | Title | Type | Priority |
|----------|-------|------|----------|
| MCE-001 | Workflow Tab Bar Component | Frontend | High |
| MCE-002 | Multi-Execution State Management | Frontend | High |
| MCE-003 | Tab Status Indicators | Frontend | High |
| MCE-004 | Command Selector Enhancement | Frontend | Medium |
| MCE-005 | Tab Close & Cancel Logic | Frontend | Medium |
| MCE-006 | Background Notifications | Frontend | Medium |
| MCE-999 | Integration & End-to-End Validation | Test | High |

## Spec Scope

### IN SCOPE

- Tab-basierte Multi-Execution Navigation
- Parallele Claude Code Instanzen (eigener Prozess pro Tab)
- Status-Indikatoren pro Tab (running/waiting/completed/failed)
- Tab schließen/abbrechen Funktionalität
- Notifications bei Statuswechsel in Hintergrund-Tabs
- Neuen Command via "+" Button starten
- Command Selector Enhancement ("Open in new tab" Option)

### OUT OF SCOPE

- Execution-Persistenz über App-Restart (Sessions != Executions)
- Drag & Drop Tab-Reordering
- Tab-Gruppen oder -Favoriten
- Execution-Historie (abgeschlossene Executions verschwinden bei Tab-Schließen)
- Keyboard-Shortcuts für Tab-Wechsel
- Split-View (mehrere Executions gleichzeitig sichtbar)
- Execution-Sharing zwischen Usern

## Expected Deliverables

1. **Tab-Leiste Komponente** (`aos-execution-tabs`)
   - Horizontale Tabs mit Execution-Status
   - "+" Button für neuen Command
   - "X" Button pro Tab
   - Status-Indikatoren (running/waiting/complete/error)

2. **Multi-Execution State** (Frontend)
   - ExecutionStore für mehrere parallele Executions
   - Aktive Execution tracking
   - Tab-Wechsel ohne State-Verlust

3. **Command Selector Enhancement**
   - "Start in new tab" Option
   - Schnellstart für häufige Commands
   - Integration mit Tab-System

4. **Background Notifications**
   - Tab-Badge bei Status-Änderungen
   - Visual Feedback für Hintergrund-Events
   - Attention-Indikator bei Fragen

## Integration Requirements

**Integration Type:** Full-stack (Frontend-heavy, Backend unchanged)

### Integration Test Commands

```bash
# Frontend: Execution Tab Components Tests
npm run test -- --grep "aos-execution"

# Frontend: State Management Tests
npm run test -- --grep "ExecutionStore"

# WebSocket: Multi-Execution Routing Tests
npm run test -- --grep "multi-execution"

# E2E: Full Integration (Optional - requires Playwright MCP)
# npm run test:e2e -- --grep "multi-command"
```

### End-to-End Scenarios

1. **Ersten Command starten**
   - User wählt Command aus Command-Selector
   - Tab erscheint in Tab-Leiste
   - Execution startet und Output wird angezeigt

2. **Zweiten Command parallel starten**
   - User klickt "+" Button während erster Command läuft
   - Neuer Tab erscheint, erster läuft weiter
   - User kann zwischen Tabs wechseln

3. **Tab mit Frage wechseln**
   - Command stellt Frage, Tab zeigt Badge
   - User wechselt zu anderem Tab
   - Badge bleibt sichtbar, Frage wartet
   - User kehrt zurück und beantwortet Frage

4. **Running Execution abbrechen**
   - User klickt X auf Tab mit laufender Execution
   - Bestätigungs-Dialog erscheint
   - Nach Bestätigung: Prozess wird beendet, Tab schließt

| Test | Requires MCP | Blocking |
|------|--------------|----------|
| Tab Components Tests | No | Yes |
| State Management Tests | No | Yes |
| WebSocket Routing Tests | No | Yes |
| E2E Browser Tests | Playwright | No |
