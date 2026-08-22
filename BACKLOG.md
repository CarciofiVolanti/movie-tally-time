# CarciOscar — Improvement Backlog

Identified during full codebase audit (2026-07-08).

---

## ✅ Done

- Deleted `src/components/deprecated/` (~88KB dead code)
- Removed all `console.log()` debug calls from `useMovieSession.ts`
- Removed all `as any` casts from `useMovieSession.ts`
- Deleted the dead "Attach proposalId" useEffect (50 lines — `transformRatingsData` already sets both fields)
- Fixed `calculateGroupHighlights` `(false)` dead branch in `Stats/utils.ts`
- Typed `sessionHelpers.ts` parameters with generated Supabase `Tables<>` types
- Enabled `noUnusedLocals` + `noUnusedParameters` in `tsconfig.app.json`
- Cleaned sloppy comment + unnecessary `String()` cast in `useMovieSession.ts`
- Updated `CLAUDE.md` testing section
- Code-split `Stats` and `WatchedMovies` behind `React.lazy()` + `<Suspense>` in `MovieSelector/index.tsx`
- Memoized `presentPeople` (`useMemo`), `rankedMovies` (`useMemo`), `getSortedMovies` (`useCallback`) in `useMovieSession.ts`
- Eliminated redundant `SELECT` in `updateRating` — signature now `(proposalId, personId, rating)`; callers updated in `MovieCard.tsx` and `RatePanel.tsx`
- Replaced all `window.confirm()` calls with shadcn `AlertDialog` via new `ConfirmDialog` wrapper (`src/components/ConfirmDialog.tsx`). Confirmation state lifted into `PersonCard.tsx` and `ResultsPanel.tsx`.
- Added `ErrorBoundary` class component (`src/components/ErrorBoundary.tsx`); session, WatchedMovies, and Stats views all wrapped.
- Split `useMovieSession.ts` (800 lines) into four focused hooks: `useSessionSetup`, `usePeopleManager`, `useProposalRatings`, `useRealtimeSync`. `sortRatings` moved to `sessionHelpers.ts` with tests.
- Consolidated 3 real-time Supabase channels into 1 with chained `.on()` handlers in `useRealtimeSync.ts`.
- Added `React.memo` to `MovieCard`, `PersonCard`, `StarRating`.
- Fixed fragile error string parsing in `usePeopleManager.ts` using a tagged-union never-throw pattern.
- Split `Stats/utils.ts` (648 lines) into domain files: `utils/runtime.ts`, `utils/ratings.ts`, `utils/genre.ts`, `utils/awards.ts`, `utils/synergy.ts`, `utils/highlights.ts`, `utils/person.ts`. `utils.ts` is now a barrel re-export.
- Converted `useStatsData.ts` to use React Query `useQuery` with 5-minute `staleTime`; switching away from Stats and back no longer re-fetches all tables within the cache window.
