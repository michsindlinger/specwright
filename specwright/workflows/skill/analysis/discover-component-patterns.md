---
description: Discover component patterns from frontend codebase using Explore agent
version: 1.0
encoding: UTF-8
---

# Component Pattern Discovery

## Overview

Use the Explore agent to discover frontend component patterns, including component structure, props/interfaces, state management, event handling, lifecycle hooks, styling approaches, and composition patterns.

## Purpose

Extract real-world component implementation patterns from the project to:
- Generate framework-specific skill templates
- Identify project component conventions
- Compare against best practices
- Create customized component development guidelines

## Discovery Process

<discovery_flow>

<step number="1" name="framework_based_search">

### Step 1: Framework-Based Search Strategy

Tailor search patterns based on detected frontend framework.

<framework_strategies>
  REACT:
    SEARCH_PATTERNS:
      Components: ["src/**/*.tsx", "src/**/*.jsx", "src/components/**/*"]
      Hooks: ["src/hooks/**/*.ts", "src/hooks/**/*.js", "**/*use*.ts", "**/*use*.js"]
      Context: ["src/context/**/*", "src/contexts/**/*", "**/*Context.tsx"]
      Pages: ["src/pages/**/*", "src/views/**/*", "pages/**/*"]
      Utils: ["src/utils/**/*", "src/helpers/**/*"]

  ANGULAR:
    SEARCH_PATTERNS:
      Components: ["src/**/*.component.ts", "**/*.component.ts"]
      Services: ["src/**/*.service.ts", "**/*.service.ts"]
      Directives: ["src/**/*.directive.ts"]
      Pipes: ["src/**/*.pipe.ts"]
      Guards: ["src/**/*.guard.ts"]
      Modules: ["src/**/*.module.ts"]

  VUE:
    SEARCH_PATTERNS:
      Components: ["src/**/*.vue", "src/components/**/*.vue"]
      Composables: ["src/composables/**/*.ts", "src/composables/**/*.js"]
      Stores: ["src/stores/**/*", "src/store/**/*"]
      Views: ["src/views/**/*.vue", "src/pages/**/*.vue"]
      Directives: ["src/directives/**/*"]

  SVELTE:
    SEARCH_PATTERNS:
      Components: ["src/**/*.svelte", "src/lib/**/*.svelte"]
      Stores: ["src/stores/**/*.ts", "src/stores/**/*.js", "src/lib/stores/**/*"]
      Routes: ["src/routes/**/*.svelte", "src/routes/**/*.ts"]
      Actions: ["src/lib/actions/**/*"]
      Utilities: ["src/lib/**/*.ts", "src/lib/**/*.js"]
</framework_strategies>

</step>

<step number="2" name="explore_agent_orchestration">

### Step 2: Explore Agent Orchestration

Use Explore agent to discover component files and patterns systematically.

<exploration_strategy>
  USE: Task tool with subagent_type="Explore"
  THOROUGHNESS: "medium"

  FOR each pattern_category (Components, Hooks, Services, etc.):
    EXECUTE: Separate Explore agent task

    PROMPT_TEMPLATE:
      "Discover {category} patterns in the {framework} codebase:

       Search for: {file_patterns}

       Please find and analyze files that match these patterns:
       - Identify key files (top 10-15 most representative components)
       - Extract common component patterns
       - Note naming conventions
       - Identify architectural patterns

       Focus on:
       - {framework_specific_focus}

       Return file paths and key observations about patterns."
</exploration_strategy>

