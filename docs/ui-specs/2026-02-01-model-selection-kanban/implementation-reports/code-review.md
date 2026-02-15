# Code Review Report: Model Selection for Kanban Board

> **Feature**: MSK - Model Selection Kanban
> **Review Date**: 2026-02-02
> **Reviewer**: Claude Opus 4.5
> **Branch**: feature/model-selection-kanban
> **Diff**: main...HEAD

---

## Executive Summary

| Category | Status |
|----------|--------|
| **Lint Check** | PASS |
| **Build Check** | PASS |
| **TypeScript Strict** | PASS |
| **Architecture Conformity** | PASS |
| **Security** | PASS |
| **Critical Issues** | 1 (FIXED during review) |
| **Warnings** | 2 |
| **Suggestions** | 3 |

**Verdict**: Code is production-ready with minor suggestions for future improvement.

---

## Files Changed

| File | Lines Changed | Purpose |
|------|---------------|---------|
| `specs-reader.ts` | +149 | Model column parsing and updateStoryModel() |
| `websocket.ts` | +76 | handleSpecsStoryUpdateModel handler |
| `workflow-executor.ts` | +84 | Model reading and --model flag support |
| `story-card.ts` | +34 | Model dropdown UI component |
| `kanban-board.ts` | +13 | Event handler propagation |
| `dashboard-view.ts` | +22 | TypeScript fix + handleStoryModelChange handler (CRITICAL FIX) |
| `theme.css` | +26 | Model dropdown styling |
| `backlog-reader.ts` | +41 | Model support for backlog |

**Total**: +424 lines of implementation code (excludes spec/doc changes)

---

## Code Quality Analysis

### 1. Backend: specs-reader.ts

**Strengths:**
- Type-safe `ModelSelection` type exported and consistently used
- Proper error handling with meaningful error messages
- Backward compatible: defaults to `'opus'` when model column missing
- Clean separation: `updateStoryModel()` and `updateModelInKanban()` follow SRP

**Code Pattern - Status Map Refactoring:**
```typescript
// Changed from: Map<string, status>
// To: Map<string, { status, model }>
```
This is a clean refactoring that maintains backward compatibility.

**Rating**: A

---

### 2. Backend: websocket.ts

**Strengths:**
- Proper validation of model values before processing
- Follows existing WebSocket handler patterns
- Error responses include clear messages
- ACK response includes all relevant fields

**Code Pattern:**
```typescript
private async handleSpecsStoryUpdateModel(client: WebSocketClient, message: WebSocketMessage): Promise<void>
```
Follows the established handler pattern with proper error handling.

**Rating**: A

---

### 3. Backend: workflow-executor.ts

**Strengths:**
- Model read from kanban at execution time (not cached stale)
- Fallback to default `'opus'` when model not found
- Clean logging of model selection
- `--model` flag properly positioned in args array

**Implementation:**
```typescript
// Add model flag if set (MSK-003)
if (execution.model) {
  args.push('--model', execution.model);
  console.log(`[Workflow] Using model: ${execution.model}`);
}
```

**Minor Observation**: Duplicate `parseKanbanStatuses()` method exists in both `specs-reader.ts` and `workflow-executor.ts`. This is acceptable as it avoids coupling between modules, but could be extracted to a shared utility in future refactoring.

**Rating**: A-

---

### 4. Frontend: story-card.ts

**Strengths:**
- Model dropdown disabled during `in_progress` state (prevents mid-execution changes)
- German title for disabled state tooltip
- Proper event stopping to prevent card selection on dropdown click
- Custom event follows Lit best practices (`bubbles: true, composed: true`)

**Code Quality:**
```typescript
private handleModelChange(e: Event): void {
  e.stopPropagation();
  const select = e.target as HTMLSelectElement;
  this.dispatchEvent(
    new CustomEvent('story-model-change', {
      detail: { storyId: this.story.id, model: select.value as ModelSelection },
      bubbles: true,
      composed: true
    })
  );
}
```

**Rating**: A

---

### 5. Frontend: kanban-board.ts

**Strengths:**
- Clean event propagation pattern
- Follows existing `story-select` and `story-drag-*` patterns

**Rating**: A

---

### 5b. Frontend: dashboard-view.ts (CRITICAL FIX APPLIED)

**Issue Found During Review:**
The `@story-model-change` event handler was **missing** from the template and no `handleStoryModelChange` method existed. This meant model selections would work visually but never persist to the kanban file.

