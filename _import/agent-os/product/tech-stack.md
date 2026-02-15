# Technical Stack

> Last Updated: 2026-01-30
> Version: 1.0.0

## Application Framework

The backend is built with Node.js and Express, leveraging TypeScript for type safety and the official TypeScript Agent SDK for Claude Code integration. This provides a robust foundation for local server architecture with full API capabilities.

- **Framework:** Express.js
- **Version:** 4.x (latest stable)
- **Language:** TypeScript 5.x

## Database

This is a local-first application with no persistent database requirements. Configuration and project data are stored in local configuration files within the Agent OS project structure.

- **Primary Database:** None (local config files)
- **ORM/Query Builder:** N/A
- **Hosting:** Local filesystem
- **Backups:** User-managed (project files in git)

## Frontend Stack

The frontend uses Lit Web Components for a modern, lightweight, and standards-compliant component architecture. Vite provides fast development builds and optimized production bundles.

- **JavaScript Framework:** Lit 3.x (Web Components)
- **Build Tool:** Vite 5.x
- **Package Manager:** npm
- **Node Version:** 20.x LTS

## Styling & UI

CSS Custom Properties enable the Moltbot-style dark theme with consistent theming across all components. No external UI library is used - all components are custom-built Lit elements.

- **CSS Framework:** CSS Custom Properties (native CSS variables)
- **UI Components:** Custom Lit Web Components
- **Icons:** Lucide Icons (lightweight, MIT licensed)
- **Fonts:** System fonts (no external font loading)

## Hosting & Infrastructure

This is a local-only application that runs on the developer's machine. No cloud hosting or external infrastructure is required.

- **Application Hosting:** Local (Node.js server)
- **Asset Storage:** Local filesystem
- **CDN:** N/A (local assets)
- **Region:** N/A (local execution)

## CI/CD & Development

Development tooling focuses on local development experience. GitHub Actions can be used for linting and testing on commits.

- **CI/CD Platform:** GitHub Actions (optional)
- **Deployment Trigger:** N/A (local application)
- **Production Environment:** N/A (local execution)
- **Staging Environment:** N/A (local execution)

## Additional Tools

### Real-Time Communication
- **WebSocket Library:** ws (Node.js WebSocket implementation)
- **Purpose:** Real-time streaming of Claude Code output

### Testing
- **Test Framework:** Vitest
- **Component Testing:** @open-wc/testing (Lit component testing)
- **Coverage Target:** 80%+ for core functionality

### Code Quality
- **Linting:** ESLint with TypeScript plugin
- **Formatting:** Prettier
- **Type Checking:** TypeScript strict mode

### Development
- **Hot Reload:** Vite HMR for frontend
- **API Development:** nodemon for backend auto-restart
- **Debugging:** Chrome DevTools, Node.js inspector

### Agent SDK Integration
- **SDK:** @anthropic-ai/claude-code (TypeScript Agent SDK)
- **Purpose:** Claude Code process management and API integration

---

**Rationale Summary:**

| Choice | Rationale |
|--------|-----------|
| **Lit Web Components** | Modern, lightweight, web-standards compliant, no virtual DOM overhead |
| **Express + TypeScript** | Mature, well-documented, excellent TypeScript support for Agent SDK integration |
| **Vite** | Fast development builds, excellent Lit support, small production bundles |
| **WebSocket (ws)** | Native Node.js WebSocket for real-time streaming, no external dependencies |
| **No Database** | Local-first architecture, configuration in project files, no persistence needed |
| **CSS Custom Properties** | Native theming support, no CSS-in-JS overhead, easy dark theme implementation |
| **Vitest** | Fast, Vite-native, excellent TypeScript support |

---

**Note:** Technology choices align with the product mission of a lightweight, local-first web UI. All decisions prioritize developer experience, performance, and minimal external dependencies. For architectural decisions and patterns, see @agent-os/product/architecture-decision.md
