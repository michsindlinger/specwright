---
description: Extract, normalize, and rank code patterns from discovered files
version: 1.0
encoding: UTF-8
---

# Pattern Extraction Utility

## Overview

Extract code patterns from files discovered by the Explore agent, normalize variations, calculate frequencies, and rank by usage to identify the most common patterns in the codebase.

## Purpose

Converts raw file discoveries into structured, ranked patterns that can be:
- Compared against best practices
- Used to generate skill templates
- Presented to users for validation
- Applied to improve code consistency

## Extraction Process

<extraction_flow>

<step number="1" name="code_snippet_extraction">

### Step 1: Code Snippet Extraction

Extract relevant code snippets from discovered files.

<extraction_strategy>
  INPUT: List of files from Explore agent
  FOR each file:
    READ: File content
    IDENTIFY: Pattern type based on file path and content
    EXTRACT: Relevant code snippets

  PATTERN_TYPES:
    - Function/method definitions
    - Class definitions
    - Import/export statements
    - Configuration patterns
    - Naming conventions
    - Error handling patterns
    - Validation patterns
</extraction_strategy>

<snippet_identification>
  API_PATTERNS (Controllers, Services, Repositories):
    EXTRACT:
      - Method signatures
      - Routing definitions
      - Request/response handling
      - Validation logic
      - Error handling
      - Transaction boundaries

  COMPONENT_PATTERNS (React, Angular, Vue, Svelte):
    EXTRACT:
      - Component structure
      - Props/interface definitions
      - State management usage
      - Event handlers
      - Lifecycle hooks
      - Styling approaches

  TEST_PATTERNS:
    EXTRACT:
      - Test structure (describe/it blocks)
      - Setup/teardown
      - Assertion patterns
      - Mocking patterns
      - Test data fixtures

  DEPLOYMENT_PATTERNS:
    EXTRACT:
      - Workflow/pipeline steps
      - Build commands
      - Test execution
      - Deployment strategies
      - Environment configuration
</snippet_identification>

<context_preservation>
  FOR each snippet:
    CAPTURE:
      - File path
      - Line numbers
      - Surrounding context (if needed)
      - Pattern category
      - Language/framework

  CREATE: Snippet metadata
    {
      snippet: "code string",
      file_path: "src/controllers/UserController.java",
      start_line: 45,
      end_line: 62,
      category: "error_handling",
      framework: "spring-boot",
      language: "java"
    }
</context_preservation>

</step>

<step number="2" name="pattern_normalization">

### Step 2: Pattern Normalization

Normalize code variations to identify common patterns.

<normalization_strategy>
  GOAL: Convert code variations into canonical forms
  PROCESS: Remove implementation details, keep structure
</normalization_strategy>

<variable_normalization>
  REPLACE: Specific names with placeholders
    - Variable names → [VARIABLE_NAME]
    - Function names → [FUNCTION_NAME]
    - Class names → [CLASS_NAME]
    - URL paths → [ENDPOINT_PATH]
    - String literals → [STRING_LITERAL]

  EXAMPLE:
    BEFORE: const userName = request.body.name;
    AFTER: const [VARIABLE_NAME] = request.body.[PROPERTY_NAME];
</variable_normalization>

<whitespace_normalization>
  STANDARDIZE: Whitespace and indentation
    - Remove leading/trailing whitespace
    - Normalize indentation to 2 spaces
    - Remove blank lines (except structural ones)
    - Normalize line endings

  PRESERVE: Meaningful structure
    - Keep logical code blocks separated
    - Maintain nesting levels
</whitespace_normalization>

<comment_handling>
  STRIP: Implementation-specific comments
  PRESERVE: Structural comments
    - @decorators
    - @annotations
    - JSDoc/Javadoc signatures (structure only)
</comment_handling>

<type_normalization>
  GENERALIZE: Specific types when appropriate
    - Specific DTOs → [DTO_TYPE]
    - Specific entities → [ENTITY_TYPE]
    - PRESERVE: Framework types (e.g., Response, HttpStatus)
</type_normalization>

<result_structure>
  NORMALIZED_PATTERN:
    {
      normalized_code: "canonical pattern string",
      original_snippets: [
        {snippet: "...", file_path: "...", ...},
        ...
      ],
      pattern_signature: "hash of normalized code",
      category: "error_handling",
      framework: "spring-boot"
    }
</result_structure>

</step>

<step number="3" name="frequency_analysis">

