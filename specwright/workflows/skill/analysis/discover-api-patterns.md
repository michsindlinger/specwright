---
description: Discover API patterns from backend codebase using Explore agent
version: 1.0
encoding: UTF-8
---

# API Pattern Discovery

## Overview

Use the Explore agent to discover API patterns from the backend codebase, including controllers, services, repositories, routing, validation, error handling, and data access patterns.

## Purpose

Extract real-world API implementation patterns from the project to:
- Generate framework-specific skill templates
- Identify project conventions and standards
- Compare against best practices
- Create customized development guidelines

## Discovery Process

<discovery_flow>

<step number="1" name="framework_based_search">

### Step 1: Framework-Based Search Strategy

Tailor search patterns based on detected backend framework.

<framework_strategies>
  SPRING_BOOT:
    SEARCH_PATTERNS:
      Controllers: ["**/controllers/**/*.java", "**/*Controller.java"]
      Services: ["**/services/**/*.java", "**/*Service.java"]
      Repositories: ["**/repositories/**/*.java", "**/*Repository.java"]
      DTOs: ["**/dto/**/*.java", "**/*DTO.java", "**/*Request.java", "**/*Response.java"]
      Exceptions: ["**/exceptions/**/*.java", "**/*Exception.java"]

  EXPRESS:
    SEARCH_PATTERNS:
      Routes: ["**/routes/**/*.js", "**/routes/**/*.ts", "**/*Routes.js", "**/*Routes.ts"]
      Controllers: ["**/controllers/**/*.js", "**/controllers/**/*.ts", "**/*Controller.js", "**/*Controller.ts"]
      Services: ["**/services/**/*.js", "**/services/**/*.ts", "**/*Service.js", "**/*Service.ts"]
      Middleware: ["**/middleware/**/*.js", "**/middleware/**/*.ts", "**/*Middleware.js"]
      Models: ["**/models/**/*.js", "**/models/**/*.ts"]

  FASTAPI:
    SEARCH_PATTERNS:
      Routers: ["**/routers/**/*.py", "**/routes/**/*.py", "**/*_router.py"]
      Services: ["**/services/**/*.py", "**/*_service.py"]
      Schemas: ["**/schemas/**/*.py", "**/models/**/*.py"]
      Dependencies: ["**/dependencies/**/*.py", "**/deps.py"]

  DJANGO:
    SEARCH_PATTERNS:
      Views: ["**/views/**/*.py", "**/views.py"]
      ViewSets: ["**/viewsets/**/*.py"]
      Serializers: ["**/serializers/**/*.py", "**/serializers.py"]
      Models: ["**/models/**/*.py", "**/models.py"]
      URLs: ["**/urls.py"]

  RAILS:
    SEARCH_PATTERNS:
      Controllers: ["app/controllers/**/*_controller.rb"]
      Services: ["app/services/**/*.rb"]
      Models: ["app/models/**/*.rb"]
      Serializers: ["app/serializers/**/*_serializer.rb"]
      Concerns: ["app/controllers/concerns/**/*.rb"]
</framework_strategies>

</step>

<step number="2" name="explore_agent_orchestration">

### Step 2: Explore Agent Orchestration

Use Explore agent to discover files and patterns systematically.

<exploration_strategy>
  USE: Task tool with subagent_type="Explore"
  THOROUGHNESS: "medium"

  FOR each pattern_category (Controllers, Services, Repositories, etc.):
    EXECUTE: Separate Explore agent task

    PROMPT_TEMPLATE:
      "Discover {category} patterns in the {framework} codebase:

       Search for: {file_patterns}

       Please find and analyze files that match these patterns:
       - Identify key files (top 10-15 most representative)
       - Extract common coding patterns
       - Note naming conventions
       - Identify architectural patterns

       Focus on:
       - {framework_specific_focus}

       Return file paths and key observations about patterns."
</exploration_strategy>

