# React Forms & Validation

> Part of: React Frontend Skill
> Use when: Creating forms, validation, user input

## React Hook Form (Recommended)

### Basic Form
```tsx
import { useForm } from 'react-hook-form';

interface FormData {
  name: string;
  email: string;
}

function UserForm() {
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormData>();

  const onSubmit = async (data: FormData) => {
    await createUser(data);
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <input
        {...register('name', { required: 'Name is required' })}
        placeholder="Name"
      />
      {errors.name && <span>{errors.name.message}</span>}

      <input
        {...register('email', {
          required: 'Email is required',
          pattern: {
            value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
            message: 'Invalid email',
          },
        })}
        placeholder="Email"
      />
      {errors.email && <span>{errors.email.message}</span>}

      <button disabled={isSubmitting}>
        {isSubmitting ? 'Submitting...' : 'Submit'}
      </button>
    </form>
  );
}
```

### With Zod Validation
```tsx
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

const schema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Invalid email'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ['confirmPassword'],
});

type FormData = z.infer<typeof schema>;

function RegisterForm() {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      {/* fields */}
    </form>
  );
}
```

### Controlled Components
```tsx
import { useForm, Controller } from 'react-hook-form';

function FormWithSelect() {
  const { control, handleSubmit } = useForm();

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <Controller
        name="country"
        control={control}
        rules={{ required: 'Country is required' }}
        render={({ field, fieldState: { error } }) => (
          <>
            <Select {...field} options={countries} />
            {error && <span>{error.message}</span>}
          </>
        )}
      />
    </form>
  );
}
```

## Form Components

### Reusable Input
```tsx
interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: string;
}

const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, ...props }, ref) => (
    <div className="form-field">
      <label>{label}</label>
      <input ref={ref} {...props} className={error ? 'error' : ''} />
      {error && <span className="error-message">{error}</span>}
    </div>
  )
);

// Usage
<Input
  label="Email"
  {...register('email')}
  error={errors.email?.message}
/>
```

### Form Field Wrapper
```tsx
interface FormFieldProps {
  label: string;
  error?: string;
  children: React.ReactNode;
}

function FormField({ label, error, children }: FormFieldProps) {
  return (
    <div className="form-field">
      <label>{label}</label>
      {children}
      {error && <span className="error-message">{error}</span>}
    </div>
  );
}
```

## Dynamic Forms

### Field Arrays
```tsx
import { useFieldArray } from 'react-hook-form';

function DynamicForm() {
  const { control, register } = useForm({
    defaultValues: {
      addresses: [{ street: '', city: '' }],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: 'addresses',
  });

  return (
    <form>
      {fields.map((field, index) => (
        <div key={field.id}>
          <input {...register(`addresses.${index}.street`)} />
          <input {...register(`addresses.${index}.city`)} />
          <button type="button" onClick={() => remove(index)}>
            Remove
          </button>
        </div>
      ))}
      <button type="button" onClick={() => append({ street: '', city: '' })}>
        Add Address
      </button>
    </form>
  );
}
```

## Form State

### Watch Values
```tsx
function WatchExample() {
  const { register, watch } = useForm();
  const watchType = watch('type');

  return (
    <form>
      <select {...register('type')}>
        <option value="personal">Personal</option>
        <option value="business">Business</option>
      </select>

      {watchType === 'business' && (
        <input {...register('companyName')} placeholder="Company Name" />
      )}
    </form>
  );
}
```

### Reset Form
```tsx
function ResetExample() {
  const { register, handleSubmit, reset } = useForm();

  const onSubmit = async (data) => {
    await submitData(data);
    reset(); // Reset to default values
  };

  return <form onSubmit={handleSubmit(onSubmit)}>{/* fields */}</form>;
}
```

## Best Practices

1. **Use React Hook Form** for complex forms
2. **Use Zod** for schema validation
3. **Create reusable components** for inputs
4. **Show validation errors** on blur or submit
5. **Disable submit** while submitting
6. **Handle server errors** gracefully
7. **Use TypeScript** for type-safe forms
