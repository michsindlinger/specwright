# Test Automation Skill

> Role: QA Engineer - Test Automation
> Created: 2026-01-09
> Purpose: Design, implement, and maintain automated test suites across unit, integration, and E2E levels

## Skill Activation

Activate this skill when:
- Implementing automated tests for new features
- Refactoring or improving existing test suites
- Setting up test automation infrastructure
- Debugging failing automated tests
- Optimizing test execution speed
- Implementing TDD or BDD workflows
- Converting manual tests to automated tests

## Core Capabilities

### 1. Unit Testing
- Write isolated, fast tests for individual components
- Mock external dependencies effectively
- Test business logic thoroughly
- Implement property-based testing for edge cases
- Follow TDD red-green-refactor cycle
- Maintain high code coverage (85%+)

### 2. Integration Testing
- Test interactions between multiple components
- Verify API endpoints and controllers
- Test database operations and queries
- Validate authentication and authorization
- Test external service integrations
- Ensure proper error handling across boundaries

### 3. End-to-End Testing
- Automate critical user workflows
- Test across multiple browsers and devices
- Validate complete feature functionality
- Implement visual regression testing
- Test accessibility requirements
- Monitor test reliability and flakiness

### 4. Test Infrastructure
- Set up test environments and fixtures
- Configure test runners and frameworks
- Implement test data management
- Create reusable test utilities and helpers
- Optimize test execution in CI/CD
- Maintain test documentation

## [TECH_STACK_SPECIFIC] Testing Frameworks

### Ruby on Rails (RSpec)

#### Unit Tests (Models, Services, Helpers)
```ruby
# spec/models/user_spec.rb
require 'rails_helper'

RSpec.describe User, type: :model do
  describe 'validations' do
    it { should validate_presence_of(:email) }
    it { should validate_uniqueness_of(:email).case_insensitive }
    it { should validate_length_of(:password).is_at_least(8) }
  end

  describe 'associations' do
    it { should have_many(:posts).dependent(:destroy) }
    it { should have_one(:profile).dependent(:destroy) }
  end

  describe '#full_name' do
    let(:user) { build(:user, first_name: 'John', last_name: 'Doe') }

    it 'returns concatenated first and last name' do
      expect(user.full_name).to eq('John Doe')
    end

    context 'when last name is missing' do
      before { user.last_name = nil }

      it 'returns only first name' do
        expect(user.full_name).to eq('John')
      end
    end
  end

  describe '#active?' do
    subject { user.active? }

    context 'when user has logged in within 30 days' do
      let(:user) { create(:user, last_login_at: 15.days.ago) }
      it { is_expected.to be true }
    end

    context 'when user has not logged in for over 30 days' do
      let(:user) { create(:user, last_login_at: 45.days.ago) }
      it { is_expected.to be false }
    end
  end
end
```

