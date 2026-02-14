# State Management

> Skill Template: Frontend Development
> Category: Application State & Data Flow
> Version: 1.0.0
> Created: 2026-01-09

## Purpose

Implement scalable state management patterns for frontend applications using modern state management libraries, reactive programming, and data flow architectures.

## When to Activate

Activate this skill when:
- Designing application state architecture
- Implementing global state management
- Managing complex data flows
- Synchronizing client and server state
- Implementing caching strategies
- Handling optimistic updates
- Managing form state
- Implementing undo/redo functionality

## Core Capabilities

### State Management Patterns
- **Local Component State**: useState, reactive refs
- **Derived State**: Computed values and memoization
- **Global State**: Context, stores, state machines
- **Server State**: Query caching and synchronization
- **URL State**: Route parameters and query strings
- **Form State**: Validation and submission handling

### Data Flow Architectures
- Unidirectional data flow
- Flux/Redux patterns
- Reactive programming patterns
- Event-driven state updates
- Optimistic UI updates
- State normalization

### State Categories
- **UI State**: Component visibility, active tabs, modals
- **Form State**: Input values, validation, dirty tracking
- **Server Cache**: API response data, cache invalidation
- **User Session**: Authentication, preferences, settings
- **Application State**: Feature flags, configuration

## [TECH_STACK_SPECIFIC] Patterns

### React State Management

#### Local State with Hooks

```javascript
import { useState, useReducer, useCallback } from 'react';

// Simple state with useState
const Counter = () => {
  const [count, setCount] = useState(0);
  const increment = () => setCount(c => c + 1);

  return <button onClick={increment}>Count: {count}</button>;
};

// Complex state with useReducer
const todoReducer = (state, action) => {
  switch (action.type) {
    case 'ADD_TODO':
      return [...state, { id: Date.now(), text: action.payload, done: false }];
    case 'TOGGLE_TODO':
      return state.map(todo =>
        todo.id === action.payload ? { ...todo, done: !todo.done } : todo
      );
    case 'DELETE_TODO':
      return state.filter(todo => todo.id !== action.payload);
    default:
      return state;
  }
};

const TodoList = () => {
  const [todos, dispatch] = useReducer(todoReducer, []);

  const addTodo = useCallback((text) => {
    dispatch({ type: 'ADD_TODO', payload: text });
  }, []);

  const toggleTodo = useCallback((id) => {
    dispatch({ type: 'TOGGLE_TODO', payload: id });
  }, []);

  return (
    <div>
      {todos.map(todo => (
        <TodoItem
          key={todo.id}
          todo={todo}
          onToggle={toggleTodo}
        />
      ))}
    </div>
  );
};
```

#### Context-Based Global State

```javascript
import { createContext, useContext, useReducer } from 'react';

// Create context
const AppStateContext = createContext();

// State reducer
const appReducer = (state, action) => {
  switch (action.type) {
    case 'SET_USER':
      return { ...state, user: action.payload };
    case 'SET_THEME':
      return { ...state, theme: action.payload };
    case 'TOGGLE_SIDEBAR':
      return { ...state, sidebarOpen: !state.sidebarOpen };
    default:
      return state;
  }
};

// Provider component
export const AppStateProvider = ({ children }) => {
  const [state, dispatch] = useReducer(appReducer, {
    user: null,
    theme: 'light',
    sidebarOpen: false
  });

  return (
    <AppStateContext.Provider value={{ state, dispatch }}>
      {children}
    </AppStateContext.Provider>
  );
};

// Custom hook for consuming state
export const useAppState = () => {
  const context = useContext(AppStateContext);
  if (!context) {
    throw new Error('useAppState must be used within AppStateProvider');
  }
  return context;
};

// Usage in components
const Header = () => {
  const { state, dispatch } = useAppState();

  const toggleTheme = () => {
    dispatch({
      type: 'SET_THEME',
      payload: state.theme === 'light' ? 'dark' : 'light'
    });
  };

  return (
    <header className={`header header-${state.theme}`}>
      <button onClick={toggleTheme}>Toggle Theme</button>
    </header>
  );
};
```

