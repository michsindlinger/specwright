---
description: Generate actionable improvement suggestions from pattern comparison results
version: 1.0
encoding: UTF-8
---

# Improvement Suggestions Generation

## Overview

Transform pattern comparison results into actionable, prioritized improvement suggestions with clear before/after examples and impact assessments.

## Generation Process

<generation_flow>

<step number="1" name="categorize_improvements">

### Step 1: Categorize Improvements by Severity

Organize improvements into severity categories.

<severity_categories>
  CRITICAL (❌):
    - Security vulnerabilities
    - Data integrity issues
    - Breaking framework violations
    - Performance issues affecting all users

  WARNING (⚠️):
    - Code maintainability problems
    - Minor performance issues
    - Inconsistent patterns
    - Missing recommended features

  INFO (ℹ️):
    - Style improvements
    - Optional optimizations
    - Documentation enhancements
    - Convention preferences
</severity_categories>

</step>

<step number="2" name="create_improvement_templates">

### Step 2: Create Improvement Templates

Generate structured improvement suggestions.

<improvement_template>
  {
    id: "improvement_001",
    severity: "critical" | "warning" | "info",
    category: "error_handling" | "validation" | "security" | ...,
    title: "Short descriptive title",

    current_pattern: {
      description: "What the code currently does",
      code_example: "Current implementation",
      issues: ["Issue 1", "Issue 2"],
      files_affected: ["file1.java", "file2.java"]
    },

    recommended_pattern: {
      description: "What the code should do",
      code_example: "Recommended implementation",
      benefits: ["Benefit 1", "Benefit 2"],
      framework_alignment: "How it aligns with framework"
    },

    impact: {
      level: "high" | "medium" | "low",
      scope: "global" | "local",
      effort: "low" | "medium" | "high",
      files_to_change: 5
    },

    rationale: "Why this improvement matters",
    references: ["Link to docs", "Best practice guide"]
  }
</improvement_template>

</step>

<step number="3" name="generate_examples">

### Step 3: Generate Before/After Examples

Create clear code examples showing the improvement.

