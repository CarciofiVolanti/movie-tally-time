# Movie Tally Time

## Project Overview
**Movie Tally Time** (also known as **CarciOscar**) is a React-based web application designed to facilitate movie nights. It allows groups of friends ("sessions") to propose movies, track who is present, record watched movies, rate them (both pre-watch hype and post-watch scores), and view detailed session statistics. The application uses Supabase for its backend database and real-time capabilities.

## Tech Stack
*   **Frontend Framework:** React (with Vite)
*   **Language:** TypeScript
*   **Styling:** Tailwind CSS
*   **UI Component Library:** Shadcn UI (built on Radix UI primitives)
*   **State Management & Data Fetching:** TanStack Query (React Query) - configured but direct Supabase calls preferred in hooks.
*   **Routing:** React Router DOM
*   **Backend:** Supabase (PostgreSQL)
*   **Icons:** Lucide React
*   **Charts:** Recharts (Pie and Radar charts)

## Key Architecture & Directories

### `src/`
The core application source code.

*   **`pages/`**: Top-level page components.
    *   `Index.tsx`: The main entry point. Manages view switching between "Session", "Watched", and "Stats".
*   **`components/`**: React components.
    *   `ui/`: Generic, reusable UI components (mostly from Shadcn UI).
    *   `MovieSelector/`: Components for the proposal and selection phase (People, Rate, Results).
    *   `WatchedMovies/`: Components for movie history and post-watch rating (0-10).
    *   `Stats/`: Components for group and individual statistics, awards, and genre radar charts.
    *   `deprecated/`: Older components kept for reference.
*   **`hooks/`**: Custom React hooks (e.g., `useWatchedMoviesData`, `useMovieSession`).
*   **`integrations/supabase/`**: Supabase client initialization and generated TypeScript types (`types.ts`).
*   **`lib/`**: Utility functions (e.g., `utils.ts` for title normalization and Tailwind class merging).

### `supabase/`
Supabase configuration and database definitions.
*   **`functions/`**: Edge functions (e.g., `search-movie`, `propose-movie-with-details`).
*   **`migrations/`**: SQL files defining the database schema and changes.

## Data Model (Supabase)
The application revolves around `movie_sessions`. Key tables include:
*   `movie_sessions`: Represents a group or event.
*   `session_people`: Participants in a specific session.
*   `movie_proposals`: Movies suggested for viewing.
*   `watched_movies`: Movies that have been watched (copies metadata from proposals).
*   `movie_ratings`: Pre-watch "hype" ratings (0-5 stars). Rows are preserved after a movie is watched.
*   `detailed_ratings`: Post-watch "scores" (0-10, half-points allowed).

## Development & Usage

### Prerequisites
*   Node.js (npm)
*   Supabase project credentials (likely in `.env`, though not committed)

### Common Commands
*   **Start Development Server:** `npm run dev`
*   **Build for Production:** `npm run build`
*   **Lint Code:** `npm run lint`
*   **Preview Build:** `npm run preview`
*   **Run Tests:** `npm run test`

### Conventions
*   **Components:** Use functional components with hooks.
*   **Styling:** Use Tailwind CSS utility classes. Prefer `cn()` (from `lib/utils.ts`) for conditional class merging.
*   **Types:** Strictly use TypeScript interfaces/types. Refer to `src/integrations/supabase/types.ts` for DB-related types.
*   **Imports:** Use absolute imports with `@/` alias (pointing to `src/`).
*   **Sorting:** Use `normalizeTitle` utility to ignore leading "The " when sorting movie lists.

## Note for AI Agents
When modifying the database schema, ensure you check `src/integrations/supabase/types.ts` to see if types need regenerating. The "Stats" section uses a custom `useStatsData` hook that fetches data directly from multiple tables; ensure any schema changes are reflected in its aggregations in `src/components/Stats/utils.ts`.
