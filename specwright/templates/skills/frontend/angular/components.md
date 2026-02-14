# Angular Component Patterns

> Part of: Angular Frontend Skill
> Use when: Creating or modifying Angular components

## Component Types

### Smart Components (Container)
- Handle business logic
- Inject services
- Manage state
- Pass data to dumb components

```typescript
@Component({
  selector: 'app-user-list',
  template: `
    <app-user-card
      *ngFor="let user of users()"
      [user]="user"
      (delete)="onDelete($event)"
    />
  `,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class UserListComponent {
  private userService = inject(UserService);
  users = this.userService.users;

  onDelete(userId: string) {
    this.userService.delete(userId);
  }
}
```

### Dumb Components (Presentational)
- Pure input/output
- No service injection
- No business logic
- Highly reusable

```typescript
@Component({
  selector: 'app-user-card',
  template: `
    <div class="card">
      <h3>{{ user.name }}</h3>
      <button (click)="delete.emit(user.id)">Delete</button>
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class UserCardComponent {
  @Input({ required: true }) user!: User;
  @Output() delete = new EventEmitter<string>();
}
```

## Change Detection

### OnPush Strategy (Default)
```typescript
@Component({
  changeDetection: ChangeDetectionStrategy.OnPush
})
```

**Triggers re-render:**
- Input reference changes
- Event from component or child
- Async pipe emits
- Signal updates
- Manual `markForCheck()`

### When NOT to use OnPush
- Components with frequent DOM mutations
- Third-party libraries that mutate state

## Signals (Angular 16+)

### Component Signals
```typescript
@Component({...})
export class CounterComponent {
  count = signal(0);
  doubleCount = computed(() => this.count() * 2);

  increment() {
    this.count.update(c => c + 1);
  }
}
```

### Input Signals (Angular 17+)
```typescript
@Component({...})
export class UserComponent {
  user = input.required<User>();
  isAdmin = input(false);

  fullName = computed(() =>
    `${this.user().firstName} ${this.user().lastName}`
  );
}
```

## Lifecycle Hooks

### Common Hooks
```typescript
export class MyComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();

  ngOnInit() {
    // Initialize after inputs are set
    this.loadData();
  }

  ngOnDestroy() {
    // Cleanup subscriptions
    this.destroy$.next();
    this.destroy$.complete();
  }
}
```

### With Signals (cleaner)
```typescript
export class MyComponent {
  private userService = inject(UserService);

  constructor() {
    // Auto-cleanup with DestroyRef
    effect(() => {
      console.log('User changed:', this.userService.currentUser());
    });
  }
}
```

## Component Communication

### Parent to Child
```typescript
// Parent
<app-child [data]="parentData" />

// Child
@Input() data: DataType;
// or with signals
data = input.required<DataType>();
```

### Child to Parent
```typescript
// Child
@Output() dataChange = new EventEmitter<DataType>();
this.dataChange.emit(newData);

// Parent
<app-child (dataChange)="onDataChange($event)" />
```

### Between Siblings
Use a shared service with signals:
```typescript
@Injectable({ providedIn: 'root' })
export class SharedStateService {
  private _selectedId = signal<string | null>(null);
  selectedId = this._selectedId.asReadonly();

  select(id: string) {
    this._selectedId.set(id);
  }
}
```

## Best Practices

1. **One component per file**
2. **Prefix selectors** (`app-`, `shared-`, etc.)
3. **Use OnPush** by default
4. **Prefer signals** over RxJS for component state
5. **Keep templates small** - extract to child components
6. **Avoid logic in templates** - use computed signals
