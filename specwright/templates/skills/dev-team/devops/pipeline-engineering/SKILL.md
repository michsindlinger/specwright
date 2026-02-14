# Pipeline Engineering Skill

> Template for CI/CD Pipeline Specialists
> Version: 1.0.0
> Created: 2026-01-09

## Skill Purpose

Design, implement, and maintain CI/CD pipelines that automate testing, building, and deployment processes with zero-downtime strategies and comprehensive quality gates.

## When to Activate This Skill

**Activate when:**
- Setting up new project CI/CD workflows
- Migrating between CI/CD platforms
- Implementing deployment automation
- Adding quality gates to pipelines
- Optimizing build/deploy performance
- Troubleshooting pipeline failures
- Implementing multi-environment deployments

**Delegation from main agent:**
```
@agent:[AGENT_NAME] "Set up GitHub Actions pipeline with staging and production deployments"
@agent:[AGENT_NAME] "Add automated testing and linting to CI pipeline"
@agent:[AGENT_NAME] "Implement blue-green deployment strategy"
```

## Core Capabilities

### Pipeline Design
- Multi-stage workflows (test, build, deploy)
- Parallel job execution for speed
- Conditional execution based on branch/tag
- Cache strategies for dependencies
- Artifact management and versioning

### Quality Gates
- Automated test execution (unit, integration, e2e)
- Code coverage requirements
- Linting and security scanning
- Build artifact validation
- Deployment smoke tests

### Deployment Strategies
- Blue-green deployments
- Rolling updates
- Canary releases
- Feature flag integration
- Rollback mechanisms

### Platform Integration
- Cloud provider authentication
- Container registry management
- Database migration execution
- Environment variable management
- Secret rotation and injection

## [TECH_STACK_SPECIFIC] Platform Configurations

### GitHub Actions (Recommended)

**Workflow Structure:**
```yaml
name: CI/CD Pipeline

on:
  push:
    branches: [main, staging]
  pull_request:
    branches: [main]

env:
  RUBY_VERSION: '3.2'
  NODE_VERSION: '22'

jobs:
  test:
    runs-on: ubuntu-latest

    services:
      postgres:
        image: postgres:17
        env:
          POSTGRES_PASSWORD: postgres
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
        ports:
          - 5432:5432

    steps:
      - uses: actions/checkout@v4

      - name: Set up Ruby
        uses: ruby/setup-ruby@v1
        with:
          ruby-version: ${{ env.RUBY_VERSION }}
          bundler-cache: true

      - name: Set up Node.js
        uses: actions/setup-node@v4
        with:
          node-version: ${{ env.NODE_VERSION }}
          cache: 'npm'

      - name: Install dependencies
        run: |
          bundle install
          npm ci

      - name: Run linters
        run: |
          bundle exec rubocop
          npm run lint

      - name: Run tests
        env:
          DATABASE_URL: postgres://postgres:postgres@localhost:5432/test
          RAILS_ENV: test
        run: |
          bundle exec rails db:setup
          bundle exec rails test
          bundle exec rails test:system

      - name: Check code coverage
        run: bundle exec rails test:coverage

  build:
    needs: test
    runs-on: ubuntu-latest
    if: github.event_name == 'push'

    steps:
      - uses: actions/checkout@v4

      - name: Build assets
        run: |
          npm ci
          npm run build

      - name: Upload artifacts
        uses: actions/upload-artifact@v4
        with:
          name: build-assets
          path: public/assets
          retention-days: 7

  deploy-staging:
    needs: build
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/staging'
    environment:
      name: staging
      url: https://staging.example.com

    steps:
      - uses: actions/checkout@v4

      - name: Deploy to DigitalOcean
        uses: digitalocean/app_action@v1
        with:
          app_name: myapp-staging
          token: ${{ secrets.DIGITALOCEAN_TOKEN }}

      - name: Run migrations
        run: |
          doctl apps run myapp-staging --command "rails db:migrate"
        env:
          DIGITALOCEAN_ACCESS_TOKEN: ${{ secrets.DIGITALOCEAN_TOKEN }}

      - name: Smoke test
        run: |
          curl -f https://staging.example.com/health || exit 1

  deploy-production:
    needs: build
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/main'
    environment:
      name: production
      url: https://example.com

    steps:
      - uses: actions/checkout@v4

      - name: Deploy to DigitalOcean (Blue-Green)
        run: |
          # Deploy to new instance
          doctl apps create-deployment ${{ secrets.APP_ID }}

          # Wait for health check
          sleep 30
          curl -f https://example.com/health || exit 1
        env:
          DIGITALOCEAN_ACCESS_TOKEN: ${{ secrets.DIGITALOCEAN_TOKEN }}

      - name: Run migrations
        run: |
          doctl apps run myapp-production --command "rails db:migrate"
        env:
          DIGITALOCEAN_ACCESS_TOKEN: ${{ secrets.DIGITALOCEAN_TOKEN }}

      - name: Notify deployment
        uses: 8398a7/action-slack@v3
        with:
          status: ${{ job.status }}
          text: 'Production deployment completed'
          webhook_url: ${{ secrets.SLACK_WEBHOOK }}
        if: always()
```

