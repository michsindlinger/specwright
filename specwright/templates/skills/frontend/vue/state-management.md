# Vue State Management

> Part of: Vue Frontend Skill
> Use when: Managing application state with Pinia

## Reactivity Basics

### ref vs reactive
```ts
import { ref, reactive, computed } from 'vue';

// ref - for primitives and single values
const count = ref(0);
count.value++; // Need .value

// reactive - for objects
const state = reactive({
  count: 0,
  name: 'John',
});
state.count++; // No .value needed

// computed - derived state
const doubled = computed(() => count.value * 2);
```

## Pinia (Recommended)

### Define Store
```ts
// stores/user.ts
import { defineStore } from 'pinia';
import { ref, computed } from 'vue';

export const useUserStore = defineStore('user', () => {
  // State
  const users = ref<User[]>([]);
  const loading = ref(false);
  const error = ref<string | null>(null);

  // Getters
  const activeUsers = computed(() =>
    users.value.filter(u => u.isActive)
  );

  // Actions
  async function fetchUsers() {
    loading.value = true;
    error.value = null;
    try {
      users.value = await api.getUsers();
    } catch (e) {
      error.value = 'Failed to fetch users';
    } finally {
      loading.value = false;
    }
  }

  function addUser(user: User) {
    users.value.push(user);
  }

  return {
    users,
    loading,
    error,
    activeUsers,
    fetchUsers,
    addUser,
  };
});
```

### Use Store
```vue
<script setup lang="ts">
import { useUserStore } from '@/stores/user';
import { storeToRefs } from 'pinia';

const userStore = useUserStore();

// Destructure with reactivity preserved
const { users, loading, error } = storeToRefs(userStore);

// Actions can be destructured directly
const { fetchUsers, addUser } = userStore;

onMounted(() => {
  fetchUsers();
});
</script>

<template>
  <div v-if="loading">Loading...</div>
  <div v-else-if="error">{{ error }}</div>
  <ul v-else>
    <li v-for="user in users" :key="user.id">
      {{ user.name }}
    </li>
  </ul>
</template>
```

### Options Store (Alternative)
```ts
export const useCounterStore = defineStore('counter', {
  state: () => ({
    count: 0,
  }),
  getters: {
    doubled: (state) => state.count * 2,
  },
  actions: {
    increment() {
      this.count++;
    },
  },
});
```

## Composables for Local State

```ts
// composables/useToggle.ts
export function useToggle(initial = false) {
  const value = ref(initial);

  function toggle() {
    value.value = !value.value;
  }

  function setTrue() {
    value.value = true;
  }

  function setFalse() {
    value.value = false;
  }

  return { value, toggle, setTrue, setFalse };
}
```

## State Persistence

```ts
// stores/settings.ts
import { defineStore } from 'pinia';
import { useStorage } from '@vueuse/core';

export const useSettingsStore = defineStore('settings', () => {
  const theme = useStorage('theme', 'light');
  const language = useStorage('language', 'en');

  return { theme, language };
});
```

## Best Practices

1. **Use Pinia** for global state
2. **Use composables** for reusable local state
3. **Use `storeToRefs()`** when destructuring state
4. **Keep stores focused** (one domain per store)
5. **Use getters** for derived state
6. **Persist important state** with localStorage
