# [SKILL_NAME] - Backend Test Engineering

> **Role:** Backend Testing Specialist
> **Domain:** Unit, Integration & E2E Testing
> **Created:** [CURRENT_DATE]

## Purpose

Design and implement comprehensive backend testing strategies including unit tests, integration tests, and end-to-end tests. Focus on test quality, coverage, maintainability, and fast feedback loops.

## When to Activate

**Use this skill for:**
- Writing unit tests for business logic
- Creating integration tests for database operations
- Building E2E tests for API endpoints
- Setting up test fixtures and factories
- Mocking external dependencies
- Test performance optimization

**Do NOT use for:**
- Business logic implementation (use logic-implementing)
- Database queries (use persistence-adapter)
- External integrations (use integration-adapter)

## Core Capabilities

### 1. Unit Testing
- Test business logic in isolation
- Mock external dependencies
- Test edge cases and error paths
- Fast execution, no I/O

### 2. Integration Testing
- Test database interactions
- Test service orchestration
- Test with real dependencies
- Transaction rollback

### 3. E2E Testing
- Test complete workflows
- Test API endpoints
- Test authentication flows
- Test realistic scenarios

### 4. Test Data Management
- Factories for test data
- Fixtures for static data
- Database seeding
- Test isolation

## [TECH_STACK_SPECIFIC] Patterns

### Ruby on Rails / RSpec