### GitLab CI/CD

**Pipeline Configuration (.gitlab-ci.yml):**
```yaml
stages:
  - test
  - build
  - deploy

variables:
  RUBY_VERSION: "3.2"
  NODE_VERSION: "22"
  POSTGRES_VERSION: "17"

.ruby_node_template:
  image: ruby:$RUBY_VERSION
  services:
    - postgres:$POSTGRES_VERSION
  variables:
    POSTGRES_DB: test
    POSTGRES_USER: postgres
    POSTGRES_PASSWORD: postgres
    DATABASE_URL: "postgresql://postgres:postgres@postgres:5432/test"
  before_script:
    - apt-get update -qq && apt-get install -y nodejs npm
    - npm install -g n
    - n $NODE_VERSION
    - bundle install
    - npm ci
  cache:
    key: ${CI_COMMIT_REF_SLUG}
    paths:
      - vendor/ruby
      - node_modules

test:lint:
  extends: .ruby_node_template
  stage: test
  script:
    - bundle exec rubocop
    - npm run lint

test:unit:
  extends: .ruby_node_template
  stage: test
  script:
    - bundle exec rails db:setup
    - bundle exec rails test
  coverage: '/\(\d+.\d+\%\) covered/'

test:system:
  extends: .ruby_node_template
  stage: test
  script:
    - bundle exec rails test:system

build:assets:
  extends: .ruby_node_template
  stage: build
  script:
    - npm run build
  artifacts:
    paths:
      - public/assets
    expire_in: 1 week
  only:
    - main
    - staging

deploy:staging:
  stage: deploy
  image: digitalocean/doctl:latest
  script:
    - doctl apps create-deployment $STAGING_APP_ID
    - sleep 30
    - curl -f https://staging.example.com/health
  environment:
    name: staging
    url: https://staging.example.com
  only:
    - staging

deploy:production:
  stage: deploy
  image: digitalocean/doctl:latest
  script:
    - doctl apps create-deployment $PRODUCTION_APP_ID
    - sleep 60
    - curl -f https://example.com/health
  environment:
    name: production
    url: https://example.com
  when: manual
  only:
    - main
```

### Docker Build Pipeline

