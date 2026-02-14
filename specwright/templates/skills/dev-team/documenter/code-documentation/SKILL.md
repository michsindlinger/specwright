# Code Documentation Skill

> Skill: code-documentation
> Created: 2026-01-09
> Agent: documenter
> Category: Documentation

## Purpose

Analyze code and add comprehensive inline documentation including comments, docstrings, type hints, and annotations. Makes code self-documenting and maintainable for future developers.

## When to Activate

**Trigger Conditions:**
- After new code implementation
- When code lacks documentation
- Before code review
- When documenter agent documents codebase

**Activation Pattern:**
```
When: Code written/modified AND lacks documentation
Then: Analyze and add inline documentation
```

## Core Capabilities

### 1. Comment Generation
- Add explanatory comments for complex logic
- Document business rules and constraints
- Explain "why" decisions were made
- Clarify non-obvious algorithms

### 2. Docstring Creation
- Generate function/method documentation
- Document parameters and return values
- Include usage examples
- Note exceptions and edge cases

### 3. Type Annotation
- Add type hints for function signatures
- Document expected data structures
- Specify optional vs required parameters
- Define custom types and interfaces

### 4. Code Analysis
- Identify undocumented public APIs
- Find complex methods needing explanation
- Detect missing parameter documentation
- Flag unclear variable names

## [TECH_STACK_SPECIFIC] Sections

### Ruby on Rails Documentation
```ruby
## Integration Points
- YARD format for docstrings
- RDoc for module documentation
- Rails-specific conventions
- Active Record associations

## Ruby Documentation Standards

# Class Documentation
##
# Manages user authentication and session handling.
#
# This service handles the complete authentication lifecycle including
# login, logout, token generation, and session validation.
#
# @example Authenticate a user
#   result = AuthenticationService.new(email: 'user@example.com', password: 'pass').authenticate
#   if result.success?
#     token = result.token
#   end
#
# @author Development Team
# @since 1.0.0
class AuthenticationService
  ##
  # Authenticates a user with email and password.
  #
  # @param email [String] User's email address
  # @param password [String] User's password
  # @return [AuthResult] Authentication result with token or errors
  # @raise [AuthenticationError] When credentials are invalid
  #
  # @example Successful authentication
  #   service = AuthenticationService.new(email: 'user@example.com', password: 'pass')
  #   result = service.authenticate
  #   result.token # => "eyJhbGc..."
  #
  def authenticate(email:, password:)
    # Validate input parameters
    raise ArgumentError, 'Email cannot be blank' if email.blank?
    raise ArgumentError, 'Password cannot be blank' if password.blank?

    # Find user by email (case-insensitive)
    user = User.find_by('LOWER(email) = ?', email.downcase)

    # Validate password using secure comparison
    # Note: authenticate method uses bcrypt internally
    return failure_result('Invalid credentials') unless user&.authenticate(password)

    # Generate JWT token with 24-hour expiration
    token = generate_token(user)

    # Log successful authentication for security audit
    log_authentication_event(user, :success)

    success_result(user, token)
  end

  private

  ##
  # Generates a JWT token for authenticated user.
  #
  # Token includes user ID, email, and expiration time.
  # Uses HS256 algorithm with application secret.
  #
  # @param user [User] Authenticated user
  # @return [String] JWT token
  # @api private
  def generate_token(user)
    payload = {
      user_id: user.id,
      email: user.email,
      exp: 24.hours.from_now.to_i
    }

    JWT.encode(payload, Rails.application.secret_key_base, 'HS256')
  end
end

# Model Documentation
##
# Represents a registered user account.
#
# @!attribute [rw] email
#   @return [String] User's email address (unique, case-insensitive)
# @!attribute [rw] name
#   @return [String, nil] User's display name
# @!attribute [rw] password_digest
#   @return [String] Encrypted password (never expose directly)
# @!attribute [r] created_at
#   @return [ActiveSupport::TimeWithZone] Account creation timestamp
# @!attribute [r] updated_at
#   @return [ActiveSupport::TimeWithZone] Last update timestamp
class User < ApplicationRecord
  has_secure_password

  # Associations
  has_many :posts, dependent: :destroy
  has_many :comments, dependent: :destroy

  # Validations
  validates :email, presence: true, uniqueness: { case_sensitive: false }
  validates :email, format: { with: URI::MailTo::EMAIL_REGEXP }
  validates :password, length: { minimum: 8 }, if: :password_required?

  # Callbacks
  before_save :normalize_email

  private

  ##
  # Normalizes email to lowercase for case-insensitive comparison.
  # @api private
  def normalize_email
    self.email = email.downcase.strip
  end

  ##
  # Determines if password validation is required.
  # @return [Boolean] true if new record or password is being changed
  # @api private
  def password_required?
    new_record? || password.present?
  end
end
```

