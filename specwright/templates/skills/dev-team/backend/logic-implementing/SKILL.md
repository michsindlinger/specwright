# [SKILL_NAME] - Backend Logic Implementation

> **Role:** Backend Logic Implementer
> **Domain:** Business Logic & Domain Models
> **Created:** [CURRENT_DATE]

## Quick Reference

<!-- This section is extracted by Orchestrator for task prompts (~50-100 lines) -->

**When to use:** Service Objects, Business Logic, Domain Models, Use Cases, Validation

**Key Patterns:**

1. **Service Object Pattern**
   - One class per use case
   - `call` method as entry point
   - Dependency injection for repositories
   - Return Result/Either object (Success/Failure)

2. **Validation Pattern**
   - Validate at start of `call` method
   - Fail fast with clear error messages
   - Use custom ValidationError exceptions

3. **Error Handling**
   - Custom exceptions for business errors
   - Wrap in transaction for rollback
   - Never expose internal errors to caller

4. **Domain Model Rules**
   - Keep business logic in models/services, not controllers
   - Use Value Objects for concepts (Money, Email, etc.)
   - Publish Domain Events for side effects

**Quick Example (Rails):**
```ruby
class Users::Register
  def initialize(user_repo: UserRepository.new)
    @user_repo = user_repo
  end

  def call(params)
    validate!(params)
    user = @user_repo.create(params)
    Result.success(user: user)
  rescue ValidationError => e
    Result.failure(errors: e.messages)
  end

  private

  def validate!(params)
    raise ValidationError, 'Email required' if params[:email].blank?
    raise ValidationError, 'Email taken' if @user_repo.exists?(email: params[:email])
  end
end
```

**Anti-Patterns to Avoid:**
- Fat controllers with business logic
- Direct DB queries in service objects (use repositories)
- God services doing too many things
- Anemic models (data without behavior)

---

## Purpose

Implement core business logic, domain models, and service orchestration for backend systems. Focus on clean architecture, SOLID principles, and maintainable business rules.

## When to Activate

**Use this skill for:**
- Implementing business logic and domain rules
- Creating service objects and use cases
- Building domain models and value objects
- Orchestrating complex workflows
- Implementing validation and business constraints
- State management and business entities

**Do NOT use for:**
- Database queries (use persistence-adapter)
- External API calls (use integration-adapter)
- Testing (use test-engineering)

## Core Capabilities

### 1. Domain Model Design
- Entity modeling with clear boundaries
- Value objects for business concepts
- Aggregate roots for consistency
- Domain events for decoupling

### 2. Business Logic Implementation
- Service objects for complex operations
- Use cases for feature workflows
- Policy objects for business rules
- Calculator objects for computations

### 3. Validation & Constraints
- Input validation
- Business rule enforcement
- State transition validation
- Cross-entity constraints

### 4. Error Handling
- Domain-specific exceptions
- Error context and messaging
- Graceful degradation
- Recovery strategies

## [TECH_STACK_SPECIFIC] Patterns

### Ruby on Rails

