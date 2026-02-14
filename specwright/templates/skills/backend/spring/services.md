# Spring Service Patterns

> Part of: Spring Backend Skill
> Use when: Implementing business logic

## Basic Service

```java
@Service
@RequiredArgsConstructor
public class UserService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;

    @Transactional(readOnly = true)
    public List<User> findAll() {
        return userRepository.findAll();
    }

    @Transactional(readOnly = true)
    public User findById(Long id) {
        return userRepository.findById(id)
            .orElseThrow(() -> new ResourceNotFoundException("User not found: " + id));
    }

    @Transactional
    public User create(CreateUserRequest request) {
        if (userRepository.existsByEmail(request.getEmail())) {
            throw new BusinessException("Email already registered");
        }

        User user = User.builder()
            .email(request.getEmail())
            .name(request.getName())
            .password(passwordEncoder.encode(request.getPassword()))
            .build();

        return userRepository.save(user);
    }

    @Transactional
    public User update(Long id, UpdateUserRequest request) {
        User user = findById(id);
        user.setName(request.getName());
        return userRepository.save(user);
    }

    @Transactional
    public void delete(Long id) {
        User user = findById(id);
        userRepository.delete(user);
    }
}
```

## Result Pattern

```java
public class Result<T> {
    private final boolean success;
    private final T data;
    private final String error;

    private Result(boolean success, T data, String error) {
        this.success = success;
        this.data = data;
        this.error = error;
    }

    public static <T> Result<T> success(T data) {
        return new Result<>(true, data, null);
    }

    public static <T> Result<T> failure(String error) {
        return new Result<>(false, null, error);
    }

    public boolean isSuccess() { return success; }
    public T getData() { return data; }
    public String getError() { return error; }
}
```

## Event Publishing

```java
@Service
@RequiredArgsConstructor
public class OrderService {

    private final OrderRepository orderRepository;
    private final ApplicationEventPublisher eventPublisher;

    @Transactional
    public Order createOrder(CreateOrderRequest request) {
        Order order = orderRepository.save(Order.from(request));

        eventPublisher.publishEvent(new OrderCreatedEvent(order));

        return order;
    }
}

@Component
@RequiredArgsConstructor
public class OrderEventListener {

    private final EmailService emailService;

    @EventListener
    @Async
    public void handleOrderCreated(OrderCreatedEvent event) {
        emailService.sendOrderConfirmation(event.getOrder());
    }
}
```

## Best Practices

1. **Use constructor injection** (Lombok @RequiredArgsConstructor)
2. **Mark read operations** with @Transactional(readOnly = true)
3. **Throw specific exceptions** for different error cases
4. **Keep services focused** on one domain
5. **Use events** for cross-cutting concerns
