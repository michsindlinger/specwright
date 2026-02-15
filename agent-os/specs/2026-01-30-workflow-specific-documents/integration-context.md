# Integration Context

> **Purpose:** Cross-story context preservation for multi-session execution.
> **Auto-updated** after each story completion.
> **READ THIS** before implementing the next story.

---

## Completed Stories

| Story | Summary | Key Changes |
|-------|---------|-------------|
| WSD-001 | Document State per Execution | GeneratedDoc interface, ExecutionState extended, ExecutionStore document methods |
| WSD-002 | Tab-Wechsel synchronisiert Dokumente | Verified existing store-based sync, no additional code changes needed |
| WSD-003 | Resizable Dokument-Container | Resize handle, docsPanelWidth state, CSS variables for min/max width |
| WSD-004 | Persistente Container-Größe pro Workflow | localStorage persistence, width loaded on execution start, synced on tab switch |

---

## New Exports & APIs

### Components
<!-- New UI components created -->
_None yet_

### Services
<!-- New service classes/modules -->

**ExecutionStore** (`agent-os-ui/ui/src/stores/execution-store.ts`):
- `addDocument(executionId: string, doc: GeneratedDoc): void` - Add/update document in execution
- `updateDocument(executionId: string, path: string, content: string): void` - Update document content
- `setSelectedDocIndex(executionId: string, index: number): void` - Select document by index
- `getDocuments(executionId: string): GeneratedDoc[]` - Get all documents for execution
- `setDocsContainerWidth(executionId: string, width: number): void` - Set container width and persist to localStorage
- `getPersistedWidth(commandId: string): number | null` - Get persisted width from localStorage (WSD-004)

### Hooks / Utilities
<!-- New hooks, helpers, utilities -->
_None yet_

### Types / Interfaces
<!-- New type definitions -->

**GeneratedDoc** (`agent-os-ui/ui/src/types/execution.ts`):
```typescript
export interface GeneratedDoc {
  path: string;      // File path of the generated document
  content: string;   // Content of the document
  timestamp: string; // Timestamp when generated/updated
}
```

**ExecutionState** extended fields (`agent-os-ui/ui/src/types/execution.ts`):
```typescript
export interface ExecutionState {
  // ... existing fields
  generatedDocs: GeneratedDoc[];    // Documents generated during execution
  selectedDocIndex: number;         // Index of currently selected document
  docsContainerWidth?: number;      // Width of docs container (for persistence)
}
```

### CSS Variables
<!-- CSS custom properties added -->

**Docs Panel Resize** (`agent-os-ui/ui/src/styles/theme.css`):
- `--docs-panel-min-width: 200px` - Minimum width constraint
- `--docs-panel-max-width: 60%` - Maximum width constraint
- `--docs-panel-default-width: 350px` - Default starting width
- `--docs-resize-handle-width: 6px` - Width of the drag handle

---

## Integration Notes

<!-- Important integration information for subsequent stories -->

1. **Document state is now execution-specific**: Each execution in the ExecutionStore has its own `generatedDocs` array and `selectedDocIndex`. This ensures documents don't mix between workflows.

2. **workflow-view.ts reads from store**: The component now reads `generatedDocs` from `executionStore.getActiveExecution()` instead of local component state.

3. **handleWorkflowTool uses executionStore.addDocument()**: When Write tool calls generate markdown files, they're added to the active execution's document list via the store.

4. **Document selection via handleDocSelect**: Uses `executionStore.setSelectedDocIndex()` to track which document is selected per execution.

5. **docsContainerWidth ready for WSD-004**: The field exists in ExecutionState and ExecutionStore has `setDocsContainerWidth()` method ready for persistence implementation.

6. **Resize handle added to docs panel**: WSD-003 added a resizable container with `docsPanelWidth` state. The resize handle is positioned at the left edge of the panel and uses mouse drag events to adjust width between 200px and 60% of viewport.

7. **Tab-Wechsel synchronisiert automatisch**: WSD-002 bestätigt, dass der bestehende Store-basierte Ansatz für die Dokumenten-Synchronisation korrekt funktioniert:
   - `handleTabSelect()` → `executionStore.setActiveExecution()` → Re-render
   - `render()` liest `generatedDocs` direkt aus dem Store (Zeile 647)
   - Keine zusätzliche Component-State-Duplikation notwendig

8. **Persistente Container-Größe pro Workflow (WSD-004)**:
   - Container-Breite wird in localStorage gespeichert mit Key `aos-docs-width-{commandId}`
   - Beim Start einer Execution wird die gespeicherte Breite geladen (falls vorhanden)
   - `syncStoreState()` synchronisiert die Breite bei Tab-Wechsel
   - `handleResizeStart()` speichert die finale Breite beim Resize-End

---

## File Change Summary

| File | Action | Story |
|------|--------|-------|
| `agent-os-ui/ui/src/types/execution.ts` | Modified | WSD-001 |
| `agent-os-ui/ui/src/stores/execution-store.ts` | Modified | WSD-001, WSD-004 |
| `agent-os-ui/ui/src/views/workflow-view.ts` | Modified | WSD-001, WSD-003, WSD-004 |
| `agent-os-ui/ui/src/styles/theme.css` | Modified | WSD-003 |
