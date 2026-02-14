# Technical Stack: [PROJECT_NAME]

> Version: 1.0
> Created: [DATE]
> Last Updated: [DATE]

---

## Overview

[BRIEF_DESCRIPTION_OF_TECHNICAL_APPROACH]

---

## Core Technologies

### Backend

| Category | Technology | Version | Rationale |
|----------|------------|---------|-----------|
| Language | [LANGUAGE] | [VERSION] | [WHY] |
| Framework | [FRAMEWORK] | [VERSION] | [WHY] |
| ORM/Data Access | [ORM] | [VERSION] | [WHY] |
| API Style | [REST/GRAPHQL/GRPC] | - | [WHY] |

### Frontend

| Category | Technology | Version | Rationale |
|----------|------------|---------|-----------|
| Framework | [FRAMEWORK] | [VERSION] | [WHY] |
| Language | [TYPESCRIPT/JAVASCRIPT] | [VERSION] | [WHY] |
| Build Tool | [VITE/WEBPACK/ETC] | [VERSION] | [WHY] |
| CSS Framework | [TAILWIND/ETC] | [VERSION] | [WHY] |
| UI Components | [LIBRARY] | [VERSION] | [WHY] |

### Database

| Category | Technology | Version | Rationale |
|----------|------------|---------|-----------|
| Primary Database | [DATABASE] | [VERSION] | [WHY] |
| Cache | [REDIS/MEMCACHED] | [VERSION] | [WHY] |
| Search | [ELASTICSEARCH/ALGOLIA] | [VERSION] | [WHY] |
| File Storage | [S3/GCS/ETC] | - | [WHY] |

---

## Infrastructure

### Hosting & Deployment

| Category | Service/Tool | Details |
|----------|--------------|---------|
| Application Hosting | [PROVIDER] | [REGION/TIER] |
| Database Hosting | [PROVIDER] | [TIER] |
| CDN | [PROVIDER] | [CONFIGURATION] |
| DNS | [PROVIDER] | - |
| SSL/TLS | [PROVIDER] | [AUTO/MANUAL] |

### CI/CD

| Category | Tool | Configuration |
|----------|------|---------------|
| CI Platform | [GITHUB_ACTIONS/GITLAB_CI/ETC] | [FILE_PATH] |
| Container Registry | [DOCKER_HUB/ECR/GCR] | - |
| Deployment Strategy | [BLUE_GREEN/ROLLING/ETC] | - |

### Monitoring & Observability

| Category | Tool | Purpose |
|----------|------|---------|
| APM | [DATADOG/NEW_RELIC/ETC] | Performance monitoring |
| Logging | [ELK/CLOUDWATCH/ETC] | Log aggregation |
| Error Tracking | [SENTRY/BUGSNAG/ETC] | Error reporting |
| Uptime | [PINGDOM/UPTIMEROBOT/ETC] | Availability monitoring |

---

## Development Environment

### Local Setup

| Tool | Version | Purpose |
|------|---------|---------|
| Node.js | [VERSION] | JavaScript runtime |
| Package Manager | [NPM/YARN/PNPM] | Dependency management |
| Docker | [VERSION] | Containerization |
| [DATABASE] | [VERSION] | Local database |

### IDE & Tools

| Tool | Extensions/Plugins |
|------|-------------------|
| IDE | [VSCODE/CURSOR/ETC] |
| Linter | [ESLINT/RUBOCOP/ETC] |
| Formatter | [PRETTIER/ETC] |
| Git Hooks | [HUSKY/LEFTHOOK/ETC] |

---

## Testing Stack

| Test Type | Framework | Coverage Target |
|-----------|-----------|-----------------|
| Unit Tests | [JEST/PYTEST/ETC] | [X]% |
| Integration Tests | [FRAMEWORK] | [X]% |
| E2E Tests | [CYPRESS/PLAYWRIGHT/ETC] | Critical paths |
| API Tests | [POSTMAN/INSOMNIA/ETC] | All endpoints |

---

## Security

### Authentication & Authorization

| Aspect | Approach |
|--------|----------|
| Authentication | [JWT/SESSION/OAUTH] |
| Authorization | [RBAC/ABAC/ETC] |
| Password Hashing | [BCRYPT/ARGON2] |
| MFA | [TOTP/SMS/WEBAUTHN] |

### Security Tools

| Category | Tool |
|----------|------|
| Dependency Scanning | [DEPENDABOT/SNYK] |
| SAST | [SEMGREP/SONARQUBE] |
| Secret Detection | [GITLEAKS/TRUFFLEHOG] |

---

## Third-Party Services

| Service | Provider | Purpose |
|---------|----------|---------|
| Email | [SENDGRID/SES/ETC] | Transactional email |
| SMS | [TWILIO/ETC] | Notifications |
| Payments | [STRIPE/ETC] | Payment processing |
| Analytics | [GA4/MIXPANEL/ETC] | User analytics |
| [OTHER] | [PROVIDER] | [PURPOSE] |

---

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────┐
│                        Client                            │
│  ┌─────────────────────────────────────────────────┐    │
│  │              [FRONTEND_FRAMEWORK]                │    │
│  └─────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────┐
│                     CDN / Load Balancer                  │
└─────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────┐
│                     API Gateway                          │
└─────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────┐
│                   Application Server                     │
│  ┌─────────────────────────────────────────────────┐    │
│  │              [BACKEND_FRAMEWORK]                 │    │
│  └─────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────┘
                            │
              ┌─────────────┼─────────────┐
              ▼             ▼             ▼
        ┌──────────┐  ┌──────────┐  ┌──────────┐
        │ Database │  │  Cache   │  │  Storage │
        └──────────┘  └──────────┘  └──────────┘
```

---

## Version Management

### Versioning Strategy

- **Application:** Semantic Versioning (MAJOR.MINOR.PATCH)
- **API:** URL versioning (/api/v1/)
- **Database Migrations:** Sequential numbering

### Supported Versions

| Component | Current | Minimum Supported |
|-----------|---------|-------------------|
| [COMPONENT_1] | [CURRENT] | [MIN] |
| [COMPONENT_2] | [CURRENT] | [MIN] |

---

## Performance Targets

| Metric | Target | Measurement |
|--------|--------|-------------|
| Page Load Time | < [X]s | Lighthouse |
| API Response Time | < [X]ms (p95) | APM |
| Uptime | [X]% | Monitoring |
| Error Rate | < [X]% | Error tracking |

---

## Notes & Decisions

### Why [TECHNOLOGY_1]?

[REASONING_FOR_CHOICE]

### Why Not [ALTERNATIVE]?

[REASONING_AGAINST_ALTERNATIVE]

---

## References

- [DOCUMENTATION_LINK_1]
- [DOCUMENTATION_LINK_2]
- Architecture Decision Records: @specwright/product/architecture-decision.md