<react_exploration>
  COMPONENT_DISCOVERY:
    PROMPT: "Discover React component patterns:
             - Search for files: src/**/*.tsx, src/**/*.jsx, src/components/**/*
             - Focus on: Functional components, hooks usage, TypeScript interfaces
             - Extract: Component structure, props patterns, state management
             - Identify: Common patterns for component organization, naming, exports"

    EXPECTED_FINDINGS:
      - Functional component declarations
      - Props interface/type definitions
      - useState, useEffect, useCallback, useMemo usage
      - Custom hooks usage
      - Component composition patterns
      - Export patterns (default vs named)

  HOOKS_DISCOVERY:
    PROMPT: "Discover React custom hooks patterns:
             - Search for files: src/hooks/**/*.ts, **/*use*.ts
             - Focus on: Custom hook implementation, naming conventions
             - Extract: Hook structure, dependencies, return values
             - Identify: Reusable logic patterns, hook composition"

    EXPECTED_FINDINGS:
      - Custom hook naming (use* prefix)
      - Hook composition patterns
      - Dependency array management
      - Return value patterns (object, array, tuple)
      - Error handling in hooks

  STATE_MANAGEMENT_DISCOVERY:
    PROMPT: "Discover React state management patterns:
             - Search for: Context providers, Redux/Zustand stores
             - Focus on: Global state patterns, state organization
             - Extract: State structure, actions, selectors
             - Identify: State management approach"

    EXPECTED_FINDINGS:
      - Context API usage (Provider, Consumer)
      - Redux toolkit patterns (slices, thunks)
      - Zustand store patterns
      - State update patterns
      - Selector patterns

  STYLING_DISCOVERY:
    PROMPT: "Discover React styling patterns:
             - Search for: Styled components, CSS modules, Tailwind usage
             - Focus on: Styling approach consistency
             - Extract: Style organization, theme usage
             - Identify: Preferred styling method"

    EXPECTED_FINDINGS:
      - CSS Modules usage
      - Tailwind className patterns
      - Styled-components patterns
      - Style composition
      - Theme variables usage
</react_exploration>

<angular_exploration>
  COMPONENT_DISCOVERY:
    PROMPT: "Discover Angular component patterns:
             - Search for files: src/**/*.component.ts
             - Focus on: Component decorator, template syntax, change detection
             - Extract: Component structure, lifecycle hooks, decorators
             - Identify: Component organization patterns"

    EXPECTED_FINDINGS:
      - @Component decorator usage
      - standalone: true/false
      - changeDetection strategy
      - Lifecycle hooks (ngOnInit, ngOnDestroy, etc.)
      - Template syntax patterns
      - ViewChild/ContentChild usage

  SERVICE_DISCOVERY:
    PROMPT: "Discover Angular service patterns:
             - Search for files: src/**/*.service.ts
             - Focus on: Service decorator, dependency injection
             - Extract: Service structure, providedIn configuration
             - Identify: Service patterns and organization"

    EXPECTED_FINDINGS:
      - @Injectable decorator
      - providedIn: 'root' | module
      - Dependency injection patterns
      - RxJS usage in services
      - HTTP client patterns
      - Service method patterns

  RXJS_DISCOVERY:
    PROMPT: "Discover RxJS patterns in Angular:
             - Search for: Observable usage, operators, subscriptions
             - Focus on: Reactive programming patterns
             - Extract: Observable creation, transformation, subscription
             - Identify: Common RxJS patterns"

    EXPECTED_FINDINGS:
      - Observable creation
      - Pipe and operator usage
      - Subscription management
      - AsyncPipe in templates
      - Subject/BehaviorSubject usage
      - Error handling with catchError
</angular_exploration>

<vue_exploration>
  COMPONENT_DISCOVERY:
    PROMPT: "Discover Vue component patterns:
             - Search for files: src/**/*.vue, src/components/**/*.vue
             - Focus on: Script setup, Composition API vs Options API
             - Extract: Component structure, props, emits, reactive state
             - Identify: Vue component conventions"

    EXPECTED_FINDINGS:
      - <script setup> usage
      - defineProps, defineEmits usage
      - ref, reactive, computed usage
      - Options API patterns (if Vue 2 or legacy code)
      - Template syntax patterns
      - Component imports and registration

  COMPOSABLES_DISCOVERY:
    PROMPT: "Discover Vue composables patterns:
             - Search for files: src/composables/**/*.ts
             - Focus on: Composable functions, reusable logic
             - Extract: Composable structure, lifecycle integration
             - Identify: Composition patterns"

    EXPECTED_FINDINGS:
      - use* naming convention
      - Reactive state in composables
      - onMounted, onUnmounted usage
      - Return value patterns
      - Composable composition

  STATE_MANAGEMENT_DISCOVERY:
    PROMPT: "Discover Vue state management patterns:
             - Search for: Pinia stores, Vuex stores
             - Focus on: Store organization, state patterns
             - Extract: Store structure, actions, getters
             - Identify: State management approach"

    EXPECTED_FINDINGS:
      - Pinia defineStore usage (Vue 3)
      - Vuex store modules (Vue 2)
      - State definition patterns
      - Action and getter patterns
      - Store composition
</vue_exploration>

