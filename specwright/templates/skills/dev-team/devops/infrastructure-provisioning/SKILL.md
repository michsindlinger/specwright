# Infrastructure Provisioning Skill

> Template for Infrastructure as Code (IaC) Specialists
> Version: 1.0.0
> Created: 2026-01-09

## Skill Purpose

Design, provision, and manage cloud infrastructure using Infrastructure as Code principles with Terraform, Docker, and container orchestration for reproducible, scalable deployments.

## When to Activate This Skill

**Activate when:**
- Setting up new cloud infrastructure
- Migrating infrastructure between providers
- Containerizing applications
- Implementing auto-scaling
- Managing infrastructure state
- Disaster recovery planning
- Multi-region deployments
- Infrastructure optimization

**Delegation from main agent:**
```
@agent:[AGENT_NAME] "Provision DigitalOcean infrastructure for Rails app"
@agent:[AGENT_NAME] "Create Docker Compose setup for local development"
@agent:[AGENT_NAME] "Set up PostgreSQL managed database with backups"
@agent:[AGENT_NAME] "Implement auto-scaling for web tier"
```

## Core Capabilities

### Infrastructure as Code
- Terraform configuration and state management
- Infrastructure versioning and change tracking
- Modular, reusable infrastructure components
- Multi-environment provisioning (dev, staging, prod)
- Infrastructure testing and validation

### Container Management
- Docker image optimization
- Multi-stage builds for smaller images
- Container orchestration (Docker Compose, Kubernetes)
- Volume and network management
- Container security hardening

### Cloud Resource Provisioning
- Compute instances (droplets, VMs)
- Managed databases (PostgreSQL, Redis)
- Load balancers and networking
- Object storage (S3-compatible)
- CDN configuration

### Environment Management
- Environment parity (12-factor compliance)
- Configuration management
- Secret injection strategies
- Service discovery and DNS
- Health checks and auto-recovery

## [TECH_STACK_SPECIFIC] Platform Configurations

### DigitalOcean (Recommended for Rails)

