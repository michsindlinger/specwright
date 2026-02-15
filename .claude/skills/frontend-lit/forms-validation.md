# Forms & Validation Patterns

## Basic Form Pattern

```typescript
@customElement('aos-login-form')
export class AosLoginForm extends LitElement {
  @state() private _email = '';
  @state() private _password = '';
  @state() private _errors: Record<string, string> = {};
  @state() private _isSubmitting = false;

  render() {
    return html`
      <form @submit=${this._handleSubmit}>
        <aos-input
          label="Email"
          type="email"
          .value=${this._email}
          .error=${this._errors.email}
          @input=${(e: InputEvent) => this._email = (e.target as HTMLInputElement).value}
          @blur=${() => this._validateEmail()}
        ></aos-input>

        <aos-input
          label="Password"
          type="password"
          .value=${this._password}
          .error=${this._errors.password}
          @input=${(e: InputEvent) => this._password = (e.target as HTMLInputElement).value}
          @blur=${() => this._validatePassword()}
        ></aos-input>

        <aos-button
          type="submit"
          ?disabled=${this._isSubmitting}
          ?loading=${this._isSubmitting}
        >
          Login
        </aos-button>
      </form>
    `;
  }

  private _validateEmail(): boolean {
    if (!this._email) {
      this._errors = { ...this._errors, email: 'Email is required' };
      return false;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(this._email)) {
      this._errors = { ...this._errors, email: 'Invalid email format' };
      return false;
    }
    const { email, ...rest } = this._errors;
    this._errors = rest;
    return true;
  }

  private _validatePassword(): boolean {
    if (!this._password) {
      this._errors = { ...this._errors, password: 'Password is required' };
      return false;
    }
    if (this._password.length < 8) {
      this._errors = { ...this._errors, password: 'Password must be at least 8 characters' };
      return false;
    }
    const { password, ...rest } = this._errors;
    this._errors = rest;
    return true;
  }

  private async _handleSubmit(e: Event) {
    e.preventDefault();

    const isEmailValid = this._validateEmail();
    const isPasswordValid = this._validatePassword();

    if (!isEmailValid || !isPasswordValid) return;

    this._isSubmitting = true;
    try {
      await apiClient.login(this._email, this._password);
      this.dispatchEvent(new CustomEvent('login-success', { bubbles: true, composed: true }));
    } catch (error) {
      this._errors = { ...this._errors, form: 'Login failed. Please try again.' };
    } finally {
      this._isSubmitting = false;
    }
  }
}
```

---

## Input Component

```typescript
@customElement('aos-input')
export class AosInput extends LitElement {
  @property({ type: String }) label = '';
  @property({ type: String }) type = 'text';
  @property({ type: String }) value = '';
  @property({ type: String }) error = '';
  @property({ type: String }) placeholder = '';
  @property({ type: Boolean }) required = false;
  @property({ type: Boolean }) disabled = false;

  static styles = css`
    :host {
      display: block;
      margin-bottom: var(--space-md);
    }

    label {
      display: block;
      margin-bottom: var(--space-xs);
      color: var(--color-text-secondary);
      font-size: 0.875rem;
    }

    .required::after {
      content: ' *';
      color: var(--color-error);
    }

    input {
      width: 100%;
      padding: var(--space-sm) var(--space-md);
      background: var(--color-bg-secondary);
      border: 1px solid var(--color-bg-tertiary);
      border-radius: 4px;
      color: var(--color-text-primary);
      font-size: 1rem;
    }

    input:focus {
      outline: none;
      border-color: var(--color-accent);
    }

    input.error {
      border-color: var(--color-error);
    }

    .error-message {
      margin-top: var(--space-xs);
      color: var(--color-error);
      font-size: 0.75rem;
      display: flex;
      align-items: center;
      gap: var(--space-xs);
    }
  `;

  render() {
    return html`
      <label class=${this.required ? 'required' : ''}>
        ${this.label}
      </label>
      <input
        type=${this.type}
        .value=${this.value}
        placeholder=${this.placeholder}
        ?disabled=${this.disabled}
        ?required=${this.required}
        class=${this.error ? 'error' : ''}
        aria-invalid=${this.error ? 'true' : 'false'}
        aria-describedby=${this.error ? 'error-message' : nothing}
        @input=${this._handleInput}
        @blur=${this._handleBlur}
      />
      ${this.error ? html`
        <div class="error-message" id="error-message">
          <aos-icon name="alert-circle" size="sm"></aos-icon>
          ${this.error}
        </div>
      ` : nothing}
    `;
  }

  private _handleInput(e: InputEvent) {
    this.dispatchEvent(new CustomEvent('input', {
      detail: { value: (e.target as HTMLInputElement).value },
      bubbles: true,
      composed: true
    }));
  }

  private _handleBlur() {
    this.dispatchEvent(new CustomEvent('blur', { bubbles: true, composed: true }));
  }
}
```

