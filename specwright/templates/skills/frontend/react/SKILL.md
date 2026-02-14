---
description: React frontend development patterns for [PROJECT_NAME]
globs:
  - "src/**/*.tsx"
  - "src/**/*.jsx"
  - "src/components/**/*"
  - "src/hooks/**/*"
alwaysApply: false
---

# React Frontend Skill

> Project: [PROJECT_NAME]
> Framework: React [VERSION]
> Generated: [DATE]

## Quick Reference

### Components
- **Functional Components**: Always use functional components with hooks
- **Props**: Use TypeScript interfaces, destructure in parameters
- **Children**: Use `PropsWithChildren` or explicit `children` prop

### State Management
- **Local State**: useState, useReducer
- **Context**: For shared state without prop drilling
- **Server State**: TanStack Query (React Query)
- **Global State**: Zustand, Jotai, or Redux Toolkit

### Hooks
- **useState**: Simple state
- **useEffect**: Side effects (cleanup!)
- **useMemo/useCallback**: Performance optimization (don't overuse)
- **Custom Hooks**: Extract reusable logic

### Patterns
- **Container/Presenter**: Separate logic from UI
- **Compound Components**: Flexible component APIs
- **Render Props**: Share code between components
- **HOCs**: Cross-cutting concerns (less common now)

## Available Modules

| Module | File | Use When |
|--------|------|----------|
| Component Patterns | components.md | Creating/modifying components |
| State Management | state-management.md | Adding state, context, stores |
| API Integration | api-integration.md | Data fetching, mutations |
| Forms & Validation | forms-validation.md | Forms with React Hook Form |
| Dos and Don'ts | dos-and-donts.md | Project-specific learnings |

## Project Context

### Tech Stack
<!-- Extracted from specwright/product/tech-stack.md -->
- **Framework:** React [REACT_VERSION]
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