```ruby
# spec/rails_helper.rb - Test Configuration
require 'spec_helper'
ENV['RAILS_ENV'] ||= 'test'
require_relative '../config/environment'

abort("The Rails environment is running in production mode!") if Rails.env.production?
require 'rspec/rails'

# Database Cleaner Setup
require 'database_cleaner/active_record'

RSpec.configure do |config|
  config.use_transactional_fixtures = false

  config.before(:suite) do
    DatabaseCleaner.clean_with(:truncation)
  end

  config.before(:each) do
    DatabaseCleaner.strategy = :transaction
  end

  config.before(:each, type: :feature) do
    DatabaseCleaner.strategy = :truncation
  end

  config.before(:each) do
    DatabaseCleaner.start
  end

  config.after(:each) do
    DatabaseCleaner.clean
  end

  # Factory Bot
  config.include FactoryBot::Syntax::Methods
end

# Shoulda Matchers
Shoulda::Matchers.configure do |config|
  config.integrate do |with|
    with.test_framework :rspec
    with.library :rails
  end
end

# VCR for API mocking
VCR.configure do |config|
  config.cassette_library_dir = 'spec/vcr_cassettes'
  config.hook_into :webmock
  config.configure_rspec_metadata!
  config.filter_sensitive_data('<API_KEY>') { ENV['API_KEY'] }
end

# Unit Test Example - Service Object
# spec/services/users/create_account_spec.rb
RSpec.describe Users::CreateAccount do
  describe '#call' do
    let(:params) do
      {
        email: 'user@example.com',
        password: 'password123',
        name: 'John Doe',
        bio: 'Test bio'
      }
    end

    subject(:service) { described_class.new(params) }

    context 'with valid parameters' do
      it 'creates a new user' do
        expect { service.call }.to change(User, :count).by(1)
      end

      it 'creates a profile for the user' do
        result = service.call
        expect(result.user.profile).to be_present
        expect(result.user.profile.name).to eq('John Doe')
      end

      it 'enqueues welcome email' do
        expect {
          service.call
        }.to have_enqueued_job(UserMailerJob).with(
          'welcome',
          'UserMailer',
          anything,
          anything
        )
      end

      it 'returns success result' do
        result = service.call
        expect(result).to be_success
        expect(result.user).to be_a(User)
      end
    end

    context 'with invalid email' do
      let(:params) { super().merge(email: 'invalid') }

      it 'does not create a user' do
        expect { service.call }.not_to change(User, :count)
      end

      it 'returns failure result' do
        result = service.call
        expect(result).to be_failure
        expect(result.errors).to include('Invalid email format')
      end
    end

    context 'when email already exists' do
      before { create(:user, email: params[:email]) }

      it 'returns failure result' do
        result = service.call
        expect(result).to be_failure
        expect(result.errors).to include('Email already taken')
      end
    end

    context 'when database error occurs' do
      before do
        allow(User).to receive(:create!).and_raise(ActiveRecord::RecordInvalid)
      end

      it 'raises the error' do
        expect { service.call }.to raise_error(ActiveRecord::RecordInvalid)
      end
    end
  end
end

# Integration Test Example - Repository
# spec/repositories/user_repository_spec.rb
RSpec.describe UserRepository do
  subject(:repository) { described_class.new }

  describe '#find' do
    let!(:user) { create(:user) }

    it 'returns user when found' do
      result = repository.find(user.id)
      expect(result).to eq(user)
    end

    it 'returns nil when not found' do
      result = repository.find(999)
      expect(result).to be_nil
    end
  end

  describe '#find_with_associations' do
    let!(:user) { create(:user) }
    let!(:profile) { create(:profile, user: user) }
    let!(:posts) { create_list(:post, 3, user: user) }

    it 'eager loads associations' do
      result = repository.find_with_associations(user.id)

      expect(result.association(:profile)).to be_loaded
      expect(result.association(:posts)).to be_loaded
    end

    it 'avoids N+1 queries' do
      # First query loads data
      repository.find_with_associations(user.id)

      # Should not make additional queries
      expect {
        result = repository.find_with_associations(user.id)
        result.profile.name
        result.posts.each(&:title)
      }.to make_database_queries(count: 1)
    end
  end

  describe '#active_users_with_recent_activity' do
    let!(:active_user) { create(:user, status: 'active') }
    let!(:inactive_user) { create(:user, status: 'inactive') }
    let!(:old_active_user) { create(:user, status: 'active') }

    before do
      create(:activity, user: active_user, created_at: 1.day.ago)
      create(:activity, user: inactive_user, created_at: 1.day.ago)
      create(:activity, user: old_active_user, created_at: 30.days.ago)
    end

    it 'returns only active users with recent activity' do
      users = repository.active_users_with_recent_activity

      expect(users).to include(active_user)
      expect(users).not_to include(inactive_user)
      expect(users).not_to include(old_active_user)
    end

    it 'orders by activity date descending' do
      newer_user = create(:user, status: 'active')
      create(:activity, user: newer_user, created_at: 1.hour.ago)

      users = repository.active_users_with_recent_activity

      expect(users.first).to eq(newer_user)
    end
  end
end

# Model Test Example
# spec/models/user_spec.rb
RSpec.describe User, type: :model do
  describe 'associations' do
    it { should have_one(:profile).dependent(:destroy) }
    it { should have_many(:posts).dependent(:destroy) }
    it { should have_many(:comments).dependent(:destroy) }
  end

  describe 'validations' do
    subject { build(:user) }

    it { should validate_presence_of(:email) }
    it { should validate_uniqueness_of(:email).case_insensitive }
    it { should validate_inclusion_of(:status).in_array(%w[active inactive suspended]) }
    it { should allow_value('user@example.com').for(:email) }
    it { should_not allow_value('invalid').for(:email) }
  end

  describe 'scopes' do
    let!(:active_user) { create(:user, status: 'active') }
    let!(:inactive_user) { create(:user, status: 'inactive') }
    let!(:premium_user) { create(:user, subscription_tier: 'premium') }

    describe '.active' do
      it 'returns only active users' do
        expect(User.active).to include(active_user)
        expect(User.active).not_to include(inactive_user)
      end
    end

    describe '.premium' do
      it 'returns only premium users' do
        expect(User.premium).to include(premium_user)
        expect(User.premium).not_to include(active_user)
      end
    end
  end

  describe '#full_name' do
    it 'returns first and last name combined' do
      user = build(:user, first_name: 'John', last_name: 'Doe')
      expect(user.full_name).to eq('John Doe')
    end

    it 'returns email when name not present' do
      user = build(:user, first_name: nil, last_name: nil, email: 'user@example.com')
      expect(user.full_name).to eq('user@example.com')
    end
  end
end

# API Integration Test Example
# spec/requests/api/v1/users_spec.rb
RSpec.describe 'API V1 Users', type: :request do
  let(:headers) do
    {
      'Content-Type' => 'application/json',
      'Authorization' => "Bearer #{token}"
    }
  end
  let(:token) { generate_jwt_token(user) }
  let(:user) { create(:user) }

  describe 'GET /api/v1/users/:id' do
    let!(:target_user) { create(:user, :with_profile) }

    it 'returns the user' do
      get "/api/v1/users/#{target_user.id}", headers: headers

      expect(response).to have_http_status(:ok)
      expect(json_response[:id]).to eq(target_user.id)
      expect(json_response[:email]).to eq(target_user.email)
    end

    it 'includes profile data' do
      get "/api/v1/users/#{target_user.id}", headers: headers

      expect(json_response[:profile]).to be_present
      expect(json_response[:profile][:name]).to eq(target_user.profile.name)
    end

    context 'when user not found' do
      it 'returns 404' do
        get '/api/v1/users/999', headers: headers

        expect(response).to have_http_status(:not_found)
        expect(json_response[:error]).to eq('User not found')
      end
    end

    context 'when unauthorized' do
      let(:headers) { { 'Content-Type' => 'application/json' } }

      it 'returns 401' do
        get "/api/v1/users/#{target_user.id}", headers: headers

        expect(response).to have_http_status(:unauthorized)
      end
    end
  end

  describe 'POST /api/v1/users' do
    let(:params) do
      {
        email: 'newuser@example.com',
        password: 'password123',
        name: 'New User'
      }
    end

    it 'creates a new user' do
      expect {
        post '/api/v1/users', params: params.to_json, headers: headers
      }.to change(User, :count).by(1)

      expect(response).to have_http_status(:created)
      expect(json_response[:email]).to eq('newuser@example.com')
    end

    context 'with invalid parameters' do
      let(:params) { { email: 'invalid', password: '123' } }

      it 'returns validation errors' do
        post '/api/v1/users', params: params.to_json, headers: headers

        expect(response).to have_http_status(:unprocessable_entity)
        expect(json_response[:errors]).to be_present
      end
    end
  end
end

# Factory Definition
# spec/factories/users.rb
FactoryBot.define do
  factory :user do
    sequence(:email) { |n| "user#{n}@example.com" }
    password { 'password123' }
    name { Faker::Name.name }
    status { 'active' }
    subscription_tier { 'free' }

    trait :inactive do
      status { 'inactive' }
    end

    trait :premium do
      subscription_tier { 'premium' }
    end

    trait :with_profile do
      after(:create) do |user|
        create(:profile, user: user)
      end
    end

    trait :with_posts do
      after(:create) do |user|
        create_list(:post, 3, user: user)
      end
    end
  end
end

# Test Helper
# spec/support/request_helpers.rb
module RequestHelpers
  def json_response
    JSON.parse(response.body, symbolize_names: true)
  end

  def generate_jwt_token(user)
    JWT.encode({ user_id: user.id }, Rails.application.secret_key_base)
  end
end

RSpec.configure do |config|
  config.include RequestHelpers, type: :request
end
```