```ruby
# Service Object Pattern
class Users::CreateAccount
  include ActiveModel::Validations

  attr_reader :user, :errors

  def initialize(params)
    @params = params
    @errors = ActiveModel::Errors.new(self)
  end

  def call
    validate_params!

    ActiveRecord::Base.transaction do
      create_user
      setup_profile
      send_welcome_email
    end

    Success.new(user: @user)
  rescue ValidationError => e
    Failure.new(errors: e.errors)
  end

  private

  def validate_params!
    raise ValidationError, 'Email required' unless @params[:email].present?
    raise ValidationError, 'Email taken' if User.exists?(email: @params[:email])
  end

  def create_user
    @user = User.create!(
      email: @params[:email],
      password: @params[:password]
    )
  end

  def setup_profile
    @user.create_profile!(
      name: @params[:name],
      bio: @params[:bio]
    )
  end

  def send_welcome_email
    UserMailer.welcome(@user).deliver_later
  end
end

# Value Object Pattern
class Money
  include Comparable

  attr_reader :amount, :currency

  def initialize(amount, currency = 'USD')
    @amount = BigDecimal(amount.to_s)
    @currency = currency
  end

  def +(other)
    raise CurrencyMismatch unless currency == other.currency
    Money.new(amount + other.amount, currency)
  end

  def *(multiplier)
    Money.new(amount * multiplier, currency)
  end

  def to_s
    "#{currency} #{amount.round(2)}"
  end

  def <=>(other)
    raise CurrencyMismatch unless currency == other.currency
    amount <=> other.amount
  end
end

# Policy Object Pattern
class OrderRefundPolicy
  def initialize(order)
    @order = order
  end

  def refundable?
    return false if @order.refunded?
    return false if days_since_purchase > 30
    return false if @order.digital_goods? && @order.accessed?
    true
  end

  def refund_amount
    return Money.new(0) unless refundable?

    if days_since_purchase <= 7
      @order.total
    elsif days_since_purchase <= 14
      @order.total * 0.75
    else
      @order.total * 0.50
    end
  end

  private

  def days_since_purchase
    (Time.current - @order.purchased_at) / 1.day
  end
end

# Domain Event Pattern
class Order < ApplicationRecord
  include ActiveModel::Dirty

  after_commit :publish_status_change, if: :saved_change_to_status?

  private

  def publish_status_change
    event = OrderStatusChanged.new(
      order_id: id,
      old_status: status_before_last_save,
      new_status: status,
      changed_at: updated_at
    )

    EventBus.publish(event)
  end
end
```

### Node.js / TypeScript

```typescript
// Service Class Pattern
interface CreateAccountParams {
  email: string;
  password: string;
  name: string;
  bio?: string;
}

interface CreateAccountResult {
  success: boolean;
  user?: User;
  errors?: ValidationError[];
}

class CreateAccountService {
  constructor(
    private userRepository: UserRepository,
    private emailService: EmailService
  ) {}

  async execute(params: CreateAccountParams): Promise<CreateAccountResult> {
    // Validate input
    const validationErrors = this.validate(params);
    if (validationErrors.length > 0) {
      return { success: false, errors: validationErrors };
    }

    // Check uniqueness
    const existingUser = await this.userRepository.findByEmail(params.email);
    if (existingUser) {
      return {
        success: false,
        errors: [{ field: 'email', message: 'Email already taken' }]
      };
    }

    // Execute in transaction
    const user = await this.userRepository.transaction(async (tx) => {
      const user = await this.userRepository.create({
        email: params.email,
        password: await this.hashPassword(params.password)
      }, tx);

      await this.userRepository.createProfile({
        userId: user.id,
        name: params.name,
        bio: params.bio
      }, tx);

      return user;
    });

    // Background job
    await this.emailService.sendWelcome(user.email);

    return { success: true, user };
  }

  private validate(params: CreateAccountParams): ValidationError[] {
    const errors: ValidationError[] = [];

    if (!params.email || !this.isValidEmail(params.email)) {
      errors.push({ field: 'email', message: 'Invalid email format' });
    }

    if (!params.password || params.password.length < 8) {
      errors.push({ field: 'password', message: 'Password must be at least 8 characters' });
    }

    return errors;
  }

  private isValidEmail(email: string): boolean {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  }

  private async hashPassword(password: string): Promise<string> {
    // Implementation
    return 'hashed';
  }
}

// Value Object Pattern
class Money {
  private constructor(
    public readonly amount: number,
    public readonly currency: string = 'USD'
  ) {
    if (amount < 0) {
      throw new Error('Amount cannot be negative');
    }
  }

  static create(amount: number, currency = 'USD'): Money {
    return new Money(amount, currency);
  }

  add(other: Money): Money {
    this.ensureSameCurrency(other);
    return new Money(this.amount + other.amount, this.currency);
  }

  multiply(multiplier: number): Money {
    return new Money(this.amount * multiplier, this.currency);
  }

  toString(): string {
    return `${this.currency} ${this.amount.toFixed(2)}`;
  }

  private ensureSameCurrency(other: Money): void {
    if (this.currency !== other.currency) {
      throw new Error('Currency mismatch');
    }
  }
}

// Domain Event Pattern
interface DomainEvent {
  occurredAt: Date;
  eventType: string;
}

class OrderStatusChanged implements DomainEvent {
  public readonly occurredAt = new Date();
  public readonly eventType = 'OrderStatusChanged';

  constructor(
    public readonly orderId: string,
    public readonly oldStatus: string,
    public readonly newStatus: string
  ) {}
}

class Order {
  private domainEvents: DomainEvent[] = [];

  constructor(
    public id: string,
    public status: string
  ) {}

  changeStatus(newStatus: string): void {
    const oldStatus = this.status;
    this.status = newStatus;

    this.domainEvents.push(
      new OrderStatusChanged(this.id, oldStatus, newStatus)
    );
  }

  getDomainEvents(): DomainEvent[] {
    return [...this.domainEvents];
  }

  clearDomainEvents(): void {
    this.domainEvents = [];
  }
}
```

