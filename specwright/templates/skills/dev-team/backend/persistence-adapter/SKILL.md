# [SKILL_NAME] - Database Persistence Adapter

> **Role:** Database Operations Specialist
> **Domain:** Data Access & ORM Management
> **Created:** [CURRENT_DATE]

## Quick Reference

<!-- This section is extracted by Orchestrator for task prompts (~50-100 lines) -->

**When to use:** Database Queries, Models, Migrations, Repositories, ORM

**Key Patterns:**

1. **Repository Pattern**
   - One repository per aggregate root
   - Abstract DB access from business logic
   - Return domain objects, not raw records
   - Encapsulate complex queries

2. **Query Optimization**
   - Always use eager loading (includes/preload)
   - Never query in loops (N+1 problem)
   - Add indexes for frequent WHERE/ORDER columns
   - Use select() to fetch only needed columns

3. **Migration Best Practices**
   - One migration per logical change
   - Always provide rollback (down method)
   - Never modify data in migrations
   - Add indexes in same migration as columns

4. **Transaction Rules**
   - Wrap multi-table operations in transaction
   - Use pessimistic locking for race conditions
   - Keep transactions short
   - Handle rollback gracefully

**Quick Example (Rails):**
```ruby
class UserRepository
  def find_by_email(email)
    User.find_by(email: email)
  end

  def find_with_profile(id)
    User.includes(:profile).find(id)
  end

  def create(attrs)
    User.create!(attrs)
  end

  def active_users
    User.where(status: :active)
        .includes(:profile)
        .order(created_at: :desc)
  end
end

# Migration example
class AddStatusIndexToUsers < ActiveRecord::Migration[7.0]
  def change
    add_index :users, :status
    add_index :users, [:status, :created_at]
  end
end
```

**Anti-Patterns to Avoid:**
- Queries in views/controllers (use repositories)
- N+1 queries (always eager load associations)
- Fat models with query logic (extract to repositories)
- Migrations that modify data (use rake tasks)

---

## Purpose

Handle all database operations, query optimization, schema management, and ORM usage. Focus on efficient data access, query performance, and data integrity.

## When to Activate

**Use this skill for:**
- Database queries and data retrieval
- ORM model configuration
- Database schema design and migrations
- Query optimization and indexing
- Data integrity constraints
- Repository pattern implementation

**Do NOT use for:**
- Business logic (use logic-implementing)
- External API calls (use integration-adapter)
- Testing (use test-engineering)

## Core Capabilities

### 1. Data Access Patterns
- Repository pattern implementation
- Query object encapsulation
- Eager loading strategies
- Pagination and filtering

### 2. Schema Management
- Migration creation and rollback
- Index optimization
- Foreign key constraints
- Database-level validations

### 3. Query Optimization
- N+1 query prevention
- Query analysis and profiling
- Index usage optimization
- Database-specific optimizations

### 4. Data Integrity
- Transaction management
- Constraint enforcement
- Concurrency handling
- Data validation at DB level

## [TECH_STACK_SPECIFIC] Patterns

### Ruby on Rails / ActiveRecord