### Node.js / TypeScript / Jest

```typescript
// jest.config.js
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/src', '<rootDir>/tests'],
  testMatch: ['**/__tests__/**/*.ts', '**/?(*.)+(spec|test).ts'],
  coverageDirectory: 'coverage',
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/**/*.d.ts',
    '!src/**/*.interface.ts'
  ],
  setupFilesAfterEnv: ['<rootDir>/tests/setup.ts'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1'
  }
};

// tests/setup.ts - Test Configuration
import { DataSource } from 'typeorm';
import { createConnection } from './test-db-connection';

let connection: DataSource;

beforeAll(async () => {
  connection = await createConnection();
  await connection.synchronize(true); // Drop and recreate schema
});

afterAll(async () => {
  await connection.destroy();
});

beforeEach(async () => {
  // Clear all tables
  const entities = connection.entityMetadatas;
  for (const entity of entities) {
    const repository = connection.getRepository(entity.name);
    await repository.clear();
  }
});

// Unit Test Example - Service
// tests/services/create-account.service.test.ts
import { CreateAccountService } from '@/services/create-account.service';
import { UserRepository } from '@/repositories/user.repository';
import { EmailService } from '@/services/email.service';
import { createMock } from '@golevelup/ts-jest';

describe('CreateAccountService', () => {
  let service: CreateAccountService;
  let userRepository: jest.Mocked<UserRepository>;
  let emailService: jest.Mocked<EmailService>;

  beforeEach(() => {
    userRepository = createMock<UserRepository>();
    emailService = createMock<EmailService>();
    service = new CreateAccountService(userRepository, emailService);
  });

  describe('execute', () => {
    const validParams = {
      email: 'user@example.com',
      password: 'password123',
      name: 'John Doe'
    };

    it('creates a new user account', async () => {
      userRepository.findByEmail.mockResolvedValue(null);
      userRepository.create.mockResolvedValue({
        id: '1',
        email: validParams.email,
        name: validParams.name
      } as any);

      const result = await service.execute(validParams);

      expect(result.success).toBe(true);
      expect(result.user).toBeDefined();
      expect(userRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          email: validParams.email
        })
      );
    });

    it('creates a profile for the user', async () => {
      userRepository.findByEmail.mockResolvedValue(null);
      userRepository.create.mockResolvedValue({ id: '1' } as any);
      userRepository.createProfile.mockResolvedValue({} as any);

      await service.execute(validParams);

      expect(userRepository.createProfile).toHaveBeenCalledWith(
        expect.objectContaining({
          name: validParams.name
        })
      );
    });

    it('sends welcome email', async () => {
      userRepository.findByEmail.mockResolvedValue(null);
      userRepository.create.mockResolvedValue({
        id: '1',
        email: validParams.email
      } as any);

      await service.execute(validParams);

      expect(emailService.sendWelcome).toHaveBeenCalledWith(validParams.email);
    });

    it('returns error when email is invalid', async () => {
      const invalidParams = { ...validParams, email: 'invalid' };

      const result = await service.execute(invalidParams);

      expect(result.success).toBe(false);
      expect(result.errors).toContainEqual({
        field: 'email',
        message: 'Invalid email format'
      });
    });

    it('returns error when email already exists', async () => {
      userRepository.findByEmail.mockResolvedValue({
        id: '2',
        email: validParams.email
      } as any);

      const result = await service.execute(validParams);

      expect(result.success).toBe(false);
      expect(result.errors).toContainEqual({
        field: 'email',
        message: 'Email already taken'
      });
    });

    it('handles database errors gracefully', async () => {
      userRepository.findByEmail.mockResolvedValue(null);
      userRepository.create.mockRejectedValue(new Error('Database error'));

      const result = await service.execute(validParams);

      expect(result.success).toBe(false);
      expect(result.errors).toBeDefined();
    });
  });
});

// Integration Test Example - Repository
// tests/repositories/user.repository.test.ts
import { getConnection } from '@/test-utils/test-db-connection';
import { UserRepository } from '@/repositories/user.repository';
import { UserFactory } from '@/test-utils/factories/user.factory';

describe('UserRepository', () => {
  let repository: UserRepository;
  let userFactory: UserFactory;

  beforeEach(() => {
    const connection = getConnection();
    repository = new UserRepository(connection.getRepository('User'));
    userFactory = new UserFactory(connection);
  });

  describe('find', () => {
    it('returns user when found', async () => {
      const user = await userFactory.create();

      const result = await repository.find(user.id);

      expect(result).toBeDefined();
      expect(result?.id).toBe(user.id);
    });

    it('returns null when not found', async () => {
      const result = await repository.find('nonexistent-id');

      expect(result).toBeNull();
    });
  });

  describe('findWithAssociations', () => {
    it('eager loads associations', async () => {
      const user = await userFactory.create({
        withProfile: true,
        withPosts: 3
      });

      const result = await repository.findWithAssociations(user.id);

      expect(result?.profile).toBeDefined();
      expect(result?.posts).toHaveLength(3);
    });

    it('avoids N+1 queries', async () => {
      const user = await userFactory.create({
        withProfile: true,
        withPosts: 3
      });

      const queryCount = await countQueries(async () => {
        const result = await repository.findWithAssociations(user.id);
        result?.profile?.name;
        result?.posts?.forEach(post => post.title);
      });

      // Should be a single query with joins
      expect(queryCount).toBeLessThanOrEqual(1);
    });
  });

  describe('activeUsersWithRecentActivity', () => {
    it('returns only active users with recent activity', async () => {
      const activeUser = await userFactory.create({
        status: 'active',
        withActivities: [{ createdAt: new Date() }]
      });

      const inactiveUser = await userFactory.create({
        status: 'inactive',
        withActivities: [{ createdAt: new Date() }]
      });

      const oldActiveUser = await userFactory.create({
        status: 'active',
        withActivities: [{
          createdAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
        }]
      });

      const users = await repository.activeUsersWithRecentActivity();

      expect(users).toContainEqual(expect.objectContaining({ id: activeUser.id }));
      expect(users).not.toContainEqual(expect.objectContaining({ id: inactiveUser.id }));
      expect(users).not.toContainEqual(expect.objectContaining({ id: oldActiveUser.id }));
    });
  });
});

// API E2E Test Example
// tests/e2e/users.api.test.ts
import request from 'supertest';
import { app } from '@/app';
import { UserFactory } from '@/test-utils/factories/user.factory';
import { generateToken } from '@/test-utils/auth-helper';

describe('Users API', () => {
  let userFactory: UserFactory;
  let authToken: string;
  let currentUser: any;

  beforeEach(async () => {
    userFactory = new UserFactory(getConnection());
    currentUser = await userFactory.create();
    authToken = generateToken(currentUser);
  });

  describe('GET /api/v1/users/:id', () => {
    it('returns the user', async () => {
      const targetUser = await userFactory.create({ withProfile: true });

      const response = await request(app)
        .get(`/api/v1/users/${targetUser.id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.id).toBe(targetUser.id);
      expect(response.body.email).toBe(targetUser.email);
      expect(response.body.profile).toBeDefined();
    });

    it('returns 404 when user not found', async () => {
      const response = await request(app)
        .get('/api/v1/users/nonexistent-id')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);

      expect(response.body.error).toBe('User not found');
    });

    it('returns 401 when unauthorized', async () => {
      const targetUser = await userFactory.create();

      await request(app)
        .get(`/api/v1/users/${targetUser.id}`)
        .expect(401);
    });
  });

  describe('POST /api/v1/users', () => {
    const validParams = {
      email: 'newuser@example.com',
      password: 'password123',
      name: 'New User'
    };

    it('creates a new user', async () => {
      const response = await request(app)
        .post('/api/v1/users')
        .set('Authorization', `Bearer ${authToken}`)
        .send(validParams)
        .expect(201);

      expect(response.body.email).toBe(validParams.email);
      expect(response.body.name).toBe(validParams.name);
    });

    it('returns validation errors for invalid params', async () => {
      const invalidParams = {
        email: 'invalid',
        password: '123'
      };

      const response = await request(app)
        .post('/api/v1/users')
        .set('Authorization', `Bearer ${authToken}`)
        .send(invalidParams)
        .expect(422);

      expect(response.body.errors).toBeDefined();
    });
  });
});

