# Observability Management Skill

> Template for Monitoring, Logging, and Alerting Specialists
> Version: 1.0.0
> Created: 2026-01-09

## Skill Purpose

Implement comprehensive observability with monitoring, structured logging, distributed tracing, and proactive alerting to maintain system reliability and quickly diagnose issues.

## When to Activate This Skill

**Activate when:**
- Setting up application monitoring
- Implementing structured logging
- Creating alerting rules
- Debugging production issues
- Performance optimization
- SLA/SLO tracking
- Incident response preparation
- Capacity planning

**Delegation from main agent:**
```
@agent:[AGENT_NAME] "Set up application performance monitoring"
@agent:[AGENT_NAME] "Implement structured logging with request tracing"
@agent:[AGENT_NAME] "Create alerting rules for critical errors"
@agent:[AGENT_NAME] "Add health check endpoints"
```

## Core Capabilities

### Metrics & Monitoring
- Application performance metrics (APM)
- Infrastructure monitoring (CPU, memory, disk)
- Custom business metrics
- Real-time dashboards
- Historical trend analysis
- SLO/SLA tracking

### Logging
- Structured logging (JSON format)
- Centralized log aggregation
- Log retention policies
- Search and filtering
- Correlation with traces
- Security audit logs

### Alerting
- Threshold-based alerts
- Anomaly detection
- Alert routing and escalation
- On-call scheduling
- Incident management
- Alert fatigue prevention

### Tracing
- Distributed request tracing
- Performance bottleneck identification
- Service dependency mapping
- Error propagation tracking
- Database query analysis

## [TECH_STACK_SPECIFIC] Platform Solutions

### DigitalOcean Monitoring (Built-in)

**Enable App Platform Metrics:**
```yaml
# app.yaml
name: myapp-production

services:
  - name: web
    # ... other config ...

    # Health check endpoint
    health_check:
      http_path: /health
      initial_delay_seconds: 30
      period_seconds: 10
      timeout_seconds: 5
      success_threshold: 1
      failure_threshold: 3

    # Built-in metrics
    # - CPU usage
    # - Memory usage
    # - Request rate
    # - Response time
    # - Error rate
```

**Access Metrics:**
```bash
# Via CLI
doctl apps list-alerts <app-id>
doctl apps get-metrics <app-id>

# Via API
curl -X GET \
  -H "Authorization: Bearer $DIGITALOCEAN_TOKEN" \
  https://api.digitalocean.com/v2/apps/<app-id>/metrics
```

### Rails Application Instrumentation

**Health Check Endpoint:**
```ruby
# config/routes.rb
Rails.application.routes.draw do
  get '/health', to: 'health#show'
  # ... other routes
end

# app/controllers/health_controller.rb
class HealthController < ApplicationController
  skip_before_action :authenticate_user!

  def show
    checks = {
      database: database_check,
      redis: redis_check,
      storage: storage_check,
      timestamp: Time.current.iso8601
    }

    if checks.values.all?
      render json: { status: 'healthy', checks: checks }, status: :ok
    else
      render json: { status: 'unhealthy', checks: checks }, status: :service_unavailable
    end
  end

  private

  def database_check
    ActiveRecord::Base.connection.execute('SELECT 1')
    true
  rescue StandardError => e
    Rails.logger.error("Database health check failed: #{e.message}")
    false
  end

  def redis_check
    Redis.current.ping == 'PONG'
  rescue StandardError => e
    Rails.logger.error("Redis health check failed: #{e.message}")
    false
  end

  def storage_check
    ActiveStorage::Blob.service.exist?('health_check')
    true
  rescue StandardError => e
    Rails.logger.error("Storage health check failed: #{e.message}")
    false
  end
end
```

**Structured Logging:**
```ruby
# config/environments/production.rb
config.log_formatter = Logger::Formatter.new

# Use JSON formatter
config.log_formatter = proc do |severity, datetime, progname, msg|
  {
    timestamp: datetime.iso8601,
    severity: severity,
    message: msg,
    pid: Process.pid,
    hostname: Socket.gethostname
  }.to_json + "\n"
end

# Log to stdout (12-factor app)
config.logger = ActiveSupport::Logger.new(STDOUT)
config.log_level = :info

# config/initializers/lograge.rb
Rails.application.configure do
  config.lograge.enabled = true
  config.lograge.formatter = Lograge::Formatters::Json.new

  config.lograge.custom_options = lambda do |event|
    {
      user_id: event.payload[:user_id],
      request_id: event.payload[:request_id],
      ip: event.payload[:ip],
      params: event.payload[:params].except('controller', 'action'),
      exception: event.payload[:exception]&.first,
      exception_message: event.payload[:exception]&.last
    }
  end
end
```

