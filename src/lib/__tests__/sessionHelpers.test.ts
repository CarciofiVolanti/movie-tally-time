import { describe, it, expect } from 'vitest';
import { sortMovieRatings } from '../sessionHelpers';
import { MovieRating } from '@/types/session';

describe('sessionHelpers', () => {
  describe('sortMovieRatings', () => {
    const mockRatings: MovieRating[] = [
      {
        movieTitle: 'B Movie',
        proposedBy: 'Alice',
        ratings: { 'p1': 5, 'p2': 0 }, // p1 rated, p2 not
        proposerId: 'p3'
      },
      {
        movieTitle: 'A Movie',
        proposedBy: 'Bob',
        ratings: { 'p1': 0, 'p2': 4 }, // p1 not rated, p2 rated
        proposerId: 'p4'
      },
      {
        movieTitle: 'C Movie',
        proposedBy: 'Charlie',
        ratings: {}, // no one rated
        proposerId: 'p5'
      }
    ];

    // Test basic alphabetical sorting when no user context is provided
    it('sorts alphabetically when no person is selected', () => {
      const sorted = sortMovieRatings([...mockRatings], '');
      expect(sorted.map(m => m.movieTitle)).toEqual(['A Movie', 'B Movie', 'C Movie']);
    });

    // Test the logic that prioritizes "unrated" movies for the active user
    // This is crucial for the UX: show users what they haven't voted on yet.
    it('sorts unrated movies first for a specific person', () => {
      // Person 'p1' has rated 'B Movie' (5) but not 'A Movie' (0) or 'C Movie' (undefined/empty)
      // Expected order: Unrated first (A, C), then Rated (B)
      // Within "Unrated", alphabetical: A, then C
      const sorted = sortMovieRatings([...mockRatings], 'p1');
      const titles = sorted.map(m => m.movieTitle);
      
      // A (unrated) vs C (unrated) -> Alphabetical -> A, C
      // B (rated) comes last
      expect(titles).toEqual(['A Movie', 'C Movie', 'B Movie']);
    });

    // Verify the sort logic adapts correctly when switching to a different user
    it('sorts unrated movies first for another person', () => {
      // Person 'p2' has rated 'A Movie' (4) but not 'B Movie' (0)
      // Expected: B (unrated), C (unrated) -> then A (rated)
      const sorted = sortMovieRatings([...mockRatings], 'p2');
      const titles = sorted.map(m => m.movieTitle);
      
      expect(titles).toEqual(['B Movie', 'C Movie', 'A Movie']);
    });
  });
});
