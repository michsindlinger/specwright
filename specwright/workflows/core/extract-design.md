---
description: Extract design system from URL or screenshot
globs:
alwaysApply: false
version: 2.0
encoding: UTF-8
installation: global
---

# Extract Design Workflow

## What's New in v2.0

- **Main Agent Pattern**: Main Agent loads design-system-extraction Skill and executes directly
- **Standalone command**: Can be used independently outside of validate-market workflow

## Overview

Extract design tokens, color palettes, typography, spacing, and component patterns from a reference URL or screenshot. Creates a structured design-system.md that can be used for landing pages, UI development, or brand consistency.

**When to use:**
- Before building a landing page (standalone or via /validate-market)
- When onboarding an existing project that needs design documentation
- When replicating a reference design's visual language

<pre_flight_check>
  EXECUTE: @specwright/workflows/meta/pre-flight.md
</pre_flight_check>

<process_flow>

<step number="1" name="input_collection">

### Step 1: Collect Design Reference

ASK user for input:

```
Please provide a design reference:

1. URL of a website whose design you want to extract
2. Path to a screenshot file
3. Both URL + screenshot for comprehensive extraction

Options:
- --output PATH  Custom output path (default: specwright/product/design-system.md)
```

CAPTURE: reference_url and/or screenshot_path

</step>

<step number="2" name="load_skill">

### Step 2: Load Design System Extraction Skill

<skill_loading>
  LOAD SKILL: Design System Extraction
  PATH: .claude/skills/design-system-extraction/SKILL.md
  FALLBACK: ~/.specwright/templates/skills/design-system-extraction/SKILL.md
  PURPOSE: Guide systematic design token extraction
</skill_loading>

</step>

<step number="3" name="extract_design">

### Step 3: Extract Design Tokens

Following the loaded skill guidance:

<extraction_targets>
  **Colors:**
  - Primary, secondary, accent colors
  - Background colors (light/dark)
  - Text colors (headings, body, muted)
  - Border and divider colors
  - Status colors (success, warning, error, info)

  **Typography:**
  - Font families (headings, body, mono)
  - Font sizes scale
  - Font weights used
  - Line heights
  - Letter spacing

  **Spacing:**
  - Spacing scale (xs, sm, md, lg, xl)
  - Section padding
  - Component gaps
  - Container max-widths

  **Components:**
  - Button styles (primary, secondary, outline)
  - Card patterns
  - Form input styles
  - Navigation patterns
  - Header/footer patterns

  **Effects:**
  - Border radius scale
  - Box shadows
  - Transitions/animations
  - Gradients (if used)
</extraction_targets>

<extraction_method>
  IF URL provided:
    FETCH: Page content and stylesheets
    ANALYZE: CSS custom properties, computed styles
    EXTRACT: Design tokens from live page

  IF screenshot provided:
    READ: Screenshot image
    ANALYZE: Visual patterns, colors, typography
    EXTRACT: Design tokens from visual analysis

  IF both provided:
    COMBINE: URL analysis + visual verification
    PRIORITIZE: URL data (more precise), validate with screenshot
</extraction_method>

</step>

<step number="4" subagent="file-creator" name="create_design_system">

### Step 4: Create Design System Document

USE: file-creator subagent

CREATE: design-system.md at output path

```markdown
# Design System

> Extracted from: [SOURCE_URL_OR_SCREENSHOT]
> Date: [CURRENT_DATE]

## Colors

### Primary Palette
- `--color-primary`: [HEX] [RGB]
- `--color-primary-light`: [HEX]
- `--color-primary-dark`: [HEX]

### Neutral Palette
- `--color-bg`: [HEX]
- `--color-surface`: [HEX]
- `--color-text`: [HEX]
- `--color-text-muted`: [HEX]

### Accent Colors
- `--color-accent`: [HEX]
- `--color-success`: [HEX]
- `--color-warning`: [HEX]
- `--color-error`: [HEX]

## Typography

### Font Families
- Headings: [FONT_FAMILY]
- Body: [FONT_FAMILY]
- Mono: [FONT_FAMILY]

### Font Scale
| Name | Size | Weight | Line Height |
|------|------|--------|-------------|
| h1 | [SIZE] | [WEIGHT] | [LH] |
| h2 | [SIZE] | [WEIGHT] | [LH] |
| body | [SIZE] | [WEIGHT] | [LH] |
| small | [SIZE] | [WEIGHT] | [LH] |

## Spacing

| Token | Value |
|-------|-------|
| --space-xs | [VALUE] |
| --space-sm | [VALUE] |
| --space-md | [VALUE] |
| --space-lg | [VALUE] |
| --space-xl | [VALUE] |

## Components

### Buttons
[BUTTON_STYLES]

### Cards
[CARD_STYLES]

### Forms
[FORM_STYLES]

## Effects

- Border Radius: [VALUES]
- Shadows: [VALUES]
- Transitions: [VALUES]
```

**Default Output:** specwright/product/design-system.md

</step>

<step number="5" name="user_review">

### Step 5: User Review

```
Design System Extracted!

Source: [URL_OR_SCREENSHOT]

Extracted:
- [N] colors
- [N] typography tokens
- [N] spacing values
- [N] component patterns

Output: [OUTPUT_PATH]

Please review and let me know if any adjustments are needed.
```

</step>

</process_flow>

## Execution Summary

**Duration:** 3-5 minutes
**User Interactions:** 1 (input) + 1 (review)
**Output:** 1 design-system.md file
