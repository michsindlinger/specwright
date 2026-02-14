---
description: Present improvement suggestions to user and collect selections
version: 1.0
encoding: UTF-8
---

# Present Improvements to User

## Overview

Present generated improvement suggestions to the user in an interactive format, allowing them to review each improvement and select which ones to apply to the generated skill.

## Presentation Process

<presentation_flow>

<step number="1" name="group_and_filter">

### Step 1: Group and Filter Improvements

Organize improvements for optimal presentation.

<grouping_strategy>
  GROUP_BY: Severity (Critical → Warning → Info)
  SORT_WITHIN_GROUP: By priority score (descending)

  STRUCTURE:
    {
      critical: [
        {id: "imp_001", priority: 98, title: "Fix SQL Injection", ...},
        {id: "imp_002", priority: 95, title: "Centralize Error Handling", ...}
      ],
      warning: [
        {id: "imp_003", priority: 72, title: "Add @Transactional", ...},
        ...
      ],
      info: [
        {id: "imp_008", priority: 45, title: "Add Swagger Docs", ...},
        ...
      ]
    }
</grouping_strategy>

<filtering_options>
  OPTIONAL_FILTERS:
    - Show only Critical and Warning (default for quick mode)
    - Show all improvements
    - Filter by category (error_handling, performance, security)
    - Filter by estimated effort (low, medium, high)

  DEFAULT: Show all Critical + top 5 Warnings + Quick Wins
</filtering_options>

</step>

<step number="2" name="display_summary">

### Step 2: Display Improvement Summary

Show overview before detailed presentation.

<summary_display>
  MESSAGE:
    "📊 Pattern Analysis Complete!

    Found {total_improvements} improvement opportunities:
    - ❌ {critical_count} Critical issues
    - ⚠️ {warning_count} Warnings
    - ℹ️ {info_count} Suggestions

    Estimated total effort: {total_effort}

    I'll present each improvement with:
    - Current pattern vs Recommended pattern
    - Before/After code examples
    - Impact and effort assessment

    You can choose which improvements to include in your skill file.
    "

  PAUSE: For user acknowledgment
</summary_display>

</step>

<step number="3" name="present_improvements">

### Step 3: Present Improvements Interactively

Show each improvement with full details and collect user decision.

<presentation_format>
  FOR each improvement in [critical, warning, info]:
    DISPLAY: Improvement details
    ASK: User to accept, reject, or view details
    RECORD: User decision

  IMPROVEMENT_DISPLAY_TEMPLATE:
    ═══════════════════════════════════════════════════════════════
    {severity_icon} {title} (Priority: {priority}/100)
    ═══════════════════════════════════════════════════════════════

    Category: {category}
    Impact: {impact_emoji} {impact_level}
    Effort: {effort_emoji} {effort_estimate}
    Files Affected: {file_count}

    CURRENT PATTERN:
    {current_description}

    Issues:
    - {issue_1}
    - {issue_2}

    RECOMMENDED PATTERN:
    {recommended_description}

    Benefits:
    - {benefit_1}
    - {benefit_2}

    ───────────────────────────────────────────────────────────────
    Would you like to include this improvement in your skill?
    ───────────────────────────────────────────────────────────────
</presentation_format>

<example_display>
  ═══════════════════════════════════════════════════════════════
  ❌ Fix SQL Injection Vulnerability (Priority: 98/100)
  ═══════════════════════════════════════════════════════════════

  Category: Security
  Impact: 🔴 High Impact
  Effort: ⚡ Quick (4 hours)
  Files Affected: 2 (UserRepository.java, OrderRepository.java)

  CURRENT PATTERN:
  String concatenation in SQL queries creates injection vulnerability

  Issues:
  - Direct string concatenation allows SQL injection attacks
  - No input sanitization or parameterization
  - Critical security vulnerability

  RECOMMENDED PATTERN:
  Use JPA query methods or parameterized @Query annotations

  Benefits:
  - Prevents SQL injection attacks
  - Follows Spring Data JPA best practices
  - Type-safe and maintainable
  - Automatic parameter binding

  ───────────────────────────────────────────────────────────────
  Would you like to include this improvement in your skill?

  Options:
  1. ✅ Yes, include this (Recommended)
  2. 📖 Show code examples first
  3. ❌ No, skip this
  ───────────────────────────────────────────────────────────────
</example_display>

</step>

<step number="4" name="handle_code_examples">

### Step 4: Handle Code Example Requests

Show detailed before/after code when user requests.

<code_example_display>
  IF user selects "Show code examples":
    DISPLAY: Before/After comparison

    TEMPLATE:
      ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
      BEFORE (Current Pattern):
      ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

      ```{language}
      {current_code_example}
      ```

      ❌ Issues:
      - {issue_1_with_line_reference}
      - {issue_2_with_line_reference}

      ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
      AFTER (Recommended Pattern):
      ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

      ```{language}
      {recommended_code_example}
      ```

      ✅ Improvements:
      - {improvement_1_with_line_reference}
      - {improvement_2_with_line_reference}

      ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

    THEN: Ask again for user decision
      Options:
      1. ✅ Yes, include this
      2. ❌ No, skip this
