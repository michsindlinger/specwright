# Security Guidance Skill

> Skill: Security Guidance
> Role: Architect
> Created: 2026-01-09
> Version: 1.0.0

## Purpose

Provides security expertise and guidance across all aspects of application development. Identifies vulnerabilities, recommends security best practices, and ensures secure architecture and implementation patterns.

## When to Activate This Skill

**Trigger Conditions:**
- Authentication/authorization design
- Data handling and storage decisions
- API security review
- Third-party integration security
- Security vulnerability assessment
- Compliance requirements (GDPR, HIPAA, etc.)
- Incident response planning

**Context Signals:**
- "Is this secure?"
- "How should we handle sensitive data?"
- "Security review needed"
- "Authentication design"
- "Authorization strategy"
- "Encryption requirements"

## Core Capabilities

### 1. Security Architecture
- Design authentication systems
- Plan authorization strategies
- Implement security layers (defense in depth)
- Design secure data flows
- Plan encryption strategies

### 2. Vulnerability Detection
- Identify common security vulnerabilities
- Review code for security issues
- Assess third-party dependencies
- Evaluate API security
- Check for OWASP Top 10 vulnerabilities

### 3. Data Protection
- Design data encryption strategies
- Plan secure storage solutions
- Implement privacy protections
- Handle PII (Personally Identifiable Information)
- Plan data retention and deletion

### 4. Compliance & Standards
- GDPR compliance guidance
- HIPAA requirements (if applicable)
- PCI DSS for payment data
- Industry-specific regulations
- Security audit preparation

## [TECH_STACK_SPECIFIC] Best Practices

### Authentication
[TECH_STACK_SPECIFIC]
- **Session Management**: [Framework session handling]
- **Password Storage**: [Hashing algorithm and configuration]
- **Multi-Factor Auth**: [MFA implementation approach]
- **OAuth/SSO**: [Third-party auth integration]
- **Token Management**: [JWT or session token handling]

### Authorization
[TECH_STACK_SPECIFIC]
- **Permission System**: [Role-based, attribute-based, etc.]
- **Access Control**: [How to check permissions]
- **Policy Enforcement**: [Where to enforce authorization]
- **Privilege Escalation**: [Admin/sudo mechanisms]

### Input Validation
[TECH_STACK_SPECIFIC]
- **Validation Layer**: [Where validation happens]
- **Sanitization**: [XSS prevention methods]
- **SQL Injection**: [ORM protection mechanisms]
- **File Uploads**: [Safe file handling]
- **API Input**: [Request validation]

### Secure Communication
[TECH_STACK_SPECIFIC]
- **HTTPS Enforcement**: [SSL/TLS configuration]
- **Certificate Management**: [Cert rotation and storage]
- **API Security**: [API key, OAuth, JWT]
- **CORS Configuration**: [Cross-origin policies]
- **CSP Headers**: [Content Security Policy]

### Data Protection
[TECH_STACK_SPECIFIC]
- **Encryption at Rest**: [Database encryption]
- **Encryption in Transit**: [TLS configuration]
- **Sensitive Data**: [PII handling and masking]
- **Secrets Management**: [Environment variables, vaults]
- **Backup Security**: [Secure backup strategies]

## Tools Required

### MCP Servers
[MCP_TOOLS]
<!-- Populated during skill creation based on:
     1. User's installed MCP servers
     2. User's selection for this skill

     Recommended for this skill (examples):
     - security-scanner - Automated vulnerability scanning
     - secrets-detector - Find exposed secrets in code
     - [TECH_STACK_SPECIFIC] - Framework security tools

     Note: Skills work without MCP servers, but functionality may be limited
-->

### Specwright Workflows
- **specwright/workflows/execute-tasks.md** - Execute security improvements and reviews
- **specwright/product/architecture-decision.md** - Security architecture decisions
- **.specwright/specs/[feature]/sub-specs/security-spec.md** - Feature security specs

### External Tools
- Dependency vulnerability scanners
- Static Application Security Testing (SAST)
- Dynamic Application Security Testing (DAST)
- Penetration testing tools
- Security audit logs

## Quality Checklist

