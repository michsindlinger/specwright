---
description: UX pattern definition guidance for navigation, user flows, interactions, and accessibility
globs: []
alwaysApply: false
---

# UX Patterns Definition Skill

> Project: [PROJECT_NAME]
> Generated: [DATE]
> Purpose: Guide for defining UX patterns including navigation, user flows, interactions, and accessibility

## When to Use

This skill guides you when defining UX patterns for:
- UX pattern definition in `/plan-product`
- Frontend architecture planning
- Interaction design decisions

## Quick Reference

### UX Definition Process

1. **Analyze Product Type**: Determine application category and user context
2. **Select Navigation Pattern**: Match to product complexity and user mental model
3. **Define User Flows**: Map key workflows from entry to completion
4. **Choose Interaction Patterns**: Buttons, forms, drag-drop, gestures
5. **Define Feedback Patterns**: Loading, success, error, empty states
6. **Set Accessibility Level**: WCAG target and specific requirements
7. **Document in ux-patterns.md**: Fill template with approved patterns

### UX Patterns are COMPLETE when

- [ ] Navigation pattern selected with rationale
- [ ] Key user flows mapped (3-5 primary flows)
- [ ] Interaction patterns defined for common actions
- [ ] Feedback patterns specified for all states
- [ ] Mobile considerations documented (if applicable)
- [ ] Accessibility level and requirements set

---

## Detailed Guidance

### Navigation Patterns

#### Pattern Selection Guide

| Product Type | Recommended Pattern | Why |
|-------------|--------------------|----|
| **Dashboard/Admin** | Sidebar navigation | Many sections, quick switching, persistent context |
| **Content/Blog** | Top navigation bar | Linear content, few top-level sections |
| **E-commerce** | Mega menu + breadcrumbs | Deep category hierarchy, wayfinding |
| **Mobile-first app** | Bottom tab bar | Thumb-reachable, limited primary destinations |
| **Documentation** | Sidebar + table of contents | Hierarchical content, in-page navigation |
| **Social/Feed** | Top tabs + infinite scroll | Content-first, few navigation levels |
| **Multi-step tool** | Wizard/stepper | Sequential process, progress tracking |
| **Settings/Config** | Vertical tabs or accordion | Grouped options, scannable categories |

#### Navigation Principles