</code_example_display>

<code_example>
  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  BEFORE (Current Pattern):
  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  ```java
  // UserRepository.java
  public List<User> findByEmail(String email) {
      String sql = "SELECT * FROM users WHERE email = '" + email + "'";
      // ❌ SQL injection vulnerability
      return jdbcTemplate.query(sql, userRowMapper);
  }
  ```

  ❌ Issues:
  - Line 3: String concatenation creates SQL injection risk
  - No parameterization or input validation
  - Vulnerable to: ' OR '1'='1

  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  AFTER (Recommended Pattern):
  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  ```java
  // UserRepository.java - Option 1: Query Method
  public interface UserRepository extends JpaRepository<User, Long> {
      Optional<User> findByEmail(String email);
      // ✅ Spring Data generates safe query with parameters
  }

  // Option 2: @Query with parameters
  @Query("SELECT u FROM User u WHERE u.email = :email")
  Optional<User> findByEmailCustom(@Param("email") String email);
  // ✅ Parameterized query prevents injection
  ```

  ✅ Improvements:
  - Automatic parameter binding prevents SQL injection
  - Type-safe and follows Spring Data conventions
  - Easier to test and maintain
  - Returns Optional for null-safety

  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
</code_example>

</step>

<step number="5" name="collect_decisions">

### Step 5: Collect User Decisions

Use AskUserQuestion to gather selections.

<question_strategy>
  APPROACH: Individual questions per improvement
  ALTERNATIVE: Batch selection for similar improvements

  INDIVIDUAL_QUESTION:
    USE: AskUserQuestion tool
    QUESTION: "Include this improvement: {title}?"
    HEADER: "{severity_icon} {category}"
    OPTIONS:
      - label: "✅ Yes, include (Recommended)"
        description: "Add this improvement to the skill file"
      - label: "📖 Show code examples"
        description: "See before/after code comparison first"
      - label: "❌ No, skip"
        description: "Don't include this improvement"
    MULTI_SELECT: false

  BATCH_QUESTION (for similar improvements):
    QUESTION: "Which {category} improvements would you like to include?"
    HEADER: "⚠️ {category}"
    OPTIONS:
      - label: "{improvement_1_title}"
        description: "{brief_description} ({effort})"
      - label: "{improvement_2_title}"
        description: "{brief_description} ({effort})"
      - label: "All {category} improvements"
        description: "Include all {count} suggestions"
      - label: "None"
        description: "Skip all {category} improvements"
    MULTI_SELECT: true
</question_strategy>

<decision_flow>
  FOR each improvement:
    IF severity == "critical":
      ASK: Individual question
      DEFAULT_RECOMMENDATION: Yes (critical issues should be addressed)
      IF user says "Show code examples":
        DISPLAY: Code comparison
        ASK: Again for decision

    ELSE IF severity == "warning":
      IF similar_warnings_exist:
        GROUP: By category
        ASK: Batch question
      ELSE:
        ASK: Individual question

    ELSE IF severity == "info":
      IF count > 5:
        ASK: "Review {count} info suggestions?"
        OPTIONS: "Yes, show me" | "No, skip all"
        IF "Yes":
          ASK: Individual questions
      ELSE:
        ASK: Individual questions

  RECORD: Decisions
    {
      improvement_id: {
        decision: "accepted" | "rejected",
        viewed_examples: true | false,
        timestamp: "..."
      }
    }
</decision_flow>

</step>

<step number="6" name="provide_shortcuts">

### Step 6: Provide Selection Shortcuts

Offer batch operations for efficiency.

<shortcut_options>
  AFTER_SHOWING_CRITICAL:
    ASK: "You have {warning_count} warnings and {info_count} suggestions.
          How would you like to proceed?"
    OPTIONS:
      - "Review each one" (default for thoroughness)
      - "Accept all warnings, skip info" (quick mode)
      - "Accept quick wins only" (efficiency mode)
      - "Skip remaining" (minimal mode)

  QUICK_WINS_SHORTCUT:
    IDENTIFY: Improvements with:
      - effort: "low"
      - impact: "medium" or "high"
      - priority: > 60

    PRESENT: As group
      "💡 Found {count} Quick Wins:
       High impact improvements with low effort.

       Quick Wins:
       1. {quick_win_1} (⚡ {effort}, 🟡 {impact})
       2. {quick_win_2} (⚡ {effort}, 🟡 {impact})
       3. {quick_win_3} (⚡ {effort}, 🔴 {impact})

       Accept all quick wins?"

    OPTIONS: "Yes, accept all" | "Let me review individually" | "Skip all"
</shortcut_options>

</step>

<step number="7" name="track_progress">

### Step 7: Track Selection Progress

Show progress as user reviews improvements.

