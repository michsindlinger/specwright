# Integration Context

> **Purpose:** Cross-story context preservation for multi-session execution.
> **Auto-updated** after each story completion.
> **READ THIS** before implementing the next story.

---

## Completed Stories

| Story | Summary | Key Changes |
|-------|---------|-------------|
| CMDR-001 | Markdown parser with highlight.js | markdown-renderer.ts, chat-message.ts refactored |
| CMDR-002 | Chat-specific markdown styling | theme.css with .chat-message .markdown-body styles |
| CMDR-003 | Enhanced copy button with feedback | Event delegation in chat-message.ts, CSS states |
| CMDR-004 | Mermaid diagram rendering with dark theme | mermaid init in chat-message.ts, custom renderer for mermaid blocks |
| CMDR-005 | Streaming optimization with debouncing | Debounced RAF rendering, incomplete block detection |
| CMDR-999 | Integration & E2E Validation | Validated all stories - build, lint, type-check, deps all pass |

---

## New Exports & APIs

### Components
<!-- New UI components created -->
- `aos-chat-message` - Now uses markdown rendering via `renderMarkdown()`, handles copy button clicks via event delegation

### Services
<!-- New service classes/modules -->
_None yet_

### Hooks / Utilities
<!-- New hooks, helpers, utilities -->
- `agent-os-ui/ui/src/utils/markdown-renderer.ts` → `renderMarkdown(content: string): string` - Renders markdown to HTML with highlight.js syntax highlighting and mermaid placeholders
- `agent-os-ui/ui/src/utils/markdown-renderer.ts` → `renderMarkdownSync(content: string): string` - Alias for streaming contexts
- `agent-os-ui/ui/src/utils/markdown-renderer.ts` → `renderMarkdownStreaming(content: string): string` - Streaming-aware renderer that handles incomplete code blocks gracefully
- `agent-os-ui/ui/src/utils/markdown-renderer.ts` → `hasIncompleteStructures(content: string)` - Detects incomplete code blocks/tables during streaming
- `agent-os-ui/ui/src/utils/markdown-renderer.ts` → `escapeHtml(text: string): string` - XSS prevention utility (exported)
- `agent-os-ui/ui/src/components/chat-message.ts` → `renderMermaidDiagrams()` - Private method that renders mermaid diagrams after DOM update
- `agent-os-ui/ui/src/components/chat-message.ts` → `scheduleStreamingRender(content: string)` - Private method for debounced streaming updates

### Types / Interfaces
<!-- New type definitions -->
_None yet_

---

## Integration Notes

<!-- Important integration information for subsequent stories -->
- **marked configuration**: GFM enabled, breaks: true for chat context
- **Code blocks**: Have `.code-block` wrapper with `.code-header` (language + copy button) and `<pre><code>` inside
- **Copy button**: Uses `data-code` attribute with escaped content; click handled via event delegation in chat-message.ts
- **Copy button feedback**: Classes `.copy-btn--copied` (success) and `.copy-btn--error` (failure) with 2s auto-reset
- **Keyboard accessibility**: Copy button has tabindex="0", responds to Enter/Space keys
- **XSS prevention**: `escapeHtml()` function available in markdown-renderer.ts
- **Pattern match**: Follows aos-docs-viewer.ts pattern with custom renderer for highlight.js
- **CSS Scoping**: All chat markdown styles scoped with `.chat-message .markdown-body` selector
- **Dark theme colors**: Code blocks use #1e1e1e, tables use zebra stripes with hover
- **Table overflow**: Wide tables are horizontally scrollable via overflow-x: auto
- **Mermaid diagrams**: Custom renderer generates `.mermaid-container` with `data-mermaid` attribute storing diagram code
- **Mermaid rendering**: Happens in `updated()` lifecycle hook via `mermaid.render()` with unique IDs
- **Mermaid error handling**: Fallback shows error message + raw mermaid code on syntax errors
- **Mermaid theme**: Dark theme configured with Moltbot-style colors (primaryColor: #3b82f6, background: #1e1e1e)
- **Mermaid security**: `securityLevel: 'strict'` for XSS prevention
- **Streaming debounce**: 50ms timeout + requestAnimationFrame for smooth updates
- **Streaming cache**: `_renderedContent` and `_lastRenderedContent` prevent redundant re-renders
- **Incomplete block detection**: Code blocks with odd number of ``` are shown as plaintext during streaming
- **Streaming-aware parsing**: `renderMarkdownStreaming()` separates complete from incomplete portions

---

## File Change Summary

| File | Action | Story |
|------|--------|-------|
| agent-os-ui/ui/src/utils/markdown-renderer.ts | Created | CMDR-001 |
| agent-os-ui/ui/src/components/chat-message.ts | Modified | CMDR-001 |
| agent-os-ui/ui/src/styles/theme.css | Modified | CMDR-002 |
| agent-os-ui/ui/src/utils/markdown-renderer.ts | Modified | CMDR-003 |
| agent-os-ui/ui/src/components/chat-message.ts | Modified | CMDR-003 |
| agent-os-ui/ui/src/styles/theme.css | Modified | CMDR-003 |
| agent-os-ui/ui/package.json | Modified | CMDR-004 |
| agent-os-ui/ui/src/utils/markdown-renderer.ts | Modified | CMDR-004 |
| agent-os-ui/ui/src/components/chat-message.ts | Modified | CMDR-004 |
| agent-os-ui/ui/src/styles/theme.css | Modified | CMDR-004 |
| agent-os-ui/ui/src/utils/markdown-renderer.ts | Modified | CMDR-005 |
| agent-os-ui/ui/src/components/chat-message.ts | Modified | CMDR-005 |
