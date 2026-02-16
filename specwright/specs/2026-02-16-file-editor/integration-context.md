# Integration Context

> **Purpose:** Cross-story context preservation for multi-session execution.
> **Auto-updated** after each story completion.
> **READ THIS** before implementing the next story.

---

## Completed Stories

| Story | Summary | Key Changes |
|-------|---------|-------------|
| FE-002 | File Tree Component with lazy-loading | `aos-file-tree.ts` created |
| FE-003 | File Tree Sidebar overlay from left | `aos-file-tree-sidebar.ts` created, `app.ts` modified (toggle + render) |
| FE-004 | Code Editor with CodeMirror multi-language support | `aos-file-editor.ts` created, CodeMirror lang packages added |
| FE-005 | Multi-tab file editing with unsaved indicators | `aos-file-tabs.ts` + `aos-file-editor-panel.ts` created, `app.ts` wired up |
| FE-006 | Context menu with file CRUD operations | `aos-file-context-menu.ts` created, `aos-file-tree.ts` + `aos-file-tree-sidebar.ts` modified |
| FE-007 | Integration, Edge Cases & Polish | `aos-file-editor-panel.ts` + `aos-file-context-menu.ts` + `aos-file-tree.ts` + `aos-file-tree-sidebar.ts` modified |

---

## New Exports & APIs

### Components
<!-- New UI components created -->
- `ui/frontend/src/components/file-editor/aos-file-tree.ts` -> `<aos-file-tree rootPath="." selectedPath="..." @file-open=${handler} @file-contextmenu=${handler}></aos-file-tree>`
- `ui/frontend/src/components/file-editor/aos-file-tree-sidebar.ts` -> `<aos-file-tree-sidebar .isOpen=${bool} @sidebar-close=${handler} @file-open=${handler}></aos-file-tree-sidebar>`
- `ui/frontend/src/components/file-editor/aos-file-editor.ts` -> `<aos-file-editor .content=${string} .filename=${string} @content-changed=${handler} @save-requested=${handler}></aos-file-editor>`
- `ui/frontend/src/components/file-editor/aos-file-tabs.ts` -> `<aos-file-tabs .tabs=${FileTab[]} .activeTabPath=${string} @tab-select=${handler} @tab-close=${handler}></aos-file-tabs>`
- `ui/frontend/src/components/file-editor/aos-file-editor-panel.ts` -> `<aos-file-editor-panel></aos-file-editor-panel>` - Orchestrator managing open files, tabs, and editor. Public: `openFile(path, filename)`, `hasUnsavedChanges()`
- `ui/frontend/src/components/file-editor/aos-file-context-menu.ts` -> `<aos-file-context-menu @tree-refresh=${handler}></aos-file-context-menu>` - Right-click context menu for file operations. Public: `show(x, y, path, name, type)`, `hide()`

### Services
<!-- New service classes/modules -->
_None yet_

### Hooks / Utilities
<!-- New hooks, helpers, utilities -->
_None yet_

### Types / Interfaces
<!-- New type definitions -->
- `ui/frontend/src/components/file-editor/aos-file-tree.ts` -> `FileEntry { name, path, type, size }` - File/directory entry interface
- `ui/frontend/src/components/file-editor/aos-file-tabs.ts` -> `FileTab { path, filename, isModified }` - Tab entry interface

---

## Integration Notes

