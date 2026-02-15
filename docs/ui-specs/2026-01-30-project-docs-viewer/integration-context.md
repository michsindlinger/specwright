# Integration Context

> **Purpose:** Cross-story context preservation for multi-session execution.
> **Auto-updated** after each story completion.
> **READ THIS** before implementing the next story.

---

## Completed Stories

| Story | Summary | Key Changes |
|-------|---------|-------------|
| PDOC-001 | Backend API for reading/writing project docs | DocsReader service, WebSocket handlers docs.list/read/write |
| PDOC-002 | Sidebar component for doc navigation | AosDocsSidebar Lit component with doc selection events |
| PDOC-003 | Markdown viewer component with syntax highlighting | AosDocsViewer with marked + highlight.js |
| PDOC-004 | Markdown editor component with CodeMirror | AosDocsEditor with CodeMirror + save/cancel events |
| PDOC-005 | Dashboard integration with Docs tab | AosDocsPanel container + dashboard tabs for navigation |
| PDOC-999 | Integration & E2E validation | test-checklist.md, all lint/build checks passed |

---

## New Exports & APIs

### Components
<!-- New UI components created -->
- `ui/src/components/docs/aos-docs-sidebar.ts` → `<aos-docs-sidebar .docs=${docs} .selectedDoc=${selectedDoc} .hasUnsavedChanges=${hasUnsavedChanges}>`
  - Events: `doc-selected` (detail: `{ filename: string }`), `unsaved-changes-warning`, `save-requested`
  - Public method: `confirmNavigation(action: 'save' | 'discard' | 'cancel')`
- `ui/src/components/docs/aos-docs-viewer.ts` → `<aos-docs-viewer .content=${content} .filename=${filename} .loading=${loading} .error=${error}>`
  - Events: `edit-requested`, `retry-requested`
  - Renders Markdown with `marked` library and syntax highlighting via `highlight.js`
  - States: loading, error, empty doc, rendered content
- `ui/src/components/docs/aos-docs-editor.ts` → `<aos-docs-editor .content=${content} .filename=${filename} .saving=${saving}>`
  - Events: `doc-saved` (detail: `{ filename: string, content: string }`), `edit-cancelled`
  - Public methods: `markSaveSuccess()`, `markSaveError(error: string)`
  - CodeMirror editor with markdown syntax highlighting, oneDark theme
  - Features: Save/Cancel buttons, unsaved changes indicator, large file warning (>1MB), save error display
- `ui/src/components/docs/aos-docs-panel.ts` → `<aos-docs-panel .active=${active}>`
  - Container component that orchestrates sidebar, viewer, and editor
  - Public methods: `checkUnsavedChanges()` (returns boolean), `confirmTabChange(action)`
  - Handles WebSocket communication for docs.list, docs.read, docs.write
  - State machine: Loading -> Docs List -> Doc Selected -> Viewing/Editing

### Services
<!-- New service classes/modules -->
- `src/server/docs-reader.ts` → `DocsReader` class
  - `listDocs(projectPath)` → Returns `{ files: DocFile[], message?: string }`
  - `readDoc(projectPath, filename)` → Returns `{ filename, content }` or null
  - `writeDoc(projectPath, filename, content)` → Returns `{ success, timestamp, error? }`

### Hooks / Utilities
<!-- New hooks, helpers, utilities -->
_None yet_

### Types / Interfaces
<!-- New type definitions -->
- `src/server/docs-reader.ts`:
  - `DocFile` → `{ filename: string, lastModified: string }`
  - `DocContent` → `{ filename: string, content: string }`
  - `DocWriteResult` → `{ success: boolean, timestamp: string, error?: string }`
  - `DocListResult` → `{ files: DocFile[], message?: string }`
- `ui/src/components/docs/aos-docs-sidebar.ts`:
  - `DocFile` → `{ filename: string, lastModified: string }` (frontend mirror of backend type)

---

## Integration Notes

