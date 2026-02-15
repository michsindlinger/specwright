# Architecture Structure Documentation

> Last Updated: 2026-01-30
> Version: 1.0.0
> Reference: @agent-os/product/architecture-decision.md (DEC-001, DEC-002)

## Overview

This document defines the folder conventions and architectural structure for Agent OS Web UI, implementing the **Layered Architecture (3-Tier)** pattern.

## Architectural Layers

```
+------------------------------------------+
|           PRESENTATION LAYER             |
|   (Lit Web Components, Views, Routing)   |
+------------------------------------------+
                    |
                    v
+------------------------------------------+
|            SERVICE LAYER                 |
|  (API Handlers, Business Logic, State)   |
+------------------------------------------+
                    |
                    v
+------------------------------------------+
|          INTEGRATION LAYER               |
|    (Agent SDK, WebSocket, File I/O)      |
+------------------------------------------+
```

## Directory Structure

### Root Structure

```
agent-os-web-ui/
├── src/
│   ├── client/                    # Frontend (Presentation Layer)
│   ├── server/                    # Backend (Service + Integration Layers)
│   └── shared/                    # Cross-layer types and utilities
├── tests/
│   ├── unit/
│   ├── integration/
│   └── e2e/
├── public/                        # Static assets
└── agent-os/                      # Agent OS configuration
```

### Backend Structure (Service + Integration)

```
src/server/
├── presentation/
│   └── routes/                    # Express route handlers
│       ├── api.routes.ts          # REST API endpoints
│       ├── health.routes.ts       # Health check endpoints
│       └── index.ts               # Route aggregator
│
├── services/                      # Business Logic Layer
│   ├── agent.service.ts           # Agent orchestration
│   ├── session.service.ts         # Session management
│   ├── message.service.ts         # Message processing
│   └── state.service.ts           # Application state
│
├── integration/                   # External Systems Layer
│   ├── agent-sdk.wrapper.ts       # Agent SDK abstraction
│   ├── websocket.handler.ts       # WebSocket management
│   └── config.reader.ts           # Configuration file I/O
│
└── index.ts                       # Server entry point
```

### Frontend Structure (Presentation)

```
src/client/
├── components/                    # Reusable Lit Components
│   ├── common/                    # Shared UI elements
│   │   ├── button.ts
│   │   ├── card.ts
│   │   ├── input.ts
│   │   └── modal.ts
│   ├── dashboard/                 # Dashboard-specific
│   │   ├── kanban-board.ts
│   │   ├── kanban-column.ts
│   │   └── kanban-card.ts
│   ├── chat/                      # Chat-specific
│   │   ├── message-list.ts
│   │   ├── message-input.ts
│   │   └── message-bubble.ts
│   └── workflow/                  # Workflow-specific
│       ├── task-list.ts
│       ├── task-item.ts
│       └── execution-log.ts
│
├── views/                         # Page-level Components
│   ├── dashboard-view.ts          # /dashboard route
│   ├── chat-view.ts               # /chat route
│   └── workflow-view.ts           # /workflow route
│
├── services/                      # Frontend Services
│   ├── api.client.ts              # REST API client
│   ├── websocket.client.ts        # WebSocket client
│   └── app.store.ts               # Application state store
│
├── styles/                        # CSS
│   ├── theme.css                  # CSS custom properties
│   ├── variables.css              # Color, spacing variables
│   └── reset.css                  # CSS reset/normalize
│
└── index.ts                       # Client entry point
```

### Shared Types

```
src/shared/
├── types/
│   ├── messages.types.ts          # WebSocket message types
│   ├── agent.types.ts             # Agent-related types
│   ├── session.types.ts           # Session types
│   └── api.types.ts               # API request/response types
│
└── constants/
    ├── message-types.ts           # WebSocket message type constants
    └── routes.ts                  # Route path constants
```

## Naming Conventions

### Files

| Type | Convention | Example |
|------|------------|---------|
| Components | kebab-case.ts | `kanban-board.ts` |
| Services | kebab-case.service.ts | `agent.service.ts` |
| Routes | kebab-case.routes.ts | `api.routes.ts` |
| Types | kebab-case.types.ts | `messages.types.ts` |
| Wrappers | kebab-case.wrapper.ts | `agent-sdk.wrapper.ts` |
| Handlers | kebab-case.handler.ts | `websocket.handler.ts` |

### Classes & Interfaces

| Type | Convention | Example |
|------|------------|---------|
| Lit Components | PascalCase | `KanbanBoard` |
| Services | PascalCaseService | `AgentService` |
| Interfaces | IPascalCase | `IWebSocketMessage` |
| Types | PascalCase | `MessagePayload` |

### CSS

| Type | Convention | Example |
|------|------------|---------|
| Custom Properties | --prefix-name | `--color-primary` |
| Component Scoped | :host {} | Standard Lit pattern |

## Layer Dependencies

### Allowed Dependencies

```
Presentation Layer
    ├── Can import from: Service Layer
    ├── Can import from: Shared Types
    └── Cannot import from: Integration Layer

Service Layer
    ├── Can import from: Integration Layer
    ├── Can import from: Shared Types
    └── Cannot import from: Presentation Layer

Integration Layer
    ├── Can import from: Shared Types
    ├── Cannot import from: Service Layer
    └── Cannot import from: Presentation Layer
```

### Import Path Aliases

**Backend (tsconfig.json):**
```typescript
"@presentation/*" -> "./src/presentation/*"
"@services/*"     -> "./src/services/*"
"@integration/*"  -> "./src/integration/*"
"@shared/*"       -> "../shared/*"
```

**Frontend (vite.config.ts):**
```typescript
"@components/*"   -> "./src/components/*"
"@views/*"        -> "./src/views/*"
"@services/*"     -> "./src/services/*"
"@styles/*"       -> "./src/styles/*"
"@shared/*"       -> "../shared/*"
```

## WebSocket Message Contracts

As defined in DEC-003, all WebSocket messages follow this structure:

```typescript
interface IWebSocketMessage {
  type: string;           // Message type identifier
  payload: unknown;       // Type-specific payload
  timestamp: number;      // Unix timestamp
  correlationId?: string; // For request-response patterns
}
```

### Message Type Registry

| Type | Direction | Layer Handler |
|------|-----------|---------------|
| `agent:start` | Client -> Server | Service Layer |
| `agent:message` | Client -> Server | Service Layer |
| `agent:cancel` | Client -> Server | Service Layer |
| `stream:chunk` | Server -> Client | Presentation Layer |
| `stream:complete` | Server -> Client | Presentation Layer |
| `stream:error` | Server -> Client | Presentation Layer |
| `status:update` | Server -> Client | Presentation Layer |

## Testing Structure

```
tests/
├── unit/
│   ├── client/
│   │   ├── components/           # Component unit tests
│   │   └── services/             # Frontend service tests
│   └── server/
│       ├── services/             # Backend service tests
│       └── integration/          # Integration wrapper tests
│
├── integration/
│   ├── api/                      # API endpoint tests
│   └── websocket/                # WebSocket flow tests
│
└── e2e/
    ├── dashboard.spec.ts         # Dashboard E2E tests
    ├── chat.spec.ts              # Chat E2E tests
    └── workflow.spec.ts          # Workflow E2E tests
```

## Boilerplate Reference

The initial project structure is available at:
- @agent-os/product/boilerplate/

Copy and customize the boilerplate files to initialize the project structure.

---

**Related Documentation:**
- Architecture Decision: @agent-os/product/architecture-decision.md
- Tech Stack: @agent-os/product/tech-stack.md
- Boilerplate README: @agent-os/product/boilerplate/README.md
