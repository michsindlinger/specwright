# Recall Memory

Browse and search the persistent Memory database to recall knowledge from previous sessions.

## When to Use

When you need to:
- Recall decisions, patterns, or learnings from past sessions
- Browse stored knowledge by tag or topic
- Inject memory context into the current conversation
- Check what knowledge has been persisted

## Usage

```bash
# Interactive mode (recommended)
/recall-memory
```

## What It Does

1. Detects project context from working directory
2. Lets you browse by tag, search by keyword, or show recent entries
3. Displays results as a table with key details
4. Allows expanding entries for full details + related entries
5. Can inject compact context summary for LLM use
6. Shows memory health stats

## Formats

- **JSON** (default): Full structured data for each entry
- **Context**: Compact markdown grouped by importance level (strategic > operational > tactical)

## Execution

**Kostenoptimiert:** Dieser Workflow braucht keinen Konversationskontext — delegiere ihn komplett an einen Haiku Sub-Agent.

Delegate to Agent (model: "haiku"):
- description: "Recall memory entries"
- Load the skill from @specwright/templates/skills/recall-memory/SKILL.md
- Follow the workflow defined in the skill
- The detected project is: the basename of the current working directory