#### Zustand Store Pattern

```javascript
import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';

// Simple store
const useCounterStore = create((set) => ({
  count: 0,
  increment: () => set((state) => ({ count: state.count + 1 })),
  decrement: () => set((state) => ({ count: state.count - 1 })),
  reset: () => set({ count: 0 })
}));

// Store with middleware (devtools + persist)
const useUserStore = create(
  devtools(
    persist(
      (set, get) => ({
        user: null,
        token: null,

        login: (user, token) => set({ user, token }),

        logout: () => set({ user: null, token: null }),

        updateProfile: (updates) =>
          set({ user: { ...get().user, ...updates } })
      }),
      { name: 'user-storage' }
    )
  )
);

// Computed/derived state
const useCartStore = create((set, get) => ({
  items: [],

  addItem: (item) => set((state) => ({
    items: [...state.items, item]
  })),

  removeItem: (id) => set((state) => ({
    items: state.items.filter(item => item.id !== id)
  })),

  // Computed values
  get totalPrice() {
    return get().items.reduce((sum, item) => sum + item.price, 0);
  },

  get itemCount() {
    return get().items.length;
  }
}));

// Usage in components
const Cart = () => {
  const { items, totalPrice, addItem, removeItem } = useCartStore();

  return (
    <div>
      <h2>Cart ({items.length} items)</h2>
      {items.map(item => (
        <CartItem key={item.id} item={item} onRemove={removeItem} />
      ))}
      <div>Total: ${totalPrice.toFixed(2)}</div>
    </div>
  );
};
```

#### React Query for Server State

```javascript
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

// Fetch data with caching
const useUsers = () => {
  return useQuery({
    queryKey: ['users'],
    queryFn: async () => {
      const response = await fetch('/api/users');
      return response.json();
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    cacheTime: 10 * 60 * 1000 // 10 minutes
  });
};

// Mutation with optimistic updates
const useUpdateUser = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, updates }) => {
      const response = await fetch(`/api/users/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates)
      });
      return response.json();
    },

    // Optimistic update
    onMutate: async ({ id, updates }) => {
      await queryClient.cancelQueries({ queryKey: ['users'] });

      const previousUsers = queryClient.getQueryData(['users']);

      queryClient.setQueryData(['users'], (old) =>
        old.map(user => user.id === id ? { ...user, ...updates } : user)
      );

      return { previousUsers };
    },

    // Rollback on error
    onError: (err, variables, context) => {
      queryClient.setQueryData(['users'], context.previousUsers);
    },

    // Refetch after success
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
    }
  });
};

// Usage in component
const UserList = () => {
  const { data: users, isLoading, error } = useUsers();
  const updateUser = useUpdateUser();

  if (isLoading) return <Spinner />;
  if (error) return <Error message={error.message} />;

  const handleUpdate = (id, updates) => {
    updateUser.mutate({ id, updates });
  };

  return (
    <div>
      {users.map(user => (
        <UserCard key={user.id} user={user} onUpdate={handleUpdate} />
      ))}
    </div>
  );
};
```

### Vue State Management

#### Pinia Store (Vue 3)

```javascript
import { defineStore } from 'pinia';

// Options API style
export const useCounterStore = defineStore('counter', {
  state: () => ({
    count: 0,
    name: 'Counter'
  }),

  getters: {
    doubleCount: (state) => state.count * 2,

    countPlusOne() {
      return this.count + 1;
    }
  },

  actions: {
    increment() {
      this.count++;
    },

    async fetchCount() {
      const response = await fetch('/api/count');
      const data = await response.json();
      this.count = data.count;
    }
  }
});

// Composition API style
export const useUserStore = defineStore('user', () => {
  const user = ref(null);
  const token = ref(null);

  const isAuthenticated = computed(() => !!token.value);

  const login = async (credentials) => {
    const response = await fetch('/api/login', {
      method: 'POST',
      body: JSON.stringify(credentials)
    });
    const data = await response.json();
    user.value = data.user;
    token.value = data.token;
  };

  const logout = () => {
    user.value = null;
    token.value = null;
  };

  return { user, token, isAuthenticated, login, logout };
});