### Python / Django

```python
# Service Layer Pattern
from dataclasses import dataclass
from typing import Optional
from django.db import transaction

@dataclass
class CreateAccountResult:
    success: bool
    user: Optional['User'] = None
    errors: Optional[dict] = None

class CreateAccountService:
    def __init__(self, user_repository, email_service):
        self.user_repository = user_repository
        self.email_service = email_service

    def execute(self, email: str, password: str, name: str, bio: str = None) -> CreateAccountResult:
        # Validate
        errors = self._validate(email, password)
        if errors:
            return CreateAccountResult(success=False, errors=errors)

        # Check uniqueness
        if self.user_repository.exists_by_email(email):
            return CreateAccountResult(
                success=False,
                errors={'email': 'Email already taken'}
            )

        # Execute in transaction
        try:
            with transaction.atomic():
                user = self.user_repository.create(
                    email=email,
                    password=self._hash_password(password)
                )

                self.user_repository.create_profile(
                    user_id=user.id,
                    name=name,
                    bio=bio
                )

                # Background task
                self.email_service.send_welcome.delay(user.email)

                return CreateAccountResult(success=True, user=user)
        except Exception as e:
            return CreateAccountResult(
                success=False,
                errors={'general': str(e)}
            )

    def _validate(self, email: str, password: str) -> Optional[dict]:
        errors = {}

        if not email or '@' not in email:
            errors['email'] = 'Invalid email format'

        if not password or len(password) < 8:
            errors['password'] = 'Password must be at least 8 characters'

        return errors if errors else None

    def _hash_password(self, password: str) -> str:
        # Implementation
        return 'hashed'

# Value Object Pattern
from decimal import Decimal

class Money:
    def __init__(self, amount: Decimal, currency: str = 'USD'):
        if amount < 0:
            raise ValueError('Amount cannot be negative')
        self.amount = amount
        self.currency = currency

    def __add__(self, other: 'Money') -> 'Money':
        if self.currency != other.currency:
            raise ValueError('Currency mismatch')
        return Money(self.amount + other.amount, self.currency)

    def __mul__(self, multiplier: float) -> 'Money':
        return Money(self.amount * Decimal(str(multiplier)), self.currency)

    def __str__(self) -> str:
        return f'{self.currency} {self.amount:.2f}'

    def __eq__(self, other: 'Money') -> bool:
        return self.amount == other.amount and self.currency == other.currency
```

## Tools Required

### MCP Servers
[MCP_TOOLS]
<!-- Populated during skill creation based on:
     1. User's installed MCP servers
     2. User's selection for this skill

     Recommended for this skill (examples):
     - None required for basic business logic implementation
     - Optional: Database inspection tools for debugging
     - Optional: Code analysis tools for complexity metrics

     Note: Skills work without MCP servers, but functionality may be limited
-->

### Development Tools
- Code editor with language support
- Debugger for stepping through logic
- REPL for testing logic fragments

### Testing Tools
- Unit testing framework
- Test doubles (mocks, stubs)
- Code coverage tools

### Analysis Tools
- Static analysis / linting
- Complexity metrics
- Code review tools

## Quality Checklist

### Before Implementation
- [ ] Domain model clearly defined
- [ ] Business rules documented
- [ ] Edge cases identified
- [ ] Validation requirements clear

### During Implementation
- [ ] Single Responsibility Principle followed
- [ ] Business logic decoupled from framework
- [ ] Clear method and variable names
- [ ] Complex logic extracted to private methods

