# React API Integration

> Part of: React Frontend Skill
> Use when: Fetching data, making API calls

## TanStack Query (Recommended)

### Basic Query
```tsx
function UserList() {
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['users'],
    queryFn: async () => {
      const response = await fetch('/api/users');
      if (!response.ok) throw new Error('Failed to fetch');
      return response.json() as Promise<User[]>;
    },
  });

  if (isLoading) return <Spinner />;
  if (error) return <ErrorMessage error={error} onRetry={refetch} />;

  return (
    <ul>
      {data?.map(user => <li key={user.id}>{user.name}</li>)}
    </ul>
  );
}
```

### Query with Parameters
```tsx
function UserDetail({ userId }: { userId: string }) {
  const { data: user } = useQuery({
    queryKey: ['users', userId],
    queryFn: () => fetchUser(userId),
    enabled: !!userId, // Only run if userId exists
  });

  return user ? <UserCard user={user} /> : null;
}
```

### Mutation
```tsx
function CreateUserForm() {
  const queryClient = useQueryClient();

  const createUser = useMutation({
    mutationFn: async (data: CreateUserDto) => {
      const response = await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error('Failed to create');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const handleSubmit = (data: CreateUserDto) => {
    createUser.mutate(data);
  };

  return (
    <form onSubmit={handleSubmit}>
      {/* form fields */}
      <button disabled={createUser.isPending}>
        {createUser.isPending ? 'Creating...' : 'Create'}
      </button>
    </form>
  );
}
```

## API Client

### Fetch Wrapper
```tsx
// lib/api.ts
const API_BASE = import.meta.env.VITE_API_URL;

async function apiRequest<T>(
  endpoint: string,
  options?: RequestInit
): Promise<T> {
  const response = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.message || 'Request failed');
  }

  return response.json();
}

export const api = {
  get: <T>(endpoint: string) => apiRequest<T>(endpoint),
  post: <T>(endpoint: string, data: unknown) =>
    apiRequest<T>(endpoint, { method: 'POST', body: JSON.stringify(data) }),
  put: <T>(endpoint: string, data: unknown) =>
    apiRequest<T>(endpoint, { method: 'PUT', body: JSON.stringify(data) }),
  delete: <T>(endpoint: string) =>
    apiRequest<T>(endpoint, { method: 'DELETE' }),
};
```

### With Auth
```tsx
// lib/api.ts
async function apiRequest<T>(endpoint: string, options?: RequestInit): Promise<T> {
  const token = localStorage.getItem('token');

  const response = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token && { Authorization: `Bearer ${token}` }),
      ...options?.headers,
    },
  });

  if (response.status === 401) {
    // Handle unauthorized
    localStorage.removeItem('token');
    window.location.href = '/login';
  }

  if (!response.ok) {
    throw new Error('Request failed');
  }

  return response.json();
}
```

## Custom Hooks

### useApi Hook
```tsx
function useApi<T>(queryKey: string[], fetcher: () => Promise<T>) {
  return useQuery({
    queryKey,
    queryFn: fetcher,
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: 3,
  });
}

// Usage
function UserList() {
  const { data: users } = useApi(['users'], () => api.get<User[]>('/users'));
}
```

### useUsers Hook
```tsx
// hooks/useUsers.ts
export function useUsers() {
  return useQuery({
    queryKey: ['users'],
    queryFn: () => api.get<User[]>('/users'),
  });
}

export function useUser(id: string) {
  return useQuery({
    queryKey: ['users', id],
    queryFn: () => api.get<User>(`/users/${id}`),
    enabled: !!id,
  });
}

export function useCreateUser() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateUserDto) => api.post<User>('/users', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
    },
  });
}
```

## Error Handling

### Error Boundary
```tsx
class ErrorBoundary extends React.Component<
  { children: React.ReactNode; fallback: React.ReactNode },
  { hasError: boolean }
> {
  state = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback;
    }
    return this.props.children;
  }
}
```

## Best Practices

1. **Use TanStack Query** for server state
2. **Create typed API client**
3. **Wrap in custom hooks** for reusability
4. **Handle all states**: loading, error, empty, success
5. **Invalidate queries** after mutations
6. **Use staleTime** to reduce refetches
7. **Add retry logic** for transient failures
