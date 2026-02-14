---
name: "Java Spring Boot Backend"
inherits: base
description: "Enterprise Java backend development with Spring Boot framework"
version: "2.0.0"
tech_stack:
  language: "Java 17+"
  framework: "Spring Boot 3.x"
  build_tool: "Maven/Gradle"
  database: "PostgreSQL"
  orm: "Spring Data JPA / Hibernate"
  testing: "JUnit 5, Mockito, TestContainers"
  api: "REST (Spring Web)"
skills:
  - java-core-patterns
  - spring-boot-conventions
  - jpa-best-practices
  - rest-api-design
  - spring-security-patterns
  - maven-gradle-standards
---

# Java Spring Boot Backend Profile

This profile provides standards and best practices for developing enterprise Java applications using the Spring Boot framework.

## Tech Stack

- **Language**: Java 17+ (with modern features: records, sealed classes, pattern matching)
- **Framework**: Spring Boot 3.x
- **Build Tool**: Maven or Gradle
- **Database**: PostgreSQL (primary), with support for other RDBMS
- **ORM**: Spring Data JPA with Hibernate
- **Testing**: JUnit 5, Mockito, Spring Boot Test, TestContainers
- **API Style**: RESTful with Spring Web

## Coding Standards

### Naming Conventions

- **Classes**: PascalCase (e.g., `UserService`, `OrderController`)
- **Methods**: camelCase (e.g., `findUserById`, `processOrder`)
- **Constants**: UPPER_SNAKE_CASE (e.g., `MAX_RETRY_COUNT`, `DEFAULT_TIMEOUT`)
- **Package names**: lowercase (e.g., `com.company.project.service`)

### Project Structure

```
src/
├── main/
│   ├── java/
│   │   └── com/company/project/
│   │       ├── config/          # Configuration classes
│   │       ├── controller/      # REST controllers
│   │       ├── service/         # Business logic
│   │       ├── repository/      # Data access layer
│   │       ├── model/           # Entity classes
│   │       ├── dto/             # Data Transfer Objects
│   │       ├── exception/       # Custom exceptions
│   │       └── util/            # Utility classes
│   └── resources/
│       ├── application.yml      # Configuration
│       ├── application-dev.yml  # Dev config
│       └── application-prod.yml # Production config
└── test/
    └── java/
        └── com/company/project/ # Mirror main structure
```

## Spring Boot Conventions

### Dependency Injection

**Prefer constructor injection over field injection:**

```java
// Good ✓
@Service
public class UserService {
    private final UserRepository userRepository;
    private final EmailService emailService;

    public UserService(UserRepository userRepository, EmailService emailService) {
        this.userRepository = userRepository;
        this.emailService = emailService;
    }
}

// Avoid ✗
@Service
public class UserService {
    @Autowired
    private UserRepository userRepository;
}
```

### Controller Design

```java
@RestController
@RequestMapping("/api/users")
@RequiredArgsConstructor
public class UserController {
    private final UserService userService;

    @GetMapping("/{id}")
    public ResponseEntity<UserDto> getUser(@PathVariable Long id) {
        return userService.findById(id)
            .map(ResponseEntity::ok)
            .orElse(ResponseEntity.notFound().build());
    }

    @PostMapping
    public ResponseEntity<UserDto> createUser(@Valid @RequestBody CreateUserRequest request) {
        UserDto created = userService.createUser(request);
        return ResponseEntity.status(HttpStatus.CREATED).body(created);
    }
}
```

### Service Layer Patterns

```java
@Service
@Transactional(readOnly = true)
public class UserService {
    private final UserRepository userRepository;

    public UserService(UserRepository userRepository) {
        this.userRepository = userRepository;
    }

    @Transactional
    public UserDto createUser(CreateUserRequest request) {
        // Business logic here
        User user = new User(request.getName(), request.getEmail());
        User saved = userRepository.save(user);
        return UserDto.from(saved);
    }
}
```

## JPA Best Practices

### Entity Design

```java
@Entity
@Table(name = "users")
@Getter
@Setter
@NoArgsConstructor
public class User {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, length = 100)
    private String name;

    @Column(unique = true, nullable = false)
    private String email;

    @CreatedDate
    @Column(nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @LastModifiedDate
    @Column(nullable = false)
    private LocalDateTime updatedAt;
}
```

### Repository Patterns

```java
public interface UserRepository extends JpaRepository<User, Long> {
    Optional<User> findByEmail(String email);

    @Query("SELECT u FROM User u WHERE u.createdAt > :since")
    List<User> findRecentUsers(@Param("since") LocalDateTime since);
}
```

## REST API Standards

### HTTP Methods

- **GET**: Retrieve resources (idempotent)
- **POST**: Create new resources
- **PUT**: Update entire resource (idempotent)
- **PATCH**: Partial update
- **DELETE**: Remove resource (idempotent)

### Response Codes

- **200 OK**: Successful GET, PUT, PATCH
- **201 Created**: Successful POST
- **204 No Content**: Successful DELETE
- **400 Bad Request**: Invalid request
- **401 Unauthorized**: Authentication required
- **403 Forbidden**: Authenticated but no permission
- **404 Not Found**: Resource doesn't exist
- **500 Internal Server Error**: Server-side error

