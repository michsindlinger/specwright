# NestJS Service Patterns

> Part of: NestJS Backend Skill
> Use when: Implementing business logic

## Basic Service

```typescript
// src/users/users.service.ts
import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from './entities/user.entity';
import { CreateUserDto } from './dto/create-user.dto';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private usersRepository: Repository<User>,
  ) {}

  async findAll(): Promise<User[]> {
    return this.usersRepository.find();
  }

  async findOne(id: string): Promise<User> {
    const user = await this.usersRepository.findOne({ where: { id } });
    if (!user) {
      throw new NotFoundException(`User #${id} not found`);
    }
    return user;
  }

  async create(createUserDto: CreateUserDto): Promise<User> {
    const user = this.usersRepository.create(createUserDto);
    return this.usersRepository.save(user);
  }

  async update(id: string, updateUserDto: UpdateUserDto): Promise<User> {
    const user = await this.findOne(id);
    Object.assign(user, updateUserDto);
    return this.usersRepository.save(user);
  }

  async remove(id: string): Promise<void> {
    const user = await this.findOne(id);
    await this.usersRepository.remove(user);
  }
}
```

## Result Pattern

```typescript
// src/common/result.ts
export class Result<T> {
  private constructor(
    public readonly isSuccess: boolean,
    public readonly data?: T,
    public readonly error?: string,
  ) {}

  static success<T>(data: T): Result<T> {
    return new Result(true, data);
  }

  static failure<T>(error: string): Result<T> {
    return new Result(false, undefined, error);
  }
}

// Usage
@Injectable()
export class UsersService {
  async register(dto: CreateUserDto): Promise<Result<User>> {
    const existingUser = await this.usersRepository.findOne({
      where: { email: dto.email },
    });

    if (existingUser) {
      return Result.failure('Email already registered');
    }

    const user = await this.usersRepository.save(
      this.usersRepository.create(dto),
    );

    return Result.success(user);
  }
}
```

## Transaction Handling

```typescript
@Injectable()
export class OrdersService {
  constructor(
    private dataSource: DataSource,
    @InjectRepository(Order)
    private ordersRepository: Repository<Order>,
  ) {}

  async createOrder(dto: CreateOrderDto): Promise<Order> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const order = queryRunner.manager.create(Order, dto);
      await queryRunner.manager.save(order);

      // Update inventory
      await queryRunner.manager.decrement(
        Product,
        { id: dto.productId },
        'stock',
        dto.quantity,
      );

      await queryRunner.commitTransaction();
      return order;
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }
}
```

## Dependency Injection

```typescript
// Abstract service for testing
export abstract class IEmailService {
  abstract send(to: string, subject: string, body: string): Promise<void>;
}

@Injectable()
export class EmailService implements IEmailService {
  async send(to: string, subject: string, body: string): Promise<void> {
    // Implementation
  }
}

// Module configuration
@Module({
  providers: [
    {
      provide: IEmailService,
      useClass: EmailService,
    },
    UsersService,
  ],
})
export class UsersModule {}

// Injection
@Injectable()
export class UsersService {
  constructor(private emailService: IEmailService) {}
}
```

## Best Practices

1. **Use dependency injection**
2. **Handle errors with exceptions**
3. **Use transactions for multiple operations**
4. **Keep services focused**
5. **Abstract external services for testing**
