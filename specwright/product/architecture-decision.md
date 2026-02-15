# Architecture Decisions: Specwright

> Version: 1.0
> Created: 2026-02-14
> Last Updated: 2026-02-14

---

## Overview

This document records all significant architectural decisions made for the Specwright framework, including the rationale and considered alternatives.

**Architecture Style:** Workflow-Driven Agent Framework with Hybrid Lookup

---

## Core Architecture

### Selected Pattern: Main Agent + Skills on Demand + Utility Agents

**Description:**
Specwright uses a workflow-driven architecture where the Main Agent (Claude Code) orchestrates all complex tasks directly, loading skill files on demand for domain-specific guidance. Only simple, context-independent tasks are delegated to Utility Agents. This replaced the original Sub-Agent delegation pattern.

**Key Principles:**
1. **Main Agent Retains Context** - Complex tasks stay in the main context window to preserve decision context
2. **Skills as Knowledge, Not Execution** - Skills provide guidance and patterns, the Main Agent executes
3. **Utility Agents for Context-Independent Tasks** - Only date-checker, file-creator, git-workflow, context-fetcher are delegated
4. **Human-in-the-Loop at Every Step** - Review documents after each process step, interactive decisions

**Diagram:**
```
┌─────────────────────────────────────────────────────────────┐
│                     Developer (Human)                         │
│  Reviews, Decides, Approves at every process step            │
└─────────────────────────┬───────────────────────────────────┘
                          │ Slash Commands
                          ▼
┌─────────────────────────────────────────────────────────────┐
│                   Main Agent (Claude Code)                    │
│                                                              │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐ │
│  │  Workflow    │  │   Skills    │  │  Utility Agents     │ │
│  │  Engine      │  │  (on demand)│  │  (context-free)     │ │
│  │             │  │             │  │                     │ │
│  │  XML Steps  │  │  SKILL.md   │  │  date-checker       │ │
│  │  Sequential │  │  Loaded as  │  │  file-creator        │ │
│  │  Execution  │  │  Guidance   │  │  git-workflow        │ │
│  │             │  │             │  │  context-fetcher     │ │
│  └─────────────┘  └─────────────┘  └─────────────────────┘ │
└─────────────────────────┬───────────────────────────────────┘
                          │ Reads/Writes
                          ▼
┌─────────────────────────────────────────────────────────────┐
│                   Hybrid Lookup System                        │
│                                                              │
│  Priority 1: Project (specwright/templates/)                 │
│  Priority 2: Global Fallback (~/.specwright/templates/)      │
└─────────────────────────────────────────────────────────────┘
```

---

## Architecture Decision Records (ADRs)

### ADR-001: Main Agent + Skills Pattern (Migration from Sub-Agent Delegation)

**Date:** 2026-02-14
**Status:** Accepted
**Category:** Core Architecture

#### Context

Specwright originally used Sub-Agent delegation (Task tool) for complex workflow steps. Product strategists, tech architects, and other specialists were separate sub-agents with their own context windows. This led to significant context loss - sub-agents didn't know about previous decisions, user preferences, or architectural context from earlier steps.

#### Decision

We will use the Main Agent + Skills on Demand pattern because:
- Main Agent retains full context across all workflow steps
- Skills provide domain expertise without context fragmentation
- Utility Agents handle only simple, context-independent tasks
- Exception: Plan Agent delegation is acceptable when input is fully documented

#### Alternatives Considered

| Alternative | Pros | Cons |
|-------------|------|------|
| Sub-Agent Delegation (original) | Clean separation of concerns, parallel execution | Critical context loss, inconsistent results, user frustration |
| Pure Main Agent (no skills) | Maximum context retention | Context window overload, no reusable domain knowledge |
| Plugin Architecture | Extensible, community-driven | Over-engineering for current stage, complexity |

#### Consequences

**Positive:**
- No more context loss between workflow steps
- Consistent quality across entire workflow execution
- Skills are reusable across projects and workflows
- User responses are preserved throughout the session

**Negative:**
- Main Agent context window can fill up in long workflows
- Skills must be designed as guidance documents, not executable code
- Migration effort for all 11 workflows

---

### ADR-002: Hybrid Lookup System (Project + Global Fallback)

**Date:** 2026-02-14
**Status:** Accepted
**Category:** Configuration

#### Context

Specwright needs to provide default templates, standards, and skills that work across all projects while allowing per-project customization. Users shouldn't need to copy hundreds of template files into every project.

#### Decision

We will use a two-level Hybrid Lookup because:
- Global installation (`~/.specwright/`) provides defaults for all projects
- Project-level (`specwright/`) allows overrides when needed
- Reduces per-project setup to minutes instead of hours

