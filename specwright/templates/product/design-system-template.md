# Design System: [PROJECT_NAME]

> Last Updated: [DATE]
> Version: 1.0.0
> Source: [URL or Screenshots]

## Overview

Design system extracted from [SOURCE] for [PROJECT_NAME]. This document defines the visual language, component patterns, and design tokens for consistent UI implementation.

---

## Color Palette

### Brand Colors

**Primary:**
- Main: `[PRIMARY_COLOR]` (#RRGGBB)
- Light: `[PRIMARY_LIGHT]` (#RRGGBB)
- Dark: `[PRIMARY_DARK]` (#RRGGBB)

**Secondary:**
- Main: `[SECONDARY_COLOR]` (#RRGGBB)
- Light: `[SECONDARY_LIGHT]` (#RRGGBB)
- Dark: `[SECONDARY_DARK]` (#RRGGBB)

**Accent:**
- Main: `[ACCENT_COLOR]` (#RRGGBB)

### Semantic Colors

**Success:** `[SUCCESS_COLOR]` (#RRGGBB)
**Warning:** `[WARNING_COLOR]` (#RRGGBB)
**Error:** `[ERROR_COLOR]` (#RRGGBB)
**Info:** `[INFO_COLOR]` (#RRGGBB)

### Neutrals

**Background:**
- Primary: `[BG_PRIMARY]` (#RRGGBB)
- Secondary: `[BG_SECONDARY]` (#RRGGBB)
- Tertiary: `[BG_TERTIARY]` (#RRGGBB)

**Text:**
- Primary: `[TEXT_PRIMARY]` (#RRGGBB)
- Secondary: `[TEXT_SECONDARY]` (#RRGGBB)
- Disabled: `[TEXT_DISABLED]` (#RRGGBB)

**Borders:**
- Default: `[BORDER_DEFAULT]` (#RRGGBB)
- Focus: `[BORDER_FOCUS]` (#RRGGBB)

### CSS Variables

```css
:root {
  /* Brand Colors */
  --color-primary: [PRIMARY_COLOR];
  --color-secondary: [SECONDARY_COLOR];
  --color-accent: [ACCENT_COLOR];

  /* Semantic Colors */
  --color-success: [SUCCESS_COLOR];
  --color-warning: [WARNING_COLOR];
  --color-error: [ERROR_COLOR];
  --color-info: [INFO_COLOR];

  /* Neutrals */
  --color-bg-primary: [BG_PRIMARY];
  --color-text-primary: [TEXT_PRIMARY];
  --color-border: [BORDER_DEFAULT];
}
```

---

## Typography

### Font Families

**Primary:** `[FONT_PRIMARY]`, system-ui, sans-serif
**Monospace:** `[FONT_MONO]`, monospace

### Type Scale

| Element | Size | Weight | Line Height | Usage |
|---------|------|--------|-------------|-------|
| H1 | [H1_SIZE] | [H1_WEIGHT] | [H1_LINE_HEIGHT] | Page titles |
| H2 | [H2_SIZE] | [H2_WEIGHT] | [H2_LINE_HEIGHT] | Section headers |
| H3 | [H3_SIZE] | [H3_WEIGHT] | [H3_LINE_HEIGHT] | Subsections |
| Body | [BODY_SIZE] | [BODY_WEIGHT] | [BODY_LINE_HEIGHT] | Main content |
| Small | [SMALL_SIZE] | [SMALL_WEIGHT] | [SMALL_LINE_HEIGHT] | Captions, hints |
| Code | [CODE_SIZE] | [CODE_WEIGHT] | [CODE_LINE_HEIGHT] | Code blocks |

### CSS Classes

```css
.text-h1 { font-size: [H1_SIZE]; font-weight: [H1_WEIGHT]; }
.text-h2 { font-size: [H2_SIZE]; font-weight: [H2_WEIGHT]; }
.text-body { font-size: [BODY_SIZE]; line-height: [BODY_LINE_HEIGHT]; }
```

---

## Spacing System

### Scale

| Token | Value | Usage |
|-------|-------|-------|
| xs | 4px | Tight spacing |
| sm | 8px | Compact elements |
| md | 16px | Default spacing |
| lg | 24px | Generous spacing |
| xl | 32px | Section spacing |
| 2xl | 48px | Large gaps |
| 3xl | 64px | Hero spacing |

### Tailwind Mapping

```
xs  → p-1, m-1
sm  → p-2, m-2
md  → p-4, m-4
lg  → p-6, m-6
xl  → p-8, m-8
2xl → p-12, m-12
```

---

## Components

### Button

**Variants:**
- Primary (filled with primary color)
- Secondary (filled with secondary color)
- Outline (bordered, transparent background)
- Ghost (text only, no border)

**Sizes:**
- sm: [HEIGHT], [PADDING], [FONT_SIZE]
- md: [HEIGHT], [PADDING], [FONT_SIZE]
- lg: [HEIGHT], [PADDING], [FONT_SIZE]

**States:**
- Default
- Hover (darken/lighten by [X]%)
- Active (pressed state)
- Disabled (opacity 0.5, no interaction)
- Loading (spinner + disabled)

### Input

**Variants:**
- Text, Email, Password, Number
- Textarea (multi-line)
- Select (dropdown)

**States:**
- Default
- Focus (border color changes to primary)
- Error (border color error, helper text)
- Disabled

**Size:** Height [INPUT_HEIGHT], Padding [INPUT_PADDING]

### Card

**Variants:**
- Default (subtle border)
- Elevated (box shadow)
- Outlined (prominent border)

**Padding:** [CARD_PADDING]
**Border Radius:** [CARD_RADIUS]

### Modal/Dialog

**Structure:**
- Overlay (backdrop)
- Container (centered, max-width)
- Header (title + close button)
- Content (scrollable)
- Footer (actions)

**Animation:** Fade in/out

### Additional Components

[LIST_OTHER_COMPONENTS]

---

## Layout Patterns

### Grid System

**Container max-width:** [CONTAINER_MAX_WIDTH]
**Breakpoints:**
- Mobile: < 640px
- Tablet: 640px - 1024px
- Desktop: > 1024px

### Common Layouts

**Dashboard:** Sidebar + Main content area
**Settings:** Tabs + Form panels
**List View:** Table or Card grid

---

## Accessibility

### Contrast Ratios

- Text on background: [RATIO]:1 (WCAG [LEVEL])
- UI components: [RATIO]:1 (WCAG [LEVEL])

**Notes:**
[ACCESSIBILITY_NOTES]

### Focus Indicators

**Style:** [FOCUS_STYLE]
**Color:** [FOCUS_COLOR]

---

## Implementation Guidelines

### For React + TailwindCSS

**Color Classes:**
```
bg-primary → bg-[PRIMARY_COLOR]
text-primary → text-[TEXT_PRIMARY]
```

**Component Structure:**
```tsx
<Button variant="primary" size="md">
  Click me
</Button>
```

### For CSS-in-JS

**Theme Object:**
```typescript
export const theme = {
  colors: {
    primary: '[PRIMARY_COLOR]',
    secondary: '[SECONDARY_COLOR]',
    // ...
  },
  typography: {
    fontFamily: '[FONT_PRIMARY]',
    // ...
  },
  spacing: {
    xs: '4px',
    sm: '8px',
    // ...
  }
}
```

---

## Design Tokens (JSON)

```json
{
  "colors": {
    "primary": "[PRIMARY_COLOR]",
    "secondary": "[SECONDARY_COLOR]"
  },
  "typography": {
    "fontFamily": "[FONT_PRIMARY]",
    "fontSize": {
      "h1": "[H1_SIZE]",
      "body": "[BODY_SIZE]"
    }
  },
  "spacing": {
    "xs": "4px",
    "sm": "8px",
    "md": "16px"
  }
}
```

---

## Screenshots

[IF_SCREENSHOTS_PROVIDED]

Reference screenshots stored in:
- `specwright/product/design/screenshots/[filename]`

---

## Notes & Assumptions

[EXTRACTION_NOTES]
- [Assumption 1]
- [Assumption 2]
- [Areas requiring clarification]

---

## Template Usage Instructions

### Placeholders

Replace all [PLACEHOLDER] markers with actual extracted values:
- [PROJECT_NAME]: Project name
- [DATE]: Current date
- [SOURCE]: URL or "Screenshots"
- [PRIMARY_COLOR]: Hex color code
- [FONT_PRIMARY]: Font family name
- [H1_SIZE]: rem or px value
- etc.

### If Value Unknown

If you cannot determine a value:
- Use sensible default
- Note in [EXTRACTION_NOTES] section
- Mark with "⚠️ Estimated" for developer review
