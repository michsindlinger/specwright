# [SKILL_NAME] - Modular Architecture

> **Role:** Modular Architecture Designer
> **Domain:** Module Boundaries & Platform Structure
> **Created:** [CURRENT_DATE]

## Purpose

Design modular platform architectures with clear module boundaries, well-defined interfaces, and appropriate coupling strategies. Balance modularity with simplicity and operational complexity.

## When to Activate

**Use this skill for:**
- Defining module boundaries
- Choosing architecture patterns (Monolith, Microservices, Modular Monolith)
- Designing module interfaces
- Database strategy (shared vs per-module)
- Deployment strategy (monolithic vs per-module)
- Module evolution and refactoring

**Do NOT use for:**
- Single-module internal architecture
- Component-level design
- UI module structure (use frontend skills)

## Core Capabilities

### 1. Module Boundary Definition
- Single Responsibility Principle for modules
- Domain-driven module design
- Loose coupling, high cohesion
- Clear ownership and autonomy

### 2. Architecture Pattern Selection
- Monolithic architecture
- Microservices architecture
- Modular monolith (hybrid)
- Choosing based on requirements

### 3. Interface Design
- Module APIs and contracts
- Event schemas
- Data sharing strategies
- Versioning and compatibility

### 4. Database Strategy
- Shared database pattern
- Database per module pattern
- Hybrid database strategy
- Data consistency approaches

## Architecture Patterns

### Pattern 1: Modular Monolith

**When to Use:**
- Early-stage platforms
- Small to medium teams
- Shared domain context
- Rapid iteration needed
- Preparing for future microservices

**Architecture:**
```
┌─────────────────────────────────────────┐
│         Monolithic Application          │
│  ┌────────┐  ┌────────┐  ┌────────┐   │
│  │Module A│  │Module B│  │Module C│   │
│  │        │  │        │  │        │   │
│  │ Domain │  │ Domain │  │ Domain │   │
│  │ Logic  │  │ Logic  │  │ Logic  │   │
│  └───┬────┘  └───┬────┘  └───┬────┘   │
│      └───────────┼───────────┘         │
│                  │                      │
│         ┌────────▼────────┐            │
│         │ Shared Database │            │
│         └─────────────────┘            │
└─────────────────────────────────────────┘
```

**Directory Structure:**
```
src/
├── modules/
│   ├── knowledge-management/
│   │   ├── domain/
│   │   │   ├── entities/
│   │   │   ├── value-objects/
│   │   │   └── repositories/
│   │   ├── application/
│   │   │   ├── services/
│   │   │   └── use-cases/
│   │   ├── infrastructure/
│   │   │   └── persistence/
│   │   └── presentation/
│   │       └── api/
│   │
│   ├── security/
│   │   ├── domain/
│   │   ├── application/
│   │   ├── infrastructure/
│   │   └── presentation/
│   │
│   └── use-cases/
│       ├── domain/
│       ├── application/
│       ├── infrastructure/
│       └── presentation/
│
├── shared/
│   ├── kernel/
│   ├── events/
│   └── infrastructure/
│
└── main.ts
```

**Module Interface Example:**
```typescript
// Module: Knowledge Management

// Public API (what other modules can use)
export interface KnowledgeManagementAPI {
  // Document operations
  indexDocument(content: string, metadata: DocumentMetadata): Promise<string>;
  searchDocuments(query: string): Promise<SearchResult[]>;
  getDocument(id: string): Promise<Document | null>;

  // Events published by this module
  on(event: 'DocumentIndexed', handler: (doc: Document) => void): void;
  on(event: 'DocumentUpdated', handler: (doc: Document) => void): void;
}

// Internal implementation (not exposed)
class KnowledgeManagementModule implements KnowledgeManagementAPI {
  constructor(
    private documentRepository: DocumentRepository,
    private searchEngine: SearchEngine,
    private eventBus: EventBus
  ) {}

  async indexDocument(content: string, metadata: DocumentMetadata): Promise<string> {
    // Internal logic not exposed
    const document = await this.parseAndIndex(content, metadata);
    this.eventBus.publish(new DocumentIndexedEvent(document));
    return document.id;
  }

  // Other public methods...

  // Private methods (internal to module)
  private async parseAndIndex(content: string, metadata: DocumentMetadata) {
    // Module-internal logic
  }
}

// Module registration
export function registerKnowledgeManagementModule(container: DIContainer) {
  container.register('KnowledgeManagementAPI', KnowledgeManagementModule);
}
```

