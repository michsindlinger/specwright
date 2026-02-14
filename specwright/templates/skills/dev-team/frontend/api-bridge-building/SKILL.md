# API Bridge Building

> Skill Template: Frontend Development
> Category: Frontend-Backend Integration
> Version: 1.0.0
> Created: 2026-01-09

## Purpose

Design and implement robust frontend-backend API integrations with proper error handling, caching, authentication, and type safety.

## When to Activate

Activate this skill when:
- Integrating with REST APIs
- Implementing GraphQL clients
- Building API client libraries
- Handling authentication flows
- Implementing request/response interceptors
- Managing API caching strategies
- Building real-time data connections (WebSocket, SSE)
- Creating API error handling patterns

## Core Capabilities

### API Integration Patterns
- **REST API**: HTTP methods, endpoints, status codes
- **GraphQL**: Queries, mutations, subscriptions
- **WebSocket**: Real-time bidirectional communication
- **Server-Sent Events (SSE)**: Real-time server push
- **Polling**: Short polling and long polling strategies

### Request Management
- Request configuration and headers
- Query parameters and request body formatting
- File uploads and multipart forms
- Request cancellation and timeouts
- Request retries and exponential backoff
- Request deduplication

### Response Handling
- Response parsing and transformation
- Error handling and status codes
- Type-safe response models
- Response validation
- Pagination handling
- Data normalization

### Authentication & Security
- Token-based authentication (JWT)
- OAuth 2.0 flows
- API key management
- Request signing
- CSRF protection
- Secure token storage

## [TECH_STACK_SPECIFIC] Patterns

### React API Integration

#### Fetch API with Custom Hooks

```javascript
import { useState, useEffect, useCallback } from 'react';

// Base API client
class ApiClient {
  constructor(baseURL) {
    this.baseURL = baseURL;
    this.defaultHeaders = {
      'Content-Type': 'application/json'
    };
  }

  async request(endpoint, options = {}) {
    const url = `${this.baseURL}${endpoint}`;
    const config = {
      ...options,
      headers: {
        ...this.defaultHeaders,
        ...options.headers
      }
    };

    const response = await fetch(url, config);

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new ApiError(response.status, error.message || 'Request failed');
    }

    return response.json();
  }

  get(endpoint, options) {
    return this.request(endpoint, { ...options, method: 'GET' });
  }

  post(endpoint, data, options) {
    return this.request(endpoint, {
      ...options,
      method: 'POST',
      body: JSON.stringify(data)
    });
  }

  put(endpoint, data, options) {
    return this.request(endpoint, {
      ...options,
      method: 'PUT',
      body: JSON.stringify(data)
    });
  }

  delete(endpoint, options) {
    return this.request(endpoint, { ...options, method: 'DELETE' });
  }
}

class ApiError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
    this.name = 'ApiError';
  }
}

// API client instance
export const api = new ApiClient(import.meta.env.VITE_API_URL);

// Custom hook for API requests
export function useApi(endpoint, options = {}) {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  const execute = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const result = await api.get(endpoint, options);
      setData(result);
      return result;
    } catch (err) {
      setError(err);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [endpoint, JSON.stringify(options)]);

  useEffect(() => {
    if (options.autoFetch !== false) {
      execute();
    }
  }, [execute, options.autoFetch]);

  const refetch = useCallback(() => {
    return execute();
  }, [execute]);

  return { data, error, loading, refetch };
}

// Custom hook for mutations
export function useMutation(mutationFn) {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  const mutate = useCallback(async (variables) => {
    setLoading(true);
    setError(null);

    try {
      const result = await mutationFn(variables);
      setData(result);
      return result;
    } catch (err) {
      setError(err);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [mutationFn]);

  return { mutate, data, error, loading };
}

// Usage in components
const UserList = () => {
  const { data: users, loading, error, refetch } = useApi('/users');

  if (loading) return <Spinner />;
  if (error) return <Error message={error.message} />;

  return (
    <div>
      <button onClick={refetch}>Refresh</button>
      {users?.map(user => <UserCard key={user.id} user={user} />)}
    </div>
  );
};

const UserForm = () => {
  const { mutate: createUser, loading } = useMutation((data) =>
    api.post('/users', data)
  );

  const handleSubmit = async (formData) => {
    try {
      await createUser(formData);
      // Handle success
    } catch (error) {
      // Handle error
    }
  };

  return <form onSubmit={handleSubmit}>...</form>;
};
```

