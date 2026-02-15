# Integration Context

> **Purpose:** Cross-story context preservation for multi-session execution.
> **Auto-updated** after each story completion.
> **READ THIS** before implementing the next story.

---

## Completed Stories

| Story | Summary | Key Changes |
|-------|---------|-------------|
| SDVE-001 | Backend file discovery and generalized read/save | `specs-reader.ts`: listSpecFiles(), readSpecFile(), saveSpecFile(); `websocket.ts`: specs.files handler, relativePath in specs.read/specs.save |
| SDVE-002 | Dynamic tab-bar component for spec file navigation | `aos-spec-file-tabs.ts`: new Lit component with grouped tabs, active state, file-selected event |
| SDVE-003 | Kanban board integration with dynamic tabs and relativePath | `kanban-board.ts`: replaced hardcoded spec.md/spec-lite.md buttons with `aos-spec-file-tabs`; `gateway.ts`: added `requestSpecFiles()` |

---

## New Exports & APIs

### Components
- `agent-os-ui/ui/src/components/specs/aos-spec-file-tabs.ts` → `<aos-spec-file-tabs .files=${groups} active-file=${relativePath}></aos-spec-file-tabs>` - Grouped tab bar for spec files, emits `file-selected` event with `{ relativePath, filename }`

### Services
- `agent-os-ui/src/server/specs-reader.ts` → `listSpecFiles(projectPath, specId)` - Returns `SpecFileGroup[]` with files grouped by folder
- `agent-os-ui/src/server/specs-reader.ts` → `readSpecFile(projectPath, specId, relativePath)` - Reads any .md file by relative path
- `agent-os-ui/src/server/specs-reader.ts` → `saveSpecFile(projectPath, specId, relativePath, content)` - Saves any .md file by relative path

### Hooks / Utilities
- `agent-os-ui/src/server/specs-reader.ts` → `getValidatedSpecFilePath(specPath, relativePath)` - Path traversal protection (private)

### Types / Interfaces
- `agent-os-ui/src/server/specs-reader.ts` → `SpecFileInfo` - `{ relativePath: string; filename: string }`
- `agent-os-ui/src/server/specs-reader.ts` → `SpecFileGroup` - `{ folder: string; files: SpecFileInfo[] }`
- `agent-os-ui/ui/src/components/specs/aos-spec-file-tabs.ts` → `SpecFileInfo`, `SpecFileGroup` - Frontend mirror of backend types

### Gateway Convenience Methods
- `agent-os-ui/ui/src/gateway.ts` → `requestSpecFiles(specId)` - Sends `specs.files` message to get file list for a spec

### WebSocket Message Types
- `specs.files` → Request: `{ type: 'specs.files', specId }` → Response: `{ type: 'specs.files', specId, groups: SpecFileGroup[] }`
- `specs.read` → Now uses `relativePath` parameter (legacy `fileType` still supported on backend)
- `specs.save` → Now uses `relativePath` parameter (legacy `fileType` still supported on backend)

---

## Integration Notes

- Root-level files are grouped under `folder: 'root'`, subdirectories use their name (e.g., `'stories'`)
- Files within each group are sorted alphabetically; root comes first, then subdirectories alphabetically
- Path validation rejects `..`, absolute paths, and non-.md files
- `fileType` backward compatibility on backend: `'spec'` → `'spec.md'`, `'spec-lite'` → `'spec-lite.md'`
- Frontend now exclusively uses `relativePath` for `specs.read` and `specs.save` (no longer sends `fileType`)
- `aos-spec-file-tabs` uses light DOM (`createRenderRoot` → `this`) and `ensureStyles` pattern; group labels only shown when multiple groups exist
- Component re-exports `SpecFileInfo` and `SpecFileGroup` interfaces for frontend consumers

---

## File Change Summary

| File | Action | Story |
|------|--------|-------|
| agent-os-ui/src/server/specs-reader.ts | Modified (added listSpecFiles, readSpecFile, saveSpecFile, getValidatedSpecFilePath, SpecFileInfo, SpecFileGroup) | SDVE-001 |
| agent-os-ui/src/server/websocket.ts | Modified (added specs.files handler, extended handleSpecsRead/handleSpecsSave with relativePath) | SDVE-001 |
| agent-os-ui/ui/src/components/specs/aos-spec-file-tabs.ts | Created (new Lit component for tab navigation) | SDVE-002 |
| agent-os-ui/ui/src/components/kanban-board.ts | Modified (integrated aos-spec-file-tabs, replaced hardcoded buttons, switched to relativePath) | SDVE-003 |
| agent-os-ui/ui/src/gateway.ts | Modified (added requestSpecFiles convenience method) | SDVE-003 |