// Factory Pattern
// tests/factories/user.factory.ts
import { DataSource } from 'typeorm';
import { User } from '@/entities/User';
import { faker } from '@faker-js/faker';

interface UserFactoryOptions {
  email?: string;
  name?: string;
  status?: string;
  withProfile?: boolean;
  withPosts?: number;
  withActivities?: Array<{ createdAt: Date }>;
}

export class UserFactory {
  constructor(private connection: DataSource) {}

  async create(options: UserFactoryOptions = {}): Promise<User> {
    const userRepository = this.connection.getRepository(User);

    const user = userRepository.create({
      email: options.email || faker.internet.email(),
      password: 'hashed_password',
      name: options.name || faker.person.fullName(),
      status: options.status || 'active',
      subscriptionTier: 'free'
    });

    await userRepository.save(user);

    if (options.withProfile) {
      const profileRepository = this.connection.getRepository('Profile');
      const profile = profileRepository.create({
        userId: user.id,
        name: user.name,
        bio: faker.lorem.paragraph()
      });
      await profileRepository.save(profile);
    }

    if (options.withPosts) {
      const postRepository = this.connection.getRepository('Post');
      for (let i = 0; i < options.withPosts; i++) {
        const post = postRepository.create({
          userId: user.id,
          title: faker.lorem.sentence(),
          content: faker.lorem.paragraphs()
        });
        await postRepository.save(post);
      }
    }

    if (options.withActivities) {
      const activityRepository = this.connection.getRepository('Activity');
      for (const activity of options.withActivities) {
        const activityEntity = activityRepository.create({
          userId: user.id,
          createdAt: activity.createdAt
        });
        await activityRepository.save(activityEntity);
      }
    }

    return user;
  }