### Authentication & Authorization
- [ ] Authentication mechanism is secure and modern
- [ ] Passwords are hashed with strong algorithm (bcrypt, Argon2)
- [ ] Session management is secure (HttpOnly, Secure flags)
- [ ] Authorization checks are on every protected resource
- [ ] Role/permission system is properly implemented

### Data Protection
- [ ] Sensitive data is encrypted at rest
- [ ] All communications use HTTPS/TLS
- [ ] PII is handled according to regulations
- [ ] Secrets are not in source code
- [ ] Database backups are encrypted

### Input Validation
- [ ] All user input is validated
- [ ] SQL injection prevention is in place
- [ ] XSS protection is implemented
- [ ] CSRF tokens are used for state-changing operations
- [ ] File uploads are validated and sanitized

### API Security
- [ ] API authentication is required
- [ ] Rate limiting is implemented
- [ ] CORS is configured appropriately
- [ ] API responses don't leak sensitive data
- [ ] Error messages don't reveal system details

### Dependency Security
- [ ] Dependencies are up to date
- [ ] No known vulnerabilities in dependencies
- [ ] Dependency sources are trusted
- [ ] License compliance is verified
- [ ] Supply chain security is considered

### Logging & Monitoring
- [ ] Security events are logged
- [ ] Sensitive data is not logged
- [ ] Failed login attempts are tracked
- [ ] Anomalous behavior is detected
- [ ] Incident response plan exists

## Integration with Other Skills

### Works Closely With
- **pattern-enforcement** - Security patterns compliance
- **api-designing** - API security architecture
- **data-modeling** - Secure data structure design
- **dependency-checking** - Vulnerability assessment

### Provides Input To
- **Development team** - Security requirements
- **DevOps team** - Infrastructure security
- **Compliance team** - Audit requirements
- **Product team** - Security constraints

### Receives Input From
- **Compliance requirements** - Regulatory needs
- **Security audits** - Vulnerability findings
- **Incident reports** - Real-world attack patterns
- **Threat intelligence** - Emerging security threats

## Examples

### Example 1: Password Storage

**Scenario:** Design secure password storage

**Implementation:**
```
[TECH_STACK_SPECIFIC]

BAD - Plain text or weak hashing:
password = request.POST['password']
user.password = hashlib.md5(password).hexdigest()  # INSECURE!

GOOD - Strong hashing with salt:
from bcrypt import hashpw, gensalt

# Storing password
password = request.POST['password']
user.password_hash = hashpw(password.encode('utf-8'), gensalt(rounds=12))

# Verifying password
def verify_password(user, password):
    return hashpw(password.encode('utf-8'), user.password_hash) == user.password_hash

REQUIREMENTS:
- Use bcrypt, Argon2, or scrypt
- Minimum work factor/rounds: 12 for bcrypt
- Never store plain text passwords
- Salt is handled automatically by bcrypt
- Pepper (secret key) can be added for extra security
```

### Example 2: Authorization Pattern

**Scenario:** Implement resource-level authorization

**Implementation:**
```
[TECH_STACK_SPECIFIC]

# Policy-based authorization
class PostPolicy:
    def __init__(self, user, post):
        self.user = user
        self.post = post

    def can_update(self):
        return (
            self.user.is_admin() or
            self.post.author_id == self.user.id
        )

    def can_delete(self):
        return self.user.is_admin()

# In controller
def update_post(request, post_id):
    post = Post.find(post_id)
    policy = PostPolicy(request.user, post)

    if not policy.can_update():
        return forbidden("You cannot update this post")

    # Proceed with update
    post.update(request.POST)
    return success(post)

PRINCIPLES:
- Check authorization on every protected action
- Centralize authorization logic in policy classes
- Fail closed (deny by default)
- Log authorization failures
- Don't leak resource existence in error messages
```

### Example 3: API Security Headers

**Scenario:** Configure security headers for API responses

