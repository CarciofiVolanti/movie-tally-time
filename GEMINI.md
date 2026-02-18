# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Purpose

The app is named **CarciOscar**. It's a mobile-first web app for groups to collaboratively choose and track movies. Core flow:
- **People** section: members mark themselves present and propose up to 3 movies
- **Rate Movies** section: present members rate proposed movies 1–5 stars (how much they want to watch)
- **Results** section: movies ranked by average score from present voters; pick one to watch
- **Watched Movies** section: members rate watched movies 0–10

**No authentication.** Possessing the URL (with `?session=<uuid>`) is the only access control. There are no user accounts — identity is chosen from a dropdown and persisted per-session in a browser cookie (`selectedPerson_${sessionId}`, 30-day expiry via `src/lib/sessionCookies.ts`).

## Commands

```bash
npm run dev       # Start dev server (port 8080)
npm run build     # Production build
npm run lint      # ESLint
npm run test      # Run all tests (Vitest)
npx vitest run src/lib/__tests__/sessionHelpers.test.ts  # Run a single test file
```

## Architecture

### State Management
The primary state lives in **`src/hooks/useMovieSession.ts`** — a large central hook (~700+ lines) that owns:
- Session loading/creation, people management, movie proposals and ratings
- Real-time Supabase subscriptions on `movie_ratings` (Postgres Changes channel)
- Sorting logic based on `selectedPersonId` (read from cookies per session)

Data transformation/sorting utilities are pure functions in **`src/lib/sessionHelpers.ts`**.

Cookie persistence for per-session user selection is in **`src/lib/sessionCookies.ts`**.

React Query (`@tanstack/react-query`) is configured in `App.tsx` but data fetching is primarily done inside custom hooks via direct Supabase calls, not via `useQuery`.

**Two computed movie lists serve different purposes:**
- `getSortedMovies()` — used in RatePanel; orders movies so the selected person's unrated movies appear first; does not compute averages; re-sorting is suppressed after each rating change via the `shouldSort` flag (reset when the selected person changes) to avoid jarring reorders mid-interaction.
- `rankedMovies` — used in ResultsPanel; computes averages from present people's ratings only; sorts by average descending; filters to movies proposed by a present person **and** with at least one vote from a present non-proposer (prevents the proposer's default-5 from inflating the ranking before others have weighed in).

**Session view real-time subscriptions** are all on a single channel (`session-${sessionId}`) in `useMovieSession.ts`:
- `movie_ratings` — granular per-row updates (INSERT/UPDATE/DELETE → update rating in state)
- `movie_proposals` filtered by `session_id` — INSERT adds the movie for all users; UPDATE propagates newly fetched OMDB details; DELETE removes a watched/deleted movie from all views
- `session_people` UPDATE filtered by `session_id` — propagates presence toggle (`is_present`) to all users immediately

**Favourites in ResultsPanel** have their own channel (`results-favourites`) subscribing to `favourite_movies`. INSERT is handled granularly; DELETE and UPDATE trigger a re-fetch since `payload.old` only contains the PK without `proposal_id` (Postgres default replica identity).

**Watched Movies real-time subscriptions** are on channel `watched-movies-${sessionId}` in `useWatchedMoviesData.ts`:
- `watched_movies` filtered by `session_id` — any change triggers a full `loadData()` reload (movies are added/removed infrequently and carry many metadata fields)
- `detailed_ratings` — granular updates; INSERT/UPDATE are filtered client-side against `watchedMovieIdsRef` to ignore other sessions; DELETE uses the row `id` from `payload.old` (always present even without `REPLICA IDENTITY FULL`)

**Optimistic updates** use a `temp-${Date.now()}` id for new `DetailedRating` entries. The temporary id is replaced only on the next `loadData()` call, not immediately after the upsert.

### Supabase Integration
- Client: `src/integrations/supabase/client.ts`
- Generated DB types: `src/integrations/supabase/types.ts`
- **Edge Functions** (in `supabase/functions/`):
  - `search-movie` — OMDB API search; returns a **single best match**, not a list
  - `propose-movie-with-details` — atomically creates a proposal and fetches OMDB metadata; returns an existing proposal if the movie was already proposed in this session

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
  ui/                     # shadcn/ui components (do not modify)
```

### Testing
Vitest + @testing-library/react + jsdom. Setup file: `src/test/setup.ts`.

Tests live alongside code in `__tests__/` subdirectories. Test coverage currently includes: `MovieCard`, `StarRating`, `PeoplePanel`, `ResultsPanel`, and lib utilities (`sessionHelpers`, `utils`, `sessionCookies`).

## Design Decisions

- **Results only show movies whose proposer is currently present.** The `rankedMovies` filter in `useMovieSession.ts` intentionally excludes movies proposed by absent members, even if present members have rated them. This is by design: a movie can only be watched if the person who proposed it is there to watch it. Average ratings are still calculated using only present members' scores.

- **Proposers get a default rating of 5 on their own proposals.** When a movie is added, the proposer's rating is optimistically set to 5 in local state and persisted to `movie_ratings` after the edge function returns the proposal id. Proposers can change this rating freely.

- **Users cannot favourite their own proposals.** `useFavouriteMovie` enforces this on toggle; the heart icon is also hidden via `!disallowOwn` in `RatePanel`.

- **Each person can have at most one favourite per session.** The `favourite_movies` table has a unique constraint on `person_id`. Because `session_people` rows are scoped per session, each person record is already session-specific, so this constraint effectively means one favourite per person per session. Toggling a favourite on a new proposal replaces the old one via `onConflict: "person_id"` on upsert.

- **Rating 0 in the session view deletes the rating row** from `movie_ratings` rather than storing a zero.

- **`proposed_by` in `watched_movies` is a denormalized name string**, not a `person_id`. This applies both to movies moved via `markMovieAsWatched` and to movies added manually via `AddMovieDialog`. There is no FK join from watched movies back to `session_people`.

- **`proposal_comments` has one comment per proposal** (unique constraint on `proposal_id`). The comment author (`person_id`) is stored in the `author` column but only a single comment text survives per proposal — any new save overwrites it.

- **Cascade deletes on person removal** are handled by DB foreign keys. When a person row is deleted, all their proposals and ratings are removed automatically; the local state removal in `deletePerson` is purely for immediate UI consistency.

- **`markMovieAsWatched` flow**: fetches the proposal (with OMDB data) → inserts into `watched_movies` (copying all metadata) → updates `movie_ratings` rows to set `watched_movie_id` (preserving pre-watch ratings for history) → deletes `proposal_comments` → deletes the `movie_proposals` row.

## Key Conventions

- **Mobile-first**: always design for small screens first; most users are on phones
- Favour direct Supabase calls inside custom hooks over abstracting into a service layer
- Optimistic UI updates for ratings and presence changes; roll back on error
- Real-time updates via a single Supabase channel per session (re-subscribed when `sessionId` changes)
- Session URL sharing: session ID is in the URL, enabling multi-user access
- shadcn/ui component library — add new components with `npx shadcn-ui@latest add <component>`, never hand-edit files inside `src/components/ui/`
- Path alias `@` maps to `src/`
