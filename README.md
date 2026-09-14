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

### Per-Project Installation

Run this in each project where you want to use Specwright:

```bash
cd your-project/
curl -sSL https://raw.githubusercontent.com/michsindlinger/specwright/main/install.sh | bash
```

The installer auto-detects your environment and installs everything needed:
- Global templates & standards (`~/.specwright/`)
- Project workflows, standards & configuration
- Claude Code commands (23), agents (11) & skills (2)
- MCP server (if Node.js is available)

### Start building

```bash
/intent                    # Capture a Vorhaben: what, why, evidence
/spec INT-2026-001         # Functional spec
/plan INT-2026-001         # Technical plan (Plan Mode)
/build INT-2026-001        # Implement in one session, verify, PR
```

For a brand-new product start with `/plan-product`; the Web-UI auto mode still uses `/create-spec` + `/execute-tasks`.

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
```

## Optional: Web UI

The Web UI is **project-independent** - you install it once and then open and manage all your projects from within the UI. It is separate from the per-project installation above.

### Install the Web UI (one-time)

```bash
curl -sSL https://raw.githubusercontent.com/michsindlinger/specwright/main/setup-ui.sh | bash
```

The installer will:
1. Ask you where to install (default: `~/specwright-ui`)
2. Clone the repository
3. Install all dependencies
4. Build the frontend for production use

### Start the UI

```bash
cd ~/specwright-ui/ui && npm start
```

Then open **http://localhost:3001** in your browser.

To use a different port:

```bash
cd ~/specwright-ui/ui && PORT=8080 npm start
```

### Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | `3001` | HTTP / WebSocket port |
| `SPECWRIGHT_GLOBAL_CLAUDE_CONCURRENCY` | `2` | App-wide cap on parallel Claude Code sessions (Auto-Mode + Chat). Hard ceiling: 4. Cloud Terminal sessions are not gated. Increase only if your Anthropic API key tolerates the additional load — values >2 may trigger token-per-second throttling and `Stream idle timeout` errors. |

### How it works

The Web UI provides three main views:

- **Dashboard** - Kanban board showing specs and stories across status columns
- **Chat** - Interactive chat interface for Claude Code communication
- **Workflows** - Execute and monitor Specwright workflows with live progress

You add your project directories within the UI and switch between them freely. Each project needs the per-project Specwright installation (`install.sh`), but the UI itself is shared.

## Core Commands

Specwright v4 ships 23 commands. The four **Vorhaben** commands are the main path; the rest support product setup, the Web-UI execution path and housekeeping.

| Command | Description |
|---------|-------------|
| `/intent` | Capture a Vorhaben as `intent/INT-YYYY-NNN-slug/intent.md` — what and why, with evidence from the code |
| `/spec` | Functional spec from an accepted intent (`spec.md`) |
| `/plan` | Technical plan in Plan Mode (`plan.md`) — the unit of execution |
| `/build` | Implement the approved plan in one session, verify, PR |
| `/plan-product` | Single-product planning (brief, tech-stack, roadmap) |
| `/analyze-product` | Analyze an existing codebase for Specwright setup |
| `/build-development-team` | Create skills for your tech stack |
| `/create-spec` | Create a story-based spec (Web-UI execution path) |
| `/change-spec` | Modify an existing spec |
| `/execute-tasks` | Execute stories (Web-UI auto mode) |
| `/add-bug` | Add bug with root-cause analysis |
| `/add-todo` | Add lightweight task to backlog |
| `/retroactive-spec` | Create spec from existing code |
| `/estimate-spec` | Effort estimation for a spec |
| `/document-feature` | Document a completed feature |
| `/update-changelog` | Generate bilingual changelog |
| `/process-feedback` | Categorize customer feedback |
| `/start-brainstorming` | Interactive idea exploration (ends in `/intent`) |
| `/add-skill` · `/add-learning` · `/add-domain` | Skills and domain knowledge |
| `/extract-design` | Extract a design system from URL/screenshot |
| `/check-update` | Check for a newer Specwright version |

All shipped files are listed in `specwright/manifest.tsv`; every installer reads that one list (`scripts/check-manifest.sh` guards it). Files removed in a release are in `specwright/removed.tsv` — `update-specwright.sh` deletes them from projects when unchanged, keeps and reports locally modified ones, and respects `specwright/keep.txt`.

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

### Project Structure (per-project installation)

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

## Optional: Kanban MCP Server

The MCP server is automatically installed by `install.sh` when Node.js is available. To skip it:

```bash
bash install.sh --no-mcp
```

## Requirements

- [Claude Code](https://docs.anthropic.com/en/docs/claude-code) CLI
- `curl` for installation
- `node` 20+ (optional - required for Web UI and MCP server)

## Update

```bash
# Update project installation (overwrites workflows and standards)
curl -sSL https://raw.githubusercontent.com/michsindlinger/specwright/main/install.sh | bash -s -- --update

# Update only workflows
bash install.sh --update --overwrite-workflows

# Update only standards
bash install.sh --update --overwrite-standards

# Overwrite all files (full reinstall)
bash install.sh --overwrite

# Update the Web UI
cd ~/specwright-ui/ui && git pull && npm install && npm run build:ui
```

## Contributing

Contributions are welcome! Please read the development guidelines in `CLAUDE.md` before submitting changes.

## License

[License to be determined]
