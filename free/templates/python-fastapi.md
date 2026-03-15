# CLAUDE.md - Python / FastAPI Configuration

## Project Overview

Python 3.12+ backend with FastAPI, Pydantic v2 for validation, SQLAlchemy 2.0 (async) with Alembic migrations, pytest for testing, and Docker for deployment. The project follows a modular service-oriented architecture with strict type hints throughout.

## Code Style & Conventions

### Python Standards

- **Python 3.12+ required.** Use modern syntax: `type` statements, `match/case`, `X | Y` union types.
- Follow PEP 8. Line length limit: 88 characters (Black formatter default).
- Use **Ruff** for linting and formatting (replaces Black, isort, flake8 in a single tool).
- All functions, methods, and module-level variables must have **type hints**. No untyped public API.

```python
# Use modern union syntax, not Optional
def find_user(user_id: str) -> User | None:
    ...

# Use built-in generics, not typing.List / typing.Dict
def get_tags(post_id: str) -> list[str]:
    ...
```

### Naming

| Item | Convention | Example |
|------|-----------|---------|
| Files/modules | snake_case | `user_service.py` |
| Classes | PascalCase | `UserService` |
| Functions/variables | snake_case | `find_user_by_id` |
| Constants | UPPER_SNAKE_CASE | `MAX_LOGIN_ATTEMPTS` |
| Pydantic models | PascalCase with suffix | `UserCreate`, `UserResponse` |
| Database tables | snake_case, plural | `user_sessions` |
| API endpoints | kebab-case, plural | `/api/v1/user-profiles` |

### Docstrings

Use Google-style docstrings for all public functions, classes, and modules.

```python
def create_user(data: UserCreate) -> User:
    """Create a new user and send a welcome email.

    Args:
        data: Validated user creation payload.

    Returns:
        The newly created user record.

    Raises:
        ConflictError: If a user with the same email already exists.
    """
```

## File Organization

```
src/
  main.py                  # FastAPI app factory, lifespan, middleware
  config.py                # Settings with pydantic-settings
  dependencies.py          # FastAPI dependency injection (get_db, get_current_user)
  routers/
    __init__.py
    users.py               # Route definitions (thin -- delegates to services)
    auth.py
    health.py
  services/
    user_service.py         # Business logic
    auth_service.py
    email_service.py
  repositories/
    user_repository.py      # Database queries via SQLAlchemy
  models/
    user.py                 # SQLAlchemy ORM models
    base.py                 # DeclarativeBase, common mixins
  schemas/
    user.py                 # Pydantic request/response schemas
    common.py               # Shared schemas (pagination, errors)
  lib/
    database.py             # Engine, async session factory
    security.py             # Password hashing, JWT encode/decode
    errors.py               # Custom exception classes
    logger.py               # Structured logging (structlog)
  db/
    migrations/             # Alembic migration versions
    alembic.ini
    env.py
tests/
  conftest.py              # Fixtures (async client, test DB, factories)
  test_users.py
  test_auth.py
  factories/               # Test data factories
    user_factory.py
```

### Layer rules

- **Routers** define endpoints, parse path/query params, and call services. No SQL, no business logic.
- **Services** contain business logic. They receive validated Pydantic models and call repositories. They raise custom exceptions for known failures.
- **Repositories** execute SQLAlchemy queries and return ORM model instances. No HTTP concepts.
- **Schemas** (Pydantic) define the API contract: what comes in and what goes out. They are separate from ORM models.

## Pydantic Schemas

Separate input schemas from output schemas. Never expose internal fields (like hashed passwords) in responses.

```python
from pydantic import BaseModel, EmailStr, Field

class UserCreate(BaseModel):
    name: str = Field(min_length=1, max_length=100)
    email: EmailStr
    password: str = Field(min_length=8, max_length=128)

class UserResponse(BaseModel):
    id: str
    name: str
    email: str
    created_at: datetime

    model_config = {"from_attributes": True}

class UserList(BaseModel):
    data: list[UserResponse]
    total: int
    page: int
    page_size: int
```

