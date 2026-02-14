---
description: Apply user-selected improvements to pattern definitions
version: 1.0
encoding: UTF-8
---

# Apply Selected Improvements

## Overview

Process user-selected improvements and merge them into the pattern data that will be used for skill template generation. Transform improvement suggestions into actionable pattern enhancements.

## Application Process

<application_flow>

<step number="1" name="process_selections">

### Step 1: Process User Selections

Parse and validate user selections.

<selection_processing>
  INPUT: User selections from present-improvements
    {
      accepted: [improvement_001, improvement_002, ...],
      rejected: [improvement_008, improvement_009, ...]
    }

  VALIDATE:
    - All improvement IDs exist
    - At least one improvement selected (or none is OK)
    - No duplicate selections

  CATEGORIZE: Accepted improvements
    BY_SEVERITY:
      critical: [...]
      warning: [...]
      info: [...]

    BY_CATEGORY:
      error_handling: [...]
      validation: [...]
      security: [...]
      performance: [...]
</selection_processing>

</step>

<step number="2" name="merge_with_patterns">

### Step 2: Merge Improvements with Discovered Patterns

Integrate improvements into existing pattern data.

<merge_strategy>
  FOR each accepted_improvement:
    IDENTIFY: Related discovered patterns
    DETERMINE: Merge approach
    APPLY: Enhancement

  MERGE_APPROACHES:
    ENHANCE: Add improvement to existing pattern
      USE: When discovered pattern exists but needs improvement
      ACTION: Augment pattern with recommended changes

    REPLACE: Substitute pattern with recommended version
      USE: When discovered pattern is incorrect/anti-pattern
      ACTION: Replace with best practice pattern

    ADD: Insert new pattern
      USE: When pattern is missing entirely
      ACTION: Add recommended pattern to pattern list

    ANNOTATE: Mark pattern with warnings
      USE: When user rejected critical improvement
      ACTION: Add note about known issue
</merge_strategy>

<merge_examples>
  EXAMPLE_1_ENHANCE:
    Discovered Pattern:
      ```java
      @GetMapping("/users/{id}")
      public User getUser(@PathVariable Long id) {
          return userService.findById(id);
      }
      ```

    Accepted Improvement: "Use ResponseEntity for explicit status control"

    Enhanced Pattern:
      ```java
      @GetMapping("/users/{id}")
      public ResponseEntity<UserResponse> getUser(@PathVariable Long id) {
          User user = userService.findById(id);
          return ResponseEntity.ok(toResponse(user));
      }
      ```

    Merge Result:
      category: "routing"
      pattern_id: "rest_endpoint_001"
      status: "enhanced"
      original_code: "[original]"
      improved_code: "[enhanced]"
      improvement_note: "Added ResponseEntity for explicit HTTP status control"
      benefits: ["Better API clarity", "Explicit status codes", "Type-safe responses"]

  EXAMPLE_2_REPLACE:
    Discovered Pattern (Anti-pattern):
      ```java
      String sql = "SELECT * FROM users WHERE email = '" + email + "'";
      ```

    Accepted Improvement: "Fix SQL injection vulnerability"

    Replacement Pattern:
      ```java
      Optional<User> findByEmail(String email);
      // Spring Data generates safe parameterized query
      ```

    Merge Result:
      category: "data_access"
      pattern_id: "query_001"
      status: "replaced"
      anti_pattern: "[original code]"
      recommended: "[new code]"
      severity: "critical"
      improvement_note: "Replaced vulnerable string concatenation with safe query method"
      security_benefit: "Prevents SQL injection attacks"

  EXAMPLE_3_ADD:
    Discovered Pattern: (none - missing)

    Accepted Improvement: "Add centralized exception handling"

    New Pattern:
      ```java
      @ControllerAdvice
      public class GlobalExceptionHandler {
          @ExceptionHandler(UserNotFoundException.class)
          public ResponseEntity<ErrorResponse> handleUserNotFound(...) {
              // ...
          }
      }
      ```

    Merge Result:
      category: "error_handling"
      pattern_id: "exception_handler_001"
      status: "added"
      recommended: "[new code]"
      improvement_note: "Added centralized exception handling (was missing)"
      benefits: ["Consistent error responses", "DRY principle", "Easier maintenance"]
</merge_examples>

</step>

<step number="3" name="update_pattern_metadata">

### Step 3: Update Pattern Metadata

Enrich patterns with improvement information.

