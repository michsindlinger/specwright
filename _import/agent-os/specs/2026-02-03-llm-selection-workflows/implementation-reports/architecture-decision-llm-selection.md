# Architecture Decision Record: LLM Model Selection for Workflows

**Status:** Accepted
**Date:** 2026-02-04
**Decision ID:** LLM-ADR-001
**Related Stories:** LLM-001, LLM-002, LLM-003, LLM-004

---

## Context

Agent OS Web UI workflows (e.g., `/create-spec`, `/execute-tasks`) were hardcoded to use the default Claude model (originally `opus`). This limitation prevented users from:

1. **Choosing different models** based on task complexity (e.g., using `haiku` for simple tasks, `opus` for complex ones)
2. **Leveraging cost-effective alternatives** like GLM models
3. **Optimizing for latency** when faster models would suffice

The UI already had model selection in the **Chat** view, but workflows lacked this capability.

---

## Decision

### Hybrid Pattern: Native `<select>` with Provider Grouping

We chose to use **native HTML `<select>` elements with `<optgroup>`** for model selection in workflows, rather than creating a fully custom component.

**Key Reasons:**

| Factor | Native `<select>` | Custom Component |
|--------|-------------------|------------------|
| **Development Time** | ✅ Minimal (2-3 hours) | ❌ High (8-12 hours) |
| **Accessibility** | ✅ Built-in screen reader support | ❌ Must implement manually |
| **Mobile Support** | ✅ Native OS pickers | ❌ Custom touch handling required |
| **Performance** | ✅ No JavaScript overhead | ❌ Additional rendering cost |
| **Styling Control** | ⚠️ Limited via CSS | ✅ Full control |
| **User Expectation** | ✅ Familiar dropdown pattern | ❌ May feel unfamiliar |

### Data Flow Architecture

```
┌─────────────────────────────────────────────────────────────────────────┐
│                           Frontend (Browser)                            │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐             │
│  │ Workflow     │    │ Create Spec  │    │ Context      │             │
│  │ Card         │    │ Modal        │    │ Menu         │             │
│  │              │    │              │    │              │             │
│  │ <select>     │    │ <select>     │    │ <select>     │             │
│  │ <optgroup>   │    │ <optgroup>   │    │ <optgroup>   │             │
│  └──────┬───────┘    └──────┬───────┘    └──────┬───────┘             │
│         │                   │                   │                      │
│         └───────────────────┴───────────────────┘                      │
│                             │                                          │
│                             ▼                                          │
│              workflow-start-interactive event                          │
│              { commandId, argument?, model }                          │
└─────────────────────────────┬───────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                        WebSocket Gateway                                 │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  ws.send({                                                              │
│    type: 'workflow.interactive.start',                                  │
│    commandId: '...',                                                   │
│    argument: '...',      // optional                                     │
│    model: 'opus'        // ← NEW: Model selection                       │
│  })                                                                     │
│                                                                         │
└─────────────────────────────┬───────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                         Backend (Node.js)                               │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  WebSocketHandler.handleWorkflowInteractiveStart()                     │
│    │                                                                   │
│    ├─ Extract model from message params                                │
│    │                                                                   │
│    ▼                                                                   │
│  WorkflowExecutor.startExecution()                                     │
│    │                                                                   │
│    ├─ Store model in WorkflowExecution.model                           │
│    │                                                                   │
│    ▼                                                                   │
│  runClaudeCommand()                                                    │
│    │                                                                   │
│    ├─ Get CLI config: getCliCommandForModel(execution.model)           │
│    │   │                                                               │
│    │   └─ Returns: { command: 'claude', args: ['--model', 'opus'] }   │
│    │       or: { command: 'claude-anthropic-simple', ... }            │
│    │                                                                   │
│    ▼                                                                   │
│  spawn(claudeCommand, [ '--model', modelId, ... ])                     │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## Technical Implementation

### 1. Model Configuration (`model-config.ts`)

**New Module:** `agent-os-ui/src/server/model-config.ts`

```typescript
export interface ModelProvider {
  id: string;
  name: string;
  cliCommand: string;       // e.g., 'claude-anthropic-simple', 'claude'
  cliFlags: string[];       // e.g., ['--model', '{modelId}']
  models: Model[];
}

export function getCliCommandForModel(modelId: string): {
  command: string;
  args: string[];
} {
  // Searches all providers to find which one contains the model
  // Returns the appropriate CLI command based on the provider
}
```

**Default Configuration:**
- **Anthropic:** opus, sonnet, haiku → `claude-anthropic-simple`
- **GLM:** glm-5, glm-4.5-air → `claude`

### 2. WebSocket Protocol Changes

**New Message Field:**

```typescript
// workflow.interactive.start
{
  type: 'workflow.interactive.start',
  commandId: string,
  argument?: string,
  model?: string        // NEW: Model ID (e.g., 'opus', 'glm-5')
}
```

### 3. Frontend Components

**Added Model Dropdown to:**
1. `aos-workflow-card.ts` - Workflow cards on dashboard
2. `aos-create-spec-modal.ts` - Create Spec modal
3. `aos-app.ts` - Context menu for spec actions

**Pattern Used:**
```html
<select class="model-dropdown" @change=${handleModelChange}>
  ${providers.map(provider => html`
    <optgroup label="${provider.name}">
      ${provider.models.map(model => html`
        <option value="${model.id}">${model.name}</option>
      `)}
    </optgroup>
  `)}
</select>
```

---

## Backward Compatibility

**Default Behavior:** If no model is specified, the system defaults to `opus`.

```typescript
const model = (params?.model as ModelSelection) || 'opus';
```

This ensures:
- Existing workflows continue to work
- No breaking changes to the WebSocket API
- Graceful fallback for missing model data

---

## CSS Styling (Dark Theme)

Model dropdowns use the existing Moltbot-style dark theme:

```css
.model-dropdown {
  background: #1a1a1a;
  color: #e0e0e0;
  border: 1px solid #333;
  border-radius: 4px;
  padding: 6px 10px;
  font-size: 13px;
}

.model-dropdown optgroup {
  font-weight: 600;
  color: #888;
}

.model-dropdown option {
  padding: 4px 8px;
}
```

---

## Trade-offs and Alternatives Considered

### Alternative 1: Custom `aos-model-selector` Component

**Rejected Because:**
- Would require 8-12 hours of development
- Native `<select>` provides sufficient functionality
- Accessibility would need custom implementation
- Mobile experience would need extensive testing

### Alternative 2: Global Model Setting

**Rejected Because:**
- Different tasks require different models (cost vs. quality trade-off)
- Users want per-workflow control, not app-wide setting
- Less flexible for ad-hoc model selection

### Alternative 3: AI-Powered Model Selection

**Rejected Because:**
- Adds complexity without clear benefit
- Users know their requirements better than heuristics
- Would require additional metadata on tasks

---

## Future Enhancements

1. **Model Descriptions:** Add tooltips explaining when to use each model
2. **Cost Estimation:** Show token cost estimates before running workflows
3. **Model Performance Metrics:** Display average completion time per model
4. **Custom Models:** Allow users to add their own model configurations
5. **Model Fallback:** Auto-retry with different model on failure

---

## References

- **Related Specs:** `2026-02-03-llm-selection-workflows`
- **Implementation Stories:** LLM-001 through LLM-004
- **Configuration Schema:** `agent-os-ui/config/model-config.json`