**Cross-Module Communication:**
```typescript
// Module: Use Cases (depends on Knowledge Management)

import { KnowledgeManagementAPI } from '../knowledge-management';

class DocumentAnalysisUseCase {
  constructor(
    private knowledgeAPI: KnowledgeManagementAPI  // Dependency injection
  ) {}

  async analyzeDocument(query: string) {
    // Call Knowledge Management via interface
    const documents = await this.knowledgeAPI.searchDocuments(query);

    // Use Case logic...
    return this.performAnalysis(documents);
  }
}
```

**Trade-offs:**
- ✅ Simple deployment (single artifact)
- ✅ Easy refactoring (shared codebase)
- ✅ Transactions across modules
- ✅ Lower operational complexity
- ❌ Must deploy all modules together
- ❌ Shared scaling (cannot scale modules independently)
- ❌ Potential tight coupling if not disciplined

---

### Pattern 2: Microservices

**When to Use:**
- Large platforms (10+ modules)
- Multiple teams with autonomy
- Different scaling requirements per module
- Technology diversity needed
- Independent deployment critical

**Architecture:**
```
┌────────────┐     ┌────────────┐     ┌────────────┐
│  Module A  │     │  Module B  │     │  Module C  │
│  Service   │     │  Service   │     │  Service   │
│            │     │            │     │            │
│  ┌──────┐  │     │  ┌──────┐  │     │  ┌──────┐  │
│  │  DB  │  │     │  │  DB  │  │     │  │  DB  │  │
│  └──────┘  │     │  └──────┘  │     │  └──────┘  │
└──────┬─────┘     └─────┬──────┘     └─────┬──────┘
       │                 │                   │
       └─────────────────┼───────────────────┘
                         │
                  ┌──────▼──────┐
                  │ API Gateway │
                  │ Event Bus   │
                  └─────────────┘
```

**Service Structure:**
```
services/
├── knowledge-management/
│   ├── src/
│   │   ├── domain/
│   │   ├── application/
│   │   └── infrastructure/
│   ├── Dockerfile
│   ├── package.json
│   └── README.md
│
├── security/
│   ├── src/
│   ├── Dockerfile
│   └── package.json
│
└── use-cases/
    ├── src/
    ├── Dockerfile
    └── package.json
```

**Service Communication:**
```typescript
// Service: Knowledge Management
import express from 'express';

const app = express();

// REST API
app.get('/v1/documents/:id', async (req, res) => {
  const document = await documentService.findById(req.params.id);
  res.json(document);
});

app.post('/v1/documents', async (req, res) => {
  const document = await documentService.index(req.body);

  // Publish event to message bus
  await messageBus.publish({
    type: 'DocumentIndexed',
    payload: document
  });

  res.status(201).json(document);
});

app.listen(3001);
```

```typescript
// Service: Use Cases
import axios from 'axios';

class DocumentAnalysisService {
  private knowledgeServiceURL = process.env.KNOWLEDGE_SERVICE_URL;

  async analyzeDocument(documentId: string) {
    // HTTP call to Knowledge Management service
    const response = await axios.get(
      `${this.knowledgeServiceURL}/v1/documents/${documentId}`
    );

    const document = response.data;

    // Analysis logic...
    return this.performAnalysis(document);
  }
}
```

