# Spec: Model Selection for Kanban Board

## Overview

**Spec ID:** 2026-02-01-model-selection-kanban
**Status:** Ready for Execution
**Created:** 2026-02-01
**Updated:** 2026-02-02

---

## Relation to Chat-Model-Selection

> ⚠️ **WICHTIG:** Die Spec `2026-02-02-chat-model-selection` wurde bereits vollständig implementiert.
> Diese Spec baut darauf auf und kann folgende Komponenten wiederverwenden:

| Wiederverwendbar | Komponente | Nutzen für diese Spec |
|-----------------|------------|----------------------|
| ✅ | `model-config.ts` | Provider/Model-Definitionen |
| ✅ | `model-config.json` | Model-Liste und CLI-Flags |
| ❌ | `aos-model-selector` | Zu Chat-spezifisch, nutzen Inline-Dropdown |
| ❌ | Gateway Events | Chat-Session spezifisch |

**Scope-Unterschied:**
- **Chat-Spec:** Model-Auswahl für Chat-Sessions
- **Diese Spec:** Model-Auswahl für Kanban Story-Ausführung

## Problem Statement

Aktuell wird bei der Story-Ausführung kein Modell ausgewählt - das System verwendet immer das Standard-Modell. User benötigen die Möglichkeit, pro Story das Claude-Modell (Opus, Sonnet, Haiku) auszuwählen, um Kosten und Qualität je nach Story-Komplexität zu optimieren.

## Goals

1. Model-Auswahl direkt auf Story-Cards ermöglichen
2. Persistente Speicherung der Auswahl pro Story
3. Integration mit dem Workflow-Executor für Story-Ausführung

## User Stories

| ID | Title | Type | Priority | Effort | Status |
|----|-------|------|----------|--------|--------|
| MSK-001 | Model Dropdown Component | Frontend | High | S | Backlog |
| MSK-002 | Kanban Markdown Model Column | Backend | High | S | Backlog |
| MSK-003 | Workflow Executor Model Integration | Backend | High | S | Backlog |
| MSK-004 | Integration Testing | Full-stack | Medium | XS | Backlog |

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                    Frontend (Lit)                           │
│  ┌─────────────────┐    ┌─────────────────┐                │
│  │  story-card.ts  │───▶│ kanban-board.ts │                │
│  │  + Dropdown     │    │ + model events  │                │
│  └─────────────────┘    └────────┬────────┘                │
└──────────────────────────────────┼──────────────────────────┘
                                   │ WebSocket
                                   ▼
┌─────────────────────────────────────────────────────────────┐
│                    Backend (Express)                        │
│  ┌─────────────────┐    ┌─────────────────────────────┐    │
│  │  websocket.ts   │───▶│ specs-reader.ts             │    │
│  │  + model.update │    │ backlog-reader.ts           │    │
│  └────────┬────────┘    │ + model column parsing      │    │
│           │             └─────────────────────────────┘    │
│           ▼                                                 │
│  ┌─────────────────────────────────────────────────────┐   │
│  │           workflow-executor.ts                       │   │
│  │           + --model flag für Claude Code             │   │
│  └─────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

## Success Metrics

- User kann Modell pro Story auswählen
- Auswahl wird persistent gespeichert
- Workflow verwendet das gewählte Modell

---

## Integration Requirements

### Integration Type

**Full-stack** - Frontend UI + Backend Persistence + Workflow Execution

### Integration Test Commands

```bash
# Build & Lint Check
npm run lint && npm run build

# Component Existence
grep -q "story-model-change" ui/src/components/story-card.ts

# Backend Handler
grep -q "specs.story.updateModel" src/server/websocket.ts

# Workflow Integration
grep -q "\-\-model" src/server/workflow-executor.ts
```

### End-to-End Scenarios

1. **Model Selection & Persistence:**
   - User wählt Model auf Story-Card → Seite neu laden → Model noch ausgewählt

2. **Workflow Execution:**
   - Story mit model="haiku" → Start Workflow → `--model haiku` im CLI-Aufruf

3. **Disabled State:**
   - Story in "in_progress" → Dropdown ist deaktiviert

---

## Related Documents

- [Requirements Clarification](./requirements-clarification.md)
- [Implementation Plan](./implementation-plan.md) *(NEU)*
- [Story Index](./story-index.md)
- [Effort Estimation](./effort-estimation.md) *(NEU)*
