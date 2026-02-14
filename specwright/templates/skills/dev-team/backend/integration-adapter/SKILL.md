# [SKILL_NAME] - External Integration Adapter

> **Role:** External Integration Specialist
> **Domain:** API Clients & Third-Party Services
> **Created:** [CURRENT_DATE]

## Purpose

Handle all external service integrations, API clients, webhooks, and third-party service communication. Focus on reliable integration, error handling, rate limiting, and service resilience.

## When to Activate

**Use this skill for:**
- External API client implementation
- Third-party service integration
- Webhook handling and processing
- OAuth and authentication flows
- Payment gateway integration
- Email/SMS service integration
- Cloud service APIs (S3, etc.)

**Do NOT use for:**
- Business logic (use logic-implementing)
- Database operations (use persistence-adapter)
- Testing (use test-engineering)

## Core Capabilities

### 1. API Client Design
- RESTful API clients
- GraphQL clients
- SOAP/XML services
- Real-time connections (WebSocket, SSE)

### 2. Authentication & Security
- OAuth 2.0 flows
- API key management
- Token refresh mechanisms
- Request signing

### 3. Error Handling & Resilience
- Retry strategies with backoff
- Circuit breaker pattern
- Timeout management
- Fallback mechanisms

### 4. Rate Limiting & Throttling
- Request rate limiting
- Queue-based processing
- Batch operations
- API quota management

## [TECH_STACK_SPECIFIC] Patterns

### Ruby on Rails

