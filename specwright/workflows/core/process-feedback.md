---
description: Process customer feedback and categorize into specs, bugs, and todos
globs:
alwaysApply: false
version: 2.0
encoding: UTF-8
installation: global
---

# Process Feedback Workflow

## What's New in v2.0

- **Main Agent Pattern**: All steps executed by Main Agent directly
- **Path fixes**: `specwright/` instead of `.specwright/`
- **Added**: Pre-flight check, proper frontmatter
- **Kept**: No Sub-Agents needed (workflow was already Main Agent compatible)

## Purpose

Takes unstructured or structured customer feedback, analyzes it, and categorizes each point as:
- **Spec** - Larger feature that needs planning
- **Bug** - Error that needs fixing
- **Todo** - Small task that can be done quickly

## Input

Feedback can come in various formats:
- Free text (email, chat message)
- Bullet list
- Numbered list
- Screenshot descriptions
- Meeting notes

<pre_flight_check>
  EXECUTE: @specwright/workflows/meta/pre-flight.md
</pre_flight_check>

<process_flow>

<step number="1" name="collect_feedback">

### Step 1: Collect Feedback

IF no feedback provided as parameter:

ASK: "Please paste the customer feedback (free text, email, list, etc.):"

CAPTURE: Raw feedback text
SET: RAW_FEEDBACK = captured text

</step>

<step number="2" name="identify_project">

### Step 2: Identify Project

CHECK: Is project context available?

IF specwright/product/product-brief.md exists:
  READ: specwright/product/product-brief.md
  EXTRACT: Project name and context
  SET: PROJECT_NAME = extracted name

ELSE IF specwright/product/product-brief-lite.md exists:
  READ: specwright/product/product-brief-lite.md
  EXTRACT: Project name and context
  SET: PROJECT_NAME = extracted name

ELSE:
  ASK via AskUserQuestion:
  "For which project is this feedback?"
  SET: PROJECT_NAME = user answer

</step>

<step number="3" name="extract_items">

### Step 3: Extract Feedback Items

ANALYZE: RAW_FEEDBACK

<extraction_rules>
  **Identify each individual point:**

  1. Separate related topics from each other
  2. Recognize implicit requirements
  3. Extract concrete problem descriptions
  4. Identify wishes vs. complaints vs. questions

  **For each point extract:**
  - Original text (quote from feedback)
  - Summary (1 sentence)
  - Affected area (UI, Backend, Workflow, etc.)
  - Urgency (derivable from context?)
  - Clarity (clear / unclear / needs follow-up)
</extraction_rules>

SET: EXTRACTED_ITEMS = list of extracted items

</step>

<step number="4" name="categorize_items">

### Step 4: Categorization

FOR EACH item in EXTRACTED_ITEMS:

<categorization_logic>
  **Categorize as SPEC when:**
  - New feature requested
  - Larger behavior change
  - New integration needed
  - Multiple components affected
  - Estimated effort > 1 day
  - Requires conception/design

  **Categorize as BUG when:**
  - Something doesn't work as expected
  - Error or crash described
  - "doesn't work", "broken", "fails"
  - Deviation from documented behavior
  - Regression (worked before)

  **Categorize as TODO when:**
  - Small adjustment
  - Text change
  - Configuration change
  - Effort < 1 day
  - No new concept needed
  - "Minor thing", "quick", "small"

  **When unclear:**
  - Tend toward TODO if small
  - Tend toward BUG if problem described
  - Tend toward SPEC if feature requested
</categorization_logic>

SET: item.category = "spec" | "bug" | "todo"
SET: item.confidence = "high" | "medium" | "low"
SET: item.reasoning = why this category

</step>

<step number="5" name="estimate_priority">

### Step 5: Estimate Priority

FOR EACH item in EXTRACTED_ITEMS:

<priority_logic>
  **Critical (P0):**
  - Blocker for usage
  - Data loss possible
  - Security issue
  - Explicitly marked as urgent

  **High (P1):**
  - Affects main functionality
  - Many users affected
  - Workaround difficult
  - Customer explicitly unhappy

  **Medium (P2):**
  - Annoying but not blocking
  - Workaround available
  - Nice-to-have feature

  **Low (P3):**
  - Cosmetic
  - Edge case
  - Improvement suggestion without pressure
</priority_logic>

SET: item.priority = "critical" | "high" | "medium" | "low"

</step>

<step number="6" name="identify_clarifications">

### Step 6: Identify Clarifications Needed

FOR EACH item in EXTRACTED_ITEMS:

CHECK: Is the point clear enough for implementation?

IF NOT clear:
  GENERATE: Concrete follow-up question for customer
  SET: item.clarificationNeeded = true
  SET: item.clarificationQuestion = generated question
ELSE:
  SET: item.clarificationNeeded = false

</step>

<step number="7" name="generate_json_output">

### Step 7: Generate JSON Output

GENERATE: Structured JSON

<json_schema>
  SCHEMA: specwright/templates/schemas/feedback-analysis-schema.json

  <template_lookup>
    LOOKUP: specwright/templates/schemas/ (project) → ~/.specwright/templates/schemas/ (global fallback)
  </template_lookup>
</json_schema>

