# Spec Lite: Workflow-Specific Documents (WSD)

> Quick Reference for Implementation

## Problem
- Dokument-Container ist global statt workflow-spezifisch
- Bei parallelen Workflows werden Dokumente gemischt
- Container zu schmal, nicht resizable

## Solution
- Dokumente pro Execution im ExecutionStore
- Tab-Wechsel = Dokument-Container-Wechsel
- Resizable Container (200px - 60%)
- Größe persistent pro Workflow

## Stories (4)

| ID | Name | Size | Deps |
|----|------|------|------|
| WSD-001 | Document State per Execution | S | - |
| WSD-002 | Tab-Wechsel Sync | XS | 001 |
| WSD-003 | Resizable Container | S | - |
| WSD-004 | Persistent Width | S | 001, 003 |

## Key Changes

**execution.ts:**
```typescript
interface GeneratedDoc { path, content, timestamp }
interface ExecutionState { + generatedDocs, selectedDocIndex, docsContainerWidth }
```

**execution-store.ts:**
```typescript
+ addDocument(), updateDocument()
+ setSelectedDocIndex(), setDocsContainerWidth()
+ getPersistedWidth() // LocalStorage
```

**workflow-view.ts:**
```typescript
- this.generatedDocs (local)
+ executionStore.getActiveExecution().generatedDocs
+ Resize handlers (mousedown/move/up)
```

**theme.css:**
```css
+ --docs-panel-min-width: 200px
+ --docs-panel-max-width: 60%
+ .docs-resize-handle
```

## Execution Order
1. WSD-001 → 2. WSD-003 → 3. WSD-002 → 4. WSD-004

## Estimated Effort
- Human: 12-20h
- AI-Assisted: 4-7h