#### Integration Tests (Controllers, API)
```ruby
# spec/requests/api/v1/users_spec.rb
require 'rails_helper'

RSpec.describe 'API::V1::Users', type: :request do
  let(:user) { create(:user) }
  let(:auth_headers) { { 'Authorization' => "Bearer #{user.auth_token}" } }

  describe 'GET /api/v1/users/:id' do
    context 'with valid authentication' do
      before { get "/api/v1/users/#{user.id}", headers: auth_headers }

      it 'returns user details' do
        expect(response).to have_http_status(:ok)
        expect(json_response['id']).to eq(user.id)
        expect(json_response['email']).to eq(user.email)
      end

      it 'does not expose sensitive data' do
        expect(json_response).not_to have_key('password_digest')
        expect(json_response).not_to have_key('auth_token')
      end
    end

    context 'without authentication' do
      before { get "/api/v1/users/#{user.id}" }

      it 'returns unauthorized' do
        expect(response).to have_http_status(:unauthorized)
      end
    end

    context 'when user not found' do
      before { get '/api/v1/users/99999', headers: auth_headers }

      it 'returns not found' do
        expect(response).to have_http_status(:not_found)
      end
    end
  end

  describe 'POST /api/v1/users' do
    let(:valid_params) do
      {
        user: {
          email: 'newuser@example.com',
          password: 'SecureP@ss123',
          first_name: 'Jane',
          last_name: 'Smith'
        }
      }
    end

    context 'with valid parameters' do
      it 'creates a new user' do
        expect {
          post '/api/v1/users', params: valid_params
        }.to change(User, :count).by(1)
      end

      it 'returns created status' do
        post '/api/v1/users', params: valid_params
        expect(response).to have_http_status(:created)
      end

      it 'returns user data with auth token' do
        post '/api/v1/users', params: valid_params
        expect(json_response['auth_token']).to be_present
        expect(json_response['email']).to eq('newuser@example.com')
      end
    end

    context 'with invalid parameters' do
      let(:invalid_params) { { user: { email: 'invalid' } } }

      it 'does not create a user' do
        expect {
          post '/api/v1/users', params: invalid_params
        }.not_to change(User, :count)
      end

      it 'returns unprocessable entity' do
        post '/api/v1/users', params: invalid_params
        expect(response).to have_http_status(:unprocessable_entity)
      end

      it 'returns validation errors' do
        post '/api/v1/users', params: invalid_params
        expect(json_response['errors']).to be_present
      end
    end
  end
end
```

#### System Tests (Capybara)
```ruby
# spec/system/user_authentication_spec.rb
require 'rails_helper'

RSpec.describe 'User Authentication', type: :system do
  before do
    driven_by(:selenium_chrome_headless)
  end

  describe 'User signup' do
    it 'allows a new user to sign up successfully' do
      visit root_path
      click_link 'Sign Up'

      fill_in 'Email', with: 'newuser@example.com'
      fill_in 'Password', with: 'SecureP@ss123'
      fill_in 'Password confirmation', with: 'SecureP@ss123'
      fill_in 'First name', with: 'John'
      fill_in 'Last name', with: 'Doe'

      click_button 'Create Account'

      expect(page).to have_content('Welcome, John!')
      expect(page).to have_current_path(dashboard_path)
    end

    it 'shows validation errors for invalid input' do
      visit signup_path

      fill_in 'Email', with: 'invalid-email'
      fill_in 'Password', with: 'short'

      click_button 'Create Account'

      expect(page).to have_content('Email is invalid')
      expect(page).to have_content('Password is too short')
    end
  end

  describe 'User login' do
    let(:user) { create(:user, email: 'user@example.com', password: 'password123') }

    it 'allows existing user to log in' do
      visit login_path

      fill_in 'Email', with: user.email
      fill_in 'Password', with: 'password123'

      click_button 'Log In'

      expect(page).to have_content("Welcome back, #{user.first_name}!")
      expect(page).to have_current_path(dashboard_path)
    end

    it 'shows error for incorrect credentials' do
      visit login_path

      fill_in 'Email', with: user.email
      fill_in 'Password', with: 'wrongpassword'

      click_button 'Log In'

      expect(page).to have_content('Invalid email or password')
      expect(page).to have_current_path(login_path)
    end
  end
end
```

### React/JavaScript (Jest, React Testing Library)

