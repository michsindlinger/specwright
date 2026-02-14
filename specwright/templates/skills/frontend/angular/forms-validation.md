# Angular Forms & Validation

> Part of: Angular Frontend Skill
> Use when: Creating forms, validation, user input handling

## Form Types

| Type | Use Case | Complexity |
|------|----------|------------|
| Template-driven | Simple forms, few fields | Low |
| Reactive Forms | Complex forms, dynamic fields | Medium-High |

**Recommendation**: Use Reactive Forms for consistency.

## Reactive Forms Setup

### Basic Form
```typescript
@Component({
  selector: 'app-user-form',
  template: `
    <form [formGroup]="form" (ngSubmit)="onSubmit()">
      <input formControlName="name" />
      <input formControlName="email" type="email" />
      <button type="submit" [disabled]="form.invalid">Save</button>
    </form>
  `
})
export class UserFormComponent {
  private fb = inject(FormBuilder);

  form = this.fb.group({
    name: ['', [Validators.required, Validators.minLength(2)]],
    email: ['', [Validators.required, Validators.email]]
  });

  onSubmit() {
    if (this.form.valid) {
      console.log(this.form.value);
    }
  }
}
```

### Typed Forms (Angular 14+)
```typescript
interface UserForm {
  name: FormControl<string>;
  email: FormControl<string>;
  age: FormControl<number | null>;
}

@Component({...})
export class UserFormComponent {
  form = new FormGroup<UserForm>({
    name: new FormControl('', { nonNullable: true }),
    email: new FormControl('', { nonNullable: true }),
    age: new FormControl<number | null>(null)
  });

  // Fully typed
  getName(): string {
    return this.form.controls.name.value; // string, not string | null
  }
}
```

## Validation

### Built-in Validators
```typescript
form = this.fb.group({
  name: ['', [
    Validators.required,
    Validators.minLength(2),
    Validators.maxLength(50)
  ]],
  email: ['', [Validators.required, Validators.email]],
  age: [null, [Validators.min(0), Validators.max(150)]],
  website: ['', Validators.pattern(/^https?:\/\/.+/)],
});
```

### Custom Validator
```typescript
// validators/custom.validators.ts
export function noWhitespace(): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    if (control.value && control.value.trim().length === 0) {
      return { whitespace: true };
    }
    return null;
  };
}

export function matchFields(field1: string, field2: string): ValidatorFn {
  return (group: AbstractControl): ValidationErrors | null => {
    const value1 = group.get(field1)?.value;
    const value2 = group.get(field2)?.value;

    if (value1 !== value2) {
      return { fieldsMismatch: { field1, field2 } };
    }
    return null;
  };
}

// Usage
form = this.fb.group({
  password: ['', [Validators.required, Validators.minLength(8)]],
  confirmPassword: ['', Validators.required]
}, {
  validators: matchFields('password', 'confirmPassword')
});
```

### Async Validator
```typescript
export function uniqueEmail(userService: UserService): AsyncValidatorFn {
  return (control: AbstractControl): Observable<ValidationErrors | null> => {
    if (!control.value) {
      return of(null);
    }

    return userService.checkEmailExists(control.value).pipe(
      map(exists => exists ? { emailTaken: true } : null),
      catchError(() => of(null))
    );
  };
}

// Usage
email: ['', {
  validators: [Validators.required, Validators.email],
  asyncValidators: [uniqueEmail(this.userService)],
  updateOn: 'blur' // Reduce API calls
}]
```

## Error Display

### Error Message Component
```typescript
@Component({
  selector: 'app-field-error',
  template: `
    @if (control && control.invalid && (control.dirty || control.touched)) {
      <div class="error-message">
        @if (control.hasError('required')) {
          <span>This field is required</span>
        }
        @if (control.hasError('email')) {
          <span>Please enter a valid email</span>
        }
        @if (control.hasError('minlength')) {
          <span>Minimum {{ control.getError('minlength').requiredLength }} characters</span>
        }
        @if (control.hasError('emailTaken')) {
          <span>This email is already registered</span>
        }
      </div>
    }
  `
})
export class FieldErrorComponent {
  @Input() control: AbstractControl | null = null;
}
```

### Usage in Form
```html
<form [formGroup]="form">
  <div class="form-field">
    <label for="email">Email</label>
    <input id="email" formControlName="email" />
    <app-field-error [control]="form.controls.email" />
  </div>
</form>
```

## Dynamic Forms

### FormArray
```typescript
@Component({...})
export class DynamicFormComponent {
  form = this.fb.group({
    name: ['', Validators.required],
    addresses: this.fb.array([])
  });

  get addresses() {
    return this.form.get('addresses') as FormArray;
  }

  addAddress() {
    const addressGroup = this.fb.group({
      street: ['', Validators.required],
      city: ['', Validators.required],
      zip: ['', Validators.required]
    });
    this.addresses.push(addressGroup);
  }

  removeAddress(index: number) {
    this.addresses.removeAt(index);
  }
}
```

```html
<div formArrayName="addresses">
  @for (address of addresses.controls; track $index) {
    <div [formGroupName]="$index">
      <input formControlName="street" placeholder="Street" />
      <input formControlName="city" placeholder="City" />
      <input formControlName="zip" placeholder="ZIP" />
      <button type="button" (click)="removeAddress($index)">Remove</button>
    </div>
  }
</div>
<button type="button" (click)="addAddress()">Add Address</button>
```

## Form Submission

### With Loading State
```typescript
@Component({...})
export class UserFormComponent {
  submitting = signal(false);
  submitError = signal<string | null>(null);

  async onSubmit() {
    if (this.form.invalid) return;

    this.submitting.set(true);
    this.submitError.set(null);

    try {
      await this.userService.createUser(this.form.value);
      this.router.navigate(['/users']);
    } catch (err) {
      this.submitError.set('Failed to save user');
    } finally {
      this.submitting.set(false);
    }
  }
}
```

## Best Practices

1. **Use Typed Forms**: Better type safety and autocomplete
2. **Validate on Blur**: For async validators to reduce API calls
3. **Centralize Validators**: Keep custom validators in separate files
4. **Reusable Error Component**: Don't repeat error display logic
5. **Disable Submit**: When form is invalid or submitting
6. **Show Loading**: During async validation and submission
7. **Handle Errors**: Show server-side validation errors
