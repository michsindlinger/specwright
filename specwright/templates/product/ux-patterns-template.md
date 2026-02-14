# UX Patterns: [PROJECT_NAME]

> Last Updated: [DATE]
> Version: 1.0.0
> Platform: [WEB/MOBILE/DESKTOP/HYBRID]

## Overview

User experience patterns for [PROJECT_NAME]. This document defines navigation, interaction, feedback, and accessibility patterns for consistent and intuitive user experience.

---

## Navigation Patterns

### Primary Navigation

**Type:** [NAVIGATION_TYPE]
- Top Navigation Bar
- Sidebar Navigation
- Tab Navigation
- Bottom Navigation (mobile)
- Command Palette

**Structure:**
```
[NAVIGATION_STRUCTURE]

Example:
- Logo (home link)
- Main sections (Dashboard, Projects, Settings)
- User menu (Profile, Logout)
- Notifications (icon with badge)
```

**Behavior:**
- Active state: [ACTIVE_INDICATION]
- Hover state: [HOVER_BEHAVIOR]
- Mobile: [MOBILE_NAVIGATION_PATTERN]
- Keyboard: [KEYBOARD_SHORTCUTS]

### Secondary Navigation

**Type:** [SECONDARY_NAV_TYPE]
- Tabs (within page)
- Sidebar menu (sub-items)
- Breadcrumbs
- Pagination

**Usage:** [WHEN_TO_USE]

### Deep Linking

**Pattern:** [URL_STRUCTURE]
```
Example:
/projects/:id/tasks/:taskId
/settings/profile
```

**Behavior:**
- Preserves state on reload
- Shareable URLs
- Browser back/forward works

---

## User Flow Patterns

### [PRIMARY_FLOW_1]

**Description:** [WHAT_IS_THIS_FLOW]

**Steps:**
1. [STEP_1]
2. [STEP_2]
3. [STEP_3]

**Pattern:** [WIZARD/SINGLE_PAGE/MODAL/INLINE]

**Example:**
```
User creates a new project:
1. Click "New Project" button
2. Modal opens with form (name, description, template)
3. Submit → Success toast → Redirect to project page
```

**Considerations:**
- [MOBILE_BEHAVIOR]
- [ERROR_HANDLING]
- [CANCEL_BEHAVIOR]

### [PRIMARY_FLOW_2]

**Description:** [WHAT_IS_THIS_FLOW]

**Steps:**
1. [STEP_1]
2. [STEP_2]
3. [STEP_3]

**Pattern:** [PATTERN_TYPE]

### [PRIMARY_FLOW_3]

**Description:** [WHAT_IS_THIS_FLOW]

**Steps:**
1. [STEP_1]
2. [STEP_2]
3. [STEP_3]

**Pattern:** [PATTERN_TYPE]

---

## Interaction Patterns

### Buttons & Actions

**Primary Action:**
- Style: [STYLE_DESCRIPTION]
- Placement: [WHERE_POSITIONED]
- Label: [LABEL_CONVENTION]
- Example: "Save", "Create Project", "Submit"

**Secondary Action:**
- Style: [STYLE_DESCRIPTION]
- Placement: [WHERE_POSITIONED]
- Label: [LABEL_CONVENTION]
- Example: "Cancel", "Back", "Skip"

**Destructive Action:**
- Style: [STYLE_DESCRIPTION]
- Confirmation: [CONFIRMATION_PATTERN]
- Label: [LABEL_CONVENTION]
- Example: "Delete", "Remove", "Archive"

**Pattern:**
```
Destructive actions:
1. Click "Delete"
2. Modal: "Are you sure? This cannot be undone."
3. Options: "Cancel" (secondary) / "Delete" (destructive, primary)
4. On confirm → Action + Success feedback
5. Option: Undo within 5 seconds (if possible)
```

### Forms & Input