```ruby
# Base API Client
class BaseApiClient
  include HTTParty

  attr_reader :base_uri, :timeout

  def initialize(base_uri:, timeout: 30)
    @base_uri = base_uri
    @timeout = timeout
    self.class.base_uri(@base_uri)
  end

  private

  def get(path, options = {})
    handle_response do
      self.class.get(path, default_options.merge(options))
    end
  end

  def post(path, options = {})
    handle_response do
      self.class.post(path, default_options.merge(options))
    end
  end

  def put(path, options = {})
    handle_response do
      self.class.put(path, default_options.merge(options))
    end
  end

  def delete(path, options = {})
    handle_response do
      self.class.delete(path, default_options.merge(options))
    end
  end

  def default_options
    {
      timeout: @timeout,
      headers: default_headers
    }
  end

  def default_headers
    {
      'Content-Type' => 'application/json',
      'Accept' => 'application/json'
    }
  end

  def handle_response
    response = yield

    case response.code
    when 200..299
      parse_response(response)
    when 401
      raise AuthenticationError, 'Unauthorized'
    when 403
      raise AuthorizationError, 'Forbidden'
    when 404
      raise NotFoundError, 'Resource not found'
    when 429
      raise RateLimitError, 'Rate limit exceeded'
    when 500..599
      raise ServerError, "Server error: #{response.code}"
    else
      raise ApiError, "Unexpected response: #{response.code}"
    end
  rescue HTTParty::Error, Timeout::Error => e
    raise ConnectionError, "Connection failed: #{e.message}"
  end

  def parse_response(response)
    JSON.parse(response.body, symbolize_names: true)
  rescue JSON::ParserError
    response.body
  end
end

# Stripe Payment Client
class StripeClient < BaseApiClient
  def initialize
    super(
      base_uri: 'https://api.stripe.com/v1',
      timeout: 30
    )
    @api_key = Rails.application.credentials.dig(:stripe, :secret_key)
  end

  def create_customer(email:, name:, metadata: {})
    post('/customers', body: {
      email: email,
      name: name,
      metadata: metadata
    })
  end

  def create_payment_intent(amount:, currency: 'usd', customer_id:)
    post('/payment_intents', body: {
      amount: amount,
      currency: currency,
      customer: customer_id
    })
  end

  def retrieve_payment_intent(payment_intent_id)
    get("/payment_intents/#{payment_intent_id}")
  end

  def list_charges(customer_id:, limit: 10)
    get('/charges', query: {
      customer: customer_id,
      limit: limit
    })
  end

  private

  def default_headers
    super.merge(
      'Authorization' => "Bearer #{@api_key}",
      'Stripe-Version' => '2023-10-16'
    )
  end
end

# Retry Strategy with Exponential Backoff
class RetryableApiClient < BaseApiClient
  MAX_RETRIES = 3
  INITIAL_BACKOFF = 1 # seconds

  private

  def handle_response
    retries = 0

    begin
      super
    rescue RateLimitError, ServerError, ConnectionError => e
      retries += 1

      if retries <= MAX_RETRIES
        backoff_time = INITIAL_BACKOFF * (2 ** (retries - 1))
        Rails.logger.warn("API request failed, retrying in #{backoff_time}s: #{e.message}")
        sleep(backoff_time)
        retry
      else
        Rails.logger.error("API request failed after #{MAX_RETRIES} retries: #{e.message}")
        raise
      end
    end
  end
end

# Circuit Breaker Pattern
class CircuitBreakerApiClient < BaseApiClient
  FAILURE_THRESHOLD = 5
  TIMEOUT_PERIOD = 60 # seconds

  def initialize(*args)
    super
    @failure_count = 0
    @last_failure_time = nil
    @state = :closed # :closed, :open, :half_open
  end

  private

  def handle_response
    check_circuit_state!

    begin
      response = super
      on_success
      response
    rescue ApiError => e
      on_failure
      raise
    end
  end

  def check_circuit_state!
    case @state
    when :open
      if Time.current - @last_failure_time > TIMEOUT_PERIOD
        @state = :half_open
        Rails.logger.info("Circuit breaker entering half-open state")
      else
        raise CircuitOpenError, 'Circuit breaker is open'
      end
    end
  end

  def on_success
    @failure_count = 0
    if @state == :half_open
      @state = :closed
      Rails.logger.info("Circuit breaker closed")
    end
  end

  def on_failure
    @failure_count += 1
    @last_failure_time = Time.current

    if @failure_count >= FAILURE_THRESHOLD
      @state = :open
      Rails.logger.error("Circuit breaker opened after #{FAILURE_THRESHOLD} failures")
    end
  end
end

# OAuth 2.0 Client
class OAuthClient
  attr_reader :client_id, :client_secret, :redirect_uri

  def initialize(provider:)
    config = Rails.application.credentials.dig(:oauth, provider)
    @client_id = config[:client_id]
    @client_secret = config[:client_secret]
    @redirect_uri = config[:redirect_uri]
    @token_url = config[:token_url]
    @authorize_url = config[:authorize_url]
  end

  def authorization_url(state:, scope: [])
    uri = URI(@authorize_url)
    uri.query = URI.encode_www_form(
      client_id: @client_id,
      redirect_uri: @redirect_uri,
      response_type: 'code',
      state: state,
      scope: scope.join(' ')
    )
    uri.to_s
  end

  def exchange_code_for_token(code:)
    response = HTTParty.post(@token_url, body: {
      grant_type: 'authorization_code',
      code: code,
      client_id: @client_id,
      client_secret: @client_secret,
      redirect_uri: @redirect_uri
    })

    raise OAuthError, 'Token exchange failed' unless response.success?

    JSON.parse(response.body, symbolize_names: true)
  end

  def refresh_token(refresh_token:)
    response = HTTParty.post(@token_url, body: {
      grant_type: 'refresh_token',
      refresh_token: refresh_token,
      client_id: @client_id,
      client_secret: @client_secret
    })

    raise OAuthError, 'Token refresh failed' unless response.success?

    JSON.parse(response.body, symbolize_names: true)
  end
end

# Webhook Handler
class WebhookHandler
  def initialize(signature_header:, secret:)
    @signature_header = signature_header
    @secret = secret
  end

  def verify_and_process(payload:, signature:)
    verify_signature!(payload, signature)

    event = JSON.parse(payload, symbolize_names: true)
    process_event(event)
  rescue JSON::ParserError => e
    Rails.logger.error("Invalid webhook payload: #{e.message}")
    raise WebhookError, 'Invalid payload format'
  end

  private

  def verify_signature!(payload, signature)
    expected_signature = OpenSSL::HMAC.hexdigest(
      'SHA256',
      @secret,
      payload
    )

    unless Rack::Utils.secure_compare(expected_signature, signature)
      raise WebhookError, 'Invalid signature'
    end
  end

  def process_event(event)
    case event[:type]
    when 'payment.succeeded'
      handle_payment_succeeded(event[:data])
    when 'payment.failed'
      handle_payment_failed(event[:data])
    when 'customer.created'
      handle_customer_created(event[:data])
    else
      Rails.logger.warn("Unhandled webhook event: #{event[:type]}")
    end
  end

  def handle_payment_succeeded(data)
    PaymentSucceededJob.perform_later(data)
  end

  def handle_payment_failed(data)
    PaymentFailedJob.perform_later(data)
  end

  def handle_customer_created(data)
    CustomerCreatedJob.perform_later(data)
  end
end

# Rate Limited Client
class RateLimitedClient < BaseApiClient
  RATE_LIMIT = 100 # requests per minute
  WINDOW = 60 # seconds

  def initialize(*args)
    super
    @requests = []
  end

  private

  def handle_response
    enforce_rate_limit!
    super
  end

  def enforce_rate_limit!
    current_time = Time.current
    cutoff_time = current_time - WINDOW

    # Remove old requests
    @requests.reject! { |time| time < cutoff_time }

    if @requests.size >= RATE_LIMIT
      sleep_time = @requests.first - cutoff_time
      Rails.logger.info("Rate limit reached, sleeping for #{sleep_time}s")
      sleep(sleep_time)
      @requests.shift
    end

    @requests << current_time
  end
end
```

