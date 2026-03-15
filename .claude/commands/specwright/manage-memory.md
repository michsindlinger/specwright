# Manage Memory

Interactive housekeeping for the persistent Memory database. Archive stale entries, update importance levels, and maintain memory health.

## When to Use

When you need to:
- Review memory system health and statistics
- Archive or delete outdated entries
- Update importance levels or tags on existing entries
- Bulk-clean tactical entries older than 30 days
- Link related memory entries

## Usage

```bash
# Interactive mode (recommended)
/manage-memory
```

## What It Does

1. Shows memory statistics (counts, importance distribution, stale entries)
2. Lets you browse stale or low-access entries
3. Provides actions: archive, delete, update importance, update tags
4. Supports bulk archival of old tactical entries

## Execution

**Kostenoptimiert:** Dieser Workflow braucht keinen Konversationskontext — delegiere ihn komplett an einen Haiku Sub-Agent.

Delegate to Agent (model: "haiku"):
- description: "Manage memory entries"
- Load the skill from @specwright/templates/skills/manage-memory/SKILL.md
- Follow the workflow defined in the skill
- The detected project is: the basename of the current working directory