**Validation:**
- Pattern: [INLINE/ON_SUBMIT/REAL_TIME]
- Error display: [INLINE_BELOW/TOOLTIP/TOP_OF_FORM]
- Success indication: [GREEN_CHECKMARK/NONE]

**Required Fields:**
- Indication: [ASTERISK/LABEL_SUFFIX/BORDER_COLOR]
- Position: [BEFORE/AFTER_LABEL]

**Multi-Step Forms:**
- Pattern: [WIZARD_WITH_PROGRESS/TABS/ACCORDION]
- Progress indicator: [STEPS_BAR/PERCENTAGE/NUMBERED_CIRCLES]
- Save draft: [AUTO_SAVE/MANUAL_SAVE_BUTTON]

**Autocomplete/Search:**
- Debounce: [MILLISECONDS]
- Minimum characters: [NUMBER]
- Results display: [DROPDOWN/OVERLAY/INLINE]
- No results: [MESSAGE_PATTERN]

### Drag & Drop

**Usage:** [WHERE_USED]
- Reordering lists
- File upload
- Moving items between categories

**Visual Feedback:**
- Dragging: [VISUAL_INDICATOR]
- Drop zone: [HIGHLIGHT_PATTERN]
- Invalid drop: [ERROR_INDICATION]

### Context Menus & Dropdowns

**Trigger:**
- Right-click (desktop)
- Three-dot menu (mobile)
- Long-press (mobile)

**Behavior:**
- Position: [NEAR_CURSOR/BELOW_TRIGGER/SMART_POSITION]
- Dismiss: [CLICK_OUTSIDE/ESC_KEY/BACKDROP]

---

## Feedback Patterns

### Loading States

**Page Load:**
- Pattern: [SKELETON_SCREEN/SPINNER/PROGRESS_BAR]
- Minimum display time: [MILLISECONDS] (prevent flash)

**Button/Action Load:**
- Pattern: [SPINNER_IN_BUTTON/DISABLED_STATE/LOADING_TEXT]
- Label: "Saving..." / "Loading..." / "Processing..."

**Partial Load:**
- Pattern: [PROGRESSIVE_DISCLOSURE/LAZY_LOAD/INFINITE_SCROLL]
- Indicator: [SPINNER_AT_BOTTOM/LOAD_MORE_BUTTON]

**Long Operations:**
- Pattern: [PROGRESS_BAR/PERCENTAGE/ESTIMATED_TIME]
- Background processing: [TOAST_ON_COMPLETE/NOTIFICATION]

### Success Feedback

**Pattern:** [TOAST/INLINE_MESSAGE/PAGE_REDIRECT/MODAL]

**Toast/Notification:**
- Position: [TOP_RIGHT/BOTTOM_RIGHT/TOP_CENTER]
- Duration: [SECONDS] (dismissible earlier)
- Icon: [CHECKMARK_GREEN]
- Message: "[ACTION] successful" or "[ITEM] created"

**Inline:**
- Position: [TOP_OF_FORM/NEAR_ACTION]
- Auto-dismiss: [YES/NO]

**Redirect:**
- When: [AFTER_CREATE/AFTER_SUBMIT]
- Target: [DETAIL_PAGE/LIST_PAGE]

### Error Handling

**Form Errors:**
- Pattern: [INLINE_BELOW_FIELD/TOP_OF_FORM/BOTH]
- Color: [ERROR_COLOR_FROM_DESIGN_SYSTEM]
- Icon: [ERROR_ICON/NONE]
- Message format: "Field is required" / "Invalid email format"

**API Errors:**
- Pattern: [TOAST/MODAL/INLINE_ALERT]
- Message: [USER_FRIENDLY_NOT_TECHNICAL]
- Example: "Failed to save. Please try again." (not "Error 500: Internal Server Error")
- Retry: [RETRY_BUTTON/AUTO_RETRY/MANUAL_ONLY]

**Network Errors:**
- Pattern: [OFFLINE_BANNER/MODAL/TOAST]
- Message: "You're offline. Changes will sync when reconnected."
- Behavior: [QUEUE_CHANGES/READ_ONLY_MODE]

