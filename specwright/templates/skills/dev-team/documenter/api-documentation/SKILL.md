# API Documentation Skill

> Skill: api-documentation
> Created: 2026-01-09
> Agent: documenter
> Category: Documentation

## Purpose

Create comprehensive API documentation compatible with OpenAPI/Swagger standards. Generates clear, accurate documentation for REST and GraphQL APIs with examples, schemas, and interactive testing capabilities.

## When to Activate

**Trigger Conditions:**
- After new API endpoint implementation
- After API endpoint modifications
- Before API version release
- When documenter agent documents backend features

**Activation Pattern:**
```
When: API controller/resolver created OR modified
Then: Generate/update API documentation
```

## Core Capabilities

### 1. Endpoint Documentation
- Document HTTP methods (GET, POST, PUT, PATCH, DELETE)
- Define URL paths and parameters
- Specify request/response schemas
- Include authentication requirements
- Document rate limiting rules

### 2. Schema Generation
- Extract models from code
- Generate JSON Schema definitions
- Document field types and constraints
- Define enum values
- Specify required vs optional fields

### 3. Example Generation
- Create request examples (curl, JavaScript, Python)
- Generate response examples (success and error cases)
- Include authentication examples
- Show pagination examples

### 4. Interactive Documentation
- Generate Swagger UI compatible specs
- Create Redoc documentation
- Enable API testing in browser
- Support multiple environments (dev, staging, prod)

## [TECH_STACK_SPECIFIC] Sections

### Ruby on Rails REST API
```yaml
## Integration Points
- Extract routes from: `rails routes`
- Parse controllers: `app/controllers/api/**/*_controller.rb`
- Generate from serializers: `app/serializers/**/*.rb`
- Use Strong Parameters for request schemas

## Rails-Specific Tools
gem 'rswag'              # Generate OpenAPI from RSpec
gem 'grape-swagger'      # For Grape API
gem 'apipie-rails'       # Alternative documentation

## Documentation Location
docs/api/openapi.yml     # OpenAPI specification
docs/api/index.html      # Swagger UI
public/api-docs/         # Hosted documentation

## Code Analysis Pattern
# Controller
class Api::V1::UsersController < ApplicationController
  # @api_doc POST /api/v1/users
  # @description Create a new user account
  # @request_body UserCreateRequest
  # @response 201 UserResponse
  # @response 422 ValidationError
  def create
    # ...
  end
end

# Serializer
class UserSerializer < ActiveModel::Serializer
  attributes :id, :email, :name, :created_at
end
```

### GraphQL API
```yaml
## Integration Points
- Parse schema: `app/graphql/schema.rb`
- Extract types: `app/graphql/types/**/*.rb`
- Document queries: `app/graphql/queries/**/*.rb`
- Document mutations: `app/graphql/mutations/**/*.rb`

## GraphQL Tools
gem 'graphql'
gem 'graphql-docs'       # Generate documentation

## Documentation Location
docs/api/graphql-schema.graphql    # Schema definition
docs/api/graphql-docs.html         # Generated docs

## Code Analysis Pattern
module Types
  class UserType < Types::BaseObject
    description "A registered user account"

    field :id, ID, null: false
    field :email, String, null: false, description: "User's email address"
    field :name, String, null: true, description: "User's display name"
    field :created_at, GraphQL::Types::ISO8601DateTime, null: false
  end
end
```

### Node.js/Express API
```yaml
## Integration Points
- Parse routes from Express app
- Extract JSDoc comments
- Use Joi/Zod schemas for validation
- TypeScript types for schemas

## Node-Specific Tools
npm install swagger-jsdoc swagger-ui-express
npm install @nestjs/swagger          # For NestJS

## Documentation Location
docs/api/openapi.json    # OpenAPI specification
/api-docs                # Swagger UI endpoint

## Code Analysis Pattern
/**
 * @swagger
 * /api/v1/users:
 *   post:
 *     summary: Create a new user
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/UserCreate'
 *     responses:
 *       201:
 *         description: User created
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/User'
 */
router.post('/api/v1/users', createUser);
```

## Tools Required

### Primary Tools
- **nn__documentation-generator** - Format API specs
- **nn__openapi-validator** - Validate OpenAPI specs

### MCP Servers
[MCP_TOOLS]
<!-- Populated during skill creation based on:
     1. User's installed MCP servers
     2. User's selection for this skill

     Recommended for this skill (examples):
     - mcp__code-analyzer - Extract endpoint definitions
     - mcp__swagger-ui - Generate interactive docs
     - mcp__postman-integration - Export to Postman collections

     Note: Skills work without MCP servers, but functionality may be limited
-->

## Quality Checklist

