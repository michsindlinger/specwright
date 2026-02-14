# Rails Model Patterns

> Part of: Rails Backend Skill
> Use when: Working with ActiveRecord models

## Model Structure

### Basic Model
```ruby
# app/models/user.rb
class User < ApplicationRecord
  # Constants
  ROLES = %w[user admin moderator].freeze

  # Associations
  has_many :posts, dependent: :destroy
  has_many :comments, dependent: :destroy
  belongs_to :organization, optional: true

  # Validations
  validates :email, presence: true, uniqueness: true,
            format: { with: URI::MailTo::EMAIL_REGEXP }
  validates :name, presence: true, length: { minimum: 2, maximum: 100 }
  validates :role, inclusion: { in: ROLES }

  # Scopes
  scope :active, -> { where(active: true) }
  scope :admins, -> { where(role: 'admin') }
  scope :recent, -> { order(created_at: :desc) }

  # Callbacks (use sparingly)
  before_validation :normalize_email

  # Instance methods
  def full_name
    "#{first_name} #{last_name}".strip
  end

  def admin?
    role == 'admin'
  end

  private

  def normalize_email
    self.email = email&.downcase&.strip
  end
end
```

## Associations

### Has Many Through
```ruby
class User < ApplicationRecord
  has_many :memberships, dependent: :destroy
  has_many :teams, through: :memberships
end

class Team < ApplicationRecord
  has_many :memberships, dependent: :destroy
  has_many :users, through: :memberships
end

class Membership < ApplicationRecord
  belongs_to :user
  belongs_to :team

  validates :role, presence: true
end
```

### Polymorphic
```ruby
class Comment < ApplicationRecord
  belongs_to :commentable, polymorphic: true
  belongs_to :user
end

class Post < ApplicationRecord
  has_many :comments, as: :commentable
end

class Photo < ApplicationRecord
  has_many :comments, as: :commentable
end
```

## Validations

### Custom Validator
```ruby
# app/validators/email_validator.rb
class EmailValidator < ActiveModel::EachValidator
  def validate_each(record, attribute, value)
    return if value.blank?

    unless value.match?(URI::MailTo::EMAIL_REGEXP)
      record.errors.add(attribute, options[:message] || 'is not a valid email')
    end
  end
end

# Usage
validates :email, email: true
```

### Conditional Validation
```ruby
validates :company_name, presence: true, if: :business_account?
validates :phone, presence: true, unless: :email_verified?
```

## Scopes

```ruby
class Post < ApplicationRecord
  scope :published, -> { where(status: 'published') }
  scope :draft, -> { where(status: 'draft') }
  scope :by_author, ->(user_id) { where(user_id: user_id) }
  scope :recent, ->(limit = 10) { order(created_at: :desc).limit(limit) }

  # Composable scopes
  scope :recent_published, -> { published.recent }
end

# Usage
Post.published.by_author(user.id).recent(5)
```

## Callbacks (Use Sparingly)

```ruby
class User < ApplicationRecord
  # OK: Data normalization
  before_validation :normalize_email

  # OK: Cleanup
  after_destroy :cleanup_files

  # AVOID: Side effects (use services instead)
  # after_create :send_welcome_email  # Bad - use service
end
```

## Concerns

```ruby
# app/models/concerns/trackable.rb
module Trackable
  extend ActiveSupport::Concern

  included do
    has_many :activities, as: :trackable, dependent: :destroy
  end

  def track_activity(action, user:)
    activities.create!(action: action, user: user)
  end
end

# Usage
class Post < ApplicationRecord
  include Trackable
end
```

## Best Practices

1. **Thin models**: Keep business logic in services
2. **Use scopes**: For reusable queries
3. **Validate at model level**: For data integrity
4. **Avoid callbacks for side effects**: Use services
5. **Use concerns** for shared functionality
6. **Index foreign keys**: For performance
