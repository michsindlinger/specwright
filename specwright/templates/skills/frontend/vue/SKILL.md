---
description: Vue.js frontend development patterns for [PROJECT_NAME]
globs:
  - "src/**/*.vue"
  - "src/components/**/*"
  - "src/composables/**/*"
alwaysApply: false
---

# Vue Frontend Skill

> Project: [PROJECT_NAME]
> Framework: Vue [VERSION]
> Generated: [DATE]

## Quick Reference

### Components
- **Composition API**: Use `<script setup>` for cleaner code
- **Props**: Define with `defineProps<T>()`
- **Emits**: Define with `defineEmits<T>()`

### State Management
- **Local State**: `ref()`, `reactive()`
- **Computed**: `computed()` for derived state
- **Pinia**: For global state management

### Composables
- Extract reusable logic into composables
- Naming convention: `useXxx()`

### Reactivity
- `ref()` for primitives
- `reactive()` for objects
- `toRefs()` for destructuring reactive objects

## Available Modules

| Module | File | Use When |
|--------|------|----------|
| Component Patterns | components.md | Creating/modifying components |
| State Management | state-management.md | Pinia, composables |
| API Integration | api-integration.md | Data fetching |
| Forms & Validation | forms-validation.md | Forms with VeeValidate |
| Dos and Don'ts | dos-and-donts.md | Project-specific learnings |

## Project Context

### Tech Stack
<!-- Extracted from specwright/product/tech-stack.md -->
- **Framework:** Vue [VUE_VERSION]
- **State Management:** [STATE_MANAGEMENT_LIBRARY]
- **UI Library:** [UI_LIBRARY]
- **Testing:** [TESTING_FRAMEWORK]
- **Build Tool:** [BUILD_TOOL]

### Architecture Patterns
<!-- Extracted from specwright/product/architecture-decision.md -->
[ARCHITECTURE_PATTERNS]

### Project Structure
<!-- Extracted from specwright/product/architecture-structure.md -->
```
[PROJECT_STRUCTURE]
```

---

## Design System
<!-- Extracted from specwright/product/design-system.md -->

### Colors
[DESIGN_COLORS]

### Typography
[DESIGN_TYPOGRAPHY]

### Spacing
[DESIGN_SPACING]

### Components
[DESIGN_COMPONENTS]

**Reference:** `specwright/product/design-system.md`

---

## UX Patterns
<!-- Extracted from specwright/product/ux-patterns.md -->

### Navigation
[UX_NAVIGATION]

### User Flows
[UX_USER_FLOWS]

### Feedback States
[UX_FEEDBACK_STATES]

### Accessibility
[UX_ACCESSIBILITY]

**Reference:** `specwright/product/ux-patterns.md`

---

## Self-Learning

Wenn du während der Implementierung etwas lernst:
→ Füge es zu `dos-and-donts.md` in diesem Ordner hinzu.
