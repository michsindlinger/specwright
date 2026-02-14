# Data Modeling Skill

> Skill: Data Modeling
> Role: Architect
> Created: 2026-01-09
> Version: 1.0.0

## Purpose

Designs database schemas, data structures, and relationships that are normalized, performant, scalable, and maintainable. Ensures data integrity, optimizes queries, and plans for future growth.

## When to Activate This Skill

**Trigger Conditions:**
- New feature requiring database changes
- Database schema design
- Data migration planning
- Query performance optimization
- Data integrity issues
- Relationship modeling
- Indexing strategy

**Context Signals:**
- "Design database for..."
- "What tables do we need?"
- "How should we model this data?"
- "Database performance issue"
- "Schema migration needed"

## Core Capabilities

### 1. Schema Design
- Design normalized database schemas
- Define table structures and columns
- Establish relationships (one-to-one, one-to-many, many-to-many)
- Plan polymorphic associations
- Design for scalability

### 2. Data Integrity
- Define constraints (NOT NULL, UNIQUE, CHECK)
- Implement foreign key relationships
- Establish cascade behaviors
- Plan validation rules
- Ensure referential integrity

### 3. Performance Optimization
- Design indexing strategies
- Optimize query performance
- Plan for denormalization when needed
- Design efficient joins
- Implement caching strategies

### 4. Migrations & Evolution
- Plan schema migrations
- Design backward-compatible changes
- Handle data transformations
- Plan rollback strategies
- Version database changes

## [TECH_STACK_SPECIFIC] Best Practices

### Database Design
[TECH_STACK_SPECIFIC]
- **Naming Conventions**: [Table and column naming standards]
- **Primary Keys**: [ID strategy - UUID, auto-increment, etc.]
- **Foreign Keys**: [Relationship naming conventions]
- **Timestamps**: [created_at, updated_at handling]
- **Soft Deletes**: [Deletion strategy - hard vs soft]

### Data Types
[TECH_STACK_SPECIFIC]
- **Strings**: [VARCHAR vs TEXT, length limits]
- **Numbers**: [INTEGER, BIGINT, DECIMAL for money]
- **Dates/Times**: [TIMESTAMP, DATE, timezone handling]
- **JSON/JSONB**: [Structured data storage]
- **Enums**: [Enumeration handling approach]
- **Arrays**: [Array column support and usage]

### Relationships
[TECH_STACK_SPECIFIC]
- **Associations**: [has_many, belongs_to, etc.]
- **Join Tables**: [Many-to-many implementation]
- **Polymorphic**: [Polymorphic association patterns]
- **STI/MTI**: [Single/Multi-table inheritance]
- **Cascade**: [Delete and update cascade rules]

### Indexing
[TECH_STACK_SPECIFIC]
- **Index Types**: [B-tree, Hash, GiST, GIN]
- **Composite Indexes**: [Multi-column index strategy]
- **Unique Indexes**: [Uniqueness constraints]
- **Partial Indexes**: [Conditional indexing]
- **Expression Indexes**: [Computed column indexes]

### Migrations
[TECH_STACK_SPECIFIC]
- **Migration Files**: [Framework migration format]
- **Up/Down**: [Forward and rollback methods]
- **Data Migrations**: [Migrating existing data]
- **Zero Downtime**: [Online schema changes]

## Tools Required

### MCP Servers
[MCP_TOOLS]
<!-- Populated during skill creation based on:
     1. User's installed MCP servers
     2. User's selection for this skill

     Recommended for this skill (examples):
     - database - Query and inspect database
     - sql - Execute SQL commands
     - [TECH_STACK_SPECIFIC] - Framework ORM/database tools

     Note: Skills work without MCP servers, but functionality may be limited
-->

### Specwright Workflows
- **specwright/workflows/create-spec.md** - Document schema changes
- **.specwright/specs/[feature]/sub-specs/database-schema.md** - Schema specs
- **specwright/product/architecture-decision.md** - Data architecture decisions

### External Tools
- Database visualization tools (ERD diagrams)
- Query analyzers (EXPLAIN)
- Database migration tools
- Schema comparison tools

## Quality Checklist

### Schema Design
- [ ] Tables are properly normalized (3NF typically)
- [ ] Denormalization is justified and documented
- [ ] Naming conventions are consistent
- [ ] Primary keys are defined for all tables
- [ ] Foreign keys establish relationships

### Data Integrity
- [ ] NOT NULL constraints on required fields
- [ ] UNIQUE constraints on unique fields
- [ ] CHECK constraints for validation
- [ ] Foreign key constraints with appropriate cascade
- [ ] Default values are set where appropriate