<example_generation>
  SPRING_BOOT_ERROR_HANDLING:
    CRITICAL:
      title: "Centralize Exception Handling"

      current_pattern:
        description: "Exception handling duplicated across controllers"
        code_example: |
          ```java
          @RestController
          public class UserController {
              @GetMapping("/users/{id}")
              public ResponseEntity<?> getUser(@PathVariable Long id) {
                  try {
                      User user = userService.findById(id);
                      return ResponseEntity.ok(user);
                  } catch (UserNotFoundException ex) {
                      return ResponseEntity
                          .status(HttpStatus.NOT_FOUND)
                          .body(new ErrorResponse(ex.getMessage()));
                  }
              }
          }
          ```
        issues:
          - "Code duplication across all controllers"
          - "Inconsistent error response format"
          - "Violates DRY principle"

      recommended_pattern:
        description: "Use @ControllerAdvice for centralized handling"
        code_example: |
          ```java
          @ControllerAdvice
          public class GlobalExceptionHandler {
              @ExceptionHandler(UserNotFoundException.class)
              public ResponseEntity<ErrorResponse> handleUserNotFound(
                  UserNotFoundException ex
              ) {
                  ErrorResponse error = new ErrorResponse(
                      HttpStatus.NOT_FOUND.value(),
                      ex.getMessage(),
                      LocalDateTime.now()
                  );
                  return new ResponseEntity<>(error, HttpStatus.NOT_FOUND);
              }
          }

          @RestController
          public class UserController {
              @GetMapping("/users/{id}")
              public ResponseEntity<User> getUser(@PathVariable Long id) {
                  // Exception automatically handled by @ControllerAdvice
                  User user = userService.findById(id);
                  return ResponseEntity.ok(user);
              }
          }
          ```
        benefits:
          - "Single source of truth for error handling"
          - "Consistent error responses across API"
          - "Cleaner controller code"
          - "Easier to maintain and test"

      impact:
        level: "high"
        scope: "global"
        effort: "medium"
        files_to_change: 15

      rationale: |
        Centralized exception handling is a Spring Boot best practice that
        ensures consistent error responses, reduces code duplication, and
        makes the API more maintainable. This pattern is especially important
        for production applications where consistent error handling affects
        client integration and debugging.

  REACT_PERFORMANCE:
    WARNING:
      title: "Add useMemo for Expensive Computations"

      current_pattern:
        description: "Expensive calculation runs on every render"
        code_example: |
          ```typescript
          export const UserList: React.FC<Props> = ({ users }) => {
            // Recalculates on every render
            const sortedUsers = users
              .map(u => ({ ...u, fullName: `${u.firstName} ${u.lastName}` }))
              .sort((a, b) => a.fullName.localeCompare(b.fullName));

            return (
              <div>
                {sortedUsers.map(user => (
                  <UserCard key={user.id} user={user} />
                ))}
              </div>
            );
          };
          ```
        issues:
          - "Sorting runs on every render (including parent re-renders)"
          - "Unnecessary performance overhead"
          - "Can cause UI lag with large lists"

      recommended_pattern:
        description: "Memoize expensive computation with useMemo"
        code_example: |
          ```typescript
          export const UserList: React.FC<Props> = ({ users }) => {
            const sortedUsers = useMemo(() => {
              return users
                .map(u => ({ ...u, fullName: `${u.firstName} ${u.lastName}` }))
                .sort((a, b) => a.fullName.localeCompare(b.fullName));
            }, [users]); // Only recalculate when users change

            return (
              <div>
                {sortedUsers.map(user => (
                  <UserCard key={user.id} user={user} />
                ))}
              </div>
            );
          };
          ```
        benefits:
          - "Computation only runs when users array changes"
          - "Prevents unnecessary re-calculations"
          - "Better performance, especially with large lists"
          - "Follows React performance best practices"

      impact:
        level: "medium"
        scope: "local"
        effort: "low"
        files_to_change: 1

      rationale: |
        useMemo prevents expensive computations from running on every render,
        which is important for maintaining responsive UIs. This is especially
        critical when dealing with list transformations or complex calculations
        that depend on props.

  PLAYWRIGHT_SELECTORS:
    INFO:
      title: "Use Accessibility-First Selectors"

      current_pattern:
        description: "Using CSS selectors and test IDs"
        code_example: |
          ```typescript
          test('should submit form', async ({ page }) => {
            await page.locator('#username').fill('john@example.com');
            await page.locator('[data-testid="password"]').fill('password');
            await page.locator('button.submit-btn').click();
          });
          ```
        issues:
          - "Relies on implementation details (CSS classes, IDs)"
          - "Doesn't validate accessibility"
          - "More brittle to UI changes"

      recommended_pattern:
        description: "Use getByRole for better accessibility"
        code_example: |
          ```typescript
          test('should submit form', async ({ page }) => {
            await page.getByRole('textbox', { name: 'Username' })
              .fill('john@example.com');
            await page.getByRole('textbox', { name: 'Password' })
              .fill('password');
            await page.getByRole('button', { name: 'Submit' }).click();
          });
          ```
        benefits:
          - "Validates that elements have proper ARIA roles"
          - "Tests accessibility as part of E2E tests"
          - "More resilient to CSS/structure changes"
          - "Self-documenting test code"

      impact:
        level: "low"
        scope: "local"
        effort: "low"
        files_to_change: 1

      rationale: |
        Accessibility-first selectors ensure your tests validate that the UI
        is accessible to all users, including those using screen readers. This
        is a Playwright best practice that improves both test quality and
        application accessibility.
</example_generation>

</step>

<step number="4" name="prioritize_improvements">

### Step 4: Prioritize Improvements

Rank improvements by importance and impact.

<prioritization_algorithm>
  CALCULATE: Priority score (0-100)

  priority_score = (
    severity_weight * 40 +
    impact_level_weight * 30 +
    scope_weight * 20 +
    (100 - effort_weight) * 10
  )

  WEIGHTS:
    severity:
      critical: 100
      warning: 60
      info: 30

    impact_level:
      high: 100
      medium: 60
      low: 30

    scope:
      global: 100 (affects entire codebase)
      local: 50 (affects specific area)

    effort:
      low: 20 (easy to implement)
      medium: 50
      high: 80 (significant work)

  EXAMPLE:
    Critical + High Impact + Global + Low Effort =
      (100 * 0.4) + (100 * 0.3) + (100 * 0.2) + (80 * 0.1) = 98

    Info + Low Impact + Local + High Effort =
      (30 * 0.4) + (30 * 0.3) + (50 * 0.2) + (20 * 0.1) = 33
