# Integration Context - Quick-To-Do

> Last Updated: 2026-02-13
> Purpose: Cross-session context for story integration

## Completed Stories

| Story ID | Summary | Key Files/Exports |
|----------|---------|-------------------|
| QTD-001 | Kontextmenü-Integration + Modal-Shell | `aos-quick-todo-modal.ts`, `aos-context-menu.ts` (quick-todo action) |
| QTD-002 | Bild-Upload per Paste/Drop im Modal | `image-upload.utils.ts` (NEU), `aos-quick-todo-modal.ts` (Paste/Drop/Staging) |
| QTD-003 | Backend REST-API + Storage Service | `backlog-item-storage.ts` (NEU), `quick-todo.routes.ts` (NEU), `index.ts` (Route) |
| QTD-004 | End-to-End Integration + UX-Polish | `aos-quick-todo-modal.ts` (fetch POST, loading, error), `app.ts` (quick-todo-saved handler) |

---

## New Exports & APIs

### Components

- `ui/src/components/aos-quick-todo-modal.ts` → `<aos-quick-todo-modal>` - Quick-capture modal with title, description, priority fields

  **Events:**
  - `quick-todo-saved` - Detail: `{ itemId: string }` (fired after successful backend save)
  - `modal-close` - Fired when modal closes without saving

  **Properties:**
  - `open: boolean` - Controls modal visibility

  **Image Upload (QTD-002):**
  - Supports paste (Ctrl+V) and drag & drop for images
  - Validates: PNG/JPEG/GIF/WebP only, max 5MB, max 5 images
  - Uses `aos-image-staging-area` for thumbnail display
  - Visual drop zone indicator when dragging over modal

### Utilities

- `ui/src/utils/image-upload.utils.ts` → Reusable image upload functions
  - `validateImageFile(file, currentCount)` - Returns error string or null
  - `readFileAsDataUrl(file)` - Promise<string>
  - `createStagedImage(file)` - Promise<StagedImage>
  - Constants: `ALLOWED_MIME_TYPES`, `MAX_FILE_SIZE` (5MB), `MAX_IMAGES` (5)

### State & Handlers (in app.ts)

- `showQuickTodoModal: boolean` - State for modal visibility
- `handleQuickTodoModalClose()` - Closes the modal
- `handleQuickTodoSaved(e)` - Shows toast with itemId on successful backend save

### Context Menu Integration

- Context menu action `quick-todo` added after "TODO erstellen"
- Icon: ⚡ (lightning bolt)
- Estimated height updated from 180 to 220 for 5th menu item

### Services (QTD-003)

- `src/server/backlog-item-storage.ts` → `BacklogItemStorageService`
  - `createItem(projectPath, request)` - Creates backlog item with optional images
  - `CreateQuickTodoRequest` - Interface: `{ title: string, description?: string, priority: string, images?: Array<{ data: string, filename: string, mimeType: string }> }`
  - `CreateItemResult` - Interface: `{ success: boolean, itemId?: string, file?: string, error?: string }`
  - Stores items in `agent-os/backlog/items/` as Markdown
  - Stores images in `agent-os/backlog/items/attachments/ITEM-XXX/`
  - Maintains `agent-os/backlog/backlog-index.json` (atomic writes)

### API Endpoints (QTD-003)

- `POST /api/backlog/:projectPath/quick-todo`
  - Body: `{ title: string, description?: string, priority: string, images?: Array<{ data, filename, mimeType }> }`
  - Response: `{ success: boolean, itemId?: string, file?: string, error?: string }`
  - Body limit: 30MB (for base64 images)
  - Validates: title required, priority must be low/medium/high/critical

---

## Integration Notes

1. **Quick-To-Do Modal Pattern:** The modal follows the same pattern as `aos-create-spec-modal.ts`:
   - Light DOM rendering (`createRenderRoot() { return this; }`)
   - Focus trap implementation
   - ESC key handling
   - Overlay click to close

2. **Context Menu Guard:** The context menu is blocked when any modal is open (checked in `handleContextMenu`)

3. **Direct Backend Save (QTD-004):** Quick-To-Do is saved directly via REST API (`POST /api/backlog/:projectPath/quick-todo`), no longer uses sessionStorage

4. **Image Upload Pattern (QTD-002):** Follows exact same pattern as `chat-view.ts`:
   - Paste handler on `document` (filtered by `this.open`)
   - Drag/Drop handlers on `.quick-todo-modal` container
   - Validation via extracted `image-upload.utils.ts` (pure functions)
   - `aos-image-staging-area` reused for thumbnails with `.images` binding and `@image-removed` event

5. **Image Utils Extraction:** `image-upload.utils.ts` extracts validation logic from `chat-view.ts` as pure functions. Quick-To-Do uses only PNG/JPEG/GIF/WebP (no PDF/SVG unlike chat-view)

6. **Backend API (QTD-003):** Route follows `image-upload.routes.ts` pattern. Service follows `image-storage.ts` pattern. Atomic index updates via temp file + rename. QTD-004 will connect the frontend modal save handler to this API endpoint.

---

## File Change Summary

| File | Change | Story |
|------|--------|-------|
| `ui/src/components/aos-quick-todo-modal.ts` | Created | QTD-001 |
| `ui/src/components/aos-context-menu.ts` | Modified (quick-todo entry, height) | QTD-001 |
| `ui/src/app.ts` | Modified (state, handlers, import, render) | QTD-001 |
| `ui/src/styles/theme.css` | Modified (quick-todo-modal styles) | QTD-001 |
| `ui/src/utils/image-upload.utils.ts` | Created | QTD-002 |
| `ui/src/components/aos-quick-todo-modal.ts` | Modified (paste/drop handlers, image staging) | QTD-002 |
| `ui/src/styles/theme.css` | Modified (drag-over, drop-hint, drop-overlay styles) | QTD-002 |
| `src/server/backlog-item-storage.ts` | Created | QTD-003 |
| `src/server/routes/quick-todo.routes.ts` | Created | QTD-003 |
| `src/server/index.ts` | Modified (quick-todo route registration) | QTD-003 |
| `ui/src/components/aos-quick-todo-modal.ts` | Modified (fetch POST, loading, error, Enter key) | QTD-004 |
| `ui/src/app.ts` | Modified (quick-todo-saved handler, toast) | QTD-004 |
| `ui/src/styles/theme.css` | Modified (error message style) | QTD-004 |