<svelte_exploration>
  COMPONENT_DISCOVERY:
    PROMPT: "Discover Svelte component patterns:
             - Search for files: src/**/*.svelte, src/lib/**/*.svelte
             - Focus on: Script tag, reactive declarations, component props
             - Extract: Component structure, reactivity patterns
             - Identify: Svelte component conventions"

    EXPECTED_FINDINGS:
      - <script> tag usage
      - export let for props
      - $: reactive declarations
      - Event dispatching
      - Slot usage
      - Component composition

  STORES_DISCOVERY:
    PROMPT: "Discover Svelte stores patterns:
             - Search for files: src/stores/**/*.ts, src/lib/stores/**/*
             - Focus on: Writable, readable, derived stores
             - Extract: Store creation, subscription patterns
             - Identify: Store organization"

    EXPECTED_FINDINGS:
      - writable, readable, derived usage
      - Custom store creation
      - Store subscription patterns
      - Store update patterns
      - $store auto-subscription

  ACTIONS_DISCOVERY:
    PROMPT: "Discover Svelte actions patterns:
             - Search for files: src/lib/actions/**/*
             - Focus on: use:action directive patterns
             - Extract: Action implementation
             - Identify: Common action patterns"

    EXPECTED_FINDINGS:
      - Action function structure
      - Parameter handling
      - Update and destroy lifecycle
      - DOM manipulation patterns
</svelte_exploration>

</step>

<step number="3" name="pattern_extraction">

### Step 3: Extract Patterns from Discovered Files

Process Explore agent results to extract concrete component patterns.

<extraction_process>
  FOR each discovered_file:
    READ: File content (using Read tool)
    IDENTIFY: Pattern category
    EXTRACT: Code snippets

    PATTERN_CATEGORIES:
      - component_structure
      - props_definition
      - state_management
      - event_handling
      - lifecycle_hooks
      - styling_approach
      - composition_patterns
      - performance_optimization
      - error_handling
      - type_definitions
</extraction_process>

<component_structure_patterns>
  REACT:
    EXTRACT:
      - Functional component declaration
      - Component naming (PascalCase)
      - Export pattern (default vs named)
      - File organization

    EXAMPLE:
      ```typescript
      // src/components/UserProfile/UserProfile.tsx
      import React from 'react';
      import { UserProfileProps } from './UserProfile.types';
      import styles from './UserProfile.module.css';

      export const UserProfile: React.FC<UserProfileProps> = ({ user, onEdit }) => {
        // Component implementation
        return (
          <div className={styles.container}>
            {/* Component JSX */}
          </div>
        );
      };
      ```

  ANGULAR:
    EXTRACT:
      - @Component decorator
      - Component class structure
      - Standalone components
      - Change detection strategy

    EXAMPLE:
      ```typescript
      @Component({
        selector: 'app-user-profile',
        standalone: true,
        templateUrl: './user-profile.component.html',
        styleUrls: ['./user-profile.component.css'],
        changeDetection: ChangeDetectionStrategy.OnPush
      })
      export class UserProfileComponent implements OnInit {
        // Component implementation
      }
      ```

  VUE:
    EXTRACT:
      - <script setup> vs Options API
      - Component registration
      - Single-file component structure

    EXAMPLE:
      ```vue
      <script setup lang="ts">
      import { ref, computed } from 'vue';
      import type { User } from '@/types';

      interface Props {
        user: User;
      }

      const props = defineProps<Props>();
      const emit = defineEmits<{ edit: [] }>();
      </script>

      <template>
        <div class="user-profile">
          <!-- Template -->
        </div>
      </template>

      <style scoped>
      /* Styles */
      </style>
      ```

  SVELTE:
    EXTRACT:
      - <script> tag
      - Component props (export let)
      - Reactive declarations

    EXAMPLE:
      ```svelte
      <script lang="ts">
        import type { User } from '$lib/types';
        import { createEventDispatcher } from 'svelte';

        export let user: User;

        const dispatch = createEventDispatcher();
        $: displayName = `${user.firstName} ${user.lastName}`;
      </script>

      <div class="user-profile">
        <!-- Template -->
      </div>

      <style>
      /* Styles */
      </style>
      ```
</component_structure_patterns>

