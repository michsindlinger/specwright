---
name: "React Frontend"
inherits: base
description: "Modern React frontend development with TypeScript and best practices"
version: "2.0.0"
tech_stack:
  language: "TypeScript"
  framework: "React 18+"
  build_tool: "Vite"
  state_management: "React Context / Zustand / Redux Toolkit"
  styling: "TailwindCSS / CSS Modules"
  testing: "Vitest, React Testing Library"
  routing: "React Router"
skills:
  - react-component-patterns
  - react-hooks-best-practices
  - typescript-react-patterns
  - state-management-patterns
  - react-performance-optimization
  - tailwindcss-conventions
---

# React Frontend Profile

This profile provides standards and best practices for developing modern React applications with TypeScript.

## Tech Stack

- **Language**: TypeScript (strict mode)
- **Framework**: React 18+ (with hooks, concurrent features)
- **Build Tool**: Vite (fast, modern bundler)
- **State Management**: React Context API, Zustand, or Redux Toolkit
- **Styling**: TailwindCSS or CSS Modules
- **Testing**: Vitest + React Testing Library
- **Routing**: React Router v6+
- **HTTP Client**: Axios or fetch API
- **Forms**: React Hook Form + Zod validation

## Project Structure

```
src/
├── components/          # Reusable UI components
│   ├── ui/             # Base UI components (Button, Input, etc.)
│   ├── layout/         # Layout components (Header, Footer, etc.)
│   └── feature/        # Feature-specific components
├── pages/              # Page components (route components)
├── hooks/              # Custom React hooks
├── context/            # React Context providers
├── services/           # API service layer
├── utils/              # Utility functions
├── types/              # TypeScript type definitions
├── constants/          # Application constants
├── assets/             # Static assets (images, fonts, etc.)
└── App.tsx             # Root component
```

## Coding Standards

### Naming Conventions

- **Components**: PascalCase (e.g., `UserProfile`, `LoginForm`)
- **Files**: Match component name (e.g., `UserProfile.tsx`)
- **Hooks**: camelCase with 'use' prefix (e.g., `useAuth`, `useFetchData`)
- **Constants**: UPPER_SNAKE_CASE (e.g., `API_BASE_URL`, `MAX_FILE_SIZE`)
- **Types/Interfaces**: PascalCase (e.g., `User`, `ApiResponse`)

### TypeScript Configuration

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "useDefineForClassFields": true,
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "skipLibCheck": true,
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noEmit": true,
    "jsx": "react-jsx",
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noFallthroughCasesInSwitch": true
  }
}
```

## Component Patterns

### Functional Components with TypeScript

```typescript
// Good ✓ - Explicit prop types
interface UserCardProps {
  user: User;
  onEdit: (id: string) => void;
  className?: string;
}

export function UserCard({ user, onEdit, className }: UserCardProps) {
  return (
    <div className={cn('rounded-lg border p-4', className)}>
      <h3>{user.name}</h3>
      <p>{user.email}</p>
      <button onClick={() => onEdit(user.id)}>Edit</button>
    </div>
  );
}

// Avoid ✗ - No type safety
export function UserCard({ user, onEdit }) {
  // ...
}
```

### Component Organization

```typescript
// 1. Imports
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/Button';
import type { User } from '@/types/user';

// 2. Types/Interfaces
interface UserProfileProps {
  userId: string;
}

// 3. Component
export function UserProfile({ userId }: UserProfileProps) {
  // 3.1. Hooks
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  // 3.2. Effects
  useEffect(() => {
    fetchUser(userId).then(setUser).finally(() => setLoading(false));
  }, [userId]);

  // 3.3. Event handlers
  const handleEdit = () => {
    navigate(`/users/${userId}/edit`);
  };

  // 3.4. Render logic
  if (loading) return <LoadingSpinner />;
  if (!user) return <NotFound />;

  // 3.5. JSX
  return (
    <div className="user-profile">
      <h1>{user.name}</h1>
      <Button onClick={handleEdit}>Edit Profile</Button>
    </div>
  );
}
```

## React Hooks Best Practices

### Custom Hooks

```typescript
// useFetchData.ts
export function useFetchData<T>(url: string) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    let cancelled = false;

    const fetchData = async () => {
      try {
        setLoading(true);
        const response = await fetch(url);
        const json = await response.json();

        if (!cancelled) {
          setData(json);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err as Error);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    fetchData();

    return () => {
      cancelled = true;
    };
  }, [url]);

  return { data, loading, error };
}

