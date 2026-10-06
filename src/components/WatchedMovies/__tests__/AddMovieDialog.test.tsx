import { render, screen, fireEvent, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AddMovieDialog } from '../AddMovieDialog';
import { supabase } from '@/integrations/supabase/client';

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    functions: {
      invoke: vi.fn(),
    },
    from: vi.fn(),
  },
}));

describe('AddMovieDialog', () => {
  const people = [
    { id: 'p1', name: 'Alice', is_present: true },
    { id: 'p2', name: 'Bob', is_present: true },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('searches TMDB, renders multiple options, and adds selected movie with details', async () => {
    const mockSearchResults = [
      {
        title: 'Alien',
        year: '1979',
        director: 'Ridley Scott',
        runtime: '117 min',
        genre: 'Horror, Sci-Fi',
        imdbRating: '8.5',
        imdbId: 'tt0078748',
        tmdbId: 348,
        poster: 'https://image.tmdb.org/t/p/w500/alien.jpg',
      },
      {
        title: 'Aliens',
        year: '1986',
        director: 'James Cameron',
        runtime: '137 min',
        genre: 'Action, Sci-Fi',
        imdbRating: '8.4',
        imdbId: 'tt0090605',
        tmdbId: 679,
        poster: 'https://image.tmdb.org/t/p/w500/aliens.jpg',
      },
    ];

    vi.mocked(supabase.functions.invoke).mockResolvedValueOnce({
      data: {
        ...mockSearchResults[0],
        results: mockSearchResults,
      },
      error: null,
    } as unknown as ReturnType<typeof supabase.functions.invoke>);

    const mockInsert = vi.fn().mockResolvedValue({ error: null });
    vi.mocked(supabase.from).mockReturnValue({
      insert: mockInsert,
    } as unknown as ReturnType<typeof supabase.from>);

    const onMovieAdded = vi.fn().mockResolvedValue(undefined);
    const onClose = vi.fn();

    render(
      <AddMovieDialog
        sessionId="sess-123"
        people={people}
        onClose={onClose}
        onMovieAdded={onMovieAdded}
      />
    );

    const input = screen.getByPlaceholderText(/enter movie title/i);
    fireEvent.change(input, { target: { value: 'Alien' } });

    const searchBtn = screen.getByRole('button', { name: /search/i });
    await act(async () => {
      fireEvent.click(searchBtn);
    });

    expect(screen.getByText(/Search Results \(2 options\)/i)).toBeInTheDocument();
    expect(screen.getByText('Alien')).toBeInTheDocument();
    expect(screen.getByText('Aliens')).toBeInTheDocument();

    // Select Aliens (second option)
    fireEvent.click(screen.getByText('Aliens'));

    // Select proposer
    const proposerSelect = screen.getByLabelText(/proposed by/i);
    fireEvent.change(proposerSelect, { target: { value: 'Bob' } });

    // Submit
    const addBtn = screen.getByRole('button', { name: /add selected movie/i });
    await act(async () => {
      fireEvent.click(addBtn);
    });

    expect(mockInsert).toHaveBeenCalledWith(
      expect.objectContaining({
        session_id: 'sess-123',
        movie_title: 'Aliens',
        proposed_by: 'Bob',
        director: 'James Cameron',
        runtime: '137 min',
        genre: 'Action, Sci-Fi',
        imdb_id: 'tt0090605',
        imdb_rating: '8.4',
      })
    );
    expect(onMovieAdded).toHaveBeenCalled();
    expect(onClose).toHaveBeenCalled();
  });
});