### JavaScript/TypeScript Documentation
```typescript
## Integration Points
- JSDoc format for JavaScript
- TSDoc for TypeScript
- Type definitions in .d.ts files
- React component documentation

## JavaScript/TypeScript Standards

/**
 * Authentication service for user login and session management.
 *
 * Handles the complete authentication lifecycle including login, logout,
 * token generation, and session validation.
 *
 * @example
 * ```typescript
 * const authService = new AuthenticationService();
 * const result = await authService.authenticate('user@example.com', 'password');
 * if (result.success) {
 *   console.log('Token:', result.token);
 * }
 * ```
 *
 * @since 1.0.0
 */
export class AuthenticationService {
  /**
   * Authenticates a user with email and password.
   *
   * @param email - User's email address
   * @param password - User's password
   * @returns Promise resolving to authentication result with token or errors
   * @throws {AuthenticationError} When credentials are invalid
   * @throws {ValidationError} When email or password is missing
   *
   * @example
   * ```typescript
   * const result = await authService.authenticate('user@example.com', 'pass');
   * if (result.success) {
   *   localStorage.setItem('token', result.token);
   * }
   * ```
   */
  async authenticate(email: string, password: string): Promise<AuthResult> {
    // Validate input parameters
    if (!email || email.trim() === '') {
      throw new ValidationError('Email cannot be blank');
    }
    if (!password || password.trim() === '') {
      throw new ValidationError('Password cannot be blank');
    }

    try {
      // Call authentication API endpoint
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });

      // Handle authentication failure
      if (!response.ok) {
        const error = await response.json();
        return { success: false, error: error.message };
      }

      // Parse successful response
      const data = await response.json();

      // Store token in secure storage
      this.storeToken(data.token);

      return { success: true, token: data.token, user: data.user };
    } catch (error) {
      // Log error for debugging (remove in production)
      console.error('Authentication error:', error);
      throw new AuthenticationError('Failed to authenticate user');
    }
  }

  /**
   * Securely stores authentication token.
   *
   * Uses localStorage for web, AsyncStorage for React Native.
   * Token is stored with 24-hour expiration metadata.
   *
   * @param token - JWT authentication token
   * @private
   */
  private storeToken(token: string): void {
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 24);

    const tokenData = {
      token,
      expiresAt: expiresAt.toISOString()
    };

    localStorage.setItem('auth_token', JSON.stringify(tokenData));
  }
}

/**
 * Authentication result returned from login attempt.
 */
interface AuthResult {
  /** Whether authentication was successful */
  success: boolean;

  /** JWT token (only present on success) */
  token?: string;

  /** Authenticated user data (only present on success) */
  user?: User;

  /** Error message (only present on failure) */
  error?: string;
}

/**
 * User account information.
 */
interface User {
  /** Unique user identifier */
  id: number;

  /** User's email address */
  email: string;

  /** User's display name (optional) */
  name?: string;

  /** Account creation timestamp */
  createdAt: string;
}

// React Component Documentation
/**
 * Login form component with email and password fields.
 *
 * Handles user authentication and displays validation errors.
 * Redirects to dashboard on successful login.
 *
 * @component
 * @example
 * ```tsx
 * <LoginForm
 *   onSuccess={(user) => navigate('/dashboard')}
 *   onError={(error) => showToast(error)}
 * />
 * ```
 */
interface LoginFormProps {
  /** Callback invoked on successful authentication */
  onSuccess?: (user: User) => void;

  /** Callback invoked on authentication failure */
  onError?: (error: string) => void;

  /** Initial email value (optional) */
  initialEmail?: string;
}

export const LoginForm: React.FC<LoginFormProps> = ({
  onSuccess,
  onError,
  initialEmail = ''
}) => {
  // Component implementation...
}
```

