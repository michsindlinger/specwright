# Handover Document: LLM Model Selection for Workflows

**Feature:** LLM Model Selection for Workflows
**Spec ID:** 2026-02-03-llm-selection-workflows
**Completion Date:** 2026-02-04
**Version:** 1.0

---

## Overview

This feature enables users to select different LLM models (Anthropic Opus/Sonnet/Haiku, GLM) when executing workflows in Agent OS Web UI. Users can now choose the appropriate model based on task complexity, cost considerations, or latency requirements.

## Changed Files

### Backend Files

| File | Lines Changed | Description |
|------|---------------|-------------|
| `agent-os-ui/src/server/model-config.ts` | +294 (NEW) | Model configuration module with provider abstraction |
| `agent-os-ui/src/server/websocket.ts` | +34 | Added model parameter handling in workflow start messages |
| `agent-os-ui/src/server/workflow-executor.ts` | +48 | Model propagation through workflow execution |

### Frontend Files

| File | Lines Changed | Description |
|------|---------------|-------------|
| `agent-os-ui/ui/src/components/workflow-card.ts` | +45 | Added model dropdown with provider grouping |
| `agent-os-ui/ui/src/components/aos-create-spec-modal.ts` | +28 | Added model dropdown to create spec modal |
| `agent-os-ui/ui/src/app.ts` | +12 | Added model support to context menu actions |
| `agent-os-ui/ui/src/styles/theme.css` | +25 | Dark theme styling for model dropdowns |

### Configuration Files

| File | Lines Changed | Description |
|------|---------------|-------------|
| `agent-os-ui/config/model-config.json` | +56 (NEW) | Default model configuration (can be customized per project) |

---

## Key Code Snippets

### 1. Model Configuration API

**Location:** `agent-os-ui/src/server/model-config.ts`

```typescript
// Get CLI command for a specific model ID
export function getCliCommandForModel(modelId: string): { command: string; args: string[] } {
  const config = loadModelConfig();

  for (const provider of config.providers) {
    const model = provider.models.find(m => m.id === modelId);
    if (model) {
      const args = provider.cliFlags.map(flag =>
        flag === '{modelId}' ? modelId : flag
      );
      return {
        command: provider.cliCommand,
        args
      };
    }
  }

  // Fallback to anthropic defaults
  return {
    command: 'claude-anthropic-simple',
    args: ['--model', modelId]
  };
}
```

### 2. Workflow Execution with Model

**Location:** `agent-os-ui/src/server/workflow-executor.ts:216-256`

```typescript
public async startExecution(
  client: WebSocketClient,
  commandId: string,
  projectPath: string,
  params?: Record<string, unknown>
): Promise<string> {
  // ...
  const model = (params?.model as ModelSelection) || 'opus';  // Extract with default

  const execution: WorkflowExecution = {
    id: executionId,
    commandId,
    commandName: command.name,
    projectPath,
    argument,
    status: 'running',
    startTime: new Date().toISOString(),
    output: [],
    abortController,
    pendingQuestions: [],
    model  // Store model for this execution
  };
  // ...
}
```

### 3. Frontend Model Dropdown Pattern

**Location:** `agent-os-ui/ui/src/components/workflow-card.ts:149-166`

```typescript
<div class="workflow-model-select" @click=${(e: Event) => e.stopPropagation()}>
  <select
    class="model-dropdown"
    .value=${this.selectedModel}
    ?disabled=${this.disabled}
    @change=${this.handleModelChange}
  >
    ${this.providers.map(provider => html`
      <optgroup label="${provider.name}">
        ${provider.models.map(model => html`
          <option value="${model.id}" ?selected=${this.selectedModel === model.id}>
            ${model.name}
          </option>
        `)}
      </optgroup>
    `)}
  </select>
</div>
```

---

## Data Flow Summary

```
User selects model → Frontend stores selectedModel
        ↓
User clicks "Start" → CustomEvent with { commandId, argument?, model }
        ↓
WebSocket sends: { type: 'workflow.interactive.start', model }
        ↓
Backend extracts: const model = params.model || 'opus'
        ↓
WorkflowExecutor stores: execution.model = model
        ↓
runClaudeCommand calls: getCliCommandForModel(execution.model)
        ↓
spawn(): claudeCommand --model <modelId> ...
```

