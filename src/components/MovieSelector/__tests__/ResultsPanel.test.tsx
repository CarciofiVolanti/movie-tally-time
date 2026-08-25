import { render, screen, act } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import ResultsPanel from '../ResultsPanel';
import { MovieWithStats, Person } from '@/types/session';

// Mock Supabase to prevent actual network calls in this component's useEffect
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: () => ({
      select: () => Promise.resolve({ data: [], error: null })
    })
  }
}));

describe('ResultsPanel', () => {
  const mockRankedMovies: MovieWithStats[] = [
    {
      movieTitle: 'Best Movie',
      proposedBy: 'Alice',
      ratings: { 'p1': 5 },
      averageRating: 5.0,
      totalRatings: 1,
      details: { poster: 'poster.jpg' }
    },
    {
      movieTitle: 'Mediocre Movie',
      proposedBy: 'Bob',
      ratings: { 'p1': 3 },
      averageRating: 3.0,
      totalRatings: 1
    }
  ];

  const mockPeople: Person[] = [
    { id: 'p1', name: 'Alice', isPresent: true, movies: [] }
  ];

  // Test that the component correctly renders the list of ranked movies
  it('renders ranked movies list', async () => {
    await act(async () => {
      render(
        <ResultsPanel
          rankedMovies={mockRankedMovies}
          people={mockPeople}
          markMovieAsWatched={vi.fn()}
        />
      );
    });

    expect(screen.getByText('Best Movie')).toBeInTheDocument();
    expect(screen.getByText('Mediocre Movie')).toBeInTheDocument();
    expect(screen.getByText('1')).toBeInTheDocument();
    expect(screen.getByText('2')).toBeInTheDocument();
  });

  // Test empty state handling
  it('shows empty state when no movies are ranked', async () => {
    await act(async () => {
      render(
        <ResultsPanel
          rankedMovies={[]}
          people={mockPeople}
          markMovieAsWatched={vi.fn()}
        />
      );
    });

    expect(screen.getByText(/No results found/i)).toBeInTheDocument();
  });

  // Test that the "Watched" action is available
  it('renders watched button for movies', async () => {
    await act(async () => {
      render(
        <ResultsPanel
          rankedMovies={mockRankedMovies}
          people={mockPeople}
          markMovieAsWatched={vi.fn()}
        />
      );
    });

    const buttons = screen.getAllByText(/Watched/i);
    expect(buttons.length).toBeGreaterThan(0);
  });

  // Test that proposal age is rendered when createdAt is present
  it('renders proposal age when createdAt is provided', async () => {
    const moviesWithAge: MovieWithStats[] = [
      {
        movieTitle: 'Old Movie',
        proposedBy: 'Alice',
        ratings: { 'p1': 5 },
        averageRating: 5.0,
        totalRatings: 1,
        createdAt: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString(),
      },
    ];

    await act(async () => {
      render(
        <ResultsPanel
          rankedMovies={moviesWithAge}
          people={mockPeople}
          markMovieAsWatched={vi.fn()}
        />
      );
    });

    expect(screen.getByText(/4 days ago/i)).toBeInTheDocument();
  });

  // Test that proposer comment is rendered when present
  it('renders proposer comment when present in ranked movies', async () => {
    const moviesWithComment: MovieWithStats[] = [
      {
        movieTitle: 'Commented Movie',
        proposedBy: 'Alice',
        comment: 'A director masterpiece',
        ratings: { 'p1': 5 },
        averageRating: 5.0,
        totalRatings: 1,
      },
    ];

    await act(async () => {
      render(
        <ResultsPanel
          rankedMovies={moviesWithComment}
          people={mockPeople}
          markMovieAsWatched={vi.fn()}
        />
      );
    });

    expect(screen.getByText(/Proposer comment:/i)).toBeInTheDocument();
    expect(screen.getByText('A director masterpiece')).toBeInTheDocument();
  });
});
