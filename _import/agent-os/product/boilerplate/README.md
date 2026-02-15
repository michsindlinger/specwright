# Agent OS Web UI - Boilerplate Structure

> Generated: 2026-01-30
> Architecture: Layered 3-Tier
> Reference: @agent-os/product/architecture-decision.md

## Overview

This boilerplate provides the foundational directory structure for Agent OS Web UI, following the **Layered Architecture (3-Tier)** pattern.

## Structure

```
boilerplate/
├── backend/
│   ├── src/
│   │   ├── presentation/     # HTTP routes, controllers
│   │   ├── services/         # Business logic, orchestration
│   │   └── integration/      # Agent SDK, WebSocket, config
│   ├── package.json.example
│   └── tsconfig.json.example
│
├── frontend/
│   ├── src/
│   │   ├── components/       # Reusable Lit Web Components
│   │   ├── views/            # Page-level route components
│   │   ├── services/         # API client, state stores
│   │   └── styles/           # CSS themes, variables
│   ├── package.json.example
│   └── vite.config.ts.example
│
└── README.md
```

## Layer Responsibilities

### Backend

| Layer | Directory | Responsibility |
|-------|-----------|----------------|
| Presentation | `presentation/` | Express routes, request validation, response formatting |
| Service | `services/` | Business logic, state management, orchestration |
| Integration | `integration/` | Agent SDK wrapper, WebSocket handlers, config readers |

### Frontend

| Layer | Directory | Responsibility |
|-------|-----------|----------------|
| Presentation | `components/`, `views/` | Lit components, UI rendering, user interaction |
| Service | `services/` | API client, WebSocket client, state stores |
| Styles | `styles/` | CSS custom properties, theming, global styles |

## Usage

1. Copy the boilerplate structure to your project root
2. Rename `.example` files by removing the extension
3. Run `npm install` in both `backend/` and `frontend/`
4. Start development with `npm run dev`

## Configuration Files

- **package.json.example**: Remove `.example` extension and customize
- **tsconfig.json.example**: TypeScript configuration with path aliases
- **vite.config.ts.example**: Vite configuration with proxy settings

## Dependency Flow

```
Presentation --> Service --> Integration
     |              |             |
     v              v             v
  UI/Routes    Business      External
              Logic/State    Systems
```

Dependencies flow downward only. Upper layers may depend on lower layers, but never the reverse.

## Related Documentation

- Architecture Decision: @agent-os/product/architecture-decision.md
- Architecture Structure: @agent-os/product/architecture-structure.md
- Tech Stack: @agent-os/product/tech-stack.md