**Request ID Tracking:**
```ruby
# app/controllers/application_controller.rb
class ApplicationController < ActionController::Base
  before_action :set_request_id

  private

  def set_request_id
    RequestStore.store[:request_id] = request.uuid
  end
end

# Use in logs
Rails.logger.info("Processing payment",
  request_id: RequestStore.store[:request_id],
  user_id: current_user.id,
  amount: params[:amount]
)
```

**Custom Metrics:**
```ruby
# app/models/concerns/metric_tracking.rb
module MetricTracking
  extend ActiveSupport::Concern

  included do
    after_create :track_create_metric
    after_update :track_update_metric
  end

  private

  def track_create_metric
    StatsD.increment("#{self.class.name.underscore}.created")
  end

  def track_update_metric
    StatsD.increment("#{self.class.name.underscore}.updated")
  end
end

# Usage in models
class Order < ApplicationRecord
  include MetricTracking

  def complete!
    transaction do
      update!(status: :completed, completed_at: Time.current)
      StatsD.timing('order.completion_time', Time.current - created_at)
      StatsD.increment('order.completed')
    end
  end
end
```

### External APM Solutions

#### New Relic (Recommended)
```ruby
# Gemfile
gem 'newrelic_rpm'

# config/newrelic.yml
common: &default_settings
  license_key: <%= ENV['NEW_RELIC_LICENSE_KEY'] %>
  app_name: <%= ENV['NEW_RELIC_APP_NAME'] || 'My Application' %>
  distributed_tracing:
    enabled: true
  application_logging:
    enabled: true
    forwarding:
      enabled: true

production:
  <<: *default_settings
  monitor_mode: true
  log_level: info

# Custom instrumentation
class OrdersController < ApplicationController
  include NewRelic::Agent::Instrumentation::ControllerInstrumentation

  def create
    # ... order creation logic

    NewRelic::Agent.record_custom_event('OrderCreated', {
      order_id: @order.id,
      total: @order.total,
      user_id: current_user.id
    })
  end

  add_transaction_tracer :create, category: :task
end
```

#### Datadog
```ruby
# Gemfile
gem 'ddtrace'

# config/initializers/datadog.rb
Datadog.configure do |c|
  c.tracing.instrument :rails
  c.tracing.instrument :redis
  c.tracing.instrument :pg
  c.tracing.instrument :http

  c.env = Rails.env
  c.service = ENV['DD_SERVICE'] || 'myapp'
  c.version = ENV['GIT_COMMIT_SHA'] || '1.0.0'

  c.tracing.analytics_enabled = true
end

# Custom metrics
Datadog::Statsd.new('localhost', 8125).tap do |statsd|
  statsd.increment('orders.created', tags: ['env:production'])
  statsd.gauge('users.active', User.where('last_seen_at > ?', 5.minutes.ago).count)
  statsd.histogram('payment.amount', payment.amount_cents)
end
```

#### Sentry (Error Tracking)
```ruby
# Gemfile
gem 'sentry-ruby'
gem 'sentry-rails'

# config/initializers/sentry.rb
Sentry.init do |config|
  config.dsn = ENV['SENTRY_DSN']
  config.breadcrumbs_logger = [:active_support_logger, :http_logger]
  config.traces_sample_rate = 0.1  # 10% of requests
  config.environment = Rails.env
  config.enabled_environments = %w[production staging]

  config.before_send = lambda do |event, hint|
    # Filter sensitive data
    event.request.data.delete('password') if event.request.data
    event
  end
end

# Usage
begin
  risky_operation
rescue StandardError => e
  Sentry.capture_exception(e, extra: { user_id: current_user.id })
  raise
end

# Performance monitoring
Sentry.with_scope do |scope|
  scope.set_context('payment', { amount: payment.amount, method: payment.method })
  Sentry.capture_message('Large payment processed', level: :warning)
end
```

### Log Aggregation

#### Papertrail (Simple, Affordable)
```bash
# Add remote syslog destination
# DigitalOcean App Platform → Settings → Logs → Add destination

# Search logs via CLI
papertrail --min-time '5 minutes ago' 'error'
papertrail 'user_id:123' --json
```

#### Logtail (Modern Alternative)
```ruby
# Gemfile
gem 'logtail-ruby'

# config/initializers/logtail.rb
if Rails.env.production?
  Rails.logger = Logtail::Logger.new(ENV['LOGTAIL_SOURCE_TOKEN'])
end

# Structured logging
Rails.logger.info('Order created', {
  order_id: order.id,
  user_id: current_user.id,
  total: order.total,
  items_count: order.items.count
})
```