```ruby
# Repository Pattern
class UserRepository
  def find(id)
    User.find(id)
  rescue ActiveRecord::RecordNotFound
    nil
  end

  def find_by_email(email)
    User.find_by(email: email)
  end

  def exists?(conditions)
    User.exists?(conditions)
  end

  def create(attributes)
    User.create!(attributes)
  end

  def update(user, attributes)
    user.update!(attributes)
  end

  def destroy(user)
    user.destroy!
  end

  # Complex queries with eager loading
  def find_with_associations(id)
    User
      .includes(:profile, :posts, :comments)
      .find(id)
  end

  def active_users_with_recent_activity
    User
      .active
      .joins(:activities)
      .where('activities.created_at > ?', 7.days.ago)
      .distinct
      .order('activities.created_at DESC')
  end

  # Scoped queries
  def premium_users
    User.where(subscription_tier: 'premium')
  end

  # Batch operations
  def bulk_update_status(user_ids, status)
    User.where(id: user_ids).update_all(status: status, updated_at: Time.current)
  end

  # Aggregations
  def count_by_status
    User.group(:status).count
  end

  def average_age_by_tier
    User.group(:subscription_tier).average(:age)
  end
end

# Query Object Pattern
class UserSearchQuery
  def initialize(relation = User.all)
    @relation = relation
  end

  def with_email(email)
    @relation = @relation.where(email: email)
    self
  end

  def active
    @relation = @relation.where(status: 'active')
    self
  end

  def created_after(date)
    @relation = @relation.where('created_at > ?', date)
    self
  end

  def with_subscription(tier)
    @relation = @relation.where(subscription_tier: tier)
    self
  end

  def sorted_by_name
    @relation = @relation.order(:name)
    self
  end

  def paginated(page, per_page = 25)
    @relation = @relation.offset((page - 1) * per_page).limit(per_page)
    self
  end

  def to_relation
    @relation
  end

  def all
    @relation.to_a
  end

  def count
    @relation.count
  end
end

# Usage
users = UserSearchQuery.new
  .active
  .with_subscription('premium')
  .created_after(30.days.ago)
  .sorted_by_name
  .paginated(1, 20)
  .all

# Model with Scopes
class User < ApplicationRecord
  # Associations
  has_one :profile, dependent: :destroy
  has_many :posts, dependent: :destroy
  has_many :comments, dependent: :destroy
  has_many :activities, dependent: :destroy

  # Validations
  validates :email, presence: true, uniqueness: true
  validates :status, inclusion: { in: %w[active inactive suspended] }

  # Scopes
  scope :active, -> { where(status: 'active') }
  scope :inactive, -> { where(status: 'inactive') }
  scope :premium, -> { where(subscription_tier: 'premium') }
  scope :recent, -> { where('created_at > ?', 30.days.ago) }
  scope :with_activity, -> { joins(:activities).distinct }

  # Class methods for complex queries
  def self.search(query)
    where('email ILIKE ? OR name ILIKE ?', "%#{query}%", "%#{query}%")
  end

  def self.with_posts_count
    left_joins(:posts)
      .select('users.*, COUNT(posts.id) as posts_count')
      .group('users.id')
  end
end

# Migration Example
class CreateUsersTable < ActiveRecord::Migration[8.0]
  def change
    create_table :users do |t|
      t.string :email, null: false
      t.string :encrypted_password, null: false
      t.string :name
      t.string :status, default: 'active', null: false
      t.string :subscription_tier, default: 'free'
      t.integer :age

      t.timestamps
    end

    add_index :users, :email, unique: true
    add_index :users, :status
    add_index :users, [:subscription_tier, :status]
    add_index :users, :created_at
  end
end

# Complex Migration with Data
class AddRoleToUsers < ActiveRecord::Migration[8.0]
  def up
    add_column :users, :role, :string, default: 'user', null: false
    add_index :users, :role

    # Data migration
    User.where(admin: true).update_all(role: 'admin')
  end

  def down
    remove_index :users, :role
    remove_column :users, :role
  end
end

# Transaction Management
class OrderRepository
  def create_order_with_items(order_attributes, items_attributes)
    ActiveRecord::Base.transaction do
      order = Order.create!(order_attributes)

      items_attributes.each do |item_attrs|
        order.order_items.create!(item_attrs)
      end

      # Update inventory
      items_attributes.each do |item_attrs|
        product = Product.lock.find(item_attrs[:product_id])
        product.decrement!(:stock, item_attrs[:quantity])
      end

      order
    end
  rescue ActiveRecord::RecordInvalid => e
    Rails.logger.error("Order creation failed: #{e.message}")
    raise
  end
end

# Optimistic Locking
class Account < ApplicationRecord
  # Add lock_version column to table
  validates :balance, numericality: { greater_than_or_equal_to: 0 }

  def withdraw(amount)
    self.balance -= amount
    save!
  rescue ActiveRecord::StaleObjectError
    # Handle concurrent modification
    reload
    raise ConcurrentUpdateError, 'Account was modified by another transaction'
  end
end
```

### Node.js / TypeORM

