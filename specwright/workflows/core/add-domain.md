---
description: Add or update a business domain area to the domain skill
globs:
alwaysApply: false
version: 1.0
encoding: UTF-8
---

# Add Domain Workflow

## Purpose

Add or update a business domain area in the domain skill. Creates self-updating documentation for business processes that the agent maintains during development.

## When to Use

- Documenting a new business process
- Adding a new feature area
- Formalizing domain knowledge
- Creating business process documentation

<pre_flight_check>
  EXECUTE: @specwright/workflows/meta/pre-flight.md
</pre_flight_check>

---

<process_flow>

<step number="1" name="check_domain_skill">

### Step 1: Check Domain Skill Exists

<domain_check>
  CHECK: Does domain skill exist?
  ```bash
  ls -d .claude/skills/domain-* 2>/dev/null
  ```

  IF NOT exists:
    INFORM user: "No domain skill exists. Creating one now..."

    DETERMINE: Project name
    - TRY: Extract from specwright/product/tech-stack.md
    - FALLBACK: Use current folder name

    CREATE directory: .claude/skills/domain-[project-slug]/

    LOAD template: specwright/templates/skills/domain/SKILL.md
    (Fallback: ~/.specwright/templates/skills/domain/SKILL.md)

    REPLACE placeholders:
    - [PROJECT_NAME] → detected project name
    - [DATE] → current date
    - [BUSINESS_CONTEXT_DESCRIPTION] → "To be filled during development"

    WRITE: .claude/skills/domain-[project-slug]/SKILL.md

    OUTPUT: "Domain skill created: .claude/skills/domain-[project-slug]/"

  ELSE:
    USE: Existing domain skill
    EXTRACT: Skill path from ls output
</domain_check>

</step>

<step number="2" name="gather_domain_info">

### Step 2: Gather Domain Information

<user_input>
  CHECK: Was domain name provided as parameter?

  IF parameter provided:
    SET: DOMAIN_NAME = parameter
  ELSE:
    ASK via AskUserQuestion:

    question: "What business area or process do you want to document?"
    header: "Domain Area"
    (Free text input)

    Examples:
    - "User Registration"
    - "Order Processing"
    - "Payment Flow"
    - "Inventory Management"

    CAPTURE: User response as DOMAIN_NAME

  ASK via AskUserQuestion:

  question: "Please describe this domain area:"
  header: "Description"
  (Free text input - longer description)

  PROMPT user to provide:
  "Describe the following about [DOMAIN_NAME]:

  1. **Overview**: What is this process/area about?
  2. **Process Flow**: What are the main steps?
  3. **Actors**: Who is involved?
  4. **Business Rules**: What are the key rules?"

  CAPTURE: Detailed description
</user_input>

</step>

<step number="3" name="create_domain_document">

### Step 3: Create Domain Process Document

<document_creation>
  LOAD template: specwright/templates/skills/domain/process.md
  (Fallback: ~/.specwright/templates/skills/domain/process.md)

  USE: date-checker for current date

  PARSE: User description to extract:
  - Brief description (1-2 sentences)
  - Process flow steps
  - Actors and roles
  - Business rules

  REPLACE placeholders:
  - [PROCESS_NAME] → DOMAIN_NAME
  - [DATE] → current date
  - [BRIEF_DESCRIPTION] → extracted brief description
  - [STEP_1], [STEP_2], etc. → extracted process steps
  - [ACTOR_1], [ACTOR_2] → extracted actors
  - [RULE_1], [RULE_2] → extracted business rules

  GENERATE: Slug from DOMAIN_NAME
  Example: "User Registration" → "user-registration"

  WRITE to: .claude/skills/domain-[project-slug]/[domain-slug].md
</document_creation>

</step>

<step number="4" name="update_index">

### Step 4: Update Domain Skill Index

<index_update>
  READ: .claude/skills/domain-[project-slug]/SKILL.md

  LOCATE: "## Domain Areas" section

  FIND: The table after this header

  APPEND new row to table:
  ```markdown
  | [DOMAIN_NAME] | [domain-slug].md | [Brief description] | Active |
  ```

  WRITE: Updated SKILL.md

  NOTE: Table format must be maintained for parsing
</index_update>

</step>

<step number="5" name="confirm">

### Step 5: Confirmation

<output>
  OUTPUT to user:
  "
  ## Domain Area Added

  **Area:** [DOMAIN_NAME]
  **File:** .claude/skills/domain-[project-slug]/[domain-slug].md

  ### What's Documented

  - Process flow
  - Business rules
  - Actors involved

  ### Self-Updating

  The agent will keep this document updated when:
  - Business logic changes
  - Process flow is modified
  - New rules are added

  ### Index Updated

  Domain Areas table in SKILL.md has been updated.

  ---

  **Next Steps:**
  - Review the generated document and refine if needed
  - Reference this domain in stories using the Domain: field
  - The agent will maintain this documentation during development
  "
</output>

</step>

</process_flow>

---

## Quick Reference

### Usage Examples

```bash
# Interactive mode (recommended)
/add-domain

# With domain name
/add-domain "User Registration"

# Quick add
/add-domain "Order Processing"
```

### Generated Structure

```
.claude/skills/domain-[project]/
├── SKILL.md                    # Index of all domain areas
├── user-registration.md        # Created by /add-domain
├── order-processing.md         # Created by /add-domain
└── payment-flow.md             # Created by /add-domain
```

### Document Sections

Each domain document contains:
- Overview
- Process Flow
- Actors
- Business Rules
- Data Involved
- Related Code
- Edge Cases
- Error Scenarios

### Integration with Stories

Reference domain areas in story files:
```markdown
**Domain:** user-registration
```

When the agent implements this story, it knows to keep
`user-registration.md` updated.