// Usage in components
<script setup>
import { useCounterStore } from '@/stores/counter';

const counter = useCounterStore();
</script>

<template>
  <div>
    <p>Count: {{ counter.count }}</p>
    <p>Double: {{ counter.doubleCount }}</p>
    <button @click="counter.increment">Increment</button>
  </div>
</template>
```

#### Composables for State

```javascript
// useToggle composable
export function useToggle(initialValue = false) {
  const value = ref(initialValue);

  const toggle = () => {
    value.value = !value.value;
  };

  const setTrue = () => {
    value.value = true;
  };

  const setFalse = () => {
    value.value = false;
  };

  return { value, toggle, setTrue, setFalse };
}

// useAsync composable for data fetching
export function useAsync(asyncFunction) {
  const data = ref(null);
  const error = ref(null);
  const loading = ref(false);

  const execute = async (...params) => {
    loading.value = true;
    error.value = null;

    try {
      data.value = await asyncFunction(...params);
    } catch (e) {
      error.value = e;
    } finally {
      loading.value = false;
    }
  };

  return { data, error, loading, execute };
}

// Usage
<script setup>
const { value: isOpen, toggle } = useToggle(false);

const fetchUsers = async () => {
  const response = await fetch('/api/users');
  return response.json();
};

const { data: users, loading, execute: loadUsers } = useAsync(fetchUsers);

onMounted(() => {
  loadUsers();
});
</script>
```

### Angular State Management

#### Service-Based State

```typescript
import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class CounterService {
  private countSubject = new BehaviorSubject<number>(0);
  public count$: Observable<number> = this.countSubject.asObservable();

  increment(): void {
    this.countSubject.next(this.countSubject.value + 1);
  }

  decrement(): void {
    this.countSubject.next(this.countSubject.value - 1);
  }

  reset(): void {
    this.countSubject.next(0);
  }
}

// Usage in component
@Component({
  selector: 'app-counter',
  template: `
    <div>
      <p>Count: {{ count$ | async }}</p>
      <button (click)="increment()">+</button>
      <button (click)="decrement()">-</button>
    </div>
  `
})
export class CounterComponent {
  count$ = this.counterService.count$;

  constructor(private counterService: CounterService) {}

  increment(): void {
    this.counterService.increment();
  }

  decrement(): void {
    this.counterService.decrement();
  }
}
```

#### NgRx Store Pattern

```typescript
// Actions
import { createAction, props } from '@ngrx/store';

export const loadUsers = createAction('[User List] Load Users');
export const loadUsersSuccess = createAction(
  '[User API] Load Users Success',
  props<{ users: User[] }>()
);
export const loadUsersFailure = createAction(
  '[User API] Load Users Failure',
  props<{ error: string }>()
);

// Reducer
import { createReducer, on } from '@ngrx/store';

export interface UserState {
  users: User[];
  loading: boolean;
  error: string | null;
}

const initialState: UserState = {
  users: [],
  loading: false,
  error: null
};

export const userReducer = createReducer(
  initialState,
  on(loadUsers, state => ({ ...state, loading: true })),
  on(loadUsersSuccess, (state, { users }) => ({
    ...state,
    users,
    loading: false,
    error: null
  })),
  on(loadUsersFailure, (state, { error }) => ({
    ...state,
    loading: false,
    error
  }))
);

// Selectors
import { createFeatureSelector, createSelector } from '@ngrx/store';

export const selectUserState = createFeatureSelector<UserState>('users');

export const selectAllUsers = createSelector(
  selectUserState,
  (state) => state.users
);

export const selectUsersLoading = createSelector(
  selectUserState,
  (state) => state.loading
);

