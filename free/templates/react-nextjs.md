# CLAUDE.md - React / Next.js Configuration

## Project Overview

React 19+ with Next.js App Router, TypeScript strict mode, Tailwind CSS for styling, Vitest and React Testing Library for tests. This project follows a component-driven architecture with server components as the default rendering strategy.

## Code Style & Conventions

### TypeScript

- **Strict mode enabled** (`"strict": true` in tsconfig). Never use `any` -- prefer `unknown` and narrow with type guards.
- Prefer `interface` for object shapes that may be extended. Use `type` for unions, intersections, and mapped types.
- Export types from a colocated `types.ts` file or inline when used in a single file only.

```typescript
// Prefer named exports over default exports
export interface UserProfile {
  id: string;
  name: string;
  email: string;
  role: "admin" | "member" | "viewer";
}
```

### React Components

- **Functional components only.** Never use class components.
- Use `function` declarations for page/layout components. Use arrow functions for small inline components.
- Props interface is named `{ComponentName}Props` and declared directly above the component.

```tsx
interface UserCardProps {
  user: UserProfile;
  onSelect?: (id: string) => void;
}

export function UserCard({ user, onSelect }: UserCardProps) {
  return (
    <button
      className="rounded-lg border p-4 hover:bg-gray-50"
      onClick={() => onSelect?.(user.id)}
    >
      <p className="font-medium">{user.name}</p>
      <p className="text-sm text-gray-500">{user.email}</p>
    </button>
  );
}
```

### Hooks

- Custom hooks go in `hooks/` and are named `use{Feature}.ts`.
- Every custom hook returns a well-typed object or tuple, never `any`.
- Avoid `useEffect` for derived state -- compute it during render instead.

```typescript
// hooks/useDebounce.ts
import { useEffect, useState } from "react";

export function useDebounce<T>(value: T, delayMs: number): T {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(timer);
  }, [value, delayMs]);

  return debounced;
}
```

### Naming

| Item | Convention | Example |
|------|-----------|---------|
| Components | PascalCase | `UserCard.tsx` |
| Hooks | camelCase with `use` prefix | `useAuth.ts` |
| Utilities | camelCase | `formatDate.ts` |
| Constants | UPPER_SNAKE_CASE | `MAX_RETRY_COUNT` |
| Route segments | kebab-case | `app/user-settings/page.tsx` |
| CSS classes | Tailwind utility-first | `className="flex items-center gap-2"` |

## File Organization

```
src/
  app/                     # Next.js App Router
    layout.tsx             # Root layout (providers, fonts, metadata)
    page.tsx               # Home page
    (auth)/                # Route group for auth pages
      login/page.tsx
      register/page.tsx
    dashboard/
      page.tsx
      loading.tsx          # Streaming loading UI
      error.tsx            # Error boundary
    api/                   # Route handlers
      users/route.ts
  components/
    ui/                    # Generic reusable primitives (Button, Input, Modal)
    features/              # Feature-specific composed components
    layouts/               # Layout shells (Sidebar, Header, PageWrapper)
  hooks/                   # Custom React hooks
  lib/                     # Non-React utilities, API clients, constants
    api.ts                 # Fetch wrapper with error handling
    constants.ts
    utils.ts
  types/                   # Shared TypeScript types
    index.ts
```

### Key rules

- **One component per file.** The filename matches the component name.
- Co-locate test files: `UserCard.tsx` and `UserCard.test.tsx` in the same directory.
- Server components are the default. Add `"use client"` only when the component needs browser APIs, state, or event handlers.
- Never import server-only code in client components. Use the `server-only` package to guard server modules.

## Testing

### Framework: Vitest + React Testing Library

```bash
npm run test          # run all tests
npm run test:watch    # watch mode
npm run test:coverage # coverage report
```

### Conventions

- Test files live next to the code they test: `Button.test.tsx`.
- Use `describe` / `it` blocks. The `it` description reads as a sentence: `it("renders the user name")`.
- Query elements by **role and accessible name** first. Fall back to `data-testid` only when no accessible query exists.

```tsx
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { UserCard } from "./UserCard";

describe("UserCard", () => {
  const mockUser = { id: "1", name: "Ada", email: "ada@test.com", role: "admin" as const };

  it("renders the user name and email", () => {
    render(<UserCard user={mockUser} />);
    expect(screen.getByText("Ada")).toBeInTheDocument();
    expect(screen.getByText("ada@test.com")).toBeInTheDocument();
  });

  it("calls onSelect with the user id when clicked", async () => {
    const onSelect = vi.fn();
    render(<UserCard user={mockUser} onSelect={onSelect} />);
    await userEvent.click(screen.getByRole("button"));
    expect(onSelect).toHaveBeenCalledWith("1");
  });
});
```

### Coverage targets

- Statements: 80%+
- Branches: 75%+
- Aim for meaningful coverage, not inflated numbers. Skip testing pure wrappers and static markup.

## Build & Deploy

### Commands

```bash
npm run dev           # Next.js dev server with Turbopack
npm run build         # Production build
npm run start         # Start production server
npm run lint          # ESLint
npm run typecheck     # tsc --noEmit
```

### Environment variables

- `.env.local` for local secrets (git-ignored).
- `NEXT_PUBLIC_` prefix for client-exposed variables.
- Validate env vars at startup with `zod` or `@t3-oss/env-nextjs`.
- **Never hardcode secrets.** Access them only through `process.env` on the server side.

### Tailwind CSS

- Use the Tailwind utility classes directly in JSX. Avoid custom CSS files except for global resets.
- Extract repeated patterns into components, not into `@apply` directives.
- Configure the theme in `tailwind.config.ts` for project-specific design tokens (colors, spacing, fonts).

## Best Practices

### Do

- Use React Server Components for data fetching -- call the database or API directly in the component.
- Use `Suspense` boundaries with `loading.tsx` for streaming.
- Use `next/image` for all images (automatic optimization, lazy loading).
- Use `next/link` for navigation (prefetching, client-side transitions).
- Memoize expensive computations with `useMemo`. Memoize callback references with `useCallback` only when passed to memoized children.
- Use `useActionState` for form mutations in React 19+.

### Don't

- Don't use `useEffect` to sync props to state. Derive state during render.
- Don't fetch data in `useEffect` in components that can be server components.
- Don't use barrel `index.ts` files that re-export everything -- they break tree-shaking.
- Don't store server state in client-side stores. Use React Server Components or a cache library like TanStack Query.
- Don't suppress TypeScript errors with `@ts-ignore`. Use `@ts-expect-error` with a comment explaining why, and only as a last resort.

## Security

- [ ] All user input is validated before use (both client and server side).
- [ ] API route handlers check authentication and authorization.
- [ ] Environment secrets are never exposed to the client (no `NEXT_PUBLIC_` prefix for secrets).
- [ ] HTML rendering uses React's built-in XSS protection. Never use `dangerouslySetInnerHTML` with unsanitized input.
- [ ] Dependencies are audited regularly (`npm audit`).
- [ ] Content Security Policy headers are configured in `next.config.ts`.
- [ ] CSRF protection is enabled for mutation endpoints.
- [ ] Rate limiting is applied to public API routes.
