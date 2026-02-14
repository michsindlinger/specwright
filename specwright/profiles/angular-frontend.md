---
name: "Angular Frontend"
inherits: base
description: "Enterprise Angular frontend development with TypeScript and best practices"
version: "2.0.0"
tech_stack:
  language: "TypeScript"
  framework: "Angular 17+"
  build_tool: "Angular CLI"
  state_management: "RxJS / NgRx"
  styling: "SCSS / TailwindCSS"
  testing: "Jasmine, Karma, Jest"
  http: "HttpClient"
skills:
  - angular-component-patterns
  - angular-services-patterns
  - rxjs-best-practices
  - ngrx-state-management
  - angular-performance-optimization
  - angular-dependency-injection
---

# Angular Frontend Profile

This profile provides standards and best practices for developing enterprise Angular applications with TypeScript.

## Tech Stack

- **Language**: TypeScript (strict mode)
- **Framework**: Angular 17+ (standalone components, signals)
- **Build Tool**: Angular CLI
- **State Management**: RxJS Observables / NgRx Store
- **Styling**: SCSS or TailwindCSS
- **Testing**: Jasmine/Karma or Jest + Testing Library
- **HTTP**: HttpClient with interceptors
- **Forms**: Reactive Forms with custom validators

## Project Structure

```
src/
├── app/
│   ├── core/               # Singleton services, guards, interceptors
│   │   ├── services/
│   │   ├── guards/
│   │   └── interceptors/
│   ├── shared/             # Shared components, directives, pipes
│   │   ├── components/
│   │   ├── directives/
│   │   └── pipes/
│   ├── features/           # Feature modules
│   │   ├── users/
│   │   ├── products/
│   │   └── dashboard/
│   ├── models/             # TypeScript interfaces and types
│   └── app.component.ts    # Root component
├── assets/                 # Static assets
├── environments/           # Environment configurations
└── styles/                 # Global styles
```

## Coding Standards

### Naming Conventions

- **Components**: PascalCase + Component suffix (e.g., `UserListComponent`)
- **Services**: PascalCase + Service suffix (e.g., `UserService`)
- **Files**: kebab-case (e.g., `user-list.component.ts`)
- **Selectors**: kebab-case with prefix (e.g., `app-user-list`)
- **Interfaces**: PascalCase (e.g., `User`, `UserResponse`)

## Component Patterns

### Standalone Components (Angular 17+)

```typescript
// user-card.component.ts
import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-user-card',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="user-card">
      <h3>{{ user.name }}</h3>
      <p>{{ user.email }}</p>
      <button (click)="onEdit()">Edit</button>
    </div>
  `,
  styles: [`
    .user-card {
      border: 1px solid #ccc;
      padding: 1rem;
      border-radius: 0.5rem;
    }
  `]
})
export class UserCardComponent {
  @Input({ required: true }) user!: User;
  @Output() edit = new EventEmitter<string>();

  onEdit(): void {
    this.edit.emit(this.user.id);
  }
}
```

### Smart vs Presentational Components

```typescript
// Smart Component (Container)
@Component({
  selector: 'app-user-list-container',
  standalone: true,
  imports: [CommonModule, UserListComponent],
  template: `
    <app-user-list
      [users]="users$ | async"
      [loading]="loading$ | async"
      (editUser)="handleEditUser($event)"
    />
  `
})
export class UserListContainerComponent {
  users$ = this.userService.getUsers();
  loading$ = this.userService.loading$;

  constructor(private userService: UserService) {}

  handleEditUser(userId: string): void {
    this.router.navigate(['/users', userId, 'edit']);
  }
}

