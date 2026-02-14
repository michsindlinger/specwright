---
description: Add learning or insight to skill dos-and-donts
globs:
alwaysApply: false
version: 1.0
encoding: UTF-8
---

# Add Learning Workflow

## Purpose

Manually add a technical learning or insight to the appropriate skill's `dos-and-donts.md` file.
This is useful when you discover something valuable after development that should be documented.

## When to Use

- After debugging a tricky issue
- When you find a better approach
- After multiple iterations on a feature
- When you discover a framework quirk
- To document team decisions

<pre_flight_check>
  EXECUTE: @specwright/workflows/meta/pre-flight.md
</pre_flight_check>

---

<process_flow>

<step number="1" name="gather_learning">

### Step 1: Gather Learning

<input_handling>
  CHECK: Was learning provided as parameter?

  IF parameter provided:
    SET: LEARNING_TEXT = parameter
    SKIP: To categorization

  ELSE (no parameter):
    ASK via AskUserQuestion:

    question: "What did you learn?"
    header: "Learning"
    (Free text input - user describes the learning)

    PROMPT user: "Please describe:
    1. What you were trying to do (Context)
    2. What didn't work or was unexpected (Issue)
    3. What the solution or insight is (Solution)"

    CAPTURE: User response as LEARNING_TEXT
</input_handling>

</step>

<step number="2" name="categorize">

### Step 2: Categorize Learning

<categorization>
  ASK via AskUserQuestion:

  question: "What type of learning is this?"
  header: "Category"
  multiSelect: false
  options:
    - label: "Frontend Technical"
      description: "Component, state, styling, or framework-specific"
    - label: "Backend Technical"
      description: "API, database, services, or backend framework"
    - label: "DevOps Technical"
      description: "CI/CD, deployment, infrastructure"
    - label: "Domain/Business Logic"
      description: "Business process or domain knowledge"

  STORE: Selected category
</categorization>

</step>

<step number="3" name="select_target_skill">

### Step 3: Select Target Skill

<target_selection>
  BASED ON category:

  IF "Frontend Technical":
    LIST: Frontend skills in .claude/skills/
    ```bash
    ls -d .claude/skills/frontend-* 2>/dev/null
    ```

    IF multiple found:
      ASK: "Which frontend skill?"
      OPTIONS: List of found skills
    ELSE IF one found:
      AUTO-SELECT: That skill
    ELSE IF none found:
      ERROR: "No frontend skills found. Run /build-development-team first."
      EXIT

    SET: TARGET_FILE = .claude/skills/[selected]/dos-and-donts.md

  IF "Backend Technical":
    LIST: Backend skills in .claude/skills/
    ```bash
    ls -d .claude/skills/backend-* 2>/dev/null
    ```

    (Same selection logic as Frontend)

    SET: TARGET_FILE = .claude/skills/[selected]/dos-and-donts.md

  IF "DevOps Technical":
    LIST: DevOps skills in .claude/skills/
    ```bash
    ls -d .claude/skills/devops-* 2>/dev/null
    ```

    (Same selection logic)

    SET: TARGET_FILE = .claude/skills/[selected]/dos-and-donts.md

  IF "Domain/Business Logic":
    CHECK: Does domain skill exist?
    ```bash
    ls -d .claude/skills/domain-* 2>/dev/null
    ```

    IF NOT exists:
      ASK: "No domain skill exists. Create it first? (yes/no)"
      IF yes:
        RUN: /add-domain workflow
      ELSE:
        EXIT

    LIST: Domain process documents
    ```bash
    ls .claude/skills/domain-*/*.md | grep -v SKILL.md
    ```

    ASK: "Which domain area does this relate to?"
    OPTIONS: List of process documents + "Create new area"

    IF "Create new area":
      RUN: /add-domain workflow
      SET: TARGET_FILE = newly created process.md
    ELSE:
      SET: TARGET_FILE = selected process document
</target_selection>

</step>

<step number="4" name="determine_section">

### Step 4: Determine Section

<section_selection>
  ANALYZE: LEARNING_TEXT

  ASK via AskUserQuestion:

  question: "Which section should this go into?"
  header: "Section"
  multiSelect: false
  options:
    - label: "Dos ✅"
      description: "Positive pattern or best practice discovered"
    - label: "Don'ts ❌"
      description: "Anti-pattern or thing to avoid"
    - label: "Gotchas ⚠️"
      description: "Unexpected behavior or edge case"

  STORE: Selected section
</section_selection>

</step>

<step number="5" name="format_entry">

### Step 5: Format and Add Entry

<entry_formatting>
  USE: date-checker to get current date (YYYY-MM-DD)

  PARSE: LEARNING_TEXT into components
  - Context: What was being attempted
  - Issue: What didn't work (if applicable)
  - Solution: What worked or the insight

  FORMAT entry:
  ```markdown
  ### [DATE] - [Generated Short Title]
  **Context:** [Extracted or user-provided context]
  **Issue:** [Extracted or user-provided issue]
  **Solution:** [Extracted or user-provided solution]
  ```

  FOR Domain entries (different format):
  ```markdown
  ### [DATE] - [Short Title]
  **What Changed:** [Description of change]
  **Impact:** [How this affects the process]
  ```
</entry_formatting>

</step>

<step number="6" name="append_to_file">

### Step 6: Append to Target File

<file_update>
  READ: TARGET_FILE

  LOCATE: Appropriate section header
  - "## Dos ✅" for positive patterns
  - "## Don'ts ❌" for anti-patterns
  - "## Gotchas ⚠️" for unexpected behaviors

  APPEND: Formatted entry under the section header

  WRITE: Updated file

  IF section is empty (only comments):
    Remove the comment placeholder
</file_update>

</step>

<step number="7" name="confirm">

### Step 7: Confirmation

<output>
  OUTPUT to user:
  "
  ## Learning Added

  **File:** [TARGET_FILE]
  **Section:** [SECTION]

  **Entry:**
  ```markdown
  [FORMATTED_ENTRY]
  ```

  The learning has been added to the skill and will be available
  in future implementations.
  "
</output>

</step>

</process_flow>

---

## Quick Reference

### Usage Examples

```bash
# Interactive mode
/add-learning

# Quick add mode
/add-learning "Always use OnPush change detection for Angular components"

# After debugging
/add-learning "HttpClient errors need catchError operator, not try-catch"
```

### Entry Format

**Technical Learning:**
```markdown
### 2026-01-22 - Always Use OnPush
**Context:** Creating new Angular component
**Issue:** Default change detection caused performance issues
**Solution:** Always use ChangeDetectionStrategy.OnPush by default
```

**Domain Learning:**
```markdown
### 2026-01-22 - Order Validation Enhanced
**What Changed:** Added credit check before order confirmation
**Impact:** Orders now validate payment method before processing
```

### Target Files

| Category | Target File |
|----------|-------------|
| Frontend | `.claude/skills/frontend-[framework]/dos-and-donts.md` |
| Backend | `.claude/skills/backend-[framework]/dos-and-donts.md` |
| DevOps | `.claude/skills/devops-[stack]/dos-and-donts.md` |
| Domain | `.claude/skills/domain-[project]/[process].md` |
