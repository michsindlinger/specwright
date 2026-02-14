# API Designing Skill

> Skill: API Designing
> Role: Architect
> Created: 2026-01-09
> Version: 1.0.0

## Purpose

Designs RESTful, GraphQL, or other API architectures that are intuitive, consistent, scalable, and maintainable. Ensures APIs follow industry best practices and project conventions.

## When to Activate This Skill

**Trigger Conditions:**
- New API endpoint design
- API versioning requirements
- API documentation needs
- Breaking change evaluation
- API performance optimization
- Third-party API integration design

**Context Signals:**
- "Design an API for..."
- "What endpoints do we need?"
- "How should this API be structured?"
- "Review this API design"
- "API documentation needed"

## Core Capabilities

### 1. API Architecture Design
- Design RESTful resource-based APIs
- Design GraphQL schemas and resolvers
- Plan API versioning strategies
- Structure endpoint hierarchies
- Define request/response formats

### 2. API Contracts
- Define clear request/response schemas
- Specify validation rules
- Document error responses
- Define rate limiting policies
- Establish authentication/authorization patterns

### 3. API Documentation
- Generate OpenAPI/Swagger specifications
- Create API usage examples
- Document authentication flows
- Maintain changelog for API versions
- Provide integration guides

### 4. API Evolution
- Plan backward-compatible changes
- Design deprecation strategies
- Manage breaking changes
- Version migration paths
- Sunset old API versions gracefully

## [TECH_STACK_SPECIFIC] Best Practices

### REST API Design
[TECH_STACK_SPECIFIC]
- **Resource Naming**: [Framework conventions for routes/resources]
- **HTTP Methods**: [Standard CRUD mappings in framework]
- **Status Codes**: [Framework-specific status handling]
- **Nested Resources**: [How to handle relationships]
- **Query Parameters**: [Filtering, sorting, pagination patterns]

### Request/Response Format
[TECH_STACK_SPECIFIC]
- **JSON Structure**: [Standard JSON response format]
- **Error Format**: [Error response structure]
- **Pagination**: [Pagination metadata format]
- **Timestamps**: [DateTime format and timezone handling]
- **Null Handling**: [How to represent null/missing values]

### Authentication & Authorization
[TECH_STACK_SPECIFIC]
- **Auth Strategy**: [JWT, Session, OAuth2, etc.]
- **Token Format**: [Token structure and claims]
- **Permission Checks**: [How to enforce authorization]
- **API Keys**: [If applicable, key management]

### Performance Patterns
[TECH_STACK_SPECIFIC]
- **Caching**: [HTTP caching headers, ETags]
- **Eager Loading**: [N+1 query prevention]
- **Pagination**: [Default and maximum page sizes]
- **Rate Limiting**: [Request throttling strategy]
- **Compression**: [Response compression settings]

## Tools Required

### MCP Servers
[MCP_TOOLS]
<!-- Populated during skill creation based on:
     1. User's installed MCP servers
     2. User's selection for this skill

     Recommended for this skill (examples):
     - http - Test API endpoints
     - openapi - Generate and validate OpenAPI specs
     - [TECH_STACK_SPECIFIC] - Framework-specific API tools

     Note: Skills work without MCP servers, but functionality may be limited
-->

### Specwright Workflows
- **specwright/workflows/create-spec.md** - Document API specifications
- **specwright/product/architecture-decision.md** - Record API design decisions
- **.specwright/specs/[feature]/sub-specs/api-spec.md** - Feature API specs

### External Tools
- Postman/Insomnia for API testing
- OpenAPI/Swagger UI for documentation
- API mock servers for development
- API performance testing tools

## Quality Checklist

### Design Principles
- [ ] RESTful principles followed (or GraphQL best practices)
- [ ] Endpoints are resource-oriented and intuitive
- [ ] HTTP methods used semantically correct
- [ ] Status codes are appropriate and consistent
- [ ] URL structure is logical and hierarchical

### Consistency
- [ ] Naming conventions are consistent across endpoints
- [ ] Response formats follow standard structure
- [ ] Error handling is uniform
- [ ] Authentication pattern is consistent
- [ ] Versioning strategy is applied uniformly

### Documentation
- [ ] All endpoints are documented
- [ ] Request/response examples provided
- [ ] Authentication requirements specified
- [ ] Error responses documented
- [ ] Rate limits and constraints noted

### Security
- [ ] Authentication required where appropriate
- [ ] Authorization checks in place
- [ ] Input validation defined
- [ ] Sensitive data properly handled
- [ ] CORS policies configured correctly

### Performance
- [ ] Pagination implemented for list endpoints
- [ ] Caching strategy defined
- [ ] N+1 queries prevented
- [ ] Rate limiting configured
- [ ] Response sizes are reasonable

## Integration with Other Skills

### Works Closely With
- **pattern-enforcement** - Ensures API follows architectural patterns
- **data-modeling** - Aligns API with data structures
- **security-guidance** - Validates API security measures
- **dependency-checking** - Reviews external API integrations

### Provides Input To
- **Backend developers** - API implementation specifications
- **Frontend developers** - API consumption contracts
- **Documentation team** - API reference materials
- **Testing team** - API test scenarios

### Receives Input From
- **Product specs** - Feature requirements driving API needs
- **Security requirements** - Authentication/authorization needs
- **Performance requirements** - Scalability constraints
- **Client needs** - Consumer-specific API requirements

## Examples

### Example 1: RESTful Resource Design

**Scenario:** Design API for blog posts with comments

