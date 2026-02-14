# Regression Testing Skill

> Role: QA Engineer - Regression Testing & Continuous Testing
> Created: 2026-01-09
> Purpose: Maintain comprehensive regression test suites and ensure continuous testing throughout development lifecycle

## Skill Activation

Activate this skill when:
- Setting up regression test suites for new projects
- Maintaining and updating existing regression tests
- Planning regression testing for releases
- Optimizing regression test execution
- Addressing test failures and flakiness
- Implementing continuous testing in CI/CD
- Balancing test coverage with execution speed

## Core Capabilities

### 1. Regression Suite Management
- Design comprehensive regression test suites
- Prioritize tests by risk and business value
- Organize tests into logical suites (smoke, sanity, full)
- Maintain test documentation and traceability
- Review and update tests regularly
- Remove obsolete or redundant tests

### 2. Continuous Testing
- Integrate tests into CI/CD pipeline
- Configure test execution triggers
- Implement parallel test execution
- Set up test result reporting
- Monitor test health and reliability
- Automate test failure notifications

### 3. Test Optimization
- Identify and fix flaky tests
- Optimize slow tests for faster execution
- Implement smart test selection
- Use test tagging and filtering
- Balance coverage with speed
- Monitor and improve test efficiency

### 4. Failure Analysis
- Investigate test failures quickly
- Differentiate between product bugs and test issues
- Track failure patterns and trends
- Document known issues and workarounds
- Implement retry strategies for transient failures
- Maintain test quarantine process

## [TECH_STACK_SPECIFIC] Regression Testing Setup

### Ruby on Rails (RSpec)

#### Test Suite Organization
```ruby
# spec/spec_helper.rb
RSpec.configure do |config|
  # Tag-based test organization
  config.define_derived_metadata(file_path: %r{/spec/models/}) do |metadata|
    metadata[:type] = :model
    metadata[:suite] = :unit
  end

  config.define_derived_metadata(file_path: %r{/spec/requests/}) do |metadata|
    metadata[:type] = :request
    metadata[:suite] = :integration
  end

  config.define_derived_metadata(file_path: %r{/spec/system/}) do |metadata|
    metadata[:type] = :system
    metadata[:suite] = :e2e
  end

  # Smoke test tagging
  config.define_derived_metadata(smoke: true) do |metadata|
    metadata[:suite] = :smoke
  end

  # Critical path tagging
  config.define_derived_metadata(critical: true) do |metadata|
    metadata[:priority] = :high
  end
end
```

#### Smoke Test Suite
```ruby
# spec/smoke/critical_paths_spec.rb
require 'rails_helper'

RSpec.describe 'Critical Paths', type: :system, smoke: true do
  it 'allows user signup and login', :critical do
    # Signup
    visit signup_path
    fill_in 'Email', with: 'test@example.com'
    fill_in 'Password', with: 'SecureP@ss123'
    fill_in 'Password confirmation', with: 'SecureP@ss123'
    click_button 'Sign Up'

    expect(page).to have_content('Welcome')

    # Logout
    click_button 'Account'
    click_link 'Log Out'

    # Login
    visit login_path
    fill_in 'Email', with: 'test@example.com'
    fill_in 'Password', with: 'SecureP@ss123'
    click_button 'Log In'

    expect(page).to have_content('Welcome back')
  end

  it 'allows authenticated user to create and view content', :critical do
    user = create(:user)
    sign_in(user)

    visit new_post_path
    fill_in 'Title', with: 'Test Post'
    fill_in 'Content', with: 'This is test content'
    click_button 'Publish'

    expect(page).to have_content('Post published successfully')
    expect(page).to have_content('Test Post')
    expect(page).to have_content('This is test content')
  end

  it 'processes payments successfully', :critical do
    user = create(:user)
    product = create(:product, price: 99.99)
    sign_in(user)

    visit product_path(product)
    click_button 'Buy Now'

    # Mock payment processing
    fill_in 'Card number', with: '4242424242424242'
    fill_in 'Expiry', with: '12/25'
    fill_in 'CVC', with: '123'
    click_button 'Pay $99.99'

    expect(page).to have_content('Payment successful')
    expect(user.purchases.last.product).to eq(product)
  end
end

# Run smoke tests only
# bundle exec rspec --tag smoke
```

