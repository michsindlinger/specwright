<p align="center">
  <img src="docs/assets/specwright-logo.png" alt="Specwright Logo" width="200">
</p>

<h1 align="center">Specwright</h1>

<p align="center"><strong>Spec-driven development for AI-assisted software projects.</strong></p>

Specwright is an open-source framework that brings structured, specification-driven workflows to AI coding assistants. It provides a complete lifecycle from product planning through execution, using specs and user stories as the foundation for development.

Now with an optional **Web UI** featuring a Kanban board, chat interface, and workflow execution dashboard.

## What is Specwright?

Specwright turns your AI coding assistant into a structured development partner:

- **Plan** your product with guided workflows that create product briefs, tech stacks, and roadmaps
- **Specify** features with user stories following PO + Architect refinement patterns
- **Execute** stories with phase-based task execution, quality gates, and self-review
- **Learn** from each implementation cycle with self-updating skills and domain knowledge
- **Visualize** your project with an optional Web UI: Kanban board, chat, and workflow monitoring

## Quick Start

### One-Command Installation

```bash
cd your-project/
curl -sSL https://raw.githubusercontent.com/michsindlinger/specwright/main/install.sh | bash
```

The unified installer auto-detects your environment and installs everything needed:
- Global templates & standards (`~/.specwright/`)
- Project workflows, standards & configuration
- Claude Code commands (34) & agents (13)
- Market validation workflows
- MCP server (if Node.js is available)

### Start building

```bash
/plan-product              # Create product brief, tech stack, roadmap
/build-development-team    # Set up skills and quality gates
/create-spec               # Create feature spec with user stories
/execute-tasks             # Execute stories with self-review
```

### Installer Options

```bash
# Non-interactive (e.g. for CI or scripting)
curl -sSL .../install.sh | bash -s -- --yes --all

# Preview what would be installed
bash install.sh --dry-run

# Install only specific components
bash install.sh --global           # Only global templates & standards
bash install.sh --project          # Only project-level setup
bash install.sh --claude-code      # Only commands & agents

# With Web UI (framework repo only, requires Node.js 20+)
bash install.sh --with-ui
```

### Framework + Web UI

```bash
# Install everything including UI dependencies
curl -sSL https://raw.githubusercontent.com/michsindlinger/specwright/main/install.sh | bash -s -- --with-ui

# Start the UI
cd ui && npm run dev:backend    # Backend on http://localhost:3001
cd ui/frontend && npm run dev   # Frontend on http://localhost:5173
```

## Core Commands

| Command | Description |
|---------|-------------|
| `/plan-product` | Single-product planning (brief, tech-stack, roadmap) |
| `/plan-platform` | Multi-module platform planning |
| `/build-development-team` | Create skills for your tech stack |
| `/create-spec` | Create detailed feature specification |
| `/add-story` | Add story to existing spec |
| `/execute-tasks` | Execute stories with phase-based workflow |
| `/add-bug` | Add bug with root-cause analysis |
| `/add-todo` | Add lightweight task to backlog |
| `/retroactive-doc` | Document existing features |
| `/retroactive-spec` | Create spec from existing code |
| `/add-skill` | Create custom skills |
| `/add-learning` | Add insights to skill knowledge |
| `/add-domain` | Add business domain documentation |
| `/start-brainstorming` | Interactive idea exploration |
| `/validate-market` | Validate product ideas |

## How It Works

### 1. Product Planning
`/plan-product` guides you through creating:
- **Product Brief** - Vision, target audience, core features
- **Tech Stack** - Technology decisions with rationale
- **Roadmap** - Phased development plan

### 2. Team Setup
`/build-development-team` creates:
- **Quality Gates** skill (always active)
- **Technology skills** based on your stack (React, Rails, Angular, etc.)
- **Definition of Done** and **Definition of Ready**

### 3. Specification
`/create-spec` follows a PO + Architect pattern:
- PO gathers functional requirements
- Architect adds technical refinement (WAS/WIE/WO/WER)
- Creates testable user stories with acceptance criteria

### 4. Execution
`/execute-tasks` uses a phase-based architecture:
- **Phase 1**: Initialize kanban, analyze stories
- **Phase 2**: Set up git strategy
- **Phase 3**: Execute stories one by one
- **Phase 4-5**: Self-review, commit, and continue
- Skills auto-load based on file patterns

### 5. Self-Learning
After each story, the system:
- Updates `dos-and-donts.md` with lessons learned
- Keeps domain documentation current
- Improves quality with each iteration

## Architecture

### Target Project Structure (when installed in your project)

```
your-project/
├── CLAUDE.md                        # Project instructions
├── specwright/
│   ├── config.yml                   # Configuration
│   ├── standards/                   # Coding standards
│   ├── workflows/                   # Workflow definitions
│   └── templates/                   # Local template overrides
├── .claude/
│   ├── commands/specwright/         # Slash commands
│   ├── agents/                      # Utility agents
│   └── skills/                      # Auto-loaded skills
└── .specwright/                     # Created during usage
    ├── product/                     # Product planning output
    ├── specs/                       # Feature specifications
    └── team/                        # Team config (DoD, DoR)
```

### Web UI

The optional Web UI provides three main views:

- **Dashboard** - Kanban board showing specs and stories across status columns
- **Chat** - Interactive chat interface for Claude Code communication
- **Workflows** - Execute and monitor Specwright workflows with live progress

The UI connects to your project via the Claude Code SDK and supports switching between multiple projects.

### Hybrid Lookup System

Templates and standards use a two-level lookup:
1. **Project**: `specwright/templates/` (local override)
2. **Global**: `~/.specwright/templates/` (fallback)

This allows global defaults with per-project customization.

## Optional: Market Validation

Market validation is included in the unified installer. Just use the commands:

```bash
/validate-market "Your product idea"
/validate-market-for-existing       # For existing products
```

## Optional: Kanban MCP Server

The MCP server is automatically installed by `install.sh` when Node.js is available. To skip it:

```bash
bash install.sh --no-mcp
```

## Requirements

- [Claude Code](https://docs.anthropic.com/en/docs/claude-code) CLI
- `curl` for installation
- `node` 20+ (required for Web UI, optional for MCP server)

## Update

```bash
# Update everything (overwrites workflows and standards)
curl -sSL https://raw.githubusercontent.com/michsindlinger/specwright/main/install.sh | bash -s -- --update

# Update only workflows
bash install.sh --update --overwrite-workflows

# Update only standards
bash install.sh --update --overwrite-standards

# Overwrite all files (full reinstall)
bash install.sh --overwrite
```

## Contributing

Contributions are welcome! Please read the development guidelines in `CLAUDE.md` before submitting changes.

## License

[License to be determined]