**Multi-stage Dockerfile for Rails:**
```dockerfile
# Stage 1: Build dependencies
FROM ruby:3.2-alpine AS builder

RUN apk add --no-cache \
    build-base \
    postgresql-dev \
    nodejs \
    npm \
    git

WORKDIR /app

COPY Gemfile Gemfile.lock ./
RUN bundle config set --local deployment 'true' && \
    bundle config set --local without 'development test' && \
    bundle install -j$(nproc)

COPY package*.json ./
RUN npm ci --production

COPY . .
RUN npm run build

# Stage 2: Runtime
FROM ruby:3.2-alpine

RUN apk add --no-cache \
    postgresql-client \
    tzdata

WORKDIR /app

COPY --from=builder /usr/local/bundle /usr/local/bundle
COPY --from=builder /app /app

ENV RAILS_ENV=production \
    RAILS_LOG_TO_STDOUT=true \
    RAILS_SERVE_STATIC_FILES=true

EXPOSE 3000

CMD ["bundle", "exec", "rails", "server", "-b", "0.0.0.0"]
```

**GitHub Actions Docker Build:**
```yaml
build-docker:
  runs-on: ubuntu-latest
  steps:
    - uses: actions/checkout@v4

    - name: Set up Docker Buildx
      uses: docker/setup-buildx-action@v3

    - name: Login to Container Registry
      uses: docker/login-action@v3
      with:
        registry: ghcr.io
        username: ${{ github.actor }}
        password: ${{ secrets.GITHUB_TOKEN }}

    - name: Build and push
      uses: docker/build-push-action@v5
      with:
        context: .
        push: true
        tags: |
          ghcr.io/${{ github.repository }}:latest
          ghcr.io/${{ github.repository }}:${{ github.sha }}
        cache-from: type=registry,ref=ghcr.io/${{ github.repository }}:buildcache
        cache-to: type=registry,ref=ghcr.io/${{ github.repository }}:buildcache,mode=max
```

## Tools Required

### MCP Servers
[MCP_TOOLS]
<!-- Populated during skill creation based on:
     1. User's installed MCP servers
     2. User's selection for this skill

     Recommended for this skill (examples):
     - GitHub CLI integration
     - Docker/Container registry access
     - Cloud provider APIs (DigitalOcean, AWS, GCP)
     - Notification services (Slack, Discord)

     Note: Skills work without MCP servers, but functionality may be limited
-->

### CI/CD Platforms
- **GitHub Actions** - Primary recommendation
- **GitLab CI/CD** - Alternative for GitLab users
- **CircleCI** - Enterprise alternative

### CLI Tools
```bash
# GitHub CLI
gh workflow list
gh workflow run
gh workflow view

# DigitalOcean CLI
doctl apps list
doctl apps create-deployment
doctl apps logs

# Docker
docker build -t myapp .
docker push ghcr.io/user/myapp

# Kubernetes (if applicable)
kubectl apply -f deployment.yaml
kubectl rollout status deployment/myapp
```

### Monitoring & Notifications
- **Slack/Discord** - Deployment notifications
- **GitHub Deployments** - Environment tracking
- **Status badges** - Build status visibility

## Quality Checklist

### Pipeline Setup
- [ ] Test stage runs before build/deploy
- [ ] Linting enforced in CI
- [ ] Code coverage tracking enabled
- [ ] Security scanning included (Brakeman, npm audit)
- [ ] Database migrations tested in staging
- [ ] Environment variables properly injected
- [ ] Secrets stored securely (never in code)

### Performance Optimization
- [ ] Dependency caching configured
- [ ] Parallel job execution where possible
- [ ] Docker layer caching enabled
- [ ] Build artifacts stored efficiently
- [ ] Pipeline runs complete in < 10 minutes

### Deployment Safety
- [ ] Staging deployment automated
- [ ] Production deployment requires approval
- [ ] Health checks verify deployment success
- [ ] Rollback procedure documented
- [ ] Database backups before migrations
- [ ] Zero-downtime deployment strategy
- [ ] Deployment notifications configured

### Documentation
- [ ] Pipeline stages documented
- [ ] Environment setup instructions clear
- [ ] Secret variables documented (not values)
- [ ] Rollback procedure documented
- [ ] Troubleshooting guide available

## Pipeline Patterns

