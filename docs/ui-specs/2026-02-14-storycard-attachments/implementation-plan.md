# Implementation Plan - Storycard Attachments

**Status:** APPROVED
**Spec:** 2026-02-14-storycard-attachments
**Created:** 2026-02-14

---

## Executive Summary

Enable attaching files (images, PDFs, TXT, JSON, MD) to existing story cards in both Spec-Kanban and Backlog views. Attachments are stored on the local filesystem relative to the project root, referenced in story markdown files, and accessible by the AI agent during execution. The feature reuses the existing `image-upload.utils`, `ImageStorageService` patterns, and `aos-image-staging-area` component to minimize new code.

---

## Architecture Decisions

### AD-1: WebSocket-based Attachment CRUD (not REST)

**Decision:** Use WebSocket messages for all attachment operations (upload, list, delete) instead of REST endpoints.

**Rationale:**
- The project overwhelmingly uses WebSocket for all CRUD operations (specs, stories, kanban, backlog, git, etc.)
- The only REST endpoint is `POST /api/backlog/:projectPath/quick-todo` for Quick-ToDo, which was a deliberate exception because it uses multipart/form data
- For Storycard Attachments, files are sent as base64 over WebSocket, consistent with how `chat.send.with-images` already works in the Gateway
- Keeps the pattern consistent: WebSocket for real-time operations, REST only where structurally necessary

**Alternative considered:** REST API with multipart upload. Rejected because it would introduce a second paradigm for what is logically a WebSocket-bound context (story cards in kanban view).

### AD-2: Dedicated Attachment Service (separate from ImageStorageService)

**Decision:** Create a new `AttachmentStorageService` on the backend rather than extending the existing `ImageStorageService`.

**Rationale:**
- `ImageStorageService` is tightly coupled to chat images (stores in `.agent-os/chat-images/`, generates UUID-based filenames)
- Storycard attachments need context-aware storage: specs store in `agent-os/specs/<specId>/attachments/<storyId>/`, backlog items store in `agent-os/backlog/items/attachments/<itemId>/`
- Different naming strategy (preserve original filename with duplicate-suffix logic vs. UUID naming)
- Different file types supported (TXT, JSON, MD in addition to images/PDFs)
- However, the new service will reuse patterns FROM `ImageStorageService` and `BacklogItemStorageService`: sanitization, base64 decoding, path traversal protection, atomic writes

### AD-3: Attachment Metadata in Story Markdown

**Decision:** Store attachment references directly in the story's `.md` file under an `## Attachments` section, not in a separate JSON manifest.

**Rationale:**
- Already established pattern: `BacklogItemStorageService.generateMarkdown()` appends `## Attachments` section with image references
- Agents read story markdown files during execution -- embedded paths are directly accessible without parsing additional files
- Relative paths from project root (e.g., `agent-os/specs/2026-02-14-feature/attachments/SCA-001/screenshot.png`)
- Markdown is the source of truth for the agent, so attachment paths belong there

### AD-4: Attachment Panel as Modal/Popover (not inline on card)

**Decision:** The attachment management interface (upload zone, file list with preview, delete) opens as a lightweight popover/panel from the story card, not rendered inline on the card itself.

**Rationale:**
- Story cards are already information-dense (ID, title, type, priority, effort, status, model dropdown, dependencies)
- Inline upload zones would bloat cards and break the compact kanban layout
- A dedicated panel provides space for: drag & drop zone, file list with previews, delete confirmations
- The paperclip icon with count on the card itself provides the attachment indicator at a glance

### AD-5: Shared Attachment Component for Spec and Backlog Contexts

**Decision:** Build one reusable `aos-attachment-panel` component that works in both spec-kanban and backlog contexts, parameterized by context type and IDs.

**Rationale:**
- Requirements are identical for both contexts (same file types, same UI, same interactions)
- Only the storage path differs (spec vs. backlog), which is a backend concern
- Follows the `aos-kanban-board` pattern that already uses `mode` property for spec/backlog differentiation

---

## Component Overview

