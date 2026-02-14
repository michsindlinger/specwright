# [SKILL_NAME] - Platform Scalability

> **Role:** Platform Scalability Architect
> **Domain:** Performance, Load Handling & Growth Strategy
> **Created:** [CURRENT_DATE]

## Purpose

Design and implement scalability strategies for multi-module platforms. Plan for growth, handle increasing load, optimize performance, and ensure platform can scale horizontally and vertically.

## When to Activate

**Use this skill for:**
- Scalability strategy planning
- Load testing and capacity planning
- Database scaling strategies
- Caching and performance optimization
- Horizontal vs vertical scaling decisions
- Module-specific scaling patterns

**Do NOT use for:**
- Code-level optimizations (use performance profiling skills)
- Frontend performance (use frontend optimization skills)
- Single-instance performance tuning

## Core Capabilities

### 1. Scalability Strategy
- Horizontal scaling (add more instances)
- Vertical scaling (bigger instances)
- Module-specific scaling needs
- Auto-scaling policies

### 2. Database Scaling
- Read replicas
- Sharding strategies
- Connection pooling
- Query optimization

### 3. Caching Strategies
- Application-level caching
- Distributed caching
- CDN for static assets
- Cache invalidation patterns

### 4. Load Distribution
- Load balancers
- Service mesh
- Queue-based load leveling
- Rate limiting

## Scalability Patterns

### Pattern 1: Horizontal Scaling

**Definition:** Add more instances of a module to handle increased load

**Architecture:**
```
                ┌──────────────┐
   Clients ────▶│Load Balancer │
                └──────┬───────┘
                       │
        ┌──────────────┼──────────────┐
        │              │              │
   ┌────▼────┐   ┌────▼────┐   ┌────▼────┐
   │Module A │   │Module A │   │Module A │
   │Instance1│   │Instance2│   │Instance3│
   └────┬────┘   └────┬────┘   └────┬────┘
        │              │              │
        └──────────────┼──────────────┘
                       │
                ┌──────▼──────┐
                │  Database   │
                │  (shared)   │
                └─────────────┘
```

**Implementation (Docker Compose):**
```yaml
version: '3'
services:
  nginx-lb:
    image: nginx:latest
    ports:
      - "80:80"
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf
    depends_on:
      - module-a-1
      - module-a-2
      - module-a-3

  module-a-1:
    build: ./services/module-a
    environment:
      - DATABASE_URL=postgres://db/module_a
      - REDIS_URL=redis://cache:6379

  module-a-2:
    build: ./services/module-a
    environment:
      - DATABASE_URL=postgres://db/module_a
      - REDIS_URL=redis://cache:6379

  module-a-3:
    build: ./services/module-a
    environment:
      - DATABASE_URL=postgres://db/module_a
      - REDIS_URL=redis://cache:6379

  database:
    image: postgres:15
    volumes:
      - db-data:/var/lib/postgresql/data

  cache:
    image: redis:7
```

**Load Balancer Config (nginx.conf):**
```nginx
upstream module_a_backend {
    # Round-robin by default
    server module-a-1:3000;
    server module-a-2:3000;
    server module-a-3:3000;
}

server {
    listen 80;

    location /api/module-a/ {
        proxy_pass http://module_a_backend;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

**Stateless Application Pattern:**
```typescript
// ✅ CORRECT: Stateless (can scale horizontally)
class DocumentService {
  constructor(
    private database: Database,
    private cache: RedisCache  // Shared cache
  ) {}

  async getDocument(id: string): Promise<Document> {
    // Check shared cache first
    const cached = await this.cache.get(`document:${id}`);
    if (cached) return cached;

    // Fetch from database
    const doc = await this.database.query('SELECT * FROM documents WHERE id = $1', [id]);

    // Store in shared cache
    await this.cache.set(`document:${id}`, doc, 3600);

    return doc;
  }
}

// ❌ WRONG: Stateful (cannot scale horizontally)
class DocumentServiceWrong {
  private cache = new Map();  // In-memory cache (instance-specific)

