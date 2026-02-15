# Implementation Plan - LLM Model Selection for Workflows

**Status:** PENDING_USER_REVIEW
**Created:** 2026-02-03
**Feature:** LLM-Selection for Workflows

---

## Executive Summary

Add LLM model selection capability to workflow execution across three trigger points (Workflows Dashboard, Context Menu Actions, Specs Dashboard). Replace hardcoded Opus model with dynamic model parameter passed from frontend through backend to CLI execution.

**Key Goals:**
- Enable cost-efficient workflow execution with cheaper models (Haiku, Sonnet)
- Provide consistent UX pattern matching existing Story card model selection
- Maintain backward compatibility (default to Opus if no model selected)

---

## Architecture Decisions

### 1. Component Reuse Strategy

**Decision:** Reuse existing \`aos-model-selector\` component where appropriate, but follow the native \`<select>\` pattern from \`aos-story-card\` for workflow cards.

**Rationale:**
- \`aos-story-card\` already has a working model dropdown implementation (lines 201-219)
- Native select elements are simpler and more accessible for this use case
- \`aos-model-selector\` is heavier (custom dropdown, gateway integration) but needed for modals

### 2. Model Data Flow

**Decision:** Model selection flows from UI → Event → Gateway → Backend → CLI

**Flow:**
1. User selects model in UI component
2. Component fires event with model parameter
3. Gateway sends \`workflow.interactive.start\` message with \`model\` field
4. Backend extracts \`model\` from message and stores in execution
5. Backend uses \`getCliCommandForModel()\` to get correct CLI command
6. CLI executes with selected model

---

## Component Overview

### Frontend Components

| Component | Change Type | Description |
|-----------|-------------|-------------|
| \`aos-workflow-card\` | Modify | Add model dropdown (native select) |
| \`aos-create-spec-modal\` | Modify | Add model selector section |
| \`aos-workflow-modal\` | Modify | Add model selector section |
| \`workflow-card.ts\` | Modify | Extend event to include model parameter |
| \`app.ts\` | Modify | Forward model parameter in workflow start handler |
| \`workflow-view.ts\` | Modify | Include model in gateway message |

### Backend Components

| Component | Change Type | Description |
|-----------|-------------|-------------|
| \`workflow-executor.ts\` | Modify | Accept model parameter, use dynamic CLI command |
| \`WebSocketMessage\` interface | Modify | Add optional \`model?: string\` field |

---

## Component Connections

### Connection 1: Workflow Card → Event System
**Story:** Workflow Dashboard Model Selection
**Source:** \`aos-workflow-card\` → Target: Event system → Backend

### Connection 2: Create Spec Modal → App Router
**Story:** Create Spec Modal Model Selection
**Source:** \`aos-create-spec-modal\` → Target: \`app.ts\` → Backend

### Connection 3: Context Menu → Workflow Modal
**Story:** Context Menu Model Selection
**Source:** \`aos-context-menu\` → \`aos-workflow-modal\` → Backend

### Connection 4: Backend → CLI Execution
**Story:** Backend Integration
**Source:** \`workflow-executor.ts\` → Target: CLI

---

## Implementation Phases

### Phase 1: Backend Foundation (Story: Backend Integration)
- Extend \`WebSocketMessage\` interface with optional \`model?: string\` field
- Modify \`startInteractiveWorkflow()\` to extract \`model\` from message
- Add \`model\` field to \`WorkflowExecution\` interface
- Modify \`runExecution()\` to use \`getCliCommandForModel()\` instead of hardcoded opus (line 492)

### Phase 2: Workflow Dashboard Integration (Story: Workflow Card Model Selection)
- Add \`providers\` property to \`aos-workflow-card\` component
- Add \`selectedModel\` state
- Render native \`<select>\` element (similar to aos-story-card lines 201-219)
- Wire model selection into event

### Phase 3: Create Spec Modal Integration (Story: Create Spec Modal Model Selection)
- Add \`selectedModel\` state to \`aos-create-spec-modal\`
- Add \`aos-model-selector\` component to modal

### Phase 4: Context Menu Integration (Story: Context Menu Model Selection)
- Add \`selectedModel\` state to \`aos-workflow-modal\`
- Add \`aos-model-selector\` component to modal

---

## Dependencies

\`\`\`
Phase 1 (Backend)
  ↓
Phase 2 (Workflow Dashboard) ──┐
  ↓                           │
Phase 3 (Create Spec Modal)   ├─→ Parallel after Phase 1
  ↓                           │
Phase 4 (Context Menu) ────────┘
\`\`\`

---

## Self-Review Results

✅ All Requirements Covered
✅ No Contradictions Found
✅ Component Connections Validated
✅ Minimal-Invasive Optimizations Applied

---

## Testing Strategy

**End-to-End Flows:**
1. Workflow Dashboard: Select model → Start → Verify CLI command
2. Context Menu: Right-click → Select action → Select model → Start → Verify
3. Specs Dashboard: Create Spec → Select model → Start → Verify

---

## Success Criteria

- [ ] Users can select model from workflow card in Workflows Dashboard
- [ ] Users can select model in create-spec modal (from Specs Dashboard)
- [ ] Users can select model in all context menu workflow modals
- [ ] Backend uses selected model for CLI execution
- [ ] Default model (opus) is used when no selection made
- [ ] Existing workflows continue to work (backward compatibility)

---

**Status:** PENDING_USER_REVIEW
