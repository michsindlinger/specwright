# Add Learning

Add a technical learning or insight to a skill's dos-and-donts.md file.

## When to Use

After you discover something valuable:
- Debugging revealed a solution
- Multiple iterations taught you something
- Framework quirk discovered
- Better approach found

## Usage

```bash
# Interactive mode (recommended)
/add-learning

# Quick add
/add-learning "Always use OnPush for Angular components"
```

## What It Does

1. Asks what you learned (if not provided)
2. Categorizes the learning (Frontend/Backend/DevOps/Domain)
3. Selects the appropriate skill
4. Determines which section (Dos/Don'ts/Gotchas)
5. Formats and adds the entry with date

## Example Output

```markdown
### 2026-01-22 - Always Use OnPush
**Context:** Creating new Angular component
**Issue:** Default change detection caused performance issues
**Solution:** Always use ChangeDetectionStrategy.OnPush
```

Refer to the instructions located in @agent-os/workflows/core/add-learning.md
