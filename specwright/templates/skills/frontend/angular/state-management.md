# Angular State Management

> Part of: Angular Frontend Skill
> Use when: Managing application state

## State Types

| Type | Location | Tool |
|------|----------|------|
| Component State | Component | Signals, Properties |
| Shared State | Service | Signals, BehaviorSubject |
| Global State | Store | NgRx, Signals Store |
| Server State | Cache | TanStack Query, Custom |

## Signals (Recommended for Angular 16+)

### Basic Signal
```typescript
import { signal, computed, effect } from '@angular/core';

// Writable signal
const count = signal(0);
count.set(5);
count.update(c => c + 1);

// Read value
console.log(count()); // 6

// Computed (derived state)
const doubled = computed(() => count() * 2);

// Effect (side effects)
effect(() => {
  console.log('Count changed:', count());
});
```

### Service with Signals
```typescript
@Injectable({ providedIn: 'root' })
export class UserService {
  // Private writable
  private _users = signal<User[]>([]);
  private _loading = signal(false);
  private _error = signal<string | null>(null);

  // Public readonly
  users = this._users.asReadonly();
  loading = this._loading.asReadonly();
  error = this._error.asReadonly();

  // Computed
  activeUsers = computed(() =>
    this._users().filter(u => u.isActive)
  );

  async loadUsers() {
    this._loading.set(true);
    this._error.set(null);

    try {
      const users = await this.http.get<User[]>('/api/users');
      this._users.set(users);
    } catch (e) {
      this._error.set('Failed to load users');
    } finally {
      this._loading.set(false);
    }
  }

  addUser(user: User) {
    this._users.update(users => [...users, user]);
  }
}
```

## RxJS BehaviorSubject (Legacy/Complex)

### When to Use
- Complex async workflows
- Need operators like debounce, switchMap
- Existing codebase uses RxJS

```typescript
@Injectable({ providedIn: 'root' })
export class UserService {
  private usersSubject = new BehaviorSubject<User[]>([]);
  users$ = this.usersSubject.asObservable();

  loadUsers() {
    return this.http.get<User[]>('/api/users').pipe(
      tap(users => this.usersSubject.next(users))
    );
  }
}
```

## NgRx (Large Applications)

### When to Use NgRx
- Large team
- Complex state interactions
- Need time-travel debugging
- Strict separation of concerns

### Basic Setup
```typescript
// State
interface AppState {
  users: UserState;
}

interface UserState {
  users: User[];
  loading: boolean;
  error: string | null;
}

// Actions
export const loadUsers = createAction('[User] Load Users');
export const loadUsersSuccess = createAction(
  '[User] Load Users Success',
  props<{ users: User[] }>()
);

// Reducer
export const userReducer = createReducer(
  initialState,
  on(loadUsers, state => ({ ...state, loading: true })),
  on(loadUsersSuccess, (state, { users }) => ({
    ...state,
    users,
    loading: false
  }))
);

// Selectors
export const selectUsers = (state: AppState) => state.users.users;
export const selectLoading = (state: AppState) => state.users.loading;

// Effects
loadUsers$ = createEffect(() =>
  this.actions$.pipe(
    ofType(loadUsers),
    switchMap(() =>
      this.userService.getUsers().pipe(
        map(users => loadUsersSuccess({ users }))
      )
    )
  )
);
```

## NgRx Signals Store (Modern NgRx)

### Simpler than classic NgRx
```typescript
export const UserStore = signalStore(
  { providedIn: 'root' },
  withState<UserState>({
    users: [],
    loading: false,
    error: null
  }),
  withComputed((state) => ({
    activeUsers: computed(() =>
      state.users().filter(u => u.isActive)
    )
  })),
  withMethods((store, userService = inject(UserService)) => ({
    async loadUsers() {
      patchState(store, { loading: true });
      const users = await userService.getUsers();
      patchState(store, { users, loading: false });
    }
  }))
);
```

## Best Practices

1. **Start Simple**: Use signals in services first
2. **Lift State Up**: When multiple components need same state
3. **Single Source of Truth**: Don't duplicate state
4. **Immutable Updates**: Always create new references
5. **Computed Over Manual**: Use computed() for derived state
6. **Cleanup Subscriptions**: Use takeUntilDestroyed() or DestroyRef
