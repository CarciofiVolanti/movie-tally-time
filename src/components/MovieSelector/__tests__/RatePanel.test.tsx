import { render, screen, fireEvent, act } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import RatePanel from '../RatePanel';
import { MovieRating, Person } from '@/types/session';

// Mock hooks and components
vi.mock('@/hooks/useFavouriteMovie', () => ({
  default: () => ({
    favoriteProposalId: null,
    loading: false,
    toggleFavourite: vi.fn(),
  }),
}));

vi.mock('../../MovieCard', () => ({
  MovieCard: ({ movie, people, ignorePresence, onSaveComment }: any) => (
    <div data-testid={`movie-card-${movie.movieTitle}`}>
      <span data-testid="card-title">{movie.movieTitle}</span>
      <span data-testid="card-proposer">{movie.proposedBy}</span>
      <span data-testid="card-comment">{movie.comment || 'No comment'}</span>
      <span data-testid="card-ignore-presence">{String(ignorePresence)}</span>
      <span data-testid="card-people-count">{people?.length ?? 0}</span>
      {onSaveComment && (
        <button
          data-testid="save-comment-btn"
          onClick={() => onSaveComment(movie.proposalId, 'New saved comment')}
        >
          Save Comment
        </button>
      )}
    </div>
  ),
}));

describe('RatePanel', () => {
  const mockPeople: Person[] = [
    { id: 'p1', name: 'Alice', isPresent: true, movies: [] },
    { id: 'p2', name: 'Bob', isPresent: true, movies: [] },
  ];

  const mockMovies: MovieRating[] = [
    {
      movieTitle: 'The Matrix',
      proposedBy: 'Alice',
      proposerId: 'p1',
      proposalId: 'prop-1',
      comment: 'Best sci-fi ever',
      ratings: { p1: 5 },
    },
    {
      movieTitle: 'Interstellar',
      proposedBy: 'Bob',
      proposerId: 'p2',
      proposalId: 'prop-2',
      comment: undefined,
      ratings: { p2: 5 },
    },
  ];

  const defaultProps = {
    movieRatings: mockMovies,
    presentPeople: mockPeople,
    selectedPersonId: 'p1',
    setSelectedPersonId: vi.fn(),
    fetchingDetails: false,
    fetchAllMovieDetails: vi.fn(),
    updateRating: vi.fn(),
    updateComment: vi.fn(),
    searchMovieAgain: vi.fn(),
    markMovieAsWatched: vi.fn(),
    collapsedMovies: { 'The Matrix': false, 'Interstellar': false },
    toggleCollapse: vi.fn(),
    setShouldSort: vi.fn(),
  };

  it('renders movie titles in the panel', () => {
    render(<RatePanel {...defaultProps} />);

    expect(screen.getAllByText('The Matrix').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Interstellar').length).toBeGreaterThan(0);
  });

  it('displays comments when movie cards are expanded', () => {
    render(<RatePanel {...defaultProps} />);

    expect(screen.getByText('Best sci-fi ever')).toBeInTheDocument();
    expect(screen.getByText('No comment')).toBeInTheDocument();
  });

  it('calls updateComment when a comment is saved from the expanded card', async () => {
    const handleUpdateComment = vi.fn().mockResolvedValue(undefined);
    render(<RatePanel {...defaultProps} updateComment={handleUpdateComment} />);

    const saveButtons = screen.getAllByTestId('save-comment-btn');
    await act(async () => {
      fireEvent.click(saveButtons[0]);
    });

    expect(handleUpdateComment).toHaveBeenCalledWith('prop-1', 'p1', 'New saved comment');
  });

  it('renders the "Show all votes" switch and updates badge and MovieCard props when toggled', async () => {
    const allPeople: Person[] = [
      { id: 'p1', name: 'Alice', isPresent: true, movies: [] },
      { id: 'p2', name: 'Bob', isPresent: true, movies: [] },
      { id: 'p3', name: 'Charlie', isPresent: false, movies: [] },
    ];
    const presentPeople = allPeople.filter(p => p.isPresent);

    render(
      <RatePanel
        {...defaultProps}
        people={allPeople}
        presentPeople={presentPeople}
      />
    );

    // Initial state: Show all votes is off
    expect(screen.getByText('2 present')).toBeInTheDocument();
    const ignorePresenceTags = screen.getAllByTestId('card-ignore-presence');
    expect(ignorePresenceTags[0]).toHaveTextContent('false');
    const peopleCountTags = screen.getAllByTestId('card-people-count');
    expect(peopleCountTags[0]).toHaveTextContent('2');

    // Toggle "Show all votes" switch
    const toggleSwitch = screen.getByRole('switch');
    await act(async () => {
      fireEvent.click(toggleSwitch);
    });

    // After toggle: Show all votes is on
    expect(screen.getByText('3 total')).toBeInTheDocument();
    expect(ignorePresenceTags[0]).toHaveTextContent('true');
    expect(peopleCountTags[0]).toHaveTextContent('3');
  });

  it('filters movies by search query and allows clearing search', async () => {
    render(<RatePanel {...defaultProps} />);

    const searchInput = screen.getByPlaceholderText(/Search movies by title/i);
    expect(searchInput).toBeInTheDocument();

    // Search for "Matrix"
    await act(async () => {
      fireEvent.change(searchInput, { target: { value: 'Matrix' } });
    });

    expect(screen.getByTestId('movie-card-The Matrix')).toBeInTheDocument();
    expect(screen.queryByTestId('movie-card-Interstellar')).not.toBeInTheDocument();

    // Search for non-existent movie
    await act(async () => {
      fireEvent.change(searchInput, { target: { value: 'Nonexistent' } });
    });

    expect(screen.getByText('No movies found matching "Nonexistent"')).toBeInTheDocument();

    // Clear search
    const clearButton = screen.getByLabelText(/Clear search/i);
    await act(async () => {
      fireEvent.click(clearButton);
    });

    expect(screen.getByTestId('movie-card-The Matrix')).toBeInTheDocument();
    expect(screen.getByTestId('movie-card-Interstellar')).toBeInTheDocument();
  });
});