#### ELK Stack (Self-hosted)
```yaml
# docker-compose.yml for ELK
version: '3.9'

services:
  elasticsearch:
    image: docker.elastic.co/elasticsearch/elasticsearch:8.11.0
    environment:
      - discovery.type=single-node
      - xpack.security.enabled=false
    volumes:
      - elasticsearch_data:/usr/share/elasticsearch/data
    ports:
      - "9200:9200"

  logstash:
    image: docker.elastic.co/logstash/logstash:8.11.0
    volumes:
      - ./logstash/pipeline:/usr/share/logstash/pipeline
    ports:
      - "5000:5000"
    depends_on:
      - elasticsearch

  kibana:
    image: docker.elastic.co/kibana/kibana:8.11.0
    ports:
      - "5601:5601"
    depends_on:
      - elasticsearch

volumes:
  elasticsearch_data:
```

### Alerting Configuration

#### DigitalOcean Alerts
```bash
# Create alert via CLI
doctl monitoring alert create \
  --type v1/insights/droplet/cpu \
  --compare GreaterThan \
  --value 80 \
  --window 5m \
  --entities droplet_id_1,droplet_id_2 \
  --emails alerts@example.com

# App Platform alerts (via UI)
# - High error rate (> 5% for 5 minutes)
# - High response time (> 1s for 5 minutes)
# - Deployment failures
```

#### PagerDuty Integration
```ruby
# Gemfile
gem 'pagerduty'

# config/initializers/pagerduty.rb
PAGERDUTY = Pagerduty.new(ENV['PAGERDUTY_INTEGRATION_KEY'])

# Trigger incident
class CriticalErrorNotifier
  def self.notify(exception, context = {})
    PAGERDUTY.trigger(
      description: exception.message,
      details: {
        exception: exception.class.name,
        backtrace: exception.backtrace.first(5),
        context: context
      },
      severity: 'critical'
    )
  end
end

# Usage
begin
  critical_operation
rescue StandardError => e
  CriticalErrorNotifier.notify(e, user_id: current_user.id)
  raise
end
```

#### Slack Notifications
```ruby
# Gemfile
gem 'slack-notifier'

# config/initializers/slack.rb
SLACK_NOTIFIER = Slack::Notifier.new(
  ENV['SLACK_WEBHOOK_URL'],
  channel: '#alerts',
  username: 'Production Bot'
)

# app/services/slack_alert_service.rb
class SlackAlertService
  def self.error(message, details = {})
    SLACK_NOTIFIER.ping(
      text: message,
      attachments: [{
        color: 'danger',
        fields: details.map { |k, v| { title: k.to_s, value: v.to_s, short: true } },
        footer: Socket.gethostname,
        ts: Time.current.to_i
      }]
    )
  end

  def self.deployment(version)
    SLACK_NOTIFIER.ping(
      text: "Deployed version #{version} to production",
      attachments: [{
        color: 'good',
        footer: "Deployed at #{Time.current}"
      }]
    )
  end
end

# Usage in error handler
rescue_from StandardError do |exception|
  SlackAlertService.error(
    "Unhandled exception: #{exception.message}",
    controller: params[:controller],
    action: params[:action],
    user_id: current_user&.id
  )
  raise
end
```

## Dashboards

### Application Dashboard (New Relic/Datadog)
```
Metrics to track:
- Request throughput (req/min)
- Average response time (ms)
- Error rate (%)
- Apdex score
- Database query time
- Cache hit rate
- Background job queue depth
- Active users
```

### Infrastructure Dashboard
```
Metrics to track:
- CPU utilization (%)
- Memory usage (%)
- Disk I/O (MB/s)
- Network traffic (MB/s)
- Database connections
- Redis memory usage
- Container restart count
```

### Business Metrics Dashboard
```
Custom metrics:
- Orders per hour
- Revenue per hour
- User signups per day
- Conversion rate
- Average order value
- Payment success rate
```

## Tools Required

### MCP Servers
[MCP_TOOLS]
<!-- Populated during skill creation based on:
     1. User's installed MCP servers
     2. User's selection for this skill

     Recommended for this skill (examples):
     - APM/Monitoring services (New Relic, Datadog, Sentry)
     - Log aggregation services (Papertrail, Logtail)
     - Alerting services (PagerDuty, Slack)
     - Metrics databases (Prometheus, InfluxDB)

     Note: Skills work without MCP servers, but functionality may be limited
-->

### APM & Monitoring
```bash
# New Relic
# Sign up at newrelic.com
# Add gem and configure

# Datadog
# Sign up at datadoghq.com
# Install agent

# DigitalOcean Monitoring
doctl monitoring alert list
```

### Log Management
```bash
# Papertrail
gem install papertrail-cli
papertrail --help

# Logtail
# Web-based interface
```