### Step 3: Pattern Frequency Analysis

Calculate how often each pattern appears in the codebase.

<frequency_calculation>
  FOR each normalized_pattern:
    COUNT: Number of occurrences (length of original_snippets)
    CALCULATE: Percentage of total files
    TRACK: Files using this pattern

  EXAMPLE:
    pattern_frequency: {
      pattern_id: "error_handler_001",
      occurrences: 23,
      total_files_checked: 45,
      usage_percentage: 51.1,
      files: ["UserController.java", "OrderController.java", ...]
    }
</frequency_calculation>

<file_coverage_analysis>
  CALCULATE: Coverage metrics
    - Total files analyzed: N
    - Files using pattern: M
    - Coverage: M/N * 100%

  CATEGORIZE: By coverage
    - Dominant (>75%): Very common pattern
    - Common (50-75%): Frequently used
    - Moderate (25-50%): Sometimes used
    - Rare (<25%): Occasionally used
</file_coverage_analysis>

<consistency_scoring>
  ANALYZE: Pattern consistency
    IF pattern has multiple slight variations:
      IDENTIFY: Variations
      CALCULATE: Consistency score
        - High (>90%): Very consistent
        - Medium (70-90%): Mostly consistent
        - Low (<70%): Inconsistent usage

    EXAMPLE: Error handling with slight variations in message format
      - 20 files use: throw new NotFoundException("...")
      - 3 files use: throw new NotFoundException(String.format(...))
      - Consistency: 87% (mostly consistent)
</consistency_scoring>

</step>

<step number="4" name="pattern_ranking">

### Step 4: Pattern Ranking

Rank patterns by importance and relevance.

<ranking_criteria>
  PRIMARY: Usage frequency
  SECONDARY: Pattern category importance
  TERTIARY: Consistency score
</ranking_criteria>

<scoring_algorithm>
  FOR each pattern:
    CALCULATE: Composite score
      frequency_score = (occurrences / total_files) * 100
      category_weight = CATEGORY_WEIGHTS[pattern.category]
      consistency_bonus = consistency_score * 0.1

      pattern_score = (frequency_score * category_weight) + consistency_bonus

  CATEGORY_WEIGHTS:
    error_handling: 1.2
    validation: 1.2
    routing: 1.1
    data_access: 1.1
    component_structure: 1.0
    styling: 0.9
    logging: 0.8
</scoring_algorithm>

<ranking_output>
  SORT: Patterns by pattern_score (descending)
  CATEGORIZE: By rank tier
    - Tier 1 (Top 20%): Most important patterns
    - Tier 2 (20-50%): Important patterns
    - Tier 3 (50-80%): Useful patterns
    - Tier 4 (80-100%): Minor patterns

  OUTPUT:
    {
      ranked_patterns: [
        {
          rank: 1,
          tier: 1,
          pattern_id: "...",
          score: 95.3,
          category: "error_handling",
          occurrences: 23,
          consistency: "high",
          normalized_code: "...",
          example_files: [...]
        },
        ...
      ]
    }
</ranking_output>

</step>

<step number="5" name="pattern_deduplication">

### Step 5: Pattern Deduplication

Remove duplicate or highly similar patterns.

<similarity_detection>
  FOR each pair of patterns:
    CALCULATE: Similarity score using:
      - Levenshtein distance on normalized code
      - Structural similarity (AST comparison if possible)
      - Category matching

    IF similarity > 90%:
      MARK: As potential duplicate
</similarity_detection>

<deduplication_strategy>
  FOR each duplicate group:
    SELECT: Primary pattern (highest frequency)
    MERGE: Other patterns into primary
      - Combine original_snippets
      - Update occurrence count
      - Preserve all file references
      - Note variations in metadata

  RESULT: Deduplicated pattern with variation notes
    {
      pattern_id: "error_handler_001",
      normalized_code: "...",
      occurrences: 25,
      variations: [
        {variation_type: "message_format", count: 3, note: "Uses String.format"}
      ],
      original_snippets: [all snippets from merged patterns]
    }
</deduplication_strategy>

</step>

<step number="6" name="pattern_categorization">

### Step 6: Pattern Categorization

Organize patterns by functional categories.

