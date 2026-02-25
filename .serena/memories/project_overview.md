# ZB Reader - Project Overview

## Purpose
Self-hosted web-based e-book reader supporting EPUB, PDF, and TXT formats.

## Tech Stack
- Next.js 16 (App Router) + React 19 + TypeScript
- Tailwind CSS v4 + shadcn/ui
- SQLite (better-sqlite3 + Drizzle ORM)
- NextAuth v5
- Zustand for global state

## Key Commands
- `npm run dev` - Dev server
- `npm run build` - Production build
- `npm run lint` - ESLint
- `npm run test:run` - Run tests once
- `npx tsc --noEmit` - Type check
- `npx drizzle-kit push` - Push schema to SQLite

## Structure
- `src/app/` - Next.js App Router pages & API routes
  - `(auth)/` - Login/register
  - `(main)/` - Bookshelf
  - `reader/[bookId]/` - Reader page
  - `api/` - REST API routes
- `src/components/` - UI components (ui/, bookshelf/, reader/, layout/)
- `src/lib/` - Utilities (auth, db, storage, logger, utils)
- `src/stores/` - Zustand stores (reader-settings, tts-floating)
- `src/test/` - Test utilities