```typescript
// Repository Pattern with TypeORM
import { Repository, EntityManager } from 'typeorm';
import { User } from './entities/User';

export class UserRepository {
  constructor(private repository: Repository<User>) {}

  async find(id: string): Promise<User | null> {
    return this.repository.findOne({ where: { id } });
  }

  async findByEmail(email: string): Promise<User | null> {
    return this.repository.findOne({ where: { email } });
  }

  async exists(conditions: Partial<User>): Promise<boolean> {
    const count = await this.repository.count({ where: conditions });
    return count > 0;
  }

  async create(attributes: Partial<User>): Promise<User> {
    const user = this.repository.create(attributes);
    return this.repository.save(user);
  }

  async update(user: User, attributes: Partial<User>): Promise<User> {
    Object.assign(user, attributes);
    return this.repository.save(user);
  }

  async delete(user: User): Promise<void> {
    await this.repository.remove(user);
  }

  // Complex queries with relations
  async findWithAssociations(id: string): Promise<User | null> {
    return this.repository.findOne({
      where: { id },
      relations: ['profile', 'posts', 'comments']
    });
  }

  async activeUsersWithRecentActivity(): Promise<User[]> {
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    return this.repository
      .createQueryBuilder('user')
      .innerJoin('user.activities', 'activity')
      .where('user.status = :status', { status: 'active' })
      .andWhere('activity.createdAt > :date', { date: sevenDaysAgo })
      .orderBy('activity.createdAt', 'DESC')
      .distinct(true)
      .getMany();
  }

  // Aggregations
  async countByStatus(): Promise<Record<string, number>> {
    const result = await this.repository
      .createQueryBuilder('user')
      .select('user.status', 'status')
      .addSelect('COUNT(*)', 'count')
      .groupBy('user.status')
      .getRawMany();

    return result.reduce((acc, row) => {
      acc[row.status] = parseInt(row.count);
      return acc;
    }, {});
  }

  // Transactions
  async createWithProfile(
    userData: Partial<User>,
    profileData: any,
    manager: EntityManager
  ): Promise<User> {
    const user = manager.create(User, userData);
    await manager.save(user);

    const profile = manager.create('Profile', {
      ...profileData,
      userId: user.id
    });
    await manager.save(profile);

    return user;
  }
}

// Entity Definition
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToOne,
  OneToMany,
  Index,
  VersionColumn
} from 'typeorm';

@Entity('users')
@Index(['subscriptionTier', 'status'])
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  @Index()
  email: string;

  @Column({ name: 'encrypted_password' })
  encryptedPassword: string;

  @Column({ nullable: true })
  name: string;

  @Column({ default: 'active' })
  @Index()
  status: 'active' | 'inactive' | 'suspended';

  @Column({ name: 'subscription_tier', default: 'free' })
  subscriptionTier: string;

  @Column({ nullable: true })
  age: number;

  @VersionColumn() // Optimistic locking
  version: number;

  @CreateDateColumn({ name: 'created_at' })
  @Index()
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @OneToOne(() => Profile, profile => profile.user)
  profile: Profile;

  @OneToMany(() => Post, post => post.user)
  posts: Post[];

  @OneToMany(() => Comment, comment => comment.user)
  comments: Comment[];
}

// Migration
import { MigrationInterface, QueryRunner, Table, TableIndex } from 'typeorm';

export class CreateUsersTable1234567890 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'users',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            generationStrategy: 'uuid',
            default: 'uuid_generate_v4()'
          },
          {
            name: 'email',
            type: 'varchar',
            isUnique: true,
            isNullable: false
          },
          {
            name: 'encrypted_password',
            type: 'varchar',
            isNullable: false
          },
          {
            name: 'name',
            type: 'varchar',
            isNullable: true
          },
          {
            name: 'status',
            type: 'varchar',
            default: "'active'",
            isNullable: false
          },
          {
            name: 'subscription_tier',
            type: 'varchar',
            default: "'free'"
          },
          {
            name: 'age',
            type: 'integer',
            isNullable: true
          },
          {
            name: 'version',
            type: 'integer',
            default: 1
          },
          {
            name: 'created_at',
            type: 'timestamp',
            default: 'now()'
          },
          {
            name: 'updated_at',
            type: 'timestamp',
            default: 'now()'
          }
        ]
      }),
      true
    );

    await queryRunner.createIndex(
      'users',
      new TableIndex({
        name: 'IDX_users_status',
        columnNames: ['status']
      })
    );

    await queryRunner.createIndex(
      'users',
      new TableIndex({
        name: 'IDX_users_subscription_status',
        columnNames: ['subscription_tier', 'status']
      })
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('users');
  }
}

// Query Builder Pattern
export class UserQueryBuilder {
  constructor(private repository: Repository<User>) {}

  query() {
    return new UserQuery(this.repository.createQueryBuilder('user'));
  }
}

class UserQuery {
  constructor(private qb: SelectQueryBuilder<User>) {}

  withEmail(email: string): this {
    this.qb.andWhere('user.email = :email', { email });
    return this;
  }

  active(): this {
    this.qb.andWhere('user.status = :status', { status: 'active' });
    return this;
  }

  createdAfter(date: Date): this {
    this.qb.andWhere('user.createdAt > :date', { date });
    return this;
  }

  withSubscription(tier: string): this {
    this.qb.andWhere('user.subscriptionTier = :tier', { tier });
    return this;
  }

  sortedByName(): this {
    this.qb.orderBy('user.name', 'ASC');
    return this;
  }

  paginated(page: number, perPage = 25): this {
    this.qb.skip((page - 1) * perPage).take(perPage);
    return this;
  }

  async getMany(): Promise<User[]> {
    return this.qb.getMany();
  }

  async getCount(): Promise<number> {
    return this.qb.getCount();
  }
}
```