<metadata_updates>
  FOR each enhanced_pattern:
    ADD_METADATA:
      improvement_applied: true
      improvement_id: "imp_001"
      improvement_title: "Fix SQL Injection"
      improvement_date: "2025-12-31"
      severity: "critical"
      before_after: {
        before: "[original code]",
        after: "[improved code]"
      }
      rationale: "Why this improvement was made"
      references: ["Link to best practices doc"]

  EXAMPLE:
    {
      pattern_id: "error_handler_001",
      category: "error_handling",
      framework: "spring-boot",
      code: "[improved code]",
      description: "Centralized exception handling with @ControllerAdvice",
      improvement_applied: true,
      improvement_metadata: {
        id: "imp_002",
        title: "Implement centralized error handling",
        severity: "critical",
        priority: 95,
        before: "[controllers with individual handlers]",
        after: "[GlobalExceptionHandler]",
        benefits: [
          "Consistent error responses across API",
          "Reduces code duplication",
          "Easier to maintain and test"
        ],
        rationale: "Centralized error handling is a Spring Boot best practice...",
        estimated_effort: "4 hours",
        files_affected: 15
      }
    }
</metadata_updates>

</step>

<step number="4" name="categorize_for_template">

### Step 4: Categorize Patterns for Template Sections

Organize enhanced patterns for skill file sections.

<template_mapping>
  SKILL_SECTIONS:
    - Best Practices (accepted improvements)
    - Common Patterns (discovered patterns + enhancements)
    - Anti-Patterns to Avoid (rejected critical improvements with warnings)
    - Quick Reference (key patterns summary)
    - Implementation Examples (before/after code)

  MAPPING:
    BEST_PRACTICES_SECTION:
      SOURCE: Accepted improvements with severity >= warning
      FORMAT: Recommended pattern with benefits
      EXAMPLE:
        "## Best Practices

         ### Error Handling
         ✅ **Centralized Exception Handling**
         Use @ControllerAdvice for consistent error responses.

         ```java
         [recommended code]
         ```

         Benefits:
         - Consistent API responses
         - DRY principle
         - Easier maintenance
         "

    COMMON_PATTERNS_SECTION:
      SOURCE: Discovered patterns + applied enhancements
      FORMAT: Pattern description with code
      EXAMPLE:
        "## Common Patterns

         ### REST Endpoint Definition
         ```java
         [enhanced pattern code]
         ```

         ℹ️ Enhanced with ResponseEntity for explicit status control
         "

    ANTI_PATTERNS_SECTION:
      SOURCE: Discovered anti-patterns OR rejected critical improvements
      FORMAT: What not to do, why, and alternative
      EXAMPLE:
        "## Anti-Patterns to Avoid

         ### ❌ SQL Injection Vulnerability
         ```java
         // DON'T DO THIS
         String sql = \"SELECT * FROM users WHERE email = '\" + email + \"'\";
         ```

         **Why:** Vulnerable to SQL injection attacks

         **Instead:**
         ```java
         Optional<User> findByEmail(String email);
         ```

         Use Spring Data query methods with automatic parameterization.
         "

    IMPLEMENTATION_EXAMPLES_SECTION:
      SOURCE: Accepted improvements with before/after code
      FORMAT: Side-by-side comparison
      EXAMPLE:
        "## Implementation Examples

         ### Improving Error Handling

         ❌ Before:
         ```java
         [original code with try/catch in each controller]
         ```

         ✅ After:
         ```java
         [GlobalExceptionHandler code]
         ```

         This improvement eliminates code duplication and ensures consistent error responses.
         "
</template_mapping>

</step>

<step number="5" name="handle_rejected_critical">

### Step 5: Handle Rejected Critical Improvements

Add warnings for rejected critical issues.

<rejected_critical_handling>
  FOR each rejected_improvement WHERE severity == "critical":
    ADD_WARNING_TO_SKILL:
      SECTION: Anti-Patterns or Known Issues
      FORMAT:
        "⚠️ **Known Issue: {title}**

         The following pattern was found in the codebase but was not
         selected for inclusion in best practices:

         ```{language}
         [problematic code]
         ```

         **Risk:** {risk_description}
         **Recommendation:** {recommendation}

         Note: This pattern exists in your codebase. Consider addressing
         it in a future refactoring.
         "

  EXAMPLE:
    "⚠️ **Known Issue: SQL Injection Vulnerability**

     The following pattern was found in the codebase:

     ```java
     String sql = \"SELECT * FROM users WHERE email = '\" + email + \"'\";
     jdbcTemplate.query(sql, userRowMapper);
     ```

     **Risk:** Critical security vulnerability. Allows SQL injection attacks.

     **Recommendation:** Use Spring Data query methods or parameterized @Query:
     ```java
     Optional<User> findByEmail(String email);
     ```

     Note: This pattern exists in UserRepository.java and OrderRepository.java.
     Consider addressing it in a future security audit.
     "
</rejected_critical_handling>

</step>

<step number="6" name="generate_improvement_log">

### Step 6: Generate Improvement Application Log

Create detailed log of applied improvements.

