# Integration Context

> **Purpose:** Cross-story context preservation for multi-session execution.
> **Auto-updated** after each story completion.
> **READ THIS** before implementing the next story.

---

## Completed Stories

| Story | Summary | Key Changes |
|-------|---------|-------------|
| CFP-001 | Copy-Path Utility & Backend StoryInfo file field | New utility + StoryInfo.file mapping |
| CFP-002 | Copy-Button auf Story-Karten mit Hover + Feedback | StoryInfo.file on frontend, specId prop, copy button |
| CFP-003 | Copy-Button im Spec-Viewer-Header mit Feedback | copy-path import in kanban-board, specViewerCopySuccess state |
| CFP-004 | Copy-Button auf Spec-Doc-Tabs mit Hover + Feedback | specId prop on file-tabs, copy-path import, copiedPath state |

---

## New Exports & APIs

### Components
- `aos-story-card` → new `specId` property (String) - must be passed from parent for copy-path to work
- `aos-story-card` → `StoryInfo.file?: string` now on frontend interface (mirrors backend)
- `aos-spec-file-tabs` → new `specId` property (String, attribute: `spec-id`) - enables copy-path for each tab

### Services
_None yet_

### Hooks / Utilities
- `agent-os-ui/ui/src/utils/copy-path.ts` → `buildSpecFilePath(specId, relativePath)` - Builds full spec file path
- `agent-os-ui/ui/src/utils/copy-path.ts` → `copyPathToClipboard(path, button)` - Copies to clipboard with visual feedback

### Types / Interfaces
- `agent-os-ui/src/server/specs-reader.ts` → `StoryInfo.file?: string` - Relative path to story file within spec folder

---

## Integration Notes

- `buildSpecFilePath` combines specId + relativePath into `agent-os/specs/{specId}/{relativePath}`
- `copyPathToClipboard` adds CSS class `copy-path--copied` for 2 seconds for visual feedback
- `StoryInfo.file` is populated from `storyFile || file` in kanban.json, supporting both v1 and v2 formats
- Next stories (CFP-003, CFP-004) should import from `../../utils/copy-path.ts`
- `kanban-board.ts` passes `.specId=${this.kanban.specId}` to every `aos-story-card` in `renderColumn()`
- Copy button uses `e.stopPropagation()` to prevent triggering `story-select` event
- Button appears on hover (opacity 0→1 transition), switches clipboard→checkmark SVG for 2s after copy
- Spec-Viewer-Header copy button is always visible (not hover-dependent), wrapped in `.spec-viewer-header-left` div
- `specViewerCopySuccess` state drives icon switch (clipboard→checkmark) for 2s
- CFP-004 implemented: `aos-spec-file-tabs` now imports `copy-path.ts`, has `specId` prop, and renders copy icon per tab
- Copy icon appears on hover (opacity 0→1), `e.stopPropagation()` prevents tab switch, `copiedPath` state drives icon switch

---

## File Change Summary

| File | Action | Story |
|------|--------|-------|
| agent-os-ui/ui/src/utils/copy-path.ts | Created | CFP-001 |
| agent-os-ui/src/server/specs-reader.ts | Modified | CFP-001 |
| agent-os-ui/ui/src/components/story-card.ts | Modified | CFP-002 |
| agent-os-ui/ui/src/components/kanban-board.ts | Modified | CFP-002, CFP-003, CFP-004 |
| agent-os-ui/ui/src/components/specs/aos-spec-file-tabs.ts | Modified | CFP-004 |