#### Unit Tests (Components, Hooks)
```javascript
// src/components/UserProfile.test.jsx
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { UserProfile } from './UserProfile';

describe('UserProfile', () => {
  const mockUser = {
    id: 1,
    firstName: 'John',
    lastName: 'Doe',
    email: 'john@example.com',
    avatar: 'https://example.com/avatar.jpg'
  };

  it('renders user information', () => {
    render(<UserProfile user={mockUser} />);

    expect(screen.getByText('John Doe')).toBeInTheDocument();
    expect(screen.getByText('john@example.com')).toBeInTheDocument();
    expect(screen.getByAltText('John Doe avatar')).toHaveAttribute(
      'src',
      mockUser.avatar
    );
  });

  it('calls onEdit when edit button clicked', async () => {
    const handleEdit = jest.fn();
    render(<UserProfile user={mockUser} onEdit={handleEdit} />);

    await userEvent.click(screen.getByRole('button', { name: /edit/i }));

    expect(handleEdit).toHaveBeenCalledWith(mockUser.id);
  });

  it('shows placeholder when avatar is missing', () => {
    const userWithoutAvatar = { ...mockUser, avatar: null };
    render(<UserProfile user={userWithoutAvatar} />);

    expect(screen.getByText('JD')).toBeInTheDocument(); // Initials
    expect(screen.queryByAltText(/avatar/i)).not.toBeInTheDocument();
  });

  describe('edit mode', () => {
    it('shows form when in edit mode', () => {
      render(<UserProfile user={mockUser} isEditing={true} />);

      expect(screen.getByLabelText('First Name')).toHaveValue('John');
      expect(screen.getByLabelText('Last Name')).toHaveValue('Doe');
      expect(screen.getByLabelText('Email')).toHaveValue('john@example.com');
    });

    it('submits updated user data', async () => {
      const handleSave = jest.fn();
      render(<UserProfile user={mockUser} isEditing={true} onSave={handleSave} />);

      await userEvent.clear(screen.getByLabelText('First Name'));
      await userEvent.type(screen.getByLabelText('First Name'), 'Jane');
      await userEvent.click(screen.getByRole('button', { name: /save/i }));

      expect(handleSave).toHaveBeenCalledWith(
        expect.objectContaining({ firstName: 'Jane' })
      );
    });

    it('validates required fields', async () => {
      render(<UserProfile user={mockUser} isEditing={true} />);

      await userEvent.clear(screen.getByLabelText('Email'));
      await userEvent.click(screen.getByRole('button', { name: /save/i }));

      expect(await screen.findByText('Email is required')).toBeInTheDocument();
    });
  });
});
```

#### Custom Hooks Testing
```javascript
// src/hooks/useAuth.test.js
import { renderHook, act, waitFor } from '@testing-library/react';
import { useAuth } from './useAuth';
import { AuthProvider } from '../contexts/AuthContext';
import * as authService from '../services/authService';

jest.mock('../services/authService');

describe('useAuth', () => {
  const wrapper = ({ children }) => <AuthProvider>{children}</AuthProvider>;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('provides initial auth state', () => {
    const { result } = renderHook(() => useAuth(), { wrapper });

    expect(result.current.user).toBeNull();
    expect(result.current.isAuthenticated).toBe(false);
    expect(result.current.isLoading).toBe(false);
  });

  it('logs in user successfully', async () => {
    const mockUser = { id: 1, email: 'user@example.com' };
    authService.login.mockResolvedValue({ user: mockUser, token: 'fake-token' });

    const { result } = renderHook(() => useAuth(), { wrapper });

    await act(async () => {
      await result.current.login('user@example.com', 'password123');
    });

    await waitFor(() => {
      expect(result.current.user).toEqual(mockUser);
      expect(result.current.isAuthenticated).toBe(true);
      expect(result.current.isLoading).toBe(false);
    });
  });

  it('handles login error', async () => {
    authService.login.mockRejectedValue(new Error('Invalid credentials'));

    const { result } = renderHook(() => useAuth(), { wrapper });

    await act(async () => {
      try {
        await result.current.login('user@example.com', 'wrongpassword');
      } catch (error) {
        // Expected error
      }
    });

    expect(result.current.user).toBeNull();
    expect(result.current.isAuthenticated).toBe(false);
    expect(result.current.error).toBe('Invalid credentials');
  });

  it('logs out user', async () => {
    authService.logout.mockResolvedValue();
    const mockUser = { id: 1, email: 'user@example.com' };

    const { result } = renderHook(() => useAuth(), { wrapper });

    // First log in
    await act(async () => {
      result.current.setUser(mockUser);
    });

    // Then log out
    await act(async () => {
      await result.current.logout();
    });

    expect(result.current.user).toBeNull();
    expect(result.current.isAuthenticated).toBe(false);
  });
});
```

