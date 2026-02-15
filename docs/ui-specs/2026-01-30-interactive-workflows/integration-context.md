# Integration Context

> **Purpose:** Cross-story context preservation for multi-session execution.
> **Auto-updated** after each story completion.
> **READ THIS** before implementing the next story.

---

## Completed Stories

| Story | Summary | Key Changes |
|-------|---------|-------------|
| WKFL-001 | Workflow start via cards with interactive mode | workflow-chat.ts, workflow-card.ts, workflow-view.ts |
| WKFL-002 | AskUserQuestion UI with clickable options | workflow-question.ts, workflow-chat.ts, theme.css |
| WKFL-003 | Workflow step indicator showing progress | workflow-step-indicator.ts, workflow-chat.ts, theme.css |
| WKFL-004 | Embedded docs-viewer with split-view layout | workflow-view.ts, aos-docs-viewer.ts, theme.css |
| WKFL-005 | Collapsible long text for workflow messages | collapsible-text.ts, workflow-chat.ts, theme.css |
| WKFL-006 | Error handling & cancel with confirmation | workflow-chat.ts, workflow-executor.ts, websocket.ts, theme.css |
| WKFL-008 | Backend bidirectional workflow communication | workflow-executor.ts, websocket.ts |
| WKFL-007 | Minimal tool activity spinner during operations | workflow-chat.ts, theme.css |
| WKFL-999 | Integration tests for workflow communication | tests/integration/workflow.test.ts |

---

## New Exports & APIs

### Components

- `agent-os-ui/ui/src/components/workflow-chat.ts` → `<aos-workflow-chat .workflowState=${state}></aos-workflow-chat>` - Interactive workflow chat UI component
- `agent-os-ui/ui/src/components/workflow-question.ts` → `<aos-workflow-question .question=${question} @workflow-answer=${handler}></aos-workflow-question>` - Question with clickable options
- `agent-os-ui/ui/src/components/workflow-step-indicator.ts` → `<aos-workflow-step-indicator .currentStep=${n} .totalSteps=${total} .stepName=${name} .status=${status}></aos-workflow-step-indicator>` - Step progress indicator
- `agent-os-ui/ui/src/components/docs/aos-docs-viewer.ts` → `<aos-docs-viewer .content=${content} .filename=${name} .embedded=${true}></aos-docs-viewer>` - Markdown docs viewer (embedded mode for panels)
- `agent-os-ui/ui/src/components/collapsible-text.ts` → `<aos-collapsible-text .content=${text} .threshold=${500} .visibleLines=${3}></aos-collapsible-text>` - Collapsible long text with expand/collapse toggle

### Services

- `agent-os-ui/src/server/workflow-executor.ts` → `WorkflowExecutor.submitAnswer(executionId, questionId, answers)` - Submit user answer to Claude CLI
- `agent-os-ui/src/server/workflow-executor.ts` → `WorkflowQuestion` - Interface for pending questions with timeout

### Hooks / Utilities
_None yet_

### Types / Interfaces

- `agent-os-ui/ui/src/components/workflow-chat.ts` → `WorkflowMessage` - Interface for workflow chat messages
- `agent-os-ui/ui/src/components/workflow-chat.ts` → `InteractiveWorkflowState` - Interface for interactive workflow state
- `agent-os-ui/ui/src/components/workflow-question.ts` → `WorkflowQuestion` - Interface for question with options
- `agent-os-ui/ui/src/components/workflow-question.ts` → `QuestionOption` - Interface for question option (label, description)
- `agent-os-ui/ui/src/components/workflow-question.ts` → `WorkflowAnswerDetail` - Interface for answer event detail
- `agent-os-ui/ui/src/components/workflow-step-indicator.ts` → `StepIndicatorStatus` - Type for step status ('running' | 'completed' | 'error' | 'processing')
- `agent-os-ui/ui/src/views/workflow-view.ts` → `GeneratedDoc` - Interface for generated document (path, content, timestamp)

---

## Integration Notes

**Interactive Workflow Flow:**
1. User clicks on workflow card → dispatches `workflow-start-interactive` event
2. workflow-view.ts handles event → sends `workflow.interactive.start` via WebSocket
3. Backend responds with `workflow.interactive.start.ack` → interactiveMode activates
4. Messages stream via `workflow.interactive.message` → added to interactiveWorkflow.messages
5. Questions arrive via `workflow.interactive.question` → rendered as clickable options
6. Workflow completion via `workflow.interactive.complete` → status updates

**Key State Variables in workflow-view.ts:**
- `interactiveMode: boolean` - Whether interactive chat is shown
- `interactiveWorkflow: InteractiveWorkflowState | null` - Current interactive session

**Key State Variables in workflow-chat.ts:**
- `pendingQuestion: WorkflowQuestion | null` - Current question awaiting answer
- `currentStep: number` - Current step number (0 if no step info)
- `totalSteps: number` - Total number of steps (0 if no step info)
- `stepName: string` - Name of the current step (empty if no step info)
- `pendingToolCalls: number` - Counter for active tool operations (WKFL-007)