#### Alternatives Considered

| Alternative | Pros | Cons |
|-------------|------|------|
| Project-only (copy all templates) | Self-contained, no external dependencies | Massive duplication, hard to update |
| Global-only (no overrides) | Simple, single source of truth | No project customization possible |
| npm package | Standard distribution, versioned | Adds Node.js dependency, complex for non-JS projects |

#### Consequences

**Positive:**
- New projects start with zero configuration
- Global updates benefit all projects immediately
- Projects can customize specific templates without touching others

**Negative:**
- Two places to look for issues during debugging
- Templates must handle both paths gracefully
- Setup requires running two scripts (project + global)

---

### ADR-003: Markdown + XML for Workflow Definitions

**Date:** 2026-02-14
**Status:** Accepted
**Category:** Workflow Language

#### Context

Specwright workflows need to be human-readable, version-controllable, and directly consumable by Claude Code. They define multi-step processes with conditional logic, user interaction points, and file generation.

#### Decision

We will use Markdown with embedded XML tags because:
- Human-readable and editable in any editor
- Version-controllable with Git (meaningful diffs)
- Directly consumable by Claude Code without compilation
- XML tags provide structure within readable prose

#### Alternatives Considered

| Alternative | Pros | Cons |
|-------------|------|------|
| YAML workflow files | Clean structure, widely used | Less readable for complex logic, poor prose support |
| JSON definitions | Machine-parseable, schema-validatable | Not human-readable, no inline documentation |
| Custom DSL | Optimized for use case | Learning curve, tooling needed, maintenance burden |
| Python/TypeScript scripts | Full programming power | Requires runtime, not AI-native, over-engineering |

#### Consequences

**Positive:**
- Anyone can read and modify workflows
- No build step or compilation needed
- Git diffs are meaningful
- Claude Code processes them natively

**Negative:**
- XML in Markdown can feel verbose
- No formal validation (syntax errors not caught before runtime)
- Complex conditional logic is harder to express than in code

---

### ADR-004: Self-Learning via File-Based Dos-and-Donts

**Date:** 2026-02-14
**Status:** Accepted
**Category:** Learning System

#### Context

AI coding assistants repeat the same mistakes across sessions because they have no persistent memory. Specwright agents need to learn from each implementation cycle and improve over time.

#### Decision

We will use file-based self-learning via `dos-and-donts.md` files in each skill because:
- Persistent across sessions (stored in filesystem)
- Human-readable and reviewable
- Agents update them automatically after each story
- Skill-specific knowledge stays with the relevant skill

#### Implementation Details

- Each skill has an optional `dos-and-donts.md` file
- After story completion, agents add lessons learned
- Entries include: what went wrong, what worked well, patterns to follow
- `/add-learning` command for manual knowledge injection

#### Alternatives Considered

| Alternative | Pros | Cons |
|-------------|------|------|
| Database-backed learning | Structured, queryable | Infrastructure dependency, over-engineering |
| ML-based fine-tuning | True learning, pattern recognition | Requires training infrastructure, not transparent |
| Session-only context | No persistence overhead | Learning lost after each session |

#### Consequences

**Positive:**
- Transparent: users can read and edit what agents learned
- No infrastructure dependency
- Immediate effect in next session
- Version-controllable with Git

**Negative:**
- Linear growth of dos-and-donts files
- No automatic prioritization of learnings
- Manual pruning may be needed over time

---

### ADR-005: Technology-Agnostic Skill Templates

**Date:** 2026-02-14
**Status:** Accepted
**Category:** Skills Architecture

#### Context

Specwright must support diverse tech stacks (Angular, React, Vue, Spring Boot, NestJS, Rails) without maintaining technology-specific workflow logic. The same workflow should work regardless of the target technology.

#### Decision

We will use technology-agnostic skill templates because:
- Fachliche (business) skill templates define WHAT to do
- Technology-specific instances define HOW to do it
- `/build-development-team` generates skills tailored to the project's tech stack
- Workflows reference generic skill categories, not specific technologies

#### Implementation Details

- Base templates: `specwright/templates/skills/[category]/SKILL.md`
- Tech-specific: `specwright/templates/skills/frontend/angular/SKILL.md`
- Agent-specific: `.claude/skills/[skill-name]/SKILL.md`
- Dev team templates: `specwright/templates/skills/dev-team/[role]/[skill]/SKILL.md`

#### Consequences

**Positive:**
- Same workflows work for any technology
- Easy to add new tech stack support (just add skill templates)
- Dev team setup is project-specific but follows consistent patterns
- Community can contribute technology-specific skills

