# NestJS Database Patterns

> Part of: NestJS Backend Skill
> Use when: Working with TypeORM or Prisma

## TypeORM Entities

```typescript
// src/users/entities/user.entity.ts
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
  ManyToOne,
} from 'typeorm';
import { Post } from '../../posts/entities/post.entity';

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  email: string;

  @Column()
  name: string;

  @Column({ select: false })
  password: string;

  @Column({ default: true })
  isActive: boolean;

  @Column({ type: 'enum', enum: ['user', 'admin'], default: 'user' })
  role: string;

  @OneToMany(() => Post, (post) => post.author)
  posts: Post[];

  @ManyToOne(() => Organization, (org) => org.users, { nullable: true })
  organization: Organization;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
```

## Repository Pattern

```typescript
// src/users/users.repository.ts
import { Injectable } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { User } from './entities/user.entity';

@Injectable()
export class UsersRepository extends Repository<User> {
  constructor(private dataSource: DataSource) {
    super(User, dataSource.createEntityManager());
  }

  async findByEmail(email: string): Promise<User | null> {
    return this.findOne({ where: { email } });
  }

  async findActiveUsers(): Promise<User[]> {
    return this.createQueryBuilder('user')
      .where('user.isActive = :isActive', { isActive: true })
      .orderBy('user.createdAt', 'DESC')
      .getMany();
  }

  async findWithPosts(id: string): Promise<User | null> {
    return this.findOne({
      where: { id },
      relations: ['posts'],
    });
  }
}
```

## Prisma (Alternative)

```typescript
// prisma/schema.prisma
model User {
  id        String   @id @default(uuid())
  email     String   @unique
  name      String
  password  String
  isActive  Boolean  @default(true)
  role      Role     @default(USER)
  posts     Post[]
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}

enum Role {
  USER
  ADMIN
}

// src/users/users.service.ts
@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  async findAll() {
    return this.prisma.user.findMany({
      where: { isActive: true },
      include: { posts: true },
    });
  }

  async create(data: CreateUserDto) {
    return this.prisma.user.create({ data });
  }
}
```

## Migrations

```bash
# TypeORM
npm run typeorm migration:generate -- -n CreateUsersTable
npm run typeorm migration:run

# Prisma
npx prisma migrate dev --name create_users
npx prisma generate
```

## Best Practices

1. **Use entities for TypeORM**, models for Prisma
2. **Create migrations** for schema changes
3. **Use repositories** for complex queries
4. **Eager load** relations when needed
5. **Index frequently queried columns**
