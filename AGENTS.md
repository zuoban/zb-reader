# AGENTS.md — ZB Reader

## Project Overview

ZB Reader is a self-hosted web-based e-book reader built with Next.js 16 (App Router), React 19, TypeScript, Tailwind CSS v4, shadcn/ui, SQLite (better-sqlite3 + Drizzle ORM), and NextAuth v5. It supports EPUB format only. All UI text is in Chinese (zh-CN).

## Build / Lint / Dev Commands

```bash
npm run dev              # Start dev server (next dev)
npm run build            # Production build (next build)
npm run start            # Start production server (next start)
npm run lint             # ESLint check
npm run test             # Run all tests in watch mode (Vitest)
npm run test:run         # Run all tests once
npm run test:coverage    # Run tests with coverage
npm run analyze          # Analyze bundle size (opens browser)
npx vitest path/to/file.test.ts  # Run single test file
npx vitest -t "test name"         # Run tests matching name pattern
npx tsc --noEmit         # Type-check without emitting files
```

### Database

```bash
npx drizzle-kit push    # Push schema changes to SQLite (dev)
npx drizzle-kit migrate # Generate and run migrations
npx drizzle-kit studio  # Open Drizzle Studio GUI
```

Database file: `./data/db.sqlite` (gitignored). Schema: `src/lib/db/schema.ts`.

### Docker

```bash
docker compose up    # Build & run via docker-compose.yml (port 3000)
```

## Project Structure

```
src/
├── app/             # App Router pages & API routes ((auth), (main), reader/[bookId], api)
├── components/      # UI components (ui/, bookshelf/, reader/, layout/)
├── lib/             # Utilities (auth.ts, db/, book-cache.ts, logger.ts, storage.ts, utils.ts)
├── stores/          # Zustand stores (reader-settings.ts, tts-floating.ts)
├── test/            # Test setup (setup.ts, utils.tsx)
└── middleware.ts    # Auth middleware
```

Data: `./data/` (SQLite DB, books, covers). Schema: `src/lib/db/schema.ts`. Gitignored.

## Code Style Guidelines

### TypeScript

- Strict mode enabled (`strict: true`).
- Use path alias `@/` for imports from `src/` (e.g., `@/components/ui/button`).
- Use `import type` for type-only imports: `import type { Book } from "@/lib/db/schema"`.
- Prefer `interface` for component props; use `type` for Drizzle inferred types.
- Unused parameters: prefix with underscore (`_req`, `_id`).

### Import Order

1. React / Next.js core (`react`, `next/navigation`, `next/dynamic`)
2. Third-party libraries (`next-auth/react`, `sonner`, `lucide-react`)
3. Internal modules via `@/` alias (`@/components/...`, `@/lib/...`)
4. Relative imports (`./BookCard`)
5. Type imports last (`import type { ... }`)

### Naming Conventions

- Components: PascalCase (`BookCard.tsx`, `export function BookCard()`)
- shadcn/ui: kebab-case (`button.tsx`)
- Lib/config: camelCase (`auth.ts`)
- Variables/functions: camelCase (`fetchBooks`)
- Event handlers: `handle` + verb (`handleDelete`)
- Callback props: `on` + verb (`onDelete`)
- Refs: name + `Ref` (`viewerRef`)
- Booleans: `is`/`has`/adjective (`isBookmarked`, `loading`)
- Props interfaces: PascalCase + Props (`BookCardProps`)
- Constants: UPPER_SNAKE_CASE (`DATA_DIR`)
- DB tables: snake_case (`reading_progress`); DB columns: camelCase → snake_case (`uploaderId` → `uploader_id`)

### Component Patterns

- Almost all components use `"use client"` — server components are only layouts.
- Page components: `export default function PageName()`.
- Feature components: `export function ComponentName()` (named export, no default).
- Components with `forwardRef`: set `.displayName` and use `export default`.
- Dynamic imports for heavy components: `next/dynamic` with `ssr: false`.
- Props interface defined in same file, after imports, before component.
- Global state via Zustand stores in `src/stores/`:
  - `useReaderSettingsStore` - reading/TTS settings synced with server
  - `useTtsFloatingStore` - TTS floating control position (persisted to localStorage)
- Reader settings are loaded from server via `loadFromServer()` and auto-saved with debouncing.

### API Route Patterns

```ts
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";

export async function METHOD(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "未登录" }, { status: 401 });
  try {
    return NextResponse.json({ data });
  } catch (error) {
    return NextResponse.json({ error: "中文消息" }, { status: 500 });
  }
}
```

- Dynamic params: `await params` (Promise in Next.js 16)
- IDs: `uuid` v4
- Responses: `{ books: [...] }` / `{ error: "中文消息" }` + status

### Error Handling

- API routes: `try/catch` → use `logger.error(context, message, error)` from `@/lib/logger` + JSON error response.
- Client components: `try/catch` → `toast.error("中文消息")` or `toast.success("中文消息")` via sonner.
- Progress saving uses silent failure (empty `catch {}`) — intentional.
- Error Boundaries: `ErrorBoundary` (generic), `ReaderErrorBoundary` (reader-specific with "return to bookshelf").
- Logger module (`@/lib/logger`) provides structured logging; production only logs errors.

### Styling

- Tailwind CSS v4 with `@import "tailwindcss"` syntax.
- Use semantic CSS variables: `bg-background`, `text-foreground`, `text-primary`, `bg-muted`.
- Use `cn()` from `@/lib/utils` for conditional/merged class names.
- Dark mode via `.dark` class (managed by `next-themes`).
- Custom fonts: `--font-sans` (Open Sans), `--font-heading` (Poppins).
- All interactive elements must have `cursor-pointer`.
- Do not use emoji as icons — use Lucide React icons.

### Design System

See `design-system/zb-reader/MASTER.md` for colors, typography, spacing, shadows, and component specs.

## Key Technical Notes

- EPUB iframe: epubjs runs in iframe with independent event system — z-index overlays don't block clicks. Use absolute div to intercept.
- Reader page: wraps own `SessionProvider`/`ThemeProvider` (doesn't inherit from `(main)` layout).
- Database: WAL mode, foreign keys enabled, 5s busy timeout, lazy init via Proxy.
- Docker: `output: "standalone"` in next.config, `better-sqlite3` in `serverExternalPackages`.
- TTS: supports browser TTS and custom TTS engines (Legado-compatible API).