### Python / Django ORM

```python
# Repository Pattern
from typing import Optional, List
from django.db.models import QuerySet, Count, Avg, Q
from .models import User

class UserRepository:
    def find(self, user_id: int) -> Optional[User]:
        try:
            return User.objects.get(id=user_id)
        except User.DoesNotExist:
            return None

    def find_by_email(self, email: str) -> Optional[User]:
        return User.objects.filter(email=email).first()

    def exists(self, **conditions) -> bool:
        return User.objects.filter(**conditions).exists()

    def create(self, **attributes) -> User:
        return User.objects.create(**attributes)

    def update(self, user: User, **attributes) -> User:
        for key, value in attributes.items():
            setattr(user, key, value)
        user.save()
        return user

    def delete(self, user: User) -> None:
        user.delete()

    # Complex queries with select_related / prefetch_related
    def find_with_associations(self, user_id: int) -> Optional[User]:
        return User.objects.select_related('profile') \
            .prefetch_related('posts', 'comments') \
            .filter(id=user_id) \
            .first()

    def active_users_with_recent_activity(self) -> QuerySet[User]:
        from datetime import timedelta
        from django.utils import timezone

        seven_days_ago = timezone.now() - timedelta(days=7)

        return User.objects.filter(
            status='active',
            activities__created_at__gt=seven_days_ago
        ).distinct().order_by('-activities__created_at')

    # Aggregations
    def count_by_status(self) -> dict:
        result = User.objects.values('status').annotate(count=Count('id'))
        return {row['status']: row['count'] for row in result}

    def average_age_by_tier(self) -> dict:
        result = User.objects.values('subscription_tier').annotate(avg_age=Avg('age'))
        return {row['subscription_tier']: row['avg_age'] for row in result}

    # Bulk operations
    def bulk_update_status(self, user_ids: List[int], status: str) -> int:
        return User.objects.filter(id__in=user_ids).update(status=status)

# Model Definition
from django.db import models
from django.core.validators import MinValueValidator

class User(models.Model):
    STATUS_CHOICES = [
        ('active', 'Active'),
        ('inactive', 'Inactive'),
        ('suspended', 'Suspended'),
    ]

    email = models.EmailField(unique=True, db_index=True)
    encrypted_password = models.CharField(max_length=255)
    name = models.CharField(max_length=255, null=True, blank=True)
    status = models.CharField(
        max_length=20,
        choices=STATUS_CHOICES,
        default='active',
        db_index=True
    )
    subscription_tier = models.CharField(max_length=50, default='free')
    age = models.IntegerField(null=True, blank=True, validators=[MinValueValidator(0)])

    created_at = models.DateTimeField(auto_now_add=True, db_index=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'users'
        indexes = [
            models.Index(fields=['subscription_tier', 'status']),
        ]
        ordering = ['-created_at']

    def __str__(self):
        return self.email

    # Manager with custom queryset methods
    objects = models.Manager()

    @classmethod
    def active(cls):
        return cls.objects.filter(status='active')

    @classmethod
    def premium(cls):
        return cls.objects.filter(subscription_tier='premium')

    @classmethod
    def search(cls, query: str):
        return cls.objects.filter(
            Q(email__icontains=query) | Q(name__icontains=query)
        )

# Migration
from django.db import migrations, models
import django.core.validators

class Migration(migrations.Migration):
    dependencies = [
        ('users', '0001_initial'),
    ]

    operations = [
        migrations.CreateModel(
            name='User',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('email', models.EmailField(max_length=254, unique=True, db_index=True)),
                ('encrypted_password', models.CharField(max_length=255)),
                ('name', models.CharField(blank=True, max_length=255, null=True)),
                ('status', models.CharField(choices=[('active', 'Active'), ('inactive', 'Inactive'), ('suspended', 'Suspended')], default='active', max_length=20, db_index=True)),
                ('subscription_tier', models.CharField(default='free', max_length=50)),
                ('age', models.IntegerField(blank=True, null=True, validators=[django.core.validators.MinValueValidator(0)])),
                ('created_at', models.DateTimeField(auto_now_add=True, db_index=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
            ],
            options={
                'db_table': 'users',
                'ordering': ['-created_at'],
            },
        ),
        migrations.AddIndex(
            model_name='user',
            index=models.Index(fields=['subscription_tier', 'status'], name='users_subscri_status_idx'),
        ),
    ]

# Transaction Management
from django.db import transaction

class OrderRepository:
    @transaction.atomic
    def create_order_with_items(self, order_data: dict, items_data: List[dict]):
        order = Order.objects.create(**order_data)

        for item_data in items_data:
            OrderItem.objects.create(order=order, **item_data)

            # Update inventory with select_for_update (pessimistic locking)
            product = Product.objects.select_for_update().get(id=item_data['product_id'])
            product.stock -= item_data['quantity']
            product.save()

        return order
```

