# agents.md

This file provides guidance to coding assistants when working with code in this repository.

## Project Purpose

The app is named **CarciOscar**. It's a mobile-first web app for groups to collaboratively choose and track movies. Core flow:
- **People** section: members mark themselves present and can propose up to 3 movies (limit enforced in the UI)
- **Rate Movies** section: present members rate proposed movies 1–5 stars (how much they want to watch)
- **Results** section: movies ranked by average score from present voters; pick one to watch
- **Watched Movies** section: members rate watched movies 0–10
- **Stats** section: group and individual statistics, awards, and genre analysis

**No authentication.** The URL selects a session in the app; there are no user accounts. Identity is chosen from a dropdown and persisted per-session in a browser cookie (`selectedPerson_${sessionId}`, 30-day expiry via `src/lib/sessionCookies.ts`). The URL is an app-level locator, not a complete database access boundary: current RLS policies allow public `SELECT` on session-scoped tables, so reads through the Supabase API are not restricted to the selected session.

## Commands

```bash
npm run dev       # Start dev server (port 8080)
npm run build     # Production build
npm run lint      # ESLint
npm run test -- --run  # Run all tests once (bare `npm run test` starts watch mode)
npx vitest run src/lib/__tests__/sessionHelpers.test.ts  # Run a single test file
```

## Architecture

### State Management
Shared session state lives in **`src/hooks/useMovieSession.ts`**. It composes smaller hooks for session setup, people management, proposal ratings, and real-time synchronization. The shared hook owns:
- Session loading/creation, people management, movie proposals and ratings
- Real-time Supabase subscriptions on `movie_ratings`, `session_people`, `movie_proposals`, and `proposal_comments` through one session channel
- Sorting logic based on `selectedPersonId` (read from cookies per session)
- View switching between `'session'`, `'watched'`, and `'stats'`

Data transformation/sorting utilities are pure functions in **`src/lib/sessionHelpers.ts`**.

Cookie persistence for per-session user selection is in **`src/lib/sessionCookies.ts`**.

React Query (`@tanstack/react-query`) is configured in `App.tsx` and used by the Stats data hook; session and Watched Movies data are fetched through custom hooks with direct Supabase calls.

**Sorting Logic:**
- Movie titles are sorted using `normalizeTitle` (from `src/lib/utils.ts`), which ignores leading "The " (case-insensitive).
- `getSortedMovies()` — used in RatePanel; orders movies so the selected person's unrated movies appear first; does not compute averages; re-sorting is suppressed after each rating change via the `shouldSort` flag (reset when the selected person changes) to avoid jarring reorders mid-interaction.
- `rankedMovies` (computed in `src/hooks/useProposalRatings.ts` and used in ResultsPanel); computes averages from present people ratings only; sorts by average descending; uses `normalizeTitle` as a tie-breaker. A movie appears only when its proposer is present and at least one present non-proposer has rated it, so the proposer default 5 alone cannot rank it.

**WatchedMovies has no real-time subscription.** Unlike the session view, `WatchedMovies` loads data once on mount and only refreshes via explicit `loadData()` calls (e.g. after adding a movie).

**Stats Section:**
- Top-level view that calculates group and individual insights.
- Fetches all session data (`watched_movies`, `detailed_ratings`, `movie_ratings`, `movie_proposals`) directly from Supabase.
- Calculations are performed in `src/components/Stats/utils.ts`.
- Uses `recharts` for Pie and Radar visualizations.

**Optimistic updates** use a `temp-${Date.now()}` id for new `DetailedRating` entries. The temporary id is replaced only on the next `loadData()` call, not immediately after the upsert.

### Supabase Integration
- Client: `src/integrations/supabase/client.ts`
- Generated DB types: `src/integrations/supabase/types.ts`
- **Database Functions & RPCs**:
  - `get_movie_session(p_id)` — retrieves session by UUID; used instead of direct `SELECT` on `movie_sessions`
  - `create_movie_session(p_name)` — creates session; used instead of direct `INSERT` on `movie_sessions`
  - `session_exists(p_id)` — `SECURITY DEFINER` helper used in RLS policies to validate session existence
- **Row Level Security (RLS)**:
  - Direct table access (`SELECT`/`INSERT`/`UPDATE`/`DELETE`) on `movie_sessions` is blocked for anonymous/public clients to prevent session enumeration.
  - `DELETE` on `watched_movies` and `detailed_ratings` is permanently disabled via RLS.
  - Operation-specific policies are defined for the other tables (`session_people`, `movie_proposals`, `movie_ratings`, `watched_movies`, `detailed_ratings`, `favourite_movies`, `proposal_comments`). Public `SELECT` policies use `USING (true)` on these tables, so they do not isolate reads by session. Write policies apply table-specific checks; `session_exists(p_id)` is used by some policies, while others validate relationships between rows.
- **Edge Functions** (in `supabase/functions/`):
  - `search-movie` — TMDB API search (with OMDB fallback); returns multiple matching movie options with full metadata
  - `propose-movie-with-details` — atomically creates a proposal and enriches metadata via TMDB/OMDB; returns an existing proposal if the movie was already proposed in this session

### Database Tables
| Table | Purpose |
|---|---|
| `movie_sessions` | Session metadata |
| `session_people` | People in a session (name, is_present) |
| `movie_proposals` | Movies proposed (includes OMDB fields: poster, director, genre, runtime, plot, imdb_rating, imdb_id) |
| `movie_ratings` | 1–5 star ratings per person per proposal; `proposal_id` set to null when a movie is watched |
| `detailed_ratings` | 0–10 ratings for watched movies |
| `watched_movies` | Movies marked as watched (all OMDB metadata copied) |
| `favourite_movies` | Per-person favourites on proposals |
| `proposal_comments` | Comments on proposals |