**Before Generating:**
- [ ] All endpoints identified from routes
- [ ] Request/response schemas extracted
- [ ] Authentication requirements documented
- [ ] Error responses defined

**Documentation Quality:**
- [ ] All endpoints have descriptions
- [ ] Request schemas complete with examples
- [ ] Response schemas for all status codes
- [ ] Authentication clearly documented
- [ ] Rate limiting specified
- [ ] Deprecation notices included

**OpenAPI Compliance:**
- [ ] Valid OpenAPI 3.0+ format
- [ ] All $refs resolve correctly
- [ ] Security schemes defined
- [ ] Server URLs configured
- [ ] Tags used for organization
- [ ] Examples provided for complex schemas

**Usability:**
- [ ] Clear, concise descriptions
- [ ] Realistic example values
- [ ] Common use cases covered
- [ ] Error handling documented
- [ ] Swagger UI renders correctly

## Documentation Examples

### Complete OpenAPI Specification
```yaml
openapi: 3.0.3
info:
  title: User Management API
  description: API for managing user accounts and authentication
  version: 1.2.0
  contact:
    name: API Support
    email: api@example.com
  license:
    name: MIT
    url: https://opensource.org/licenses/MIT

servers:
  - url: https://api.example.com/v1
    description: Production server
  - url: https://staging-api.example.com/v1
    description: Staging server
  - url: http://localhost:3000/v1
    description: Development server

security:
  - bearerAuth: []

tags:
  - name: Users
    description: User account operations
  - name: Authentication
    description: Authentication and session management

paths:
  /users:
    get:
      summary: List users
      description: Retrieve a paginated list of user accounts
      tags:
        - Users
      parameters:
        - name: page
          in: query
          description: Page number (1-indexed)
          schema:
            type: integer
            minimum: 1
            default: 1
        - name: per_page
          in: query
          description: Number of results per page
          schema:
            type: integer
            minimum: 1
            maximum: 100
            default: 20
        - name: sort
          in: query
          description: Sort field
          schema:
            type: string
            enum: [created_at, email, name]
            default: created_at
        - name: order
          in: query
          description: Sort order
          schema:
            type: string
            enum: [asc, desc]
            default: desc
      responses:
        '200':
          description: Successful response
          content:
            application/json:
              schema:
                type: object
                properties:
                  data:
                    type: array
                    items:
                      $ref: '#/components/schemas/User'
                  meta:
                    $ref: '#/components/schemas/PaginationMeta'
              examples:
                success:
                  value:
                    data:
                      - id: 1
                        email: john@example.com
                        name: John Doe
                        created_at: '2026-01-09T10:30:00Z'
                      - id: 2
                        email: jane@example.com
                        name: Jane Smith
                        created_at: '2026-01-08T15:45:00Z'
                    meta:
                      page: 1
                      per_page: 20
                      total: 2
                      total_pages: 1
        '401':
          $ref: '#/components/responses/UnauthorizedError'
        '429':
          $ref: '#/components/responses/RateLimitError'

    post:
      summary: Create user
      description: Create a new user account
      tags:
        - Users
      security: []
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/UserCreate'
            examples:
              basic:
                value:
                  email: newuser@example.com
                  password: SecurePass123!
                  name: New User
      responses:
        '201':
          description: User created successfully
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/User'
              examples:
                success:
                  value:
                    id: 3
                    email: newuser@example.com
                    name: New User
                    created_at: '2026-01-09T12:00:00Z'
        '422':
          $ref: '#/components/responses/ValidationError'
        '429':
          $ref: '#/components/responses/RateLimitError'

  /users/{id}:
    get:
      summary: Get user
      description: Retrieve a specific user by ID
      tags:
        - Users
      parameters:
        - name: id
          in: path
          required: true
          description: User ID
          schema:
            type: integer
            minimum: 1
      responses:
        '200':
          description: Successful response
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/User'
        '404':
          $ref: '#/components/responses/NotFoundError'
        '401':
          $ref: '#/components/responses/UnauthorizedError'

    patch:
      summary: Update user
      description: Update user account details
      tags:
        - Users
      parameters:
        - name: id
          in: path
          required: true
          description: User ID
          schema:
            type: integer
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/UserUpdate'
      responses:
        '200':
          description: User updated successfully
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/User'
        '404':
          $ref: '#/components/responses/NotFoundError'
        '422':
          $ref: '#/components/responses/ValidationError'
        '401':
          $ref: '#/components/responses/UnauthorizedError'

    delete:
      summary: Delete user
      description: Permanently delete a user account
      tags:
        - Users
      parameters:
        - name: id
          in: path
          required: true
          description: User ID
          schema:
            type: integer
      responses:
        '204':
          description: User deleted successfully
        '404':
          $ref: '#/components/responses/NotFoundError'
        '401':
          $ref: '#/components/responses/UnauthorizedError'

  /auth/login:
    post:
      summary: Login
      description: Authenticate user and receive access token
      tags:
        - Authentication
      security: []
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              required:
                - email
                - password
              properties:
                email:
                  type: string
                  format: email
                password:
                  type: string
                  format: password
            examples:
              basic:
                value:
                  email: user@example.com
                  password: SecurePass123!
      responses:
        '200':
          description: Login successful
          content:
            application/json:
              schema:
                type: object
                properties:
                  token:
                    type: string
                    description: JWT access token
                  user:
                    $ref: '#/components/schemas/User'
              examples:
                success:
                  value:
                    token: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
                    user:
                      id: 1
                      email: user@example.com
                      name: John Doe
        '401':
          description: Invalid credentials
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/Error'
              examples:
                invalid:
                  value:
                    error: Invalid email or password

components:
  securitySchemes:
    bearerAuth:
      type: http
      scheme: bearer
      bearerFormat: JWT
      description: JWT token obtained from /auth/login

  schemas:
    User:
      type: object
      required:
        - id
        - email
        - created_at
      properties:
        id:
          type: integer
          description: Unique user identifier
          example: 1
        email:
          type: string
          format: email
          description: User's email address
          example: user@example.com
        name:
          type: string
          nullable: true
          description: User's display name
          example: John Doe
        created_at:
          type: string
          format: date-time
          description: Account creation timestamp
          example: '2026-01-09T10:30:00Z'

    UserCreate:
      type: object
      required:
        - email
        - password
      properties:
        email:
          type: string
          format: email
          description: User's email address
          example: newuser@example.com
        password:
          type: string
          format: password
          minLength: 8
          description: User's password (min 8 characters)
          example: SecurePass123!
        name:
          type: string
          minLength: 1
          maxLength: 100
          description: User's display name
          example: New User

    UserUpdate:
      type: object
      properties:
        email:
          type: string
          format: email
        name:
          type: string
          minLength: 1
          maxLength: 100
        password:
          type: string
          format: password
          minLength: 8

    PaginationMeta:
      type: object
      properties:
        page:
          type: integer
          description: Current page number
        per_page:
          type: integer
          description: Results per page
        total:
          type: integer
          description: Total number of results
        total_pages:
          type: integer
          description: Total number of pages

    Error:
      type: object
      properties:
        error:
          type: string
          description: Error message
        details:
          type: object
          description: Additional error details
          additionalProperties: true

    ValidationError:
      type: object
      properties:
        error:
          type: string
          example: Validation failed
        errors:
          type: object
          description: Field-specific validation errors
          additionalProperties:
            type: array
            items:
              type: string
          example:
            email: ['is invalid']
            password: ['is too short (minimum is 8 characters)']

  responses:
    UnauthorizedError:
      description: Authentication required or token invalid
      content:
        application/json:
          schema:
            $ref: '#/components/schemas/Error'
          examples:
            missing:
              value:
                error: Authentication required
            invalid:
              value:
                error: Invalid or expired token

    NotFoundError:
      description: Resource not found
      content:
        application/json:
          schema:
            $ref: '#/components/schemas/Error'
          examples:
            notFound:
              value:
                error: User not found

    ValidationError:
      description: Request validation failed
      content:
        application/json:
          schema:
            $ref: '#/components/schemas/ValidationError'

    RateLimitError:
      description: Rate limit exceeded
      headers:
        X-RateLimit-Limit:
          schema:
            type: integer
          description: Request limit per hour
        X-RateLimit-Remaining:
          schema:
            type: integer
          description: Remaining requests
        X-RateLimit-Reset:
          schema:
            type: integer
          description: Time when limit resets (Unix timestamp)
      content:
        application/json:
          schema:
            $ref: '#/components/schemas/Error'
          examples:
            exceeded:
              value:
                error: Rate limit exceeded. Try again in 30 minutes.
```