// Usage
function UserList() {
  const { data: users, loading, error } = useFetchData<User[]>('/api/users');

  if (loading) return <LoadingSpinner />;
  if (error) return <ErrorMessage error={error} />;

  return (
    <ul>
      {users?.map(user => (
        <li key={user.id}>{user.name}</li>
      ))}
    </ul>
  );
}
```

### useCallback and useMemo

```typescript
// Good ✓ - Memoize expensive computations
function UserList({ users, filter }: UserListProps) {
  const filteredUsers = useMemo(() => {
    return users.filter(user =>
      user.name.toLowerCase().includes(filter.toLowerCase())
    );
  }, [users, filter]);

  const handleUserClick = useCallback((userId: string) => {
    console.log('User clicked:', userId);
  }, []);

  return (
    <ul>
      {filteredUsers.map(user => (
        <UserItem key={user.id} user={user} onClick={handleUserClick} />
      ))}
    </ul>
  );
}
```

## State Management

### React Context

```typescript
// AuthContext.tsx
interface AuthContextType {
  user: User | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);

  const login = async (email: string, password: string) => {
    const user = await authService.login(email, password);
    setUser(user);
  };

  const logout = () => {
    authService.logout();
    setUser(null);
  };

  const value = {
    user,
    login,
    logout,
    isAuthenticated: !!user,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
}
```

### Zustand (lightweight alternative to Redux)

```typescript
// store/userStore.ts
import { create } from 'zustand';

interface UserState {
  users: User[];
  loading: boolean;
  fetchUsers: () => Promise<void>;
  addUser: (user: User) => void;
}

export const useUserStore = create<UserState>((set) => ({
  users: [],
  loading: false,
  fetchUsers: async () => {
    set({ loading: true });
    const users = await api.getUsers();
    set({ users, loading: false });
  },
  addUser: (user) => set((state) => ({ users: [...state.users, user] })),
}));

// Usage
function UserList() {
  const { users, loading, fetchUsers } = useUserStore();

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  // ...
}
```

## Styling with TailwindCSS

### Component Styling

```typescript
// Good ✓ - Use Tailwind utility classes
export function Button({ variant = 'primary', children, ...props }: ButtonProps) {
  const baseStyles = 'px-4 py-2 rounded-lg font-medium transition-colors';
  const variantStyles = {
    primary: 'bg-blue-600 text-white hover:bg-blue-700',
    secondary: 'bg-gray-200 text-gray-900 hover:bg-gray-300',
    danger: 'bg-red-600 text-white hover:bg-red-700',
  };

  return (
    <button
      className={cn(baseStyles, variantStyles[variant])}
      {...props}
    >
      {children}
    </button>
  );
}
```

### Conditional Styling

```typescript
// Use clsx or tailwind-merge for conditional classes
import { cn } from '@/utils/cn';

export function Alert({ type, message }: AlertProps) {
  return (
    <div
      className={cn(
        'rounded-lg p-4',
        type === 'error' && 'bg-red-50 text-red-900',
        type === 'success' && 'bg-green-50 text-green-900',
        type === 'warning' && 'bg-yellow-50 text-yellow-900'
      )}
    >
      {message}
    </div>
  );
}
```

## Testing Standards

### Component Tests

```typescript
// UserCard.test.tsx
import { render, screen, fireEvent } from '@testing-library/react';
import { UserCard } from './UserCard';