#### React Query Integration

```javascript
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';

// Axios instance with interceptors
const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
  timeout: 10000
});

// Request interceptor (add auth token)
apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('auth_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor (handle errors)
apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      // Handle unauthorized (redirect to login)
      localStorage.removeItem('auth_token');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// API functions
const userApi = {
  getAll: () => apiClient.get('/users').then(res => res.data),
  getById: (id) => apiClient.get(`/users/${id}`).then(res => res.data),
  create: (data) => apiClient.post('/users', data).then(res => res.data),
  update: (id, data) => apiClient.put(`/users/${id}`, data).then(res => res.data),
  delete: (id) => apiClient.delete(`/users/${id}`).then(res => res.data)
};

// Query hooks
export const useUsers = () => {
  return useQuery({
    queryKey: ['users'],
    queryFn: userApi.getAll,
    staleTime: 5 * 60 * 1000 // 5 minutes
  });
};

export const useUser = (id) => {
  return useQuery({
    queryKey: ['users', id],
    queryFn: () => userApi.getById(id),
    enabled: !!id
  });
};

// Mutation hooks
export const useCreateUser = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: userApi.create,
    onSuccess: (newUser) => {
      // Update cache with new user
      queryClient.setQueryData(['users'], (old) => [...old, newUser]);
      // Or invalidate to refetch
      queryClient.invalidateQueries({ queryKey: ['users'] });
    }
  });
};

export const useUpdateUser = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }) => userApi.update(id, data),
    onMutate: async ({ id, data }) => {
      // Optimistic update
      await queryClient.cancelQueries({ queryKey: ['users', id] });

      const previousUser = queryClient.getQueryData(['users', id]);

      queryClient.setQueryData(['users', id], (old) => ({ ...old, ...data }));

      return { previousUser };
    },
    onError: (err, variables, context) => {
      // Rollback on error
      if (context?.previousUser) {
        queryClient.setQueryData(['users', variables.id], context.previousUser);
      }
    },
    onSettled: (data, error, { id }) => {
      queryClient.invalidateQueries({ queryKey: ['users', id] });
    }
  });
};

// Usage in components
const UserList = () => {
  const { data: users, isLoading, error } = useUsers();
  const createUser = useCreateUser();

  const handleCreate = async (formData) => {
    try {
      await createUser.mutateAsync(formData);
      toast.success('User created!');
    } catch (error) {
      toast.error(error.message);
    }
  };

  if (isLoading) return <Spinner />;
  if (error) return <Error message={error.message} />;

  return (
    <div>
      <UserForm onSubmit={handleCreate} />
      {users.map(user => <UserCard key={user.id} user={user} />)}
    </div>
  );
};
```

#### GraphQL with Apollo Client

```javascript
import { ApolloClient, InMemoryCache, gql, useQuery, useMutation } from '@apollo/client';

// Apollo Client setup
const client = new ApolloClient({
  uri: import.meta.env.VITE_GRAPHQL_URL,
  cache: new InMemoryCache(),
  headers: {
    authorization: `Bearer ${localStorage.getItem('auth_token')}`
  }
});

// GraphQL queries
const GET_USERS = gql`
  query GetUsers {
    users {
      id
      name
      email
      avatar
    }
  }
`;

const GET_USER = gql`
  query GetUser($id: ID!) {
    user(id: $id) {
      id
      name
      email
      avatar
      posts {
        id
        title
      }
    }
  }
`;

// GraphQL mutations
const CREATE_USER = gql`
  mutation CreateUser($input: CreateUserInput!) {
    createUser(input: $input) {
      id
      name
      email
    }
  }
