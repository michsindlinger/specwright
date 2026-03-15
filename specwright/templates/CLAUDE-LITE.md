# CLAUDE.md (Optimized for Context Efficiency)

> [PROJECT_NAME] Development Guide
> Last Updated: [CURRENT_DATE]

## Purpose
Essential guidance for Claude Code development. **Context is loaded on-demand** to preserve context window for actual work.

## Document Locations (Load on Demand)

### Product Information (DO NOT use @ prefix - load via context-fetcher when needed)
- **Product Vision**: specwright/product/product-brief.md
- **Technical Architecture**: specwright/product/tech-stack.md
- **Development Roadmap**: specwright/product/roadmap.md
- **Architecture Decision**: specwright/product/architecture-decision.md
- **Secrets & Credentials**: specwright/product/secrets.md (Required credentials tracking)

### Development Standards (DO NOT use @ prefix)
- **Tech Stack Defaults**: specwright/standards/tech-stack.md
- **Code Style Preferences**: specwright/standards/code-style.md
- **Best Practices Philosophy**: specwright/standards/best-practices.md

### Specwright Workflows (Loaded automatically via Skill system when invoked)
Available via slash commands - NO need to preload:
- `/plan-product` - Single-product planning
- `/plan-platform` - Multi-module platform planning
- `/build-development-team` - Create DevTeam agents
- `/create-spec` - Feature specifications
- `/execute-tasks` - Task execution
- `/retroactive-doc` - Document existing features

## Critical Rules
- **FOLLOW ALL INSTRUCTIONS** - Mandatory, not optional
- **ASK FOR CLARIFICATION** - If uncertain about any requirement
- **MINIMIZE CHANGES** - Edit only what's necessary
- **LOAD CONTEXT ON DEMAND** - Use context-fetcher subagent to load documents when needed

## Context Loading Strategy

**IMPORTANT: Do NOT preload all documents. Load on demand.**

When you need product/architecture context:
1. Use context-fetcher subagent to load specific documents
2. Request only what's needed for the current task
3. Prefer lite versions when available (product-brief-lite.md, spec-lite.md)

Example delegation:
```
DELEGATE to context-fetcher:
"Load specwright/product/product-brief-lite.md for current task context"
```

## Sub-Agents
**MANDATORY DELEGATION** - Sub-agents have separate context windows.

**Delegation Strategy:**
- **Strategic Planning** → You decide WHAT needs to be done
- **Implementation Planning** → Delegate to Core Development specialists
- **Execution Tasks** → Delegate to Utility & Support agents
- **Context Loading** → Use context-fetcher to load documents on demand

### Utility & Support
- **context-fetcher** - Load documents on demand (CRITICAL for context efficiency)
- **date-checker** - Determine today's date
- **file-creator** - Create files and apply templates
- **git-workflow** - Git operations, commits, PRs

## File Organization Rules

**CRITICAL - No Files in Project Root:**
- Implementation reports: `specwright/specs/[spec-name]/implementation-reports/`
- Testing checklists: `specwright/specs/[spec-name]/implementation-reports/`
- Handover docs: `specwright/specs/[spec-name]/handover-docs/`
- Architecture docs: `specwright/product/`
- Team docs: `specwright/team/`

## Quality Requirements

**Mandatory Checks:**
- Run linting after ALL code changes
- ALL lint errors must be fixed before task completion

## Feature Development Workflow

**Available Commands (load workflow context automatically):**

1. **Product/Platform Planning:**
   - `/plan-product` → Single cohesive products
   - `/plan-platform` → Multi-module platforms

2. **Team Setup:**
   - `/build-development-team` → Creates DevTeam agents & skills

3. **Feature Development:**
   - `/create-spec` → Creates detailed specification
   - `/execute-tasks` → Executes planned tasks

4. **Bug Management:**
   - `/create-bug` → Creates bug specification
   - `/add-bug` → Adds bug to existing spec

5. **Documentation:**
   - `/retroactive-doc` → Documents existing features

6. **Memory (Cross-Session Knowledge):**
   - `/save-memory` → Save session knowledge to persistent Memory DB
   - `/recall-memory` → Browse, search, and recall stored memories
   - `/manage-memory` → Housekeeping: archive, update, delete memories

## Memory System

Specwright includes a persistent Memory DB (`~/.specwright/memory.db`) for cross-session knowledge retention.

**When to use:**
- End of productive session: `/save-memory` to persist decisions, patterns, learnings
- Start of new session: `/recall-memory` to load relevant context from previous work
- Periodically: `/manage-memory` to archive stale entries and maintain memory health

**Importance Levels:**
- `strategic` — Long-lived: architecture decisions, domain knowledge, business rules
- `operational` — Medium-term: project decisions, current patterns (default)
- `tactical` — Short-lived: debugging notes, session-specific findings

**MCP Tools (available directly):**
- `memory_store` — Save with upsert logic + importance level
- `memory_search` — Full-text search (FTS5)
- `memory_recall` — Browse by ID/topic/tag, `format: 'context'` for compact LLM injection
- `memory_update` — Partial update of existing entries
- `memory_delete` — Archive (soft) or permanent delete
- `memory_stats` — System health overview

**Directory Structure:**
- `specwright/product/` - Product vision, tech-stack, roadmap
- `specwright/specs/` - Feature specifications
- `specwright/team/` - DevTeam agents and skills

## Development Notes
- Bitte merke dir, wir nutzen hier in diesem Branch die V2-Komponenten für die Projekte und die Profile im Moment und für die Seite Teams und Settings.

---

**Context Efficiency Note:** This CLAUDE.md uses ~500 tokens instead of ~20,000+ by avoiding auto-loaded @ references. Documents are loaded on-demand via context-fetcher. Skills are extracted by Orchestrator during task execution (see `specwright/team/skill-index.md`).