### Branch-based Deployments
```yaml
# Feature branches → Run tests only
# staging branch → Deploy to staging
# main branch → Deploy to production (with approval)

on:
  push:
    branches: ['**']
  pull_request:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    steps: [...]

  deploy-staging:
    if: github.ref == 'refs/heads/staging'
    needs: test
    steps: [...]

  deploy-production:
    if: github.ref == 'refs/heads/main'
    needs: test
    environment:
      name: production
    steps: [...]
```

### Tag-based Releases
```yaml
on:
  push:
    tags:
      - 'v*.*.*'

jobs:
  release:
    runs-on: ubuntu-latest
    steps:
      - name: Create Release
        uses: actions/create-release@v1
        with:
          tag_name: ${{ github.ref }}
          release_name: Release ${{ github.ref }}

      - name: Deploy to Production
        run: [...]
```

### Scheduled Maintenance
```yaml
on:
  schedule:
    - cron: '0 2 * * *'  # Daily at 2 AM UTC

jobs:
  backup:
    runs-on: ubuntu-latest
    steps:
      - name: Backup database
        run: [...]

      - name: Clean old artifacts
        run: [...]
```

## Security Best Practices

### Secret Management
```yaml
# Never commit secrets
# Use GitHub Secrets or environment variables

steps:
  - name: Deploy
    env:
      DATABASE_URL: ${{ secrets.DATABASE_URL }}
      SECRET_KEY_BASE: ${{ secrets.SECRET_KEY_BASE }}
      AWS_ACCESS_KEY_ID: ${{ secrets.AWS_ACCESS_KEY_ID }}
    run: [...]
```

### Least Privilege Access
- Use deployment keys with minimal permissions
- Separate tokens for staging/production
- Rotate credentials regularly
- Use OIDC for cloud provider authentication

### Audit Logging
- Enable GitHub Actions logging
- Track deployment history
- Monitor failed deployments
- Alert on suspicious activity

## Troubleshooting Guide

### Common Issues

**Pipeline fails on dependency installation:**
- Clear cache and retry
- Check for version conflicts
- Verify lockfile is committed

**Tests pass locally but fail in CI:**
- Check service versions (Postgres, Redis)
- Verify environment variables
- Check for timezone/locale differences

**Deployment succeeds but app doesn't work:**
- Check health endpoint
- Review application logs
- Verify migrations ran successfully
- Check environment variable injection

**Slow pipeline execution:**
- Enable caching for dependencies
- Parallelize independent jobs
- Use Docker layer caching
- Reduce artifact retention

## Example Project Setup

### Step 1: Create workflow file
```bash
mkdir -p .github/workflows
touch .github/workflows/ci-cd.yml
```

### Step 2: Configure secrets
```bash
# GitHub repository secrets
gh secret set DIGITALOCEAN_TOKEN
gh secret set DATABASE_URL
gh secret set SECRET_KEY_BASE
```

### Step 3: Set up environments
```bash
# Configure staging and production environments
# GitHub Settings → Environments → New environment
# Add protection rules for production
```

### Step 4: Test pipeline
```bash
# Push to trigger
git add .github/workflows/ci-cd.yml
git commit -m "Add CI/CD pipeline"
git push origin staging

# Monitor execution
gh workflow view
gh run watch
```

## Performance Targets

- **Test stage:** < 5 minutes
- **Build stage:** < 3 minutes
- **Deploy stage:** < 5 minutes
- **Total pipeline:** < 15 minutes
- **Cache hit rate:** > 80%

## Integration Checklist

- [ ] Pipeline runs on all pull requests
- [ ] Automatic deployment to staging on merge
- [ ] Manual approval required for production
- [ ] Database migrations automated
- [ ] Asset compilation in CI
- [ ] Environment-specific configs injected
- [ ] Health checks after deployment
- [ ] Rollback tested and documented
- [ ] Team notified of deployments
- [ ] Monitoring alerts configured

---

**Remember:** A well-designed pipeline is the foundation of reliable software delivery. Invest time in quality gates, caching, and clear documentation to enable fast, confident deployments.