<props_patterns>
  REACT:
    EXTRACT:
      - TypeScript interface for props
      - Props destructuring
      - Default props
      - Optional props

    EXAMPLE:
      ```typescript
      interface UserProfileProps {
        user: User;
        showAvatar?: boolean;
        onEdit?: (user: User) => void;
      }

      export const UserProfile: React.FC<UserProfileProps> = ({
        user,
        showAvatar = true,
        onEdit
      }) => {
        // ...
      };
      ```

  ANGULAR:
    EXTRACT:
      - @Input() decorators
      - @Output() EventEmitter
      - Input transforms
      - Required inputs

    EXAMPLE:
      ```typescript
      export class UserProfileComponent {
        @Input({ required: true }) user!: User;
        @Input() showAvatar = true;
        @Output() edit = new EventEmitter<User>();
      }
      ```

  VUE:
    EXTRACT:
      - defineProps usage
      - Props with defaults
      - PropType definitions
      - defineEmits for events

    EXAMPLE:
      ```typescript
      interface Props {
        user: User;
        showAvatar?: boolean;
      }

      const props = withDefaults(defineProps<Props>(), {
        showAvatar: true
      });

      const emit = defineEmits<{
        edit: [user: User]
      }>();
      ```

  SVELTE:
    EXTRACT:
      - export let for props
      - Default values
      - TypeScript types

    EXAMPLE:
      ```typescript
      export let user: User;
      export let showAvatar = true;
      ```
</props_patterns>

<state_management_patterns>
  REACT:
    EXTRACT:
      - useState hooks
      - useReducer for complex state
      - Context API usage
      - Redux/Zustand patterns

    EXAMPLE:
      ```typescript
      const [isEditing, setIsEditing] = useState(false);
      const [formData, setFormData] = useState<UserFormData>({ ... });

      const handleSubmit = useCallback(() => {
        // Handle form submission
      }, [formData]);
      ```

  ANGULAR:
    EXTRACT:
      - Component state properties
      - RxJS BehaviorSubject
      - Service state management
      - Signal usage (Angular 16+)

    EXAMPLE:
      ```typescript
      export class UserProfileComponent {
        isEditing = false;
        private userSubject = new BehaviorSubject<User>(initialUser);
        user$ = this.userSubject.asObservable();
      }
      ```

  VUE:
    EXTRACT:
      - ref, reactive usage
      - computed properties
      - Pinia store usage
      - State update patterns

    EXAMPLE:
      ```typescript
      const isEditing = ref(false);
      const formData = reactive<UserFormData>({ ... });
      const displayName = computed(() =>
        `${formData.firstName} ${formData.lastName}`
      );
      ```

  SVELTE:
    EXTRACT:
      - let for mutable state
      - $: for reactive declarations
      - Store subscriptions

    EXAMPLE:
      ```typescript
      let isEditing = false;
      $: displayName = `${user.firstName} ${user.lastName}`;
      ```
</state_management_patterns>

<event_handling_patterns>
  REACT:
    EXTRACT:
      - Event handler naming (handleX)
      - useCallback for optimization
      - Event type definitions

    EXAMPLE:
      ```typescript
      const handleEdit = useCallback((e: React.MouseEvent) => {
        e.preventDefault();
        setIsEditing(true);
      }, []);

      const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
      };
      ```

  ANGULAR:
    EXTRACT:
      - (click) event binding
      - Event handler methods
      - $event usage

    EXAMPLE:
      ```typescript
      // Template: (click)="handleEdit($event)"
      handleEdit(event: MouseEvent): void {
        event.preventDefault();
        this.isEditing = true;
      }
      ```

  VUE:
    EXTRACT:
      - @click, @input event directives
      - Event handler functions
      - Event modifiers (.prevent, .stop)

    EXAMPLE:
      ```vue
      <template>
        <button @click.prevent="handleEdit">Edit</button>
      </template>

      <script setup>
      const handleEdit = () => {
        isEditing.value = true;
      };
      </script>
      ```

  SVELTE:
    EXTRACT:
      - on:click directives
      - Event handler functions
      - Event modifiers (|preventDefault)

    EXAMPLE:
      ```svelte
      <button on:click|preventDefault={handleEdit}>Edit</button>

      <script>
      function handleEdit() {
        isEditing = true;
      }
      </script>
      ```
</event_handling_patterns>

