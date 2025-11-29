import { render, screen } from '@testing-library/react';
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
  it('renders ranked movies list', () => {
    render(
      <ResultsPanel
        rankedMovies={mockRankedMovies}
        people={mockPeople}
        markMovieAsWatched={vi.fn()}
      />
    );

    expect(screen.getByText('Best Movie')).toBeInTheDocument();
    expect(screen.getByText('Mediocre Movie')).toBeInTheDocument();
    // Check if the rank badge (1, 2) is rendered. 
    // The code renders index + 1 inside a div.
    expect(screen.getByText('1')).toBeInTheDocument();
    expect(screen.getByText('2')).toBeInTheDocument();
  });

  // Test empty state handling
  it('shows empty state when no movies are ranked', () => {
    render(
      <ResultsPanel
        rankedMovies={[]}
        people={mockPeople}
        markMovieAsWatched={vi.fn()}
      />
    );

    expect(screen.getByText(/No results found/i)).toBeInTheDocument();
  });

  // Test that the "Watched" action is available
  it('renders watched button for movies', () => {
    render(
      <ResultsPanel
        rankedMovies={mockRankedMovies}
        people={mockPeople}
        markMovieAsWatched={vi.fn()}
      />
    );
    
    // There should be a "Watched" button for each movie
    const buttons = screen.getAllByText(/Watched/i);
    expect(buttons.length).toBeGreaterThan(0);
  });
});
