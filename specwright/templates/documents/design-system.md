# Design System: [PROJECT_NAME]

> Version: 1.0
> Created: [DATE]
> Source: [URL_OR_SCREENSHOT_REFERENCE]

---

## Overview

This design system was extracted from [SOURCE] and defines the visual language for [PROJECT_NAME].

---

## Color Palette

### Primary Colors

| Name | Hex | RGB | Usage |
|------|-----|-----|-------|
| Primary | `#[HEX]` | rgb([R], [G], [B]) | Main actions, links |
| Primary Dark | `#[HEX]` | rgb([R], [G], [B]) | Hover states |
| Primary Light | `#[HEX]` | rgb([R], [G], [B]) | Backgrounds |

### Secondary Colors

| Name | Hex | RGB | Usage |
|------|-----|-----|-------|
| Secondary | `#[HEX]` | rgb([R], [G], [B]) | Secondary actions |
| Accent | `#[HEX]` | rgb([R], [G], [B]) | Highlights, CTAs |

### Neutral Colors

| Name | Hex | RGB | Usage |
|------|-----|-----|-------|
| White | `#FFFFFF` | rgb(255, 255, 255) | Backgrounds |
| Gray 50 | `#[HEX]` | rgb([R], [G], [B]) | Light backgrounds |
| Gray 100 | `#[HEX]` | rgb([R], [G], [B]) | Borders |
| Gray 200 | `#[HEX]` | rgb([R], [G], [B]) | Disabled states |
| Gray 500 | `#[HEX]` | rgb([R], [G], [B]) | Secondary text |
| Gray 900 | `#[HEX]` | rgb([R], [G], [B]) | Primary text |
| Black | `#000000` | rgb(0, 0, 0) | High contrast |

### Semantic Colors

| Name | Hex | Usage |
|------|-----|-------|
| Success | `#[HEX]` | Success messages, positive actions |
| Warning | `#[HEX]` | Warning messages, caution |
| Error | `#[HEX]` | Error messages, destructive actions |
| Info | `#[HEX]` | Informational messages |

---

## Typography

### Font Families

| Type | Font Family | Fallback |
|------|-------------|----------|
| Headings | [FONT_NAME] | [FALLBACK_STACK] |
| Body | [FONT_NAME] | [FALLBACK_STACK] |
| Monospace | [FONT_NAME] | [FALLBACK_STACK] |

### Font Sizes

| Name | Size | Line Height | Usage |
|------|------|-------------|-------|
| xs | 12px | 16px | Captions, labels |
| sm | 14px | 20px | Secondary text |
| base | 16px | 24px | Body text |
| lg | 18px | 28px | Large body |
| xl | 20px | 28px | H4 |
| 2xl | 24px | 32px | H3 |
| 3xl | 30px | 36px | H2 |
| 4xl | 36px | 40px | H1 |
| 5xl | 48px | 48px | Display |

### Font Weights

| Name | Weight | Usage |
|------|--------|-------|
| Light | 300 | Subtle text |
| Regular | 400 | Body text |
| Medium | 500 | Emphasis |
| Semibold | 600 | Subheadings |
| Bold | 700 | Headings |

---

## Spacing System

### Base Unit

Base spacing unit: **[X]px** (e.g., 4px or 8px)

### Spacing Scale

| Name | Value | Usage |
|------|-------|-------|
| 0 | 0px | None |
| 1 | [BASE * 1]px | Tight spacing |
| 2 | [BASE * 2]px | Small spacing |
| 3 | [BASE * 3]px | Default spacing |
| 4 | [BASE * 4]px | Medium spacing |
| 6 | [BASE * 6]px | Large spacing |
| 8 | [BASE * 8]px | XL spacing |
| 12 | [BASE * 12]px | Section spacing |
| 16 | [BASE * 16]px | Page sections |

### Container Widths

| Name | Width | Usage |
|------|-------|-------|
| sm | 640px | Small screens |
| md | 768px | Medium screens |
| lg | 1024px | Large screens |
| xl | 1280px | Extra large |
| 2xl | 1536px | Wide screens |

---

## Border & Radius

### Border Radius

| Name | Value | Usage |
|------|-------|-------|
| none | 0px | Sharp corners |
| sm | 4px | Subtle rounding |
| md | 8px | Default buttons, cards |
| lg | 12px | Large cards |
| xl | 16px | Modals |
| full | 9999px | Pills, avatars |

### Border Widths

| Name | Value | Usage |
|------|-------|-------|
| none | 0px | No border |
| thin | 1px | Default borders |
| medium | 2px | Emphasis |
| thick | 4px | Heavy emphasis |

---

## Shadows

| Name | Value | Usage |
|------|-------|-------|
| sm | `0 1px 2px rgba(0,0,0,0.05)` | Subtle elevation |
| md | `0 4px 6px rgba(0,0,0,0.1)` | Cards, dropdowns |
| lg | `0 10px 15px rgba(0,0,0,0.1)` | Modals, popovers |
| xl | `0 20px 25px rgba(0,0,0,0.15)` | Dialogs |