  async getDocument(id: string): Promise<Document> {
    // This cache is NOT shared across instances
    if (this.cache.has(id)) {
      return this.cache.get(id);
    }

    const doc = await this.database.query('SELECT * FROM documents WHERE id = $1', [id]);
    this.cache.set(id, doc);  // Only cached on THIS instance
    return doc;
  }
}
```

**When to Use:**
- Traffic increases predictably
- Stateless applications
- Need redundancy and high availability

**Trade-offs:**
- ✅ Linear scalability
- ✅ High availability (redundancy)
- ✅ No single point of failure
- ❌ Requires load balancer
- ❌ Session management complexity
- ❌ Cost increases with instances

---

### Pattern 2: Vertical Scaling

**Definition:** Increase resources (CPU, RAM) of existing instances

**Before:**
```
┌─────────────────┐
│   Module A      │
│   2 CPU         │
│   4 GB RAM      │
└─────────────────┘
```

**After:**
```
┌─────────────────┐
│   Module A      │
│   8 CPU         │
│   16 GB RAM     │
└─────────────────┘
```

**When to Use:**
- Database servers (hard to scale horizontally)
- CPU/memory-bound workloads
- Single-threaded applications
- Rapid scaling needed (no code changes)

**Implementation (Kubernetes):**
```yaml
apiVersion: v1
kind: Pod
metadata:
  name: module-a
spec:
  containers:
  - name: module-a
    image: module-a:latest
    resources:
      requests:
        memory: "4Gi"
        cpu: "2"
      limits:
        memory: "16Gi"  # Increased
        cpu: "8"        # Increased
```

**Trade-offs:**
- ✅ Simple (no architecture changes)
- ✅ No session management issues
- ✅ Fast to implement
- ❌ Limited by hardware ceiling
- ❌ More expensive per unit
- ❌ Single point of failure

---

### Pattern 3: Database Read Replicas

**Definition:** Distribute read load across multiple database replicas

**Architecture:**
```
          Write Operations
                │
                ▼
         ┌──────────────┐
         │Primary (RW)  │
         │  Database    │
         └──────┬───────┘
                │ Replication
        ┌───────┼───────┐
        │       │       │
   ┌────▼──┐ ┌─▼───┐ ┌─▼───┐
   │Replica│ │Repli│ │Repli│
   │1 (RO) │ │ca 2 │ │ca 3 │
   └───────┘ └─────┘ └─────┘
        ▲       ▲       ▲
        │       │       │
    Read Operations (Load Balanced)
```

**Implementation (PostgreSQL):**
```typescript
// Database connection pool
class DatabasePool {
  private primaryPool: Pool;     // Write operations
  private replicaPools: Pool[];  // Read operations

  constructor() {
    this.primaryPool = new Pool({
      host: 'primary.db.internal',
      port: 5432,
      max: 20  // Connection limit
    });

    this.replicaPools = [
      new Pool({ host: 'replica1.db.internal', port: 5432, max: 20 }),
      new Pool({ host: 'replica2.db.internal', port: 5432, max: 20 }),
      new Pool({ host: 'replica3.db.internal', port: 5432, max: 20 })
    ];
  }

  // Write operations go to primary
  async write(query: string, params: any[]): Promise<any> {
    return this.primaryPool.query(query, params);
  }

  // Read operations load-balanced across replicas
  async read(query: string, params: any[]): Promise<any> {
    const randomReplica = this.replicaPools[
      Math.floor(Math.random() * this.replicaPools.length)
    ];

    return randomReplica.query(query, params);
  }
}

// Repository using read replicas
class DocumentRepository {
  constructor(private db: DatabasePool) {}

  async findById(id: string): Promise<Document> {
    // Read from replica
    const result = await this.db.read(
      'SELECT * FROM documents WHERE id = $1',
      [id]
    );
    return result.rows[0];
  }

  async save(document: Document): Promise<void> {
    // Write to primary
    await this.db.write(
      'INSERT INTO documents (id, content) VALUES ($1, $2)',
      [document.id, document.content]
    );
  }
}
```

**Replication Lag Handling:**
```typescript
// Handle eventual consistency
class DocumentService {
  async createDocument(content: string): Promise<Document> {
    const doc = new Document(content);

    // Write to primary
    await this.repository.save(doc);

    // PROBLEM: Read replica may not have it yet (replication lag)
    // SOLUTION: Read from primary for fresh data
    return this.repository.findById(doc.id, { usePrimary: true });
  }

