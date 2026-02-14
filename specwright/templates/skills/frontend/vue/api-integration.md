# Vue API Integration

> Part of: Vue Frontend Skill
> Use when: Fetching data, making API calls

## Composable Pattern

### useApi Composable
```ts
// composables/useApi.ts
import { ref } from 'vue';

export function useApi<T>(fetcher: () => Promise<T>) {
  const data = ref<T | null>(null);
  const loading = ref(false);
  const error = ref<string | null>(null);

  async function execute() {
    loading.value = true;
    error.value = null;
    try {
      data.value = await fetcher();
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Unknown error';
    } finally {
      loading.value = false;
    }
  }

  return { data, loading, error, execute };
}
```

### Usage
```vue
<script setup lang="ts">
import { onMounted } from 'vue';
import { useApi } from '@/composables/useApi';

const { data: users, loading, error, execute } = useApi(() =>
  fetch('/api/users').then(r => r.json())
);

onMounted(execute);
</script>
```

## VueUse Integration

### useFetch
```vue
<script setup lang="ts">
import { useFetch } from '@vueuse/core';

const { data, isFetching, error } = useFetch('/api/users').json<User[]>();
</script>
```

### useAsyncState
```vue
<script setup lang="ts">
import { useAsyncState } from '@vueuse/core';

const { state: users, isLoading, error, execute } = useAsyncState(
  () => api.getUsers(),
  [], // initial state
  { immediate: true }
);
</script>
```

## With Pinia

### Store with API
```ts
// stores/user.ts
export const useUserStore = defineStore('user', () => {
  const users = ref<User[]>([]);
  const loading = ref(false);

  async function fetchUsers() {
    loading.value = true;
    try {
      users.value = await api.getUsers();
    } finally {
      loading.value = false;
    }
  }

  async function createUser(data: CreateUserDto) {
    const user = await api.createUser(data);
    users.value.push(user);
    return user;
  }

  return { users, loading, fetchUsers, createUser };
});
```

## API Client

```ts
// lib/api.ts
const BASE_URL = import.meta.env.VITE_API_URL;

async function request<T>(endpoint: string, options?: RequestInit): Promise<T> {
  const response = await fetch(`${BASE_URL}${endpoint}`, {
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
    ...options,
  });

  if (!response.ok) {
    throw new Error(`API Error: ${response.status}`);
  }

  return response.json();
}

export const api = {
  getUsers: () => request<User[]>('/users'),
  getUser: (id: string) => request<User>(`/users/${id}`),
  createUser: (data: CreateUserDto) =>
    request<User>('/users', { method: 'POST', body: JSON.stringify(data) }),
};
```

## Error Handling

```vue
<template>
  <div v-if="loading" class="loading">
    <Spinner />
  </div>
  <div v-else-if="error" class="error">
    <p>{{ error }}</p>
    <button @click="retry">Retry</button>
  </div>
  <div v-else>
    <!-- content -->
  </div>
</template>
```

## Best Practices

1. **Use composables** for data fetching logic
2. **Handle all states**: loading, error, empty, success
3. **Type API responses** with TypeScript
4. **Use stores** for shared data
5. **Add retry logic** for failed requests
