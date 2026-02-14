# Interaction Designing

> Skill Template: Frontend Development
> Category: UX Patterns, Forms & Accessibility
> Version: 1.0.0
> Created: 2026-01-09

## Purpose

Design and implement user interactions with focus on usability, accessibility, form validation, user feedback, and inclusive design patterns.

## When to Activate

Activate this skill when:
- Building form interfaces with validation
- Implementing interactive UI patterns
- Ensuring accessibility (a11y) compliance
- Creating user feedback mechanisms (toasts, alerts, notifications)
- Designing keyboard navigation
- Implementing drag-and-drop interfaces
- Building modal/dialog interactions
- Creating responsive touch interactions

## Core Capabilities

### Form Design & Validation
- Input validation (client-side and server-side)
- Error messaging and display
- Real-time vs. on-submit validation
- Form state management
- Multi-step forms and wizards
- Auto-save and draft functionality

### User Feedback Patterns
- Loading states and skeletons
- Success/error notifications (toasts, alerts)
- Progress indicators
- Empty states and zero data
- Confirmation dialogs
- Optimistic UI updates

### Accessibility (a11y)
- WCAG compliance (AA/AAA standards)
- Screen reader compatibility
- Keyboard navigation
- Focus management
- ARIA attributes and roles
- Color contrast and visual accessibility

### Interactive Patterns
- Modals and dialogs
- Dropdown menus and selects
- Tooltips and popovers
- Tabs and accordions
- Drag and drop
- Infinite scroll and pagination

## [TECH_STACK_SPECIFIC] Patterns

### React Form Patterns

#### Controlled Forms with Validation

```javascript
import { useState } from 'react';

// Form validation utility
const validateEmail = (email) => {
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return re.test(email);
};

const validatePassword = (password) => {
  return password.length >= 8;
};

const useForm = (initialValues, validate) => {
  const [values, setValues] = useState(initialValues);
  const [errors, setErrors] = useState({});
  const [touched, setTouched] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setValues(prev => ({ ...prev, [name]: value }));

    // Clear error on change
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const handleBlur = (e) => {
    const { name } = e.target;
    setTouched(prev => ({ ...prev, [name]: true }));

    // Validate on blur
    const fieldErrors = validate({ [name]: values[name] });
    if (fieldErrors[name]) {
      setErrors(prev => ({ ...prev, ...fieldErrors }));
    }
  };

  const handleSubmit = async (onSubmit) => {
    return async (e) => {
      e.preventDefault();

      // Validate all fields
      const validationErrors = validate(values);
      setErrors(validationErrors);

      if (Object.keys(validationErrors).length === 0) {
        setIsSubmitting(true);
        try {
          await onSubmit(values);
        } catch (error) {
          // Handle submission error
          console.error(error);
        } finally {
          setIsSubmitting(false);
        }
      }
    };
  };

  return {
    values,
    errors,
    touched,
    isSubmitting,
    handleChange,
    handleBlur,
    handleSubmit
  };
};

// Form component
const SignupForm = () => {
  const validate = (values) => {
    const errors = {};

    if (!values.email) {
      errors.email = 'Email is required';
    } else if (!validateEmail(values.email)) {
      errors.email = 'Invalid email address';
    }

    if (!values.password) {
      errors.password = 'Password is required';
    } else if (!validatePassword(values.password)) {
      errors.password = 'Password must be at least 8 characters';
    }

    if (values.password !== values.confirmPassword) {
      errors.confirmPassword = 'Passwords do not match';
    }

    return errors;
  };

  const {
    values,
    errors,
    touched,
    isSubmitting,
    handleChange,
    handleBlur,
    handleSubmit
  } = useForm(
    { email: '', password: '', confirmPassword: '' },
    validate
  );

  const onSubmit = async (formValues) => {
    // Submit to API
    await api.post('/signup', formValues);
    toast.success('Account created successfully!');
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate>
      <div className="form-group">
        <label htmlFor="email">Email</label>
        <input
          id="email"
          name="email"
          type="email"
          value={values.email}
          onChange={handleChange}
          onBlur={handleBlur}
          aria-invalid={touched.email && errors.email ? 'true' : 'false'}
          aria-describedby={errors.email ? 'email-error' : undefined}
          className={touched.email && errors.email ? 'input-error' : ''}
        />
        {touched.email && errors.email && (
          <span id="email-error" className="error-message" role="alert">
            {errors.email}
          </span>
        )}
      </div>

      <div className="form-group">
        <label htmlFor="password">Password</label>
        <input
          id="password"
          name="password"
          type="password"
          value={values.password}
          onChange={handleChange}
          onBlur={handleBlur}
          aria-invalid={touched.password && errors.password ? 'true' : 'false'}
          aria-describedby={errors.password ? 'password-error' : undefined}
          className={touched.password && errors.password ? 'input-error' : ''}
        />
        {touched.password && errors.password && (
          <span id="password-error" className="error-message" role="alert">
            {errors.password}
          </span>
        )}
      </div>

      <button
        type="submit"
        disabled={isSubmitting}
        aria-busy={isSubmitting}
      >
        {isSubmitting ? 'Creating account...' : 'Sign Up'}
      </button>
    </form>
  );
};
```