</prioritization_algorithm>

<ranking_output>
  SORT: Improvements by priority_score (descending)

  GROUP: By severity for presentation
    critical_improvements: [sorted by priority]
    warning_improvements: [sorted by priority]
    info_improvements: [sorted by priority]

  RECOMMENDED_ORDER:
    1. All critical improvements (by priority)
    2. High-priority warnings
    3. Medium-priority warnings
    4. Low-priority warnings
    5. High-priority info
    6. Other info improvements
</ranking_output>

</step>

<step number="5" name="add_rationale">

### Step 5: Add Improvement Rationale

Explain why each improvement matters.

<rationale_components>
  TECHNICAL_REASONING:
    - Framework alignment
    - Performance implications
    - Security considerations
    - Maintainability benefits

  BUSINESS_VALUE:
    - User experience impact
    - Development velocity
    - Cost of technical debt
    - Risk mitigation

  LEARNING_OPPORTUNITY:
    - Skill development
    - Best practice adoption
    - Team knowledge sharing

  EXAMPLE_RATIONALES:
    Error Handling:
      "Centralized error handling ensures consistent API responses,
       making client integration easier and reducing support tickets.
       It also significantly improves code maintainability by eliminating
       duplicate error handling logic across controllers."

    Performance:
      "Memoizing expensive computations prevents unnecessary re-renders,
       directly improving user experience with faster UI updates. This is
       especially important for mobile users or users with slower devices."

    Accessibility:
      "Using accessibility-first selectors not only makes tests more robust,
       but also validates that the application is usable by people with
       disabilities, reducing legal risk and expanding the user base."
</rationale_components>

</step>

<step number="6" name="generate_summary">

### Step 6: Generate Improvement Summary

Create concise summary of all improvements.

<summary_structure>
  {
    total_improvements: 15,
    by_severity: {
      critical: 2,
      warning: 7,
      info: 6
    },
    estimated_effort: {
      total_hours: 24,
      by_severity: {
        critical: 8,
        warning: 12,
        info: 4
      }
    },
    expected_impact: {
      security: "Significant improvement (2 vulnerabilities fixed)",
      performance: "10-15% faster average response time",
      maintainability: "30% reduction in code duplication",
      accessibility: "WCAG 2.1 AA compliance achieved"
    },
    quick_wins: [
      "Add useMemo to 5 components (2 hours, medium impact)",
      "Use getByRole in tests (3 hours, low impact but easy)",
      "Add TypeScript strict mode (1 hour, high impact)"
    ],
    critical_path: [
      "Fix SQL injection vulnerability (4 hours)",
      "Implement centralized error handling (4 hours)"
    ]
  }
</summary_structure>

</step>

</generation_flow>

## Output Format

<output>
  {
    improvement_summary: {
      total: 15,
      critical: 2,
      warnings: 7,
      info: 6,
      estimated_total_effort: "24 hours"
    },

    improvements: [
      {
        id: "improvement_001",
        priority: 98,
        severity: "critical",
        category: "security",
        title: "Fix SQL Injection Vulnerability",
        current_pattern: {...},
        recommended_pattern: {...},
        impact: {...},
        rationale: "...",
        files_affected: 2,
        estimated_effort: "4 hours"
      },
      // ... more improvements
    ],

    quick_wins: [...],
    critical_path: [...],

    recommended_order: [
      "1. Fix SQL injection (Critical, 4h)",
      "2. Centralize error handling (Critical, 4h)",
      "3. Add @Transactional to services (Warning, 2h)",
      // ...
    ]
  }
</output>

## Error Handling

<error_protocols>
  <no_improvements_found>
    MESSAGE: "No improvements suggested - code follows best practices!"
    RETURN: Empty improvement list
    SUCCESS: True (this is good news)
  </no_improvements_found>

  <example_generation_failure>
    FALLBACK: Use description only without code example
    NOTE: "Code example unavailable"
    CONTINUE: With other improvements
  </example_generation_failure>
</error_protocols>

## Related Utilities

- `@specwright/workflows/skill/validation/compare-patterns.md`
- `@specwright/workflows/skill/validation/create-report.md`
- `@specwright/workflows/skill/interactive/present-improvements.md`
