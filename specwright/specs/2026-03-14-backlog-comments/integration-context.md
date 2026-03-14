# Integration Context

> **Purpose:** Cross-story context preservation for multi-session execution.
> **Auto-updated** after each story completion.
> **READ THIS** before implementing the next story.

---

## Completed Stories

| Story | Summary | Key Changes |
|-------|---------|-------------|
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

### Types / Interfaces
<!-- New type definitions -->
- `ui/src/server/backlog-reader.ts` → `BacklogStoryInfo.commentCount?: number` - optional comment count field on backlog story

---

## Integration Notes

- `getCommentCount(projectPath, itemId)` reads from `{projectDir}/backlog/items/attachments/{itemId}/comments.json` — returns array length or 0 if missing/invalid
- `commentCount` is loaded in parallel with `attachmentCount` via `Promise.all` in `getKanbanBoard()`
- The `comments.json` path follows the same directory structure as attachments (defined by BLC-001)

---

## File Change Summary

| File | Action | Story |
|------|--------|-------|
| `ui/src/server/backlog-reader.ts` | Modified | BLC-002 |