### Python Documentation
```python
## Integration Points
- Docstring conventions (Google, NumPy, or Sphinx style)
- Type hints (PEP 484)
- Sphinx for API documentation
- Pydantic for data validation

## Python Documentation Standards

from typing import Optional, Dict, Any
from datetime import datetime, timedelta

class AuthenticationService:
    """
    Manages user authentication and session handling.

    This service handles the complete authentication lifecycle including
    login, logout, token generation, and session validation.

    Attributes:
        secret_key: Secret key for JWT token generation
        token_expiry: Token expiration time in hours (default: 24)

    Example:
        >>> service = AuthenticationService(secret_key='my-secret')
        >>> result = service.authenticate('user@example.com', 'password')
        >>> if result['success']:
        ...     token = result['token']

    Note:
        This class is thread-safe and can be used across multiple requests.

    Since:
        1.0.0
    """

    def __init__(self, secret_key: str, token_expiry: int = 24):
        """
        Initialize authentication service.

        Args:
            secret_key: Secret key for JWT encoding/decoding
            token_expiry: Token expiration time in hours

        Raises:
            ValueError: If secret_key is empty or None
        """
        if not secret_key:
            raise ValueError("Secret key cannot be empty")

        self.secret_key = secret_key
        self.token_expiry = token_expiry

    def authenticate(
        self,
        email: str,
        password: str
    ) -> Dict[str, Any]:
        """
        Authenticate a user with email and password.

        Validates credentials against the database and generates a JWT token
        on successful authentication. Logs all authentication attempts for
        security auditing.

        Args:
            email: User's email address (case-insensitive)
            password: User's password (plain text, will be hashed for comparison)

        Returns:
            Dictionary containing authentication result:
                {
                    'success': bool,
                    'token': Optional[str],
                    'user': Optional[Dict],
                    'error': Optional[str]
                }

        Raises:
            ValueError: If email or password is empty
            AuthenticationError: If database connection fails

        Example:
            >>> result = service.authenticate('user@example.com', 'pass123')
            >>> if result['success']:
            ...     print(f"Token: {result['token']}")
            ... else:
            ...     print(f"Error: {result['error']}")

        Note:
            - Email comparison is case-insensitive
            - Password is hashed using bcrypt before comparison
            - Failed attempts are rate-limited (max 5 per hour)

        See Also:
            generate_token: For token generation logic
            validate_token: For token validation
        """
        # Validate input parameters
        if not email or not email.strip():
            raise ValueError("Email cannot be blank")
        if not password or not password.strip():
            raise ValueError("Password cannot be blank")

        # Normalize email to lowercase
        email = email.lower().strip()

        try:
            # Query user from database
            user = self._find_user_by_email(email)

            if not user:
                # Return generic error to prevent email enumeration
                return {
                    'success': False,
                    'error': 'Invalid credentials'
                }

            # Verify password using secure comparison
            if not self._verify_password(password, user['password_hash']):
                # Log failed attempt for security monitoring
                self._log_failed_attempt(email)
                return {
                    'success': False,
                    'error': 'Invalid credentials'
                }

            # Generate JWT token with user claims
            token = self._generate_token(user)

            # Log successful authentication
            self._log_successful_auth(user['id'])

            return {
                'success': True,
                'token': token,
                'user': {
                    'id': user['id'],
                    'email': user['email'],
                    'name': user['name']
                }
            }

        except DatabaseError as e:
            # Log database error for ops team
            logger.error(f"Database error during authentication: {e}")
            raise AuthenticationError("Authentication service unavailable")

    def _generate_token(self, user: Dict[str, Any]) -> str:
        """
        Generate JWT token for authenticated user.

        Creates a JWT token containing user ID, email, and expiration time.
        Uses HS256 algorithm with the service's secret key.

        Args:
            user: User dictionary with 'id' and 'email' keys

        Returns:
            Encoded JWT token string

        Note:
            This is a private method and should not be called directly.
            Token format: {"user_id": int, "email": str, "exp": timestamp}
        """
        payload = {
            'user_id': user['id'],
            'email': user['email'],
            'exp': datetime.utcnow() + timedelta(hours=self.token_expiry)
        }

        return jwt.encode(payload, self.secret_key, algorithm='HS256')
```