#### React Hook Form Integration

```javascript
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';

// Validation schema
const signupSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  confirmPassword: z.string()
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ['confirmPassword']
});

const SignupForm = () => {
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting }
  } = useForm({
    resolver: zodResolver(signupSchema)
  });

  const onSubmit = async (data) => {
    await api.post('/signup', data);
    toast.success('Account created successfully!');
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate>
      <div className="form-group">
        <label htmlFor="email">Email</label>
        <input
          {...register('email')}
          id="email"
          type="email"
          aria-invalid={errors.email ? 'true' : 'false'}
        />
        {errors.email && (
          <span className="error-message" role="alert">
            {errors.email.message}
          </span>
        )}
      </div>

      <div className="form-group">
        <label htmlFor="password">Password</label>
        <input
          {...register('password')}
          id="password"
          type="password"
          aria-invalid={errors.password ? 'true' : 'false'}
        />
        {errors.password && (
          <span className="error-message" role="alert">
            {errors.password.message}
          </span>
        )}
      </div>

      <div className="form-group">
        <label htmlFor="confirmPassword">Confirm Password</label>
        <input
          {...register('confirmPassword')}
          id="confirmPassword"
          type="password"
          aria-invalid={errors.confirmPassword ? 'true' : 'false'}
        />
        {errors.confirmPassword && (
          <span className="error-message" role="alert">
            {errors.confirmPassword.message}
          </span>
        )}
      </div>

      <button type="submit" disabled={isSubmitting}>
        {isSubmitting ? 'Creating account...' : 'Sign Up'}
      </button>
    </form>
  );
};
```

### Accessible Modal Component

```javascript
import { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';

const Modal = ({ isOpen, onClose, title, children }) => {
  const modalRef = useRef(null);
  const previousActiveElement = useRef(null);

  useEffect(() => {
    if (isOpen) {
      // Store previously focused element
      previousActiveElement.current = document.activeElement;

      // Focus modal
      modalRef.current?.focus();

      // Prevent body scroll
      document.body.style.overflow = 'hidden';

      return () => {
        // Restore body scroll
        document.body.style.overflow = '';

        // Restore focus
        previousActiveElement.current?.focus();
      };
    }
  }, [isOpen]);

  // Handle escape key
  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose]);

  // Trap focus within modal
  const handleKeyDown = (e) => {
    if (e.key === 'Tab') {
      const focusableElements = modalRef.current?.querySelectorAll(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      );

      if (!focusableElements?.length) return;

      const firstElement = focusableElements[0];
      const lastElement = focusableElements[focusableElements.length - 1];

      if (e.shiftKey) {
        if (document.activeElement === firstElement) {
          e.preventDefault();
          lastElement.focus();
        }
      } else {
        if (document.activeElement === lastElement) {
          e.preventDefault();
          firstElement.focus();
        }
      }
    }
  };

  if (!isOpen) return null;

  return createPortal(
    <div
      className="modal-overlay"
      onClick={onClose}
      role="presentation"
    >
      <div
        ref={modalRef}
        className="modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
        tabIndex={-1}
        onClick={(e) => e.stopPropagation()}
        onKeyDown={handleKeyDown}
      >
        <div className="modal-header">
          <h2 id="modal-title">{title}</h2>
          <button
            onClick={onClose}
            aria-label="Close modal"
            className="modal-close"
          >
            ×
          </button>
        </div>
        <div className="modal-body">
          {children}
        </div>
      </div>
    </div>,
    document.body
  );
};

// Usage
const App = () => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <button onClick={() => setIsOpen(true)}>
        Open Modal
      </button>

      <Modal
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        title="Confirmation"
      >
        <p>Are you sure you want to proceed?</p>
        <div className="modal-actions">
          <button onClick={() => setIsOpen(false)}>Cancel</button>
          <button onClick={handleConfirm}>Confirm</button>
        </div>
      </Modal>
    </>
  );
};
```