**Service Discovery:**
```yaml
# docker-compose.yml
version: '3'
services:
  knowledge-management:
    build: ./services/knowledge-management
    environment:
      - DATABASE_URL=postgres://db/knowledge
    ports:
      - "3001:3000"

  security:
    build: ./services/security
    environment:
      - DATABASE_URL=postgres://db/security
    ports:
      - "3002:3000"

  use-cases:
    build: ./services/use-cases
    environment:
      - KNOWLEDGE_SERVICE_URL=http://knowledge-management:3000
      - SECURITY_SERVICE_URL=http://security:3000
    ports:
      - "3003:3000"
```

**Trade-offs:**
- ✅ Independent deployment
- ✅ Independent scaling
- ✅ Technology diversity
- ✅ Team autonomy
- ❌ Operational complexity (many services)
- ❌ Distributed systems challenges
- ❌ No cross-service transactions
- ❌ Network latency

---

### Pattern 3: Hybrid (Strategic Microservices)

**When to Use:**
- Core modules in monolith
- Performance-critical modules as services
- Gradual migration from monolith
- Balance simplicity with flexibility

**Architecture:**
```
┌─────────────────────────────────┐
│      Monolithic Core            │
│  ┌─────────┐    ┌─────────┐    │
│  │Module A │    │Module B │    │
│  └─────────┘    └─────────┘    │
│         │             │         │
│    ┌────▼─────────────▼────┐   │
│    │   Shared Database     │   │
│    └───────────────────────┘   │
└──────────┬──────────────────────┘
           │
    ┌──────┼──────┐
    │      │      │
┌───▼──┐ ┌─▼───┐ ┌▼────┐
│Svc C │ │Svc D│ │Svc E│
│┌────┐│ │┌───┐│ │┌───┐│
││ DB ││ ││DB ││ ││DB ││
│└────┘│ │└───┘│ │└───┘│
└──────┘ └─────┘ └─────┘
```

**Example: Knowledge Management Platform**
```
Monolithic Core:
- Knowledge Management (core, shared by many)
- Security (needed by all, low change rate)
- Operations (admin features)

Microservices:
- ML Processing Service (CPU-intensive, scales independently)
- Web Scraper Service (external integrations, failures isolated)
- Real-time Chat Service (WebSocket-heavy, special scaling needs)
```

**Trade-offs:**
- ✅ Balance simplicity with flexibility
- ✅ Extract only what needs independence
- ✅ Gradual migration path
- ❌ Hybrid complexity (both monolith AND services)
- ❌ Need to manage both deployment models

## Database Strategies

### Strategy 1: Shared Database

**Pattern:**
```
┌─────────┐    ┌─────────┐    ┌─────────┐
│Module A │    │Module B │    │Module C │
└────┬────┘    └────┬────┘    └────┬────┘
     │              │              │
     └──────────────┼──────────────┘
                    │
            ┌───────▼────────┐
            │ Shared Database│
            │                │
            │ ┌────────────┐ │
            │ │Schema: A   │ │
            │ │Schema: B   │ │
            │ │Schema: C   │ │
            │ └────────────┘ │
            └────────────────┘
```

**Access Rules:**
```typescript
// Module A can ONLY access its own schema
class ModuleARepository {
  async save(entity: EntityA) {
    return db.query('INSERT INTO module_a.entities ...', [entity]);
  }

  // ❌ NEVER do this (accessing Module B schema)
  // async getModuleBData() {
  //   return db.query('SELECT * FROM module_b.entities');
  // }
}

// Module B can ONLY access its own schema
class ModuleBRepository {
  async save(entity: EntityB) {
    return db.query('INSERT INTO module_b.entities ...', [entity]);
  }
}
```

**Pros:**
- Simple transactions across modules
- Easy joins for queries
- Single backup/restore

**Cons:**
- Schema coupling
- Single scaling unit
- Migration coordination needed

---

### Strategy 2: Database per Module