**Validation Errors:**
- Timing: [ON_BLUR/ON_SUBMIT/REAL_TIME]
- Clear on: [ON_FIX/ON_CHANGE/MANUAL_DISMISS]

### Empty States

**No Data (First Run):**
- Pattern: [ILLUSTRATION_+_CTA/TEXT_+_BUTTON/ONBOARDING_TOUR]
- Message: "No projects yet. Create your first project to get started."
- CTA: [PRIMARY_ACTION_BUTTON]

**No Results (Search/Filter):**
- Pattern: [MESSAGE_+_CLEAR_FILTERS/SUGGESTIONS]
- Message: "No results found for '[QUERY]'. Try different keywords."
- Action: [CLEAR_FILTERS_BUTTON/SEARCH_SUGGESTIONS]

**Error State:**
- Pattern: [ERROR_ILLUSTRATION/MESSAGE/RETRY_BUTTON]
- Message: "Something went wrong. Please try again."
- CTA: [RETRY_BUTTON/CONTACT_SUPPORT_LINK]

**Loading Failed:**
- Pattern: [INLINE_ERROR/PLACEHOLDER_WITH_ERROR]
- Retry: [AUTOMATIC/MANUAL_RETRY_BUTTON]

---

## Empty States

### First-Run Empty State

**Pattern:** [ONBOARDING_TOUR/CTA_WITH_ILLUSTRATION/GETTING_STARTED_CHECKLIST]

**Example:**
```
Dashboard (no projects):
- Illustration (friendly, on-brand)
- Headline: "Welcome to [PROJECT_NAME]!"
- Description: "Create your first project to start managing tasks."
- Button: "Create Project" (primary CTA)
- Link: "Import from [other tool]" (secondary action)
```

### No Results

**Search:** [MESSAGE_PATTERN]
**Filter:** [CLEAR_FILTERS_PATTERN]
**List:** [EMPTY_LIST_PATTERN]

---

## Accessibility Patterns

### Keyboard Navigation

**Focus Order:**
- Pattern: [LOGICAL_TOP_TO_BOTTOM/LEFT_TO_RIGHT]
- Skip links: [YES/NO] (skip to main content)

**Keyboard Shortcuts:**
- Trigger: [KEY_COMBINATIONS]
- Examples:
  - `Cmd/Ctrl + K` → Command palette
  - `Cmd/Ctrl + S` → Save
  - `Esc` → Close modal/dropdown
  - `Tab` → Next focusable element
  - `Shift + Tab` → Previous focusable element

**Focus Indicators:**
- Style: [OUTLINE/BORDER/BACKGROUND_CHANGE]
- Color: [FOCUS_COLOR_FROM_DESIGN_SYSTEM]
- Visible: [ALWAYS/ON_KEYBOARD_ONLY]

### Screen Readers

**ARIA Labels:**
- Icon buttons: `aria-label="[ACTION]"`
- Form inputs: `aria-describedby="[HELPER_TEXT_ID]"`
- Dynamic content: `aria-live="polite"`

**Semantic HTML:**
- Use `<nav>`, `<main>`, `<aside>`, `<header>`, `<footer>`
- Headings: Hierarchical `<h1>` → `<h6>`
- Buttons: `<button>` not `<div onclick>`
- Links: `<a href>` not `<span onclick>`

**Image Alt Text:**
- Decorative images: `alt=""` (empty)
- Informative images: `alt="[DESCRIPTION]"`
- Charts/graphs: `alt="[TEXT_ALTERNATIVE]"` + longer description

### Color & Contrast

**WCAG Level:** [AA/AAA]

**Contrast Ratios:**
- Normal text: [RATIO]:1 (minimum 4.5:1 for AA, 7:1 for AAA)
- Large text: [RATIO]:1 (minimum 3:1 for AA, 4.5:1 for AAA)
- UI components: [RATIO]:1 (minimum 3:1)