### Error Handling

```java
@RestControllerAdvice
public class GlobalExceptionHandler {

    @ExceptionHandler(ResourceNotFoundException.class)
    public ResponseEntity<ErrorResponse> handleNotFound(ResourceNotFoundException ex) {
        ErrorResponse error = new ErrorResponse(
            HttpStatus.NOT_FOUND.value(),
            ex.getMessage(),
            LocalDateTime.now()
        );
        return ResponseEntity.status(HttpStatus.NOT_FOUND).body(error);
    }

    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<ErrorResponse> handleValidationErrors(
            MethodArgumentNotValidException ex) {
        Map<String, String> errors = ex.getBindingResult()
            .getFieldErrors()
            .stream()
            .collect(Collectors.toMap(
                FieldError::getField,
                FieldError::getDefaultMessage
            ));
        // Return structured error response
    }
}
```

## Testing Standards

### Unit Tests

```java
@ExtendWith(MockitoExtension.class)
class UserServiceTest {
    @Mock
    private UserRepository userRepository;

    @InjectMocks
    private UserService userService;

    @Test
    void shouldCreateUserSuccessfully() {
        // Given
        CreateUserRequest request = new CreateUserRequest("John", "john@example.com");
        User savedUser = new User(1L, "John", "john@example.com");
        when(userRepository.save(any(User.class))).thenReturn(savedUser);

        // When
        UserDto result = userService.createUser(request);

        // Then
        assertThat(result.getName()).isEqualTo("John");
        verify(userRepository).save(any(User.class));
    }
}
```

### Integration Tests

```java
@SpringBootTest
@AutoConfigureMockMvc
class UserControllerIntegrationTest {
    @Autowired
    private MockMvc mockMvc;

    @Test
    void shouldCreateUser() throws Exception {
        String requestBody = """
            {
                "name": "John Doe",
                "email": "john@example.com"
            }
            """;

        mockMvc.perform(post("/api/users")
                .contentType(MediaType.APPLICATION_JSON)
                .content(requestBody))
            .andExpect(status().isCreated())
            .andExpect(jsonPath("$.name").value("John Doe"));
    }
}
```

## Configuration Management

### Application Properties

Use YAML for configuration (clearer hierarchy):

```yaml
spring:
  application:
    name: my-service

  datasource:
    url: jdbc:postgresql://localhost:5432/mydb
    username: ${DB_USERNAME}
    password: ${DB_PASSWORD}

  jpa:
    hibernate:
      ddl-auto: validate
    show-sql: false
    properties:
      hibernate:
        format_sql: true

logging:
  level:
    com.company.project: DEBUG
    org.hibernate.SQL: DEBUG
```

### Environment-Specific Configuration

- `application.yml` - Common configuration
- `application-dev.yml` - Development overrides
- `application-test.yml` - Test environment
- `application-prod.yml` - Production configuration

## Security Patterns

### Authentication & Authorization

```java
@Configuration
@EnableWebSecurity
public class SecurityConfig {

    @Bean
    public SecurityFilterChain filterChain(HttpSecurity http) throws Exception {
        http
            .csrf(csrf -> csrf.disable()) // Only for stateless APIs
            .authorizeHttpRequests(auth -> auth
                .requestMatchers("/api/public/**").permitAll()
                .requestMatchers("/api/admin/**").hasRole("ADMIN")
                .anyRequest().authenticated()
            )
            .oauth2ResourceServer(oauth2 -> oauth2.jwt());
        return http.build();
    }
}
```

## Build Configuration

### Maven (pom.xml)

```xml
<properties>
    <java.version>17</java.version>
    <spring-boot.version>3.2.0</spring-boot.version>
</properties>

<dependencies>
    <dependency>
        <groupId>org.springframework.boot</groupId>
        <artifactId>spring-boot-starter-web</artifactId>
    </dependency>
    <dependency>
        <groupId>org.springframework.boot</groupId>
        <artifactId>spring-boot-starter-data-jpa</artifactId>
    </dependency>
    <!-- Add other dependencies -->
</dependencies>
```

### Gradle (build.gradle)

```groovy
plugins {
    id 'java'
    id 'org.springframework.boot' version '3.2.0'
    id 'io.spring.dependency-management' version '1.1.0'
}

java {
    sourceCompatibility = '17'
}

dependencies {
    implementation 'org.springframework.boot:spring-boot-starter-web'
    implementation 'org.springframework.boot:spring-boot-starter-data-jpa'
    testImplementation 'org.springframework.boot:spring-boot-starter-test'
}
```

## Active Skills

When this profile is active, the following Claude Code Skills are automatically available:

- **java-core-patterns**: Core Java design patterns and best practices
- **spring-boot-conventions**: Spring Boot-specific conventions and patterns
- **jpa-best-practices**: JPA/Hibernate optimization and best practices
- **rest-api-design**: RESTful API design principles
- **spring-security-patterns**: Security configuration and patterns
- **maven-gradle-standards**: Build tool configuration standards