#### Parallel Test Execution
```ruby
# .rspec_parallel
--require rails_helper
--color
--format progress
--format ParallelTests::RSpec::RuntimeLogger --out tmp/parallel_runtime_rspec.log

# Run tests in parallel
# bundle exec parallel_rspec spec/ -n 4

# Gemfile
group :test do
  gem 'parallel_tests'
end
```

#### Test Retry Configuration
```ruby
# spec/spec_helper.rb
require 'rspec/retry'

RSpec.configure do |config|
  # Show retry status in spec process
  config.verbose_retry = true

  # Show exception that triggers a retry if verbose_retry is set to true
  config.display_try_failure_messages = true

  # Run retry only on system tests (which may have timing issues)
  config.around :each, :system do |example|
    example.run_with_retry retry: 3, retry_wait: 1
  end

  # Callback to run before each retry
  config.retry_callback = proc do |example|
    # Clean up state before retry
    Capybara.reset_sessions!
    DatabaseCleaner.clean_with(:truncation)
  end
end
```

### JavaScript/React (Jest, Playwright)

#### Test Suite Organization
```javascript
// jest.config.js
module.exports = {
  projects: [
    {
      displayName: 'unit',
      testMatch: ['**/__tests__/**/*.test.[jt]s?(x)'],
      testPathIgnorePatterns: ['/integration/', '/e2e/']
    },
    {
      displayName: 'integration',
      testMatch: ['**/__tests__/integration/**/*.test.[jt]s?(x)']
    }
  ],

  // Smoke tests runner
  testNamePattern: process.env.SMOKE_ONLY ? '^.*(smoke|critical).*$' : undefined
};

// Run specific suites
// npm test -- --selectProjects=unit
// npm test -- --selectProjects=integration
// SMOKE_ONLY=true npm test
```

#### Smoke Tests
```javascript
// src/__tests__/smoke/critical-paths.test.jsx
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { App } from '../../App';

describe('Critical Paths (smoke)', () => {
  it('completes user signup flow', async () => {
    render(<App />);

    // Navigate to signup
    await userEvent.click(screen.getByRole('link', { name: /sign up/i }));

    // Fill signup form
    await userEvent.type(screen.getByLabelText(/email/i), 'test@example.com');
    await userEvent.type(screen.getByLabelText(/^password$/i), 'SecureP@ss123');
    await userEvent.type(screen.getByLabelText(/confirm password/i), 'SecureP@ss123');
    await userEvent.click(screen.getByRole('button', { name: /create account/i }));

    // Verify success
    await waitFor(() => {
      expect(screen.getByText(/welcome/i)).toBeInTheDocument();
    });
  });

  it('allows authenticated user to create content', async () => {
    const user = userEvent.setup();
    render(<App initialRoute="/dashboard" isAuthenticated />);

    // Create new post
    await user.click(screen.getByRole('button', { name: /new post/i }));
    await user.type(screen.getByLabelText(/title/i), 'Test Post');
    await user.type(screen.getByLabelText(/content/i), 'Test content');
    await user.click(screen.getByRole('button', { name: /publish/i }));

    // Verify post created
    await waitFor(() => {
      expect(screen.getByText('Test Post')).toBeInTheDocument();
    });
  });
});
```