**Implementation:**
```
[TECH_STACK_SPECIFIC]

# Security headers middleware
SECURITY_HEADERS = {
    # Prevent clickjacking
    'X-Frame-Options': 'DENY',

    # XSS Protection
    'X-Content-Type-Options': 'nosniff',
    'X-XSS-Protection': '1; mode=block',

    # Content Security Policy
    'Content-Security-Policy': "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'",

    # Force HTTPS
    'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',

    # Referrer Policy
    'Referrer-Policy': 'strict-origin-when-cross-origin',

    # Permissions Policy
    'Permissions-Policy': 'geolocation=(), microphone=(), camera=()'
}

# CORS Configuration
CORS_CONFIG = {
    'allowed_origins': ['https://app.example.com'],
    'allowed_methods': ['GET', 'POST', 'PUT', 'DELETE'],
    'allowed_headers': ['Content-Type', 'Authorization'],
    'expose_headers': ['X-Request-ID'],
    'max_age': 3600,
    'allow_credentials': True
}
```

### Example 4: Sensitive Data Handling

**Scenario:** Handle and store PII securely

**Implementation:**
```
[TECH_STACK_SPECIFIC]

# Encrypt sensitive fields
class User:
    # Public fields
    id = Column(Integer, primary_key=True)
    email = Column(String, unique=True)

    # Encrypted fields
    ssn_encrypted = Column(LargeBinary)
    phone_encrypted = Column(LargeBinary)

    @property
    def ssn(self):
        if self.ssn_encrypted:
            return decrypt(self.ssn_encrypted)
        return None

    @ssn.setter
    def ssn(self, value):
        self.ssn_encrypted = encrypt(value)

    # Masking for logs/display
    def masked_ssn(self):
        if self.ssn:
            return f"***-**-{self.ssn[-4:]}"
        return None

# Logging - never log sensitive data
def log_user_action(user, action):
    logger.info(f"User {user.id} performed {action}")
    # DON'T: logger.info(f"User {user.email} SSN:{user.ssn}")

# Database queries - use parameterized queries
# GOOD:
User.query.filter(User.email == email).first()

# BAD (SQL Injection risk):
db.execute(f"SELECT * FROM users WHERE email = '{email}'")

PRINCIPLES:
- Encrypt PII at rest
- Mask/redact in logs and error messages
- Minimize PII collection (data minimization)
- Implement right to deletion (GDPR)
- Use parameterized queries always
- Audit access to sensitive data
```

### Example 5: Secrets Management

**Scenario:** Securely manage API keys and credentials

**Implementation:**
```
[TECH_STACK_SPECIFIC]

# Environment-based secrets (development)
# .env (NOT in version control)
DATABASE_URL=postgresql://user:pass@localhost/db
API_KEY=sk_live_abc123xyz
JWT_SECRET=random-secret-string-here

# Code
import os
api_key = os.environ.get('API_KEY')

# Production secrets management
# Use cloud provider secret managers:
# - AWS Secrets Manager
# - Google Cloud Secret Manager
# - Azure Key Vault
# - HashiCorp Vault

# Accessing secrets in production
from cloud_secrets import get_secret

api_key = get_secret('api-key')

CHECKLIST:
✗ Never commit secrets to git
✗ Never hardcode secrets in code
✗ Never log secrets
✓ Use environment variables in development
✓ Use secret managers in production
✓ Rotate secrets regularly
✓ Use different secrets per environment
✓ Audit secret access
✓ Encrypt secrets at rest

# .gitignore
.env
.env.*
secrets/
credentials.json
*.pem
*.key
```

## Skill Activation Flow

```
1. IDENTIFY: Security requirements and constraints
2. ASSESS: Current implementation or design
3. ANALYZE: Potential vulnerabilities and risks
4. RECOMMEND: Security improvements and best practices
5. PRIORITIZE: Risks by severity and likelihood
6. DOCUMENT: Security decisions and rationale
7. VALIDATE: Implementation against security standards
8. MONITOR: Ongoing security posture
```

## Success Metrics

- Zero critical security vulnerabilities in production
- Compliance with relevant regulations
- Secure authentication and authorization
- Encrypted sensitive data
- No secrets in source code
- Security incidents detected and resolved quickly
- Team awareness of security best practices

## Notes

- Security is everyone's responsibility, not just the architect's
- Defense in depth - multiple layers of security
- Fail secure - deny by default, allow explicitly
- Principle of least privilege - minimum necessary access
- Keep security simple - complexity is the enemy of security
- Stay updated on emerging threats and vulnerabilities
- Security is a continuous process, not a one-time task
- Balance security with usability - overly restrictive security fails