describe('UserCard', () => {
  const mockUser = {
    id: '1',
    name: 'John Doe',
    email: 'john@example.com',
  };

  it('should render user information', () => {
    render(<UserCard user={mockUser} onEdit={vi.fn()} />);

    expect(screen.getByText('John Doe')).toBeInTheDocument();
    expect(screen.getByText('john@example.com')).toBeInTheDocument();
  });

  it('should call onEdit when edit button is clicked', () => {
    const handleEdit = vi.fn();
    render(<UserCard user={mockUser} onEdit={handleEdit} />);

    fireEvent.click(screen.getByText('Edit'));
    expect(handleEdit).toHaveBeenCalledWith('1');
  });
});
```

### Hook Tests

```typescript
// useFetchData.test.ts
import { renderHook, waitFor } from '@testing-library/react';
import { useFetchData } from './useFetchData';

describe('useFetchData', () => {
  it('should fetch data successfully', async () => {
    const { result } = renderHook(() => useFetchData<User[]>('/api/users'));

    expect(result.current.loading).toBe(true);

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.data).toHaveLength(2);
    expect(result.current.error).toBeNull();
  });
});
```

## Performance Optimization

### Code Splitting

```typescript
// Lazy load components
import { lazy, Suspense } from 'react';

const UserProfile = lazy(() => import('./pages/UserProfile'));
const Dashboard = lazy(() => import('./pages/Dashboard'));

function App() {
  return (
    <Suspense fallback={<LoadingSpinner />}>
      <Routes>
        <Route path="/profile" element={<UserProfile />} />
        <Route path="/dashboard" element={<Dashboard />} />
      </Routes>
    </Suspense>
  );
}
```

### Virtualization for Long Lists

```typescript
import { useVirtualizer } from '@tanstack/react-virtual';

function VirtualList({ items }: { items: Item[] }) {
  const parentRef = useRef<HTMLDivElement>(null);

  const virtualizer = useVirtualizer({
    count: items.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 50,
  });

  return (
    <div ref={parentRef} className="h-96 overflow-auto">
      <div style={{ height: `${virtualizer.getTotalSize()}px` }}>
        {virtualizer.getVirtualItems().map((virtualItem) => (
          <div
            key={virtualItem.key}
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              height: `${virtualItem.size}px`,
              transform: `translateY(${virtualItem.start}px)`,
            }}
          >
            {items[virtualItem.index].name}
          </div>
        ))}
      </div>
    </div>
  );
}
```

## API Integration

### Service Layer

```typescript
// services/userService.ts
import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
  timeout: 10000,
});

// Request interceptor for auth token
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('authToken');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export const userService = {
  getUsers: async (): Promise<User[]> => {
    const { data } = await api.get<User[]>('/users');
    return data;
  },

  getUser: async (id: string): Promise<User> => {
    const { data } = await api.get<User>(`/users/${id}`);
    return data;
  },

  createUser: async (user: CreateUserRequest): Promise<User> => {
    const { data } = await api.post<User>('/users', user);
    return data;
  },
};
```

## Forms and Validation

### React Hook Form + Zod

```typescript
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

const userSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Invalid email address'),
  age: z.number().min(18, 'Must be at least 18 years old'),
});

type UserFormData = z.infer<typeof userSchema>;

export function UserForm() {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<UserFormData>({
    resolver: zodResolver(userSchema),
  });

  const onSubmit = (data: UserFormData) => {
    console.log('Form data:', data);
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <div>
        <input {...register('name')} placeholder="Name" />
        {errors.name && <span>{errors.name.message}</span>}
      </div>

      <div>
        <input {...register('email')} type="email" placeholder="Email" />
        {errors.email && <span>{errors.email.message}</span>}
      </div>

      <button type="submit">Submit</button>
    </form>
  );
}
```

## Active Skills

When this profile is active, the following Claude Code Skills are automatically available:

- **react-component-patterns**: Component design patterns and best practices
- **react-hooks-best-practices**: Hook usage, custom hooks, optimization
- **typescript-react-patterns**: TypeScript integration with React
- **state-management-patterns**: Context, Zustand, Redux patterns
- **react-performance-optimization**: Code splitting, memoization, virtualization
- **tailwindcss-conventions**: Utility-first CSS patterns and responsive design
