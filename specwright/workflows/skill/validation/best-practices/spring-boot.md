---
description: Spring Boot API development best practices for validation
version: 1.0
framework: spring-boot
category: api
---

# Spring Boot Best Practices

## Controller Layer

### REST Endpoint Definition
```java
@RestController
@RequestMapping("/api/v1/users")
public class UserController {

    @GetMapping("/{id}")
    public ResponseEntity<UserResponse> getUser(@PathVariable Long id) {
        // Implementation
    }

    @PostMapping
    public ResponseEntity<UserResponse> createUser(@Valid @RequestBody UserRequest request) {
        // Implementation
    }
}
```

**Key Points:**
- Use `@RestController` instead of `@Controller` + `@ResponseBody`
- Group endpoints with `@RequestMapping` on class level
- Use specific HTTP method annotations (`@GetMapping`, `@PostMapping`)
- Return `ResponseEntity<T>` for explicit HTTP status control
- Use `@PathVariable` for resource identifiers
- Use `@RequestBody` for request payloads
- Add `@Valid` for Bean Validation

### Request Validation
```java
public class UserRequest {
    @NotNull(message = "Name is required")
    @Size(min = 1, max = 100, message = "Name must be between 1 and 100 characters")
    private String name;

    @NotNull(message = "Email is required")
    @Email(message = "Email must be valid")
    private String email;

    @Min(value = 18, message = "Age must be at least 18")
    private Integer age;
}

@PostMapping
public ResponseEntity<UserResponse> createUser(@Valid @RequestBody UserRequest request) {
    User user = userService.create(request);
    return ResponseEntity.status(HttpStatus.CREATED).body(toResponse(user));
}
```

**Key Points:**
- Use Bean Validation annotations on DTOs
- Provide clear validation messages
- Use `@Valid` in controller methods
- Let Spring handle validation errors (or use @ControllerAdvice)

### Response Formatting
```java
@GetMapping("/{id}")
public ResponseEntity<UserResponse> getUser(@PathVariable Long id) {
    User user = userService.findById(id);
    return ResponseEntity.ok(toResponse(user));
}

private UserResponse toResponse(User user) {
    return new UserResponse(user.getId(), user.getName(), user.getEmail());
}
```