**Event Flow:**
- `workflow-start-interactive` - Emitted by workflow-card, handled by workflow-view
- `workflow-user-input` - Emitted by workflow-chat when user submits input
- `workflow-answer` - Emitted by workflow-question when user selects option(s)
- `workflow-question-received` - Emitted by workflow-chat when question arrives
- `workflow-close` - Emitted by workflow-chat when user closes completed workflow
- `workflow-cancel` - Emitted when user cancels running workflow
- `workflow-retry` - Emitted when user clicks retry after error (WKFL-006)
- `workflow-step-change` - Emitted by workflow-chat when step progress updates (WKFL-003)

**Backend WebSocket Message Types (WKFL-008, WKFL-006, WKFL-007):**
- `workflow.question` - Sent from backend when AskUserQuestion tool is invoked
- `workflow.answer` - Sent from frontend with user's answer
- `workflow.answer.ack` - Acknowledgement from backend that answer was received
- `workflow.timeout` - Sent when question times out (5 minutes)
- `workflow.retry` - Sent from frontend to retry after error (WKFL-006)
- `workflow.retry.ack` - Acknowledgement from backend that retry was initiated
- `workflow.cancel.ack` - Acknowledgement that cancel was processed
- `workflow.tool` - Sent from backend when tool execution starts (WKFL-007)
- `workflow.tool.complete` - Sent from backend when tool execution completes (WKFL-007)

**Question Message Format (from backend):**
```typescript
{
  type: 'workflow.interactive.question',
  executionId: string,
  question: {
    id: string,
    question: string,
    header?: string,
    options: Array<{ label: string, description?: string }>,
    multiSelect: boolean
  }
}
```

**Step Progress Message Format (from backend):**
```typescript
{
  type: 'workflow.interactive.step',
  executionId: string,
  currentStep: number,
  totalSteps: number,
  stepName: string
}
```

**Tool Event Message Format (from backend) - WKFL-004:**
```typescript
{
  type: 'workflow.tool',
  executionId: string,
  toolName: string,  // e.g., 'Write' for doc generation
  toolInput: {
    file_path: string,  // e.g., 'agent-os/specs/.../spec.md'
    content: string     // markdown content
  },
  timestamp: string
}
```

**Docs Panel State Variables in workflow-view.ts (WKFL-004):**
- `docsViewerOpen: boolean` - Whether the docs panel is visible
- `generatedDocs: GeneratedDoc[]` - Array of generated documents with path, content, timestamp
- `selectedDocIndex: number` - Index of currently displayed document

**Docs Panel Behavior (WKFL-004):**
- Auto-opens on first markdown file written via `workflow.tool` event
- Updates document content if same path is written again
- Toggle button in running banner allows hiding/showing panel
- Document list appears when multiple docs are generated
- Panel closes and resets when workflow closes

---

## File Change Summary

| File | Action | Story |
|------|--------|-------|
| agent-os-ui/tests/integration/workflow.test.ts | Created | WKFL-999 |
| agent-os-ui/vitest.config.ts | Created | WKFL-999 |
| agent-os-ui/package.json | Modified | WKFL-999 |
| agent-os-ui/ui/src/components/workflow-chat.ts | Created | WKFL-001 |
| agent-os-ui/ui/src/components/workflow-card.ts | Modified | WKFL-001 |
| agent-os-ui/ui/src/views/workflow-view.ts | Modified | WKFL-001 |
| agent-os-ui/ui/src/styles/theme.css | Modified | WKFL-001 |
| agent-os-ui/ui/src/components/workflow-question.ts | Created | WKFL-002 |
| agent-os-ui/ui/src/components/workflow-chat.ts | Modified | WKFL-002 |
| agent-os-ui/ui/src/styles/theme.css | Modified | WKFL-002 |
| agent-os-ui/ui/src/components/workflow-step-indicator.ts | Created | WKFL-003 |
| agent-os-ui/ui/src/components/workflow-chat.ts | Modified | WKFL-003 |
| agent-os-ui/ui/src/styles/theme.css | Modified | WKFL-003 |
| agent-os-ui/ui/src/views/workflow-view.ts | Modified | WKFL-004 |
| agent-os-ui/ui/src/components/docs/aos-docs-viewer.ts | Modified | WKFL-004 |
| agent-os-ui/ui/src/styles/theme.css | Modified | WKFL-004 |
| agent-os-ui/src/server/workflow-executor.ts | Modified | WKFL-008 |
| agent-os-ui/src/server/websocket.ts | Modified | WKFL-008 |
| agent-os-ui/ui/src/components/collapsible-text.ts | Created | WKFL-005 |
| agent-os-ui/ui/src/components/workflow-chat.ts | Modified | WKFL-005 |
| agent-os-ui/ui/src/styles/theme.css | Modified | WKFL-005 |
| agent-os-ui/ui/src/components/workflow-chat.ts | Modified | WKFL-006 |
| agent-os-ui/src/server/workflow-executor.ts | Modified | WKFL-006 |
| agent-os-ui/src/server/websocket.ts | Modified | WKFL-006 |
| agent-os-ui/ui/src/styles/theme.css | Modified | WKFL-006 |
| agent-os-ui/ui/src/components/workflow-chat.ts | Modified | WKFL-007 |
| agent-os-ui/ui/src/styles/theme.css | Modified | WKFL-007 |
