# CLAUDE.md - Node.js / Express Configuration

## Project Overview

Node.js backend with Express 5, TypeScript strict mode, structured JSON logging, Vitest for testing, and Docker for deployment. The API follows REST conventions with layered architecture: routes, controllers, services, repositories.

## Code Style & Conventions

### TypeScript

- **Strict mode enabled.** Never use `any`. Prefer `unknown` for untyped external data and validate with Zod or a similar runtime validator.
- Use ES module syntax (`import/export`). Set `"type": "module"` in `package.json`.
- Prefer `interface` for request/response shapes. Use `type` for unions and utility types.

```typescript
interface CreateUserBody {
  name: string;
  email: string;
  password: string;
}

interface UserResponse {
  id: string;
  name: string;
  email: string;
  createdAt: string;
}
```

### Error Handling

- Define a custom `AppError` class. All known errors extend it with an HTTP status code.
- Use a centralized error-handling middleware as the last middleware in the chain.
- Never leak stack traces or internal details in production responses.

```typescript
// lib/errors.ts
export class AppError extends Error {
  constructor(
    message: string,
    public statusCode: number,
    public code: string
  ) {
    super(message);
    this.name = "AppError";
  }
}

export class NotFoundError extends AppError {
  constructor(resource: string) {
    super(`${resource} not found`, 404, "NOT_FOUND");
  }
}

export class ValidationError extends AppError {
  constructor(message: string) {
    super(message, 400, "VALIDATION_ERROR");
  }
}
```

```typescript
// middleware/errorHandler.ts
import type { ErrorRequestHandler } from "express";

export const errorHandler: ErrorRequestHandler = (err, _req, res, _next) => {
  if (err instanceof AppError) {
    res.status(err.statusCode).json({ error: { code: err.code, message: err.message } });
    return;
  }
  logger.error("Unhandled error", { error: err });
  res.status(500).json({ error: { code: "INTERNAL_ERROR", message: "Something went wrong" } });
};
```

### Naming

| Item | Convention | Example |
|------|-----------|---------|
| Files | kebab-case | `user-service.ts` |
| Classes | PascalCase | `UserService` |
| Functions/variables | camelCase | `findUserById` |
| Constants | UPPER_SNAKE_CASE | `MAX_LOGIN_ATTEMPTS` |
| Database tables | snake_case | `user_sessions` |
| API endpoints | kebab-case, plural nouns | `/api/v1/user-profiles` |

## File Organization

```
src/
  app.ts                   # Express app setup (middleware, routes, error handler)
  server.ts                # HTTP server startup, graceful shutdown
  routes/
    index.ts               # Route aggregator
    user.routes.ts          # Route definitions (thin -- delegates to controllers)
  controllers/
    user.controller.ts      # Request parsing, response formatting
  services/
    user.service.ts         # Business logic, orchestration
  repositories/
    user.repository.ts      # Database queries (raw SQL or query builder)
  middleware/
    auth.ts                 # JWT verification
    validate.ts             # Zod schema validation middleware
    errorHandler.ts         # Centralized error handling
    requestId.ts            # Attach unique ID to each request
  lib/
    db.ts                   # Database connection pool
    logger.ts               # Structured logger (pino)
    config.ts               # Environment variable loader with validation
    errors.ts               # Custom error classes
  types/
    index.ts                # Shared TypeScript types
  db/
    migrations/             # SQL migration files (numbered)
    seeds/                  # Seed data for development
tests/
  integration/             # Supertest integration tests
  unit/                    # Pure unit tests
```

### Layer rules

- **Routes** define HTTP method + path + middleware chain. No business logic.
- **Controllers** parse `req.params`, `req.query`, `req.body`, call services, and format the response. No database access.
- **Services** contain business logic. They call repositories and other services. They throw `AppError` subclasses for known failure cases.
- **Repositories** execute database queries and return plain objects. No HTTP concepts.
- Each layer depends only on the layer below it. Never skip layers.

## API Patterns

### REST Conventions

```
GET    /api/v1/users          # List (paginated)
GET    /api/v1/users/:id      # Get by ID
POST   /api/v1/users          # Create
PUT    /api/v1/users/:id      # Full update
PATCH  /api/v1/users/:id      # Partial update
DELETE /api/v1/users/:id      # Delete
```

### Request Validation

Validate every incoming request body, query, and params with Zod. Create a reusable validation middleware.

```typescript
// middleware/validate.ts
import type { RequestHandler } from "express";
import type { ZodSchema } from "zod";

export function validate(schema: ZodSchema): RequestHandler {
  return (req, _res, next) => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      throw new ValidationError(result.error.issues.map(i => i.message).join(", "));
    }
    req.body = result.data;
    next();
  };
}
```

### Response format

```json
{
  "data": { "id": "abc", "name": "Ada" },
  "meta": { "requestId": "req-123" }
}
```

For lists:

```json
{
  "data": [{ "id": "abc", "name": "Ada" }],
  "meta": { "total": 42, "page": 1, "pageSize": 20, "requestId": "req-123" }
}
```

For errors:

