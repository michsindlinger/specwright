---
description: Angular component development best practices for validation
version: 1.0
framework: angular
category: component
---

# Angular Best Practices

## Component Structure

### Standalone Component (Angular 14+)
```typescript
import { Component, Input, Output, EventEmitter, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';

interface User {
  id: number;
  name: string;
  email: string;
}

@Component({
  selector: 'app-user-profile',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './user-profile.component.html',
  styleUrls: ['./user-profile.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class UserProfileComponent {
  @Input({ required: true }) user!: User;
  @Input() editable = false;
  @Output() update = new EventEmitter<User>();

  handleEdit(): void {
    this.update.emit(this.user);
  }
}
```

**Key Points:**
- Use standalone components (Angular 14+)
- OnPush change detection for performance
- Required inputs with required: true
- EventEmitter for outputs
- Clear selector naming (app-* prefix)

## Service Layer

### Injectable Service
```typescript
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, catchError, map } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class UserService {
  private readonly apiUrl = '/api/users';

  constructor(private http: HttpClient) {}

  getAll(): Observable<User[]> {
    return this.http.get<User[]>(this.apiUrl).pipe(
      catchError(this.handleError)
    );
  }

  getById(id: number): Observable<User> {
    return this.http.get<User>(`${this.apiUrl}/${id}`);
  }

  create(user: Partial<User>): Observable<User> {
    return this.http.post<User>(this.apiUrl, user);
  }

  private handleError(error: any): Observable<never> {
    console.error('API Error:', error);
    throw error;
  }
}
```

**Key Points:**
- providedIn: 'root' for singleton services
- Constructor injection for dependencies
- Return Observables from HTTP calls
- Use RxJS operators (map, catchError, etc.)
- Private methods for common logic

## RxJS Patterns

### Observable Handling
```typescript
export class UserListComponent implements OnInit, OnDestroy {
  users$ = new BehaviorSubject<User[]>([]);
  loading$ = new BehaviorSubject<boolean>(false);
  private destroy$ = new Subject<void>();

  constructor(private userService: UserService) {}

  ngOnInit(): void {
    this.loadUsers();
  }

  loadUsers(): void {
    this.loading$.next(true);
    this.userService.getAll().pipe(
      takeUntil(this.destroy$),
      finalize(() => this.loading$.next(false))
    ).subscribe({
      next: users => this.users$.next(users),
      error: err => console.error(err)
    });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
}
```

**Key Points:**
- Use AsyncPipe in templates (auto-unsubscribe)
- takeUntil for manual subscription cleanup
- BehaviorSubject for stateful streams
- Complete subjects in ngOnDestroy
- Avoid nested subscriptions

## Template Best Practices

### Using AsyncPipe
```html
<!-- user-list.component.html -->
<div *ngIf="loading$ | async">Loading...</div>

<div *ngFor="let user of users$ | async">
  {{ user.name }} - {{ user.email }}
</div>
```

**Key Points:**
- Use AsyncPipe for observables (auto-unsubscribe)
- Structural directives (*ngIf, *ngFor)
- Safe navigation operator (?)
- TrackBy for ngFor performance

## Anti-Patterns to Avoid

### ❌ Manual Subscription Without Cleanup
```typescript
// DON'T DO THIS
ngOnInit() {
  this.userService.getAll().subscribe(users => {
    this.users = users; // Memory leak
  });
}

// DO THIS
ngOnInit() {
  this.userService.getAll().pipe(
    takeUntil(this.destroy$)
  ).subscribe(users => this.users = users);
}
```

### ❌ Default Change Detection
```typescript
// DON'T DO THIS
@Component({
  // Default change detection - checks entire tree
})

// DO THIS
@Component({
  changeDetection: ChangeDetectionStrategy.OnPush
})
```

## Quick Reference

**Components:**
- ✅ Standalone components
- ✅ OnPush change detection
- ✅ Required inputs
- ✅ EventEmitter for outputs

**Services:**
- ✅ providedIn: 'root'
- ✅ Constructor injection
- ✅ Return Observables
- ✅ RxJS operators

**RxJS:**
- ✅ AsyncPipe in templates
- ✅ takeUntil for cleanup
- ✅ Complete subjects in ngOnDestroy
- ❌ Avoid nested subscriptions
