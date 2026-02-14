---
description: GitHub Actions CI/CD best practices for validation
version: 1.0
framework: github-actions
category: deployment
---

# GitHub Actions Best Practices

## Workflow Structure

### Basic CI/CD Workflow
```yaml
name: CI/CD Pipeline

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]

env:
  NODE_VERSION: '20'

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: ${{ env.NODE_VERSION }}
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Run linter
        run: npm run lint

      - name: Run tests
        run: npm test

      - name: Build
        run: npm run build

  deploy:
    needs: test
    if: github.ref == 'refs/heads/main'
    runs-on: ubuntu-latest
    environment: production
    steps:
      - uses: actions/checkout@v4

      - name: Deploy to production
        run: npm run deploy
        env:
          API_KEY: ${{ secrets.API_KEY }}
```

**Key Points:**
- Separate jobs for test and deploy
- Use `needs` for job dependencies
- `npm ci` for reproducible builds (not `npm install`)
- Cache dependencies with actions/setup-node
- Use secrets for sensitive data
- Environment protection for production

## Caching Strategies

### Dependency Caching
```yaml
- name: Setup Node.js
  uses: actions/setup-node@v4
  with:
    node-version: '20'
    cache: 'npm'  # Auto-cache based on package-lock.json

# Or explicit caching
- name: Cache node modules
  uses: actions/cache@v3
  with:
    path: ~/.npm
    key: ${{ runner.os }}-node-${{ hashFiles('**/package-lock.json') }}
    restore-keys: |
      ${{ runner.os }}-node-
```

### Build Artifact Caching
```yaml
- name: Cache build output
  uses: actions/cache@v3
  with:
    path: dist/
    key: build-${{ github.sha }}

- name: Upload artifacts
  uses: actions/upload-artifact@v4
  with:
    name: build-artifacts
    path: dist/
    retention-days: 7
```

**Key Points:**
- Use setup-* actions with built-in cache
- Cache dependencies (node_modules, ~/.npm)
- Cache build outputs between jobs
- Use artifacts for job-to-job data transfer

## Matrix Builds

### Multiple Versions Testing
```yaml
jobs:
  test:
    runs-on: ${{ matrix.os }}
    strategy:
      matrix:
        os: [ubuntu-latest, windows-latest, macos-latest]
        node-version: [18, 20, 22]
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: ${{ matrix.node-version }}
      - run: npm ci
      - run: npm test
```

**Key Points:**
- Test across multiple OS and versions
- Use matrix for parallel execution
- Fail-fast: false to see all results
- Reduce matrix for faster builds (test critical combinations)

## Secrets Management

### Using Secrets
```yaml
jobs:
  deploy:
    runs-on: ubuntu-latest
    environment: production
    steps:
      - name: Deploy
        env:
          API_KEY: ${{ secrets.API_KEY }}
          DATABASE_URL: ${{ secrets.DATABASE_URL }}
        run: |
          echo "Deploying with API key"
          ./deploy.sh

# Never log secrets
- run: echo "API_KEY: ${{ secrets.API_KEY }}"  # ❌ DON'T DO THIS
```

**Key Points:**
- Store secrets in GitHub Secrets
- Use environment: for protection rules
- Never log or print secrets
- Use OIDC for cloud provider auth (no static keys)

## Deployment Patterns

### Environment-Based Deployment
```yaml
jobs:
  deploy-staging:
    if: github.ref == 'refs/heads/develop'
    environment: staging
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Deploy to staging
        run: ./deploy-staging.sh

  deploy-production:
    if: github.ref == 'refs/heads/main'
    environment: production
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Deploy to production
        run: ./deploy-production.sh
        env:
          DEPLOY_KEY: ${{ secrets.PROD_DEPLOY_KEY }}
```

**Key Points:**
- Separate environments (staging, production)
- Use environment protection rules
- Deploy on specific branches only
- Different secrets per environment

## Security Best Practices

### Minimal Permissions
```yaml
name: CI

permissions:
  contents: read
  pull-requests: write

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      # ... tests
```

### Dependency Review
```yaml
name: Dependency Review

on: [pull_request]

jobs:
  dependency-review:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/dependency-review-action@v3
```

**Key Points:**
- Minimal permissions principle
- Pin action versions (@v4, not @main)
- Review dependencies for vulnerabilities
- Use GITHUB_TOKEN, not personal tokens

## Anti-Patterns to Avoid

### ❌ Not Pinning Action Versions
```yaml
# DON'T DO THIS
- uses: actions/checkout@main

# DO THIS
- uses: actions/checkout@v4
```

### ❌ Using npm install
```yaml
# DON'T DO THIS
- run: npm install

# DO THIS
- run: npm ci
```

### ❌ Logging Secrets
```yaml
# DON'T DO THIS
- run: echo "Token: ${{ secrets.TOKEN }}"

# DO THIS
- run: echo "Deploying..."
  env:
    TOKEN: ${{ secrets.TOKEN }}
```

## Quick Reference

**Workflow:**
- ✅ Separate jobs for test/deploy
- ✅ Use `needs` for dependencies
- ✅ Cache dependencies
- ✅ `npm ci` not `npm install`

**Deployment:**
- ✅ environment protection
- ✅ Branch-based deployment
- ✅ Secrets for sensitive data
- ❌ Never log secrets

**Security:**
- ✅ Pin action versions
- ✅ Minimal permissions
- ✅ Dependency review
- ✅ OIDC for cloud auth