## Tools Required

### Primary Tools
- **nn__documentation-generator** - Generate docstrings from code
- **nn__type-inference** - Suggest type annotations

### MCP Servers
[MCP_TOOLS]
<!-- Populated during skill creation based on:
     1. User's installed MCP servers
     2. User's selection for this skill

     Recommended for this skill (examples):
     - mcp__code-analyzer - Analyze code structure and complexity
     - mcp__ast-parser - Parse abstract syntax trees
     - mcp__documentation-linter - Check doc format compliance

     Note: Skills work without MCP servers, but functionality may be limited
-->

## Quality Checklist

**Before Documenting:**
- [ ] Code is finalized and tested
- [ ] Public API surface identified
- [ ] Complex logic flagged for explanation
- [ ] Edge cases and constraints known

**Documentation Quality:**
- [ ] All public methods/functions documented
- [ ] All parameters described with types
- [ ] Return values documented
- [ ] Exceptions/errors documented
- [ ] Usage examples provided
- [ ] Complex logic explained with comments
- [ ] Business rules clarified

**Format Compliance:**
- [ ] Follows language-specific conventions
- [ ] Type annotations present (where applicable)
- [ ] Consistent formatting throughout
- [ ] No spelling/grammar errors
- [ ] Links to related code valid

**Completeness:**
- [ ] "Why" explained, not just "what"
- [ ] Edge cases mentioned
- [ ] Performance implications noted
- [ ] Thread-safety documented (if relevant)
- [ ] Deprecation notices added (if applicable)

## Documentation Examples

See [TECH_STACK_SPECIFIC] sections above for complete examples.

### Additional Comment Patterns

```ruby
# Good Comments - Explain WHY
class PaymentProcessor
  def process_refund(payment)
    # Refunds must be processed within 90 days of original payment
    # per merchant agreement and credit card network rules
    raise RefundExpiredError if payment.created_at < 90.days.ago

    # Use idempotency key to prevent duplicate refunds if request is retried
    idempotency_key = "refund-#{payment.id}-#{Time.current.to_i}"

    # Stripe refund API is eventually consistent, so we mark as pending
    # and use webhooks to confirm completion
    payment.update!(status: :refund_pending)

    stripe_refund = Stripe::Refund.create(
      payment_intent: payment.stripe_id,
      metadata: { idempotency_key: idempotency_key }
    )

    payment.update!(refund_id: stripe_refund.id)
  end
end

# Bad Comments - State the obvious
class PaymentProcessor
  def process_refund(payment)
    # Check if payment is older than 90 days
    raise RefundExpiredError if payment.created_at < 90.days.ago

    # Create idempotency key
    idempotency_key = "refund-#{payment.id}-#{Time.current.to_i}"

    # Update payment status
    payment.update!(status: :refund_pending)

    # Create Stripe refund
    stripe_refund = Stripe::Refund.create(
      payment_intent: payment.stripe_id,
      metadata: { idempotency_key: idempotency_key }
    )

    # Update payment with refund ID
    payment.update!(refund_id: stripe_refund.id)
  end
end
```