**Design:**
```
[TECH_STACK_SPECIFIC]

RESOURCES:
/api/v1/posts
/api/v1/posts/:id
/api/v1/posts/:id/comments
/api/v1/posts/:id/comments/:comment_id

ENDPOINTS:
GET    /api/v1/posts              # List all posts (paginated)
POST   /api/v1/posts              # Create new post
GET    /api/v1/posts/:id          # Get single post
PUT    /api/v1/posts/:id          # Update post
DELETE /api/v1/posts/:id          # Delete post

GET    /api/v1/posts/:id/comments        # List post comments
POST   /api/v1/posts/:id/comments        # Create comment
DELETE /api/v1/posts/:id/comments/:id    # Delete comment

RESPONSE FORMAT:
{
  "data": {
    "id": "123",
    "type": "post",
    "attributes": {
      "title": "API Design Best Practices",
      "content": "...",
      "published_at": "2026-01-09T10:00:00Z"
    },
    "relationships": {
      "author": { "id": "456", "type": "user" },
      "comments": { "count": 5 }
    }
  },
  "meta": {
    "timestamp": "2026-01-09T10:00:00Z"
  }
}
```

### Example 2: Error Response Standard

**Scenario:** Standardize error responses across API

**Design:**
```json
[TECH_STACK_SPECIFIC]

{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "The request could not be processed",
    "details": [
      {
        "field": "email",
        "message": "Email is already taken",
        "code": "UNIQUENESS_VIOLATION"
      }
    ],
    "request_id": "req_abc123xyz",
    "timestamp": "2026-01-09T10:00:00Z"
  }
}

STATUS CODES:
200 - Success
201 - Created
204 - No Content
400 - Bad Request (validation errors)
401 - Unauthorized (authentication required)
403 - Forbidden (insufficient permissions)
404 - Not Found
422 - Unprocessable Entity (business logic error)
429 - Too Many Requests (rate limited)
500 - Internal Server Error
```

### Example 3: Pagination Design

**Scenario:** Implement consistent pagination across list endpoints

**Design:**
```
[TECH_STACK_SPECIFIC]

REQUEST:
GET /api/v1/posts?page=2&per_page=20&sort=-published_at

RESPONSE:
{
  "data": [...],
  "pagination": {
    "current_page": 2,
    "per_page": 20,
    "total_pages": 10,
    "total_count": 200,
    "links": {
      "first": "/api/v1/posts?page=1&per_page=20",
      "prev": "/api/v1/posts?page=1&per_page=20",
      "next": "/api/v1/posts?page=3&per_page=20",
      "last": "/api/v1/posts?page=10&per_page=20"
    }
  }
}

QUERY PARAMETERS:
- page: Page number (default: 1)
- per_page: Items per page (default: 25, max: 100)
- sort: Sort field, prefix with - for descending
- filter[field]: Filter by field value
```

### Example 4: API Versioning Strategy

**Scenario:** Plan API versioning for backward compatibility

**Strategy:**
```
[TECH_STACK_SPECIFIC]

VERSIONING APPROACH: URL-based versioning
- /api/v1/resources
- /api/v2/resources

VERSION LIFECYCLE:
1. Active: Current stable version (v2)
2. Deprecated: Previous version (v1) - 6 month sunset period
3. Sunset: Removed after deprecation period

BREAKING CHANGES (require new version):
- Removing fields from response
- Changing field types
- Modifying required parameters
- Changing authentication mechanism

NON-BREAKING CHANGES (same version):
- Adding optional parameters
- Adding new endpoints
- Adding fields to response
- Adding new status codes

DEPRECATION PROCESS:
1. Announce deprecation 6 months in advance
2. Add deprecation headers to v1 responses:
   Deprecation: true
   Sunset: 2026-07-09T00:00:00Z
   Link: /api/v2/migration-guide
3. Update documentation with migration guide
4. Monitor v1 usage and contact heavy users
5. Remove v1 after sunset date
```

### Example 5: GraphQL Schema Design

**Scenario:** Design GraphQL API alternative

**Design:**
```graphql
[TECH_STACK_SPECIFIC]

# Schema
type Post {
  id: ID!
  title: String!
  content: String!
  publishedAt: DateTime!
  author: User!
  comments(first: Int, after: String): CommentConnection!
}

type CommentConnection {
  edges: [CommentEdge!]!
  pageInfo: PageInfo!
  totalCount: Int!
}

type Query {
  post(id: ID!): Post
  posts(
    first: Int = 25
    after: String
    filter: PostFilter
    sort: PostSort
  ): PostConnection!
}

type Mutation {
  createPost(input: CreatePostInput!): CreatePostPayload!
  updatePost(id: ID!, input: UpdatePostInput!): UpdatePostPayload!
  deletePost(id: ID!): DeletePostPayload!
}

# Error handling
type Error {
  message: String!
  path: [String!]
  code: String!
}

# Response wrapper
type CreatePostPayload {
  post: Post
  errors: [Error!]
}
```

## Skill Activation Flow

```
1. GATHER: Understand feature requirements
2. IDENTIFY: Resources and operations needed
3. DESIGN: Endpoint structure and hierarchy
4. DEFINE: Request/response schemas
5. SPECIFY: Authentication and authorization
6. DOCUMENT: API specification
7. VALIDATE: Design against best practices
8. REVIEW: With stakeholders and developers
```

## Success Metrics

- Intuitive and consistent API design
- Complete and accurate documentation
- Positive developer experience
- Minimal breaking changes
- Clear versioning and migration paths
- Good API performance and scalability

## Notes

- APIs are contracts - design carefully before implementation
- Prioritize developer experience (both internal and external)
- Document everything - undocumented APIs are unusable
- Version proactively to avoid breaking changes
- Consider backward compatibility in every design decision
- Test APIs from consumer perspective
- Monitor API usage to inform future design decisions