---

## Validation Patterns

### Required Fields

```typescript
const validateRequired = (value: string, fieldName: string): string | null => {
  if (!value.trim()) {
    return `${fieldName} is required`;
  }
  return null;
};
```

### Email Validation

```typescript
const validateEmail = (email: string): string | null => {
  if (!email) return 'Email is required';
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return 'Invalid email format';
  }
  return null;
};
```

### Min/Max Length

```typescript
const validateLength = (value: string, min: number, max: number, fieldName: string): string | null => {
  if (value.length < min) {
    return `${fieldName} must be at least ${min} characters`;
  }
  if (value.length > max) {
    return `${fieldName} must be at most ${max} characters`;
  }
  return null;
};
```

---

## Chat Input Pattern

```typescript
@customElement('aos-chat-input')
export class AosChatInput extends LitElement {
  @state() private _message = '';
  @property({ type: Boolean }) disabled = false;

  static styles = css`
    :host {
      display: block;
      padding: var(--space-md);
      background: var(--color-bg-secondary);
      border-top: 1px solid var(--color-bg-tertiary);
    }

    .container {
      display: flex;
      gap: var(--space-sm);
    }

    textarea {
      flex: 1;
      min-height: 40px;
      max-height: 120px;
      padding: var(--space-sm);
      background: var(--color-bg-primary);
      border: 1px solid var(--color-bg-tertiary);
      border-radius: 4px;
      color: var(--color-text-primary);
      resize: none;
    }

    textarea:focus {
      outline: none;
      border-color: var(--color-accent);
    }
  `;

  render() {
    return html`
      <div class="container">
        <textarea
          .value=${this._message}
          placeholder="Type a message... (Enter to send, Shift+Enter for new line)"
          ?disabled=${this.disabled}
          @input=${this._handleInput}
          @keydown=${this._handleKeydown}
        ></textarea>
        <aos-button
          variant="primary"
          ?disabled=${!this._message.trim() || this.disabled}
          @click=${this._send}
        >
          Send
        </aos-button>
      </div>
    `;
  }

  private _handleInput(e: InputEvent) {
    this._message = (e.target as HTMLTextAreaElement).value;
    this._autoResize(e.target as HTMLTextAreaElement);
  }

  private _handleKeydown(e: KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      this._send();
    }
  }

  private _autoResize(textarea: HTMLTextAreaElement) {
    textarea.style.height = 'auto';
    textarea.style.height = `${Math.min(textarea.scrollHeight, 120)}px`;
  }

  private _send() {
    if (!this._message.trim()) return;

    this.dispatchEvent(new CustomEvent('send-message', {
      detail: { message: this._message.trim() },
      bubbles: true,
      composed: true
    }));

    this._message = '';
  }
}
```

---

## Best Practices

1. **Validate on blur** - Show errors when user leaves field
2. **Re-validate on change** - Clear errors as user fixes them
3. **Disable submit during loading** - Prevent double-submit
4. **Show all errors at once** - Don't make user fix one at a time
5. **Use aria-invalid and aria-describedby** - Accessibility
6. **Auto-focus first error** - Help user find the problem
