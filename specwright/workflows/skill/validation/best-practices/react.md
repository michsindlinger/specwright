---
description: React component development best practices for validation
version: 1.0
framework: react
category: component
---

# React Best Practices

## Component Structure

### Functional Components with Hooks
```typescript
// UserProfile.tsx
import React, { useState, useEffect, useCallback } from 'react';
import type { User } from '@/types';

interface UserProfileProps {
  userId: string;
  onUpdate?: (user: User) => void;
}

export const UserProfile: React.FC<UserProfileProps> = ({ userId, onUpdate }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchUser(userId).then(data => {
      setUser(data);
      setLoading(false);
    });
  }, [userId]);

  const handleUpdate = useCallback((updates: Partial<User>) => {
    if (!user) return;
    const updated = { ...user, ...updates };
    setUser(updated);
    onUpdate?.(updated);
  }, [user, onUpdate]);

  if (loading) return <LoadingSpinner />;
  if (!user) return <NotFound />;

  return <div>{/* Component JSX */}</div>;
};
```

**Key Points:**
- Use functional components (not class components)
- TypeScript interfaces for props
- Explicit typing with React.FC or direct typing
- Custom hooks for reusable logic
- Early returns for loading/error states

## Props and TypeScript

### Props Definition
```typescript
// Explicit props interface
interface ButtonProps {
  variant?: 'primary' | 'secondary';
  size?: 'sm' | 'md' | 'lg';
  disabled?: boolean;
  children: React.ReactNode;
  onClick: (event: React.MouseEvent<HTMLButtonElement>) => void;
}

// With defaults
export const Button: React.FC<ButtonProps> = ({
  variant = 'primary',
  size = 'md',
  disabled = false,
  children,
  onClick
}) => {
  return (
    <button
      className={`btn btn-${variant} btn-${size}`}
      disabled={disabled}
      onClick={onClick}
    >
      {children}
    </button>
  );
};

// Alternative: Direct typing (more concise)
export function Button({
  variant = 'primary',
  size = 'md',
  ...props
}: ButtonProps) {
  // ...
}
```

**Key Points:**
- Define explicit TypeScript interfaces
- Use React.ReactNode for children
- Proper event types (React.MouseEvent, React.ChangeEvent)
- Optional props with ? and defaults
- Use destructuring with defaults

## State Management

### Local State with useState
```typescript
const [count, setCount] = useState(0);
const [user, setUser] = useState<User | null>(null);
const [formData, setFormData] = useState({ name: '', email: '' });

// Update state immutably
setUser({ ...user, name: 'New Name' });
setFormData(prev => ({ ...prev, email: 'new@example.com' }));
```

### Complex State with useReducer
```typescript
type Action =
  | { type: 'SET_LOADING' }
  | { type: 'SET_DATA'; payload: User[] }
  | { type: 'SET_ERROR'; payload: string };

interface State {
  data: User[];
  loading: boolean;
  error: string | null;
}

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case 'SET_LOADING':
      return { ...state, loading: true, error: null };
    case 'SET_DATA':
      return { ...state, data: action.payload, loading: false };
    case 'SET_ERROR':
      return { ...state, error: action.payload, loading: false };
    default:
      return state;
  }
}

const [state, dispatch] = useReducer(reducer, {
  data: [],
  loading: false,
  error: null
});
```

### Context API for Global State
```typescript
// UserContext.tsx
interface UserContextType {
  user: User | null;
  login: (credentials: Credentials) => Promise<void>;
  logout: () => void;
}

const UserContext = createContext<UserContextType | undefined>(undefined);

export const UserProvider: React.FC<{ children: React.ReactNode }> = ({
  children
}) => {
  const [user, setUser] = useState<User | null>(null);

  const login = useCallback(async (credentials: Credentials) => {
    const userData = await authService.login(credentials);
    setUser(userData);
  }, []);

  const logout = useCallback(() => {
    setUser(null);
    authService.logout();
  }, []);

  return (
    <UserContext.Provider value={{ user, login, logout }}>
      {children}
    </UserContext.Provider>
  );
};

export const useUser = () => {
  const context = useContext(UserContext);
  if (!context) {
    throw new Error('useUser must be used within UserProvider');
  }
  return context;
};
```

**Key Points:**
- useState for simple local state
- useReducer for complex state logic
- Context API for global state (not prop drilling)
- Custom hooks to consume context
- Memoize context values with useMemo if needed

## Performance Optimization

### useMemo for Expensive Calculations
```typescript
const sortedUsers = useMemo(() => {
  return users
    .filter(u => u.active)
    .sort((a, b) => a.name.localeCompare(b.name));
}, [users]);
```

### useCallback for Event Handlers
```typescript
const handleSubmit = useCallback((event: React.FormEvent) => {
  event.preventDefault();
  onSubmit(formData);
}, [formData, onSubmit]);

const handleChange = useCallback((field: string) => {
  return (event: React.ChangeEvent<HTMLInputElement>) => {
    setFormData(prev => ({ ...prev, [field]: event.target.value }));
  };
}, []);
```