#### Integration Tests (API Calls)
```javascript
// src/services/userService.test.js
import { rest } from 'msw';
import { setupServer } from 'msw/node';
import { userService } from './userService';

const server = setupServer(
  rest.get('/api/users/:id', (req, res, ctx) => {
    const { id } = req.params;
    return res(
      ctx.json({
        id: Number(id),
        firstName: 'John',
        lastName: 'Doe',
        email: 'john@example.com'
      })
    );
  }),

  rest.post('/api/users', async (req, res, ctx) => {
    const body = await req.json();
    return res(
      ctx.status(201),
      ctx.json({
        id: 123,
        ...body
      })
    );
  }),

  rest.put('/api/users/:id', async (req, res, ctx) => {
    const { id } = req.params;
    const body = await req.json();
    return res(
      ctx.json({
        id: Number(id),
        ...body
      })
    );
  })
);

beforeAll(() => server.listen());
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

describe('userService', () => {
  describe('getUser', () => {
    it('fetches user by id', async () => {
      const user = await userService.getUser(1);

      expect(user).toEqual({
        id: 1,
        firstName: 'John',
        lastName: 'Doe',
        email: 'john@example.com'
      });
    });

    it('throws error when user not found', async () => {
      server.use(
        rest.get('/api/users/:id', (req, res, ctx) => {
          return res(ctx.status(404), ctx.json({ error: 'User not found' }));
        })
      );

      await expect(userService.getUser(999)).rejects.toThrow('User not found');
    });
  });

  describe('createUser', () => {
    it('creates new user', async () => {
      const userData = {
        firstName: 'Jane',
        lastName: 'Smith',
        email: 'jane@example.com'
      };

      const user = await userService.createUser(userData);

      expect(user).toMatchObject({
        id: expect.any(Number),
        ...userData
      });
    });

    it('handles validation errors', async () => {
      server.use(
        rest.post('/api/users', (req, res, ctx) => {
          return res(
            ctx.status(422),
            ctx.json({ errors: { email: 'Email is invalid' } })
          );
        })
      );

      await expect(
        userService.createUser({ email: 'invalid' })
      ).rejects.toThrow();
    });
  });

  describe('updateUser', () => {
    it('updates existing user', async () => {
      const updates = { firstName: 'Johnny' };

      const user = await userService.updateUser(1, updates);

      expect(user).toMatchObject({
        id: 1,
        firstName: 'Johnny'
      });
    });
  });
});
```

### E2E Testing (Playwright)