**Terraform Configuration:**
```hcl
# versions.tf
terraform {
  required_version = ">= 1.6"

  required_providers {
    digitalocean = {
      source  = "digitalocean/digitalocean"
      version = "~> 2.0"
    }
  }

  backend "s3" {
    endpoint                    = "nyc3.digitaloceanspaces.com"
    region                      = "us-east-1"
    bucket                      = "myapp-terraform-state"
    key                         = "production/terraform.tfstate"
    skip_credentials_validation = true
    skip_metadata_api_check     = true
  }
}

provider "digitalocean" {
  token = var.digitalocean_token
}

# variables.tf
variable "digitalocean_token" {
  description = "DigitalOcean API token"
  type        = string
  sensitive   = true
}

variable "environment" {
  description = "Environment name (staging, production)"
  type        = string
  default     = "production"
}

variable "region" {
  description = "DigitalOcean region"
  type        = string
  default     = "nyc3"
}

variable "app_name" {
  description = "Application name"
  type        = string
  default     = "myapp"
}

# main.tf - App Platform
resource "digitalocean_app" "rails_app" {
  spec {
    name   = "${var.app_name}-${var.environment}"
    region = var.region

    # Rails web service
    service {
      name               = "web"
      instance_count     = 2
      instance_size_slug = "professional-xs"  # 1vCPU, 2GB RAM

      github {
        repo           = "username/repo"
        branch         = var.environment == "production" ? "main" : "staging"
        deploy_on_push = true
      }

      build_command = "npm run build && bundle install"
      run_command   = "bundle exec rails server -b 0.0.0.0 -p 8080"

      http_port = 8080

      health_check {
        http_path             = "/health"
        initial_delay_seconds = 30
        period_seconds        = 10
        timeout_seconds       = 5
        success_threshold     = 1
        failure_threshold     = 3
      }

      # Auto-scaling
      autoscaling {
        min_instance_count = 2
        max_instance_count = 10
        metrics {
          cpu {
            percent = 75
          }
        }
      }

      # Environment variables
      env {
        key   = "RAILS_ENV"
        value = "production"
      }

      env {
        key   = "RAILS_LOG_TO_STDOUT"
        value = "true"
      }

      env {
        key   = "DATABASE_URL"
        value = digitalocean_database_cluster.postgres.uri
        type  = "SECRET"
      }

      env {
        key   = "REDIS_URL"
        value = digitalocean_database_cluster.redis.uri
        type  = "SECRET"
      }

      env {
        key   = "SECRET_KEY_BASE"
        value = var.secret_key_base
        type  = "SECRET"
      }
    }

    # Background worker (Sidekiq)
    worker {
      name               = "worker"
      instance_count     = 1
      instance_size_slug = "professional-xs"

      github {
        repo   = "username/repo"
        branch = var.environment == "production" ? "main" : "staging"
      }

      run_command = "bundle exec sidekiq"

      env {
        key   = "RAILS_ENV"
        value = "production"
      }

      env {
        key   = "DATABASE_URL"
        value = digitalocean_database_cluster.postgres.uri
        type  = "SECRET"
      }

      env {
        key   = "REDIS_URL"
        value = digitalocean_database_cluster.redis.uri
        type  = "SECRET"
      }
    }

    # Static site (if needed)
    static_site {
      name = "frontend"

      github {
        repo   = "username/repo"
        branch = var.environment == "production" ? "main" : "staging"
      }

      build_command  = "npm run build"
      output_dir     = "public"
      catchall_document = "index.html"
    }
  }
}

# main.tf - PostgreSQL Database
resource "digitalocean_database_cluster" "postgres" {
  name       = "${var.app_name}-${var.environment}-db"
  engine     = "pg"
  version    = "17"
  size       = "db-s-1vcpu-1gb"  # Start small, scale up
  region     = var.region
  node_count = 1  # Single node for staging, 2+ for production

  maintenance_window {
    day  = "sunday"
    hour = "02:00:00"
  }

  backup_restore {
    backup_created_at = ""  # Empty for new cluster
  }
}

resource "digitalocean_database_db" "app_database" {
  cluster_id = digitalocean_database_cluster.postgres.id
  name       = "${var.app_name}_${var.environment}"
}

resource "digitalocean_database_user" "app_user" {
  cluster_id = digitalocean_database_cluster.postgres.id
  name       = "${var.app_name}_user"
}

resource "digitalocean_database_firewall" "postgres_firewall" {
  cluster_id = digitalocean_database_cluster.postgres.id

  rule {
    type  = "app"
    value = digitalocean_app.rails_app.id
  }
}

# main.tf - Redis Cache
resource "digitalocean_database_cluster" "redis" {
  name       = "${var.app_name}-${var.environment}-redis"
  engine     = "redis"
  version    = "7"
  size       = "db-s-1vcpu-1gb"
  region     = var.region
  node_count = 1

  eviction_policy = "allkeys_lru"
}

resource "digitalocean_database_firewall" "redis_firewall" {
  cluster_id = digitalocean_database_cluster.redis.id

  rule {
    type  = "app"
    value = digitalocean_app.rails_app.id
  }
}

# main.tf - Spaces (S3-compatible storage)
resource "digitalocean_spaces_bucket" "assets" {
  name   = "${var.app_name}-${var.environment}-assets"
  region = var.region

  cors_rule {
    allowed_headers = ["*"]
    allowed_methods = ["GET", "HEAD"]
    allowed_origins = ["*"]
    max_age_seconds = 3600
  }
}

resource "digitalocean_spaces_bucket" "uploads" {
  name   = "${var.app_name}-${var.environment}-uploads"
  region = var.region
  acl    = "private"

  versioning {
    enabled = true
  }
}

resource "digitalocean_cdn" "assets_cdn" {
  origin = digitalocean_spaces_bucket.assets.bucket_domain_name
}

# outputs.tf
output "app_url" {
  description = "Application URL"
  value       = "https://${digitalocean_app.rails_app.default_ingress}"
}

output "database_uri" {
  description = "PostgreSQL connection URI"
  value       = digitalocean_database_cluster.postgres.uri
  sensitive   = true
}

output "redis_uri" {
  description = "Redis connection URI"
  value       = digitalocean_database_cluster.redis.uri
  sensitive   = true
}

output "spaces_endpoint" {
  description = "Spaces S3-compatible endpoint"
  value       = "https://${var.region}.digitaloceanspaces.com"
}

output "cdn_endpoint" {
  description = "CDN endpoint for assets"
  value       = digitalocean_cdn.assets_cdn.endpoint
}
```

