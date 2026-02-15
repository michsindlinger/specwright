---
description: Software Architect technical refinement and DoR/DoD for Agent OS Web UI
globs: []
alwaysApply: false
---

# Architect Refinement Skill

> Project: Agent OS Web UI
> Generated: 2026-01-30
> Purpose: Guide for technical refinement of user stories

## When to Use

This skill guides you when doing technical refinement for:
- New stories in `/create-spec`
- Added stories in `/add-story`
- Quick tasks in `/add-todo`
- Bug stories in `/add-bug`

## Quick Reference

### Technical Refinement Process

1. **Understand Requirements**: Read fachliche story (Feature, Acceptance Criteria)
2. **Analyze Architecture**: What patterns apply? (Layered 3-Tier)
3. **Determine WAS**: Which components to create/modify
4. **Determine WIE**: Architecture guidance and constraints
5. **Determine WO**: Which files to touch
6. **Define DoD**: Completion criteria
7. **Mark DoR**: All checkboxes [x] when ready

### Story is READY when

- [ ] Fachliche requirements clear
- [ ] Acceptance criteria specific and testable
- [ ] Technical approach defined (WAS/WIE/WO)
- [ ] Dependencies identified
- [ ] Story appropriately sized (max 5 files, 400 LOC)
- [ ] All betroffene Layer identified (Presentation/Service/Integration)
- [ ] Integration points documented (if Full-stack)

---

## Architecture Standards

### Layered Architecture (3-Tier)

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

### Layer Responsibilities

| Layer | Responsibility | Technologies |
|-------|----------------|--------------|
| Presentation | UI rendering, user interaction, view state | Lit, CSS Custom Properties, Lucide Icons |
| Service | Request handling, orchestration, application state | Express, TypeScript, in-memory state |
| Integration | External systems, Agent SDK, real-time communication | Agent SDK, ws (WebSocket), Node.js fs |

### Layer Dependencies (CRITICAL)

```
Presentation Layer
    ├── Can import from: Service Layer (via API)
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

---

## Project Structure

### Backend Structure
```
src/server/
├── presentation/routes/     # Express route handlers
├── services/                # Business Logic Layer
└── integration/             # Agent SDK, WebSocket, Config
```

### Frontend Structure
```
src/client/
├── components/              # Reusable Lit Components
│   ├── common/              # Shared UI elements (aos-button, aos-card)
│   ├── dashboard/           # Kanban components
│   ├── chat/                # Chat components
│   └── workflow/            # Workflow components
├── views/                   # Page-level components (routes)
├── services/                # API client, WebSocket client, state
└── styles/                  # CSS custom properties, theme
```

### Shared Types
```
src/shared/
├── types/                   # WebSocket messages, API types
└── constants/               # Message types, routes
```

---

## Naming Conventions

| Type | Convention | Example |
|------|------------|---------|
| Lit Components | aos-kebab-case | `aos-kanban-board` |
| Component Files | kebab-case.ts | `kanban-board.ts` |
| Services | kebab-case.service.ts | `agent.service.ts` |
| Routes | kebab-case.routes.ts | `api.routes.ts` |
| Types | kebab-case.types.ts | `messages.types.ts` |
| Classes | PascalCase | `KanbanBoard`, `AgentService` |
| Interfaces | IPascalCase | `IWebSocketMessage` |

---

## WebSocket Message Contracts

```typescript
interface IWebSocketMessage {
  type: string;           // Message type identifier
  payload: unknown;       // Type-specific payload
  timestamp: number;      // Unix timestamp
  correlationId?: string; // For request-response patterns
}
```

| Type | Direction | Layer Handler |
|------|-----------|---------------|
| `agent:start` | Client -> Server | Service Layer |
| `agent:message` | Client -> Server | Service Layer |
| `agent:cancel` | Client -> Server | Service Layer |
| `stream:chunk` | Server -> Client | Presentation Layer |
| `stream:complete` | Server -> Client | Presentation Layer |
| `stream:error` | Server -> Client | Presentation Layer |
| `status:update` | Server -> Client | Presentation Layer |

---

## Story Template Fields (v3.0)

```markdown
**Type**: Backend | Frontend | Full-Stack | DevOps
**Domain:** [optional - e.g., chat-interface]
**Abhängigkeiten:** [Story IDs or None]

### Technical Details

**WAS:** Components to create/modify
**WIE:** Architecture patterns and constraints
**WO:** File paths
**Geschätzte Komplexität:** XS/S/M
```

---

## Completion Check Commands

```bash
# TypeScript compiles
npm run build

# Tests pass
npm test

# Linter passes
npm run lint

# File existence check
test -f src/client/components/[component].ts && echo "Component OK"
```

---

## Quality Standards Reference

For full DoD criteria see: `agent-os/team/dod.md`
For full DoR criteria see: `agent-os/team/dor.md`