  async searchDocuments(query: string): Promise<Document[]> {
    // Read from replicas (eventual consistency OK for search)
    return this.repository.search(query);
  }
}
```

**When to Use:**
- Read-heavy workloads (90%+ reads)
- Can tolerate eventual consistency (lag: 100ms - 1s)
- Single database is CPU bottleneck

**Trade-offs:**
- ✅ Scales read capacity
- ✅ High availability (replica failover)
- ✅ Geographic distribution possible
- ❌ Eventual consistency (replication lag)
- ❌ Write operations still bottlenecked on primary
- ❌ Increased infrastructure cost

---

### Pattern 4: Caching Strategy

**Multi-Level Caching:**
```
┌──────────────────────────────────────────┐
│                Request                    │
└───────────────┬──────────────────────────┘
                │
         ┌──────▼──────┐
         │ CDN Cache   │  ← Level 1: Static assets
         │ (CloudFront)│
         └──────┬──────┘
                │ Cache miss
         ┌──────▼──────┐
         │ Application │  ← Level 2: In-memory cache
         │ Cache (Node)│
         └──────┬──────┘
                │ Cache miss
         ┌──────▼──────┐
         │  Redis      │  ← Level 3: Distributed cache
         │  Cache      │
         └──────┬──────┘
                │ Cache miss
         ┌──────▼──────┐
         │  Database   │  ← Level 4: Source of truth
         └─────────────┘
```

**Implementation:**
```typescript
class CachedDocumentService {
  constructor(
    private inMemoryCache: Map<string, Document>,  // L2
    private redisCache: RedisClient,                // L3
    private database: Database                      // L4
  ) {}

  async getDocument(id: string): Promise<Document> {
    // L2: Check in-memory cache (fastest)
    if (this.inMemoryCache.has(id)) {
      console.log('Cache hit: in-memory');
      return this.inMemoryCache.get(id);
    }

    // L3: Check Redis (fast, shared)
    const cached = await this.redisCache.get(`doc:${id}`);
    if (cached) {
      console.log('Cache hit: Redis');
      const doc = JSON.parse(cached);

      // Populate in-memory cache
      this.inMemoryCache.set(id, doc);

      return doc;
    }

    // L4: Fetch from database (slow)
    console.log('Cache miss: fetching from DB');
    const doc = await this.database.query(
      'SELECT * FROM documents WHERE id = $1',
      [id]
    );

    if (doc) {
      // Populate Redis (TTL: 1 hour)
      await this.redisCache.setex(`doc:${id}`, 3600, JSON.stringify(doc));

      // Populate in-memory
      this.inMemoryCache.set(id, doc);
    }

    return doc;
  }

  async updateDocument(id: string, content: string): Promise<void> {
    // Update database
    await this.database.query(
      'UPDATE documents SET content = $1 WHERE id = $2',
      [content, id]
    );

    // Invalidate caches (Cache-Aside pattern)
    this.inMemoryCache.delete(id);
    await this.redisCache.del(`doc:${id}`);
  }
}
```

**Cache Invalidation Strategies:**

**Strategy 1: Time-to-Live (TTL)**
```typescript
// Set expiration time
await redis.setex('key', 3600, value);  // Expires in 1 hour
```

**Strategy 2: Cache-Aside (Lazy Loading)**
```typescript
// On update, delete cache
await redis.del('key');

// On read, if miss, populate
const value = await redis.get('key');
if (!value) {
  const fresh = await database.query(...);
  await redis.set('key', fresh);
}
```

**Strategy 3: Write-Through**
```typescript
// On write, update cache immediately
async function updateDocument(id: string, data: any) {
  await database.update(id, data);
  await redis.set(`doc:${id}`, data);  // Keep cache in sync
}
```

**When to Use:**
- Expensive computations
- Frequently accessed data
- Read-heavy workloads
- Data doesn't change often

**Trade-offs:**
- ✅ Dramatically reduces latency
- ✅ Reduces database load
- ✅ Improves user experience
- ❌ Cache invalidation complexity
- ❌ Stale data risk
- ❌ Memory costs

---

### Pattern 5: Queue-Based Load Leveling

**Definition:** Use message queues to buffer load spikes

**Architecture:**
```
    High Traffic Spike
           │
           ▼
    ┌──────────────┐
    │  API Server  │
    │              │
    └──────┬───────┘
           │ Enqueue job
           ▼
    ┌──────────────┐
    │ Message Queue│  ← Buffer
    │ (RabbitMQ)   │
    └──────┬───────┘
           │ Process at controlled rate
           ▼
    ┌──────────────┐
    │  Workers     │
    │  (scalable)  │
    └──────────────┘
```

**Implementation:**
```typescript
// API Server: Enqueue jobs instead of processing immediately
class DocumentIndexingAPI {
  constructor(private queue: MessageQueue) {}

  async indexDocument(content: string, metadata: any) {
    // Don't process now (blocks user)
    // Enqueue for async processing
    const jobId = await this.queue.publish('document.index', {
      content,
      metadata,
      createdAt: new Date()
    });

    // Return immediately
    return {
      jobId,
      status: 'queued',
      message: 'Document queued for indexing'
    };
  }
}