#### Playwright E2E Regression Suite
```typescript
// tests/e2e/regression/critical-flows.spec.ts
import { test, expect } from '@playwright/test';

test.describe('Critical User Flows', () => {
  test.describe.configure({ mode: 'serial' });

  test('user can sign up, create content, and logout', async ({ page }) => {
    // Sign up
    await page.goto('/signup');
    await page.getByLabel('Email').fill('test@example.com');
    await page.getByLabel('Password', { exact: true }).fill('SecureP@ss123');
    await page.getByLabel('Confirm Password').fill('SecureP@ss123');
    await page.getByRole('button', { name: 'Sign Up' }).click();

    await expect(page).toHaveURL(/.*dashboard/);
    await expect(page.getByText(/welcome/i)).toBeVisible();

    // Create content
    await page.getByRole('button', { name: 'New Post' }).click();
    await page.getByLabel('Title').fill('My First Post');
    await page.getByLabel('Content').fill('This is my first post content');
    await page.getByRole('button', { name: 'Publish' }).click();

    await expect(page.getByText('My First Post')).toBeVisible();

    // Logout
    await page.getByRole('button', { name: 'Account' }).click();
    await page.getByRole('menuitem', { name: 'Logout' }).click();

    await expect(page).toHaveURL('/');
  });

  test('handles errors gracefully', async ({ page }) => {
    // Test network error handling
    await page.route('**/api/**', route => route.abort());

    await page.goto('/dashboard');

    await expect(page.getByText(/unable to load/i)).toBeVisible();
    await expect(page.getByRole('button', { name: /retry/i })).toBeVisible();
  });
});

// Playwright parallel execution
// npx playwright test --workers=4

// Run only smoke tests
// npx playwright test --grep @smoke
```

#### Test Retry Strategy
```typescript
// playwright.config.ts
import { defineConfig } from '@playwright/test';

export default defineConfig({
  // Retry failed tests
  retries: process.env.CI ? 2 : 0,

  // Test timeout
  timeout: 30000,

  // Expect timeout
  expect: {
    timeout: 5000
  },

  // Parallel execution
  workers: process.env.CI ? 1 : undefined,
  fullyParallel: true,

  // Fail fast in CI
  maxFailures: process.env.CI ? 5 : undefined,

  // Reporter configuration
  reporter: [
    ['html'],
    ['junit', { outputFile: 'test-results/junit.xml' }],
    ['list']
  ],

  use: {
    // Base URL
    baseURL: process.env.BASE_URL || 'http://localhost:3000',

    // Screenshot on failure
    screenshot: 'only-on-failure',

    // Video on retry
    video: 'retain-on-failure',

    // Trace on first retry
    trace: 'on-first-retry'
  }
});
```

### CI/CD Integration