```json
{
  "$schema": "feedback-analysis-schema.json",
  "version": "1.0",

  "metadata": {
    "analyzedAt": "[ISO-TIMESTAMP]",
    "project": "[PROJECT_NAME]",
    "feedbackSource": "[email|chat|meeting|other]",
    "rawFeedbackLength": [CHARACTER_COUNT]
  },

  "summary": {
    "totalItems": [COUNT],
    "byCategory": {
      "spec": [COUNT],
      "bug": [COUNT],
      "todo": [COUNT]
    },
    "byPriority": {
      "critical": [COUNT],
      "high": [COUNT],
      "medium": [COUNT],
      "low": [COUNT]
    },
    "clarificationsNeeded": [COUNT]
  },

  "items": [
    {
      "id": "fb-001",
      "category": "spec|bug|todo",
      "priority": "critical|high|medium|low",
      "confidence": "high|medium|low",

      "original": "[Original text from feedback]",
      "title": "[Short title, max 60 chars]",
      "description": "[Summary in 1-2 sentences]",

      "area": "[UI|Backend|API|Database|Workflow|Integration|Other]",
      "reasoning": "[Why this category?]",

      "clarificationNeeded": true|false,
      "clarificationQuestion": "[Follow-up question]" | null,

      "suggestedAction": {
        "command": "/create-spec|/add-bug|/add-todo",
        "parameters": {
          "title": "[Suggested title]",
          "description": "[Suggested description]"
        }
      }
    }
  ],

  "rawFeedback": "[Original feedback for reference]"
}
```

</step>

<step number="8" name="display_results">

### Step 8: Display Results

OUTPUT to user:

```
## Feedback Analysis Complete

**Project:** {PROJECT_NAME}
**Analyzed:** {TIMESTAMP}

### Summary

| Category | Count |
|----------|-------|
| Specs    | {spec_count} |
| Bugs     | {bug_count} |
| Todos    | {todo_count} |
| **Total** | {total_count} |

### Priorities

| Priority | Count |
|----------|-------|
| Critical | {critical_count} |
| High     | {high_count} |
| Medium   | {medium_count} |
| Low      | {low_count} |

### Items by Category

**Specs (larger features):**
{FOR EACH spec item:}
- [{priority}] **{title}**: {description}
  → `/create-spec "{title}"`

**Bugs (errors):**
{FOR EACH bug item:}
- [{priority}] **{title}**: {description}
  → `/add-bug "{title}"`

**Todos (small tasks):**
{FOR EACH todo item:}
- [{priority}] **{title}**: {description}
  → `/add-todo "{title}"`

### Follow-up Questions ({clarification_count})

{FOR EACH item with clarificationNeeded:}
- **{title}**: {clarificationQuestion}
```

**JSON output was generated.**

**Next steps:**
1. Send follow-up questions to customer (if any)
2. Create items with `/create-spec`, `/add-bug`, `/add-todo`
3. Or: Use the `--apply` flag to auto-create items

</step>

<step number="9" name="optional_apply">

### Step 9: Optional Auto-Create (if --apply flag provided)

IF --apply flag was provided:

ASK via AskUserQuestion:
"Should all {total_count} items be created automatically?

1. Yes, create all (Recommended)
2. Only create Bugs and Todos (Specs manually)
3. No, only output JSON"

IF user chooses 1 or 2:
  FOR EACH item:
    IF item.category = "spec" AND user chose 1:
      LOG: "Specs must be created manually with /create-spec"
      OUTPUT: Suggested /create-spec call

    IF item.category = "bug":
      EXECUTE: /add-bug with item.suggestedAction.parameters

    IF item.category = "todo":
      EXECUTE: /add-todo with item.suggestedAction.parameters

  OUTPUT: "{created_count} items were created."

</step>

</process_flow>

## Output Format

The JSON is output to the console and can optionally be saved:

```bash
# Save JSON to file (suggested by workflow)
specwright/feedback/feedback-{DATE}-{HASH}.json
```

## Example

**Input:**
```
Hey, quick feedback on the app:
- Login sometimes doesn't work, have to try 2-3 times
- Would be cool to login with Google too
- Button text is cut off on my iPhone
- Can you make the header color a bit darker?
```

**Output:**
```json
{
  "items": [
    {
      "id": "fb-001",
      "category": "bug",
      "priority": "high",
      "title": "Login intermittently fails",
      "description": "User has to attempt login multiple times",
      "suggestedAction": { "command": "/add-bug" }
    },
    {
      "id": "fb-002",
      "category": "spec",
      "priority": "medium",
      "title": "Google OAuth Integration",
      "description": "Enable social login via Google",
      "suggestedAction": { "command": "/create-spec" }
    },
    {
      "id": "fb-003",
      "category": "bug",
      "priority": "medium",
      "title": "Button text cut off on iPhone",
      "description": "Responsive issue on smaller screens",
      "suggestedAction": { "command": "/add-bug" }
    },
    {
      "id": "fb-004",
      "category": "todo",
      "priority": "low",
      "title": "Adjust header color",
      "description": "Make header slightly darker",
      "suggestedAction": { "command": "/add-todo" }
    }
  ]
}
```