---

## Configuration

### Default Model Configuration

**Location:** `agent-os-ui/config/model-config.json`

```json
{
  "defaultProvider": "anthropic",
  "defaultModel": "opus",
  "providers": [
    {
      "id": "anthropic",
      "name": "Anthropic",
      "cliCommand": "claude-anthropic-simple",
      "cliFlags": ["--model", "{modelId}"],
      "models": [
        { "id": "opus", "name": "Opus 4.5" },
        { "id": "sonnet", "name": "Sonnet 4" },
        { "id": "haiku", "name": "Haiku 3.5" }
      ]
    },
    {
      "id": "glm",
      "name": "GLM",
      "cliCommand": "claude",
      "cliFlags": ["--model", "{modelId}"],
      "models": [
        { "id": "glm-5", "name": "GLM 4.7" },
        { "id": "glm-4.5-air", "name": "GLM 4.5 Air" }
      ]
    }
  ]
}
```

**To customize per project:**
1. Copy `model-config.json` to your project's `config/` directory
2. Modify providers, models, or defaults as needed

---

## Testing Checklist

### Manual Testing Steps

- [ ] **Workflow Card Model Selection**
  - [ ] Select different models on dashboard workflow cards
  - [ ] Verify selected model is used when starting workflow
  - [ ] Check dropdown closes after selection

- [ ] **Create Spec Modal Model Selection**
  - [ ] Open create spec modal
  - [ ] Change model from dropdown
  - [ ] Start workflow and verify model is used

- [ ] **Context Menu Model Selection**
  - [ ] Right-click on spec items
  - [ ] Select action from context menu
  - [ ] Verify model is passed to workflow

- [ ] **Model Persistence**
  - [ ] Change model, reload page
  - [ ] Verify model resets to default (opus)

- [ ] **Provider Grouping**
  - [ ] Verify models are grouped by provider in dropdowns
  - [ ] Check Anthropic and GLM groups are separate

- [ ] **WebSocket Protocol**
  - [ ] Verify `model` field is sent in `workflow.interactive.start`
  - [ ] Check backend receives and processes model correctly

- [ ] **CLI Command Generation**
  - [ ] Test Anthropic models → `claude-anthropic-simple --model <id>`
  - [ ] Test GLM models → `claude --model <id>`
  - [ ] Verify fallback for unknown models

### Regression Testing

- [ ] **Chat Model Selection** (should still work)
- [ ] **Workflow execution without model specified** (should default to opus)
- [ ] **Existing kanban boards** (should work without migration)

---

## Known Limitations

1. **Model Selection Not Persistent:** Selected model resets to `opus` after page reload. This is intentional - users select per-execution.

2. **No Model Validation:** The UI doesn't validate if a model ID exists before sending to backend. Backend has fallback logic.

3. **Static Provider List:** Providers are loaded from `model-config.json` at server start. Changes require server restart.

4. **No Cost Display:** Model selection doesn't show estimated token costs. Future enhancement.

---

## Troubleshooting

### Issue: Workflow starts with wrong model

**Symptoms:** Selected model in dropdown doesn't match actual execution

**Solution:**
1. Check browser console for `workflow-start-interactive` event
2. Verify WebSocket message includes correct `model` field
3. Check backend logs for `Using CLI command: ... with model: ...`

### Issue: Model not available in dropdown

**Symptoms:** Expected model not shown in dropdown

**Solution:**
1. Verify model is in `config/model-config.json`
2. Check if model's provider is included
3. Restart server after config changes

### Issue: Unknown models default to Anthropic

**Symptoms:** Custom model ID uses wrong CLI command

**Solution:**
1. Add model to appropriate provider in `model-config.json`
2. Or implement custom provider configuration

---

## Related Documentation

- **Architecture Decision:** `implementation-reports/architecture-decision-llm-selection.md`
- **Implementation Report:** `implementation-reports/implementation-report-llm-selection.md`
- **Spec:** `spec.md`
- **Stories:** `stories/story-001-backend-integration.md` through `story-004-context-menu-model-selection.md`

---

## Contact

For questions or issues related to this feature:
- Review the ADR for architectural decisions
- Check the implementation report for technical details
- Refer to individual story files for specific component changes
