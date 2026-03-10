# Integration Context - Document Preview Panel

## Completed Stories

| Story ID | Summary | Key Files/Functions |
|----------|---------|---------------------|
| DPP-001 | MCP-Tools document_preview_open & close | specwright/scripts/mcp/kanban-mcp-server.ts |

## New Exports & APIs

**MCP Tools:**
- `document_preview_open` - Opens a document in the preview panel. Input: `{ filePath: string }`. Creates `/tmp/specwright-preview-<projectHash>.json` with `{ action: 'open', filePath, projectPath, timestamp }`.
- `document_preview_close` - Closes the preview panel. No input required. Creates `/tmp/specwright-preview-<projectHash>.json` with `{ action: 'close', filePath: null, projectPath, timestamp }`.

**Project Hash:** `createHash('md5').update(cwd).digest('hex').slice(0, 8)` - ensures unique file per project.

## Integration Notes

- Preview requests are written as JSON files to `/tmp/` for filesystem-based IPC
- The UI (DPP-002) needs to watch for changes to `/tmp/specwright-preview-<projectHash>.json`
- File path is resolved to absolute before writing (supports both relative and absolute input)
- Non-existent files return `{ success: false, error: 'File not found' }`

## File Change Summary

| File | Action | Story |
|------|--------|-------|
| specwright/scripts/mcp/kanban-mcp-server.ts | Modified | DPP-001 |
