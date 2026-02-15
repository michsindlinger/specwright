# Spec: LLM Model Selection for Workflows


> Spec ID: 2026-02-03-llm-selection-workflows
> Created: 2026-02-03
> Completed: 2026-02-04
> Status: Completed

---

## Overview

Enable cost-efficient workflow execution by allowing users to select LLM models (Opus, Sonnet, Haiku, GLM) when starting workflows. Replace the hardcoded Opus model with dynamic model selection across three trigger points: Workflows Dashboard, Context Menu Actions, and Specs Dashboard.

**Business Value:**
- **Cost Efficiency:** Use cheaper models (Haiku, Sonnet) for less complex workflows
- **Flexibility:** Choose appropriate model based on task requirements
- **Consistency:** Same UX pattern as existing Story card model selection

---

## User Stories

| Story ID | Title | Type | Status | Complexity |
|----------|-------|------|--------|------------|
| LLM-001 | Backend Integration | Implementation | Done | Low |
| LLM-002 | Workflow Card Model Selection | Implementation | Done | Medium |
| LLM-003 | Create Spec Modal Model Selection | Implementation | Done | Medium |
| LLM-004 | Context Menu Model Selection | Implementation | Done | Medium |
| LLM-997 | Documentation & Handover | System | Done | Low |
| LLM-998 | Testing & Quality Assurance | System | Done | Medium |
| LLM-999 | Spec Completion & Cleanup | System | Done | Low |

---

## Scope

### In Scope
- Model selection dropdown on workflow cards in Workflows Dashboard
- Model selector in create-spec modal (from Specs Dashboard)
- Model selector in all context menu workflow modals (4 actions)
- Backend integration for model parameter in workflow execution
- Reuse of existing `aos-model-selector` component

### Out of Scope
- Chat interface (already has model selection)
- Story execution (already has model selection)
- Model selection persistence/remember last choice
- Model selection in terminal/execution tabs

---

## Integration Requirements

### Backend Changes
| Component | Change |
|-----------|--------|
| `workflow-executor.ts` | Accept optional `model` parameter in `startInteractiveWorkflow()` |
| `WebSocketMessage` | Add `model?: string` field |
| `runExecution()` | Use `getCliCommandForModel()` instead of hardcoded `--model opus` (line 492) |

### Frontend Changes
| Component | Change |
|-----------|--------|
| `aos-workflow-card` | Add model dropdown (native `<select>`) |
| `workflow-card.ts` | Include model in `workflow-start-interactive` event |
| `aos-create-spec-modal` | Add `aos-model-selector` component |
| `aos-workflow-modal` | Add `aos-model-selector` component |
| `app.ts` | Forward model parameter in workflow start handler |
| `workflow-view.ts` | Include model in `workflow.interactive.start` gateway message |

---

## Dependencies

```
Phase 1: Backend Foundation
LLM-001 (Backend) [must be first]
  ↓
Phase 2-4: Frontend Integration (Parallel after LLM-001)
LLM-002 (Workflow Dashboard) ──┐
  ↓                           │
LLM-003 (Create Spec Modal)   ├─→ Can be developed in parallel
  ↓                           │     after LLM-001
LLM-004 (Context Menu) ────────┘
  ↓
Phase 5: Quality & Completion (Parallel)
LLM-997 (Documentation) ──┐
LLM-998 (Testing)        ├─→ After implementation complete
LLM-999 (Completion)    ─┘
```

---

## Success Criteria

- [x] Users can select model from workflow card in Workflows Dashboard
- [x] Users can select model in create-spec modal (from Specs Dashboard)
- [x] Users can select model in all context menu workflow modals
- [x] Backend uses selected model for CLI execution
- [x] Default model (opus) is used when no selection made
- [x] Existing workflows continue to work (backward compatibility)

---

## Architecture Notes

**Component Reuse Strategy:**
- Native `<select>` element for workflow cards (lightweight, accessible)
- `aos-model-selector` component for modals (full-featured, matches chat UX)

**Model Data Flow:**
1. User selects model in UI component
2. Component fires event with `model` parameter
3. Gateway sends `workflow.interactive.start` message with `model` field
4. Backend extracts `model` from message and stores in execution
5. Backend uses `getCliCommandForModel()` to get correct CLI command
6. CLI executes with selected model

**Reference Implementation:**
- `aos-story-card.ts` lines 201-219 (native select pattern)
- `model-selector.ts` (custom component for modals)
- `startStoryExecution()` lines 268-269 in workflow-executor.ts (existing model support)

---

*See stories/ directory for detailed Gherkin scenarios and acceptance criteria.*
