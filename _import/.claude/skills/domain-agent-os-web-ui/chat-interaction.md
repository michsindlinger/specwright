# Domain: Chat Interaction

## Overview

How users interact with Claude Code through the chat interface.

## Message Flow

1. User types message in input area
2. Message is sent via WebSocket to backend
3. Backend forwards to Agent SDK
4. Claude Code processes the request
5. Response streams back via WebSocket
6. UI renders chunks as they arrive

## Message Types

### User Messages
- Free-form text input
- Multi-line supported (Shift+Enter)
- Maximum length: 10,000 characters

### Assistant Messages
- Streamed in real-time (typewriter effect)
- May contain code blocks (syntax highlighted)
- May contain formatted markdown

## Session State

- Messages are stored in memory during session
- Session ends when browser tab closes
- No persistence across restarts (v1.0 limitation)

## Connection Status

The UI displays connection status:
- **Connected** (green): WebSocket open, ready to send
- **Disconnected** (red): WebSocket closed, auto-reconnecting
- **Reconnecting**: Attempting to restore connection

## Error Handling

- Network errors show banner with retry option
- Agent errors show inline in chat as error messages
- Long operations can be cancelled

---

*Last Updated: 2026-01-30*