---

## Components

### Buttons

#### Primary Button

```css
background: var(--color-primary);
color: white;
padding: 12px 24px;
border-radius: 8px;
font-weight: 600;
```

**States:**
- Hover: `background: var(--color-primary-dark);`
- Disabled: `opacity: 0.5; cursor: not-allowed;`

#### Secondary Button

```css
background: transparent;
color: var(--color-primary);
border: 2px solid var(--color-primary);
padding: 10px 22px;
border-radius: 8px;
```

#### Ghost Button

```css
background: transparent;
color: var(--color-gray-700);
padding: 12px 24px;
```

### Input Fields

```css
background: white;
border: 1px solid var(--color-gray-200);
border-radius: 8px;
padding: 12px 16px;
font-size: 16px;
```

**States:**
- Focus: `border-color: var(--color-primary); box-shadow: 0 0 0 3px var(--color-primary-light);`
- Error: `border-color: var(--color-error);`

### Cards

```css
background: white;
border-radius: 12px;
padding: 24px;
box-shadow: var(--shadow-md);
```

---

## Iconography

### Icon System

- **Library:** [LUCIDE_REACT | HEROICONS | CUSTOM]
- **Default Size:** [SIZE]px
- **Stroke Width:** [WIDTH]

### Icon Sizes

| Name | Size | Usage |
|------|------|-------|
| xs | 12px | Inline, badges |
| sm | 16px | Buttons, inputs |
| md | 20px | Default |
| lg | 24px | Navigation |
| xl | 32px | Features |

---

## Motion & Animation

### Timing Functions

| Name | Value | Usage |
|------|-------|-------|
| ease-out | cubic-bezier(0, 0, 0.2, 1) | Enter animations |
| ease-in | cubic-bezier(0.4, 0, 1, 1) | Exit animations |
| ease-in-out | cubic-bezier(0.4, 0, 0.2, 1) | General transitions |

### Durations

| Name | Duration | Usage |
|------|----------|-------|
| fast | 150ms | Micro-interactions |
| normal | 300ms | Default transitions |
| slow | 500ms | Complex animations |

### Common Animations

```css
/* Fade In */
@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

/* Slide Up */
@keyframes slideUp {
  from { transform: translateY(10px); opacity: 0; }
  to { transform: translateY(0); opacity: 1; }
}
```

---

## Responsive Breakpoints

| Name | Min Width | Max Width | Target |
|------|-----------|-----------|--------|
| mobile | 0px | 639px | Phones |
| tablet | 640px | 1023px | Tablets |
| desktop | 1024px | 1279px | Laptops |
| wide | 1280px | - | Desktops |

---

## CSS Variables

```css
:root {
  /* Colors */
  --color-primary: #[HEX];
  --color-primary-dark: #[HEX];
  --color-primary-light: #[HEX];
  --color-secondary: #[HEX];
  --color-accent: #[HEX];

  /* Neutrals */
  --color-white: #FFFFFF;
  --color-gray-50: #[HEX];
  --color-gray-100: #[HEX];
  --color-gray-200: #[HEX];
  --color-gray-500: #[HEX];
  --color-gray-900: #[HEX];
  --color-black: #000000;

  /* Semantic */
  --color-success: #[HEX];
  --color-warning: #[HEX];
  --color-error: #[HEX];
  --color-info: #[HEX];

  /* Typography */
  --font-heading: '[FONT]', [FALLBACK];
  --font-body: '[FONT]', [FALLBACK];
  --font-mono: '[FONT]', [FALLBACK];

  /* Spacing */
  --spacing-base: [X]px;

  /* Borders */
  --radius-sm: 4px;
  --radius-md: 8px;
  --radius-lg: 12px;
  --radius-full: 9999px;

  /* Shadows */
  --shadow-sm: 0 1px 2px rgba(0,0,0,0.05);
  --shadow-md: 0 4px 6px rgba(0,0,0,0.1);
  --shadow-lg: 0 10px 15px rgba(0,0,0,0.1);
}
```

---

## Usage Guidelines

### Do's

- Use semantic color names (primary, error) not hex values
- Follow spacing scale consistently
- Maintain visual hierarchy with typography scale
- Test all color combinations for accessibility

### Don'ts

- Don't create new colors outside the palette
- Don't mix spacing values arbitrarily
- Don't use more than 3 font weights on a page
- Don't skip heading levels (H1 → H3)

---

## Accessibility

### Color Contrast

| Combination | Ratio | WCAG Level |
|-------------|-------|------------|
| Primary on White | [X]:1 | [AA/AAA] |
| Gray-500 on White | [X]:1 | [AA/AAA] |
| White on Primary | [X]:1 | [AA/AAA] |

### Focus States

All interactive elements must have visible focus states with minimum 3:1 contrast ratio.

---

## References

- Source Design: [URL_OR_FILE]
- Extracted: [DATE]
- Tool Used: [FIGMA/SKETCH/MANUAL/AI]
