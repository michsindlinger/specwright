# Specwright

**Spec-driven development for AI-assisted software projects.**

Specwright is an open-source framework that brings structured, specification-driven workflows to AI coding assistants. It provides a complete lifecycle from product planning through execution, using specs and user stories as the foundation for development.

## What is Specwright?

Specwright turns your AI coding assistant into a structured development partner:

- **Plan** your product with guided workflows that create product briefs, tech stacks, and roadmaps
- **Specify** features with user stories following PO + Architect refinement patterns
- **Execute** stories with phase-based task execution, quality gates, and self-review
- **Learn** from each implementation cycle with self-updating skills and domain knowledge

## Quick Start

### 1. Install globally (recommended, one-time)

```bash
curl -sSL https://raw.githubusercontent.com/michsindlinger/specwright/main/setup-devteam-global.sh | bash
```

This installs templates and standards to `~/.specwright/` as fallback for all projects.

### 2. Install in your project

```bash
cd your-project/
curl -sSL https://raw.githubusercontent.com/michsindlinger/specwright/main/setup.sh | bash
```

### 3. Install Claude Code commands

```bash
curl -sSL https://raw.githubusercontent.com/michsindlinger/specwright/main/setup-claude-code.sh | bash
```

### 4. Start building

```bash
/plan-product              # Create product brief, tech stack, roadmap
/build-development-team    # Set up skills and quality gates
/create-spec               # Create feature spec with user stories
/execute-tasks             # Execute stories with self-review
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

### Hybrid Lookup System

Templates and standards use a two-level lookup:
1. **Project**: `specwright/templates/` (local override)
2. **Global**: `~/.specwright/templates/` (fallback)

This allows global defaults with per-project customization.

## Optional: Market Validation

Validate product ideas before building:

```bash
# Global setup (one-time)
curl -sSL https://raw.githubusercontent.com/michsindlinger/specwright/main/setup-market-validation-global.sh | bash

# Project setup
curl -sSL https://raw.githubusercontent.com/michsindlinger/specwright/main/setup-market-validation-project.sh | bash

# Use
/validate-market "Your product idea"
```

## Optional: Kanban MCP Server

For atomic kanban operations (prevents JSON corruption):

```bash
bash setup-mcp.sh
```

## Requirements

- [Claude Code](https://docs.anthropic.com/en/docs/claude-code) CLI
- `curl` for installation
- `node` 22+ (optional, for MCP server)

## Update

```bash
# Update everything
curl -sSL https://raw.githubusercontent.com/michsindlinger/specwright/main/update-all.sh | bash

# Update workflows only
curl -sSL https://raw.githubusercontent.com/michsindlinger/specwright/main/update-instructions.sh | bash

# Update standards only
curl -sSL https://raw.githubusercontent.com/michsindlinger/specwright/main/update-standards.sh | bash
```

## Contributing

Contributions are welcome! Please read the development guidelines in `CLAUDE.md` before submitting changes.

## License

[License to be determined]
