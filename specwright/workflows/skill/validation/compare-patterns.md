---
description: Compare discovered patterns against framework best practices
version: 1.0
encoding: UTF-8
---

# Pattern Comparison

## Overview

Compare discovered code patterns from the codebase against framework best practices to identify gaps, anti-patterns, and improvement opportunities.

## Comparison Process

<comparison_flow>

<step number="1" name="load_best_practices">

### Step 1: Load Framework Best Practices

Load appropriate best practices based on detected framework.

<best_practices_loading>
  BASED_ON: Detected framework from pattern discovery

  SPRING_BOOT:
    LOAD: @specwright/workflows/skill/validation/best-practices/spring-boot.md

  EXPRESS:
    LOAD: @specwright/workflows/skill/validation/best-practices/express.md

  REACT:
    LOAD: @specwright/workflows/skill/validation/best-practices/react.md

  ANGULAR:
    LOAD: @specwright/workflows/skill/validation/best-practices/angular.md

  PLAYWRIGHT:
    LOAD: @specwright/workflows/skill/validation/best-practices/playwright.md

  GITHUB_ACTIONS:
    LOAD: @specwright/workflows/skill/validation/best-practices/github-actions.md
</best_practices_loading>

</step>

<step number="2" name="pattern_matching">

### Step 2: Pattern Matching Algorithm

Match discovered patterns against best practices using similarity scoring.

<matching_algorithm>
  FOR each discovered_pattern:
    FOR each best_practice:
      CALCULATE: similarity_score
      IDENTIFY: matches and gaps

  SIMILARITY_METRICS:
    - Structural similarity (AST-based if possible)
    - Keyword matching
    - Pattern intent matching
    - Framework-specific markers
</matching_algorithm>

<structural_similarity>
  COMPARE: Code structure
    - Function signatures
    - Decorator/annotation usage
    - Import patterns
    - Class/component hierarchy

  EXAMPLE (Spring Boot):
    Discovered: @GetMapping("/users/{id}")
    Best Practice: @GetMapping("/{id}")
    Similarity: 90% (same annotation, path variable present)
    Gap: Path should be relative to @RequestMapping on class
</structural_similarity>

<keyword_matching>
  EXTRACT: Keywords from both patterns
    - Annotations (@RestController, @Service, etc.)
    - Framework methods (useState, useEffect, etc.)
    - Design patterns (Repository, Factory, etc.)

  CALCULATE: Keyword overlap percentage
    matched_keywords / total_keywords_in_best_practice

  EXAMPLE (React):
    Discovered: useState, useCallback
    Best Practice: useState, useEffect, useCallback, useMemo
    Match: 50% (2 out of 4)
    Gap: Missing useEffect for side effects, useMemo for expensive computations
</keyword_matching>

<pattern_intent_matching>
  ANALYZE: Pattern purpose
    - Error handling intent
    - Validation approach
    - State management strategy
    - Performance optimization

  EXAMPLE (Express):
    Discovered: Manual try/catch in each route
    Best Practice: Centralized error handling middleware
    Intent Match: 70% (both handle errors)
    Gap: Not following DRY principle, no centralization
</pattern_intent_matching>

</step>

<step number="3" name="similarity_scoring">

### Step 3: Calculate Similarity Scores

Assign numerical scores to pattern matches.

