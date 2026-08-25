import { describe, it, expect } from 'vitest';
import { sortRatings, sortPeople, transformPeopleData, transformRatingsData, formatProposalAge, formatDateDDMMYYYY } from '../sessionHelpers';
import { MovieRating, Person } from '@/types/session';

const makeMovie = (title: string, ratings: Record<string, number> = {}): MovieRating => ({
  movieTitle: title, proposedBy: 'Alice', ratings,
});

describe('sessionHelpers', () => {
  describe('formatDateDDMMYYYY', () => {
    it('returns empty string for null, undefined, or invalid dates', () => {
      expect(formatDateDDMMYYYY(undefined)).toBe('');
      expect(formatDateDDMMYYYY(null)).toBe('');
      expect(formatDateDDMMYYYY('not-a-date')).toBe('');
    });

    it('formats valid ISO date strings to DD/MM/YYYY', () => {
      expect(formatDateDDMMYYYY('2026-08-22T10:00:00Z')).toBe('22/08/2026');
      expect(formatDateDDMMYYYY('2025-01-05T12:30:00Z')).toBe('05/01/2025');
    });
  });

  describe('formatProposalAge', () => {
    it('returns null for undefined, null, or empty string', () => {
      expect(formatProposalAge(undefined)).toBeNull();
      expect(formatProposalAge(null)).toBeNull();
      expect(formatProposalAge('')).toBeNull();
    });

    it('returns null for invalid date string', () => {
      expect(formatProposalAge('invalid-date')).toBeNull();
    });

    it('formats a recent timestamp into relative distance with suffix', () => {
      const now = new Date().toISOString();
      expect(formatProposalAge(now)).toMatch(/ago$/);
    });

    it('formats an older timestamp into relative distance', () => {
      const threeDaysAgo = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString();
      const formatted = formatProposalAge(threeDaysAgo);
      expect(formatted).toBe('3 days ago');
    });
  });

  describe('sortRatings', () => {
    it('sorts alphabetically when no personId', () => {
      const input = [makeMovie('The Matrix'), makeMovie('Aliens'), makeMovie('Blade Runner')];
      const sorted = sortRatings(input, '');
      expect(sorted.map(m => m.movieTitle)).toEqual(['Aliens', 'Blade Runner', 'The Matrix']);
    });

    it('ignores leading "The" in alpha sort', () => {
      const input = [makeMovie('The Matrix'), makeMovie('Arrival')];
      const sorted = sortRatings(input, '');
      // "Matrix" vs "Arrival" → Arrival first
      expect(sorted[0].movieTitle).toBe('Arrival');
    });

    it('puts unrated movies first for the selected person', () => {
      const input = [
        makeMovie('Already Rated', { p1: 4 }),
        makeMovie('Not Rated'),
      ];
      const sorted = sortRatings(input, 'p1');
      expect(sorted[0].movieTitle).toBe('Not Rated');
    });
  });

  describe('sortPeople', () => {
    const mockPeople: Person[] = [
      { id: 'p1', name: 'Charlie', isPresent: true, movies: [] },
      { id: 'p2', name: 'Alice', isPresent: true, movies: [] },
      { id: 'p3', name: 'Bob', isPresent: false, movies: [] },
    ];

    it('sorts alphabetically when no selectedPersonId is provided', () => {
      const sorted = sortPeople(mockPeople);
      expect(sorted.map(p => p.name)).toEqual(['Alice', 'Bob', 'Charlie']);
    });

    it('sorts alphabetically when selectedPersonId is empty', () => {
      const sorted = sortPeople(mockPeople, '');
      expect(sorted.map(p => p.name)).toEqual(['Alice', 'Bob', 'Charlie']);
    });

    it('places the selected person first, with the rest sorted alphabetically', () => {
      const sortedWithCharlie = sortPeople(mockPeople, 'p1');
      expect(sortedWithCharlie.map(p => p.name)).toEqual(['Charlie', 'Alice', 'Bob']);

      const sortedWithBob = sortPeople(mockPeople, 'p3');
      expect(sortedWithBob.map(p => p.name)).toEqual(['Bob', 'Alice', 'Charlie']);
    });

    it('handles selectedPersonId that does not exist in the list', () => {
      const sorted = sortPeople(mockPeople, 'p999');
      expect(sorted.map(p => p.name)).toEqual(['Alice', 'Bob', 'Charlie']);
    });

    it('handles empty or single person arrays', () => {
      expect(sortPeople([])).toEqual([]);
      expect(sortPeople([mockPeople[0]], 'p1')).toEqual([mockPeople[0]]);
    });
  });

  describe('transformPeopleData', () => {
    it('transforms people and maps their movie proposals', () => {
      const mockPeople = [
        { id: 'p1', name: 'Alice', is_present: true, session_id: 's1', created_at: '' },
        { id: 'p2', name: 'Bob', is_present: false, session_id: 's1', created_at: '' },
      ];
      const mockProposals = [
        { id: 'pr1', person_id: 'p1', movie_title: 'Inception', session_id: 's1', created_at: '', director: null, genre: null, imdb_id: null, imdb_rating: null, plot: null, poster: null, runtime: null, year: null },
        { id: 'pr2', person_id: 'p1', movie_title: 'Interstellar', session_id: 's1', created_at: '', director: null, genre: null, imdb_id: null, imdb_rating: null, plot: null, poster: null, runtime: null, year: null },
      ];

      const result = transformPeopleData(mockPeople as any, mockProposals as any);
      expect(result).toEqual([
        { id: 'p1', name: 'Alice', isPresent: true, movies: ['Inception', 'Interstellar'] },
        { id: 'p2', name: 'Bob', isPresent: false, movies: [] },
      ]);
    });

    it('handles empty or undefined arrays gracefully', () => {
      expect(transformPeopleData([], [])).toEqual([]);
      expect(transformPeopleData(undefined as any, undefined as any)).toEqual([]);
    });
  });

  describe('transformRatingsData', () => {
    it('handles proposals with null proposal_comments and movie_ratings', () => {
      const mockProposals = [
        {
          id: 'pr1',
          person_id: 'p1',
          movie_title: 'Inception',
          session_id: 's1',
          created_at: '2026-08-20T10:00:00Z',
          director: 'Christopher Nolan',
          genre: 'Sci-Fi',
          imdb_id: 'tt1375666',
          imdb_rating: '8.8',
          plot: 'Dreams within dreams',
          poster: 'https://image.url',
          runtime: '148 min',
          year: '2010',
          movie_ratings: null,
          proposal_comments: null,
        },
      ];
      const mockPeople = [
        { id: 'p1', name: 'Alice', is_present: true, session_id: 's1', created_at: '' },
      ];

      const result = transformRatingsData({ proposals: mockProposals as any }, mockPeople as any);
      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({
        movieTitle: 'Inception',
        proposedBy: 'Alice',
        ratings: {},
        details: {
          poster: 'https://image.url',
          genre: 'Sci-Fi',
          runtime: '148 min',
          year: '2010',
          director: 'Christopher Nolan',
          plot: 'Dreams within dreams',
          imdbRating: '8.8',
          imdbId: 'tt1375666',
        },
        comment: undefined,
        proposalId: 'pr1',
        proposerId: 'p1',
        createdAt: '2026-08-20T10:00:00Z',
      });
    });

    it('correctly maps ratings and comments when present', () => {
      const mockProposals = [
        {
          id: 'pr1',
          person_id: 'p1',
          movie_title: 'Arrival',
          session_id: 's1',
          created_at: '2026-08-21T10:00:00Z',
          director: null, genre: null, imdb_id: null, imdb_rating: null, plot: null, poster: null, runtime: null, year: null,
          movie_ratings: [
            { id: 'r1', person_id: 'p1', rating: 5, proposal_id: 'pr1', created_at: '', updated_at: '', watched_movie_id: null },
            { id: 'r2', person_id: 'p2', rating: 4, proposal_id: 'pr1', created_at: '', updated_at: '', watched_movie_id: null },
          ],
          proposal_comments: [
            { id: 'c1', author: 'p1', comment: 'Great movie!', proposal_id: 'pr1', created_at: '', updated_at: null },
          ],
        },
      ];
      const mockPeople = [
        { id: 'p1', name: 'Alice', is_present: true, session_id: 's1', created_at: '' },
      ];

      const result = transformRatingsData({ proposals: mockProposals as any }, mockPeople as any);
      expect(result).toHaveLength(1);
      expect(result[0].ratings).toEqual({ p1: 5, p2: 4 });
      expect(result[0].comment).toBe('Great movie!');
      expect(result[0].details).toBeUndefined();
      expect(result[0].createdAt).toBe('2026-08-21T10:00:00Z');
    });

    it('correctly maps 1-to-1 object proposal_comments (PostgREST unique constraint response)', () => {
      const mockProposals = [
        {
          id: 'pr1',
          person_id: 'p1',
          movie_title: 'Arrival',
          session_id: 's1',
          created_at: '2026-08-21T10:00:00Z',
          director: null, genre: null, imdb_id: null, imdb_rating: null, plot: null, poster: null, runtime: null, year: null,
          movie_ratings: [],
          proposal_comments: { id: 'c1', author: 'p1', comment: 'Must see!', proposal_id: 'pr1', created_at: '', updated_at: null },
        },
      ];
      const mockPeople = [
        { id: 'p1', name: 'Alice', is_present: true, session_id: 's1', created_at: '' },
      ];

      const result = transformRatingsData({ proposals: mockProposals as any }, mockPeople as any);
      expect(result).toHaveLength(1);
      expect(result[0].comment).toBe('Must see!');
    });
  });
});

