# Integration Context - Context Menu Spec

> **Purpose:** Track completed stories, exports, and integration points for cross-session development.

## Completed Stories

| Story ID | Summary | Key Files/Functions Created |
|----------|---------|------------------------------|
| CTX-001 | Context Menu Component | `aos-context-menu.ts` - Context menu with 4 workflow actions |
| CTX-002 | Global Event Handler | `app.ts` - Global contextmenu listener, menu-item-select handler |
| CTX-003 | Generic Workflow Modal | `aos-workflow-modal.ts`, `aos-confirm-dialog.ts` - Modal and dialog components |
| CTX-004 | Spec Selector Component | `aos-spec-selector.ts` - Modal spec list with search |
| CTX-005 | Add Story Flow Integration | `app.ts`, `workflow-card.ts` - Complete add-story workflow |
| CTX-006 | Integration & Styling | `theme.css` - Verified all styles (already present from CTX-001,003,004) |

## New Exports & APIs

### Components

- `agent-os-ui/ui/src/components/aos-context-menu.ts` → `<aos-context-menu>` - Context menu component

**Usage:**
```typescript
import 'agent-os-ui/ui/src/components/aos-context-menu.ts';

// Get reference to element
const menu = document.querySelector<AosContextMenu>('aos-context-menu');

// Show at position
menu?.show(x, y);

// Hide programmatically
menu?.hide();
```

**API:**
- `show(x: number, y: number): void` - Show menu at specified coordinates
- `hide(): void` - Hide the menu
- Events: `menu-item-select` - Fired with `{ action: string }` detail

**Actions:**
- `create-spec` - "Neue Spec erstellen"
- `create-bug` - "Bug erstellen"
- `create-todo` - "TODO erstellen"
- `add-story` - "Story zu Spec hinzufügen"

### Workflow Modal (CTX-003)

- `agent-os-ui/ui/src/components/aos-workflow-modal.ts` → `<aos-workflow-modal>` - Generic modal for workflows

**Usage:**
```typescript
import 'agent-os-ui/ui/src/components/aos-workflow-modal.ts';

const modal = document.querySelector<AosWorkflowModal>('aos-workflow-modal');
modal?.open = true;
modal?.command = { id: 'agent-os:create-bug', name: 'Bug erstellen', description: '...' };
```

**API:**
- `open: boolean` - Modal open state
- `command: WorkflowCommand` - The workflow command to display
- Events: `workflow-start-interactive`, `modal-close`
- z-index: 1001

### Confirm Dialog (CTX-003)

- `agent-os-ui/ui/src/components/aos-confirm-dialog.ts` → `<aos-confirm-dialog>` - Confirmation dialog

**Usage:**
```typescript
const dialog = document.querySelector<AosConfirmDialog>('aos-confirm-dialog');
dialog?.open = true;
dialog?.title = 'Änderungen verwerfen?';
dialog?.message = 'Sie haben ungespeicherte Änderungen...';
```

**API:**
- `open: boolean` - Dialog open state
- `title: string` - Dialog title
- `message: string` - Dialog message
- Events: `confirm`, `cancel`
- z-index: 1002

### Spec Selector (CTX-004)

- `agent-os-ui/ui/src/components/aos-spec-selector.ts` → `<aos-spec-selector>` - Modal spec selector with search

**Usage:**
```typescript
import 'agent-os-ui/ui/src/components/aos-spec-selector.ts';

const selector = document.querySelector<AosSpecSelector>('aos-spec-selector');
selector?.show();

// Listen for spec selection
document.addEventListener('spec-selected', (e: CustomEvent<SpecSelectedEventDetail>) => {
  const { spec } = e.detail;
  console.log('Selected spec:', spec);
});
```

**API:**
- `show(): void` - Open the spec selector modal
- `hide(): void` - Close the spec selector modal
- Events: `spec-selected` - Fired with `{ spec: SpecInfo }` detail
- Gateway: Uses `specs.list` WebSocket message type
- z-index: 1001

### Event Handlers (app.ts)

- `handleContextMenu(event: MouseEvent): void` - Global right-click handler
  - Prevents browser context menu
  - Shows aos-context-menu at cursor position
  - Guard: Don't show if modal is open

- `handleMenuItemSelect(event: CustomEvent<MenuSelectEventDetail>): void` - Menu action handler
  - Receives selected action from context menu
  - Opens workflow modal for all 4 actions:
    - `create-spec` → Opens modal with `agent-os:create-spec` workflow (mode='direct')
    - `create-bug` → Opens modal with `agent-os:add-bug` workflow (mode='direct')
    - `create-todo` → Opens modal with `agent-os:add-todo` workflow (mode='direct')
    - `add-story` → Opens modal with `agent-os:add-story` workflow (mode='add-story', shows spec selector)

## Integration Notes

### Light DOM Pattern
All modal components use `createRenderRoot()` to render in Light DOM (like `aos-create-spec-modal.ts`):
- `aos-context-menu.ts`
- `aos-workflow-modal.ts`
- `aos-confirm-dialog.ts`

### Styling
All modal styles use CSS Custom Properties from `theme.css`:
- `--color-bg-elevated` - Background color
- `--color-border` - Border color
- `--color-text-primary` - Text color
- `--radius-lg` - Border radius
- `--shadow-lg` - Drop shadow
- z-index hierarchy: context-menu(1000) < workflow-modal(1001) < confirm-dialog(1002)

### Animation
Uses `modal-fade-in` animation for modals (similar to `lightbox-fade-in` in theme.css).

### Event Pattern
Follows the same event dispatch pattern as `workflow-card.ts`:
```typescript
new CustomEvent('menu-item-select', {
  detail: { action } as MenuSelectEventDetail,
  bubbles: true,
  composed: true
})
```

### Global Context Menu Integration
- Context menu is always rendered in DOM (not conditionally)
- Shows via `show(x, y)` method call from app.ts
- Closes itself when item is clicked or outside click
- Guard prevents showing when `showAddProjectModal` is true

### Modal Dirty State Tracking (CTX-003)
- `aos-workflow-modal` tracks dirty state via input events from `aos-workflow-card`
- When dirty: Shows `aos-confirm-dialog` on ESC or outside click
- When clean: Closes immediately on ESC or outside click
- Pattern: Listen for `input` events on workflow-card to detect user input

## File Change Summary

| File Path | Created/Modified | Story ID |
|-----------|------------------|----------|
| `agent-os-ui/ui/src/components/aos-context-menu.ts` | Created | CTX-001 |
| `agent-os-ui/ui/src/styles/theme.css` | Modified | CTX-001, CTX-003, CTX-004, CTX-006 |
| `agent-os-ui/ui/src/app.ts` | Modified | CTX-002, CTX-005 |
| `agent-os-ui/ui/src/components/aos-workflow-modal.ts` | Created | CTX-003, CTX-005 |
| `agent-os-ui/ui/src/components/aos-confirm-dialog.ts` | Created | CTX-003 |
| `agent-os-ui/ui/src/components/aos-spec-selector.ts` | Created | CTX-004 |
| `agent-os-ui/ui/src/components/workflow-card.ts` | Modified | CTX-005 |

## Styling Summary (CTX-006)

All component styles are located in `theme.css` with proper z-index hierarchy:
- `.context-menu` (z-index: 1000) - Lines 7589-7643
- `.workflow-modal` (z-index: 1001) - Lines 7391-7484
- `.spec-selector` (z-index: 1001) - Lines 7649-7958
- `.confirm-dialog` (z-index: 1002) - Lines 7490-7583

All styles use CSS Custom Properties (no hardcoded colors) and follow BEM naming.
