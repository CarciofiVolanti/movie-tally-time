# Movie Tally Time

## Project Overview
**Movie Tally Time** is a React-based web application designed to facilitate movie nights. It allows groups of friends ("sessions") to propose movies, track who is present, record watched movies, and rate them. The application uses Supabase for its backend database and real-time capabilities.

## Tech Stack
*   **Frontend Framework:** React (with Vite)
*   **Language:** TypeScript
*   **Styling:** Tailwind CSS
*   **UI Component Library:** Shadcn UI (built on Radix UI primitives)
*   **State Management & Data Fetching:** TanStack Query (React Query)
*   **Routing:** React Router DOM
*   **Backend:** Supabase (PostgreSQL)
*   **Icons:** Lucide React

## Key Architecture & Directories

### `src/`
The core application source code.

*   **`pages/`**: Top-level page components.
    *   `Index.tsx`: The main entry point for the application logic. It manages the high-level state switching between the "Session" view (proposing/selecting) and "Watched" view (history/rating).
*   **`components/`**: React components.
    *   `ui/`: Generic, reusable UI components (mostly from Shadcn UI).
    *   `MovieSelector/`: Components related to the movie proposal and selection phase.
    *   `WatchedMovies/`: Components related to the history of watched movies, including rating and ranking views.
    *   `deprecated/`: Older components kept for reference.
*   **`hooks/`**: Custom React hooks, often wrapping Supabase logic (e.g., `useWatchedMoviesData`, `useMovieSession`).
*   **`integrations/supabase/`**: Supabase client initialization and generated TypeScript types (`types.ts`).
*   **`lib/`**: Utility functions (e.g., `utils.ts` for Tailwind class merging).

### `supabase/`
Supabase configuration and database definitions.
*   **`functions/`**: Edge functions (e.g., `search-movie`).
*   **`migrations/`**: SQL files defining the database schema and changes.

## Data Model (Supabase)
The application revolves around `movie_sessions`. Key tables include:
*   `movie_sessions`: Represents a group or event.
*   `session_people`: Participants in a specific session.
*   `movie_proposals`: Movies suggested for viewing.
*   `watched_movies`: Movies that have been watched.
*   `movie_ratings`: Ratings assigned to movies by participants of how much they want to watch them.
*   `detailed_ratings`: Vote for each watched movie from 0 to 10 (with half-point increments) after watching.

## Development & Usage

### Prerequisites
*   Node.js (npm)
*   Supabase project credentials (likely in `.env`, though not committed)

### Common Commands
*   **Start Development Server:** `npm run dev`
*   **Build for Production:** `npm run build`
*   **Lint Code:** `npm run lint`
*   **Preview Build:** `npm run preview`

### Conventions
*   **Components:** Use functional components with hooks.
*   **Styling:** Use Tailwind CSS utility classes. Prefer `cn()` (from `lib/utils.ts`) for conditional class merging.
*   **Types:** Strictly use TypeScript interfaces/types. Refer to `src/integrations/supabase/types.ts` for DB-related types.
*   **Imports:** Use absolute imports with `@/` alias (pointing to `src/`).

## Note for AI Agents
When modifying the database schema, ensure you check `src/integrations/supabase/types.ts` to see if types need regenerating (or if the user needs to run a command to do so). When adding new features, look for existing patterns in `MovieSelector` or `WatchedMovies` directories to maintain consistency.