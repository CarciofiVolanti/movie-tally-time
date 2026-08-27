import { render, screen, fireEvent, act } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { WatchedMovies } from '../index';

vi.mock('../hooks/useWatchedMoviesData', () => ({
  useWatchedMoviesData: () => ({
    loading: false,
    watchedMovies: [
      {
        id: 'w1',
        session_id: 's1',
        movie_title: 'Inception',
        proposed_by: 'Alice',
        genre: 'Sci-Fi',
        director: 'Christopher Nolan',
        year: '2010',
        watched_at: '2026-01-01T00:00:00Z',
      },
      {
        id: 'w2',
        session_id: 's1',
        movie_title: 'The Godfather',
        proposed_by: 'Bob',
        genre: 'Crime, Drama',
        director: 'Francis Ford Coppola',
        year: '1972',
        watched_at: '2026-01-02T00:00:00Z',
      },
    ],
    detailedRatings: [],
    people: [
      { id: 'p1', name: 'Alice', is_present: true },
      { id: 'p2', name: 'Bob', is_present: true },
    ],
    loadData: vi.fn(),
  }),
}));

vi.mock('../MovieRatingTab', () => ({
  default: ({ watchedMovies }: { watchedMovies: Array<{ id: string; movie_title: string }> }) => (
    <div data-testid="movie-rating-tab">
      {watchedMovies.map((m) => (
        <span key={m.id} data-testid="tab-movie-item">{m.movie_title}</span>
      ))}
    </div>
  ),
}));

vi.mock('../MovieRankings', () => ({
  default: ({ watchedMovies }: { watchedMovies: Array<{ id: string; movie_title: string }> }) => (
    <div data-testid="movie-rankings-tab">
      {watchedMovies.map((m) => (
        <span key={m.id} data-testid="rankings-movie-item">{m.movie_title}</span>
      ))}
    </div>
  ),
}));

describe('WatchedMovies', () => {
  it('renders search bar and filters movies across tabs', async () => {
    render(<WatchedMovies sessionId="s1" onBack={vi.fn()} />);

    const searchInput = screen.getByPlaceholderText(/Search watched movies/i);
    expect(searchInput).toBeInTheDocument();

    // Both movies displayed initially
    expect(screen.getByText('Inception')).toBeInTheDocument();
    expect(screen.getByText('The Godfather')).toBeInTheDocument();

    // Search for "Inception"
    await act(async () => {
      fireEvent.change(searchInput, { target: { value: 'Inception' } });
    });

    expect(screen.getByText('Inception')).toBeInTheDocument();
    expect(screen.queryByText('The Godfather')).not.toBeInTheDocument();

    // Clear search
    const clearBtn = screen.getByLabelText(/Clear search/i);
    await act(async () => {
      fireEvent.click(clearBtn);
    });

    expect(screen.getByText('Inception')).toBeInTheDocument();
    expect(screen.getByText('The Godfather')).toBeInTheDocument();
  });
});
