# Rails Service Patterns

> Part of: Rails Backend Skill
> Use when: Implementing business logic

## Service Object Pattern

### Basic Service
```ruby
# app/services/users/register.rb
module Users
  class Register
    def initialize(params)
      @params = params
    end

    def call
      validate!
      user = create_user
      send_welcome_email(user)
      Result.success(user: user)
    rescue ValidationError => e
      Result.failure(errors: e.messages)
    rescue StandardError => e
      Result.failure(errors: [e.message])
    end

    private

    attr_reader :params

    def validate!
      raise ValidationError, 'Email required' if params[:email].blank?
      raise ValidationError, 'Email taken' if User.exists?(email: params[:email])
    end

    def create_user
      User.create!(
        email: params[:email],
        name: params[:name],
        password: params[:password]
      )
    end

    def send_welcome_email(user)
      UserMailer.welcome(user).deliver_later
    end
  end
end
```

### Result Object
```ruby
# app/services/result.rb
class Result
  attr_reader :data, :errors

  def initialize(success:, data: {}, errors: [])
    @success = success
    @data = data
    @errors = errors
  end

  def self.success(data = {})
    new(success: true, data: data)
  end

  def self.failure(errors: [])
    new(success: false, errors: Array(errors))
  end

  def success?
    @success
  end

  def failure?
    !@success
  end
end
```

### Usage in Controller
```ruby
class UsersController < ApplicationController
  def create
    result = Users::Register.new(user_params).call

    if result.success?
      render json: result.data[:user], status: :created
    else
      render json: { errors: result.errors }, status: :unprocessable_entity
    end
  end

  private

  def user_params
    params.require(:user).permit(:email, :name, :password)
  end
end
```

## Query Objects

```ruby
# app/queries/users/active_query.rb
module Users
  class ActiveQuery
    def initialize(relation = User.all)
      @relation = relation
    end

    def call
      @relation
        .where(active: true)
        .where('last_login_at > ?', 30.days.ago)
        .order(created_at: :desc)
    end
  end
end

# Usage
Users::ActiveQuery.new.call
Users::ActiveQuery.new(User.where(role: 'admin')).call
```

## Form Objects

```ruby
# app/forms/user_registration_form.rb
class UserRegistrationForm
  include ActiveModel::Model

  attr_accessor :email, :name, :password, :password_confirmation

  validates :email, presence: true, format: { with: URI::MailTo::EMAIL_REGEXP }
  validates :name, presence: true, length: { minimum: 2 }
  validates :password, presence: true, length: { minimum: 8 }
  validates :password_confirmation, presence: true
  validate :passwords_match

  def save
    return false unless valid?

    Users::Register.new(attributes).call.success?
  end

  private

  def passwords_match
    return if password == password_confirmation
    errors.add(:password_confirmation, "doesn't match password")
  end

  def attributes
    { email: email, name: name, password: password }
  end
end
```

## Best Practices

1. **One service per use case**
2. **Return Result objects** for predictable handling
3. **Keep services focused** (single responsibility)
4. **Use dependency injection** for testability
5. **Extract queries** for complex database operations
6. **Use form objects** for complex validations