<application_log>
  STRUCTURE:
    {
      timestamp: "2025-12-31T10:30:00Z",
      total_improvements_reviewed: 15,
      total_applied: 8,
      total_rejected: 7,

      applied_improvements: [
        {
          id: "imp_001",
          title: "Fix SQL Injection",
          severity: "critical",
          category: "security",
          affected_patterns: ["query_001", "query_002"],
          action: "replaced",
          files_affected: 2,
          estimated_effort: "4 hours"
        },
        // ... more applied
      ],

      rejected_improvements: [
        {
          id: "imp_008",
          title: "Add Swagger Documentation",
          severity: "info",
          category: "documentation",
          reason: "User preference - documentation handled separately"
        },
        // ... more rejected
      ],

      warnings: [
        {
          pattern_id: "auth_001",
          issue: "Missing authentication on sensitive endpoints",
          severity: "critical",
          rejected_by_user: true,
          recommendation: "Add Spring Security authentication"
        }
      ],

      summary: {
        patterns_enhanced: 5,
        patterns_replaced: 2,
        patterns_added: 3,
        anti_patterns_documented: 2,
        warnings_added: 1
      }
    }

  USE: For audit trail and skill metadata
</application_log>

</step>

<step number="7" name="prepare_for_template">

### Step 7: Prepare Final Pattern Data for Template

Format enhanced patterns for template processing.

<final_output_structure>
  {
    framework: "spring-boot",
    version: "3.2.0",
    patterns_with_improvements: {
      routing: [
        {
          pattern_id: "rest_endpoint_001",
          title: "REST Endpoint with ResponseEntity",
          code: "[enhanced code]",
          status: "enhanced",
          improvement_note: "Added explicit HTTP status control",
          best_practice: true,
          example_files: ["UserController.java"],
          benefits: [...]
        },
        // ... more routing patterns
      ],

      error_handling: [
        {
          pattern_id: "exception_handler_001",
          title: "Centralized Exception Handling",
          code: "[new code]",
          status: "added",
          improvement_note: "Added from accepted improvement",
          best_practice: true,
          severity: "critical",
          before_after: { before: "...", after: "..." },
          benefits: [...]
        },
        // ... more error handling patterns
      ],

      validation: [...],
      data_access: [...],
      security: [...]
    },

    anti_patterns: [
      {
        pattern_id: "anti_sql_injection",
        title: "SQL Injection Vulnerability",
        bad_code: "[string concatenation]",
        good_code: "[parameterized query]",
        severity: "critical",
        explanation: "...",
        references: [...]
      },
      // ... more anti-patterns
    ],

    known_issues: [
      // Rejected critical improvements
    ],

    metadata: {
      improvements_applied: 8,
      critical_fixes: 2,
      warnings_addressed: 5,
      info_applied: 1,
      total_effort: "18 hours",
      patterns_count: 35  // original 32 + 3 added
    }
  }

  READY: For template processing in Phase 7
</final_output_structure>

</step>

</application_flow>

## Output Format

<output>
  {
    application_summary: {
      improvements_applied: 8,
      patterns_enhanced: 5,
      patterns_replaced: 2,
      patterns_added: 3,
      anti_patterns_documented: 2,
      warnings_added: 1,
      total_effort: "18 hours"
    },

    enhanced_patterns: {
      // Organized by category for template
    },

    anti_patterns: [
      // Anti-patterns to document
    ],

    known_issues: [
      // Rejected critical improvements with warnings
    ],

    application_log: {
      // Detailed audit trail
    },

    ready_for_template: true
  }
</output>

## Validation

<validation_steps>
  VERIFY:
    - All accepted improvements have been processed
    - Pattern data structure is valid
    - No duplicate pattern IDs
    - All code examples are properly formatted
    - Anti-patterns have alternatives
    - Warnings for rejected criticals are present

  QUALITY_CHECKS:
    - Enhanced patterns maintain original context
    - Improvements are clearly marked
    - Before/after examples are included where applicable
    - Benefits are documented
    - References are provided
</validation_steps>

## Error Handling

<error_protocols>
  <invalid_improvement_id>
    LOG: Invalid improvement ID
    SKIP: That improvement
    CONTINUE: With valid improvements
    WARN: User about skipped items
  </invalid_improvement_id>

  <merge_conflict>
    IF pattern merge fails:
      FALLBACK: Keep original pattern
      LOG: Merge conflict details
      ADD_NOTE: "Improvement could not be automatically applied"
  </merge_conflict>

  <no_improvements_applied>
    IF accepted_improvements.length == 0:
      MESSAGE: "No improvements selected. Using discovered patterns only."
      PROCEED: With original patterns
      SKIP: Enhancement step
  </no_improvements_applied>
</error_protocols>

## Related Utilities

- `@specwright/workflows/skill/interactive/present-improvements.md`
- `@specwright/workflows/skill/utils/replace-markers.md`
- `@specwright/workflows/skill/utils/assemble-skill.md`
