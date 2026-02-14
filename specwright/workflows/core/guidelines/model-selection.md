# Model Selection Guidelines for Task Delegations

## Overview
Choose the appropriate model to balance cost and quality when delegating tasks.

## Model Selection Rules

### Use Haiku (model="haiku")
**Cost-effective for simple, routine tasks - up to 90% cost savings**

Examples:
- date-checker invocations
- context-fetcher for loading known documents
- File listing/reading operations (ls, cat)
- Simple validation checks (checkbox counting)
- DoR checkbox validation
- File existence checks

**Pattern:**
```markdown
DELEGATE to [agent] via Task tool (model="haiku"):
```

### Use Default/Opus (no model parameter)
**Quality-critical for complex decisions**

Examples:
- Plan Agent (implementation planning)
- dev-team__architect (technical refinement)
- dev-team__po (user story generation)
- Architecture decisions
- Business logic design
- Complex analysis

**Pattern:**
```markdown
DELEGATE to [agent] via Task tool:
```

## Decision Tree

```
IS task simple AND routine AND verifiable?
  → Use model="haiku"

IS task complex OR requires judgment OR critical?
  → Use default (inherits parent, typically opus)

WHEN IN DOUBT:
  → Use default - Conservative approach ensures quality
```

## Cost Comparison

- Haiku: ~$0.25 per 1M input tokens
- Sonnet: ~$3 per 1M input tokens
- Opus: ~$15 per 1M input tokens

**Example Savings:**
- date-checker with haiku: $0.25 vs $15.00 (60x cheaper)
- 10 simple tasks per spec: $2.50 vs $150 (60x savings)