<spring_boot_exploration>
  CONTROLLER_DISCOVERY:
    PROMPT: "Discover Spring Boot controller patterns:
             - Search for files: **/controllers/**/*.java, **/*Controller.java
             - Focus on: @RestController, @RequestMapping, HTTP method annotations
             - Extract: Routing patterns, request/response handling, validation
             - Identify: Common patterns for GET, POST, PUT, DELETE endpoints"

    EXPECTED_FINDINGS:
      - REST endpoint definitions
      - Path variable and request param usage
      - @Valid annotations for validation
      - ResponseEntity usage patterns
      - Error handling approaches

  SERVICE_DISCOVERY:
    PROMPT: "Discover Spring Boot service patterns:
             - Search for files: **/services/**/*.java, **/*Service.java
             - Focus on: @Service annotation, business logic organization
             - Extract: Transaction management, dependency injection
             - Identify: Service layer patterns, method naming conventions"

    EXPECTED_FINDINGS:
      - @Transactional usage
      - @Autowired dependency injection
      - Business logic organization
      - Error handling in services
      - Method naming patterns

  REPOSITORY_DISCOVERY:
    PROMPT: "Discover Spring Boot repository patterns:
             - Search for files: **/repositories/**/*.java, **/*Repository.java
             - Focus on: JPA repository patterns, custom queries
             - Extract: Query methods, pagination, specifications
             - Identify: Data access patterns"

    EXPECTED_FINDINGS:
      - JpaRepository extension
      - Custom query methods
      - @Query annotations
      - Pagination and sorting
      - Specification pattern usage
</spring_boot_exploration>

<express_exploration>
  ROUTE_DISCOVERY:
    PROMPT: "Discover Express route patterns:
             - Search for files: **/routes/**/*.js, **/routes/**/*.ts
             - Focus on: Router definitions, route organization
             - Extract: Route structure, middleware usage, HTTP methods
             - Identify: REST API patterns, route grouping"

    EXPECTED_FINDINGS:
      - express.Router() usage
      - Route definitions (GET, POST, PUT, DELETE)
      - Middleware chains
      - Route parameter patterns
      - Route organization structure

  CONTROLLER_DISCOVERY:
    PROMPT: "Discover Express controller patterns:
             - Search for files: **/controllers/**/*.js, **/controllers/**/*.ts
             - Focus on: Controller functions, request/response handling
             - Extract: Async/await patterns, error handling, validation
             - Identify: Controller organization and naming"

    EXPECTED_FINDINGS:
      - Async controller functions
      - Request/response handling
      - Error handling (try/catch)
      - Response status codes
      - Validation patterns

  MIDDLEWARE_DISCOVERY:
    PROMPT: "Discover Express middleware patterns:
             - Search for files: **/middleware/**/*.js, **/middleware/**/*.ts
             - Focus on: Authentication, validation, error handling middleware
             - Extract: Middleware structure, next() usage
             - Identify: Common middleware patterns"

    EXPECTED_FINDINGS:
      - Authentication middleware
      - Validation middleware
      - Error handling middleware
      - Request logging
      - CORS and security middleware
</express_exploration>

<fastapi_exploration>
  ROUTER_DISCOVERY:
    PROMPT: "Discover FastAPI router patterns:
             - Search for files: **/routers/**/*.py, **/*_router.py
             - Focus on: APIRouter, path operations, dependencies
             - Extract: Route definitions, response models, status codes
             - Identify: FastAPI routing patterns"

    EXPECTED_FINDINGS:
      - APIRouter usage
      - Path operation decorators (@router.get, @router.post)
      - Pydantic model usage
      - Dependency injection
      - Response model patterns

  SCHEMA_DISCOVERY:
    PROMPT: "Discover FastAPI schema patterns:
             - Search for files: **/schemas/**/*.py
             - Focus on: Pydantic models, validation
             - Extract: BaseModel inheritance, validators
             - Identify: Schema organization patterns"

    EXPECTED_FINDINGS:
      - Pydantic BaseModel classes
      - Field validators
      - Config classes
      - Schema inheritance
      - Validation patterns