| Component | Type | Status | Layer | Description |
|-----------|------|--------|-------|-------------|
| `aos-attachment-panel` | Lit Component | **New** | Frontend | Reusable attachment management panel (upload, list, preview, delete) |
| `aos-attachment-indicator` | Lit Component (or inline render) | **New** | Frontend | Paperclip icon + count badge on story cards |
| `AttachmentStorageService` | Backend Service | **New** | Backend | File storage, listing, deletion, duplicate handling, markdown updating |
| `AttachmentHandler` | WebSocket Handler | **New** | Backend | WebSocket message routing for attachment CRUD |
| `attachment.protocol.ts` | Shared Types | **New** | Shared | Message types and interfaces for attachment communication |
| `file-upload.utils.ts` | Frontend Utility | **New** (extends pattern) | Frontend | Extended file validation (beyond images: TXT, JSON, MD) |
| `aos-story-card` | Lit Component | **Modified** | Frontend | Add attachment indicator (paperclip + count), attachment button click handler |
| `aos-kanban-board` | Lit Component | **Modified** | Frontend | Render and manage `aos-attachment-panel` popover, pass context (specId, mode) |
| `gateway.ts` | Frontend Service | **Modified** | Frontend | Add attachment WebSocket methods (upload, list, delete) |
| `websocket.ts` | Backend Router | **Modified** | Backend | Register attachment message handlers |
| `image-upload.utils.ts` | Frontend Utility | **Modified** | Frontend | Extend ALLOWED_MIME_TYPES to include text/plain, application/json, text/markdown |
| `theme.css` | CSS | **Modified** | Frontend | Styles for attachment panel, indicator, preview |

---

## Component Connections

| Source | Target | Connection Type | Description |
|--------|--------|----------------|-------------|
| `aos-story-card` | `aos-kanban-board` | Custom Event (`attachment-open`) | Story card emits event when attachment button is clicked |
| `aos-kanban-board` | `aos-attachment-panel` | Property Binding + Render | Kanban board renders attachment panel as popover, passes storyId/specId/mode |
| `aos-attachment-panel` | `gateway.ts` | Method Call | Panel calls gateway methods to upload/list/delete attachments |
| `gateway.ts` | `websocket.ts` | WebSocket Message | Frontend sends `attachment:upload`, `attachment:list`, `attachment:delete` |
| `websocket.ts` | `AttachmentHandler` | Method Delegation | WebSocket router delegates to AttachmentHandler (same pattern as GitHandler) |
| `AttachmentHandler` | `AttachmentStorageService` | Service Call | Handler delegates to storage service for file operations |
| `AttachmentStorageService` | Filesystem | File I/O | Service reads/writes files to spec/backlog directories |
| `AttachmentStorageService` | Story Markdown | File I/O | Service updates `## Attachments` section in story `.md` files |
| `attachment.protocol.ts` | `gateway.ts` + `AttachmentHandler` | Type Import | Shared types used by both frontend and backend |
| `file-upload.utils.ts` | `aos-attachment-panel` | Function Import | Panel uses validation functions from utils |
| `aos-attachment-panel` | `aos-confirm-dialog` | Component Usage | Panel uses existing confirm dialog for delete confirmation |
| `aos-attachment-panel` | `aos-image-staging-area` | Component Usage (or pattern) | Panel reuses staging area pattern for upload preview |

---

## Implementation Phases

### Phase 1: Foundation (Backend Service + Protocol)

Build the attachment infrastructure that all other components depend on.

**Components:**
- `attachment.protocol.ts` -- Shared types: message types, attachment metadata interface, request/response shapes
- `AttachmentStorageService` -- Core file operations: save (with duplicate handling), list, delete, markdown updating
- `AttachmentHandler` -- WebSocket message routing
- Wire up in `websocket.ts` message switch

**Why first:** Everything else depends on the backend being able to receive, store, and serve attachment data.

### Phase 2: Frontend Upload Infrastructure

Extend existing frontend utilities and create the gateway integration.

**Components:**
- Extend `image-upload.utils.ts` (or create `file-upload.utils.ts`) for new MIME types (text/plain, application/json, text/markdown)
- Add gateway methods: `sendAttachmentUpload()`, `requestAttachmentList()`, `sendAttachmentDelete()`
- Create gateway response handlers pattern

**Why second:** The attachment panel needs these utilities and gateway methods to function.

### Phase 3: Attachment Panel Component

Build the central UI component for managing attachments.

**Components:**
- `aos-attachment-panel` -- Upload zone (file picker, drag & drop, paste), file list with type-specific icons, inline preview trigger, delete with confirmation
- Styles in `theme.css`