**Negative:**
- Template abstraction adds complexity
- Quality of skills depends on template quality
- New tech stacks require manual template creation

---

### ADR-006: Multi-LLM Configuration per Story

**Date:** 2026-02-14
**Status:** Accepted
**Category:** LLM Integration

#### Context

Different stories may benefit from different LLM providers. Enterprise customers may require on-premise LLMs for security-critical code. Cost optimization may favor cheaper models for simpler stories.

#### Decision

We will support configurable LLM providers per story because:
- Enterprise customers can use locally hosted LLMs (MiniMax, etc.) for security
- Cost optimization: simple stories on cheaper models, complex on premium
- Flexibility to use the best model for each task
- Model selection guidelines help choose the right model

#### Implementation Details

- Configuration in workflow execution settings
- Model selection guideline: `specwright/workflows/core/guidelines/model-selection.md`
- Supported: Anthropic (default), GLM, MiniMax, Kimi K2, any OpenAI-compatible API

#### Consequences

**Positive:**
- Enterprise security requirements met
- Cost optimization possible
- Flexibility for different use cases
- Future-proof for new models

**Negative:**
- Quality may vary between models
- Testing needed across model combinations
- Configuration complexity increases

---

## Domain Model

### Bounded Contexts

| Context | Responsibility | Key Entities |
|---------|----------------|--------------|
| Product Planning | Product definition, tech stack, roadmap | Product Brief, Tech Stack, Roadmap, Architecture Decision |
| Feature Specification | Feature planning, story creation | Spec, Story, Kanban Board, Backlog |
| Execution | Story implementation, testing | Phase, Task, Git Strategy, Code Review |
| Team Management | Agent setup, skill management | Agent, Skill, DoD, DoR, Profile |
| Learning | Self-improvement, knowledge capture | Dos-and-Donts, Domain Knowledge, Learnings |
| Validation | Market validation, estimation | Validation Plan, Estimation, Feasibility Analysis |

### Context Map

```
┌──────────────────┐         ┌──────────────────┐
│ Product Planning │◄───────►│    Feature       │
│                  │  feeds  │    Specification  │
└────────┬─────────┘         └────────┬─────────┘
         │                            │
         │ informs                    │ drives
         ▼                            ▼
┌──────────────────┐         ┌──────────────────┐
│ Team Management  │◄───────►│    Execution     │
│                  │ skills  │                  │
└────────┬─────────┘         └────────┬─────────┘
         │                            │
         │ evolves                    │ feeds
         ▼                            ▼
┌──────────────────┐         ┌──────────────────┐
│    Learning      │◄────────│   Validation     │
│                  │ insights│                  │
└──────────────────┘         └──────────────────┘
```

---

## Cross-Cutting Concerns

### File Organization

- **Workflows:** `specwright/workflows/[category]/[workflow].md`
- **Templates:** `specwright/templates/[category]/[template].md`
- **Skills:** `.claude/skills/[name]/SKILL.md` (project) or `~/.specwright/templates/skills/[name]/SKILL.md` (global)
- **Commands:** `.claude/commands/specwright/[command].md`
- **Agents:** `.claude/agents/[agent].md`
- **Output:** `specwright/product/`, `.specwright/specs/`, `.specwright/team/`

### Error Handling

- **Strategy:** Graceful degradation with user notification
- **Template Not Found:** Hybrid lookup fallback (project -> global)
- **Skill Not Found:** Warning + continue without skill guidance
- **User Input Missing:** Interactive prompting via AskUserQuestion

### Versioning Strategy

- **Framework:** Semantic Versioning (MAJOR.MINOR.PATCH)
- **Workflows:** Individual versions in YAML frontmatter
- **Installation:** Always latest from main branch (curl | bash)
- **Breaking Changes:** Migration path required, deprecation notice

### Deprecation Policy

Features are deprecated with at least one version notice. Deprecated workflows show a warning but continue to function. Migration guides are provided for all breaking changes.

---

## Decision Log

| ID | Date | Decision | Status |
|----|------|----------|--------|
| ADR-001 | 2026-02-14 | Main Agent + Skills Pattern | Accepted |
| ADR-002 | 2026-02-14 | Hybrid Lookup System | Accepted |
| ADR-003 | 2026-02-14 | Markdown + XML Workflows | Accepted |
| ADR-004 | 2026-02-14 | File-Based Self-Learning | Accepted |
| ADR-005 | 2026-02-14 | Technology-Agnostic Skills | Accepted |
| ADR-006 | 2026-02-14 | Multi-LLM per Story | Accepted |
