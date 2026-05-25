# projectPLATFORM

## Stack

- **Backend**: NestJS 11 + TypeScript + Prisma 7 + PostgreSQL 15
- **Frontend**: React 19 + TypeScript + Vite + Tailwind CSS 4 + shadcn/ui + React Router
- **Infrastructure**: Docker Compose, Nginx reverse proxy, MinIO (S3)
- **State**: TanStack Query (server state), React Context (UI state)
- **Forms**: React Hook Form + Zod
- **Notifications**: Sonner (toast)
- **Icons**: Lucide React
- **Auth**: JWT (access + refresh), Passport, bcrypt
- **Security**: Helmet, Throttler, ValidationPipe, class-validator
- **Testing**: Jest (backend), Vitest + Testing Library (frontend), Playwright (E2E)
- **CI/CD**: GitHub Actions (lint, type-check, test, build)

## Commands

```bash
# Root
npm run dev          # Start all services via Docker Compose
npm run dev:stop     # Stop all services

# Backend (from /backend)
npm run start:dev    # NestJS dev with hot reload
npm run build        # Production build
npm run test         # Unit tests
npm run test:e2e     # E2E tests
npx prisma migrate dev   # Run migrations
npx prisma generate      # Generate Prisma client

# Frontend (from /frontend)
npm run dev          # Vite dev server
npm run build        # Production build
npm run lint         # ESLint
npm run test         # Vitest unit tests
npm run test:watch   # Vitest watch mode
npm run test:e2e     # Playwright E2E tests
npm run test:e2e:ui  # Playwright UI mode

# Production
docker compose -f docker-compose.prod.yml up --build
```

## Project Structure

```
backend/
  src/
    modules/          # Feature modules (each has controller, service, module, dto/)
    common/           # Guards, decorators, interceptors, filters, pipes
    prisma/           # PrismaService (global module)
    health/           # Health check endpoint
  prisma/
    schema.prisma     # Database schema
    migrations/       # Versioned migrations

frontend/
  src/
    components/
      ui/             # shadcn/ui primitives (Button, Card, Input, ThemeToggle, ErrorBoundary, etc.)
      layout/         # Layout components (Header, RootLayout)
      examples/       # Demo/example components (SampleForm, SampleTable, etc.)
      shared/         # Reusable business components
    pages/            # Route pages (dashboard.tsx, not-found.tsx)
    features/         # Feature-based modules (each has components/, hooks/, types/)
    hooks/            # Global custom hooks
    lib/              # Utilities (api.ts, utils.ts, constants.ts)
    providers/        # React context providers (QueryProvider, ThemeProvider)
    router.tsx        # React Router configuration
    types/            # Shared TypeScript types/interfaces
```

---

## Frontend Rules

### Components

- Use functional components only. No class components.
- shadcn/ui is the component library. Add new primitives via `npx shadcn@latest add <component>`. Never write custom versions of components that shadcn/ui already provides.
- Every component file exports one component. File name matches component name in kebab-case.
- Use `cn()` from `@/lib/utils` for conditional class merging. Never concatenate class strings manually.
- Props interfaces go in the same file, named `{ComponentName}Props`.
- Destructure props in the function signature.

### Styling

- Tailwind CSS only. No CSS modules, no styled-components, no inline `style={}`.
- Use design tokens (CSS variables) for all colors: `bg-primary`, `text-foreground`, `border-border`. Never use raw color values like `bg-blue-500` or `#hex` or `oklch(...)` in components.
- Responsive: mobile-first. Use `sm:`, `md:`, `lg:` breakpoints.
- Spacing: use Tailwind scale (`p-4`, `gap-6`, `mt-2`). No arbitrary values like `p-[13px]` unless truly necessary.
- Dark mode works automatically via CSS variables. Do not add manual `dark:` prefixes to components — the token system handles it.

### State Management

- Server state: TanStack Query. All API data must go through `useQuery`/`useMutation`.
- UI state (theme, sidebar, modals): React Context in `/providers`.
- Local component state: `useState`/`useReducer` only for ephemeral UI state.
- Never store server data in `useState`. Never duplicate query cache.

### Forms

- React Hook Form + Zod for all forms. Define Zod schemas, infer types with `z.infer<typeof schema>`.
- Validation messages in Russian.
- Use `zodResolver` from `@hookform/resolvers/zod`.

### API Layer

- Use `apiFetch<T>()` from `@/lib/api` for all backend calls.
- Never use raw `fetch()` in components.
- TanStack Query keys: `[resource, ...params]` pattern, e.g. `['users', userId]`.

### Error Handling

- Wrap the app in an `ErrorBoundary` component.
- Show user-friendly error states, never raw error messages.
- Use toast notifications for action feedback (success/error).
- Log errors to console in development only.

### Accessibility

