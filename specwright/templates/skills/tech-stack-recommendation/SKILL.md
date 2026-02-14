---
description: Tech stack recommendation and project standards generation guidance
globs: []
alwaysApply: false
---

# Tech Stack Recommendation Skill

> Project: [PROJECT_NAME]
> Generated: [DATE]
> Purpose: Guide for tech stack analysis, recommendation, and standards generation

## When to Use

This skill guides you when doing tech stack work for:
- Tech stack recommendation in `/plan-product`
- Project-specific standards generation
- Technology evaluation and comparison

## Quick Reference

### Tech Stack Decision Process

1. **Analyze Requirements**: Extract platform, scale, complexity, integrations from product brief
2. **Apply Decision Framework**: Match requirements to technology categories
3. **Present Recommendations**: Show options with trade-offs to user
4. **Get User Decision**: Interactive selection via AskUserQuestion
5. **Generate Standards**: Optional tech-stack-aware coding standards

### Decision is COMPLETE when

- [ ] Backend framework selected with rationale
- [ ] Frontend framework selected (if applicable) with rationale
- [ ] Database(s) selected with rationale
- [ ] Hosting/deployment platform selected
- [ ] CI/CD approach defined
- [ ] All choices documented in tech-stack.md

---

## Detailed Guidance

### Decision Framework

#### Step 1: Requirement Analysis

Extract these dimensions from the product brief:

| Dimension | Question | Impact |
|-----------|----------|--------|
| **Platform** | Web? Mobile? Desktop? API-only? | Framework selection |
| **Scale** | Users at launch? In 1 year? | Database, hosting, architecture |
| **Complexity** | CRUD? Rich domain? Real-time? | Backend framework complexity |
| **Integrations** | External APIs? Payment? Auth? | Middleware, library needs |
| **Team** | Solo dev? Small team? Large org? | Framework learning curve |
| **Timeline** | MVP in weeks? Months? | Rapid vs. robust framework |
| **Budget** | Startup? Enterprise? Open-source? | Hosting, licensing |

#### Step 2: Technology Matching

##### Backend Frameworks

| Requirement Profile | Recommended | Why |
|---------------------|-------------|-----|
| Rapid MVP, solo/small team | Rails, Django, Laravel | Convention over configuration, batteries included |
| Enterprise, large team | Spring Boot, .NET | Type safety, established patterns |
| Microservices, high performance | Go, Rust, Node.js | Lightweight, fast, concurrent |
| API-focused, real-time | Node.js (Express/Fastify), Elixir | Event-driven, WebSocket native |
| Data-heavy, ML integration | Python (FastAPI/Django) | Ecosystem, library support |
| Serverless | Node.js, Python, Go | Cold start performance, ecosystem |

##### Frontend Frameworks

| Requirement Profile | Recommended | Why |
|---------------------|-------------|-----|
| Complex SPA, large team | Angular | Opinionated, TypeScript-first, enterprise features |
| Flexible SPA, component-focused | React | Ecosystem, hiring, flexibility |
| Progressive enhancement, simplicity | Vue.js | Gentle learning curve, good docs |
| Static sites with dynamic parts | Next.js, Nuxt, Astro | SSR/SSG, SEO, performance |
| Mobile-first | React Native, Flutter | Cross-platform from single codebase |
| Minimal JS needed | HTMX, Alpine.js | Server-rendered with sprinkles |

##### Databases

| Requirement Profile | Recommended | Why |
|---------------------|-------------|-----|
| Relational data, ACID needed | PostgreSQL | Feature-rich, reliable, JSON support |
| Simple relational, rapid setup | SQLite, MySQL | Lightweight, familiar |
| Document-oriented, flexible schema | MongoDB | Schema flexibility, horizontal scale |
| Key-value, caching | Redis | In-memory speed, pub/sub |
| Time-series data | TimescaleDB, InfluxDB | Optimized for temporal queries |
| Graph relationships | Neo4j | Relationship-first queries |
| Search-heavy | Elasticsearch, Meilisearch | Full-text search, faceting |

##### Hosting & Deployment

