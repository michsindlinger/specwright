# Integration Context

> **Purpose:** Cross-story context preservation for multi-session execution.
> **Auto-updated** after each story completion.
> **READ THIS** before implementing the next story.

---

## Completed Stories

| Story | Summary | Key Changes |
|-------|---------|-------------|
| KBI-001 | Backend: Kanban Board Initialization Service | SpecsReader class with initializeKanbanBoard() method in agent-os-ui/src/server/specs-reader.ts. Creates kanban-board.md and integration-context.md from story files. Validates DoR checkboxes. Mutex lock for concurrent calls. |
| KBI-002 | Frontend: Kanban Board View Component | aos-kanban-board Lit component with DoR status indicators. StoryInfo interface now includes dorComplete field. story-card shows Ready (green) / Blocked (red) badges based on DoR completion. |
| KBI-003 | API: Board Initialization Endpoint | POST /api/specs/:specId/initialize-board route in agent-os-ui/src/server/routes/specs.ts. Express router mounted in index.ts. Returns success/boardPath or error with proper HTTP status codes. |
| KBI-004 | UI: Story Status Indicators | aos-story-status-badge Lit component with workflow status indicators (Ready/Blocked/In Progress/Done/Unknown). Used in aos-story-card. CSS styles in theme.css with color-coded badges and animations. |
| KBI-005 | Integration: Auto-Sync New Stories | SpecsReader.syncNewStories() method in agent-os-ui/src/server/specs-reader.ts. Compares story files vs kanban board to find new stories. Adds them to Backlog table, updates Board Status, adds Change Log entry. Entry point v3.1 calls sync before phase load. |

---

## New Exports & APIs

### Components
<!-- New UI components created -->
- **aos-story-status-badge** (ui/src/components/story-status-badge.ts)
  - `<aos-story-status-badge .status="${story.status}" .dorComplete="${story.dorComplete}"></aos-story-status-badge>`
  - Shows visual status indicator with color-coded badge
  - Status types: ready (green), blocked (red), in-progress (blue), done (gray), unknown (gray)
  - Includes tooltips and animations for blocked/in-progress states

### Services
<!-- New service classes/modules -->
- **SpecsReader** (agent-os-ui/src/server/specs-reader.ts)
  - `initializeKanbanBoard(projectPath: string, specId: string): Promise<KanbanInitResult>`
  - `syncNewStories(projectPath: string, specId: string): Promise<SyncNewStoriesResult>` - NEW in KBI-005
  - Parses story files (user-story-*.md, bug-*.md)
  - Creates kanban-board.md with table format
  - Creates integration-context.md
  - Validates DoR (unchecked = Blocked)
  - Mutex lock for concurrent call prevention
  - StoryInfo now includes `dorComplete: boolean` field

### Hooks / Utilities
<!-- New hooks, helpers, utilities -->
_None yet_

### Types / Interfaces
<!-- New type definitions -->
```typescript
// In specs-reader.ts:
interface StoryMetadata {
  id: string;
  title: string;
  type: 'user-story' | 'bug';
  priority: 'Critical' | 'High' | 'Medium' | 'Low';
  effort: 'XS' | 'S' | 'M' | 'L' | 'XL';
  dependencies: string[];
  dorComplete: boolean;  // true = all DoR checkboxes [x]
}

// StoryInfo used in KanbanBoard (frontend-compatible):
interface StoryInfo {
  id: string;
  title: string;
  type: string;
  priority: string;
  effort: string;
  status: 'backlog' | 'in_progress' | 'done';
  dependencies: string[];
  dorComplete: boolean;  // NEW in KBI-002: DoR completion status
}

interface KanbanBoard {
  specName: string;
  totalStories: number;
  stories: StoryInfo[];
  hasKanbanFile: boolean;
}

// NEW in KBI-005:
interface SyncNewStoriesResult {
  synced: boolean;
  newStoryCount: number;
  storyIds: string[];
  error?: string;
}
```

---

## Integration Notes