### GraphQL Schema Documentation
```graphql
"""
User Management API
Version: 1.2.0

This API provides user account management and authentication.
"""
schema {
  query: Query
  mutation: Mutation
}

"""
Root query type
"""
type Query {
  """
  Get the currently authenticated user

  Returns null if not authenticated.
  """
  currentUser: User

  """
  Get a specific user by ID

  Requires authentication.
  """
  user(
    "User ID"
    id: ID!
  ): User

  """
  List all users with pagination

  Requires authentication.
  """
  users(
    "Page number (1-indexed)"
    page: Int = 1

    "Results per page (max 100)"
    perPage: Int = 20

    "Sort field"
    sortBy: UserSortField = CREATED_AT

    "Sort direction"
    sortOrder: SortOrder = DESC
  ): UserConnection!
}

"""
Root mutation type
"""
type Mutation {
  """
  Create a new user account

  No authentication required.
  """
  createUser(input: CreateUserInput!): CreateUserPayload!

  """
  Update user account details

  Requires authentication. Users can only update their own account.
  """
  updateUser(input: UpdateUserInput!): UpdateUserPayload!

  """
  Delete user account

  Requires authentication. Users can only delete their own account.
  """
  deleteUser(input: DeleteUserInput!): DeleteUserPayload!

  """
  Authenticate user and receive access token

  No authentication required.
  """
  login(input: LoginInput!): LoginPayload!
}

"""
A registered user account
"""
type User {
  "Unique user identifier"
  id: ID!

  "User's email address"
  email: String!

  "User's display name"
  name: String

  "Account creation timestamp"
  createdAt: DateTime!

  "Last update timestamp"
  updatedAt: DateTime!
}

"""
Paginated user results
"""
type UserConnection {
  "List of users"
  nodes: [User!]!

  "Pagination information"
  pageInfo: PageInfo!

  "Total count of users"
  totalCount: Int!
}

"""
Pagination information
"""
type PageInfo {
  "Current page number"
  page: Int!

  "Results per page"
  perPage: Int!

  "Total number of pages"
  totalPages: Int!

  "Whether there is a next page"
  hasNextPage: Boolean!

  "Whether there is a previous page"
  hasPreviousPage: Boolean!
}

"""
User sort fields
"""
enum UserSortField {
  CREATED_AT
  EMAIL
  NAME
}

"""
Sort direction
"""
enum SortOrder {
  ASC
  DESC
}

"""
ISO 8601 datetime string
"""
scalar DateTime

"""
Input for creating a user
"""
input CreateUserInput {
  "User's email address"
  email: String!

  "User's password (min 8 characters)"
  password: String!

  "User's display name"
  name: String
}

"""
Payload for user creation
"""
type CreateUserPayload {
  "The created user"
  user: User

  "List of errors, if any"
  errors: [UserError!]!
}

"""
Input for updating a user
"""
input UpdateUserInput {
  "User ID"
  id: ID!

  "New email address"
  email: String

  "New display name"
  name: String

  "New password"
  password: String
}

"""
Payload for user update
"""
type UpdateUserPayload {
  "The updated user"
  user: User

  "List of errors, if any"
  errors: [UserError!]!
}

"""
Input for deleting a user
"""
input DeleteUserInput {
  "User ID"
  id: ID!
}

"""
Payload for user deletion
"""
type DeleteUserPayload {
  "Whether deletion was successful"
  success: Boolean!

  "List of errors, if any"
  errors: [UserError!]!
}

"""
Input for login
"""
input LoginInput {
  "User's email address"
  email: String!

  "User's password"
  password: String!
}

"""
Payload for login
"""
type LoginPayload {
  "JWT access token"
  token: String

  "The authenticated user"
  user: User

  "List of errors, if any"
  errors: [UserError!]!
}

"""
User-facing error
"""
type UserError {
  "Error message"
  message: String!

  "Field that caused the error"
  field: String

  "Error code for programmatic handling"
  code: String
}
```

