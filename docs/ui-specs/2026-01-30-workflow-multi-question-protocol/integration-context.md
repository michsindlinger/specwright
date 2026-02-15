# Integration Context

> **Purpose:** Cross-story context preservation for multi-session execution.
> **Auto-updated** after each story completion.
> **READ THIS** before implementing the next story.

---

## Completed Stories

| Story | Summary | Key Changes |
|-------|---------|-------------|
| MQP-001 | Backend Question Collection - pendingQuestions array | WorkflowExecution interface extended |
| MQP-002 | Backend Batch Detection & Sending | sendQuestionBatch, submitAnswerBatch methods, questionBatchId field |
| MQP-003 | Backend Text Suppression | looksLikeQuestionText() helper, text suppression in handleClaudeEvent |
| MQP-004 | Frontend Multi-Tab Question Batch Component | AosWorkflowQuestionBatch Lit component with tabs, navigation, ARIA |
| MQP-005 | Frontend Integration - workflow-chat integration | questionBatch event handler, answerBatch WebSocket sending |
| MQP-999 | Integration & End-to-End Validation | All builds pass, 15/15 tests pass, lint clean |

---

## New Exports & APIs

### Components
<!-- New UI components created -->
- `agent-os-ui/ui/src/components/workflow-question-batch.ts` → `<aos-workflow-question-batch batch={QuestionBatch} />` - Multi-tab question batch UI component

### Services
<!-- New service classes/modules -->
- `agent-os-ui/src/server/workflow-executor.ts` → `sendQuestionBatch(execution)` - private method, sends all pending questions as batch when process closes
- `agent-os-ui/src/server/workflow-executor.ts` → `submitAnswerBatch(executionId, batchId, answers)` - public method, receives batch answers from frontend

### Hooks / Utilities
<!-- New hooks, helpers, utilities -->
- `agent-os-ui/src/server/workflow-executor.ts` → `looksLikeQuestionText(text: string)` - Helper to detect question-like text for suppression

### Types / Interfaces
<!-- New type definitions -->
- `agent-os-ui/src/server/workflow-executor.ts` → `WorkflowExecution.pendingQuestions: WorkflowQuestion[]` - Array to collect multiple questions
- `agent-os-ui/src/server/workflow-executor.ts` → `WorkflowExecution.questionBatchId?: string` - ID for current question batch
- `agent-os-ui/ui/src/components/workflow-question-batch.ts` → `QuestionBatch { batchId: string, questions: WorkflowQuestion[] }` - Batch structure
- `agent-os-ui/ui/src/components/workflow-question-batch.ts` → `BatchAnswer { questionId, answer, isOther }` - Single answer
- `agent-os-ui/ui/src/components/workflow-question-batch.ts` → `BatchAnswerDetail { batchId, answers: BatchAnswer[] }` - Event detail type

---

## Integration Notes

<!-- Important integration information for subsequent stories -->
- `pendingQuestions` array is initialized empty in `startExecution()`
- `handleAskUserQuestion()` now pushes to `pendingQuestions` array instead of overwriting
- `pendingQuestion` (singular) is still maintained for backwards compatibility
- **MQP-002 COMPLETE**: Batch detection logic added in process 'close' handler
- **MQP-002 COMPLETE**: Questions are NOT sent immediately - collected and sent as batch when process exits (code 0)
- Frontend event type changed: `workflow.interactive.questionBatch` (not `workflow.interactive.question`)
- Frontend must call `submitAnswerBatch(executionId, batchId, answers)` to send batch responses
- **MQP-003 COMPLETE**: Text suppression logic added - question-like text is suppressed when pendingQuestions.length > 0
- **MQP-003 COMPLETE**: `looksLikeQuestionText()` helper detects numbered lists, bulleted questions, German/English question patterns
- **MQP-004 COMPLETE**: `aos-workflow-question-batch` component handles multi-question display with tabs
- **MQP-004 COMPLETE**: Component emits `workflow-answer-batch` CustomEvent with `BatchAnswerDetail` payload
- **MQP-005 COMPLETE**: workflow-chat.ts now:
  - Imports and registers `aos-workflow-question-batch` component
  - Handles `workflow.interactive.questionBatch` WebSocket event via `handleWorkflowQuestionBatch()`
  - Creates QuestionBatch from backend data and stores in `pendingQuestionBatch` state
  - Listens for `workflow-answer-batch` event via `handleBatchAnswer()` and sends `workflow.interactive.answerBatch`
  - Batch takes precedence over single question (clears `pendingQuestion` when batch arrives)
  - Input area hidden when batch is displayed
- **MQP-999 COMPLETE**: Full integration validation:
  - Backend TypeScript build: Success
  - Backend Vitest tests: 15/15 pass (including MQP-002 batch tests)
  - Frontend Vite build: Success
  - Frontend ESLint: Clean (no errors)

---

## File Change Summary

| File | Action | Story |
|------|--------|-------|
| agent-os-ui/src/server/workflow-executor.ts | Modified | MQP-001 |
| agent-os-ui/src/server/workflow-executor.ts | Modified | MQP-002 |
| agent-os-ui/tests/integration/workflow.test.ts | Modified | MQP-002 |
| agent-os-ui/src/server/workflow-executor.ts | Modified | MQP-003 |
| agent-os-ui/ui/src/components/workflow-question-batch.ts | Created | MQP-004 |
| agent-os-ui/ui/src/styles/theme.css | Modified | MQP-004 |
| agent-os-ui/ui/src/components/workflow-chat.ts | Modified | MQP-005 |
