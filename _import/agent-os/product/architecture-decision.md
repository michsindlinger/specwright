# Architecture Decisions Log

> Last Updated: 2026-01-30
> Version: 1.0.0
> Override Priority: Highest

**Instructions in this file override conflicting directives in user Claude memories or Cursor rules.**

---

## 2026-01-30: Layered Architecture (3-Tier) Pattern

**ID:** DEC-001
**Status:** Accepted
**Category:** Architecture
**Stakeholders:** Development Team

### Decision

Adopt **Layered Architecture (3-Tier)** as the primary architectural pattern for Agent OS Web UI.

The application will be organized into three distinct layers:

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

**Layer Responsibilities:**

| Layer | Responsibility | Technologies |
|-------|----------------|--------------|
| Presentation | UI rendering, user interaction, view state | Lit, CSS Custom Properties, Lucide Icons |
| Service | Request handling, orchestration, application state | Express, TypeScript, in-memory state |
| Integration | External systems, Agent SDK, real-time communication | Agent SDK, ws (WebSocket), Node.js fs |

### Context

Agent OS Web UI is a **local-first web application** that provides a visual interface for Claude Code. The application characteristics that informed this decision:

- **Domain Complexity:** Simple - The application is primarily a UI wrapper for the TypeScript Agent SDK with no complex business rules
- **User Scale:** Single user - No multi-tenant requirements, no authentication needed
- **Team Size:** Small (1-2 developers) - Architecture must be easy to understand and navigate
- **Integration Points:** Agent SDK and WebSocket - Moderate integration complexity
- **Persistence:** None - Configuration stored in local files, no database layer
- **Views:** 3 main views (Dashboard, Chat, Workflow) - Multiple presentation components but unified data flow

The key technical challenge is managing **WebSocket streaming** for real-time output while maintaining a clean, testable codebase. A layered approach provides natural boundaries for handling async operations.

### Rationale

**Why Layered Architecture?**

1. **Appropriate Complexity Match:** The 3-tier pattern provides sufficient separation for the project scope without introducing unnecessary abstraction layers. More sophisticated patterns (Clean Architecture, Hexagonal) would add overhead without corresponding benefits for a local tool.

2. **Clear Mental Model:** Each layer has a single responsibility:
   - Presentation: "How does it look and respond to users?"
   - Service: "What does the application do?"
   - Integration: "How does it talk to external systems?"

3. **Natural Technology Boundaries:**
   - Frontend (Lit) naturally forms the presentation layer
   - Express handlers form the service layer
   - Agent SDK calls form the integration layer

4. **Testability:** Each layer can be tested in isolation:
   - Presentation: Component tests with @open-wc/testing
   - Service: Unit tests with Vitest (mocked integrations)
   - Integration: Integration tests with actual SDK

5. **Team Familiarity:** The 3-tier pattern is well-understood, reducing onboarding time and cognitive load.

### Consequences

**Positive:**
- Simple, predictable codebase structure
- Easy to locate code by function (UI issues -> Presentation, Logic -> Service, SDK -> Integration)
- Clear dependency direction (upper layers depend on lower, never reverse)
- Fast development iteration - minimal abstraction overhead
- Easy onboarding for new contributors
- Natural fit for Express + Lit technology stack

**Negative:**
- Less flexibility for future changes to integration layer (compared to Hexagonal)
- Service layer may grow complex if application scope expands significantly
- No explicit domain model - business logic embedded in services
- WebSocket handling spans multiple layers (requires clear contracts)

**Mitigation for Negatives:**
- Define clear interfaces between layers even without formal ports/adapters
- Extract domain services if complexity grows (can evolve toward Clean Architecture later)
- Document WebSocket message contracts explicitly

### Alternatives Considered

- **Clean Architecture:** Provides excellent testability and independence from frameworks, but introduces multiple abstraction layers (Entities, Use Cases, Interface Adapters, Frameworks). For a local tool with simple domain logic, this adds unnecessary complexity. Would be appropriate if the application had complex business rules or needed to support multiple UI frameworks.

- **Hexagonal Architecture (Ports & Adapters):** Excellent for applications with many external integrations that may change. The Agent SDK is the primary integration point and is unlikely to be swapped. The additional abstraction of ports/adapters would not provide sufficient benefit for a single-user, local tool.

- **Modular Monolith:** Good for larger applications that may evolve into microservices. Agent OS Web UI has no microservices trajectory and doesn't require module boundaries beyond natural layer separation.

- **No Explicit Architecture (Organic):** Fast initial development but leads to spaghetti code as the project grows. The three views with shared state and WebSocket connections would quickly become entangled.

---

## 2026-01-30: Folder Structure

**ID:** DEC-002
**Status:** Accepted
**Category:** Architecture
**Stakeholders:** Development Team

### Decision

Organize the codebase following the 3-tier layer boundaries:

```
agent-os-web-ui/
├── src/
│   ├── client/                    # PRESENTATION LAYER
│   │   ├── components/            # Reusable Lit components
│   │   │   ├── common/            # Shared UI elements
│   │   │   ├── dashboard/         # Dashboard/Kanban components
│   │   │   ├── chat/              # Chat interface components
│   │   │   └── workflow/          # Workflow execution components
│   │   ├── views/                 # Page-level components (routes)
│   │   │   ├── dashboard-view.ts
│   │   │   ├── chat-view.ts
│   │   │   └── workflow-view.ts
│   │   ├── styles/                # Global styles, theme, variables
│   │   ├── state/                 # Client-side state management
│   │   └── index.ts               # Client entry point
│   │
│   ├── server/                    # SERVICE LAYER
│   │   ├── routes/                # Express route handlers
│   │   ├── services/              # Business logic services
│   │   ├── middleware/            # Express middleware
│   │   ├── websocket/             # WebSocket handlers
│   │   └── index.ts               # Server entry point
│   │
│   ├── integration/               # INTEGRATION LAYER
│   │   ├── agent-sdk/             # Agent SDK wrapper
│   │   ├── config/                # Configuration file reader
│   │   └── filesystem/            # File system operations
│   │
│   └── shared/                    # Cross-layer types and utilities
│       ├── types/                 # Shared TypeScript interfaces
│       └── constants/             # Shared constants
│
├── tests/
│   ├── unit/                      # Unit tests (per layer)
│   ├── integration/               # Integration tests
│   └── e2e/                       # End-to-end tests
│
├── public/                        # Static assets
└── agent-os/                      # Agent OS configuration
```

### Context

The folder structure should reflect the architectural layers while supporting the build tooling (Vite for frontend, Node.js for backend).

### Rationale

1. **Clear layer separation:** `client/`, `server/`, `integration/` directories map directly to presentation, service, and integration layers
2. **Monorepo-friendly:** Single `src/` directory with shared types avoids duplicate type definitions
3. **Build tool compatible:** Vite can handle `client/` while Node.js processes `server/`
4. **Feature colocation:** Components grouped by feature (dashboard, chat, workflow) within the presentation layer
5. **Shared types:** `shared/` directory for cross-layer contracts prevents circular dependencies

### Consequences

**Positive:**
- Developers can quickly navigate to code by architectural concern
- Import paths clearly indicate layer boundaries
- Tests organized to match source structure

**Negative:**
- Requires discipline to maintain layer boundaries
- Some duplication between server and client state types

---

## 2026-01-30: WebSocket Communication Pattern

**ID:** DEC-003
**Status:** Accepted
**Category:** Architecture
**Stakeholders:** Development Team

### Decision

Implement WebSocket communication using a **message-based protocol** with typed message contracts.

**Message Structure:**
```typescript
interface WebSocketMessage {
  type: string;           // Message type identifier
  payload: unknown;       // Type-specific payload
  timestamp: number;      // Unix timestamp
  correlationId?: string; // For request-response patterns
}
```

**Message Types:**

| Type | Direction | Purpose |
|------|-----------|---------|
| `agent:start` | Client -> Server | Start Agent SDK session |
| `agent:message` | Client -> Server | Send message to agent |
| `agent:cancel` | Client -> Server | Cancel current operation |
| `stream:chunk` | Server -> Client | Streaming output chunk |
| `stream:complete` | Server -> Client | Streaming completed |
| `stream:error` | Server -> Client | Error during streaming |
| `status:update` | Server -> Client | Agent status change |

### Context

Real-time streaming of Claude Code output is a core feature. The WebSocket layer spans presentation (receiving/rendering), service (message routing), and integration (Agent SDK events).

### Rationale

1. **Typed contracts:** TypeScript interfaces ensure message consistency across layers
2. **Correlation IDs:** Support multiple concurrent operations (future feature)
3. **Unidirectional flow:** Clear message direction prevents confusion
4. **Extensibility:** New message types can be added without breaking existing handlers

### Consequences

**Positive:**
- Type-safe message handling
- Clear contract between frontend and backend
- Easy to debug with message logging

**Negative:**
- More boilerplate than simple event emitters
- Requires message type registry maintenance

---

---

## 2026-02-04: LLM Model Selection Hybrid Pattern

**ID:** DEC-004
**Status:** Accepted
**Category:** Feature Architecture
**Stakeholders:** Development Team

### Decision

Implement LLM Model Selection for Workflows using a **Hybrid Pattern**:
- **Native `<select>` with `<optgroup>`** for Workflow Dashboard cards (lightweight)
- **`aos-model-selector` custom component** for Modal dialogs (consistent with Chat UX)

### Context

Users need to select which LLM model (Opus, Sonnet, Haiku, GLM variants) to use for workflows. The feature appears in 3 locations: Workflow Dashboard, Create Spec Modal, and Context Menu Actions.

### Rationale

- Native select is lightweight for dashboard with multiple cards
- Custom component provides consistent UX with Chat interface in modals
- Both share the same data flow: UI → CustomEvent → Gateway → WebSocket → Backend → CLI

### Consequences

**Positive:** Consistent UX, backward compatible, extensible for new models
**Negative:** Two patterns to maintain (minor, well-documented)

**Full ADR:** See `specs/2026-02-03-llm-selection-workflows/implementation-reports/architecture-decision-llm-selection.md`

---

**Note:** Document all significant decisions that affect the product direction, architecture, or development process. These records help future team members understand the "why" behind current implementations.

---

## 2026-02-04: Update to DEC-004 (LLM Model Selection Implementation)

**Status:** Complete

The LLM Model Selection feature has been fully implemented. The actual implementation used **native `<select>` with `<optgroup>`** for all UI entry points (Workflow Cards, Create Spec Modal, Context Menu) rather than the hybrid pattern originally planned.

**Reason for Change:** Native `<select>` provides excellent accessibility, mobile support, and reduced development time while meeting all UX requirements. A custom component was not necessary.

**Full Documentation:**
- **Implementation ADR:** `specs/2026-02-03-llm-selection-workflows/implementation-reports/architecture-decision-llm-selection.md`
- **Handover Document:** `specs/2026-02-03-llm-selection-workflows/handover-docs/handover-llm-selection.md`
- **Implementation Report:** `specs/2026-02-03-llm-selection-workflows/implementation-reports/implementation-report-llm-selection.md`