## Format Guidelines

### OpenAPI Best Practices

**Structure:**
1. Info section with version and contact
2. Server URLs for all environments
3. Security schemes definition
4. Paths organized by resource
5. Reusable components (schemas, responses)

**Descriptions:**
- Use present tense
- Be concise but complete
- Include constraints and validation rules
- Mention side effects
- Document rate limits

**Examples:**
- Provide realistic values
- Cover common use cases
- Include error scenarios
- Show authentication headers

### GraphQL Best Practices

**Structure:**
1. Schema description with version
2. Query type with all read operations
3. Mutation type with all write operations
4. Type definitions with descriptions
5. Input types for mutations

**Descriptions:**
- Use triple quotes for multi-line
- Document all fields
- Explain null behavior
- Mention authentication requirements
- Note deprecations

**Naming:**
- Use camelCase for fields
- Use PascalCase for types
- Suffix inputs with "Input"
- Suffix payloads with "Payload"

## Best Practices

1. **Keep Synchronized**: Update docs when code changes
2. **Validate Specs**: Use validators before publishing
3. **Provide Examples**: Real examples for every endpoint
4. **Document Errors**: All possible error responses
5. **Version Properly**: Use semantic versioning
6. **Test Documentation**: Try examples in Swagger UI
7. **Security First**: Document auth requirements clearly
8. **Rate Limits**: Always document limits and throttling

---

**Remember:** API documentation is a contract between frontend and backend. Accuracy and completeness are critical.
