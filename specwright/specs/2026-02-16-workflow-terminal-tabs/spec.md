# Specification: Workflow Terminal Tabs

> Spec ID: 2026-02-16-workflow-terminal-tabs
> Created: 2026-02-16
> Status: Ready for Execution

## Overview

Workflow-Ausfuehrungen (z.B. /execute-tasks, /create-spec) werden von der blockierenden Execution-View auf interaktive xterm.js Terminal-Tabs im Cloud Terminal migriert. Jeder Workflow startet als eigenstaendige Claude CLI PTY-Session in einem neuen Tab -- nicht-blockierend, parallel moeglich, mit nativer Terminal-Erfahrung.

## User Stories

| Story ID | Title | Type |
|----------|-------|------|
| WTT-001 | Backend Workflow-Session-Support | Backend |
| WTT-002 | Frontend Workflow-Tab-Integration | Frontend |
| WTT-003 | UI-Trigger auf Terminal-Tabs umleiten | Full-stack |
| WTT-004 | Tab-Notifications bei Input-Bedarf | Frontend |
| WTT-005 | Tab-Close Confirmation | Frontend |
| WTT-006 | Legacy Cleanup | Full-stack |

## Spec Scope

**Included:**
- Cloud Terminal Manager erweitern um Workflow-Sessions mit Auto-Command
- Terminal-Tabs im Frontend erweitern um Workflow-Metadaten und Notifications
- Alle UI-Trigger (Kanban, Dashboard, Queue) auf Terminal-Tabs umleiten
- Badge + Farbwechsel bei Input-Bedarf
- Bestaetigungs-Dialog beim Schliessen laufender Workflow-Tabs
- Entfernung aller alten Execution-Tab und Workflow-Chat Komponenten

**Excluded:**
- Workflow-spezifische UI innerhalb des Terminals
- Structured Questions UI (bleibt CLI)
- Session Resume nach Browser-Neustart
- Persistierung von Workflow-Ergebnissen

## Expected Deliverables

- Erweiterte `CloudTerminalManager` mit `createWorkflowSession()` Methode
- Erweiterte Terminal-UI-Komponenten mit Workflow-Tab-Support
- Alle Workflow-Trigger oeffnen Terminal-Tabs statt Execution-View
- Notification-System fuer Input-Bedarf an inaktiven Tabs
- Close-Confirmation fuer laufende Workflow-Tabs
- Entfernte Legacy-Komponenten (workflow-chat, execution-tabs, etc.)

## Integration Requirements

**Integration Type:** Full-stack

**Integration Test Commands:**
```bash
# Backend: CloudTerminalManager has createWorkflowSession method
grep -q "createWorkflowSession" ui/src/server/services/cloud-terminal-manager.ts

# Frontend: Terminal tabs support workflow metadata
grep -q "isWorkflow" ui/frontend/src/components/terminal/aos-terminal-tabs.ts

# Legacy cleanup: Old components removed
! test -f ui/frontend/src/components/execution-tabs.ts
! test -f ui/frontend/src/components/execution-tab.ts
! test -f ui/frontend/src/components/workflow-chat.ts

# Build passes
cd ui && npm run build:backend
cd ui/frontend && npm run build
```

**End-to-End Scenarios:**
1. User klickt "Execute Story" im Kanban -> Terminal-Tab oeffnet mit Claude CLI -> Workflow laeuft
2. Mehrere Workflows parallel in verschiedenen Tabs
3. Tab-Close bei laufendem Workflow zeigt Confirmation Dialog

**Requires MCP:** no (CLI-basierte Tests ausreichend)