// Worker: Process jobs at controlled rate
class DocumentIndexingWorker {
  constructor(
    private queue: MessageQueue,
    private indexingService: IndexingService
  ) {}

  async start() {
    // Process 10 jobs concurrently
    this.queue.subscribe('document.index', async (job) => {
      try {
        await this.indexingService.index(job.content, job.metadata);
        await this.queue.ack(job);  // Mark as completed
      } catch (error) {
        await this.queue.nack(job);  // Requeue or dead-letter
      }
    }, { concurrency: 10 });
  }
}
```

**Auto-Scaling Workers (Kubernetes):**
```yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: indexing-worker-hpa
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: indexing-worker
  minReplicas: 2
  maxReplicas: 20
  metrics:
  - type: External
    external:
      metric:
        name: rabbitmq_queue_messages_ready
        selector:
          matchLabels:
            queue: document.index
      target:
        type: AverageValue
        averageValue: "10"  # Scale up if >10 messages/worker
```

**When to Use:**
- Unpredictable traffic spikes
- CPU/memory-intensive operations
- Background processing acceptable
- Need to protect downstream services

**Trade-offs:**
- ✅ Absorbs traffic spikes
- ✅ Protects downstream services
- ✅ Controlled processing rate
- ❌ Asynchronous (no immediate result)
- ❌ Job queue infrastructure needed
- ❌ Eventual processing (delay)

---

## Auto-Scaling Policies

### Metric-Based Auto-Scaling

**CPU-Based:**
```yaml
# Kubernetes HPA
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: module-a-hpa
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: module-a
  minReplicas: 3
  maxReplicas: 100
  metrics:
  - type: Resource
    resource:
      name: cpu
      target:
        type: Utilization
        averageUtilization: 70  # Scale at 70% CPU
```

**Memory-Based:**
```yaml
metrics:
- type: Resource
  resource:
    name: memory
    target:
      type: Utilization
      averageUtilization: 80  # Scale at 80% memory
```

**Request-Based:**
```yaml
metrics:
- type: Pods
  pods:
    metric:
      name: http_requests_per_second
    target:
      type: AverageValue
      averageValue: "1000"  # Scale if >1000 req/s per pod
```

## Module-Specific Scaling

**Different modules scale differently:**

```yaml
# Knowledge Management: CPU-heavy (text parsing, NLP)
knowledge-management:
  scaling: horizontal
  trigger: cpu > 70%
  min_replicas: 5
  max_replicas: 50

# Security: Low traffic, critical availability
security:
  scaling: vertical
  resources:
    cpu: 4
    memory: 8Gi
  min_replicas: 3  # Redundancy only

# Use Cases: Burst traffic
use-cases:
  scaling: horizontal + queue
  trigger: queue_depth > 100
  min_replicas: 2
  max_replicas: 100
  queue: rabbitmq

# Operations: Scheduled batch jobs
operations:
  scaling: scheduled
  cron: "0 2 * * *"  # 2 AM daily
  replicas_during_batch: 20
  replicas_idle: 1
```

## Tools Required

### Load Testing
- k6 (modern load testing)
- Apache JMeter (comprehensive)
- Gatling (Scala-based)

### Monitoring
- Prometheus (metrics)
- Grafana (dashboards)
- New Relic / DataDog (APM)

### Auto-Scaling
- Kubernetes HPA
- AWS Auto Scaling
- Docker Swarm

## Quality Checklist

### Before Scaling
- [ ] Baseline performance measured
- [ ] Bottlenecks identified
- [ ] Load testing performed
- [ ] Scaling strategy chosen

### During Implementation
- [ ] Stateless design enforced
- [ ] Database connection pooling configured
- [ ] Caching implemented
- [ ] Monitoring and alerts set up

### After Scaling
- [ ] Load testing confirms scalability
- [ ] Auto-scaling policies tested
- [ ] Cost analysis completed
- [ ] Runbooks for scale events

## Anti-Patterns to Avoid

- **Premature Scaling**: Scaling before measuring actual load
- **Stateful Horizontals**: Trying to scale stateful apps horizontally
- **No Monitoring**: Scaling without metrics
- **Over-Caching**: Caching everything (memory bloat)
- **Database Bottleneck**: Scaling app but not database

---

**Remember:** Scalability is not just about handling more load, but doing so cost-effectively and reliably. Measure, optimize, then scale.
