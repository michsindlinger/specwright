# Rails Testing Patterns

> Part of: Rails Backend Skill
> Use when: Writing tests with RSpec

## RSpec Setup

### rails_helper.rb
```ruby
require 'spec_helper'
ENV['RAILS_ENV'] ||= 'test'
require_relative '../config/environment'

RSpec.configure do |config|
  config.include FactoryBot::Syntax::Methods
  config.include Devise::Test::IntegrationHelpers, type: :request

  config.before(:suite) do
    DatabaseCleaner.strategy = :transaction
    DatabaseCleaner.clean_with(:truncation)
  end

  config.around(:each) do |example|
    DatabaseCleaner.cleaning do
      example.run
    end
  end
end

Shoulda::Matchers.configure do |config|
  config.integrate do |with|
    with.test_framework :rspec
    with.library :rails
  end
end
```

## Model Specs

```ruby
# spec/models/user_spec.rb
RSpec.describe User, type: :model do
  describe 'validations' do
    it { should validate_presence_of(:email) }
    it { should validate_uniqueness_of(:email).case_insensitive }
    it { should validate_presence_of(:name) }
    it { should validate_length_of(:name).is_at_least(2) }
  end

  describe 'associations' do
    it { should have_many(:posts).dependent(:destroy) }
    it { should belong_to(:organization).optional }
  end

  describe '#full_name' do
    it 'returns combined first and last name' do
      user = build(:user, first_name: 'John', last_name: 'Doe')
      expect(user.full_name).to eq('John Doe')
    end
  end
end
```

## Service Specs

```ruby
# spec/services/users/register_spec.rb
RSpec.describe Users::Register do
  describe '#call' do
    subject { described_class.new(params).call }

    context 'with valid params' do
      let(:params) { { email: 'test@example.com', name: 'Test', password: 'password123' } }

      it 'returns success' do
        expect(subject).to be_success
      end

      it 'creates a user' do
        expect { subject }.to change(User, :count).by(1)
      end

      it 'sends welcome email' do
        expect { subject }.to have_enqueued_mail(UserMailer, :welcome)
      end
    end

    context 'with invalid params' do
      let(:params) { { email: '', name: 'Test', password: 'password123' } }

      it 'returns failure' do
        expect(subject).to be_failure
      end

      it 'includes error messages' do
        expect(subject.errors).to include('Email required')
      end

      it 'does not create a user' do
        expect { subject }.not_to change(User, :count)
      end
    end
  end
end
```

## Request Specs

```ruby
# spec/requests/api/v1/users_spec.rb
RSpec.describe 'Api::V1::Users', type: :request do
  let(:user) { create(:user) }
  let(:headers) { { 'Authorization' => "Bearer #{jwt_token(user)}" } }

  describe 'GET /api/v1/users' do
    before { create_list(:user, 3) }

    it 'returns users' do
      get '/api/v1/users', headers: headers

      expect(response).to have_http_status(:ok)
      expect(json_response['data'].size).to eq(4) # 3 + current user
    end
  end

  describe 'POST /api/v1/users' do
    let(:valid_params) { { user: { email: 'new@example.com', name: 'New User' } } }

    context 'with valid params' do
      it 'creates a user' do
        expect {
          post '/api/v1/users', params: valid_params, headers: headers
        }.to change(User, :count).by(1)

        expect(response).to have_http_status(:created)
      end
    end

    context 'with invalid params' do
      let(:invalid_params) { { user: { email: '', name: '' } } }

      it 'returns errors' do
        post '/api/v1/users', params: invalid_params, headers: headers

        expect(response).to have_http_status(:unprocessable_entity)
        expect(json_response['errors']).to be_present
      end
    end
  end
end
```

## Factories

```ruby
# spec/factories/users.rb
FactoryBot.define do
  factory :user do
    sequence(:email) { |n| "user#{n}@example.com" }
    name { Faker::Name.name }
    password { 'password123' }
    active { true }

    trait :admin do
      role { 'admin' }
    end

    trait :inactive do
      active { false }
    end

    trait :with_posts do
      after(:create) do |user|
        create_list(:post, 3, user: user)
      end
    end
  end
end

# Usage
create(:user)
create(:user, :admin)
create(:user, :with_posts)
build(:user, name: 'Custom Name')
```

## Shared Examples

```ruby
# spec/support/shared_examples/api_authentication.rb
RSpec.shared_examples 'requires authentication' do
  context 'without authentication' do
    let(:headers) { {} }

    it 'returns unauthorized' do
      expect(response).to have_http_status(:unauthorized)
    end
  end
end

# Usage
describe 'GET /api/v1/users' do
  before { get '/api/v1/users', headers: headers }

  it_behaves_like 'requires authentication'
end
```

## Best Practices

1. **Use factories** instead of fixtures
2. **Test behavior**, not implementation
3. **Use shared examples** for common patterns
4. **Keep tests fast** with proper database cleaning
5. **Test edge cases** and error conditions
6. **Mock external services**