<!-- Important integration information for subsequent stories -->
**For KBI-003 (API Endpoint):** ✅ COMPLETED
- Route: POST /api/specs/:specId/initialize-board
- Import SpecsReader from `../server/specs-reader.ts`
- Call `await specsReader.initializeKanbanBoard(specPath)`
- Spec path format: `agent-os/specs/${specId}/`
- Handle errors: 404 if spec folder doesn't exist, 500 if initialization fails
- Response: { success: boolean, boardPath?: string, error?: string, alreadyExists?: boolean, blockedCount?: number }

**For KBI-002 (Frontend Kanban View):** ✅ COMPLETED
- aos-kanban-board component exists at `agent-os-ui/ui/src/components/kanban-board.ts`
- aos-story-card component shows DoR status indicators (Ready/Blocked)
- StoryInfo now includes `dorComplete: boolean` field
- CSS classes: `.dor-ready` (green), `.dor-blocked` (red with pulse animation)
- Backend parseStoryFile() now computes dorComplete from DoR section

**For KBI-004 (Story Status Indicators):** ✅ COMPLETED
- aos-story-status-badge component created in ui/src/components/story-status-badge.ts
- Status types: Ready (green), Blocked (red pulse), In Progress (blue pulse), Done (gray), Unknown (gray dashed)
- Props: status (backlog|in-progress|done|unknown), dorComplete (boolean)
- aos-story-card updated to use the new badge component
- CSS styles added to theme.css: .status-ready, .status-blocked, .status-in-progress, .status-done, .status-unknown
- Animations: pulse-red for blocked, pulse-blue for in-progress

**For KBI-005 (Auto-Sync New Stories):** ✅ COMPLETED
- `syncNewStories(projectPath: string, specId: string): Promise<SyncNewStoriesResult>` method added to SpecsReader
- Extracts story IDs from kanban-board.md using regex pattern `/\|\s*([A-Z0-9]+-\d+)\s*\|/`
- Compares story files in folder vs stories listed in kanban-board.md
- For new stories: parses metadata, adds to ## Backlog table, updates Board Status totals
- Adds Change Log entry: "{timestamp} | Synced {N} new stories: {ids}"
- Entry point v3.1 has `<kanban_sync>` step that calls this before phase load

---

## File Change Summary

| File | Action | Story |
|------|--------|-------|
| agent-os-ui/src/server/specs-reader.ts | CREATE | KBI-001 |
| agent-os-ui/src/server/specs-reader.ts | MODIFY | KBI-002 (added dorComplete field to StoryInfo and parseStoryFile) |
| agent-os-ui/ui/src/components/kanban-board.ts | MODIFY | KBI-002 (updated StoryInfo import) |
| agent-os-ui/ui/src/components/story-card.ts | MODIFY | KBI-002 (added dorComplete field and DoR status badge) |
| agent-os-ui/ui/src/styles/theme.css | MODIFY | KBI-002 (added .dor-ready, .dor-blocked styles) |
| agent-os-ui/src/server/routes/specs.ts | CREATE | KBI-003 |
| agent-os-ui/src/server/index.ts | MODIFY | KBI-003 (mounted specs router) |
| agent-os-ui/ui/src/components/story-status-badge.ts | CREATE | KBI-004 |
| agent-os-ui/ui/src/components/story-card.ts | MODIFY | KBI-004 (updated to use aos-story-status-badge, removed unused methods) |
| agent-os-ui/ui/src/styles/theme.css | MODIFY | KBI-004 (added .status-ready, .status-blocked, .status-in-progress, .status-done, .status-unknown, @keyframes pulse-blue) |
| agent-os-ui/src/server/specs-reader.ts | MODIFY | KBI-005 (added syncNewStories(), extractStoryIdsFromKanban(), addStoriesToKanban()) |
| agent-os/specs/2026-01-30-kanban-ui-initialization/spec.md | CREATE | KBI-001 |
| agent-os/specs/2026-01-30-kanban-ui-initialization/stories/*.md | CREATE | KBI-001 |
| agent-os/specs/2026-01-30-kanban-ui-initialization/kanban-board.md | CREATE | KBI-001 |
| agent-os/specs/2026-01-30-kanban-ui-initialization/integration-context.md | CREATE | KBI-001 |