### Node.js / TypeScript

```typescript
// Base API Client
import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse } from 'axios';

interface ApiClientConfig {
  baseURL: string;
  timeout?: number;
  headers?: Record<string, string>;
}

class BaseApiClient {
  protected client: AxiosInstance;

  constructor(config: ApiClientConfig) {
    this.client = axios.create({
      baseURL: config.baseURL,
      timeout: config.timeout || 30000,
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        ...config.headers
      }
    });

    this.setupInterceptors();
  }

  protected async get<T>(path: string, config?: AxiosRequestConfig): Promise<T> {
    const response = await this.client.get<T>(path, config);
    return response.data;
  }

  protected async post<T>(path: string, data?: any, config?: AxiosRequestConfig): Promise<T> {
    const response = await this.client.post<T>(path, data, config);
    return response.data;
  }

  protected async put<T>(path: string, data?: any, config?: AxiosRequestConfig): Promise<T> {
    const response = await this.client.put<T>(path, data, config);
    return response.data;
  }

  protected async delete<T>(path: string, config?: AxiosRequestConfig): Promise<T> {
    const response = await this.client.delete<T>(path, config);
    return response.data;
  }

  private setupInterceptors(): void {
    this.client.interceptors.response.use(
      (response) => response,
      (error) => {
        if (error.response) {
          switch (error.response.status) {
            case 401:
              throw new AuthenticationError('Unauthorized');
            case 403:
              throw new AuthorizationError('Forbidden');
            case 404:
              throw new NotFoundError('Resource not found');
            case 429:
              throw new RateLimitError('Rate limit exceeded');
            case 500:
            case 502:
            case 503:
            case 504:
              throw new ServerError(`Server error: ${error.response.status}`);
            default:
              throw new ApiError(`API error: ${error.response.status}`);
          }
        } else if (error.request) {
          throw new ConnectionError('No response received');
        } else {
          throw new ApiError(error.message);
        }
      }
    );
  }
}

// Stripe Client
interface CreateCustomerParams {
  email: string;
  name: string;
  metadata?: Record<string, string>;
}

interface CreatePaymentIntentParams {
  amount: number;
  currency?: string;
  customerId: string;
}

class StripeClient extends BaseApiClient {
  constructor(apiKey: string) {
    super({
      baseURL: 'https://api.stripe.com/v1',
      timeout: 30000,
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Stripe-Version': '2023-10-16'
      }
    });
  }

  async createCustomer(params: CreateCustomerParams) {
    return this.post('/customers', params);
  }

  async createPaymentIntent(params: CreatePaymentIntentParams) {
    return this.post('/payment_intents', {
      amount: params.amount,
      currency: params.currency || 'usd',
      customer: params.customerId
    });
  }

  async retrievePaymentIntent(paymentIntentId: string) {
    return this.get(`/payment_intents/${paymentIntentId}`);
  }

  async listCharges(customerId: string, limit = 10) {
    return this.get('/charges', {
      params: {
        customer: customerId,
        limit
      }
    });
  }
}

// Retry Strategy with Exponential Backoff
class RetryableApiClient extends BaseApiClient {
  private maxRetries = 3;
  private initialBackoff = 1000; // ms

  protected async get<T>(path: string, config?: AxiosRequestConfig): Promise<T> {
    return this.withRetry(() => super.get<T>(path, config));
  }

  protected async post<T>(path: string, data?: any, config?: AxiosRequestConfig): Promise<T> {
    return this.withRetry(() => super.post<T>(path, data, config));
  }

  private async withRetry<T>(fn: () => Promise<T>): Promise<T> {
    let lastError: Error;

    for (let attempt = 0; attempt <= this.maxRetries; attempt++) {
      try {
        return await fn();
      } catch (error) {
        lastError = error as Error;

        if (
          attempt < this.maxRetries &&
          this.isRetryable(error as Error)
        ) {
          const backoffTime = this.initialBackoff * Math.pow(2, attempt);
          console.warn(`Request failed, retrying in ${backoffTime}ms: ${error.message}`);
          await this.sleep(backoffTime);
        } else {
          throw error;
        }
      }
    }

    throw lastError!;
  }

  private isRetryable(error: Error): boolean {
    return (
      error instanceof RateLimitError ||
      error instanceof ServerError ||
      error instanceof ConnectionError
    );
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// Circuit Breaker Pattern
enum CircuitState {
  Closed = 'CLOSED',
  Open = 'OPEN',
  HalfOpen = 'HALF_OPEN'
}

class CircuitBreakerApiClient extends BaseApiClient {
  private failureThreshold = 5;
  private timeoutPeriod = 60000; // ms
  private failureCount = 0;
  private lastFailureTime: number | null = null;
  private state: CircuitState = CircuitState.Closed;

  protected async get<T>(path: string, config?: AxiosRequestConfig): Promise<T> {
    return this.withCircuitBreaker(() => super.get<T>(path, config));
  }

  private async withCircuitBreaker<T>(fn: () => Promise<T>): Promise<T> {
    this.checkCircuitState();

    try {
      const result = await fn();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }

  private checkCircuitState(): void {
    if (this.state === CircuitState.Open) {
      const now = Date.now();
      if (this.lastFailureTime && now - this.lastFailureTime > this.timeoutPeriod) {
        this.state = CircuitState.HalfOpen;
        console.info('Circuit breaker entering half-open state');
      } else {
        throw new CircuitOpenError('Circuit breaker is open');
      }
    }
  }

  private onSuccess(): void {
    this.failureCount = 0;
    if (this.state === CircuitState.HalfOpen) {
      this.state = CircuitState.Closed;
      console.info('Circuit breaker closed');
    }
  }

  private onFailure(): void {
    this.failureCount++;
    this.lastFailureTime = Date.now();

    if (this.failureCount >= this.failureThreshold) {
      this.state = CircuitState.Open;
      console.error(`Circuit breaker opened after ${this.failureThreshold} failures`);
    }
  }
}

// OAuth 2.0 Client
interface OAuthConfig {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
  tokenUrl: string;
  authorizeUrl: string;
}

interface TokenResponse {
  access_token: string;
  refresh_token?: string;
  expires_in: number;
  token_type: string;
}

class OAuthClient {
  constructor(private config: OAuthConfig) {}

  getAuthorizationUrl(state: string, scope: string[] = []): string {
    const params = new URLSearchParams({
      client_id: this.config.clientId,
      redirect_uri: this.config.redirectUri,
      response_type: 'code',
      state,
      scope: scope.join(' ')
    });

    return `${this.config.authorizeUrl}?${params.toString()}`;
  }

  async exchangeCodeForToken(code: string): Promise<TokenResponse> {
    const response = await axios.post<TokenResponse>(
      this.config.tokenUrl,
      {
        grant_type: 'authorization_code',
        code,
        client_id: this.config.clientId,
        client_secret: this.config.clientSecret,
        redirect_uri: this.config.redirectUri
      },
      {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      }
    );

    return response.data;
  }

  async refreshToken(refreshToken: string): Promise<TokenResponse> {
    const response = await axios.post<TokenResponse>(
      this.config.tokenUrl,
      {
        grant_type: 'refresh_token',
        refresh_token: refreshToken,
        client_id: this.config.clientId,
        client_secret: this.config.clientSecret
      },
      {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      }
    );

    return response.data;
  }
}

// Webhook Handler
import crypto from 'crypto';

interface WebhookEvent {
  type: string;
  data: any;
}

class WebhookHandler {
  constructor(private secret: string) {}

  async verifyAndProcess(payload: string, signature: string): Promise<void> {
    this.verifySignature(payload, signature);

    const event: WebhookEvent = JSON.parse(payload);
    await this.processEvent(event);
  }

  private verifySignature(payload: string, signature: string): void {
    const expectedSignature = crypto
      .createHmac('sha256', this.secret)
      .update(payload)
      .digest('hex');

    if (!crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSignature))) {
      throw new WebhookError('Invalid signature');
    }
  }

  private async processEvent(event: WebhookEvent): Promise<void> {
    switch (event.type) {
      case 'payment.succeeded':
        await this.handlePaymentSucceeded(event.data);
        break;
      case 'payment.failed':
        await this.handlePaymentFailed(event.data);
        break;
      case 'customer.created':
        await this.handleCustomerCreated(event.data);
        break;
      default:
        console.warn(`Unhandled webhook event: ${event.type}`);
    }
  }

  private async handlePaymentSucceeded(data: any): Promise<void> {
    // Queue background job
  }

  private async handlePaymentFailed(data: any): Promise<void> {
    // Queue background job
  }

  private async handleCustomerCreated(data: any): Promise<void> {
    // Queue background job
  }
}

// Custom Error Classes
class ApiError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ApiError';
  }
}

class AuthenticationError extends ApiError {
  constructor(message: string) {
    super(message);
    this.name = 'AuthenticationError';
  }
}

class AuthorizationError extends ApiError {
  constructor(message: string) {
    super(message);
    this.name = 'AuthorizationError';
  }
}

class NotFoundError extends ApiError {
  constructor(message: string) {
    super(message);
    this.name = 'NotFoundError';
  }
}

class RateLimitError extends ApiError {
  constructor(message: string) {
    super(message);
    this.name = 'RateLimitError';
  }
}

class ServerError extends ApiError {
  constructor(message: string) {
    super(message);
    this.name = 'ServerError';
  }
}

class ConnectionError extends ApiError {
  constructor(message: string) {
    super(message);
    this.name = 'ConnectionError';
  }
}

class CircuitOpenError extends ApiError {
  constructor(message: string) {
    super(message);
    this.name = 'CircuitOpenError';
  }
}

class WebhookError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'WebhookError';
  }
}

class OAuthError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'OAuthError';
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
     - HTTP client tools for API testing
     - OAuth/authentication testing tools
     - Webhook simulation tools
     - API documentation tools (OpenAPI/Swagger)
     - Secret management tools

     Note: Skills work without MCP servers, but functionality may be limited
-->

### Development Tools
- API testing client (Postman, Insomnia)
- Webhook testing (ngrok, webhook.site)
- OAuth playground
- HTTP debugging proxy

### Monitoring Tools
- API response time monitoring
- Error rate tracking
- Rate limit monitoring
- Circuit breaker dashboards

### Security Tools
- Secret management
- API key rotation
- Request signing validation
- SSL/TLS verification

## Quality Checklist

### Before Integration
- [ ] API documentation reviewed
- [ ] Rate limits understood
- [ ] Authentication flow tested
- [ ] Error responses documented
- [ ] Webhook signatures verified

### During Implementation
- [ ] Proper error handling
- [ ] Retry logic with backoff
- [ ] Timeout configured
- [ ] Secrets externalized
- [ ] Logging comprehensive

### After Implementation
- [ ] Integration tests pass
- [ ] Circuit breaker tested
- [ ] Rate limiting works
- [ ] Webhook signature validation
- [ ] Documentation updated

### Production Readiness
- [ ] Monitoring alerts configured
- [ ] Error tracking enabled
- [ ] API keys rotated
- [ ] Fallback strategies tested
- [ ] Performance benchmarked

## Testing Patterns

### API Client Testing

```ruby
# RSpec with VCR
RSpec.describe StripeClient do
  let(:client) { StripeClient.new }

  describe '#create_customer', :vcr do
    it 'creates a customer' do
      result = client.create_customer(
        email: 'test@example.com',
        name: 'Test User'
      )

      expect(result[:id]).to start_with('cus_')
      expect(result[:email]).to eq('test@example.com')
    end
  end

  describe 'error handling' do
    it 'raises AuthenticationError for 401' do
      stub_request(:post, /api.stripe.com/)
        .to_return(status: 401)

      expect {
        client.create_customer(email: 'test@example.com', name: 'Test')
      }.to raise_error(AuthenticationError)
    end
  end