```json
{
  "error": { "code": "NOT_FOUND", "message": "User not found" }
}
```

## Authentication

- Use JWTs for stateless API auth. Short-lived access tokens (15 min) + longer refresh tokens (7 days).
- Store refresh tokens in the database. Revoke on logout.
- Hash passwords with `bcryptjs` (or `argon2`). Never store plaintext passwords.
- Protect routes with an `auth` middleware that verifies the token and attaches `req.user`.

```typescript
// middleware/auth.ts
import jwt from "jsonwebtoken";

export const auth: RequestHandler = (req, _res, next) => {
  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer ")) {
    throw new AppError("Missing token", 401, "UNAUTHORIZED");
  }
  try {
    const payload = jwt.verify(header.slice(7), config.jwtSecret);
    req.user = payload as TokenPayload;
    next();
  } catch {
    throw new AppError("Invalid token", 401, "UNAUTHORIZED");
  }
};
```

## Database

- Use a query builder (Knex, Kysely, or Drizzle) or raw SQL with parameterized queries. Never concatenate user input into SQL strings.
- Migrations are numbered sequential files (`001_create_users.sql`). Run them on startup or via a CLI command.
- Use connection pooling. Configure pool size via environment variables.
- Wrap multi-step operations in database transactions.

## Testing

### Framework: Vitest + Supertest

```bash
npm run test          # run all tests
npm run test:watch    # watch mode
npm run test:coverage # coverage report
```

### Integration tests (API level)

```typescript
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import request from "supertest";
import { app } from "../../src/app.js";

describe("POST /api/v1/users", () => {
  it("creates a user and returns 201", async () => {
    const res = await request(app)
      .post("/api/v1/users")
      .send({ name: "Ada", email: "ada@test.com", password: "Str0ng!Pass" });

    expect(res.status).toBe(201);
    expect(res.body.data).toMatchObject({ name: "Ada", email: "ada@test.com" });
    expect(res.body.data).not.toHaveProperty("password");
  });

  it("returns 400 when email is missing", async () => {
    const res = await request(app)
      .post("/api/v1/users")
      .send({ name: "Ada", password: "Str0ng!Pass" });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("VALIDATION_ERROR");
  });
});
```

### Unit tests (service level)

- Mock repositories to isolate business logic.
- Test both happy paths and error cases.

### Coverage targets

- Statements: 80%+
- Branches: 75%+
- Integration tests cover every endpoint. Unit tests cover service logic.

## Build & Deploy

### Commands

```bash
npm run dev           # ts-node-dev / tsx watch mode
npm run build         # tsc to dist/
npm run start         # node dist/server.js
npm run lint          # ESLint
npm run typecheck     # tsc --noEmit
npm run db:migrate    # Run pending migrations
npm run db:seed       # Seed development data
```

### Docker

```dockerfile
FROM node:22-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM node:22-alpine
WORKDIR /app
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/package*.json ./
RUN npm ci --omit=dev
EXPOSE 3000
CMD ["node", "dist/server.js"]
```

### Environment variables

- Load from `.env` in development (git-ignored).
- Validate all env vars at startup with Zod. Fail fast if any required variable is missing.
- Never hardcode secrets, connection strings, or API keys.

```typescript
// lib/config.ts
import { z } from "zod";

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
  PORT: z.coerce.number().default(3000),
  DATABASE_URL: z.string().url(),
  JWT_SECRET: z.string().min(32),
});

export const config = envSchema.parse(process.env);
```

## Best Practices

### Do

- Return appropriate HTTP status codes: 200 OK, 201 Created, 204 No Content, 400 Bad Request, 401 Unauthorized, 403 Forbidden, 404 Not Found, 409 Conflict, 422 Unprocessable Entity, 500 Internal Error.
- Log structured JSON (use pino). Include `requestId`, `userId`, `method`, `path`, and `duration` in every request log.
- Implement graceful shutdown: close the HTTP server, drain the connection pool, finish in-flight requests.
- Use `helmet` middleware for security headers.
- Use `cors` middleware with an explicit origin allowlist.
- Version your API (`/api/v1/`) from day one.

### Don't

- Don't use `express.Router()` as a dumping ground for logic. Keep routes thin.
- Don't return 200 for everything. Use the correct status code.
- Don't log sensitive data (passwords, tokens, PII).
- Don't rely on `try/catch` in every controller. Use the centralized error handler.
- Don't use `console.log`. Use the structured logger.

## Security

- [ ] All inputs validated with Zod schemas (body, params, query).
- [ ] Parameterized queries for all database access. No string concatenation.
- [ ] Passwords hashed with bcrypt (cost factor 12+) or argon2.
- [ ] JWT secrets are at least 32 characters, loaded from environment.
- [ ] Rate limiting applied to auth endpoints (express-rate-limit).
- [ ] CORS configured with explicit allowed origins.
- [ ] Helmet middleware enabled for security headers.
- [ ] No sensitive data in logs or error responses.
- [ ] Dependencies audited regularly (`npm audit`).
- [ ] File uploads validated by type and size. Stored outside the webroot.
