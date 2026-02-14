---
description: Playwright E2E testing best practices for validation
version: 1.0
framework: playwright
category: testing
---

# Playwright Best Practices

## Test Structure

### Test Organization
```typescript
import { test, expect } from '@playwright/test';

test.describe('User Management', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/users');
  });

  test('should display users list', async ({ page }) => {
    await expect(page.getByRole('heading', { name: 'Users' })).toBeVisible();
    const rows = page.getByRole('row');
    await expect(rows).toHaveCount.greaterThan(0);
  });

  test('should create new user', async ({ page }) => {
    await page.getByRole('button', { name: 'New User' }).click();
    await page.getByRole('textbox', { name: 'Name' }).fill('John Doe');
    await page.getByRole('textbox', { name: 'Email' }).fill('john@example.com');
    await page.getByRole('button', { name: 'Submit' }).click();

    await expect(page.getByText('User created successfully')).toBeVisible();
  });
});
```

**Key Points:**
- Use test.describe for grouping
- Use test.beforeEach for common setup
- Clear, descriptive test names
- One assertion concept per test
- Arrange-Act-Assert pattern

## Locator Strategies

### Accessibility-First Selectors (Recommended)
```typescript
// ✅ BEST: Use role-based selectors
await page.getByRole('button', { name: 'Submit' }).click();
await page.getByRole('textbox', { name: 'Username' }).fill('john');
await page.getByRole('heading', { name: 'Welcome' }).toBeVisible();

// ✅ GOOD: Use label text
await page.getByLabel('Email address').fill('john@example.com');

// ✅ GOOD: Use text content
await page.getByText('Sign in').click();

// ⚠️ OK: Use test IDs (when role not available)
await page.getByTestId('user-menu').click();

// ❌ AVOID: CSS selectors
await page.locator('.btn-primary').click();
await page.locator('#submit-btn').click();
```

**Key Points:**
- Prefer getByRole (validates accessibility)
- Use getByLabel for form fields
- getByTestId for complex elements
- Avoid CSS selectors (brittle)
- Locators auto-wait (no manual waits needed)

## Page Object Model

### Page Class Pattern
```typescript
// pages/user-page.ts
import { Page, Locator } from '@playwright/test';

export class UserPage {
  readonly page: Page;
  readonly heading: Locator;
  readonly newUserButton: Locator;
  readonly nameInput: Locator;
  readonly emailInput: Locator;
  readonly submitButton: Locator;

  constructor(page: Page) {
    this.page = page;
    this.heading = page.getByRole('heading', { name: 'Users' });
    this.newUserButton = page.getByRole('button', { name: 'New User' });
    this.nameInput = page.getByRole('textbox', { name: 'Name' });
    this.emailInput = page.getByRole('textbox', { name: 'Email' });
    this.submitButton = page.getByRole('button', { name: 'Submit' });
  }

  async goto() {
    await this.page.goto('/users');
  }

  async createUser(name: string, email: string) {
    await this.newUserButton.click();
    await this.nameInput.fill(name);
    await this.emailInput.fill(email);
    await this.submitButton.click();
  }
}

// Usage in test
test('should create user', async ({ page }) => {
  const userPage = new UserPage(page);
  await userPage.goto();
  await userPage.createUser('John Doe', 'john@example.com');
  await expect(page.getByText('User created')).toBeVisible();
});
```

**Key Points:**
- Page class per page/feature
- Readonly locators
- Action methods (createUser, fillForm)
- Reusable across tests
- Easier maintenance

## Assertions

### Auto-Waiting Assertions
```typescript
// ✅ Auto-wait for element to be visible
await expect(page.getByRole('button')).toBeVisible();

// ✅ Auto-wait for text content
await expect(page.getByRole('heading')).toHaveText('Welcome');

// ✅ Auto-wait for count
await expect(page.getByRole('row')).toHaveCount(5);

// ✅ Auto-wait for URL
await expect(page).toHaveURL('/dashboard');

// ✅ Auto-wait for attribute
await expect(page.getByRole('button')).toBeDisabled();
```

**Key Points:**
- Use expect(locator) not expect(await locator)
- Assertions auto-wait (no need for waitFor)
- Soft assertions with expect.soft() for multiple checks
- Custom timeout: expect(locator).toBeVisible({ timeout: 10000 })

## Test Fixtures

### Custom Fixtures
```typescript
// fixtures/auth.ts
import { test as base } from '@playwright/test';

type AuthFixtures = {
  authenticatedPage: Page;
};

export const test = base.extend<AuthFixtures>({
  authenticatedPage: async ({ page }, use) => {
    // Setup: Login before test
    await page.goto('/login');
    await page.getByLabel('Email').fill('test@example.com');
    await page.getByLabel('Password').fill('password');
    await page.getByRole('button', { name: 'Sign in' }).click();
    await expect(page).toHaveURL('/dashboard');

    // Use the authenticated page
    await use(page);

    // Teardown: Logout after test
    await page.getByRole('button', { name: 'Logout' }).click();
  }
});

// Usage
test('should access protected page', async ({ authenticatedPage }) => {
  await authenticatedPage.goto('/profile');
  await expect(authenticatedPage.getByRole('heading')).toHaveText('Profile');
});
```

**Key Points:**
- Extend base test for custom fixtures
- Setup before use(), teardown after
- Fixtures run per test (isolated)
- Share common setup across tests

## Anti-Patterns to Avoid

### ❌ Manual Waits
```typescript
// DON'T DO THIS
await page.waitForTimeout(5000);

// DO THIS
await expect(page.getByRole('button')).toBeVisible();
```

### ❌ CSS Selectors Everywhere
```typescript
// DON'T DO THIS
await page.locator('.btn-primary').click();

// DO THIS
await page.getByRole('button', { name: 'Submit' }).click();
```

## Quick Reference

**Locators:**
- ✅ getByRole (accessibility-first)
- ✅ getByLabel (form fields)
- ✅ getByText (content)
- ✅ getByTestId (last resort)
- ❌ Avoid CSS selectors

**Assertions:**
- ✅ Auto-waiting expect(locator)
- ✅ toBeVisible, toHaveText, toHaveCount
- ✅ Soft assertions for multiple checks
- ❌ Don't use waitForTimeout

**Organization:**
- ✅ Page Object Model for complex flows
- ✅ Fixtures for common setup
- ✅ test.describe for grouping
- ✅ Clear test names