### Notification/Toast System

```javascript
import { createContext, useContext, useState, useCallback } from 'react';

const ToastContext = createContext(null);

export const ToastProvider = ({ children }) => {
  const [toasts, setToasts] = useState([]);

  const addToast = useCallback((message, type = 'info', duration = 5000) => {
    const id = Date.now();
    setToasts(prev => [...prev, { id, message, type }]);

    if (duration) {
      setTimeout(() => {
        setToasts(prev => prev.filter(toast => toast.id !== id));
      }, duration);
    }
  }, []);

  const removeToast = useCallback((id) => {
    setToasts(prev => prev.filter(toast => toast.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={{ addToast, removeToast }}>
      {children}
      <div className="toast-container" aria-live="polite" aria-atomic="true">
        {toasts.map(toast => (
          <Toast
            key={toast.id}
            {...toast}
            onClose={() => removeToast(toast.id)}
          />
        ))}
      </div>
    </ToastContext.Provider>
  );
};

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within ToastProvider');
  }
  return context;
};

const Toast = ({ id, message, type, onClose }) => {
  const icons = {
    success: '✓',
    error: '✗',
    warning: '⚠',
    info: 'ℹ'
  };

  return (
    <div
      className={`toast toast-${type}`}
      role="status"
      aria-live="polite"
    >
      <span className="toast-icon">{icons[type]}</span>
      <span className="toast-message">{message}</span>
      <button
        onClick={onClose}
        aria-label="Close notification"
        className="toast-close"
      >
        ×
      </button>
    </div>
  );
};

// Usage
const MyComponent = () => {
  const { addToast } = useToast();

  const handleSuccess = () => {
    addToast('Operation completed successfully!', 'success');
  };

  const handleError = () => {
    addToast('An error occurred', 'error');
  };

  return (
    <div>
      <button onClick={handleSuccess}>Success</button>
      <button onClick={handleError}>Error</button>
    </div>
  );
};
```

### Vue Form Patterns

```vue
<script setup>
import { ref, computed } from 'vue';
import { useForm } from 'vee-validate';
import * as yup from 'yup';

// Validation schema
const schema = yup.object({
  email: yup.string().email('Invalid email').required('Email is required'),
  password: yup.string().min(8, 'Password must be at least 8 characters').required('Password is required'),
  confirmPassword: yup.string()
    .oneOf([yup.ref('password')], 'Passwords must match')
    .required('Confirm password is required')
});

const { handleSubmit, errors, defineField } = useForm({
  validationSchema: schema
});

const [email, emailAttrs] = defineField('email');
const [password, passwordAttrs] = defineField('password');
const [confirmPassword, confirmPasswordAttrs] = defineField('confirmPassword');

const isSubmitting = ref(false);

const onSubmit = handleSubmit(async (values) => {
  isSubmitting.value = true;
  try {
    await api.post('/signup', values);
    toast.success('Account created successfully!');
  } catch (error) {
    toast.error(error.message);
  } finally {
    isSubmitting.value = false;
  }
});
</script>

<template>
  <form @submit="onSubmit" novalidate>
    <div class="form-group">
      <label for="email">Email</label>
      <input
        v-model="email"
        v-bind="emailAttrs"
        id="email"
        type="email"
        :aria-invalid="!!errors.email"
        :class="{ 'input-error': errors.email }"
      />
      <span v-if="errors.email" class="error-message" role="alert">
        {{ errors.email }}
      </span>
    </div>

    <div class="form-group">
      <label for="password">Password</label>
      <input
        v-model="password"
        v-bind="passwordAttrs"
        id="password"
        type="password"
        :aria-invalid="!!errors.password"
        :class="{ 'input-error': errors.password }"
      />
      <span v-if="errors.password" class="error-message" role="alert">
        {{ errors.password }}
      </span>
    </div>

    <div class="form-group">
      <label for="confirmPassword">Confirm Password</label>
      <input
        v-model="confirmPassword"
        v-bind="confirmPasswordAttrs"
        id="confirmPassword"
        type="password"
        :aria-invalid="!!errors.confirmPassword"
        :class="{ 'input-error': errors.confirmPassword }"
      />
      <span v-if="errors.confirmPassword" class="error-message" role="alert">
        {{ errors.confirmPassword }}
      </span>
    </div>

    <button type="submit" :disabled="isSubmitting">
      {{ isSubmitting ? 'Creating account...' : 'Sign Up' }}
    </button>
  </form>
</template>
```

