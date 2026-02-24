# AGENTS.md — ZB Reader

## Project Overview

ZB Reader is a self-hosted web-based e-book reader built with Next.js 16 (App Router), React 19, TypeScript, Tailwind CSS v4, shadcn/ui, SQLite (better-sqlite3 + Drizzle ORM), and NextAuth v5. It supports EPUB, PDF, and TXT formats. All UI text is in Chinese (zh-CN).

## Build / Lint / Dev Commands

```bash
npm run dev          # Start dev server (next dev)
npm run build        # Production build (next build)
npm run start        # Start production server (next start)
npm run lint         # ESLint check
npm run test         # Run tests in watch mode (Vitest)
npm run test:run     # Run tests once
npm run test:coverage # Run tests with coverage
npm run analyze      # Analyze bundle size (opens browser)
npx tsc --noEmit     # Type-check without emitting files
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
├── app/                        # Next.js App Router pages & API routes
│   ├── (auth)/                 # Auth route group (login, register)
│   ├── (main)/                 # Main route group (bookshelf)
│   ├── reader/[bookId]/        # Reader page (standalone providers)
│   └── api/                    # REST API routes (books, bookmarks, notes, progress, tts)
├── components/
│   ├── ui/                     # shadcn/ui primitives (do not edit manually)
│   ├── bookshelf/              # Bookshelf feature components
│   ├── reader/                 # Reader feature components
│   └── layout/                 # Navbar, ThemeProvider
├── lib/
│   ├── auth.ts                 # NextAuth config (JWT strategy)
│   ├── db/index.ts             # DB connection (lazy init + Proxy)
│   ├── db/schema.ts            # Drizzle table definitions + exported types
│   ├── book-cache.ts          # IndexedDB book cache (client-side)
│   ├── logger.ts               # Structured logging utility
│   ├── storage.ts              # File system storage helpers
│   └── utils.ts                # cn() utility (clsx + tailwind-merge)
├── stores/                     # Zustand global state stores
│   ├── index.ts                # Store exports
│   ├── reader-settings.ts      # Reader/TTS settings (synced with server)
│   └── tts-floating.ts         # TTS control position (persisted locally)
├── test/                       # Test utilities and setup
│   ├── setup.ts                # Vitest setup, global mocks
│   └── utils.tsx               # Test render helpers
└── middleware.ts               # Auth middleware
```

Data files: `./data/` (SQLite DB, uploaded books, cover images). Gitignored.

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

| Element              | Convention           | Example                                |
|----------------------|----------------------|----------------------------------------|
| React components     | PascalCase           | `BookCard`, `EpubReader`               |
| Component files      | PascalCase.tsx       | `BookCard.tsx`                         |
| shadcn/ui files      | kebab-case.tsx       | `button.tsx`, `dropdown-menu.tsx`      |
| Lib/config files     | camelCase.ts         | `auth.ts`, `storage.ts`                |
| Variables/functions  | camelCase            | `fetchBooks`, `saveProgress`           |
| Event handlers       | `handle` + verb      | `handleDelete`, `handleToggleBookmark` |
| Callback props       | `on` + verb          | `onDelete`, `onOpenChange`             |
| Refs                 | name + `Ref`         | `viewerRef`, `renditionRef`            |
| Boolean state        | `is`/`has`/adjective | `isBookmarked`, `loading`, `visible`   |
| Props interfaces     | PascalCase + Props   | `BookCardProps`, `ReaderToolbarProps`  |
| Constants            | UPPER_SNAKE_CASE     | `THEME_STYLES`, `DATA_DIR`             |
| DB tables (SQL)      | snake_case           | `reading_progress`                     |
| DB columns (JS)      | camelCase            | `uploaderId` → SQL `uploader_id`       |

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
import { db } from "@/lib/db";

export async function METHOD(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "未登录" }, { status: 401 });
  }
  try {
    // business logic
    return NextResponse.json({ data });
  } catch (error) {
    console.error("Description:", error);
    return NextResponse.json({ error: "中文错误消息" }, { status: 500 });
  }
}
```

- Dynamic route params are `Promise` in Next.js 16: `{ params }: { params: Promise<{ id: string }> }` — always `await params`.
- IDs generated with `uuid` v4.
- Success responses: `{ books: [...] }`, `{ bookmark: {...} }`, `{ message: "..." }`.
- Error responses: `{ error: "中文消息" }` + appropriate HTTP status.

### Error Handling

- API routes: `try/catch` → use `logger.error(context, message, error)` from `@/lib/logger` + JSON error response.
- Client components: `try/catch` → `toast.error("中文消息")` or `toast.success("中文消息")` via sonner.
- Progress saving uses silent failure (empty `catch {}`) — intentional.
- React Error Boundaries wrap critical components:
  - `ErrorBoundary` - generic error boundary with reset button
  - `ReaderErrorBoundary` - reader-specific with "return to bookshelf" option
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

- **EPUB iframe**: epubjs runs in iframe with independent event system — z-index overlays don't block iframe clicks. Use absolute-positioned div inside EpubReader to intercept clicks.
- **Reader page**: wraps own `SessionProvider` / `ThemeProvider` (doesn't inherit from `(main)` layout).
- **Database**: WAL mode, foreign keys enabled, 5s busy timeout, lazy init via Proxy.
- **Docker**: `output: "standalone"` in next.config, `better-sqlite3` in `serverExternalPackages`.
- **MOBI**: upload supported but reader shows "开发中" message.
- **TTS**: supports browser TTS and custom TTS engines (Legado-compatible API).