### Complex Algorithm Documentation

```python
def calculate_shipping_cost(weight_kg: float, distance_km: float, zone: str) -> float:
    """
    Calculate shipping cost using zone-based tiered pricing.

    Algorithm:
    1. Determine base rate from zone pricing matrix
    2. Apply weight multiplier (increases by 10% per kg over 5kg)
    3. Apply distance surcharge (2% per 100km over 500km)
    4. Round up to nearest $0.05 for payment processing

    Zone Pricing Matrix:
    - Local (< 100km): $5.00 base
    - Regional (100-500km): $10.00 base
    - National (> 500km): $15.00 base

    Args:
        weight_kg: Package weight in kilograms
        distance_km: Shipping distance in kilometers
        zone: Shipping zone ('local', 'regional', 'national')

    Returns:
        Final shipping cost in dollars

    Raises:
        ValueError: If weight is negative or zone is invalid

    Example:
        >>> calculate_shipping_cost(2.5, 150, 'regional')
        10.0
        >>> calculate_shipping_cost(7, 600, 'national')
        17.95

    Note:
        This algorithm is based on carrier contract dated 2026-01-01.
        Update base rates annually or when contract is renegotiated.
    """
    # Validate inputs
    if weight_kg < 0:
        raise ValueError("Weight cannot be negative")

    # Zone base rates (in dollars)
    base_rates = {
        'local': 5.00,
        'regional': 10.00,
        'national': 15.00
    }

    if zone not in base_rates:
        raise ValueError(f"Invalid zone: {zone}")

    # Start with base rate for zone
    cost = base_rates[zone]

    # Apply weight multiplier for packages over 5kg
    # Each additional kg adds 10% to base rate
    if weight_kg > 5:
        excess_weight = weight_kg - 5
        weight_multiplier = 1 + (excess_weight * 0.10)
        cost *= weight_multiplier

    # Apply distance surcharge for long-distance shipments
    # 2% per 100km over 500km
    if distance_km > 500:
        excess_distance = distance_km - 500
        distance_surcharge = (excess_distance / 100) * 0.02
        cost *= (1 + distance_surcharge)

    # Round up to nearest $0.05 for payment processing
    # This avoids fractional cent issues
    cost = round(cost * 20) / 20

    return cost
```

## Format Guidelines

### Documentation Principles

**DO:**
- Document public APIs thoroughly
- Explain business logic and constraints
- Include usage examples
- Note side effects and dependencies
- Document exceptions and edge cases
- Keep docs close to code they describe

**DON'T:**
- Document obvious code
- Repeat what code clearly shows
- Use vague descriptions
- Leave outdated documentation
- Over-comment simple code
- Use comments as version control

### Comment Types

**1. Header Comments**
- Purpose of file/module
- Overall functionality
- Dependencies and requirements
- Author and date (if required)

**2. Function/Method Comments**
- What it does (brief summary)
- Parameters and types
- Return value and type
- Exceptions raised
- Usage examples
- Side effects

**3. Inline Comments**
- Complex logic explanations
- Business rule justifications
- Workaround explanations
- TODO/FIXME notes
- Performance considerations

**4. Block Comments**
- Algorithm descriptions
- Data structure explanations
- Multi-step processes
- Important constraints

## Best Practices

1. **Update with Code**: Change docs when changing code
2. **Be Concise**: Clear and brief is better than verbose
3. **Use Examples**: Show how to use the code
4. **Explain Why**: Not just what the code does
5. **Type Everything**: Add type hints/annotations
6. **Document Edge Cases**: Note unusual inputs/outputs
7. **Link Related Code**: Reference related functions/classes
8. **Version Features**: Note when features were added
9. **Deprecate Properly**: Mark deprecated code clearly
10. **Validate Docs**: Use linters to check format

---

**Remember:** Code is read more often than written. Good documentation makes maintenance faster and reduces bugs.