<progress_indicator>
  DISPLAY: Progress after each decision

  FORMAT:
    "Progress: {completed}/{total} improvements reviewed
     ✅ Accepted: {accepted_count}
     ❌ Skipped: {rejected_count}

     Next: {next_improvement_title}"

  EXAMPLE:
    Progress: 5/15 improvements reviewed
    ✅ Accepted: 3 (SQL injection fix, Error handling, Transactions)
    ❌ Skipped: 2 (Swagger docs, Logging improvements)

    Next: ⚠️ Add pagination to list endpoints
</progress_indicator>

</step>

<step number="8" name="generate_selection_summary">

### Step 8: Generate Selection Summary

Summarize user selections before proceeding.

<selection_summary>
  AFTER_ALL_DECISIONS:
    DISPLAY: Summary

    TEMPLATE:
      "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
       📊 Selection Summary
       ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

       You selected {accepted_count} out of {total_count} improvements:

       ✅ ACCEPTED ({accepted_count}):
       {severity_breakdown}

       Critical: {critical_accepted}/{critical_total}
       - {critical_1_title}
       - {critical_2_title}

       Warnings: {warning_accepted}/{warning_total}
       - {warning_1_title}
       - {warning_2_title}

       Info: {info_accepted}/{info_total}
       - {info_1_title}

       ❌ SKIPPED ({rejected_count}):
       {skipped_list}

       Estimated implementation effort: {total_accepted_effort}

       These improvements will be included in your skill file.
       ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

       Continue with skill generation?"

    CONFIRM: User wants to proceed
</selection_summary>

<summary_example>
  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  📊 Selection Summary
  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  You selected 8 out of 15 improvements:

  ✅ ACCEPTED (8):

  Critical: 2/2 ✅ All critical issues accepted
  - ❌ Fix SQL injection vulnerability
  - ❌ Implement centralized error handling

  Warnings: 5/7
  - ⚠️ Add @Transactional to service methods
  - ⚠️ Implement pagination with Pageable
  - ⚠️ Use Optional for nullable returns
  - ⚠️ Add request validation
  - ⚠️ Implement proper logging

  Info: 1/6
  - ℹ️ Add API documentation with Swagger

  ❌ SKIPPED (7):
  - Consistent naming conventions (info)
  - Add code comments (info)
  - Extract magic numbers (info)
  - Use constants for strings (info)
  - Add integration tests (warning)
  - Performance monitoring (warning)

  Estimated implementation effort: 18 hours

  These improvements will be included in your skill file as:
  - Code examples in relevant sections
  - Best practice recommendations
  - Anti-patterns to avoid

  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  Continue with skill generation? ✅
</summary_example>

</step>

</presentation_flow>

## Output Format

<output>
  {
    selections: {
      accepted: [
        {
          id: "imp_001",
          title: "Fix SQL Injection",
          severity: "critical",
          viewed_examples: true,
          timestamp: "..."
        },
        // ... more accepted improvements
      ],
      rejected: [
        {
          id: "imp_008",
          title: "Add Swagger Docs",
          severity: "info",
          viewed_examples: false,
          timestamp: "..."
        },
        // ... more rejected improvements
      ]
    },

    summary: {
      total_reviewed: 15,
      accepted_count: 8,
      rejected_count: 7,
      by_severity: {
        critical: { accepted: 2, total: 2 },
        warning: { accepted: 5, total: 7 },
        info: { accepted: 1, total: 6 }
      },
      estimated_effort: "18 hours",
      quick_wins_accepted: 3
    },

    user_confirmed: true
  }
</output>

## User Experience Guidelines

<ux_principles>
  CLARITY:
    - Show one improvement at a time for focus
    - Use clear severity indicators (❌ ⚠️ ℹ️)
    - Provide concise descriptions before details

  EFFICIENCY:
    - Offer batch operations for similar items
    - Provide quick win shortcuts
    - Show progress to set expectations

  FLEXIBILITY:
    - Allow reviewing code examples on demand
    - Permit changing decisions
    - Offer skip options for low-priority items

  TRANSPARENCY:
    - Show impact and effort estimates
    - Explain why each improvement matters
    - Summarize selections before proceeding

  RECOMMENDATION:
    - Default to "Yes" for critical issues
    - Highlight quick wins
    - Suggest efficient selection strategies
</ux_principles>

## Error Handling

<error_protocols>
  <user_cancellation>
    IF user cancels during presentation:
      SAVE: Selections made so far
      ASK: "Save partial selections or discard?"
      OPTIONS: "Save and continue later" | "Discard and exit"
  </user_cancellation>

  <no_improvements>
    IF improvements_count == 0:
      MESSAGE: "🎉 No improvements needed! Your code follows best practices."
      SKIP: Interactive selection
      PROCEED: Directly to skill generation
  </no_improvements>

  <all_rejected>
    IF all improvements rejected:
      WARN: "No improvements selected. Skill will only include discovered patterns."
      CONFIRM: "Continue without improvements?"
  </all_rejected>
</error_protocols>

## Related Utilities

- `@specwright/workflows/skill/validation/generate-improvements.md`
- `@specwright/workflows/skill/interactive/apply-improvements.md`