```typescript
// tests/e2e/user-authentication.spec.ts
import { test, expect } from '@playwright/test';

test.describe('User Authentication', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('user can sign up successfully', async ({ page }) => {
    await page.getByRole('link', { name: 'Sign Up' }).click();

    await page.getByLabel('Email').fill('newuser@example.com');
    await page.getByLabel('Password', { exact: true }).fill('SecureP@ss123');
    await page.getByLabel('Password confirmation').fill('SecureP@ss123');
    await page.getByLabel('First name').fill('John');
    await page.getByLabel('Last name').fill('Doe');

    await page.getByRole('button', { name: 'Create Account' }).click();

    await expect(page).toHaveURL(/.*dashboard/);
    await expect(page.getByText('Welcome, John!')).toBeVisible();
  });

  test('shows validation errors for invalid signup', async ({ page }) => {
    await page.goto('/signup');

    await page.getByLabel('Email').fill('invalid-email');
    await page.getByLabel('Password', { exact: true }).fill('short');

    await page.getByRole('button', { name: 'Create Account' }).click();

    await expect(page.getByText('Email is invalid')).toBeVisible();
    await expect(page.getByText('Password is too short')).toBeVisible();
  });

  test('existing user can log in', async ({ page }) => {
    // Assuming test user exists from database seeding
    await page.goto('/login');

    await page.getByLabel('Email').fill('testuser@example.com');
    await page.getByLabel('Password').fill('password123');

    await page.getByRole('button', { name: 'Log In' }).click();

    await expect(page).toHaveURL(/.*dashboard/);
    await expect(page.getByText(/Welcome back/i)).toBeVisible();
  });

  test('shows error for incorrect credentials', async ({ page }) => {
    await page.goto('/login');

    await page.getByLabel('Email').fill('testuser@example.com');
    await page.getByLabel('Password').fill('wrongpassword');

    await page.getByRole('button', { name: 'Log In' }).click();

    await expect(page.getByText('Invalid email or password')).toBeVisible();
    await expect(page).toHaveURL(/.*login/);
  });

  test('user can log out', async ({ page }) => {
    // Log in first
    await page.goto('/login');
    await page.getByLabel('Email').fill('testuser@example.com');
    await page.getByLabel('Password').fill('password123');
    await page.getByRole('button', { name: 'Log In' }).click();

    await expect(page).toHaveURL(/.*dashboard/);

    // Log out
    await page.getByRole('button', { name: 'Account' }).click();
    await page.getByRole('menuitem', { name: 'Log Out' }).click();

    await expect(page).toHaveURL('/');
    await expect(page.getByRole('link', { name: 'Log In' })).toBeVisible();
  });

  test('session persists across page refreshes', async ({ page }) => {
    // Log in
    await page.goto('/login');
    await page.getByLabel('Email').fill('testuser@example.com');
    await page.getByLabel('Password').fill('password123');
    await page.getByRole('button', { name: 'Log In' }).click();

    await expect(page).toHaveURL(/.*dashboard/);

    // Refresh page
    await page.reload();

    // Should still be logged in
    await expect(page).toHaveURL(/.*dashboard/);
    await expect(page.getByText(/Welcome/i)).toBeVisible();
  });
});
```

## Tools Required

### MCP Servers
[MCP_TOOLS]
<!-- Populated during skill creation based on:
     1. User's installed MCP servers
     2. User's selection for this skill

     Recommended for this skill (examples):
     - filesystem - Manage test files and fixtures
     - github - Access CI/CD pipelines and test results
     - browser - Debug E2E tests and capture screenshots

     Note: Skills work without MCP servers, but functionality may be limited
-->

### Testing Frameworks
- **Ruby**: RSpec, Minitest, FactoryBot, Faker
- **JavaScript**: Jest, Vitest, React Testing Library, Testing Library
- **E2E**: Playwright, Cypress

### Mocking & Stubbing
- **Ruby**: WebMock, VCR, RSpec mocks
- **JavaScript**: MSW (Mock Service Worker), jest.mock()

### Test Utilities
- **Ruby**: Database Cleaner, Timecop, SimpleCov
- **JavaScript**: faker-js, date-fns, istanbul

### CI/CD Integration
- GitHub Actions, CircleCI, GitLab CI
- Test result reporters (JUnit, Allure)
- Code coverage tools (Codecov, Coveralls)

## Quality Checklist

### Unit Test Quality
- [ ] Tests are isolated and independent
- [ ] Each test has single, clear assertion
- [ ] Test names describe expected behavior
- [ ] Edge cases and error scenarios covered
- [ ] Mocks/stubs used appropriately
- [ ] Tests run fast (< 10ms each)
- [ ] No flaky tests (100% consistent results)
- [ ] Code coverage > 85%

### Integration Test Quality
- [ ] Tests verify component interactions
- [ ] Database state properly set up and cleaned
- [ ] External dependencies mocked
- [ ] Error responses tested
- [ ] Authentication/authorization verified
- [ ] Tests are deterministic
- [ ] Test data realistic and representative

