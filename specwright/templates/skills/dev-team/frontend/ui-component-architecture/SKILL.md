# UI Component Architecture

> Skill Template: Frontend Development
> Category: Component Design & Composition
> Version: 1.0.0
> Created: 2026-01-09

## Quick Reference

<!-- This section is extracted by Orchestrator for task prompts (~50-100 lines) -->

**When to use:** UI Components, Props Design, Component Composition, Layout

**Key Patterns:**

1. **Component Structure**
   - One component per file
   - Props interface at top
   - Hooks grouped together
   - Event handlers as separate functions
   - Return JSX at end

2. **Composition over Inheritance**
   - Use children prop for flexibility
   - Compound components for related UI
   - Render props for logic sharing
   - Container/Presentational separation

3. **Props Design**
   - Explicit prop types (TypeScript interfaces)
   - Sensible defaults for optional props
   - Destructure in function signature
   - Spread remaining props to root element

4. **Performance Rules**
   - Memoize expensive calculations (useMemo)
   - Memoize callbacks passed to children (useCallback)
   - Use React.memo for pure presentational components
   - Lazy load heavy components

**Quick Example (React):**
```tsx
interface ButtonProps {
  variant?: 'primary' | 'secondary';
  size?: 'sm' | 'md' | 'lg';
  isLoading?: boolean;
  children: React.ReactNode;
  onClick?: () => void;
}

export function Button({
  variant = 'primary',
  size = 'md',
  isLoading = false,
  children,
  onClick,
  ...props
}: ButtonProps) {
  return (
    <button
      className={`btn btn-${variant} btn-${size}`}
      disabled={isLoading}
      onClick={onClick}
      {...props}
    >
      {isLoading ? <Spinner /> : children}
    </button>
  );
}
```

**Anti-Patterns to Avoid:**
- Prop drilling (use Context or state management)
- Giant components (split into smaller pieces)
- Inline styles (use CSS classes or styled-components)
- Business logic in components (extract to hooks/services)

---

## Purpose

Design and implement scalable, reusable UI component architectures using modern composition patterns, component hierarchies, and design system principles.

## When to Activate

Activate this skill when:
- Designing new UI component systems
- Building reusable component libraries
- Implementing design system components
- Refactoring component hierarchies
- Creating compound components
- Building component composition patterns

## Core Capabilities

### Component Design Patterns
- **Atomic Design**: Atoms, molecules, organisms, templates, pages
- **Compound Components**: Related components that work together
- **Controlled vs Uncontrolled**: Managing component state patterns
- **Render Props**: Component logic sharing
- **Higher-Order Components**: Component enhancement patterns
- **Container/Presentational**: Separating logic from presentation

### Component Architecture
- Component composition over inheritance
- Single Responsibility Principle per component
- Props interface design and validation
- Component lifecycle optimization
- Performance considerations (memoization, lazy loading)
- Error boundaries and fault tolerance

### Design System Integration
- Theme and design token consumption
- Consistent spacing and layout patterns
- Typography and color system usage
- Responsive design patterns
- Dark mode and theme switching
- Component variant systems

## [TECH_STACK_SPECIFIC] Patterns

### React Patterns

```javascript
// Compound Component Pattern
const Card = ({ children, className }) => {
  return <div className={`card ${className}`}>{children}</div>;
};

Card.Header = ({ children, className }) => {
  return <div className={`card-header ${className}`}>{children}</div>;
};

Card.Body = ({ children, className }) => {
  return <div className={`card-body ${className}`}>{children}</div>;
};

Card.Footer = ({ children, className }) => {
  return <div className={`card-footer ${className}`}>{children}</div>;
};

// Usage
<Card>
  <Card.Header>Title</Card.Header>
  <Card.Body>Content</Card.Body>
  <Card.Footer>Actions</Card.Footer>
</Card>

// Composition with Custom Hooks
const useToggle = (initialValue = false) => {
  const [value, setValue] = useState(initialValue);
  const toggle = useCallback(() => setValue(v => !v), []);
  return [value, toggle];
};

const Accordion = ({ title, children }) => {
  const [isOpen, toggle] = useToggle(false);

  return (
    <div className="accordion">
      <button onClick={toggle} className="accordion-trigger">
        {title}
      </button>
      {isOpen && <div className="accordion-content">{children}</div>}
    </div>
  );
};

// Render Props Pattern
const DataFetcher = ({ url, render }) => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetch(url)
      .then(res => res.json())
      .then(setData)
      .catch(setError)
      .finally(() => setLoading(false));
  }, [url]);

  return render({ data, loading, error });
};

// Usage
<DataFetcher
  url="/api/users"
  render={({ data, loading, error }) => (
    loading ? <Spinner /> : <UserList users={data} />
  )}
/>

// Controlled Component Pattern
const Input = ({ value, onChange, label, error, ...props }) => {
  return (
    <div className="input-wrapper">
      {label && <label className="input-label">{label}</label>}
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={`input ${error ? 'input-error' : ''}`}
        {...props}
      />
      {error && <span className="input-error-message">{error}</span>}
    </div>
  );
};

// Polymorphic Component Pattern
const Button = ({ as: Component = 'button', children, variant = 'primary', ...props }) => {
  return (
    <Component
      className={`btn btn-${variant}`}
      {...props}
    >
      {children}
    </Component>
  );
};

// Usage
<Button>Click me</Button>
<Button as="a" href="/link">Link Button</Button>
```

