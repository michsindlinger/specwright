# Vue Forms & Validation

> Part of: Vue Frontend Skill
> Use when: Creating forms with VeeValidate

## VeeValidate Setup

### Basic Form
```vue
<script setup lang="ts">
import { useForm } from 'vee-validate';
import * as yup from 'yup';

const schema = yup.object({
  name: yup.string().required('Name is required'),
  email: yup.string().required().email('Invalid email'),
});

const { handleSubmit, errors, defineField } = useForm({
  validationSchema: schema,
});

const [name, nameAttrs] = defineField('name');
const [email, emailAttrs] = defineField('email');

const onSubmit = handleSubmit(async (values) => {
  await api.createUser(values);
});
</script>

<template>
  <form @submit="onSubmit">
    <div>
      <input v-model="name" v-bind="nameAttrs" />
      <span v-if="errors.name">{{ errors.name }}</span>
    </div>
    <div>
      <input v-model="email" v-bind="emailAttrs" />
      <span v-if="errors.email">{{ errors.email }}</span>
    </div>
    <button type="submit">Submit</button>
  </form>
</template>
```

### With Components
```vue
<script setup lang="ts">
import { Form, Field, ErrorMessage } from 'vee-validate';
import * as yup from 'yup';

const schema = yup.object({
  name: yup.string().required(),
  email: yup.string().email().required(),
});

async function onSubmit(values: any) {
  await api.createUser(values);
}
</script>

<template>
  <Form :validation-schema="schema" @submit="onSubmit">
    <Field name="name" />
    <ErrorMessage name="name" />

    <Field name="email" type="email" />
    <ErrorMessage name="email" />

    <button type="submit">Submit</button>
  </Form>
</template>
```

## Native v-model

### Simple Form
```vue
<script setup lang="ts">
import { ref } from 'vue';

const form = ref({
  name: '',
  email: '',
});

const errors = ref<Record<string, string>>({});

function validate() {
  errors.value = {};

  if (!form.value.name) {
    errors.value.name = 'Name is required';
  }

  if (!form.value.email) {
    errors.value.email = 'Email is required';
  } else if (!/\S+@\S+\.\S+/.test(form.value.email)) {
    errors.value.email = 'Invalid email';
  }

  return Object.keys(errors.value).length === 0;
}

async function handleSubmit() {
  if (validate()) {
    await api.createUser(form.value);
  }
}
</script>

<template>
  <form @submit.prevent="handleSubmit">
    <input v-model="form.name" />
    <span v-if="errors.name">{{ errors.name }}</span>

    <input v-model="form.email" type="email" />
    <span v-if="errors.email">{{ errors.email }}</span>

    <button type="submit">Submit</button>
  </form>
</template>
```

## Form Components

### Input Component
```vue
<!-- components/FormInput.vue -->
<script setup lang="ts">
defineProps<{
  modelValue: string;
  label: string;
  error?: string;
  type?: string;
}>();

defineEmits<{
  'update:modelValue': [value: string];
}>();
</script>

<template>
  <div class="form-field">
    <label>{{ label }}</label>
    <input
      :value="modelValue"
      :type="type ?? 'text'"
      @input="$emit('update:modelValue', ($event.target as HTMLInputElement).value)"
    />
    <span v-if="error" class="error">{{ error }}</span>
  </div>
</template>
```

## Best Practices

1. **Use VeeValidate** for complex forms
2. **Use Yup or Zod** for schema validation
3. **Create reusable form components**
4. **Show errors** after blur or submit
5. **Disable submit** while submitting