// Presentational Component
@Component({
  selector: 'app-user-list',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div *ngIf="loading; else content">
      <app-loading-spinner />
    </div>
    <ng-template #content>
      <div *ngFor="let user of users">
        {{ user.name }}
        <button (click)="editUser.emit(user.id)">Edit</button>
      </div>
    </ng-template>
  `
})
export class UserListComponent {
  @Input() users: User[] | null = null;
  @Input() loading: boolean | null = false;
  @Output() editUser = new EventEmitter<string>();
}
```

## Services and Dependency Injection

### Service Design

```typescript
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, BehaviorSubject } from 'rxjs';
import { map, tap } from 'rxjs/operators';

@Injectable({
  providedIn: 'root'
})
export class UserService {
  private apiUrl = '/api/users';
  private loadingSubject = new BehaviorSubject<boolean>(false);

  loading$ = this.loadingSubject.asObservable();

  constructor(private http: HttpClient) {}

  getUsers(): Observable<User[]> {
    this.loadingSubject.next(true);
    return this.http.get<User[]>(this.apiUrl).pipe(
      tap(() => this.loadingSubject.next(false)),
      map(users => users.map(user => this.transformUser(user)))
    );
  }

  getUser(id: string): Observable<User> {
    return this.http.get<User>(`${this.apiUrl}/${id}`);
  }

  createUser(user: CreateUserRequest): Observable<User> {
    return this.http.post<User>(this.apiUrl, user);
  }

  private transformUser(user: any): User {
    return {
      ...user,
      fullName: `${user.firstName} ${user.lastName}`
    };
  }
}
```

## RxJS Best Practices

### Observable Patterns

```typescript
// Good ✓ - Use async pipe to auto-unsubscribe
@Component({
  template: `
    <div *ngIf="user$ | async as user">
      {{ user.name }}
    </div>
  `
})
export class UserComponent {
  user$ = this.userService.getUser('123');

  constructor(private userService: UserService) {}
}

// Avoid ✗ - Manual subscription requires unsubscribe
export class UserComponent implements OnInit, OnDestroy {
  user: User;
  private subscription: Subscription;

  ngOnInit() {
    this.subscription = this.userService.getUser('123')
      .subscribe(user => this.user = user);
  }

  ngOnDestroy() {
    this.subscription.unsubscribe();
  }
}
```

### Common RxJS Operators

```typescript
import { switchMap, debounceTime, distinctUntilChanged, catchError } from 'rxjs/operators';

export class SearchComponent {
  searchTerm$ = new BehaviorSubject<string>('');

  results$ = this.searchTerm$.pipe(
    debounceTime(300),                    // Wait 300ms after user stops typing
    distinctUntilChanged(),                // Only if value changed
    switchMap(term =>                      // Cancel previous request
      this.searchService.search(term).pipe(
        catchError(error => {
          console.error(error);
          return of([]);
        })
      )
    )
  );

  onSearchChange(term: string): void {
    this.searchTerm$.next(term);
  }
}
```

## Reactive Forms

### Form Builder and Validation

```typescript
import { Component } from '@angular/core';
import { FormBuilder, Validators, ReactiveFormsModule } from '@angular/forms';

@Component({
  selector: 'app-user-form',
  standalone: true,
  imports: [ReactiveFormsModule],
  template: `
    <form [formGroup]="userForm" (ngSubmit)="onSubmit()">
      <div>
        <label>Name</label>
        <input formControlName="name" />
        <div *ngIf="name.invalid && name.touched">
          <span *ngIf="name.errors?.['required']">Name is required</span>
          <span *ngIf="name.errors?.['minlength']">
            Name must be at least 2 characters
          </span>
        </div>
      </div>

      <div>
        <label>Email</label>
        <input formControlName="email" type="email" />
        <div *ngIf="email.invalid && email.touched">
          <span *ngIf="email.errors?.['required']">Email is required</span>
          <span *ngIf="email.errors?.['email']">Invalid email format</span>
        </div>
      </div>

      <button type="submit" [disabled]="userForm.invalid">Submit</button>
    </form>
  `
})
export class UserFormComponent {
  userForm = this.fb.group({
    name: ['', [Validators.required, Validators.minLength(2)]],
    email: ['', [Validators.required, Validators.email]],
  });

  get name() { return this.userForm.get('name')!; }
  get email() { return this.userForm.get('email')!; }

  constructor(private fb: FormBuilder) {}

  onSubmit(): void {
    if (this.userForm.valid) {
      console.log(this.userForm.value);
    }
  }
}
```

## State Management with NgRx

### Actions

```typescript
// user.actions.ts
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
```

### Reducer

```typescript
// user.reducer.ts
import { createReducer, on } from '@ngrx/store';
import * as UserActions from './user.actions';

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
  on(UserActions.loadUsers, state => ({
    ...state,
    loading: true
  })),
  on(UserActions.loadUsersSuccess, (state, { users }) => ({
    ...state,
    users,
    loading: false,
    error: null
  })),
  on(UserActions.loadUsersFailure, (state, { error }) => ({
    ...state,
    loading: false,
    error
  }))
);
```

### Selectors

```typescript
// user.selectors.ts
import { createFeatureSelector, createSelector } from '@ngrx/store';

export const selectUserState = createFeatureSelector<UserState>('users');

export const selectAllUsers = createSelector(
  selectUserState,
  state => state.users
);

export const selectUsersLoading = createSelector(
  selectUserState,
  state => state.loading
);

export const selectUsersError = createSelector(
  selectUserState,
  state => state.error
);
```

## HTTP Interceptors

### Auth Interceptor

```typescript
import { Injectable } from '@angular/core';
import { HttpInterceptor, HttpRequest, HttpHandler } from '@angular/common/http';

@Injectable()
export class AuthInterceptor implements HttpInterceptor {
  intercept(req: HttpRequest<any>, next: HttpHandler) {
    const token = localStorage.getItem('authToken');

    if (token) {
      const cloned = req.clone({
        headers: req.headers.set('Authorization', `Bearer ${token}`)
      });
      return next.handle(cloned);
    }

    return next.handle(req);
  }
}
```

## Testing Standards

### Component Testing

```typescript
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { UserCardComponent } from './user-card.component';

describe('UserCardComponent', () => {
  let component: UserCardComponent;
  let fixture: ComponentFixture<UserCardComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [UserCardComponent]
    }).compileComponents();

    fixture = TestBed.createComponent(UserCardComponent);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should display user name', () => {
    component.user = { id: '1', name: 'John Doe', email: 'john@test.com' };
    fixture.detectChanges();

    const compiled = fixture.nativeElement;
    expect(compiled.querySelector('h3').textContent).toContain('John Doe');
  });

  it('should emit edit event when button clicked', () => {
    component.user = { id: '1', name: 'John', email: 'john@test.com' };
    let emittedId: string | undefined;

    component.edit.subscribe((id: string) => {
      emittedId = id;
    });

    const button = fixture.nativeElement.querySelector('button');
    button.click();

    expect(emittedId).toBe('1');
  });
});
```

### Service Testing

```typescript
import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { UserService } from './user.service';

describe('UserService', () => {
  let service: UserService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [UserService]
    });

    service = TestBed.inject(UserService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should fetch users', () => {
    const mockUsers = [
      { id: '1', name: 'John', email: 'john@test.com' },
      { id: '2', name: 'Jane', email: 'jane@test.com' }
    ];

    service.getUsers().subscribe(users => {
      expect(users.length).toBe(2);
      expect(users).toEqual(mockUsers);
    });

    const req = httpMock.expectOne('/api/users');
    expect(req.request.method).toBe('GET');
    req.flush(mockUsers);
  });
});
```

## Performance Optimization

### OnPush Change Detection

```typescript
import { ChangeDetectionStrategy, Component } from '@angular/core';

@Component({
  selector: 'app-user-list',
  changeDetection: ChangeDetectionStrategy.OnPush,  // Only check when inputs change
  template: `
    <div *ngFor="let user of users">
      {{ user.name }}
    </div>
  `
})
export class UserListComponent {
  @Input() users: User[] = [];
}
```

### TrackBy for *ngFor

```typescript
@Component({
  template: `
    <div *ngFor="let user of users; trackBy: trackByUserId">
      {{ user.name }}
    </div>
  `
})
export class UserListComponent {
  users: User[] = [];

  trackByUserId(index: number, user: User): string {
    return user.id;
  }
}
```

## Active Skills

When this profile is active, the following Claude Code Skills are automatically available:

- **angular-component-patterns**: Component architecture and lifecycle hooks
- **angular-services-patterns**: Service design and dependency injection
- **rxjs-best-practices**: Observable patterns and operators
- **ngrx-state-management**: Redux-style state management with NgRx
- **angular-performance-optimization**: Change detection, lazy loading, OnPush
- **angular-dependency-injection**: DI patterns and hierarchical injectors