### React.memo for Component Memoization
```typescript
export const UserCard = React.memo<UserCardProps>(({ user, onEdit }) => {
  return <div>{/* Expensive rendering */}</div>;
});

// With custom comparison
export const UserCard = React.memo(
  ({ user, onEdit }: UserCardProps) => {
    return <div>{/* Component */}</div>;
  },
  (prevProps, nextProps) => prevProps.user.id === nextProps.user.id
);
```

**Key Points:**
- useMemo for expensive calculations (sorting, filtering, transformations)
- useCallback for functions passed as props
- React.memo to prevent unnecessary re-renders
- Don't over-optimize - profile first

## Custom Hooks

### Reusable Logic
```typescript
// useUser.ts
function useUser(userId: string) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    setLoading(true);
    fetchUser(userId)
      .then(data => {
        if (!cancelled) {
          setUser(data);
          setLoading(false);
        }
      })
      .catch(err => {
        if (!cancelled) {
          setError(err.message);
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [userId]);

  return { user, loading, error };
}

// Usage
const { user, loading, error } = useUser('123');
```

**Key Points:**
- Prefix with "use" (React convention)
- Encapsulate related state and effects
- Cleanup in useEffect return
- Return object or array of values

## Effect Management

### useEffect Best Practices
```typescript
// Fetch data on mount
useEffect(() => {
  fetchData().then(setData);
}, []); // Empty array = run once

// Fetch when dependency changes
useEffect(() => {
  fetchUser(userId).then(setUser);
}, [userId]);

// Cleanup subscriptions
useEffect(() => {
  const subscription = dataService.subscribe(handleData);
  return () => subscription.unsubscribe();
}, []);

// Avoid: Missing dependencies (lint will warn)
useEffect(() => {
  fetchData(userId).then(setData); // userId not in deps - BAD
}, []);
```

**Key Points:**
- Include all dependencies in dependency array
- Return cleanup function when needed
- Empty array [] = run once on mount
- Be careful with object/array dependencies (use useMemo)

## Event Handling

### Proper Event Typing
```typescript
const handleClick = (event: React.MouseEvent<HTMLButtonElement>) => {
  event.preventDefault();
  // Handle click
};

const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
  setValue(event.target.value);
};

const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
  event.preventDefault();
  // Handle submit
};

const handleKeyDown = (event: React.KeyboardEvent) => {
  if (event.key === 'Enter') {
    // Handle Enter key
  }
};
```

**Key Points:**
- Use specific React event types
- preventDefault() when needed
- useCallback for event handlers passed to children

## Styling Approaches

### Tailwind CSS (Recommended)
```typescript
export const Button = ({ variant, children }: ButtonProps) => {
  return (
    <button
      className={`
        px-4 py-2 rounded font-medium
        ${variant === 'primary' ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-800'}
        hover:opacity-90 disabled:opacity-50
      `}
    >
      {children}
    </button>
  );
};
```

### CSS Modules
```typescript
import styles from './Button.module.css';

export const Button = ({ children }: ButtonProps) => {
  return <button className={styles.button}>{children}</button>;
};
```

**Key Points:**
- Tailwind for utility-first approach
- CSS Modules for scoped styles
- className (not class)
- Conditional classes with template literals or classnames library

## Error Boundaries

### Error Boundary Component
```typescript
class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean }
> {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    console.error('Error caught:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return <h1>Something went wrong.</h1>;
    }
    return this.props.children;
  }
}

// Usage
<ErrorBoundary>
  <MyComponent />
</ErrorBoundary>
```

## Anti-Patterns to Avoid

### ❌ Mutating State Directly
```typescript
// DON'T DO THIS
user.name = 'New Name';
setUser(user); // Won't trigger re-render

// DO THIS
setUser({ ...user, name: 'New Name' });
```

### ❌ Missing Dependencies in useEffect
```typescript
// DON'T DO THIS
useEffect(() => {
  fetchData(userId); // userId not in deps
}, []);

// DO THIS
useEffect(() => {
  fetchData(userId);
}, [userId]);
```

### ❌ Creating Functions Inside JSX
```typescript
// DON'T DO THIS
<button onClick={() => handleClick(item.id)}>Click</button>

// DO THIS
const handleClick = useCallback((id) => {
  // Handle click
}, []);
<button onClick={() => handleClick(item.id)}>Click</button>

// OR THIS (if item.id is stable)
<button onClick={handleItemClick}>Click</button>
```

### ❌ Using Index as Key
```typescript
// DON'T DO THIS
{items.map((item, index) => <Item key={index} {...item} />)}

// DO THIS
{items.map(item => <Item key={item.id} {...item} />)}
```

## Quick Reference

**Components:**
- ✅ Functional components with hooks
- ✅ TypeScript interfaces for props
- ✅ Destructure props with defaults
- ✅ Early returns for loading/error states

**State:**
- ✅ useState for simple state
- ✅ useReducer for complex state
- ✅ Context API for global state
- ✅ Immutable updates

**Performance:**
- ✅ useMemo for expensive computations
- ✅ useCallback for stable function references
- ✅ React.memo for pure components
- ❌ Don't optimize prematurely

**Effects:**
- ✅ Include all dependencies
- ✅ Cleanup subscriptions
- ✅ Handle race conditions
- ❌ Don't ignore dependency warnings

**Events:**
- ✅ Proper React event types
- ✅ useCallback for handlers passed to children
- ✅ preventDefault when needed