**Usage:**
```bash
# Initialize
terraform init

# Plan changes
terraform plan -var-file="production.tfvars"

# Apply infrastructure
terraform apply -var-file="production.tfvars"

# Destroy (careful!)
terraform destroy -var-file="production.tfvars"
```

### AWS Alternative

**Terraform for AWS:**
```hcl
# main.tf - ECS Fargate deployment
resource "aws_ecs_cluster" "main" {
  name = "${var.app_name}-${var.environment}"

  setting {
    name  = "containerInsights"
    value = "enabled"
  }
}

resource "aws_ecs_task_definition" "app" {
  family                   = "${var.app_name}-${var.environment}"
  network_mode             = "awsvpc"
  requires_compatibilities = ["FARGATE"]
  cpu                      = 256
  memory                   = 512
  execution_role_arn       = aws_iam_role.ecs_execution.arn
  task_role_arn            = aws_iam_role.ecs_task.arn

  container_definitions = jsonencode([
    {
      name  = "web"
      image = "${aws_ecr_repository.app.repository_url}:latest"

      portMappings = [{
        containerPort = 3000
        protocol      = "tcp"
      }]

      environment = [
        { name = "RAILS_ENV", value = "production" },
        { name = "RAILS_LOG_TO_STDOUT", value = "true" }
      ]

      secrets = [
        {
          name      = "DATABASE_URL"
          valueFrom = aws_secretsmanager_secret.database_url.arn
        },
        {
          name      = "SECRET_KEY_BASE"
          valueFrom = aws_secretsmanager_secret.secret_key_base.arn
        }
      ]

      logConfiguration = {
        logDriver = "awslogs"
        options = {
          "awslogs-group"         = "/ecs/${var.app_name}-${var.environment}"
          "awslogs-region"        = var.region
          "awslogs-stream-prefix" = "web"
        }
      }
    }
  ])
}

resource "aws_rds_cluster" "postgres" {
  cluster_identifier      = "${var.app_name}-${var.environment}"
  engine                  = "aurora-postgresql"
  engine_version          = "17.2"
  database_name           = var.app_name
  master_username         = "postgres"
  master_password         = var.db_password
  backup_retention_period = 7
  preferred_backup_window = "02:00-03:00"

  serverlessv2_scaling_configuration {
    max_capacity = 2.0
    min_capacity = 0.5
  }
}
```

### Google Cloud Platform Alternative

**Terraform for GCP:**
```hcl
resource "google_cloud_run_service" "app" {
  name     = "${var.app_name}-${var.environment}"
  location = var.region

  template {
    spec {
      containers {
        image = "gcr.io/${var.project_id}/${var.app_name}:latest"

        env {
          name  = "RAILS_ENV"
          value = "production"
        }

        env {
          name = "DATABASE_URL"
          value_from {
            secret_key_ref {
              name = google_secret_manager_secret.database_url.secret_id
              key  = "latest"
            }
          }
        }
      }
    }

    metadata {
      annotations = {
        "autoscaling.knative.dev/minScale" = "2"
        "autoscaling.knative.dev/maxScale" = "10"
      }
    }
  }

  traffic {
    percent         = 100
    latest_revision = true
  }
}

resource "google_sql_database_instance" "postgres" {
  name             = "${var.app_name}-${var.environment}"
  database_version = "POSTGRES_17"
  region           = var.region

  settings {
    tier = "db-f1-micro"

    backup_configuration {
      enabled    = true
      start_time = "02:00"
    }

    ip_configuration {
      ipv4_enabled = false
      private_network = google_compute_network.private.id
    }
  }
}
```

