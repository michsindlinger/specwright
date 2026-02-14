# Security Hardening Skill

> Template for Security Specialists (HTTPS, Secrets, Scanning)
> Version: 1.0.0
> Created: 2026-01-09

## Skill Purpose

Implement comprehensive security measures including HTTPS/TLS, secrets management, vulnerability scanning, authentication hardening, and compliance with security best practices.

## When to Activate This Skill

**Activate when:**
- Setting up SSL/TLS certificates
- Configuring secrets management
- Implementing security headers
- Running security audits
- Hardening authentication
- Compliance requirements (GDPR, HIPAA)
- Responding to security vulnerabilities
- Conducting penetration testing prep

**Delegation from main agent:**
```
@agent:[AGENT_NAME] "Set up SSL certificates and HTTPS redirect"
@agent:[AGENT_NAME] "Implement secrets management with environment variables"
@agent:[AGENT_NAME] "Add security scanning to CI/CD pipeline"
@agent:[AGENT_NAME] "Configure security headers and CSP"
```

## Core Capabilities

### HTTPS/TLS Management
- SSL certificate provisioning (Let's Encrypt)
- TLS 1.3 configuration
- HTTPS enforcement and redirects
- Certificate renewal automation
- HSTS (HTTP Strict Transport Security)
- Certificate pinning (mobile apps)

### Secrets Management
- Environment variable encryption
- Secret rotation policies
- Vault integration
- Database credential rotation
- API key management
- Avoiding secrets in code/logs

### Vulnerability Scanning
- Dependency scanning (Bundler Audit, npm audit)
- Container image scanning
- Static code analysis (Brakeman)
- Dynamic application security testing (DAST)
- License compliance checking

### Application Hardening
- Security headers (CSP, X-Frame-Options)
- SQL injection prevention
- XSS protection
- CSRF tokens
- Rate limiting
- Input validation and sanitization

### Authentication & Authorization
- Strong password policies
- Multi-factor authentication (MFA)
- Session management
- OAuth/OIDC integration
- Role-based access control (RBAC)
- JWT security

## [TECH_STACK_SPECIFIC] Security Configurations

### Rails Security Best Practices

**Force SSL:**
```ruby
# config/environments/production.rb
Rails.application.configure do
  # Force all access to the app over SSL
  config.force_ssl = true

  # Use HSTS with subdomains and preloading
  config.ssl_options = {
    hsts: {
      expires: 1.year,
      subdomains: true,
      preload: true
    }
  }
end
```

**Security Headers:**
```ruby
# config/initializers/security_headers.rb
Rails.application.config.action_dispatch.default_headers.merge!(
  'X-Frame-Options' => 'DENY',
  'X-Content-Type-Options' => 'nosniff',
  'X-XSS-Protection' => '1; mode=block',
  'Referrer-Policy' => 'strict-origin-when-cross-origin',
  'Permissions-Policy' => 'geolocation=(), microphone=(), camera=()'
)

# Content Security Policy
Rails.application.configure do
  config.content_security_policy do |policy|
    policy.default_src :self, :https
    policy.font_src    :self, :https, :data
    policy.img_src     :self, :https, :data
    policy.object_src  :none
    policy.script_src  :self, :https
    policy.style_src   :self, :https

    # Report violations
    policy.report_uri "/csp-violation-report"
  end

  # Generate nonce for inline scripts
  config.content_security_policy_nonce_generator = ->(request) {
    SecureRandom.base64(16)
  }

  # Report-only mode for testing
  # config.content_security_policy_report_only = true
end
```

**Secure Cookies:**
```ruby
# config/initializers/session_store.rb
Rails.application.config.session_store :cookie_store,
  key: '_myapp_session',
  secure: Rails.env.production?,  # Only send over HTTPS
  httponly: true,                 # Not accessible via JavaScript
  same_site: :lax,                # CSRF protection
  expire_after: 24.hours

# config/initializers/devise.rb (if using Devise)
Devise.setup do |config|
  config.rememberable_options = {
    secure: true,
    httponly: true,
    same_site: :lax
  }

  # Timeout inactive sessions
  config.timeout_in = 30.minutes

  # Require password confirmation for sensitive actions
  config.paranoid = true

  # Strong password requirements
  config.password_length = 12..128
end
```

**Parameter Filtering:**
```ruby
# config/initializers/filter_parameter_logging.rb
Rails.application.config.filter_parameters += [
  :password,
  :password_confirmation,
  :current_password,
  :secret,
  :token,
  :api_key,
  :private_key,
  :ssn,
  :credit_card,
  /api[_-]?key/i,
  /secret/i,
  /token/i
]
```

**SQL Injection Prevention:**
```ruby
# GOOD - Parameterized queries
User.where('email = ?', params[:email])
User.where(email: params[:email])

# BAD - String interpolation (vulnerable)
# User.where("email = '#{params[:email]}'")  # NEVER DO THIS

# GOOD - Safe dynamic queries
User.where(params[:filters].permit(:email, :status))

# ActiveRecord automatically escapes
User.find_by(email: user_input)
```

**Mass Assignment Protection:**
```ruby
# app/controllers/users_controller.rb
class UsersController < ApplicationController
  def create
    @user = User.new(user_params)
    # ...
  end

  private

  def user_params
    # Whitelist only allowed attributes
    params.require(:user).permit(:name, :email, :password, :password_confirmation)
    # Never permit :admin, :role, or sensitive fields without explicit checks
  end
end
```

### Secrets Management

**Environment Variables (12-Factor):**
```ruby
# .env (NEVER commit this file)
DATABASE_URL=postgresql://user:password@localhost/myapp
SECRET_KEY_BASE=your_secret_key_here
AWS_ACCESS_KEY_ID=your_aws_key
AWS_SECRET_ACCESS_KEY=your_aws_secret
STRIPE_SECRET_KEY=sk_test_xxxxx

# .env.example (commit this template)
DATABASE_URL=postgresql://user:password@localhost/myapp
SECRET_KEY_BASE=generate_with_rails_secret
AWS_ACCESS_KEY_ID=your_aws_key
AWS_SECRET_ACCESS_KEY=your_aws_secret
STRIPE_SECRET_KEY=sk_test_xxxxx

# .gitignore
.env
.env.local
.env.*.local
config/master.key
config/credentials/*.key

# Load with dotenv gem (development/test only)
# Gemfile
group :development, :test do
  gem 'dotenv-rails'
end
```

**Rails Encrypted Credentials:**
```bash
# Generate master key (keep this secret!)
rails credentials:edit

# credentials.yml.enc (safe to commit)
aws:
  access_key_id: YOUR_ACCESS_KEY
  secret_access_key: YOUR_SECRET_KEY

stripe:
  publishable_key: pk_live_xxxxx
  secret_key: sk_live_xxxxx

database:
  password: secure_password

# Access in code
Rails.application.credentials.aws[:access_key_id]
Rails.application.credentials.stripe[:secret_key]

# Environment-specific credentials
rails credentials:edit --environment production
Rails.application.credentials.database[:password]
```

**GitHub Secrets (for CI/CD):**
```yaml
# .github/workflows/ci.yml
jobs:
  deploy:
    steps:
      - name: Deploy
        env:
          DATABASE_URL: ${{ secrets.DATABASE_URL }}
          SECRET_KEY_BASE: ${{ secrets.SECRET_KEY_BASE }}
          AWS_ACCESS_KEY_ID: ${{ secrets.AWS_ACCESS_KEY_ID }}
          AWS_SECRET_ACCESS_KEY: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
        run: |
          # Deployment commands
```

**HashiCorp Vault (Enterprise):**
```ruby
# Gemfile
gem 'vault'

# config/initializers/vault.rb
Vault.configure do |config|
  config.address = ENV['VAULT_ADDR']
  config.token = ENV['VAULT_TOKEN']
  config.ssl_verify = true
end

# Usage
class SecretService
  def self.database_password
    Vault.logical.read('secret/data/myapp/database')&.data&.dig(:data, :password)
  end

  def self.api_key(service)
    Vault.logical.read("secret/data/myapp/#{service}")&.data&.dig(:data, :api_key)
  end
end

# Use in database.yml
production:
  url: <%= "postgresql://user:#{SecretService.database_password}@host/db" %>
```

### Vulnerability Scanning

**Bundler Audit (Ruby Dependencies):**
```bash
# Install
gem install bundler-audit

# Update vulnerability database
bundle audit update

# Scan for vulnerabilities
bundle audit check

# CI Integration
# .github/workflows/security.yml
name: Security Scan

on: [push, pull_request]

jobs:
  bundle-audit:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Set up Ruby
        uses: ruby/setup-ruby@v1
        with:
          ruby-version: 3.2
          bundler-cache: true

      - name: Run Bundler Audit
        run: |
          gem install bundler-audit
          bundle audit update
          bundle audit check
```

**npm Audit (JavaScript Dependencies):**
```bash
# Scan for vulnerabilities
npm audit

# Fix automatically
npm audit fix

# CI Integration
# .github/workflows/security.yml
- name: Run npm audit
  run: npm audit --audit-level=moderate
```

**Brakeman (Rails Static Analysis):**
```bash
# Install
gem install brakeman

# Scan application
brakeman

# Generate report
brakeman -o brakeman-report.html

# CI Integration
- name: Run Brakeman
  run: |
    gem install brakeman
    brakeman --no-pager --quiet --exit-on-warn
```

**Container Scanning (Trivy):**
```yaml
# .github/workflows/container-security.yml
name: Container Security

on: [push]

jobs:
  trivy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Build Docker image
        run: docker build -t myapp:${{ github.sha }} .

      - name: Run Trivy scanner
        uses: aquasecurity/trivy-action@master
        with:
          image-ref: myapp:${{ github.sha }}
          format: 'sarif'
          output: 'trivy-results.sarif'
          severity: 'CRITICAL,HIGH'

      - name: Upload Trivy results
        uses: github/codeql-action/upload-sarif@v2
        with:
          sarif_file: 'trivy-results.sarif'
```

**OWASP Dependency Check:**
```yaml
# .github/workflows/owasp.yml
- name: OWASP Dependency Check
  uses: dependency-check/Dependency-Check_Action@main
  with:
    project: 'myapp'
    path: '.'
    format: 'HTML'
```

### HTTPS/SSL Configuration

**Let's Encrypt (Free SSL):**
```bash
# DigitalOcean App Platform
# - Automatically provisions Let's Encrypt certificates
# - Auto-renewal every 90 days
# - No configuration needed

# Manual Certbot (for custom setups)
sudo certbot certonly --standalone -d example.com -d www.example.com

# Auto-renewal cron
0 0 * * * certbot renew --quiet
```

**Nginx SSL Configuration:**
```nginx
# /etc/nginx/sites-available/myapp
server {
  listen 80;
  server_name example.com www.example.com;

  # Redirect all HTTP to HTTPS
  return 301 https://$server_name$request_uri;
}

server {
  listen 443 ssl http2;
  server_name example.com www.example.com;

  # SSL certificates
  ssl_certificate /etc/letsencrypt/live/example.com/fullchain.pem;
  ssl_certificate_key /etc/letsencrypt/live/example.com/privkey.pem;

  # SSL configuration
  ssl_protocols TLSv1.2 TLSv1.3;
  ssl_ciphers 'ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256';
  ssl_prefer_server_ciphers off;

  # HSTS
  add_header Strict-Transport-Security "max-age=31536000; includeSubDomains; preload" always;

  # Security headers
  add_header X-Frame-Options "DENY" always;
  add_header X-Content-Type-Options "nosniff" always;
  add_header X-XSS-Protection "1; mode=block" always;
  add_header Referrer-Policy "strict-origin-when-cross-origin" always;

  # Application proxy
  location / {
    proxy_pass http://localhost:3000;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
  }
}
```

**Test SSL Configuration:**
```bash
# SSL Labs test
# https://www.ssllabs.com/ssltest/analyze.html?d=example.com

# Command line test
openssl s_client -connect example.com:443 -servername example.com

# Check certificate expiration
echo | openssl s_client -connect example.com:443 2>/dev/null | \
  openssl x509 -noout -dates
```

### Rate Limiting & DDoS Protection

**Rack Attack:**
```ruby
# Gemfile
gem 'rack-attack'

# config/initializers/rack_attack.rb
class Rack::Attack
  # Throttle login attempts
  throttle('logins/ip', limit: 5, period: 20.seconds) do |req|
    if req.path == '/users/sign_in' && req.post?
      req.ip
    end
  end

  # Throttle API requests
  throttle('api/ip', limit: 100, period: 1.hour) do |req|
    req.ip if req.path.start_with?('/api')
  end

  # Block suspicious requests
  blocklist('block bad actors') do |req|
    # Block IPs from file
    File.read('config/blocklist.txt').split("\n").include?(req.ip)
  end

  # Safelist trusted IPs
  safelist('allow from localhost') do |req|
    '127.0.0.1' == req.ip || '::1' == req.ip
  end

  # Track suspicious activity
  track('suspicious activity', limit: 10, period: 1.hour) do |req|
    req.ip if req.path.include?('admin') && !req.authorized?
  end
end

# Handle throttled requests
Rack::Attack.throttled_responder = lambda do |env|
  [429, {'Content-Type' => 'application/json'}, [{
    error: 'Rate limit exceeded',
    retry_after: env['rack.attack.match_data'][:period]
  }.to_json]]
end

# config/application.rb
config.middleware.use Rack::Attack
```

**CloudFlare (DDoS Protection):**
```
1. Add domain to CloudFlare
2. Update nameservers
3. Enable:
   - DDoS protection (automatic)
   - WAF (Web Application Firewall)
   - Rate limiting rules
   - Bot fight mode
   - SSL/TLS encryption (Full Strict)
```

### Authentication Hardening

**Password Requirements:**
```ruby
# app/models/user.rb
class User < ApplicationRecord
  validates :password,
    length: { minimum: 12 },
    format: {
      with: /\A(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])/,
      message: 'must include uppercase, lowercase, number, and special character'
    }

  # Check against common passwords
  validate :password_not_common

  private

  def password_not_common
    common = File.read('config/common_passwords.txt').split("\n")
    if common.include?(password)
      errors.add(:password, 'is too common')
    end
  end
end
```

**Multi-Factor Authentication (Devise + OTP):**
```ruby
# Gemfile
gem 'devise-two-factor'
gem 'rqrcode'

# User model
class User < ApplicationRecord
  devise :two_factor_authenticatable,
         :otp_secret_encryption_key => ENV['OTP_SECRET_KEY']

  has_one_time_password
end

# Controller
class Users::TwoFactorController < ApplicationController
  def verify
    if current_user.validate_and_consume_otp!(params[:otp_attempt])
      sign_in(current_user)
      redirect_to root_path
    else
      flash[:error] = 'Invalid code'
      render :show
    end
  end
end
```

**OAuth Integration (Google, GitHub):**
```ruby
# Gemfile
gem 'omniauth-google-oauth2'
gem 'omniauth-github'
gem 'omniauth-rails_csrf_protection'

# config/initializers/devise.rb
config.omniauth :google_oauth2,
  ENV['GOOGLE_CLIENT_ID'],
  ENV['GOOGLE_CLIENT_SECRET'],
  scope: 'email,profile'

config.omniauth :github,
  ENV['GITHUB_CLIENT_ID'],
  ENV['GITHUB_CLIENT_SECRET'],
  scope: 'user:email'
```

## Tools Required

### MCP Servers
[MCP_TOOLS]
<!-- Populated during skill creation based on:
     1. User's installed MCP servers
     2. User's selection for this skill

     Recommended for this skill (examples):
     - Security scanning services (Snyk, Trivy)
     - Secret management (HashiCorp Vault, AWS Secrets Manager)
     - Certificate management (Let's Encrypt, cert-manager)
     - Vulnerability databases (CVE, NIST)

     Note: Skills work without MCP servers, but functionality may be limited
-->

### Security Scanning
```bash
# Ruby/Rails
gem install bundler-audit
gem install brakeman

# JavaScript
npm install -g snyk

# Container scanning
brew install trivy

# SSL testing
brew install testssl
```

### Secret Management
```bash
# HashiCorp Vault
brew install vault

# SOPS (encrypted files)
brew install sops

# Git-secret
brew install git-secret
```

### Monitoring
```bash
# GitHub Security Advisories
gh api repos/owner/repo/vulnerability-alerts

# OWASP ZAP (penetration testing)
brew install --cask owasp-zap
```

## Quality Checklist

### HTTPS/TLS
- [ ] SSL certificate provisioned
- [ ] Auto-renewal configured
- [ ] HTTP redirects to HTTPS
- [ ] HSTS header enabled
- [ ] TLS 1.2+ only
- [ ] Strong cipher suites
- [ ] Certificate chain complete
- [ ] SSL Labs rating A+

### Secrets Management
- [ ] No secrets in code
- [ ] No secrets in version control
- [ ] Secrets in environment variables
- [ ] Production secrets encrypted
- [ ] Secret rotation policy defined
- [ ] Access to secrets logged
- [ ] Developers use local .env files
- [ ] CI/CD uses secure secret stores

### Vulnerability Scanning
- [ ] Bundler audit in CI
- [ ] npm audit in CI
- [ ] Brakeman scan on every PR
- [ ] Container image scanning
- [ ] Dependency updates automated (Dependabot)
- [ ] Security advisories monitored
- [ ] Vulnerability SLA defined
- [ ] License compliance checked

### Application Security
- [ ] Force SSL in production
- [ ] Security headers configured
- [ ] CSP policy defined
- [ ] CSRF protection enabled
- [ ] XSS protection enabled
- [ ] SQL injection prevention
- [ ] Mass assignment protection
- [ ] Rate limiting implemented
- [ ] Input validation comprehensive
- [ ] Output encoding proper

### Authentication
- [ ] Strong password requirements
- [ ] Password hashing (bcrypt)
- [ ] MFA available/required
- [ ] Session timeout configured
- [ ] Account lockout after failed attempts
- [ ] Password reset secure
- [ ] OAuth integration secure
- [ ] Remember me cookies secure

### Authorization
- [ ] Role-based access control
- [ ] Principle of least privilege
- [ ] Authorization checks in controllers
- [ ] Authorization checks in views
- [ ] Direct object reference protection
- [ ] Admin panel access restricted

### Logging & Monitoring
- [ ] Failed login attempts logged
- [ ] Privileged actions logged
- [ ] Security events alerted
- [ ] Audit trail maintained
- [ ] Sensitive data not logged
- [ ] Log tampering prevented

## Security Incident Response

### Preparation
```markdown
1. Document security contact info
2. Define severity levels
3. Create runbooks for common incidents
4. Set up secure communication channel
5. Maintain updated dependency inventory
```

### Detection
```markdown
1. Monitor security alerts
2. Review logs regularly
3. Track failed authentication attempts
4. Monitor for anomalous behavior
5. Subscribe to security advisories
```

### Response
```markdown
1. Assess severity and impact
2. Contain the incident
3. Eradicate the vulnerability
4. Recover services
5. Document lessons learned
6. Notify affected users (if required)
```

## Compliance Considerations

### GDPR
- [ ] Data encryption at rest and in transit
- [ ] Right to be forgotten (data deletion)
- [ ] Data export capability
- [ ] Privacy policy published
- [ ] Cookie consent
- [ ] Data processing agreements

### HIPAA (Healthcare)
- [ ] BAA with cloud providers
- [ ] Audit logging
- [ ] Access controls
- [ ] Data encryption
- [ ] Regular security assessments

### PCI-DSS (Payment Processing)
- [ ] Never store CVV
- [ ] Tokenize card numbers
- [ ] Use PCI-compliant payment gateway
- [ ] Regular vulnerability scans
- [ ] Firewall configuration

## Performance vs Security Trade-offs

```
Security measure          | Performance impact | Priority
--------------------------|-------------------|----------
Force SSL                 | Minimal           | Critical
HSTS                      | None              | Critical
Security headers          | None              | Critical
CSP                       | Minimal           | High
Rate limiting             | Minimal           | High
Session encryption        | Low               | High
Database query encryption | Medium            | Medium
Full disk encryption      | Medium            | Medium
```

---

**Remember:** Security is not a feature to add later - it must be built in from day one. Regular audits, updates, and education are essential to maintaining a secure application.
