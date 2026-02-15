# UX Patterns: Agent OS Web UI

> Last Updated: 2026-01-30
> Version: 1.0.0
> Platform: Desktop Web (Local-First)

## Overview

User experience patterns for Agent OS Web UI - a local desktop web application for developers to control Claude Code through a visual interface. This document defines navigation, interaction, feedback, and accessibility patterns optimized for power users working in extended coding sessions with a dark theme.

**Target Users:** Technically proficient developers familiar with modern development tools
**Context:** Local-first application, single-user, desktop browsers only
**Design Philosophy:** Minimal, efficient, keyboard-friendly, reduced visual noise

---

## Navigation Patterns

### Primary Navigation

**Type:** Persistent Sidebar Navigation
- Collapsible sidebar with icon-only mode for maximum content area
- Fixed position (always visible)
- Dark theme consistent with developer tooling (VS Code, JetBrains style)

**Structure:**
```
Sidebar (Left, 64px collapsed / 240px expanded):
├── Project Selector (top, dropdown)
├── Main Views:
│   ├── Dashboard (Kanban icon)
│   ├── Chat (Message icon)
│   └── Workflows (Play icon)
├── Spacer
└── Settings (gear icon, bottom)
```

**Behavior:**
- Active state: Highlighted background with accent color left border (4px)
- Hover state: Subtle background highlight (#2a2a2a on #1a1a1a)
- Collapsed mode: Icons only with tooltip on hover
- Keyboard: `Cmd/Ctrl + 1/2/3` to switch views directly
- Collapse toggle: `Cmd/Ctrl + B` (VS Code convention)

### Secondary Navigation

**Type:** Contextual tabs within views

**Dashboard View:**
- Tabs: "All Projects" | "Current Project"
- Filter chips for status columns

**Chat View:**
- Session tabs (if multiple sessions supported in future)
- No secondary nav in v1.0 (single session)

**Workflow View:**
- Tabs: "Running" | "History" | "Templates"

**Usage:** Secondary navigation appears only when view requires it, not forced.

### Deep Linking

**Pattern:** Clean URL structure for bookmark/reload support
```
/                           → Dashboard (default)
/dashboard                  → Dashboard view
/dashboard/:projectId       → Dashboard filtered to project
/chat                       → Chat interface
/chat/:sessionId            → Specific chat session (future)
/workflows                  → Workflow list
/workflows/:workflowId      → Specific workflow execution
/settings                   → Settings page
```

**Behavior:**
- Preserves state on reload (selected project, active filters)
- Browser back/forward works for view navigation
- No authentication redirects (local app)

---

## User Flow Patterns

### Project Selection Flow

**Description:** User selects a project to work with across all views

**Steps:**
1. Click project selector dropdown in sidebar header
2. Dropdown shows recent projects (top) + all discovered projects
3. Select project -> All views update to show project-specific data
4. Project context persists across view switches

**Pattern:** Dropdown with search/filter

**Example:**
```
Project Selector (dropdown):
├── Search input (focus on open)
├── Recent Projects (max 5):
│   ├── agent-os-web-ui (current)
│   ├── my-saas-project
│   └── client-dashboard
├── Divider
└── All Projects (scrollable):
    ├── agent-os-extended
    ├── ...
```

**Considerations:**
- Auto-discover projects from Agent OS config
- Show project status indicator (active workflow, tasks count)
- Keyboard: Arrow keys to navigate, Enter to select, Esc to close
- Cancel: Click outside or Esc key

### Task Interaction Flow (Dashboard)

**Description:** User views and manages tasks in Kanban board

**Steps:**
1. View Dashboard with task cards in status columns
2. Click card to view task details (slide-over panel)
3. Drag card to change status OR use dropdown in detail panel
4. Optional: Click action button to start chat/workflow for task

**Pattern:** Kanban board with slide-over detail panel

**Visual Layout:**
```
┌─────────────────────────────────────────────────────────────┐
│ Dashboard                                        Filter ▾   │
├─────────────┬─────────────┬─────────────┬──────────────────┤
│ Todo (5)    │ In Progress │ Review (1)  │ Done (12)        │
│             │ (2)         │             │                  │
│ ┌─────────┐ │ ┌─────────┐ │ ┌─────────┐ │ ┌─────────┐      │
│ │ Task 1  │ │ │ Task 2  │ │ │ Task 3  │ │ │ Task 4  │      │
│ │ ─────── │ │ │ ─────── │ │ │ ─────── │ │ │ ─────── │      │
│ │ Story   │ │ │ Bug     │ │ │ Feature │ │ │ Task    │      │
│ └─────────┘ │ └─────────┘ │ └─────────┘ │ └─────────┘      │
│             │             │             │                  │
└─────────────┴─────────────┴─────────────┴──────────────────┘
```

**Considerations:**
- Cards show: Title, type badge, priority indicator, assignee (if team)
- Column headers show count
- Drag feedback: Ghost card, drop zone highlight
- Error handling: Show error toast if status change fails

### Chat Interaction Flow

**Description:** User sends messages to Claude Code and receives responses

**Steps:**
1. Enter message in input area (bottom of chat view)
2. Press Enter or click Send button
3. Message appears in history, loading indicator shows
4. Streaming response appears in real-time
5. Complete response shows with action buttons (copy, retry)

**Pattern:** Messaging interface with streaming output

**Visual Layout:**
```
┌─────────────────────────────────────────────────────────────┐
│ Chat                                      Connection: ●     │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  You                                            10:32 AM    │
│  ┌─────────────────────────────────────────────────────────┐│
│  │ Create a new Lit component for the project selector     ││
│  └─────────────────────────────────────────────────────────┘│
│                                                             │
│  Claude                                         10:32 AM    │
│  ┌─────────────────────────────────────────────────────────┐│
│  │ I'll create a project selector component...              ││
│  │                                                          ││
│  │ ```typescript                                            ││
│  │ @customElement('project-selector')                       ││
│  │ export class ProjectSelector extends LitElement {        ││
│  │ ...                                                      ││
│  │ ```                                           [Copy][▼]  ││
│  └─────────────────────────────────────────────────────────┘│
│                                                             │
├─────────────────────────────────────────────────────────────┤
│ ┌─────────────────────────────────────────────────┐ [Send] │
│ │ Type a message...                               │         │
│ └─────────────────────────────────────────────────┘         │
└─────────────────────────────────────────────────────────────┘
```

**Considerations:**
- Multi-line input: Shift+Enter for new line, Enter to send
- Code blocks: Syntax highlighting, one-click copy
- Streaming: Typewriter effect with cursor animation
- Error: Inline error message with retry button
- Connection lost: Banner at top, auto-reconnect with indicator

### Workflow Execution Flow

**Description:** User starts, monitors, and controls workflow execution

**Steps:**
1. Select workflow template or start from context action
2. Review workflow steps (expandable preview)
3. Click "Start" to begin execution
4. Monitor progress with step indicators and live output
5. Optionally pause/cancel, or wait for completion
6. Review results, access generated files

**Pattern:** Step-based progress with live output panel

**Visual Layout:**
```
┌─────────────────────────────────────────────────────────────┐
│ Workflow: execute-tasks                    [Pause] [Cancel] │
├───────────────────────┬─────────────────────────────────────┤
│ Steps                 │ Output                              │
│                       │                                     │
│ ✓ 1. Load context     │ [10:32:15] Loading user stories...  │
│ ✓ 2. Parse stories    │ [10:32:16] Found 5 stories          │
│ ● 3. Execute story 1  │ [10:32:17] Starting US-001...       │
│   4. Execute story 2  │ [10:32:18] Creating component...    │
│   5. Execute story 3  │ > import { LitElement } from 'lit'; │
│   6. Run tests        │ > ...                               │
│   7. Create PR        │                                     │
│                       │ ░░░░░░░░░░░░░░░░░░░░░░░░░░ Streaming│
├───────────────────────┴─────────────────────────────────────┤
│ Progress: Step 3 of 7                              42%  ████│
└─────────────────────────────────────────────────────────────┘
```

**Considerations:**
- Steps panel: Collapsible, shows status icons (pending, running, done, error)
- Output panel: Auto-scroll, pause on user scroll, "jump to bottom" button
- Controls: Pause changes to Resume, Cancel shows confirmation
- Completion: Success summary with links to created files/PRs

---

## Interaction Patterns

### Buttons & Actions

**Primary Action:**
- Style: Filled accent color background (blue), white text
- Placement: Right side of action areas, bottom of forms
- Label: Action-oriented verbs ("Send", "Start Workflow", "Save")
- Example: "Send", "Start", "Create Project"

**Secondary Action:**
- Style: Outlined or ghost (transparent background, accent text)
- Placement: Left of primary action, or in secondary positions
- Label: Passive verbs or navigation ("Cancel", "Back", "View Details")
- Example: "Cancel", "Skip", "More Options"

**Destructive Action:**
- Style: Red/danger color, filled or outlined depending on severity
- Confirmation: Modal for irreversible (delete), toast with undo for recoverable
- Label: Clear consequences ("Delete Task", "Cancel Workflow", "Remove")
- Example: "Delete", "Stop Workflow", "Clear History"

**Pattern:**
```
Destructive action confirmation:
1. Click "Delete Task"
2. Modal: "Delete this task?"
   - Description: "This action cannot be undone. The task and all associated data will be permanently deleted."
   - Options: "Cancel" (secondary, left) / "Delete" (destructive, right)
3. On confirm -> Action + Toast "Task deleted"
4. Workflow cancel: Toast with 3-second undo option
```

**Icon Buttons:**
- Used for: Toolbar actions, card actions, navigation
- Always include: `aria-label` for screen readers
- Hover: Tooltip after 500ms delay
- Size: Minimum 32x32px touch target

### Forms & Input

**Validation:**
- Pattern: Real-time validation on blur, re-validate on change
- Error display: Inline below field with icon and red text
- Success indication: Subtle green checkmark on valid (optional)

**Required Fields:**
- Indication: Asterisk after label
- Position: After label text

**Multi-Step Forms:**
- Pattern: Wizard with step indicators (for workflow configuration)
- Progress indicator: Numbered circles with connecting line
- Save draft: Auto-save on step change

**Chat Input:**
- Multi-line: Grows up to 5 lines, then scrolls
- Placeholder: "Type a message... (Enter to send, Shift+Enter for new line)"
- Send button: Enabled only when input has content
- Keyboard: Enter sends, Shift+Enter new line

### Drag & Drop

**Usage:** Kanban board for task status changes

**Visual Feedback:**
- Dragging: Card lifts (shadow increase), slight scale up (1.02x)
- Drag handle: Entire card is draggable (no specific handle needed)
- Drop zone: Column background highlight, dashed border at drop position
- Invalid drop: No highlight, cursor shows "not-allowed"
- Between cards: Horizontal line indicator shows insertion point

**Accessibility:**
- Keyboard alternative: Focus card, press Space to pick up, arrow keys to move, Space to drop
- Announce: "Task moved to In Progress column"

### Context Menus & Dropdowns

**Trigger:**
- Right-click on cards/items (desktop)
- Three-dot menu button (explicit)
- Keyboard: Menu key or Shift+F10 on focused element

**Behavior:**
- Position: Smart positioning (avoid viewport edges)
- Dismiss: Click outside, Esc key, or selecting an option
- Animation: Fade in (100ms), no animation out

**Dropdown Options:**
```
Task Card Context Menu:
├── View Details          Enter
├── Edit                  E
├── ─────────────
├── Move to → (submenu)
│   ├── Todo
│   ├── In Progress
│   ├── Review
│   └── Done
├── ─────────────
├── Start Chat            C
├── Start Workflow        W
├── ─────────────
└── Delete                Del
```

---

## Feedback Patterns

### Loading States

**Page Load:**
- Pattern: Skeleton screen matching content layout
- Minimum display time: 200ms (prevent flash for fast loads)
- Background: Subtle pulse animation on skeleton elements

**Button/Action Load:**
- Pattern: Spinner replaces button icon, button disabled
- Label: Keep label visible, add spinner left of text
- Example: "Sending..." with spinner

**Streaming Content (Chat/Workflow):**
- Pattern: Blinking cursor indicator at end of content
- Animation: Cursor blink (500ms interval)
- Auto-scroll: Enabled by default, paused if user scrolls up

**Long Operations (Workflow):**
- Pattern: Progress bar with step count and percentage
- Time estimate: Show estimated remaining time if calculable
- Background: WebSocket connection indicator in header

### Success Feedback

**Pattern:** Toast notification (non-blocking)

**Toast/Notification:**
- Position: Bottom-right corner
- Duration: 4 seconds (dismissible earlier)
- Icon: Checkmark in green circle
- Message: "[Action] successful" - e.g., "Task moved to Done"
- Max visible: 3 stacked, older toasts dismissed

**Chat Message Sent:**
- Immediate: Message appears in chat history
- No separate success toast (message appearing is the feedback)

**Workflow Complete:**
- Pattern: Toast + inline completion summary
- Message: "Workflow completed successfully"
- Action: "View Results" link in toast

### Error Handling

**Form Errors:**
- Pattern: Inline below field
- Color: Error red (#ef4444 or design system error color)
- Icon: Exclamation circle before message
- Message format: "Project name is required"

**API Errors:**
- Pattern: Toast notification (error variant)
- Message: User-friendly, actionable
- Example: "Failed to send message. Check your connection." (not "WebSocket Error: 1006")
- Retry: "Retry" button in toast when applicable

**Network/Connection Errors:**
- Pattern: Persistent banner at top of affected view
- Message: "Connection lost. Reconnecting..."
- Indicator: Spinner while reconnecting
- Success: Banner dismisses automatically, brief "Connected" toast

**WebSocket Disconnection:**
- Pattern: Status indicator in header changes from green to red
- Auto-reconnect: Exponential backoff (1s, 2s, 4s, 8s, max 30s)
- Manual reconnect: "Reconnect" button appears after 3 failed attempts

### Empty States

**No Projects Found:**
- Pattern: Centered illustration (simple) + message + CTA
- Message: "No Agent OS projects found"
- Description: "Add projects to your configuration to get started."
- CTA: "Open Settings" button
- Illustration: Simple folder icon with question mark

**No Tasks (Dashboard Empty):**
- Message: "No tasks in this project"
- Description: "Tasks from your specs and user stories will appear here."
- CTA: None (tasks come from Agent OS workflow)

**No Chat History:**
- Message: "Start a conversation"
- Description: "Send a message to begin interacting with Claude Code."
- CTA: Focus moves to input field automatically

**No Running Workflows:**
- Message: "No workflows running"
- Description: "Start a workflow from the Chat view or from task actions."
- CTA: "View Workflow Templates" link

**No Results (Search/Filter):**
- Message: "No tasks match your filters"
- Action: "Clear Filters" button

---

## Accessibility Patterns

### Keyboard Navigation

**Focus Order:**
- Pattern: Logical top-to-bottom, left-to-right within regions
- Skip links: Yes - "Skip to main content" link (first focusable)
- Regions: Sidebar, Header, Main Content, Footer (if any)

**Keyboard Shortcuts:**
- Global shortcuts:
  - `Cmd/Ctrl + K` - Command palette (future feature)
  - `Cmd/Ctrl + 1` - Go to Dashboard
  - `Cmd/Ctrl + 2` - Go to Chat
  - `Cmd/Ctrl + 3` - Go to Workflows
  - `Cmd/Ctrl + B` - Toggle sidebar
  - `Cmd/Ctrl + ,` - Open settings
  - `Esc` - Close modal/dropdown/panel
- Chat shortcuts:
  - `Enter` - Send message
  - `Shift + Enter` - New line in message
  - `Cmd/Ctrl + Up/Down` - Navigate message history (input)
- Dashboard shortcuts:
  - `Arrow keys` - Navigate between cards (when card focused)
  - `Space` - Pick up / drop card (drag alternative)
  - `Enter` - Open card details

**Focus Indicators:**
- Style: 2px solid outline with 2px offset
- Color: Accent color (same as primary action)
- Visible: Keyboard-only (`:focus-visible`)
- All interactive elements must have visible focus state

### Screen Readers

**ARIA Labels:**
- Icon buttons: `aria-label="Send message"`, `aria-label="Close panel"`
- Form inputs: `aria-describedby` linking to helper text and errors
- Dynamic content: `aria-live="polite"` for chat messages, workflow output
- Status updates: `aria-live="assertive"` for errors, "aria-live="polite"` for success

**Semantic HTML:**
- Use `<nav>` for sidebar navigation
- Use `<main>` for primary content area
- Use `<aside>` for detail panels
- Use `<article>` for chat messages and task cards
- Headings: `<h1>` for view title, `<h2>` for sections, etc.
- Buttons: Always `<button>`, never `<div onclick>`
- Links: Always `<a href>`, never `<span onclick>`

**Announcements:**
- Message sent: "Message sent"
- Response received: "Claude responded" (brief, don't read full response)
- Task moved: "Task moved to [column name]"
- Workflow step complete: "Step [n] complete. Now running step [n+1]"
- Error: "Error: [message]"

### Color & Contrast

**WCAG Level:** AA (minimum)

**Contrast Ratios (Dark Theme):**
- Normal text (#e4e4e7 on #0a0a0a): 15.4:1 (exceeds AAA)
- Secondary text (#a1a1aa on #0a0a0a): 7.2:1 (exceeds AA)
- UI components: Minimum 3:1 against adjacent colors
- Focus indicators: Minimum 3:1 against background

**Color Independence:**
- Status indicators: Color + icon (not color alone)
  - Error: Red + X icon
  - Success: Green + checkmark icon
  - Warning: Yellow + exclamation icon
  - Info: Blue + info icon
- Task status: Color + text label in column header
- Connection status: Color + text ("Connected" / "Disconnected")

### Focus Trapping

**Modals:**
- Focus moves to first focusable element on open (usually close button or first input)
- Tab cycles within modal (trapped)
- Esc closes modal
- Focus returns to trigger element on close
- Background interaction blocked (inert)

**Dropdowns:**
- Arrow keys navigate options
- Enter/Space selects current option
- Esc closes without selection
- Focus returns to trigger

**Slide-over Panels:**
- Focus moves to panel on open
- Tab stays within panel while open
- Esc closes panel
- Focus returns to trigger (task card) on close

---

## Mobile Patterns

**Note:** Agent OS Web UI is desktop-only in v1.0. Mobile is explicitly excluded.

### Responsive Behavior (Desktop Only)

**Minimum Viewport:** 1024px width

**Large Desktop (1440px+):**
- Sidebar expanded by default
- Three-column Kanban visible
- Chat/Workflow panels wider

**Medium Desktop (1024px - 1439px):**
- Sidebar collapsed by default (expandable)
- Full Kanban visible
- Standard panel widths

**Below 1024px:**
- Show "Desktop required" message
- No responsive mobile layout (out of scope)

---

## Error Recovery

### Undo Patterns

**When Available:**
- Task status change (move between columns)
- Workflow cancel (within grace period)
- NOT for: Sent messages (already processed by Claude)

**Pattern:**
```
Action performed -> Toast: "Task moved to In Progress. Undo?"
- "Undo" button in toast
- Click "Undo" -> Action reversed -> Toast: "Task restored to Todo"
- Wait 5s -> Toast dismissed -> Action permanent
```

### Auto-Save

**When Used:** Settings changes only (no forms in v1.0)

**Indicator:**
- Text: "Saved" (appears briefly after change)
- Position: Near settings section being edited
- Animation: Fade in, persist 2s, fade out

**Frequency:** Debounce 1000ms after last change

### Data Loss Prevention

**Chat Input:**
- Auto-save draft to localStorage
- Restore on page reload
- Clear on successful send

**Unsaved Changes:**
- Settings: Auto-save, no warning needed
- No other forms with unsaved state in v1.0

**Session Loss:**
- WebSocket disconnect: Queue messages, retry on reconnect
- Browser refresh: Chat history not persisted (explicit v1.0 exclusion)
- Show warning if user tries to close tab during active workflow

---

## Progressive Disclosure

### Information Architecture

**Pattern:** Essential first, details on demand

**Dashboard:**
- Default: Card titles, status, type badge
- On hover: Additional metadata visible
- On click: Full details in slide-over panel

**Chat:**
- Default: Messages with timestamps
- Code blocks: Collapsed if > 20 lines, "Show more" to expand
- Metadata: Hidden by default, toggle to show token count, etc. (future)

**Workflow:**
- Default: Current step, overall progress
- Expanded: All steps with individual timings, full output log

### Command Palette (Future Feature)

**Pattern:** Global search and command access

**Trigger:** `Cmd/Ctrl + K`

**Behavior:**
- Modal overlay with search input
- Recent commands, suggested actions
- Type to filter
- Keyboard navigation (arrow keys + enter)
- Categories: Navigation, Actions, Projects

---

## Search & Filter

### Dashboard Filters

**Pattern:** Filter bar above Kanban board

**Options:**
- Status: Multi-select chips (show/hide columns)
- Type: Dropdown (All, Feature, Bug, Task, Chore)
- Priority: Dropdown (All, High, Medium, Low)
- Search: Text input for task title search

**Behavior:**
- Applied: Immediately on selection
- Active filters: Shown as removable chips
- Clear: "Clear all" link when filters active
- URL: Filter state reflected in URL params

### Project Search

**Pattern:** Search input in project selector dropdown

**Behavior:**
- Debounce: 150ms
- Minimum characters: 1
- Search-as-you-type: Yes
- Highlight: Matched text in project names

---

## Implementation Guidelines

### For Lit Web Components

**Component Structure:**
```typescript
// Example: Button component
@customElement('aos-button')
export class AosButton extends LitElement {
  @property({ type: String }) variant: 'primary' | 'secondary' | 'ghost' | 'destructive' = 'primary';
  @property({ type: String }) size: 'sm' | 'md' | 'lg' = 'md';
  @property({ type: Boolean }) loading = false;
  @property({ type: Boolean }) disabled = false;

  render() {
    return html`
      <button
        class="btn btn-${this.variant} btn-${this.size}"
        ?disabled=${this.disabled || this.loading}
        aria-busy=${this.loading}
      >
        ${this.loading ? html`<aos-spinner size="sm"></aos-spinner>` : nothing}
        <slot></slot>
      </button>
    `;
  }
}
```

**CSS Custom Properties:**
```css
/* Theme variables for consistent styling */
:root {
  /* Colors */
  --color-bg-primary: #0a0a0a;
  --color-bg-secondary: #171717;
  --color-bg-tertiary: #262626;
  --color-text-primary: #e4e4e7;
  --color-text-secondary: #a1a1aa;
  --color-accent: #3b82f6;
  --color-error: #ef4444;
  --color-success: #22c55e;
  --color-warning: #f59e0b;

  /* Spacing */
  --space-xs: 4px;
  --space-sm: 8px;
  --space-md: 16px;
  --space-lg: 24px;
  --space-xl: 32px;

  /* Focus */
  --focus-ring: 2px solid var(--color-accent);
  --focus-ring-offset: 2px;
}
```

**Event Handling:**
```typescript
// Custom events for parent communication
this.dispatchEvent(new CustomEvent('task-moved', {
  detail: { taskId, fromColumn, toColumn },
  bubbles: true,
  composed: true
}));
```

---

## UX Anti-Patterns to Avoid

**Navigation:**
- No unclear active state in sidebar
- No more than 5 top-level nav items
- Consistent navigation across all views

**Forms:**
- No validation without clear feedback
- No vague error messages ("Invalid input")
- No blocking validation during typing

**Feedback:**
- No blank screens during load (always skeleton)
- No generic errors ("Something went wrong")
- No success without confirmation

**Chat Interface:**
- No messages without visual send confirmation
- No streaming without cursor indicator
- No disconnect without user notification

**Dark Theme:**
- No pure white text (too harsh, use off-white)
- No pure black backgrounds (use very dark gray)
- No low-contrast secondary elements

---

## Notes & Assumptions

**Assumptions:**
- Users are developers comfortable with keyboard shortcuts
- Desktop-only usage (no mobile optimization needed)
- Single-user application (no multi-user considerations)
- Session data is ephemeral (no persistence across restarts)
- WebSocket connection is generally reliable (local server)

**Design Decisions:**
- Sidebar navigation chosen over top nav for better content width
- Dark theme only (no light theme toggle in v1.0)
- Minimal animations to reduce distraction during coding
- Keyboard shortcuts aligned with VS Code conventions where applicable

**Areas for User Testing:**
- Drag-and-drop usability for Kanban
- Chat message streaming readability
- Workflow progress visualization clarity
- Keyboard shortcut discoverability

**Future Considerations (Post v1.0):**
- Command palette for power users
- Customizable keyboard shortcuts
- Theme customization (accent colors)
- Session persistence (localStorage)
- Mobile-responsive layout

---

*This document serves as the UX foundation for Agent OS Web UI. All frontend implementations should reference these patterns for consistency. Update this document when adding major features or receiving user feedback.*