**Why third:** This is the main user-facing component, built on top of Phase 1 and 2 infrastructure.

### Phase 4: Story Card Integration

Connect the attachment panel to story cards in the kanban board.

**Components:**
- Modify `aos-story-card` -- Add paperclip indicator with attachment count, emit `attachment-open` event
- Modify `aos-kanban-board` -- Handle `attachment-open` event, render `aos-attachment-panel` as positioned popover, pass context (specId/storyId for spec mode, itemId for backlog mode)

**Why fourth:** Integration requires all previous phases to be complete.

### Phase 5: Preview & Polish

Add inline preview functionality and UX polish.

**Components:**
- Image preview: thumbnail + click-to-enlarge (fullscreen overlay)
- PDF preview: inline iframe or download link
- Text file preview: inline code/text display (syntax-highlighted for JSON/MD)
- Error handling UX: file too large, invalid type, disk errors
- Lazy loading for attachment previews in file list

**Why last:** Preview is enhancement over core CRUD functionality.

---

## Dependencies

```
Phase 1 (Foundation)
  |
  v
Phase 2 (Frontend Upload Infrastructure)
  |
  v
Phase 3 (Attachment Panel)
  |
  v
Phase 4 (Story Card Integration)
  |
  v
Phase 5 (Preview & Polish)
```

All phases are strictly sequential. Each phase depends on the completion of the previous one.

**External dependencies:** None. All required infrastructure (WebSocket, file I/O, Lit components) already exists.

---

## Risks & Mitigations

| Risk | Probability | Impact | Mitigation |
|------|------------|--------|------------|
| **Base64 over WebSocket for large files** | Medium | Medium | 5MB file limit keeps messages manageable. Base64 adds ~33% overhead (6.67MB max message). WebSocket library (`ws`) handles this fine. Could chunk large uploads if needed. |
| **Concurrent attachment writes to same story markdown** | Low | High | `AttachmentStorageService` uses atomic write pattern (tmp + rename) from `BacklogItemStorageService`. Single-user local app makes true concurrency unlikely. |
| **Story markdown parsing fragility** | Medium | Medium | Use clear section markers (`## Attachments`) and append-only strategy. If section exists, append; if not, create. Never modify content above the Attachments section. |
| **Agent running while attachment deleted** | Low | Medium | Out of scope per requirements (noted as edge case). Could add a "story is in_progress" check before delete, showing warning. |
| **File type validation bypass** | Low | Low | Validate on both frontend (MIME type check) and backend (MIME + extension check). Local-only app reduces attack surface. |
| **Storage growth on disk** | Low | Low | No max attachment count but 5MB per file limit. Users manage their own local storage. |

---

## Self-Review Results

### 1. COMPLETENESS
- [x] All functional requirements from clarification are covered
- [x] Upload methods: File Picker, Drag & Drop, Paste (Phase 3)
- [x] All file types: Images (PNG, JPG, GIF, WebP), PDF, TXT, JSON, MD (Phase 1+2)
- [x] 5MB limit per file (Phase 1+2 validation)
- [x] No max attachment count (Phase 1)
- [x] Paperclip icon with count (Phase 4)
- [x] Inline preview for all types (Phase 5)
- [x] Delete with confirmation (Phase 3 with existing `aos-confirm-dialog`)
- [x] Auto-rename duplicates (Phase 1 backend)
- [x] Paths relative to project root in markdown (Phase 1 backend)
- [x] Works in Spec-Kanban and Backlog (Phase 4 with mode parameter)
- [x] Reuse existing `image-upload.utils` (Phase 2)

### 2. CONSISTENCY
- [x] WebSocket message pattern consistent with git, queue, specs handlers
- [x] Handler extraction pattern follows `GitHandler` and `QueueHandler`
- [x] Service singleton pattern follows `gitService`, `setupService`
- [x] Gateway method pattern follows existing `requestGitStatus()`, `sendGitCommit()`
- [x] Light DOM component pattern consistent with all `aos-*` components
- [x] Protocol shared types follow `git.protocol.ts`, `cloud-terminal.protocol.ts`

### 3. RISKS
- [x] All identified risks have mitigations
- [x] No critical blocking dependencies
- [x] Base64 upload size manageable within 5MB limit