### Performance
- [ ] Indexes on foreign keys
- [ ] Indexes on frequently queried columns
- [ ] Composite indexes for multi-column queries
- [ ] No unnecessary indexes (they slow writes)
- [ ] Large text fields are separated if needed

### Scalability
- [ ] Schema can handle growth in data volume
- [ ] Partitioning strategy considered if needed
- [ ] Archive strategy for historical data
- [ ] Query performance tested with large datasets
- [ ] Caching strategy defined

### Maintainability
- [ ] Schema is well-documented
- [ ] Migrations are reversible
- [ ] Complex queries have explanations
- [ ] Relationships are clear and logical
- [ ] Future changes are anticipated

## Integration with Other Skills

### Works Closely With
- **pattern-enforcement** - Database pattern compliance
- **api-designing** - API data structure alignment
- **security-guidance** - Data security and encryption
- **dependency-checking** - Database driver/ORM versions

### Provides Input To
- **Backend developers** - Schema implementation
- **Frontend developers** - Data structure contracts
- **DevOps team** - Database provisioning needs
- **Performance team** - Query optimization

### Receives Input From
- **Product specs** - Data requirements
- **Performance requirements** - Query performance needs
- **Compliance** - Data retention and privacy rules
- **Analytics** - Reporting and analysis needs

## Examples

### Example 1: Basic Entity Modeling

**Scenario:** Design schema for blog posts and comments

**Design:**
```sql
[TECH_STACK_SPECIFIC]

-- Users table
CREATE TABLE users (
    id BIGSERIAL PRIMARY KEY,
    email VARCHAR(255) NOT NULL UNIQUE,
    username VARCHAR(100) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Posts table
CREATE TABLE posts (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    content TEXT NOT NULL,
    published_at TIMESTAMP,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW(),

    INDEX idx_posts_user_id (user_id),
    INDEX idx_posts_published_at (published_at)
);

-- Comments table
CREATE TABLE comments (
    id BIGSERIAL PRIMARY KEY,
    post_id BIGINT NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
    user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW(),

    INDEX idx_comments_post_id (post_id),
    INDEX idx_comments_user_id (user_id)
);

DESIGN DECISIONS:
- BIGSERIAL for future scalability
- CASCADE delete to maintain referential integrity
- Indexes on foreign keys for join performance
- published_at nullable (drafts are unpublished)
- Timestamps for audit trail
```

### Example 2: Many-to-Many Relationship

**Scenario:** Posts can have multiple tags, tags can apply to multiple posts

**Design:**
```sql
[TECH_STACK_SPECIFIC]

-- Tags table
CREATE TABLE tags (
    id BIGSERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE,
    slug VARCHAR(100) NOT NULL UNIQUE,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW(),

    INDEX idx_tags_slug (slug)
);

-- Join table
CREATE TABLE post_tags (
    id BIGSERIAL PRIMARY KEY,
    post_id BIGINT NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
    tag_id BIGINT NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),

    UNIQUE (post_id, tag_id),
    INDEX idx_post_tags_post_id (post_id),
    INDEX idx_post_tags_tag_id (tag_id)
);

DESIGN DECISIONS:
- Separate join table (post_tags) for many-to-many
- Composite unique constraint prevents duplicates
- Indexes on both foreign keys for bidirectional queries
- Cascade delete cleans up orphaned relationships
- slug for URL-friendly tag pages
```

### Example 3: Polymorphic Association

**Scenario:** Comments can be on posts or on other comments (nested)

**Design:**
```sql
[TECH_STACK_SPECIFIC]

-- Polymorphic comments table
CREATE TABLE comments (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    commentable_type VARCHAR(100) NOT NULL,
    commentable_id BIGINT NOT NULL,
    content TEXT NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW(),

    INDEX idx_comments_user_id (user_id),
    INDEX idx_comments_commentable (commentable_type, commentable_id)
);

-- Example data:
-- Comment on post:
-- { commentable_type: 'Post', commentable_id: 123 }
-- Comment on comment (reply):
-- { commentable_type: 'Comment', commentable_id: 456 }

DESIGN DECISIONS:
- Polymorphic pattern for flexible relationships
- Composite index on type + id for lookups
- No foreign key constraint (polymorphic limitation)
- Application-level validation required
- Consider view/materialized view for performance
```

### Example 4: Denormalization for Performance

**Scenario:** Frequently display post comment count (expensive to calculate)

