# Save Memory

Save session knowledge to the persistent Memory database for cross-session recall.

## When to Use

At the end of a productive session to preserve:
- Architecture decisions and their reasoning
- Patterns and best practices discovered
- Domain knowledge and business logic
- Technical learnings and debugging insights
- Workflow preferences and conventions

## Usage

```bash
# Interactive mode (recommended)
/save-memory
```

## What It Does

1. Analyzes the current conversation for memory-worthy topics
2. Presents found topics for selection
3. Assigns tags from available categories
4. Stores entries to `~/.specwright/memory.db` via MCP
5. Confirms what was saved

## Upsert Behavior

Same topic + tag + date = summary replaced, details appended. Safe to call multiple times per session.

Load the skill from @specwright/templates/skills/save-memory/SKILL.md and follow the workflow.