## API Patterns

### REST Conventions

```python
from fastapi import APIRouter, Depends, status

router = APIRouter(prefix="/api/v1/users", tags=["users"])

@router.get("", response_model=UserList)
async def list_users(
    page: int = 1,
    page_size: int = 20,
    db: AsyncSession = Depends(get_db),
):
    ...

@router.get("/{user_id}", response_model=UserResponse)
async def get_user(user_id: str, db: AsyncSession = Depends(get_db)):
    ...

@router.post("", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
async def create_user(data: UserCreate, db: AsyncSession = Depends(get_db)):
    ...

@router.patch("/{user_id}", response_model=UserResponse)
async def update_user(user_id: str, data: UserUpdate, db: AsyncSession = Depends(get_db)):
    ...

@router.delete("/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_user(user_id: str, db: AsyncSession = Depends(get_db)):
    ...
```

### Error Handling

Define custom exception classes and register global exception handlers in the app factory.

```python
# lib/errors.py
class AppError(Exception):
    def __init__(self, message: str, status_code: int, code: str):
        self.message = message
        self.status_code = status_code
        self.code = code

class NotFoundError(AppError):
    def __init__(self, resource: str):
        super().__init__(f"{resource} not found", 404, "NOT_FOUND")

class ConflictError(AppError):
    def __init__(self, message: str):
        super().__init__(message, 409, "CONFLICT")
```

```python
# main.py (register handler)
@app.exception_handler(AppError)
async def app_error_handler(request: Request, exc: AppError):
    return JSONResponse(
        status_code=exc.status_code,
        content={"error": {"code": exc.code, "message": exc.message}},
    )
```

### Dependency Injection

Use FastAPI's `Depends()` for database sessions, auth, and shared services.

```python
# dependencies.py
from collections.abc import AsyncGenerator

async def get_db() -> AsyncGenerator[AsyncSession, None]:
    async with async_session_factory() as session:
        yield session

async def get_current_user(
    token: str = Depends(oauth2_scheme),
    db: AsyncSession = Depends(get_db),
) -> User:
    payload = decode_jwt(token)
    user = await user_repository.find_by_id(db, payload["sub"])
    if user is None:
        raise AppError("Invalid token", 401, "UNAUTHORIZED")
    return user
```

## Database

### SQLAlchemy 2.0 (async)

```python
# models/base.py
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column
from datetime import datetime
import uuid

class Base(DeclarativeBase):
    pass

class TimestampMixin:
    created_at: Mapped[datetime] = mapped_column(default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(default=datetime.utcnow, onupdate=datetime.utcnow)

# models/user.py
class User(Base, TimestampMixin):
    __tablename__ = "users"

    id: Mapped[str] = mapped_column(primary_key=True, default=lambda: str(uuid.uuid4()))
    name: Mapped[str] = mapped_column(String(100))
    email: Mapped[str] = mapped_column(String(255), unique=True, index=True)
    password_hash: Mapped[str] = mapped_column(String(255))
```

### Alembic Migrations

```bash
alembic revision --autogenerate -m "create users table"
alembic upgrade head
alembic downgrade -1
```

- Every model change requires a migration. Never modify the database schema by hand.
- Review auto-generated migrations before applying. Alembic does not detect all changes (renames, constraint changes).
- Migrations must be reversible (implement both `upgrade` and `downgrade`).

## Configuration

Use `pydantic-settings` to load and validate environment variables at startup.

```python
# config.py
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    app_name: str = "MyApp"
    debug: bool = False
    database_url: str
    jwt_secret: str
    jwt_expiry_minutes: int = 15

    model_config = {"env_file": ".env", "env_file_encoding": "utf-8"}

settings = Settings()
```

## Testing

### Framework: pytest + httpx (async)

