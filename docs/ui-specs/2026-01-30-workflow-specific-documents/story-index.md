# Story Index: Workflow-Specific Documents

> Spec-ID: WSD
> Created: 2026-01-30
> Stories: 4

## Story Overview

| Story | Name | Complexity | Layer | Dependencies |
|-------|------|------------|-------|--------------|
| WSD-001 | Document State per Execution | S | Frontend | - |
| WSD-002 | Tab-Wechsel synchronisiert Dokumente | XS | Frontend | WSD-001 |
| WSD-003 | Resizable Dokument-Container | S | Frontend | - |
| WSD-004 | Persistente Container-Größe pro Workflow | S | Frontend | WSD-001, WSD-003 |

## Dependency Graph

```
WSD-001 (Document State)
    │
    ├───► WSD-002 (Tab-Sync)
    │
    └───► WSD-004 (Persistent Width)
              ▲
              │
WSD-003 (Resizable) ──┘
```

## Recommended Execution Order

1. **WSD-001** - Basis: Document State per Execution
2. **WSD-003** - Parallel möglich: Resizable Container
3. **WSD-002** - Nach WSD-001: Tab-Wechsel Sync
4. **WSD-004** - Nach WSD-001 + WSD-003: Persistenz

## Stories by File

| File | Stories |
|------|---------|
| `execution.ts` | WSD-001, WSD-004 |
| `execution-store.ts` | WSD-001, WSD-004 |
| `workflow-view.ts` | WSD-001, WSD-002, WSD-003, WSD-004 |
| `theme.css` | WSD-003 |

## Integration Points

### Critical Integration
- **ExecutionStore** ist zentral für alle Stories
- **workflow-view.ts** orchestriert alle Änderungen
- **syncStoreState()** muss alle neuen State-Properties berücksichtigen

### Testing Strategy
1. Unit: Store-Methoden isoliert testen
2. Integration: Tab-Wechsel mit mehreren Workflows
3. E2E: Kompletter Flow mit Resize und Persistenz
