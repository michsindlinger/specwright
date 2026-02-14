---
description: Design system extraction guidance from URLs and screenshots
globs: []
alwaysApply: false
---

# Design System Extraction Skill

> Project: [PROJECT_NAME]
> Generated: [DATE]
> Purpose: Guide for extracting design systems from existing URLs or screenshots

## When to Use

This skill guides you when extracting design systems for:
- Design system creation in `/plan-product`
- Analyzing competitor or reference designs
- Creating frontend style guides from existing visuals

## Quick Reference

### Extraction Process

1. **Acquire Source**: Get URL (WebFetch) or read screenshot (multimodal)
2. **Extract Colors**: Primary, secondary, semantic, neutrals
3. **Identify Typography**: Font families, sizes, weights, line heights
4. **Analyze Spacing**: Padding, margins, gap patterns
5. **Catalog Components**: Buttons, cards, forms, navigation elements
6. **Document Patterns**: Layout grid, breakpoints, responsive behavior
7. **Generate design-system.md**: Fill template with extracted values

### Extraction is COMPLETE when

- [ ] Color palette extracted (primary, secondary, accent, semantic, neutrals)
- [ ] Typography identified (headings, body, UI text)
- [ ] Spacing system documented (base unit, scale)
- [ ] Key components cataloged (buttons, cards, inputs, navigation)
- [ ] Layout patterns noted (grid, container widths, breakpoints)

---

## Detailed Guidance

### Source Analysis Methods

#### From URL (WebFetch)

```
1. Fetch the URL content
2. Analyze the rendered HTML/CSS for:
   - Inline styles and CSS custom properties (--variables)
   - Class naming patterns (BEM, Tailwind, etc.)
   - Color values in hex/rgb/hsl
   - Font declarations
   - Spacing values
3. Note the visual hierarchy
```

#### From Screenshots (Multimodal)

```
1. Read screenshot file(s) using Read tool
2. Visually analyze:
   - Dominant colors and their usage
   - Font styles (serif/sans-serif, weights)
   - Spacing rhythm
   - Component shapes and styles
   - Overall visual tone (minimal, playful, corporate)
3. Approximate values based on visual analysis
```

### Color Palette Extraction

#### Categories to Extract

| Category | Purpose | Example |
|----------|---------|---------|
| **Primary** | Brand color, CTAs, active states | `#2563EB` (blue) |
| **Secondary** | Supporting brand color | `#7C3AED` (purple) |
| **Accent** | Highlights, badges, special elements | `#F59E0B` (amber) |
| **Success** | Positive feedback, confirmations | `#10B981` (green) |
| **Warning** | Caution states, pending actions | `#F59E0B` (amber) |
| **Error** | Error states, destructive actions | `#EF4444` (red) |
| **Info** | Informational messages | `#3B82F6` (blue) |
| **Neutrals** | Text, backgrounds, borders | `#111827` to `#F9FAFB` (gray scale) |

#### Extraction Tips

- Look for CSS custom properties (`--color-primary`, etc.)
- Check button colors for primary/secondary
- Check alert/toast components for semantic colors
- Extract full neutral scale (at least 5 shades: darkest text to lightest bg)
- Note dark mode colors if present

### Typography Identification

#### What to Extract

| Element | Properties |
|---------|------------|
| **Font Family** | Primary (headings), Secondary (body), Monospace (code) |
| **Heading Sizes** | h1 through h4 (size, weight, line-height) |
| **Body Text** | Base size, line-height, paragraph spacing |
| **UI Text** | Labels, buttons, captions (size, weight) |
| **Font Weights** | Which weights are used (400, 500, 600, 700) |

#### Common Font Patterns

```
Corporate/Professional: Inter, Roboto, Open Sans (clean sans-serif)
Creative/Modern: Poppins, Montserrat, DM Sans (geometric)
Editorial/Content: Georgia, Merriweather, Lora (serif)
Technical/Developer: JetBrains Mono, Fira Code (monospace)
```

### Spacing System

#### Base Unit Approach

Most design systems use a base unit (typically 4px or 8px):

```
Base: 4px
Scale: 4, 8, 12, 16, 20, 24, 32, 40, 48, 64, 80, 96
```

#### What to Document

- **Base unit**: The smallest spacing increment
- **Component padding**: Internal spacing of cards, buttons, inputs
- **Section spacing**: Vertical rhythm between content sections
- **Grid gap**: Spacing between grid/flex items
- **Container max-width**: Content width limits

### Component Cataloging

#### Priority Components

| Priority | Components |
|----------|-----------|
| **High** | Buttons (primary, secondary, ghost), Input fields, Cards |
| **Medium** | Navigation (header, sidebar), Badges, Alerts/Toasts |
| **Low** | Modals, Dropdowns, Tables, Tabs |

#### Per-Component Properties

For each component, note:
- **Shape**: Border radius (sharp, rounded, pill)
- **Shadow**: Box shadow values (if any)
- **Border**: Border style and color
- **States**: Default, hover, active, disabled, focus
- **Sizes**: If multiple sizes exist (sm, md, lg)

### Layout Patterns

#### Grid System

- **Columns**: 12-column? Flexbox-based?
- **Container**: Max-width (1200px, 1440px, etc.)
- **Breakpoints**: Mobile, tablet, desktop thresholds
- **Gutters**: Gap between columns

#### Common Layout Patterns

```
Dashboard: Sidebar (240px) + Main content (fluid)
Marketing: Full-width hero + Contained sections (max-w-6xl)
App: Top nav (64px) + Content area (fluid)
Documentation: Sidebar nav + Content + Table of contents
```

---

## Quality Checks

### Completeness Validation

After extraction, verify:

1. **Colors**: Can you style all common UI states with the extracted palette?
2. **Typography**: Can you set all heading levels and body text?
3. **Spacing**: Is there a consistent rhythm you can follow?
4. **Components**: Are the most-used components documented?

### Common Extraction Mistakes

| Mistake | Solution |
|---------|----------|
| Only extracting brand colors | Include full neutral scale and semantic colors |
| Missing font weights | Check headings, bold text, and buttons for weight variety |
| Ignoring spacing patterns | Look at consistent padding/margin values across components |
| Over-specifying components | Focus on patterns, not pixel-perfect replication |

---

## Template Reference

Use template: `specwright/templates/product/design-system-template.md`

Hybrid lookup:
- TRY: `specwright/templates/product/design-system-template.md` (project)
- FALLBACK: `~/.specwright/templates/product/design-system-template.md` (global)