#### GitHub Actions Regression Suite
```yaml
# .github/workflows/regression-tests.yml
name: Regression Tests

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]
  schedule:
    # Run full regression daily at 2 AM
    - cron: '0 2 * * *'

jobs:
  smoke-tests:
    name: Smoke Tests
    runs-on: ubuntu-latest
    timeout-minutes: 10

    steps:
      - uses: actions/checkout@v3

      - name: Set up Ruby
        uses: ruby/setup-ruby@v1
        with:
          ruby-version: 3.2
          bundler-cache: true

      - name: Set up database
        run: |
          bundle exec rails db:create db:schema:load
          bundle exec rails db:seed

      - name: Run smoke tests
        run: bundle exec rspec --tag smoke
        timeout-minutes: 5

      - name: Upload test results
        if: always()
        uses: actions/upload-artifact@v3
        with:
          name: smoke-test-results
          path: tmp/rspec-results.xml

  unit-tests:
    name: Unit Tests
    runs-on: ubuntu-latest
    timeout-minutes: 15

    steps:
      - uses: actions/checkout@v3

      - name: Set up Ruby
        uses: ruby/setup-ruby@v1
        with:
          ruby-version: 3.2
          bundler-cache: true

      - name: Run unit tests
        run: bundle exec rspec spec/models spec/services spec/helpers

      - name: Upload coverage
        uses: codecov/codecov-action@v3
        with:
          files: ./coverage/coverage.json
          flags: unit

  integration-tests:
    name: Integration Tests
    runs-on: ubuntu-latest
    timeout-minutes: 20

    services:
      postgres:
        image: postgres:17
        env:
          POSTGRES_PASSWORD: postgres
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
        ports:
          - 5432:5432

    steps:
      - uses: actions/checkout@v3

      - name: Set up Ruby
        uses: ruby/setup-ruby@v1
        with:
          ruby-version: 3.2
          bundler-cache: true

      - name: Set up database
        env:
          DATABASE_URL: postgres://postgres:postgres@localhost:5432/test
        run: |
          bundle exec rails db:create db:schema:load

      - name: Run integration tests
        env:
          DATABASE_URL: postgres://postgres:postgres@localhost:5432/test
        run: bundle exec rspec spec/requests spec/controllers

  e2e-tests:
    name: E2E Tests
    runs-on: ubuntu-latest
    timeout-minutes: 30

    steps:
      - uses: actions/checkout@v3

      - name: Set up Node.js
        uses: actions/setup-node@v3
        with:
          node-version: 22
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Install Playwright browsers
        run: npx playwright install --with-deps

      - name: Start application
        run: |
          npm run build
          npm start &
          npx wait-on http://localhost:3000

      - name: Run E2E tests
        run: npx playwright test

      - name: Upload Playwright report
        if: always()
        uses: actions/upload-artifact@v3
        with:
          name: playwright-report
          path: playwright-report/

  full-regression:
    name: Full Regression Suite
    runs-on: ubuntu-latest
    # Only run on schedule or manual trigger
    if: github.event_name == 'schedule' || github.event_name == 'workflow_dispatch'
    timeout-minutes: 60

    strategy:
      matrix:
        browser: [chromium, firefox, webkit]

    steps:
      - uses: actions/checkout@v3

      - name: Set up environment
        # ... setup steps ...

      - name: Run full test suite
        run: |
          bundle exec rspec
          npx playwright test --project=${{ matrix.browser }}

      - name: Generate combined report
        if: always()
        run: |
          # Combine all test results
          node scripts/combine-test-results.js

  regression-summary:
    name: Regression Summary
    runs-on: ubuntu-latest
    needs: [smoke-tests, unit-tests, integration-tests, e2e-tests]
    if: always()

    steps:
      - name: Download all artifacts
        uses: actions/download-artifact@v3

      - name: Generate summary report
        run: |
          echo "## Regression Test Summary" >> $GITHUB_STEP_SUMMARY
          echo "" >> $GITHUB_STEP_SUMMARY
          echo "| Suite | Status | Duration |" >> $GITHUB_STEP_SUMMARY
          echo "|-------|--------|----------|" >> $GITHUB_STEP_SUMMARY

          # Parse results and add to summary
          # (Implementation depends on your test result format)
```

## Tools Required

### MCP Servers
[MCP_TOOLS]
<!-- Populated during skill creation based on:
     1. User's installed MCP servers
     2. User's selection for this skill

     Recommended for this skill (examples):
     - github - Monitor CI/CD pipelines and test runs
     - filesystem - Access test suites and artifacts
     - slack - Send test failure notifications

     Note: Skills work without MCP servers, but functionality may be limited
-->

### Test Execution
- **Ruby**: RSpec, Parallel Tests, RSpec Retry
- **JavaScript**: Jest, Vitest
- **E2E**: Playwright, Cypress

### CI/CD Integration
- GitHub Actions, CircleCI, GitLab CI
- Test result parsers (JUnit XML)
- Artifact storage

### Test Management
- Test result reporting (Allure, ReportPortal)
- Failure tracking and analysis
- Test execution history

### Monitoring & Alerting
- CI/CD dashboards
- Slack/email notifications
- Test health monitoring

## Quality Checklist