</fastapi_exploration>

<django_exploration>
  VIEW_DISCOVERY:
    PROMPT: "Discover Django view patterns:
             - Search for files: **/views/**/*.py, **/views.py
             - Focus on: Class-based views, function views
             - Extract: View logic, queryset usage
             - Identify: Django view patterns"

    EXPECTED_FINDINGS:
      - Class-based views (ListView, DetailView, etc.)
      - Function-based views
      - Decorator usage (@login_required, etc.)
      - QuerySet operations
      - Template rendering

  SERIALIZER_DISCOVERY:
    PROMPT: "Discover Django REST Framework serializer patterns:
             - Search for files: **/serializers/**/*.py
             - Focus on: Serializer classes, validation
             - Extract: ModelSerializer usage, custom fields
             - Identify: Serialization patterns"

    EXPECTED_FINDINGS:
      - ModelSerializer classes
      - Custom serializer fields
      - Validation methods
      - Nested serializers
      - Read-only fields
</django_exploration>

<rails_exploration>
  CONTROLLER_DISCOVERY:
    PROMPT: "Discover Rails controller patterns:
             - Search for files: app/controllers/**/*_controller.rb
             - Focus on: Controller actions, before filters
             - Extract: RESTful actions, response formats
             - Identify: Rails controller conventions"

    EXPECTED_FINDINGS:
      - ApplicationController inheritance
      - RESTful actions (index, show, create, update, destroy)
      - before_action callbacks
      - Strong parameters
      - respond_to blocks

  SERVICE_DISCOVERY:
    PROMPT: "Discover Rails service object patterns:
             - Search for files: app/services/**/*.rb
             - Focus on: Service object organization
             - Extract: Business logic encapsulation
             - Identify: Service patterns"

    EXPECTED_FINDINGS:
      - Service object classes
      - Call methods
      - Result objects
      - Error handling
      - Transaction usage
</rails_exploration>

</step>

<step number="3" name="pattern_extraction">

### Step 3: Extract Patterns from Discovered Files

Process Explore agent results to extract concrete patterns.

<extraction_process>
  FOR each discovered_file:
    READ: File content (using Read tool)
    IDENTIFY: Pattern category (routing, validation, error handling, etc.)
    EXTRACT: Code snippets

    PATTERN_CATEGORIES:
      - routing_definition
      - request_validation
      - response_formatting
      - error_handling
      - authentication_authorization
      - pagination
      - transaction_management
      - data_access
      - dependency_injection
      - logging
</extraction_process>

<routing_patterns>
  SPRING_BOOT:
    EXTRACT:
      - @GetMapping, @PostMapping, @PutMapping, @DeleteMapping
      - @PathVariable and @RequestParam usage
      - @RequestBody for POST/PUT
      - Path patterns and versioning

    EXAMPLE:
      ```java
      @RestController
      @RequestMapping("/api/v1/users")
      public class UserController {
          @GetMapping("/{id}")
          public ResponseEntity<UserResponse> getUser(@PathVariable Long id) {
              // ...
          }
      }
      ```

  EXPRESS:
    EXTRACT:
      - router.get, router.post, router.put, router.delete
      - Route parameters (:id)
      - Query parameters
      - Request body access

    EXAMPLE:
      ```typescript
      router.get('/users/:id', async (req, res) => {
          const { id } = req.params;
          // ...
      });
      ```

  FASTAPI:
    EXTRACT:
      - @router.get, @router.post decorators
      - Path parameters
      - Query parameters
      - Request body models

    EXAMPLE:
      ```python
      @router.get("/users/{user_id}")
      async def get_user(user_id: int):
          # ...
      ```
</routing_patterns>