**Design:**
```sql
[TECH_STACK_SPECIFIC]

-- Add denormalized column to posts
ALTER TABLE posts ADD COLUMN comments_count INTEGER NOT NULL DEFAULT 0;

-- Create index for sorting
CREATE INDEX idx_posts_comments_count ON posts(comments_count);

-- Trigger to maintain count (PostgreSQL example)
CREATE OR REPLACE FUNCTION update_post_comments_count()
RETURNS TRIGGER AS $$
BEGIN
    IF (TG_OP = 'INSERT') THEN
        UPDATE posts SET comments_count = comments_count + 1
        WHERE id = NEW.post_id;
        RETURN NEW;
    ELSIF (TG_OP = 'DELETE') THEN
        UPDATE posts SET comments_count = comments_count - 1
        WHERE id = OLD.post_id;
        RETURN OLD;
    END IF;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER comments_count_trigger
AFTER INSERT OR DELETE ON comments
FOR EACH ROW EXECUTE FUNCTION update_post_comments_count();

-- Alternative: Application-level counter cache
[Framework-specific counter cache implementation]

DESIGN DECISIONS:
- Denormalize for read performance (very frequent query)
- Trigger maintains consistency automatically
- Trade-off: Slightly slower writes, much faster reads
- Document the denormalization clearly
- Alternative: Periodic batch update for less critical counts
```

### Example 5: Schema Migration Strategy

**Scenario:** Add email verification to existing users table

**Migration:**
```
[TECH_STACK_SPECIFIC]

# Migration: Add email verification
class AddEmailVerificationToUsers < ActiveRecord::Migration[7.0]
  def up
    # Add new columns
    add_column :users, :email_verified, :boolean, default: false, null: false
    add_column :users, :email_verification_token, :string
    add_column :users, :email_verification_sent_at, :timestamp

    # Add index for token lookup
    add_index :users, :email_verification_token, unique: true

    # Data migration: Mark existing users as verified (grandfathered)
    User.update_all(email_verified: true)
  end

  def down
    remove_column :users, :email_verified
    remove_column :users, :email_verification_token
    remove_column :users, :email_verification_sent_at
  end
end

MIGRATION BEST PRACTICES:
1. Always provide rollback (down method)
2. Handle existing data appropriately
3. Add indexes in same migration
4. Set sensible defaults
5. Consider zero-downtime deployment needs
6. Test migration on production-like dataset
7. Document any manual steps required
```

### Example 6: Indexing Strategy

**Scenario:** Optimize query performance for common searches

**Analysis:**
```sql
[TECH_STACK_SPECIFIC]

-- Common query: Find posts by user, ordered by published date
SELECT * FROM posts
WHERE user_id = 123
  AND published_at IS NOT NULL
ORDER BY published_at DESC
LIMIT 25;

-- Optimal index: Composite index covering the query
CREATE INDEX idx_posts_user_published
ON posts(user_id, published_at DESC)
WHERE published_at IS NOT NULL;

-- This is a partial index (WHERE clause) for efficiency

-- Common query: Search posts by title
SELECT * FROM posts
WHERE title ILIKE '%search term%';

-- Optimal index: Full-text search
CREATE INDEX idx_posts_title_fulltext
ON posts USING GIN(to_tsvector('english', title));

-- Updated query using index:
SELECT * FROM posts
WHERE to_tsvector('english', title) @@ to_tsquery('english', 'search & term');

INDEXING PRINCIPLES:
1. Index columns used in WHERE clauses
2. Index foreign keys
3. Index columns used in ORDER BY
4. Composite indexes for multi-column queries
5. Consider partial indexes for filtered queries
6. Use appropriate index type (B-tree, GIN, GiST)
7. Monitor index usage and remove unused indexes
8. Balance read performance vs write overhead
```

## Skill Activation Flow

```
1. UNDERSTAND: Data requirements and relationships
2. DESIGN: Entity-relationship model
3. NORMALIZE: Apply normalization principles (3NF)
4. OPTIMIZE: Strategic denormalization if needed
5. CONSTRAIN: Add integrity constraints
6. INDEX: Plan indexing strategy
7. MIGRATE: Create migration plan
8. VALIDATE: Test with realistic data volumes
9. DOCUMENT: Schema decisions and rationale
```

## Success Metrics

- Normalized schema (appropriate normal form)
- Data integrity maintained
- Query performance meets SLAs
- Successful migrations with rollbacks
- Scalable to expected data growth
- Clear documentation of schema
- Minimal schema-related bugs

## Notes

- Normalization is usually right, denormalization requires justification
- Premature optimization is dangerous - measure first
- Migrations should be reversible when possible
- Test migrations on production-like datasets
- Document the "why" behind design decisions
- Consider future requirements, but don't over-engineer
- Data integrity at database level is stronger than application level
- Indexes speed reads but slow writes - balance carefully