`;

const UPDATE_USER = gql`
  mutation UpdateUser($id: ID!, $input: UpdateUserInput!) {
    updateUser(id: $id, input: $input) {
      id
      name
      email
    }
  }
`;

// Usage in components
const UserList = () => {
  const { data, loading, error } = useQuery(GET_USERS);

  if (loading) return <Spinner />;
  if (error) return <Error message={error.message} />;

  return (
    <div>
      {data.users.map(user => (
        <UserCard key={user.id} user={user} />
      ))}
    </div>
  );
};

const UserForm = () => {
  const [createUser, { loading, error }] = useMutation(CREATE_USER, {
    update(cache, { data: { createUser } }) {
      // Update cache manually
      const existingUsers = cache.readQuery({ query: GET_USERS });
      cache.writeQuery({
        query: GET_USERS,
        data: {
          users: [...existingUsers.users, createUser]
        }
      });
    }
  });

  const handleSubmit = async (formData) => {
    try {
      await createUser({ variables: { input: formData } });
      toast.success('User created!');
    } catch (err) {
      toast.error(err.message);
    }
  };

  return <form onSubmit={handleSubmit}>...</form>;
};
```

### Vue API Integration

#### Composable-Based API Client

```javascript
import { ref, computed } from 'vue';
import axios from 'axios';

// API client setup
const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
  timeout: 10000
});

// Composable for API requests
export function useApi(endpoint, options = {}) {
  const data = ref(null);
  const error = ref(null);
  const loading = ref(false);

  const execute = async (config = {}) => {
    loading.value = true;
    error.value = null;

    try {
      const response = await apiClient({
        url: endpoint,
        ...options,
        ...config
      });
      data.value = response.data;
      return response.data;
    } catch (err) {
      error.value = err;
      throw err;
    } finally {
      loading.value = false;
    }
  };

  // Auto-fetch on mount if enabled
  if (options.autoFetch !== false) {
    execute();
  }

  return {
    data: computed(() => data.value),
    error: computed(() => error.value),
    loading: computed(() => loading.value),
    execute,
    refetch: execute
  };
}

// Usage in components
<script setup>
import { useApi } from '@/composables/useApi';

const { data: users, loading, error, refetch } = useApi('/users');

const handleRefresh = () => {
  refetch();
};
</script>

<template>
  <div>
    <button @click="handleRefresh">Refresh</button>
    <div v-if="loading">Loading...</div>
    <div v-else-if="error">Error: {{ error.message }}</div>
    <UserCard v-for="user in users" :key="user.id" :user="user" />
  </div>
</template>
```

### Angular API Integration

#### HttpClient Service

```typescript
import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, HttpErrorResponse } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError, map, retry } from 'rxjs/operators';

export interface User {
  id: number;
  name: string;
  email: string;
}

@Injectable({ providedIn: 'root' })
export class UserService {
  private apiUrl = environment.apiUrl;

  constructor(private http: HttpClient) {}

  getUsers(): Observable<User[]> {
    return this.http.get<User[]>(`${this.apiUrl}/users`).pipe(
      retry(2),
      catchError(this.handleError)
    );
  }

  getUser(id: number): Observable<User> {
    return this.http.get<User>(`${this.apiUrl}/users/${id}`).pipe(
      catchError(this.handleError)
    );
  }

  createUser(user: Partial<User>): Observable<User> {
    return this.http.post<User>(`${this.apiUrl}/users`, user).pipe(
      catchError(this.handleError)
    );
  }

  updateUser(id: number, user: Partial<User>): Observable<User> {
    return this.http.put<User>(`${this.apiUrl}/users/${id}`, user).pipe(
      catchError(this.handleError)
    );
  }

  deleteUser(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/users/${id}`).pipe(
      catchError(this.handleError)
    );
  }

  private handleError(error: HttpErrorResponse) {
    let errorMessage = 'An error occurred';

    if (error.error instanceof ErrorEvent) {
      // Client-side error
      errorMessage = error.error.message;
    } else {
      // Server-side error
      errorMessage = `Error Code: ${error.status}\nMessage: ${error.message}`;
    }

    return throwError(() => new Error(errorMessage));
  }
}

