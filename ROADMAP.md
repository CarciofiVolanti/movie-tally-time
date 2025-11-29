# Future Roadmap: Movie Tally Time

This document outlines potential improvements, fixes, and new features for the Movie Tally Time application.

## 1. Immediate Fixes & Stability

*   **Resolve `act(...)` Test Warnings:**
    *   **Issue:** Tests for `ResultsPanel` and `PeoplePanel` log warnings about state updates not being wrapped in `act(...)`.
    *   **Fix:** Update tests to use `waitFor` or properly await asynchronous operations (like the `useEffect` in `ResultsPanel` fetching favorites) to ensure the component settles before assertions.
*   **Error Handling in UI:**
    *   **Improvement:** Currently, if the backend fails, toast notifications are shown. We should add more robust "Error Boundary" components to prevent the entire app from crashing if a specific panel fails to render.
    *   **Specifics:** Add a fallback UI for `MovieSelectorRoot` if the session ID is invalid or the network is down.
*   **Cleanup Unused Imports:**
    *   **Task:** Remove unused imports across the codebase (e.g., checking if `supabase` is still imported in components that now rely purely on props).

## 2. Architecture & Code Quality

*   **Type Safety Improvements:**
    *   **Improvement:** There are several places using `as any` casting (e.g., in `useMovieSession.ts` logic).
    *   **Action:** Define precise interfaces for the join results from Supabase (e.g., `MovieProposalWithRatings`) to eliminate `any` and potential runtime errors.
*   **Hook Decomposition:**
    *   **Refactor:** `useMovieSession` is still quite large. It handles fetching, sorting, realtime updates, and CRUD operations.
    *   **Action:** Break it down into smaller custom hooks:
        *   `useSessionPeople(sessionId)`
        *   `useSessionMovies(sessionId)`
        *   `useSessionRealtime(sessionId)`
    *   This will make the logic easier to test and maintain.

## 3. Performance Improvements

*   **Memoization:**
    *   **Improvement:** Use `React.memo` for `MovieCard` and `PersonCard` to prevent re-renders when the parent state changes but the specific card data hasn't.
    *   **Impact:** Smoother UI when rating movies in large sessions (50+ movies).
*   **Virtualization:**
    *   **Improvement:** If a session grows to 100+ movies, rendering them all in `RatePanel` will be slow.
    *   **Action:** Implement `react-window` or `react-virtuoso` to only render the movie cards currently visible on screen.
*   **Optimistic Updates for Ratings:**
    *   **Current:** We wait for the Realtime subscription to update the local state.
    *   **Improvement:** Optimistically update the UI immediately when the user clicks a star, then revert if the DB write fails. This makes the app feel "instant".

## 4. New Features

### B. Advanced Voting Mechanisms
*   **"Spin the Wheel":** A fun feature to randomly select a movie from the top 5 rated ones.

### C. User Experience (UX)
*   **User Accounts (Optional):** Currently, users select their name from a list. Adding optional auth would allow:
    *   Persistent history of all sessions a user has attended.
    *   "My Stats" page (favorite genres, average rating given).
*   **Mobile View Optimization:**
    *   The current card layout is good, but a simplified "Swipe Left/Right" interface (Tinder-style) for quick voting on mobile would be fun and efficient.

## 5. Migration & Infrastructure (Oracle VM)
*   **CI/CD Pipeline:**
    *   **Task:** Set up GitHub Actions to automatically build and test the project on every push.
