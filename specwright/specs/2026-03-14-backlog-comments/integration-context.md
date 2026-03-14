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

---

## New Exports & APIs

### Components
<!-- New UI components created -->
_None yet_

### Services
<!-- New service classes/modules -->
_None yet_

### Hooks / Utilities
<!-- New hooks, helpers, utilities -->
_None yet_

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
- `getCommentCount(projectPath, itemId)` reads from `{projectDir}/backlog/items/attachments/{itemId}/comments.json` — returns array length or 0 if missing/invalid
- `commentCount` is loaded in parallel with `attachmentCount` via `Promise.all` in `getKanbanBoard()`

---

## File Change Summary

| File | Action | Story |
|------|--------|-------|
| `ui/src/shared/types/comment.protocol.ts` | Created | BLC-001 |
| `ui/src/server/handlers/comment.handler.ts` | Created | BLC-001 |
| `ui/src/server/websocket.ts` | Modified | BLC-001 |
| `ui/tests/unit/comment.handler.test.ts` | Created | BLC-001 |
| `ui/src/server/backlog-reader.ts` | Modified | BLC-002 |