### Alerting
```bash
# PagerDuty CLI
npm install -g pdjs
pd incident:list

# Slack
# Use webhooks (no CLI needed)
```

## Quality Checklist

### Monitoring Coverage
- [ ] Application performance metrics tracked
- [ ] Infrastructure metrics monitored
- [ ] Database performance tracked
- [ ] Background job metrics collected
- [ ] External API latency monitored
- [ ] Business KPIs dashboarded
- [ ] Custom events for critical flows

### Logging Best Practices
- [ ] Structured logging (JSON format)
- [ ] Request ID correlation
- [ ] User context included
- [ ] Sensitive data filtered (passwords, tokens)
- [ ] Error stack traces captured
- [ ] Log levels appropriate
- [ ] Centralized log aggregation
- [ ] Retention policy defined

### Alerting Rules
- [ ] Critical errors alert immediately
- [ ] High error rate threshold set
- [ ] Performance degradation alerts
- [ ] Infrastructure alerts (CPU, memory, disk)
- [ ] Database connection pool alerts
- [ ] Background job failures
- [ ] Alert routing configured
- [ ] On-call schedule defined
- [ ] Runbooks documented

### Health Checks
- [ ] HTTP health endpoint (/health)
- [ ] Database connectivity check
- [ ] Redis connectivity check
- [ ] External service checks
- [ ] Storage accessibility check
- [ ] Health checks logged
- [ ] Checks run on schedule

## Observability Patterns

### Golden Signals (SRE)
```ruby
# 1. Latency - How long requests take
# 2. Traffic - How many requests
# 3. Errors - Rate of failed requests
# 4. Saturation - How full the service is

class MetricsMiddleware
  def initialize(app)
    @app = app
  end

  def call(env)
    start_time = Time.current
    status, headers, response = @app.call(env)
    duration = Time.current - start_time

    # Latency
    StatsD.timing('http.request.duration', duration * 1000, tags: ["status:#{status}"])

    # Traffic
    StatsD.increment('http.request.count', tags: ["status:#{status}"])

    # Errors
    StatsD.increment('http.request.errors') if status >= 500

    # Saturation tracked separately via infrastructure metrics

    [status, headers, response]
  end
end
```

### RED Metrics (Request-oriented)
```ruby
# Rate - Requests per second
# Errors - Number of failed requests
# Duration - Time per request

# Automatically tracked by most APM tools
# Custom implementation:
class REDMetrics
  def self.track(controller, action, duration, status)
    tags = ["controller:#{controller}", "action:#{action}"]

    StatsD.increment('request.rate', tags: tags)
    StatsD.increment('request.errors', tags: tags) if status >= 400
    StatsD.timing('request.duration', duration, tags: tags)
  end
end
```

### Distributed Tracing
```ruby
# Using OpenTelemetry
require 'opentelemetry/sdk'
require 'opentelemetry/instrumentation/all'

OpenTelemetry::SDK.configure do |c|
  c.service_name = 'myapp'
  c.use_all # Auto-instrument Rails, Redis, PostgreSQL, HTTP
end

# Custom spans
def process_order(order)
  tracer = OpenTelemetry.tracer_provider.tracer('order-processor')

  tracer.in_span('process_order') do |span|
    span.set_attribute('order.id', order.id)
    span.set_attribute('order.total', order.total)

    # Processing logic
    charge_payment(order)
    send_confirmation(order)
  end
end
```

## Performance Targets

### Application
- P95 response time < 500ms
- P99 response time < 1s
- Error rate < 0.1%
- Uptime > 99.9%

### Infrastructure
- CPU utilization < 70% (sustained)
- Memory usage < 80%
- Disk usage < 80%
- Database connections < 80% of pool

### Business Metrics
- Time to detection (TTD) < 5 minutes
- Time to resolution (TTR) < 30 minutes
- Alert fatigue: < 5 false positives per week

## Troubleshooting Guide

### High Error Rate
```bash
# 1. Check error logs
tail -f log/production.log | grep ERROR

# 2. Check Sentry/error tracker for patterns
# 3. Verify external service status
# 4. Check recent deployments
gh run list --limit 5

# 5. Review metrics for correlation
```

### Slow Response Times
```bash
# 1. Check APM for slow transactions
# 2. Review database query performance
# 3. Check for N+1 queries
# 4. Verify cache hit rates
# 5. Check external API latency
```

### High Memory Usage
```bash
# 1. Check for memory leaks
# 2. Review background job memory usage
# 3. Check for large object allocations
# 4. Verify garbage collection metrics
# 5. Consider scaling horizontally
```

---

**Remember:** Observability is not optional - it's the foundation of reliable systems. Invest early in comprehensive monitoring, logging, and alerting to enable fast detection and resolution of issues.