**Color Independence:**
- Don't rely on color alone (use icons, text, patterns)
- Error fields: Red border + error icon + error text
- Success states: Green + checkmark + text

### Focus Trapping

**Modals:**
- Focus moves to modal on open
- Tab cycles within modal
- Esc closes modal
- Focus returns to trigger element on close

**Dropdowns:**
- Arrow keys navigate options
- Enter selects
- Esc closes

---

## Mobile Patterns

### Touch Targets

**Minimum Size:** 44x44px (iOS) / 48x48dp (Android)

**Spacing:** [SPACING_BETWEEN_TARGETS]

**Hover States:**
- Pattern: [ACTIVE_STATE_ON_TOUCH/NO_HOVER]
- Feedback: [VISUAL_PRESS_STATE]

### Gestures

**Swipe:**
- Usage: [WHERE_USED]
- Direction: [LEFT/RIGHT/UP/DOWN]
- Action: [DELETE/ARCHIVE/NAVIGATE]

**Pull-to-Refresh:**
- Usage: [YES/NO]
- Indicator: [SPINNER/ANIMATION]

**Long-Press:**
- Usage: [CONTEXT_MENU/SELECTION_MODE]
- Feedback: [HAPTIC/VISUAL]

**Pinch-to-Zoom:**
- Usage: [IMAGES/MAPS/DISABLED]

### Bottom Navigation

**Usage:** [YES/NO]

**Items:** [NUMBER] (recommended 3-5)

**Icons + Labels:** [ICONS_ONLY/ICONS_+_LABELS/LABELS_ON_ACTIVE]

**Active State:** [COLOR_CHANGE/ICON_FILL/UNDERLINE]

### Mobile-Specific

**Text Size:** Minimum 16px (no zoom on focus)

**Form Inputs:**
- Input type: Use `type="email"`, `type="tel"` for keyboard
- Autocomplete: Enable where appropriate

**Viewport:**
- No horizontal scroll
- Content reflows
- Images scale

**Offline:**
- Pattern: [OFFLINE_BANNER/READ_ONLY_MODE/QUEUE_CHANGES]
- Indicator: [BANNER_AT_TOP/ICON_IN_NAV]

---

## Error Recovery

### Undo Patterns

**When Available:**
- Delete actions (undo within 5 seconds)
- Bulk actions
- State changes

**Pattern:**
```
Action performed → Toast: "[ACTION] successful. Undo?"
Click "Undo" → Action reversed → Toast: "Undone"
Wait 5s → Toast dismissed → Action permanent
```

### Auto-Save

**When Used:** [LONG_FORMS/DRAFT_CONTENT/SETTINGS]

**Indicator:**
- Text: "Saved" / "Saving..." / "All changes saved"
- Icon: [CHECKMARK/CLOUD_ICON]
- Position: [TOP_RIGHT/BOTTOM_RIGHT/INLINE]

**Frequency:** [DEBOUNCE_TIME] after last change

### Data Loss Prevention

**Unsaved Changes:**
- Pattern: [MODAL_ON_NAVIGATE/BROWSER_CONFIRM/AUTO_SAVE]
- Message: "You have unsaved changes. Leave without saving?"
- Options: "Stay" / "Leave" / "Save & Leave"

**Session Timeout:**
- Warning: [TIME_BEFORE_LOGOUT]
- Pattern: [MODAL/BANNER]
- Action: "Continue Session" / "Logout"

---

## Progressive Disclosure

### Information Architecture

**Pattern:** [SHOW_ESSENTIAL_FIRST/ADVANCED_IN_ACCORDION/SEPARATE_SECTIONS]

**Example:**
```
Settings page:
- Essential settings visible
- Advanced settings in expandable section
- Rarely-used settings in separate "Advanced" tab
```

### Onboarding

**Pattern:** [PRODUCT_TOUR/TOOLTIPS/CHECKLIST/VIDEO]

