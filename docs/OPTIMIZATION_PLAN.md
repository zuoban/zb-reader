# ZB Reader Optimization Plan

This plan turns the current optimization review into staged work. The goal is to keep the reader stable while improving first-load speed, upload safety, data reliability, and long-term maintainability.

## Phase 1: Low-risk wins

Status: completed

- Avoid recalculating bookshelf facets on every infinite-scroll page. Only refresh categories and all-book totals on the first page or after filter/category changes.
- Cache EPUB locations independently from full book files so server-streamed books still benefit from generated location indexes on later opens.
- Keep failed offline progress sync items in IndexedDB after retry exhaustion instead of dropping user progress.
- Keep tests around these behaviors so regressions are visible.

## Phase 2: Data and migration cleanup

Status: planned

- Make Drizzle migrations the single source of truth for schema changes.
- Reduce `src/lib/db/index.ts` inline migrations to startup bootstrap and legacy compatibility only.
- Add a database smoke test that opens a fresh database, applies migrations, and verifies the live schema matches `src/lib/db/schema.ts`.
- Document the production upgrade path for existing `data/db.sqlite` files.

## Phase 3: Upload hardening

Status: in progress

- Done: add ZIP safety checks before extracting EPUB metadata: maximum entry count, maximum known uncompressed bytes, and path normalization checks.
- Done: reject `.epub` uploads with invalid ZIP magic bytes before ZIP parsing.
- Split upload into file validation, durable storage, metadata extraction, and DB insert steps with clearer rollback behavior.
- Evaluate temp-file based upload handling to reduce peak memory usage for large EPUB files.
- Consider asynchronous cover/metadata extraction for very large books.

## Phase 4: Bookshelf first paint

Status: completed

- Done: move the initial bookshelf query into a Server Component boundary.
- Done: keep search, category filtering, uploads, deletion, and infinite scroll in a client component.
- Done: pass initial books, progress maps, categories, and totals as hydrated props.
- Follow-up: measure browser performance traces with an authenticated session.

## Phase 5: Search and indexing

Status: planned

- Add SQLite FTS5 support for title and author search.
- Keep FTS data synchronized during create, update, and delete.
- Fall back gracefully if an existing SQLite build does not support FTS5.
- Add tests for Chinese and mixed-language title/author search.

## Phase 6: Security and dependency hygiene

Status: in progress

- Tighten Content Security Policy where Next.js and EPUB iframe constraints allow it.
- Separate main-app CSP concerns from EPUB rendering/proxy requirements.
- Standardize package management on pnpm and remove npm lockfile drift after CI confirms the pnpm lock is complete.
- Done: tighten TypeScript configuration by removing `allowJs`.
- Evaluate `skipLibCheck` after dependency type compatibility is checked in CI.

## Phase 7: Reader architecture

Status: planned

- Continue shrinking the reader page coordinator by grouping TTS, annotations, side panel, and settings into clearer feature boundaries.
- Reduce cross-hook parameter passing with feature-level state objects or local providers where it improves readability.
- Add focused integration tests for progress restoration, TTS paragraph transitions, and note/bookmark interactions.