<validation_patterns>
  SPRING_BOOT:
    EXTRACT:
      - @Valid annotation
      - @NotNull, @NotEmpty, @Size, @Email constraints
      - BindingResult usage
      - Custom validators

    EXAMPLE:
      ```java
      @PostMapping
      public ResponseEntity<?> createUser(@Valid @RequestBody UserRequest request) {
          // ...
      }
      ```

  EXPRESS:
    EXTRACT:
      - express-validator usage
      - Custom validation middleware
      - Joi schemas
      - Manual validation patterns

    EXAMPLE:
      ```typescript
      router.post('/users',
          body('email').isEmail(),
          body('name').notEmpty(),
          (req, res) => {
              const errors = validationResult(req);
              if (!errors.isEmpty()) {
                  return res.status(400).json({ errors: errors.array() });
              }
              // ...
          }
      );
      ```

  FASTAPI:
    EXTRACT:
      - Pydantic model validation
      - Field validators
      - Custom validators
      - Dependency validation

    EXAMPLE:
      ```python
      class UserCreate(BaseModel):
          email: EmailStr
          name: str = Field(..., min_length=1, max_length=100)
      ```
</validation_patterns>

<error_handling_patterns>
  SPRING_BOOT:
    EXTRACT:
      - @ExceptionHandler methods
      - @ControllerAdvice classes
      - Custom exception classes
      - ErrorResponse DTOs
      - HTTP status code mapping

    EXAMPLE:
      ```java
      @ExceptionHandler(UserNotFoundException.class)
      public ResponseEntity<ErrorResponse> handleNotFound(UserNotFoundException ex) {
          ErrorResponse error = new ErrorResponse(
              HttpStatus.NOT_FOUND.value(),
              ex.getMessage()
          );
          return new ResponseEntity<>(error, HttpStatus.NOT_FOUND);
      }
      ```

  EXPRESS:
    EXTRACT:
      - Error handling middleware
      - Try/catch patterns
      - Error response formatting
      - Custom error classes

    EXAMPLE:
      ```typescript
      app.use((err, req, res, next) => {
          res.status(err.status || 500).json({
              error: {
                  message: err.message,
                  status: err.status
              }
          });
      });
      ```

  FASTAPI:
    EXTRACT:
      - HTTPException usage
      - Exception handlers
      - Custom exception classes
      - Error response models

    EXAMPLE:
      ```python
      @app.exception_handler(UserNotFound)
      async def user_not_found_handler(request, exc):
          return JSONResponse(
              status_code=404,
              content={"message": "User not found"}
          )
      ```
</error_handling_patterns>

<data_access_patterns>
  SPRING_BOOT:
    EXTRACT:
      - JpaRepository methods
      - @Query annotations
      - Specification pattern
      - Pagination (Pageable)
      - Projections

    EXAMPLE:
      ```java
      public interface UserRepository extends JpaRepository<User, Long> {
          Optional<User> findByEmail(String email);
          Page<User> findByActiveTrue(Pageable pageable);
      }
      ```

  EXPRESS:
    EXTRACT:
      - ORM usage (Sequelize, TypeORM, Prisma)
      - Query patterns
      - Relationship handling
      - Transaction patterns

    EXAMPLE:
      ```typescript
      const user = await User.findOne({
          where: { email },
          include: [{ model: Profile }]
      });
      ```

  DJANGO:
    EXTRACT:
      - QuerySet methods
      - Filter patterns
      - Q objects
      - Prefetch/select_related

    EXAMPLE:
      ```python
      users = User.objects.filter(
          is_active=True
      ).select_related('profile').all()
      ```
</data_access_patterns>

<transaction_patterns>
  SPRING_BOOT:
    EXTRACT:
      - @Transactional usage
      - Transaction propagation
      - Rollback rules
      - Transaction management

    EXAMPLE:
      ```java
      @Transactional
      public void updateUser(Long id, UserUpdateRequest request) {
          // ...
      }
      ```

  EXPRESS:
    EXTRACT:
      - Database transaction patterns
      - Commit/rollback handling
      - Transaction scopes

    EXAMPLE:
      ```typescript
      const transaction = await sequelize.transaction();
      try {
          await User.update({ ... }, { transaction });
          await transaction.commit();
      } catch (error) {
          await transaction.rollback();
          throw error;
      }
      ```