| Requirement Profile | Recommended | Why |
|---------------------|-------------|-----|
| Simple deployment, managed | Railway, Render, Fly.io | PaaS simplicity, auto-scaling |
| Full control, cost-effective | AWS EC2/ECS, DigitalOcean | Infrastructure flexibility |
| Serverless workloads | AWS Lambda, Vercel, Cloudflare Workers | Pay-per-use, auto-scale |
| Container-based | Docker + Kubernetes (EKS/GKE) | Orchestration, portability |
| Static + API | Vercel, Netlify, Cloudflare Pages | Edge deployment, CDN built-in |

### Common Stack Patterns

#### The Indie Hacker Stack
```
Backend: Rails / Django / Laravel
Frontend: Hotwire / HTMX / Livewire (server-rendered)
Database: PostgreSQL
Hosting: Railway / Render / Fly.io
CI/CD: GitHub Actions
```
**Best for:** Solo developers, rapid MVPs, content-heavy apps

#### The Modern SPA Stack
```
Backend: Node.js (Express/NestJS) / Python (FastAPI)
Frontend: React / Vue.js / Angular
Database: PostgreSQL + Redis
Hosting: Vercel (frontend) + Railway/AWS (backend)
CI/CD: GitHub Actions
```
**Best for:** Complex UIs, real-time features, separate teams

#### The Enterprise Stack
```
Backend: Spring Boot / .NET
Frontend: Angular / React
Database: PostgreSQL / Oracle
Hosting: AWS / Azure / GCP (managed)
CI/CD: GitHub Actions / Jenkins / GitLab CI
```
**Best for:** Large teams, strict compliance, long-term maintenance

#### The Serverless Stack
```
Backend: AWS Lambda / Cloudflare Workers
Frontend: Next.js / Nuxt / SvelteKit
Database: DynamoDB / PlanetScale / Turso
Hosting: Vercel / AWS
CI/CD: GitHub Actions
```
**Best for:** Variable load, cost optimization, event-driven

### Presenting Recommendations

**Format for user presentation:**

```
Based on your product requirements, I recommend:

**Backend:** [Framework] — [1-sentence rationale]
**Frontend:** [Framework] — [1-sentence rationale]
**Database:** [Database] — [1-sentence rationale]
**Hosting:** [Platform] — [1-sentence rationale]
**CI/CD:** [Tool] — [1-sentence rationale]

Alternative considered: [Alternative stack] — [why not chosen]

Shall I proceed with this stack, or would you like to adjust any choice?
```

### Standards Generation

When user opts for project-specific standards:

1. **Read tech-stack.md** to understand chosen frameworks
2. **Read global standards** as base (`~/.specwright/standards/code-style.md`, `best-practices.md`)
3. **Enhance with tech-stack-specific rules:**

| Stack Choice | Standards Enhancement |
|-------------|----------------------|
| Rails | Ruby style, RSpec conventions, ActiveRecord patterns |
| React | TypeScript strict, component patterns, hook conventions |
| Angular | Angular style guide, RxJS patterns, module structure |
| Spring Boot | Java conventions, Spring patterns, JUnit |
| Node.js/Express | Async/await patterns, middleware conventions |
| Vue.js | Composition API patterns, Pinia conventions |
| Django | Python PEP8, Django conventions, pytest |

4. **Write to project:** `specwright/standards/code-style.md` and `specwright/standards/best-practices.md`

---

## Anti-Patterns

| Anti-Pattern | Better Approach |
|-------------|-----------------|
| Choosing tech because it's trendy | Choose based on requirements and team skills |
| Over-engineering for scale day 1 | Start simple, design for change |
| Picking unfamiliar tech for MVP | Use what team knows, experiment later |
| Ignoring deployment complexity | Consider ops from the start |
| One database for everything | Right tool for each data pattern |

---

## Template Reference

Use template: `specwright/templates/product/tech-stack-template.md`

Hybrid lookup:
- TRY: `specwright/templates/product/tech-stack-template.md` (project)
- FALLBACK: `~/.specwright/templates/product/tech-stack-template.md` (global)
