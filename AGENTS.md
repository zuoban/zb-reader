# AGENTS.md — ZB Reader

## Project Overview

ZB Reader is a self-hosted web-based e-book reader built with Next.js 16 (App Router), React 19, TypeScript, Tailwind CSS v4, shadcn/ui, SQLite (better-sqlite3 + Drizzle ORM), and NextAuth v5. It supports EPUB, PDF, and TXT formats. All UI text is in Chinese (zh-CN).

## Build / Lint / Dev Commands

```bash
npm run dev          # Start dev server (next dev)
npm run build        # Production build (next build)
npm run start        # Start production server (next start)
npm run lint         # ESLint check (eslint)
npx tsc --noEmit     # Type-check without emitting files
```

There is **no test framework** configured (no jest/vitest/playwright). Validate changes with `npx tsc --noEmit` and `npm run lint`.

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
│   └── api/                    # REST API routes
│       ├── books/              # CRUD + file/cover download
│       ├── bookmarks/          # CRUD
│       ├── notes/              # CRUD
│       └── progress/           # GET/PUT
├── components/
│   ├── ui/                     # shadcn/ui primitives (do not edit manually)
│   ├── bookshelf/              # Bookshelf feature components
│   ├── reader/                 # Reader feature components
│   └── layout/                 # Navbar, ThemeProvider
├── lib/
│   ├── auth.ts                 # NextAuth config (JWT strategy)
│   ├── db/index.ts             # DB connection (lazy init + Proxy)
│   ├── db/schema.ts            # Drizzle table definitions + exported types
│   ├── storage.ts              # File system storage helpers
│   └── utils.ts                # cn() utility (clsx + tailwind-merge)
└── middleware.ts               # Auth middleware
```

Data files live in `./data/` (SQLite DB, uploaded books, cover images). This directory is gitignored.

## Code Style Guidelines

### TypeScript

- Strict mode is enabled (`strict: true` in tsconfig).
- Use path alias `@/` for all imports from `src/` (e.g. `@/components/ui/button`).
- Use `import type` for type-only imports: `import type { Book } from "@/lib/db/schema"`.
- Prefer `interface` for component props; use `type` only for Drizzle inferred types.
- Unused parameters: prefix with underscore (`_req`, `_id`).

### Import Order

Follow this order (no auto-sorting tool enforced):

1. React / Next.js core (`react`, `next/navigation`, `next/dynamic`)
2. Third-party libraries (`next-auth/react`, `sonner`, `lucide-react`)
3. Internal modules via `@/` alias (`@/components/...`, `@/lib/...`)
4. Relative imports (`./BookCard`)
5. Type imports last (`import type { ... }`)

### Naming Conventions

| Element              | Convention         | Example                              |
|----------------------|--------------------|--------------------------------------|
| React components     | PascalCase         | `BookCard`, `EpubReader`             |
| Component files      | PascalCase.tsx     | `BookCard.tsx`, `SidePanel.tsx`       |
| shadcn/ui files      | kebab-case.tsx     | `button.tsx`, `dropdown-menu.tsx`     |
| Lib/config files     | camelCase.ts       | `auth.ts`, `storage.ts`              |
| Variables/functions  | camelCase          | `fetchBooks`, `saveProgress`         |
| Event handlers       | `handle` + verb    | `handleDelete`, `handleToggleBookmark` |
| Callback props       | `on` + verb        | `onDelete`, `onOpenChange`           |
| Refs                 | name + `Ref`       | `viewerRef`, `renditionRef`          |
| Boolean state        | `is`/`has`/adjective | `isBookmarked`, `loading`, `visible` |
| Props interfaces     | PascalCase + Props | `BookCardProps`, `ReaderToolbarProps` |
| Constants            | UPPER_SNAKE_CASE   | `THEME_STYLES`, `DATA_DIR`           |
| DB tables (SQL)      | snake_case         | `reading_progress`                   |
| DB columns (JS)      | camelCase          | `uploaderId` → SQL `uploader_id`     |
| Directories          | kebab-case         | `bookshelf/`, `reader/`              |

### Component Patterns

- Almost all components use `"use client"` — server components are only layouts.
- Page components: `export default function PageName()`.
- Feature components: `export function ComponentName()` (named export, no default).
- Components using `forwardRef`: set `.displayName` and use `export default`.
- Dynamic imports for heavy client components: `next/dynamic` with `ssr: false`.
- Props interface defined in the same file, after imports, before the component.
- No global state library — use React hooks (`useState`, `useCallback`, `useRef`, `useMemo`).
- Reader settings stored in `localStorage` (`reader-fontSize`, `reader-theme`).

### API Route Patterns

All API routes follow this structure:

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
- All error messages are in Chinese.

### Error Handling

- API routes: `try/catch` → `console.error()` + JSON error response.
- Client components: `try/catch` → `toast.error("中文消息")` or `toast.success("中文消息")` via sonner.
- Progress saving uses silent failure (empty `catch {}`) — this is intentional.
- No React Error Boundaries in the project.

### Styling

- Tailwind CSS v4 with `@import "tailwindcss"` syntax.
- Use semantic CSS variables: `bg-background`, `text-foreground`, `text-primary`, `bg-muted`.
- Use `cn()` from `@/lib/utils` for conditional/merged class names.
- Dark mode via `.dark` class (managed by `next-themes`).
- Custom fonts: `--font-sans` (Open Sans), `--font-heading` (Poppins).
- All interactive elements must have `cursor-pointer`.
- Do not use emoji as icons — use Lucide React icons.

### Design System

Refer to `design-system/zb-reader/MASTER.md` for the full design specification including colors, typography, spacing, shadows, component specs, and anti-patterns.

## Key Technical Notes

- EPUB reader runs in an **iframe** (epubjs). The iframe has its own event system independent of the outer DOM — z-index and overlays do not block iframe clicks. Use an absolute-positioned div inside the EpubReader component to intercept clicks when needed.
- Reader page wraps its own `SessionProvider` / `ThemeProvider` (does not inherit from `(main)` layout).
- Database uses WAL mode, foreign keys enabled, 5s busy timeout, lazy initialization via Proxy pattern.
- `output: "standalone"` in next.config for Docker deployment.
- `better-sqlite3` listed in `serverExternalPackages`.
- MOBI format: upload supported but reader shows "开发中" message.