<!-- Important integration information for subsequent stories -->
- **FE-002 depends on FE-001**: The `aos-file-tree` component sends `files:list` messages via gateway and listens for `files:list:response` / `files:list:error`. The backend handler (FE-001) must implement these message types.
- **Custom Events**: `file-open` event with `{ detail: { path, filename } }` - used by parent (FE-003 sidebar) to open files in editor. `file-contextmenu` event with `{ detail: { path, filename, type, x, y } }` - used by FE-006 context menu.
- **Expected response format for `files:list:response`**: `{ type: 'files:list:response', path: string, entries: FileEntry[] }` where FileEntry has `{ name, path, type: 'file'|'directory', size }`.
- **Keyboard accessibility**: Tree items have `role="treeitem"`, `tabindex="0"`, `aria-expanded` (dirs), keyboard support (Enter/Space to toggle/select), and `focus-visible` outline styling.
- **FE-003 Sidebar integration**: `app.ts` has `isFileTreeOpen` state and renders `<aos-file-tree-sidebar>`. Toggle button with folder icon added in header-actions before terminal button. Sidebar slides from left with CSS transition, resizable via drag handle. `file-open` events from tree are re-dispatched to app.ts via `_handleFileTreeFileOpen` (FE-004 will consume these).
- **Both sidebars coexist**: File tree sidebar (left, z-index 1000) and terminal sidebar (right, z-index 1000) can be open simultaneously without overlap.
- **FE-004 Editor component**: `aos-file-editor` wraps CodeMirror 6 with auto language detection (ts/tsx/js/jsx/json/html/css/md/yaml), theme switching via `themeCompartment` + `languageCompartment`. Dispatches `content-changed` (with `{content, hasUnsavedChanges}`) and `save-requested` (with `{filename, content}`) events. Ctrl+S/Cmd+S triggers save. Public methods: `markSaveSuccess()` and `markSaveError(msg)`. Uses Light DOM pattern (`createRenderRoot` returns `this`).
- **FE-005 Tab Management**: `aos-file-editor-panel` is the orchestrator that manages multi-tab state. Maintains `openFiles[]` array with `{path, filename, content, originalContent, language, isModified, lastAccessed}`. Gateway pattern: subscribes to `files:read:response`, `files:read:error`, `files:write:response`, `files:write:error`. `aos-file-tabs` is pure presentation (receives tabs + activeTabPath, dispatches `tab-select`/`tab-close`). In `app.ts`, `_handleFileTreeFileOpen` calls `panel.openFile(path, filename)` directly. Tab limit: 15 tabs max with LRU eviction. Unsaved changes use `window.confirm()`. Panel rendered directly in app.ts after view-container.
- **FE-006 Context Menu**: `aos-file-context-menu` is a standalone component rendered inside `aos-file-tree-sidebar`. It listens for `file-contextmenu` events from `aos-file-tree` (dispatched on right-click with `{path, filename, type, x, y}`). Menu items: "Neue Datei", "Neuer Ordner", "Umbenennen", "Löschen". Uses `window.prompt()` for name input and `window.confirm()` for delete confirmation. Gateway messages: `files:create`, `files:mkdir`, `files:rename`, `files:delete`. After success responses, dispatches `tree-refresh` event which the sidebar forwards to `tree.refreshDirectory(path)`. Positioning follows `aos-context-menu.ts` pattern with viewport-bounds adjustment. Uses Light DOM + z-index 2000.
- **FE-007 Edge Cases & Polish**: `aos-file-editor-panel` now handles binary file detection (client-side extension check via `BINARY_EXTENSIONS` set + backend `isBinary` flag), large file warning (>1MB threshold), permission/deleted-file errors (ENOENT/EACCES/EPERM code detection), and tab sync with context menu (listens for `file-renamed` and `file-deleted` document events). `aos-file-context-menu` dispatches `file-renamed` and `file-deleted` CustomEvents on `document` after successful rename/delete operations. `aos-file-tree` has new `filterText` property for client-side file filtering (case-insensitive name match, directories with matching children remain visible). `aos-file-tree-sidebar` has search input above tree that binds to `filterText`.

---

## File Change Summary

| File | Action | Story |
|------|--------|-------|
| ui/frontend/src/components/file-editor/aos-file-tree.ts | Created | FE-002 |
| ui/frontend/src/components/file-editor/aos-file-tree-sidebar.ts | Created | FE-003 |
| ui/frontend/src/app.ts | Modified | FE-003 |
| ui/frontend/src/styles/theme.css | Modified | FE-003 |
| ui/frontend/src/components/file-editor/aos-file-editor.ts | Created | FE-004 |
| ui/frontend/package.json | Modified | FE-004 |
| ui/frontend/src/components/file-editor/aos-file-tabs.ts | Created | FE-005 |
| ui/frontend/src/components/file-editor/aos-file-editor-panel.ts | Created | FE-005 |
| ui/frontend/src/app.ts | Modified | FE-005 |
| ui/frontend/src/styles/theme.css | Modified | FE-005 |
| ui/frontend/src/components/file-editor/aos-file-context-menu.ts | Created | FE-006 |
| ui/frontend/src/components/file-editor/aos-file-tree.ts | Modified | FE-006 |
| ui/frontend/src/components/file-editor/aos-file-tree-sidebar.ts | Modified | FE-006 |
| ui/frontend/src/components/file-editor/aos-file-editor-panel.ts | Modified | FE-007 |
| ui/frontend/src/components/file-editor/aos-file-context-menu.ts | Modified | FE-007 |
| ui/frontend/src/components/file-editor/aos-file-tree.ts | Modified | FE-007 |
| ui/frontend/src/components/file-editor/aos-file-tree-sidebar.ts | Modified | FE-007 |