## Tools Required

### Form Libraries
- **React Hook Form** (React)
- **Formik** (React)
- **VeeValidate** (Vue)
- **Angular Reactive Forms** (Angular)

### Validation Libraries
- **Zod** (TypeScript-first)
- **Yup** (Schema validation)
- **Joi** (Node/Browser validation)

### Accessibility Testing
- **axe DevTools** (Browser extension)
- **WAVE** (Web accessibility evaluation)
- **Lighthouse** (Chrome DevTools)
- **pa11y** (Automated testing)

### UI Feedback
- **React Hot Toast** (Toast notifications)
- **React Toastify** (Toast notifications)
- **Notistack** (Snackbar notifications)

### MCP Servers
[MCP_TOOLS]
<!-- Populated during skill creation based on:
     1. User's installed MCP servers
     2. User's selection for this skill

     Recommended for this skill (examples):
     - Accessibility testing tools
     - Form validation services
     - User interaction analytics

     Note: Skills work without MCP servers, but functionality may be limited
-->

## Quality Checklist

### Form Accessibility
- [ ] All inputs have associated labels
- [ ] Error messages are announced to screen readers
- [ ] Required fields are clearly marked
- [ ] Form has logical tab order
- [ ] Submit button shows loading state
- [ ] Success/error feedback is accessible

### Keyboard Navigation
- [ ] All interactive elements are keyboard accessible
- [ ] Tab order is logical and intuitive
- [ ] Focus indicators are visible
- [ ] Escape key closes modals/dropdowns
- [ ] Arrow keys work in custom components
- [ ] Enter key submits forms

### Screen Reader Support
- [ ] ARIA labels are used appropriately
- [ ] ARIA roles are correctly applied
- [ ] Live regions announce dynamic content
- [ ] Hidden content is properly marked
- [ ] Landmarks help with navigation

### Visual Accessibility
- [ ] Color contrast meets WCAG AA standards
- [ ] Text is resizable without breaking layout
- [ ] Focus indicators are clearly visible
- [ ] Information isn't conveyed by color alone
- [ ] Interactive elements have sufficient size (44×44px)

### Form Validation
- [ ] Client-side validation is immediate and helpful
- [ ] Server-side validation is also implemented
- [ ] Error messages are specific and actionable
- [ ] Validation doesn't prevent form submission unnecessarily
- [ ] Success feedback is provided after submission

### User Feedback
- [ ] Loading states are shown for async operations
- [ ] Success/error notifications are clear
- [ ] Empty states are informative
- [ ] Progress is communicated for long operations
- [ ] Optimistic updates improve perceived performance

## Best Practices

### Progressive Enhancement
Build forms that work without JavaScript:

```html
<form action="/signup" method="POST">
  <input type="email" name="email" required />
  <input type="password" name="password" required minlength="8" />
  <button type="submit">Sign Up</button>
</form>
```

Then enhance with JavaScript for better UX.

### Inclusive Design
Consider diverse users:
- Low vision users (contrast, font size)
- Motor impairment users (large click targets, keyboard)
- Cognitive impairment users (clear labels, simple language)
- Screen reader users (semantic HTML, ARIA)

### Error Prevention
Help users avoid errors:
- Provide clear instructions
- Use appropriate input types
- Validate as users type (for complex fields)
- Confirm destructive actions
- Allow undo where possible

---

**Remember**: Good interaction design is invisible - users accomplish their goals efficiently without thinking about the interface. Prioritize accessibility and usability in every interaction.