**Fix Applied:**
```typescript
// Added event handler method
private handleStoryModelChange(e: CustomEvent<{ storyId: string; model: string }>): void {
  if (!this.selectedSpec || !this.kanban) return;

  const { storyId, model } = e.detail;

  // Update local state immediately for responsive UI
  const updatedStories = this.kanban.stories.map(story =>
    story.id === storyId ? { ...story, model: model as 'opus' | 'sonnet' | 'haiku' } : story
  );
  this.kanban = { ...this.kanban, stories: updatedStories };

  // Send update to backend for persistence
  gateway.send({
    type: 'specs.story.updateModel',
    specId: this.selectedSpec.id,
    storyId,
    model
  });
}

// Added to template
@story-model-change=${this.handleStoryModelChange}
```

**Rating**: A (after fix)

---

### 6. CSS: theme.css

**Strengths:**
- Uses CSS custom properties for consistency
- Proper disabled state styling
- Follows existing design system patterns

**Rating**: A

---

## Warnings

### Warning 1: Duplicate Kanban Parsing Logic

**Location**: `workflow-executor.ts:1488-1528`

**Description**: The `parseKanbanStatuses()` method is duplicated between `specs-reader.ts` and `workflow-executor.ts`. While this works, it creates maintenance overhead.

**Severity**: Low
**Impact**: Future changes to kanban format require updates in two places
**Recommendation**: Consider extracting to shared utility in future refactoring

---

### Warning 2: Model Column Position Assumption

**Location**: `specs-reader.ts:1048-1050`

**Description**: The `updateModelInKanban()` method assumes the model is in the 8th column (index 7) based on pipe count. This works for the current format but could break if column order changes.

```typescript
if (pipes.length >= 9) {
  pipes[8] = ` ${model} `;
  lines[i] = pipes.join('|');
}
```

**Severity**: Low
**Impact**: Column reordering would break model updates
**Recommendation**: Add comment documenting expected column format or use header-based column detection in future

---

## Suggestions

### Suggestion 1: Add Type Guard for ModelSelection

**Benefit**: Safer type narrowing at runtime

```typescript
function isModelSelection(value: string): value is ModelSelection {
  return ['opus', 'sonnet', 'haiku'].includes(value);
}
```

---

### Suggestion 2: Consider Model Persistence in Story Files

**Current State**: Model stored only in kanban-board.md
**Consideration**: Could also persist model preference in individual story files for consistency

**Assessment**: Current approach is correct - model is a runtime preference, not part of story spec

---

### Suggestion 3: Add Integration Test for Model Flow

**Current State**: Manual testing protocol exists (MSK-004)
**Future**: Add automated integration test for model selection → workflow execution flow

---

## Security Analysis

| Check | Status |
|-------|--------|
| Input validation for model values | PASS |
| No SQL injection vectors | PASS (file-based) |
| No XSS vectors | PASS |
| No command injection | PASS (args array, not string interpolation) |
| No path traversal | PASS |

**Security Rating**: PASS

---

## Architecture Conformity

| Pattern | Conformity |
|---------|------------|
| Layered 3-Tier | PASS |
| WebSocket message pattern | PASS |
| Lit component patterns | PASS |
| CSS custom properties | PASS |
| TypeScript strict mode | PASS |
| Error handling patterns | PASS |

**Architecture Rating**: PASS

---

## Test Coverage

| Test Type | Status |
|-----------|--------|
| Manual Integration Tests | PASS (MSK-004 protocol) |
| Lint | PASS |
| TypeScript Build | PASS |
| Automated Unit Tests | Not Added (existing test infrastructure) |

---

## Conclusion

The Model Selection for Kanban Board feature is **well-implemented** and **production-ready**. The code follows established patterns, includes proper error handling, and maintains backward compatibility.

### Key Achievements:
1. Clean type-safe implementation of `ModelSelection` type
2. Proper WebSocket handler following existing patterns
3. UI component with appropriate disabled state handling
4. Workflow executor correctly passes `--model` flag to Claude CLI
5. All quality gates pass

### Recommendations for Future:
1. Extract shared kanban parsing logic to utility module
2. Add automated integration tests for model flow
3. Document expected kanban column format

**Final Verdict**: APPROVED FOR MERGE

---

*Generated by Claude Opus 4.5 on 2026-02-02*