**Pattern:**
```
┌─────────┐       ┌─────────┐       ┌─────────┐
│Module A │       │Module B │       │Module C │
└────┬────┘       └────┬────┘       └────┬────┘
     │                 │                 │
┌────▼────┐       ┌────▼────┐       ┌────▼────┐
│  DB A   │       │  DB B   │       │  DB C   │
└─────────┘       └─────────┘       └─────────┘
```

**Data Sharing via APIs:**
```typescript
// Module A wants Module B data

// ❌ NEVER access Module B database directly
// const data = await moduleBDatabase.query('SELECT ...');

// ✅ Call Module B API
const data = await moduleBAPI.getData();
```

**Eventual Consistency:**
```typescript
// Module A publishes event
await eventBus.publish({
  type: 'OrderCreated',
  payload: { orderId: '123', userId: 'user-456' }
});

// Module B subscribes and syncs its read model
eventBus.subscribe('OrderCreated', async (event) => {
  await moduleBDatabase.query(`
    INSERT INTO order_cache (order_id, user_id, created_at)
    VALUES ($1, $2, $3)
  `, [event.payload.orderId, event.payload.userId, new Date()]);
});
```

**Pros:**
- True module independence
- Different database technologies
- Independent scaling

**Cons:**
- No cross-module transactions
- Eventual consistency
- Data duplication

## Module Interface Patterns

### Pattern 1: Facade Pattern

```typescript
// Module exposes single entry point
export class KnowledgeManagementFacade {
  constructor(
    private documentService: DocumentService,
    private searchService: SearchService,
    private indexingService: IndexingService
  ) {}

  // Simplified API for other modules
  async indexDocument(content: string, metadata: any): Promise<string> {
    const parsed = await this.documentService.parse(content);
    const indexed = await this.indexingService.index(parsed, metadata);
    await this.searchService.addToIndex(indexed);
    return indexed.id;
  }

  async search(query: string): Promise<SearchResult[]> {
    return this.searchService.search(query);
  }
}
```

### Pattern 2: Repository Pattern

```typescript
// Module exposes data access abstraction
export interface DocumentRepository {
  findById(id: string): Promise<Document | null>;
  findByQuery(query: Query): Promise<Document[]>;
  save(document: Document): Promise<void>;
  delete(id: string): Promise<void>;
}

// Implementation hidden inside module
class PostgresDocumentRepository implements DocumentRepository {
  // Internal implementation
}
```

### Pattern 3: Event-Driven Interface

```typescript
// Module publishes domain events
export interface KnowledgeManagementEvents {
  DocumentIndexed: DocumentIndexedEvent;
  DocumentUpdated: DocumentUpdatedEvent;
  DocumentDeleted: DocumentDeletedEvent;
}

// Other modules subscribe
eventBus.subscribe<DocumentIndexedEvent>('DocumentIndexed', (event) => {
  console.log('Document indexed:', event.documentId);
});
```

## Tools Required

### Module Boundaries
- Domain-Driven Design principles
- Bounded Context mapping
- Conway's Law considerations

### Visualization
- C4 Model diagrams
- Module dependency graphs

### Enforcement
- Linters (enforce import rules)
- Architecture tests

## Quality Checklist

### Module Design
- [ ] Clear module purpose (Single Responsibility)
- [ ] Well-defined public interface
- [ ] Internal implementation hidden
- [ ] Minimal dependencies on other modules

### Communication
- [ ] Interface contracts documented
- [ ] Versioning strategy defined
- [ ] Error handling specified
- [ ] Events schema documented

### Database
- [ ] Database strategy chosen (shared vs per-module)
- [ ] Access rules enforced
- [ ] Migration strategy defined

## Anti-Patterns to Avoid

- **Distributed Monolith**: Microservices with tight coupling
- **Leaky Abstraction**: Internal details exposed in interface
- **God Module**: One module with too many responsibilities
- **Bypass APIs**: Direct database access across modules
- **Shared Models**: Domain models leaked across module boundaries

---

**Remember:** Modularity is about managing complexity through clear boundaries, not creating complexity through unnecessary distribution. Start simple, evolve as needed.
