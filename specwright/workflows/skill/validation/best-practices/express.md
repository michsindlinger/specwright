---
description: Express.js API development best practices for validation
version: 1.0
framework: express
category: api
---

# Express Best Practices

## Router Organization

### Route Definition
```typescript
// routes/users.ts
import express from 'express';
import { UserController } from '../controllers/user.controller';
import { authMiddleware } from '../middleware/auth';
import { validateUser } from '../middleware/validation';

const router = express.Router();
const controller = new UserController();

router.get('/', controller.getAll);
router.get('/:id', controller.getById);
router.post('/', validateUser, controller.create);
router.put('/:id', authMiddleware, validateUser, controller.update);
router.delete('/:id', authMiddleware, controller.delete);

export default router;
```

**Key Points:**
- Separate route files by resource
- Use express.Router() for modularity
- Apply middleware at route level
- Keep routes thin (delegate to controllers)
- Export router as default

## Controller Layer

### Async Controller Pattern
```typescript
// controllers/user.controller.ts
import { Request, Response, NextFunction } from 'express';
import { UserService } from '../services/user.service';

export class UserController {
  private userService: UserService;

  constructor() {
    this.userService = new UserService();
  }

  getAll = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const users = await this.userService.findAll();
      res.json({ data: users, count: users.length });
    } catch (error) {
      next(error); // Pass to error handler
    }
  };

  getById = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const user = await this.userService.findById(req.params.id);
      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }
      res.json({ data: user });
    } catch (error) {
      next(error);
    }
  };

  create = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const user = await this.userService.create(req.body);
      res.status(201).json({ data: user });
    } catch (error) {
      next(error);
    }
  };
}
```

**Key Points:**
- Use async/await (not callbacks or raw promises)
- Destructure req.params, req.body, req.query
- Use try/catch and pass errors to next()
- Return proper HTTP status codes
- Consistent response format

## Middleware

### Validation Middleware
```typescript
import { body, validationResult } from 'express-validator';

export const validateUser = [
  body('email').isEmail().normalizeEmail(),
  body('name').trim().isLength({ min: 1, max: 100 }),
  body('age').optional().isInt({ min: 18 }),

  (req: Request, res: Response, next: NextFunction) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    next();
  }
];
```

### Error Handling Middleware
```typescript
// middleware/error-handler.ts
export const errorHandler = (
  err: any,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  console.error('Error:', err);

  if (err.name === 'ValidationError') {
    return res.status(400).json({
      error: 'Validation failed',
      details: err.details
    });
  }

  if (err.name === 'UnauthorizedError') {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  res.status(err.status || 500).json({
    error: err.message || 'Internal server error'
  });
};

// app.ts
app.use(errorHandler); // Register last
```

**Key Points:**
- Register error middleware last
- 4 parameters (err, req, res, next)
- Handle different error types
- Don't expose stack traces in production
- Log errors for debugging

## Service Layer

### Service Organization
```typescript
// services/user.service.ts
import { UserRepository } from '../repositories/user.repository';
import { User, CreateUserDto } from '../types';

export class UserService {
  private repository: UserRepository;

  constructor() {
    this.repository = new UserRepository();
  }

  async findAll(): Promise<User[]> {
    return this.repository.findAll();
  }

  async findById(id: string): Promise<User | null> {
    return this.repository.findById(id);
  }

  async create(dto: CreateUserDto): Promise<User> {
    // Business logic here
    const user = await this.repository.create(dto);
    // Additional operations (send email, etc.)
    return user;
  }
}
```

**Key Points:**
- Separate business logic from routes/controllers
- Use dependency injection pattern
- Return promises
- Handle business validation
- Keep services focused (single responsibility)

## Security

### Basic Security Setup
```typescript
import helmet from 'helmet';
import cors from 'cors';
import rateLimit from 'express-rate-limit';

// Security headers
app.use(helmet());

// CORS configuration
app.use(cors({
  origin: process.env.ALLOWED_ORIGINS?.split(','),
  credentials: true
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP'
});
app.use('/api/', limiter);

// Body parser with limits
app.use(express.json({ limit: '10mb' }));
```

**Key Points:**
- Use helmet for security headers
- Configure CORS properly
- Implement rate limiting
- Limit request body size
- Don't trust user input

## Anti-Patterns to Avoid

### ❌ Blocking Operations
```typescript
// DON'T DO THIS
app.get('/users', (req, res) => {
  const users = fs.readFileSync('users.json'); // Blocks event loop
  res.json(JSON.parse(users));
});

// DO THIS
app.get('/users', async (req, res) => {
  const users = await fs.promises.readFile('users.json');
  res.json(JSON.parse(users));
});
```

### ❌ Not Using Error Middleware
```typescript
// DON'T DO THIS - Try/catch everywhere
app.get('/users', async (req, res) => {
  try {
    const users = await getUsers();
    res.json(users);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// DO THIS - Use error middleware
app.get('/users', async (req, res, next) => {
  try {
    const users = await getUsers();
    res.json(users);
  } catch (error) {
    next(error); // Let middleware handle it
  }
});
```

## Quick Reference

**Routes:**
- ✅ express.Router() for organization
- ✅ Apply middleware at route level
- ✅ RESTful conventions
- ✅ Async route handlers

**Controllers:**
- ✅ Async/await pattern
- ✅ Pass errors to next()
- ✅ Proper status codes
- ✅ Consistent response format

**Middleware:**
- ✅ Validation middleware before controllers
- ✅ Error handling middleware last
- ✅ Authentication middleware for protected routes

**Security:**
- ✅ helmet for headers
- ✅ CORS configuration
- ✅ Rate limiting
- ✅ Input validation
- ❌ Never trust user input