### 4. ALTERNATIVES
- REST upload: Rejected for consistency (only one REST endpoint in the whole project)
- Extending `ImageStorageService`: Rejected due to different storage semantics
- Inline attachment UI on cards: Rejected for UX density reasons
- Separate manifest JSON for attachments: Rejected, markdown is source of truth for agent

### 5. COMPONENT CONNECTIONS
- [x] Every new component has at least one connection to existing components
- [x] `aos-attachment-panel` connects to: gateway, story-card (via kanban-board), confirm-dialog, file-upload.utils
- [x] `AttachmentStorageService` connects to: AttachmentHandler, filesystem, story markdown
- [x] `AttachmentHandler` connects to: websocket.ts, AttachmentStorageService
- [x] `attachment.protocol.ts` connects to: gateway.ts, AttachmentHandler
- [x] No orphaned components

---

## Minimal-Invasive Optimizations

### Existing Code Reusable AS-IS

| Artifact | Current Location | Reuse Type |
|----------|-----------------|------------|
| `aos-confirm-dialog` | `components/aos-confirm-dialog.ts` | Direct usage for delete confirmation |
| `aos-image-staging-area` | `components/aos-image-staging-area.ts` | Pattern reuse or direct usage for upload preview thumbnails |
| `StagedImage` type | `views/chat-view.ts` (re-exported from `image-upload.utils.ts`) | Direct type reuse for staged files |
| `readFileAsDataUrl()` | `utils/image-upload.utils.ts` | Direct function reuse |
| `createStagedImage()` | `utils/image-upload.utils.ts` | Direct function reuse |
| `sanitizeFilename()` | `backlog-item-storage.ts` + `image-storage.ts` | Pattern reuse |
| Path traversal protection | `image-storage.ts` `normalizePath()` | Pattern reuse |
| Atomic write pattern | `backlog-item-storage.ts` (tmp + rename) | Pattern reuse |
| Gateway `on()`/`off()`/`send()` | `gateway.ts` | Method extension pattern |
| WebSocket handler delegation | `websocket.ts` switch + `git.handler.ts` | Structural pattern reuse |
| Light DOM + event dispatch | All `aos-*` components | Pattern reuse |
| Base64 image decode | `backlog-item-storage.ts` `Buffer.from(base64Data, 'base64')` | Direct pattern reuse |

### Existing Code to MODIFY (minimal changes)

| File | Change | Scope |
|------|--------|-------|
| `story-card.ts` | Add paperclip icon button and attachment count to render method | ~15 lines added to render(), ~5 lines CSS, event handler |
| `kanban-board.ts` | Add state for active attachment panel, handle open/close, render panel | ~30 lines state + handlers, ~10 lines render |
| `gateway.ts` | Add 3 gateway methods for attachment CRUD | ~20 lines |
| `websocket.ts` | Add 3 case entries in message switch | ~10 lines |
| `image-upload.utils.ts` | Extend `ALLOWED_MIME_TYPES` with text/plain, application/json, text/markdown | ~3 lines |
| `theme.css` | Add styles for attachment panel, indicator, preview | ~80 lines |

### What Can Be AVOIDED

1. **No new REST endpoints needed** -- WebSocket handles all operations
2. **No new frontend service class needed** -- Gateway methods are sufficient (no persistent client state for attachments)
3. **No IndexedDB or local storage needed** -- Attachment state is server-side (filesystem)
4. **No thumbnail generation needed** -- Browser renders images natively via data URLs or file paths
5. **No new shared service singleton** -- `AttachmentStorageService` can be instantiated in handler, or be a simple singleton like `gitService`

### Feature-Preservation Checklist

- [x] All requirements from clarification are covered
- [x] No feature was sacrificed for minimal-invasiveness
- [x] All acceptance criteria remain achievable
- [x] Upload (File Picker + Drag & Drop + Paste): Covered in Phase 3
- [x] All file types (images, PDF, TXT, JSON, MD): Covered in Phase 1+2
- [x] Spec-Kanban and Backlog support: Covered in Phase 4
- [x] Paperclip indicator with count: Covered in Phase 4
- [x] Inline previews: Covered in Phase 5
- [x] Delete with confirmation: Covered in Phase 3
- [x] Auto-rename duplicates: Covered in Phase 1
- [x] Agent-readable paths in markdown: Covered in Phase 1
