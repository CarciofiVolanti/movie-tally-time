import { render, screen, fireEvent, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AddMovieDialog } from '../AddMovieDialog';
import { supabase } from '@/integrations/supabase/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    functions: {
      invoke: vi.fn(),
    },
    from: vi.fn(),
    rpc: vi.fn(),
  },
}));

describe('AddMovieDialog', () => {
  const renderDialog = (onMovieAdded = vi.fn().mockResolvedValue(undefined), onClose = vi.fn()) => render(
    <QueryClientProvider client={new QueryClient()}>
      <AddMovieDialog sessionId="sess-123" people={people} onClose={onClose} onMovieAdded={onMovieAdded} />
    </QueryClientProvider>
  );
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
    vi.mocked(supabase.from).mockImplementation((table) => (table === 'movie_proposals'
      ? { select: () => ({ eq: vi.fn().mockResolvedValue({ data: [], error: null }) }) }
      : { insert: mockInsert }) as unknown as ReturnType<typeof supabase.from>);

    const onMovieAdded = vi.fn().mockResolvedValue(undefined);
    const onClose = vi.fn();

    renderDialog(onMovieAdded, onClose);

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

  it('warns about a matching proposal and moves it with its pre-watch ratings', async () => {
    const insert = vi.fn();
    const eq = vi.fn().mockResolvedValue({ data: [{ id: 'proposal-1', movie_title: 'Isle of Dogs', imdb_id: null, year: null, person_id: 'p1' }], error: null });
    vi.mocked(supabase.from).mockImplementation((table) => (table === 'movie_proposals'
      ? { select: () => ({ eq }) } : { insert }) as unknown as ReturnType<typeof supabase.from>);
    vi.mocked(supabase.rpc).mockResolvedValue({ data: [{ watched_movie_id: 'w1', movie_title: 'Isle of Dogs', already_watched: false }], error: null } as never);
    const onMovieAdded = vi.fn().mockResolvedValue(undefined);
    const onClose = vi.fn();
    renderDialog(onMovieAdded, onClose);
    fireEvent.change(screen.getByLabelText(/movie title/i), { target: { value: '  ISLE  OF DOGS ' } });
    fireEvent.change(screen.getByLabelText(/proposed by/i), { target: { value: 'Bob' } });
    await act(async () => { fireEvent.click(screen.getByRole('button', { name: /add without details/i })); });
    expect(eq).toHaveBeenCalledWith('session_id', 'sess-123');
    expect(screen.getByRole('alert')).toHaveTextContent('already in the proposals');
    expect(insert).not.toHaveBeenCalled();
    await act(async () => { fireEvent.click(screen.getByRole('button', { name: /move isle of dogs to watched/i })); });
    expect(supabase.rpc).toHaveBeenCalledWith('mark_movie_as_watched', { p_proposal_id: 'proposal-1' });
    expect(onMovieAdded).toHaveBeenCalled();
    expect(onClose).toHaveBeenCalled();
    expect(insert).not.toHaveBeenCalled();
  });

  it('allows a separate addition only after warning about a matching proposal', async () => {
    const insert = vi.fn().mockResolvedValue({ error: null });
    vi.mocked(supabase.from).mockImplementation((table) => (table === 'movie_proposals'
      ? { select: () => ({ eq: vi.fn().mockResolvedValue({ data: [{ id: 'p', movie_title: 'Alien', imdb_id: null, year: null, person_id: 'p1' }], error: null }) }) }
      : { insert }) as unknown as ReturnType<typeof supabase.from>);
    renderDialog();
    fireEvent.change(screen.getByLabelText(/movie title/i), { target: { value: 'Alien' } });
    fireEvent.change(screen.getByLabelText(/proposed by/i), { target: { value: 'Bob' } });
    await act(async () => { fireEvent.click(screen.getByRole('button', { name: /add without details/i })); });
    expect(insert).not.toHaveBeenCalled();
    await act(async () => { fireEvent.click(screen.getByRole('button', { name: /add separately anyway/i })); });
    expect(insert).toHaveBeenCalledOnce();
  });

  it('does not add a movie when the proposal check fails', async () => {
    const insert = vi.fn();
    vi.mocked(supabase.from).mockImplementation((table) => (table === 'movie_proposals'
      ? { select: () => ({ eq: vi.fn().mockResolvedValue({ data: null, error: new Error('offline') }) }) }
      : { insert }) as unknown as ReturnType<typeof supabase.from>);
    renderDialog();
    fireEvent.change(screen.getByLabelText(/movie title/i), { target: { value: 'Alien' } });
    fireEvent.change(screen.getByLabelText(/proposed by/i), { target: { value: 'Alice' } });
    await act(async () => { fireEvent.click(screen.getByRole('button', { name: /add without details/i })); });
    expect(insert).not.toHaveBeenCalled();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });
});