## Tools Required

### MCP Servers
[MCP_TOOLS]
<!-- Populated during skill creation based on:
     1. User's installed MCP servers
     2. User's selection for this skill

     Recommended for this skill (examples):
     - Database connection tools (PostgreSQL, MySQL, SQLite)
     - Database inspection and query tools
     - Schema migration tools
     - Query performance analysis tools

     Note: Skills work without MCP servers, but functionality may be limited
-->

### Database Tools
- Database client (pgAdmin, DBeaver, etc.)
- Query analyzer
- Migration tools
- Schema visualization

### Monitoring Tools
- Query performance monitoring
- Slow query log analysis
- Database profiling
- Connection pool monitoring

### Development Tools
- ORM debugger
- SQL formatter
- Database diff tools

## Quality Checklist

### Schema Design
- [ ] Proper indexing strategy
- [ ] Foreign keys defined
- [ ] Constraints at database level
- [ ] Normalization appropriate for use case
- [ ] Migration reversible

### Query Performance
- [ ] No N+1 queries
- [ ] Eager loading used where appropriate
- [ ] Indexes support common queries
- [ ] Query complexity analyzed
- [ ] Pagination implemented for large datasets

### Data Integrity
- [ ] Transactions used appropriately
- [ ] Concurrent access handled
- [ ] Validations at multiple layers
- [ ] Soft deletes where needed
- [ ] Audit trail for sensitive data

### Code Quality
- [ ] Repository pattern followed
- [ ] Query objects for complex queries
- [ ] No raw SQL unless necessary
- [ ] Error handling comprehensive
- [ ] Tests cover edge cases

## Testing Patterns

### Repository Testing

```ruby
# RSpec with database_cleaner
RSpec.describe UserRepository do
  let(:repository) { UserRepository.new }

  describe '#find' do
    let!(:user) { create(:user) }

    it 'returns user when found' do
      result = repository.find(user.id)
      expect(result).to eq(user)
    end

    it 'returns nil when not found' do
      result = repository.find(999)
      expect(result).to be_nil
    end
  end

  describe '#active_users_with_recent_activity' do
    let!(:active_user) { create(:user, :active) }
    let!(:inactive_user) { create(:user, :inactive) }

    before do
      create(:activity, user: active_user, created_at: 1.day.ago)
      create(:activity, user: inactive_user, created_at: 1.day.ago)
    end

    it 'returns only active users' do
      users = repository.active_users_with_recent_activity
      expect(users).to include(active_user)
      expect(users).not_to include(inactive_user)
    end

    it 'avoids N+1 queries' do
      expect {
        users = repository.active_users_with_recent_activity
        users.each { |u| u.activities.to_a }
      }.to make_database_queries(count: 2) # One for users, one for activities
    end
  end
end
```

## Performance Best Practices

### Indexing Strategy
- Index foreign keys
- Index columns used in WHERE clauses
- Compound indexes for multi-column queries
- Consider partial indexes for filtered queries
- Monitor index usage

### Query Optimization
- Use EXPLAIN to analyze queries
- Limit result sets with pagination
- Use database functions when appropriate
- Avoid SELECT * in production
- Cache expensive queries

### Connection Management
- Use connection pooling
- Close connections properly
- Monitor connection count
- Set appropriate timeouts

## Common Pitfalls

- **N+1 Queries**: Use eager loading (includes, joins)
- **Missing Indexes**: Index foreign keys and query columns
- **Large Result Sets**: Always paginate
- **Unnecessary Columns**: Select only needed columns
- **Transaction Overuse**: Keep transactions short
- **Lack of Monitoring**: Profile queries in production

---

**Remember:** Efficient data access is crucial for application performance. Focus on query optimization, proper indexing, and clean separation between data access and business logic.