### Key Types (`src/types/session.ts`)
- `Person` — `{ id, name, isPresent, movies[] }` — note `isPresent` (camelCase)
- `MovieRating` — `{ movieTitle, proposedBy, ratings: Record<string, number>, details?, proposalId?, proposerId?, comment? }`
- `MovieWithStats` — adds `totalRatings`, `averageRating` for the Results panel

`WatchedMovies/types.ts` defines its own local `Person` type with `is_present` (snake_case) — these are **two separate types** for the two domains and must not be conflated.

### Component Structure
```
src/components/
  MovieSelector/          # Session view (tabs: People / Rate / Results)
    PeoplePanel.tsx
    RatePanel.tsx
    ResultsPanel.tsx
    __tests__/
  WatchedMovies/          # Watched movies view
    hooks/
      useWatchedMoviesData.ts
      useMovieRatings.ts   # Optimistic updates for detailed ratings
  Stats/                  # Group and individual statistics
    hooks/
      useStatsData.ts      # Direct Supabase data fetching for stats
    utils.ts              # Aggregation exports, implemented in utils/ modules
    utils/                # Awards, genre, ratings, person, runtime, highlights, synergy
  ui/                     # shadcn/ui components (do not modify)
```

### Testing
Vitest + @testing-library/react + jsdom. Setup file: `src/test/setup.ts`.

Tests live alongside code in `__tests__/` subdirectories. Current tests cover `MovieCard`, `PersonCard`, `StarRating`, `PeoplePanel`, `RatePanel`, `ResultsPanel`, `WatchedMovies`, `AddMovieDialog`, `useMovieSearch`, and the `sessionCookies`, `sessionHelpers`, and `utils` libraries. The sessionHelpers and utils test files contain tests; they are not empty stubs. There are no direct tests for `useMovieSession`, its session sub-hooks, Stats calculation utilities, or Watched Movies data/rating hooks.

## Design Decisions

- **Results only show movies whose proposer is currently present.** The filter is implemented in `src/hooks/useProposalRatings.ts` and excludes proposals from absent members even if present members have rated them. This is by design: a movie can only be watched if the person who proposed it is there to watch it. Average ratings are still calculated using only present members' scores.

- **Proposers get a default rating of 5 on their own proposals.** When a movie is added, the proposer's rating is optimistically set to 5 in local state and persisted to `movie_ratings` after the edge function returns the proposal id. Proposers can change this rating freely.

- **Users cannot favourite their own proposals.** `useFavouriteMovie` enforces this on toggle; the heart icon is also hidden via `!disallowOwn` in `RatePanel`.

- **Each person can have at most one favourite per session.** The app expects `favourite_movies.person_id` to be unique: `useFavouriteMovie` upserts with `onConflict: "person_id"`, replacing that person's existing favourite. Person rows are session-specific. The checked-in migration files do not create `favourite_movies` or its unique constraint, so this part of the deployed schema is not reproducible from the migrations currently in this repo.

- **Results require a present non-proposer vote.** A proposal is omitted until at least one present person other than its proposer has submitted a rating. This keeps the proposer default 5 from ranking a movie by itself.

- **Rating 0 in the session view deletes the rating row** from `movie_ratings` rather than storing a zero.

- **`proposed_by` in `watched_movies` is a denormalized name string**, not a `person_id`. This applies both to movies moved via `markMovieAsWatched` and to movies added manually via `AddMovieDialog`. There is no FK join from watched movies back to `session_people`.

- **`proposal_comments` has one comment per proposal** (unique constraint on `proposal_id`). The comment author (`person_id`) is stored in the `author` column but only a single comment text survives per proposal — any new save overwrites it.

- **`markMovieAsWatched` flow**: fetches the proposal (with OMDB data) → inserts into `watched_movies` (copying all metadata) → updates `movie_ratings` rows to set `watched_movie_id` (preserving pre-watch ratings for history) → deletes `proposal_comments` → deletes the `movie_proposals` row.

- **Stats Ratings Interpretation**:
  - **Hype (Pre-Watch)**: 0-5 scale. Represented as `movie_ratings`. Used for "Hype Man", "Most Anticipated", etc.
  - **Score (Post-Watch)**: 0-10 scale. Represented as `detailed_ratings`. Used for "Highest Rated", "Harshest Critic", etc.
  - **Biggest Surprise**: Calculated as `(Score) - (Hype * 2)`. Maximum positive gap.
  - **Biggest Disappointment**: Calculated as `(Score) - (Hype * 2)`. Maximum negative gap.

- **Session lookup**: Direct access to `movie_sessions` is blocked; sessions are loaded via RPC `get_movie_session(p_id)` and created via `create_movie_session(p_name)`. `session_exists(p_id)` is a `SECURITY DEFINER` helper used by some write policies. Public `SELECT` policies on other session-scoped tables are not session-filtered, so the RPC does not prevent direct reads of those tables across sessions.

- **Disallowed deletions**: `DELETE` is permanently blocked via RLS on `movie_sessions`, `watched_movies`, and `detailed_ratings` to prevent historical data loss.

## Key Conventions

- **Mobile-first**: always design for small screens first; most users are on phones
- **Date format**: `DD/MM/YYYY` (`DDMMYYYY`) convention for all displayed dates
- Favour direct Supabase calls inside custom hooks over abstracting into a service layer
- Optimistic UI updates for ratings and presence changes; roll back on error
- Real-time updates via a single Supabase channel per session (re-subscribed when `sessionId` changes)
- Session URL sharing: session ID is in the URL, enabling multi-user access
- shadcn/ui component library — add new components with `npx shadcn-ui@latest add <component>`, never hand-edit files inside `src/components/ui/`
- Path alias `@` maps to `src/`