### Vue Patterns

```vue
<!-- Compound Component Pattern with Slots -->
<template>
  <div class="card">
    <div v-if="$slots.header" class="card-header">
      <slot name="header"></slot>
    </div>
    <div class="card-body">
      <slot></slot>
    </div>
    <div v-if="$slots.footer" class="card-footer">
      <slot name="footer"></slot>
    </div>
  </div>
</template>

<!-- Usage -->
<Card>
  <template #header>Title</template>
  <template #default>Content</template>
  <template #footer>Actions</template>
</Card>

<!-- Composable Pattern (Vue 3) -->
<script setup>
import { ref, computed } from 'vue';

// useToggle composable
export function useToggle(initialValue = false) {
  const value = ref(initialValue);
  const toggle = () => { value.value = !value.value; };
  return { value, toggle };
}

// Component using composable
const { value: isOpen, toggle } = useToggle(false);
</script>

<!-- Scoped Slots Pattern -->
<template>
  <div class="data-fetcher">
    <slot :data="data" :loading="loading" :error="error"></slot>
  </div>
</template>

<script setup>
const props = defineProps(['url']);
const data = ref(null);
const loading = ref(true);
const error = ref(null);

// Fetch logic...
</script>

<!-- Usage -->
<DataFetcher url="/api/users" v-slot="{ data, loading }">
  <Spinner v-if="loading" />
  <UserList v-else :users="data" />
</DataFetcher>
```

### Angular Patterns

```typescript
// Component with Input/Output Pattern
@Component({
  selector: 'app-card',
  template: `
    <div class="card">
      <div class="card-header" *ngIf="header">
        <ng-content select="[card-header]"></ng-content>
      </div>
      <div class="card-body">
        <ng-content></ng-content>
      </div>
      <div class="card-footer" *ngIf="footer">
        <ng-content select="[card-footer]"></ng-content>
      </div>
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class CardComponent {
  @Input() header: boolean = false;
  @Input() footer: boolean = false;
}

// Container/Presentation Pattern
@Component({
  selector: 'app-user-list-container',
  template: `
    <app-user-list-presentation
      [users]="users$ | async"
      [loading]="loading$ | async"
      (userSelected)="onUserSelected($event)">
    </app-user-list-presentation>
  `
})
export class UserListContainerComponent {
  users$ = this.userService.getUsers();
  loading$ = this.userService.loading$;

  constructor(private userService: UserService) {}

  onUserSelected(user: User) {
    // Handle user selection logic
  }
}

