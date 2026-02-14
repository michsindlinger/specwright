# React Component Patterns

> Part of: React Frontend Skill
> Use when: Creating or modifying React components

## Component Structure

### Basic Functional Component
```tsx
interface UserCardProps {
  user: User;
  onDelete?: (id: string) => void;
}

export function UserCard({ user, onDelete }: UserCardProps) {
  return (
    <div className="user-card">
      <h3>{user.name}</h3>
      {onDelete && (
        <button onClick={() => onDelete(user.id)}>Delete</button>
      )}
    </div>
  );
}
```

### With Children
```tsx
interface CardProps {
  title: string;
  children: React.ReactNode;
}

export function Card({ title, children }: CardProps) {
  return (
    <div className="card">
      <h2>{title}</h2>
      <div className="card-content">{children}</div>
    </div>
  );
}
```

## Component Types

### Container Component
```tsx
export function UserListContainer() {
  const { data: users, isLoading, error } = useUsers();

  if (isLoading) return <Spinner />;
  if (error) return <ErrorMessage error={error} />;

  return <UserList users={users} />;
}
```

### Presentational Component
```tsx
interface UserListProps {
  users: User[];
}

export function UserList({ users }: UserListProps) {
  return (
    <ul>
      {users.map(user => (
        <li key={user.id}>{user.name}</li>
      ))}
    </ul>
  );
}
```

## Hooks

### useState
```tsx
function Counter() {
  const [count, setCount] = useState(0);

  return (
    <button onClick={() => setCount(c => c + 1)}>
      Count: {count}
    </button>
  );
}
```

### useEffect
```tsx
function UserProfile({ userId }: { userId: string }) {
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadUser() {
      const data = await fetchUser(userId);
      if (!cancelled) {
        setUser(data);
      }
    }

    loadUser();

    // Cleanup function
    return () => {
      cancelled = true;
    };
  }, [userId]);

  return user ? <div>{user.name}</div> : <Spinner />;
}
```

### Custom Hook
```tsx
function useLocalStorage<T>(key: string, initialValue: T) {
  const [value, setValue] = useState<T>(() => {
    const stored = localStorage.getItem(key);
    return stored ? JSON.parse(stored) : initialValue;
  });

  useEffect(() => {
    localStorage.setItem(key, JSON.stringify(value));
  }, [key, value]);

  return [value, setValue] as const;
}
```

## Performance

### memo
```tsx
const ExpensiveComponent = memo(function ExpensiveComponent({ data }: Props) {
  // Only re-renders if data changes (shallow comparison)
  return <div>{/* expensive rendering */}</div>;
});
```

### useMemo
```tsx
function FilteredList({ items, filter }: Props) {
  const filteredItems = useMemo(
    () => items.filter(item => item.name.includes(filter)),
    [items, filter]
  );

  return <List items={filteredItems} />;
}
```

### useCallback
```tsx
function Parent() {
  const handleClick = useCallback((id: string) => {
    console.log('Clicked:', id);
  }, []);

  return <Child onClick={handleClick} />;
}
```

## Best Practices

1. **One component per file**
2. **Use TypeScript interfaces** for props
3. **Destructure props** in function parameters
4. **Keep components small** and focused
5. **Extract hooks** for reusable logic
6. **Avoid premature optimization** (memo, useMemo, useCallback)
7. **Always provide keys** for lists
8. **Clean up effects** to prevent memory leaks
