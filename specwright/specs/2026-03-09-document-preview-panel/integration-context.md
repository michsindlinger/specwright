# Integration Context - Document Preview Panel

## Completed Stories

| Story ID | Summary | Key Files/Functions |
|----------|---------|---------------------|
| DPP-001 | MCP-Tools document_preview_open & close | specwright/scripts/mcp/kanban-mcp-server.ts |
| DPP-002 | Backend Preview-Watcher and WebSocket integration | ui/src/server/services/preview-watcher.service.ts, ui/src/server/handlers/document-preview.handler.ts, ui/src/server/websocket.ts |

## New Exports & APIs

**MCP Tools:**
- `document_preview_open` - Opens a document in the preview panel. Input: `{ filePath: string }`. Creates `/tmp/specwright-preview-<projectHash>.json` with `{ action: 'open', filePath, projectPath, timestamp }`.
- `document_preview_close` - Closes the preview panel. No input required. Creates `/tmp/specwright-preview-<projectHash>.json` with `{ action: 'close', filePath: null, projectPath, timestamp }`.

**Project Hash:** `createHash('md5').update(cwd).digest('hex').slice(0, 8)` - ensures unique file per project.

**Services:**
- `PreviewWatcher` (`ui/src/server/services/preview-watcher.service.ts`) - Watches `/tmp/` for `specwright-preview-*.json` files via `fs.watch`. On detection: reads JSON, reads referenced document, broadcasts `document-preview.open`/`document-preview.close` via `webSocketManager.sendToProject()`, deletes JSON. Performs cleanup on startup.

**Handlers:**
- `DocumentPreviewHandler` (`ui/src/server/handlers/document-preview.handler.ts`) - Handles `document-preview.save` WebSocket messages. Writes updated content to file on disk. Singleton: `documentPreviewHandler`.

**WebSocket Message Types (new):**
- `document-preview.open` (server → client) - Carries `{ filePath, content }` of the opened document
- `document-preview.close` (server → client) - Signals the preview panel to close
- `document-preview.save` (client → server) - Carries `{ filePath, content }` to save edited document
- `document-preview.save.response` (server → client) - Confirmation of successful save
- `document-preview.saved` (server → all project clients) - Broadcast that a document was saved
- `document-preview.error` (server → client) - Error message (file not found, processing error)

## Integration Notes

- Preview requests are written as JSON files to `/tmp/` for filesystem-based IPC
- PreviewWatcher picks up these files automatically and broadcasts to the correct project via `webSocketManager.sendToProject(projectPath, ...)`
- The `projectPath` from the JSON file is used directly as the WebSocket project ID
- File path is resolved to absolute before writing (supports both relative and absolute input)
- Non-existent files return `document-preview.error` message to clients
- PreviewWatcher has a 50ms debounce to ensure files are fully written before reading
- Startup cleanup removes stale `/tmp/specwright-preview-*` files from previous crashes

## File Change Summary

| File | Action | Story |
|------|--------|-------|
| specwright/scripts/mcp/kanban-mcp-server.ts | Modified | DPP-001 |
| ui/src/server/services/preview-watcher.service.ts | Created | DPP-002 |
| ui/src/server/handlers/document-preview.handler.ts | Created | DPP-002 |
| ui/src/server/websocket.ts | Modified | DPP-002 |