## Docker Configuration

### Production Dockerfile (Multi-stage)
```dockerfile
# syntax=docker/dockerfile:1

# Stage 1: Dependencies
FROM ruby:3.2-alpine AS deps

RUN apk add --no-cache \
    build-base \
    postgresql-dev \
    nodejs \
    npm \
    git \
    tzdata

WORKDIR /app

# Install Ruby dependencies
COPY Gemfile Gemfile.lock ./
RUN bundle config set --local deployment 'true' && \
    bundle config set --local without 'development test' && \
    bundle install -j$(nproc) --retry 3

# Install Node dependencies
COPY package*.json ./
RUN npm ci --production --prefer-offline

# Stage 2: Build assets
FROM deps AS builder

COPY . .

# Precompile assets
RUN npm run build && \
    SECRET_KEY_BASE=dummy bundle exec rails assets:precompile

# Stage 3: Runtime
FROM ruby:3.2-alpine AS runtime

RUN apk add --no-cache \
    postgresql-client \
    tzdata \
    curl

# Create non-root user
RUN addgroup -g 1000 rails && \
    adduser -D -u 1000 -G rails rails

WORKDIR /app

# Copy built gems
COPY --from=deps --chown=rails:rails /usr/local/bundle /usr/local/bundle

# Copy application code
COPY --from=builder --chown=rails:rails /app /app

# Set user
USER rails:rails

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=40s \
  CMD curl -f http://localhost:3000/health || exit 1

EXPOSE 3000

ENV RAILS_ENV=production \
    RAILS_LOG_TO_STDOUT=true \
    RAILS_SERVE_STATIC_FILES=true

CMD ["bundle", "exec", "rails", "server", "-b", "0.0.0.0"]
```

### Docker Compose (Local Development)
```yaml
version: '3.9'

services:
  db:
    image: postgres:17-alpine
    volumes:
      - postgres_data:/var/lib/postgresql/data
    environment:
      POSTGRES_PASSWORD: postgres
    ports:
      - "5432:5432"
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U postgres"]
      interval: 10s
      timeout: 5s
      retries: 5

  redis:
    image: redis:7-alpine
    volumes:
      - redis_data:/data
    ports:
      - "6379:6379"
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 10s
      timeout: 3s
      retries: 5

  web:
    build:
      context: .
      dockerfile: Dockerfile
      target: deps  # Use deps stage for development
    command: bundle exec rails server -b 0.0.0.0
    volumes:
      - .:/app
      - bundle_cache:/usr/local/bundle
      - node_modules:/app/node_modules
    ports:
      - "3000:3000"
    depends_on:
      db:
        condition: service_healthy
      redis:
        condition: service_healthy
    environment:
      DATABASE_URL: postgres://postgres:postgres@db:5432/myapp_development
      REDIS_URL: redis://redis:6379/0
      RAILS_ENV: development
    stdin_open: true
    tty: true

  sidekiq:
    build:
      context: .
      dockerfile: Dockerfile
      target: deps
    command: bundle exec sidekiq
    volumes:
      - .:/app
      - bundle_cache:/usr/local/bundle
    depends_on:
      - db
      - redis
    environment:
      DATABASE_URL: postgres://postgres:postgres@db:5432/myapp_development
      REDIS_URL: redis://redis:6379/0
      RAILS_ENV: development

volumes:
  postgres_data:
  redis_data:
  bundle_cache:
  node_modules:
```

## Tools Required

### MCP Servers
[MCP_TOOLS]
<!-- Populated during skill creation based on:
     1. User's installed MCP servers
     2. User's selection for this skill

     Recommended for this skill (examples):
     - Cloud provider APIs (DigitalOcean, AWS, GCP)
     - Terraform/IaC integrations
     - Container registry access
     - DNS/Domain management services

     Note: Skills work without MCP servers, but functionality may be limited
