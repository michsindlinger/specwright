# Spring Testing Patterns

> Part of: Spring Backend Skill
> Use when: Writing tests with JUnit and Mockito

## Service Testing

```java
@ExtendWith(MockitoExtension.class)
class UserServiceTest {

    @Mock
    private UserRepository userRepository;

    @Mock
    private PasswordEncoder passwordEncoder;

    @InjectMocks
    private UserService userService;

    @Test
    void findAll_shouldReturnAllUsers() {
        // Given
        List<User> users = List.of(
            User.builder().id(1L).name("User 1").build(),
            User.builder().id(2L).name("User 2").build()
        );
        when(userRepository.findAll()).thenReturn(users);

        // When
        List<User> result = userService.findAll();

        // Then
        assertThat(result).hasSize(2);
        verify(userRepository).findAll();
    }

    @Test
    void findById_whenUserExists_shouldReturnUser() {
        // Given
        User user = User.builder().id(1L).name("Test").build();
        when(userRepository.findById(1L)).thenReturn(Optional.of(user));

        // When
        User result = userService.findById(1L);

        // Then
        assertThat(result.getName()).isEqualTo("Test");
    }

    @Test
    void findById_whenUserNotExists_shouldThrowException() {
        // Given
        when(userRepository.findById(1L)).thenReturn(Optional.empty());

        // When/Then
        assertThatThrownBy(() -> userService.findById(1L))
            .isInstanceOf(ResourceNotFoundException.class)
            .hasMessageContaining("User not found");
    }

    @Test
    void create_shouldSaveAndReturnUser() {
        // Given
        CreateUserRequest request = CreateUserRequest.builder()
            .email("test@example.com")
            .name("Test")
            .password("password")
            .build();

        when(userRepository.existsByEmail(anyString())).thenReturn(false);
        when(passwordEncoder.encode(anyString())).thenReturn("encoded");
        when(userRepository.save(any(User.class))).thenAnswer(i -> {
            User u = i.getArgument(0);
            u.setId(1L);
            return u;
        });

        // When
        User result = userService.create(request);

        // Then
        assertThat(result.getId()).isEqualTo(1L);
        assertThat(result.getEmail()).isEqualTo("test@example.com");
        verify(userRepository).save(any(User.class));
    }
}
```

## Controller Testing

```java
@WebMvcTest(UserController.class)
class UserControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockBean
    private UserService userService;

    @MockBean
    private UserMapper userMapper;

    @Autowired
    private ObjectMapper objectMapper;

    @Test
    void findAll_shouldReturnUsers() throws Exception {
        // Given
        List<UserResponse> responses = List.of(
            UserResponse.builder().id(1L).name("User 1").build()
        );
        when(userMapper.toResponseList(anyList())).thenReturn(responses);

        // When/Then
        mockMvc.perform(get("/api/v1/users"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$", hasSize(1)))
            .andExpect(jsonPath("$[0].name").value("User 1"));
    }

    @Test
    void create_withValidRequest_shouldReturnCreated() throws Exception {
        // Given
        CreateUserRequest request = CreateUserRequest.builder()
            .email("test@example.com")
            .name("Test")
            .password("password123")
            .build();

        UserResponse response = UserResponse.builder()
            .id(1L)
            .email("test@example.com")
            .name("Test")
            .build();

        when(userMapper.toResponse(any())).thenReturn(response);

        // When/Then
        mockMvc.perform(post("/api/v1/users")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(request)))
            .andExpect(status().isCreated())
            .andExpect(jsonPath("$.id").value(1))
            .andExpect(jsonPath("$.email").value("test@example.com"));
    }

    @Test
    void create_withInvalidRequest_shouldReturnBadRequest() throws Exception {
        // Given
        CreateUserRequest request = CreateUserRequest.builder()
            .email("invalid-email")
            .name("")
            .password("short")
            .build();

        // When/Then
        mockMvc.perform(post("/api/v1/users")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(request)))
            .andExpect(status().isBadRequest());
    }
}
```

## Integration Testing

```java
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
@Testcontainers
class UserIntegrationTest {

    @Container
    static PostgreSQLContainer<?> postgres = new PostgreSQLContainer<>("postgres:15");

    @DynamicPropertySource
    static void configureProperties(DynamicPropertyRegistry registry) {
        registry.add("spring.datasource.url", postgres::getJdbcUrl);
        registry.add("spring.datasource.username", postgres::getUsername);
        registry.add("spring.datasource.password", postgres::getPassword);
    }

    @Autowired
    private TestRestTemplate restTemplate;

    @Autowired
    private UserRepository userRepository;

    @BeforeEach
    void setUp() {
        userRepository.deleteAll();
    }

    @Test
    void createAndGetUser() {
        // Create
        CreateUserRequest request = CreateUserRequest.builder()
            .email("test@example.com")
            .name("Test")
            .password("password123")
            .build();

        ResponseEntity<UserResponse> createResponse = restTemplate.postForEntity(
            "/api/v1/users",
            request,
            UserResponse.class
        );

        assertThat(createResponse.getStatusCode()).isEqualTo(HttpStatus.CREATED);
        Long userId = createResponse.getBody().getId();

        // Get
        ResponseEntity<UserResponse> getResponse = restTemplate.getForEntity(
            "/api/v1/users/" + userId,
            UserResponse.class
        );

        assertThat(getResponse.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(getResponse.getBody().getEmail()).isEqualTo("test@example.com");
    }
}
```

## Best Practices

1. **Use MockitoExtension** for unit tests
2. **Use @WebMvcTest** for controller tests
3. **Use Testcontainers** for integration tests
4. **Follow Given-When-Then** pattern
5. **Test edge cases** and error conditions
