# Specification: Workflow-Specific Documents (WSD)

> Version: 1.0
> Created: 2026-01-30
> Status: Ready for Implementation

## Overview

Dieses Feature macht den Dokument-Container in der Workflow-Ausführungsansicht workflow-spezifisch. Aktuell werden generierte Dokumente global angezeigt, was bei parallelen Workflows zu Vermischung führt. Zusätzlich wird der Container resizable gemacht für bessere Lesbarkeit.

## Problem Statement

### Aktueller Zustand
- Ein globaler `generatedDocs` Array in `workflow-view.ts`
- Bei parallelen Workflows werden Dokumente gemischt
- Container hat feste Breite (~350px), nicht anpassbar
- Inhalte sind bei längeren Dokumenten schlecht lesbar

### Zielzustand
- Dokumente werden pro Execution im `ExecutionStore` gespeichert
- Tab-Wechsel aktualisiert automatisch die Dokument-Ansicht
- Container ist resizable (200px - 60%)
- Größe wird pro Workflow persistent gespeichert

## Architecture

### State Management

```
┌─────────────────────────────────────────────────────┐
│                   ExecutionStore                     │
├─────────────────────────────────────────────────────┤
│  Map<executionId, ExecutionState>                   │
│                                                      │
│  ExecutionState {                                    │
│    executionId: string                              │
│    commandId: string                                │
│    commandName: string                              │
│    status: ExecutionStatus                          │
│    messages: WorkflowMessage[]                      │
│    generatedDocs: GeneratedDoc[]      // NEW        │
│    selectedDocIndex: number           // NEW        │
│    docsContainerWidth: number         // NEW        │
│    ...                                              │
│  }                                                   │
└─────────────────────────────────────────────────────┘
                        │
                        ▼
┌─────────────────────────────────────────────────────┐
│                  workflow-view.ts                    │
├─────────────────────────────────────────────────────┤
│  syncStoreState() {                                 │
│    // Reads active execution                        │
│    // Syncs generatedDocs, selectedDocIndex         │
│    // Syncs docsContainerWidth                      │
│  }                                                   │
│                                                      │
│  handleWorkflowTool() {                             │
│    // Writes docs to ExecutionStore                 │
│    // Instead of local state                        │
│  }                                                   │
└─────────────────────────────────────────────────────┘
```

### Component Structure

```
┌────────────────────────────────────────────────────────────┐
│                    workflow-container                       │
├────────────────────────────────────────────────────────────┤
│  ┌──────────────────────────┐  ┌────────────────────────┐  │
│  │   interactive-workflow   │  │   workflow-docs-panel  │  │
│  │         -area            │  │                        │  │
│  │                          │  │  ┌──────────────────┐  │  │
│  │  ┌────────────────────┐  │  │  │ docs-resize-     │  │  │
│  │  │  aos-workflow-chat │  │  │  │ handle           │  │  │
│  │  │                    │  │◄─┼──┤ (NEW)            │  │  │
│  │  │                    │  │  │  └──────────────────┘  │  │
│  │  │                    │  │  │                        │  │
│  │  │                    │  │  │  ┌──────────────────┐  │  │
│  │  │                    │  │  │  │ aos-docs-viewer  │  │  │
│  │  │                    │  │  │  │                  │  │  │
│  │  │                    │  │  │  └──────────────────┘  │  │
│  │  └────────────────────┘  │  │                        │  │
│  │                          │  │                        │  │
│  └──────────────────────────┘  └────────────────────────┘  │
└────────────────────────────────────────────────────────────┘
```

## User Stories

| ID | Story | Complexity | Priority |
|----|-------|------------|----------|
| WSD-001 | Document State per Execution | S | Critical |
| WSD-002 | Tab-Wechsel synchronisiert Dokumente | XS | Critical |
| WSD-003 | Resizable Dokument-Container | S | High |
| WSD-004 | Persistente Container-Größe pro Workflow | S | Medium |

## Technical Changes

### 1. Types (`execution.ts`)

```typescript
// NEW Interface
export interface GeneratedDoc {
  path: string;
  content: string;
  timestamp: string;
}

// Extended ExecutionState
export interface ExecutionState {
  // ... existing fields
  generatedDocs: GeneratedDoc[];
  selectedDocIndex: number;
  docsContainerWidth: number;
}
```

### 2. Store (`execution-store.ts`)

```typescript
// NEW Methods
addDocument(executionId: string, doc: GeneratedDoc): void
updateDocument(executionId: string, path: string, content: string): void
setSelectedDocIndex(executionId: string, index: number): void
setDocsContainerWidth(executionId: string, width: number): void
getPersistedWidth(commandId: string): number | null
```

### 3. View (`workflow-view.ts`)

- Remove local `generatedDocs`, `selectedDocIndex` state
- Add `docsPanelWidth`, `isResizing` state
- Update `syncStoreState()` to read docs from store
- Update `handleWorkflowTool()` to write docs to store
- Add resize handlers

### 4. Styles (`theme.css`)

```css
:root {
  --docs-panel-min-width: 200px;
  --docs-panel-max-width: 60%;
  --docs-panel-default-width: 350px;
  --docs-resize-handle-width: 6px;
}

.docs-resize-handle { ... }
.workflow-docs-panel { ... }
```

## Acceptance Criteria Summary

1. ✅ Jeder Workflow-Tab hat isolierte Dokument-Anzeige
2. ✅ Tab-Wechsel zeigt korrekte Dokumente
3. ✅ Container ist per Drag resizable (200px - 60%)
4. ✅ Größe wird pro Workflow gespeichert
5. ✅ Bei Tab-Schließung bleiben Dateien im Filesystem

## Out of Scope

- Vertikales Resize (Höhe)
- Collapse/Expand Toggle
- Dokument-Preview in separatem Modal
- Export-Funktionalität
- Dokument-History über Session hinaus

## Risks & Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| Performance bei vielen Docs | Medium | Virtualisierung bei >50 Docs (Future) |
| LocalStorage Quota | Low | Max 5MB, Docs sind klein |
| Resize-Flackern | Low | requestAnimationFrame verwenden |

## Files Changed

| File | LOC Est. | Change Type |
|------|----------|-------------|
| `execution.ts` | +15 | Interface Extension |
| `execution-store.ts` | +80 | New Methods |
| `workflow-view.ts` | +100 | State Migration, Resize |
| `theme.css` | +40 | Resize Styles |
| **Total** | ~235 | |

## Related Documentation

- [Requirements Clarification](./requirements-clarification.md)
- [Story Index](./story-index.md)
- [Effort Estimation](./effort-estimation.md)