**Behavior:**
- Dismissible
- Repeatable (help menu)
- Skip option
- Progress indicator

---

## Search & Filter

### Search

**Pattern:** [GLOBAL_SEARCH/SCOPED_SEARCH/BOTH]

**Behavior:**
- Debounce: [MILLISECONDS]
- Minimum characters: [NUMBER]
- Search-as-you-type: [YES/NO]
- Highlight results: [YES/NO]

**Results:**
- Pattern: [DROPDOWN/PAGE/OVERLAY]
- Grouping: [BY_TYPE/BY_RELEVANCE]
- No results: [MESSAGE_+_SUGGESTIONS]

### Filters

**Pattern:** [SIDEBAR/TOP_BAR/DROPDOWN/MODAL]

**Behavior:**
- Applied: [ON_SELECT/ON_APPLY_BUTTON]
- Active filters: [CHIPS/BADGES/LIST]
- Clear: [CLEAR_INDIVIDUAL/CLEAR_ALL]

**Faceted Search:**
- Count: Show item counts per facet
- Disabled: Gray out facets with 0 results

---

## Notifications

### In-App Notifications

**Types:**
- System (updates, maintenance)
- User actions (someone commented, task assigned)
- Errors (payment failed, sync error)

**Pattern:** [BELL_ICON_WITH_BADGE/NOTIFICATION_CENTER/TOAST]

**Behavior:**
- Unread indicator: [BADGE_COUNT/DOT]
- Mark as read: [ON_VIEW/ON_CLICK/MANUAL]
- Dismiss: [SWIPE/X_BUTTON/AUTO_AFTER_TIME]

### Email/Push Notifications

**Preferences:** [USER_CONTROLLABLE/PRESET]

**Frequency:** [REAL_TIME/DIGEST/OFF]

---

## Implementation Guidelines

### For React/Vue/Angular

**Component Structure:**
```tsx
// Example: Button component
<Button
  variant="primary|secondary|outline|ghost"
  size="sm|md|lg"
  loading={boolean}
  disabled={boolean}
  onClick={handler}
>
  Label
</Button>
```

**Pattern Library:**
- Use [UI_LIBRARY_NAME] components
- Extend with custom variants
- Document in Storybook (optional)

### For Mobile (React Native/Flutter)

**Platform-Specific:**
- iOS: Follow HIG for navigation, gestures
- Android: Follow Material for bottom nav, FAB

**Adaptive:**
- Use platform-specific components where appropriate
- Match platform conventions

---

## UX Anti-Patterns to Avoid

**Navigation:**
- ❌ Unclear active state
- ❌ Too many top-level nav items (>7)
- ❌ Inconsistent navigation across pages

**Forms:**
- ❌ No validation feedback
- ❌ Vague error messages
- ❌ Captcha for every form

**Feedback:**
- ❌ Blank screens during load
- ❌ Generic error messages ("Error 500")
- ❌ No success confirmation

**Mobile:**
- ❌ Tiny touch targets (<44px)
- ❌ Horizontal scrolling
- ❌ Zoom-on-focus for inputs

---

## Notes & Assumptions

[UX_NOTES]
- [Assumption 1]
- [Assumption 2]
- [User feedback incorporated]
- [Areas requiring user testing]

---

## Template Usage Instructions

### Placeholders

Replace all [PLACEHOLDER] markers with actual values:
- [PROJECT_NAME]: Project name
- [DATE]: Current date
- [NAVIGATION_TYPE]: Chosen navigation pattern
- [PRIMARY_FLOW_X]: Main user workflow name
- [PATTERN_TYPE]: Specific UX pattern (wizard, modal, etc.)
- etc.

### If Value Unknown

If you cannot determine a value:
- Use sensible default based on product type
- Note in [UX_NOTES] section
- Mark with "⚠️ To be determined" for review with user

### Iteration

This document should be reviewed and updated:
- After user testing
- When adding major features
- When user feedback reveals UX issues
- Quarterly (for active products)