<category_taxonomy>
  API_PATTERNS:
    - routing_definition
    - request_validation
    - response_formatting
    - error_handling
    - authentication_authorization
    - pagination
    - transaction_management

  COMPONENT_PATTERNS:
    - component_structure
    - props_definition
    - state_management
    - event_handling
    - lifecycle_hooks
    - styling_approach
    - composition_patterns

  TEST_PATTERNS:
    - test_structure
    - setup_teardown
    - assertion_style
    - mocking_strategy
    - fixture_management
    - test_data_builders

  DEPLOYMENT_PATTERNS:
    - build_process
    - test_execution
    - artifact_generation
    - deployment_strategy
    - environment_config
    - secrets_management
</category_taxonomy>

<categorization_output>
  GROUP: Patterns by category
    {
      error_handling: [
        {pattern_id: "...", rank: 1, ...},
        {pattern_id: "...", rank: 5, ...}
      ],
      request_validation: [
        {pattern_id: "...", rank: 2, ...}
      ],
      ...
    }
</categorization_output>

</step>

<step number="7" name="example_selection">

### Step 7: Example Code Selection

Select best examples for each pattern.

<selection_criteria>
  FOR each pattern:
    SELECT: Top 3-5 examples based on:
      - Completeness
      - Clarity
      - Representativeness
      - Minimal dependencies on other code

  AVOID: Examples that:
    - Are too complex
    - Have many external dependencies
    - Contain sensitive information
    - Are poorly formatted
</selection_criteria>

<example_formatting>
  FOR each selected example:
    FORMAT: Code snippet
      - Add syntax highlighting hints
      - Include context comments
      - Add file path reference
      - Indicate line numbers

  OUTPUT:
    ```java
    // File: src/controllers/UserController.java:45-62
    // Pattern: Error handling with custom exception
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
    ```
</example_formatting>

</step>

</extraction_flow>

## Output Structure

<final_output>
  {
    extraction_summary: {
      total_files_analyzed: N,
      total_patterns_found: M,
      patterns_after_deduplication: K,
      top_tier_patterns: X,
      framework: "spring-boot",
      pattern_type: "api"
    },

    patterns_by_category: {
      error_handling: [
        {
          pattern_id: "error_handler_001",
          rank: 1,
          tier: 1,
          score: 95.3,
          normalized_code: "...",
          occurrences: 25,
          usage_percentage: 55.6,
          consistency: "high",
          variations: [...],
          examples: [
            {
              code: "...",
              file_path: "...",
              lines: "45-62"
            }
          ]
        }
      ],
      request_validation: [...],
      ...
    },

    ranked_patterns: [
      {tier: 1, patterns: [...]},
      {tier: 2, patterns: [...]},
      {tier: 3, patterns: [...]},
      {tier: 4, patterns: [...]}
    ]
  }
</final_output>

## Error Handling

<error_protocols>
  <file_read_error>
    LOG: File path and error
    SKIP: That file
    CONTINUE: With other files
  </file_read_error>

  <parse_error>
    LOG: File and parsing error
    ATTEMPT: Text-based pattern extraction
    FALLBACK: Mark as manual review needed
  </parse_error>

  <insufficient_patterns>
    IF patterns_found < 3:
      WARN: "Insufficient patterns found for meaningful analysis"
      SUGGEST: "Consider using --best-practices mode instead"
  </insufficient_patterns>
</error_protocols>

## Performance Considerations

- Limit file reading to first 500 lines for very large files
- Use streaming for large file sets
- Cache normalized patterns to avoid reprocessing
- Parallel processing for file analysis when possible
- Early termination if sufficient patterns found (e.g., 50+ patterns)

## Usage Example

<example>
  INPUT: 45 Spring Boot controller files from Explore agent

  PROCESS:
    1. Extract error handling code from all files
    2. Normalize variable names and whitespace
    3. Calculate: 23 files use same pattern (51%)
    4. Rank: Top pattern with score 95.3
    5. Deduplicate: Merge 3 slight variations
    6. Select: Best 3 examples

  OUTPUT:
    {
      pattern_id: "error_handler_001",
      category: "error_handling",
      rank: 1,
      tier: 1,
      score: 95.3,
      occurrences: 23,
      usage_percentage: 51.1,
      consistency: "high",
      description: "Custom exception handler with ResponseEntity",
      normalized_code: "@ExceptionHandler([EXCEPTION_CLASS].class) ...",
      examples: [3 formatted code examples]
    }
</example>

## Related Utilities

- `@specwright/workflows/skill/analysis/discover-api-patterns.md`
- `@specwright/workflows/skill/analysis/discover-component-patterns.md`
- `@specwright/workflows/skill/validation/compare-patterns.md`
