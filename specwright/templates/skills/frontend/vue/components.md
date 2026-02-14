# Vue Component Patterns

> Part of: Vue Frontend Skill
> Use when: Creating or modifying Vue components

## Component Structure

### Script Setup (Recommended)
```vue
<script setup lang="ts">
import { ref, computed } from 'vue';

interface Props {
  title: string;
  count?: number;
}

const props = withDefaults(defineProps<Props>(), {
  count: 0,
});

const emit = defineEmits<{
  increment: [value: number];
  close: [];
}>();

const localCount = ref(props.count);
const doubled = computed(() => localCount.value * 2);

function handleIncrement() {
  localCount.value++;
  emit('increment', localCount.value);
}
</script>

<template>
  <div class="card">
    <h2>{{ title }}</h2>
    <p>Count: {{ localCount }} (doubled: {{ doubled }})</p>
    <button @click="handleIncrement">Increment</button>
    <button @click="emit('close')">Close</button>
  </div>
</template>

<style scoped>
.card {
  padding: 1rem;
  border: 1px solid #ccc;
}
</style>
```

## Props & Emits

### Typed Props
```vue
<script setup lang="ts">
interface User {
  id: string;
  name: string;
}

const props = defineProps<{
  user: User;
  isActive?: boolean;
}>();
</script>
```

### With Defaults
```vue
<script setup lang="ts">
const props = withDefaults(defineProps<{
  size?: 'sm' | 'md' | 'lg';
  disabled?: boolean;
}>(), {
  size: 'md',
  disabled: false,
});
</script>
```

### Typed Emits
```vue
<script setup lang="ts">
const emit = defineEmits<{
  change: [value: string];
  submit: [data: FormData];
}>();

// Usage
emit('change', 'new value');
</script>
```

## Slots

### Named Slots
```vue
<!-- Parent -->
<Card>
  <template #header>
    <h1>Title</h1>
  </template>
  <template #default>
    <p>Content</p>
  </template>
  <template #footer>
    <button>Action</button>
  </template>
</Card>

<!-- Card.vue -->
<template>
  <div class="card">
    <header><slot name="header" /></header>
    <main><slot /></main>
    <footer><slot name="footer" /></footer>
  </div>
</template>
```

### Scoped Slots
```vue
<!-- List.vue -->
<template>
  <ul>
    <li v-for="item in items" :key="item.id">
      <slot :item="item" :index="index" />
    </li>
  </ul>
</template>

<!-- Parent -->
<List :items="users">
  <template #default="{ item, index }">
    {{ index }}: {{ item.name }}
  </template>
</List>
```

## Composables

### Basic Composable
```ts
// composables/useCounter.ts
import { ref, computed } from 'vue';

export function useCounter(initial = 0) {
  const count = ref(initial);
  const doubled = computed(() => count.value * 2);

  function increment() {
    count.value++;
  }

  function decrement() {
    count.value--;
  }

  return { count, doubled, increment, decrement };
}
```

### With Lifecycle
```ts
// composables/useWindowSize.ts
import { ref, onMounted, onUnmounted } from 'vue';

export function useWindowSize() {
  const width = ref(window.innerWidth);
  const height = ref(window.innerHeight);

  function update() {
    width.value = window.innerWidth;
    height.value = window.innerHeight;
  }

  onMounted(() => window.addEventListener('resize', update));
  onUnmounted(() => window.removeEventListener('resize', update));

  return { width, height };
}
```

## Provide/Inject

```vue
<!-- Provider -->
<script setup lang="ts">
import { provide, ref } from 'vue';

const theme = ref('light');
provide('theme', theme);
</script>

<!-- Consumer -->
<script setup lang="ts">
import { inject } from 'vue';

const theme = inject<Ref<string>>('theme', ref('light'));
</script>
```

## Best Practices

1. **Use `<script setup>`** for cleaner components
2. **Type props and emits** with TypeScript
3. **Extract composables** for reusable logic
4. **Use scoped styles** to prevent CSS leaks
5. **Keep components focused** and small
6. **Use v-model** for two-way binding