- All interactive elements must be keyboard-accessible.
- Images: always provide `alt` text.
- Forms: associate `<label>` with inputs or use `aria-label`.
- Use semantic HTML: `<nav>`, `<main>`, `<section>`, `<article>`, `<header>`, `<footer>`.

---

## Backend Rules

### Architecture

- NestJS module-per-feature. Each feature gets its own directory under `src/` with: `*.module.ts`, `*.controller.ts`, `*.service.ts`, `dto/` directory.
- Controllers handle HTTP only (params, body, response). No business logic in controllers.
- Services contain business logic. Services call PrismaService for DB access.
- DTOs use `class-validator` decorators for input validation. Always validate.

### API Design

- RESTful endpoints. Use HTTP methods correctly: GET (read), POST (create), PATCH (update), DELETE (remove).
- Prefix all routes with `/api` is handled by Nginx. Controller paths start from the resource: `@Controller('users')`.
- Return consistent response shapes. Errors follow `{ statusCode, message, error }` NestJS format.
- Paginated lists return `{ data: T[], meta: { total, page, limit } }`.

### Database

- Prisma is the ORM. All schema changes go through `prisma migrate dev`.
- Use `cuid()` for IDs. Include `createdAt` and `updatedAt` on all models.
- Add `@unique` constraints and indexes for fields used in lookups.
- Never write raw SQL unless Prisma cannot express the query.

### Security

- `ValidationPipe` must be global with `whitelist: true` and `forbidNonWhitelisted: true`.
- Use `@nestjs/helmet` for security headers.
- Rate limiting on auth endpoints via `@nestjs/throttler`.
- CORS origins must be explicitly configured. Never use `true` (allow-all).
- Sensitive env vars: never log, never return in API responses.
- Authentication: JWT-based. Access token in header, refresh token in httpOnly cookie.

### Error Handling

- Use NestJS built-in exception filters. Throw `HttpException` subclasses.
- Never expose stack traces or internal details in production responses.
- Log errors with NestJS Logger, not `console.log`.

---

## Design System

### Theme

- The app supports three modes: `light`, `dark`, `system`. System follows `prefers-color-scheme`.
- User preference stored in `localStorage` key `theme`.
- All colors defined as CSS variables in `index.css` using oklch color space.
- Components use semantic token names only (`--primary`, `--background`, `--destructive`, etc.).

### Color Tokens

| Token | Purpose |
|---|---|
| `--background` / `--foreground` | Page background and text |
| `--card` / `--card-foreground` | Card surfaces |
| `--primary` / `--primary-foreground` | Primary actions (buttons, links) |
| `--secondary` / `--secondary-foreground` | Secondary actions |
| `--muted` / `--muted-foreground` | Subtle backgrounds, placeholder text |
| `--accent` / `--accent-foreground` | Hover states, highlights |
| `--destructive` | Error/danger actions |
| `--success` | Success states |
| `--warning` | Warning states |
| `--border` | Borders |
| `--input` | Input borders |
| `--ring` | Focus rings |

### Typography

- Font: Inter (loaded from Google Fonts or local).
- Scale: `text-xs` through `text-4xl`. Headings use `font-semibold` or `font-bold`.
- Body text: `text-sm` (14px) on desktop, `text-base` (16px) on mobile inputs.

### Spacing & Layout

- Max content width: `max-w-6xl` (1152px) centered with `mx-auto`.
- Page padding: `p-6` on desktop, `p-4` on mobile.
- Card gaps: `gap-6`.
- Section spacing: `space-y-6` or `gap-8`.

### Border Radius

- Cards: `rounded-xl`.
- Buttons/Inputs: `rounded-md`.
- Badges/Tags: `rounded-full`.

---

## Code Quality

- Language: Russian for UI text and validation messages. English for code (variables, functions, comments, commits, PRs).
- No `any` type. Use `unknown` and narrow with type guards if needed.
- No `console.log` in committed code. Use proper logging or remove.
- No unused imports, variables, or parameters. TypeScript strict mode enforces this.
- Prefer named exports over default exports (except for page components if using a router).
- File naming: `kebab-case.ts` / `kebab-case.tsx`. No `PascalCase` filenames.
- One concern per file. Split large components (>150 lines) into smaller pieces.

---

## Git

- Branch naming: `feat/short-description`, `fix/short-description`, `refactor/short-description`.
- Commit messages: conventional commits in English (`feat:`, `fix:`, `refactor:`, `chore:`, `docs:`).
- PRs target `develop` branch. `main` is production.
- No force-push to `develop` or `main`.

---

## Docker

- All services defined in root `docker-compose.yml`.
- Backend and frontend use volume mounts with `node_modules` exclusion for hot reload.
- PostgreSQL and MinIO have health checks. Backend depends on healthy services.
- Environment variables: use `.env` file (not committed). `.env.example` documents all required vars.