// Smart/Dumb Component Pattern
@Component({
  selector: 'app-user-list-presentation',
  template: `
    <div class="user-list">
      <div *ngFor="let user of users"
           (click)="userSelected.emit(user)"
           class="user-item">
        {{ user.name }}
      </div>
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class UserListPresentationComponent {
  @Input() users: User[] = [];
  @Input() loading: boolean = false;
  @Output() userSelected = new EventEmitter<User>();
}
```

## Tools Required

### Development Tools
- Component development environment (Storybook, Ladle)
- Browser DevTools (React DevTools, Vue DevTools, Angular DevTools)
- Design token management tools
- Component documentation generators

### Testing Tools
- Component testing framework (Testing Library, Vitest)
- Visual regression testing (Chromatic, Percy)
- Accessibility testing tools (axe, pa11y)
- Snapshot testing capabilities

### Design Integration
- Design system documentation (Figma, Zeroheight)
- Design token export tools
- Component prop documentation generators

### MCP Servers
[MCP_TOOLS]
<!-- Populated during skill creation based on:
     1. User's installed MCP servers
     2. User's selection for this skill

     Recommended for this skill (examples):
     - Design system integration tools
     - Component documentation generators
     - Visual testing platforms

     Note: Skills work without MCP servers, but functionality may be limited
-->

## Quality Checklist

### Component Design
- [ ] Component has a single, clear responsibility
- [ ] Props interface is well-defined and typed
- [ ] Component is reusable across different contexts
- [ ] Follows project's component naming conventions
- [ ] Implements appropriate composition patterns

### Performance
- [ ] Unnecessary re-renders are prevented (memo, useMemo, useCallback)
- [ ] Heavy computations are memoized
- [ ] Large lists use virtualization if needed
- [ ] Images are optimized and lazy-loaded
- [ ] Bundle size impact is acceptable

### Accessibility
- [ ] Semantic HTML elements are used
- [ ] ARIA attributes are correctly applied
- [ ] Keyboard navigation works correctly
- [ ] Focus management is implemented
- [ ] Color contrast meets WCAG standards
- [ ] Screen reader compatible

### Code Quality
- [ ] Component is properly typed (TypeScript/PropTypes)
- [ ] Props have sensible defaults where appropriate
- [ ] Error states are handled gracefully
- [ ] Loading states are communicated to users
- [ ] Component has unit tests
- [ ] Component is documented (JSDoc, Storybook)

### Design System Compliance
- [ ] Uses design tokens for colors, spacing, typography
- [ ] Follows design system component patterns
- [ ] Implements all required variants
- [ ] Responsive behavior matches design specs
- [ ] Supports theming (light/dark mode)

## Component Composition Examples

### Building Complex UIs with Composition

```javascript
// Base components (atoms)
const Button = ({ children, variant, ...props }) => (
  <button className={`btn btn-${variant}`} {...props}>
    {children}
  </button>
);

const Icon = ({ name, size = 16 }) => (
  <svg className="icon" width={size} height={size}>
    {/* Icon content */}
  </svg>
);

const Text = ({ as: Component = 'span', size, weight, children }) => (
  <Component className={`text text-${size} font-${weight}`}>
    {children}
  </Component>
);

// Composite components (molecules)
const IconButton = ({ icon, label, ...props }) => (
  <Button {...props}>
    <Icon name={icon} />
    {label && <Text>{label}</Text>}
  </Button>
);

const Card = ({ title, children, actions }) => (
  <div className="card">
    <Card.Header>
      <Text as="h3" size="lg" weight="semibold">{title}</Text>
    </Card.Header>
    <Card.Body>{children}</Card.Body>
    {actions && <Card.Footer>{actions}</Card.Footer>}
  </div>
);

// Complex components (organisms)
const UserProfile = ({ user }) => (
  <Card
    title={user.name}
    actions={
      <>
        <IconButton icon="edit" label="Edit" variant="secondary" />
        <IconButton icon="delete" label="Delete" variant="danger" />
      </>
    }
  >
    <div className="user-details">
      <Text>{user.email}</Text>
      <Text size="sm" weight="light">{user.bio}</Text>
    </div>
  </Card>
);
```

## Advanced Patterns

### Context-Based Component Communication

```javascript
// Theme context for component styling
const ThemeContext = createContext();

export const ThemeProvider = ({ children, theme = 'light' }) => {
  const [currentTheme, setTheme] = useState(theme);

  return (
    <ThemeContext.Provider value={{ theme: currentTheme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => useContext(ThemeContext);

// Components consume theme
const ThemedButton = ({ children, ...props }) => {
  const { theme } = useTheme();
  return (
    <button className={`btn btn-${theme}`} {...props}>
      {children}
    </button>
  );
};
```

### Component Slot Pattern

```javascript
// Flexible layout component with named slots
const Layout = ({ header, sidebar, footer, children }) => (
  <div className="layout">
    {header && <div className="layout-header">{header}</div>}
    <div className="layout-main">
      {sidebar && <aside className="layout-sidebar">{sidebar}</aside>}
      <main className="layout-content">{children}</main>
    </div>
    {footer && <div className="layout-footer">{footer}</div>}
  </div>
);

// Usage with component composition
<Layout
  header={<Header />}
  sidebar={<Navigation />}
  footer={<Footer />}
>
  <PageContent />
</Layout>
```

## Best Practices

### Component Organization
- Keep components small and focused (< 200 lines)
- Extract complex logic to custom hooks/composables
- Group related components in feature folders
- Use index files for clean imports

### Props Design
- Use descriptive prop names
- Provide prop types/interfaces
- Set sensible defaults
- Document complex props with comments
- Use object props for related values

### Performance Optimization
- Memoize expensive computations
- Use React.memo/Vue computed for derived state
- Implement virtual scrolling for long lists
- Lazy load components when appropriate
- Optimize re-renders with proper dependencies

### Testing Strategy
- Test component behavior, not implementation
- Test user interactions
- Test different prop combinations
- Test error states and edge cases
- Use accessibility testing tools

---

**Remember**: Good component architecture enables scalability, maintainability, and developer productivity. Focus on composition, reusability, and clear interfaces.