```bash
pytest                      # run all tests
pytest --cov=src            # with coverage
pytest -x                   # stop on first failure
pytest -k "test_create"     # filter by name
```

### Test setup

```python
# tests/conftest.py
import pytest_asyncio
from httpx import ASGITransport, AsyncClient
from src.main import create_app
from src.lib.database import Base, engine

@pytest_asyncio.fixture
async def app():
    app = create_app()
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    yield app
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)

@pytest_asyncio.fixture
async def client(app):
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as c:
        yield c
```

### Test example

```python
# tests/test_users.py
import pytest

@pytest.mark.asyncio
async def test_create_user(client):
    response = await client.post("/api/v1/users", json={
        "name": "Ada",
        "email": "ada@test.com",
        "password": "Str0ng!Pass",
    })
    assert response.status_code == 201
    data = response.json()["data"]
    assert data["name"] == "Ada"
    assert "password" not in data

@pytest.mark.asyncio
async def test_create_user_duplicate_email(client):
    payload = {"name": "Ada", "email": "ada@test.com", "password": "Str0ng!Pass"}
    await client.post("/api/v1/users", json=payload)
    response = await client.post("/api/v1/users", json=payload)
    assert response.status_code == 409
```

### Coverage targets

- Statements: 80%+
- Branches: 75%+
- Every endpoint has at least one happy-path and one error-path test.

## Build & Deploy

### Commands

```bash
# Development
uv run uvicorn src.main:app --reload --port 8000

# Production
uv run uvicorn src.main:app --host 0.0.0.0 --port 8000 --workers 4

# Quality
uv run ruff check src/ tests/
uv run ruff format src/ tests/
uv run mypy src/
```

### Docker

```dockerfile
FROM python:3.12-slim AS base
WORKDIR /app
RUN pip install uv

COPY pyproject.toml uv.lock ./
RUN uv sync --frozen --no-dev

COPY src/ src/
COPY alembic.ini .
COPY db/ db/

EXPOSE 8000
CMD ["uv", "run", "uvicorn", "src.main:app", "--host", "0.0.0.0", "--port", "8000", "--workers", "4"]
```

### Environment variables

- `.env` for local development (git-ignored).
- Validate all env vars at startup via `pydantic-settings`. Fail fast if anything is missing.
- Never hardcode secrets, database URLs, or API keys.

## Best Practices

### Do

- Use `async def` for all route handlers and database operations.
- Use FastAPI's dependency injection for cross-cutting concerns (auth, DB sessions, config).
- Return Pydantic `response_model` from every endpoint to guarantee the response shape.
- Use `structlog` for structured JSON logging in production.
- Implement a health check endpoint (`GET /health`) that verifies database connectivity.
- Use `lifespan` context manager for startup/shutdown logic (connection pools, background tasks).

### Don't

- Don't use `from sqlalchemy import *`. Import only what you need.
- Don't return ORM model instances directly from endpoints. Convert to Pydantic schemas.
- Don't write raw SQL strings with f-string interpolation. Use parameterized queries or ORM.
- Don't use `print()`. Use the structured logger.
- Don't catch broad `Exception` in route handlers. Let the global handler deal with it.
- Don't put business logic in routers. Keep them thin.

## Security

- [ ] All inputs validated with Pydantic models (request body, query params, path params).
- [ ] SQL injection prevented via SQLAlchemy ORM or parameterized queries.
- [ ] Passwords hashed with bcrypt or argon2 via `passlib`. Never stored in plaintext.
- [ ] JWT secrets are at least 32 characters, loaded from environment.
- [ ] CORS middleware configured with explicit allowed origins.
- [ ] Rate limiting applied to auth endpoints (slowapi or custom middleware).
- [ ] No sensitive data in logs or error responses (passwords, tokens, PII).
- [ ] File uploads validated by MIME type and size.
- [ ] Dependencies audited regularly (`pip-audit` or `safety`).
- [ ] Production runs with a non-root user inside the Docker container.
