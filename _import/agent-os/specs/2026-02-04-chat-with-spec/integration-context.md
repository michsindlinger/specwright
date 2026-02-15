# Integration Context - Chat with the Spec

## Completed Stories
| Story ID | Summary | Key files/functions created |
|----------|---------|-----------------------------|
| CHAT-001 | Backend Spec Context Loading | `specs-reader.ts`: `getSpecContext`, `claude-handler.ts`: context integration |
| CHAT-002 | UI Chat Component Basics | `aos-spec-chat.ts`: Presentational chat component |
| CHAT-003 | Integriertes Kanban Chat Panel | `kanban-board.ts`: Sidebar integration, WebSocket chat routing |

## New Exports & APIs

**Components:**
- `agent-os-ui/ui/src/components/chat/aos-spec-chat.ts` -> `<aos-spec-chat .messages=${messages} .isLoading=${loading} @send-message=${handler}></aos-spec-chat>`

**Services:**
- `ClaudeHandler` in `claude-handler.ts` -> `handleChatSend(client, content, projectPath, specId)`
- `SpecsReader` in `specs-reader.ts` -> `getSpecContext(projectPath, specId)`

## Integration Notes
- Der Chat wird über den `gateway` (WebSocket) gesteuert.
- Nachrichten vom Typ `chat.send` mit optionaler `specId` triggern eine kontextsensitive Antwort von Claude.
- Das Frontend verwendet `aos-spec-chat` als Sidebar innerhalb des `aos-kanban-board`.

## File Change Summary
| File Path | Action | Story ID |
|-----------|--------|----------|
| `agent-os-ui/ui/src/components/kanban-board.ts` | Modified | CHAT-003 |
| `agent-os-ui/src/server/claude-handler.ts` | Modified | CHAT-001 |
| `agent-os-ui/src/server/specs-reader.ts` | Modified | CHAT-001 |
| `agent-os-ui/ui/src/components/chat/aos-spec-chat.ts` | Created | CHAT-002 |