- **Max 7 top-level items** (Miller's Law)
- **3-click rule**: Any content reachable in 3 clicks
- **Consistent placement**: Navigation stays in same position across pages
- **Current state visible**: Active item always highlighted
- **Mobile-first**: Design navigation for smallest screen first

### User Flow Design

#### Flow Mapping Template

For each key flow, document:

```
Flow: [Name]
Entry Point: [Where user starts]
Steps:
  1. [Action] → [What user sees]
  2. [Action] → [What user sees]
  3. [Action] → [What user sees]
Success State: [What happens on completion]
Error States: [What can go wrong at each step]
Alternative Paths: [Shortcuts or alternate routes]
```

#### Common Flow Patterns

| Flow Type | Pattern | Key Considerations |
|-----------|---------|-------------------|
| **Onboarding** | Progressive disclosure | Don't overwhelm, show value early |
| **Authentication** | Single-page or modal | Minimize friction, support social login |
| **Data Entry** | Step-by-step wizard | Validate inline, save progress |
| **Search & Filter** | Faceted search | Instant results, clear filter state |
| **CRUD Operations** | List → Detail → Edit | Consistent patterns across entities |
| **Checkout** | Linear wizard | Progress bar, minimal distractions |

### Interaction Patterns

#### Buttons & Actions

| Action Type | Pattern | Example |
|------------|---------|---------|
| **Primary** | Solid, prominent | "Save", "Submit", "Create" |
| **Secondary** | Outlined or subdued | "Cancel", "Back", "Skip" |
| **Destructive** | Red/warning color, confirmation | "Delete", "Remove" |
| **Inline** | Icon button or text link | Edit, duplicate, share |

**Principles:**
- One primary action per view
- Destructive actions require confirmation
- Button labels describe the action ("Save Changes" not "OK")

#### Forms & Input

| Pattern | When to Use |
|---------|------------|
| **Inline validation** | Real-time feedback as user types |
| **On-blur validation** | Validate when user leaves field |
| **Submit validation** | Simple forms with few fields |
| **Multi-step form** | > 6 fields, logical groupings |
| **Auto-save** | Long forms, collaborative editing |

**Principles:**
- Labels above inputs (not placeholder-only)
- Error messages next to the field, not at top
- Required fields marked, optional fields noted
- Logical tab order

#### Data Display

| Pattern | When to Use |
|---------|------------|
| **Table** | Structured data, comparison, sorting needed |
| **Card grid** | Visual items, variable content length |
| **List** | Sequential items, scannable titles |
| **Timeline** | Chronological events |
| **Kanban** | Status-based workflow |

### Feedback Patterns

#### State Coverage

Every view should handle these states:

| State | Pattern | Example |
|-------|---------|---------|
| **Loading** | Skeleton screens or spinner | Content placeholders with animation |
| **Empty** | Illustration + CTA | "No projects yet. Create your first project." |
| **Success** | Toast/snackbar notification | "Changes saved successfully" (auto-dismiss) |
| **Error** | Inline message or toast | "Failed to save. Please try again." (with retry) |
| **Partial** | Progress indicator | "Uploading 3 of 7 files..." |
| **Offline** | Banner notification | "You're offline. Changes will sync when connected." |

#### Notification Hierarchy

```
Critical (blocks user): Modal dialog — requires action
Important (needs attention): Banner/alert — persistent until dismissed
Informational (nice to know): Toast/snackbar — auto-dismiss after 5s
Background (status update): Badge/indicator — passive display
```

### Mobile Considerations

#### Responsive Patterns

| Desktop Pattern | Mobile Equivalent |
|----------------|-------------------|
| Sidebar navigation | Bottom tab bar or hamburger menu |
| Multi-column layout | Single column, stacked |
| Hover states | Long-press or tap actions |
| Right-click context menu | Swipe actions or action sheet |
| Data tables | Card list or horizontal scroll |
| Modal dialogs | Full-screen sheets |

#### Touch Targets

- **Minimum**: 44x44px (Apple HIG) / 48x48dp (Material)
- **Comfortable**: 48x48px with 8px spacing
- **Primary actions**: Bottom of screen (thumb zone)

### Accessibility Guidelines (WCAG)

#### Level Selection

| Level | Requirements | When to Choose |
|-------|-------------|---------------|
| **A (Minimum)** | Basic accessibility | Internal tools, MVP |
| **AA (Standard)** | Good accessibility | Most web applications, recommended default |
| **AAA (Enhanced)** | Maximum accessibility | Government, healthcare, education |

#### Key Requirements (AA)

| Category | Requirement |
|----------|------------|
| **Color** | 4.5:1 contrast ratio for text, 3:1 for large text |
| **Keyboard** | All functionality accessible via keyboard |
| **Screen Reader** | Proper ARIA labels, semantic HTML, alt text |
| **Focus** | Visible focus indicators, logical focus order |
| **Motion** | Respect prefers-reduced-motion, no auto-play |
| **Forms** | Associated labels, error identification, suggestions |
| **Navigation** | Skip links, consistent navigation, page titles |

---

## Interactive Decision Template

When presenting UX recommendations to the user:

```
Based on your [product type] targeting [audience], I recommend:

**Navigation:** [Pattern] — [rationale]
**Key Flows:** [Top 3 flows identified]
**Interactions:** [Primary patterns]
**Feedback:** [Approach]
**Accessibility:** WCAG [Level] — [rationale]

Would you like to:
1. Approve and proceed
2. Discuss alternatives for any pattern
3. Adjust the accessibility level
```

---

## Template Reference

Use template: `specwright/templates/product/ux-patterns-template.md`

Hybrid lookup:
- TRY: `specwright/templates/product/ux-patterns-template.md` (project)
- FALLBACK: `~/.specwright/templates/product/ux-patterns-template.md` (global)