### E2E Test Quality
- [ ] Tests cover critical user paths
- [ ] Tests are reliable (no flakiness)
- [ ] Proper wait strategies used (no arbitrary sleeps)
- [ ] Tests clean up after themselves
- [ ] Screenshots/videos captured on failure
- [ ] Cross-browser compatibility verified
- [ ] Mobile responsiveness tested
- [ ] Tests run in < 30 seconds each

## Test Automation Best Practices

### 1. Follow AAA Pattern
```javascript
// Arrange - Set up test data and conditions
const user = { name: 'John', email: 'john@example.com' };

// Act - Perform the action being tested
const result = userService.create(user);

// Assert - Verify the expected outcome
expect(result).toMatchObject(user);
```

### 2. Use Descriptive Test Names
```ruby
# Bad
it 'works' do
  # test code
end

# Good
it 'creates user with valid email and sends welcome email' do
  # test code
end
```

### 3. Test Behavior, Not Implementation
```javascript
// Bad - Testing implementation details
expect(component.state.isOpen).toBe(true);

// Good - Testing user-visible behavior
expect(screen.getByRole('dialog')).toBeVisible();
```

### 4. Keep Tests DRY
```ruby
# Use shared contexts and helper methods
RSpec.shared_context 'authenticated user' do
  let(:user) { create(:user) }
  let(:auth_headers) { { 'Authorization' => "Bearer #{user.auth_token}" } }

  before { sign_in(user) }
end

RSpec.describe 'Protected Endpoints' do
  include_context 'authenticated user'

  # Tests can now use user and auth_headers
end
```

### 5. Avoid Test Interdependence
```ruby
# Bad - Tests depend on execution order
it 'creates user' do
  @user = User.create(email: 'test@example.com')
end

it 'finds created user' do
  user = User.find_by(email: 'test@example.com')
  expect(user).to eq(@user)
end

# Good - Each test is independent
it 'creates user' do
  user = User.create(email: 'test@example.com')
  expect(user).to be_persisted
end

it 'finds user by email' do
  user = create(:user, email: 'test@example.com')
  found = User.find_by(email: 'test@example.com')
  expect(found).to eq(user)
end
```

### 6. Use Test Fixtures and Factories Wisely
```ruby
# Use FactoryBot with traits for different scenarios
FactoryBot.define do
  factory :user do
    sequence(:email) { |n| "user#{n}@example.com" }
    password { 'SecureP@ss123' }
    first_name { 'John' }
    last_name { 'Doe' }

    trait :admin do
      role { :admin }
    end

    trait :with_posts do
      after(:create) do |user|
        create_list(:post, 3, user: user)
      end
    end
  end
end

# Usage
create(:user) # Basic user
create(:user, :admin) # Admin user
create(:user, :with_posts) # User with 3 posts
```

### 7. Prevent Flaky Tests
```typescript
// Bad - Arbitrary sleep
await page.click('#submit');
await page.waitForTimeout(1000); // Flaky!
expect(await page.textContent('.message')).toBe('Success');

// Good - Wait for specific condition
await page.click('#submit');
await page.waitForSelector('.message');
expect(await page.textContent('.message')).toBe('Success');
```

### 8. Test Error Scenarios
```javascript
describe('createUser', () => {
  it('handles network errors gracefully', async () => {
    // Mock network failure
    server.use(
      rest.post('/api/users', (req, res) => {
        return res.networkError('Failed to connect');
      })
    );

    await expect(userService.createUser(userData))
      .rejects
      .toThrow('Network error');
  });

  it('handles validation errors', async () => {
    const result = await userService.createUser({ email: 'invalid' });

    expect(result.success).toBe(false);
    expect(result.errors).toContain('Email is invalid');
  });
});
```

## Related Skills

- **test-strategy** - For planning test coverage
- **quality-metrics** - For tracking test metrics
- **regression-testing** - For maintaining test suites