// Usage in component
@Component({
  selector: 'app-user-list',
  template: `
    <div *ngIf="loading$ | async">Loading...</div>
    <div *ngFor="let user of users$ | async">
      {{ user.name }}
    </div>
  `
})
export class UserListComponent implements OnInit {
  users$ = this.store.select(selectAllUsers);
  loading$ = this.store.select(selectUsersLoading);

  constructor(private store: Store) {}

  ngOnInit(): void {
    this.store.dispatch(loadUsers());
  }
}
```

## Tools Required

### State Management Libraries
- **React**: Zustand, Redux Toolkit, Jotai, Recoil
- **Vue**: Pinia, Vuex
- **Angular**: NgRx, Akita, Elf

### Server State Management
- **React Query** / TanStack Query (React, Vue, Angular)
- **SWR** (React)
- **Apollo Client** (GraphQL)

### Form State Management
- **React Hook Form** (React)
- **Formik** (React)
- **VeeValidate** (Vue)
- **Angular Reactive Forms** (Angular)

### DevTools
- Redux DevTools
- Vue DevTools
- Angular DevTools
- React Query DevTools

### MCP Servers
[MCP_TOOLS]
<!-- Populated during skill creation based on:
     1. User's installed MCP servers
     2. User's selection for this skill

     Recommended for this skill (examples):
     - State management debugging tools
     - Performance monitoring platforms
     - Data flow visualization tools

     Note: Skills work without MCP servers, but functionality may be limited
-->

## Quality Checklist

### State Architecture
- [ ] State is organized by domain/feature
- [ ] State structure is normalized (no deep nesting)
- [ ] State updates are immutable
- [ ] State is properly typed (TypeScript)
- [ ] State access patterns are efficient

### Performance
- [ ] Unnecessary re-renders are prevented
- [ ] Selectors are memoized
- [ ] State updates are batched when possible
- [ ] Large state updates are optimized
- [ ] Component subscriptions are selective

### Data Flow
- [ ] Data flow is unidirectional
- [ ] State updates are predictable
- [ ] Side effects are properly managed
- [ ] Async operations are handled correctly
- [ ] Error states are managed

### Developer Experience
- [ ] State changes are debuggable
- [ ] DevTools integration works
- [ ] State updates have clear intent (action names)
- [ ] State logic is testable
- [ ] Documentation exists for complex state

### Server Synchronization
- [ ] Cache invalidation strategy is clear
- [ ] Optimistic updates are implemented
- [ ] Loading states are communicated
- [ ] Error handling is robust
- [ ] Stale data is handled appropriately

## Best Practices

### State Colocation
Keep state as close to where it's used as possible:
- Use local state for UI-only concerns
- Use global state only for truly global data
- Use URL state for shareable application state

### State Normalization
Normalize nested/relational data:

```javascript
// Bad: Nested structure
{
  posts: [
    { id: 1, title: 'Post 1', author: { id: 1, name: 'John' } },
    { id: 2, title: 'Post 2', author: { id: 1, name: 'John' } }
  ]
}

// Good: Normalized structure
{
  posts: {
    byId: {
      1: { id: 1, title: 'Post 1', authorId: 1 },
      2: { id: 2, title: 'Post 2', authorId: 1 }
    },
    allIds: [1, 2]
  },
  authors: {
    byId: {
      1: { id: 1, name: 'John' }
    },
    allIds: [1]
  }
}
```

### Derived State
Compute derived values instead of storing them:

```javascript
// Bad: Storing derived state
const [items, setItems] = useState([]);
const [itemCount, setItemCount] = useState(0);
const [totalPrice, setTotalPrice] = useState(0);

// Good: Computing derived state
const [items, setItems] = useState([]);
const itemCount = items.length;
const totalPrice = items.reduce((sum, item) => sum + item.price, 0);
```

### Immutable Updates
Always create new objects/arrays for state updates:

```javascript
// Bad: Mutating state
state.items.push(newItem);

// Good: Immutable update
setState({ items: [...state.items, newItem] });
```

---

**Remember**: Good state management is about choosing the right tool for the right job. Not all state needs global management, and not all data fetching needs caching.