-->

### Infrastructure Management
```bash
# Terraform
brew install terraform
terraform version

# DigitalOcean CLI
brew install doctl
doctl auth init

# AWS CLI (if using AWS)
brew install awscli
aws configure

# Google Cloud SDK (if using GCP)
brew install --cask google-cloud-sdk
gcloud auth login
```

### Container Tools
```bash
# Docker
docker version
docker compose version

# Docker optimization
docker system prune -a  # Clean unused images
docker buildx build --platform linux/amd64,linux/arm64  # Multi-platform
```

### State Management
```bash
# Terraform state
terraform state list
terraform state show resource_name
terraform import resource_type.name resource_id

# Backend migration
terraform init -migrate-state
```

## Quality Checklist

### Infrastructure as Code
- [ ] All infrastructure defined in Terraform
- [ ] State stored remotely (S3, Terraform Cloud)
- [ ] State locking enabled
- [ ] Modules used for reusability
- [ ] Variables externalized
- [ ] Sensitive values marked as sensitive
- [ ] Outputs documented
- [ ] Resources tagged properly

### Container Best Practices
- [ ] Multi-stage builds used
- [ ] Minimal base images (Alpine)
- [ ] Non-root user configured
- [ ] Health checks defined
- [ ] Secrets not in image layers
- [ ] Image scanning in CI
- [ ] Version tags (not :latest in prod)
- [ ] .dockerignore configured

### 12-Factor App Compliance
- [ ] Config in environment variables
- [ ] Dependencies explicitly declared
- [ ] Build/run separation
- [ ] Stateless processes
- [ ] Port binding
- [ ] Process concurrency
- [ ] Disposability (fast startup/shutdown)
- [ ] Dev/prod parity
- [ ] Logs to stdout
- [ ] Admin tasks as one-off processes

### Security
- [ ] Secrets in secure vaults (not in code)
- [ ] Network policies configured
- [ ] Database firewall rules
- [ ] HTTPS/TLS enforced
- [ ] Regular security updates
- [ ] Least privilege IAM roles
- [ ] Audit logging enabled
- [ ] Backup and restore tested

## Common Patterns

### Blue-Green Deployment
```hcl
# Create new version
resource "digitalocean_app" "rails_app_v2" {
  # New version configuration
}

# Switch traffic after validation
# Update DNS or load balancer to point to v2
# Keep v1 for quick rollback
```

### Database Migration Strategy
```bash
# Pre-deployment
terraform apply -target=digitalocean_database_cluster.postgres

# Run migrations
doctl apps run myapp --command "rails db:migrate"

# Deploy application
terraform apply
```

### Multi-environment Setup
```
environments/
  ├── staging/
  │   ├── main.tf
  │   ├── staging.tfvars
  │   └── backend.tf
  └── production/
      ├── main.tf
      ├── production.tfvars
      └── backend.tf
```

## Troubleshooting

### Common Issues

**Terraform state locked:**
```bash
# Force unlock (use carefully)
terraform force-unlock <lock-id>
```

**Container won't start:**
```bash
# Check logs
docker logs container_name

# Debug interactively
docker run -it --entrypoint /bin/sh image_name
```

**Database connection issues:**
```bash
# Test connectivity
psql "postgresql://user:pass@host:5432/db"

# Check firewall rules
doctl databases firewall list <database-id>
```

## Performance Optimization

### Terraform
- Use `-parallelism=10` for faster applies
- Minimize provider version constraints
- Use data sources instead of remote state where possible

### Docker
- Layer caching: Order Dockerfile from least to most frequently changed
- Multi-stage builds: Separate build and runtime dependencies
- .dockerignore: Exclude unnecessary files

### Infrastructure
- Right-size resources (start small, scale up)
- Use managed services (less operational overhead)
- Enable CDN for static assets
- Implement caching strategies (Redis, HTTP caching)

---

**Remember:** Infrastructure as Code enables reproducible, version-controlled infrastructure. Treat your Terraform files with the same care as application code - review, test, and document thoroughly.