### Regression Suite Health
- [ ] Smoke tests run in < 5 minutes
- [ ] Full regression suite runs in < 30 minutes
- [ ] Zero flaky tests
- [ ] All critical paths covered
- [ ] Tests are properly tagged and organized
- [ ] Test data is isolated and repeatable
- [ ] Tests clean up after themselves

### CI/CD Integration
- [ ] Tests run on every PR
- [ ] Smoke tests run on every commit
- [ ] Full regression runs daily
- [ ] Failed tests block deployments
- [ ] Test results visible in PR
- [ ] Failure notifications sent to team
- [ ] Test artifacts saved for debugging

### Test Maintenance
- [ ] Obsolete tests removed regularly
- [ ] Flaky tests fixed or quarantined
- [ ] Slow tests optimized
- [ ] Test coverage gaps identified
- [ ] Test documentation up to date
- [ ] Test code follows coding standards

## Regression Testing Best Practices

### 1. Prioritize Tests
```markdown
**Test Priority Levels:**

**P0 - Smoke Tests (5-10 minutes)**
- User authentication flow
- Critical business transactions
- Data integrity checks
- System health checks

**P1 - Core Regression (15-20 minutes)**
- All P0 tests
- Main user workflows
- API endpoints
- Database operations

**P2 - Full Regression (30-60 minutes)**
- All P1 tests
- Edge cases and error scenarios
- Cross-browser testing
- Performance tests

**P3 - Extended Regression (1-2 hours)**
- All P2 tests
- Compatibility testing
- Localization testing
- Accessibility testing
```

### 2. Test Suite Organization
```markdown
spec/
├── smoke/               # P0 - Critical paths only
│   └── critical_paths_spec.rb
├── models/              # P1 - Business logic
│   ├── user_spec.rb
│   └── payment_spec.rb
├── requests/            # P1 - API endpoints
│   ├── api/
│   └── web/
├── system/              # P2 - Full user flows
│   ├── authentication/
│   ├── checkout/
│   └── admin/
└── compatibility/       # P3 - Extended tests
    ├── browsers/
    └── devices/
```

### 3. Smart Test Selection
- Run smoke tests on every commit
- Run affected tests based on code changes
- Run full regression before releases
- Run extended tests periodically

### 4. Parallel Execution
- Split tests into independent groups
- Run tests in parallel to save time
- Ensure tests don't interfere with each other
- Use isolated test data per worker

### 5. Failure Analysis Process
```markdown
1. **Identify** - Detect failure in CI/CD
2. **Classify** - Product bug vs. test issue
3. **Isolate** - Can failure be reproduced locally?
4. **Document** - Log failure details and context
5. **Fix** - Fix product or test issue
6. **Verify** - Confirm fix resolves failure
7. **Monitor** - Watch for recurrence
```

### 6. Flaky Test Management
```markdown
**Prevention:**
- Use explicit waits, not sleeps
- Ensure test data isolation
- Clean up state between tests
- Avoid time-dependent assertions

**Detection:**
- Run tests multiple times
- Track test pass/fail history
- Monitor test stability metrics

**Resolution:**
- Quarantine flaky tests immediately
- Investigate root cause
- Fix or rewrite test
- Re-enable after verification
```

### 7. Test Data Management
- Use factories for consistent test data
- Seed realistic data for E2E tests
- Clean up test data after execution
- Avoid dependencies on specific data

### 8. Continuous Improvement
- Review test failures in retrospectives
- Analyze test execution trends
- Optimize slow tests regularly
- Remove redundant tests
- Update tests for new features

## Success Metrics

Track these metrics for regression testing:

- **Test Execution Time**: Trending down over time
- **Test Pass Rate**: Consistently above 98%
- **Flaky Test Count**: Zero flaky tests
- **Test Coverage**: Maintaining or increasing coverage
- **Failure Detection Time**: Bugs caught quickly
- **Fix Time**: Test failures resolved within hours

## Related Skills

- **test-strategy** - For planning regression approach
- **test-automation** - For implementing tests
- **quality-metrics** - For tracking test health