**Key Points:**
- Use separate Response DTOs (don't expose entities)
- Use `ResponseEntity.ok()`, `ResponseEntity.created()` etc.
- Include appropriate HTTP status codes
- Convert entities to DTOs before returning

## Service Layer

### Service Structure
```java
@Service
@Transactional(readOnly = true)
public class UserService {
    private final UserRepository userRepository;

    public UserService(UserRepository userRepository) {
        this.userRepository = userRepository;
    }

    public User findById(Long id) {
        return userRepository.findById(id)
            .orElseThrow(() -> new UserNotFoundException(id));
    }

    @Transactional
    public User create(UserRequest request) {
        User user = new User(request.getName(), request.getEmail());
        return userRepository.save(user);
    }

    @Transactional
    public User update(Long id, UserRequest request) {
        User user = findById(id);
        user.setName(request.getName());
        user.setEmail(request.getEmail());
        return userRepository.save(user);
    }
}
```

**Key Points:**
- Use `@Service` annotation
- Constructor injection (no `@Autowired` on fields)
- Use `@Transactional(readOnly = true)` as default
- Override with `@Transactional` for write operations
- Throw domain exceptions (e.g., `UserNotFoundException`)
- Keep business logic in service layer

### Transaction Management
```java
@Transactional
public User updateUserAndNotify(Long id, UserRequest request) {
    User user = findById(id);
    user.setName(request.getName());
    user = userRepository.save(user);

    // Both operations in same transaction
    notificationService.sendUpdateNotification(user);

    return user;
}
```

**Key Points:**
- Use `@Transactional` for write operations
- Default propagation (REQUIRED) for most cases
- Transactions auto-rollback on unchecked exceptions
- Keep transactions short and focused

## Repository Layer

### Repository Definition
```java
public interface UserRepository extends JpaRepository<User, Long> {

    Optional<User> findByEmail(String email);

    List<User> findByActiveTrue();

    Page<User> findByNameContaining(String name, Pageable pageable);

    @Query("SELECT u FROM User u WHERE u.createdAt >= :startDate")
    List<User> findRecentUsers(@Param("startDate") LocalDateTime startDate);
}
```

**Key Points:**
- Extend `JpaRepository<Entity, ID>`
- Use query methods (Spring Data will implement)
- Use `Pageable` for pagination
- Use `@Query` for complex queries
- Return `Optional<T>` for single results that might not exist

### Pagination
```java
@GetMapping
public ResponseEntity<Page<UserResponse>> getUsers(
    @PageableDefault(size = 20, sort = "name") Pageable pageable
) {
    Page<User> users = userService.findAll(pageable);
    Page<UserResponse> response = users.map(this::toResponse);
    return ResponseEntity.ok(response);
}

// Service layer
public Page<User> findAll(Pageable pageable) {
    return userRepository.findAll(pageable);
}
```

**Key Points:**
- Use `Pageable` parameter in controllers
- Use `@PageableDefault` for sensible defaults
- Return `Page<T>` from repositories
- Transform `Page<Entity>` to `Page<DTO>` with `map()`

## Error Handling

### Centralized Exception Handling
```java
@ControllerAdvice
public class GlobalExceptionHandler {

    @ExceptionHandler(UserNotFoundException.class)
    public ResponseEntity<ErrorResponse> handleUserNotFound(UserNotFoundException ex) {
        ErrorResponse error = new ErrorResponse(
            HttpStatus.NOT_FOUND.value(),
            ex.getMessage(),
            LocalDateTime.now()
        );
        return new ResponseEntity<>(error, HttpStatus.NOT_FOUND);
    }

    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<ValidationErrorResponse> handleValidationErrors(
        MethodArgumentNotValidException ex
    ) {
        List<FieldError> errors = ex.getBindingResult()
            .getFieldErrors()
            .stream()
            .map(error -> new FieldError(error.getField(), error.getDefaultMessage()))
            .collect(Collectors.toList());

        ValidationErrorResponse response = new ValidationErrorResponse(
            HttpStatus.BAD_REQUEST.value(),
            "Validation failed",
            errors,
            LocalDateTime.now()
        );
        return new ResponseEntity<>(response, HttpStatus.BAD_REQUEST);
    }

    @ExceptionHandler(Exception.class)
    public ResponseEntity<ErrorResponse> handleGenericError(Exception ex) {
        ErrorResponse error = new ErrorResponse(
            HttpStatus.INTERNAL_SERVER_ERROR.value(),
            "An unexpected error occurred",
            LocalDateTime.now()
        );
        return new ResponseEntity<>(error, HttpStatus.INTERNAL_SERVER_ERROR);
    }
}
```

**Key Points:**
- Use `@ControllerAdvice` for global exception handling
- Handle specific exceptions with `@ExceptionHandler`
- Provide consistent error response format
- Include timestamp and meaningful messages
- Don't expose stack traces in production

### Custom Exceptions
```java
public class UserNotFoundException extends RuntimeException {
    public UserNotFoundException(Long id) {
        super("User not found with id: " + id);
    }
}

public class EmailAlreadyExistsException extends RuntimeException {
    public EmailAlreadyExistsException(String email) {
        super("User with email " + email + " already exists");
    }
}
```

**Key Points:**
- Extend `RuntimeException` for unchecked exceptions
- Provide meaningful error messages
- Include relevant context (id, email, etc.)
- Use domain-specific exception names

## Security

### Basic Security
```java
@Configuration
@EnableWebSecurity
public class SecurityConfig {

    @Bean
    public SecurityFilterChain filterChain(HttpSecurity http) throws Exception {
        http
            .authorizeHttpRequests(auth -> auth
                .requestMatchers("/api/public/**").permitAll()
                .anyRequest().authenticated()
            )
            .oauth2ResourceServer(OAuth2ResourceServerConfigurer::jwt);

        return http.build();
    }
}
```

**Key Points:**
- Enable Spring Security
- Configure endpoint authorization
- Use JWT or OAuth2 for authentication
- Protect sensitive endpoints

## Configuration

### Application Properties
```yaml
# application.yml
spring:
  jpa:
    hibernate:
      ddl-auto: validate
    show-sql: false
  datasource:
    url: ${DATABASE_URL}
    username: ${DATABASE_USERNAME}
    password: ${DATABASE_PASSWORD}

server:
  port: 8080
  error:
    include-message: always
    include-stacktrace: never
```

**Key Points:**
- Use environment variables for sensitive data
- Never hardcode credentials
- Use `validate` for production (not `update` or `create-drop`)
- Don't show SQL in production
- Don't expose stack traces

## Anti-Patterns to Avoid

### ❌ Direct Entity Exposure
```java
// DON'T DO THIS
@GetMapping("/{id}")
public User getUser(@PathVariable Long id) {
    return userRepository.findById(id).orElseThrow();
}
```

**Why:** Exposes internal entity structure, includes sensitive fields, couples API to database schema

### ❌ String Concatenation in Queries
```java
// DON'T DO THIS
String sql = "SELECT * FROM users WHERE email = '" + email + "'";
```

**Why:** SQL injection vulnerability

### ❌ @Autowired on Fields
```java
// DON'T DO THIS
@Service
public class UserService {
    @Autowired
    private UserRepository userRepository;
}
```

**Why:** Makes testing harder, hides dependencies, promotes tight coupling

### ❌ Business Logic in Controllers
```java
// DON'T DO THIS
@PostMapping
public ResponseEntity<?> createUser(@RequestBody UserRequest request) {
    User user = new User();
    user.setName(request.getName());
    user.setEmail(request.getEmail());
    // More business logic...
    return ResponseEntity.ok(user);
}
```

**Why:** Violates separation of concerns, makes testing difficult, not reusable

## Quick Reference

**Controller Layer:**
- ✅ `@RestController` + `@RequestMapping`
- ✅ `ResponseEntity<T>` for responses
- ✅ `@Valid` for validation
- ✅ Separate Request/Response DTOs

**Service Layer:**
- ✅ `@Service` + constructor injection
- ✅ `@Transactional` for write operations
- ✅ Business logic here, not in controllers
- ✅ Throw domain exceptions

**Repository Layer:**
- ✅ Extend `JpaRepository<Entity, ID>`
- ✅ Query methods over `@Query` when possible
- ✅ `Pageable` for pagination
- ✅ `Optional<T>` for nullable returns

**Error Handling:**
- ✅ `@ControllerAdvice` for global handling
- ✅ Consistent error response format
- ✅ Meaningful error messages
- ❌ Never expose stack traces

**Security:**
- ✅ Enable Spring Security
- ✅ Use environment variables for secrets
- ✅ Validate all inputs
- ❌ Never hardcode credentials