<scoring_system>
  CALCULATE: Composite similarity score (0-100)

  similarity_score = (
    structural_similarity * 0.4 +
    keyword_matching * 0.3 +
    intent_matching * 0.3
  )

  THRESHOLDS:
    HIGH_MATCH: >= 80% (pattern aligns well with best practice)
    MEDIUM_MATCH: 50-79% (pattern partially aligns)
    LOW_MATCH: 20-49% (pattern differs significantly)
    NO_MATCH: < 20% (pattern doesn't align)
</scoring_system>

<match_categories>
  PERFECT_MATCH (95-100%):
    - Pattern exactly follows best practice
    - No improvements needed
    STATUS: ✅ Good

  STRONG_MATCH (80-94%):
    - Pattern mostly follows best practice
    - Minor improvements possible
    STATUS: ✅ Good (with minor suggestions)

  PARTIAL_MATCH (50-79%):
    - Pattern has right intent but implementation differs
    - Moderate improvements recommended
    STATUS: ⚠️ Could be improved

  WEAK_MATCH (20-49%):
    - Pattern exists but significantly differs from best practice
    - Major improvements recommended
    STATUS: ⚠️ Needs improvement

  NO_MATCH (0-19%):
    - Best practice not implemented
    - Pattern missing entirely
    STATUS: ❌ Missing best practice
</match_categories>

</step>

<step number="4" name="gap_analysis">

### Step 4: Gap Analysis

Identify missing best practices and implementation gaps.

<gap_identification>
  FOR each best_practice:
    IF no discovered_pattern matches (score < 20%):
      MARK: As missing gap
      SEVERITY: Based on best practice importance

    ELSE IF partial match (score 20-79%):
      IDENTIFY: Specific gaps
      COMPARE: What's present vs what's missing

  GAP_TYPES:
    - Missing pattern (not implemented at all)
    - Incomplete implementation (partially done)
    - Incorrect implementation (wrong approach)
    - Outdated pattern (deprecated approach)
</gap_identification>

<gap_examples>
  SPRING_BOOT_GAPS:
    Missing: "@ControllerAdvice for centralized exception handling"
      Current: Exception handlers in each controller
      Gap: No centralized error handling
      Impact: High (code duplication, inconsistent responses)

    Incomplete: "Pagination support"
      Current: Manual limit/offset in some endpoints
      Gap: No Spring Data Pageable usage
      Impact: Medium (not following framework conventions)

  REACT_GAPS:
    Missing: "Error boundaries"
      Current: No error boundaries found
      Gap: No component error handling
      Impact: High (poor error user experience)

    Incomplete: "useMemo for expensive computations"
      Current: Used in 3 out of 15 components with heavy calculations
      Gap: Missing in 80% of cases
      Impact: Medium (potential performance issues)

  PLAYWRIGHT_GAPS:
    Missing: "Page Object Model"
      Current: Direct selectors in test files
      Gap: No abstraction layer
      Impact: Medium (test maintenance difficulty)
</gap_examples>

<severity_assignment>
  CRITICAL (Impact: High, Frequency: Common):
    - Security vulnerabilities
    - Performance issues affecting all users
    - Data integrity problems
    - Major framework violations

  WARNING (Impact: Medium, or Impact: High but rare):
    - Code maintainability issues
    - Minor performance problems
    - Inconsistent patterns
    - Missing optimizations

  INFO (Impact: Low):
    - Style improvements
    - Minor optimizations
    - Documentation suggestions
    - Convention preferences
</severity_assignment>

</step>

<step number="5" name="anti_pattern_detection">

### Step 5: Anti-Pattern Detection

Identify code patterns that actively work against best practices.

<anti_pattern_categories>
  SECURITY_ANTI_PATTERNS:
    - SQL injection vulnerabilities
    - XSS vulnerabilities
    - Hardcoded secrets
    - Missing authentication/authorization
    - Insecure data handling

  PERFORMANCE_ANTI_PATTERNS:
    - N+1 query problems
    - Missing database indexes
    - Unnecessary re-renders (React)
    - Memory leaks (event listeners not cleaned up)
    - Blocking operations on main thread

  MAINTAINABILITY_ANTI_PATTERNS:
    - God classes/components (too large)
    - Tight coupling
    - Code duplication
    - Magic numbers/strings
    - Poor naming conventions

  FRAMEWORK_ANTI_PATTERNS:
    - Fighting the framework
    - Not using framework features
    - Deprecated API usage
    - Incorrect lifecycle usage
</anti_pattern_categories>

<anti_pattern_examples>
  SPRING_BOOT:
    Anti-Pattern: "String concatenation for SQL queries"
      ```java
      String sql = "SELECT * FROM users WHERE id = " + userId;
      // SQL injection vulnerability
      ```
      Best Practice: Use JPA or parameterized queries
      Severity: ❌ Critical

  REACT:
    Anti-Pattern: "Mutating state directly"
      ```typescript
      user.name = 'New Name';
      setUser(user); // Won't trigger re-render
      ```
      Best Practice: Create new object
      Severity: ⚠️ Warning

  PLAYWRIGHT:
    Anti-Pattern: "Using hardcoded waits"
      ```typescript
      await page.waitForTimeout(5000); // Brittle
      ```
      Best Practice: Use auto-waiting locators
      Severity: ⚠️ Warning
</anti_pattern_examples>

<detection_methods>
  STATIC_ANALYSIS:
    - Code pattern matching (regex, AST)
    - Framework-specific rules
    - Security scanners

  HEURISTIC_DETECTION:
    - Complexity metrics (cyclomatic complexity)
    - File size thresholds
    - Duplication detection
    - Naming convention violations

  CONTEXT_AWARE:
    - Check for missing complementary patterns
      Example: useState without useCallback for handlers
    - Verify framework conventions
      Example: React hooks starting with 'use'
</detection_methods>

</step>

<step number="6" name="comparison_report">

### Step 6: Generate Comparison Report

Create structured comparison results.

<report_structure>
  {
    framework: "spring-boot",
    analysis_date: "2025-12-31",
    patterns_analyzed: 32,
    best_practices_checked: 28,

    overall_score: 72,  // 0-100
    grade: "B",  // A, B, C, D, F

    category_scores: {
      routing: { score: 85, grade: "A", status: "good" },
      validation: { score: 70, grade: "B-", status: "needs_improvement" },
      error_handling: { score: 45, grade: "D", status: "poor" },
      data_access: { score: 90, grade: "A", status: "excellent" },
      security: { score: 60, grade: "C", status: "needs_improvement" }
    },

    matches: [
      {
        best_practice: "REST endpoint definition with @GetMapping",
        discovered_pattern: "@GetMapping(\"/users/{id}\")",
        similarity_score: 95,
        status: "✅ Perfect Match",
        notes: "Follows Spring Boot conventions correctly"
      },
      {
        best_practice: "Bean Validation with @Valid",
        discovered_pattern: "@Valid @RequestBody UserRequest",
        similarity_score: 90,
        status: "✅ Strong Match",
        notes: "Good validation usage, consider adding custom validators"
      },
      // ...
    ],

    gaps: [
      {
        best_practice: "Centralized exception handling with @ControllerAdvice",
        severity: "critical",
        impact: "high",
        current_state: "Exception handlers in individual controllers",
        missing: "Global @ControllerAdvice class",
        affected_files: 15,
        recommendation: "Create GlobalExceptionHandler with @ControllerAdvice"
      },
      {
        best_practice: "Pagination with Spring Data Pageable",
        severity: "warning",
        impact: "medium",
        current_state: "Manual limit/offset in 3 endpoints",
        missing: "Pageable parameter usage",
        affected_files: 3,
        recommendation: "Use Pageable and Page<T> return type"
      },
      // ...
    ],

    anti_patterns: [
      {
        pattern: "SQL injection vulnerability",
        severity: "critical",
        locations: ["UserRepository.java:45"],
        description: "String concatenation in SQL query",
        fix: "Use JPA query methods or @Query with parameters"
      },
      // ...
    ],

    recommendations: [
      "Implement centralized exception handling (Critical)",
      "Add @Transactional to service methods (Warning)",
      "Use Pageable for list endpoints (Warning)",
      "Add API documentation with Swagger/OpenAPI (Info)"
    ]
  }
</report_structure>

<scoring_algorithm>
  CALCULATE: Overall score

  weighted_score = (
    SUM(category_score * category_weight * patterns_in_category) /
    SUM(category_weight * patterns_in_category)
  )

  CATEGORY_WEIGHTS:
    security: 1.5 (highest priority)
    error_handling: 1.3
    validation: 1.2
    data_access: 1.1
    routing: 1.0
    performance: 1.0
    logging: 0.8

  GRADE_MAPPING:
    A: 90-100 (Excellent)
    B: 80-89 (Good)
    C: 70-79 (Satisfactory)
    D: 60-69 (Needs Improvement)
    F: 0-59 (Poor)
</scoring_algorithm>

</step>

</comparison_flow>

## Output Format

<output>
  {
    comparison_summary: {
      framework: "spring-boot",
      overall_score: 72,
      grade: "B",
      matches: 18,
      gaps: 7,
      anti_patterns: 3,
      patterns_analyzed: 32,
      best_practices_checked: 28
    },

    detailed_results: {
      matches: [...],
      gaps: [...],
      anti_patterns: [...]
    },

    recommendations: {
      critical: [...],
      warnings: [...],
      info: [...]
    },

    next_steps: [
      "Address critical anti-patterns first",
      "Implement missing high-impact best practices",
      "Review and refactor code with warnings"
    ]
  }
</output>

## Error Handling

<error_protocols>
  <best_practices_not_found>
    FALLBACK: Use generic best practices for framework family
    WARN: "Specific best practices not available, using generic guidelines"
  </best_practices_not_found>

  <insufficient_patterns>
    IF patterns_count < 5:
      WARN: "Limited patterns for meaningful comparison"
      PROCEED: With available patterns
      NOTE: Lower confidence in results
  </insufficient_patterns>

  <comparison_failure>
    LOG: Pattern and best practice that failed comparison
    SKIP: Failed comparison
    CONTINUE: With remaining comparisons
  </comparison_failure>
</error_protocols>

## Performance Considerations

- Cache best practices loading
- Parallel comparison for independent patterns
- Limit detailed analysis to top 50 patterns
- Use efficient string matching algorithms

## Related Utilities

- `@specwright/workflows/skill/validation/generate-improvements.md`
- `@specwright/workflows/skill/validation/create-report.md`
- `@specwright/workflows/skill/utils/extract-patterns.md`