### After Implementation
- [ ] All business rules implemented
- [ ] Edge cases handled
- [ ] Error handling comprehensive
- [ ] Unit tests cover all paths
- [ ] Documentation updated

### Code Review
- [ ] Logic is testable without external dependencies
- [ ] No database queries in business logic
- [ ] No direct API calls in business logic
- [ ] Proper separation of concerns
- [ ] Domain events published appropriately

## Testing Patterns

### Unit Testing Business Logic

```ruby
# RSpec example
RSpec.describe Users::CreateAccount do
  describe '#call' do
    let(:params) do
      {
        email: 'user@example.com',
        password: 'password123',
        name: 'John Doe'
      }
    end

    it 'creates a new user' do
      result = described_class.new(params).call

      expect(result).to be_success
      expect(result.user).to be_persisted
      expect(result.user.email).to eq('user@example.com')
    end

    it 'creates a profile for the user' do
      result = described_class.new(params).call

      expect(result.user.profile).to be_present
      expect(result.user.profile.name).to eq('John Doe')
    end

    it 'sends welcome email' do
      expect {
        described_class.new(params).call
      }.to have_enqueued_job(UserMailerJob)
    end

    context 'when email is already taken' do
      before { create(:user, email: 'user@example.com') }

      it 'returns failure' do
        result = described_class.new(params).call

        expect(result).to be_failure
        expect(result.errors).to include('Email taken')
      end
    end
  end
end
```

```typescript
// Jest example
describe('CreateAccountService', () => {
  let service: CreateAccountService;
  let userRepository: jest.Mocked<UserRepository>;
  let emailService: jest.Mocked<EmailService>;

  beforeEach(() => {
    userRepository = {
      findByEmail: jest.fn(),
      create: jest.fn(),
      createProfile: jest.fn(),
      transaction: jest.fn((cb) => cb(null))
    } as any;

    emailService = {
      sendWelcome: jest.fn()
    } as any;

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
      userRepository.create.mockResolvedValue({ id: '1', email: validParams.email });

      const result = await service.execute(validParams);

      expect(result.success).toBe(true);
      expect(result.user).toBeDefined();
      expect(userRepository.create).toHaveBeenCalled();
    });

    it('sends welcome email', async () => {
      userRepository.findByEmail.mockResolvedValue(null);
      userRepository.create.mockResolvedValue({ id: '1', email: validParams.email });

      await service.execute(validParams);

      expect(emailService.sendWelcome).toHaveBeenCalledWith(validParams.email);
    });

    it('returns error when email is taken', async () => {
      userRepository.findByEmail.mockResolvedValue({ id: '2', email: validParams.email });

      const result = await service.execute(validParams);

      expect(result.success).toBe(false);
      expect(result.errors).toContainEqual({
        field: 'email',
        message: 'Email already taken'
      });
    });
  });
});
```

## Common Patterns

### Result Objects
Use Result/Either pattern for operation outcomes:
- Success with data
- Failure with errors
- No exceptions for business rule violations

### Command Pattern
Encapsulate operations as objects:
- Clear intent
- Easy to queue/schedule
- Auditable actions

### Strategy Pattern
Swap algorithms at runtime:
- Payment processors
- Pricing strategies
- Notification channels

### State Machine
Model complex state transitions:
- Order fulfillment
- Approval workflows
- User onboarding

## Anti-Patterns to Avoid

- **Fat Models**: Don't put all logic in ActiveRecord/ORM models
- **God Services**: Keep services focused on single use case
- **Anemic Domain Model**: Models should have behavior, not just data
- **Transaction Script**: Don't write procedural code in controllers
- **Hidden Dependencies**: Inject dependencies explicitly
- **Primitive Obsession**: Use value objects for domain concepts

## Performance Considerations

- Avoid N+1 queries (delegate to persistence layer)
- Cache expensive calculations
- Lazy load when appropriate
- Consider async processing for slow operations
- Profile before optimizing

## Documentation Requirements

- Document business rules and constraints
- Explain non-obvious algorithms
- Provide examples for complex workflows
- Document state transitions
- Keep ADRs for architectural decisions

---

**Remember:** Business logic should be framework-agnostic, testable in isolation, and clearly express domain concepts. Focus on correctness, clarity, and maintainability over premature optimization.
