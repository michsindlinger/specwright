# Product Brief: Agent OS Web UI

> Last Updated: 2026-01-30
> Version: 1.0.0

## Pitch

**Lokale Web-UI zur Steuerung von Claude Code mit drei Haupt-Views: Dashboard (Kanban), Chat Interface und Workflow Execution - basierend auf TypeScript Agent SDK und Lit Web Components.**

Agent OS Web UI transforms the command-line experience of Claude Code into a visual, intuitive web interface. Developers can manage their AI-assisted development workflows through a modern dashboard, interact via a familiar chat interface, and execute complex workflows - all from a local web application that integrates seamlessly with the TypeScript Agent SDK.

## Users

**Primary Target Audience: Developers using Agent OS / Claude Code**

Specific user segments:
- **Individual Developers** who use Claude Code daily and want a more visual way to interact with their AI assistant
- **Development Teams** adopting Agent OS workflows who need a consistent interface for task management
- **Power Users** who manage multiple projects and need quick project switching and overview capabilities
- **Developers preferring GUIs** who find CLI interactions less intuitive for complex workflow management

These users are technically proficient, familiar with modern web applications, and value efficiency and visual feedback in their development tools.

## The Problem

**Missing visual interface for Claude Code control - currently CLI-only**

Current pain points:
1. **CLI-Only Interaction**: Claude Code currently only offers command-line interaction, which can be limiting for complex task management and workflow visualization
2. **No Task Overview**: Developers lack a visual dashboard to see the status of ongoing tasks, completed work, and planned features
3. **Context Switching**: Moving between terminal windows, documentation, and project management tools creates friction
4. **Streaming Output Visibility**: Real-time output from Claude Code is constrained to terminal formatting, making it harder to track long-running operations
5. **Project Management Fragmentation**: Switching between projects requires manual navigation and context loading

## Differentiators

What makes Agent OS Web UI unique:

1. **Local-First Architecture**: Runs entirely on the developer's machine - no cloud dependencies, no data leaving the local environment, instant startup
2. **Native TypeScript Agent SDK Integration**: Built directly on the official Agent SDK, ensuring full compatibility with Claude Code features and future updates
3. **Lit Web Components**: Modern, lightweight component architecture that's fast, maintainable, and follows web standards
4. **Three Specialized Views**: Purpose-built interfaces for different workflows (Dashboard/Kanban for overview, Chat for interaction, Workflow Execution for operations)
5. **Moltbot-Style Dark Theme**: Developer-friendly dark theme designed for extended coding sessions, reducing eye strain
6. **WebSocket Streaming**: Real-time output streaming for live feedback during Claude Code operations
7. **Zero Configuration**: Works with existing Agent OS project configurations - no additional setup required

## Key Features

### 1. Node.js Backend with TypeScript Agent SDK Integration
- Full integration with the official TypeScript Agent SDK
- Local server architecture for maximum privacy and performance
- RESTful API endpoints for UI communication
- Process management for Claude Code sessions

### 2. Lit-Based Web UI with 3 Views

**Dashboard / Kanban View:**
- Visual overview of tasks across all projects
- Drag-and-drop task management
- Status columns (Todo, In Progress, Review, Done)
- Quick access to project details and specifications

**Chat Interface:**
- Familiar messaging interface for Claude Code interaction
- Message history within session
- Code block rendering with syntax highlighting
- Quick action buttons for common commands

**Workflow Execution View:**
- Visual representation of workflow steps
- Progress indicators for multi-step operations
- Output logs with filtering and search
- Ability to pause, resume, or cancel workflows

### 3. WebSocket Streaming for Live Output
- Real-time streaming of Claude Code responses
- Live progress updates during long operations
- Immediate feedback on command execution
- Connection status indicators

### 4. Project Selection from Config
- Automatic discovery of Agent OS projects
- Quick project switcher in the UI
- Project-specific settings and context
- Recent projects list for fast access

### 5. Moltbot-Style Dark Theme Design
- Carefully designed dark theme optimized for developers
- High contrast for readability
- Consistent visual language across all views
- Reduced eye strain for long coding sessions

## Explicit Exclusions (v1.0)

The following features are explicitly **out of scope** for the initial release:

- **Multi-User / Authentication**: Single-user, local-only application
- **Cloud Deployment**: No hosted version, local execution only
- **Session Persistence**: Sessions are not persisted across restarts
- **Mobile App**: Desktop/laptop browsers only
- **Plugin System**: No third-party extensions in v1.0

## Success Metrics

**6-Month Goals:**
- Functional MVP with all three views operational
- Stable WebSocket streaming with <100ms latency
- Support for 10+ concurrent project configurations
- Positive feedback from initial user testing

**Technical Quality Metrics:**
- <3 second initial load time
- <500KB initial bundle size (excluding dependencies)
- Zero critical security vulnerabilities
- 80%+ code coverage for core functionality

## Value Proposition

Agent OS Web UI bridges the gap between powerful CLI tools and intuitive visual interfaces. By providing a purpose-built web UI for Claude Code, developers can:

- **See the big picture** through the Kanban dashboard
- **Interact naturally** through the chat interface
- **Monitor progress** through real-time workflow execution
- **Stay focused** with a developer-optimized dark theme
- **Work securely** with a local-first architecture

---

**Note:** This product brief serves as the foundation for all development decisions. Refer to this document when planning features, making architectural choices, or prioritizing work.