</transaction_patterns>

</step>

<step number="4" name="pattern_normalization">

### Step 4: Normalize and Aggregate Patterns

Use the extract-patterns utility to normalize discovered patterns.

<normalization>
  LOAD: @specwright/workflows/skill/utils/extract-patterns.md

  FOR each pattern_category:
    NORMALIZE: Code snippets
    CALCULATE: Frequency
    RANK: By usage
    DEDUPLICATE: Similar patterns
    SELECT: Best examples

  OUTPUT: Structured pattern data
</normalization>

</step>

<step number="5" name="pattern_summary">

### Step 5: Generate Pattern Summary

Create comprehensive summary of discovered API patterns.

<summary_structure>
  {
    framework: "spring-boot",
    discovery_date: "2025-12-31",
    files_analyzed: 45,

    patterns_by_category: {
      routing: {
        total_patterns: 5,
        dominant_pattern: {
          description: "RESTful endpoints with @GetMapping",
          occurrences: 23,
          usage_percentage: 51.1,
          examples: [...]
        },
        other_patterns: [...]
      },

      validation: {
        total_patterns: 3,
        dominant_pattern: {
          description: "Bean Validation with @Valid",
          occurrences: 18,
          usage_percentage: 40.0,
          examples: [...]
        },
        other_patterns: [...]
      },

      error_handling: {
        total_patterns: 4,
        dominant_pattern: {
          description: "@ExceptionHandler in @ControllerAdvice",
          occurrences: 1,
          usage_percentage: 2.2,
          note: "Centralized error handling",
          examples: [...]
        },
        other_patterns: [...]
      },

      data_access: { ... },
      response_formatting: { ... },
      authentication: { ... },
      pagination: { ... },
      transaction_management: { ... }
    },

    naming_conventions: {
      controllers: "Suffix: Controller",
      services: "Suffix: Service",
      repositories: "Suffix: Repository",
      dtos: "Suffix: Request/Response/DTO"
    },

    architectural_patterns: [
      "Layered architecture (Controller -> Service -> Repository)",
      "DTO pattern for request/response",
      "Centralized exception handling",
      "Repository pattern with Spring Data JPA"
    ],

    recommendations: [
      "Consider standardizing error response format",
      "Implement consistent pagination across endpoints",
      "Add API versioning strategy"
    ]
  }
</summary_structure>

</step>

</discovery_flow>

## Output Format

<output>
  {
    discovery_summary: {
      framework: "spring-boot",
      version: "3.2.0",
      files_analyzed: 45,
      patterns_found: 32,
      categories_covered: 8,
      confidence: "high"
    },

    patterns: {
      routing: [...],
      validation: [...],
      error_handling: [...],
      data_access: [...],
      response_formatting: [...],
      authentication: [...],
      pagination: [...],
      transaction_management: [...]
    },

    naming_conventions: {...},
    architectural_patterns: [...],
    recommendations: [...]
  }
</output>

## Error Handling

<error_protocols>
  <explore_agent_failure>
    RETRY: With adjusted search patterns
    FALLBACK: Manual file globbing
    WARN: User about limited pattern discovery
  </explore_agent_failure>

  <insufficient_files>
    IF files_found < 5:
      WARN: "Limited API patterns found in codebase"
      SUGGEST: "Consider using --best-practices mode"
      PROCEED: With available patterns
  </insufficient_files>

  <file_read_error>
    LOG: Failed file paths
    SKIP: Unreadable files
    CONTINUE: With accessible files
  </file_read_error>
</error_protocols>

## Performance Considerations

- Limit Explore agent to top 15 files per category
- Process categories in parallel when possible
- Cache file reads across pattern categories
- Early termination if sufficient patterns found (30+ patterns)

## Related Utilities

- `@specwright/workflows/skill/utils/extract-patterns.md`
- `@specwright/workflows/skill/utils/detect-backend.md`
- `@specwright/workflows/skill/validation/compare-patterns.md`