  async createMany(count: number, options: UserFactoryOptions = {}): Promise<User[]> {
    const users: User[] = [];
    for (let i = 0; i < count; i++) {
      users.push(await this.create(options));
    }
    return users;
  }
}
```

## Tools Required

### MCP Servers
[MCP_TOOLS]
<!-- Populated during skill creation based on:
     1. User's installed MCP servers
     2. User's selection for this skill

     Recommended for this skill (examples):
     - Test database management tools
     - Test data generation tools
     - Code coverage analysis tools
     - Test result visualization tools
     - CI/CD integration tools

     Note: Skills work without MCP servers, but functionality may be limited
-->

### Testing Frameworks
- **Ruby**: RSpec, Minitest
- **Node.js**: Jest, Mocha, Vitest
- **Python**: pytest, unittest

### Test Utilities
- Factory libraries (FactoryBot, Faker)
- Database cleaning tools
- HTTP mocking (VCR, nock, MSW)
- Time manipulation

### Coverage Tools
- SimpleCov (Ruby)
- Istanbul/nyc (Node.js)
- Coverage.py (Python)

### CI Integration
- GitHub Actions
- GitLab CI
- CircleCI
- Jenkins

## Quality Checklist

### Test Design
- [ ] Tests are isolated and independent
- [ ] Tests are deterministic
- [ ] Tests have clear descriptions
- [ ] Tests follow AAA pattern (Arrange, Act, Assert)
- [ ] Edge cases covered

### Test Coverage
- [ ] Unit tests for business logic
- [ ] Integration tests for database operations
- [ ] E2E tests for critical workflows
- [ ] Error paths tested
- [ ] Coverage above 80%

### Test Performance
- [ ] Tests run in under 1 minute
- [ ] Database transactions rolled back
- [ ] External APIs mocked
- [ ] Test data factories used
- [ ] Parallel execution enabled

### Test Maintainability
- [ ] No duplicate test code
- [ ] Factories for test data
- [ ] Shared helpers extracted
- [ ] Tests updated with code changes
- [ ] Flaky tests fixed or removed

## Testing Best Practices

### Test Structure
```
Describe the thing being tested
  Context for a specific scenario
    It should behave in this way