<!-- Important integration information for subsequent stories -->
**Dashboard Tab Navigation:**
- `dashboard-view.ts` now has `ViewMode = 'specs' | 'kanban' | 'story' | 'docs'`
- Tab navigation via `dashboard-tabs` CSS class with `dashboard-tab` buttons
- Switching to/from docs tab checks for unsaved changes via `docsPanel.checkUnsavedChanges()`
- Confirmation dialog before discarding unsaved changes

**WebSocket API for Frontend Components:**
- `docs.list` → Returns list of .md files from `agent-os/product/` folder
- `docs.read` → Requires `filename` parameter, returns file content
- `docs.write` → Requires `filename` and `content` parameters
- Path traversal protection is implemented - only alphanumeric, hyphens, underscores allowed in filenames
- All errors returned with `type: 'docs.error'` and optional `code` field (400, 404)

**Docs Sidebar Component Pattern:**
- Uses Light DOM (`createRenderRoot() { return this; }`) like other components
- CSS styles in `theme.css` under `.docs-sidebar` prefix
- Fires `doc-selected` event when user clicks a document
- Handles unsaved changes via `unsaved-changes-warning` event + `confirmNavigation()` method
- Documents are sorted alphabetically for display
- Empty state shows configurable `emptyMessage` property

**Docs Viewer Component Pattern:**
- Uses Light DOM for styling consistency
- CSS styles in `theme.css` under `.docs-viewer` and `.markdown-body` prefixes
- Uses `marked` library for Markdown parsing with GFM support
- Uses `highlight.js` for code block syntax highlighting via custom renderer
- Fires `edit-requested` event when user clicks edit button
- Fires `retry-requested` event when user clicks retry on error
- Supports loading, error, empty, and content states

**Docs Editor Component Pattern:**
- Uses Light DOM (`createRenderRoot() { return this; }`) for styling consistency
- CSS styles in `theme.css` under `.docs-editor` prefix
- Uses CodeMirror 6 with `@codemirror/lang-markdown` for syntax highlighting
- Uses `@codemirror/theme-one-dark` for dark theme matching app style
- Tracks dirty state by comparing currentContent with originalContent
- Fires `doc-saved` event with `{ filename, content }` when Save button clicked
- Fires `edit-cancelled` event when Cancel confirmed
- Shows confirmation dialog via `window.confirm()` when canceling with unsaved changes
- Save button disabled when no changes or during save operation
- Shows "Speichern..." with spinner during save (controlled via `saving` property)
- Parent component should call `markSaveSuccess()` on successful save, `markSaveError(error)` on failure

---

## File Change Summary

| File | Action | Story |
|------|--------|-------|
| agent-os-ui/src/server/docs-reader.ts | Created | PDOC-001 |
| agent-os-ui/src/server/websocket.ts | Modified | PDOC-001 |
| agent-os-ui/ui/src/components/docs/aos-docs-sidebar.ts | Created | PDOC-002 |
| agent-os-ui/ui/src/styles/theme.css | Modified | PDOC-002 |
| agent-os-ui/ui/src/components/docs/aos-docs-viewer.ts | Created | PDOC-003 |
| agent-os-ui/ui/package.json | Modified | PDOC-003 |
| agent-os-ui/ui/src/styles/theme.css | Modified | PDOC-003 |
| agent-os-ui/ui/src/components/docs/aos-docs-editor.ts | Created | PDOC-004 |
| agent-os-ui/ui/package.json | Modified | PDOC-004 |
| agent-os-ui/ui/src/styles/theme.css | Modified | PDOC-004 |
| agent-os-ui/ui/src/components/docs/aos-docs-panel.ts | Created | PDOC-005 |
| agent-os-ui/ui/src/views/dashboard-view.ts | Modified | PDOC-005 |
| agent-os-ui/ui/src/styles/theme.css | Modified | PDOC-005 |
| agent-os/specs/2026-01-30-project-docs-viewer/test-checklist.md | Created | PDOC-999 |
