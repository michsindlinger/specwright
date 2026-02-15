# Product Roadmap: Agent OS Web UI

> Last Updated: 2026-02-04
> Version: 1.0.0
> Status: Planning

---

## Recently Completed Features

| ID | Feature | Type | Completed | Spec |
|----|---------|------|-----------|------|
| LLM-001..004 | LLM Model Selection for Workflows | Full-stack | 2026-02-04 | [spec](../specs/2026-02-03-llm-selection-workflows/spec.md) |

**Details:**
- **LLM Model Selection:** Users can now select LLM models (Opus, Sonnet, Haiku, GLM) when starting workflows from Workflow Dashboard, Context Menu, and Create Spec Modal. Backend uses `getCliCommandForModel()` for dynamic model execution.

---

## Phase 1: MVP (Foundation)

**Goal:** Funktionierendes lokales Web UI mit Backend-Grundlage und einem funktionalen View
**Success Criteria:** Backend startet, Frontend lädt, WebSocket-Verbindung funktioniert

### Must-Have Features

| ID | Feature | Type | Effort | Priority |
|----|---------|------|--------|----------|
| AOSUI-001 | Backend Setup | Backend | M | Critical |
| AOSUI-002 | Frontend Scaffold | Frontend | M | Critical |
| AOSUI-003 | Projekt-Verwaltung | Full-stack | S | Critical |

**Details:**
- **AOSUI-001 Backend Setup:** Express Server, TypeScript Agent SDK Integration, WebSocket Server, Health Endpoint
- **AOSUI-002 Frontend Scaffold:** Vite + Lit Setup, Router, Shell Component, Dark Theme CSS Variables
- **AOSUI-003 Projekt-Verwaltung:** Config-basierte Projektliste, Projekt-Selektor, Context Loading

### Out of Scope for MVP
- Chat Interface (Phase 2)
- Workflow Execution View (Phase 2)
- Dashboard/Kanban View (Phase 2)
- Polish & Integration Tests (Phase 3)

---

## Phase 2: Core Features (Views)

**Goal:** Alle drei Haupt-Views implementiert und funktional
**Success Criteria:** User kann Chat nutzen, Workflows ausführen, Dashboard sehen

### Planned Features

| ID | Feature | Type | Effort | Priority |
|----|---------|------|--------|----------|
| AOSUI-004 | Chat Interface | Full-stack | L | High |
| AOSUI-005 | Workflow Execution | Full-stack | L | High |
| AOSUI-006 | Dashboard View | Full-stack | M | High |

**Details:**
- **AOSUI-004 Chat Interface:** Message Input, Streaming Response Display, Code Block Rendering, Message History
- **AOSUI-005 Workflow Execution:** Workflow Trigger, Step Progress, Live Output, Pause/Cancel Controls
- **AOSUI-006 Dashboard View:** Kanban Board, Story Cards, Drag-Drop, Status Columns

---

## Phase 3: Polish & Integration

**Goal:** Production-ready mit Tests und optimierter UX
**Success Criteria:** Integration Tests pass, <3s Load Time, 80% Code Coverage

### Planned Features

| ID | Feature | Type | Effort | Priority |
|----|---------|------|--------|----------|
| AOSUI-007 | Integration & Polish | Full-stack | M | Medium |

**Details:**
- **Integration Tests:** Backend Health, Frontend Build, E2E Scenarios
- **Performance Optimization:** Bundle Size, Load Time, WebSocket Latency
- **UX Polish:** Error States, Loading Animations, Keyboard Shortcuts
- **Documentation:** README, API Docs, Component Docs

---

## Future Considerations (v2.0+)

Diese Features sind explizit aus v1.0 ausgeschlossen:

- **Session Persistence:** Chat-Historie über Restarts hinweg speichern
- **Multi-Project Dashboard:** Alle Projekte auf einer Übersicht
- **Plugin System:** Erweiterbarkeit durch Third-Party Plugins
- **Themes:** Light Mode, Custom Themes
- **Mobile Support:** Responsive Design für Tablets

---

## Effort Legend

| Size | Description |
|------|-------------|
| XS | < 1 Story |
| S | 1-2 Stories |
| M | 3-5 Stories |
| L | 5-8 Stories |
| XL | > 8 Stories |

---

**Note:** This roadmap is a living document. Update priorities based on user feedback, technical discoveries, and market changes. Create specs for features when they're ready for development.
