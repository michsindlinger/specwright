# REST API Design Patterns

## URL Structure

```
/api/v1/
├── /projects                    # Project list
├── /projects/:id                # Single project
├── /projects/:id/tasks          # Project tasks
├── /projects/:id/specs          # Project specs
├── /sessions                    # Agent sessions
├── /sessions/:id                # Single session
├── /sessions/:id/messages       # Session messages
└── /health                      # Health check
```

---

## Standard Response Formats

### Success Response

```typescript
// Single resource
{
  "data": {
    "id": "project-1",
    "name": "my-project",
    "path": "/path/to/project"
  }
}

// Collection
{
  "data": [
    { "id": "project-1", "name": "my-project" },
    { "id": "project-2", "name": "other-project" }
  ],
  "meta": {
    "total": 2,
    "page": 1,
    "limit": 20
  }
}
```

### Error Response

```typescript
// Client error (4xx)
{
  "error": "Project not found",
  "code": "NOT_FOUND"
}

// Validation error (400)
{
  "error": "Validation failed",
  "code": "VALIDATION_ERROR",
  "details": [
    { "field": "title", "message": "Title is required" }
  ]
}

// Server error (5xx)
{
  "error": "Internal server error",
  "code": "INTERNAL_ERROR"
}
```

---

## Route Organization

```typescript
// src/server/presentation/routes/index.ts
import { Router } from 'express';
import projectRoutes from './projects.routes';
import sessionRoutes from './sessions.routes';
import healthRoutes from './health.routes';

const router = Router();

router.use('/projects', projectRoutes);
router.use('/sessions', sessionRoutes);
router.use('/health', healthRoutes);

export default router;
```

```typescript
// src/server/presentation/routes/projects.routes.ts
import { Router } from 'express';
import { projectService } from '@services/project.service';
import { wrapAsync } from '../middleware/async.middleware';

const router = Router();

// GET /api/projects
router.get('/', wrapAsync(async (req, res) => {
  const projects = await projectService.getAll();
  res.json({ data: projects });
}));

// GET /api/projects/:id
router.get('/:id', wrapAsync(async (req, res) => {
  const project = await projectService.getById(req.params.id);
  res.json({ data: project });
}));

// GET /api/projects/:id/tasks
router.get('/:id/tasks', wrapAsync(async (req, res) => {
  const project = await projectService.getWithTasks(req.params.id);
  res.json({ data: project.tasks });
}));

export default router;
```

---

## Async Handler Wrapper

```typescript
// src/server/middleware/async.middleware.ts
import { Request, Response, NextFunction, RequestHandler } from 'express';

type AsyncHandler = (
  req: Request,
  res: Response,
  next: NextFunction
) => Promise<unknown>;

export function wrapAsync(fn: AsyncHandler): RequestHandler {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}
```

---

## Request Typing

```typescript
// src/shared/types/api.types.ts
import { Request } from 'express';

// Typed request params
interface ProjectParams {
  id: string;
}

interface SessionParams {
  id: string;
}

// Typed request body
interface CreateSessionBody {
  projectId: string;
}

interface SendMessageBody {
  content: string;
}

// Usage in routes
router.post('/', wrapAsync(async (
  req: Request<{}, {}, CreateSessionBody>,
  res
) => {
  const { projectId } = req.body;
  const session = await sessionService.create(projectId);
  res.status(201).json({ data: session });
}));
```

---

## Validation with Zod

```typescript
// src/server/middleware/validate.middleware.ts
import { z, ZodSchema } from 'zod';
import { Request, Response, NextFunction } from 'express';

export function validateBody<T extends ZodSchema>(schema: T) {
  return (req: Request, res: Response, next: NextFunction) => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      return res.status(400).json({
        error: 'Validation failed',
        code: 'VALIDATION_ERROR',
        details: result.error.errors.map(e => ({
          field: e.path.join('.'),
          message: e.message
        }))
      });
    }
    req.body = result.data;
    next();
  };
}

// Schemas
export const createSessionSchema = z.object({
  projectId: z.string().min(1)
});

export const sendMessageSchema = z.object({
  content: z.string().min(1).max(10000)
});

// Usage
router.post('/', validateBody(createSessionSchema), wrapAsync(async (req, res) => {
  // req.body is validated and typed
}));
```

---

## HTTP Status Codes

| Code | Use Case |
|------|----------|
| 200 | Successful GET, PUT, PATCH |
| 201 | Successful POST (resource created) |
| 204 | Successful DELETE (no content) |
| 400 | Bad request (validation error) |
| 404 | Resource not found |
| 409 | Conflict (resource already exists) |
| 500 | Internal server error |

---

## CORS Configuration

```typescript
// src/server/middleware/cors.middleware.ts
import cors from 'cors';

export const corsMiddleware = cors({
  origin: 'http://localhost:5173', // Vite dev server
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
  credentials: true
});
```

---

## Rate Limiting (Optional)

```typescript
import rateLimit from 'express-rate-limit';

export const rateLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 100, // 100 requests per minute
  message: { error: 'Too many requests', code: 'RATE_LIMITED' }
});
```