<styling_patterns>
  REACT:
    EXTRACT:
      - CSS Modules
      - Tailwind className usage
      - styled-components
      - Inline styles

    EXAMPLE:
      ```typescript
      // CSS Modules
      import styles from './UserProfile.module.css';
      <div className={styles.container}>...</div>

      // Tailwind
      <div className="flex items-center gap-4 p-4">...</div>

      // styled-components
      const Container = styled.div`
        display: flex;
        padding: 1rem;
      `;
      ```

  ANGULAR:
    EXTRACT:
      - Component styleUrls
      - ViewEncapsulation
      - ngClass directive
      - Host binding for classes

    EXAMPLE:
      ```typescript
      @Component({
        styleUrls: ['./user-profile.component.css'],
        encapsulation: ViewEncapsulation.Emulated
      })
      ```

  VUE:
    EXTRACT:
      - <style scoped>
      - :class bindings
      - CSS Modules
      - Tailwind usage

    EXAMPLE:
      ```vue
      <template>
        <div :class="{ active: isActive }">...</div>
      </template>

      <style scoped>
      .active { color: blue; }
      </style>
      ```

  SVELTE:
    EXTRACT:
      - <style> tag
      - class: directive
      - Global styles

    EXAMPLE:
      ```svelte
      <div class:active={isActive}>...</div>

      <style>
      .active { color: blue; }
      </style>
      ```
</styling_patterns>

</step>

<step number="4" name="pattern_normalization">

### Step 4: Normalize and Aggregate Patterns

Use the extract-patterns utility to normalize discovered patterns.

<normalization>
  LOAD: @specwright/workflows/skill/utils/extract-patterns.md

  FOR each pattern_category:
    NORMALIZE: Code snippets
    CALCULATE: Frequency
    RANK: By usage
    DEDUPLICATE: Similar patterns
    SELECT: Best examples

  OUTPUT: Structured pattern data
</normalization>

</step>

<step number="5" name="pattern_summary">

### Step 5: Generate Pattern Summary

Create comprehensive summary of discovered component patterns.

<summary_structure>
  {
    framework: "react",
    discovery_date: "2025-12-31",
    files_analyzed: 67,
    typescript_usage: true,

    patterns_by_category: {
      component_structure: {
        dominant_pattern: "Functional components with TypeScript",
        occurrences: 65,
        examples: [...]
      },

      props_definition: {
        dominant_pattern: "TypeScript interface with destructuring",
        occurrences: 67,
        examples: [...]
      },

      state_management: {
        dominant_pattern: "useState for local state",
        secondary_pattern: "Zustand for global state",
        occurrences: 45,
        examples: [...]
      },

      styling: {
        dominant_pattern: "Tailwind CSS",
        secondary_pattern: "CSS Modules",
        occurrences: 50,
        examples: [...]
      },

      event_handling: {
        dominant_pattern: "useCallback for event handlers",
        occurrences: 38,
        examples: [...]
      }
    },

    naming_conventions: {
      components: "PascalCase",
      hooks: "camelCase with 'use' prefix",
      handlers: "camelCase with 'handle' prefix",
      types: "PascalCase with Props/State suffix"
    },

    architectural_patterns: [
      "Component composition over inheritance",
      "Custom hooks for reusable logic",
      "Zustand for global state management",
      "Tailwind utility-first CSS"
    ],

    recommendations: [
      "Consider implementing consistent error boundaries",
      "Add more useMemo for expensive computations",
      "Standardize loading and error states across components"
    ]
  }
</summary_structure>

</step>

</discovery_flow>

## Output Format

<output>
  {
    discovery_summary: {
      framework: "react",
      version: "18.2.0",
      typescript: true,
      files_analyzed: 67,
      patterns_found: 45,
      categories_covered: 7,
      confidence: "high"
    },

    patterns: {
      component_structure: [...],
      props_definition: [...],
      state_management: [...],
      event_handling: [...],
      lifecycle_hooks: [...],
      styling_approach: [...],
      composition_patterns: [...]
    },

    naming_conventions: {...},
    architectural_patterns: [...],
    recommendations: [...]
  }
</output>

## Error Handling

<error_protocols>
  <explore_agent_failure>
    RETRY: With adjusted search patterns
    FALLBACK: Manual file globbing
    WARN: User about limited pattern discovery
  </explore_agent_failure>

  <insufficient_files>
    IF files_found < 5:
      WARN: "Limited component patterns found in codebase"
      SUGGEST: "Consider using --best-practices mode"
      PROCEED: With available patterns
  </insufficient_files>

  <file_read_error>
    LOG: Failed file paths
    SKIP: Unreadable files
    CONTINUE: With accessible files
  </file_read_error>
</error_protocols>

## Performance Considerations

- Limit Explore agent to top 15 components per category
- Process categories in parallel when possible
- Cache file reads across pattern categories
- Early termination if sufficient patterns found (30+ patterns)

## Related Utilities

- `@specwright/workflows/skill/utils/extract-patterns.md`
- `@specwright/workflows/skill/utils/detect-frontend.md`
- `@specwright/workflows/skill/validation/compare-patterns.md`
