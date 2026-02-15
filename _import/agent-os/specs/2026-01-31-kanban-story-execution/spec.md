# Kanban Story Execution

**Spec ID:** KSE
**Created:** 2026-01-31
**Status:** Ready for Implementation

## Overview

Drag & Drop einer Story von Backlog nach In Progress im Kanban Board löst automatisch `/execute-tasks` für diese spezifische Story aus. Die Story zeigt einen "Working" Indikator während der Ausführung.

## User Stories

| ID | Title | Type | Priority | Effort |
|----|-------|------|----------|--------|
| KSE-001 | Drag & Drop Infrastruktur | Frontend | High | S |
| KSE-002 | Pre-Drag Validation | Frontend | High | S |
| KSE-003 | Execute-Tasks Trigger | Full-Stack | High | M |
| KSE-004 | Working Indicator | Frontend | Medium | S |
| KSE-999 | Integration & Validation | Test | Medium | S |

## Spec Scope

### Included
- HTML5 Drag & Drop für Story Cards zwischen Kanban-Spalten
- DoR Validation: Stories ohne vollständige DoR werden blockiert
- Dependency Validation: Stories mit offenen Abhängigkeiten werden blockiert
- Automatischer `/execute-tasks [spec] [story-id]` Aufruf bei Backlog → In Progress
- Working Indicator auf Story Card während Workflow-Ausführung
- Kanban Status Update in kanban-board.md
- Toast Notifications für Validierungsfehler

### Excluded
- Drag zwischen In Progress ↔ Done (nur Status-Update, kein Workflow)
- Reordering innerhalb einer Spalte
- Multi-Select Drag
- Undo/Redo
- Detaillierter Workflow-Fortschritt im Kanban

## Expected Deliverables

1. **Drag & Drop im Kanban Board** - Stories können zwischen Spalten gezogen werden
2. **Validierung vor Drop** - DoR und Dependencies werden geprüft
3. **Workflow-Integration** - execute-tasks startet automatisch für spezifische Story
4. **Visuelles Feedback** - Working Indicator zeigt laufenden Workflow
5. **Backend-Integration** - WebSocket-Handler und Kanban-Update

## Integration Requirements

**Integration Type:** Full-Stack

### Integration Test Commands
```bash
# Build and lint check
cd agent-os-ui && npm run build && npm run lint

# Unit tests
cd agent-os-ui && npm test

# E2E validation (manual)
# 1. Open Dashboard, select spec with stories
# 2. Drag story from Backlog to In Progress
# 3. Verify Working indicator appears
# 4. Verify execute-tasks workflow starts
```

### End-to-End Scenarios

| Scenario | Steps | Expected Result | MCP Required |
|----------|-------|-----------------|--------------|
| Happy Path | Drag ready story to In Progress | Workflow starts, Working indicator shows | No |
| DoR Block | Drag story without DoR | Drop blocked, error toast | No |
| Dependency Block | Drag story with open deps | Drop blocked, shows blocking stories | No |
| Workflow Complete | Wait for workflow to finish | Working indicator removed, status updated | No |

## Technical Notes

- Nutzt HTML5 Drag & Drop API (native, kein Library)
- WebSocket Message: `workflow.story.start` mit `{ specId, storyId }`
- Working Status wird über bestehende `workflow.interactive.*` Events getrackt
- Kanban-Update erfolgt über `specs-reader.ts` (bestehende Infrastruktur)
