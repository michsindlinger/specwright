# Angular API Integration

> Part of: Angular Frontend Skill
> Use when: Making HTTP calls, integrating with backend APIs

## HttpClient Setup

### Basic Configuration
```typescript
// app.config.ts
export const appConfig: ApplicationConfig = {
  providers: [
    provideHttpClient(
      withInterceptors([authInterceptor, errorInterceptor])
    )
  ]
};
```

## Service Pattern

### Basic API Service
```typescript
@Injectable({ providedIn: 'root' })
export class UserApiService {
  private http = inject(HttpClient);
  private baseUrl = environment.apiUrl;

  getUsers(): Observable<User[]> {
    return this.http.get<User[]>(`${this.baseUrl}/users`);
  }

  getUser(id: string): Observable<User> {
    return this.http.get<User>(`${this.baseUrl}/users/${id}`);
  }

  createUser(user: CreateUserDto): Observable<User> {
    return this.http.post<User>(`${this.baseUrl}/users`, user);
  }

  updateUser(id: string, user: UpdateUserDto): Observable<User> {
    return this.http.put<User>(`${this.baseUrl}/users/${id}`, user);
  }

  deleteUser(id: string): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/users/${id}`);
  }
}
```

### With Signals (Recommended)
```typescript
@Injectable({ providedIn: 'root' })
export class UserService {
  private http = inject(HttpClient);
  private apiUrl = environment.apiUrl;

  private _users = signal<User[]>([]);
  private _loading = signal(false);
  private _error = signal<string | null>(null);

  users = this._users.asReadonly();
  loading = this._loading.asReadonly();
  error = this._error.asReadonly();

  async loadUsers(): Promise<void> {
    this._loading.set(true);
    this._error.set(null);

    try {
      const users = await firstValueFrom(
        this.http.get<User[]>(`${this.apiUrl}/users`)
      );
      this._users.set(users);
    } catch (err) {
      this._error.set(this.getErrorMessage(err));
    } finally {
      this._loading.set(false);
    }
  }

  private getErrorMessage(err: unknown): string {
    if (err instanceof HttpErrorResponse) {
      return err.error?.message || err.message;
    }
    return 'An unexpected error occurred';
  }
}
```

## Interceptors

### Auth Interceptor
```typescript
export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const authService = inject(AuthService);
  const token = authService.token();

  if (token) {
    req = req.clone({
      setHeaders: {
        Authorization: `Bearer ${token}`
      }
    });
  }

  return next(req);
};
```

### Error Interceptor
```typescript
export const errorInterceptor: HttpInterceptorFn = (req, next) => {
  const router = inject(Router);
  const snackBar = inject(MatSnackBar);

  return next(req).pipe(
    catchError((error: HttpErrorResponse) => {
      if (error.status === 401) {
        router.navigate(['/login']);
      } else if (error.status === 403) {
        snackBar.open('Access denied', 'Close');
      } else if (error.status >= 500) {
        snackBar.open('Server error. Please try again.', 'Close');
      }

      return throwError(() => error);
    })
  );
};
```

### Loading Interceptor
```typescript
export const loadingInterceptor: HttpInterceptorFn = (req, next) => {
  const loadingService = inject(LoadingService);

  loadingService.show();

  return next(req).pipe(
    finalize(() => loadingService.hide())
  );
};
```

## Error Handling

### Component Level
```typescript
@Component({...})
export class UserListComponent {
  userService = inject(UserService);

  // Use signals from service
  users = this.userService.users;
  loading = this.userService.loading;
  error = this.userService.error;

  ngOnInit() {
    this.userService.loadUsers();
  }

  retry() {
    this.userService.loadUsers();
  }
}
```

### Template
```html
@if (loading()) {
  <app-spinner />
}

@if (error(); as errorMsg) {
  <app-error-message
    [message]="errorMsg"
    (retry)="retry()"
  />
}

@if (users(); as userList) {
  <app-user-list [users]="userList" />
}
```

## Caching Strategies

### Simple In-Memory Cache
```typescript
@Injectable({ providedIn: 'root' })
export class CachedUserService {
  private cache = new Map<string, { data: User; timestamp: number }>();
  private cacheDuration = 5 * 60 * 1000; // 5 minutes

  async getUser(id: string): Promise<User> {
    const cached = this.cache.get(id);

    if (cached && Date.now() - cached.timestamp < this.cacheDuration) {
      return cached.data;
    }

    const user = await firstValueFrom(
      this.http.get<User>(`/api/users/${id}`)
    );

    this.cache.set(id, { data: user, timestamp: Date.now() });
    return user;
  }

  invalidateCache(id?: string) {
    if (id) {
      this.cache.delete(id);
    } else {
      this.cache.clear();
    }
  }
}
```

## Best Practices

1. **Use Services**: Never call HttpClient directly in components
2. **Type Everything**: Define DTOs for requests/responses
3. **Handle Errors**: Always catch and handle errors appropriately
4. **Show Loading States**: Use loading signals for better UX
5. **Use Interceptors**: Centralize cross-cutting concerns
6. **Environment URLs**: Use environment files for API URLs
7. **Retry Logic**: Consider retry for transient failures