end
```

```typescript
// Jest with nock
import nock from 'nock';

describe('StripeClient', () => {
  let client: StripeClient;

  beforeEach(() => {
    client = new StripeClient('test_api_key');
  });

  afterEach(() => {
    nock.cleanAll();
  });

  describe('createCustomer', () => {
    it('creates a customer', async () => {
      nock('https://api.stripe.com')
        .post('/v1/customers')
        .reply(200, {
          id: 'cus_123',
          email: 'test@example.com',
          name: 'Test User'
        });

      const result = await client.createCustomer({
        email: 'test@example.com',
        name: 'Test User'
      });

      expect(result.id).toBe('cus_123');
      expect(result.email).toBe('test@example.com');
    });

    it('throws AuthenticationError for 401', async () => {
      nock('https://api.stripe.com')
        .post('/v1/customers')
        .reply(401);

      await expect(
        client.createCustomer({
          email: 'test@example.com',
          name: 'Test User'
        })
      ).rejects.toThrow(AuthenticationError);
    });
  });
});
```

## Common Integration Patterns

### Payment Gateways
- Stripe, PayPal, Square
- Idempotency keys
- Webhook verification
- Refund handling

### Email Services
- SendGrid, Mailgun, Postmark
- Template management
- Bounce/complaint handling
- Delivery tracking

### SMS Services
- Twilio, Vonage
- Phone number validation
- Delivery receipts
- Two-factor authentication

### Cloud Storage
- AWS S3, Google Cloud Storage
- Pre-signed URLs
- Multipart uploads
- Access control

### Analytics
- Google Analytics, Mixpanel, Segment
- Event tracking
- User identification
- Privacy compliance

## Security Best Practices

### API Key Management
- Store in environment variables
- Rotate regularly
- Use different keys per environment
- Never commit to version control

### Request Signing
- HMAC signatures for webhooks
- Timestamp validation
- Replay attack prevention
- Signature verification

### Data Protection
- Encrypt sensitive data in transit
- Use HTTPS only
- Validate SSL certificates
- Sanitize inputs

## Performance Considerations

- Connection pooling for HTTP clients
- Request batching when supported
- Async processing for webhooks
- Caching responses when appropriate
- Monitor API quotas

## Anti-Patterns to Avoid

- **Synchronous External Calls in Web Requests**: Use background jobs
- **Missing Timeouts**: Always set request timeouts
- **No Retry Logic**: Implement exponential backoff
- **Ignoring Rate Limits**: Track and respect API limits
- **Hardcoded Credentials**: Use environment variables
- **No Circuit Breaker**: Prevent cascading failures

---

**Remember:** External integrations are points of failure. Focus on resilience, proper error handling, and graceful degradation. Always assume external services will fail.
