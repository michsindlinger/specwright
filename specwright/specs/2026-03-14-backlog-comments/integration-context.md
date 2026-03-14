# Integration Context

> **Purpose:** Cross-story context preservation for multi-session execution.
> **Auto-updated** after each story completion.
> **READ THIS** before implementing the next story.

---

## Completed Stories

| Story | Summary | Key Changes |
|-------|---------|-------------|
| BLC-001 | Comment Protocol + Handler + WebSocket registration | `ui/src/shared/types/comment.protocol.ts`, `ui/src/server/handlers/comment.handler.ts`, `ui/src/server/websocket.ts` |
| BLC-002 | commentCount added to BacklogReader | `ui/src/server/backlog-reader.ts` |
| BLC-003 | Comment Thread frontend component + Gateway methods | `ui/frontend/src/components/comments/aos-comment-thread.ts`, `ui/frontend/src/gateway.ts` |
| BLC-004 | Image upload + drag & drop added to aos-comment-thread | `ui/frontend/src/components/comments/aos-comment-thread.ts` |
| BLC-005 | commentCount badge added to story card | `ui/frontend/src/components/story-card.ts` |

---

## New Exports & APIs

### Components
- `ui/frontend/src/components/comments/aos-comment-thread.ts` → `<aos-comment-thread itemId="bug-001" />`
  - Displays chronological comment list with Markdown rendering
  - Inline edit mode per comment; hover-to-reveal delete action
  - New comment textarea with Ctrl+Enter shortcut
  - Fires `show-toast` CustomEvent for notifications

### Services
<!-- New service classes/modules -->
_None yet_

### Hooks / Utilities
- `ui/frontend/src/utils/image-upload.utils.ts` → `validateFile(file, currentCount)` - validates size (5MB) and count; returns error string or null
- `ui/frontend/src/utils/image-upload.utils.ts` → `readFileAsDataUrl(file)` - reads File as data URL Promise

### Services
- `ui/src/server/handlers/comment.handler.ts` → `commentHandler.handleCreate/List/Update/Delete/UploadImage(client, message, projectPath)` - Comment CRUD handler singleton

### Types / Interfaces
- `ui/src/shared/types/comment.protocol.ts` → `Comment` - `{ id: string, author: string, text: string, createdAt: string, editedAt?: string, imageFilename?: string }`
- `ui/src/shared/types/comment.protocol.ts` → `COMMENT_ERROR_CODES` - error code constants
- `ui/src/shared/types/comment.protocol.ts` → `COMMENT_CONFIG` - `MAX_IMAGE_SIZE_BYTES`, `ALLOWED_IMAGE_TYPES`
- `ui/src/server/backlog-reader.ts` → `BacklogStoryInfo.commentCount?: number` - optional comment count field on backlog story

---

## Integration Notes

- **Comment storage path:** `{projectDir}/backlog/items/attachments/{itemId}/comments.json` — flat JSON array of `Comment` objects, oldest first
- **Comment ID format:** `cmt-{timestamp}` (e.g. `cmt-1710412800000`)
- **WebSocket message types:** `comment:create`, `comment:list`, `comment:update`, `comment:delete`, `comment:upload-image` (client→server); each has `:response` variant (server→client)
- **Image upload:** Delegates to `attachmentStorageService.upload()` — stores in same attachments dir as regular attachments
- **Frontend Gateway methods (BLC-003):** `gateway.sendCommentCreate(itemId, text)`, `gateway.requestCommentList(itemId)`, `gateway.sendCommentUpdate(itemId, commentId, text)`, `gateway.sendCommentDelete(itemId, commentId)`, `gateway.sendCommentImageUpload(itemId, data, filename, mimeType)`
- **Comment response types:** `comment:list:response` → `{ data: { comments: Comment[], count } }`, `comment:create:response` → `{ data: { comment: Comment, count } }`
- `getCommentCount(projectPath, itemId)` reads from `{projectDir}/backlog/items/attachments/{itemId}/comments.json` — returns array length or 0 if missing/invalid
- **Image upload (BLC-004):** Images staged as DataURLs before submit; uploaded server-side via `gateway.sendCommentImageUpload()` (naming: `cmt-img-{timestamp}.{ext}`); DataURL embedded as Markdown `![image.ext](data:...)` in comment text for inline display
- **Image validation:** Comments accept image/* types only (PNG, JPG, GIF, WebP); uses `validateFile()` from `image-upload.utils.ts` for size (5MB) and count (5 max) checks
- `commentCount` is loaded in parallel with `attachmentCount` via `Promise.all` in `getKanbanBoard()`
- **Comment badge (BLC-005):** `StoryInfo.commentCount?: number` property on story card; renders chat-bubble icon + count badge when `commentCount > 0`; icon-only (hover-visible) when 0; dispatches `comment-open` CustomEvent with `detail: { itemId }` on click

---

## File Change Summary

| File | Action | Story |
|------|--------|-------|
| `ui/src/shared/types/comment.protocol.ts` | Created | BLC-001 |
| `ui/src/server/handlers/comment.handler.ts` | Created | BLC-001 |
| `ui/src/server/websocket.ts` | Modified | BLC-001 |
| `ui/tests/unit/comment.handler.test.ts` | Created | BLC-001 |
| `ui/src/server/backlog-reader.ts` | Modified | BLC-002 |
| `ui/frontend/src/components/comments/aos-comment-thread.ts` | Created | BLC-003 |
| `ui/frontend/src/gateway.ts` | Modified (5 Comment methods) | BLC-003 |
| `ui/frontend/src/components/comments/aos-comment-thread.ts` | Modified (image upload, drag & drop) | BLC-004 |
| `ui/frontend/src/components/story-card.ts` | Modified (commentCount property, comment badge, comment-open event) | BLC-005 |