// Usage in component
@Component({
  selector: 'app-user-list',
  template: `
    <div>
      <div *ngIf="loading">Loading...</div>
      <div *ngIf="error">{{ error }}</div>
      <app-user-card
        *ngFor="let user of users"
        [user]="user">
      </app-user-card>
    </div>
  `
})
export class UserListComponent implements OnInit {
  users: User[] = [];
  loading = false;
  error: string | null = null;

  constructor(private userService: UserService) {}

  ngOnInit(): void {
    this.loadUsers();
  }

  loadUsers(): void {
    this.loading = true;
    this.userService.getUsers().subscribe({
      next: (users) => {
        this.users = users;
        this.loading = false;
      },
      error: (err) => {
        this.error = err.message;
        this.loading = false;
      }
    });
  }
}
```

## Tools Required

### HTTP Clients
- **Fetch API** (native)
- **Axios** (popular third-party)
- **Angular HttpClient** (Angular)

### Data Fetching Libraries
- **React Query / TanStack Query**
- **SWR**
- **RTK Query** (Redux Toolkit)

### GraphQL Clients
- **Apollo Client**
- **urql**
- **Relay**

### API Testing
- **Postman** / **Insomnia**
- **MockServiceWorker (MSW)**
- **JSON Server**

### MCP Servers
[MCP_TOOLS]
<!-- Populated during skill creation based on:
     1. User's installed MCP servers
     2. User's selection for this skill

     Recommended for this skill (examples):
     - API testing and mocking tools
     - API documentation platforms
     - Network monitoring tools

     Note: Skills work without MCP servers, but functionality may be limited
-->

## Quality Checklist

### API Client Architecture
- [ ] Base URL and configuration are centralized
- [ ] Request/response interceptors are implemented
- [ ] Authentication headers are handled automatically
- [ ] API functions are organized by domain/resource
- [ ] TypeScript interfaces define request/response shapes

### Error Handling
- [ ] Network errors are caught and handled
- [ ] HTTP error status codes are properly handled
- [ ] User-friendly error messages are displayed
- [ ] Error logging/reporting is implemented
- [ ] Retry logic is implemented for transient failures

### Performance
- [ ] Requests are deduplicated when possible
- [ ] Response caching strategy is implemented
- [ ] Unnecessary requests are avoided
- [ ] Request cancellation is implemented
- [ ] Loading states prevent duplicate submissions

### Security
- [ ] Authentication tokens are securely stored
- [ ] Sensitive data is not logged
- [ ] HTTPS is enforced
- [ ] CSRF tokens are included when required
- [ ] API keys are stored in environment variables

### Developer Experience
- [ ] API functions have clear, descriptive names
- [ ] TypeScript types are defined for all endpoints
- [ ] API documentation is accessible
- [ ] Mock data is available for development
- [ ] API errors are easy to debug

## Best Practices

### Separation of Concerns
Keep API logic separate from UI components:
- Create API client modules/services
- Use custom hooks/composables for data fetching
- Keep components focused on presentation

### Type Safety
Define types for all API interactions:

```typescript
// Request/Response types
interface CreateUserRequest {
  name: string;
  email: string;
  password: string;
}

interface UserResponse {
  id: number;
  name: string;
  email: string;
  createdAt: string;
}

// API function with types
async function createUser(data: CreateUserRequest): Promise<UserResponse> {
  const response = await api.post<UserResponse>('/users', data);
  return response.data;
}
```

### Error Boundaries
Implement proper error handling at multiple levels:
- Network errors
- Validation errors
- Authorization errors
- Server errors

### Request Optimization
Minimize unnecessary API calls:
- Implement caching
- Debounce user input
- Use pagination for large datasets
- Implement infinite scroll vs. load more

---

**Remember**: A well-designed API bridge makes frontend development faster, more reliable, and easier to maintain. Focus on type safety, error handling, and developer experience.