```

### AAA Pattern
```
# Arrange: Set up test data
user = create(:user)

# Act: Perform the action
result = service.call

# Assert: Verify the outcome
expect(result).to be_success
```

### Test Data
- Use factories for dynamic data
- Use fixtures for static reference data
- Keep test data minimal
- Use realistic but fake data

### Mocking Strategy
- Mock external dependencies (APIs, email)
- Don't mock database in integration tests
- Verify important interactions
- Use test doubles appropriately

## Common Testing Patterns

### Shared Examples (RSpec)
```ruby
RSpec.shared_examples 'authenticatable' do
  it 'requires authentication' do
    get path
    expect(response).to have_http_status(:unauthorized)
  end
end

it_behaves_like 'authenticatable' do
  let(:path) { '/api/users' }
end
```

### Parameterized Tests (Jest)
```typescript
describe.each([
  ['active', true],
  ['inactive', false],
  ['suspended', false]
])('when status is %s', (status, expected) => {
  it(`returns ${expected}`, () => {
    const user = { status };
    expect(isActive(user)).toBe(expected);
  });
});
```

### Test Fixtures
```typescript
// Load reusable test data
const mockUsers = require('./fixtures/users.json');
```

## Performance Optimization

### Database Optimization
- Use database transactions
- Batch inserts for multiple records
- Disable unnecessary callbacks in tests
- Use in-memory databases for speed

### Parallel Execution
- Run tests in parallel
- Ensure test isolation
- Use separate database per process
- Disable features that conflict

### Selective Testing
- Run affected tests first
- Tag slow tests separately
- Skip external integrations in fast suite
- Use test coverage to identify gaps

## Anti-Patterns to Avoid

- **Testing Implementation Details**: Test behavior, not internals
- **Brittle Tests**: Don't rely on exact order or timing
- **Slow Tests**: Mock external dependencies
- **Flaky Tests**: Fix or remove unreliable tests
- **Test Code Duplication**: Extract shared setup
- **Over-Mocking**: Use real objects when practical
- **Unclear Test Names**: Be explicit about what's being tested

## Debugging Failed Tests

### Investigation Steps
1. Read the error message carefully
2. Check test setup and teardown
3. Verify test data is correct
4. Check for timing issues
5. Look for external dependencies
6. Review recent code changes

### Debugging Tools
- Debugger (byebug, debugger)
- Console output
- Database inspection
- Request/response logging
- Stack traces

---

**Remember:** Good tests are fast, isolated, deterministic, and maintainable. Write tests that give you confidence to refactor and deploy with certainty.
